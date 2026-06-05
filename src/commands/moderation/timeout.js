import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Place a member in timeout or remove their timeout.')
    .addUserOption((option) =>
      option.setName('user').setDescription('The member to timeout').setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('duration')
        .setDescription('Duration of the timeout')
        .setRequired(true)
        .addChoices(
          { name: '60 Seconds', value: '60000' },
          { name: '5 Minutes', value: '300000' },
          { name: '10 Minutes', value: '600000' },
          { name: '1 Hour', value: '3600000' },
          { name: '1 Day', value: '86400000' },
          { name: '1 Week', value: '604800000' },
          { name: 'Remove Timeout', value: '0' }
        )
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the timeout').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const targetUser = interaction.options.getUser('user');
    const durationMs = parseInt(interaction.options.getString('duration'), 10);
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
            `You cannot moderate **${targetUser.tag}** because they have a higher or equal role hierarchy.`
          )
          .setColor(0xff3333)
          .build();
        return await interaction.editReply({
          components: [embed],
          flags: MessageFlags.IsComponentsV2
        });
      }

      if (durationMs > 0) {
        // Apply Timeout
        if (!targetMember.moderatable) {
          const embed = new V2Embed()
            .setTitle('Action Failed ❌')
            .setDescription(
              `I cannot timeout **${targetUser.tag}**. They may have a higher role than me or are the server owner.`
            )
            .setColor(0xff3333)
            .build();
          return await interaction.editReply({
            components: [embed],
            flags: MessageFlags.IsComponentsV2
          });
        }

        await targetMember.timeout(durationMs, `${interaction.user.tag}: ${reason}`);

        // Duration string parser for display
        const durationLabels = {
          60000: '60 Seconds',
          300000: '5 Minutes',
          600000: '10 Minutes',
          3600000: '1 Hour',
          86400000: '1 Day',
          604800000: '1 Week'
        };

        const embed = new V2Embed()
          .setTitle('Member Timed Out ⏳')
          .setDescription(
            `*   **Target:** ${targetUser} (\`${targetUser.tag}\`)\n` +
              `*   **Moderator:** ${interaction.user} (\`${interaction.user.tag}\`)\n` +
              `*   **Duration:** \`${durationLabels[durationMs] || durationMs + ' ms'}\`\n` +
              `*   **Reason:** ${reason}`
          )
          .setColor(0xff7700)
          .build();

        await interaction.editReply({
          components: [embed],
          flags: MessageFlags.IsComponentsV2
        });

        logger.info(
          `[Moderation] ${targetUser.tag} has been timed out for ${durationMs}ms by ${interaction.user.tag} for: ${reason}`
        );
      } else {
        // Remove Timeout
        if (!targetMember.communicationDisabledUntilTimestamp) {
          const embed = new V2Embed()
            .setTitle('Action Skipped ⚠️')
            .setDescription(`**${targetUser.tag}** is not currently in a timeout.`)
            .setColor(0xffaa00)
            .build();
          return await interaction.editReply({
            components: [embed],
            flags: MessageFlags.IsComponentsV2
          });
        }

        await targetMember.timeout(null, `${interaction.user.tag}: ${reason}`);

        const embed = new V2Embed()
          .setTitle('Timeout Removed 🔊')
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
          `[Moderation] Timeout removed for ${targetUser.tag} by ${interaction.user.tag}.`
        );
      }
    } catch (error) {
      logger.error('[Moderation Error] Failed to timeout user:', error);
      const embed = new V2Embed()
        .setTitle('System Error ❌')
        .setDescription('An unexpected error occurred while executing the timeout command.')
        .setColor(0xff3333)
        .build();
      await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
