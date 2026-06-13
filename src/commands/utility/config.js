import {
  SlashCommandBuilder,
  MessageFlags,
  PermissionFlagsBits,
  ActivityType
} from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import { t } from '../../utils/i18n.js';
import { config, updateConfigValue, unsetConfigValue } from '../../config.js';

// Helper function to map aliases or normalized names to actual config keys
function mapKey(inputKey) {
  const mapping = {
    welcome_channel_id: 'welcome.channelId',
    welcome_channel: 'welcome.channelId',
    'welcome.channelid': 'welcome.channelId',
    obtainium_watcher_channel_id: 'obtainium.channelId',
    obtainium_channel_id: 'obtainium.channelId',
    obtainium_channel: 'obtainium.channelId',
    'obtainium.channelid': 'obtainium.channelId',
    obtainium_message_id: 'obtainium.messageId',
    obtainium_message: 'obtainium.messageId',
    'obtainium.messageid': 'obtainium.messageId',
    logs_channel_id: 'logs.channelId',
    logs_channel: 'logs.channelId',
    'logs.channelid': 'logs.channelId',
    activity_name: 'activity.name',
    'activity.name': 'activity.name',
    activity_type: 'activity.type',
    'activity.type': 'activity.type',
    activity_status: 'activity.status',
    'activity.status': 'activity.status',
    language: 'language',
    groq_model: 'groq.model',
    'groq.model': 'groq.model'
  };

  const normalized = inputKey.toLowerCase().trim();
  return mapping[normalized] || normalized;
}

// Update client presence immediately when status or activity configuration is modified
function updateClientPresence(client) {
  try {
    const actName = config.activity?.name;
    const actTypeString = config.activity?.type || 'PLAYING';

    const typeMap = {
      PLAYING: ActivityType.Playing,
      STREAMING: ActivityType.Streaming,
      LISTENING: ActivityType.Listening,
      WATCHING: ActivityType.Watching,
      COMPETING: ActivityType.Competing
    };

    const actType = typeMap[actTypeString.toUpperCase()] || ActivityType.Playing;
    const botStatus = config.nodeEnv === 'production' ? config.activity?.status || 'online' : 'invisible';

    if (actName) {
      client.user.setPresence({
        activities: [{ name: actName, type: actType }],
        status: botStatus
      });
    }
  } catch (error) {
    console.error('Failed to update presence after config change:', error);
  }
}

export default {
  title: 'Config Bot',
  command: '/config',
  description: 'Mengatur konfigurasi bot secara dinamis.',
  num: 12,
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Mengatur konfigurasi bot secara dinamis.')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('set')
        .setDescription('Mengatur nilai konfigurasi.')
        .addStringOption((option) =>
          option
            .setName('key')
            .setDescription('Kunci konfigurasi (contoh: welcome_channel_id, activity_name)')
            .setRequired(true)
            .addChoices(
              { name: 'welcome_channel_id', value: 'welcome_channel_id' },
              { name: 'obtainium_watcher_channel_id', value: 'obtainium_watcher_channel_id' },
              { name: 'obtainium_message_id', value: 'obtainium_message_id' },
              { name: 'logs_channel_id', value: 'logs_channel_id' },
              { name: 'activity_name', value: 'activity_name' },
              { name: 'activity_type', value: 'activity_type' },
              { name: 'activity_status', value: 'activity_status' },
              { name: 'language', value: 'language' },
              { name: 'groq_model', value: 'groq_model' }
            )
        )
        .addStringOption((option) =>
          option
            .setName('value')
            .setDescription('Nilai baru untuk konfigurasi')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('unset')
        .setDescription('Mengembalikan nilai konfigurasi ke default.')
        .addStringOption((option) =>
          option
            .setName('key')
            .setDescription('Kunci konfigurasi yang ingin di-unset')
            .setRequired(true)
            .addChoices(
              { name: 'welcome_channel_id', value: 'welcome_channel_id' },
              { name: 'obtainium_watcher_channel_id', value: 'obtainium_watcher_channel_id' },
              { name: 'obtainium_message_id', value: 'obtainium_message_id' },
              { name: 'logs_channel_id', value: 'logs_channel_id' },
              { name: 'activity_name', value: 'activity_name' },
              { name: 'activity_type', value: 'activity_type' },
              { name: 'activity_status', value: 'activity_status' },
              { name: 'language', value: 'language' },
              { name: 'groq_model', value: 'groq_model' }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('Menampilkan semua konfigurasi saat ini.')
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const isOwner = interaction.user.id === config.ownerId;
    const isAdmin = interaction.member?.permissions?.has(PermissionFlagsBits.Administrator) || false;

    if (!isOwner && !isAdmin) {
      const errMsg = t('configNoPermission', interaction.locale);
      const embed = new V2Embed()
        .setTitle(t('errorTitle', interaction.locale))
        .setDescription(`❌ ${errMsg}`)
        .build();
      return interaction.reply({
        components: [embed],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const locale = interaction.locale;

    if (subcommand === 'set') {
      const inputKey = interaction.options.getString('key');
      const value = interaction.options.getString('value');
      const mappedKey = mapKey(inputKey);

      updateConfigValue(mappedKey, value);

      // Trigger instant update for client presence if activity fields were updated
      if (inputKey.startsWith('activity')) {
        updateClientPresence(interaction.client);
      }

      const embed = new V2Embed()
        .setTitle(t('configTitle', locale))
        .setDescription(`✅ ${t('configSetSuccess', locale, { key: inputKey, value })}`)
        .build();

      return interaction.reply({
        components: [embed],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }

    if (subcommand === 'unset') {
      const inputKey = interaction.options.getString('key');
      const mappedKey = mapKey(inputKey);

      unsetConfigValue(mappedKey);

      // Trigger instant update for client presence if activity fields were unset
      if (inputKey.startsWith('activity')) {
        updateClientPresence(interaction.client);
      }

      const embed = new V2Embed()
        .setTitle(t('configTitle', locale))
        .setDescription(`✅ ${t('configUnsetSuccess', locale, { key: inputKey })}`)
        .build();

      return interaction.reply({
        components: [embed],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }

    if (subcommand === 'list') {
      const fields = [
        `*   **Owner ID:** \`${config.ownerId || 'Not set'}\``,
        `*   **Language:** \`${config.language}\``,
        `*   **Groq Model:** \`${config.groq?.model || 'Not set'}\``,
        `*   **Welcome Channel ID:** \`${config.welcome?.channelId || 'Not set'}\``,
        `*   **Obtainium Watcher Channel ID:** \`${config.obtainium?.channelId || 'Not set'}\``,
        `*   **Obtainium Message ID:** \`${config.obtainium?.messageId || 'Not set'}\``,
        `*   **Logs Channel ID:** \`${config.logs?.channelId || 'Not set'}\``,
        `*   **Activity Name:** \`${config.activity?.name || 'Not set'}\``,
        `*   **Activity Type:** \`${config.activity?.type || 'Not set'}\``,
        `*   **Activity Status:** \`${config.activity?.status || 'Not set'}\``
      ];

      const embed = new V2Embed()
        .setTitle(t('configListTitle', locale))
        .setDescription(fields.join('\n'))
        .build();

      return interaction.reply({
        components: [embed],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }
  }
};
