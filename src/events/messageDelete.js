import { Events } from 'discord.js';
import { getObtainiumMessageId } from '../utils/database.js';
import { updateObtainiumMessage } from '../utils/obtainiumHelper.js';
import { config } from '../config.js';
import logger from '../utils/logger.js';

export default {
  name: Events.MessageDelete,
  once: false,
  /**
   * @param {import('discord.js').Message} message
   * @param {import('discord.js').Client} client
   */
  async execute(message, client) {
    const storedRef = getObtainiumMessageId() || config?.obtainium?.messageId;
    let targetMessageId = storedRef;
    if (storedRef && storedRef.includes('://')) {
      targetMessageId = storedRef.split('/').pop();
    }

    if (message.id === targetMessageId) {
      const refType = storedRef && storedRef.includes('://') ? 'tautan' : 'ID';
      logger.info(
        `[Event] Monitored Obtainium message (${refType}: ${storedRef}) was deleted. Recreating...`
      );
      await updateObtainiumMessage(client);
    }
  }
};
