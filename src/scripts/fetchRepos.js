import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { convertObtainiumFile } from '../utils/obtainiumConverter.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const DEFAULT_OUTPUT_JSON = path.join(DATA_DIR, 'obtainium_repos_data.json');
const DEFAULT_OUTPUT_YAML = path.join(DATA_DIR, 'obtainium_repos_data.yaml');

/**
 * Searches the data directory for the latest obtainium-export-*.json file
 */
function findLatestExportFile() {
  try {
    const files = fs.readdirSync(DATA_DIR);
    const exportFiles = files
      .filter((f) => f.startsWith('obtainium-export-') && f.endsWith('.json'))
      .map((f) => ({
        name: f,
        path: path.join(DATA_DIR, f),
        time: fs.statSync(path.join(DATA_DIR, f)).mtimeMs
      }))
      .sort((a, b) => b.time - a.time);

    if (exportFiles.length > 0) {
      return exportFiles[0].path;
    }
  } catch (error) {
    logger.error('Failed to scan data directory for Obtainium export files:', error);
  }
  return null;
}

async function start() {
  // Ambil input path dari argumen CLI jika ada, jika tidak cari file export terbaru
  let inputPath = process.argv[2];

  if (!inputPath) {
    logger.info('Searching for the latest Obtainium export file in the data folder...');
    inputPath = findLatestExportFile();
  }

  if (!inputPath) {
    logger.error('Error: No obtainium-export-*.json file found in the data folder!');
    logger.info(
      'Please place your Obtainium export file (.json) in the data/ folder or provide the file path as an argument.'
    );
    process.exit(1);
  }

  logger.info(`Processing Obtainium file: ${path.basename(inputPath)}`);

  const stats = await convertObtainiumFile(inputPath, DEFAULT_OUTPUT_JSON, DEFAULT_OUTPUT_YAML, {
    enrich: true
  });

  logger.info('=== Conversion Results ===');
  logger.info(`Total Applications: ${stats.total}`);
  logger.info(`Reused Data  : ${stats.reused}`);
  logger.info(`Fetched Data : ${stats.fetched}`);
  logger.info('Data fetching and conversion completed successfully!');
}

start().catch((err) => {
  logger.error('A fatal error occurred:', err);
  process.exit(1);
});
