import { jest } from '@jest/globals';
import { PermissionFlagsBits } from 'discord.js';

// Mock logger
jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

const configModule = await import('../src/config.js');
const configCmd = (await import('../src/commands/utility/config.js')).default;

describe('Config Command & System', () => {
  let mockInteraction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInteraction = {
      locale: 'en',
      user: {
        id: '12345'
      },
      member: {
        permissions: {
          has: jest.fn().mockReturnValue(true)
        }
      },
      options: {
        getSubcommand: jest.fn(),
        getString: jest.fn()
      },
      reply: jest.fn().mockResolvedValue(true)
    };
  });

  test('should allow setting configuration parameters dynamically', () => {
    configModule.updateConfigValue('welcome.channelId', '99999999');
    expect(configModule.config.welcome.channelId).toBe('99999999');
  });

  test('should allow unsetting configuration parameters back to default', () => {
    configModule.updateConfigValue('welcome.channelId', '99999999');
    configModule.unsetConfigValue('welcome.channelId');
    expect(configModule.config.welcome.channelId).toBe('1511326472219001014');
  });

  test('should reject unauthorized users', async () => {
    mockInteraction.user.id = 'not_owner';
    mockInteraction.member.permissions.has.mockReturnValue(false);

    await configCmd.execute(mockInteraction);

    expect(mockInteraction.reply).toHaveBeenCalled();
    const replyArg = mockInteraction.reply.mock.calls[0][0];
    expect(replyArg.ephemeral).toBe(true);
    expect(replyArg.components[0]).toBeDefined();
  });

  test('should list all configurations', async () => {
    mockInteraction.options.getSubcommand.mockReturnValue('list');

    await configCmd.execute(mockInteraction);

    expect(mockInteraction.reply).toHaveBeenCalled();
    const replyArg = mockInteraction.reply.mock.calls[0][0];
    expect(replyArg.components[0]).toBeDefined();
  });

  test('should execute set subcommand successfully', async () => {
    mockInteraction.options.getSubcommand.mockReturnValue('set');
    mockInteraction.options.getString.mockImplementation((name) => {
      if (name === 'key') return 'welcome_channel_id';
      if (name === 'value') return '88888888';
      return null;
    });

    await configCmd.execute(mockInteraction);

    expect(mockInteraction.reply).toHaveBeenCalled();
    expect(configModule.config.welcome.channelId).toBe('88888888');
  });

  test('should execute unset subcommand successfully', async () => {
    mockInteraction.options.getSubcommand.mockReturnValue('unset');
    mockInteraction.options.getString.mockReturnValue('welcome_channel_id');

    await configCmd.execute(mockInteraction);

    expect(mockInteraction.reply).toHaveBeenCalled();
    expect(configModule.config.welcome.channelId).toBe('1511326472219001014');
  });
});
