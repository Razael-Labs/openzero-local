import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a member (voice, text, or both).')
    .addUserOption((option) =>
      option.setName('user').setDescription('The member to mute').setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('type')
        .setDescription('Mute type')
        .setRequired(true)
        .addChoices(
          { name: 'Voice Only (Server Voice Mute)', value: 'voice' },
          { name: 'Text Only (Muted Role)', value: 'text' },
          { name: 'Both (Voice and Text)', value: 'both' }
        )
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for muting').setRequired(false)
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
    const muteType = interaction.options.getString('type');
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
            `You cannot mute **${targetUser.tag}** because they have a higher or equal role hierarchy.`
          )
          .setColor(0xff3333)
          .build();
        return await interaction.editReply({
          components: [embed],
          flags: MessageFlags.IsComponentsV2
        });
      }

      let voiceMuted = false;
      let textMuted = false;
      let warnings = [];

      // 1. Voice Mute
      if (muteType === 'voice' || muteType === 'both') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.MuteMembers)) {
          const embed = new V2Embed()
            .setTitle('Permission Denied ❌')
            .setDescription('You need the `Mute Members` permission to voice-mute.')
            .setColor(0xff3333)
            .build();
          return await interaction.editReply({
            components: [embed],
            flags: MessageFlags.IsComponentsV2
          });
        }

        if (!targetMember.voice.channelId) {
          warnings.push(
            'Target user is not connected to a voice channel (Voice Mute was skipped).'
          );
        } else {
          await targetMember.voice.setMute(true, `${interaction.user.tag}: ${reason}`);
          voiceMuted = true;
        }
      }

      // 2. Text Mute (Muted Role)
      if (muteType === 'text' || muteType === 'both') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
          const embed = new V2Embed()
            .setTitle('Permission Denied ❌')
            .setDescription('You need the `Manage Roles` permission to assign the Muted role.')
            .setColor(0xff3333)
            .build();
          return await interaction.editReply({
            components: [embed],
            flags: MessageFlags.IsComponentsV2
          });
        }

        // Find or create Muted role
        let mutedRole = guild.roles.cache.find((role) => role.name.toLowerCase() === 'muted');

        if (!mutedRole) {
          try {
            mutedRole = await guild.roles.create({
              name: 'Muted',
              color: 0x818386,
              reason: 'Automatic Muted role creation for text mute',
              permissions: [] // Deny all by default or configure below
            });

            // Set Channel Overrides for all text channels
            for (const [, channel] of guild.channels.cache) {
              if (channel.isTextBased()) {
                await channel.permissionOverwrites
                  .edit(mutedRole, {
                    SendMessages: false,
                    AddReactions: false,
                    CreatePublicThreads: false,
                    CreatePrivateThreads: false,
                    SendMessagesInThreads: false
                  })
                  .catch(() => null);
              }
            }
          } catch (createRoleError) {
            logger.error('[Moderation Error] Failed to create Muted role:', createRoleError);
            warnings.push('Could not create or configure the "Muted" role.');
          }
        }

        if (mutedRole) {
          if (targetMember.roles.cache.has(mutedRole.id)) {
            warnings.push('User is already text-muted (already has Muted role).');
          } else {
            const botMember = await guild.members.fetch(interaction.client.user.id);
            if (mutedRole.position >= botMember.roles.highest.position) {
              warnings.push(
                'I cannot assign the "Muted" role because it is higher than my highest role.'
              );
            } else {
              await targetMember.roles.add(mutedRole, `${interaction.user.tag}: ${reason}`);
              textMuted = true;
            }
          }
        }
      }

      // If nothing actually changed
      if (!voiceMuted && !textMuted) {
        const embed = new V2Embed()
          .setTitle('Mute Skipped ⚠️')
          .setDescription(
            'No mute action was performed.\n' +
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
      let muteSummary = [];
      if (voiceMuted) muteSummary.push('Voice Muted (Server Mute)');
      if (textMuted) muteSummary.push('Text Muted (Muted Role)');

      const embed = new V2Embed()
        .setTitle('Member Muted 🔇')
        .setDescription(
          `*   **Target:** ${targetUser} (\`${targetUser.tag}\`)\n` +
            `*   **Moderator:** ${interaction.user} (\`${interaction.user.tag}\`)\n` +
            `*   **Actions:** ${muteSummary.join(' & ')}\n` +
            `*   **Reason:** ${reason}` +
            (warnings.length > 0
              ? `\n\n**Note/Warnings:**\n${warnings.map((w) => `*   ${w}`).join('\n')}`
              : '')
        )
        .setColor(0xff5500)
        .build();

      await interaction.editReply({
        components: [embed],
        flags: MessageFlags.IsComponentsV2
      });

      logger.info(
        `[Moderation] ${targetUser.tag} has been muted (${muteSummary.join(', ')}) by ${interaction.user.tag} for: ${reason}`
      );
    } catch (error) {
      logger.error('[Moderation Error] Failed to mute user:', error);
      const embed = new V2Embed()
        .setTitle('System Error ❌')
        .setDescription('An unexpected error occurred while executing the mute command.')
        .setColor(0xff3333)
        .build();
      await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
