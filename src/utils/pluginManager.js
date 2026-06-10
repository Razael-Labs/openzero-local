import fs from 'fs';
import { config } from '../config.js';
import logger from './logger.js';

const dbPath = config.database.path;

// Map plugins to the commands they control
export const PLUGIN_COMMANDS = {
  webhook: ['webhook'],
  music: ['play', 'pause', 'resume', 'skip', 'stop', 'queue'],
  role: ['role'],
  translate: ['Translate to English'],
  userInfo: ['User Info'],
  messagesRecord: ['Messages Record']
};

/**
 * Helper to get the installed plugins list from local DB
 * @returns {string[]}
 */
export function getInstalledPlugins() {
  try {
    if (fs.existsSync(dbPath)) {
      const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      if (db.installedPlugins) {
        return db.installedPlugins;
      }
    }
  } catch (err) {
    logger.error('[Plugin Manager] Error reading plugins state:', err);
  }
  // Default: All plugins are installed initially
  return Object.keys(PLUGIN_COMMANDS);
}

/**
 * Save the installed plugins list to local DB
 * @param {string[]} plugins 
 */
function saveInstalledPlugins(plugins) {
  try {
    let db = { guilds: {}, messages: [] };
    if (fs.existsSync(dbPath)) {
      db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    }
    db.installedPlugins = plugins;
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    logger.error('[Plugin Manager] Error saving plugins state:', err);
  }
}

/**
 * Install a plugin
 * @param {string} pluginName 
 * @returns {boolean}
 */
export function installPlugin(pluginName) {
  if (!PLUGIN_COMMANDS[pluginName]) return false;
  const installed = getInstalledPlugins();
  if (installed.includes(pluginName)) return true; // Already installed

  installed.push(pluginName);
  saveInstalledPlugins(installed);
  return true;
}

/**
 * Uninstall a plugin
 * @param {string} pluginName 
 * @returns {boolean}
 */
export function uninstallPlugin(pluginName) {
  if (!PLUGIN_COMMANDS[pluginName]) return false;
  const installed = getInstalledPlugins();
  if (!installed.includes(pluginName)) return true; // Already uninstalled

  const filtered = installed.filter(name => name !== pluginName);
  saveInstalledPlugins(filtered);
  return true;
}

/**
 * Checks if a specific command is enabled based on its parent plugin installation state
 * @param {string} commandName 
 * @returns {boolean}
 */
export function isCommandEnabled(commandName) {
  const installed = getInstalledPlugins();

  // Find if this command belongs to a plugin
  for (const [pluginName, commands] of Object.entries(PLUGIN_COMMANDS)) {
    if (commands.includes(commandName)) {
      return installed.includes(pluginName);
    }
  }

  // If the command is not managed by any plugin, it is always enabled
  return true;
}
