import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import logger from '../../utils/logger.js';
import {
  addBadWordLocally,
  removeBadWordLocally,
  getBadWordsLocally,
  addWhitelistLocally,
  removeWhitelistLocally,
  getWhitelistLocally,
  getModerationConfig,
  saveModerationConfig,
  getModerationTriggers
} from '../../utils/database.js';
import { reloadPatterns } from '../../moderation/preFilter.js';
import { isCommandEnabled } from '../../utils/pluginManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('bad-word')
    .setDescription('Manage the custom bad words moderation list and configs.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Add a new bad word to the filter database.')
        .addStringOption((option) =>
          option
            .setName('content')
            .setDescription('The bad word to filter.')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('category')
            .setDescription('Categorization/Group (e.g. NSFW, SARA, Spam, General)')
            .setRequired(false)
            .addChoices(
              { name: 'NSFW', value: 'NSFW' },
              { name: 'SARA', value: 'SARA' },
              { name: 'Spam', value: 'Spam' },
              { name: 'General', value: 'General' }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Remove a bad word from the filter database.')
        .addStringOption((option) =>
          option
            .setName('content')
            .setDescription('The bad word to remove.')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('List all custom bad words currently in the filter database.')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('whitelist')
        .setDescription('Manage whitelisted phrases allowed contextually.')
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('Add, remove or list whitelist words')
            .setRequired(true)
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' },
              { name: 'List', value: 'list' }
            )
        )
        .addStringOption((option) =>
          option
            .setName('content')
            .setDescription('The word/phrase to whitelist.')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('config')
        .setDescription('Configure moderation actions and permissions.')
        .addRoleOption((option) =>
          option
            .setName('allowed_role')
            .setDescription('Role authorized to manage this plugin/command.')
            .setRequired(false)
        )
        .addBooleanOption((option) =>
          option
            .setName('silent_delete')
            .setDescription('Silently delete triggered messages without posting public warnings.')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('action_level')
            .setDescription('Major graduated action level when max warning count is reached.')
            .setRequired(false)
            .addChoices(
              { name: 'Warn Only', value: 'warn' },
              { name: 'Mute (Timeout 10m)', value: 'mute' },
              { name: 'Kick', value: 'kick' },
              { name: 'Ban', value: 'ban' }
            )
        )
        .addIntegerOption((option) =>
          option
            .setName('max_warnings')
            .setDescription('Maximum warnings before major action is triggered.')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('logs')
        .setDescription('View the moderation audit logs of bad word triggers.')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('stats')
        .setDescription('Show statistics of most frequently triggered bad words.')
    )
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const enabled = await isCommandEnabled(interaction.guildId, 'bad-word');
    if (!enabled) {
      const embed = new V2Embed()
        .setTitle('Plugin Not Installed ⚠️')
        .setDescription(
          'Plugin ini belum diinstal di server ini. Gunakan `/plugin install badWord` untuk mengaktifkannya.'
        );

      return interaction.reply({
        components: [embed.build()],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }

    const modConfig = getModerationConfig(interaction.guildId);
    const isGuildAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);
    const hasAllowedRole = interaction.member.roles.cache.some((r) =>
      modConfig.allowedRoles?.includes(r.id)
    );

    if (!isGuildAdmin && !hasAllowedRole) {
      const embed = new V2Embed()
        .setTitle('Akses Ditolak ❌')
        .setDescription(
          'Anda tidak memiliki izin (Manage Guild atau role terkonfigurasi) untuk mengelola filter bad-word.'
        );
      return interaction.reply({
        components: [embed.build()],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'add') {
        const word = interaction.options.getString('content');
        const category = interaction.options.getString('category') || 'General';
        const added = addBadWordLocally(word, category);
        if (added) {
          reloadPatterns();
          const embed = new V2Embed()
            .setTitle('Bad Word Added ⚠️')
            .setDescription(
              `*   **Kata Baru:** \`${word.toLowerCase()}\`\n` +
                `*   **Kategori:** \`${category}\`\n` +
                `*   **Status:** Berhasil ditambahkan & regex pre-filter diperbarui.\n` +
                `*   **Moderator:** ${interaction.user}`
            )
            .build();
          await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
          logger.info(`[Moderation] ${interaction.user.tag} added bad word: "${word}" (Category: ${category})`);
        } else {
          const embed = new V2Embed()
            .setTitle('Gagal Menambahkan ❌')
            .setDescription(`Kata \`${word.toLowerCase()}\` sudah ada di database filter.`)
            .build();
          await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
        }
      } else if (subcommand === 'remove') {
        const word = interaction.options.getString('content');
        const removed = removeBadWordLocally(word);
        if (removed) {
          reloadPatterns();
          const embed = new V2Embed()
            .setTitle('Bad Word Removed 🧹')
            .setDescription(
              `*   **Kata Dihapus:** \`${word.toLowerCase()}\`\n` +
                `*   **Status:** Berhasil dihapus & regex pre-filter diperbarui.\n` +
                `*   **Moderator:** ${interaction.user}`
            )
            .build();
          await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
          logger.info(`[Moderation] ${interaction.user.tag} removed bad word: "${word}"`);
        } else {
          const embed = new V2Embed()
            .setTitle('Gagal Menghapus ❌')
            .setDescription(`Kata \`${word.toLowerCase()}\` tidak ditemukan di database filter.`)
            .build();
          await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
        }
      } else if (subcommand === 'list') {
        const words = getBadWordsLocally();
        const listText = words.length > 0
          ? words.map((w) => {
              const wordText = typeof w === 'object' ? w.word : w;
              const catText = typeof w === 'object' ? w.category : 'General';
              return `- \`${wordText}\` (${catText})`;
            }).join('\n')
          : '*Belum ada kata kasar kustom yang ditambahkan.*';

        const embed = new V2Embed()
          .setTitle('Custom Bad Words List 📋')
          .setDescription(listText)
          .build();
        await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
      } else if (subcommand === 'whitelist') {
        const action = interaction.options.getString('action');
        const word = interaction.options.getString('content');

        if (action === 'add') {
          if (!word) {
            const embed = new V2Embed()
              .setTitle('Kesalahan Input ❌')
              .setDescription('Opsi "content" diperlukan untuk menambahkan whitelist.')
              .build();
            return interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
          }
          const added = addWhitelistLocally(word);
          const embed = new V2Embed()
            .setTitle(added ? 'Whitelist Added ✅' : 'Gagal Menambahkan ❌')
            .setDescription(
              added
                ? `Frasa \`${word.toLowerCase()}\` berhasil ditambahkan ke whitelist kustom.`
                : `Frasa \`${word.toLowerCase()}\` sudah terdaftar di whitelist.`
            )
            .build();
          await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
        } else if (action === 'remove') {
          if (!word) {
            const embed = new V2Embed()
              .setTitle('Kesalahan Input ❌')
              .setDescription('Opsi "content" diperlukan untuk menghapus whitelist.')
              .build();
            return interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
          }
          const removed = removeWhitelistLocally(word);
          const embed = new V2Embed()
            .setTitle(removed ? 'Whitelist Removed 🧹' : 'Gagal Menghapus ❌')
            .setDescription(
              removed
                ? `Frasa \`${word.toLowerCase()}\` berhasil dihapus dari whitelist.`
                : `Frasa \`${word.toLowerCase()}\` tidak ditemukan di whitelist.`
            )
            .build();
          await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
        } else if (action === 'list') {
          const list = getWhitelistLocally();
          const embed = new V2Embed()
            .setTitle('Whitelist Phrases 📋')
            .setDescription(
              list.length > 0
                ? list.map((w) => `- \`${w}\``).join('\n')
                : '*Belum ada frasa whitelist kustom yang terdaftar.*'
            )
            .build();
          await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
        }
      } else if (subcommand === 'config') {
        const allowedRole = interaction.options.getRole('allowed_role');
        const silentDelete = interaction.options.getBoolean('silent_delete');
        const actionLevel = interaction.options.getString('action_level');
        const maxWarnings = interaction.options.getInteger('max_warnings');

        const updates = {};
        if (allowedRole) {
          const currentRoles = modConfig.allowedRoles || [];
          if (!currentRoles.includes(allowedRole.id)) {
            updates.allowedRoles = [...currentRoles, allowedRole.id];
          }
        }
        if (silentDelete !== null) updates.silentDelete = silentDelete;
        if (actionLevel) updates.warnAction = actionLevel;
        if (maxWarnings !== null) updates.maxWarnings = maxWarnings;

        saveModerationConfig(interaction.guildId, updates);
        const updatedConfig = getModerationConfig(interaction.guildId);

        const embed = new V2Embed()
          .setTitle('Moderation Config Updated ⚙️')
          .setDescription(
            `*   **Silent Delete:** \`${updatedConfig.silentDelete}\`\n` +
              `*   **Action Level:** \`${updatedConfig.warnAction}\`\n` +
              `*   **Max Warnings:** \`${updatedConfig.maxWarnings}\`\n` +
              `*   **Manage Roles:** ${
                updatedConfig.allowedRoles?.length > 0
                  ? updatedConfig.allowedRoles.map((id) => `<@&${id}>`).join(', ')
                  : 'Administrators Only'
              }`
          )
          .build();
        await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
      } else if (subcommand === 'logs') {
        const triggers = getModerationTriggers(interaction.guildId).slice(-15);
        const desc = triggers.length > 0
          ? triggers
              .map((t) => {
                const dateStr = new Date(t.timestamp).toLocaleTimeString();
                return `[${dateStr}] **${t.username}** memicu \`${t.word}\` (${t.category}) di <#${t.channelId}> ┃ Aksi: \`${t.actionTaken}\``;
              })
              .join('\n')
          : '*Belum ada riwayat pelanggaran kata kasar yang tercatat.*';

        const embed = new V2Embed()
          .setTitle('Moderation Audit Logs 📋')
          .setDescription(desc)
          .build();
        await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
      } else if (subcommand === 'stats') {
        const triggers = getModerationTriggers(interaction.guildId);
        const counts = {};
        triggers.forEach((t) => {
          counts[t.word] = (counts[t.word] || 0) + 1;
        });
        const sorted = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);

        const desc = sorted.length > 0
          ? sorted.map(([word, num], idx) => `**#${idx + 1}** \`${word}\` : \`${num}\` kali`).join('\n')
          : '*Belum ada statistik kata kasar terhitung.*';

        const embed = new V2Embed()
          .setTitle('Bad Word Trigger Stats 📈')
          .setDescription(desc)
          .build();
        await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
      }
    } catch (error) {
      logger.error(`[Moderation Error] Failed managing bad word subcommand "${subcommand}":`, error);
      const embed = new V2Embed()
        .setTitle('System Error ❌')
        .setDescription('Terjadi kesalahan saat memproses permintaan pengelolaan kata kasar.')
        .build();
      await interaction.editReply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
