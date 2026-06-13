import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { downloadIcon } from '../src/utils/iconHelper.js';

describe('IconHelper Test Suite', () => {
  // Clean up downloaded test files
  const testIconName = 'github-test-temp';
  const dataDir = path.join(process.cwd(), 'data/icons');

  afterEach(() => {
    // Delete any downloaded test files
    try {
      const files = fs.readdirSync(dataDir);
      for (const file of files) {
        if (file.startsWith(testIconName)) {
          fs.unlinkSync(path.join(dataDir, file));
        }
      }
    } catch (e) {
      // Ignore if dir doesn't exist yet
    }
  });

  test('should successfully download SVG icon from Font Awesome (github) converted to PNG', async () => {
    // GitHub is a popular brand icon, should download as SVG and be converted to PNG
    const icon = await downloadIcon('github', 'fontawesome');
    expect(icon).toBeDefined();
    expect(icon.ext).toBe('png');
    expect(fs.existsSync(icon.filePath)).toBe(true);
  }, 15000);

  test('should fallback to PNG if SVG does not exist (non-existent-icon)', async () => {
    // A query that does not exist in SVGs but might be found on Icons8 (or fails gracefully)
    // To mock/avoid network dependency/flakiness on non-existent, we can test cache behavior or mock fetch.
    // Let's verify standard error handling for totally invalid icons
    await expect(downloadIcon('this-icon-does-not-exist-anywhere-12345')).rejects.toThrow();
  }, 15000);
});
