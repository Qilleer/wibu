/**
 * 🌸 WhatsApp-Telegram Bridge Bot 🌸
 * ~ UwU Wibu Version ~
 * Created with 🔥 by Qiventory
 */

// Import core modules
const { startTelegramBot } = require('./core/telegramBot');
const logger = require('./helpers/logger');

// ASCII art banner
const { showBanner } = require('./ui/banners');

// Async function to run everything
async function main() {
  try {
    // Show fancy banner
    showBanner();
    
    // Inisialisasi bot Telegram
    logger.info('🚀 Starting Telegram bot...');
    await startTelegramBot();
    
    logger.info('✨ Bot sudah aktif! Siap menerima perintah senpai!');
    
    // Handle shutdown gracefully
    setupGracefulShutdown();
  } catch (error) {
    logger.error('💥 Error saat starting bot:', error);
    process.exit(1);
  }
}

// Graceful shutdown handler
function setupGracefulShutdown() {
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      logger.info(`💤 Bot mau bobo dulu (${signal})...`);
      process.exit(0);
    });
  }
}

// Run the application
main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});