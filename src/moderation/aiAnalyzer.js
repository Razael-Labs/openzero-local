import { config } from '../config.js';
import logger from '../utils/logger.js';

const SYSTEM_PROMPT = `Kamu adalah moderator Discord.
Analisa pesan berikut. Jika melanggar (kata kasar, toxic, harassment):
balas peringatan ramah Bahasa Indonesia, sebut @username, max 1 kalimat.
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

  // Use llama-3.1-8b-instant as default for moderation, but allow override
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
        temperature: 0.5,
        max_tokens: 100
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
