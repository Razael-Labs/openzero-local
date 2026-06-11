import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import {
  getInstalledPlugins,
  installPlugin,
  uninstallPlugin,
  getPluginCommandsMap
} from '../../utils/pluginManager.js';
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
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('List all plugins and their installation status.')
        .setDescriptionLocalizations({
          id: 'Daftar semua plugin dan status instalasinya.'
        })
    )
    // SUBCOMMAND: INSTALL
    .addSubcommand((subcommand) =>
      subcommand
        .setName('install')
        .setDescription('Install/enable a plugin.')
        .setDescriptionLocalizations({
          id: 'Instal/aktifkan plugin.'
        })
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Name of the plugin')
            .setDescriptionLocalizations({
              id: 'Nama plugin'
            })
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    // SUBCOMMAND: UNINSTALL
    .addSubcommand((subcommand) =>
      subcommand
        .setName('uninstall')
        .setDescription('Uninstall/disable a plugin.')
        .setDescriptionLocalizations({
          id: 'Uninstall/nonaktifkan plugin.'
        })
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Name of the plugin')
            .setDescriptionLocalizations({
              id: 'Nama plugin'
            })
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = interaction.guildId;
    if (!guildId) {
      return await interaction.editReply({
        content: 'Perintah ini hanya dapat dijalankan di dalam server (Guild).'
      });
    }

    const installed = await getInstalledPlugins(guildId);

    const commandsMap = getPluginCommandsMap();

    if (subcommand === 'list') {
      let desc = '';
      for (const pluginName of Object.keys(commandsMap)) {
        const isInstalled = installed.includes(pluginName);
        const statusIcon = isInstalled ? '✅ **Installed**' : '❌ **Not Installed**';
        const commandsList = commandsMap[pluginName].map((c) => `\`/${c}\``).join(', ');
        desc += `*   **${pluginName}**: ${statusIcon}\n    ↳ Commands: ${commandsList}\n\n`;
      }

      const embed = new V2Embed().setTitle('Plugin Status List 🔌').setDescription(desc).build();

      return await interaction.editReply({
        components: [embed],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const pluginName = interaction.options.getString('name');

    if (subcommand === 'install') {
      await installPlugin(guildId, pluginName);
      logger.info(
        `[Plugins] Plugin "${pluginName}" installed for guild ${guildId} by ${interaction.user.tag}. Re-deploying commands...`
      );

      // Reload commands and redeploy to Discord
      await loadCommands(interaction.client);
      await deployCommands(interaction.client);

      const relatedCommands = commandsMap[pluginName]
        ? commandsMap[pluginName].map((c) => `\`/${c}\``).join(', ')
        : `\`/${pluginName}\``;

      const embed = new V2Embed()
        .setTitle('Plugin Installed 🎉')
        .setDescription(
          `Plugin **${pluginName}** berhasil diinstal untuk server ini!\n` +
            `Perintah terkait (${relatedCommands}) kini telah didaftarkan ke Discord.`
        )
        .build();

      return await interaction.editReply({
        components: [embed],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (subcommand === 'uninstall') {
      await uninstallPlugin(guildId, pluginName);
      logger.info(
        `[Plugins] Plugin "${pluginName}" uninstalled for guild ${guildId} by ${interaction.user.tag}. Re-deploying commands...`
      );

      // Reload commands and redeploy to Discord
      await loadCommands(interaction.client);
      await deployCommands(interaction.client);

      const relatedCommands = commandsMap[pluginName]
        ? commandsMap[pluginName].map((c) => `\`/${c}\``).join(', ')
        : `\`/${pluginName}\``;

      const embed = new V2Embed()
        .setTitle('Plugin Uninstalled 🔌')
        .setDescription(
          `Plugin **${pluginName}** berhasil dinonaktifkan (uninstalled) untuk server ini!\n` +
            `Perintah terkait (${relatedCommands}) telah dinonaktifkan.`
        )
        .build();

      return await interaction.editReply({
        components: [embed],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },

  /**
   * @param {import('discord.js').AutocompleteInteraction} interaction
   */
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const { plugins: activePlugins } = await import('../../utils/pluginManager.js');

    const choices = Object.keys(activePlugins).map((name) => ({
      name: `${name} Plugin`,
      value: name
    }));
    const filtered = choices
      .filter((choice) => choice.value.toLowerCase().includes(focusedValue))
      .slice(0, 25);

    await interaction.respond(filtered);
  }
};
