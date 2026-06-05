import { ContextMenuCommandBuilder, ApplicationCommandType, MessageFlags } from 'discord.js';
import { translate } from '@vitalets/google-translate-api';
import { V2Embed } from '../../utils/v2Embed.js';
import logger from '../../utils/logger.js';

export default {
  data: new ContextMenuCommandBuilder()
    .setName('Translate to English')
    .setType(ApplicationCommandType.Message),

  /**
   * @param {import('discord.js').MessageContextMenuCommandInteraction} interaction
   */
  async execute(interaction) {
    // Memberitahu Discord bahwa bot sedang memproses interaksi (ephemeral agar hanya terlihat oleh user bersangkutan)
    await interaction.deferReply({ ephemeral: true });

    const message = interaction.targetMessage;
    const originalText = message.content;

    if (!originalText || originalText.trim() === '') {
      const errorEmbed = new V2Embed()
        .setTitle('Terjemahan Gagal')
        .setDescription('Pesan ini tidak memiliki konten teks untuk diterjemahkan.')
        .setColor(0xff3333) // Merah
        .build();

      return interaction.editReply({
        components: [errorEmbed],
        flags: MessageFlags.IsComponentsV2
      });
    }

    try {
      // Menerjemahkan ke Bahasa Inggris ('en')
      const res = await translate(originalText, { to: 'en' });
      const translatedText = res.text;
      const detectedLang = res.raw && res.raw.src ? res.raw.src.toUpperCase() : 'UNKNOWN';

      const successEmbed = new V2Embed()
        .setTitle('Translate to English 🇺🇸')
        .setDescription(
          `**Teks Asli (${detectedLang}):**\n` +
            `> ${originalText.length > 500 ? originalText.slice(0, 500) + '...' : originalText}\n\n` +
            '**Hasil Terjemahan:**\n' +
            `> ${translatedText}`
        )
        .setColor(0x00aeef) // Biru muda premium
        .build();

      await interaction.editReply({
        components: [successEmbed],
        flags: MessageFlags.IsComponentsV2
      });

      logger.info(`[Translate Command] Sukses menerjemahkan pesan dari (${detectedLang}) ke EN`);
    } catch (error) {
      logger.error('[Translate Command] Gagal melakukan terjemahan:', error);

      const errorEmbed = new V2Embed()
        .setTitle('Terjemahan Gagal')
        .setDescription('Terjadi kesalahan saat menghubungi API penerjemah. Silakan coba lagi.')
        .setColor(0xff3333)
        .build();

      await interaction.editReply({
        components: [errorEmbed],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
