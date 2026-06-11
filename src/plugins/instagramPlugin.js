import { V2Embed } from '../utils/v2Embed.js';
import logger from '../utils/logger.js';

export const instagramPlugin = {
  name: 'instagram',
  commands: ['instagram'],
  description: 'Stalk and fetch public details of an Instagram user profile.',
  parameters: {
    type: 'object',
    properties: {
      username: { type: 'string', description: 'The Instagram username to query.' }
    },
    required: ['username']
  },

  async execute(args, context) {
    const { username } = args;
    if (!username) {
      return { success: false, error: 'Username Instagram harus diisi.' };
    }

    try {
      // Clean up username from '@' symbol if present in arguments
      const cleanUsername = username.replace(/^@/, '');
      logger.info(`[Instagram Plugin] Querying Instagram stalker for: ${cleanUsername}`);
      const res = await fetch(
        `https://apis.snowping.eu.cc/api/stalker/instagram?usn=${encodeURIComponent(cleanUsername)}`
      );

      if (!res.ok) {
        throw new Error(`API returned status ${res.status}`);
      }

      const body = await res.json();

      // Handle the new response schema
      if (body.status !== 200 || !body.result) {
        return {
          success: false,
          error: body.message || 'Gagal mengambil informasi profil Instagram.'
        };
      }

      const result = body.result;

      const embed = new V2Embed()
        .setTitle(`Instagram Stalker: ${result.username || `@${cleanUsername}`} 📸`)
        .setDescription(
          `*   **Nama Lengkap:** ${result.name || '-'}\n` +
            `*   **Followers:** \`${result.followers || 0}\` pengikut\n` +
            `*   **Postingan (Uploads):** \`${result.uploads || 0}\` postingan\n` +
            `*   **Engagement Rate:** \`${result.engagement || '-'}\`\n` +
            `*   **Profil Link:** ${result.profileUrl ? `[Buka Instagram](${result.profileUrl})` : '-'}`
        );

      if (result.avatar) {
        embed.setThumbnail(result.avatar);
      }

      const buildEmbed = embed.build();

      return {
        success: true,
        data: result,
        responseText:
          `Berikut adalah informasi profil Instagram untuk **${result.username || `@${cleanUsername}`}**:\n` +
          `*   **Nama**: ${result.name || '-'}\n` +
          `*   **Followers**: \`${result.followers || 0}\` pengikut\n` +
          `*   **Postingan**: \`${result.uploads || 0}\` postingan.`,
        embeds: [buildEmbed]
      };
    } catch (error) {
      logger.error(`[Instagram Plugin] Error fetching Instagram data:`, error);
      return {
        success: false,
        error: `Gagal mengakses API Stalker Instagram: ${error.message}`
      };
    }
  }
};
