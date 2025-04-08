/**
 * Callback Handler
 * Menangani callback query dari inline buttons
 */

const { config } = require('../config/config');
const logger = require('../helpers/logger');
const { getWibuMessage } = require('../ui/messages');
const { mainMenu, cancelLogin, cancelGroupCreation, connectedStatusButtons, disconnectedStatusButtons } = require('../ui/buttons');
const { checkChannelMembership } = require('../middleware/channelCheck');
const { createWhatsAppConnection, generatePairingCode, logoutWhatsApp, checkCooldown, leaveAllGroups, getAllUserGroups } = require('../core/whatsappClient');
const { validatePhoneNumber } = require('../helpers/validator');

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
 * Setup callback handlers
 */
function setupCallbackHandlers(bot, userStates) {
  bot.on('callback_query', async (callbackQuery) => {
    try {
      const userId = callbackQuery.from.id;
      const chatId = callbackQuery.message.chat.id;
      const messageId = callbackQuery.message.message_id;
      const data = callbackQuery.data;
      
      logger.info(`Callback received: ${data} from user ${userId}`);
      
      // Handle check_membership separately
      if (data === 'check_membership') {
        await handleCheckMembership(bot, callbackQuery, userStates);
        return;
      }
      
      // Verifikasi channel membership untuk semua callback lainnya
      const isMember = await checkChannelMembership(bot, userId, config.channel.required);
      
      if (!isMember) {
        await bot.answerCallbackQuery(
          callbackQuery.id,
          {
            text: `⚠️ Kamu harus join channel ${config.channel.required} dulu!`,
            show_alert: true
          }
        );
        return;
      }
      
      // Process different callbacks
      switch (data) {
        case 'main_menu':
          await handleMainMenu(bot, callbackQuery, userStates);
          break;
          
        case 'login':
          await handleLogin(bot, callbackQuery, userStates);
          break;
          
        case 'cancel_login':
          await handleCancelLogin(bot, callbackQuery, userStates);
          break;
          
        case 'status':
          await handleStatus(bot, callbackQuery, userStates);
          break;
          
        case 'logout':
          await handleLogout(bot, callbackQuery, userStates);
          break;
          
        case 'create_group':
          await handleCreateGroup(bot, callbackQuery, userStates);
          break;
          
        case 'cancel_group':
          await handleCancelGroup(bot, callbackQuery, userStates);
          break;
          
        case 'leave_all_groups':
          await handleLeaveAllGroups(bot, callbackQuery, userStates);
          break;
          
        case 'confirm_leave_all_groups':
          await handleConfirmLeaveAllGroups(bot, callbackQuery, userStates);
          break;
          
        case 'cancel_leave_all_groups':
          await handleCancelLeaveAllGroups(bot, callbackQuery, userStates);
          break;
          
        case 'help':
          await handleHelp(bot, callbackQuery, userStates);
          break;
          
        default:
          await bot.answerCallbackQuery(callbackQuery.id, { text: 'Command tidak dikenal' });
      }
    } catch (err) {
      logger.error('Error handling callback:', err);
      
      try {
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: '❌ Terjadi error! Coba lagi ya~',
          show_alert: true
        });
      } catch (answerErr) {
        logger.error('Error answering callback query:', answerErr);
      }
    }
  });
}

/**
 * Handle check membership callback
 */
async function handleCheckMembership(bot, callbackQuery, userStates) {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  
  try {
    // Check membership
    const isMember = await checkChannelMembership(bot, userId, config.channel.required);
    
    if (isMember) {
      // User is a member, show welcome message
      await bot.editMessageText(
        getWibuMessage('welcome'),
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: mainMenu
        }
      );
      
      await bot.answerCallbackQuery(
        callbackQuery.id,
        {
          text: '✅ Arigatou! Sekarang kamu bisa menggunakan bot~',
          show_alert: true
        }
      );
    } else {
      // Still not a member
      await bot.answerCallbackQuery(
        callbackQuery.id,
        {
          text: `⚠️ Kamu belum join channel ${config.channel.required}! Klik tombol join dulu ya~`,
          show_alert: true
        }
      );
    }
  } catch (err) {
    logger.error('Error checking membership:', err);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error checking membership' });
  }
}

/**
 * Handle main menu callback
 */
async function handleMainMenu(bot, callbackQuery, userStates) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  
  try {
    await bot.editMessageText(
      getWibuMessage('welcome'),
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: mainMenu
      }
    );
    
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (err) {
    logger.error('Error showing main menu:', err);
  }
}

/**
 * Handle login callback
 */
async function handleLogin(bot, callbackQuery, userStates) {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  
  try {
    // Check if already logged in
    if (userStates[userId] && 
        userStates[userId].whatsapp && 
        userStates[userId].whatsapp.isConnected) {
      
      await bot.editMessageText(
        "Ara ara~ Kamu sudah login! Cek status kalau mau tahu kondisi bot (・ω<)☆",
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: mainMenu
        }
      );
      
      await bot.answerCallbackQuery(callbackQuery.id);
      return;
    }
    
    // Update status to waiting for phone number
    if (!userStates[userId]) {
      userStates[userId] = {};
    }
    
    userStates[userId].waitingForPhoneNumber = true;
    userStates[userId].lastMessageId = messageId;
    
    // Ask for phone number
    await bot.editMessageText(
      getWibuMessage('loginPrompt'),
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: cancelLogin
      }
    );
    
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (err) {
    logger.error('Error handling login:', err);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error saat proses login' });
  }
}

/**
 * Handle cancel login callback
 */
async function handleCancelLogin(bot, callbackQuery, userStates) {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  
  try {
    // Reset waiting status
    if (userStates[userId]) {
      userStates[userId].waitingForPhoneNumber = false;
      
      // Also close WhatsApp connection if exists
      if (userStates[userId].whatsapp && userStates[userId].whatsapp.socket) {
        await logoutWhatsApp(userId);
      }
    }
    
    // Show cancellation message
    await bot.editMessageText(
      getWibuMessage('loginCancelled'),
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: mainMenu
      }
    );
    
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (err) {
    logger.error('Error cancelling login:', err);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error saat cancel login' });
  }
}

/**
 * Handle status callback
 */
async function handleStatus(bot, callbackQuery, userStates) {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  
  try {
    // Check if WhatsApp is initialized
    if (!userStates[userId] || !userStates[userId].whatsapp) {
      await bot.editMessageText(
        getWibuMessage('statusNotLoggedIn'),
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔑 Login WhatsApp', callback_data: 'login' }],
              [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
            ]
          }
        }
      );
      
      await bot.answerCallbackQuery(callbackQuery.id);
      return;
    }
    
    const isConnected = userStates[userId].whatsapp.isConnected;
    
    if (isConnected) {
      await bot.editMessageText(
        getWibuMessage('statusConnected'),
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: connectedStatusButtons
        }
      );
    } else {
      await bot.editMessageText(
        getWibuMessage('statusDisconnected'),
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: disconnectedStatusButtons
        }
      );
    }
    
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (err) {
    logger.error('Error checking status:', err);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error saat cek status' });
  }
}

/**
 * Handle logout callback
 */
async function handleLogout(bot, callbackQuery, userStates) {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  
  try {
    // Check if logged in
    if (!userStates[userId] || !userStates[userId].whatsapp || !userStates[userId].whatsapp.socket) {
      await bot.editMessageText(
        getWibuMessage('statusNotLoggedIn'),
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: mainMenu
        }
      );
      
      await bot.answerCallbackQuery(callbackQuery.id);
      return;
    }
    
    // Show loading message
    await bot.editMessageText(
      "⏳ Sedang logout... Chotto matte kudasai~",
      {
        chat_id: chatId,
        message_id: messageId
      }
    );
    
    // Perform logout
    await logoutWhatsApp(userId);
    
    // Show success message
    await bot.editMessageText(
      getWibuMessage('logoutSuccess'),
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: mainMenu
      }
    );
    
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (err) {
    logger.error('Error during logout:', err);
    
    await bot.editMessageText(
      getWibuMessage('logoutError', { error: err.message }),
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: mainMenu
      }
    );
    
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error saat logout' });
  }
}

/**
 * Handle create group callback
 */
async function handleCreateGroup(bot, callbackQuery, userStates) {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  
  try {
    // Check if logged in
    if (!userStates[userId] || !userStates[userId].whatsapp || !userStates[userId].whatsapp.isConnected) {
      await bot.editMessageText(
        getWibuMessage('statusNotLoggedIn'),
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔑 Login WhatsApp', callback_data: 'login' }],
              [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
            ]
          }
        }
      );
      
      await bot.answerCallbackQuery(callbackQuery.id);
      return;
    }
    
    // Check cooldown
    const cooldownCheck = checkCooldown(userId);
    
    if (cooldownCheck.onCooldown) {
      await bot.editMessageText(
        getWibuMessage('groupCreationCooldown', { timeLeft: cooldownCheck.timeLeft }),
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: mainMenu
        }
      );
      
      await bot.answerCallbackQuery(callbackQuery.id);
      return;
    }
    
    // Start group creation process
    if (!userStates[userId].groupCreation) {
      userStates[userId].groupCreation = {};
    }
    
    userStates[userId].groupCreation.waitingForName = true;
    
    // Show introduction
    await bot.editMessageText(
      getWibuMessage('createGroupIntro'),
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: cancelGroupCreation
      }
    );
    
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (err) {
    logger.error('Error starting group creation:', err);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error saat memulai pembuatan grup' });
  }
}

/**
 * Handle cancel group creation callback
 */
async function handleCancelGroup(bot, callbackQuery, userStates) {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  
  try {
    // Reset group creation flags
    if (userStates[userId] && userStates[userId].groupCreation) {
      userStates[userId].groupCreation = {}; // Clear all group creation flags
      
      // Reset any cooldown
      const { resetCooldown } = require('../core/whatsappClient');
      resetCooldown(userId);
    }
    
    // Show cancellation message
    await bot.editMessageText(
      getWibuMessage('groupCreationCancelled'),
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: mainMenu
      }
    );
    
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (err) {
    logger.error('Error cancelling group creation:', err);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error saat cancel pembuatan grup' });
  }
}

/**
 * Handle leave all groups callback
 */
async function handleLeaveAllGroups(bot, callbackQuery, userStates) {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  
  try {
    // Check if logged in
    if (!userStates[userId] || !userStates[userId].whatsapp || !userStates[userId].whatsapp.isConnected) {
      await bot.editMessageText(
        getWibuMessage('statusNotLoggedIn'),
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔑 Login WhatsApp', callback_data: 'login' }],
              [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
            ]
          }
        }
      );
      
      await bot.answerCallbackQuery(callbackQuery.id);
      return;
    }
    
    // Show confirmation first
    await bot.editMessageText(
      getWibuMessage('confirmLeaveAllGroups'),
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Ya, Keluar Semua Grup', callback_data: 'confirm_leave_all_groups' }],
            [{ text: '❌ Batal', callback_data: 'cancel_leave_all_groups' }]
          ]
        }
      }
    );
    
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (err) {
    logger.error('Error handling leave all groups:', err);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error saat proses keluar grup' });
  }
}

/**
 * Handle confirm leave all groups callback
 */
async function handleConfirmLeaveAllGroups(bot, callbackQuery, userStates) {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  
  try {
    // Show leaving message
    await bot.editMessageText(
      getWibuMessage('leavingAllGroups'),
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown'
      }
    );
    
    // Get all groups first
    const { getAllUserGroups, leaveAllGroups } = require('../core/whatsappClient');
    const groupsResult = await getAllUserGroups(userId);
    
    if (!groupsResult.success) {
      await bot.editMessageText(
        getWibuMessage('leaveAllGroupsError', { error: groupsResult.error }),
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: mainMenu
        }
      );
      return;
    }
    
    // Check if user has any groups
    if (groupsResult.groups.length === 0) {
      await bot.editMessageText(
        getWibuMessage('noGroupsToLeave'),
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: mainMenu
        }
      );
      return;
    }
    
    // Define progress callback
    const progressCallback = async (progress) => {
      try {
        // Only send separate message for each 5th group or if it's the first/last one
        // to avoid flooding the chat
        if (progress.current % 5 === 0 || progress.current === 1 || progress.current === progress.total) {
          if (progress.success) {
            await bot.sendMessage(
              chatId,
              getWibuMessage('groupLeft', progress),
              { parse_mode: 'Markdown' }
            );
          } else {
            await bot.sendMessage(
              chatId,
              getWibuMessage('groupLeaveFailed', progress),
              { parse_mode: 'Markdown' }
            );
          }
        }
      } catch (err) {
        logger.error(`Error sending progress update:`, err);
      }
    };
    
    // Execute leaving all groups
    const result = await leaveAllGroups(userId, progressCallback);
    
    if (!result.success) {
      await bot.editMessageText(
        getWibuMessage('leaveAllGroupsError', { error: result.error }),
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: mainMenu
        }
      );
      return;
    }
    
    // Show completion message
    await bot.editMessageText(
      getWibuMessage('leaveAllGroupsComplete', {
        totalGroups: result.totalGroups,
        leftGroups: result.leftGroups,
        failedGroups: result.failedGroups
      }),
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: mainMenu
      }
    );
  } catch (err) {
    logger.error('Error leaving all groups:', err);
    
    await bot.editMessageText(
      getWibuMessage('leaveAllGroupsError', { error: err.message }),
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: mainMenu
      }
    );
  }
}

/**
 * Handle cancel leave all groups callback
 */
async function handleCancelLeaveAllGroups(bot, callbackQuery, userStates) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  
  try {
    await bot.editMessageText(
      "Operasi keluar dari semua grup dibatalkan~ Yokatta ne! (´｡• ᵕ •｡`)",
      {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: mainMenu
      }
    );
    
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (err) {
    logger.error('Error cancelling leave all groups:', err);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error saat cancel' });
  }
}

/**
 * Handle help callback
 */
async function handleHelp(bot, callbackQuery, userStates) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  
  try {
    await bot.editMessageText(
      getWibuMessage('helpMessage'),
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Kembali ke Menu Utama', callback_data: 'main_menu' }]
          ]
        }
      }
    );
    
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (err) {
    logger.error('Error showing help:', err);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error saat menampilkan bantuan' });
  }
}

module.exports = {
  setupCallbackHandlers,
  handleMainMenu,
  handleLogin,
  handleCancelLogin,
  handleStatus,
  handleLogout,
  handleCreateGroup,
  handleCancelGroup,
  handleLeaveAllGroups,
  handleConfirmLeaveAllGroups,
  handleCancelLeaveAllGroups,
  handleHelp
};