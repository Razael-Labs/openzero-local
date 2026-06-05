import {
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  Collection
} from 'discord.js';
import logger from '../utils/logger.js';
import { V2Embed } from '../utils/v2Embed.js';
import { getObtainiumEmbed } from '../utils/obtainiumHelper.js';

const cooldowns = new Collection();

export default {
  name: Events.InteractionCreate,
  once: false,
  /**
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(interaction) {
    // Penanganan Button Interactions
    if (interaction.isButton()) {
      if (interaction.customId === 'ping_refresh') {
        try {
          // Memberitahu Discord secepat mungkin bahwa bot menerima klik tombol
          await interaction.deferUpdate();

          const latency = Date.now() - interaction.createdTimestamp;

          const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('ping_refresh')
              .setLabel('Ukur Ulang')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('🔄')
          );

          const embed = new V2Embed()
            .setTitle('Pong! 🏓')
            .setDescription(
              `*   **Latency Interaksi:** \`${latency}ms\`\n` +
                `*   **Heartbeat API:** \`${interaction.client.ws.ping}ms\``
            )
            .addActionRow(buttonRow)
            .build();

          // Mengedit balasan interaksi yang sudah ada
          await interaction.editReply({
            components: [embed],
            flags: MessageFlags.IsComponentsV2
          });

          logger.info(
            `[Button Clicked] ping_refresh diproses untuk ${interaction.user.tag} (Latency: ${latency}ms)`
          );
        } catch (error) {
          logger.error('[Button Error] Gagal memproses interaksi tombol ping_refresh:', error);
        }
      } else if (interaction.customId.startsWith('obtainium_page_')) {
        try {
          // Memberitahu Discord secepat mungkin untuk menghindari 'Unknown interaction'
          await interaction.deferUpdate();

          const pageIndex = parseInt(interaction.customId.replace('obtainium_page_', ''), 10) || 0;
          const embed = await getObtainiumEmbed(pageIndex);

          await interaction.editReply({
            components: [embed],
            flags: MessageFlags.IsComponentsV2
          });

          logger.info(
            `[Button Clicked] ${interaction.customId} diproses untuk ${interaction.user.tag}`
          );
        } catch (error) {
          logger.error(
            `[Button Error] Gagal memproses interaksi tombol ${interaction.customId}:`,
            error
          );
        }
      }
      return;
    }

    // Memproses command berbasis Slash Commands (Chat Input) atau Context Menu Commands
    if (!interaction.isChatInputCommand() && !interaction.isContextMenuCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(
        `[Command Handler] Slash command /${interaction.commandName} dipanggil tapi tidak terdaftar.`
      );
      return;
    }

    // Sistem Cooldown (3 detik)
    if (!cooldowns.has(command.data.name)) {
      cooldowns.set(command.data.name, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.data.name);
    const cooldownAmount = 3000; // 3 detik

    if (timestamps.has(interaction.user.id)) {
      const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

      if (now < expirationTime) {
        const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
        const cooldownEmbed = new V2Embed()
          .setTitle('Slow down! ⏱️')
          .setDescription(
            `Harap tunggu \`${timeLeft}\` detik lagi sebelum menggunakan kembali perintah \`/${interaction.commandName}\`.`
          )
          .setColor(0xff3333)
          .build();

        return interaction.reply({
          components: [cooldownEmbed],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }
    }

    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

    // Catat log eksekusi command
    logger.info(
      `[Command Executed] /${interaction.commandName} oleh ${interaction.user.tag} di #${interaction.channel.name}`
    );

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(
        `[Command Error] Terjadi kesalahan saat mengeksekusi /${interaction.commandName}:`,
        error
      );

      const errorMessage = 'Maaf, terjadi kesalahan saat menjalankan perintah ini!';

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }
};
