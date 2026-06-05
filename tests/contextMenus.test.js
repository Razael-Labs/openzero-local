import { jest } from '@jest/globals';
import { clearDb, getMessageCount, incrementMessageCount } from '../src/utils/database.js';

// Mock logger to avoid console spam and file writes during tests
jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

const userInfoCmd = (await import('../src/commands/utility/userInfo.js')).default;
const messagesRecordCmd = (await import('../src/commands/utility/messagesRecord.js')).default;
const { recordMessage, getUserMessages, cleanupOldMessages } = await import('../src/utils/supabase.js');
const { t } = await import('../src/utils/i18n.js');

describe('i18n Utility', () => {
  test('should translate keys correctly in Indonesian and English', () => {
    // Test Indonesian translations
    expect(t('userInfoTitle', 'id')).toBe('User Info 👤');
    expect(t('yes', 'id')).toBe('Ya');
    expect(t('no', 'id')).toBe('Tidak');
    expect(t('messagesCountSuffix', 'id', { count: 5 })).toBe('5 pesan');

    // Test English translations
    expect(t('userInfoTitle', 'en-US')).toBe('User Info 👤');
    expect(t('yes', 'en-US')).toBe('Yes');
    expect(t('no', 'en-US')).toBe('No');
    expect(t('messagesCountSuffix', 'en-US', { count: 5 })).toBe('5 messages');

    // Test fallback behavior
    expect(t('yes', 'fr')).toBe('Ya'); // fallback to default 'id'
  });
});


describe('Database Utility', () => {
  beforeEach(() => {
    clearDb();
  });

  test('should increment and retrieve message counts correctly', () => {
    expect(getMessageCount('guild123', 'user456')).toBe(0);
    incrementMessageCount('guild123', 'user456');
    expect(getMessageCount('guild123', 'user456')).toBe(1);
    incrementMessageCount('guild123', 'user456');
    expect(getMessageCount('guild123', 'user456')).toBe(2);
    expect(getMessageCount('guild123', 'anotherUser')).toBe(0);
  });
});

describe('New User Context Menu Commands', () => {
  let mockInteraction;
  let mockUser;
  let mockMember;

  beforeEach(() => {
    jest.clearAllMocks();
    clearDb();

    mockUser = {
      id: 'target_123',
      username: 'TargetUser',
      tag: 'TargetUser#1234',
      createdTimestamp: 1622548800000, // June 1, 2021
      displayAvatarURL: jest.fn().mockReturnValue('https://cdn.discordapp.com/avatars/target_123/avatar.png'),
      avatarDecorationURL: jest.fn().mockReturnValue('https://cdn.discordapp.com/avatar-decorations/hash.png'),
      bannerURL: jest.fn().mockReturnValue('https://cdn.discordapp.com/banners/hash.png'),
      hexAccentColor: '#ff00aa'
    };

    mockMember = {
      avatar: 'guild_avatar_hash',
      avatarURL: jest.fn().mockReturnValue('https://cdn.discordapp.com/guilds/guild123/users/target_123/avatars/hash.png'),
      joinedTimestamp: 1625140800000, // July 1, 2021
      roles: {
        cache: {
          filter: jest.fn().mockReturnThis(),
          map: jest.fn().mockReturnValue(['@everyone', 'Admin']),
          some: jest.fn().mockReturnValue(false)
        }
      },
      presence: {
        status: 'dnd',
        activities: [
          { type: 4, state: 'Playing: GTA: V' }
        ]
      },
      voice: {
        mute: false
      },
      isCommunicationDisabled: jest.fn().mockReturnValue(false),
      communicationDisabledUntilTimestamp: null
    };

    mockInteraction = {
      targetUser: mockUser,
      targetMember: mockMember,
      guildId: 'guild123',
      guild: {
        id: 'guild123',
        members: {
          cache: new Map([['target_123', mockMember]])
        },
        bans: {
          fetch: jest.fn().mockResolvedValue(null)
        },
        fetchAuditLogs: jest.fn().mockResolvedValue({
          entries: new Map()
        })
      },
      user: { id: 'executor_456', tag: 'User#0001' },
      deferReply: jest.fn().mockResolvedValue(true),
      editReply: jest.fn().mockResolvedValue(true),
      reply: jest.fn().mockResolvedValue(true),
      client: {
        users: {
          fetch: jest.fn().mockImplementation((id) => Promise.resolve({
            ...mockUser,
            avatarDecorationURL: jest.fn().mockReturnValue('https://cdn.discordapp.com/avatar-decorations/hash.png'),
            bannerURL: jest.fn().mockReturnValue('https://cdn.discordapp.com/banners/hash.png'),
            hexAccentColor: '#ff00aa'
          }))
        },
        guilds: {
          cache: new Map([
            [
              'guild123',
              {
                name: 'Guild One',
                members: {
                  fetch: jest.fn().mockResolvedValue(mockMember)
                }
              }
            ],
            [
              'guild456',
              {
                name: 'Guild Two',
                members: {
                  fetch: jest.fn().mockRejectedValue(new Error('Not found'))
                }
              }
            ]
          ])
        }
      }
    };
  });

  test('User Info - Success with database message count', async () => {
    incrementMessageCount('guild123', 'target_123');
    await userInfoCmd.execute(mockInteraction);
    expect(mockInteraction.deferReply).toHaveBeenCalled();
    expect(mockInteraction.editReply).toHaveBeenCalled();
    const replyArg = mockInteraction.editReply.mock.calls[0][0];
    expect(replyArg.components).toBeDefined();
  });

  test('Supabase Utility & Local Fallback - Record and fetch messages', async () => {
    const result = await recordMessage({
      guildId: 'guild123',
      channelId: 'channel456',
      channelName: 'general',
      userId: 'target_123',
      username: 'TargetUser',
      content: 'Hello World',
      messageId: 'msg999',
      createdAt: new Date()
    });

    expect(result.success).toBe(true);

    const fetched = await getUserMessages('guild123', 'target_123');
    expect(fetched.length).toBeGreaterThanOrEqual(1);
    expect(fetched[0].content).toBe('Hello World');

    // Test cleanup does not delete fresh message
    await cleanupOldMessages();
    const fetchedAfterFreshCleanup = await getUserMessages('guild123', 'target_123');
    expect(fetchedAfterFreshCleanup.length).toBeGreaterThanOrEqual(1);

    // Test cleanup deletes old message
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
    await recordMessage({
      guildId: 'guild123',
      channelId: 'channel456',
      channelName: 'general',
      userId: 'target_123',
      username: 'TargetUser',
      content: 'Old Message',
      messageId: 'msg888',
      createdAt: oldDate
    });

    await cleanupOldMessages();
    const fetchedAfterOldCleanup = await getUserMessages('guild123', 'target_123');
    const hasOld = fetchedAfterOldCleanup.some(m => m.content === 'Old Message');
    expect(hasOld).toBe(false);
  });

  test('Messages Record - Command Success', async () => {
    await recordMessage({
      guildId: 'guild123',
      channelId: 'channel456',
      channelName: 'general',
      userId: 'target_123',
      username: 'TargetUser',
      content: 'Hello for Context Menu',
      messageId: 'msg777',
      createdAt: new Date()
    });

    await messagesRecordCmd.execute(mockInteraction);
    expect(mockInteraction.deferReply).toHaveBeenCalled();
    expect(mockInteraction.editReply).toHaveBeenCalled();
    const replyArg = mockInteraction.editReply.mock.calls[0][0];
    expect(replyArg.components).toBeDefined();
  });
});
