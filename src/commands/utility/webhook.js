import {
  SlashCommandBuilder,
  MessageFlags,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import logger from '../../utils/logger.js';
import { resolveEmoji } from '../../utils/symbols.js';

export default {
  data: new SlashCommandBuilder()
    .setName('webhook')
    .setDescription('Manage webhooks on the server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageWebhooks)
    .setDMPermission(false)
    // SUBCOMMAND: CREATE
    .addSubcommand((subcommand) =>
      subcommand
        .setName('create')
        .setDescription('Create a new webhook on a specific channel.')
        .addStringOption((option) =>
          option
            .setName('title')
            .setDescription('Name or title of the webhook to create')
            .setRequired(true)
        )
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Channel where the webhook will be created')
            .addChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement,
              ChannelType.GuildVoice
            )
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('pfp')
            .setDescription('Profile picture/Avatar URL for the webhook (optional)')
            .setRequired(false)
        )
    )
    // SUBCOMMAND: INFO
    .addSubcommand((subcommand) =>
      subcommand
        .setName('info')
        .setDescription('Inspect details of a webhook by ID or URL.')
        .addStringOption((option) =>
          option
            .setName('id_or_url')
            .setDescription('Enter Webhook ID or full Webhook URL')
            .setRequired(true)
        )
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (subcommand === 'create') {
      const title = interaction.options.getString('title');
      const channel = interaction.options.getChannel('channel');
      const pfp = interaction.options.getString('pfp') || null;

      try {
        // Validate avatar URL if provided
        if (pfp && !pfp.startsWith('http://') && !pfp.startsWith('https://')) {
          const embedError = new V2Embed()
            .setTitle('Failed to Create Webhook ❌')
            .setDescription(
              'The avatar/pfp URL you entered is invalid. It must start with `http://` or `https://`.'
            )
            .setColor(0xff0000)
            .build();

          return await interaction.editReply({
            components: [embedError],
            flags: MessageFlags.IsComponentsV2
          });
        }

        // Create the webhook on specified channel
        const webhook = await channel.createWebhook({
          name: title,
          avatar: pfp,
          reason: `Created by ${interaction.user.tag} via slash command.`
        });

        // V2 interactive action button to copy Webhook URL (Link Button)
        const actionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('Copy Webhook URL')
            .setStyle(ButtonStyle.Link)
            .setURL(webhook.url)
            .setEmoji(resolveEmoji(interaction.guild, '📋'))
        );

        const embedSuccess = new V2Embed()
          .setTitle('Webhook Created Successfully! 🎉')
          .setDescription(
            `*   **Webhook Name:** \`${webhook.name}\`\n` +
              `*   **Channel:** ${channel}\n` +
              `*   **Webhook ID:** \`${webhook.id}\`\n` +
              `*   **Token:** \`||${webhook.token}||\``
          )
          .addActionRow(actionRow)
          .build();

        await interaction.editReply({
          components: [embedSuccess],
          flags: MessageFlags.IsComponentsV2
        });

        logger.info(
          `[Webhook Created] Webhook "${title}" successfully created in #${channel.name} by ${interaction.user.tag}`
        );
      } catch (error) {
        logger.error('[Webhook Error] Failed to create webhook:', error);

        const embedError = new V2Embed()
          .setTitle('Failed to Create Webhook ❌')
          .setDescription(
            `An error occurred while trying to create the webhook: \`${error.message}\``
          )
          .setColor(0xff0000)
          .build();

        await interaction.editReply({
          components: [embedError],
          flags: MessageFlags.IsComponentsV2
        });
      }
    } else if (subcommand === 'info') {
      const idOrUrl = interaction.options.getString('id_or_url').trim();

      try {
        let webhookId = idOrUrl;
        let webhookToken = null;

        // Try extracting ID and Token if input is a Discord Webhook URL
        const webhookUrlRegex = /discord\.com\/api\/webhooks\/(\d+)\/([\w-]+)/;
        const match = idOrUrl.match(webhookUrlRegex);
        if (match) {
          webhookId = match[1];
          webhookToken = match[2];
        }

        // Fetch Webhook data
        let webhook = null;
        if (webhookToken) {
          webhook = await interaction.client.fetchWebhook(webhookId, webhookToken);
        } else {
          const webhooks = await interaction.guild.fetchWebhooks();
          webhook = webhooks.get(webhookId);
        }

        if (!webhook) {
          const embedNotFound = new V2Embed()
            .setTitle('Webhook Not Found ❌')
            .setDescription('Could not find a webhook with the provided ID or URL in this server.')
            .setColor(0xff0000)
            .build();

          return await interaction.editReply({
            components: [embedNotFound],
            flags: MessageFlags.IsComponentsV2
          });
        }

        // V2 interactive action button to copy Webhook URL
        const actionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('Copy Webhook URL')
            .setStyle(ButtonStyle.Link)
            .setURL(webhook.url)
            .setEmoji(resolveEmoji(interaction.guild, '📋'))
        );

        const channel =
          interaction.guild.channels.cache.get(webhook.channelId) || `<#${webhook.channelId}>`;

        const embedInfo = new V2Embed()
          .setTitle('Webhook Details 🔍')
          .setDescription(
            `*   **Webhook Name:** \`${webhook.name}\`\n` +
              `*   **Channel:** ${channel}\n` +
              `*   **Webhook ID:** \`${webhook.id}\`\n` +
              `*   **Created By:** ${webhook.owner ? `${webhook.owner} (\`${webhook.owner.id}\`)` : 'Unknown'}`
          )
          .addActionRow(actionRow)
          .build();

        await interaction.editReply({
          components: [embedInfo],
          flags: MessageFlags.IsComponentsV2
        });

        logger.info(
          `[Webhook Info] Webhook ${webhook.id} details successfully displayed for ${interaction.user.tag}`
        );
      } catch (error) {
        logger.error('[Webhook Info Error] Failed to fetch webhook details:', error);

        const embedError = new V2Embed()
          .setTitle('Failed to Fetch Webhook Details ❌')
          .setDescription(`An error occurred while processing your request: \`${error.message}\``)
          .setColor(0xff0000)
          .build();

        await interaction.editReply({
          components: [embedError],
          flags: MessageFlags.IsComponentsV2
        });
      }
    }
  }
};
