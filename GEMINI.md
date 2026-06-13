# OpenZero Discord Bot: Gemini Developer Guide

Selamat datang di dokumentasi pengenalan proyek **OpenZero Discord Bot**. Dokumentasi ini dirancang khusus untuk memberikan pemahaman cepat bagi developer maupun model kecerdasan buatan seperti **Google Gemini** mengenai struktur, arsitektur, dan teknologi yang digunakan di dalam proyek ini.

## Deskripsi Proyek

Proyek ini adalah bot Discord dasar yang sangat modular, dibangun dengan **Node.js** dan menggunakan library **discord.js v14 (terbaru)**. Proyek ini mengadopsi arsitektur berbasis handler dinamis untuk mengelola perintah (*Slash Commands* & *Context Menu Commands*) dan aktivitas (*Events*), serta mengintegrasikan logger kustom berwarna berbasis `winston` dan `chalk`.

Bot ini juga menerapkan **Discord Message Components V2** menggunakan wrapper kustom **`V2Embed`**.

---

## Arsitektur Sistem

Bot ini terbagi menjadi beberapa komponen utama:

### 1. Log Handler (`src/utils/logger.js`)
Menggunakan `winston` dan `chalk` untuk menghasilkan pencatatan log berwarna yang rapi, sekaligus menyimpan salinan log ke file `logs/combined.log` dan `logs/error.log`. Logger ini secara dinamis menganalisis pesan log untuk mendeteksi tipe dan memberikan aksen warna di konsol:
*   **`INIT` (Magenta)**: Mendeteksi inisialisasi bot (startup, script `patchPlayDl`, dll).
*   **`MSG` (Hijau)**: Mendeteksi log aktivitas pesan guild/DM.
*   **`FETCH` (Biru)**: Mendeteksi proses penarikan data/URL/content.
*   **`CMD` (Biru Terang)**: Mendeteksi pendaftaran slash command atau operasi perintah.
*   **`OBTAINIUM` (Kuning Terang)**: Mendeteksi log pemantauan Obtainium Watcher.
*   **`SUCCSESS`/`DONE` (Hijau)**: Log keberhasilan atau tugas selesai.
*   **`WARN` (Kuning)**: Log peringatan sistem.
*   **`ERROR`/`404` (Merah)**: Log error atau resource tidak ditemukan.
*   **`UNKNOWN` (Abu-abu)**: Kategori fallback untuk log umum lainnya.

### 2. Auto Versioning (SemVer & Custom) (`VERSION`, `src/version.js` & `src/scripts/updateVersion.js`)
*   **SemVer Format:** Menggunakan penomoran versi berbasis SemVer secara terpusat di file root `VERSION`.
*   **Auto Deployment Update & Bump:** Versi dapat diperbarui otomatis dengan menjalankan perintah:
    ```bash
    npm run version:bump [major|minor|patch] [amount]
    ```
    Perintah ini akan menaikkan nomor versi sesuai tipe bump dan jumlah (amount) yang dipilih. Nilai `[amount]` secara default adalah `auto` (yang otomatis menghitung jumlah commit git sejak update versi terakhir), namun Anda juga dapat memasukkan angka spesifik seperti `npm run version:bump patch 20` untuk menaikkan versi patch sebanyak 20. Skrip ini menyinkronkan versi secara konsisten ke file root `VERSION`, `package.json`, dan `src/version.js`.
*   **Custom / Arbitrary Version String:** Untuk mengatur nama versi kustom secara langsung tanpa validasi SemVer (seperti `"P-1.8"` atau `"Prototype 1.8"`), jalankan perintah:
    ```bash
    npm run version:bump set "<nama_versi>"
    ```

### 3. Event Handler (`src/handlers/eventHandler.js`)
Membaca seluruh file di dalam direktori `src/events/` secara otomatis pada startup dan mendaftarkannya ke client Discord listener.

### 4. Command Handler (`src/handlers/commandHandler.js`)
Membaca subfolder di dalam `src/commands/` secara dinamis. Mendukung **Slash Commands** dan **Context Menu Commands**. 
*   **Guild Instant Deployment**: Jika variabel `GUILD_ID` pada berkas `.env` diisi, pendaftaran command dilakukan secara **instan** langsung ke server tujuan (sangat direkomendasikan untuk masa development).

### 5. Cooldown & Anti-Spam (`src/events/interactionCreate.js`)
Sistem pertahanan bot yang membatasi eksekusi command sebesar **3 detik** per perintah per pengguna. Menampilkan hitungan mundur secara privat (*ephemeral*) menggunakan `V2Embed` jika pengguna melakukan spamming.

### 5b. Penanganan Fallback Reply Pesan Terhapus (`src/events/messageCreate.js`)
Jika pesan mention asli pengguna dihapus (seperti setelah aksi bulk-delete/purge), pemanggilan `message.reply()` akan melempar error. Sistem secara otomatis mengalihkan pengiriman respon menggunakan `message.channel.send()` agar bot tidak mengalami crash.

### 6. Mesin Internasionalisasi & Lokalisasi / i18n (`src/utils/i18n.js`)
Menyediakan utilitas `t(key, locale, replaceData)` untuk menerjemahkan teks respon bot secara dinamis berdasarkan bahasa klien (Discord client locale) pengguna yang melakukan interaksi. Mendukung Bahasa Indonesia (`id`) dan Inggris (`en`) (secara bawaan/default menggunakan **Bahasa Inggris**). File kamus bahasa disimpan di folder `src/locales/`.

### 7. Integrasi Supabase & Fallback Database Lokal (`src/utils/supabase.js` & `src/utils/database.js`)
*   **Supabase Log & Upsert:** Mencatat seluruh pesan guild yang masuk ke tabel Supabase `message_records` menggunakan operasi `upsert` (pada konflik `message_id`) guna menghindari error constraint kunci duplikat. Digunakan untuk keperluan pemantauan perilaku buruk (*bad behavior monitoring*).
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

### 10. **`/fox` (Utility / AI Agent)**: Memanggil asisten kecerdasan buatan Fox (AI Agent) secara langsung via prompt text. Mendukung integrasi **Groq API** (model default `gemma2-9b-it`) untuk merespon obrolan. Menggunakan skema *Function Calling/Tool Use* untuk memicu plugin secara otomatis dengan dukungan multi-turn/multi-tool loop (hingga 5 iterasi) dan perbaikan pencocokan intent lokal agar tidak salah mendeteksi status pertanyaan. Sebelum memicu plugin, sistem akan memastikan plugin tersebut aktif/terinstal di server tersebut. Jika bot di-mention di chat room, ia akan membalas dengan respon teks saja (tanpa komponen V2) untuk mencegah error Discord API pada mention non-interaction.

### 11. **`/plugin` (Utility / Plugin Manager)**: Menginstal dan menghapus modul plugin AI secara dinamis tanpa perlu me-restart bot. Mengizinkan AI untuk melakukan instalasi plugin secara mandiri via tool `plugin` dengan validasi hak akses ketat (Owner, Admin, atau role dengan nama 'admin').
*   **`/plugin list`**: Menampilkan daftar semua plugin dan status keaktifan saat ini.
*   **`/plugin install [name]`**: Mengaktifkan plugin dan mendaftarkan perintah terkait ke Discord API secara instan.
*   **`/plugin uninstall [name]`**: Menonaktifkan plugin dan menghapus perintah terkait dari Discord API secara instan.

### 12. Perintah `/bad-word` (Moderation / Bad Word Plugin)
 Mengelola daftar kata kasar kustom di server. Default statusnya adalah **tidak terinstal (disabled)** dan memerlukan `/plugin install badWord` untuk diaktifkan.
*   **`/bad-word add [content]`**: Menambahkan kata kasar kustom baru. Bot secara otomatis memproses kata tersebut ke regex pre-filter dinamis (mendukung spasi, repetisi, dan simbol).
*   **`/bad-word remove [content]`**: Menghapus kata kasar kustom dari database.
*   **`/bad-word list`**: Menampilkan seluruh daftar kata kasar kustom aktif.

### 13. Perintah `/scam-link` (Moderation)
Mengelola daftar tautan scam/phishing kustom yang diblokir di server.
*   **`/scam-link add [domain]`**: Menambahkan domain scam baru ke daftar hitam kustom.
*   **`/scam-link remove [domain]`**: Menghapus domain scam dari daftar hitam kustom.
*   **`/scam-link list`**: Menampilkan semua domain scam kustom yang diblokir saat ini.

---

## Sistem Proteksi Link Scam & Phishing (Anti-Phishing)
Bot memiliki sistem pendeteksian otomatis terhadap link scam atau phishing yang dikirim oleh pengguna di channel server:
*   **Pipeline Data Ganda:** Daftar domain scam diambil otomatis dari repositori publik jarak jauh (diperbarui setiap 12 jam) dan disimpan secara lokal di `data/scam_links.json`. Admin juga dapat menambahkan domain kustom ke Supabase (`custom_scam_links`) yang memiliki cadangan offline lokal di `data/database.json`.
*   **Ekstraksi & Pencocokan Domain:** Setiap pesan yang masuk akan diperiksa domainnya. Sistem juga memeriksa kecocokan subdomain (misalnya, jika `a.b.scam.com` dikirim, ia akan mencocokkan `scam.com` secara otomatis).
*   **Tindakan Pelanggaran:** Jika terdeteksi link scam:
    - Pesan pengguna akan dihapus seketika.
    - Mengirim pesan peringatan publik yang terlokalisasi (Bahasa Indonesia / Inggris) ke channel menggunakan `V2Embed`.
    - Mengirim log pemberitahuan ke channel `#moderator-only` (jika ada) dan melakukan ping ke owner server atau role admin.
*   **Kompatibilitas discord.js V2 Components:** Pengiriman teks mention/ping (`content`) dipisahkan ke panggilan kirim pesan mandiri yang berbeda dari `V2Embed` (`components` V2) guna menghindari error API `MESSAGE_CANNOT_USE_LEGACY_FIELDS_WITH_COMPONENTS_V2`.
*   **Desain Pemisah Visual:** Kontainer log di channel moderator menggunakan elemen native `SeparatorBuilder` dengan pembatas (`setDivider(true)`) dan spasi ukuran kecil (`setSpacing('small')`) untuk memisahkan baris informasi (User, Channel, Original Message) secara elegan.

---

## Sistem AI Moderasi (3-Layer Filtering)
Menerapkan sistem penyaringan pesan efisien biaya (eksekusi Groq API terkontrol) di saluran Discord:
*   **Layer 1 (Pre-filter Lokal):** Memeriksa kecocokan pesan dengan regex kata kasar umum (default & kustom) secara instan tanpa API call.
*   **Layer 2 (User Cooldown):** Membatasi scanning dengan cooldown 10 detik per pengguna demi menjaga rate limit API.
*   **Layer 3 (Groq AI Analysis):** Menganalisis makna kontekstual menggunakan model `llama-3.1-8b-instant`. AI akan merespons pesan peringatan ramah atau membalas `CLEAN` untuk tetap diam jika dirasa aman.

---

## Integrasi Sistem AI Agent & Plugin
Bot ini dilengkapi dengan arsitektur agen cerdas modular di bawah direktori `src/plugins/`:
*   **AI Engine & Loop Agent**: Menggunakan API OpenAI-compatible dari Groq.com dengan penanganan fallback otomatis. Jika model tidak mendukung *tool calling* (seperti gemma2-9b-it), request secara otomatis dikirim ulang tanpa parameter tools untuk menjamin bot tetap memberikan respon obrolan. Selain itu, eksekusi tool didelegasikan ke dalam loop agen multi-turn (maksimal 5 iterasi) yang mengevaluasi output Groq secara iteratif.
*   **Pemeriksaan Status Aktif Plugin**: Setiap eksekusi plugin divalidasi silang secara dinamis dengan daftar plugin terinstal di server (`getInstalledPlugins`). AI tidak diperkenankan memicu fungsionalitas plugin yang berstatus nonaktif di guild.
*   **Histori Obrolan Persisten**: Percakapan pengguna disimpan secara berurutan ke tabel Supabase `ai_chat_history`. Jika koneksi terputus atau tabel belum dibuat, sistem secara otomatis mengalihkan penyimpanan (*failover*) secara lokal ke `data/database.json`.
*   **Modularitas Plugin**: Setiap fungsi bot dibungkus sebagai plugin terisolasi (seperti `webhookPlugin`, `musicPlugin`, `rolePlugin`, `badWordPlugin`). Status keaktifan plugin dikontrol oleh `/plugin` dan dipantau oleh `src/utils/pluginManager.js`.

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
* **Automated Release Scheduler (GitHub Actions)**: Alur kerja (.github/workflows/scheduled-release.yml) berjalan secara terjadwal setiap hari Sabtu pukul 19:00 WIB (12:00 UTC). Skrip ini otomatis melakukan pengujian unit, melakukan merge dari `dev` ke `release`, melakukan bump versi ke `"P-1.8"`, dan mendorong perubahan ke branch `release` menggunakan kredensial bot.

