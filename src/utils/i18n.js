import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const localesDir = join(__dirname, '../locales');

const locales = {};

// Helper to load language files
export function loadLocales() {
  const files = ['id.json', 'en.json'];
  for (const file of files) {
    const filePath = join(localesDir, file);
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lang = file.split('.')[0];
        locales[lang] = JSON.parse(content);
      }
    } catch (err) {
      console.error(`[i18n] Gagal memuat file bahasa ${file}:`, err);
    }
  }
}

// Initial load
loadLocales();

/**
 * Translate a key according to user locale
 * @param {string} key - Translation key
 * @param {string} [locale='id'] - Discord interaction locale
 * @param {object} [replaceData={}] - Interpolation variables (e.g. {username: 'OZ'})
 * @returns {string} Translated string or the key itself
 */
export function t(key, locale = 'id', replaceData = {}) {
  let lang = 'id';
  if (locale) {
    const cleanLocale = locale.toLowerCase();
    if (cleanLocale.startsWith('en')) {
      lang = 'en';
    } else if (cleanLocale.startsWith('id')) {
      lang = 'id';
    }
  }

  const dict = locales[lang] || locales['id'] || {};
  let value = dict[key] || locales['id']?.[key] || key;

  // Interpolation
  for (const [k, v] of Object.entries(replaceData)) {
    value = value.replace(new RegExp(`{${k}}`, 'g'), String(v));
  }

  return value;
}
