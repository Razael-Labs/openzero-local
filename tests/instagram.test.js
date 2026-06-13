import { jest } from '@jest/globals';
import { instagramPlugin } from '../src/plugins/instagramPlugin.js';
import { runAgent } from '../src/utils/aiManager.js';
import { installPlugin, uninstallPlugin } from '../src/utils/pluginManager.js';

describe('Instagram Stalker Plugin & AI Integration', () => {
  const testGuildId = 'test-guild-id-instagram';

  beforeAll(async () => {
    // Install the plugin so it can be tested
    await installPlugin(testGuildId, 'instagram');
  });

  afterAll(async () => {
    // Cleanup plugin state
    await uninstallPlugin(testGuildId, 'instagram');
  });

  test('instagramPlugin should stalk and fetch user profile successfully from mocked API', async () => {
    // Mock the global fetch
    const mockInstagramResponse = {
      status: 200,
      result: {
        username: '@cristiano',
        name: 'Cristiano Ronaldo',
        profileUrl: 'https://instagram.com/cristiano',
        avatar: 'https://instagram.fsub1-1.fna.fbcdn.net/mock.jpg',
        followers: '600,000,000',
        uploads: '3,500',
        engagement: '3.5%'
      }
    };

    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockInstagramResponse)
      })
    );

    const result = await instagramPlugin.execute({ username: 'cristiano' }, {});
    expect(result.success).toBe(true);
    expect(result.data.username).toBe('@cristiano');
    expect(result.data.name).toBe('Cristiano Ronaldo');
    expect(result.embeds).toBeDefined();

    global.fetch = originalFetch; // Restore original fetch
  });

  test('instagramPlugin should handle API failure gracefully', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500
      })
    );

    const result = await instagramPlugin.execute({ username: 'cristiano' }, {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Gagal mengakses API Stalker Instagram');

    global.fetch = originalFetch; // Restore
  });

  test('AI agent should routing to instagram plugin on query', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: 200,
            result: { username: '@razael' }
          })
      })
    );

    const response = await runAgent('Fox tolong stalk instagram razael', {
      guild: { id: testGuildId }
    });
    expect(response.agentExecuted).toBe(true);
    expect(response.pluginUsed).toBe('instagram');

    global.fetch = originalFetch; // Restore
  });
});
