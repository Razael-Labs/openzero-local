/**
 * Class representing system-wide symbols and emojis to maintain styling consistency.
 */
export class Symbols {
  static guild = null;

  static get ENTER() {
    return '↳';
  }
  static get ARROW_LEFT() {
    return '⬅️';
  }
  static get ARROW_RIGHT() {
    return '➡️';
  }
  static get REFRESH() {
    return '🔄';
  }
  static get INFO() {
    return 'ℹ 🧭';
  }
  static get WARN() {
    return '⚠ ⚡';
  }
  static get ERROR() {
    return '✖ 🔥';
  }
  static get DEBUG() {
    return '⚙ 🛠';
  }
  static get BULLET() {
    return '•';
  }

  // UI & Embed Symbols
  static get SUCCESS() {
    return '✅';
  }
  static get FAILURE() {
    return '❌';
  }
  static get WARNING() {
    return '⚠️';
  }
  static get PING() {
    return '🏓';
  }
  static get COOLDOWN() {
    return '⏱️';
  }
  static get MUSIC() {
    return '🎵';
  }
  static get MICROPHONE() {
    return '🎤';
  }
  static get HELLO() {
    return '👋';
  }

  // More Emojis used in commands and locales
  static get USER() {
    return '👤';
  }
  static get CALENDAR() {
    return '📅';
  }
  static get SHIELD() {
    return '🛡️';
  }
  static get CHAT() {
    return '💬';
  }
  static get STOP() {
    return '🛑';
  }
  static get HAMMER() {
    return '🔨';
  }
  static get TRASH() {
    return '🗑️';
  }
  static get MUTE() {
    return '🔇';
  }
  static get VOLUME() {
    return '🔊';
  }
  static get HOURGLASS() {
    return '⏳';
  }
  static get GLOBE() {
    return '🌐';
  }
  static get WRENCH() {
    return '🔧';
  }
}

/**
 * Replaces standard emojis and symbols in text with custom guild emojis if available.
 *
 * @param {string} text - The input text to format
 * @param {import('discord.js').Guild|null} guild - The Discord guild to fetch custom emojis from
 * @returns {string} The formatted text
 */
export function applyGuildEmojis(text, guild) {
  if (!text || typeof text !== 'string') return text;

  let formattedText = text
    .replace(/❌/g, Symbols.FAILURE)
    .replace(/✅/g, Symbols.SUCCESS)
    .replace(/⚠️/g, Symbols.WARNING)
    .replace(/🏓/g, Symbols.PING)
    .replace(/⏱️/g, Symbols.COOLDOWN)
    .replace(/🎵/g, Symbols.MUSIC)
    .replace(/🎤/g, Symbols.MICROPHONE)
    .replace(/👋/g, Symbols.HELLO)
    .replace(/↳/g, Symbols.ENTER)
    .replace(/⬅️/g, Symbols.ARROW_LEFT)
    .replace(/➡️/g, Symbols.ARROW_RIGHT)
    .replace(/🔄/g, Symbols.REFRESH);

  const targetGuild = guild || Symbols.guild;

  if (targetGuild && targetGuild.emojis && targetGuild.emojis.cache) {
    const emojis = targetGuild.emojis.cache;
    const emojiMapping = {
      // Core Embed Symbols
      [Symbols.SUCCESS]: 'oz_success',
      [Symbols.FAILURE]: 'oz_failure',
      [Symbols.WARNING]: 'oz_warning',
      [Symbols.PING]: 'oz_ping',
      [Symbols.COOLDOWN]: 'oz_cooldown',
      [Symbols.MUSIC]: 'oz_music',
      [Symbols.MICROPHONE]: 'oz_microphone',
      [Symbols.HELLO]: 'oz_hello',
      [Symbols.REFRESH]: 'oz_refresh',

      '👤': 'oz_user',
      '📅': 'oz_calendar',
      '🛡️': 'oz_shield',
      '🛡': 'oz_shield',
      '💬': 'oz_chat',
      '🛑': 'oz_stop',
      '🔨': 'oz_hammer',
      '🗑️': 'oz_trash',
      '🗑': 'oz_trash',
      '🔇': 'oz_mute',
      '🔊': 'oz_volume',
      '⏳': 'oz_hourglass',
      '🌐': 'oz_globe',
      '🔧': 'oz_wrench',
      '⬅️': 'oz_arrow_left',
      '➡️': 'oz_arrow_right',
      '📋': 'oz_clipboard',
      '🖼️': 'oz_image',
      '🏳️': 'oz_flag',

      // Sub-parts of logger / system headers
      ℹ: 'oz_info',
      '🧭': 'oz_discord',
      '📊': 'oz_letterboxd',
      '⚠': 'oz_warn',
      '⚡': 'oz_bolt',
      '✖': 'oz_error',
      '🔥': 'oz_fire',
      '⚙': 'oz_gear',
      '🛠': 'oz_tools'
    };

    for (const [symbol, emojiName] of Object.entries(emojiMapping)) {
      const customEmoji = emojis.find((e) => e.name === emojiName);
      if (customEmoji) {
        formattedText = formattedText.replaceAll(symbol, customEmoji.toString());
      }
    }
  }

  return formattedText;
}

/**
 * Resolves a custom guild emoji or fallback standard emoji for buttons/components.
 *
 * @param {import('discord.js').Guild|null} guild - The Discord guild to check
 * @param {string} symbolOrName - E.g. '🔄' or 'oz_refresh' or Symbols.REFRESH
 * @param {string} [fallback] - The fallback standard emoji
 * @returns {string|import('discord.js').GuildEmoji} The resolved emoji (GuildEmoji instance, ID string, or fallback string)
 */
export function resolveEmoji(guild, symbolOrName, fallback) {
  const targetGuild = guild || Symbols.guild;
  if (!targetGuild) return fallback || symbolOrName;

  const emojiMapping = {
    '✅': 'oz_success',
    '❌': 'oz_failure',
    '⚠️': 'oz_warning',
    '🏓': 'oz_ping',
    '⏱️': 'oz_cooldown',
    '🎵': 'oz_music',
    '🎤': 'oz_microphone',
    '👋': 'oz_hello',
    '🔄': 'oz_refresh',
    '👤': 'oz_user',
    '📅': 'oz_calendar',
    '🛡️': 'oz_shield',
    '🛡': 'oz_shield',
    '💬': 'oz_chat',
    '🛑': 'oz_stop',
    '🔨': 'oz_hammer',
    '🗑️': 'oz_trash',
    '🗑': 'oz_trash',
    '🔇': 'oz_mute',
    '🔊': 'oz_volume',
    '⏳': 'oz_hourglass',
    '🌐': 'oz_globe',
    '🔧': 'oz_wrench',
    '⬅️': 'oz_arrow_left',
    '➡️': 'oz_arrow_right',
    '📋': 'oz_clipboard',
    '🖼️': 'oz_image',
    '🏳️': 'oz_flag',
    ℹ: 'oz_info',
    '🧭': 'oz_discord',
    '📊': 'oz_letterboxd',
    '⚠': 'oz_warn',
    '⚡': 'oz_bolt',
    '✖': 'oz_error',
    '🔥': 'oz_fire',
    '⚙': 'oz_gear',
    '🛠': 'oz_tools'
  };

  const emojiName = emojiMapping[symbolOrName] || symbolOrName;
  const customEmoji =
    targetGuild.emojis && targetGuild.emojis.cache
      ? targetGuild.emojis.cache.find((e) => e.name === emojiName)
      : null;

  if (customEmoji) {
    return {
      id: customEmoji.id,
      name: customEmoji.name,
      animated: customEmoji.animated
    };
  }

  return fallback || symbolOrName;
}
