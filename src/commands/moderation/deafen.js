import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('deafen')
    .setDescription('Deafen a member in a voice channel (Server Deafen).')
    .addUserOption((option) =>
      option.setName('user').setDescription('The member to deafen').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for deafening').setRequired(false)
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

      // Hierarchy Check
      const executorMember = interaction.member;
      if (
        targetMember.roles.highest.position >= executorMember.roles.highest.position &&
        interaction.user.id !== guild.ownerId
      ) {
        const embed = new V2Embed()
          .setTitle('Permission Denied ❌')
          .setDescription(
            `You cannot deafen **${targetUser.tag}** because they have a higher or equal role hierarchy.`
          )
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

      if (targetMember.voice.deaf) {
        const embed = new V2Embed()
          .setTitle('Action Skipped ⚠️')
          .setDescription(`**${targetUser.tag}** is already server deafened.`)
          .setColor(0xffaa00)
          .build();
        return await interaction.editReply({
          components: [embed],
          flags: MessageFlags.IsComponentsV2
        });
      }

      // Deafen target
      await targetMember.voice.setDeafen(true, `${interaction.user.tag}: ${reason}`);

      const embed = new V2Embed()
        .setTitle('Member Deafened 🔇')
        .setDescription(
          `*   **Target:** ${targetUser} (\`${targetUser.tag}\`)\n` +
            `*   **Moderator:** ${interaction.user} (\`${interaction.user.tag}\`)\n` +
            `*   **Reason:** ${reason}`
        )
        .setColor(0xff5500)
        .build();

      await interaction.editReply({
        components: [embed],
        flags: MessageFlags.IsComponentsV2
      });

      logger.info(
        `[Moderation] ${targetUser.tag} has been server deafened by ${interaction.user.tag} for: ${reason}`
      );
    } catch (error) {
      logger.error('[Moderation Error] Failed to deafen user:', error);
      const embed = new V2Embed()
        .setTitle('System Error ❌')
        .setDescription('An unexpected error occurred while executing the deafen command.')
        .setColor(0xff3333)
        .build();
      await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
