import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js';
import { V2Embed } from '../utils/v2Embed.js';
import { resolveEmoji } from '../utils/symbols.js';

export const webhookPlugin = {
  name: 'webhook',
  description: 'Manage webhooks in the guild. Actions include "create" (creates a new webhook in a channel) and "info" (retrieves info about an existing webhook by ID or URL).',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['create', 'info'], description: 'The webhook action to perform.' },
      title: { type: 'string', description: 'Name of the webhook to create.' },
      channelId: { type: 'string', description: 'Channel ID where the webhook should be created.' },
      pfp: { type: 'string', description: 'Optional profile picture URL for the webhook.' },
      id_or_url: { type: 'string', description: 'Webhook ID or full URL for information inspection.' }
    },
    required: ['action']
  },

  /**
   * Execute the webhook action
   * @param {object} args
   * @param {object} context
   */
  async execute(args, context) {
    const { action, title, channelId, pfp, id_or_url } = args;
    const { guild, client } = context;

    if (!guild) {
      return { success: false, error: 'Context requires a guild.' };
    }

    if (action === 'create') {
      if (!title || !channelId) {
        return { success: false, error: 'Creating a webhook requires a "title" and a "channelId".' };
      }

      const channel = guild.channels.cache.get(channelId);
      if (!channel || ![ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice].includes(channel.type)) {
        return { success: false, error: `Invalid text channel: ${channelId}` };
      }

      if (pfp && !pfp.startsWith('http://') && !pfp.startsWith('https://')) {
        return { success: false, error: 'Profile picture URL must start with http:// or https://' };
      }

      const webhook = await channel.createWebhook({
        name: title,
        avatar: pfp || null,
        reason: `Created by AI Agent.`
      });

      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Copy Webhook URL')
          .setStyle(ButtonStyle.Link)
          .setURL(webhook.url)
          .setEmoji(resolveEmoji(guild, '📋'))
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

      return {
        success: true,
        method: 'create',
        data: {
          id: webhook.id,
          name: webhook.name,
          url: webhook.url,
          token: webhook.token,
          channelId: webhook.channelId
        },
        embeds: [embedSuccess],
        components: [actionRow],
        responseText: `Baik! Ini adalah hasil dari request pembuatan webhook mu:\n* **Nama Webhook**: \`${webhook.name}\`\n* **Channel**: <#${webhook.channelId}>\n* **Webhook URL**: ${webhook.url}`
      };
    } else if (action === 'info') {
      if (!id_or_url) {
        return { success: false, error: 'Webhook info action requires "id_or_url".' };
      }

      let webhookId = id_or_url.trim();
      let webhookToken = null;

      const webhookUrlRegex = /discord\.com\/api\/webhooks\/(\d+)\/([\w-]+)/;
      const match = webhookId.match(webhookUrlRegex);
      if (match) {
        webhookId = match[1];
        webhookToken = match[2];
      }

      let webhook = null;
      if (webhookToken) {
        webhook = await client.fetchWebhook(webhookId, webhookToken);
      } else {
        const webhooks = await guild.fetchWebhooks();
        webhook = webhooks.get(webhookId);
      }

      if (!webhook) {
        return { success: false, error: `Webhook not found with ID/URL: ${id_or_url}` };
      }

      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Copy Webhook URL')
          .setStyle(ButtonStyle.Link)
          .setURL(webhook.url)
          .setEmoji(resolveEmoji(guild, '📋'))
      );

      const channel = guild.channels.cache.get(webhook.channelId) || `<#${webhook.channelId}>`;

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

      return {
        success: true,
        method: 'info',
        data: {
          id: webhook.id,
          name: webhook.name,
          url: webhook.url,
          channelId: webhook.channelId
        },
        embeds: [embedInfo],
        components: [actionRow],
        responseText: `Berikut adalah detail webhook yang Anda minta:\n* **Nama Webhook**: \`${webhook.name}\`\n* **Channel**: <#${webhook.channelId}>\n* **ID Webhook**: \`${webhook.id}\``
      };
    }

    return { success: false, error: `Unsupported action: ${action}` };
  }
};
