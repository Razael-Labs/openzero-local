import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import { downloadIcon } from '../../utils/iconHelper.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('icon-to-emoji')
    .setDescription('Download an icon and add it as an emoji in this server.')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers)
    .addStringOption((option) =>
      option
        .setName('name')
        .setDescription('Name of the icon (e.g., github, heart, star, user)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('provider')
        .setDescription('Icon provider to use (default: fontawesome)')
        .setRequired(false)
        .addChoices(
          { name: 'Font Awesome', value: 'fontawesome' },
          { name: 'Lucide Icons', value: 'lucide' },
          { name: 'Simple Icons', value: 'simpleicons' }
        )
    )
    .addStringOption((option) =>
      option
        .setName('emoji_name')
        .setDescription('The name of the emoji to create (defaults to icon name)')
        .setRequired(false)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await interaction.deferReply();

    const name = interaction.options.getString('name');
    const provider = interaction.options.getString('provider') || 'fontawesome';

    // Sanitize emoji name: only alphanumeric characters and underscores are allowed
    const rawEmojiName = interaction.options.getString('emoji_name') || name;
    const emojiName = rawEmojiName.replace(/[^a-zA-Z0-9_]/g, '_');

    if (emojiName.length < 2) {
      const errorEmbed = new V2Embed()
        .setTitle('Invalid Name ❌')
        .setDescription(
          'Emoji names must be at least 2 characters long and contain only alphanumeric characters or underscores.'
        )
        .setColor(0xff3333)
        .build();
      return await interaction.editReply({
        components: [errorEmbed],
        flags: MessageFlags.IsComponentsV2
      });
    }

    // Verify client has permission to manage emojis and stickers
    if (
      !interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)
    ) {
      const errorEmbed = new V2Embed()
        .setTitle('Permission Denied ❌')
        .setDescription(
          'The bot does not have `Manage Emojis and Stickers` permission on this server.'
        )
        .setColor(0xff3333)
        .build();
      return await interaction.editReply({
        components: [errorEmbed],
        flags: MessageFlags.IsComponentsV2
      });
    }

    try {
      // Download the icon as PNG, constrained to 128x128 size for Discord emojis
      const icon = await downloadIcon(name, provider, { size: 128 });

      // Create the emoji in the guild
      const emoji = await interaction.guild.emojis.create({
        attachment: icon.filePath,
        name: emojiName,
        reason: `Icon: ${name} from provider ${provider} by ${interaction.user.tag}`
      });

      const successEmbed = new V2Embed()
        .setTitle('Emoji Created ✅')
        .setDescription(
          `Successfully created a new emoji in this server!\n\n` +
            `*   **Emoji:** ${emoji} (\`:${emoji.name}:\`)\n` +
            `*   **Original Icon:** \`${name}\` (${provider})`
        )
        .setColor(0x00ffd2);

      await interaction.editReply({
        components: [successEmbed.build()],
        flags: MessageFlags.IsComponentsV2
      });

      logger.info(
        `[Emoji] Created emoji "${emoji.name}" in guild "${interaction.guild.name}" using icon "${name}"`
      );
    } catch (error) {
      logger.error('[Emoji Error] Failed to create emoji:', error);
      const errorEmbed = new V2Embed()
        .setTitle('Emoji Creation Failed ❌')
        .setDescription(error.message)
        .setColor(0xff3333)
        .build();

      await interaction.editReply({
        components: [errorEmbed],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
