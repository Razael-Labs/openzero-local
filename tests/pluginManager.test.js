import { getInstalledPlugins, installPlugin, uninstallPlugin, isCommandEnabled } from '../src/utils/pluginManager.js';
import fs from 'fs';
import { config } from '../src/config.js';

describe('Plugin Installer and Command Registry System', () => {
  const dbPath = config.database.path;

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

  test('should default to having all plugins active', () => {
    const installed = getInstalledPlugins();
    expect(installed).toContain('webhook');
    expect(installed).toContain('music');
    expect(isCommandEnabled('webhook')).toBe(true);
    expect(isCommandEnabled('play')).toBe(true);
  });

  test('should disable command registration when plugin is uninstalled', () => {
    uninstallPlugin('webhook');
    
    const installed = getInstalledPlugins();
    expect(installed).not.toContain('webhook');
    expect(isCommandEnabled('webhook')).toBe(false);
  });

  test('should enable command registration when plugin is re-installed', () => {
    installPlugin('webhook');
    
    const installed = getInstalledPlugins();
    expect(installed).toContain('webhook');
    expect(isCommandEnabled('webhook')).toBe(true);
  });

  test('should always report non-plugin commands as enabled', () => {
    expect(isCommandEnabled('ping')).toBe(true);
    expect(isCommandEnabled('help')).toBe(true);
  });
});
