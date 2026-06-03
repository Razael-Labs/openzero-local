# OpenZero Discord Bot: Gemini Developer Guide

Selamat datang di dokumentasi pengenalan proyek **OpenZero Discord Bot**. Dokumentasi ini dirancang khusus untuk memberikan pemahaman cepat bagi developer maupun model kecerdasan buatan seperti **Google Gemini** mengenai struktur, arsitektur, dan teknologi yang digunakan di dalam proyek ini.

## Deskripsi Proyek

Proyek ini adalah bot Discord dasar yang sangat modular, dibangun dengan **Node.js** dan menggunakan library **discord.js v14 (terbaru)**. Proyek ini mengadopsi arsitektur berbasis handler dinamis untuk mengelola perintah (*Slash Commands*) dan aktivitas (*Events*), serta mengintegrasikan logger kustom berwarna berbasis `winston` dan `chalk`.

Bot ini juga menjadi percontohan awal dalam penerapan **Discord Message Components V2** (layout modern baru dari Discord API) menggunakan wrapper kustom **`V2Embed`**.

---

## Arsitektur Sistem

Bot ini terbagi menjadi empat komponen utama (Handlers):

### 1. Log Handler (`src/utils/logger.js`)
Menggunakan gabungan library `winston` dan `chalk` untuk menghasilkan pencatatan log berwarna yang rapi dengan timestamp abu-abu di terminal, sekaligus menyimpan salinan log ke file `logs/combined.log` (semua aktivitas) dan `logs/error.log` (hanya log tingkat kesalahan).

### 2. Event Handler (`src/handlers/eventHandler.js`)
Membaca seluruh file JavaScript di dalam direktori `src/events/` secara otomatis pada startup dan mendaftarkannya ke dalam client Discord listener (`client.on` atau `client.once` berdasarkan properti `once: true/false`).

### 3. Command Handler (`src/handlers/commandHandler.js`)
Membaca subfolder di dalam `src/commands/` secara dinamis, memuat slash commands ke koleksi client, dan mendaftarkannya ke Discord API. 
*   **Guild Instant Deployment**: Jika variabel `GUILD_ID` pada berkas `.env` diisi, pendaftaran command akan dilakukan secara **instan** langsung ke server tersebut (sangat direkomendasikan untuk masa development).
*   **Global Fallback**: Jika dikosongkan, pendaftaran beralih secara global (memakan waktu hingga 1 jam).

### 4. Message Handler (`src/events/messageCreate.js`)
Berfungsi murni sebagai pengawas chat (*chat logs observer*) demi memantau aktivitas server. Penanganan perintah (*commands*) telah sepenuhnya dipindahkan ke Slash Commands murni agar lebih aman dan terstruktur.

---

## Integrasi Discord Components V2 & `V2Embed`

Discord memperkenalkan **Message Components V2** (`ContainerBuilder`, `TextDisplayBuilder`, dll.) untuk menggantikan legacy embeds. Kami membuat utilitas **`src/utils/v2Embed.js`** sebagai kelas pembantu dengan antarmuka fluida (*fluent API*) mirip `EmbedBuilder` tradisional.

### Contoh Pembuatan Embed & Button V2:
```javascript
import { V2Embed } from './utils/v2Embed.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';

const buttonRow = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('btn_ok').setLabel('Setuju').setStyle(ButtonStyle.Success)
);

const embed = new V2Embed()
  .setTitle('Informasi Penting')
  .setDescription('Silakan klik tombol di bawah untuk menyetujui.')
  .setColor(0xffd700) // Default warna emas
  .addActionRow(buttonRow) // Tombol disematkan di dalam kontainer embed
  .build();

// Kirim dengan flag IsComponentsV2
await interaction.reply({
  components: [embed],
  flags: MessageFlags.IsComponentsV2
});
```

## Perintah Baru yang Ditambahkan

### 1. Perintah `/webhook`
Digunakan untuk mengelola webhook di server dengan hak akses `ManageWebhooks`.
*   **`/webhook create [title] [channel] [pfp]`**: Membuat webhook baru di channel teks, pengumuman, atau voice. Menampilkan tombol interaktif **"Salin URL Webhook"** untuk menyalin tautan.
*   **`/webhook info [id_or_url]`**: Melihat informasi detail dari webhook tertentu berdasarkan ID atau URL lengkap. Juga dilengkapi dengan tombol **"Salin URL Webhook"**.

### 2. Perintah `/role`
Digunakan untuk mengelola role pengguna di server secara cepat dengan hak akses `ManageRoles`.
*   **`/role add [user] [role]`**: Memberikan role ke pengguna yang ditunjuk (dengan proteksi hierarki).
*   **`/role remove [user] [role]`**: Menghapus role dari pengguna yang ditunjuk.
*   **`/role id [role]`**: Mengecek informasi detail (ID, Nama Teks, Kode Warna Hex, dan Posisi Hierarki) dari role spesifik secara cepat.

---

## Cara Menjalankan Proyek

1. Pasang dependensi proyek:
   ```bash
   npm install
   ```
2. Salin `.env.example` menjadi `.env` dan lengkapi kredensial Discord Anda:
   ```env
   DISCORD_TOKEN=TokenBotAnda
   CLIENT_ID=IDBotAnda
   GUILD_ID=IDServerAnda
   ```
3. Posting atau edit Peraturan Server (Rules) ke channel spesifik:
   ```bash
   npm run send-rules
   ```
4. Jalankan bot utama:
   * **Produksi**: `npm start`
   * **Development** (hot-reload otomatis): `npm run dev`
