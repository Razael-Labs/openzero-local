import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server.')
    .addUserOption((option) =>
      option.setName('user').setDescription('The member to kick').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the kick').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
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

      // Hierarchy Checks

      // 1. Can bot kick target?
      if (!targetMember.kickable) {
        const embed = new V2Embed()
          .setTitle('Action Failed ❌')
          .setDescription(
            `I cannot kick **${targetUser.tag}**. They may have a higher role than me or are the server owner.`
          )
          .setColor(0xff3333)
          .build();
        return await interaction.editReply({
          components: [embed],
          flags: MessageFlags.IsComponentsV2
        });
      }

      // 2. Can executor kick target?
      const executorMember = interaction.member;
      if (
        targetMember.roles.highest.position >= executorMember.roles.highest.position &&
        interaction.user.id !== guild.ownerId
      ) {
        const embed = new V2Embed()
          .setTitle('Permission Denied ❌')
          .setDescription(
            `You cannot kick **${targetUser.tag}** because they have a higher or equal role hierarchy.`
          )
          .setColor(0xff3333)
          .build();
        return await interaction.editReply({
          components: [embed],
          flags: MessageFlags.IsComponentsV2
        });
      }

      // Perform kick
      await targetMember.kick(`${interaction.user.tag}: ${reason}`);

      // Success Embed
      const embed = new V2Embed()
        .setTitle('Member Kicked 🥾')
        .setDescription(
          `*   **Target:** ${targetUser} (\`${targetUser.tag}\`)\n` +
            `*   **Moderator:** ${interaction.user} (\`${interaction.user.tag}\`)\n` +
            `*   **Reason:** ${reason}`
        )
        .setColor(0xffaa00) // Orange/Amber accent for warning action
        .build();

      await interaction.editReply({
        components: [embed],
        flags: MessageFlags.IsComponentsV2
      });

      logger.info(
        `[Moderation] ${targetUser.tag} has been kicked by ${interaction.user.tag} for: ${reason}`
      );
    } catch (error) {
      logger.error('[Moderation Error] Failed to kick user:', error);
      const embed = new V2Embed()
        .setTitle('System Error ❌')
        .setDescription('An unexpected error occurred while executing the kick command.')
        .setColor(0xff3333)
        .build();
      await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
