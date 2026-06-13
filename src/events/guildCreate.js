import { Events, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { V2Embed } from '../utils/v2Embed.js';
import { t } from '../utils/i18n.js';
import { resolveEmoji } from '../utils/symbols.js';
import logger from '../utils/logger.js';

export default {
  name: Events.GuildCreate,
  once: false,
  /**
   * @param {import('discord.js').Guild} guild
   */
  async execute(guild) {
    logger.info(`[GuildCreate] Bot has been added to a new guild: ${guild.name} (${guild.id})`);

    // Determine locale based on server preferredLocale
    const locale = guild.preferredLocale && guild.preferredLocale.startsWith('id') ? 'id' : 'en';

    // Dynamically get the guild owner to greet them with a mention
    let ownerMention = 'Server Owner';
    try {
      const owner = await guild.fetchOwner();
      if (owner) {
        ownerMention = owner.toString();
      }
    } catch (err) {
      logger.warn(`[GuildCreate] Failed to fetch guild owner: ${err.message}`);
    }

    // Find system channel or the first text channel where bot can send messages
    const channel = guild.systemChannel || guild.channels.cache.find(
      (c) => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages')
    );

    if (!channel) {
      logger.warn(`[GuildCreate] No suitable text channel found to send greetings in guild: ${guild.name}`);
      return;
    }

    try {
      // Resolve title and description dynamically using the i18n translation engine
      const resolvedTitle = t('greetingsTitle', locale);
      const resolvedDescription = t('greetingsDescription', locale, {
        owner: ownerMention,
        guildName: guild.name
      });

      // Build documentation link button row
      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel(t('greetingsDocButton', locale))
          .setStyle(ButtonStyle.Link)
          .setURL('https://razael-fox.my.id/openzero-local')
          .setEmoji(resolveEmoji(guild, '📖'))
      );

      const embed = new V2Embed()
        .setTitle(resolvedTitle)
        .setDescription(resolvedDescription)
        .addActionRow(buttonRow)
        .build();

      await channel.send({
        components: [embed],
        flags: MessageFlags.IsComponentsV2
      });

      logger.info(`[GuildCreate] Greetings message (${locale}) sent successfully to channel: ${channel.name} in guild: ${guild.name}`);
    } catch (err) {
      logger.error(`[GuildCreate] Failed to send greetings message in guild ${guild.name}:`, err);
    }
  }
};
