import './instrument.js';
import './scripts/patchPlayDl.js';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config } from './config.js';
import logger from './utils/logger.js';
import loadEvents from './handlers/eventHandler.js';
import { loadCommands } from './handlers/commandHandler.js';

import { VERSION } from './version.js';

// Initialize Discord Client with required Intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Requires activation in Discord Developer Portal
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.Channel, Partials.Message]
});

// Handle Global Errors to prevent sudden crashes
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

async function init() {
  logger.info(`[Bot] Starting bot initialization v${VERSION}...`);

  // Load Commands and Events
  await loadCommands(client);
  await loadEvents(client);

  const token = config.token;
  if (!token) {
    logger.error(
      '[Bot] Discord Token (DISCORD_TOKEN) not found in config/env! The bot cannot login.'
    );
    process.exit(1);
  }

  // Perform login to Discord
  try {
    await client.login(token);
  } catch (error) {
    logger.error('[Bot] Failed to login to Discord:', error);
    process.exit(1);
  }
}

// Run initialization function
init();
