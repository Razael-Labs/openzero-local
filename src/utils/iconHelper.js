import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory to store downloaded icons: root of project/data/icons
const ICONS_DIR = path.join(__dirname, '../../data/icons');

// Make sure icons directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

/**
 * Downloads an icon from Font Awesome or other providers as SVG.
 * Falls back to PNG/JPG if SVG is not available.
 *
 * @param {string} name - Name of the icon (e.g., 'github', 'user', 'heart')
 * @param {string} [provider='fontawesome'] - Icon provider name ('fontawesome', 'simpleicons', 'lucide')
 * @param {object} [options={}] - Sizing options (e.g. { size: 320 })
 * @returns {Promise<{ filePath: string, fileName: string, ext: string, localUrl: string }>}
 */
export async function downloadIcon(name, provider = 'fontawesome', options = {}) {
  const cleanName = name.toLowerCase().trim();
  const providerLower = provider.toLowerCase().trim();
  const size = options.size || null;
  const cacheKey = size ? `${cleanName}-${size}` : cleanName;

  // First, check if the icon already exists locally to avoid redundant downloads
  try {
    const existingFiles = fs.readdirSync(ICONS_DIR);
    const matchedFile = existingFiles.find((file) => {
      const ext = path.extname(file);
      const base = path.basename(file, ext);
      return base === cacheKey;
    });

    if (matchedFile) {
      const ext = path.extname(matchedFile).substring(1);
      const filePath = path.join(ICONS_DIR, matchedFile);
      logger.info(`[IconHelper] Found cached local icon for: ${cacheKey} (${ext})`);
      return {
        filePath,
        fileName: matchedFile,
        ext,
        localUrl: `attachment://${matchedFile}`
      };
    }
  } catch (err) {
    logger.warn('[IconHelper] Failed to read icons directory cache:', err);
  }

  // Define lists of source URLs to try
  const urlsToTry = [];

  if (providerLower === 'fontawesome') {
    urlsToTry.push(
      {
        url: `https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/${cleanName}.svg`,
        ext: 'svg'
      },
      {
        url: `https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/regular/${cleanName}.svg`,
        ext: 'svg'
      },
      {
        url: `https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/brands/${cleanName}.svg`,
        ext: 'svg'
      }
    );
  } else if (providerLower === 'simpleicons') {
    urlsToTry.push({
      url: `https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/${cleanName}.svg`,
      ext: 'svg'
    });
  } else if (providerLower === 'lucide') {
    urlsToTry.push({
      url: `https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/${cleanName}.svg`,
      ext: 'svg'
    });
  } else {
    // Attempt Font Awesome, then Lucide, then Simple Icons
    urlsToTry.push(
      {
        url: `https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/${cleanName}.svg`,
        ext: 'svg'
      },
      {
        url: `https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/regular/${cleanName}.svg`,
        ext: 'svg'
      },
      {
        url: `https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/brands/${cleanName}.svg`,
        ext: 'svg'
      },
      {
        url: `https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/${cleanName}.svg`,
        ext: 'svg'
      },
      {
        url: `https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/${cleanName}.svg`,
        ext: 'svg'
      }
    );
  }

  // Fallbacks to PNG formats if SVG is not found
  const fallbackPngSize = size || 96;
  urlsToTry.push(
    { url: `https://img.icons8.com/color/${fallbackPngSize}/${cleanName}.png`, ext: 'png' },
    { url: `https://img.icons8.com/ios-filled/${fallbackPngSize}/${cleanName}.png`, ext: 'png' }
  );

  logger.info(
    `[IconHelper] Attempting to download icon: "${cleanName}" (Size: ${size || 'original'}) from provider "${providerLower}"`
  );

  for (const entry of urlsToTry) {
    try {
      let fetchUrl = entry.url;
      let targetExt = entry.ext;

      // Convert SVG to PNG and invert colors (making black icons white) using images.weserv.nl
      let weservUrl = `https://images.weserv.nl/?url=${encodeURIComponent(entry.url.replace(/^https?:\/\//, ''))}&filt=negate`;
      if (entry.ext === 'svg') {
        weservUrl += '&output=png';
        targetExt = 'png';
      }
      if (size) {
        weservUrl += `&w=${size}&h=${size}&fit=contain`;
      }
      fetchUrl = weservUrl;

      const response = await fetch(fetchUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let ext = targetExt;
        const contentType = response.headers.get('content-type');
        if (contentType) {
          if (contentType.includes('svg')) ext = 'svg';
          else if (contentType.includes('png')) ext = 'png';
          else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';
        }

        const fileName = `${cacheKey}.${ext}`;
        const filePath = path.join(ICONS_DIR, fileName);

        fs.writeFileSync(filePath, buffer);
        logger.info(`[IconHelper] Successfully downloaded and saved: ${fileName}`);

        return {
          filePath,
          fileName,
          ext,
          localUrl: `attachment://${fileName}`
        };
      }
    } catch (err) {
      logger.warn(`[IconHelper] Failed to download/convert from URL: ${entry.url}`, err);
    }
  }

  throw new Error(`Icon "${name}" could not be downloaded or converted from any provider.`);
}
