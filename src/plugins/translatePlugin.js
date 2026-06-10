import { translate } from '@vitalets/google-translate-api';
import { V2Embed } from '../utils/v2Embed.js';

export const translatePlugin = {
  name: 'translate',
  description: 'Translate text from one language to another (default translates to English).',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'The text content to translate.' },
      to: { type: 'string', description: 'The target language code (e.g., "en", "id", "ja"). Default is "en".' }
    },
    required: ['text']
  },

  async execute(args, context) {
    const { text, to = 'en' } = args;

    if (!text || text.trim() === '') {
      return { success: false, error: 'Text cannot be empty.' };
    }

    try {
      const res = await translate(text, { to });
      const translatedText = res.text;
      const detectedLang = res.raw?.src?.toUpperCase() || 'UNKNOWN';

      const embed = new V2Embed()
        .setTitle('Translate 🌐')
        .setDescription(
          `**Original Text (${detectedLang}):**\n` +
            `> ${text}\n\n` +
            `**Translation (${to.toUpperCase()}):**\n` +
            `> ${translatedText}`
        )
        .setColor(0x00aeef)
        .build();

      return {
        success: true,
        data: { originalText: text, translatedText, from: detectedLang, to },
        responseText: `Berikut adalah hasil terjemahan dari ${detectedLang} ke ${to.toUpperCase()}:\n> ${translatedText}`,
        embeds: [embed]
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
