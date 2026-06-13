import { Events, AttachmentBuilder } from 'discord.js';
import { config } from '../config.js';
import { t } from '../utils/i18n.js';
import { createWelcomeImage } from '../utils/welcomeCanvas.js';
import logger from '../utils/logger.js';

export default {
  name: Events.GuildMemberAdd,
  once: false,
  /**
   * @param {import('discord.js').GuildMember} member
   */
  async execute(member) {
    logger.info(
      `[GuildMemberAdd] New user joined: ${member.user.tag} (${member.id}) in guild: ${member.guild.name}`
    );

    // Tentukan locale berdasarkan preferredLocale server
    const locale =
      member.guild.preferredLocale && member.guild.preferredLocale.startsWith('id') ? 'id' : 'en';

    // Ambil channel tujuan untuk pesan welcome
    const channelId = config.welcome?.channelId;
    let channel = null;

    if (channelId) {
      try {
        channel = await member.guild.channels.fetch(channelId);
      } catch (err) {
        logger.warn(
          `[GuildMemberAdd] Failed to fetch welcome channel from config (${channelId}): ${err.message}`
        );
      }
    }

    // Fallback ke system channel jika channel config tidak ditemukan atau gagal di-fetch
    if (!channel) {
      channel = member.guild.systemChannel;
    }

    if (!channel) {
      logger.warn(
        `[GuildMemberAdd] No welcome or system channel detected in guild: ${member.guild.name}. Canceling welcome message.`
      );
      return;
    }

    try {
      // Generate gambar welcome custom menggunakan Canvas
      const imageBuffer = await createWelcomeImage(member, locale);
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'welcome.png' });

      // Terjemahkan pesan welcome dan kirim ke channel
      const welcomeText = t('welcomeMessage', locale, { user: member.toString() });
      await channel.send({
        content: welcomeText,
        files: [attachment]
      });

      logger.info(
        `[GuildMemberAdd] Welcome message successfully sent for ${member.user.tag} in channel: ${channel.name}`
      );
    } catch (error) {
      logger.error(
        `[GuildMemberAdd] Failed to create or send welcome message for ${member.user.tag}:`,
        error
      );
    }
  }
};
