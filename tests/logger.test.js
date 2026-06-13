import { translateLog, resolveLogDetails } from '../src/utils/logger.js';
import { config } from '../src/config.js';

describe('Logger i18n Translation', () => {
  const originalLanguage = config.language;

  afterEach(() => {
    config.language = originalLanguage;
  });

  describe('translateLog Utility', () => {
    test('should keep English logs as English even if id is requested', () => {
      expect(translateLog('Login successful! Bot is active as Fox#1234', 'id')).toBe(
        'Login successful! Bot is active as Fox#1234'
      );
    });

    test('should translate Indonesian logs to English', () => {
      expect(translateLog('Login berhasil!')).toBe('Login successful!');

      expect(translateLog('Gagal melakukan purge: Error API')).toBe(
        'Failed to purge: Error API'
      );
    });

    test('should translate logger types correctly to English', () => {
      expect(translateLog('Sistem')).toBe('System');
    });
  });

  describe('resolveLogDetails Integration', () => {
    test('should keep messages and types in English even if config.language is id', () => {
      config.language = 'id';

      const { loggerType, loggerMessage } = resolveLogDetails(
        'info',
        '[Client] Login successful! Bot is active as Fox#1234'
      );

      expect(loggerType).toBe('Client');
      expect(loggerMessage).toBe('Login successful! Bot is active as Fox#1234');
    });

    test('should translate Indonesian messages/types to English', () => {
      config.language = 'id';

      const { loggerType, loggerMessage } = resolveLogDetails(
        'info',
        '[Sistem] Login berhasil!'
      );

      expect(loggerType).toBe('System');
      expect(loggerMessage).toBe('Login successful!');
    });
  });
});
