import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { REST, Routes, Collection } from 'discord.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Memuat semua command dari subfolder direktori ../commands ke dalam client.commands
 * @param {import('discord.js').Client} client
 */
export async function loadCommands(client) {
  client.commands = new Collection();
  const commandsPath = path.join(__dirname, '../commands');

  if (!fs.existsSync(commandsPath)) {
    logger.warn(`Direktori commands tidak ditemukan di ${commandsPath}`);
    return;
  }

  const commandFolders = fs.readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);

    // Pastikan path tersebut adalah direktori (misalnya utility, moderation, dll)
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(folderPath).filter((file) => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      const fileUrl = pathToFileURL(filePath).href;

      try {
        const commandModule = await import(fileUrl);
        const command = commandModule.default;

        if (!command || !command.data || !command.execute) {
          logger.warn(`File command ${file} tidak memiliki properti 'data' atau fungsi 'execute'.`);
          continue;
        }

        client.commands.set(command.data.name, command);
        logger.info(`[Command Handler] Berhasil memuat command: /${command.data.name}`);
      } catch (error) {
        logger.error(`[Command Handler] Gagal memuat file command ${file}:`, error);
      }
    }
  }
}

/**
 * Mendaftarkan slash commands yang telah di-load ke Discord API secara global
 * @param {import('discord.js').Client} client
 */
export async function deployCommands(client) {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  if (!token || !clientId) {
    logger.warn(
      '[Command Handler] DISCORD_TOKEN atau CLIENT_ID tidak diatur di file .env. Melewati registrasi Slash Commands.'
    );
    return;
  }

  const commandData = [];
  for (const command of client.commands.values()) {
    commandData.push(command.data.toJSON());
  }

  if (commandData.length === 0) {
    logger.info('[Command Handler] Tidak ada command untuk didaftarkan.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    if (guildId && guildId.trim() !== '') {
      logger.info(
        `[Command Handler] Memulai pendaftaran ${commandData.length} slash commands secara instan ke Guild (Server) ID: ${guildId}...`
      );

      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commandData });

      logger.info(
        `[Command Handler] Sukses meregistrasikan slash commands ke Guild ID: ${guildId}!`
      );
    } else {
      logger.info(
        `[Command Handler] Memulai pendaftaran ${commandData.length} slash commands secara global (bisa memakan waktu hingga 1 jam)...`
      );

      await rest.put(Routes.applicationCommands(clientId), { body: commandData });

      logger.info('[Command Handler] Sukses meregistrasikan slash commands secara global!');
    }
  } catch (error) {
    logger.error('[Command Handler] Terjadi kesalahan saat meregistrasikan slash commands:', error);
  }
}
