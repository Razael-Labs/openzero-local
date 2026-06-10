import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import { getInstalledPlugins, installPlugin, uninstallPlugin, PLUGIN_COMMANDS } from '../../utils/pluginManager.js';
import { loadCommands, deployCommands } from '../../handlers/commandHandler.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('plugin')
    .setDescription('Manage bot plugins and their commands.')
    .setDescriptionLocalizations({
      id: 'Kelola plugin bot dan perintah-perintahnya.'
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    // SUBCOMMAND: LIST
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all plugins and their installation status.')
        .setDescriptionLocalizations({
          id: 'Daftar semua plugin dan status instalasinya.'
        })
    )
    // SUBCOMMAND: INSTALL
    .addSubcommand(subcommand =>
      subcommand
        .setName('install')
        .setDescription('Install/enable a plugin.')
        .setDescriptionLocalizations({
          id: 'Instal/aktifkan plugin.'
        })
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Name of the plugin')
            .setDescriptionLocalizations({
              id: 'Nama plugin'
            })
            .setRequired(true)
            .addChoices(
              { name: 'Webhook Manager (webhook)', value: 'webhook' },
              { name: 'Music Player (music)', value: 'music' },
              { name: 'Role Manager (role)', value: 'role' },
              { name: 'Translate Engine (translate)', value: 'translate' },
              { name: 'User Profile Info (userInfo)', value: 'userInfo' },
              { name: '7-Day Chat Records (messagesRecord)', value: 'messagesRecord' }
            )
        )
    )
    // SUBCOMMAND: UNINSTALL
    .addSubcommand(subcommand =>
      subcommand
        .setName('uninstall')
        .setDescription('Uninstall/disable a plugin.')
        .setDescriptionLocalizations({
          id: 'Uninstall/nonaktifkan plugin.'
        })
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Name of the plugin')
            .setDescriptionLocalizations({
              id: 'Nama plugin'
            })
            .setRequired(true)
            .addChoices(
              { name: 'Webhook Manager (webhook)', value: 'webhook' },
              { name: 'Music Player (music)', value: 'music' },
              { name: 'Role Manager (role)', value: 'role' },
              { name: 'Translate Engine (translate)', value: 'translate' },
              { name: 'User Profile Info (userInfo)', value: 'userInfo' },
              { name: '7-Day Chat Records (messagesRecord)', value: 'messagesRecord' }
            )
        )
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const installed = getInstalledPlugins();

    if (subcommand === 'list') {
      let desc = '';
      for (const pluginName of Object.keys(PLUGIN_COMMANDS)) {
        const isInstalled = installed.includes(pluginName);
        const statusIcon = isInstalled ? '✅ **Active**' : '❌ **Inactive**';
        const commandsList = PLUGIN_COMMANDS[pluginName].map(c => `\`/${c}\``).join(', ');
        desc += `*   **${pluginName}**: ${statusIcon}\n    ↳ Commands: ${commandsList}\n\n`;
      }

      const embed = new V2Embed()
        .setTitle('Plugin Status List 🔌')
        .setDescription(desc)
        .build();

      return await interaction.editReply({
        components: [embed],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const pluginName = interaction.options.getString('name');

    if (subcommand === 'install') {
      installPlugin(pluginName);
      logger.info(`[Plugins] Plugin "${pluginName}" installed by ${interaction.user.tag}. Re-deploying commands...`);

      // Reload commands and redeploy to Discord
      await loadCommands(interaction.client);
      await deployCommands(interaction.client);

      const embed = new V2Embed()
        .setTitle('Plugin Installed 🎉')
        .setDescription(
          `Plugin **${pluginName}** berhasil diinstal!\n` +
          `Perintah terkait (${PLUGIN_COMMANDS[pluginName].map(c => `\`/${c}\``).join(', ')}) kini telah didaftarkan ke Discord.`
        )
        .build();

      return await interaction.editReply({
        components: [embed],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (subcommand === 'uninstall') {
      uninstallPlugin(pluginName);
      logger.info(`[Plugins] Plugin "${pluginName}" uninstalled by ${interaction.user.tag}. Re-deploying commands...`);

      // Reload commands and redeploy to Discord
      await loadCommands(interaction.client);
      await deployCommands(interaction.client);

      const embed = new V2Embed()
        .setTitle('Plugin Uninstalled 🔌')
        .setDescription(
          `Plugin **${pluginName}** berhasil dinonaktifkan!\n` +
          `Perintah terkait (${PLUGIN_COMMANDS[pluginName].map(c => `\`/${c}\``).join(', ')}) telah dihapus dari Discord.`
        )
        .build();

      return await interaction.editReply({
        components: [embed],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
