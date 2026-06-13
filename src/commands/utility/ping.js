import {
  SlashCommandBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import { resolveEmoji } from '../../utils/symbols.js';

export default {
  title: 'Ping Bot',
  command: '/ping',
  description: 'Mengukur latency bot dan API Discord.',
  num: 1,
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Mengukur latency bot dan API Discord.')
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const start = Date.now();
    await interaction.reply({ content: 'Mengukur latency...' });
    const latency = Date.now() - start;

    // Membuat tombol di dalam ActionRow
    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ping_refresh')
        .setLabel('Ukur Ulang')
        .setStyle(ButtonStyle.Primary)
        .setEmoji(resolveEmoji(interaction.guild, '🔄'))
    );

    // Membuat container menggunakan class helper V2Embed (menggunakan warna global default)
    const embed = new V2Embed()
      .setTitle('Pong! 🏓')
      .setDescription(
        `*   **Latency Interaksi:** \`${latency}ms\`\n` +
          `*   **Heartbeat API:** \`${interaction.client.ws.ping}ms\``
      )
      .addActionRow(buttonRow)
      .build();

    // Mengedit balasan untuk menggunakan container Components V2
    await interaction.editReply({
      content: '', // Menghapus tulisan loading sebelumnya
      components: [embed],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
