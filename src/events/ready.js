import { Events, ActivityType } from 'discord.js';
import { deployCommands } from '../handlers/commandHandler.js';
import logger from '../utils/logger.js';
import { config } from '../config.js';
import { Symbols } from '../utils/symbols.js';

export default {
  name: Events.ClientReady,
  once: true,
  /**
   * @param {import('discord.js').Client} client
   */
  async execute(client) {
    logger.info(`[Client] Login successful! Bot is active as ${client.user.tag}`);

    // Pre-fetch custom emojis guild cache reference globally
    if (config.guildId) {
      try {
        const guild = await client.guilds.fetch(config.guildId);
        await guild.emojis.fetch(); // Ensure emojis are in cache
        Symbols.guild = guild;
        logger.info(`[Client] Custom emojis guild cache reference set globally for guild: ${guild.name}`);
      } catch (err) {
        logger.warn(`[Client] Failed to pre-fetch guild for global custom emojis: ${err.message}`);
      }
    }

    // Set bot presence activity from Global Config
    try {
      const actName = config.activity?.name;
      const actTypeString = config.activity?.type || 'PLAYING';

      const typeMap = {
        PLAYING: ActivityType.Playing,
        STREAMING: ActivityType.Streaming,
        LISTENING: ActivityType.Listening,
        WATCHING: ActivityType.Watching,
        COMPETING: ActivityType.Competing
      };

      const actType = typeMap[actTypeString.toUpperCase()] || ActivityType.Playing;

      if (actName) {
        const activityPayload = {
          name: actName,
          type: actType
        };

        if (config.activity.details) activityPayload.details = config.activity.details;
        if (config.activity.state) activityPayload.state = config.activity.state;
        if (config.activity.buttons) activityPayload.buttons = config.activity.buttons;

        if (config.activity.assets) {
          activityPayload.assets = {
            largeImage: config.activity.assets.largeImage,
            largeText: config.activity.assets.largeText,
            smallImage: config.activity.assets.smallImage,
            smallText: config.activity.assets.smallText
          };
        }

        // If in development/test mode (local), automatically set status to 'invisible' (offline)
        const botStatus = config.nodeEnv === 'production'
          ? (config.activity?.status || 'online')
          : 'invisible';

        client.user.setPresence({
          activities: [activityPayload],
          status: botStatus
        });
        logger.info(
          `[Client] Bot activity set to: ${actTypeString} ${actName} (Status: ${botStatus})`
        );
      }
    } catch (error) {
      logger.error('[Client] Failed to set bot activity:', error);
    }

    // Automatically deploy slash commands when bot starts
    await deployCommands(client);

    // Run cleanup of old messages (> 7 days) on startup and repeat every 24 hours
    try {
      const { cleanupOldMessages } = await import('../utils/supabase.js');
      await cleanupOldMessages();
      setInterval(async () => {
        try {
          await cleanupOldMessages();
        } catch (err) {
          logger.error('[Cleanup Interval] Failed to clean up old messages:', err);
        }
      }, 24 * 60 * 60 * 1000); // Once every 24 hours
    } catch (error) {
      logger.error('[Client Startup] Failed to run old messages cleanup:', error);
    }

    // Initialize auto watcher for Obtainium data & auto list updates
    try {
      const { initObtainiumWatcher } = await import('../utils/obtainiumWatcher.js');
      await initObtainiumWatcher(client);
    } catch (error) {
      logger.error('[Obtainium Startup] Failed to initialize Obtainium Watcher:', error);
    }
  }
};
