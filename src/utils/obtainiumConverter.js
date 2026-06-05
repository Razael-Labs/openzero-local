import fs from 'fs/promises';
import path from 'path';
import logger from './logger.js';

// Helper delay to avoid rate limits
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parses repo owner and repo name from URL
 */
function parseRepoUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return {
        host: url.hostname,
        owner: parts[0],
        repo: parts[1]
      };
    }
  } catch {
    // Ignore URL parsing errors
  }
  return null;
}

/**
 * Helper to fetch JSON with headers
 */
async function fetchWithHeaders(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'OpenZero-Bot-Fetcher-Antigravity',
      Accept: 'application/vnd.github.v3+json'
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch description and README from GitHub
 */
async function fetchGithubRepo(owner, repo) {
  let description = '';
  let readme = '';

  try {
    const repoInfo = await fetchWithHeaders(`https://api.github.com/repos/${owner}/${repo}`);
    description = repoInfo.description || '';
  } catch (error) {
    logger.error(`[GitHub Info Error] ${owner}/${repo}: ${error.message}`);
  }

  try {
    const readmeInfo = await fetchWithHeaders(
      `https://api.github.com/repos/${owner}/${repo}/readme`
    );
    if (readmeInfo.content && readmeInfo.encoding === 'base64') {
      readme = Buffer.from(readmeInfo.content, 'base64').toString('utf-8');
    }
  } catch (error) {
    logger.error(`[GitHub README Error] ${owner}/${repo}: ${error.message}`);
  }

  return { description, readme };
}

/**
 * Fetch description and README from Codeberg
 */
async function fetchCodebergRepo(owner, repo) {
  let description = '';
  let readme = '';

  try {
    const repoInfo = await fetchWithHeaders(`https://codeberg.org/api/v1/repos/${owner}/${repo}`);
    description = repoInfo.description || '';
  } catch (error) {
    logger.error(`[Codeberg Info Error] ${owner}/${repo}: ${error.message}`);
  }

  try {
    const readmeInfo = await fetchWithHeaders(
      `https://codeberg.org/api/v1/repos/${owner}/${repo}/contents/README.md`
    );
    if (readmeInfo.content && readmeInfo.encoding === 'base64') {
      readme = Buffer.from(readmeInfo.content, 'base64').toString('utf-8');
    }
  } catch (error) {
    logger.error(`[Codeberg README Error] ${owner}/${repo}: ${error.message}`);
  }

  return { description, readme };
}

/**
 * Convert application data array to simple YAML format
 */
export function toYaml(data) {
  let yaml = '';
  for (const item of data) {
    yaml += `- name: "${(item.name || '').replace(/"/g, '\\"')}"\n`;
    yaml += `  url: "${item.url || ''}"\n`;
    yaml += `  id: "${item.id || ''}"\n`;
    yaml += `  author: "${item.author || ''}"\n`;
    yaml += `  latestVersion: "${item.latestVersion || ''}"\n`;
    yaml += `  installedVersion: "${item.installedVersion || ''}"\n`;
    yaml += '  description: |\n';

    const descLines = (item.description || '').split('\n');
    descLines.forEach((line) => {
      yaml += `    ${line}\n`;
    });

    yaml += '  readme: |\n';
    const readmeLines = (item.readme || '').split('\n');
    readmeLines.forEach((line) => {
      yaml += `    ${line}\n`;
    });
    yaml += '\n';
  }
  return yaml;
}

/**
 * Automatically converts an Obtainium export file to JSON and YAML
 * @param {string} inputPath Path to the raw obtainium-export JSON file
 * @param {string} outputPathJson Target path for enriched JSON
 * @param {string} outputPathYaml Target path for enriched YAML
 * @param {object} options Options like { enrich: true }
 */
export async function convertObtainiumFile(inputPath, outputPathJson, outputPathYaml, options = { enrich: true }) {
  logger.info(`[Obtainium Converter] Reading raw export from: ${inputPath}`);
  const rawData = await fs.readFile(inputPath, 'utf-8');
  const parsedData = JSON.parse(rawData);
  const apps = parsedData.apps || (Array.isArray(parsedData) ? parsedData : []);

  if (!apps.length) {
    throw new Error('No apps found in the provided Obtainium export file.');
  }

  // Load existing converted file to reuse descriptions/READMEs to save API rate limits
  let existingAppsMap = new Map();
  try {
    const existingRaw = await fs.readFile(outputPathJson, 'utf-8');
    const existingApps = JSON.parse(existingRaw);
    if (Array.isArray(existingApps)) {
      existingApps.forEach(app => {
        if (app.id) existingAppsMap.set(app.id, app);
      });
      logger.info(`[Obtainium Converter] Loaded ${existingAppsMap.size} existing apps from ${outputPathJson} to reuse descriptions/READMEs`);
    }
  } catch (error) {
    logger.info(`[Obtainium Converter] No existing enriched JSON found (or failed to read). Fetching all details from scratch.`);
  }

  const result = [];
  let newAppsCount = 0;
  let reusedCount = 0;

  for (let i = 0; i < apps.length; i++) {
    const app = apps[i];
    
    // Check if we can reuse the description/README
    const existing = existingAppsMap.get(app.id);
    let details = { description: '', readme: '' };

    if (existing && existing.description && existing.readme) {
      details = {
        description: existing.description,
        readme: existing.readme
      };
      reusedCount++;
    } else if (options.enrich) {
      // Fetch details from GitHub/Codeberg
      const parsed = parseRepoUrl(app.url);
      if (parsed) {
        const { host, owner, repo } = parsed;
        logger.info(`[Obtainium Converter] [${i + 1}/${apps.length}] Fetching remote details for ${app.name} (${owner}/${repo})...`);
        if (host.includes('github.com')) {
          details = await fetchGithubRepo(owner, repo);
        } else if (host.includes('codeberg.org')) {
          details = await fetchCodebergRepo(owner, repo);
        }
        newAppsCount++;
        // Throttling to avoid rate limiting
        await delay(500);
      } else {
        logger.warn(`[Obtainium Converter] Unsupported URL host or pattern for: ${app.url}`);
      }
    }

    result.push({
      id: app.id,
      name: app.name,
      url: app.url,
      author: app.author,
      latestVersion: app.latestVersion,
      installedVersion: app.installedVersion,
      description: details.description,
      readme: details.readme
    });
  }

  // Ensure output directory exists
  await fs.mkdir(path.dirname(outputPathJson), { recursive: true });

  // Write JSON
  await fs.writeFile(outputPathJson, JSON.stringify(result, null, 2), 'utf-8');
  logger.info(`[Obtainium Converter] Saved JSON to ${outputPathJson}`);

  // Write YAML
  const yamlContent = toYaml(result);
  await fs.writeFile(outputPathYaml, yamlContent, 'utf-8');
  logger.info(`[Obtainium Converter] Saved YAML to ${outputPathYaml}`);

  return {
    total: result.length,
    reused: reusedCount,
    fetched: newAppsCount
  };
}
