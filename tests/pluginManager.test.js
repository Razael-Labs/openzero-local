import {
  getInstalledPlugins,
  installPlugin,
  uninstallPlugin,
  isCommandEnabled
} from '../src/utils/pluginManager.js';
import fs from 'fs';
import { config } from '../src/config.js';

describe('Plugin Installer and Command Registry System', () => {
  const dbPath = config.database.path;
  const testGuildId = '123456789012345';

  // Restore initial state before each test
  let originalDbContent = null;
  beforeAll(() => {
    if (fs.existsSync(dbPath)) {
      originalDbContent = fs.readFileSync(dbPath, 'utf8');
    }
  });

  afterAll(() => {
    if (originalDbContent) {
      fs.writeFileSync(dbPath, originalDbContent, 'utf8');
    } else if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  test('should default to having no plugins active', async () => {
    const installed = await getInstalledPlugins(testGuildId);
    expect(installed).not.toContain('webhook');
    expect(installed).not.toContain('music');
    expect(installed).not.toContain('badWord');
    expect(await isCommandEnabled(testGuildId, 'webhook')).toBe(false);
    expect(await isCommandEnabled(testGuildId, 'play')).toBe(false);
    expect(await isCommandEnabled(testGuildId, 'bad-word')).toBe(false);
  });

  test('should disable command registration when plugin is uninstalled', async () => {
    await uninstallPlugin(testGuildId, 'webhook');
    await uninstallPlugin(testGuildId, 'badWord');

    const installed = await getInstalledPlugins(testGuildId);
    expect(installed).not.toContain('webhook');
    expect(installed).not.toContain('badWord');
    expect(await isCommandEnabled(testGuildId, 'webhook')).toBe(false);
    expect(await isCommandEnabled(testGuildId, 'bad-word')).toBe(false);
  });

  test('should enable command registration when plugin is re-installed', async () => {
    await installPlugin(testGuildId, 'webhook');
    await installPlugin(testGuildId, 'badWord');

    const installed = await getInstalledPlugins(testGuildId);
    expect(installed).toContain('webhook');
    expect(installed).toContain('badWord');
    expect(await isCommandEnabled(testGuildId, 'webhook')).toBe(true);
    expect(await isCommandEnabled(testGuildId, 'bad-word')).toBe(true);
  });

  test('should always report non-plugin commands as enabled', async () => {
    expect(await isCommandEnabled(testGuildId, 'ping')).toBe(true);
    expect(await isCommandEnabled(testGuildId, 'help')).toBe(true);
  });
});
