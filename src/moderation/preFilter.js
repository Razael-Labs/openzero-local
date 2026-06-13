import { getBadWordsLocally, getWhitelistLocally } from '../utils/database.js';

// Character variations for leetspeak, homoglyph unicode normalization, and common variations
const CHAR_VARIATIONS = {
  'a': '[a4@^а]',
  'b': '[b8Ь]',
  'c': '[c¢с]',
  'd': '[dԁ]',
  'e': '[e3е]',
  'f': '[f]',
  'g': '[g9]',
  'h': '[hһ]',
  'i': '[i1!|і]',
  'j': '[jј]',
  'k': '[kҟ]',
  'l': '[l1ӏ]',
  'm': '[mт]',
  'n': '[nո]',
  'o': '[o0о]',
  'p': '[pр]',
  'q': '[qԛ]',
  'r': '[rг]',
  's': '[s5$ѕ]',
  't': '[t7+т]',
  'u': '[uυ]',
  'v': '[vѵ]',
  'w': '[wԝ]',
  'x': '[xх]',
  'y': '[yу]',
  'z': '[z2]'
};

// Static base patterns
const BASE_PATTERNS = [
  /\bfuck\b/i,
  /\bf+[\s\W_*@-]*[u*a@0]+[\s\W_*@-]*c+[\s\W_*@-]*k+/i,
  /\bsh[i1*]t\b/i,
  /\bb[i*]tch\b/i,
  /\ba+[\s\W_*@-]*n+[\s\W_*@-]*j+[\s\W_*@-]*i+[\s\W_*@-]*n+[\s\W_*@-]*g+\b/i,
  /\bb+[\s\W_*@-]*a+[\s\W_*@-]*n+[\s\W_*@-]*g+[\s\W_*@-]*s+[\s\W_*@-]*a+[\s\W_*@-]*t+\b/i,
  /\bk+[\s\W_*@-]*o+[\s\W_*@-]*n+[\s\W_*@-]*t+[\s\W_*@-]*o+[\s\W_*@-]*l+\b/i,
  /\bm+[\s\W_*@-]*e+[\s\W_*@-]*m+[\s\W_*@-]*e+[\s\W_*@-]*k+\b/i,
  /\bg+[\s\W_*@-]*o+[\s\W_*@-]*b+[\s\W_*@-]*l+[\s\W_*@-]*o+[\s\W_*@-]*k+\b/i,
  /\bt+[\s\W_*@-]*o+[\s\W_*@-]*l+[\s\W_*@-]*o+[\s\W_*@-]*l+\b/i,
  /\bb+[\s\W_*@-]*e+[\s\W_*@-]*g+[\s\W_*@-]*o+\b/i,
  /\ba+[\s\W_*@-]*s+[\s\W_*@-]*u+\b/i,
  /\bb+[\s\W_*@-]*a+[\s\W_*@-]*b+[\s\W_*@-]*i+\b/i,
  /\bl+[\s\W_*@-]*o+[\s\W_*@-]*n+[\s\W_*@-]*t+[\s\W_*@-]*[e1*]+\b/i
];

/**
 * Builds a robust regex pattern matching spaced/repeated/symbol/leetspeak/homoglyph variations of a raw word.
 * @param {string} word Raw bad word (e.g. "pantek")
 * @returns {RegExp} Robust RegExp
 */
export function buildRobustRegex(word) {
  const cleanWord = word.trim().toLowerCase();
  const chars = cleanWord.split('');
  const parts = chars.map((char) => {
    const variation = CHAR_VARIATIONS[char];
    if (variation) {
      return `${variation}+`;
    }
    const escaped = char.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    return `${escaped}+`;
  });
  // Separator allowing spaces, symbols, punctuation, etc.
  const separator = '[\\s\\W_*@-]*';
  const pattern = parts.join(separator);
  return new RegExp(`\\b${pattern}\\b`, 'i');
}

// Memory cache for custom bad word regex compilation
let cachedBadWordsString = '';
let compiledCustomPatterns = [];

/**
 * Get active trigger patterns dynamically.
 * Synchronizes with database updates immediately without requiring a restart.
 * @returns {RegExp[]}
 */
export function getTriggerPatterns() {
  const customWords = getBadWordsLocally();
  const currentWordsString = JSON.stringify(customWords);

  if (currentWordsString !== cachedBadWordsString) {
    cachedBadWordsString = currentWordsString;
    compiledCustomPatterns = customWords.map((entry) => {
      const rawWord = typeof entry === 'object' ? entry.word : entry;
      return buildRobustRegex(rawWord);
    });
  }

  return [...BASE_PATTERNS, ...compiledCustomPatterns];
}

/**
 * Legacy support for testing or commands that reference TRIGGER_PATTERNS directly.
 */
export function reloadPatterns() {
  getTriggerPatterns();
}

/**
 * Checks if the content matches any trigger patterns requiring AI review, excluding whitelisted contexts.
 * @param {string} content
 * @returns {boolean}
 */
export function needsAIReview(content) {
  if (!content) return false;

  const whitelist = getWhitelistLocally();
  const lowerContent = content.toLowerCase();
  const activePatterns = getTriggerPatterns();

  for (const pattern of activePatterns) {
    const match = content.match(pattern);
    if (match) {
      const matchedString = match[0].toLowerCase();
      // Verify if the matched phrase is part of any whitelisted expression present in the message
      const isWhitelisted = whitelist.some((whiteWord) => {
        return whiteWord.includes(matchedString) && lowerContent.includes(whiteWord);
      });
      if (!isWhitelisted) {
        return true;
      }
    }
  }
  return false;
}
