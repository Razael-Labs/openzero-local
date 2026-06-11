import fs from 'fs';
import { config } from '../config.js';

const isTest = config.nodeEnv === 'test';
const dbPath = config.database.path;

// Ensure data directory exists
const dbDir = config.database.dir;
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = { guilds: {}, messages: [] };

function loadDb() {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      db = JSON.parse(data);
    } else {
      db = { guilds: {}, messages: [] };
    }
  } catch {
    db = { guilds: {}, messages: [] };
  }
}

// Initial load on startup
loadDb();

let saveTimeout = null;

/**
 * Save database to disk.
 * Uses synchronous writing in tests, and debounced asynchronous writing in production.
 */
function saveDb() {
  if (isTest) {
    saveDbSync();
    return;
  }

  if (saveTimeout) return;

  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    fs.writeFile(dbPath, JSON.stringify(db, null, 2), 'utf8', (err) => {
      if (err) {
        // Fallback sync write in case of issue
        saveDbSync();
      }
    });
  }, 1000); // Debounce writes by 1 second to optimize CPU/disk I/O
}

/**
 * Synchronously writes memory cache to disk.
 */
export function saveDbSync() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  } catch {
    // Ignore write failures
  }
}

// Register flush on process exit/interruption to avoid data loss
if (!isTest) {
  process.on('SIGINT', () => {
    saveDbSync();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    saveDbSync();
    process.exit(0);
  });
}

/**
 * Increment the message count for a user in a specific guild
 * @param {string} guildId
 * @param {string} userId
 * @returns {number}
 */
export function incrementMessageCount(guildId, userId) {
  if (!db.guilds) db.guilds = {};
  if (!db.guilds[guildId]) db.guilds[guildId] = {};
  if (!db.guilds[guildId][userId]) db.guilds[guildId][userId] = 0;

  db.guilds[guildId][userId] += 1;
  saveDb();
  return db.guilds[guildId][userId];
}

/**
 * Get the message count for a user in a specific guild
 * @param {string} guildId
 * @param {string} userId
 * @returns {number}
 */
export function getMessageCount(guildId, userId) {
  if (!db.guilds || !db.guilds[guildId] || !db.guilds[guildId][userId]) {
    return 0;
  }
  return db.guilds[guildId][userId];
}

/**
 * Record a message locally
 */
export function recordMessageLocally(
  guildId,
  channelId,
  channelName,
  userId,
  username,
  content,
  messageId,
  createdAt
) {
  if (!db.messages) db.messages = [];
  db.messages.push({
    guild_id: guildId,
    channel_id: channelId,
    channel_name: channelName,
    user_id: userId,
    username: username,
    content: content,
    message_id: messageId,
    created_at: createdAt
  });
  saveDb();
}

/**
 * Get recorded messages for a user in a guild locally (within 7 days)
 */
export function getUserMessagesLocally(guildId, userId) {
  if (!db.messages) return [];
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return db.messages.filter(
    (msg) =>
      msg.guild_id === guildId &&
      msg.user_id === userId &&
      new Date(msg.created_at).getTime() >= sevenDaysAgo
  );
}

/**
 * Delete messages older than 7 days locally
 */
export function cleanupOldMessagesLocally() {
  if (!db.messages) return;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const initialCount = db.messages.length;
  db.messages = db.messages.filter((msg) => new Date(msg.created_at).getTime() >= sevenDaysAgo);
  if (db.messages.length !== initialCount) {
    saveDb();
  }
}

/**
 * Clear the database (mostly for unit testing)
 */
export function clearDb() {
  db = { guilds: {}, messages: [] };
  saveDbSync();
}

/**
 * Get the stored Obtainium message ID.
 * @returns {string|null}
 */
export function getObtainiumMessageId() {
  return db.obtainiumMessageId || null;
}

/**
 * Set the stored Obtainium message ID.
 * @param {string} messageId
 */
export function setObtainiumMessageId(messageId) {
  db.obtainiumMessageId = messageId;
  saveDbSync();
}

/**
 * Get the AI chat history for a session locally
 * @param {string} guildId
 * @param {string} userId
 * @returns {Array}
 */
export function getAiChatHistoryLocally(guildId, userId) {
  if (!db.aiChatHistory) db.aiChatHistory = {};
  const sessionKey = `${guildId}_${userId}`;
  return db.aiChatHistory[sessionKey] || [];
}

/**
 * Save the AI chat history for a session locally
 * @param {string} guildId
 * @param {string} userId
 * @param {Array} history
 */
export function saveAiChatHistoryLocally(guildId, userId, history) {
  if (!db.aiChatHistory) db.aiChatHistory = {};
  const sessionKey = `${guildId}_${userId}`;
  db.aiChatHistory[sessionKey] = history;
  saveDb();
}
