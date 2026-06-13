import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { getOrCreateSession, fetchVideoInfoViaYtDlp } from '../../utils/musicManager.js';
import { t } from '../../utils/i18n.js';
import { V2Embed } from '../../utils/v2Embed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube')
    .setDescriptionLocalizations({
      id: 'Memutar lagu dari YouTube'
    })
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('YouTube URL or search query')
        .setDescriptionLocalizations({
          id: 'URL YouTube atau kata kunci pencarian'
        })
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName('twentyfour-seven')
        .setDescription('Keep the bot in the voice channel 24/7')
        .setDescriptionLocalizations({
          id: 'Biarkan bot menetap di saluran suara 24/7'
        })
        .setRequired(false)
    )
    .setDMPermission(false),

  async execute(interaction) {
    const locale = interaction.locale;
    const query = interaction.options.getString('query');

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

    const botVoiceState = interaction.guild.members.me.voice;
    if (botVoiceState.channelId && botVoiceState.channelId !== voiceChannel.id) {
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

    await interaction.deferReply();

    try {
      const videoInfo = await fetchVideoInfoViaYtDlp(query);

      const track = {
        title: videoInfo.title,
        url: videoInfo.url,
        duration: videoInfo.duration,
        thumbnail: videoInfo.thumbnail,
        requestedBy: interaction.user.toString()
      };

      const twentyFourSeven = interaction.options.getBoolean('twentyfour-seven') ?? false;

      const session = getOrCreateSession(interaction.guildId, voiceChannel, interaction.channel);
      session.locale = locale;
      session.is247 = twentyFourSeven;
      session.addTrack(track);

      const embed = new V2Embed()
        .setTitle('Added to Queue ➕')
        .setDescription(t('addedToQueue', locale, { title: track.title }))
        .setThumbnail(track.thumbnail);

      await interaction.editReply({
        components: [embed.build()],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      await interaction.editReply({
        components: [
          new V2Embed()
            .setTitle(t('errorTitle', locale))
            .setDescription(
              `An error occurred while trying to process the track: \`${error.message}\``
            )
            .setColor(0xff3333)
            .build()
        ],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
