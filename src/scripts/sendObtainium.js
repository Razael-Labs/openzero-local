import { Client, GatewayIntentBits } from 'discord.js';
import logger from '../utils/logger.js';
import { updateObtainiumMessage } from '../utils/obtainiumHelper.js';
import { config } from '../config.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  logger.info(
    `[Script] Connected as ${client.user.tag}. Preparing Obtainium list update...`
  );

  try {
    const success = await updateObtainiumMessage(client);
    if (success) {
      logger.info('[Script] Successfully updated/sent Obtainium message!');
      process.exit(0);
    } else {
      logger.error('[Script] Failed to update Obtainium message.');
      process.exit(1);
    }
  } catch (error) {
    logger.error('[Script] Error while processing Obtainium:', error);
    process.exit(1);
  }
});

// Login ke Discord
const token = config.token;
if (!token) {
  logger.error('[Script] Token is not set in configuration/.env file!');
  process.exit(1);
}

client.login(token);
