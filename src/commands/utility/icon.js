import { SlashCommandBuilder, MessageFlags, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import { downloadIcon } from '../../utils/iconHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('icon')
    .setDescription('Download and display an icon from Font Awesome, Lucide, or Simple Icons.')
    .setDMPermission(false)
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
        .setName('format')
        .setDescription('Embed display format (default: V2 Embed)')
        .setRequired(false)
        .addChoices(
          { name: 'V2 Embed (Components V2)', value: 'v2' },
          { name: 'Traditional Embed', value: 'traditional' }
        )
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await interaction.deferReply();

    const name = interaction.options.getString('name');
    const provider = interaction.options.getString('provider') || 'fontawesome';
    const format = interaction.options.getString('format') || 'v2';

    try {
      const icon = await downloadIcon(name, provider);

      if (format === 'v2') {
        const embed = new V2Embed()
          .setTitle(`Icon: ${name}`)
          .setDescription(
            `*   **Provider:** \`${provider}\`\n` +
              `*   **File Name:** \`${icon.fileName}\`\n` +
              `*   **Format/Ext:** \`${icon.ext.toUpperCase()}\``
          );

        // Associate the downloaded file
        embed.thumbnailUrl = icon.localUrl;
        embed.files.push(new AttachmentBuilder(icon.filePath, { name: icon.fileName }));

        const container = embed.build();

        await interaction.editReply({
          content: '',
          components: [container],
          files: embed.files,
          flags: MessageFlags.IsComponentsV2
        });
      } else {
        const attachment = new AttachmentBuilder(icon.filePath, { name: icon.fileName });

        const embed = new EmbedBuilder()
          .setTitle(`Icon: ${name}`)
          .setDescription(
            `*   **Provider:** \`${provider}\`\n` +
              `*   **File Name:** \`${icon.fileName}\`\n` +
              `*   **Format/Ext:** \`${icon.ext.toUpperCase()}\``
          )
          .setThumbnail(icon.localUrl)
          .setColor(0x00ffd2);

        await interaction.editReply({
          content: '',
          embeds: [embed],
          files: [attachment]
        });
      }
    } catch (error) {
      const errorEmbed = new V2Embed()
        .setTitle('Download Failed ❌')
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
