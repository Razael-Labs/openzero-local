// Managed by Razael-Fox Bot
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { SequentialColor } from './src/utils/color.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isTest = process.env.NODE_ENV === 'test';
const dbName = isTest ? 'database-test.json' : 'database.json';
const dbDir = path.resolve(__dirname, 'data');
const dbPath = path.join(dbDir, dbName);
const overridesPath = path.join(dbDir, 'config-overrides.json');

export const config = {
  // Global Credentials & Environment
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  ownerId: process.env.OWNER_ID,
  nodeEnv: process.env.NODE_ENV || 'development',
  sentryDsn: process.env.SENTRY_DSN,
  language: process.env.BOT_LANGUAGE || 'en',

  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY
  },

  // Groq API Configuration
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'gemma2-9b-it'
  },

  // Local JSON Database Configuration
  database: {
    dir: dbDir,
    name: dbName,
    path: dbPath
  },

  // Embed Colors (Sequential Rotation Strategy)
  colorStrategy: new SequentialColor([0x6e4cc1, 0x242221, 0xf58e25, 0xfdfdfd]),
  get embedColor() {
    return this.colorStrategy.getColor();
  },

  // Bot Status & Presence Config
  activity: {
    name: '/help | /menu',
    type: 'WATCHING',
    status: 'online',
    details: 'View commands helper',
    state: 'Active',
    assets: {
      largeImage: 'https://discord.c99.nl/widget/theme-1/1511151761660838049.png',
      largeText: 'OpenZero Bot',
      smallImage: 'https://i.imgur.com/pYVjN18.png',
      smallText: 'Support System'
    },
    buttons: [
      {
        label: 'Support Server',
        url: 'https://discord.gg/openzero'
      }
    ]
  },

  // Obtainium Dashboard Message Config
  obtainium: {
    channelId: '1511326472219001014',
    messageId: '1511327184546042019'
  },

  // New Guild Member Welcome Channel Config
  welcome: {
    channelId: '1511326472219001014'
  }
};

const defaults = {
  'welcome.channelId': '1511326472219001014',
  'obtainium.channelId': '1511326472219001014',
  'obtainium.messageId': '1511327184546042019',
  'activity.name': '/help | /menu',
  'activity.type': 'WATCHING',
  'activity.status': 'online',
  'language': process.env.BOT_LANGUAGE || 'en',
  'groq.model': process.env.GROQ_MODEL || 'gemma2-9b-it'
};

function setNestedValue(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

function deleteNestedValue(obj, keyPath) {
  const parts = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) return;
    current = current[parts[i]];
  }
  delete current[parts[parts.length - 1]];
}

// Load overrides on startup
let overrides = {};
try {
  if (fs.existsSync(overridesPath)) {
    overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
    for (const [key, val] of Object.entries(overrides)) {
      setNestedValue(config, key, val);
    }
  }
} catch {
  overrides = {};
}

export function updateConfigValue(keyPath, value) {
  setNestedValue(config, keyPath, value);
  overrides[keyPath] = value;
  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    fs.writeFileSync(overridesPath, JSON.stringify(overrides, null, 2), 'utf8');
  } catch (err) {
    // Ignore
  }
}

export function unsetConfigValue(keyPath) {
  const defaultValue = defaults[keyPath];
  if (defaultValue !== undefined) {
    setNestedValue(config, keyPath, defaultValue);
  } else {
    deleteNestedValue(config, keyPath);
  }
  delete overrides[keyPath];
  try {
    fs.writeFileSync(overridesPath, JSON.stringify(overrides, null, 2), 'utf8');
  } catch (err) {
    // Ignore
  }
}
