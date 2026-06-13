import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { musicSessions } from '../../utils/musicManager.js';
import { t } from '../../utils/i18n.js';
import { V2Embed } from '../../utils/v2Embed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the paused music')
    .setDescriptionLocalizations({
      id: 'Melanjutkan pemutaran musik'
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
    if (!session || !session.isPlaying) {
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

    const success = session.resume();

    if (success) {
      return interaction.reply({
        components: [
          new V2Embed().setTitle('Resumed ▶️').setDescription(t('resumedMusic', locale)).build()
        ],
        flags: MessageFlags.IsComponentsV2
      });
    } else {
      return interaction.reply({
        components: [
          new V2Embed()
            .setTitle(t('errorTitle', locale))
            .setDescription('Music is not paused.')
            .setColor(0xff8800)
            .build()
        ],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
