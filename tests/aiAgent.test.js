import { jest } from '@jest/globals';
import { runAgent, classifyIntentMock, safeJsonParse } from '../src/utils/aiManager.js';
import { recordChat, getChatHistory, clearChatHistory } from '../src/utils/aiHistory.js';
import { config } from '../src/config.js';

// Mock symbols
jest.unstable_mockModule('../src/utils/symbols.js', () => ({
  resolveEmoji: jest.fn().mockReturnValue('📋'),
  Symbols: {
    FAILURE: '❌',
    SUCCESS: '✅'
  }
}));

describe('AI Agent Plugin and Extension System', () => {
  const mockGuildId = '999999999999999999';
  const mockUserId = '111111111111111111';

  beforeEach(() => {
    clearChatHistory(mockGuildId, mockUserId);
  });

  describe('AI Chat History Module', () => {
    test('should record and fetch chat history correctly', async () => {
      await recordChat({
        guildId: mockGuildId,
        userId: mockUserId,
        role: 'user',
        content: 'Halo Fox'
      });
      await recordChat({
        guildId: mockGuildId,
        userId: mockUserId,
        role: 'assistant',
        content: 'Halo! Ada yang bisa kubantu?'
      });

      const history = await getChatHistory(mockGuildId, mockUserId);
      expect(history.length).toBe(2);
      expect(history[0].role).toBe('user');
      expect(history[0].content).toBe('Halo Fox');
      expect(history[1].role).toBe('assistant');
      expect(history[1].content).toBe('Halo! Ada yang bisa kubantu?');
    });
  });

  describe('Intent Classification & Routing (Mockup)', () => {
    test('should classify webhook creation request correctly', () => {
      const prompt =
        "Fox tolong buatkan aku webhook dengan nama 'Test' dan photo profile URL berikut https://cdn.domain.com/pfp.png dan berikan aku akses webhook URI nya";
      const classification = classifyIntentMock(prompt);

      expect(classification).not.toBeNull();
      expect(classification.pluginName).toBe('webhook');
      expect(classification.args.action).toBe('create');
      expect(classification.args.title).toBe('Test');
      expect(classification.args.pfp).toBe('https://cdn.domain.com/pfp.png');
    });

    test('should classify music playback request correctly', () => {
      const prompt = 'Fox tolong putar lagu lofi hip hop';
      const classification = classifyIntentMock(prompt);

      expect(classification).not.toBeNull();
      expect(classification.pluginName).toBe('music');
      expect(classification.args.action).toBe('play');
      expect(classification.args.query).toBe('lofi hip hop');
    });

    test('should classify webhook list request correctly', () => {
      const prompt = 'Fox tolong daftarkan semua webhook yang ada';
      const classification = classifyIntentMock(prompt);

      expect(classification).not.toBeNull();
      expect(classification.pluginName).toBe('webhook');
      expect(classification.args.action).toBe('list');
    });

    test('should classify server stats request correctly', () => {
      const prompt = 'Fox tolong tampilkan berapa member dan channel di server Discord';
      const classification = classifyIntentMock(prompt);

      expect(classification).not.toBeNull();
      expect(classification.pluginName).toBe('serverStats');
    });

    test('should return null for unmatched general chat prompt', () => {
      const prompt = 'Apa cuaca hari ini?';
      const classification = classifyIntentMock(prompt);

      expect(classification).toBeNull();
    });
  });

  describe('Plugin Execution and Agent Response Loops', () => {
    test('should execute serverStats plugin when matching prompt is run', async () => {
      const prompt = 'Fox tampilkan member dan channel server ini';

      // Mock Discord structures for channels
      const mockChannels = new Map([
        ['1', { type: 0, id: '1' }], // GuildText
        ['2', { type: 2, id: '2' }], // GuildVoice
        ['3', { type: 4, id: '3' }]  // GuildCategory
      ]);

      const mockGuild = {
        id: mockGuildId,
        memberCount: 42,
        channels: {
          fetch: jest.fn().mockResolvedValue(mockChannels),
          cache: mockChannels
        }
      };

      const context = {
        guild: mockGuild,
        user: { id: mockUserId, tag: 'User#1234' }
      };

      const result = await runAgent(prompt, context);

      expect(result.agentExecuted).toBe(true);
      expect(result.pluginUsed).toBe('serverStats');
      expect(result.result.success).toBe(true);
      expect(result.result.data.totalMembers).toBe(42);
      expect(result.result.data.totalChannels).toBe(3);
      expect(result.result.responseText).toContain('42');
      expect(result.result.responseText).toContain('3');
    });

    test('should execute webhook create mock plugin when matching prompt is run', async () => {
      const prompt = "Fox buatkan webhook nama 'DevWebhook' url https://example.com/pfp.jpg";

      // Mock Discord structure
      const mockChannel = {
        id: '1234567890',
        name: 'test-channel',
        type: 0, // GuildText
        createWebhook: jest.fn().mockResolvedValue({
          id: '88888888',
          name: 'DevWebhook',
          token: 'secret_token_123',
          url: 'https://discord.com/api/webhooks/88888888/secret_token_123',
          channelId: '1234567890'
        })
      };

      const mockGuild = {
        id: mockGuildId,
        channels: {
          cache: {
            get: jest.fn().mockReturnValue(mockChannel)
          }
        }
      };

      const context = {
        guild: mockGuild,
        channel: mockChannel,
        user: { id: mockUserId, tag: 'User#1234' }
      };

      const result = await runAgent(prompt, context);

      expect(result.agentExecuted).toBe(true);
      expect(result.pluginUsed).toBe('webhook');
      expect(result.action).toBe('create');
      expect(result.result.success).toBe(true);
      expect(result.result.data.name).toBe('DevWebhook');
      expect(result.result.data.url).toBe(
        'https://discord.com/api/webhooks/88888888/secret_token_123'
      );
      expect(result.result.responseText).toContain('DevWebhook');
    });

    test('should fall back to conversational response on general chats', async () => {
      const prompt = 'Halo Fox, ceritakan lelucon';
      const context = {
        guild: { id: mockGuildId },
        user: { id: mockUserId }
      };

      const result = await runAgent(prompt, context);

      expect(result.agentExecuted).toBe(false);
      expect(result.responseText).toContain('Fox (AI)');
    });

    test('should recover tool call from failed_generation on Groq 400 error', async () => {
      // Temporarily set API key and bypass test check
      const originalApiKey = config.groq.apiKey;
      const originalNodeEnv = config.nodeEnv;
      config.groq.apiKey = 'mock-key';
      config.nodeEnv = 'development';

      const originalFetch = global.fetch;

      // Mock the failed Groq API call returning 400 with failed_generation error details
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message: 'Failed to call a function. Please adjust your prompt.',
            type: 'invalid_request_error',
            code: 'tool_use_failed',
            failed_generation: '<function=instagram>{"username": "markzuckerberg"}'
          }
        })
      });

      const mockInstagramResult = {
        success: true,
        responseText: 'Successfully stalked instagram markzuckerberg'
      };

      // Mock the instagram plugin execute method
      const { plugins } = await import('../src/utils/pluginManager.js');
      const originalInstagramExecute = plugins.instagram.execute;
      plugins.instagram.execute = jest.fn().mockResolvedValue(mockInstagramResult);

      const prompt = 'cek username instagram mark zuckerberg';
      const context = {
        guild: { id: mockGuildId },
        user: { id: mockUserId, tag: 'User#1234' }
      };

      try {
        const result = await runAgent(prompt, context);

        expect(result.agentExecuted).toBe(true);
        expect(result.pluginUsed).toBe('instagram');
        expect(result.result.responseText).toContain(
          'Successfully stalked instagram markzuckerberg'
        );
        expect(plugins.instagram.execute).toHaveBeenCalledWith(
          { username: 'markzuckerberg' },
          context
        );
      } finally {
        // Restore mocks
        global.fetch = originalFetch;
        config.groq.apiKey = originalApiKey;
        config.nodeEnv = originalNodeEnv;
        plugins.instagram.execute = originalInstagramExecute;
      }
    });

    test('should execute plugin and send follow-up on successful Groq tool call response', async () => {
      const originalApiKey = config.groq.apiKey;
      const originalNodeEnv = config.nodeEnv;
      config.groq.apiKey = 'mock-key';
      config.nodeEnv = 'development';

      const originalFetch = global.fetch;

      // Mock the successful first response with a tool call, and second response with final answer
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  role: 'assistant',
                  tool_calls: [
                    {
                      id: 'call_123',
                      type: 'function',
                      function: {
                        name: 'instagram',
                        arguments: '{"username": "markzuckerberg"}'
                      }
                    }
                  ]
                }
              }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Ini profil Instagram Mark Zuckerberg'
                }
              }
            ]
          })
        });

      const mockInstagramResult = {
        success: true,
        responseText: 'Stalked instagram markzuckerberg'
      };

      const { plugins } = await import('../src/utils/pluginManager.js');
      const originalInstagramExecute = plugins.instagram.execute;
      plugins.instagram.execute = jest.fn().mockResolvedValue(mockInstagramResult);

      const prompt = 'cek instagram mark zuckerberg';
      const context = {
        guild: { id: mockGuildId },
        user: { id: mockUserId, tag: 'User#1234' }
      };

      try {
        const result = await runAgent(prompt, context);

        expect(result.agentExecuted).toBe(true);
        expect(result.pluginUsed).toBe('instagram');
        expect(result.result.responseText).toContain('Ini profil Instagram Mark Zuckerberg');
        expect(plugins.instagram.execute).toHaveBeenCalledWith(
          { username: 'markzuckerberg' },
          context
        );
      } finally {
        global.fetch = originalFetch;
        config.groq.apiKey = originalApiKey;
        config.nodeEnv = originalNodeEnv;
        plugins.instagram.execute = originalInstagramExecute;
      }
    });

    test('should safely parse JSON strings and remove trailing commas', () => {
      expect(safeJsonParse('{"action": "list",}')).toEqual({ action: 'list' });
      expect(safeJsonParse('{"arr": [1, 2, 3,], "val": 10,}')).toEqual({ arr: [1, 2, 3], val: 10 });
    });

    test('should recover tool call from failed_generation with trailing comma', async () => {
      const originalApiKey = config.groq.apiKey;
      const originalNodeEnv = config.nodeEnv;
      config.groq.apiKey = 'mock-key';
      config.nodeEnv = 'development';

      const originalFetch = global.fetch;

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message: 'Failed to call a function. Please adjust your prompt.',
            type: 'invalid_request_error',
            code: 'tool_use_failed',
            failed_generation: '<function=instagram>{"username": "zuck",}'
          }
        })
      });

      const mockInstagramResult = {
        success: true,
        responseText: 'Successfully stalked instagram zuck'
      };

      const { plugins } = await import('../src/utils/pluginManager.js');
      const originalInstagramExecute = plugins.instagram.execute;
      plugins.instagram.execute = jest.fn().mockResolvedValue(mockInstagramResult);

      const prompt = 'cek username instagram zuck';
      const context = {
        guild: { id: mockGuildId },
        user: { id: mockUserId, tag: 'User#1234' }
      };

      try {
        const result = await runAgent(prompt, context);

        expect(result.agentExecuted).toBe(true);
        expect(result.pluginUsed).toBe('instagram');
        expect(result.result.responseText).toContain('Successfully stalked instagram zuck');
        expect(plugins.instagram.execute).toHaveBeenCalledWith({ username: 'zuck' }, context);
      } finally {
        global.fetch = originalFetch;
        config.groq.apiKey = originalApiKey;
        config.nodeEnv = originalNodeEnv;
        plugins.instagram.execute = originalInstagramExecute;
      }
    });
  });

  describe('AI Plugin Installation and Security Permissions', () => {
    test('should allow server owner to install plugin via pluginPlugin', async () => {
      const { pluginPlugin } = await import('../src/plugins/pluginPlugin.js');
      const mockContext = {
        guild: { id: mockGuildId, ownerId: mockUserId },
        user: { id: mockUserId, tag: 'Owner#1111' },
        member: { permissions: { has: () => false }, roles: { cache: { some: () => false } } },
        client: {}
      };

      const result = await pluginPlugin.execute({ action: 'install', name: 'music' }, mockContext);
      expect(result.success).toBe(true);
      expect(result.responseText).toContain('berhasil diinstal');
    });

    test('should allow admin role user to install plugin via pluginPlugin', async () => {
      const { pluginPlugin } = await import('../src/plugins/pluginPlugin.js');
      const mockContext = {
        guild: { id: mockGuildId, ownerId: 'other-owner' },
        user: { id: mockUserId, tag: 'Admin#2222' },
        member: {
          permissions: { has: (perm) => true },
          roles: { cache: { some: () => false } }
        },
        client: {}
      };

      const result = await pluginPlugin.execute({ action: 'install', name: 'music' }, mockContext);
      expect(result.success).toBe(true);
      expect(result.responseText).toContain('berhasil diinstal');
    });

    test('should reject non-admin and non-owner from installing plugin via pluginPlugin', async () => {
      const { pluginPlugin } = await import('../src/plugins/pluginPlugin.js');
      const mockContext = {
        guild: { id: mockGuildId, ownerId: 'other-owner' },
        user: { id: mockUserId, tag: 'User#3333' },
        member: {
          permissions: { has: () => false },
          roles: { cache: { some: (cb) => false } }
        },
        client: {}
      };

      const result = await pluginPlugin.execute({ action: 'install', name: 'music' }, mockContext);
      expect(result.success).toBe(false);
      expect(result.responseText).toContain('tidak memiliki izin');
    });
  });

  describe('AI Plugin Enablement Checking', () => {
    test('should refuse to trigger a plugin if it is not installed/enabled in the guild', async () => {
      const prompt = "Fox buatkan webhook nama 'BlockedWebhook'";
      const mockContext = {
        guild: { id: mockGuildId },
        user: { id: mockUserId, tag: 'User#1234' },
        member: { permissions: { has: () => false }, roles: { cache: { some: () => false } } },
        client: {},
        enablePluginCheckForTesting: true,
        installedPluginsForTesting: [] // Webhook not installed
      };

      const response = await runAgent(prompt, mockContext);
      expect(response.agentExecuted).toBe(false);
      expect(response.responseText).toContain('belum diaktifkan/diinstal');

      // Verify that it works when installed
      const mockContextInstalled = {
        ...mockContext,
        installedPluginsForTesting: ['webhook'] // Webhook is installed
      };

      // Mock channel structure to avoid crash inside webhookPlugin during successful execution
      mockContextInstalled.guild.channels = {
        cache: {
          get: () => ({
            type: 0, // GuildText
            createWebhook: jest.fn().mockResolvedValue({
              id: '88888888',
              name: 'BlockedWebhook',
              token: 'token123',
              url: 'https://example.com'
            })
          })
        }
      };
      mockContextInstalled.channel = { id: 'channel-123' };

      const responseSuccess = await runAgent(prompt, mockContextInstalled);
      expect(responseSuccess.agentExecuted).toBe(true);
      expect(responseSuccess.pluginUsed).toBe('webhook');
    });

    test('should intercept serverStats queries and refuse execution if plugin is not installed', async () => {
      const prompt = 'ada berapa member di server ini?';
      const mockContext = {
        guild: { id: mockGuildId },
        user: { id: mockUserId, tag: 'User#1234' },
        client: {},
        enablePluginCheckForTesting: true,
        installedPluginsForTesting: [] // serverStats not installed
      };

      const response = await runAgent(prompt, mockContext);
      expect(response.agentExecuted).toBe(true);
      expect(response.pluginUsed).toBe('serverStats');
      expect(response.action).toBe('error');
      expect(response.result.success).toBe(false);
      expect(response.result.responseText).toContain('SYSTEM DETECTION');
      expect(response.result.responseText).toContain('serverStats');
      expect(response.result.embeds).toBeDefined();
    });

    test('should NOT intercept serverStats plugin installation requests', async () => {
      const prompt = 'install kan aku plugin serverStats';
      const mockContext = {
        guild: { id: mockGuildId },
        user: { id: mockUserId, tag: 'User#1234' },
        client: {},
        enablePluginCheckForTesting: true,
        installedPluginsForTesting: []
      };

      // Mock user permissions so pluginPlugin doesn't fail internally
      mockContext.guild.ownerId = mockUserId;

      const response = await runAgent(prompt, mockContext);
      expect(response.agentExecuted).toBe(true);
      expect(response.pluginUsed).toBe('plugin');
      expect(response.action).toBe('install');
    });

    test('should resolve referenced message context when user replies to the bot', async () => {
      const prompt = 'tolong aktifkan plugin nya';
      const mockContext = {
        guild: { id: mockGuildId },
        user: { id: mockUserId, tag: 'User#1234' },
        client: {},
        enablePluginCheckForTesting: true,
        installedPluginsForTesting: [],
        referencedMessage: {
          content: '',
          embeds: [
            {
              title: 'System Alert: Missing Plugin 🛑',
              description: 'Required Module: serverStats'
            }
          ]
        }
      };

      // Mock user permissions so pluginPlugin doesn't fail internally
      mockContext.guild.ownerId = mockUserId;

      const response = await runAgent(prompt, mockContext);
      
      // Since context contains "Required Module: serverStats" and prompt is "aktifkan",
      // it should match the "plugin" -> "install" -> "serverStats" command!
      expect(response.agentExecuted).toBe(true);
      expect(response.pluginUsed).toBe('plugin');
      expect(response.action).toBe('install');
      expect(response.result.responseText).toContain('serverStats');
    });
  });
});
