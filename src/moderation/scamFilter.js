import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scamListUrl = 'https://raw.githubusercontent.com/Discord-AntiScam/scam-links/main/list.json';
const fallbackFilePath = path.join(config.database.dir, 'scam_links.json');

// Memory caches
let scamDomains = new Set();
let customScamDomains = new Set();
let updateInterval = null;

/**
 * Initializes the scam filter by loading cached list or fetching the live one.
 */
export async function initScamFilter() {
  // Try loading fallback local copy first to ensure we have *something* immediately
  loadFallback();

  try {
    logger.info('[Scam Filter] Fetching latest public scam domains list...');
    const response = await fetch(scamListUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (Array.isArray(data)) {
      scamDomains = new Set(data.map(d => d.toLowerCase()));
      logger.info(`[Scam Filter] Successfully loaded ${scamDomains.size} scam domains from remote.`);
      
      // Save local fallback
      try {
        if (!fs.existsSync(config.database.dir)) {
          fs.mkdirSync(config.database.dir, { recursive: true });
        }
        fs.writeFileSync(fallbackFilePath, JSON.stringify(data, null, 2), 'utf8');
      } catch (err) {
        logger.error('[Scam Filter] Failed to save fallback file:', err);
      }
    } else {
      logger.warn('[Scam Filter] Received invalid data format from remote list.');
    }
  } catch (error) {
    logger.warn(`[Scam Filter] Failed to fetch live list: ${error.message}. Using local fallback.`);
    loadFallback();
  }

  // Load custom scam links from Supabase
  try {
    const { fetchCustomScamLinks } = await import('../utils/supabase.js');
    const customLinks = await fetchCustomScamLinks();
    if (Array.isArray(customLinks)) {
      customScamDomains = new Set(customLinks.map(item => item.domain.toLowerCase()));
      logger.info(`[Scam Filter] Successfully loaded ${customScamDomains.size} custom scam domains from Supabase.`);
    }
  } catch (err) {
    if (err.message === 'SUPABASE_NOT_CONFIGURED') {
      logger.warn('[Scam Filter] Supabase not configured. Custom scam links will not be loaded.');
    } else {
      logger.error('[Scam Filter] Failed to load custom scam domains from Supabase:', err);
    }
  }

  // Schedule background refresh every 12 hours if not already scheduled
  if (!updateInterval && process.env.NODE_ENV !== 'test') {
    updateInterval = setInterval(initScamFilter, 12 * 60 * 60 * 1000);
    if (updateInterval.unref) {
      updateInterval.unref(); // Don't block Node process exit
    }
  }
}

/**
 * Loads the scam links list from the local fallback file if it exists.
 */
function loadFallback() {
  try {
    if (fs.existsSync(fallbackFilePath)) {
      const content = fs.readFileSync(fallbackFilePath, 'utf8');
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        scamDomains = new Set(data.map(d => d.toLowerCase()));
        logger.info(`[Scam Filter] Loaded ${scamDomains.size} scam domains from local fallback.`);
      }
    }
  } catch (error) {
    logger.error('[Scam Filter] Failed to load local fallback:', error);
  }
}

/**
 * Helper to extract hostnames/domains from a string.
 * @param {string} text
 * @returns {string[]}
 */
export function extractDomains(text) {
  if (!text) return [];
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/gi;
  const domains = [];
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    let host = match[1].toLowerCase();
    host = host.split('/')[0].split('?')[0].split('#')[0].split(':')[0];
    if (host) {
      domains.push(host);
    }
  }
  return domains;
}

/**
 * Checks if content contains any domains present in the scam lists.
 * @param {string} content
 * @returns {boolean}
 */
export function containsScamLink(content) {
  if (!content) return false;
  if (scamDomains.size === 0 && customScamDomains.size === 0) return false;

  const domains = extractDomains(content);
  for (const domain of domains) {
    // Direct match check (GitHub list or custom list)
    if (scamDomains.has(domain) || customScamDomains.has(domain)) {
      return true;
    }

    // Subdomain/parent check: if domain is a.b.c.com, check:
    // a.b.c.com, b.c.com, c.com
    const parts = domain.split('.');
    while (parts.length > 1) {
      const checkDomain = parts.join('.');
      if (scamDomains.has(checkDomain) || customScamDomains.has(checkDomain)) {
        return true;
      }
      parts.shift();
    }
  }

  return false;
}

/**
 * Retrieves the current count of loaded scam domains in both caches.
 * @returns {{public: number, custom: number}}
 */
export function getScamDomainsCount() {
  return {
    public: scamDomains.size,
    custom: customScamDomains.size
  };
}

/**
 * Adds a custom scam domain to the in-memory cache.
 * @param {string} domain
 */
export function addCustomScamDomain(domain) {
  customScamDomains.add(domain.toLowerCase().trim());
}

/**
 * Removes a custom scam domain from the in-memory cache.
 * @param {string} domain
 */
export function removeCustomScamDomain(domain) {
  customScamDomains.delete(domain.toLowerCase().trim());
}

/**
 * Direct access to clean cache (mainly for testing)
 */
export function clearScamCache() {
  scamDomains.clear();
  customScamDomains.clear();
}
