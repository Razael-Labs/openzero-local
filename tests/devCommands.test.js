import { jest } from '@jest/globals';
import { Events } from 'discord.js';

// Mock logger
jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Import devCommandHandler
const { handleDevCommand } = await import('../src/handlers/devCommandHandler.js');

describe('Developer Prefix Command Handler', () => {
  let mockMessage;
  let mockMember;
  let mockStatusMessage;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMember = {
      user: { tag: 'Developer#0001' },
      toString: () => '<@12345>'
    };

    mockStatusMessage = {
      edit: jest.fn().mockResolvedValue(true)
    };

    mockMessage = {
      content: '!test-welcome',
      guild: {},
      member: {
        user: { tag: 'Developer#0001' },
        permissions: {
          has: jest.fn().mockReturnValue(true) // Admin
        },
        toString: () => '<@12345>'
      },
      mentions: {
        members: {
          first: jest.fn().mockReturnValue(null)
        }
      },
      client: {
        emit: jest.fn()
      },
      reply: jest.fn().mockResolvedValue(mockStatusMessage)
    };
  });

  test('should trigger welcome event successfully for the sender when no member is mentioned', async () => {
    const processed = await handleDevCommand(mockMessage);

    expect(processed).toBe(true);
    expect(mockMessage.reply).toHaveBeenCalled();
    expect(mockMessage.client.emit).toHaveBeenCalledWith(Events.GuildMemberAdd, mockMessage.member);
  });

  test('should trigger welcome event for a mentioned member', async () => {
    const mentionedMember = { user: { tag: 'Mentioned#0002' }, toString: () => '<@67890>' };
    mockMessage.mentions.members.first = jest.fn().mockReturnValue(mentionedMember);

    const processed = await handleDevCommand(mockMessage);

    expect(processed).toBe(true);
    expect(mockMessage.client.emit).toHaveBeenCalledWith(Events.GuildMemberAdd, mentionedMember);
  });

  test('should reject command execution if sender is not an administrator', async () => {
    mockMessage.member.permissions.has = jest.fn().mockReturnValue(false); // Non-admin

    const processed = await handleDevCommand(mockMessage);

    expect(processed).toBe(false);
    expect(mockMessage.client.emit).not.toHaveBeenCalled();
    expect(mockMessage.reply).not.toHaveBeenCalled();
  });

  test('should ignore messages that do not start with prefix', async () => {
    mockMessage.content = 'hello world';

    const processed = await handleDevCommand(mockMessage);

    expect(processed).toBe(false);
    expect(mockMessage.client.emit).not.toHaveBeenCalled();
  });

  test('should ignore private/DM messages', async () => {
    mockMessage.guild = null;

    const processed = await handleDevCommand(mockMessage);

    expect(processed).toBe(false);
  });
});
