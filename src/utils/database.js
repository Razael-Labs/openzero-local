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
  if (db.messages.length > 1000) {
    db.messages = db.messages.slice(-1000);
  }
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

/**
 * Get custom bad words list
 * @returns {Array<{word: string, category: string}>}
 */
export function getBadWordsLocally() {
  if (!db.badWords) db.badWords = [];
  return db.badWords;
}

/**
 * Add a custom bad word
 * @param {string} word
 * @param {string} category
 * @returns {boolean} True if added, false if already exists
 */
export function addBadWordLocally(word, category = 'General') {
  if (!db.badWords) db.badWords = [];
  const cleanWord = word.trim().toLowerCase();
  const exists = db.badWords.some((w) => {
    const checkWord = typeof w === 'object' ? w.word : w;
    return checkWord === cleanWord;
  });
  if (exists) return false;
  db.badWords.push({ word: cleanWord, category });
  saveDb();
  return true;
}

/**
 * Remove a custom bad word
 * @param {string} word
 * @returns {boolean} True if removed, false if not found
 */
export function removeBadWordLocally(word) {
  if (!db.badWords) db.badWords = [];
  const cleanWord = word.trim().toLowerCase();
  const initialLength = db.badWords.length;
  db.badWords = db.badWords.filter((w) => {
    const checkWord = typeof w === 'object' ? w.word : w;
    return checkWord !== cleanWord;
  });
  const removed = db.badWords.length !== initialLength;
  if (removed) saveDb();
  return removed;
}

/**
 * Get custom whitelist
 * @returns {string[]}
 */
export function getWhitelistLocally() {
  if (!db.whitelist) db.whitelist = [];
  return db.whitelist;
}

/**
 * Add a whitelist word
 * @param {string} word
 * @returns {boolean}
 */
export function addWhitelistLocally(word) {
  if (!db.whitelist) db.whitelist = [];
  const cleanWord = word.trim().toLowerCase();
  if (db.whitelist.includes(cleanWord)) return false;
  db.whitelist.push(cleanWord);
  saveDb();
  return true;
}

/**
 * Remove a whitelist word
 * @param {string} word
 * @returns {boolean}
 */
export function removeWhitelistLocally(word) {
  if (!db.whitelist) db.whitelist = [];
  const cleanWord = word.trim().toLowerCase();
  const index = db.whitelist.indexOf(cleanWord);
  if (index === -1) return false;
  db.whitelist.splice(index, 1);
  saveDb();
  return true;
}

/**
 * Get moderation config for a guild
 * @param {string} guildId
 * @returns {object}
 */
export function getModerationConfig(guildId) {
  if (!db.modConfig) db.modConfig = {};
  return (
    db.modConfig[guildId] || {
      allowedRoles: [],
      silentDelete: false,
      warnAction: 'warn',
      maxWarnings: 3
    }
  );
}

/**
 * Save moderation config for a guild
 * @param {string} guildId
 * @param {object} configData
 */
export function saveModerationConfig(guildId, configData) {
  if (!db.modConfig) db.modConfig = {};
  db.modConfig[guildId] = { ...getModerationConfig(guildId), ...configData };
  saveDb();
}

/**
 * Record a moderation trigger log
 * @param {string} guildId
 * @param {string} userId
 * @param {string} username
 * @param {string} channelId
 * @param {string} word
 * @param {string} category
 * @param {string} actionTaken
 */
export function recordModerationTrigger(guildId, userId, username, channelId, word, category, actionTaken) {
  if (!db.modTriggers) db.modTriggers = [];
  db.modTriggers.push({
    guildId,
    userId,
    username,
    channelId,
    word,
    category,
    actionTaken,
    timestamp: Date.now()
  });
  if (db.modTriggers.length > 500) {
    db.modTriggers = db.modTriggers.slice(-500);
  }
  saveDb();
}

/**
 * Get moderation logs for a guild
 * @param {string} guildId
 * @returns {Array}
 */
export function getModerationTriggers(guildId) {
  if (!db.modTriggers) db.modTriggers = [];
  return db.modTriggers.filter((t) => t.guildId === guildId);
}

/**
 * Get user warning count
 * @param {string} guildId
 * @param {string} userId
 * @returns {number}
 */
export function getUserWarningCount(guildId, userId) {
  if (!db.warningCounts) db.warningCounts = {};
  const key = `${guildId}_${userId}`;
  return db.warningCounts[key] || 0;
}

/**
 * Increment user warning count
 * @param {string} guildId
 * @param {string} userId
 * @returns {number}
 */
export function incrementUserWarningCount(guildId, userId) {
  if (!db.warningCounts) db.warningCounts = {};
  const key = `${guildId}_${userId}`;
  db.warningCounts[key] = (db.warningCounts[key] || 0) + 1;
  saveDb();
  return db.warningCounts[key];
}


