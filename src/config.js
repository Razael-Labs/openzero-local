// Managed by Razael-Fox Bot
let currentColorIndex = 0;

export const config = {
  // Daftar warna aksen untuk V2Embed (Hexadecimal)
  embedColors: [
    0x6e4cc1, // #6e4cc1
    0x242221, // #242221
    0xf58e25, // #f58e25
    0xfdfdfd // #fdfdfd
  ],

  // Warna aksen utama (dipilih secara berurutan)
  get embedColor() {
    const color = this.embedColors[currentColorIndex];
    currentColorIndex = (currentColorIndex + 1) % this.embedColors.length;
    return color;
  },

  // Konfigurasi Status Kehadiran (Presence Activity) Bot
  activity: {
    name: 'Grand Theft Auto VI',
    // Pilihan tipe: PLAYING, STREAMING, LISTENING, WATCHING, COMPETING
    type: 'PLAYING',
    details: 'Exploring Leonida & Vice City',
    state: 'Campaign: 68% Completed',
    assets: {
      largeImage: 'https://i.imgur.com/ByUhao8.png', // GTA VI Artwork
      largeText: 'Grand Theft Auto VI',
      smallImage: 'https://i.imgur.com/pYVjN18.png', // Rockstar Games Logo
      smallText: 'Leonida County'
    },
    buttons: [
      {
        label: 'Join Game',
        url: 'https://discord.gg/openzero' // Target URL untuk tombol Join Game
      }
    ]
  },

  // Target Discord Channel dan Message ID untuk list Obtainium
  obtainium: {
    channelId: '1511326472219001014',
    messageId: '1511327184546042019'
  }
};
