import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';
import { convertObtainiumFile } from './obtainiumConverter.js';
import { updateObtainiumMessage } from './obtainiumHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const OUTPUT_JSON = path.join(DATA_DIR, 'obtainium_repos_data.json');
const OUTPUT_YAML = path.join(DATA_DIR, 'obtainium_repos_data.yaml');

let watchDebounceTimeout = null;
let lastProcessedFile = '';
let lastProcessedTime = 0;

/**
 * Searches the data directory for the latest obtainium-export-*.json file
 * @returns {Promise<string|null>} Absolute path to the latest file, or null
 */
async function findLatestExportFile() {
  try {
    const files = await fsPromises.readdir(DATA_DIR);
    const exportFiles = files
      .filter(f => f.startsWith('obtainium-export-') && f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(DATA_DIR, f),
        time: fs.statSync(path.join(DATA_DIR, f)).mtimeMs
      }))
      .sort((a, b) => b.time - a.time);

    if (exportFiles.length > 0) {
      return exportFiles[0].path;
    }
  } catch (error) {
    logger.error('[Obtainium Watcher] Error searching for export files:', error);
  }
  return null;
}

/**
 * Runs the conversion for the given export file
 * @param {string} filePath 
 * @param {import('discord.js').Client} [client] Optional Discord client to trigger updates
 */
async function processFile(filePath, client) {
  try {
    const stats = fs.statSync(filePath);
    // Prevent processing the same file multiple times in rapid succession
    if (filePath === lastProcessedFile && stats.mtimeMs - lastProcessedTime < 2000) {
      return;
    }
    
    lastProcessedFile = filePath;
    lastProcessedTime = stats.mtimeMs;

    logger.info(`[Obtainium Watcher] Detected file to process: ${path.basename(filePath)}`);
    const statsResult = await convertObtainiumFile(filePath, OUTPUT_JSON, OUTPUT_YAML, { enrich: true });
    
    logger.info(
      `[Obtainium Watcher] Conversion successful! Total apps: ${statsResult.total} (reused: ${statsResult.reused}, fetched: ${statsResult.fetched})`
    );

    // If client is passed, update the Discord embed message
    if (client) {
      await updateObtainiumMessage(client);
    }
  } catch (error) {
    logger.error(`[Obtainium Watcher] Error processing ${path.basename(filePath)}:`, error);
  }
}

/**
 * Initializes and starts the directory watcher
 * @param {import('discord.js').Client} [client] Optional Discord client
 */
export async function initObtainiumWatcher(client) {
  logger.info('[Obtainium Watcher] Starting Obtainium data watcher...');

  // 1. Initial conversion on startup (process the latest export file if present)
  const latestFile = await findLatestExportFile();
  if (latestFile) {
    logger.info(`[Obtainium Watcher] Found latest export on startup: ${path.basename(latestFile)}. Processing...`);
    await processFile(latestFile, client);
  } else {
    logger.warn('[Obtainium Watcher] No obtainium-export-*.json files found in data directory.');
  }

  // 2. Watch directory for changes
  try {
    fs.watch(DATA_DIR, (eventType, filename) => {
      if (!filename) return;

      // Match files like obtainium-export-2026-06-01T23-37-03.954804.json
      if (filename.startsWith('obtainium-export-') && filename.endsWith('.json')) {
        const fullPath = path.join(DATA_DIR, filename);

        // Debounce because FS events can fire multiple times for a single write
        if (watchDebounceTimeout) {
          clearTimeout(watchDebounceTimeout);
        }

        watchDebounceTimeout = setTimeout(async () => {
          // Check if file still exists (could be a deletion or temp file name change)
          try {
            await fsPromises.access(fullPath);
            await processFile(fullPath, client);
          } catch {
            // File doesn't exist or is not readable, skip
          }
        }, 1000);
      }
    });
    logger.info(`[Obtainium Watcher] Successfully watching directory: ${DATA_DIR}`);
  } catch (error) {
    logger.error('[Obtainium Watcher] Failed to initialize fs.watch:', error);
  }
}
