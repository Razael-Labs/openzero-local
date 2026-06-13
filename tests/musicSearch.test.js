import { jest } from '@jest/globals';

// Mock logger to avoid console spam and file writes during tests
jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock global fetch
const mockTracks = [
  {
    trackName: 'Numb',
    artistName: 'Linkin Park',
    collectionName: 'Meteora',
    releaseDate: '2003-03-25T08:00:00Z',
    trackTimeMillis: 187000,
    primaryGenreName: 'Alternative',
    trackViewUrl: 'https://music.apple.com/numb',
    artworkUrl100: 'https://artwork.url/numb.jpg',
    previewUrl: 'https://preview.url/numb.mp3'
  },
  {
    trackName: 'In the End',
    artistName: 'Linkin Park',
    collectionName: 'Hybrid Theory',
    releaseDate: '2000-10-24T08:00:00Z',
    trackTimeMillis: 216000,
    primaryGenreName: 'Rock',
    trackViewUrl: 'https://music.apple.com/intheend',
    artworkUrl100: 'https://artwork.url/intheend.jpg',
    previewUrl: 'https://preview.url/intheend.mp3'
  }
];

// Import command dynamically after mocking
const musicSearchCmd = (await import('../src/commands/utility/musicSearch.js')).default;
const { musicSearchCache, generateMusicSearchEmbed, getLyricsForTrack } =
  await import('../src/commands/utility/musicSearch.js');

describe('Music Search Slash Command', () => {
  let mockInteraction;
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the global fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ results: mockTracks })
    });

    mockInteraction = {
      options: {
        getString: jest.fn().mockReturnValue('Linkin Park')
      },
      user: { id: 'executor_456', tag: 'User#0001' },
      commandName: 'music-search',
      deferReply: jest.fn().mockResolvedValue(true),
      editReply: jest.fn().mockResolvedValue(true),
      reply: jest.fn().mockResolvedValue(true)
    };
  });

  test('should successfully query iTunes search API and reply with embed', async () => {
    await musicSearchCmd.execute(mockInteraction);

    expect(mockInteraction.deferReply).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalled();
    expect(mockInteraction.editReply).toHaveBeenCalled();

    const replyArg = mockInteraction.editReply.mock.calls[0][0];
    expect(replyArg.components).toBeDefined();

    // Verify that session was stored in cache
    expect(musicSearchCache.size).toBe(1);
  });

  test('should generate correct embed and layout for music search session', () => {
    const sessionId = 'test_session_123';
    musicSearchCache.set(sessionId, {
      query: 'Linkin Park',
      results: mockTracks,
      timestamp: Date.now()
    });

    const { embed } = generateMusicSearchEmbed(sessionId, 0);
    expect(embed).toBeDefined();
    expect(embed.components).toBeDefined();

    // Clean up
    musicSearchCache.delete(sessionId);
  });

  test('should handle empty search results gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ results: [] })
    });

    await musicSearchCmd.execute(mockInteraction);

    expect(mockInteraction.editReply).toHaveBeenCalled();
    const replyArg = mockInteraction.editReply.mock.calls[0][0];
    expect(replyArg.components).toBeDefined();
  });

  test('should handle fetch API failure gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await musicSearchCmd.execute(mockInteraction);

    // Should reply with no results since it defaults to empty array on error
    expect(mockInteraction.editReply).toHaveBeenCalled();
    const replyArg = mockInteraction.editReply.mock.calls[0][0];
    expect(replyArg.components).toBeDefined();
  });

  test('should fetch lyrics successfully from LRCLIB API', async () => {
    const sessionId = 'test_session_456';
    musicSearchCache.set(sessionId, {
      query: 'Linkin Park',
      results: mockTracks,
      timestamp: Date.now()
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([
        {
          plainLyrics: 'Some plain lyrics',
          syncedLyrics: '[00:10.00] Some synced lyrics'
        }
      ])
    });

    const embed = await getLyricsForTrack(sessionId, 0, 'id');
    expect(embed).toBeDefined();

    musicSearchCache.delete(sessionId);
  });
});
