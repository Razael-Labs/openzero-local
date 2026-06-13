import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import { t } from '../../utils/i18n.js';
import logger from '../../utils/logger.js';
import {
  addCustomScamLink,
  removeCustomScamLink,
  fetchCustomScamLinks
} from '../../utils/supabase.js';
import {
  addCustomScamDomain,
  removeCustomScamDomain
} from '../../moderation/scamFilter.js';

export default {
  data: new SlashCommandBuilder()
    .setName('scam-link')
    .setDescription('Manage custom blacklisted scam/phishing links stored in Supabase.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Add a custom domain to the scam blacklist.')
        .addStringOption((option) =>
          option
            .setName('domain')
            .setDescription('The domain to block (e.g. evil-phish.xyz)')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Remove a custom domain from the scam blacklist.')
        .addStringOption((option) =>
          option
            .setName('domain')
            .setDescription('The domain to unblock')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('List all custom domains currently blacklisted.')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const locale = interaction.locale;
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'add') {
        const domainInput = interaction.options.getString('domain').trim().toLowerCase();
        
        await addCustomScamLink(domainInput, interaction.guildId, interaction.user.id);
        addCustomScamDomain(domainInput);

        const embed = new V2Embed()
          .setTitle('Success ✅')
          .setDescription(t('customScamLinkAdded', locale, { domain: domainInput }))
          .build();

        return await interaction.editReply({
          components: [embed],
          flags: MessageFlags.IsComponentsV2
        });
      }

      if (subcommand === 'remove') {
        const domainInput = interaction.options.getString('domain').trim().toLowerCase();

        // Check if list currently has it (optional check, but let's just delete it)
        await removeCustomScamLink(domainInput);
        removeCustomScamDomain(domainInput);

        const embed = new V2Embed()
          .setTitle('Success ✅')
          .setDescription(t('customScamLinkRemoved', locale, { domain: domainInput }))
          .build();

        return await interaction.editReply({
          components: [embed],
          flags: MessageFlags.IsComponentsV2
        });
      }

      if (subcommand === 'list') {
        const list = await fetchCustomScamLinks();
        
        const embed = new V2Embed()
          .setTitle(t('customScamLinksListTitle', locale));

        if (!list || list.length === 0) {
          embed.setDescription(t('customScamLinksListEmpty', locale));
        } else {
          const formattedList = list.map((item, index) => {
            return `${index + 1}. **${item.domain}** (Added by: <@${item.added_by}>)`;
          }).join('\n');
          embed.setDescription(formattedList);
        }

        return await interaction.editReply({
          components: [embed.build()],
          flags: MessageFlags.IsComponentsV2
        });
      }
    } catch (err) {
      if (err.message === 'SUPABASE_NOT_CONFIGURED') {
        const embed = new V2Embed()
          .setTitle('Configuration Error ❌')
          .setDescription(t('supabaseNotConfiguredError', locale))
          .setColor(0xff3333)
          .build();

        return await interaction.editReply({
          components: [embed],
          flags: MessageFlags.IsComponentsV2
        });
      }

      logger.error(`[Scam Link Command] Failed execution: ${err.message}`, err);
      const embed = new V2Embed()
        .setTitle('Error ❌')
        .setDescription(err.message || 'An unexpected error occurred.')
        .setColor(0xff3333)
        .build();

      return await interaction.editReply({
        components: [embed],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
