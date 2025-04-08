/**
 * Wibu Message Templates
 * Koleksi template pesan dengan style wibu akut
 */

const { config } = require('../config/config');

// Emoji library
const emojis = {
  success: '✨',
  error: '💢',
  warning: '⚠️',
  info: '💫',
  wait: '⏳',
  done: '✅',
  kawaii: ['(´｡• ᵕ •｡`)', '(◕‿◕)', '(✿◠‿◠)', '(◕ᴗ◕✿)', '(づ｡◕‿‿◕｡)づ']
};

// Random kawaii face
function getRandomKawaii() {
  const kawaiiFaces = emojis.kawaii;
  return kawaiiFaces[Math.floor(Math.random() * kawaiiFaces.length)];
}

// Message templates
const messageTemplates = {
  // Welcome messages
  welcome: `
*🌸 Ohayou gozaimasu, Senpai~! 🌸*

Selamat datang di *WhatsApp-Telegram Bridge* versi wibu akut! ${getRandomKawaii()}

Aku akan membantu Senpai membuat grup WhatsApp kosong yang super kawaii! Pilih opsi di bawah untuk mulai ya~

_Jangan lupa join channel @Qiventory untuk tetap dapat akses!_
  `,
  
  // Login messages
  loginPrompt: `
*🔑 Login WhatsApp~*

Masukkan nomor WhatsApp Senpai dengan kode negara (tanpa +):

Contoh:
• 628123456789 (Indonesia)
• 12025550179 (USA)

_Akan kubuat pairing code untuk Senpai~ ${getRandomKawaii()}_
  `,
  
  processingPairingCode: `
*⏳ Chotto matte kudasai...*

Sedang membuat pairing code untuk Senpai~
_Ini mungkin butuh beberapa detik, harap sabar ya! ${getRandomKawaii()}_
  `,
  
  pairingCodeSuccess: (data) => `
*🔑 Pairing Code Berhasil!*

\`${data.code}\`

Masukkan kode di atas ke WhatsApp Senpai dalam 60 detik!
_Buka WhatsApp > Perangkat Tertaut > Tautkan Perangkat > Kode Pemakaian_

_Jika terputus, akan ku-reconnect otomatis! Ganbarimasu~_ (ง •̀\\_•́)ง
  `,
  
  pairingCodeError: (data) => `
*💢 Yabai! Error desu!*

Tidak bisa generate pairing code: ${data.error}

_Coba gunakan nomor lain atau coba lagi nanti ya, Senpai!_

Gomennasai... (╥﹏╥)
  `,
  
  // Connection messages
  connectionSuccess: `
*✨ Yatta! Berhasil terhubung!*

WhatsApp Senpai sudah terhubung dengan botku! 
Sekarang Senpai bisa membuat grup WhatsApp melalui Telegram~!

_Apa yang ingin Senpai lakukan selanjutnya?_ (◕ᴗ◕✿)
  `,
  
  reconnectSuccess: `
*✨ Reconnect Berhasil Desu!*

WhatsApp sudah terhubung kembali! Yokatta ne~!

_Silahkan lanjutkan aktivitas Senpai~_ ${getRandomKawaii()}
  `,
  
  connectionError: (data) => `
*💢 Connection Error!*

Tidak bisa terhubung ke WhatsApp: ${data.error}

_Coba lagi nanti ya, Senpai!_ (╯°□°）╯︵ ┻━┻
  `,
  
  connectionLost: (data) => `
*⚠️ Koneksi Terputus!*

Alasan: ${data.reason}

_Sedang mencoba reconnect... Ganbare!_ (ง •̀_•́)ง
_Tunggu sebentar ya Senpai~_
  `,
  
  connectionLostPermanent: `
*💢 Koneksi Terputus Permanen!*

Senpai perlu login ulang dengan pairing code lagi...
_Session WhatsApp mungkin telah dihapus atau expired._

Gomennasai... (╥﹏╥)
  `,
  
  // Group creation messages
  createGroupIntro: `
*🌟 Sugoi! Mari Buat Grup~*

Ikuti langkah-langkah berikut untuk membuat grup kosong:

1️⃣ Kirim nama dasar grup
2️⃣ Kirim jumlah grup yang diinginkan
3️⃣ Tunggu proses selesai

_Contoh: Jika nama "Wibu", akan dibuat "Wibu 1", "Wibu 2", dst._

_Silahkan kirim nama dasar grup sekarang~_ ${getRandomKawaii()}
  `,
  
  groupNameInvalid: (data) => {
    if (data.reason === 'length') {
      return `
*⚠️ Nama Grup Invalid!*

Nama grup harus 1-20 karakter, Senpai!
_Nama "${data.name}" terlalu panjang/pendek desu~_

_Coba kirim nama yang lebih singkat ya~_ (・ω<)☆
      `;
    } else {
      return `
*⚠️ Nama Grup Invalid!*

Nama grup tidak boleh mengandung karakter: < > : " / \\ | ? *
_Coba nama yang lebih simple, Senpai~_ (・ω<)☆
      `;
    }
  },
  
  askGroupCount: (data) => `
*🔢 Nama "${data.name}" Diterima!*

Sekarang kirim jumlah grup yang ingin dibuat (max ${data.maxCount}):

_Ingat, semakin banyak grup = semakin lama prosesnya~_ ${getRandomKawaii()}
  `,
  
  groupCountInvalid: (data) => {
    if (data.reason === 'notNumber') {
      return `
*💢 Baka! Itu bukan angka!*

Kirim angka antara 1-${data.maxCount} saja ya~!
_Coba lagi, Senpai~_ (≧◡≦)
      `;
    } else {
      return `
*💢 Jumlah Invalid!*

Jumlah grup harus antara 1-${data.maxCount} saja!
_Senpai meminta ${data.count} grup, itu diluar batas~_

_Coba kirim angka yang valid ya~_ (≧◡≦)
      `;
    }
  },
  
  creatingGroups: (data) => `
*⏳ Harap Tunggu~*

Mencoba membuat ${data.count} grup dengan nama dasar "${data.name}"...

_Proses ini membutuhkan waktu karena ada anti-limit protection_
_Mohon bersabar ya Senpai~_ (￣▽￣)ゞ
  `,
  
  creatingGroupsProgress: (data) => `
*⏳ Sedang Membuat Grup...*

Base Name: *${data.name}*
Progress: ${data.current}/${data.total} (${Math.round(data.current/data.total*100)}%)

✅ Berhasil: ${data.success}
❌ Gagal: ${data.failed}

_Link grup akan dikirim setelah semua grup selesai dibuat~_
_Mohon tunggu sebentar lagi, Senpai~_ ${getRandomKawaii()}
  `,
  
  groupCreated: (data) => `
*✅ Grup "${data.name}" Berhasil Dibuat!*

🔗 *Link Invite:* ${data.link}

_Simpan link ini baik-baik ya Senpai!_ ${getRandomKawaii()}
  `,
  
  groupCreationError: (data) => `
*💢 Gagal Membuat Grup "${data.name}"!*

Error: ${data.error}

_Gomennasai! Akan terus mencoba grup lainnya~_ (╥﹏╥)
  `,
  
  groupCreationComplete: (data) => `
*🎉 Yatta! Pembuatan Grup Selesai!*

✅ Berhasil: ${data.success} grup
❌ Gagal: ${data.failed} grup

_Terima kasih sudah menggunakan layanan ku, Senpai~!_ ${getRandomKawaii()}

*Cooldown: ${data.cooldownMinutes} menit*
_Harus menunggu dulu sebelum buat grup lagi~_
  `,
  
  groupCreationCooldown: (data) => `
*⏰ Ara Ara~ Sabar Dulu!*

Senpai harus menunggu ${data.timeLeft} menit lagi sebelum bisa membuat grup baru!

_Ini untuk menghindari limit dari WhatsApp~_
_Coba lagi nanti ya~_ (・ω<)
  `,
  
  // Status messages  
  statusConnected: `
*✅ WhatsApp Status: ONLINE!*

Bot aktif dan siap menerima perintah Senpai!
_Sugoi desu ne~_ ${getRandomKawaii()}
  `,
  
  statusDisconnected: `
*⚠️ WhatsApp Status: OFFLINE!*

Bot sedang mencoba reconnect...
_Harap tunggu sebentar ya~_ (＞﹏＜)
  `,
  
  statusNotLoggedIn: `
*💢 Belum Login!*

Senpai belum login ke WhatsApp!
_Silahkan login dulu dengan menekan tombol Login~_ ${getRandomKawaii()}
  `,
  
  // Leave all groups messages
  confirmLeaveAllGroups: `
*⚠️ Yakin Mau Keluar Semua Grup?*

Senpai akan keluar dari SEMUA grup WhatsApp yang terdaftar!
_Proses ini tidak bisa dibatalkan!_

Yakin mau lanjut? (｡•́︿•̀｡)
  `,
  
  leavingAllGroups: `
*⏳ Sedang Keluar dari Semua Grup...*

_Chotto matte kudasai~ Proses ini membutuhkan waktu karena ada anti-limit protection..._

Mohon tunggu sampai proses selesai ya, Senpai! ${getRandomKawaii()}
  `,
  
  groupLeft: (data) => `
*✅ Berhasil Keluar dari Grup!*

Grup: *${data.name}*
Progress: ${data.current}/${data.total}

_Masih ada ${data.total - data.current} grup lagi~_
  `,
  
  groupLeaveFailed: (data) => `
*❌ Gagal Keluar dari Grup!*

Grup: *${data.name}*
Error: ${data.error}
Progress: ${data.current}/${data.total}

_Tetap mencoba grup lainnya..._
  `,
  
  leaveAllGroupsComplete: (data) => `
*✨ Selesai Keluar dari Grup!*

Total Grup: ${data.totalGroups}
✅ Berhasil: ${data.leftGroups}
❌ Gagal: ${data.failedGroups}

_Mission complete, Senpai!_ ${getRandomKawaii()}
  `,
  
  leaveAllGroupsError: (data) => `
*💢 Error Saat Keluar dari Grup!*

Error: ${data.error}

_Gomennasai, Senpai..._ (╥﹏╥)
  `,
  
  noGroupsToLeave: `
*⚠️ Tidak Ada Grup!*

Senpai tidak tergabung dalam grup WhatsApp manapun!
_Tidak ada yang perlu ditinggalkan~_ ${getRandomKawaii()}
  `,
  
  // Logout messages
  logoutSuccess: `
*👋 Logout Berhasil!*

WhatsApp sudah dimatikan dan session dihapus!
_Sayonara~ Sampai jumpa lagi, Senpai!_ ${getRandomKawaii()}
  `,
  
  logoutError: (data) => `
*💢 Error saat Logout!*

Error: ${data.error}
_Tapi tetap mencoba menghapus session lokal~_

Session sudah dihapus dari database! ${getRandomKawaii()}
  `,
  
  // Cancel messages
  loginCancelled: `
*✅ Login Dibatalkan!*

Proses login telah dibatalkan.
_Kembali ke menu utama~_ ${getRandomKawaii()}
  `,
  
  groupCreationCancelled: `
*✅ Pembuatan Grup Dibatalkan!*

Proses pembuatan grup telah dibatalkan.
_Kembali ke menu utama~_ ${getRandomKawaii()}
  `,
  
  // Help message
  helpMessage: `
*📚 Panduan Penggunaan Bot Kawaii 📚*

*🔑 Login WhatsApp*
1. Klik tombol "Login WhatsApp"
2. Masukkan nomor dengan kode negara (tanpa +)
3. Masukkan kode pairing di aplikasi WhatsApp

*🌟 Buat Grup*
1. Klik tombol "Buat Grup"
2. Kirim nama dasar grup (misal: "Anime")
3. Kirim jumlah grup (1-${config.whatsapp.groupCreation.maxCount})
4. Bot akan membuatkan grup dan kirim link join

*🚫 Keluar Semua Grup*
1. Klik tombol "Keluar Semua Grup"
2. Konfirmasi pilihan kamu
3. Bot akan keluar dari semua grup WhatsApp

*🔄 Cek Status*
Klik untuk melihat status koneksi WhatsApp

*🚪 Logout*
Klik untuk logout dan hapus session WhatsApp

*📝 Catatan Penting:*
• Join channel @Qiventory untuk akses penuh
• Bot punya anti-limit protection
• Cooldown: ${config.whatsapp.groupCreation.cooldown} menit
• Max grup per sesi: ${config.whatsapp.groupCreation.maxCount}

*Made with ❤️ by Qiventory*
  `,
  
  // Access denied
  accessDenied: `
*⛔ Akses Ditolak!*

Gomennasai! Kamu belum diizinkan menggunakan bot ini! (╥﹏╥)
_Hubungi owner untuk mendapatkan akses~_
  `,
  
  // Channel membership required
  channelRequired: (data) => `
*⚠️ Ara Ara~ Join Channel Dulu!*

Kamu harus join channel ${data.channel} sebelum menggunakan bot ini! 

_Klik tombol di bawah untuk join~_ ${getRandomKawaii()}
  `,
  
  // Generic messages
  error: (data) => `
*💢 Error Desu!*

${data.message || 'Terjadi kesalahan yang tidak diketahui'}

_Gomennasai, Senpai..._ (╥﹏╥)
  `,
  
  success: (data) => `
*✨ Sukses Desu!*

${data.message || 'Operasi berhasil dilakukan'}

_Yokatta ne~_ ${getRandomKawaii()}
  `
};

/**
 * Get wibu message by key
 */
function getWibuMessage(key, data = {}) {
  if (typeof messageTemplates[key] === 'function') {
    return messageTemplates[key](data).trim();
  } else if (messageTemplates[key]) {
    return messageTemplates[key].trim();
  }
  
  return `No message template found for key: ${key}`;
}

module.exports = {
  getWibuMessage,
  getRandomKawaii
};