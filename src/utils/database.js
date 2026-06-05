import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../../data/database.json');

// Ensure data directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = { guilds: {} };

function loadDb() {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      db = JSON.parse(data);
    } else {
      db = { guilds: {} };
    }
  } catch {
    db = { guilds: {} };
  }
}

loadDb();

function saveDb() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  } catch {
    // Ignore/log write failures
  }
}

/**
 * Increment the message count for a user in a specific guild
 * @param {string} guildId
 * @param {string} userId
 * @returns {number}
 */
export function incrementMessageCount(guildId, userId) {
  loadDb();
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
  loadDb();
  if (!db.guilds || !db.guilds[guildId] || !db.guilds[guildId][userId]) {
    return 0;
  }
  return db.guilds[guildId][userId];
}


/**
 * Record a message locally
 */
export function recordMessageLocally(guildId, channelId, channelName, userId, username, content, messageId, createdAt) {
  loadDb();
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
  loadDb();
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
  loadDb();
  if (!db.messages) return;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const initialCount = db.messages.length;
  db.messages = db.messages.filter(
    (msg) => new Date(msg.created_at).getTime() >= sevenDaysAgo
  );
  if (db.messages.length !== initialCount) {
    saveDb();
  }
}

/**
 * Clear the database (mostly for unit testing)
 */
export function clearDb() {
  db = { guilds: {}, messages: [] };
  saveDb();
}

