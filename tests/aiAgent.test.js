import { jest } from '@jest/globals';
import { runAgent, classifyIntentMock } from '../src/utils/aiManager.js';
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

    test('should return null for unmatched general chat prompt', () => {
      const prompt = 'Apa cuaca hari ini?';
      const classification = classifyIntentMock(prompt);

      expect(classification).toBeNull();
    });
  });

  describe('Plugin Execution and Agent Response Loops', () => {
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
  });
});
