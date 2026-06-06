import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { getOrCreateSession } from '../../utils/musicManager.js';
import { t } from '../../utils/i18n.js';
import { V2Embed } from '../../utils/v2Embed.js';
import play from 'play-dl';

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube')
    .setDescriptionLocalizations({
      id: 'Memutar lagu dari YouTube'
    })
    .addStringOption(option =>
      option.setName('query')
        .setDescription('YouTube URL or search query')
        .setDescriptionLocalizations({
          id: 'URL YouTube atau kata kunci pencarian'
        })
        .setRequired(true)
    )
    .setDMPermission(false),

  async execute(interaction) {
    const locale = interaction.locale;
    const query = interaction.options.getString('query');

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({
        embeds: [
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
        embeds: [
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
      let videoInfo = null;

      // Validate URL or do a search
      const isUrl = play.yt_validate(query) === 'video';

      if (isUrl) {
        videoInfo = await play.video_basic_info(query);
      } else {
        const searchResults = await play.search(query, { limit: 1 });
        if (searchResults.length === 0) {
          return interaction.editReply({
            embeds: [
              new V2Embed()
                .setTitle(t('errorTitle', locale))
                .setDescription(t('noMusicResults', locale, { query }))
                .setColor(0xff8800)
                .build()
            ],
            flags: MessageFlags.IsComponentsV2
          });
        }
        videoInfo = await play.video_basic_info(searchResults[0].url);
      }

      const track = {
        title: videoInfo.video_details.title,
        url: videoInfo.video_details.url,
        duration: videoInfo.video_details.durationRaw,
        thumbnail: videoInfo.video_details.thumbnails[0]?.url,
        requestedBy: interaction.user.toString()
      };

      const session = getOrCreateSession(interaction.guildId, voiceChannel, interaction.channel);
      session.addTrack(track);

      const embed = new V2Embed()
        .setTitle('Added to Queue ➕')
        .setDescription(t('addedToQueue', locale, { title: track.title }))
        .setThumbnail(track.thumbnail);

      await interaction.editReply({
        embeds: [embed.build()],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      await interaction.editReply({
        embeds: [
          new V2Embed()
            .setTitle(t('errorTitle', locale))
            .setDescription(`An error occurred while trying to process the track: \`${error.message}\``)
            .setColor(0xff3333)
            .build()
        ],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
