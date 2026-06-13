import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete messages from the channel.')
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('Number of messages to delete (1-100, default is 100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const amount = interaction.options.getInteger('amount') || 100;
    const channel = interaction.channel;

    try {
      // Bulk delete messages
      const deletedMessages = await channel.bulkDelete(amount, true);
      const deletedCount = deletedMessages.size;

      const embed = new V2Embed()
        .setTitle('Purge Successful 🧹')
        .setDescription(
          `*   **Pesan Terhapus:** \`${deletedCount}\`\n` +
            `*   **Saluran:** ${channel}\n` +
            `*   **Moderator:** ${interaction.user}\n\n` +
            '*Catatan: Pesan yang lebih dari 14 hari tidak dapat dihapus secara massal oleh sistem Discord.*'
        )
        .build();

      await interaction.editReply({
        components: [embed],
        flags: MessageFlags.IsComponentsV2
      });

      logger.info(
        `[Moderation] ${interaction.user.tag} cleared ${deletedCount} messages in channel #${channel.name}`
      );
    } catch (error) {
      logger.error('[Moderation Error] Failed to purge:', error);
      const embed = new V2Embed()
        .setTitle('System Error ❌')
        .setDescription('Terjadi kesalahan saat menghapus pesan di saluran ini.')
        .setColor(0xff3333)
        .build();
      await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
