import { jest } from '@jest/globals';
import { AttachmentBuilder } from 'discord.js';

// Mock logger to avoid console spam and file writes during tests
jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock config
jest.unstable_mockModule('../src/config.js', () => ({
  config: {
    welcome: {
      channelId: '123456789012345678'
    }
  }
}));

// Import modules after mocking
const { createWelcomeImage } = await import('../src/utils/welcomeCanvas.js');
const guildMemberAddEvent = (await import('../src/events/guildMemberAdd.js')).default;

describe('Welcome Message Canvas System', () => {
  let mockMember;
  let mockChannel;
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fetch for avatar download (returns dummy transparent png/pixel buffer)
    const dummyPngBuffer = Buffer.from(
      '89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D49444154789C63000100000500010D0A2D140000000049454E44AE426082',
      'hex'
    );
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(dummyPngBuffer.buffer)
    });

    mockChannel = {
      name: 'welcome-lobby',
      send: jest.fn().mockResolvedValue(true)
    };

    mockMember = {
      id: '999888777',
      user: {
        id: '999888777',
        tag: 'NewMember#0001',
        username: 'NewMember',
        displayAvatarURL: jest.fn().mockReturnValue('https://avatar.url/newmember.png')
      },
      guild: {
        name: 'Test OpenZero Server',
        memberCount: 42,
        preferredLocale: 'id-ID',
        systemChannel: null,
        channels: {
          fetch: jest.fn().mockResolvedValue(mockChannel)
        }
      }
    };
  });

  describe('createWelcomeImage', () => {
    test('should successfully generate a welcome image buffer with successful avatar fetch', async () => {
      const buffer = await createWelcomeImage(mockMember, 'id');
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });

    test('should fallback gracefully and generate an image buffer when avatar fetch fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Fetch failed'));

      const buffer = await createWelcomeImage(mockMember, 'en');
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('guildMemberAdd Event Handler', () => {
    test('should fetch configured channel, build welcome image, and send message', async () => {
      await guildMemberAddEvent.execute(mockMember);

      expect(mockMember.guild.channels.fetch).toHaveBeenCalledWith('123456789012345678');
      expect(mockChannel.send).toHaveBeenCalled();

      const sendArgs = mockChannel.send.mock.calls[0][0];
      expect(sendArgs.content).toContain(mockMember.toString());
      expect(sendArgs.files).toBeDefined();
      expect(sendArgs.files[0]).toBeInstanceOf(AttachmentBuilder);
    });

    test('should fallback to system channel if configured channel fetch fails', async () => {
      mockMember.guild.channels.fetch = jest.fn().mockRejectedValue(new Error('Channel not found'));
      mockMember.guild.systemChannel = mockChannel;

      await guildMemberAddEvent.execute(mockMember);

      expect(mockChannel.send).toHaveBeenCalled();
    });
  });
});
