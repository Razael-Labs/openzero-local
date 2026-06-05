import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('undeafen')
    .setDescription('Undeafen a member in a voice channel (Server Undeafen).')
    .addUserOption((option) =>
      option.setName('user').setDescription('The member to undeafen').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for undeafening').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.DeafenMembers)
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) {
        const embed = new V2Embed()
          .setTitle('Error ❌')
          .setDescription(`User **${targetUser.tag}** is not a member of this server.`)
          .setColor(0xff3333)
          .build();
        return await interaction.editReply({
          components: [embed],
          flags: MessageFlags.IsComponentsV2
        });
      }

      if (!targetMember.voice.channelId) {
        const embed = new V2Embed()
          .setTitle('Action Failed ⚠️')
          .setDescription(`**${targetUser.tag}** is not connected to a voice channel.`)
          .setColor(0xffaa00)
          .build();
        return await interaction.editReply({
          components: [embed],
          flags: MessageFlags.IsComponentsV2
        });
      }

      if (!targetMember.voice.deaf) {
        const embed = new V2Embed()
          .setTitle('Action Skipped ⚠️')
          .setDescription(`**${targetUser.tag}** is not server deafened.`)
          .setColor(0xffaa00)
          .build();
        return await interaction.editReply({
          components: [embed],
          flags: MessageFlags.IsComponentsV2
        });
      }

      // Undeafen target
      await targetMember.voice.setDeafen(false, `${interaction.user.tag}: ${reason}`);

      const embed = new V2Embed()
        .setTitle('Member Undeafened 🔊')
        .setDescription(
          `*   **Target:** ${targetUser} (\`${targetUser.tag}\`)\n` +
            `*   **Moderator:** ${interaction.user} (\`${interaction.user.tag}\`)\n` +
            `*   **Reason:** ${reason}`
        )
        .setColor(0x00ff88)
        .build();

      await interaction.editReply({
        components: [embed],
        flags: MessageFlags.IsComponentsV2
      });

      logger.info(
        `[Moderation] ${targetUser.tag} has been server undeafened by ${interaction.user.tag} for: ${reason}`
      );
    } catch (error) {
      logger.error('[Moderation Error] Failed to undeafen user:', error);
      const embed = new V2Embed()
        .setTitle('System Error ❌')
        .setDescription('An unexpected error occurred while executing the undeafen command.')
        .setColor(0xff3333)
        .build();
      await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
