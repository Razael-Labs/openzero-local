# OpenZero Discord Bot: Gemini Developer Guide

Selamat datang di dokumentasi pengenalan proyek **OpenZero Discord Bot**. Dokumentasi ini dirancang khusus untuk memberikan pemahaman cepat bagi developer maupun model kecerdasan buatan seperti **Google Gemini** mengenai struktur, arsitektur, dan teknologi yang digunakan di dalam proyek ini.

## Deskripsi Proyek

Proyek ini adalah bot Discord dasar yang sangat modular, dibangun dengan **Node.js** dan menggunakan library **discord.js v14 (terbaru)**. Proyek ini mengadopsi arsitektur berbasis handler dinamis untuk mengelola perintah (*Slash Commands* & *Context Menu Commands*) dan aktivitas (*Events*), serta mengintegrasikan logger kustom berwarna berbasis `winston` dan `chalk`.

Bot ini juga menerapkan **Discord Message Components V2** menggunakan wrapper kustom **`V2Embed`**.

---

## Arsitektur Sistem

Bot ini terbagi menjadi beberapa komponen utama:

### 1. Log Handler (`src/utils/logger.js`)
Menggunakan winston dan chalk untuk menghasilkan pencatatan log berwarna yang rapi, sekaligus menyimpan salinan log ke file `logs/combined.log` dan `logs/error.log`.

### 2. Event Handler (`src/handlers/eventHandler.js`)
Membaca seluruh file di dalam direktori `src/events/` secara otomatis pada startup dan mendaftarkannya ke client Discord listener.

### 3. Command Handler (`src/handlers/commandHandler.js`)
Membaca subfolder di dalam `src/commands/` secara dinamis. Mendukung **Slash Commands** dan **Context Menu Commands**. 
*   **Guild Instant Deployment**: Jika variabel `GUILD_ID` pada berkas `.env` diisi, pendaftaran command dilakukan secara **instan** langsung ke server tujuan (sangat direkomendasikan untuk masa development).

### 4. Cooldown & Anti-Spam (`src/events/interactionCreate.js`)
Sistem pertahanan bot yang membatasi eksekusi command sebesar **3 detik** per perintah per pengguna. Menampilkan hitungan mundur secara privat (*ephemeral*) menggunakan `V2Embed` jika pengguna melakukan spamming.

---

## Integrasi Discord Components V2 & `V2Embed`

Discord memperkenalkan **Message Components V2** (`ContainerBuilder`, `TextDisplayBuilder`, dll.) untuk menggantikan legacy embeds. Utilitas **`src/utils/v2Embed.js`** dibuat sebagai kelas pembantu dengan antarmuka fluida (*fluent API*).

### Aksen Warna Berurutan (Sequential Shuffle)
Warna aksen dasar embed diatur secara berurutan (tidak acak) setiap kali sebuah `V2Embed` dibuat. Berputar secara sekuensial di antara warna berikut (didefinisikan di `src/config.js`):
1. `#6e4cc1` (Ungu)
2. `#242221` (Hitam Gelap)
3. `#f58e25` (Oranye)
4. `#fdfdfd` (Putih)

---

## Perintah Baru yang Ditambahkan

### 1. Perintah `/webhook` (Utility)
Mengelola webhook di server dengan hak akses `ManageWebhooks`.
*   **`/webhook create [title] [channel] [pfp]`**: Membuat webhook baru.
*   **`/webhook info [id_or_url]`**: Melihat detail dari webhook tertentu.

### 2. Perintah `/role` (Utility)
Mengelola role pengguna di server dengan hak akses `ManageRoles`.
*   **`/role add [user] [role]`**: Memberikan role ke pengguna.
*   **`/role remove [user] [role]`**: Menghapus role dari pengguna.
*   **`/role id [role]`**: Mengecek ID dan informasi detail sebuah role.

### 3. Perintah `/purge` (Moderation)
Menghapus pesan secara massal di saluran teks dengan hak akses `ManageMessages`.
*   **`/purge [amount]`**: Menghapus pesan (1-100, default: 100). Otomatis menyaring pesan yang berumur lebih dari 14 hari agar tidak menimbulkan error API.

### 4. Context Menu Command: `Translate to English` (Apps Selection)
Penerjemah pesan otomatis yang diintegrasikan ke menu konteks Discord.
*   **Cara kerja**: Pengguna menekan lama/klik kanan pesan -> **Apps** -> **Translate to English**. 
*   Pesan akan diterjemahkan secara otomatis menggunakan `@vitalets/google-translate-api` secara gratis, murni secara lokal/HTTP di Termux tanpa memerlukan kartu kredit atau Docker.

---

## Cara Menjalankan & Menguji Proyek

1. Pasang dependensi proyek:
   ```bash
   npm install
   ```
2. Jalankan pengujian unit (unit tests) menggunakan Jest:
   ```bash
   npm test
   ```
3. Jalankan bot utama:
   * **Produksi**: `npm start`
   * **Development** (hot-reload): `npm run dev`

---

## Aturan Branching & Workflow Rilis

* **`release`**: Merupakan branch utama/produksi yang stabil. Semua update di branch ini dikelola dan digabungkan oleh **Razael-Fox Bot**. Push ke branch ini otomatis memicu GitHub Actions untuk membuat paket `.tar.gz` proyek dan mempublikasikannya ke halaman rilis GitHub.
* **`dev`**: Merupakan branch aktif untuk pengerjaan kode/perbaikan oleh pengembang menggunakan profil pengguna personal (`razaeldotexe`).
