import { Events, MessageFlags } from 'discord.js';
import { V2Embed } from '../utils/v2Embed.js';
import logger from '../utils/logger.js';

export default {
  name: Events.GuildCreate,
  once: false,
  /**
   * @param {import('discord.js').Guild} guild
   */
  async execute(guild) {
    logger.info(`[GuildCreate] Bot has been added to a new guild: ${guild.name} (${guild.id})`);

    // Dapatkan owner guild secara dinamis untuk menyapa dengan mention
    let ownerMention = 'Server Owner';
    try {
      const owner = await guild.fetchOwner();
      if (owner) {
        ownerMention = owner.toString();
      }
    } catch (err) {
      logger.warn(`[GuildCreate] Failed to fetch guild owner: ${err.message}`);
    }

    // Temukan channel sistem atau channel teks pertama di mana bot bisa mengirim pesan
    const channel = guild.systemChannel || guild.channels.cache.find(
      (c) => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages')
    );

    if (!channel) {
      logger.warn(`[GuildCreate] No suitable text channel found to send greetings in guild: ${guild.name}`);
      return;
    }

    try {
      const embed = new V2Embed()
        .setTitle('Terima Kasih Telah Menambahkan OZL! 🎉')
        .setDescription(
          `Halo ${ownerMention}! Terima kasih telah mengundang **OZL** ke server **${guild.name}**. Silakan ikuti instruksi berikut untuk memulai:\n\n` +
          `### 🛠️ Langkah Memulai & Panduan Penggunaan\n\n` +
          `*   **1. Temukan Command Bot**\n` +
          `    Ketik \`/help\` atau \`/menu\` untuk melihat semua daftar perintah (*Slash Commands*) yang tersedia.\n\n` +
          `*   **2. Integrasi AI Assistant (Fox)**\n` +
          `    Gunakan command \`/fox\` atau tag/mention bot untuk berinteraksi langsung dengan AI.\n` +
          `    > ⚠️ **Catatan Penting:** Respons AI terkadang tidak 100% akurat. Jika bot melakukan tindakan/pemanggilan tool yang tidak diinginkan di server Anda, mohon kick atau mute bot segera!\n\n` +
          `*   **3. Sistem Music Streaming**\n` +
          `    Putar musik dengan command \`/play\`. Fitur musik mungkin tidak selalu 100% berhasil karena pembatasan platform. Jika Anda mengalami kendala/error, silakan laporkan ke \`me@razael-fox.my.id\`.\n\n` +
          `*   **4. Modularitas Plugin**\n` +
          `    Bot ini berbasis plugin! Beberapa fitur (seperti moderasi, badword filter, dll.) mungkin dinonaktifkan secara bawaan. Gunakan command \`/plugin list\` dan \`/plugin install <nama_plugin>\` untuk mengaktifkannya.\n\n` +
          `Selamat menggunakan bot! Semoga membantu meningkatkan keseruan server Anda!`
        )
        .build();

      await channel.send({
        components: [embed],
        flags: MessageFlags.IsComponentsV2
      });

      logger.info(`[GuildCreate] Optimized greetings message sent successfully to channel: ${channel.name} in guild: ${guild.name}`);
    } catch (err) {
      logger.error(`[GuildCreate] Failed to send greetings message in guild ${guild.name}:`, err);
    }
  }
};
