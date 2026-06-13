import { Client, GatewayIntentBits } from 'discord.js';
import { config } from '../../config.js';
import { downloadIcon } from '../utils/iconHelper.js';
import logger from '../utils/logger.js';

const emojiMapping = {
  // Core UI Symbols
  oz_success: { name: 'check', provider: 'fontawesome' },
  oz_failure: { name: 'xmark', provider: 'fontawesome' },
  oz_warning: { name: 'triangle-exclamation', provider: 'fontawesome' },
  oz_ping: { name: 'table-tennis-paddle-ball', provider: 'fontawesome' },
  oz_cooldown: { name: 'clock', provider: 'fontawesome' },
  oz_music: { name: 'music', provider: 'fontawesome' },
  oz_microphone: { name: 'microphone', provider: 'fontawesome' },
  oz_hello: { name: 'hand-spock', provider: 'fontawesome' },
  oz_refresh: { name: 'arrows-rotate', provider: 'fontawesome' },

  // Additional UI & Locale Symbols
  oz_user: { name: 'user', provider: 'fontawesome' },
  oz_calendar: { name: 'calendar-days', provider: 'fontawesome' },
  oz_shield: { name: 'shield-halved', provider: 'fontawesome' },
  oz_chat: { name: 'comment-dots', provider: 'fontawesome' },
  oz_stop: { name: 'circle-stop', provider: 'fontawesome' },
  oz_hammer: { name: 'hammer', provider: 'fontawesome' },
  oz_trash: { name: 'trash-can', provider: 'fontawesome' },
  oz_mute: { name: 'volume-xmark', provider: 'fontawesome' },
  oz_volume: { name: 'volume-high', provider: 'fontawesome' },
  oz_hourglass: { name: 'hourglass-half', provider: 'fontawesome' },
  oz_globe: { name: 'globe', provider: 'fontawesome' },
  oz_wrench: { name: 'wrench', provider: 'fontawesome' },

  // Logger & System headers
  oz_info: { name: 'circle-info', provider: 'fontawesome' },
  oz_compass: { name: 'compass', provider: 'fontawesome' },
  oz_bolt: { name: 'bolt', provider: 'fontawesome' },
  oz_fire: { name: 'fire', provider: 'fontawesome' },
  oz_gear: { name: 'gear', provider: 'fontawesome' },
  oz_tools: { name: 'screwdriver-wrench', provider: 'fontawesome' },

  // New Button and Interface Emojis
  oz_arrow_left: { name: 'arrow-left', provider: 'fontawesome' },
  oz_arrow_right: { name: 'arrow-right', provider: 'fontawesome' },
  oz_clipboard: { name: 'clipboard', provider: 'fontawesome' },
  oz_image: { name: 'image', provider: 'fontawesome' },
  oz_flag: { name: 'flag', provider: 'fontawesome' },
  oz_letterboxd: { name: 'letterboxd', provider: 'fontawesome' },
  oz_discord: { name: 'discord', provider: 'fontawesome' },
  oz_border_all: { name: 'border-all', provider: 'fontawesome' },
  oz_black_tie: { name: 'black-tie', provider: 'fontawesome' }
};

async function setupGuildEmojis() {
  if (!config.token) {
    logger.error('[setup-emojis] DISCORD_TOKEN is missing in environment variables.');
    process.exit(1);
  }

  if (!config.guildId) {
    logger.error('[setup-emojis] GUILD_ID is missing in environment variables.');
    process.exit(1);
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildEmojisAndStickers]
  });

  client.once('ready', async () => {
    logger.info(`[setup-emojis] Bot logged in as ${client.user.tag}`);

    try {
      const guild = await client.guilds.fetch(config.guildId);
      logger.info(`[setup-emojis] Fetched guild: ${guild.name} (${guild.id})`);

      // Pre-fetch current emojis to check for duplicates
      const currentEmojis = await guild.emojis.fetch();
      logger.info(`[setup-emojis] Guild currently has ${currentEmojis.size} custom emoji(s).`);

      for (const [targetEmojiName, sourceInfo] of Object.entries(emojiMapping)) {
        // Check if emoji already exists in the server
        const exists = currentEmojis.find((e) => e.name === targetEmojiName);
        if (exists) {
          logger.info(`[setup-emojis] Skipping "${targetEmojiName}" - already exists as ${exists}`);
          continue;
        }

        logger.info(
          `[setup-emojis] Downloading icon "${sourceInfo.name}" for "${targetEmojiName}"...`
        );
        try {
          // Download icon as white PNG, size 128
          const icon = await downloadIcon(sourceInfo.name, sourceInfo.provider, { size: 128 });

          logger.info(`[setup-emojis] Uploading "${targetEmojiName}" to guild...`);
          const emoji = await guild.emojis.create({
            attachment: icon.filePath,
            name: targetEmojiName,
            reason: `System Setup: Font Awesome UI Icons`
          });
          logger.info(`[setup-emojis] Successfully created custom emoji: ${emoji.name} (${emoji})`);
        } catch (err) {
          logger.error(`[setup-emojis] Failed to create emoji "${targetEmojiName}":`, err);
        }
      }

      logger.info('[setup-emojis] Finished guild emojis setup.');
    } catch (error) {
      logger.error('[setup-emojis] Error during emoji setup:', error);
    } finally {
      client.destroy();
    }
  });

  client.login(config.token);
}

setupGuildEmojis();
