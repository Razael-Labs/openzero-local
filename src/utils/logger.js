import winston from 'winston';
import chalk from 'chalk';
import * as Sentry from '@sentry/node';
import { Symbols } from './symbols.js';
import { config } from '../config.js';

const { combine, timestamp, printf } = winston.format;

// Translation mapping for logger types and messages to ensure consistency in English
function translateLog(message) {
  const idToEn = {
    'Login berhasil!': 'Login successful!',
    'Gagal melakukan purge:': 'Failed to purge:',
    'Menjalankan pencarian untuk:': 'Running search for:',
    'Gagal mengambil rekaman pesan:': 'Failed to fetch messages record:',
    'Berhasil mengeksekusi plugin': 'Successfully executed plugin'
  };

  const idToEnTypes = {
    Sistem: 'System'
  };

  let cleanMsg = String(message);

  // Translate Indonesian to English
  for (const [idKey, enVal] of Object.entries(idToEn)) {
    if (cleanMsg.includes(idKey)) {
      cleanMsg = cleanMsg.replace(idKey, enVal);
    }
  }
  if (idToEnTypes[cleanMsg]) {
    cleanMsg = idToEnTypes[cleanMsg];
  }

  return cleanMsg;
}

// Custom log helper to resolve type and logger_type from metadata or message contents
function resolveLogDetails(level, message, meta = {}) {
  let type = meta.type;
  let loggerType = meta.loggerType || meta.logger_type;
  let loggerMessage = message;

  if (message instanceof Error) {
    loggerMessage = message.message;
  } else if (typeof message !== 'string') {
    loggerMessage = String(message);
  }

  // Parse prefix like [Obtainium Watcher] ...
  if (typeof loggerMessage === 'string') {
    const match = loggerMessage.match(/^\[([^\]]+)\]\s*(.*)$/s);
    if (match) {
      if (!loggerType) {
        loggerType = match[1];
      }
      loggerMessage = match[2];
    }
  }

  if (!loggerType) {
    loggerType = 'System';
  }
  loggerType = translateLog(loggerType);

  loggerMessage = translateLog(loggerMessage);

  if (!type) {
    const lvl = String(level).toLowerCase().trim();
    if (lvl === 'error') {
      type = 'ERROR';
    } else if (lvl === 'warn' || lvl === 'warning') {
      type = 'WARN';
    } else {
      // Analyze loggerMessage to guess type
      const msgLower = loggerMessage.toLowerCase();
      if (
        msgLower.includes('berhasil') ||
        msgLower.includes('success') ||
        msgLower.includes('aktif') ||
        msgLower.includes('loaded') ||
        msgLower.includes('memuat') ||
        msgLower.includes('set')
      ) {
        type = 'SUCCSESS';
      } else if (
        msgLower.includes('selesai') ||
        msgLower.includes('done') ||
        msgLower.includes('cleanup') ||
        msgLower.includes('finish')
      ) {
        type = 'DONE';
      } else if (
        msgLower.includes('tidak ditemukan') ||
        msgLower.includes('not found') ||
        msgLower.includes('404')
      ) {
        type = '404';
      } else {
        type = 'UNKNOWN';
      }
    }
  }

  type = type.toUpperCase();
  if (type === 'SUCCESS') type = 'SUCCSESS';

  return { type, loggerType, loggerMessage };
}

// Helper to prune large, cyclic Discord objects before sending to Sentry
function pruneMetadata(meta) {
  const pruned = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value && typeof value === 'object') {
      const className = value.constructor?.name;
      if (
        key === 'interaction' ||
        className === 'ChatInputCommandInteraction' ||
        className === 'ButtonInteraction'
      ) {
        pruned.interaction = {
          commandName: value.commandName,
          customId: value.customId,
          userId: value.user?.id,
          username: value.user?.tag,
          guildId: value.guildId,
          channelId: value.channelId
        };
      } else if (key === 'client' || className === 'Client') {
        // Exclude huge Client instance
      } else if (key === 'guild' || className === 'Guild') {
        pruned.guild = { id: value.id, name: value.name };
      } else if (key === 'member' || className === 'GuildMember') {
        pruned.member = { id: value.id, displayName: value.displayName };
      } else if (key === 'user' || className === 'User') {
        pruned.user = { id: value.id, tag: value.tag };
      } else {
        try {
          const str = JSON.stringify(value);
          if (str && str.length < 500) {
            pruned[key] = JSON.parse(str);
          } else {
            pruned[key] = `[Object ${className || 'Unknown'} - Truncated]`;
          }
        } catch {
          pruned[key] = `[Object ${className || 'Unknown'} - Cyclic]`;
        }
      }
    } else {
      pruned[key] = value;
    }
  }
  return pruned;
}

// Custom Winston transport for Sentry
class SentryTransport extends winston.Transport {
  constructor(opts = {}) {
    super(opts);
    this.name = 'SentryTransport';
    this.level = opts.level || 'info';
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    if (config.sentryDsn) {
      const { level, message, stack, error, ...meta } = info;
      const { type, loggerType, loggerMessage } = resolveLogDetails(level, message, meta);
      const cleanMeta = pruneMetadata({ ...meta, type, loggerType });
      const formattedMessage = `[${type}] (${loggerType})\n${loggerMessage}`;

      if (level === 'error') {
        const err = error || stack || message;
        if (err instanceof Error) {
          Sentry.captureException(err, {
            extra: cleanMeta,
            tags: { type, logger_type: loggerType }
          });
        } else {
          Sentry.captureException(new Error(formattedMessage), {
            extra: cleanMeta,
            tags: { type, logger_type: loggerType }
          });
        }
      } else if (level === 'warn') {
        Sentry.captureMessage(formattedMessage, {
          level: 'warning',
          extra: cleanMeta,
          tags: { type, logger_type: loggerType }
        });
      } else {
        // Capture info and lower levels as Sentry Breadcrumbs instead of creating standalone Issues
        let sentryLevel = 'info';
        if (level === 'debug') sentryLevel = 'debug';

        Sentry.addBreadcrumb({
          category: 'log',
          message: formattedMessage,
          level: sentryLevel,
          data: cleanMeta
        });
      }
    }

    callback();
  }
}

// Format log kustom untuk console dengan format baru dan warna Chalk
const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const { type, loggerType, loggerMessage } = resolveLogDetails(level, message, meta);

  let typeColor = chalk.cyan;
  if (type === 'SUCCSESS' || type === 'DONE') {
    typeColor = chalk.green;
  } else if (type === 'WARN') {
    typeColor = chalk.yellow;
  } else if (type === 'ERROR' || type === '404') {
    typeColor = chalk.red;
  } else if (type === 'UNKNOWN') {
    typeColor = chalk.gray;
  }

  const grayTimestamp = chalk.gray(`[${timestamp}]`);
  let output = `\n${grayTimestamp} [${typeColor(type)}] (${chalk.blue(loggerType)})\n${loggerMessage}`;
  if (stack) {
    output += `\n${chalk.red(stack)}`;
  }
  return output;
});

// Konfigurasi logger
const logger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Menyimpan log error ke file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
    }),
    // Menyimpan seluruh log ke file
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
    }),
    // Menampilkan log di console dengan warna Chalk secara ringkas (hanya jam)
    new winston.transports.Console({
      format: combine(timestamp({ format: 'HH:mm:ss' }), consoleFormat)
    }),
    // Mengirimkan seluruh tingkat log ke Sentry jika diaktifkan
    new SentryTransport({
      level: 'info'
    })
  ]
});

export default logger;
export { translateLog, resolveLogDetails };
