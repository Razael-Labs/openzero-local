import { V2Embed } from '../utils/v2Embed.js';
import { getUserMessages } from '../utils/supabase.js';

export const messagesRecordPlugin = {
  name: 'messagesRecord',
  description: 'Retrieve the 7-day chat history log of a specific user within this server.',
  parameters: {
    type: 'object',
    properties: {
      userId: { type: 'string', description: 'The ID of the user to query.' }
    },
    required: ['userId']
  },

  async execute(args, context) {
    const { userId } = args;
    const { guild } = context;

    if (!guild) {
      return { success: false, error: 'Context requires a guild.' };
    }

    const records = await getUserMessages(guild.id, userId);

    const desc = records.length > 0
      ? records.slice(0, 10).map((r, i) => `${i + 1}. [#${r.channel_name || 'unknown-channel'}] \`${r.created_at}\`: ${r.content}`).join('\n')
      : 'No messages found in the last 7 days.';

    const embed = new V2Embed()
      .setTitle(`Messages Record: User ${userId} 📋`)
      .setDescription(desc)
      .build();

    return {
      success: true,
      data: { userId, totalRecords: records.length, sampleRecords: records.slice(0, 10) },
      responseText: `Ditemukan ${records.length} pesan tercatat dalam 7 hari terakhir untuk user ini.`,
      embeds: [embed]
    };
  }
};
