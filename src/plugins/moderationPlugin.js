import { V2Embed } from '../utils/v2Embed.js';

export const moderationPlugin = {
  name: 'moderation',
  description: 'Perform moderation actions on members or text channels. Actions include "kick", "ban", "mute", "unmute", "timeout" (time-out a user), and "purge" (delete messages).',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['kick', 'ban', 'mute', 'unmute', 'timeout', 'purge'], description: 'Moderation action to perform.' },
      targetId: { type: 'string', description: 'User ID of the target member.' },
      reason: { type: 'string', description: 'Reason for the moderation action.' },
      duration: { type: 'integer', description: 'Timeout duration in minutes (required for "timeout").' },
      amount: { type: 'integer', description: 'Amount of messages to delete (1-100, default 100, required for "purge").' },
      channelId: { type: 'string', description: 'Channel ID to purge messages in (required for "purge").' }
    },
    required: ['action']
  },

  async execute(args, context) {
    const { action, targetId, reason, duration, amount, channelId } = args;
    const { guild, member: executor, client } = context;

    if (!guild) {
      return { success: false, error: 'Context requires a guild.' };
    }

    const cleanReason = reason || 'Action performed by AI Agent.';

    if (action === 'purge') {
      const purgeChannelId = channelId || context.channel?.id;
      if (!purgeChannelId) {
        return { success: false, error: 'Channel ID is required for purge.' };
      }
      const channel = guild.channels.cache.get(purgeChannelId);
      if (!channel) {
        return { success: false, error: `Channel not found with ID: ${purgeChannelId}` };
      }

      const limit = amount ? Math.min(Math.max(amount, 1), 100) : 100;
      const deleted = await channel.bulkDelete(limit, true);

      const embed = new V2Embed()
        .setTitle('Messages Purged Successfully! ✅')
        .setDescription(`Deleted **${deleted.size}** messages in <#${channel.id}>.`)
        .build();

      return {
        success: true,
        method: 'purge',
        responseText: `Saya telah menghapus **${deleted.size}** pesan di channel <#${channel.id}>.`,
        embeds: [embed]
      };
    }

    // Member-based moderation commands require targetId
    if (!targetId) {
      return { success: false, error: `Target ID is required for action: ${action}` };
    }

    const target = await guild.members.fetch(targetId).catch(() => null);
    if (!target) {
      return { success: false, error: `Target member not found with ID: ${targetId}` };
    }

    if (action === 'kick') {
      await target.kick(cleanReason);
      const embed = new V2Embed().setTitle('Member Kicked! 👢').setDescription(`Successfully kicked **${target.user.tag}**. Reason: ${cleanReason}`).build();
      return {
        success: true,
        method: 'kick',
        responseText: `Saya telah me-kick **${target.user.tag}**. Alasan: ${cleanReason}`,
        embeds: [embed]
      };
    } else if (action === 'ban') {
      await target.ban({ reason: cleanReason });
      const embed = new V2Embed().setTitle('Member Banned! 🔨').setDescription(`Successfully banned **${target.user.tag}**. Reason: ${cleanReason}`).build();
      return {
        success: true,
        method: 'ban',
        responseText: `Saya telah mem-ban **${target.user.tag}**. Alasan: ${cleanReason}`,
        embeds: [embed]
      };
    } else if (action === 'mute') {
      // If voice-connected, voice mute
      if (target.voice?.channel) {
        await target.voice.setMute(true, cleanReason);
      }
      // Apply Muted role
      const mutedRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'muted');
      if (mutedRole) {
        await target.roles.add(mutedRole);
      }
      const embed = new V2Embed().setTitle('Member Muted! 🔇').setDescription(`Successfully muted **${target.user.tag}**.`).build();
      return {
        success: true,
        method: 'mute',
        responseText: `Saya telah me-mute **${target.user.tag}**.`,
        embeds: [embed]
      };
    } else if (action === 'unmute') {
      if (target.voice?.channel) {
        await target.voice.setMute(false, cleanReason);
      }
      const mutedRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'muted');
      if (mutedRole) {
        await target.roles.remove(mutedRole);
      }
      const embed = new V2Embed().setTitle('Member Unmuted! 🔊').setDescription(`Successfully unmuted **${target.user.tag}**.`).build();
      return {
        success: true,
        method: 'unmute',
        responseText: `Saya telah meng-unmute **${target.user.tag}**.`,
        embeds: [embed]
      };
    } else if (action === 'timeout') {
      const ms = (duration || 60) * 60 * 1000;
      await target.timeout(ms, cleanReason);
      const embed = new V2Embed().setTitle('Member Timed Out! ⏱️').setDescription(`Successfully timed out **${target.user.tag}** for ${duration || 60} minutes.`).build();
      return {
        success: true,
        method: 'timeout',
        responseText: `Saya telah men-timeout **${target.user.tag}** selama ${duration || 60} menit.`,
        embeds: [embed]
      };
    }

    return { success: false, error: `Unsupported action: ${action}` };
  }
};
