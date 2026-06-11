import { jest } from '@jest/globals';
import { needsAIReview } from '../src/moderation/preFilter.js';
import { isOnCooldown, setCooldown } from '../src/moderation/cooldown.js';

// Mock logger to avoid console spam and file writes during tests
jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('AI Moderation Layer 1: Pre-filter', () => {
  it('should flag harmful keywords/regex variations', () => {
    expect(needsAIReview('that is absolute shit')).toBe(true);
    expect(needsAIReview('F*cK you')).toBe(true);
    expect(needsAIReview('anjing lo')).toBe(true);
    expect(needsAIReview('goblok banget sih')).toBe(true);
    expect(needsAIReview('f uuuuuuuuuu cck')).toBe(true);
    expect(needsAIReview('f u c k')).toBe(true);
    expect(needsAIReview('kont ol')).toBe(true);
    expect(needsAIReview('b abi')).toBe(true);
    expect(needsAIReview('lo nte')).toBe(true);
  });

  it('should ignore safe messages', () => {
    expect(needsAIReview('hello world')).toBe(false);
    expect(needsAIReview('how are you today?')).toBe(false);
    expect(needsAIReview('saya suka susu')).toBe(false);
  });
});

describe('AI Moderation Layer 2: Cooldown', () => {
  it('should respect cooldown duration', () => {
    const userId = 'user_test_123';
    expect(isOnCooldown(userId)).toBe(false);

    setCooldown(userId);
    expect(isOnCooldown(userId)).toBe(true);
  });
});

describe('AI Moderation Layer 3: AI Analyzer', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call fetch and return decision', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: ' Jangan kasar ya @user_test!'
            }
          }
        ]
      })
    };
    const globalFetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

    const mockMessage = {
      content: 'fuck you',
      author: { username: 'user_test' }
    };

    const { analyzeWithAI } = await import('../src/moderation/aiAnalyzer.js');
    const result = await analyzeWithAI(mockMessage);

    expect(globalFetchSpy).toHaveBeenCalled();
    expect(result).toBe('Jangan kasar ya @user_test!');
  });

  it('should return CLEAN if API call fails or doesn\'t find match', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

    const mockMessage = {
      content: 'fuck you',
      author: { username: 'user_test' }
    };

    const { analyzeWithAI } = await import('../src/moderation/aiAnalyzer.js');
    const result = await analyzeWithAI(mockMessage);

    expect(result).toBe('CLEAN');
  });
});

describe('AI Moderation: Custom Bad Words', () => {
  it('should dynamically add and compile a custom bad word', async () => {
    const { addBadWordLocally, getBadWordsLocally, removeBadWordLocally } = await import('../src/utils/database.js');
    const { reloadPatterns } = await import('../src/moderation/preFilter.js');

    // Add custom word
    const added = addBadWordLocally('pantek');
    expect(added).toBe(true);
    expect(getBadWordsLocally()).toContain('pantek');

    // Reload patterns to compile the regex
    reloadPatterns();

    // Verify it blocks spaced/repeated variations
    expect(needsAIReview('dasar pantek')).toBe(true);
    expect(needsAIReview('pan tek')).toBe(true);
    expect(needsAIReview('p a n t e k')).toBe(true);
    expect(needsAIReview('p*a*n*t*e*k')).toBe(true);

    // Clean up/remove
    const removed = removeBadWordLocally('pantek');
    expect(removed).toBe(true);
    reloadPatterns();

    // Verify it no longer blocks
    expect(needsAIReview('dasar pantek')).toBe(false);
  });
});
