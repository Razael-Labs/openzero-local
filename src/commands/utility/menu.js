import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { generateHelpEmbed } from './help.js';

export default {
  title: 'Menu',
  command: '/menu',
  description: 'Menampilkan daftar perintah bot.',
  num: 100,
  data: new SlashCommandBuilder()
    .setName('menu')
    .setDescription('Menampilkan daftar perintah bot.')
    .setNameLocalizations({
      id: 'menu',
      'en-US': 'menu',
      'en-GB': 'menu'
    })
    .setDescriptionLocalizations({
      id: 'Menampilkan daftar perintah bot.',
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
