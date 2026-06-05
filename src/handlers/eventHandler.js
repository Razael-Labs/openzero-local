import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Memuat semua event dari direktori ../events secara dinamis
 * @param {import('discord.js').Client} client
 */
export default async function loadEvents(client) {
  const eventsPath = path.join(__dirname, '../events');

  if (!fs.existsSync(eventsPath)) {
    logger.warn(`Direktori events tidak ditemukan di ${eventsPath}`);
    return;
  }

  const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    // Menggunakan pathToFileURL agar kompatibel dengan ES Modules dynamic import di semua platform
    const fileUrl = pathToFileURL(filePath).href;

    try {
      const eventModule = await import(fileUrl);
      const event = eventModule.default;

      if (!event || !event.name) {
        logger.warn(`File event ${file} tidak memiliki properti default export atau 'name'.`);
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }

      logger.info(`[Event Handler] Berhasil memuat event: ${event.name}`);
    } catch (error) {
      logger.error(`[Event Handler] Gagal memuat file event ${file}:`, error);
    }
  }
}
