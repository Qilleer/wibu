/**
 * Utility Functions
 * Fungsi-fungsi tambahan untuk bot
 */

const logger = require('./logger');
const { escapeMarkdown } = require('./validator');

/**
 * Kirim pesan dengan fallback ke plain text jika markdown error
 */
async function sendSafeMessage(bot, chatId, message, options = {}) {
  try {
    // Coba kirim dengan markdown
    return await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      ...options
    });
  } catch (err) {
    logger.error(`Error sending message with Markdown: ${err.message}`);
    
    // Jika error parsing entities, coba dengan plain text
    if (err.message && err.message.includes('entities')) {
      logger.info('Falling back to plain text message');
      
      // Hapus format markdown (bold, italic, etc)
      const plainMessage = message
        .replace(/\*/g, '')
        .replace(/_/g, '')
        .replace(/`/g, '')
        
      // Hapus parse_mode dari options
      const plainOptions = { ...options };
      delete plainOptions.parse_mode;
      
      try {
        return await bot.sendMessage(chatId, plainMessage, plainOptions);
      } catch (plainErr) {
        logger.error(`Even plain text message failed: ${plainErr.message}`);
        throw plainErr;
      }
    }
    
    throw err;
  }
}

/**
 * Edit pesan dengan fallback ke plain text jika markdown error
 */
async function editSafeMessage(bot, chatId, messageId, message, options = {}) {
  try {
    // Coba edit dengan markdown
    return await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      ...options
    });
  } catch (err) {
    logger.error(`Error editing message with Markdown: ${err.message}`);
    
    // Jika error parsing entities, coba dengan plain text
    if (err.message && err.message.includes('entities')) {
      logger.info('Falling back to plain text message');
      
      // Hapus format markdown (bold, italic, etc)
      const plainMessage = message
        .replace(/\*/g, '')
        .replace(/_/g, '')
        .replace(/`/g, '');
      
      // Hapus parse_mode dari options
      const plainOptions = { ...options };
      delete plainOptions.parse_mode;
      
      try {
        return await bot.editMessageText(plainMessage, {
          chat_id: chatId,
          message_id: messageId,
          ...plainOptions
        });
      } catch (plainErr) {
        logger.error(`Even plain text edit failed: ${plainErr.message}`);
        throw plainErr;
      }
    }
    
    throw err;
  }
}

/**
 * Sleep function untuk delay (Promise-based setTimeout)
 */
function sleepAsync(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Buat random ID
 */
function generateRandomId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return id;
}

module.exports = {
  sendSafeMessage,
  editSafeMessage,
  sleepAsync,
  generateRandomId
};