import { Events } from 'discord.js';
import logger from '../utils/logger.js';
import { incrementMessageCount } from '../utils/database.js';
import { recordMessage } from '../utils/supabase.js';
import { handleSticker } from '../handlers/stickerHandler.js';

export default {
  name: Events.MessageCreate,
  once: false,
  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message) {
    // Abaikan pesan dari bot lain (dan diri sendiri)
    if (message.author.bot) return;

    const stickerContent = handleSticker(message);
    const finalContent = stickerContent || message.content;

    // Increment message count and record details in database for the server
    if (message.guild) {
      incrementMessageCount(message.guild.id, message.author.id);

      await recordMessage({
        guildId: message.guild.id,
        channelId: message.channel.id,
        channelName: message.channel.name,
        userId: message.author.id,
        username: message.author.username,
        content: finalContent,
        messageId: message.id,
        createdAt: message.createdAt
      });
    }

    // Catat aktivitas pesan masuk menggunakan Logger Handler (observasi/log saja)
    logger.info(
      `[Message] [${message.guild?.name || 'DM'}] #${message.channel.name || 'unknown'} | ${message.author.tag}: ${finalContent}`
    );
  }
};
