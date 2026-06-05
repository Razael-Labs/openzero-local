import fs from 'fs';
import path from 'path';
import { convertObtainiumFile } from '../utils/obtainiumConverter.js';
import logger from '../utils/logger.js';

const DATA_DIR = '/data/data/com.termux/files/home/openzero-local/data';
const DEFAULT_OUTPUT_JSON = path.join(DATA_DIR, 'obtainium_repos_data.json');
const DEFAULT_OUTPUT_YAML = path.join(DATA_DIR, 'obtainium_repos_data.yaml');

/**
 * Searches the data directory for the latest obtainium-export-*.json file
 */
function findLatestExportFile() {
  try {
    const files = fs.readdirSync(DATA_DIR);
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
    logger.error('Gagal memindai folder data untuk file export Obtainium:', error);
  }
  return null;
}

async function start() {
  // Ambil input path dari argumen CLI jika ada, jika tidak cari file export terbaru
  let inputPath = process.argv[2];

  if (!inputPath) {
    logger.info('Mencari file export Obtainium terbaru di folder data...');
    inputPath = findLatestExportFile();
  }

  if (!inputPath) {
    logger.error('Error: Tidak ditemukan file obtainium-export-*.json di folder data!');
    logger.info('Silakan letakkan file export Obtainium (.json) di folder data/ atau berikan path file sebagai argumen.');
    process.exit(1);
  }

  logger.info(`Memproses file Obtainium: ${path.basename(inputPath)}`);
  
  const stats = await convertObtainiumFile(inputPath, DEFAULT_OUTPUT_JSON, DEFAULT_OUTPUT_YAML, { enrich: true });
  
  logger.info('=== Hasil Konversi ===');
  logger.info(`Total Aplikasi: ${stats.total}`);
  logger.info(`Data Direuse  : ${stats.reused}`);
  logger.info(`Data Diambil  : ${stats.fetched}`);
  logger.info('Proses penarikan dan konversi data selesai dengan sukses!');
}

start().catch((err) => {
  logger.error('Terjadi kesalahan fatal:', err);
  process.exit(1);
});
