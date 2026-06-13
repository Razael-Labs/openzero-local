import { PermissionFlagsBits } from 'discord.js';
import { V2Embed } from '../utils/v2Embed.js';
import logger from '../utils/logger.js';

export const pluginPlugin = {
  name: 'plugin',
  commands: ['plugin'],
  description: 'Manage bot plugins. Actions include "install" (installs/enables a plugin) and "uninstall" (uninstalls/disables a plugin). ONLY server owner or admins can use this.',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['install', 'uninstall', 'list'],
        description: 'The action to perform: "install", "uninstall", or "list".'
      },
      name: {
        type: 'string',
        description: 'The name of the plugin to manage (optional for "list").'
      }
    },
    required: ['action']
  },

  /**
   * Execute the plugin action
   * @param {object} args
   * @param {object} context
   */
  async execute(args, context) {
    const { action, name } = args;
    const { guild, member, user } = context;

    if (!guild) {
      return { success: false, error: 'Context requires a guild.' };
    }

    const { getPluginCommandsMap, installPlugin, uninstallPlugin, getInstalledPlugins } = await import('../utils/pluginManager.js');
    const { loadCommands, deployCommands } = await import('../handlers/commandHandler.js');

    const commandsMap = getPluginCommandsMap();

    // 1. ACTION: LIST (Available to everyone, no admin permission needed)
    if (action === 'list') {
      const installed = await getInstalledPlugins(guild.id);
      const allPlugins = Object.keys(commandsMap).filter(k => k !== 'plugin');
      const uninstalled = allPlugins.filter(p => !installed.includes(p));

      const installedList = installed.length > 0 ? installed.map(p => `• **${p}**`).join('\n') : '*Tidak ada plugin terinstal.*';
      const uninstalledList = uninstalled.length > 0 ? uninstalled.map(p => `• **${p}**`).join('\n') : '*Semua plugin telah terinstal.*';

      const embed = new V2Embed()
        .setTitle('Guild Plugins Status 🔌')
        .setDescription(
          `Berikut adalah daftar status plugin di server ini:\n\n` +
          `**Plugin Terinstal/Aktif:**\n${installedList}\n\n` +
          `**Plugin Belum Terinstal (Nonaktif):**\n${uninstalledList}`
        )
        .build();

      return {
        success: true,
        responseText: `Berikut adalah daftar status plugin di server ini:\n\n**Terinstal/Aktif:**\n${installed.length > 0 ? installed.join(', ') : 'Tidak ada'}\n\n**Belum Terinstal (Nonaktif):**\n${uninstalled.length > 0 ? uninstalled.join(', ') : 'Tidak ada'}`,
        embeds: [embed]
      };
    }

    // Check permissions for install/uninstall: Must be server owner, have Administrator/ManageGuild permissions, or have an 'admin' role
    const isOwner = guild.ownerId === user?.id;
    const isAdminPermission = member?.permissions?.has(PermissionFlagsBits.Administrator) || member?.permissions?.has(PermissionFlagsBits.ManageGuild);
    const hasAdminRole = member?.roles?.cache?.some(role => role.name.toLowerCase().includes('admin'));

    if (!isOwner && !isAdminPermission && !hasAdminRole) {
      return {
        success: false,
        error: 'Maaf, Anda tidak memiliki izin untuk mengelola plugin. Hanya Owner server atau Admin yang dapat melakukan ini.',
        responseText: 'Maaf, Anda tidak memiliki izin untuk mengelola plugin. Hanya Owner server atau Admin yang dapat melakukan ini.'
      };
    }

    // Validate if the plugin exists in the codebase (or is plugin itself)
    if (name && !commandsMap[name] && name !== 'plugin') {
      return {
        success: false,
        error: `Plugin "${name}" tidak ditemukan.`,
        responseText: `Plugin "${name}" tidak ditemukan.`
      };
    }

    if (action === 'install') {
      await installPlugin(guild.id, name);
      logger.info(
        `[Plugins] AI Agent installed plugin "${name}" for guild ${guild.id} requested by ${user?.tag}. Re-deploying commands...`
      );

      // Reload commands and redeploy to Discord
      if (process.env.NODE_ENV !== 'test') {
        await loadCommands(context.client);
        await deployCommands(context.client);
      }

      const relatedCommands = commandsMap[name]
        ? commandsMap[name].map((c) => `\`/${c}\``).join(', ')
        : `\`/${name}\``;

      const embed = new V2Embed()
        .setTitle('Plugin Installed 🎉')
        .setDescription(
          `Plugin **${name}** berhasil diinstal untuk server ini!\n` +
            `Perintah terkait (${relatedCommands}) kini telah didaftarkan ke Discord.`
        )
        .build();

      return {
        success: true,
        responseText: `Plugin **${name}** berhasil diinstal untuk server ini! Perintah terkait (${relatedCommands}) kini telah didaftarkan ke Discord.`,
        embeds: [embed]
      };
    }

    if (action === 'uninstall') {
      await uninstallPlugin(guild.id, name);
      logger.info(
        `[Plugins] AI Agent uninstalled plugin "${name}" for guild ${guild.id} requested by ${user?.tag}. Re-deploying commands...`
      );

      // Reload commands and redeploy to Discord
      if (process.env.NODE_ENV !== 'test') {
        await loadCommands(context.client);
        await deployCommands(context.client);
      }

      const relatedCommands = commandsMap[name]
        ? commandsMap[name].map((c) => `\`/${c}\``).join(', ')
        : `\`/${name}\``;

      const embed = new V2Embed()
        .setTitle('Plugin Uninstalled 🔌')
        .setDescription(
          `Plugin **${name}** berhasil dinonaktifkan (uninstalled) untuk server ini!\n` +
            `Perintah terkait (${relatedCommands}) telah dinonaktifkan.`
        )
        .build();

      return {
        success: true,
        responseText: `Plugin **${name}** berhasil dinonaktifkan (uninstalled) untuk server ini! Perintah terkait (${relatedCommands}) telah dinonaktifkan.`,
        embeds: [embed]
      };
    }

    return { success: false, error: 'Unknown action.' };
  }
};
