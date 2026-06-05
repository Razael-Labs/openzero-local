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

  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY
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
    0xfdfdfd  // #fdfdfd
  ]),

  // Warna aksen utama embed
  get embedColor() {
    return this.colorStrategy.getColor();
  },

  // Konfigurasi Status Kehadiran (Presence Activity) Bot
  activity: {
    name: 'Grand Theft Auto VI',
    // Pilihan tipe: PLAYING, STREAMING, LISTENING, WATCHING, COMPETING
    type: 'PLAYING',
    details: 'Exploring Leonida & Vice City',
    state: 'Campaign: 68% Completed',
    assets: {
      largeImage: 'https://i.imgur.com/ByUhao8.png', // GTA VI Artwork
      largeText: 'Grand Theft Auto VI',
      smallImage: 'https://i.imgur.com/pYVjN18.png', // Rockstar Games Logo
      smallText: 'Leonida County'
    },
    buttons: [
      {
        label: 'Join Game',
        url: 'https://discord.gg/openzero' // Target URL untuk tombol Join Game
      }
    ]
  },

  // Target Discord Channel dan Message ID untuk list Obtainium
  obtainium: {
    channelId: '1511326472219001014',
    messageId: '1511327184546042019'
  }
};
