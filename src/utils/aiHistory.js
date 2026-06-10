import fs from 'fs';
import { supabaseClient } from './supabase.js';
import { config } from '../config.js';
import logger from './logger.js';

const dbPath = config.database.path;

/**
 * Helper to get local database content
 */
function getLocalDb() {
  try {
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    }
  } catch {
    // Ignore error
  }
  return { guilds: {}, messages: [], aiChatHistory: {} };
}

/**
 * Helper to save local database content
 */
function saveLocalDb(db) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    logger.error('[AI DB] Failed to save chat history locally:', err);
  }
}

/**
 * Record chat history to Supabase or local DB fallback
 * @param {object} param0
 */
export async function recordChat({ guildId, userId, role, content }) {
  const createdAt = new Date().toISOString();

  // If Supabase is active, try recording there
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient.from('ai_chat_history').insert([
        {
          guild_id: guildId,
          user_id: userId,
          role: role,
          content: content,
          created_at: createdAt
        }
      ]);
      if (!error) {
        return { success: true, method: 'supabase' };
      }
      logger.warn('[AI DB] Supabase save error, falling back to local:', error.message);
    } catch (err) {
      logger.warn('[AI DB] Supabase exception, falling back to local:', err.message);
    }
  }

  // Fallback to local database
  const db = getLocalDb();
  if (!db.aiChatHistory) db.aiChatHistory = {};
  const sessionKey = `${guildId}_${userId}`;
  if (!db.aiChatHistory[sessionKey]) db.aiChatHistory[sessionKey] = [];

  db.aiChatHistory[sessionKey].push({
    role,
    content,
    created_at: createdAt
  });

  // Keep last 40 entries to save disk size
  if (db.aiChatHistory[sessionKey].length > 40) {
    db.aiChatHistory[sessionKey] = db.aiChatHistory[sessionKey].slice(-40);
  }

  saveLocalDb(db);
  return { success: true, method: 'local' };
}

/**
 * Fetch chat history for a user in a guild
 * @param {string} guildId 
 * @param {string} userId 
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
export async function getChatHistory(guildId, userId, limit = 20) {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('ai_chat_history')
        .select('*')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data) {
        // Reverse to chronological order (system, user, assistant)
        return data.reverse();
      }
    } catch (err) {
      // Fallback
    }
  }

  const db = getLocalDb();
  if (!db.aiChatHistory) db.aiChatHistory = {};
  const sessionKey = `${guildId}_${userId}`;
  const history = db.aiChatHistory[sessionKey] || [];
  return history.slice(-limit);
}

/**
 * Clear chat history
 * @param {string} guildId 
 * @param {string} userId 
 */
export async function clearChatHistory(guildId, userId) {
  if (supabaseClient) {
    try {
      await supabaseClient
        .from('ai_chat_history')
        .delete()
        .eq('guild_id', guildId)
        .eq('user_id', userId);
    } catch (err) {
      // Ignore
    }
  }

  const db = getLocalDb();
  if (db.aiChatHistory) {
    const sessionKey = `${guildId}_${userId}`;
    delete db.aiChatHistory[sessionKey];
    saveLocalDb(db);
  }
}
