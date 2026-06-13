import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Dynamically loads all events from the ../events directory
 * @param {import('discord.js').Client} client
 */
export default async function loadEvents(client) {
  const eventsPath = path.join(__dirname, '../events');

  if (!fs.existsSync(eventsPath)) {
    logger.warn(`Events directory not found at ${eventsPath}`);
    return;
  }

  const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    // Use pathToFileURL to be compatible with ES Modules dynamic imports on all platforms
    const fileUrl = pathToFileURL(filePath).href;

    try {
      const eventModule = await import(fileUrl);
      const event = eventModule.default;

      if (!event || !event.name) {
        logger.warn(`Event file ${file} does not have a default export or 'name' property.`);
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }

      logger.info(`[Event Handler] Loaded event: ${event.name}`);
    } catch (error) {
      logger.error(`[Event Handler] Failed to load event file ${file}:`, error);
    }
  }
}
