import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

// Mock logger to avoid console spam during tests
jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock config for tests
jest.unstable_mockModule('../src/config.js', () => ({
  config: {
    database: {
      dir: path.resolve(process.cwd(), 'data-test'),
      path: path.resolve(process.cwd(), 'data-test/database-test.json')
    }
  }
}));

const {
  initScamFilter,
  containsScamLink,
  extractDomains,
  getScamDomainsCount,
  clearScamCache
} = await import('../src/moderation/scamFilter.js');

describe('Anti-Phishing/Scam Link Filter', () => {
  const testDataDir = path.resolve(process.cwd(), 'data-test');
  const fallbackPath = path.join(testDataDir, 'scam_links.json');

  beforeEach(() => {
    jest.restoreAllMocks();
    clearScamCache();

    // Clean up test directories
    if (fs.existsSync(fallbackPath)) {
      fs.unlinkSync(fallbackPath);
    }
    if (fs.existsSync(testDataDir)) {
      fs.rmdirSync(testDataDir);
    }
  });

  afterAll(() => {
    // Clean up at the very end
    if (fs.existsSync(fallbackPath)) {
      fs.unlinkSync(fallbackPath);
    }
    if (fs.existsSync(testDataDir)) {
      fs.rmdirSync(testDataDir);
    }
  });

  describe('initScamFilter', () => {
    it('should successfully fetch live list and save fallback', async () => {
      const mockList = ['scam-site-one.com', 'scam-site-two.xyz'];
      const mockResponse = {
        ok: true,
        json: async () => mockList
      };
      
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

      await initScamFilter();

      expect(fetchSpy).toHaveBeenCalled();
      expect(getScamDomainsCount().public).toBe(2);
      expect(fs.existsSync(fallbackPath)).toBe(true);

      const savedData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
      expect(savedData).toEqual(mockList);
    });

    it('should fallback to local file if fetch fails', async () => {
      // Create local fallback file manually
      const mockList = ['local-scam.com'];
      if (!fs.existsSync(testDataDir)) {
        fs.mkdirSync(testDataDir, { recursive: true });
      }
      fs.writeFileSync(fallbackPath, JSON.stringify(mockList), 'utf8');

      // Mock fetch rejection
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

      await initScamFilter();

      expect(getScamDomainsCount().public).toBe(1);
      expect(containsScamLink('check out http://local-scam.com/gift')).toBe(true);
    });
  });

  describe('extractDomains', () => {
    it('should extract domains correctly from various strings', () => {
      expect(extractDomains('visit google.com now')).toEqual(['google.com']);
      expect(extractDomains('https://sub.domain.co.uk/path?query=123')).toEqual(['sub.domain.co.uk']);
      expect(extractDomains('no links here')).toEqual([]);
      expect(extractDomains('http://a.b.c.d.com:8080/path')).toEqual(['a.b.c.d.com']);
    });
  });

  describe('containsScamLink', () => {
    beforeEach(async () => {
      const mockList = ['scam.com', 'sub.phishing.net'];
      const mockResponse = {
        ok: true,
        json: async () => mockList
      };
      jest.spyOn(global, 'fetch').mockResolvedValue(mockResponse);
      await initScamFilter();
    });

    it('should detect exact scam links', () => {
      expect(containsScamLink('visit scam.com')).toBe(true);
      expect(containsScamLink('visit http://scam.com/')).toBe(true);
      expect(containsScamLink('visit https://sub.phishing.net')).toBe(true);
    });

    it('should detect subdomain variants of a blacklisted parent domain', () => {
      // scam.com is blacklisted, so sub.scam.com should be blocked
      expect(containsScamLink('visit http://sub.scam.com')).toBe(true);
      expect(containsScamLink('visit http://a.b.c.scam.com/path')).toBe(true);
    });

    it('should check specific blacklisted subdomains', () => {
      // sub.phishing.net is blacklisted
      expect(containsScamLink('visit sub.phishing.net')).toBe(true);
    });

    it('should ignore safe domains', () => {
      expect(containsScamLink('visit google.com')).toBe(false);
      expect(containsScamLink('visit phishing.net')).toBe(false); // only sub.phishing.net was blacklisted
    });
  });
});
