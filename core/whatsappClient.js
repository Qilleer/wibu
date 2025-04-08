/**
 * WhatsApp Client Core - FIXED RECONNECT
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require("@whiskeysockets/baileys");
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const { config } = require('../config/config');
const logger = require('../helpers/logger');
const { getWibuMessage } = require('../ui/messages');

// Fix untuk crypto issue
global.crypto = require('crypto');

// Menyimpan cooldown per user
const userCooldowns = {};

/**
 * Membuat koneksi WhatsApp baru - Simplified for better reconnect
 */
async function createWhatsAppConnection(userId, bot, reconnect = false) {
  try {
    const sessionPath = path.join(config.whatsapp.sessionPath, `wa_${userId}`);
    
    // Pastikan folder session ada
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }
    
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    
    // Buat socket dengan browser config lengkap - PERSIS seperti di bot.js
    const sock = makeWASocket({
      printQRInTerminal: false,
      auth: state,
      logger: pino({ level: "silent" }),
      browser: Browsers.ubuntu("Chrome"),
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 10000,
      retryRequestDelayMs: 5000
    });
    
    // Save user state
    const userStates = require('./telegramBot').getUserStates();
    
    if (!userStates[userId]) {
      userStates[userId] = {};
    }
    
    userStates[userId].whatsapp = {
      socket: sock,
      isConnected: false,
      lastConnect: null,
      isWaitingForPairingCode: false
    };
    
    // Save credentials when updated
    sock.ev.on('creds.update', saveCreds);
    
    // Handle connection updates - SIMPLIFY like bot.js
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      
      console.log(`[DEBUG] Connection update for ${userId}: ${connection}`);
      
      if (connection === "open") {
        logger.info(`WhatsApp connection open for user: ${userId}`);
        
        // Update state
        if (userStates[userId] && userStates[userId].whatsapp) {
          userStates[userId].whatsapp.isConnected = true;
          userStates[userId].whatsapp.lastConnect = new Date();
          userStates[userId].whatsapp.isWaitingForPairingCode = false;
        }
        
        // Send success message based on reconnect status
        if (reconnect) {
          await bot.sendMessage(
            userId,
            "✅ *Reconnect berhasil desu!* Bot WhatsApp sudah terhubung kembali.",
            { 
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🌟 Buat Grup', callback_data: 'create_group' }],
                  [{ text: '🔄 Cek Status', callback_data: 'status' }],
                  [{ text: '🚪 Logout', callback_data: 'logout' }],
                  [{ text: '📝 Bantuan', callback_data: 'help' }]
                ]
              }
            }
          );
        } else {
          await bot.sendMessage(
            userId,
            "🚀 *Bot WhatsApp berhasil terhubung!*\n\nSekarang kamu bisa menggunakan bot WhatsApp lewat Telegram desu~!",
            { 
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🌟 Buat Grup', callback_data: 'create_group' }],
                  [{ text: '🔄 Cek Status', callback_data: 'status' }],
                  [{ text: '🚪 Logout', callback_data: 'logout' }],
                  [{ text: '📝 Bantuan', callback_data: 'help' }]
                ]
              }
            }
          );
        }
      } else if (connection === "close") {
        // Update state
        if (userStates[userId] && userStates[userId].whatsapp) {
          userStates[userId].whatsapp.isConnected = false;
        }
        
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const disconnectReason = lastDisconnect?.error?.output?.payload?.message || "Unknown";
        
        console.log(`[DEBUG] Connection closed for userId ${userId}. Status code: ${statusCode}, Reason: ${disconnectReason}`);
        
        // Cek apakah perlu reconnect - SAMA PERSIS seperti di bot.js
        let shouldReconnect = true;
        
        // Status code 401 atau 403 biasanya logout/banned
        if (statusCode === 401 || statusCode === 403) {
          shouldReconnect = false;
        }
        
        // Logika reconnect
        if (shouldReconnect && userStates[userId]) {
          // Kasih notifikasi ke user - SAMA PERSIS SEPERTI BOT.JS
          await bot.sendMessage(userId, 
            `⚠️ *Koneksi terputus*\nReason: ${disconnectReason}\n\nSedang mencoba reconnect... Ganbare!`,
            { parse_mode: 'Markdown' }
          ).catch(err => console.error("Error sending disconnect message:", err));
          
          // Tunggu 5 detik sebelum reconnect - SAMA PERSIS SEPERTI BOT.JS
          setTimeout(async () => {
            if (userStates[userId]) {
              console.log(`[DEBUG] Attempting to reconnect for userId: ${userId}`);
              await createWhatsAppConnection(userId, bot, true);
            }
          }, 5000);
        } else if (userStates[userId]) {
          // Kalau tidak bisa reconnect, beri tahu user - SAMA PERSIS SEPERTI BOT.JS
          await bot.sendMessage(userId, 
            "❌ *Koneksi terputus permanen*\nPerlu login ulang pakai pairing code lagi.", 
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔑 Login Ulang', callback_data: 'login' }],
                  [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
                ]
              }
            }
          ).catch(err => console.error("Error sending permanent disconnect:", err));
          
          // Hapus session fisik
          const sessionPath = path.join(config.whatsapp.sessionPath, `wa_${userId}`);
          if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            console.log(`Session files deleted for userId: ${userId}`);
          }
          
          // Hapus user state
          userStates[userId].whatsapp = {
            socket: null,
            isConnected: false,
            lastConnect: null,
            isWaitingForPairingCode: false
          };
        }
      }
    });
    
    return sock;
  } catch (err) {
    logger.error(`Error creating WhatsApp connection for ${userId}:`, err);
    
    if (!reconnect) {
      await bot.sendMessage(
        userId,
        `❌ Ada error saat membuat koneksi: ${err.message}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
            ]
          }
        }
      );
    }
    
    return null;
  }
}

/**
 * Generate pairing code for login
 */
async function generatePairingCode(userId, phoneNumber, bot, messageId) {
  const userStates = require('./telegramBot').getUserStates();
  
  try {
    // Check if socket exists
    if (!userStates[userId]?.whatsapp?.socket) {
      throw new Error("Koneksi WhatsApp belum dibuat");
    }
    
    const sock = userStates[userId].whatsapp.socket;
    
    // Set flag to indicate we're in the pairing phase
    userStates[userId].whatsapp.isWaitingForPairingCode = true;
    
    // Store the phone number for potential reconnect
    userStates[userId].whatsapp.phoneNumber = phoneNumber;
    
    // Delete the loading message first
    try {
      await bot.deleteMessage(userId, messageId);
    } catch (err) {
      logger.warn(`Could not delete loading message: ${err.message}`);
    }
    
    // Request pairing code from WhatsApp
    const code = await sock.requestPairingCode(phoneNumber);
    
    // Send a fresh message with the pairing code - PERSIS SEPERTI BOT.JS
    await bot.sendMessage(
      userId,
      `🔑 *Pairing Code:*\n\n*${code}*\n\nMasukkan code di atas ke WhatsApp kamu dalam 60 detik! Kalau terputus, otomatis akan reconnect!`,
      { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Cancel Login', callback_data: 'cancel_login' }]
          ]
        }
      }
    );
    
    return true;
  } catch (err) {
    logger.error(`Error generating pairing code for ${userId}:`, err);
    
    // Try to delete loading message if it exists
    try {
      await bot.deleteMessage(userId, messageId);
    } catch (delErr) {
      logger.warn(`Could not delete loading message: ${delErr.message}`);
    }
    
    // Send a fresh message with error
    await bot.sendMessage(
      userId,
      `❌ Gomen ne~ Gagal membuat pairing code. Coba lagi nanti atau pakai nomor lain (⋟﹏⋞)`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Coba Lagi', callback_data: 'login' }],
            [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
          ]
        }
      }
    );
    
    return false;
  }
}

// --- SISANYA SAMA SEPERTI ORIGINAL ---

/**
 * Membuat grup WhatsApp
 */
async function createWhatsAppGroup(userId, groupName) {
  const userStates = require('./telegramBot').getUserStates();
  
  try {
    // Check if socket exists and connected
    if (!userStates[userId]?.whatsapp?.socket || !userStates[userId]?.whatsapp?.isConnected) {
      throw new Error("WhatsApp tidak terhubung");
    }
    
    const sock = userStates[userId].whatsapp.socket;
    
    // Create empty group (with only self)
    const response = await sock.groupCreate(groupName, []);
    
    // Extract group ID
    const groupId = response.id;
    
    // Generate invite link
    const inviteCode = await sock.groupInviteCode(groupId);
    const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
    
    return {
      id: groupId,
      name: response.subject,
      link: inviteLink,
      success: true
    };
  } catch (err) {
    logger.error(`Error creating group ${groupName} for ${userId}:`, err);
    
    return {
      name: groupName,
      error: err.message,
      success: false
    };
  }
}

/**
 * Buat beberapa grup sekaligus
 */
async function createMultipleGroups(userId, baseName, count, progressCallback) {
  const results = [];
  
  for (let i = 1; i <= count; i++) {
    // Group name with number
    const groupName = `${baseName} ${i}`;
    
    // Anti-limit: random delay
    const delay = getRandomDelay();
    await sleep(delay);
    
    // Create group
    const result = await createWhatsAppGroup(userId, groupName);
    results.push(result);
    
    // Report progress
    if (progressCallback) {
      await progressCallback(result, i, count);
    }
  }
  
  return results;
}

/**
 * Logout dari WhatsApp dan hapus session
 */
async function logoutWhatsApp(userId) {
  const userStates = require('./telegramBot').getUserStates();
  
  try {
    // Check if socket exists
    if (userStates[userId]?.whatsapp?.socket) {
      const sock = userStates[userId].whatsapp.socket;
      
      // Try to logout properly
      await sock.logout();
    }
    
    // Delete session files
    const sessionPath = path.join(config.whatsapp.sessionPath, `wa_${userId}`);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
    
    // Clear WhatsApp state
    if (userStates[userId]) {
      userStates[userId].whatsapp = {
        socket: null,
        isConnected: false,
        lastConnect: null,
        isWaitingForPairingCode: false
      };
    }
    
    return true;
  } catch (err) {
    logger.error(`Error logging out WhatsApp for ${userId}:`, err);
    return false;
  }
}

/**
 * Restore existing WhatsApp sessions on bot start
 */
async function restoreWhatsAppSessions(bot, userStates) {
  try {
    // Check if sessions directory exists
    if (!fs.existsSync(config.whatsapp.sessionPath)) {
      fs.mkdirSync(config.whatsapp.sessionPath, { recursive: true });
      return;
    }
    
    // Get all session directories
    const sessionDirs = fs.readdirSync(config.whatsapp.sessionPath);
    
    // Restore each session
    for (const dir of sessionDirs) {
      if (dir.startsWith('wa_')) {
        const userId = dir.substring(3);
        logger.info(`Attempting to restore WhatsApp session for user: ${userId}`);
        
        // Check if user has access
        if (hasAccess(userId)) {
          try {
            // Create connection with reconnect flag
            await createWhatsAppConnection(userId, bot, true);
            logger.info(`Restored WhatsApp session for user: ${userId}`);
          } catch (err) {
            logger.error(`Failed to restore WhatsApp session for ${userId}:`, err);
          }
        } else {
          logger.info(`Skipping session restore for ${userId} - No access`);
        }
      }
    }
  } catch (err) {
    logger.error('Error restoring WhatsApp sessions:', err);
  }
}

/**
 * Check if user has access to the bot
 */
function hasAccess(userId) {
  return (
    config.telegram.owners.includes(userId.toString()) || 
    config.telegram.allowedUsers.includes(userId.toString())
  );
}

/**
 * Check and set cooldown for group creation
 */
function checkCooldown(userId) {
  const now = Date.now();
  const cooldownPeriod = config.whatsapp.groupCreation.cooldown * 60 * 1000; // Convert to ms
  
  // Check active cooldown
  if (userCooldowns[userId] && userCooldowns[userId] > now) {
    const timeLeft = userCooldowns[userId] - now;
    const minutesLeft = Math.ceil(timeLeft / 60000);
    return { onCooldown: true, timeLeft: minutesLeft };
  }
  
  // Set new cooldown
  userCooldowns[userId] = now + cooldownPeriod;
  return { onCooldown: false };
}

/**
 * Reset cooldown for user
 */
function resetCooldown(userId) {
  delete userCooldowns[userId];
}

/**
 * Sleep function untuk delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Random delay untuk anti-limit
 */
function getRandomDelay() {
  // Base delay + random additional delay
  return config.whatsapp.groupCreation.delay + Math.floor(Math.random() * 2000);
}

/**
 * Mendapatkan semua grup yang user ikuti
 */
async function getAllUserGroups(userId) {
  const userStates = require('./telegramBot').getUserStates();
  
  try {
    // Check if socket exists and connected
    if (!userStates[userId]?.whatsapp?.socket || !userStates[userId]?.whatsapp?.isConnected) {
      throw new Error("WhatsApp tidak terhubung");
    }
    
    const sock = userStates[userId].whatsapp.socket;
    
    // Fetch all chats
    const chats = await sock.groupFetchAllParticipating();
    
    // Filter for groups only
    const groups = Object.values(chats).filter(chat => chat.id.endsWith('@g.us'));
    
    return {
      success: true,
      groups: groups.map(group => ({
        id: group.id,
        name: group.subject,
        participants: group.participants.length
      }))
    };
  } catch (err) {
    logger.error(`Error fetching groups for ${userId}:`, err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Keluar dari semua grup WhatsApp
 */
async function leaveAllGroups(userId, progressCallback = null) {
  const userStates = require('./telegramBot').getUserStates();
  
  try {
    // Check if socket exists and connected
    if (!userStates[userId]?.whatsapp?.socket || !userStates[userId]?.whatsapp?.isConnected) {
      throw new Error("WhatsApp tidak terhubung");
    }
    
    const sock = userStates[userId].whatsapp.socket;
    
    // Get all groups
    const groupsResult = await getAllUserGroups(userId);
    
    if (!groupsResult.success) {
      throw new Error(groupsResult.error);
    }
    
    if (groupsResult.groups.length === 0) {
      return {
        success: true,
        totalGroups: 0,
        leftGroups: 0,
        failedGroups: 0
      };
    }
    
    const results = {
      success: [],
      failed: []
    };
    
    // Exit each group with delay to avoid rate limits
    for (let i = 0; i < groupsResult.groups.length; i++) {
      const group = groupsResult.groups[i];
      
      try {
        // Add anti-limit delay between operations
        const delay = getRandomDelay();
        await sleep(delay);
        
        // Leave group
        await sock.groupLeave(group.id);
        
        // Add to success list
        results.success.push({
          id: group.id,
          name: group.name
        });
        
        // Report progress if callback provided
        if (progressCallback) {
          await progressCallback({
            current: i + 1,
            total: groupsResult.groups.length,
            name: group.name,
            success: true
          });
        }
      } catch (err) {
        logger.error(`Error leaving group ${group.name}:`, err);
        
        // Add to failed list
        results.failed.push({
          id: group.id,
          name: group.name,
          error: err.message
        });
        
        // Report progress if callback provided
        if (progressCallback) {
          await progressCallback({
            current: i + 1,
            total: groupsResult.groups.length,
            name: group.name,
            success: false,
            error: err.message
          });
        }
      }
    }
    
    return {
      success: true,
      totalGroups: groupsResult.groups.length,
      leftGroups: results.success.length,
      failedGroups: results.failed.length,
      details: results
    };
  } catch (err) {
    logger.error(`Error leaving all groups for ${userId}:`, err);
    return {
      success: false,
      error: err.message
    };
  }
}

// Export functions
module.exports = {
  createWhatsAppConnection,
  generatePairingCode,
  createWhatsAppGroup,
  createMultipleGroups,
  logoutWhatsApp,
  restoreWhatsAppSessions,
  checkCooldown,
  resetCooldown,
  getAllUserGroups,
  leaveAllGroups
};