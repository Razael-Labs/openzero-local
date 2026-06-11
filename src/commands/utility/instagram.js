import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import { isCommandEnabled } from '../../utils/pluginManager.js';
import { t } from '../../utils/i18n.js';
import { instagramPlugin } from '../../plugins/instagramPlugin.js';

export default {
  data: new SlashCommandBuilder()
    .setName('instagram')
    .setNameLocalizations({
      id: 'instagram',
      'en-US': 'instagram'
    })
    .setDescription('Cari informasi profil Instagram berdasarkan username.')
    .setDescriptionLocalizations({
      id: 'Cari informasi profil Instagram berdasarkan username.',
      'en-US': 'Search Instagram profile information by username.'
    })
    .addStringOption((option) =>
      option
        .setName('username')
        .setNameLocalizations({
          id: 'username',
          'en-US': 'username'
        })
        .setDescription('Username Instagram yang ingin dicari.')
        .setDescriptionLocalizations({
          id: 'Username Instagram yang ingin dicari.',
          'en-US': 'The Instagram username to look up.'
        })
        .setRequired(true)
    )
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const locale = interaction.locale;

    // Check if plugin is installed/enabled
    const enabled = await isCommandEnabled(interaction.guildId, 'instagram');
    if (!enabled) {
      const embed = new V2Embed()
        .setTitle('Plugin Not Installed ⚠️')
        .setDescription(
          t('pluginNotInstalledDesc', locale) ||
            'Plugin ini belum diinstal di server ini. Gunakan `/plugin install instagram` untuk mengaktifkannya.'
        );

      return interaction.reply({
        components: [embed.build()],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }

    await interaction.deferReply();

    const username = interaction.options.getString('username');
    const result = await instagramPlugin.execute({ username }, { guild: interaction.guild });

    if (!result.success) {
      const embed = new V2Embed()
        .setTitle('Error ❌')
        .setDescription(result.error || 'Terjadi kesalahan.');

      return interaction.editReply({
        components: [embed.build()],
        flags: MessageFlags.IsComponentsV2
      });
    }

    // Embed generated successfully in the plugin
    return interaction.editReply({
      components: result.embeds,
      flags: MessageFlags.IsComponentsV2
    });
  }
};
