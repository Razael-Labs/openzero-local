import { ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder, AttachmentBuilder } from 'discord.js';
import { config } from '../config.js';
import { Symbols, applyGuildEmojis } from './symbols.js';
import { downloadIcon } from './iconHelper.js';

/**
 * Kelas pembantu untuk membuat container Discord Components V2 layaknya EmbedBuilder tradisional.
 */
export class V2Embed {
  constructor(context = null) {
    this.title = '';
    this.description = '';
    this.accentColor = config.embedColor; // Menggunakan warna default dari global config
    this.actionRows = [];
    this.thumbnailUrl = null;
    this.files = [];
    this.context = context; // Can be Interaction, Guild, or Client
  }

  /**
   * Helper internal untuk memetakan simbol emoji standar ke simbol terpusat
   * @param {string} text
   * @returns {string}
   */
  _applySymbols(text) {
    return text;
  }

  /**
   * Mengatur context interaksi atau guild untuk V2 Embed agar dapat meresolusi custom emojis
   * @param {any} context
   * @returns {this}
   */
  setContext(context) {
    this.context = context;
    return this;
  }

  /**
   * Mengatur judul untuk V2 Embed
   * @param {string} title
   * @returns {this}
   */
  setTitle(title) {
    this.title = title;
    return this;
  }

  /**
   * Mengatur deskripsi/isi utama untuk V2 Embed
   * @param {string} description
   * @returns {this}
   */
  setDescription(description) {
    this.description = description;
    return this;
  }

  /**
   * Mengatur warna garis aksen samping container
   * @param {number} color Nilai warna hex (misalnya 0x00ffd2 atau 16711680)
   * @returns {this}
   */
  setColor(color) {
    this.accentColor = color;
    return this;
  }

  /**
   * Menambahkan baris komponen (seperti tombol/button) langsung di dalam container embed
   * @param {import('discord.js').ActionRowBuilder} actionRow
   * @returns {this}
   */
  addActionRow(actionRow) {
    this.actionRows.push(actionRow);
    return this;
  }

  /**
   * Mengatur thumbnail URL secara langsung
   * @param {string} url
   * @returns {this}
   */
  setThumbnail(url) {
    this.thumbnailUrl = url;
    return this;
  }

  /**
   * Mengunduh ikon dan menjadikannya thumbnail V2 Embed
   * @param {string} iconName Nama ikon
   * @param {string} [provider='fontawesome'] Provider ikon
   * @returns {Promise<this>}
   */
  async setThumbnailIcon(iconName, provider = 'fontawesome') {
    try {
      const icon = await downloadIcon(iconName, provider);
      this.thumbnailUrl = icon.localUrl;
      this.files.push(new AttachmentBuilder(icon.filePath, { name: icon.fileName }));
    } catch (err) {
      console.error(`[V2Embed] Failed to set thumbnail icon: ${err.message}`);
    }
    return this;
  }

  /**
   * Merender builder menjadi objek ContainerBuilder yang siap dikirim
   * @returns {ContainerBuilder}
   */
  build() {
    const container = new ContainerBuilder();

    if (this.accentColor !== null) {
      container.setAccentColor(this.accentColor);
    }

    // Resolve guild from context
    let guild = null;
    if (this.context) {
      if (this.context.guild) {
        guild = this.context.guild;
      } else if (this.context.emojis) { // If context is a Guild
        guild = this.context;
      }
    }

    const resolvedTitle = this.title ? applyGuildEmojis(this.title, guild) : '';
    const resolvedDescription = this.description ? applyGuildEmojis(this.description, guild) : '';

    let markdown = '';
    if (resolvedTitle) {
      markdown += `## ${resolvedTitle}\n\n`;
    }
    if (resolvedDescription) {
      markdown += resolvedDescription;
    }

    if (markdown.trim() !== '') {
      if (this.thumbnailUrl) {
        const section = new SectionBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(markdown))
          .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: this.thumbnailUrl } }));
        container.addSectionComponents(section);
      } else {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(markdown));
      }
    }

    // Masukkan semua baris tombol/komponen langsung di dalam container
    for (const row of this.actionRows) {
      container.addActionRowComponents(row);
    }

    return container;
  }
}
