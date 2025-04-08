/**
 * Command Handler
 * Menangani command bot seperti /start
 */

const { config } = require('../config/config');
const logger = require('../helpers/logger');
const { getWibuMessage } = require('../ui/messages');
const { mainMenu, getJoinChannelButtons } = require('../ui/buttons');
const { checkChannelMembership } = require('../middleware/channelCheck');

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
 * Setup command handlers
 */
function setupCommandHandlers(bot, userStates) {
  // Handle /start command
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    logger.info(`User ${userId} started the bot`);
    
    // Default owner jika belum ada
    if (config.telegram.owners.length === 0) {
      config.telegram.owners.push(String(userId));
      require('../config/config').saveConfig(config);
      
      logger.info(`Set ${userId} as first owner`);
      
      await bot.sendMessage(
        chatId,
        "🔥 *Selamat! Kamu adalah owner pertama bot ini sugoi ne~*\n\nSemua fitur sudah terbuka! Kamu bisa menggunakan semua command wibu ini sekarang~! OwO",
        { parse_mode: 'Markdown' }
      );
    }
    
    // Cek akses
    if (!hasAccess(userId.toString())) {
      logger.info(`Access denied for user ${userId}`);
      
      await bot.sendMessage(
        chatId,
        getWibuMessage('accessDenied'),
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    // Verifikasi channel membership
    const isMember = await checkChannelMembership(bot, userId, config.channel.required);
    
    if (!isMember) {
      logger.info(`User ${userId} not a member of required channel ${config.channel.required}`);
      
      await bot.sendMessage(
        chatId,
        getWibuMessage('channelRequired', { channel: config.channel.required }),
        {
          parse_mode: 'Markdown',
          reply_markup: getJoinChannelButtons(config.channel.required)
        }
      );
      return;
    }
    
    // Send welcome message with main menu
    await bot.sendMessage(
      chatId,
      getWibuMessage('welcome'),
      {
        parse_mode: 'Markdown',
        reply_markup: mainMenu
      }
    );
  });
  
  // Handle /help command
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Cek akses
    if (!hasAccess(userId.toString())) {
      return;
    }
    
    // Verifikasi channel membership
    const isMember = await checkChannelMembership(bot, userId, config.channel.required);
    
    if (!isMember) {
      await bot.sendMessage(
        chatId,
        getWibuMessage('channelRequired', { channel: config.channel.required }),
        {
          parse_mode: 'Markdown',
          reply_markup: getJoinChannelButtons(config.channel.required)
        }
      );
      return;
    }
    
    // Send help message
    await bot.sendMessage(
      chatId,
      getWibuMessage('helpMessage'),
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Kembali ke Menu Utama', callback_data: 'main_menu' }]
          ]
        }
      }
    );
  });
  
  // Handle /status command
  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Cek akses
    if (!hasAccess(userId.toString())) {
      return;
    }
    
    // Verifikasi channel membership
    const isMember = await checkChannelMembership(bot, userId, config.channel.required);
    
    if (!isMember) {
      await bot.sendMessage(
        chatId,
        getWibuMessage('channelRequired', { channel: config.channel.required }),
        {
          parse_mode: 'Markdown',
          reply_markup: getJoinChannelButtons(config.channel.required)
        }
      );
      return;
    }
    
    // Cek status WhatsApp
    if (!userStates[userId] || !userStates[userId].whatsapp) {
      await bot.sendMessage(
        chatId,
        getWibuMessage('statusNotLoggedIn'),
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔑 Login WhatsApp', callback_data: 'login' }],
              [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
            ]
          }
        }
      );
      return;
    }
    
    const isConnected = userStates[userId].whatsapp.isConnected;
    
    if (isConnected) {
      await bot.sendMessage(
        chatId,
        getWibuMessage('statusConnected'),
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🌟 Buat Grup', callback_data: 'create_group' }],
              [{ text: '🚪 Logout', callback_data: 'logout' }],
              [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
            ]
          }
        }
      );
    } else {
      await bot.sendMessage(
        chatId,
        getWibuMessage('statusDisconnected'),
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔑 Login Ulang', callback_data: 'login' }],
              [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
            ]
          }
        }
      );
    }
  });
  
  // Handle /logout command
  bot.onText(/\/logout/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Cek akses
    if (!hasAccess(userId.toString())) {
      return;
    }
    
    // Verifikasi channel membership
    const isMember = await checkChannelMembership(bot, userId, config.channel.required);
    
    if (!isMember) {
      await bot.sendMessage(
        chatId,
        getWibuMessage('channelRequired', { channel: config.channel.required }),
        {
          parse_mode: 'Markdown',
          reply_markup: getJoinChannelButtons(config.channel.required)
        }
      );
      return;
    }
    
    // Proses logout
    if (!userStates[userId] || !userStates[userId].whatsapp || !userStates[userId].whatsapp.socket) {
      await bot.sendMessage(
        chatId,
        getWibuMessage('statusNotLoggedIn'),
        {
          parse_mode: 'Markdown',
          reply_markup: mainMenu
        }
      );
      return;
    }
    
    try {
      const { logoutWhatsApp } = require('../core/whatsappClient');
      await logoutWhatsApp(userId);
      
      await bot.sendMessage(
        chatId,
        getWibuMessage('logoutSuccess'),
        {
          parse_mode: 'Markdown',
          reply_markup: mainMenu
        }
      );
    } catch (err) {
      logger.error(`Error during logout for ${userId}:`, err);
      
      await bot.sendMessage(
        chatId,
        getWibuMessage('logoutError', { error: err.message }),
        {
          parse_mode: 'Markdown',
          reply_markup: mainMenu
        }
      );
    }
  });
}

module.exports = {
  setupCommandHandlers
};