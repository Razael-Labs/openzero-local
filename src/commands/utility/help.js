import { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import { t } from '../../utils/i18n.js';

/**
 * Generates help container embed dynamically with category filtering buttons
 * @param {import('discord.js').Client} client
 * @param {string} locale
 * @param {string} selectedCategory
 * @param {any} context
 */
export function generateHelpEmbed(client, locale, selectedCategory = 'all', context = null) {
  const commands = client.commands;

  const categories = {};
  commands.forEach((cmd) => {
    const category = cmd.category || 'other';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(cmd);
  });

  const sortedCategories = Object.keys(categories).sort();

  // Sort commands in each category
  for (const cat of sortedCategories) {
    categories[cat].sort((a, b) => {
      const numA = typeof a.num === 'number' ? a.num : 9999;
      const numB = typeof b.num === 'number' ? b.num : 9999;
      if (numA !== numB) return numA - numB;
      const nameA = (a.title || a.data.name).toLowerCase();
      const nameB = (b.title || b.data.name).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }

  let descriptionText = '';

  if (selectedCategory === 'all') {
    descriptionText += t('helpDescription', locale);

    // Overview of categories
    descriptionText += `### 📊 Summary:\n`;
    for (const cat of sortedCategories) {
      const capitalizedCat = cat.charAt(0).toUpperCase() + cat.slice(1);
      descriptionText += `*   **${capitalizedCat}:** \`${categories[cat].length}\` commands\n`;
    }
    descriptionText += `\n*Gunakan tombol di bawah untuk menyaring perintah berdasarkan kategori.*\n\n`;

    // List all
    for (const cat of sortedCategories) {
      const capitalizedCat = cat.charAt(0).toUpperCase() + cat.slice(1);
      descriptionText += `### 🧭 ${t('helpCategory', locale)}: ${capitalizedCat}\n`;

      for (const cmd of categories[cat]) {
        const name = cmd.title || cmd.data.name;
        const isSlash = !cmd.data.type || cmd.data.type === 1;
        const defaultCommandFormat = isSlash ? `/${cmd.data.name}` : cmd.data.name;
        const cmdSyntax = cmd.command || defaultCommandFormat;
        const desc = cmd.description || cmd.data.description || '-';
        const numPrefix = typeof cmd.num === 'number' ? `\`[${cmd.num}]\` ` : '';

        descriptionText += `*   ${numPrefix}**${name}**\n` +
                           `    *   **${t('helpCommandFormat', locale)}:** \`${cmdSyntax}\`\n` +
                           `    *   **${t('helpDescriptionFormat', locale)}:** ${desc}\n\n`;
      }
    }
  } else {
    // Show only the selected category
    const cat = selectedCategory.toLowerCase();
    const capitalizedCat = cat.charAt(0).toUpperCase() + cat.slice(1);

    descriptionText += `### 🧭 ${t('helpCategory', locale)}: ${capitalizedCat}\n\n`;

    const catCmds = categories[cat] || [];
    if (catCmds.length === 0) {
      descriptionText += `Tidak ada perintah di kategori ini.`;
    } else {
      for (const cmd of catCmds) {
        const name = cmd.title || cmd.data.name;
        const isSlash = !cmd.data.type || cmd.data.type === 1;
        const defaultCommandFormat = isSlash ? `/${cmd.data.name}` : cmd.data.name;
        const cmdSyntax = cmd.command || defaultCommandFormat;
        const desc = cmd.description || cmd.data.description || '-';
        const numPrefix = typeof cmd.num === 'number' ? `\`[${cmd.num}]\` ` : '';

        descriptionText += `*   ${numPrefix}**${name}**\n` +
                           `    *   **${t('helpCommandFormat', locale)}:** \`${cmdSyntax}\`\n` +
                           `    *   **${t('helpDescriptionFormat', locale)}:** ${desc}\n\n`;
      }
    }
  }

  // Create action buttons for categories
  const buttonRow = new ActionRowBuilder();

  // Add "All" button
  buttonRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`help_cat_all`)
      .setLabel(locale === 'id' ? 'Semua' : 'All')
      .setStyle(selectedCategory === 'all' ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  // Add a button for each category (max 4 categories to keep it in a single row of 5 buttons max)
  sortedCategories.slice(0, 4).forEach((cat) => {
    const capitalizedCat = cat.charAt(0).toUpperCase() + cat.slice(1);
    buttonRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`help_cat_${cat}`)
        .setLabel(capitalizedCat)
        .setStyle(selectedCategory === cat ? ButtonStyle.Success : ButtonStyle.Primary)
    );
  });

  const embed = new V2Embed()
    .setContext(context)
    .setTitle(t('helpTitle', locale))
    .setDescription(descriptionText);

  if (buttonRow.components.length > 0) {
    embed.addActionRow(buttonRow);
  }

  return embed.build();
}

export default {
  title: 'Help',
  command: '/help',
  description: 'Menampilkan daftar perintah bot.',
  num: 99,
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Menampilkan daftar perintah bot.')
    .setNameLocalizations({
      'id': 'help',
      'en-US': 'help',
      'en-GB': 'help'
    })
    .setDescriptionLocalizations({
      'id': 'Menampilkan daftar perintah bot.',
      'en-US': 'Displays the bot command list.',
      'en-GB': 'Displays the bot command list.'
    })
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const locale = interaction.locale;
    const embed = generateHelpEmbed(interaction.client, locale, 'all', interaction);

    await interaction.reply({
      components: [embed],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
