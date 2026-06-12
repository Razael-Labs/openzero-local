import { Events, PermissionFlagsBits } from 'discord.js';
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
    if (message.guild && needsAIReview(finalContent) && !isOnCooldown(message.author.id)) {
      // Skip moderation if member has ManageGuild permission (Admins/Mods), except in development mode for easy testing
      const isDev = process.env.NODE_ENV === 'development';
      if (!isDev && message.member && message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return;
      }

      setCooldown(message.author.id);
      try {
        const {
          getModerationConfig,
          incrementUserWarningCount,
          recordModerationTrigger,
          getBadWordsLocally
        } = await import('../utils/database.js');

        const moderationResult = await analyzeWithAI(message);
        if (moderationResult && moderationResult.trim().toUpperCase() !== 'CLEAN') {
          // Identify category of the triggered bad word
          const words = getBadWordsLocally();
          let category = 'General';
          let detectedWordText = 'Unknown';
          const triggeredWordObj = words.find((w) => {
            const checkWord = typeof w === 'object' ? w.word : w;
            return finalContent.toLowerCase().includes(checkWord);
          });
          if (triggeredWordObj) {
            category = typeof triggeredWordObj === 'object' ? triggeredWordObj.category : 'General';
            detectedWordText = typeof triggeredWordObj === 'object' ? triggeredWordObj.word : triggeredWordObj;
          }

          const modConfig = getModerationConfig(message.guild.id);
          let actionTaken = 'warn';

          // Silent delete
          if (modConfig.silentDelete) {
            await message.delete().catch(() => null);
          }

          // Graduated/Aksi bertingkat
          const warningCount = incrementUserWarningCount(message.guild.id, message.author.id);
          let responseText = moderationResult;

          if (warningCount >= modConfig.maxWarnings) {
            if (modConfig.warnAction === 'ban') {
              actionTaken = 'ban';
              if (message.member.bannable) {
                await message.member
                  .ban({ reason: `Exceeded max warnings (${modConfig.maxWarnings})` })
                  .catch(() => null);
                responseText = `🚫 @${message.author.username} telah di-ban dari server karena mencapai batas pelanggaran kustom.`;
              }
            } else if (modConfig.warnAction === 'kick') {
              actionTaken = 'kick';
              if (message.member.kickable) {
                await message.member
                  .kick(`Exceeded max warnings (${modConfig.maxWarnings})`)
                  .catch(() => null);
                responseText = `👢 @${message.author.username} telah di-kick dari server karena mencapai batas pelanggaran kustom.`;
              }
            } else if (modConfig.warnAction === 'mute') {
              actionTaken = 'mute';
              if (message.member.moderatable) {
                await message.member
                  .timeout(10 * 60 * 1000, `Exceeded max warnings (${modConfig.maxWarnings})`)
                  .catch(() => null);
                responseText = `🔇 @${message.author.username} telah di-mute selama 10 menit karena mencapai batas pelanggaran kustom.`;
              }
            }
          }

          // Record moderation trigger audit log
          recordModerationTrigger(
            message.guild.id,
            message.author.id,
            message.author.username,
            message.channel.id,
            detectedWordText,
            category,
            actionTaken
          );

          // Only send warning/action message if not silent delete OR if action taken is major (mute/kick/ban)
          if (!modConfig.silentDelete || actionTaken !== 'warn') {
            await message.channel.send(responseText).catch(() => null);
          }
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
