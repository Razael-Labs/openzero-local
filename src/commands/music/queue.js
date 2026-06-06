import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { musicSessions } from '../../utils/musicManager.js';
import { t } from '../../utils/i18n.js';
import { V2Embed } from '../../utils/v2Embed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current music queue list')
    .setDescriptionLocalizations({
      id: 'Menampilkan daftar antrean musik saat ini'
    })
    .setDMPermission(false),

  async execute(interaction) {
    const locale = interaction.locale;
    const session = musicSessions.get(interaction.guildId);

    if (!session || (!session.currentTrack && session.queue.length === 0)) {
      return interaction.reply({
        embeds: [
          new V2Embed()
            .setTitle(t('queueTitle', locale))
            .setDescription(t('queueEmpty', locale))
            .build()
        ],
        flags: MessageFlags.IsComponentsV2
      });
    }

    let description = '';
    if (session.currentTrack) {
      description += `🎶 **Now Playing:**\n**[${session.currentTrack.title}](${session.currentTrack.url})** (⏱️ \`${session.currentTrack.duration}\`) | Requested by: ${session.currentTrack.requestedBy}\n\n`;
    }

    if (session.queue.length > 0) {
      description += `📋 **Upcoming Queue:**\n`;
      session.queue.forEach((track, index) => {
        description += `${index + 1}. **[${track.title}](${track.url})** (⏱️ \`${track.duration}\`) | Requested by: ${track.requestedBy}\n`;
      });
    } else {
      description += `*No upcoming songs in the queue.*`;
    }

    return interaction.reply({
      embeds: [
        new V2Embed()
          .setTitle(t('queueTitle', locale))
          .setDescription(description)
          .build()
      ],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
