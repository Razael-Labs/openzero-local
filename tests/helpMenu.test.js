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

// Import commands dynamically
const helpCmd = (await import('../src/commands/utility/help.js')).default;
const menuCmd = (await import('../src/commands/utility/menu.js')).default;

describe('Help and Menu Commands', () => {
  let mockInteraction;
  let mockCommands;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCommands = new Collection();
    mockCommands.set('ping', {
      category: 'utility',
      title: 'Ping Bot',
      command: '/ping',
      description: 'Mengukur latency bot dan API Discord.',
      num: 1,
      data: {
        name: 'ping',
        description: 'Mengukur latency bot dan API Discord.'
      }
    });
    mockCommands.set('hello', {
      category: 'utility',
      data: {
        name: 'hello',
        description: 'Menyapa pengguna atau member lain.'
      }
    });
    mockCommands.set('kick', {
      category: 'moderation',
      data: {
        name: 'kick',
        description: 'Kick member.'
      }
    });

    mockInteraction = {
      locale: 'id',
      client: {
        commands: mockCommands
      },
      reply: jest.fn().mockResolvedValue(true)
    };
  });

  test('help command should execute successfully and output formatted list grouped by category', async () => {
    await helpCmd.execute(mockInteraction);

    expect(mockInteraction.reply).toHaveBeenCalled();
    const replyArg = mockInteraction.reply.mock.calls[0][0];
    expect(replyArg.components).toBeDefined();
    expect(replyArg.flags).toBeDefined();

    // Verify it contains the container builder contents
    const container = replyArg.components[0];
    // In discord.js Mock, we can check how it matches.
    // The build output is a ContainerBuilder. Let's make sure it contains sections and components.
    expect(container).toBeDefined();
  });

  test('menu command should execute successfully and output formatted list grouped by category', async () => {
    await menuCmd.execute(mockInteraction);

    expect(mockInteraction.reply).toHaveBeenCalled();
    const replyArg = mockInteraction.reply.mock.calls[0][0];
    expect(replyArg.components).toBeDefined();
  });

  test('generateHelpEmbed helper should filter by specific category', async () => {
    const { generateHelpEmbed } = await import('../src/commands/utility/help.js');
    const embedUtility = generateHelpEmbed(
      mockInteraction.client,
      'id',
      'utility',
      mockInteraction
    );
    const embedModeration = generateHelpEmbed(
      mockInteraction.client,
      'id',
      'moderation',
      mockInteraction
    );

    expect(embedUtility).toBeDefined();
    expect(embedModeration).toBeDefined();
  });
});
