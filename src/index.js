import { Client, GatewayIntentBits, Partials } from 'discord.js';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import loadEvents from './handlers/eventHandler.js';
import { loadCommands } from './handlers/commandHandler.js';

// Memuat variabel lingkungan dari file .env
dotenv.config();

// Inisialisasi Discord Client dengan Intents yang diperlukan
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Memerlukan aktivasi di Discord Developer Portal
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.Channel, Partials.Message]
});

// Menangani Error Global agar Bot tidak crash tiba-tiba
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection di:', promise, 'alasan:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

async function init() {
  logger.info('[Bot] Memulai inisialisasi bot...');

  // Memuat Commands dan Events
  await loadCommands(client);
  await loadEvents(client);

  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    logger.error(
      '[Bot] Token Discord (DISCORD_TOKEN) tidak ditemukan di file .env! Bot tidak dapat login.'
    );
    process.exit(1);
  }

  // Melakukan login ke Discord
  try {
    await client.login(token);
  } catch (error) {
    logger.error('[Bot] Gagal melakukan login ke Discord:', error);
    process.exit(1);
  }
}

// Jalankan fungsi inisialisasi
init();
