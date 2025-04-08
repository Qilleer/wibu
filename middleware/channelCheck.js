/**
 * Channel Membership Checker
 * Memastikan user sudah join channel yang disyaratkan
 */

const logger = require('../helpers/logger');

/**
 * Cek apakah user adalah member dari channel yang ditentukan
 */
async function checkChannelMembership(bot, userId, channelUsername) {
  try {
    // Bersihkan username channel dari @ jika ada
    const cleanChannelUsername = channelUsername.startsWith('@') 
      ? channelUsername.substring(1) 
      : channelUsername;
    
    // Cek status membership dengan getChatMember
    const chatMember = await bot.getChatMember(`@${cleanChannelUsername}`, userId);
    
    // Status yang dianggap sebagai member
    const validStatuses = ['creator', 'administrator', 'member'];
    
    // Log hasil
    logger.debug(`Channel check for user ${userId}: status=${chatMember.status}`);
    
    return validStatuses.includes(chatMember.status);
  } catch (err) {
    logger.error(`Error checking channel membership for ${userId}:`, err);
    
    // Default to false if error
    return false;
  }
}

/**
 * Middleware buat cek membership waktu user pencet button
 */
async function channelMembershipCallbackMiddleware(bot, callbackQuery, next) {
  try {
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    
    // Skip check for check_membership button
    if (data === 'check_membership') {
      return next();
    }
    
    // Skip if not in private chat
    if (callbackQuery.message.chat.type !== 'private') {
      return next();
    }
    
    // Check membership
    const { channelRequired } = require('../config/config');
    const isMember = await checkChannelMembership(bot, userId, channelRequired);
    
    if (!isMember) {
      // User belum join channel
      await bot.answerCallbackQuery(
        callbackQuery.id,
        {
          text: `⚠️ Join channel ${channelRequired} dulu ya!`,
          show_alert: true
        }
      );
      
      // Send join reminder
      await bot.sendMessage(
        chatId,
        `⚠️ *Ara ara~* Kamu harus join channel ${channelRequired} dulu sebelum menggunakan bot ini!\n\nKlik link di bawah untuk join~`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: `✨ Join ${channelRequired}`, url: `https://t.me/${channelRequired.replace('@', '')}` }],
              [{ text: '🔄 Sudah Join? Refresh', callback_data: 'check_membership' }]
            ]
          }
        }
      );
      
      return;
    }
    
    // User is a member, proceed
    return next();
  } catch (err) {
    logger.error('Error in channel membership middleware:', err);
    return next();
  }
}

module.exports = {
  checkChannelMembership,
  channelMembershipCallbackMiddleware
};