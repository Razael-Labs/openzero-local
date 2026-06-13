import fs from 'fs/promises';
import path from 'path';

const HTML_FILE =
  '/data/data/com.termux/files/home/.gemini/antigravity-cli/brain/08a7fe70-f772-4b95-96af-28d587881e80/.system_generated/steps/243/content.md';
const OUTPUT_FILE = './src/utils/scrapedSymbols.js';

function toConstantName(title) {
  // Convert title like "Black Star" or "Star of David" to "BLACK_STAR", "STAR_OF_DAVID"
  return title
    .toUpperCase()
    .replace(/[^A-Z0-9\s-_]/g, '') // remove special chars
    .trim()
    .replace(/[\s-]+/g, '_'); // replace spaces/hyphens with underscore
}

async function scrape() {
  try {
    console.log('Reading html file...');
    const html = await fs.readFile(HTML_FILE, 'utf-8');

    // Regex to match <span class="cs" title="TITLE" data-clipboard-text="SYMBOL">
    const regex = /class="cs"\s+title="([^"]+)"\s+data-clipboard-text="([^"]+)"/g;

    let match;
    const symbolsMap = new Map();

    while ((match = regex.exec(html)) !== null) {
      const title = match[1].trim();
      const symbol = match[2].trim();
      if (title && symbol) {
        const constName = toConstantName(title);
        // Avoid empty names or digits at start
        if (constName && /^[A-Z_]/.test(constName)) {
          symbolsMap.set(constName, symbol);
        }
      }
    }

    console.log(`Extracted ${symbolsMap.size} unique symbols.`);

    // Build class content
    let classContent = `/**\n * Auto-generated symbols class from coolsymbols.com\n */\nexport class CoolSymbols {\n`;

    for (const [name, sym] of symbolsMap.entries()) {
      // Escape backslashes and quotes
      const escapedSym = sym.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      classContent += `  static get ${name}() { return "${escapedSym}"; }\n`;
    }
    classContent += '}\n';

    await fs.writeFile(OUTPUT_FILE, classContent, 'utf-8');
    console.log(`Successfully generated: ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('Error during scraping symbols:', error);
  }
}

scrape();
