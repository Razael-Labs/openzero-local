import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import logger from '../../utils/logger.js';
import { addBadWordLocally, removeBadWordLocally, getBadWordsLocally } from '../../utils/database.js';
import { reloadPatterns } from '../../moderation/preFilter.js';
import { isCommandEnabled } from '../../utils/pluginManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('bad-word')
    .setDescription('Manage the custom bad words moderation list.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Add a new bad word to the filter database.')
        .addStringOption((option) =>
          option
            .setName('content')
            .setDescription('The bad word to filter.')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Remove a bad word from the filter database.')
        .addStringOption((option) =>
          option
            .setName('content')
            .setDescription('The bad word to remove.')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('List all custom bad words currently in the filter database.')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const enabled = await isCommandEnabled(interaction.guildId, 'bad-word');
    if (!enabled) {
      const embed = new V2Embed()
        .setTitle('Plugin Not Installed ⚠️')
        .setDescription(
          'Plugin ini belum diinstal di server ini. Gunakan `/plugin install badWord` untuk mengaktifkannya.'
        );

      return interaction.reply({
        components: [embed.build()],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const subcommand = interaction.options.getSubcommand();
    const word = interaction.options.getString('content');

    try {
      if (subcommand === 'add') {
        const added = addBadWordLocally(word);
        if (added) {
          reloadPatterns();
          const embed = new V2Embed()
            .setTitle('Bad Word Added ⚠️')
            .setDescription(
              `*   **Kata Baru:** \`${word.toLowerCase()}\`\n` +
                `*   **Status:** Berhasil ditambahkan & regex pre-filter diperbarui.\n` +
                `*   **Moderator:** ${interaction.user}`
            )
            .build();
          await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
          logger.info(`[Moderation] ${interaction.user.tag} added bad word: "${word}"`);
        } else {
          const embed = new V2Embed()
            .setTitle('Gagal Menambahkan ❌')
            .setDescription(`Kata \`${word.toLowerCase()}\` sudah ada di database filter.`)
            .build();
          await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
        }
      } else if (subcommand === 'remove') {
        const removed = removeBadWordLocally(word);
        if (removed) {
          reloadPatterns();
          const embed = new V2Embed()
            .setTitle('Bad Word Removed 🧹')
            .setDescription(
              `*   **Kata Dihapus:** \`${word.toLowerCase()}\`\n` +
                `*   **Status:** Berhasil dihapus & regex pre-filter diperbarui.\n` +
                `*   **Moderator:** ${interaction.user}`
            )
            .build();
          await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
          logger.info(`[Moderation] ${interaction.user.tag} removed bad word: "${word}"`);
        } else {
          const embed = new V2Embed()
            .setTitle('Gagal Menghapus ❌')
            .setDescription(`Kata \`${word.toLowerCase()}\` tidak ditemukan di database filter.`)
            .build();
          await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
        }
      } else if (subcommand === 'list') {
        const words = getBadWordsLocally();
        const embed = new V2Embed()
          .setTitle('Custom Bad Words List 📋')
          .setDescription(
            words.length > 0
              ? words.map((w) => `- \`${w}\``).join('\n')
              : '*Belum ada kata kasar kustom yang ditambahkan.*'
          )
          .build();
        await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
      }
    } catch (error) {
      logger.error(`[Moderation Error] Failed managing bad word subcommand "${subcommand}":`, error);
      const embed = new V2Embed()
        .setTitle('System Error ❌')
        .setDescription('Terjadi kesalahan saat memproses permintaan pengelolaan kata kasar.')
        .build();
      await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
