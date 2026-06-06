import { jest } from '@jest/globals';
import { Collection } from 'discord.js';

// Mock logger
jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock play-dl
jest.unstable_mockModule('play-dl', () => ({
  default: {
    yt_validate: jest.fn().mockReturnValue('video'),
    video_basic_info: jest.fn().mockResolvedValue({
      video_details: {
        title: 'Numb',
        url: 'https://youtube.com/watch?v=Numb',
        durationRaw: '3:07',
        thumbnails: [{ url: 'https://img.yt/numb.jpg' }]
      }
    }),
    search: jest.fn().mockResolvedValue([{ url: 'https://youtube.com/watch?v=Numb' }]),
    stream: jest.fn().mockResolvedValue({
      stream: {},
      type: 'opus'
    })
  }
}));

// Mock @discordjs/voice
const mockPlayer = {
  play: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  unpause: jest.fn(),
  on: jest.fn(),
  state: { status: 'playing' }
};

const mockConnection = {
  subscribe: jest.fn(),
  on: jest.fn(),
  destroy: jest.fn()
};

jest.unstable_mockModule('@discordjs/voice', () => ({
  joinVoiceChannel: jest.fn().mockReturnValue(mockConnection),
  createAudioPlayer: jest.fn().mockReturnValue(mockPlayer),
  createAudioResource: jest.fn().mockReturnValue({}),
  AudioPlayerStatus: {
    Playing: 'playing',
    Paused: 'paused',
    Idle: 'idle'
  },
  VoiceConnectionStatus: {
    Disconnected: 'disconnected'
  },
  StreamType: {
    Arbitrary: 'arbitrary',
    Raw: 'raw',
    OggOpus: 'ogg/opus',
    WebmOpus: 'webm/opus',
    Opus: 'opus'
  }
}));

// Import commands and utilities after mocking
const { getOrCreateSession, musicSessions } = await import('../src/utils/musicManager.js');
const playCmd = (await import('../src/commands/music/play.js')).default;
const skipCmd = (await import('../src/commands/music/skip.js')).default;
const stopCmd = (await import('../src/commands/music/stop.js')).default;
const queueCmd = (await import('../src/commands/music/queue.js')).default;
const pauseCmd = (await import('../src/commands/music/pause.js')).default;
const resumeCmd = (await import('../src/commands/music/resume.js')).default;

describe('Music Player Slash Commands', () => {
  let mockInteraction;
  let mockVoiceChannel;
  let mockTextChannel;

  beforeEach(() => {
    jest.clearAllMocks();
    musicSessions.clear();

    mockTextChannel = {
      send: jest.fn().mockResolvedValue(true)
    };

    mockVoiceChannel = {
      id: 'voice_channel_123',
      guild: {
        voiceAdapterCreator: {}
      }
    };

    mockInteraction = {
      locale: 'en',
      guildId: 'guild_123',
      guild: {
        members: {
          me: {
            voice: { channelId: 'voice_channel_123' }
          }
        }
      },
      member: {
        voice: {
          channel: mockVoiceChannel
        }
      },
      options: {
        getString: jest.fn().mockReturnValue('https://youtube.com/watch?v=Numb')
      },
      user: {
        toString: () => '<@executor>'
      },
      reply: jest.fn().mockResolvedValue(true),
      deferReply: jest.fn().mockResolvedValue(true),
      editReply: jest.fn().mockResolvedValue(true),
      channel: mockTextChannel
    };
  });

  describe('Session & Manager Tests', () => {
    test('should get or create a music session correctly', () => {
      const session = getOrCreateSession('guild_123', mockVoiceChannel, mockTextChannel);
      expect(session).toBeDefined();
      expect(musicSessions.has('guild_123')).toBe(true);
    });

    test('should clean up session on destroy', () => {
      const session = getOrCreateSession('guild_123', mockVoiceChannel, mockTextChannel);
      session.destroy();
      expect(musicSessions.has('guild_123')).toBe(false);
    });
  });

  describe('Play Command', () => {
    test('should reject if user is not in a voice channel', async () => {
      mockInteraction.member.voice.channel = null;
      await playCmd.execute(mockInteraction);
      const replyArgs = mockInteraction.reply.mock.calls[0][0];
      const serialized = JSON.stringify(replyArgs.components[0].toJSON());
      expect(serialized).toContain('must be in a voice channel');
    });

    test('should add track to queue successfully', async () => {
      await playCmd.execute(mockInteraction);
      expect(mockInteraction.deferReply).toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalled();
      
      const session = musicSessions.get('guild_123');
      expect(session).toBeDefined();
      expect(session.isPlaying).toBe(true);
    });
  });

  describe('Skip/Pause/Resume/Stop/Queue Commands', () => {
    let session;

    beforeEach(() => {
      session = getOrCreateSession('guild_123', mockVoiceChannel, mockTextChannel);
      session.isPlaying = true;
      session.currentTrack = { title: 'Track 1', url: 'http://track1', duration: '3:00', requestedBy: '<@executor>' };
    });

    test('Skip Command', async () => {
      await skipCmd.execute(mockInteraction);
      expect(mockPlayer.stop).toHaveBeenCalled();
      expect(mockInteraction.reply).toHaveBeenCalled();
    });

    test('Pause Command', async () => {
      mockPlayer.state.status = 'playing';
      await pauseCmd.execute(mockInteraction);
      expect(mockPlayer.pause).toHaveBeenCalled();
    });

    test('Resume Command', async () => {
      mockPlayer.state.status = 'paused';
      mockPlayer.unpause.mockReturnValue(true);
      await resumeCmd.execute(mockInteraction);
      expect(mockPlayer.unpause).toHaveBeenCalled();
    });

    test('Stop Command', async () => {
      await stopCmd.execute(mockInteraction);
      expect(mockPlayer.stop).toHaveBeenCalled();
      expect(musicSessions.has('guild_123')).toBe(false);
    });

    test('Queue Command', async () => {
      session.queue = [{ title: 'Track 2', url: 'http://track2', duration: '4:00', requestedBy: '<@executor>' }];
      await queueCmd.execute(mockInteraction);
      expect(mockInteraction.reply).toHaveBeenCalled();
      const replyArgs = mockInteraction.reply.mock.calls[0][0];
      const serialized = JSON.stringify(replyArgs.components[0].toJSON());
      expect(serialized).toContain('Track 1');
      expect(serialized).toContain('Track 2');
    });
  });
});
