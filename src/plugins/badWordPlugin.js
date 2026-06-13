import { addBadWordLocally, removeBadWordLocally, getBadWordsLocally } from '../utils/database.js';
import { reloadPatterns } from '../moderation/preFilter.js';
import { V2Embed } from '../utils/v2Embed.js';

export const badWordPlugin = {
  name: 'badWord',
  commands: ['bad-word'],
  description:
    'Manage the custom bad words moderation list. Actions include "add" (add a new word to filter), "remove" (remove a word from filter), and "list" (show filtered words). Support optional category.',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['add', 'remove', 'list'],
        description: 'The bad word action to perform.'
      },
      content: {
        type: 'string',
        description: 'The bad word to add or remove.'
      },
      category: {
        type: 'string',
        description: 'Optional category (e.g. NSFW, SARA, Spam, General).'
      }
    },
    required: ['action']
  },

  /**
   * Execute bad word plugin actions
   * @param {object} args
   * @param {object} context
   */
  async execute(args, context) {
    const { action, content, category } = args;
    const { user } = context;

    const useCategory = category || 'General';

    if (action === 'add') {
      if (!content) return { success: false, error: 'Content is required.' };
      const added = addBadWordLocally(content, useCategory);
      if (added) {
        reloadPatterns();
        const embed = new V2Embed()
          .setTitle('Bad Word Added ⚠️')
          .setDescription(
            `*   **Kata Baru:** \`${content.toLowerCase()}\`\n` +
              `*   **Kategori:** \`${useCategory}\`\n` +
              `*   **Status:** Berhasil ditambahkan & regex pre-filter diperbarui.\n` +
              `*   **Operator:** ${user ? user.username : 'AI Agent'}`
          )
          .build();
        return {
          success: true,
          method: 'add',
          responseText: `Kata \`${content.toLowerCase()}\` dengan kategori \`${useCategory}\` berhasil ditambahkan ke database filter.`,
          embeds: [embed]
        };
      } else {
        return { success: false, error: `Kata \`${content.toLowerCase()}\` sudah ada di database.` };
      }
    } else if (action === 'remove') {
      if (!content) return { success: false, error: 'Content is required.' };
      const removed = removeBadWordLocally(content);
      if (removed) {
        reloadPatterns();
        const embed = new V2Embed()
          .setTitle('Bad Word Removed 🧹')
          .setDescription(
            `*   **Kata Dihapus:** \`${content.toLowerCase()}\`\n` +
              `*   **Status:** Berhasil dihapus & regex pre-filter diperbarui.\n` +
              `*   **Operator:** ${user ? user.username : 'AI Agent'}`
          )
          .build();
        return {
          success: true,
          method: 'remove',
          responseText: `Kata \`${content.toLowerCase()}\` berhasil dihapus dari database filter.`,
          embeds: [embed]
        };
      } else {
        return { success: false, error: `Kata \`${content.toLowerCase()}\` tidak ditemukan.` };
      }
    } else if (action === 'list') {
      const words = getBadWordsLocally();
      const listText = words.length > 0
        ? words
            .map((w) => {
              const wordText = typeof w === 'object' ? w.word : w;
              const catText = typeof w === 'object' ? w.category : 'General';
              return `- \`${wordText}\` (${catText})`;
            })
            .join('\n')
        : '*Belum ada kata kasar kustom yang ditambahkan.*';

      const embed = new V2Embed()
        .setTitle('Custom Bad Words List 📋')
        .setDescription(listText)
        .build();
      return {
        success: true,
        method: 'list',
        responseText: `Berikut daftar kata kustom: ${words.map((w) => (typeof w === 'object' ? w.word : w)).join(', ') || 'kosong'}.`,
        embeds: [embed]
      };
    }
    return { success: false, error: 'Unsupported action.' };
  }
};
