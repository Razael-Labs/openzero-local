import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a member (voice, text, or both).')
    .addUserOption((option) =>
      option.setName('user').setDescription('The member to unmute').setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('type')
        .setDescription('Unmute type')
        .setRequired(true)
        .addChoices(
          { name: 'Voice Only (Server Voice Unmute)', value: 'voice' },
          { name: 'Text Only (Remove Muted Role)', value: 'text' },
          { name: 'Both (Voice and Text)', value: 'both' }
        )
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for unmuting').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers)
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const targetUser = interaction.options.getUser('user');
    const unmuteType = interaction.options.getString('type');
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

      let voiceUnmuted = false;
      let textUnmuted = false;
      let warnings = [];

      // 1. Voice Unmute
      if (unmuteType === 'voice' || unmuteType === 'both') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.MuteMembers)) {
          const embed = new V2Embed()
            .setTitle('Permission Denied ❌')
            .setDescription('You need the `Mute Members` permission to voice-unmute.')
            .setColor(0xff3333)
            .build();
          return await interaction.editReply({
            components: [embed],
            flags: MessageFlags.IsComponentsV2
          });
        }

        if (!targetMember.voice.channelId) {
          warnings.push(
            'Target user is not connected to a voice channel (Voice Unmute was skipped).'
          );
        } else {
          await targetMember.voice.setMute(false, `${interaction.user.tag}: ${reason}`);
          voiceUnmuted = true;
        }
      }

      // 2. Text Unmute (Muted Role Removal)
      if (unmuteType === 'text' || unmuteType === 'both') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
          const embed = new V2Embed()
            .setTitle('Permission Denied ❌')
            .setDescription('You need the `Manage Roles` permission to remove the Muted role.')
            .setColor(0xff3333)
            .build();
          return await interaction.editReply({
            components: [embed],
            flags: MessageFlags.IsComponentsV2
          });
        }

        const mutedRole = guild.roles.cache.find((role) => role.name.toLowerCase() === 'muted');

        if (!mutedRole || !targetMember.roles.cache.has(mutedRole.id)) {
          warnings.push('User is not text-muted (does not have Muted role).');
        } else {
          const botMember = await guild.members.fetch(interaction.client.user.id);
          if (mutedRole.position >= botMember.roles.highest.position) {
            warnings.push(
              'I cannot remove the "Muted" role because it is higher than my highest role.'
            );
          } else {
            await targetMember.roles.remove(mutedRole, `${interaction.user.tag}: ${reason}`);
            textUnmuted = true;
          }
        }
      }

      // If nothing actually changed
      if (!voiceUnmuted && !textUnmuted) {
        const embed = new V2Embed()
          .setTitle('Unmute Skipped ⚠️')
          .setDescription(
            'No unmute action was performed.\n' +
              '*   **Warnings/Info:**\n' +
              warnings.map((w) => `    *   ${w}`).join('\n')
          )
          .setColor(0xffaa00)
          .build();
        return await interaction.editReply({
          components: [embed],
          flags: MessageFlags.IsComponentsV2
        });
      }

      // Success Embed
      let unmuteSummary = [];
      if (voiceUnmuted) unmuteSummary.push('Voice Unmuted (Server Unmute)');
      if (textUnmuted) unmuteSummary.push('Text Unmuted (Muted Role Removed)');

      const embed = new V2Embed()
        .setTitle('Member Unmuted 🔊')
        .setDescription(
          `*   **Target:** ${targetUser} (\`${targetUser.tag}\`)\n` +
            `*   **Moderator:** ${interaction.user} (\`${interaction.user.tag}\`)\n` +
            `*   **Actions:** ${unmuteSummary.join(' & ')}\n` +
            `*   **Reason:** ${reason}` +
            (warnings.length > 0
              ? `\n\n**Note/Warnings:**\n${warnings.map((w) => `*   ${w}`).join('\n')}`
              : '')
        )
        .setColor(0x00ff88) // Green accent for success/unmute
        .build();

      await interaction.editReply({
        components: [embed],
        flags: MessageFlags.IsComponentsV2
      });

      logger.info(
        `[Moderation] ${targetUser.tag} has been unmuted (${unmuteSummary.join(', ')}) by ${interaction.user.tag} for: ${reason}`
      );
    } catch (error) {
      logger.error('[Moderation Error] Failed to unmute user:', error);
      const embed = new V2Embed()
        .setTitle('System Error ❌')
        .setDescription('An unexpected error occurred while executing the unmute command.')
        .setColor(0xff3333)
        .build();
      await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
