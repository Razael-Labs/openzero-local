import { jest } from '@jest/globals';
import { V2Embed } from '../src/utils/v2Embed.js';

// Mock logger
jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock config
let mockSupabaseUrl = 'https://mock.supabase.co';
let mockSupabaseKey = 'mock-key';
jest.unstable_mockModule('../src/config.js', () => ({
  config: {
    nodeEnv: 'development',
    database: {
      dir: './data-test'
    },
    supabase: {
      get url() { return mockSupabaseUrl; },
      get key() { return mockSupabaseKey; }
    }
  }
}));

// Mock Supabase helpers
const mockFetchCustomScamLinks = jest.fn();
const mockAddCustomScamLink = jest.fn();
const mockRemoveCustomScamLink = jest.fn();

jest.unstable_mockModule('../src/utils/supabase.js', () => ({
  fetchCustomScamLinks: mockFetchCustomScamLinks,
  addCustomScamLink: mockAddCustomScamLink,
  removeCustomScamLink: mockRemoveCustomScamLink,
  supabaseClient: {} // not null to satisfy config checks
}));

const scamLinkCmd = (await import('../src/commands/moderation/scamLink.js')).default;
const { containsScamLink, clearScamCache } = await import('../src/moderation/scamFilter.js');

describe('Custom Scam Link Command', () => {
  let mockInteraction;
  let setDescriptionSpy;
  let setTitleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    clearScamCache();
    mockSupabaseUrl = 'https://mock.supabase.co';
    mockSupabaseKey = 'mock-key';

    setDescriptionSpy = jest.spyOn(V2Embed.prototype, 'setDescription');
    setTitleSpy = jest.spyOn(V2Embed.prototype, 'setTitle');

    mockInteraction = {
      locale: 'en',
      guildId: 'guild_123',
      user: {
        id: 'user_456'
      },
      options: {
        getSubcommand: jest.fn(),
        getString: jest.fn()
      },
      deferReply: jest.fn().mockResolvedValue(true),
      editReply: jest.fn().mockResolvedValue(true)
    };
  });

  afterEach(() => {
    setDescriptionSpy.mockRestore();
    setTitleSpy.mockRestore();
  });

  test('should throw error if Supabase is unconfigured', async () => {
    mockFetchCustomScamLinks.mockRejectedValueOnce(new Error('SUPABASE_NOT_CONFIGURED'));
    mockInteraction.options.getSubcommand.mockReturnValue('list');

    await scamLinkCmd.execute(mockInteraction);

    expect(mockInteraction.deferReply).toHaveBeenCalled();
    expect(mockFetchCustomScamLinks).toHaveBeenCalled();
    expect(mockInteraction.editReply).toHaveBeenCalled();
    expect(setTitleSpy).toHaveBeenCalledWith('Configuration Error ❌');
    expect(setDescriptionSpy).toHaveBeenCalledWith(expect.stringContaining('Supabase configuration is missing'));
  });

  test('should successfully add domain and update cache', async () => {
    mockAddCustomScamLink.mockResolvedValueOnce({ success: true });
    mockInteraction.options.getSubcommand.mockReturnValue('add');
    mockInteraction.options.getString.mockReturnValue('evil-scam-link.net');

    await scamLinkCmd.execute(mockInteraction);

    expect(mockAddCustomScamLink).toHaveBeenCalledWith('evil-scam-link.net', 'guild_123', 'user_456');
    expect(containsScamLink('http://evil-scam-link.net')).toBe(true);

    expect(setTitleSpy).toHaveBeenCalledWith('Success ✅');
    expect(setDescriptionSpy).toHaveBeenCalledWith(expect.stringContaining('evil-scam-link.net'));
  });

  test('should successfully remove domain and update cache', async () => {
    mockRemoveCustomScamLink.mockResolvedValueOnce({ success: true });
    mockInteraction.options.getSubcommand.mockReturnValue('remove');
    mockInteraction.options.getString.mockReturnValue('evil-scam-link.net');

    // Manually add to cache first
    const { addCustomScamDomain } = await import('../src/moderation/scamFilter.js');
    addCustomScamDomain('evil-scam-link.net');
    expect(containsScamLink('http://evil-scam-link.net')).toBe(true);

    await scamLinkCmd.execute(mockInteraction);

    expect(mockRemoveCustomScamLink).toHaveBeenCalledWith('evil-scam-link.net');
    expect(containsScamLink('http://evil-scam-link.net')).toBe(false);

    expect(setTitleSpy).toHaveBeenCalledWith('Success ✅');
    expect(setDescriptionSpy).toHaveBeenCalledWith(expect.stringContaining('evil-scam-link.net'));
  });

  test('should list custom domains', async () => {
    const mockList = [
      { domain: 'one.com', added_by: '111' },
      { domain: 'two.com', added_by: '222' }
    ];
    mockFetchCustomScamLinks.mockResolvedValueOnce(mockList);
    mockInteraction.options.getSubcommand.mockReturnValue('list');

    await scamLinkCmd.execute(mockInteraction);

    expect(mockFetchCustomScamLinks).toHaveBeenCalled();
    expect(setTitleSpy).toHaveBeenCalledWith('🛡️ Custom Blacklisted Scam Domains');
    expect(setDescriptionSpy).toHaveBeenCalledWith(expect.stringContaining('one.com'));
    expect(setDescriptionSpy).toHaveBeenCalledWith(expect.stringContaining('two.com'));
  });
});
