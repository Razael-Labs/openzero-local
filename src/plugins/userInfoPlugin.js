import { V2Embed } from '../utils/v2Embed.js';
import { getMessageCount } from '../utils/database.js';

export const userInfoPlugin = {
  name: 'userInfo',
  commands: ['User Info'],
  description:
    'Retrieve detailed information about a server member, including nickname, roles, join dates, and total message statistics.',
  parameters: {
    type: 'object',
    properties: {
      userId: { type: 'string', description: 'The ID of the member to query.' }
    },
    required: ['userId']
  },

  async execute(args, context) {
    const { userId } = args;
    const { guild } = context;

    if (!guild) {
      return { success: false, error: 'Context requires a guild.' };
    }

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
      return { success: false, error: `Member not found with ID: ${userId}` };
    }

    const msgCount = getMessageCount(guild.id, userId);

    const embed = new V2Embed()
      .setTitle(`User Info: ${member.user.tag} 👤`)
      .setDescription(
        `*   **Username:** \`${member.user.tag}\`\n` +
          `*   **ID:** \`${member.user.id}\`\n` +
          `*   **Joined Guild:** \`${member.joinedAt ? member.joinedAt.toDateString() : 'N/A'}\`\n` +
          `*   **Joined Discord:** \`${member.user.createdAt.toDateString()}\`\n` +
          `*   **Total Messages Sent:** \`${msgCount}\` pesan`
      )
      .build();

    return {
      success: true,
      data: { userId, tag: member.user.tag, joinedAt: member.joinedAt, messageCount: msgCount },
      responseText: `Berikut adalah profil pengguna **${member.user.tag}**:\n* **ID**: \`${member.user.id}\`\n* **Bergabung**: ${member.joinedAt?.toDateString()}\n* **Pesan dikirim**: \`${msgCount}\` pesan.`,
      embeds: [embed]
    };
  }
};
