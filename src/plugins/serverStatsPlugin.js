import { V2Embed } from '../utils/v2Embed.js';
import { ChannelType } from 'discord.js';

export const serverStatsPlugin = {
  name: 'serverStats',
  commands: ['Server Stats'],
  description: 'Retrieve general statistics about the Discord server, including member counts, channel counts by type, and server details.',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },

  async execute(args, context) {
    const { guild } = context;

    if (!guild) {
      return { success: false, error: 'Context requires a guild.' };
    }

    const totalMembers = guild.memberCount;

    // Fetch channels to make sure cache is populated
    let channels;
    try {
      channels = await guild.channels.fetch();
    } catch (err) {
      channels = guild.channels.cache;
    }

    let textCount = 0;
    let voiceCount = 0;
    let categoryCount = 0;
    let announcementCount = 0;
    let stageCount = 0;
    let forumCount = 0;
    let otherCount = 0;

    channels.forEach((channel) => {
      if (!channel) return;
      switch (channel.type) {
        case ChannelType.GuildText:
          textCount++;
          break;
        case ChannelType.GuildVoice:
          voiceCount++;
          break;
        case ChannelType.GuildCategory:
          categoryCount++;
          break;
        case ChannelType.GuildAnnouncement:
          announcementCount++;
          break;
        case ChannelType.GuildStageVoice:
          stageCount++;
          break;
        case ChannelType.GuildForum:
          forumCount++;
          break;
        default:
          otherCount++;
          break;
      }
    });

    const totalChannels = channels.size;

    const embed = new V2Embed()
      .setTitle(`Server Stats: ${guild.name} 📊`)
      .setDescription(
        `Berikut adalah statistik untuk server **${guild.name}**:\n\n` +
        `*   **Total Member:** \`${totalMembers}\`\n` +
        `*   **Total Channel:** \`${totalChannels}\` (termasuk Kategori)\n` +
        `    *   📝 Text Channels: \`${textCount}\`\n` +
        `    *   🔊 Voice Channels: \`${voiceCount}\`\n` +
        `    *   📁 Categories: \`${categoryCount}\`\n` +
        `    *   📢 Announcement Channels: \`${announcementCount}\`\n` +
        `    *   💬 Forum Channels: \`${forumCount}\`\n` +
        `    *   🎙️ Stage Channels: \`${stageCount}\`\n` +
        `    *   ⚙️ Lainnya: \`${otherCount}\``
      )
      .build();

    return {
      success: true,
      data: {
        guildId: guild.id,
        guildName: guild.name,
        totalMembers,
        totalChannels,
        channelsByType: {
          text: textCount,
          voice: voiceCount,
          category: categoryCount,
          announcement: announcementCount,
          stage: stageCount,
          forum: forumCount,
          other: otherCount
        }
      },
      responseText: `Di server **${guild.name}**, terdapat total **${totalMembers}** member dan **${totalChannels}** channel (kategori: ${categoryCount}, teks: ${textCount}, suara: ${voiceCount}).`,
      embeds: [embed]
    };
  }
};
