import { config } from '../config.js';
import logger from '../utils/logger.js';

const SYSTEM_PROMPT = `Kamu adalah moderator Discord yang ramah, sopan, dan humoris namun tegas.
Analisa pesan berikut. Jika melanggar (seperti berkata kasar, toxic, SARA, harassment, pornografi):
Berikan respon peringatan yang bervariasi, natural, santai, dan bersahabat dalam Bahasa Indonesia.
Sebut @username dalam peringatan tersebut. Batasi maksimal 1 atau 2 kalimat.
Buat variasi respon yang tidak monoton (misalnya gunakan lelucon ringan, nasehat santai, atau sindiran lucu).
Jika tidak melanggar: balas hanya: CLEAN`;

/**
 * Analyzes a message content with Groq AI API.
 * @param {import('discord.js').Message} message
 * @returns {Promise<string>} Warning message or 'CLEAN'
 */
export async function analyzeWithAI(message) {
  const apiKey = config.groq?.apiKey || process.env.GROQ_API_KEY;
  if (!apiKey) {
    logger.warn('[AI Moderation] Groq API key is not configured. Skipping review.');
    return 'CLEAN';
  }

  const model = process.env.GROQ_MODERATION_MODEL || 'llama-3.1-8b-instant';

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Pesan dari @${message.author.username}: "${message.content}"` }
        ],
        temperature: 0.8, // Slightly higher temperature for more natural/diverse responses
        max_tokens: 150
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API returned status ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content;
    return result ? result.trim() : 'CLEAN';
  } catch (error) {
    logger.error('[AI Moderation] Error analyzing message with AI:', error);
    return 'CLEAN';
  }
}
