import { jest } from '@jest/globals';
import { runAgent, classifyIntentMock } from '../src/utils/aiManager.js';
import { recordChat, getChatHistory, clearChatHistory } from '../src/utils/aiHistory.js';

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
      await recordChat({ guildId: mockGuildId, userId: mockUserId, role: 'user', content: 'Halo Fox' });
      await recordChat({ guildId: mockGuildId, userId: mockUserId, role: 'assistant', content: 'Halo! Ada yang bisa kubantu?' });

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
      const prompt = "Fox tolong buatkan aku webhook dengan nama 'Test' dan photo profile URL berikut https://cdn.domain.com/pfp.png dan berikan aku akses webhook URI nya";
      const classification = classifyIntentMock(prompt);

      expect(classification).not.toBeNull();
      expect(classification.pluginName).toBe('webhook');
      expect(classification.args.action).toBe('create');
      expect(classification.args.title).toBe('Test');
      expect(classification.args.pfp).toBe('https://cdn.domain.com/pfp.png');
    });

    test('should classify music playback request correctly', () => {
      const prompt = "Fox tolong putar lagu lofi hip hop";
      const classification = classifyIntentMock(prompt);

      expect(classification).not.toBeNull();
      expect(classification.pluginName).toBe('music');
      expect(classification.args.action).toBe('play');
      expect(classification.args.query).toBe('lofi hip hop');
    });

    test('should return null for unmatched general chat prompt', () => {
      const prompt = "Apa cuaca hari ini?";
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
      expect(result.result.data.url).toBe('https://discord.com/api/webhooks/88888888/secret_token_123');
      expect(result.result.responseText).toContain('DevWebhook');
    });

    test('should fall back to conversational response on general chats', async () => {
      const prompt = "Halo Fox, ceritakan lelucon";
      const context = {
        guild: { id: mockGuildId },
        user: { id: mockUserId }
      };

      const result = await runAgent(prompt, context);

      expect(result.agentExecuted).toBe(false);
      expect(result.responseText).toContain('Fox (AI)');
    });
  });
});
