import { supabaseClient } from './supabase.js';
import { config } from '../config.js';
import logger from './logger.js';
import { getAiChatHistoryLocally, saveAiChatHistoryLocally } from './database.js';

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
  let history = getAiChatHistoryLocally(guildId, userId);
  history.push({
    role,
    content,
    created_at: createdAt
  });

  // Keep last 40 entries to save disk size
  if (history.length > 40) {
    history = history.slice(-40);
  }

  saveAiChatHistoryLocally(guildId, userId, history);
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

      if (!error && data && data.length > 0) {
        // Reverse to chronological order (system, user, assistant)
        return data.reverse();
      }
    } catch (err) {
      // Fallback
    }
  }

  const history = getAiChatHistoryLocally(guildId, userId);
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

  saveAiChatHistoryLocally(guildId, userId, []);
}
