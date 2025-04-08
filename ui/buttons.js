/**
 * Button Templates
 * Semua inline keyboard buttons ada di sini
 */

// Main menu buttons
const mainMenu = {
  inline_keyboard: [
    [{ text: '🔑 Login WhatsApp', callback_data: 'login' }],
    [{ text: '🌟 Buat Grup', callback_data: 'create_group' }],
    [{ text: '🚫 Keluar Semua Grup', callback_data: 'leave_all_groups' }],
    [{ text: '🔄 Cek Status', callback_data: 'status' }],
    [{ text: '🚪 Logout', callback_data: 'logout' }],
    [{ text: '📝 Bantuan', callback_data: 'help' }]
  ]
};

// Cancel login button
const cancelLogin = {
  inline_keyboard: [
    [{ text: '❌ Cancel Login', callback_data: 'cancel_login' }],
    [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
  ]
};

// Cancel group creation button
const cancelGroupCreation = {
  inline_keyboard: [
    [{ text: '❌ Cancel Pembuatan Grup', callback_data: 'cancel_group' }],
    [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
  ]
};

// Back to main menu button
const backToMenu = {
  inline_keyboard: [
    [{ text: '🏠 Kembali ke Menu Utama', callback_data: 'main_menu' }]
  ]
};

// Help menu button
const helpButtons = {
  inline_keyboard: [
    [{ text: '🏠 Kembali ke Menu Utama', callback_data: 'main_menu' }]
  ]
};

// Join channel buttons
function getJoinChannelButtons(channelName) {
  const cleanChannelName = channelName.startsWith('@') 
    ? channelName.substring(1) 
    : channelName;
    
  return {
    inline_keyboard: [
      [{ text: `✨ Join ${channelName}`, url: `https://t.me/${cleanChannelName}` }],
      [{ text: '🔄 Sudah Join? Refresh', callback_data: 'check_membership' }]
    ]
  };
}

// Status buttons
const connectedStatusButtons = {
  inline_keyboard: [
    [{ text: '🌟 Buat Grup', callback_data: 'create_group' }],
    [{ text: '🚫 Keluar Semua Grup', callback_data: 'leave_all_groups' }],
    [{ text: '🚪 Logout', callback_data: 'logout' }],
    [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
  ]
};

const disconnectedStatusButtons = {
  inline_keyboard: [
    [{ text: '🔑 Login Ulang', callback_data: 'login' }],
    [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
  ]
};

// Response buttons after group creation
const afterGroupCreationButtons = {
  inline_keyboard: [
    [{ text: '🌟 Buat Grup Lagi', callback_data: 'create_group' }],
    [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
  ]
};

// Get custom after group creation buttons (with cooldown)
function getAfterGroupCreationWithCooldownButtons(hasCooldown) {
  if (hasCooldown) {
    return {
      inline_keyboard: [
        [{ text: '🔄 Cek Status', callback_data: 'status' }],
        [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
      ]
    };
  } else {
    return afterGroupCreationButtons;
  }
}

// Try again buttons for errors
const tryAgainButtons = {
  inline_keyboard: [
    [{ text: '🔄 Coba Lagi', callback_data: 'retry_last_action' }],
    [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
  ]
};

module.exports = {
  mainMenu,
  cancelLogin,
  cancelGroupCreation,
  backToMenu,
  helpButtons,
  getJoinChannelButtons,
  connectedStatusButtons,
  disconnectedStatusButtons,
  afterGroupCreationButtons,
  getAfterGroupCreationWithCooldownButtons,
  tryAgainButtons
};