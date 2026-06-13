import { jest } from '@jest/globals';
import { PermissionFlagsBits } from 'discord.js';

// Mock logger to avoid console output during tests
jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock iconHelper downloadIcon function
jest.unstable_mockModule('../src/utils/iconHelper.js', () => ({
  downloadIcon: jest.fn().mockResolvedValue({
    filePath: '/dummy/path/github.png',
    fileName: 'github.png',
    ext: 'png',
    localUrl: 'attachment://github.png'
  })
}));

const iconToEmojiCmd = (await import('../src/commands/utility/iconToEmoji.js')).default;

describe('Icon to Emoji Slash Command Test Suite', () => {
  let mockInteraction;
  let mockEmojisCreate;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEmojisCreate = jest.fn().mockResolvedValue({
      name: 'github',
      toString: () => '<:github:123456789>'
    });

    mockInteraction = {
      deferReply: jest.fn(),
      editReply: jest.fn(),
      user: {
        tag: 'User#1234'
      },
      options: {
        getString: jest.fn((name) => {
          if (name === 'name') return 'github';
          if (name === 'provider') return 'fontawesome';
          if (name === 'emoji_name') return 'github';
          return null;
        })
      },
      guild: {
        name: 'Test Guild',
        members: {
          me: {
            permissions: {
              has: jest.fn().mockReturnValue(true)
            }
          }
        },
        emojis: {
          create: mockEmojisCreate
        }
      }
    };
  });

  test('should successfully download icon and create guild emoji', async () => {
    await iconToEmojiCmd.execute(mockInteraction);

    expect(mockInteraction.deferReply).toHaveBeenCalled();
    expect(mockEmojisCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        attachment: '/dummy/path/github.png',
        name: 'github'
      })
    );
    expect(mockInteraction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        components: expect.any(Array)
      })
    );
  });

  test('should fail if emoji name is invalid/too short', async () => {
    mockInteraction.options.getString.mockImplementation((name) => {
      if (name === 'name') return 'a';
      if (name === 'emoji_name') return 'a'; // Too short after sanitize or raw
      return null;
    });

    await iconToEmojiCmd.execute(mockInteraction);

    expect(mockEmojisCreate).not.toHaveBeenCalled();
    expect(mockInteraction.editReply).toHaveBeenCalled();
    const replyArg = mockInteraction.editReply.mock.calls[0][0];
    const comp = replyArg.components[0];
    const data = comp.toJSON ? comp.toJSON() : comp.data;
    expect(data.accent_color).toBe(0xff3333);
  });

  test('should fail if bot does not have ManageEmojisAndStickers permission', async () => {
    mockInteraction.guild.members.me.permissions.has.mockReturnValue(false);

    await iconToEmojiCmd.execute(mockInteraction);

    expect(mockInteraction.deferReply).toHaveBeenCalled();
    expect(mockEmojisCreate).not.toHaveBeenCalled();
    expect(mockInteraction.editReply).toHaveBeenCalled();
    const replyArg = mockInteraction.editReply.mock.calls[0][0];
    const comp = replyArg.components[0];
    const data = comp.toJSON ? comp.toJSON() : comp.data;
    expect(data.accent_color).toBe(0xff3333);
  });
});
