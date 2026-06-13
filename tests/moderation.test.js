import { jest } from '@jest/globals';

// Mock logger to avoid console spam and file writes during tests
jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Import commands dynamically after mocking logger
const kick = (await import('../src/commands/moderation/kick.js')).default;
const ban = (await import('../src/commands/moderation/ban.js')).default;
const mute = (await import('../src/commands/moderation/mute.js')).default;
const unmute = (await import('../src/commands/moderation/unmute.js')).default;
const timeout = (await import('../src/commands/moderation/timeout.js')).default;
const deafen = (await import('../src/commands/moderation/deafen.js')).default;
const undeafen = (await import('../src/commands/moderation/undeafen.js')).default;
const purge = (await import('../src/commands/moderation/purge.js')).default;

describe('Moderation Commands', () => {
  let mockInteraction;
  let mockGuild;
  let mockTargetMember;
  let mockTargetUser;
  let mockExecutorMember;
  let mockBotMember;
  let mockOptions;

  beforeEach(() => {
    // Reset mocks for each test
    mockTargetUser = {
      id: 'target_123',
      tag: 'Target#0001',
      toString: () => '<@target_123>'
    };

    mockTargetMember = {
      id: 'target_123',
      user: mockTargetUser,
      roles: {
        highest: { position: 10 },
        cache: {
          has: jest.fn().mockReturnValue(false)
        },
        add: jest.fn().mockResolvedValue(true),
        remove: jest.fn().mockResolvedValue(true)
      },
      voice: {
        channelId: null,
        deaf: false,
        mute: false,
        setMute: jest.fn().mockResolvedValue(true),
        setDeafen: jest.fn().mockResolvedValue(true)
      },
      kickable: true,
      bannable: true,
      moderatable: true,
      communicationDisabledUntilTimestamp: null,
      kick: jest.fn().mockResolvedValue(true),
      ban: jest.fn().mockResolvedValue(true),
      timeout: jest.fn().mockResolvedValue(true)
    };

    mockExecutorMember = {
      id: 'executor_456',
      roles: {
        highest: { position: 20 }
      },
      permissions: {
        has: jest.fn().mockReturnValue(true)
      }
    };

    mockBotMember = {
      id: 'bot_789',
      roles: {
        highest: { position: 15 }
      }
    };

    mockGuild = {
      ownerId: 'owner_999',
      members: {
        fetch: jest.fn().mockImplementation(async (id) => {
          if (id === 'target_123') return mockTargetMember;
          if (id === 'executor_456') return mockExecutorMember;
          if (id === 'bot_789') return mockBotMember;
          return null;
        }),
        ban: jest.fn().mockResolvedValue(true)
      },
      roles: {
        cache: {
          find: jest.fn().mockReturnValue(null)
        },
        create: jest.fn().mockResolvedValue({
          id: 'muted_role_id',
          name: 'Muted',
          position: 5
        })
      },
      channels: {
        cache: new Map([
          [
            'channel_1',
            {
              isTextBased: () => true,
              permissionOverwrites: {
                edit: jest.fn().mockResolvedValue(true)
              }
            }
          ]
        ])
      }
    };

    mockOptions = {
      getUser: jest.fn().mockReturnValue(mockTargetUser),
      getString: jest.fn().mockReturnValue('No reason provided'),
      getMember: jest.fn().mockReturnValue(mockTargetMember),
      getInteger: jest.fn().mockReturnValue(null)
    };

    mockInteraction = {
      guild: mockGuild,
      user: { id: 'executor_456', tag: 'Mod#0002', toString: () => '<@executor_456>' },
      member: mockExecutorMember,
      options: mockOptions,
      client: {
        user: { id: 'bot_789' }
      },
      channel: {
        name: 'general',
        bulkDelete: jest.fn().mockResolvedValue(
          new Map([
            ['msg_1', {}],
            ['msg_2', {}]
          ])
        )
      },
      deferReply: jest.fn().mockResolvedValue(true),
      editReply: jest.fn().mockResolvedValue(true),
      reply: jest.fn().mockResolvedValue(true)
    };
  });

  describe('/kick', () => {
    test('should kick user successfully when hierarchies are correct', async () => {
      await kick.execute(mockInteraction);

      expect(mockInteraction.deferReply).toHaveBeenCalled();
      expect(mockTargetMember.kick).toHaveBeenCalledWith('Mod#0002: No reason provided');
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.any(Array),
          flags: expect.any(Number)
        })
      );
    });

    test('should fail if target is not in the server', async () => {
      mockGuild.members.fetch.mockRejectedValueOnce(new Error('Member not found'));

      await kick.execute(mockInteraction);

      expect(mockTargetMember.kick).not.toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalled();
      const replyArg = mockInteraction.editReply.mock.calls[0][0];
      const comp = replyArg.components[0];
      const data = comp.toJSON ? comp.toJSON() : comp.data;
      expect(data.accent_color).toBe(0xff3333);
    });

    test('should fail if bot has lower hierarchy than target', async () => {
      mockTargetMember.kickable = false;

      await kick.execute(mockInteraction);

      expect(mockTargetMember.kick).not.toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalled();
      const replyArg = mockInteraction.editReply.mock.calls[0][0];
      const comp = replyArg.components[0];
      const data = comp.toJSON ? comp.toJSON() : comp.data;
      expect(data.accent_color).toBe(0xff3333);
    });

    test('should fail if executor has lower or equal hierarchy than target', async () => {
      mockExecutorMember.roles.highest.position = 5; // lower than target (10)

      await kick.execute(mockInteraction);

      expect(mockTargetMember.kick).not.toHaveBeenCalled();
    });
  });

  describe('/ban', () => {
    test('should ban user successfully', async () => {
      mockOptions.getString.mockImplementation((name) => {
        if (name === 'reason') return 'Spamming';
        if (name === 'delete_messages') return '86400';
        return null;
      });

      await ban.execute(mockInteraction);

      expect(mockInteraction.deferReply).toHaveBeenCalled();
      expect(mockGuild.members.ban).toHaveBeenCalledWith('target_123', {
        reason: 'Mod#0002: Spamming',
        deleteMessageSeconds: 86400
      });
    });
  });

  describe('/mute', () => {
    test('should voice mute user successfully if connected to voice', async () => {
      mockOptions.getString.mockImplementation((name) => {
        if (name === 'type') return 'voice';
        if (name === 'reason') return 'Noise';
        return null;
      });
      mockTargetMember.voice.channelId = 'voice_1';

      await mute.execute(mockInteraction);

      expect(mockTargetMember.voice.setMute).toHaveBeenCalledWith(true, 'Mod#0002: Noise');
    });

    test('should text mute user by assigning Muted role', async () => {
      mockOptions.getString.mockImplementation((name) => {
        if (name === 'type') return 'text';
        return null;
      });

      await mute.execute(mockInteraction);

      expect(mockGuild.roles.create).toHaveBeenCalled();
      expect(mockTargetMember.roles.add).toHaveBeenCalled();
    });
  });

  describe('/unmute', () => {
    test('should unmute voice successfully', async () => {
      mockOptions.getString.mockImplementation((name) => {
        if (name === 'type') return 'voice';
        return null;
      });
      mockTargetMember.voice.channelId = 'voice_1';

      await unmute.execute(mockInteraction);

      expect(mockTargetMember.voice.setMute).toHaveBeenCalledWith(
        false,
        'Mod#0002: No reason provided'
      );
    });
  });

  describe('/timeout', () => {
    test('should timeout member successfully', async () => {
      mockOptions.getString.mockImplementation((name) => {
        if (name === 'duration') return '300000'; // 5m
        if (name === 'reason') return 'Spam';
        return null;
      });

      await timeout.execute(mockInteraction);

      expect(mockTargetMember.timeout).toHaveBeenCalledWith(300000, 'Mod#0002: Spam');
    });

    test('should remove timeout successfully', async () => {
      mockOptions.getString.mockImplementation((name) => {
        if (name === 'duration') return '0'; // Remove
        return null;
      });
      mockTargetMember.communicationDisabledUntilTimestamp = Date.now() + 10000;

      await timeout.execute(mockInteraction);

      expect(mockTargetMember.timeout).toHaveBeenCalledWith(null, 'Mod#0002: No reason provided');
    });
  });

  describe('/deafen', () => {
    test('should deafen voice user successfully', async () => {
      mockTargetMember.voice.channelId = 'voice_1';

      await deafen.execute(mockInteraction);

      expect(mockTargetMember.voice.setDeafen).toHaveBeenCalledWith(
        true,
        'Mod#0002: No reason provided'
      );
    });
  });

  describe('/undeafen', () => {
    test('should undeafen voice user successfully', async () => {
      mockTargetMember.voice.channelId = 'voice_1';
      mockTargetMember.voice.deaf = true;

      await undeafen.execute(mockInteraction);

      expect(mockTargetMember.voice.setDeafen).toHaveBeenCalledWith(
        false,
        'Mod#0002: No reason provided'
      );
    });
  });

  describe('/purge', () => {
    test('should purge 100 messages by default', async () => {
      await purge.execute(mockInteraction);

      expect(mockInteraction.deferReply).toHaveBeenCalled();
      expect(mockInteraction.channel.bulkDelete).toHaveBeenCalledWith(100, true);
      expect(mockInteraction.editReply).toHaveBeenCalled();
    });

    test('should purge custom amount of messages', async () => {
      mockOptions.getInteger.mockReturnValue(45);

      await purge.execute(mockInteraction);

      expect(mockInteraction.channel.bulkDelete).toHaveBeenCalledWith(45, true);
    });

    test('should handle bulkDelete errors gracefully', async () => {
      mockInteraction.channel.bulkDelete.mockRejectedValueOnce(new Error('Discord API Error'));

      await purge.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalled();
    });
  });
});
