import { Events } from 'discord.js';
import logger from '../utils/logger.js';
import { incrementMessageCount } from '../utils/database.js';
import { recordMessage } from '../utils/supabase.js';
import { handleSticker } from '../handlers/stickerHandler.js';
import { handleDevCommand } from '../handlers/devCommandHandler.js';
import { needsAIReview } from '../moderation/preFilter.js';
import { isOnCooldown, setCooldown } from '../moderation/cooldown.js';
import { analyzeWithAI } from '../moderation/aiAnalyzer.js';

export default {
  name: Events.MessageCreate,
  once: false,
  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message) {
    // Ignore messages from other bots (and self)
    if (message.author.bot) return;

    // Jalankan prefix command developer jika ada
    const isDevCommand = await handleDevCommand(message);
    if (isDevCommand) return;

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

    // Record incoming message activity using Logger Handler (observation/logs only)
    logger.info(
      `[Message] [${message.guild?.name || 'DM'}] #${message.channel.name || 'unknown'} | ${message.author.tag}: ${finalContent}`
    );

    // AI Moderation Filters
    if (needsAIReview(finalContent) && !isOnCooldown(message.author.id)) {
      setCooldown(message.author.id);
      try {
        const moderationResult = await analyzeWithAI(message);
        if (moderationResult && moderationResult.trim().toUpperCase() !== 'CLEAN') {
          await message.reply(moderationResult);
        }
      } catch (err) {
        logger.error('[AI Moderation] Failed to run moderation checks:', err);
      }
    }

    // AI Trigger: Jika bot di-mention, panggil AI Agent runAgent
    const botMention = `<@${message.client.user.id}>`;
    const botMentionNick = `<@!${message.client.user.id}>`;
    if (message.content.includes(botMention) || message.content.includes(botMentionNick)) {
      try {
        // Bersihkan mention bot dari prompt
        let cleanPrompt = message.content
          .replace(botMention, '')
          .replace(botMentionNick, '')
          .trim();

        if (cleanPrompt.length === 0) {
          return message.reply(
            'Ada yang bisa saya bantu? Tanyakan saja atau minta saya menjalankan tugas!'
          );
        }

        // Tunjukkan status sedang mengetik
        await message.channel.sendTyping();

        const { runAgent } = await import('../utils/aiManager.js');
        const context = {
          client: message.client,
          guild: message.guild,
          channel: message.channel,
          member: message.member,
          user: message.author
        };

        const response = await runAgent(cleanPrompt, context);

        const replyOptions = {
          content: response.responseText || 'Tugas selesai dijalankan.'
        };

        if (response.result?.embeds) {
          replyOptions.components = response.result.embeds; // V2Embed builds to a container components format
          replyOptions.flags = 1 << 14; // MessageFlags.IsComponentsV2 (IsComponentsV2 is 16384 or 1 << 14)
        }

        if (response.result?.responseText) {
          replyOptions.content = response.result.responseText;
        } else if (response.responseText) {
          replyOptions.content = response.responseText;
        }

        if (replyOptions.components) {
          delete replyOptions.content;
        }

        await message.reply(replyOptions);
      } catch (err) {
        logger.error('[AI Message Trigger] Failed to respond to mention:', err);
        await message.reply('Maaf, saya mengalami kesalahan saat memproses permintaan Anda.');
      }
    }
  }
};
