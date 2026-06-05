import fs from 'fs/promises';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { V2Embed } from './v2Embed.js';
import logger from './logger.js';
import { config } from '../config.js';

const JSON_PATH = '/data/data/com.termux/files/home/openzero-local/data/obtainium_repos_data.json';

/**
 * Membaca data aplikasi dari file JSON Obtainium
 * @returns {Promise<Array>}
 */
async function loadApps() {
  try {
    const rawData = await fs.readFile(JSON_PATH, 'utf-8');
    const data = JSON.parse(rawData);
    // Handle both raw export (object with .apps) and enriched data (array)
    return Array.isArray(data) ? data : data.apps || [];
  } catch (error) {
    logger.error('[Obtainium Helper] Gagal membaca berkas JSON Obtainium:', error);
    return [];
  }
}

/**
 * Membuat V2Embed untuk halaman tertentu
 * @param {number} pageIndex
 * @returns {Promise<import('discord.js').ContainerBuilder>}
 */
export async function getObtainiumEmbed(pageIndex) {
  const apps = await loadApps();
  const itemsPerPage = 4;
  const totalPages = Math.ceil(apps.length / itemsPerPage) || 1;

  // Normalisasi index halaman
  let currentPage = Math.max(0, Math.min(pageIndex, totalPages - 1));

  const start = currentPage * itemsPerPage;
  const end = start + itemsPerPage;
  const pageApps = apps.slice(start, end);

  // Building the application list description
  let description = `*Showing apps **${start + 1} - ${Math.min(end, apps.length)}** of **${apps.length}** open-source applications.*\n\n`;

  if (pageApps.length === 0) {
    description += '*(No applications found)*';
  } else {
    pageApps.forEach((app, i) => {
      const appName = app.name || 'Unnamed App';
      const appUrl = app.url || '#';
      const appAuthor = app.author || 'N/A';
      const appId = app.id || 'unknown-id';
      const appVersion = app.latestVersion || 'N/A';
      const appDesc = app.description
        ? `${app.description} [Read more](${appUrl})`
        : `Click to view more details... [Read more](${appUrl})`;

      description += `**${start + i + 1}. [${appName}](${appUrl})** (by \`${appAuthor}\`)\n`;
      description += `   ↳ ${appDesc}\n`;
      description += `   ↳ ID: \`${appId}\` | Version: \`${appVersion}\`\n\n`;
    });
  }

  description += `**Page ${currentPage + 1} of ${totalPages}**`;

  // Navigation buttons (Emoji-only for minimalist style)
  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`obtainium_page_${currentPage - 1}`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji('⬅️')
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId(`obtainium_page_${currentPage}`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔄'),
    new ButtonBuilder()
      .setCustomId(`obtainium_page_${currentPage + 1}`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji('➡️')
      .setDisabled(currentPage >= totalPages - 1)
  );

  const embed = new V2Embed()
    .setTitle('Obtainium Open-Source Apps & Tools')
    .setDescription(description)
    .addActionRow(buttonRow)
    .build();

  return embed;
}

/**
 * Updates the global Obtainium message on Discord with the latest data
 * @param {import('discord.js').Client} client
 */
export async function updateObtainiumMessage(client) {
  try {
    const channelId = config?.obtainium?.channelId;
    const messageId = config?.obtainium?.messageId;

    if (!channelId || !messageId) {
      logger.warn('[Obtainium Helper] channelId atau messageId tidak terkonfigurasi di config.js');
      return false;
    }

    const channel = await client.channels.fetch(channelId);
    if (channel && channel.isTextBased()) {
      const message = await channel.messages.fetch(messageId);
      if (message) {
        const embed = await getObtainiumEmbed(0);
        const { MessageFlags } = await import('discord.js');
        await message.edit({
          components: [embed],
          flags: MessageFlags.IsComponentsV2
        });
        logger.info('[Obtainium Helper] Berhasil memperbarui pesan list Obtainium di Discord!');
        return true;
      }
    }
  } catch (error) {
    logger.error('[Obtainium Helper] Gagal memperbarui pesan list Obtainium:', error);
  }
  return false;
}

