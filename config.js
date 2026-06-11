// Managed by Razael-Fox Bot
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { SpecificColor, SequentialColor, RandomColor } from './src/utils/color.js';

// Load environment variables dynamically
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nodeEnv = process.env.NODE_ENV || 'development';
const isTest = nodeEnv === 'test';

const dbName = isTest ? 'database-test.json' : 'database.json';
const dbDir = path.resolve(__dirname, 'data');
const dbPath = path.join(dbDir, dbName);

export const config = {
  // Global Bot Credentials & Environment config
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  nodeEnv: nodeEnv,
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

  // Strategi pewarnaan embed (SpecificColor, SequentialColor, atau RandomColor)
  colorStrategy: new SequentialColor([
    0x6e4cc1, // #6e4cc1
    0x242221, // #242221
    0xf58e25, // #f58e25
    0xfdfdfd // #fdfdfd
  ]),

  // Warna aksen utama embed
  get embedColor() {
    return this.colorStrategy.getColor();
  },

  activity: {
    name: '/help | /menu',
    // Pilihan tipe: PLAYING, STREAMING, LISTENING, WATCHING, COMPETING
    type: 'WATCHING',
    // Pilihan status: online, idle, dnd, invisible (Hanya berlaku di mode production)
    status: 'online',
    details: 'View commands helper',
    state: 'Active',
    assets: {
      largeImage: 'https://discord.c99.nl/widget/theme-1/1511151761660838049.png', // Discord C99 Status Widget
      largeText: 'OpenZero Bot',
      smallImage: 'https://i.imgur.com/pYVjN18.png', // Logo
      smallText: 'Support System'
    },
    buttons: [
      {
        label: 'Support Server',
        url: 'https://discord.gg/openzero' // Target URL
      }
    ]
  },

  // Target Discord Channel dan Message ID untuk list Obtainium
  obtainium: {
    channelId: '1511326472219001014',
    messageId: '1511327184546042019'
  },

  // Konfigurasi sistem welcome member baru
  welcome: {
    channelId: process.env.WELCOME_CHANNEL_ID || '1511326472219001014' // Default ke channel utama jika env kosong
  }
};
