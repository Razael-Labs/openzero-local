import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus
} from '@discordjs/voice';
import play from 'play-dl';
import logger from './logger.js';
import { V2Embed } from './v2Embed.js';
import { MessageFlags } from 'discord.js';

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

    // Setup event listeners
    this.player.on(AudioPlayerStatus.Idle, () => {
      logger.info(`[Music Manager] Player in guild ${this.guildId} became Idle. Playing next track.`);
      this.playNext();
    });

    this.player.on('error', (error) => {
      logger.error(`[Music Manager] Audio Player Error in guild ${this.guildId}:`, error);
      this.textChannel.send({
        embeds: [
          new V2Embed()
            .setTitle('Playback Error ⚠️')
            .setDescription(`An error occurred during playback: \`${error.message}\`. Skipping to next track.`)
            .setColor(0xff3333)
            .build()
        ]
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
   * Play the next track in the queue
   */
  async playNext() {
    if (this.queue.length === 0) {
      this.currentTrack = null;
      this.isPlaying = false;
      this.textChannel.send({
        embeds: [
          new V2Embed()
            .setTitle('Queue Finished 🎵')
            .setDescription('No more tracks in the queue. Leaving the voice channel.')
            .build()
        ]
      }).catch(() => {});
      this.destroy();
      return;
    }

    this.currentTrack = this.queue.shift();
    this.isPlaying = true;

    try {
      logger.info(`[Music Manager] Fetching stream for track: ${this.currentTrack.title} (${this.currentTrack.url})`);
      const stream = await play.stream(this.currentTrack.url);
      
      const resource = createAudioResource(stream.stream, {
        inputType: stream.type
      });

      this.player.play(resource);

      // Send playing announcement embed
      this.textChannel.send({
        embeds: [
          new V2Embed()
            .setTitle('Now Playing 🎶')
            .setDescription(`**[${this.currentTrack.title}](${this.currentTrack.url})**\n\n⏱️ *Duration:* \`${this.currentTrack.duration}\` ┃ 👤 *Requested By:* ${this.currentTrack.requestedBy}`)
            .setThumbnail(this.currentTrack.thumbnail)
            .build()
        ]
      }).catch(() => {});
    } catch (error) {
      logger.error(`[Music Manager] Failed to stream track ${this.currentTrack.title}:`, error);
      this.textChannel.send({
        embeds: [
          new V2Embed()
            .setTitle('Streaming Error ⚠️')
            .setDescription(`Failed to fetch streaming resource for **${this.currentTrack.title}**: \`${error.message}\`. Skipping track.`)
            .setColor(0xff3333)
            .build()
        ]
      }).catch(() => {});
      this.playNext();
    }
  }

  /**
   * Skip the current track
   */
  skip() {
    if (this.isPlaying) {
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
