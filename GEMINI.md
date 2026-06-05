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

### 5. Mesin Internasionalisasi & Lokalisasi / i18n (`src/utils/i18n.js`)
Menyediakan utilitas `t(key, locale, replaceData)` untuk menerjemahkan teks respon bot secara dinamis berdasarkan bahasa klien (Discord client locale) pengguna yang melakukan interaksi. Mendukung Bahasa Indonesia (`id`) dan Inggris (`en`). File kamus bahasa disimpan di folder `src/locales/`.

### 6. Integrasi Supabase & Fallback Database Lokal (`src/utils/supabase.js` & `src/utils/database.js`)
*   **Supabase Log:** Mencatat seluruh pesan guild yang masuk ke tabel Supabase `message_records` untuk keperluan pemantauan perilaku buruk (*bad behavior monitoring*).
*   **7-Day Auto Cleanup:** Bot secara rutin menghapus pesan berumur lebih dari 7 hari dari database pada startup dan setiap interval 24 jam sekali.
*   **Local Fallback:** Jika berkas `.env` belum dikonfigurasi dengan URL & Key Supabase, sistem secara otomatis mengalihkan penyimpanan data pesan secara lokal ke dalam `data/database.json`. Hal ini membuat bot aman dari crash dan mudah ditest secara offline.

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
Mengaktifkan penghapusan pesan secara massal di saluran teks dengan hak akses `ManageMessages`.
*   **`/purge [amount]`**: Menghapus pesan (1-100, default: 100). Otomatis menyaring pesan yang berumur lebih dari 14 hari agar tidak menimbulkan error API.

### 4. Perintah `/music-search` (Utility)
Mencari trek lagu di Apple iTunes Search API dan menampilkan hasilnya dengan visual premium menggunakan layout Discord Message Components V2.
*   **`/music-search [query]`**: Mencari lagu berdasarkan judul atau artis. Hasil pencarian menampilkan gambar sampul album (cover art) resolusi tinggi dan memiliki navigasi halaman.
*   **Tombol 🎤 Lirik #X**: Mengambil lirik lagu secara instan langsung dari API LRCLIB.
*   **Tombol 🎵 Preview #X**: Tautan eksternal pratinjau audio lagu jika tersedia.
*   Mendukung lokalisasi i18n penuh (Bahasa Indonesia / Inggris).

### 5. Context Menu: `Translate to English` (Apps Selection)
Penerjemah pesan otomatis yang diintegrasikan ke menu konteks Discord.
*   Pesan diterjemahkan menggunakan `@vitalets/google-translate-api` secara gratis dan murni lokal.

### 6. Context Menu Terkonsolidasi: `User Info` (Apps Selection)
Perintah klik kanan pengguna satu pintu yang menggabungkan seluruh informasi profil:
*   Informasi global (Username, ID, Akun Bot/Sistem, Lencana/Badges, Banner Color).
*   Informasi khusus Server (Nickname server, Role, Key permissions, Status Booster).
*   Tanggal bergabung Discord & Server.
*   Informasi status presence (Online, idle, dnd, playing game, Spotify, dll).
*   Statistik Pesan Terkirim (`Messages Sent`) di server.
*   Tombol download Avatar Global, Server Avatar, dan Banner Image.
*   Respon output mendukung lokalisasi bahasa (Indonesia/Inggris) berdasarkan bahasa klien pengguna.

### 7. Context Menu: `Messages Record` (Apps Selection)
Mengambil riwayat pesan yang dikirim oleh target pengguna di berbagai channel server ini selama 7 hari terakhir. Digunakan oleh moderator untuk memonitor perilaku pengguna. Respon output mendukung lokalisasi bahasa.

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
