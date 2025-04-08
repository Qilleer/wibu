/**
 * Core Telegram Bot
 * Menggunakan node-telegram-bot-api
 */

const TelegramBot = require('node-telegram-bot-api');
const { config } = require('../config/config');
const logger = require('../helpers/logger');
const { setupCommandHandlers } = require('../handlers/commandHandler');
const { setupCallbackHandlers } = require('../handlers/callbackHandler');
const { setupMessageHandlers } = require('../handlers/messageHandler');
const { checkChannelMembership } = require('../middleware/channelCheck');
const { restoreWhatsAppSessions } = require('./whatsappClient');

// Bot instance
let bot = null;

// User sessions & states
const userStates = {};

/**
 * Inisialisasi & start Telegram bot
 */
async function startTelegramBot() {
  try {
    // Create bot instance
    bot = new TelegramBot(config.telegram.token, {
      polling: true
    });
    
    logger.info('Bot created with polling mode');
    
    // Setup error handling
    bot.on('polling_error', (error) => {
      logger.error('Polling error:', error);
    });
    
    bot.on('error', (error) => {
      logger.error('Bot error:', error);
    });
    
    // Setup middleware for channel membership check
    setupMiddleware();
    
    // Setup command, callback, and message handlers
    setupCommandHandlers(bot, userStates);
    setupCallbackHandlers(bot, userStates);
    setupMessageHandlers(bot, userStates);
    
    // Restore any existing WhatsApp sessions
    await restoreWhatsAppSessions(bot, userStates);
    
    return bot;
  } catch (error) {
    logger.error('Failed to start Telegram bot:', error);
    throw error;
  }
}

/**
 * Setup middleware untuk cek membership channel
 */
function setupMiddleware() {
  // Intercept semua pesan dan commands
  bot.on('message', async (msg) => {
    // Skip if not from a private chat
    if (msg.chat.type !== 'private') return;
    
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Cek apakah punya akses
    if (!hasAccess(userId.toString())) {
      await bot.sendMessage(
        chatId,
        "⛔ *Gomennasai senpai!* Kamu belum diizinkan menggunakan bot super kawaii ini! (╥﹏╥)",
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    // Cek membership channel khusus untuk command dan pesan biasa
    if (msg.text && (msg.text.startsWith('/') || !msg.text.startsWith('/'))) {
      const isMember = await checkChannelMembership(bot, userId, config.channel.required);
      
      if (!isMember) {
        const channelName = config.channel.required;
        await bot.sendMessage(
          chatId,
          `⚠️ *Ara ara~* Kamu harus join channel ${channelName} dulu sebelum menggunakan bot ini!\n\nKlik link ini untuk join: https://t.me/${channelName.replace('@', '')}\n\nSetelah join, coba lagi ya! OwO`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: `✨ Join ${channelName}`, url: `https://t.me/${channelName.replace('@', '')}` }],
                [{ text: '🔄 Sudah Join? Refresh', callback_data: 'check_membership' }]
              ]
            }
          }
        );
        return;
      }
    }
  });
}

/**
 * Cek apakah user memiliki akses
 */
function hasAccess(userId) {
  return (
    config.telegram.owners.includes(userId) || 
    config.telegram.allowedUsers.includes(userId)
  );
}

/**
 * Expose bot instance & user states
 */
module.exports = {
  startTelegramBot,
  hasAccess,
  getUserStates: () => userStates,
  getBot: () => bot
};