import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import { t } from '../../utils/i18n.js';
import logger from '../../utils/logger.js';
import { resolveEmoji } from '../../utils/symbols.js';

// Memory cache for active search sessions (tracks pagination)
export const musicSearchCache = new Map();

/**
 * Format track duration in milliseconds to MM:SS
 */
function formatDuration(ms) {
  if (!ms) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Helper to fetch music from iTunes Search API
 */
async function searchMusic(query) {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=15`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'OpenZero-Bot-Music-Search'
      }
    });
    if (!response.ok) {
      throw new Error(`iTunes API HTTP Error ${response.status}`);
    }
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    logger.error('[Music Search API] Error fetching tracks:', error);
    return [];
  }
}

/**
 * Helper to fetch lyrics from LRCLIB API
 */
export async function getLyricsForTrack(sessionId, trackIndex, locale) {
  const session = musicSearchCache.get(sessionId);
  if (!session) {
    return new V2Embed()
      .setTitle(t('sessionExpiredTitle', locale))
      .setDescription(t('searchExpired', locale))
      .setColor(0xff3333)
      .build();
  }

  const track = session.results[trackIndex];
  if (!track) {
    return new V2Embed()
      .setTitle(t('errorTitle', locale))
      .setDescription(t('lyricsSearchError', locale))
      .setColor(0xff3333)
      .build();
  }

  const artistName = track.artistName;
  const trackName = track.trackName;

  try {
    const searchUrl = `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artistName)}&track_name=${encodeURIComponent(trackName)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'OpenZero-Bot-Lyrics-Lookup'
      }
    });

    if (!response.ok) {
      throw new Error(`LRCLIB HTTP Error ${response.status}`);
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      return new V2Embed()
        .setTitle(t('lyricsTitle', locale, { track: trackName }))
        .setDescription(t('lyricsNotFound', locale, { track: trackName, artist: artistName }))
        .setColor(0xff8800)
        .build();
    }

    // Prefer synced lyrics, fall back to plain lyrics
    const match = data[0];
    let lyricsText = match.syncedLyrics || match.plainLyrics;

    if (!lyricsText) {
      return new V2Embed()
        .setTitle(t('lyricsTitle', locale, { track: trackName }))
        .setDescription(t('lyricsNotFound', locale, { track: trackName, artist: artistName }))
        .setColor(0xff8800)
        .build();
    }

    // Clean up timestamps if synced lyrics are too cluttered, or show them as is
    // Limit to fits in Discord character limits (4096)
    if (lyricsText.length > 3000) {
      lyricsText = lyricsText.substring(0, 2997) + '...';
    }

    return new V2Embed()
      .setTitle(t('lyricsTitle', locale, { track: trackName }))
      .setDescription(`**Artist:** \`${artistName}\`\n\n${lyricsText}`)
      .build();
  } catch (error) {
    logger.error('[Lyrics API] Error fetching lyrics:', error);
    return new V2Embed()
      .setTitle(t('errorTitle', locale))
      .setDescription(t('lyricsSearchError', locale))
      .setColor(0xff3333)
      .build();
  }
}

/**
 * Generates the music search embed and buttons
 * @param {string} sessionId
 * @param {number} pageIndex
 * @param {string} locale
 */
export function generateMusicSearchEmbed(sessionId, pageIndex, locale = 'id') {
  const session = musicSearchCache.get(sessionId);
  if (!session) {
    return {
      embed: new V2Embed()
        .setTitle(t('sessionExpiredTitle', locale))
        .setDescription(t('searchExpired', locale))
        .setColor(0xff3333)
        .build(),
      components: []
    };
  }

  const { query, results } = session;
  const itemsPerPage = 3;
  const totalPages = Math.ceil(results.length / itemsPerPage) || 1;
  const currentPage = Math.max(0, Math.min(pageIndex, totalPages - 1));

  const start = currentPage * itemsPerPage;
  const end = start + itemsPerPage;
  const pageItems = results.slice(start, end);

  let description = `${t('musicResultsFor', locale, { query })}\n`;

  const topTrack = pageItems[0];
  const artworkUrl =
    topTrack && topTrack.artworkUrl100
      ? topTrack.artworkUrl100.replace('100x100bb', '400x400bb')
      : null;

  if (artworkUrl) {
    description += `![Cover Art](${artworkUrl})\n\n`;
  }

  if (pageItems.length === 0) {
    description += `*${t('none', locale)}*`;
  } else {
    pageItems.forEach((track, index) => {
      const globalIndex = start + index + 1;
      const releaseYear = track.releaseDate ? new Date(track.releaseDate).getFullYear() : 'N/A';
      description += `**━━━━━ [ #${globalIndex} ] ━━━━━**\n`;
      description += `🎵 **${track.trackName}**\n`;
      description += `👤 *Artist:* \`${track.artistName}\`\n`;
      description += `💿 *Album:* *${track.collectionName || 'Single'}* (${releaseYear})\n`;
      description += `⏱️ *Durasi:* \`${formatDuration(track.trackTimeMillis)}\` ┃ 🎼 *Genre:* \`${track.primaryGenreName || 'N/A'}\`\n`;
      description += `🔗 [Buka di Apple Music](${track.trackViewUrl})\n\n`;
    });
  }

  description += `✨ *${t('pageText', locale, { current: currentPage + 1, total: totalPages })}*`;

  // Create paginator row
  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`music_search_prev_${currentPage - 1}_${sessionId}`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji(resolveEmoji(null, '⬅️'))
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId(`music_search_next_${currentPage + 1}_${sessionId}`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji(resolveEmoji(null, '➡️'))
      .setDisabled(currentPage >= totalPages - 1)
  );

  const actionRows = [navRow];

  // Create lyrics buttons row
  if (pageItems.length > 0) {
    const lyricsRow = new ActionRowBuilder();
    pageItems.forEach((track, index) => {
      const globalIndex = start + index + 1;
      lyricsRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`music_search_lyrics_${start + index}_${sessionId}`)
          .setLabel(t('lyricsButtonLabel', locale, { index: globalIndex }))
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(resolveEmoji(null, '🎤'))
      );
    });
    actionRows.push(lyricsRow);

    // Create preview buttons row (only for tracks that have a preview URL)
    const previewRow = new ActionRowBuilder();
    let hasPreviews = false;
    pageItems.forEach((track, index) => {
      const globalIndex = start + index + 1;
      if (track.previewUrl) {
        hasPreviews = true;
        previewRow.addComponents(
          new ButtonBuilder()
            .setLabel(t('previewButtonLabel', locale, { index: globalIndex }))
            .setStyle(ButtonStyle.Link)
            .setURL(track.previewUrl)
            .setEmoji(resolveEmoji(null, '🎵'))
        );
      }
    });
    if (hasPreviews) {
      actionRows.push(previewRow);
    }
  }

  const embed = new V2Embed().setTitle(t('musicSearchTitle', locale)).setDescription(description);

  for (const row of actionRows) {
    embed.addActionRow(row);
  }

  return {
    embed: embed.build(),
    components: [embed.build()] // In V2Embed, build() returns container.
  };
}

export default {
  data: new SlashCommandBuilder()
    .setName('music-search')
    .setNameLocalizations({
      id: 'cari-musik',
      'en-US': 'music-search'
    })
    .setDescription('Mencari lagu atau musik secara online.')
    .setDescriptionLocalizations({
      id: 'Mencari lagu atau musik secara online.',
      'en-US': 'Search songs or music online.'
    })
    .addStringOption((option) =>
      option
        .setName('query')
        .setNameLocalizations({
          id: 'kata-kunci',
          'en-US': 'query'
        })
        .setDescription('Nama lagu atau penyanyi yang ingin dicari')
        .setDescriptionLocalizations({
          id: 'Nama lagu atau penyanyi yang ingin dicari',
          'en-US': 'Name of the song or artist to search'
        })
        .setRequired(true)
    )
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const query = interaction.options.getString('query');
    const locale = interaction.locale;
    await interaction.deferReply();

    logger.info(`[Music Search] Running search for: "${query}"`);
    const results = await searchMusic(query);

    if (results.length === 0) {
      const noResultsEmbed = new V2Embed()
        .setTitle(t('musicSearchTitle', locale))
        .setDescription(t('noMusicResults', locale, { query }))
        .build();

      return interaction.editReply({
        components: [noResultsEmbed],
        flags: MessageFlags.IsComponentsV2
      });
    }

    // Generate unique session ID for this search interaction
    const sessionId = `ms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    musicSearchCache.set(sessionId, {
      query,
      results,
      timestamp: Date.now()
    });

    // Clean up cache after 10 minutes to save memory
    setTimeout(
      () => {
        musicSearchCache.delete(sessionId);
      },
      10 * 60 * 1000
    );

    const { embed } = generateMusicSearchEmbed(sessionId, 0, locale);

    await interaction.editReply({
      components: [embed],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
