import fs from 'fs/promises';
import path from 'path';

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { V2Embed } from './v2Embed.js';
import logger from './logger.js';
import { config } from '../config.js';
import { getObtainiumMessageId, setObtainiumMessageId } from './database.js';
import { Symbols } from './symbols.js';

const JSON_PATH = path.join(config.database.dir, 'obtainium_repos_data.json');

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
    logger.error('[Obtainium Helper] Failed to read Obtainium JSON file:', error);
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
      description += `   ${Symbols.ENTER} ${appDesc}\n`;
      description += `   ${Symbols.ENTER} ID: \`${appId}\` | Version: \`${appVersion}\`\n\n`;
    });
  }

  description += `**Page ${currentPage + 1} of ${totalPages}**`;

  // Navigation buttons (Emoji-only for minimalist style)
  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`obtainium_page_${currentPage - 1}`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji(Symbols.ARROW_LEFT)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId(`obtainium_page_${currentPage}`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(Symbols.REFRESH),
    new ButtonBuilder()
      .setCustomId(`obtainium_page_${currentPage + 1}`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji(Symbols.ARROW_RIGHT)
      .setDisabled(currentPage >= totalPages - 1)
  );

  const embed = new V2Embed()
    .setTitle('Obtainium Open-Source Apps & Tools')
    .setDescription(description)
    .addActionRow(buttonRow)
    .build();

  return embed;
}

export async function updateObtainiumMessage(client) {
  try {
    const channelId = config?.obtainium?.channelId;
    if (!channelId) {
      logger.warn('[Obtainium Helper] channelId is not configured in config.js');
      return false;
    }

    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      logger.error(
        `[Obtainium Helper] Channel ID ${channelId} not found or is not a text channel!`
      );
      return false;
    }

    const storedRef = getObtainiumMessageId() || config?.obtainium?.messageId;
    let targetMessageId = storedRef;
    if (storedRef && storedRef.includes('://')) {
      targetMessageId = storedRef.split('/').pop();
    }

    let message = null;

    if (targetMessageId) {
      try {
        message = await channel.messages.fetch(targetMessageId);
      } catch (err) {
        const refType = storedRef && storedRef.includes('://') ? 'link' : 'ID';
        logger.info(
          `[Obtainium Helper] Message with ${refType} ${storedRef} not found or was deleted. Creating new message.`
        );
      }
    }

    const embed = await getObtainiumEmbed(0);

    if (message) {
      // Edit existing message
      await message.edit({
        components: [embed],
        flags: MessageFlags.IsComponentsV2
      });
      logger.info('[Obtainium Helper] Successfully updated Obtainium list message in Discord!');
      return true;
    } else {
      // Create new message and save its URL to persist it
      const sentMessage = await channel.send({
        components: [embed],
        flags: MessageFlags.IsComponentsV2
      });
      setObtainiumMessageId(sentMessage.url);
      logger.info(
        `[Obtainium Helper] Successfully created new Obtainium list message with link: ${sentMessage.url}`
      );
      return true;
    }
  } catch (error) {
    logger.error('[Obtainium Helper] Failed to update Obtainium list message:', error);
  }
  return false;
}
