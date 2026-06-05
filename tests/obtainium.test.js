import fs from 'fs/promises';
import path from 'path';
import { convertObtainiumFile } from '../src/utils/obtainiumConverter.js';

const TEMP_DIR = path.resolve('./tests/temp_obtainium');
const MOCK_EXPORT = path.join(TEMP_DIR, 'obtainium-export-mock.json');
const OUTPUT_JSON = path.join(TEMP_DIR, 'obtainium_repos_data.json');
const OUTPUT_YAML = path.join(TEMP_DIR, 'obtainium_repos_data.yaml');

const mockData = {
  apps: [
    {
      id: 'dev.imranr.obtainium',
      name: 'Obtainium',
      url: 'https://github.com/ImranR98/Obtainium',
      author: 'ImranR98',
      latestVersion: 'v1.4.3',
      installedVersion: 'v1.4.3'
    }
  ]
};

describe('Obtainium Converter Test Suite', () => {
  beforeAll(async () => {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await fs.writeFile(MOCK_EXPORT, JSON.stringify(mockData, null, 2), 'utf-8');
  });

  afterAll(async () => {
    try {
      await fs.rm(TEMP_DIR, { recursive: true, force: true });
    } catch (err) {
      // Ignore errors during cleanup
    }
  });

  test('should successfully convert raw export to JSON and YAML formats', async () => {
    // Run conversion with enrich: false to avoid fetching from real Github API during tests
    const stats = await convertObtainiumFile(MOCK_EXPORT, OUTPUT_JSON, OUTPUT_YAML, { enrich: false });

    expect(stats.total).toBe(1);
    expect(stats.reused).toBe(0);

    // Verify JSON file exists and has correct data
    const jsonExists = await fs.access(OUTPUT_JSON).then(() => true).catch(() => false);
    expect(jsonExists).toBe(true);

    const jsonRaw = await fs.readFile(OUTPUT_JSON, 'utf-8');
    const jsonData = JSON.parse(jsonRaw);
    expect(jsonData[0].id).toBe('dev.imranr.obtainium');
    expect(jsonData[0].name).toBe('Obtainium');

    // Verify YAML file exists
    const yamlExists = await fs.access(OUTPUT_YAML).then(() => true).catch(() => false);
    expect(yamlExists).toBe(true);

    const yamlRaw = await fs.readFile(OUTPUT_YAML, 'utf-8');
    expect(yamlRaw).toContain('dev.imranr.obtainium');
    expect(yamlRaw).toContain('name: "Obtainium"');
  });
});
