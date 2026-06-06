/**
 * Class representing system-wide symbols and emojis to maintain styling consistency.
 */
export class Symbols {
  static get ENTER() { return '↳'; }
  static get ARROW_LEFT() { return '⬅️'; }
  static get ARROW_RIGHT() { return '➡️'; }
  static get REFRESH() { return '🔄'; }
  static get INFO() { return 'ℹ 🧭'; }
  static get WARN() { return '⚠ ⚡'; }
  static get ERROR() { return '✖ 🔥'; }
  static get DEBUG() { return '⚙ 🛠'; }
  static get BULLET() { return '•'; }
  
  // UI & Embed Symbols
  static get SUCCESS() { return '✅'; }
  static get FAILURE() { return '❌'; }
  static get WARNING() { return '⚠️'; }
  static get PING() { return '🏓'; }
  static get COOLDOWN() { return '⏱️'; }
  static get MUSIC() { return '🎵'; }
  static get MICROPHONE() { return '🎤'; }
  static get HELLO() { return '👋'; }
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

  if (guild) {
    const emojis = guild.emojis.cache;
    const emojiMapping = {
      [Symbols.SUCCESS]: 'oz_success',
      [Symbols.FAILURE]: 'oz_failure',
      [Symbols.WARNING]: 'oz_warning',
      [Symbols.PING]: 'oz_ping',
      [Symbols.COOLDOWN]: 'oz_cooldown',
      [Symbols.MUSIC]: 'oz_music',
      [Symbols.MICROPHONE]: 'oz_microphone',
      [Symbols.HELLO]: 'oz_hello',
      [Symbols.ENTER]: 'oz_enter',
      [Symbols.ARROW_LEFT]: 'oz_arrow_left',
      [Symbols.ARROW_RIGHT]: 'oz_arrow_right',
      [Symbols.REFRESH]: 'oz_refresh'
    };

    for (const [symbol, emojiName] of Object.entries(emojiMapping)) {
      const customEmoji = emojis.find(e => e.name === emojiName);
      if (customEmoji) {
        // Replace all instances of standard emoji with the custom guild emoji mention
        formattedText = formattedText.replaceAll(symbol, customEmoji.toString());
      }
    }
  }

  return formattedText;
}
