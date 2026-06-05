import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import logger from './logger.js';
import {
  recordMessageLocally,
  getUserMessagesLocally,
  cleanupOldMessagesLocally
} from './database.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const isSupabaseConfigured =
  supabaseUrl &&
  supabaseUrl !== 'YOUR_SUPABASE_URL_HERE' &&
  supabaseKey &&
  supabaseKey !== 'YOUR_SUPABASE_ANON_KEY_HERE';

export const supabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

if (isSupabaseConfigured) {
  logger.info('[Supabase] Supabase client initialized successfully!');
} else {
  logger.warn('[Supabase] Supabase credentials not configured. Falling back to local database.');
}

/**
 * Record a user message to Supabase (or fallback to local DB)
 */
export async function recordMessage({ guildId, channelId, channelName, userId, username, content, messageId, createdAt }) {
  const dateStr = createdAt instanceof Date ? createdAt.toISOString() : createdAt;

  // Always write locally for local observability/fallback
  recordMessageLocally(guildId, channelId, channelName, userId, username, content, messageId, dateStr);

  if (!supabaseClient) {
    return { success: true, method: 'local' };
  }

  try {
    const { error } = await supabaseClient.from('message_records').insert([
      {
        guild_id: guildId,
        channel_id: channelId,
        channel_name: channelName,
        user_id: userId,
        username: username,
        content: content,
        message_id: messageId,
        created_at: dateStr
      }
    ]);

    if (error) {
      logger.error('[Supabase] Gagal menyimpan pesan:', error);
      return { success: false, error, method: 'supabase-error' };
    }

    return { success: true, method: 'supabase' };
  } catch (err) {
    logger.error('[Supabase] Exception saat menyimpan pesan:', err);
    return { success: false, error: err, method: 'supabase-exception' };
  }
}

/**
 * Fetch recorded messages for a user in the last 7 days
 */
export async function getUserMessages(guildId, userId) {
  if (!supabaseClient) {
    return getUserMessagesLocally(guildId, userId);
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseClient
      .from('message_records')
      .select('*')
      .eq('guild_id', guildId)
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[Supabase] Gagal fetch record pesan:', error);
      // Fallback to local if Supabase fails
      return getUserMessagesLocally(guildId, userId);
    }

    return data || [];
  } catch (err) {
    logger.error('[Supabase] Exception saat fetch record pesan:', err);
    return getUserMessagesLocally(guildId, userId);
  }
}

/**
 * Clean up messages older than 7 days
 */
export async function cleanupOldMessages() {
  cleanupOldMessagesLocally();

  if (!supabaseClient) {
    return { success: true, method: 'local' };
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabaseClient
      .from('message_records')
      .delete()
      .lt('created_at', sevenDaysAgo);

    if (error) {
      logger.error('[Supabase] Gagal melakukan cleanup pesan lama:', error);
      return { success: false, error };
    }

    logger.info('[Supabase] Pembersihan berkala (cleanup) pesan berumur > 7 hari selesai.');
    return { success: true, method: 'supabase' };
  } catch (err) {
    logger.error('[Supabase] Exception saat cleanup pesan lama:', err);
    return { success: false, error: err };
  }
}
