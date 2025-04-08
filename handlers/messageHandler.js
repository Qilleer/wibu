/**
 * Message Handler
 * Menangani pesan teks dari user
 */

const { config } = require('../config/config');
const logger = require('../helpers/logger');
const { getWibuMessage } = require('../ui/messages');
const { mainMenu, getAfterGroupCreationWithCooldownButtons } = require('../ui/buttons');
const { checkChannelMembership } = require('../middleware/channelCheck');
const { createWhatsAppConnection, generatePairingCode, createMultipleGroups, checkCooldown, resetCooldown } = require('../core/whatsappClient');
const { validatePhoneNumber, validateGroupName, validateGroupCount } = require('../helpers/validator');

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
 * Setup message handlers
 */
function setupMessageHandlers(bot, userStates) {
  bot.on('message', async (msg) => {
    // Skip jika bukan dari private chat
    if (msg.chat.type !== 'private') return;
    
    // Skip jika bukan pesan text
    if (!msg.text) return;
    
    // Skip jika message adalah command
    if (msg.text.startsWith('/')) return;
    
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    
    try {
      // Cek akses
      if (!hasAccess(userId.toString())) {
        return; // User tidak punya akses, skip
      }
      
      // Verifikasi channel membership
      const isMember = await checkChannelMembership(bot, userId, config.channel.required);
      
      if (!isMember) {
        await bot.sendMessage(
          chatId,
          getWibuMessage('channelRequired', { channel: config.channel.required }),
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: `✨ Join ${config.channel.required}`, url: `https://t.me/${config.channel.required.replace('@', '')}` }],
                [{ text: '🔄 Sudah Join? Refresh', callback_data: 'check_membership' }]
              ]
            }
          }
        );
        return;
      }
      
      // Cek tipe input yang ditunggu
      if (userStates[userId]?.waitingForPhoneNumber) {
        await handlePhoneNumberInput(bot, msg, userStates);
      } else if (userStates[userId]?.groupCreation?.waitingForName) {
        await handleGroupNameInput(bot, msg, userStates);
      } else if (userStates[userId]?.groupCreation?.waitingForCount) {
        await handleGroupCountInput(bot, msg, userStates);
      } else {
        // Pesan yang tidak diharapkan, mungkin user sedang mencoba bicara dengan bot
        // Kirim hint untuk menggunakan button
        await bot.sendMessage(
          chatId,
          "Ara ara~ Senpai ingin ngobrol denganku? Gunakan tombol menu di bawah untuk akses fitur ya~ OwO",
          {
            reply_markup: mainMenu
          }
        );
      }
    } catch (err) {
      logger.error(`Error handling message from ${userId}:`, err);
      
      try {
        await bot.sendMessage(
          chatId,
          getWibuMessage('error', { message: err.message }),
          {
            parse_mode: 'Markdown',
            reply_markup: mainMenu
          }
        );
      } catch (sendErr) {
        logger.error('Error sending error message:', sendErr);
      }
    }
  });
}

// Export function
module.exports = {
  setupMessageHandlers
};

/**
 * Handle phone number input
 */
async function handlePhoneNumberInput(bot, msg, userStates) {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const phoneNumber = msg.text.trim();
  
  try {
    // Delete user's message for privacy
    await bot.deleteMessage(chatId, msg.message_id).catch(() => {});
    
    // Validasi nomor telepon
    const validation = validatePhoneNumber(phoneNumber);
    
    if (!validation.valid) {
      let errorMessage = "❌ Format nomor tidak valid! Pastikan:";
      errorMessage += "\n• Hanya berisi angka";
      errorMessage += "\n• Panjang 10-15 digit";
      errorMessage += "\n• Termasuk kode negara (tanpa +)";
      errorMessage += "\n\nContoh: 628123456789 atau 12025550179";
      
      await bot.sendMessage(
        chatId,
        errorMessage,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Coba Lagi', callback_data: 'login' }],
              [{ text: '❌ Cancel Login', callback_data: 'cancel_login' }]
            ]
          }
        }
      );
      
      return;
    }
    
    // Reset flag
    userStates[userId].waitingForPhoneNumber = false;
    
    // Kirim loading message
    const loadingMsg = await bot.sendMessage(
      chatId,
      "⏳ Chotto matte kudasai... Sedang membuat pairing code... (≧◡≦)",
      { parse_mode: 'Markdown' }
    );
    
    try {
      // Create WhatsApp connection, PERSIS SAMA DENGAN bot.js
      const { createWhatsAppConnection } = require('../core/whatsappClient');
      const sock = await createWhatsAppConnection(userId, bot);
      
      if (!sock) {
        throw new Error("Gagal membuat koneksi WhatsApp");
      }
      
      // Tunggu 3 detik untuk koneksi stabil, PERSIS SAMA DENGAN bot.js
      setTimeout(async () => {
        try {
          // Save the phoneNumber for reconnect
          if (userStates[userId] && userStates[userId].whatsapp) {
            userStates[userId].whatsapp.phoneNumber = validation.phoneNumber;
          }
          
          // Generate pairing code
          if (userStates[userId] && userStates[userId].whatsapp && userStates[userId].whatsapp.socket) {
            const sock = userStates[userId].whatsapp.socket;
            
            try {
              // Request pairing code, PERSIS sama dengan bot.js
              const code = await sock.requestPairingCode(validation.phoneNumber);
              
              // Hapus loading message, PERSIS sama dengan bot.js
              await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
              
              // Konfirmasi pairing berhasil, PERSIS sama dengan bot.js
              await bot.sendMessage(
                chatId,
                `🔑 *Pairing Code:*\n\n*${code}*\n\nMasukkan code di atas ke WhatsApp kamu dalam 60 detik! Kalau terputus, otomatis akan reconnect!`,
                { parse_mode: 'Markdown' }
              );
            } catch (pairingErr) {
              logger.error("Error generating pairing code:", pairingErr);
              
              // Hapus loading message, PERSIS sama dengan bot.js
              await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
              
              await bot.sendMessage(
                chatId,
                "❌ Gomen ne~ Gagal membuat pairing code. Coba lagi nanti atau pakai nomor lain (⋟﹏⋞)",
                {
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: '🔄 Coba Lagi', callback_data: 'login' }],
                      [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
                    ]
                  }
                }
              );
            }
          } else {
            logger.error("Socket lost before generating pairing code");
            await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
            await bot.sendMessage(
              chatId,
              "❌ Koneksi WhatsApp terputus sebelum bisa membuat pairing code. Coba lagi...",
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '🔄 Coba Lagi', callback_data: 'login' }],
                    [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
                  ]
                }
              }
            );
          }
        } catch (pairingErr) {
          logger.error(`Error in pairing process: ${pairingErr.message}`);
          
          await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
          
          await bot.sendMessage(
            chatId,
            `❌ Error saat membuat pairing code: ${pairingErr.message}`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔄 Coba Lagi', callback_data: 'login' }],
                  [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
                ]
              }
            }
          );
        }
      }, 3000); // 3 detik delay PERSIS seperti di bot.js
    } catch (err) {
      logger.error(`Error creating connection for ${userId}:`, err);
      
      try {
        // Update loading message with error
        await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
        
        await bot.sendMessage(
          chatId,
          `❌ Gomen ne~ Gagal membuat koneksi WhatsApp: ${err.message}`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔄 Coba Lagi', callback_data: 'login' }],
                [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
              ]
            }
          }
        );
      } catch (sendErr) {
        logger.error(`Error sending error message: ${sendErr.message}`);
      }
    }
  } catch (err) {
    logger.error(`Error handling phone number for ${userId}:`, err);
    await bot.sendMessage(
      chatId, 
      `❌ Error: ${err.message}`, 
      { 
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Coba Lagi', callback_data: 'login' }],
            [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
          ]
        }
      }
    );
  }
}

/**
 * Handle group name input
 */
async function handleGroupNameInput(bot, msg, userStates) {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const groupNameInput = msg.text.trim();
  
  try {
    // Validasi nama grup
    const validation = validateGroupName(groupNameInput);
    
    if (!validation.valid) {
      await bot.sendMessage(
        chatId,
        getWibuMessage('groupNameInvalid', { 
          name: groupNameInput, 
          reason: validation.reason
        }),
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '❌ Cancel Pembuatan Grup', callback_data: 'cancel_group' }]
            ]
          }
        }
      );
      return;
    }
    
    // Update state
    userStates[userId].groupCreation.waitingForName = false;
    userStates[userId].groupCreation.waitingForCount = true;
    userStates[userId].groupCreation.name = validation.name;
    
    // Ask for count
    await bot.sendMessage(
      chatId,
      getWibuMessage('askGroupCount', { 
        name: validation.name,
        maxCount: config.whatsapp.groupCreation.maxCount
      }),
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Cancel Pembuatan Grup', callback_data: 'cancel_group' }]
          ]
        }
      }
    );
  } catch (err) {
    logger.error(`Error handling group name for ${userId}:`, err);
    await bot.sendMessage(
      chatId, 
      getWibuMessage('error', { message: err.message }), 
      { parse_mode: 'Markdown' }
    );
  }
}

/**
 * Handle group count input
 */
async function handleGroupCountInput(bot, msg, userStates) {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const countInput = msg.text.trim();
  
  try {
    // Validasi jumlah grup
    const validation = validateGroupCount(countInput);
    
    if (!validation.valid) {
      await bot.sendMessage(
        chatId,
        getWibuMessage('groupCountInvalid', { 
          count: validation.count, 
          reason: validation.reason,
          maxCount: config.whatsapp.groupCreation.maxCount
        }),
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '❌ Cancel Pembuatan Grup', callback_data: 'cancel_group' }]
            ]
          }
        }
      );
      return;
    }
    
    // Update state
    userStates[userId].groupCreation.waitingForCount = false;
    userStates[userId].groupCreation.count = validation.count;
    
    const groupName = userStates[userId].groupCreation.name;
    const groupCount = validation.count;
    
    // Send creating message
    const creatingMsg = await bot.sendMessage(
      chatId,
      getWibuMessage('creatingGroups', {
        name: groupName,
        count: groupCount
      }),
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Cancel Pembuatan Grup', callback_data: 'cancel_group' }]
          ]
        }
      }
    );
    
    // Buat array untuk menyimpan semua hasil
    const allResults = [];
    
    // Progress callback yang hanya update status tanpa kirim link
    const progressCallback = async (result, current, total) => {
      try {
        // Simpan result
        allResults.push(result);
        
        // Update message progress
        if (current % 5 === 0 || current === total) {
          await bot.editMessageText(
            getWibuMessage('creatingGroupsProgress', {
              name: groupName,
              current: current,
              total: total,
              success: allResults.filter(r => r.success).length,
              failed: allResults.filter(r => !r.success).length
            }),
            {
              chat_id: chatId,
              message_id: creatingMsg.message_id,
              parse_mode: 'Markdown'
            }
          );
        }
      } catch (err) {
        logger.error(`Error updating progress for ${userId}:`, err);
      }
    };
    
    // Create groups
    try {
      const results = await createMultipleGroups(
        userId,
        groupName,
        groupCount,
        progressCallback
      );
      
      // Calculate success rate
      const successResults = results.filter(r => r.success);
      const successCount = successResults.length;
      const failedCount = results.length - successCount;
      
      // Generate batched links message
      const linkChunks = [];
      let currentChunk = "*🔗 Link Grup yang Berhasil Dibuat:*\n\n";
      
      for (let i = 0; i < successResults.length; i++) {
        const group = successResults[i];
        const linkEntry = `*${i+1}. ${group.name}*\n${group.link}\n\n`;
        
        // If adding this entry exceeds message limit, start a new chunk
        if (currentChunk.length + linkEntry.length > 4000) {
          linkChunks.push(currentChunk);
          currentChunk = linkEntry;
        } else {
          currentChunk += linkEntry;
        }
      }
      
      // Add the last chunk if it's not empty
      if (currentChunk.length > 0) {
        linkChunks.push(currentChunk);
      }
      
      // Send completion message
      await bot.editMessageText(
        getWibuMessage('groupCreationComplete', {
          success: successCount,
          failed: failedCount,
          cooldownMinutes: config.whatsapp.groupCreation.cooldown
        }),
        {
          chat_id: chatId,
          message_id: creatingMsg.message_id,
          parse_mode: 'Markdown',
          reply_markup: getAfterGroupCreationWithCooldownButtons(true)
        }
      );
      
      // Send all link chunks
      for (const chunk of linkChunks) {
        await bot.sendMessage(
          chatId,
          chunk,
          { parse_mode: 'Markdown' }
        );
      }
      
      // If there were failures, send failure message
      if (failedCount > 0) {
        const failedGroups = results.filter(r => !r.success);
        let failureMessage = "*❌ Grup yang Gagal Dibuat:*\n\n";
        
        failedGroups.forEach((group, index) => {
          failureMessage += `*${index+1}. ${group.name}*\nError: ${group.error}\n\n`;
        });
        
        // Only send if there's content and it's not too long
        if (failureMessage.length > 30 && failureMessage.length < 4000) {
          await bot.sendMessage(
            chatId,
            failureMessage,
            { parse_mode: 'Markdown' }
          );
        }
      }
      
      // Reset group creation state
      userStates[userId].groupCreation = {};
      
      // If all fail, reset cooldown
      if (successCount === 0) {
        resetCooldown(userId);
      }
    } catch (err) {
      logger.error(`Error creating groups for ${userId}:`, err);
      
      await bot.sendMessage(
        chatId,
        getWibuMessage('error', { message: err.message }),
        {
          parse_mode: 'Markdown',
          reply_markup: mainMenu
        }
      );
      
      // Reset cooldown and state on error
      resetCooldown(userId);
      userStates[userId].groupCreation = {};
    }
  } catch (err) {
    logger.error(`Error handling group count for ${userId}:`, err);
    await bot.sendMessage(
      chatId, 
      getWibuMessage('error', { message: err.message }), 
      { parse_mode: 'Markdown' }
    );
  }
}