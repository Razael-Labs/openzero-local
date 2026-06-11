const userCooldowns = new Map();
const COOLDOWN_MS = 10000; // 10 seconds

/**
 * Checks if a user is currently on AI moderation cooldown.
 * @param {string} userId
 * @returns {boolean}
 */
export function isOnCooldown(userId) {
  const last = userCooldowns.get(userId);
  return !!(last && Date.now() - last < COOLDOWN_MS);
}

/**
 * Sets the moderation cooldown for a user.
 * @param {string} userId
 */
export function setCooldown(userId) {
  userCooldowns.set(userId, Date.now());
}
