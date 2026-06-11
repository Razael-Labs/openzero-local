import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { musicSessions } from '../../utils/musicManager.js';
import { t } from '../../utils/i18n.js';
import { V2Embed } from '../../utils/v2Embed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playback, clear the queue, and leave voice channel')
    .setDescriptionLocalizations({
      id: 'Menghentikan pemutaran musik, mengosongkan antrean, dan keluar dari saluran suara'
    })
    .setDMPermission(false),

  async execute(interaction) {
    const locale = interaction.locale;
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({
        components: [
          new V2Embed()
            .setTitle(t('errorTitle', locale))
            .setDescription(t('notInVoiceChannel', locale))
            .setColor(0xff3333)
            .build()
        ],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const session = musicSessions.get(interaction.guildId);
    if (!session) {
      return interaction.reply({
        components: [
          new V2Embed()
            .setTitle(t('errorTitle', locale))
            .setDescription(t('noMusicPlaying', locale))
            .setColor(0xff3333)
            .build()
        ],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (interaction.guild.members.me.voice.channelId !== voiceChannel.id) {
      return interaction.reply({
        components: [
          new V2Embed()
            .setTitle(t('errorTitle', locale))
            .setDescription(t('differentVoiceChannel', locale))
            .setColor(0xff3333)
            .build()
        ],
        flags: MessageFlags.IsComponentsV2
      });
    }

    session.destroy();

    return interaction.reply({
      components: [
        new V2Embed().setTitle('Stopped ⏹️').setDescription(t('stoppedMusic', locale)).build()
      ],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
