import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { config } from '../config.js';
import logger from './logger.js';
import { supabaseClient } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = config.database.path;
const pluginsDir = path.join(__dirname, '../plugins');

// Aggregated in-memory plugins populated dynamically at startup
export const plugins = {};

/**
 * Dynamically load all plugins from the src/plugins/ folder.
 */
export async function loadPluginsDynamically() {
  if (!fs.existsSync(pluginsDir)) {
    logger.warn(`[Plugin Loader] Plugins directory not found at ${pluginsDir}`);
    return;
  }

  const files = fs.readdirSync(pluginsDir).filter((f) => f.endsWith('.js'));
  for (const file of files) {
    const filePath = path.join(pluginsDir, file);
    const fileUrl = pathToFileURL(filePath).href;

    try {
      const module = await import(fileUrl);
      // Try to find any exported object that looks like a plugin (has name, description, execute)
      const pluginObj = Object.values(module).find(
        (val) => val && typeof val === 'object' && val.name && val.execute
      );

      if (pluginObj) {
        plugins[pluginObj.name] = pluginObj;
        logger.info(`[Plugin Loader] Loaded plugin dynamically: "${pluginObj.name}" from ${file}`);
      } else {
        logger.warn(`[Plugin Loader] No valid plugin export found in ${file}`);
      }
    } catch (err) {
      logger.error(`[Plugin Loader] Failed to load plugin file ${file}:`, err);
    }
  }
}

// Map plugin name to the commands it controls (calculated dynamically based on plugin configurations)
export const getPluginCommandsMap = () => {
  const map = {};
  for (const [name, plugin] of Object.entries(plugins)) {
    map[name] = plugin.commands || [name];
  }
  return map;
};

/**
 * Helper to get the installed plugins list from Supabase or Local DB for a specific guild
 * @param {string} guildId
 * @returns {Promise<string[]>}
 */
export async function getInstalledPlugins(guildId) {
  if (!guildId) return [];

  // Try Supabase first if available
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('guild_plugins')
        .select('installed_plugins')
        .eq('guild_id', guildId)
        .maybeSingle();

      if (!error && data) {
        return data.installed_plugins || [];
      }
      if (error) {
        logger.error(
          `[Plugin Manager] Supabase error fetching plugins for guild ${guildId}:`,
          error
        );
      }
    } catch (err) {
      logger.error(
        `[Plugin Manager] Exception fetching plugins from Supabase for guild ${guildId}:`,
        err
      );
    }
  }

  // Fallback to local DB
  try {
    if (fs.existsSync(dbPath)) {
      const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      if (db.guildPlugins && db.guildPlugins[guildId]) {
        return db.guildPlugins[guildId];
      }
    }
  } catch (err) {
    logger.error('[Plugin Manager] Error reading local guild plugins state:', err);
  }

  return [];
}

/**
 * Save the installed plugins list to Supabase and local DB for a specific guild
 * @param {string} guildId
 * @param {string[]} installedPlugins
 */
async function saveInstalledPlugins(guildId, installedPlugins) {
  if (!guildId) return;

  // Save to Supabase first if available
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient.from('guild_plugins').upsert(
        {
          guild_id: guildId,
          installed_plugins: installedPlugins,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'guild_id' }
      );

      if (error) {
        logger.error(`[Plugin Manager] Supabase error saving plugins for guild ${guildId}:`, error);
      }
    } catch (err) {
      logger.error(
        `[Plugin Manager] Exception saving plugins to Supabase for guild ${guildId}:`,
        err
      );
    }
  }

  // Always save locally as fallback
  try {
    let db = { guilds: {}, messages: [] };
    if (fs.existsSync(dbPath)) {
      db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    }
    if (!db.guildPlugins) db.guildPlugins = {};
    db.guildPlugins[guildId] = installedPlugins;
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    logger.error('[Plugin Manager] Error saving local guild plugins state:', err);
  }
}

/**
 * Install a plugin for a specific guild
 * @param {string} guildId
 * @param {string} pluginName
 * @returns {Promise<boolean>}
 */
export async function installPlugin(guildId, pluginName) {
  if (!guildId || !plugins[pluginName]) return false;
  const installed = await getInstalledPlugins(guildId);
  if (installed.includes(pluginName)) return true; // Already installed

  installed.push(pluginName);
  await saveInstalledPlugins(guildId, installed);
  return true;
}

/**
 * Uninstall a plugin for a specific guild
 * @param {string} guildId
 * @param {string} pluginName
 * @returns {Promise<boolean>}
 */
export async function uninstallPlugin(guildId, pluginName) {
  if (!guildId || !plugins[pluginName]) return false;
  const installed = await getInstalledPlugins(guildId);
  if (!installed.includes(pluginName)) return true; // Already uninstalled

  const filtered = installed.filter((name) => name !== pluginName);
  await saveInstalledPlugins(guildId, filtered);
  return true;
}

/**
 * Checks if a specific command is enabled based on its parent plugin installation state for a guild
 * @param {string} guildId
 * @param {string} commandName
 * @returns {Promise<boolean>}
 */
export async function isCommandEnabled(guildId, commandName) {
  if (!guildId) return true;
  const installed = await getInstalledPlugins(guildId);

  // Find if this command belongs to a plugin
  for (const [pluginName, plugin] of Object.entries(plugins)) {
    const commands = plugin.commands || [pluginName];
    if (commands.includes(commandName)) {
      return installed.includes(pluginName);
    }
  }

  // If the command is not managed by any plugin, it is always enabled
  return true;
}

// Initial populate
await loadPluginsDynamically();
