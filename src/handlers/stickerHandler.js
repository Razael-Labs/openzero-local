import logger from '../utils/logger.js';

/**
 * Handler to check if a message contains stickers, log them, and parse the sticker details.
 *
 * @param {import('discord.js').Message} message - The Discord message object
 * @returns {string|null} Returns a string representation of the sticker(s) if present, otherwise null.
 */
export function handleSticker(message) {
  if (message.stickers && message.stickers.size > 0) {
    const stickerNames = message.stickers.map((s) => s.name).join(', ');
    const logString = `[Sticker: ${stickerNames}]`;

    // Log the sticker activity specifically
    logger.info(
      `[Sticker Activity] [${message.guild?.name || 'DM'}] #${message.channel.name || 'unknown'} | ${message.author.tag} sent sticker(s): ${stickerNames}`
    );

    return logString;
  }
  return null;
}
