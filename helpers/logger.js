/**
 * Simple Logger
 * Buat nge-log aktivitas bot dengan emoji kece
 */

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, colorize, printf } = format;

// Custom format with kawaii emojis
const logFormat = printf(({ level, message, timestamp }) => {
  // Map log levels to cute emojis
  const emojis = {
    error: '💥',
    warn: '⚠️',
    info: '💫',
    debug: '🔍',
    silly: '🌈'
  };

  // Add color dan emoji
  const emoji = emojis[level] || '📝';
  return `${timestamp} ${emoji} [${level.toUpperCase()}]: ${message}`;
});

// Create Winston logger
const logger = createLogger({
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    colorize(),
    logFormat
  ),
  transports: [
    // Console transport
    new transports.Console(),
    
    // File transport for errors
    new transports.File({ 
      filename: 'errors.log', 
      level: 'error',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.json()
      )
    }),
    
    // File transport for all logs
    new transports.File({ 
      filename: 'combined.log',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.json()
      )
    })
  ]
});

module.exports = logger;