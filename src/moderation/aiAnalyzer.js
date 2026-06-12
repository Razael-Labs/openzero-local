import { config } from '../config.js';
import logger from '../utils/logger.js';

const SYSTEM_PROMPT = `Kamu adalah sistem moderator Discord otomatis. Tugasmu adalah menganalisa pesan user.
PENTING:
- Jika pesan melanggar (mengandung kata kasar, toxic, SARA, harassment, pornografi, atau sejenisnya):
  Berikan respon peringatan ramah, santai, humoris, namun tetap menegur user dalam Bahasa Indonesia. Sebut @username. Maksimal 1-2 kalimat.
- Jika pesan aman, netral, bersahabat, atau hanya salah ketik/typo yang bukan kata kasar:
  Kamu WAJIB hanya membalas dengan satu kata: CLEAN. Jangan menulis penjelasan atau kalimat lain selain kata CLEAN.`;

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

/**
 * Generates an AI warning message for phishing/scam link violations.
 * @param {import('discord.js').Message} message
 * @returns {Promise<string>} Warning message or null if failed/unconfigured
 */
export async function generateScamWarningWithAI(message) {
  const apiKey = config.groq?.apiKey || process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GROQ_MODERATION_MODEL || 'llama-3.1-8b-instant';
  const systemPrompt = `Kamu adalah sistem moderator Discord otomatis. Tugasmu adalah memberikan peringatan ramah, santai, humoris, namun tetap menegur user dalam Bahasa Indonesia karena telah mengirimkan link phishing/scam berbahaya yang baru saja dihapus. Sebut @username. Maksimal 1-2 kalimat.`;

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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Pesan dari @${message.author.username}: "${message.content}"` }
        ],
        temperature: 0.8,
        max_tokens: 150
      })
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    logger.error('[AI Moderation] Error generating scam warning with AI:', error);
    return null;
  }
}

