/**
 * Konfigurasi Bot
 * Semua setting utama ada di sini
 */

const fs = require('fs');
const path = require('path');

// Default config
const defaultConfig = {
  telegram: {
    token: '7278336276:AAEW46O1f9nnW8-eOMUn8lhNcyXfv-Vs22c',
    owners: ['6564704455'], // Owner default
    allowedUsers: [], // User yang diizinkan
  },
  channel: {
    required: '@Qiventory',
    checkInterval: 3600000, // 1 jam sekali cek membership
  },
  whatsapp: {
    sessionPath: './sessions',
    reconnectDelay: 5000,
    groupCreation: {
      maxCount: 50, // Maksimum grup yang bisa dibuat sekaligus
      delay: 3000, // Delay antar pembuatan grup (ms)
      cooldown: 5, // Cooldown dalam menit
    }
  },
  wibuMode: {
    level: 'akut', // 'normal', 'weeb', 'akut'
    useEmojis: true,
  }
};

// Path ke file konfigurasi
const CONFIG_PATH = path.join(__dirname, '../config.json');

// Load konfigurasi dari file jika ada
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const fileConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      
      // Merge dengan default config
      const config = {
        telegram: { ...defaultConfig.telegram, ...fileConfig.telegram },
        channel: { ...defaultConfig.channel, ...fileConfig.channel },
        whatsapp: { ...defaultConfig.whatsapp, ...fileConfig.whatsapp },
        wibuMode: { ...defaultConfig.wibuMode, ...fileConfig.wibuMode }
      };
      
      // Pastikan owner utama selalu ada
      if (config.telegram.owners && !config.telegram.owners.includes(defaultConfig.telegram.owners[0])) {
        config.telegram.owners.push(defaultConfig.telegram.owners[0]);
      }
      
      return config;
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  
  // Return default jika gagal load
  return defaultConfig;
}

// Simpan konfigurasi ke file
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

// Export config aktif
const activeConfig = loadConfig();

module.exports = {
  config: activeConfig,
  saveConfig: (newConfig) => {
    // Update config di memory
    Object.assign(activeConfig, newConfig);
    // Save ke file
    return saveConfig(activeConfig);
  }
};