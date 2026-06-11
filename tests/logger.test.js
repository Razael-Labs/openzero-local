import { translateLog, resolveLogDetails } from '../src/utils/logger.js';
import { config } from '../src/config.js';

describe('Logger i18n Translation', () => {
  const originalLanguage = config.language;

  afterEach(() => {
    config.language = originalLanguage;
  });

  describe('translateLog Utility', () => {
    test('should translate English logs to Indonesian when language is id', () => {
      expect(translateLog('Login successful! Bot is active as Fox#1234', 'id')).toBe(
        'Login berhasil! Bot aktif sebagai Fox#1234'
      );

      expect(
        translateLog('Supabase credentials not configured. Falling back to local database.', 'id')
      ).toBe('Kredensial Supabase tidak dikonfigurasi. Mengalihkan ke database lokal.');

      expect(translateLog('Failed to ban user: Invalid Permissions', 'id')).toBe(
        'Gagal memblokir pengguna: Invalid Permissions'
      );
    });

    test('should translate Indonesian logs to English when language is en', () => {
      expect(translateLog('Login berhasil!', 'en')).toBe('Login successful!');

      expect(translateLog('Gagal melakukan purge: Error API', 'en')).toBe(
        'Failed to purge: Error API'
      );
    });

    test('should translate logger types correctly', () => {
      expect(translateLog('Client', 'id')).toBe('Klien');
      expect(translateLog('System', 'id')).toBe('Sistem');
      expect(translateLog('Moderation Error', 'id')).toBe('Error Moderasi');
      expect(translateLog('Sistem', 'en')).toBe('System');
    });
  });

  describe('resolveLogDetails Integration', () => {
    test('should dynamically translate messages and types based on config.language', () => {
      config.language = 'id';

      const { loggerType, loggerMessage } = resolveLogDetails(
        'info',
        '[Client] Login successful! Bot is active as Fox#1234'
      );

      expect(loggerType).toBe('Klien');
      expect(loggerMessage).toBe('Login berhasil! Bot aktif sebagai Fox#1234');
    });

    test('should fall back to original English text if config.language is en', () => {
      config.language = 'en';

      const { loggerType, loggerMessage } = resolveLogDetails(
        'info',
        '[Client] Login successful! Bot is active as Fox#1234'
      );

      expect(loggerType).toBe('Client');
      expect(loggerMessage).toBe('Login successful! Bot is active as Fox#1234');
    });
  });
});
