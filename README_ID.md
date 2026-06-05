🌐 **Bahasa:** [English](README.md) | [Bahasa Indonesia](README_ID.md)

---

Ini adalah **OpenZero Local Version**—sebuah bot Discord mandiri yang dirancang untuk dijalankan sepenuhnya secara lokal pada perangkat Anda sendiri (seperti PC, Server Rumah, atau Termux di Android). Proyek ini **100% bebas dari ketergantungan API cloud berbayar** (hosting berbayar atau API eksternal yang membatasi penggunaan). Semua data, logging, dan pemrosesan berjalan sepenuhnya di bawah kendali Anda sendiri tanpa biaya langganan tambahan.

**Deskripsi Repositori GitHub:** *OpenZero based Discord bot without any paid API dependency.*

---

## Fitur Utama Bot

1. **Slash Commands Terintegrasi**: Menggunakan format perintah modern langsung dari antarmuka Discord.
2. **Terjemahan Menu Konteks ("Translate to English")** *(Baru)*: Cukup tekan lama (di mobile) atau klik kanan (di desktop) pada pesan apa pun -> buka menu **Apps** -> pilih **Translate to English** untuk menerjemahkan pesan secara instan ke bahasa Inggris. Bekerja 100% gratis dan tanpa API key menggunakan `@vitalets/google-translate-api` (sangat optimal untuk Termux).
3. **Toolkit Moderasi Tingkat Lanjut** *(Baru)*:
   * `/purge`: Menghapus pesan secara massal di suatu channel (1-100 pesan, default 100).
   * `/kick` & `/ban`: Mengeluarkan atau memblokir anggota dengan perlindungan hierarki role.
   * `/mute` & `/unmute`: Mute Teks (menggunakan Muted role) dan Mute Suara.
   * `/timeout`: Membatasi interaksi anggota untuk durasi tertentu atau mencabut timeout.
   * `/deafen` & `/undeafen`: Menulikan (deafen) atau membatalkan tuli di saluran suara.
   * `/role`: Menambah, menghapus, atau melihat detail informasi ID role secara cepat.
   * `/webhook`: Membuat, melihat informasi detail, dan mengelola webhook server.
4. **Sistem Cooldown Anti-Spam** *(Baru)*: Batasan waktu tunggu (cooldown) selama 3 detik per perintah per pengguna untuk mencegah spam dan rate limit.
5. **Perputaran Warna Embed Berurutan** *(Baru)*: Secara otomatis mengganti warna aksen garis samping embed secara berurutan untuk setiap pesan baru dari daftar warna premium berikut:
   * `#6e4cc1` (Ungu)
   * `#242221` (Hitam Gelap)
   * `#f58e25` (Oranye)
   * `#fdfdfd` (Putih)
6. **Layout Embed Premium (Components V2)**: Tampilan informasi bot menggunakan layout modern baru dari Discord (bukan embed lama yang monoton) lengkap dengan tombol interaktif (seperti tombol refresh latency 🔄) yang tertanam langsung di dalam kotak informasi.
7. **Logger Konsol & File**: Mencatat setiap aktivitas chat dan eksekusi perintah bot di konsol dengan indikator status Unicode berwarna, serta menyimpannya otomatis ke file log lokal (`logs/`).
8. **Auto Status Kehadiran**: Bot secara otomatis menampilkan status bermain game (default: *Playing GTA 6*) saat aktif.
9. **Script Admin Peraturan (Rules)**: Perintah cepat bagi pemilik bot untuk mengirim atau mengedit pesan peraturan komunitas yang rapi dan minim emoji di channel server tertentu.

---

## Pilihan Instalasi

Anda dapat menginstal proyek ini menggunakan salah satu dari metode berikut:

### Pilihan A: Kloning Repositori (Clone Git)
Metode terbaik jika Anda ingin terus memperbarui bot menggunakan perintah git:
```bash
git clone https://github.com/Razael-Fox/openzero-local.git
cd openzero-local
```

### Pilihan B: Unduh Paket Rilis (Release Package)
Metode terbaik jika Anda menginginkan paket mandiri yang bersih tanpa riwayat git (paket ini hanya di-generate dari branch `release`):
1. Pergi ke halaman [Releases](https://github.com/Razael-Fox/openzero-local/releases).
2. Unduh paket `.tar.gz` terbaru (misalnya `openzero-local-latest.tar.gz`).
3. Ekstrak file tersebut di direktori yang Anda inginkan:
   ```bash
   tar -xzf openzero-local-latest.tar.gz
   cd openzero-local
   ```

---

## Panduan Cara Menggunakan Bot

Ikuti langkah-langkah di bawah ini untuk menyiapkan, mengundang, dan menjalankan bot Anda di Discord.

### Langkah 1: Persiapan Awal
Sebelum menggunakan bot, pastikan perangkat Anda sudah terinstal **Node.js** (versi 18 ke atas) dan Anda memiliki akun Discord dengan **Developer Mode** aktif.

### Langkah 2: Dapatkan Token Bot & Client ID
1. Buka [Discord Developer Portal](https://discord.com/developers/applications).
2. Klik tombol **New Application** di pojok kanan atas, beri nama bot Anda, lalu buat.
3. Pergi ke menu **Bot** (di menu sebelah kiri), klik **Reset Token**, lalu salin token yang muncul. Ini adalah `DISCORD_TOKEN` Anda.
4. Di halaman yang sama, scroll ke bawah ke bagian **Privileged Gateway Intents**, lalu aktifkan **Message Content Intent** (diperlukan agar bot dapat membaca aktivitas chat untuk logger). Klik **Save Changes**.
5. Pergi ke menu **General Information** (di menu sebelah kiri), lalu salin **Application ID** yang tertera. Ini adalah `CLIENT_ID` Anda.

### Langkah 3: Mengundang Bot ke Server Discord Anda
1. Masih di Discord Developer Portal, pergi ke menu **OAuth2** -> **URL Generator**.
2. Di kolom **Scopes**, centang kotak **`bot`** dan **`applications.commands`**.
3. Di bawahnya, pada bagian **Bot Permissions**, centang izin dasar berikut:
   * `Send Messages`
   * `Read Message History`
   * `Use Slash Commands`
4. Salin link yang digenerate di bagian paling bawah halaman, buka link tersebut di tab browser baru, lalu pilih server Anda untuk mengundang bot masuk.

### Langkah 4: Dapatkan Server/Guild ID (Opsional tapi Direkomendasikan)
Agar perintah slash bot langsung muncul **seketika** di server Anda tanpa perlu menunggu propagasi global Discord (yang bisa memakan waktu hingga 1 jam):
1. Di aplikasi Discord Anda, buka **User Settings** -> **Advanced**, lalu aktifkan **Developer Mode**.
2. Klik kanan pada ikon Server Discord Anda di daftar server sebelah kiri, lalu klik **Copy Server ID**. Ini adalah `GUILD_ID` Anda.

### Langkah 5: Konfigurasi File Lingkungan (.env)
1. Buka folder bot ini di komputer/perangkat Anda.
2. Duplikat file `.env.example` dan ubah namanya menjadi `.env`.
3. Buka file `.env` tersebut menggunakan teks editor pilihan Anda dan isi nilainya dengan data yang sudah disalin di langkah sebelumnya:
   ```env
   DISCORD_TOKEN=MASUKKAN_TOKEN_BOT_ANDA_DI_SINI
   CLIENT_ID=MASUKKAN_APPLICATION_ID_BOT_ANDA_DI_SINI
   GUILD_ID=MASUKKAN_SERVER_ID_ANDA_DI_SINI
   ```

### Langkah 6: Mengaktifkan & Menjalankan Bot
1. Buka terminal atau command prompt, masuk ke folder tempat bot ini berada.
2. Instal pustaka-pustaka pendukung bot dengan mengetik:
   ```bash
   npm install
   ```
3. Nyalakan bot dengan mengetik perintah berikut:
   ```bash
   npm start
   ```
   *(Gunakan `npm run dev` jika Anda ingin bot otomatis me-restart sendiri apabila ada perubahan konfigurasi atau kode perintah).*
4. Setelah terminal memunculkan log `[Client] Login berhasil!`, bot Anda resmi online!

### Langkah 7: Pengujian Kode (Unit Testing)
Repositori ini dilengkapi dengan unit test pra-konfigurasi untuk memverifikasi perintah moderasi dan terjemahan.
Jalankan pengujian menggunakan Jest:
```bash
npm test
```
