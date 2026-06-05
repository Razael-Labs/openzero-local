import { Events, ActivityType } from 'discord.js';
import { deployCommands } from '../handlers/commandHandler.js';
import logger from '../utils/logger.js';
import { config } from '../config.js';

export default {
  name: Events.ClientReady,
  once: true,
  /**
   * @param {import('discord.js').Client} client
   */
  async execute(client) {
    logger.info(`[Client] Login berhasil! Bot aktif sebagai ${client.user.tag}`);

    // Set aktivitas kehadiran bot dari Global Config
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

        client.user.setPresence({
          activities: [activityPayload],
          status: 'online'
        });
        logger.info(
          `[Client] Aktivitas bot diatur menjadi: ${actTypeString} ${actName} (${config.activity.details || ''})`
        );
      }
    } catch (error) {
      logger.error('[Client] Gagal mengatur aktivitas bot:', error);
    }

    // Daftarkan slash commands secara otomatis saat bot aktif
    await deployCommands(client);

    // Jalankan pembersihan pesan lama (> 7 hari) pada startup dan ulangi setiap 24 jam
    try {
      const { cleanupOldMessages } = await import('../utils/supabase.js');
      await cleanupOldMessages();
      setInterval(async () => {
        try {
          await cleanupOldMessages();
        } catch (err) {
          logger.error('[Cleanup Interval] Gagal membersihkan pesan lama:', err);
        }
      }, 24 * 60 * 60 * 1000); // 24 jam sekali
    } catch (error) {
      logger.error('[Client Startup] Gagal menjalankan pembersihan pesan lama:', error);
    }

    // Inisialisasi auto watcher Obtainium data & update list otomatis
    try {
      const { initObtainiumWatcher } = await import('../utils/obtainiumWatcher.js');
      await initObtainiumWatcher(client);
    } catch (error) {
      logger.error('[Obtainium Startup] Gagal menginisialisasi Obtainium Watcher:', error);
    }
  }
};
