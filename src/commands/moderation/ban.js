import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server.')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to ban').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the ban').setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('delete_messages')
        .setDescription('Delete message history from this user')
        .setRequired(false)
        .addChoices(
          { name: 'Don\'t Delete', value: '0' },
          { name: 'Previous 24 Hours', value: '86400' },
          { name: 'Previous 7 Days', value: '604800' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteSeconds = parseInt(interaction.options.getString('delete_messages') || '0', 10);

    try {
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

      if (targetMember) {
        // Hierarchy Checks (only applicable if user is in the guild)
        if (!targetMember.bannable) {
          const embed = new V2Embed()
            .setTitle('Action Failed ❌')
            .setDescription(
              `I cannot ban **${targetUser.tag}**. They may have a higher role than me or are the server owner.`
            )
            .setColor(0xff3333)
            .build();
          return await interaction.editReply({
            components: [embed],
            flags: MessageFlags.IsComponentsV2
          });
        }

        const executorMember = interaction.member;
        if (
          targetMember.roles.highest.position >= executorMember.roles.highest.position &&
          interaction.user.id !== guild.ownerId
        ) {
          const embed = new V2Embed()
            .setTitle('Permission Denied ❌')
            .setDescription(
              `You cannot ban **${targetUser.tag}** because they have a higher or equal role hierarchy.`
            )
            .setColor(0xff3333)
            .build();
          return await interaction.editReply({
            components: [embed],
            flags: MessageFlags.IsComponentsV2
          });
        }
      }

      // Ban user (works even if user is not in the guild)
      await guild.members.ban(targetUser.id, {
        reason: `${interaction.user.tag}: ${reason}`,
        deleteMessageSeconds: deleteSeconds
      });

      // Success Embed
      const embed = new V2Embed()
        .setTitle('User Banned 🔨')
        .setDescription(
          `*   **Target:** ${targetUser} (\`${targetUser.tag}\`)\n` +
            `*   **Moderator:** ${interaction.user} (\`${interaction.user.tag}\`)\n` +
            `*   **Delete History:** \`${deleteSeconds === 0 ? 'None' : deleteSeconds === 86400 ? '24 Hours' : '7 Days'}\`\n` +
            `*   **Reason:** ${reason}`
        )
        .setColor(0xff3333) // Red accent for ban
        .build();

      await interaction.editReply({
        components: [embed],
        flags: MessageFlags.IsComponentsV2
      });

      logger.info(
        `[Moderation] ${targetUser.tag} has been banned by ${interaction.user.tag} for: ${reason}`
      );
    } catch (error) {
      logger.error('[Moderation Error] Failed to ban user:', error);
      const embed = new V2Embed()
        .setTitle('System Error ❌')
        .setDescription('An unexpected error occurred while executing the ban command.')
        .setColor(0xff3333)
        .build();
      await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
