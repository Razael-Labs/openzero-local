import { Events, PermissionFlagsBits, MessageFlags, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from 'discord.js';
import logger from '../utils/logger.js';
import { incrementMessageCount } from '../utils/database.js';
import { recordMessage } from '../utils/supabase.js';
import { handleSticker } from '../handlers/stickerHandler.js';
import { handleDevCommand } from '../handlers/devCommandHandler.js';
import { needsAIReview } from '../moderation/preFilter.js';
import { isOnCooldown, setCooldown } from '../moderation/cooldown.js';
import { analyzeWithAI, generateScamWarningWithAI } from '../moderation/aiAnalyzer.js';
import { containsScamLink } from '../moderation/scamFilter.js';
import { t } from '../utils/i18n.js';
import { config } from '../config.js';
import { V2Embed } from '../utils/v2Embed.js';

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

    // Anti-Phishing/Scam Link Filter
    if (message.guild && containsScamLink(finalContent)) {
      const isDev = process.env.NODE_ENV === 'development';
      const hasPermission = message.member && message.member.permissions.has(PermissionFlagsBits.ManageGuild);
      const isOwner = message.author.id === config.ownerId;
      if (isDev || !hasPermission || isOwner) {
        logger.warn(`[Scam Filter] Detected scam link from ${message.author.tag} in #${message.channel.name}. Deleting message...`);
        await message.delete().catch(() => null);
        
        // Generate friendly AI warning message or fallback to localized string
        const aiWarning = await generateScamWarningWithAI(message);
        const description = aiWarning || t('scamLinkWarning', message.guild.preferredLocale || 'en', { username: message.author.username });
        
        const embed = new V2Embed(message.guild)
          .setTitle(t('scamLinkWarningTitle', message.guild.preferredLocale || 'en'))
          .setDescription(description)
          .setColor(0xff3333) // Red accent
          .build();

        await message.channel.send({ components: [embed], flags: MessageFlags.IsComponentsV2 }).catch(() => null);

        // Send alert to configured logs channel or fallback to moderator-only channel
        let logChannel = null;
        if (config.logs?.channelId) {
          try {
            logChannel = await message.guild.channels.fetch(config.logs.channelId);
          } catch (err) {
            logger.error('[Scam Filter] Failed to fetch configured logs channel:', err);
          }
        }

        if (!logChannel) {
          logChannel = message.guild.channels.cache.find(c => c.name === 'moderator-only');
          if (!logChannel) {
            try {
              const channels = await message.guild.channels.fetch();
              logChannel = channels.find(c => c.name === 'moderator-only');
            } catch (err) {
              logger.error('[Scam Filter] Failed to fetch guild channels:', err);
            }
          }
        }

        if (logChannel) {
          let adminRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'admin' || r.name.toLowerCase() === 'administrator');
          if (!adminRole) {
            try {
              const roles = await message.guild.roles.fetch();
              adminRole = roles.find(r => r.name.toLowerCase() === 'admin' || r.name.toLowerCase() === 'administrator');
            } catch (err) {
              // Ignore role fetch error
            }
          }

          const mentionString = adminRole ? `<@${message.guild.ownerId}> | ${adminRole}` : `<@${message.guild.ownerId}>`;
          
          const isId = message.guild.preferredLocale === 'id';
          const alertEmbed = new V2Embed(message.guild)
            .setTitle(t('scamAlertTitle', message.guild.preferredLocale || 'en'))
            .setColor(0xff3333)
            .build();

          alertEmbed.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(isId ? `**Pengirim:** ${message.author} (${message.author.tag} / ID: ${message.author.id})` : `**User:** ${message.author} (${message.author.tag} / ID: ${message.author.id})`)
          );
          alertEmbed.addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
          );
          alertEmbed.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(isId ? `**Saluran:** ${message.channel}` : `**Channel:** ${message.channel}`)
          );
          alertEmbed.addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
          );
          alertEmbed.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(isId ? `**Pesan Asli:**\n\`\`\`\n${finalContent}\n\`\`\`` : `**Original Message:**\n\`\`\`\n${finalContent}\n\`\`\``)
          );
          
          await logChannel.send({ content: mentionString }).catch(() => null);
          await logChannel.send({
            components: [alertEmbed],
            flags: MessageFlags.IsComponentsV2
          }).catch((err) => {
            logger.error('[Scam Filter] Failed to send log to logs channel:', err);
          });
        } else {
          // Notify owner if no log channel is configured or found
          try {
            const owner = await message.guild.members.fetch(message.guild.ownerId);
            if (owner) {
              const isId = message.guild.preferredLocale === 'id';
              const dmMessage = isId
                ? `⚠️ **Pemberitahuan Sistem Bot:** Kami mendeteksi link scam di server **${message.guild.name}**, tetapi tidak dapat mengirim log karena saluran \`#moderator-only\` tidak ditemukan. Harap atur ID saluran log kustom menggunakan perintah: \`/config set key:logs_channel_id value:<ID_Channel>\``
                : `⚠️ **Bot System Notification:** We detected a scam link in your server **${message.guild.name}**, but could not send the logs because the \`#moderator-only\` channel was not found. Please set a custom log channel ID using: \`/config set key:logs_channel_id value:<Channel_ID>\``;
              await owner.send(dmMessage).catch(() => null);
            }
          } catch (err) {
            logger.warn(`[Scam Filter Alert] Failed to notify guild owner via DM: ${err.message}`);
          }
        }

        return;
      }
    }

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

    // AI Trigger: Jika bot di-mention atau user me-reply pesan bot, panggil AI Agent runAgent
    const botMention = `<@${message.client.user.id}>`;
    const botMentionNick = `<@!${message.client.user.id}>`;
    const isMentioned = message.content.includes(botMention) || message.content.includes(botMentionNick);

    let isReplyToBot = false;
    let referencedMessage = null;
    if (message.reference && message.reference.messageId) {
      try {
        referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
        if (referencedMessage && referencedMessage.author.id === message.client.user.id) {
          isReplyToBot = true;
        }
      } catch (err) {
        logger.error('[AI Trigger] Failed to fetch referenced message:', err);
      }
    }

    if (isMentioned || isReplyToBot) {
      try {
        // Bersihkan mention bot dari prompt jika ada
        let cleanPrompt = message.content
          .replace(botMention, '')
          .replace(botMentionNick, '')
          .trim();

        if (cleanPrompt.length === 0 && !isReplyToBot) {
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
          user: message.author,
          locale: message.guild?.preferredLocale,
          referencedMessage: referencedMessage
        };

        const response = await runAgent(cleanPrompt, context);

        const replyOptions = {
          content: 'Tugas selesai dijalankan.'
        };

        if (response.result?.responseText) {
          replyOptions.content = response.result.responseText;
        } else if (response.responseText) {
          replyOptions.content = response.responseText;
        }

        try {
          await message.reply(replyOptions);
        } catch (replyErr) {
          // If the original message was deleted (e.g. via a purge action), reply will throw 50035 Unknown Message.
          // Fallback to sending a direct channel message in this case.
          if (replyErr.code === 50035 || replyErr.message?.includes('Unknown message') || replyErr.message?.includes('message_reference')) {
            await message.channel.send(replyOptions);
          } else {
            throw replyErr;
          }
        }
      } catch (err) {
        logger.error('[AI Message Trigger] Failed to respond to mention:', err);
        try {
          await message.reply('Maaf, saya mengalami kesalahan saat memproses permintaan Anda.');
        } catch (fallbackErr) {
          if (fallbackErr.code === 50035 || fallbackErr.message?.includes('Unknown message') || fallbackErr.message?.includes('message_reference')) {
            await message.channel.send('Maaf, saya mengalami kesalahan saat memproses permintaan Anda.');
          } else {
            logger.error('[AI Message Trigger] Failed to send fallback error message:', fallbackErr);
          }
        }
      }
    }
  }
};
