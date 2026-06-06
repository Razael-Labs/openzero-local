import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { REST, Routes, Collection } from 'discord.js';
import logger from '../utils/logger.js';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Loads all commands from the subfolders of the ../commands directory into client.commands
 * @param {import('discord.js').Client} client
 */
export async function loadCommands(client) {
  client.commands = new Collection();
  const commandsPath = path.join(__dirname, '../commands');

  if (!fs.existsSync(commandsPath)) {
    logger.warn(`Commands directory not found at ${commandsPath}`);
    return;
  }

  const commandFolders = fs.readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);

    // Make sure the path is a directory (e.g. utility, moderation, etc.)
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(folderPath).filter((file) => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      const fileUrl = pathToFileURL(filePath).href;

      try {
        const commandModule = await import(fileUrl);
        const command = commandModule.default;

        if (!command || !command.data || !command.execute) {
          logger.warn(`Command file ${file} does not have a 'data' property or an 'execute' function.`);
          continue;
        }

        client.commands.set(command.data.name, command);
        logger.info(`[Command Handler] Loaded command: /${command.data.name}`);
      } catch (error) {
        logger.error(`[Command Handler] Failed to load command file ${file}:`, error);
      }
    }
  }
}

/**
 * Registers loaded slash commands to the Discord API globally or to a specific guild
 * @param {import('discord.js').Client} client
 */
export async function deployCommands(client) {
  const token = config.token;
  const clientId = config.clientId;
  const guildId = config.guildId;

  if (!token || !clientId) {
    logger.warn(
      '[Command Handler] Token or Client ID is not configured. Skipping Slash Commands registration.'
    );
    return;
  }

  const commandData = [];
  for (const command of client.commands.values()) {
    commandData.push(command.data.toJSON());
  }

  if (commandData.length === 0) {
    logger.info('[Command Handler] No commands to register.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    if (guildId && guildId.trim() !== '') {
      logger.info(
        `[Command Handler] Starting registration of ${commandData.length} slash commands instantly to Guild ID: ${guildId}...`
      );

      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commandData });

      logger.info(
        `[Command Handler] Successfully registered slash commands to Guild ID: ${guildId}!`
      );
    } else {
      logger.info(
        `[Command Handler] Starting registration of ${commandData.length} slash commands globally (can take up to 1 hour)...`
      );

      await rest.put(Routes.applicationCommands(clientId), { body: commandData });

      logger.info('[Command Handler] Successfully registered slash commands globally!');
    }
  } catch (error) {
    logger.error('[Command Handler] Error occurred while registering slash commands:', error);
  }
}
