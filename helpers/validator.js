/**
 * Validator
 * Fungsi-fungsi untuk validasi input user
 */

const { config } = require('../config/config');

/**
 * Validasi nomor telepon
 * Format: 62xxxx (tanpa +)
 */
function validatePhoneNumber(phoneNumber) {
  // Hapus spasi dan karakter yang tidak diperlukan
  phoneNumber = phoneNumber.replace(/\s+/g, '').replace(/[-()+]/g, '');
  
  // Cek apakah hanya terdiri dari angka
  if (!/^\d+$/.test(phoneNumber)) {
    return { valid: false, phoneNumber, reason: 'format' };
  }
  
  // Cek panjang nomor (min 10 angka, max 15 angka)
  if (phoneNumber.length < 10 || phoneNumber.length > 15) {
    return { valid: false, phoneNumber, reason: 'length' };
  }
  
  return { valid: true, phoneNumber };
}

/**
 * Validasi nama grup
 */
function validateGroupName(name) {
  // Trim whitespace
  name = name.trim();
  
  // Cek panjang
  if (name.length < 1 || name.length > 20) {
    return { valid: false, name, reason: 'length' };
  }
  
  // Cek karakter yang tidak diperbolehkan
  if (/[<>:"/\\|?*]/.test(name)) {
    return { valid: false, name, reason: 'invalidChars' };
  }
  
  return { valid: true, name };
}

/**
 * Validasi jumlah grup
 */
function validateGroupCount(countStr) {
  const maxAllowed = config.whatsapp.groupCreation.maxCount;
  
  // Convert ke number
  const count = parseInt(countStr.trim(), 10);
  
  // Cek apakah valid number
  if (isNaN(count)) {
    return { valid: false, count: 0, reason: 'notNumber' };
  }
  
  // Cek range
  if (count < 1 || count > maxAllowed) {
    return { valid: false, count, reason: 'outOfRange', maxAllowed };
  }
  
  return { valid: true, count };
}

/**
 * Sanitize teks untuk keamanan
 */
function sanitizeText(text) {
  if (!text) return '';
  
  // Remove any markdown or HTML that could be used for formatting attacks
  return text
    .replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')
    .replace(/<[^>]*>?/gm, '');
}

module.exports = {
  validatePhoneNumber,
  validateGroupName,
  validateGroupCount,
  sanitizeText
};