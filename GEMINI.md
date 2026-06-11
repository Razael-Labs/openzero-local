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

### 2. Auto Versioning (SemVer) (`VERSION`, `src/version.js` & `src/scripts/updateVersion.js`)
*   **SemVer Format:** Menggunakan penomoran versi berbasis SemVer secara terpusat di file root `VERSION`.
*   **Auto Deployment Update & Bump:** Versi dapat diperbarui otomatis dengan menjalankan perintah:
    ```bash
    npm run version:bump [major|minor|patch] [amount]
    ```
    Perintah ini akan menaikkan nomor versi sesuai tipe bump dan jumlah (amount) yang dipilih. Nilai `[amount]` secara default adalah `auto` (yang otomatis menghitung jumlah commit git sejak update versi terakhir), namun Anda juga dapat memasukkan angka spesifik seperti `npm run version:bump patch 20` untuk menaikkan versi patch sebanyak 20. Skrip ini menyinkronkan versi secara konsisten ke file root `VERSION`, `package.json`, dan `src/version.js`.

### 3. Event Handler (`src/handlers/eventHandler.js`)
Membaca seluruh file di dalam direktori `src/events/` secara otomatis pada startup dan mendaftarkannya ke client Discord listener.

### 4. Command Handler (`src/handlers/commandHandler.js`)
Membaca subfolder di dalam `src/commands/` secara dinamis. Mendukung **Slash Commands** dan **Context Menu Commands**. 
*   **Guild Instant Deployment**: Jika variabel `GUILD_ID` pada berkas `.env` diisi, pendaftaran command dilakukan secara **instan** langsung ke server tujuan (sangat direkomendasikan untuk masa development).

### 5. Cooldown & Anti-Spam (`src/events/interactionCreate.js`)
Sistem pertahanan bot yang membatasi eksekusi command sebesar **3 detik** per perintah per pengguna. Menampilkan hitungan mundur secara privat (*ephemeral*) menggunakan `V2Embed` jika pengguna melakukan spamming.

### 6. Mesin Internasionalisasi & Lokalisasi / i18n (`src/utils/i18n.js`)
Menyediakan utilitas `t(key, locale, replaceData)` untuk menerjemahkan teks respon bot secara dinamis berdasarkan bahasa klien (Discord client locale) pengguna yang melakukan interaksi. Mendukung Bahasa Indonesia (`id`) dan Inggris (`en`) (secara bawaan/default menggunakan **Bahasa Inggris**). File kamus bahasa disimpan di folder `src/locales/`.

### 7. Integrasi Supabase & Fallback Database Lokal (`src/utils/supabase.js` & `src/utils/database.js`)
*   **Supabase Log:** Mencatat seluruh pesan guild yang masuk ke tabel Supabase `message_records` untuk keperluan pemantauan perilaku buruk (*bad behavior monitoring*).
*   **7-Day Auto Cleanup:** Bot secara rutin menghapus pesan berumur lebih dari 7 hari dari database pada startup dan setiap interval 24 jam sekali.
*   **Local Fallback:** Jika berkas `.env` belum dikonfigurasi dengan URL & Key Supabase, sistem secara otomatis mengalihkan penyimpanan data pesan secara lokal ke dalam `data/database.json`. Hal ini membuat bot aman dari crash dan mudah ditest secara offline.

---

## Integrasi Discord Components V2 & `V2Embed`

Discord memperkenalkan **Message Components V2** (`ContainerBuilder`, `TextDisplayBuilder`, dll.) untuk menggantikan legacy embeds. Utilitas **`src/utils/v2Embed.js`** dibuat sebagai kelas pembantu dengan antarmuka fluida (*fluent API*).

### Aksen Warna Embed (`colorStrategy`)
Warna aksen dasar embed diatur melalui strategi pewarnaan fleksibel (`colorStrategy`) di root `config.js`. Mendukung kelas pewarnaan:
*   `SpecificColor`: Menggunakan satu warna spesifik yang tetap.
*   `SequentialColor`: Memutar daftar warna secara berurutan pada setiap pembuatan embed.
*   `RandomColor`: Memilih warna secara acak dari daftar pilihan warna.

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

### 4. Perintah Pemutar Musik (`/play`, `/pause`, `/resume`, `/skip`, `/stop`, `/queue`) (Music Player)
Memutar dan mengontrol musik dari YouTube di saluran suara.
*   **Dual Pipeline System:** Menggunakan `yt-dlp` sebagai pemecah metadata dan pemutar utama dengan argumen bypass blokir (`--js-runtimes node`, `--remote-components ejs:github`, dan `--extractor-args "youtube:player_client=android,web"`, yang secara otomatis dinonaktifkan ketika file cookie terdeteksi guna memberikan fallback otomatis ke client yang mendukung seperti `tv downgraded` untuk menghindari SABR streaming). Untuk pencarian via URL langsung, sistem akan mencoba memecahkan metadata secara instan menggunakan `play-dl` sebelum beralih ke `yt-dlp`. Untuk optimalisasi kueri metadata, query `yt-dlp` juga menggunakan flag `--flat-playlist`, `--no-check-certificates`, dan `--no-call-home`.
*   **Netscape Cookies Support:** Mendukung cookie berformat Netscape untuk melewati pembatasan usia dan deteksi bot pada YouTube. Jalur file cookie dapat ditentukan melalui variabel lingkungan `YTDLP_COOKIES_PATH` di `.env` (atau menggunakan file fallback `cookies.txt`/`cookie.txt` di root direktori jika tersedia).
*   **Sistem Cache Metadata:** Ditambahkan in-memory cache (`metadataCache`) berdurasi 30 menit (TTL) yang menyimpan data metadata track untuk menghindari pemanggilan `yt-dlp` berulang bagi query pencarian yang sama.
*   **Discord Presence/Activity Dinamis:** Status aktivitas bot diperbarui secara dinamis. Saat bot sedang memutar musik, aktivitas disetel ke **Listening `{track_name}`**. Saat musik dijeda (paused), dihentikan (stopped), atau saat sesi musik hancur, status dikembalikan secara otomatis menjadi **Watching `/help | /menu`**.
*   **Fallback Guard:** Jika `yt-dlp` gagal karena limitasi / pembatasan akses (`429` atau `Too Many Requests`), proses akan dihentikan langsung untuk menghindari fallback ke `play-dl`. Jika proses dihentikan paksa (SIGTERM) akibat perintah `/skip` atau `/stop`, sistem akan melempar error `Aborted` dan keluar secara diam-diam (*silent catch*).
*   **24/7 Autoplay:** Jika mode 24/7 aktif dan antrean lagu habis, bot secara otomatis akan memuat dan memutar musik/lofi santai secara acak dari daftar pustaka bawaan untuk menjaga aktivitas saluran suara.
*   **Mock Bypass:** Proses pencarian/streaming `yt-dlp` dilewati secara otomatis saat pengujian (`process.env.NODE_ENV === 'test'`) untuk menghindari timeout pada unit testing.

### 5. Perintah `/music-search` (Utility)
Mencari trek lagu di Apple iTunes Search API dan menampilkan hasilnya dengan visual premium menggunakan layout Discord Message Components V2.
*   **`/music-search [query]`**: Mencari lagu berdasarkan judul atau artis. Hasil pencarian menampilkan gambar sampul album (cover art) resolusi tinggi dan memiliki navigasi halaman.
*   **Tombol 🎤 Lirik #X**: Mengambil lirik lagu secara instan langsung dari API LRCLIB.
*   **Tombol 🎵 Preview #X**: Tautan eksternal pratinjau audio lagu jika tersedia.
*   Mendukung lokalisasi i18n penuh (Bahasa Indonesia / Inggris).

### 6. Perintah `/help` & `/menu` (Utility)
Menampilkan menu bantuan interaktif dengan daftar perintah bot yang dikelompokkan secara dinamis berdasarkan kategori.
*   Menggunakan layout **Discord Message Components V2** (`V2Embed`).
*   Menggunakan emoji kustom Font Awesome (seperti `oz_border_all` untuk Semua, `oz_black_tie` untuk Moderasi, `oz_music` untuk Musik, `oz_tools` untuk Utility, `oz_discord` untuk kategori, dan `oz_letterboxd` untuk ringkasan) yang disiapkan melalui skrip `npm run setup-emojis`.
*   Mempunyai format judul yang disesuaikan menjadi `<icon> Help Menu` (misal: `oz_discord Help Menu`).
*   Mendukung lokalisasi i18n penuh (Bahasa Indonesia / Inggris, default ke Bahasa Inggris).

### 7. Context Menu: `Translate to English` (Apps Selection)
Penerjemah pesan otomatis yang diintegrasikan ke menu konteks Discord.
*   Pesan diterjemahkan menggunakan `@vitalets/google-translate-api` secara gratis dan murni lokal.

### 8. Context Menu Terkonsolidasi: `User Info` (Apps Selection)
Perintah klik kanan pengguna satu pintu yang menggabungkan seluruh informasi profil:
*   Informasi global (Username, ID, Akun Bot/Sistem, Lencana/Badges, Banner Color).
*   Informasi khusus Server (Nickname server, Role, Key permissions, Status Booster).
*   Tanggal bergabung Discord & Server.
*   Informasi status presence (Online, idle, dnd, playing game, Spotify, dll).
*   Statistik Pesan Terkirim (`Messages Sent`) di server.
*   Tombol download Avatar Global, Server Avatar, dan Banner Image.
*   Respon output mendukung lokalisasi bahasa (Indonesia/Inggris) berdasarkan bahasa klien pengguna.

### 9. Context Menu: `Messages Record` (Apps Selection)
Mengambil riwayat pesan yang dikirim oleh target pengguna di berbagai channel server ini selama 7 hari terakhir. Digunakan oleh moderator untuk memonitor perilaku pengguna. Respon output mendukung lokalisasi bahasa.

### 10. Perintah `/fox` (Utility / AI Agent)
Memanggil asisten kecerdasan buatan Fox (AI Agent) secara langsung via prompt text.
*   Mendukung integrasi **Groq API** (model default `gemma2-9b-it`) untuk merespon obrolan.
*   Menggunakan skema *Function Calling/Tool Use* untuk memicu plugin secara otomatis (seperti membuat webhook, memutar lagu, atau menambah role) berdasarkan wacana natural pengguna.
*   Secara otomatis mendeteksi jika bot di-ping/mention di chat room dan memproses obrolan serupa.

### 11. Perintah `/plugin` (Utility / Plugin Manager)
Menginstal dan menghapus modul plugin AI secara dinamis tanpa perlu me-restart bot.
*   **`/plugin list`**: Menampilkan daftar semua plugin dan status keaktifan saat ini.
*   **`/plugin install [name]`**: Mengaktifkan plugin dan mendaftarkan perintah terkait ke Discord API secara instan.
*   **`/plugin uninstall [name]`**: Menonaktifkan plugin dan menghapus perintah terkait dari Discord API secara instan.

---

## Integrasi Sistem AI Agent & Plugin
Bot ini dilengkapi dengan arsitektur agen cerdas modular di bawah direktori `src/plugins/`:
*   **AI Engine**: Menggunakan API OpenAI-compatible dari Groq.com dengan penanganan fallback otomatis. Jika model tidak mendukung *tool calling* (seperti gemma2-9b-it), request secara otomatis dikirim ulang tanpa parameter tools untuk menjamin bot tetap memberikan respon obrolan.
*   **Histori Obrolan Persisten**: Percakapan pengguna disimpan secara berurutan ke tabel Supabase `ai_chat_history`. Jika koneksi terputus atau tabel belum dibuat, sistem secara otomatis mengalihkan penyimpanan (*failover*) secara lokal ke `data/database.json`.
*   **Modularitas Plugin**: Setiap fungsi bot dibungkus sebagai plugin terisolasi (seperti `webhookPlugin`, `musicPlugin`, `rolePlugin`). Status keaktifan plugin dikontrol oleh `/plugin` dan dipantau oleh `src/utils/pluginManager.js`.

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

* **`release`**: Merupakan branch utama/produksi yang stabil. Semua update di branch ini dikelola dan digabungkan oleh **Razael-Fox Bot**.
* **`dev`**: Merupakan branch aktif untuk pengerjaan kode/perbaikan oleh pengembang menggunakan profil pengguna personal (`razaeldotexe`).
