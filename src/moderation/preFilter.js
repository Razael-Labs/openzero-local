import { getBadWordsLocally } from '../utils/database.js';

// Static base patterns
const BASE_PATTERNS = [
  /\bfuck\b/i,
  /\bf+[\s\W_*@]*[u*a@0]+[\s\W_*@]*c+[\s\W_*@]*k+/i,
  /\bsh[i1*]t\b/i,
  /\bb[i*]tch\b/i,
  /\ba+[\s\W_*@]*n+[\s\W_*@]*j+[\s\W_*@]*i+[\s\W_*@]*n+[\s\W_*@]*g+\b/i,
  /\bb+[\s\W_*@]*a+[\s\W_*@]*n+[\s\W_*@]*g+[\s\W_*@]*s+[\s\W_*@]*a+[\s\W_*@]*t+\b/i,
  /\bk+[\s\W_*@]*o+[\s\W_*@]*n+[\s\W_*@]*t+[\s\W_*@]*o+[\s\W_*@]*l+\b/i,
  /\bm+[\s\W_*@]*e+[\s\W_*@]*m+[\s\W_*@]*e+[\s\W_*@]*k+\b/i,
  /\bg+[\s\W_*@]*o+[\s\W_*@]*b+[\s\W_*@]*l+[\s\W_*@]*o+[\s\W_*@]*k+\b/i,
  /\bt+[\s\W_*@]*o+[\s\W_*@]*l+[\s\W_*@]*o+[\s\W_*@]*l+\b/i,
  /\bb+[\s\W_*@]*e+[\s\W_*@]*g+[\s\W_*@]*o+\b/i,
  /\ba+[\s\W_*@]*s+[\s\W_*@]*u+\b/i,
  /\bb+[\s\W_*@]*a+[\s\W_*@]*b+[\s\W_*@]*i+\b/i,
  /\bl+[\s\W_*@]*o+[\s\W_*@]*n+[\s\W_*@]*t+[\s\W_*@]*[e1*]+\b/i
];

export let TRIGGER_PATTERNS = [...BASE_PATTERNS];

/**
 * Builds a robust regex pattern matching spaced/repeated/symbol variations of a raw word.
 * @param {string} word Raw bad word (e.g. "pantek")
 * @returns {RegExp} Robust RegExp
 */
export function buildRobustRegex(word) {
  const cleanWord = word.trim().toLowerCase().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const chars = cleanWord.split('');
  const parts = chars.map((char) => {
    return /[a-z0-9]/i.test(char) ? `${char}+` : char;
  });
  const pattern = parts.join('[\\s\\W_*@]*');
  return new RegExp(`\\b${pattern}\\b`, 'i');
}

/**
 * Reloads all custom bad words from the database and updates active patterns.
 */
export function reloadPatterns() {
  const customWords = getBadWordsLocally();
  const customPatterns = customWords.map((word) => buildRobustRegex(word));
  TRIGGER_PATTERNS = [...BASE_PATTERNS, ...customPatterns];
}

// Perform initial reload
reloadPatterns();

/**
 * Checks if the content matches any trigger patterns requiring AI review.
 * @param {string} content
 * @returns {boolean}
 */
export function needsAIReview(content) {
  if (!content) return false;
  return TRIGGER_PATTERNS.some((p) => p.test(content));
}
