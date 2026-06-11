import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  StreamType
} from '@discordjs/voice';
import { spawn, exec } from 'child_process';
import { Readable } from 'stream';
import { promisify } from 'util';
const execAsync = promisify(exec);
import play from 'play-dl';
import fs from 'fs';
import path from 'path';
import logger from './logger.js';
import { V2Embed } from './v2Embed.js';
import { MessageFlags } from 'discord.js';

// Resolve cookies path from environment variable YTDLP_COOKIES_PATH or fallback cookies.txt/cookie.txt in root directory
let cookiesPath = process.env.YTDLP_COOKIES_PATH || null;
if (!cookiesPath) {
  const fallbackPlural = path.resolve(process.cwd(), 'cookies.txt');
  const fallbackSingular = path.resolve(process.cwd(), 'cookie.txt');
  if (fs.existsSync(fallbackPlural)) {
    cookiesPath = fallbackPlural;
  } else if (fs.existsSync(fallbackSingular)) {
    cookiesPath = fallbackSingular;
  }
} else {
  cookiesPath = path.resolve(process.cwd(), cookiesPath);
}

// Global map to hold active music sessions per guild
export const musicSessions = new Map();

/**
 * Class representing a Guild's active music playback session
 */
export class MusicSession {
  constructor(guildId, voiceChannel, textChannel) {
    this.guildId = guildId;
    this.voiceChannel = voiceChannel;
    this.textChannel = textChannel;
    this.queue = [];
    this.currentTrack = null;
    this.isPlaying = false;
    this.activeProcess = null;
    this.is247 = false;
    
    // Create connection to the voice channel
    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: true
    });

    // Create audio player
    this.player = createAudioPlayer();
    this.connection.subscribe(this.player);

    // Setup state change logs for debugging
    this.connection.on('stateChange', (oldState, newState) => {
      logger.info(`[Music Manager] Connection state changed from ${oldState.status} to ${newState.status}`);
    });

    this.player.on('stateChange', (oldState, newState) => {
      logger.info(`[Music Manager] Player state changed from ${oldState.status} to ${newState.status}`);
    });

    // Setup event listeners
    this.player.on(AudioPlayerStatus.Idle, () => {
      logger.info(`[Music Manager] Player in guild ${this.guildId} became Idle. Playing next track.`);
      this.playNext();
    });

    this.player.on('error', (error) => {
      logger.error(`[Music Manager] Audio Player Error in guild ${this.guildId}:`, error);
      this.textChannel.send({
        components: [
          new V2Embed()
            .setTitle('Playback Error ⚠️')
            .setDescription(`An error occurred during playback: \`${error.message}\`. Skipping to next track.`)
            .setColor(0xff3333)
            .build()
        ],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
      this.playNext();
    });

    // Automatically clean up session on disconnect
    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      logger.info(`[Music Manager] Connection disconnected in guild ${this.guildId}. Cleaning up.`);
      this.destroy();
    });
  }

  /**
   * Add a track to the queue
   */
  addTrack(track) {
    this.queue.push(track);
    if (!this.currentTrack) {
      this.playNext();
    }
  }

  /**
   * Create audio stream using yt-dlp (primary) with play-dl fallback
   * @param {string} url - YouTube URL
   */
  async fetchStreamWithRetry(url, attempt = 1) {
    // --- Primary: yt-dlp ---
    try {
      const audioStream = await this.streamViaYtDlp(url);
      return audioStream;
    } catch (ytDlpError) {
      logger.warn(`[Music Manager] yt-dlp failed (${ytDlpError.message}), falling back to play-dl...`);
      if (
        ytDlpError.message?.includes('Requests') || 
        ytDlpError.message?.includes('429') ||
        ytDlpError.message?.includes('confirm your session') ||
        ytDlpError.message?.includes('current session') ||
        ytDlpError.message?.includes('12482') ||
        ytDlpError.message?.includes('Requested format is not available')
      ) {
        throw new Error('YouTube rate limit or session block. Skipping fallback to prevent crash.');
      }
    }

    // --- Fallback: play-dl with retry ---
    const MAX_RETRIES = 2;
    const RETRY_DELAYS = [3000, 7000];
    try {
      return await play.stream(url, { discordPlayerCompatibility: true });
    } catch (error) {
      const isNetwork = ['ETIMEDOUT','ECONNRESET','ECONNREFUSED'].includes(error.code) ||
        error.message?.includes('ETIMEDOUT');
      if (isNetwork && attempt <= MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt - 1] ?? 5000;
        logger.warn(`[Music Manager] play-dl attempt ${attempt} failed. Retrying in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
        return this.fetchStreamWithRetry(url, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Stream audio via yt-dlp subprocess piped to a Readable stream
   * @param {string} url - YouTube URL
   * @returns {{ stream: Readable, type: StreamType }}
   */
  streamViaYtDlp(url) {
    return new Promise((resolve, reject) => {
      if (this.activeProcess) {
        try {
          this.activeProcess.kill();
        } catch (_) {}
      }

      const hasCookies = cookiesPath && fs.existsSync(cookiesPath);
      const ytdlpArgs = [
        '--js-runtimes', 'node',
        '--remote-components', 'ejs:github',
        '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
        '--no-playlist',
        '-o', '-',        // output to stdout
        '--quiet'
      ];

      if (hasCookies) {
        ytdlpArgs.push('--cookies', cookiesPath);
        logger.info(`[Music Manager] Using yt-dlp cookies from: ${cookiesPath}`);
      } else {
        ytdlpArgs.push('--extractor-args', 'youtube:player_client=android,web');
      }

      ytdlpArgs.push(url);

      const ytdlp = spawn('yt-dlp', ytdlpArgs);

      this.activeProcess = ytdlp;
      let resolved = false;
      let stderr = '';

      ytdlp.stderr.on('data', d => {
        stderr += d.toString();
      });

      // Resolve as soon as first data chunk arrives (stream is flowing)
      ytdlp.stdout.once('data', (chunk) => {
        if (!resolved) {
          resolved = true;
          // Pause the stream immediately to stop flowing mode and prevent data loss
          ytdlp.stdout.pause();
          // Push back the chunk and return the full stream
          ytdlp.stdout.unshift(chunk);

          // Detect EBML / WebM signature (1A 45 DF A3)
          const isWebm = chunk.length >= 4 &&
            chunk[0] === 0x1A &&
            chunk[1] === 0x45 &&
            chunk[2] === 0xDF &&
            chunk[3] === 0xA3;

          const streamType = isWebm ? StreamType.WebmOpus : StreamType.Arbitrary;
          logger.info(`[Music Manager] Detected stream format: ${isWebm ? 'WebM/Opus (StreamType.WebmOpus)' : 'Other (StreamType.Arbitrary)'}`);

          resolve({ stream: ytdlp.stdout, type: streamType });
        }
      });

      ytdlp.on('error', err => {
        if (!resolved) reject(new Error(`yt-dlp spawn error: ${err.message}`));
      });

      ytdlp.on('close', code => {
        if (this.activeProcess === ytdlp) {
          this.activeProcess = null;
        }
        if (!resolved) {
          reject(new Error(`yt-dlp exited ${code}: ${stderr.slice(-200)}`));
        }
      });

      // Timeout after 30s if no data
      setTimeout(() => {
        if (!resolved) {
          ytdlp.kill();
          reject(new Error('yt-dlp timeout after 30s'));
        }
      }, 30000);
    });
  }

  /**
   * Play the next track in the queue
   */
  async playNext() {
    if (this.queue.length === 0) {
      this.currentTrack = null;
      this.isPlaying = false;
      if (this.is247) {
        logger.info(`[Music Manager] Queue finished for guild ${this.guildId}, but staying in voice channel (24/7 mode active).`);
        this.textChannel.send({
          components: [
            new V2Embed()
              .setTitle('Queue Finished 🎵')
              .setDescription('No more tracks in the queue. The bot will stay in the voice channel (24/7 mode is active).')
              .build()
          ],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => {});
        return;
      }
      this.textChannel.send({
        components: [
          new V2Embed()
            .setTitle('Queue Finished 🎵')
            .setDescription('No more tracks in the queue. Leaving the voice channel.')
            .build()
        ],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
      this.destroy();
      return;
    }

    this.currentTrack = this.queue.shift();
    this.isPlaying = true;

    try {
      logger.info(`[Music Manager] Fetching stream for track: ${this.currentTrack.title} (${this.currentTrack.url})`);
      const stream = await this.fetchStreamWithRetry(this.currentTrack.url);

      const resource = createAudioResource(stream.stream, {
        inputType: stream.type
      });

      // Handle stream-level errors (e.g. ETIMEDOUT mid-playback)
      stream.stream.on('error', (err) => {
        if (err.message === 'Premature close' || err.code === 'ERR_STREAM_PREMATURE_CLOSE') {
          // Ignore premature close errors as they are expected when a track is skipped
          return;
        }
        logger.error(`[Music Manager] Stream read error in guild ${this.guildId}: ${err.message}`);
      });

      this.player.play(resource);

      // Send playing announcement embed
      this.textChannel.send({
        components: [
          new V2Embed()
            .setTitle('Now Playing 🎶')
            .setDescription(`**[${this.currentTrack.title}](${this.currentTrack.url})**\n\n⏱️ *Duration:* \`${this.currentTrack.duration}\` ┃ 👤 *Requested By:* ${this.currentTrack.requestedBy}`)
            .setThumbnail(this.currentTrack.thumbnail)
            .build()
        ],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
    } catch (error) {
      logger.error(`[Music Manager] Failed to stream track ${this.currentTrack.title}:`, error);
      this.textChannel.send({
        components: [
          new V2Embed()
            .setTitle('Streaming Error ⚠️')
            .setDescription(`Failed to fetch streaming resource for **${this.currentTrack.title}**: \`${error.message}\`. Skipping track.`)
            .setColor(0xff3333)
            .build()
        ],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
      this.playNext();
    }
  }

  /**
   * Skip the current track
   */
  skip() {
    if (this.isPlaying) {
      if (this.activeProcess) {
        try {
          this.activeProcess.kill();
        } catch (_) {}
        this.activeProcess = null;
      }
      this.player.stop();
      return true;
    }
    return false;
  }

  /**
   * Pause playback
   */
  pause() {
    if (this.player.state.status === AudioPlayerStatus.Playing) {
      this.player.pause();
      return true;
    }
    return false;
  }

  /**
   * Resume playback
   */
  resume() {
    if (this.player.state.status === AudioPlayerStatus.Paused) {
      this.player.unpause();
      return true;
    }
    return false;
  }

  /**
   * Stop session and disconnect
   */
  destroy() {
    try {
      this.player.stop(true);
      if (this.activeProcess) {
        try {
          this.activeProcess.kill();
        } catch (_) {}
        this.activeProcess = null;
      }
      this.connection.destroy();
    } catch (_) {}
    musicSessions.delete(this.guildId);
    logger.info(`[Music Manager] Session destroyed for guild: ${this.guildId}`);
  }
}

/**
 * Retrieves an existing music session or creates a new one
 */
export function getOrCreateSession(guildId, voiceChannel, textChannel) {
  let session = musicSessions.get(guildId);
  if (!session) {
    session = new MusicSession(guildId, voiceChannel, textChannel);
    musicSessions.set(guildId, session);
    logger.info(`[Music Manager] Created new session for guild: ${guildId}`);
  }
  return session;
}

/**
 * Format duration in seconds to M:SS or H:MM:SS format
 */
function formatDuration(sec) {
  if (!sec) return '0:00';
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = Math.floor(sec % 60);
  const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
  if (hours > 0) {
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${hours}:${formattedMinutes}:${formattedSeconds}`;
  }
  return `${minutes}:${formattedSeconds}`;
}

/**
 * Fallback to play-dl for resolving track metadata
 */
async function playDlFallback(query) {
  const isUrl = play.yt_validate(query) === 'video';
  let videoInfo;
  if (isUrl) {
    videoInfo = await play.video_basic_info(query);
  } else {
    const searchResults = await play.search(query, { limit: 1 });
    if (!searchResults || searchResults.length === 0) {
      throw new Error(`No search results found for: ${query}`);
    }
    videoInfo = await play.video_basic_info(searchResults[0].url);
  }
  
  return {
    title: videoInfo.video_details.title,
    url: videoInfo.video_details.url,
    duration: videoInfo.video_details.durationRaw,
    thumbnail: videoInfo.video_details.thumbnails[0]?.url,
    video_details: {
      title: videoInfo.video_details.title,
      url: videoInfo.video_details.url,
      durationRaw: videoInfo.video_details.durationRaw,
      thumbnails: [{ url: videoInfo.video_details.thumbnails[0]?.url }]
    }
  };
}

/**
 * Resolves track metadata (title, URL, duration, thumbnail) via yt-dlp.
 * If yt-dlp fails, it automatically falls back to play-dl.
 * @param {string} query - The search query or video URL
 */
export async function fetchVideoInfoViaYtDlp(query) {
  if (process.env.NODE_ENV === 'test') {
    logger.info('[Music Manager] Test environment detected. Skipping yt-dlp and using play-dl fallback directly.');
    return playDlFallback(query);
  }

  try {
    const isUrl = query.startsWith('http://') || query.startsWith('https://');
    const target = isUrl ? query : `ytsearch1:${query}`;
    
    let cookiesFlag = '';
    let extractorArgsFlag = '--extractor-args "youtube:player_client=android,web" ';
    if (cookiesPath && fs.existsSync(cookiesPath)) {
      cookiesFlag = `--cookies ${JSON.stringify(cookiesPath)} `;
      extractorArgsFlag = '';
      logger.info(`[Music Manager] Using yt-dlp cookies from: ${cookiesPath}`);
    }

    logger.info(`[Music Manager] Querying yt-dlp metadata for: ${target}`);
    const { stdout } = await execAsync(`yt-dlp --js-runtimes node --remote-components ejs:github ${extractorArgsFlag}${cookiesFlag}--dump-json --no-playlist ${JSON.stringify(target)}`);
    const data = JSON.parse(stdout);
    
    const durationStr = data.duration_string || formatDuration(data.duration);
    const thumbnail = data.thumbnail || (data.thumbnails && data.thumbnails[0]?.url) || null;
    
    return {
      title: data.title,
      url: data.webpage_url || data.original_url || query,
      duration: durationStr,
      thumbnail: thumbnail,
      video_details: {
        title: data.title,
        url: data.webpage_url || data.original_url || query,
        durationRaw: durationStr,
        thumbnails: [{ url: thumbnail }]
      }
    };
  } catch (error) {
    logger.warn(`[Music Manager] yt-dlp metadata query failed (${error.message}). Falling back to play-dl...`);
    return playDlFallback(query);
  }
}
