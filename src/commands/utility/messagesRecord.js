import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  MessageFlags
} from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import { getUserMessages } from '../../utils/supabase.js';
import { t } from '../../utils/i18n.js';
import logger from '../../utils/logger.js';

export default {
  data: new ContextMenuCommandBuilder()
    .setName('Messages Record')
    .setNameLocalizations({
      id: 'Rekaman Pesan',
      'en-US': 'Messages Record'
    })
    .setType(ApplicationCommandType.User)
    .setDMPermission(false),

  /**
   * @param {import('discord.js').UserContextMenuCommandInteraction} interaction
   */
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const targetUser = interaction.targetUser;
    const guildId = interaction.guildId || '';
    const locale = interaction.locale;

    try {
      const records = await getUserMessages(guildId, targetUser.id);

      let description = '';
      if (!records || records.length === 0) {
        description = t('noMessagesRecord', locale, { tag: targetUser.tag });
      } else {
        description = t('messagesRecordIntro', locale, { tag: targetUser.tag });

        // Ambil maksimal 15 pesan terbaru
        const displayRecords = records.slice(0, 15);
        for (const record of displayRecords) {
          const timestamp = Math.floor(new Date(record.created_at).getTime() / 1000);
          const timeTag = `<t:${timestamp}:R>`;
          const channelDisplay = record.channel_name ? `#${record.channel_name}` : `<#${record.channel_id}>`;
          
          // Potong isi pesan jika terlalu panjang
          let msgContent = record.content || '';
          if (msgContent.length > 150) {
            msgContent = msgContent.substring(0, 147) + '...';
          }
          
          description += `*   [${timeTag}] ${t('chatAt', locale)} **${channelDisplay}**: \`${msgContent.replace(/`/g, '\\`').replace(/\n/g, ' ')}\`\n`;
        }

        if (records.length > 15) {
          description += t('moreMessagesText', locale, { count: records.length - 15 });
        }
      }

      const embed = new V2Embed()
        .setTitle(t('messagesRecordTitle', locale, { username: targetUser.username }))
        .setDescription(description)
        .build();

      await interaction.editReply({
        components: [embed],
        flags: MessageFlags.IsComponentsV2
      });

      logger.info(
        `[Messages Record Command] Sukses menampilkan rekaman pesan (${records.length} total) untuk ${targetUser.tag}`
      );
    } catch (err) {
      logger.error('[Messages Record Command] Gagal mengambil rekaman pesan:', err);
      
      const errorEmbed = new V2Embed()
        .setTitle(t('errorTitle', locale))
        .setDescription(t('messagesRecordError', locale))
        .build();

      await interaction.editReply({
        components: [errorEmbed],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
