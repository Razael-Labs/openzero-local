import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { runAgent } from '../../utils/aiManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('fox')
    .setDescription('Ask Fox (AI Agent) to perform server tasks or answer questions.')
    .setDescriptionLocalizations({
      id: 'Tanya Fox (AI Agent) untuk membantu tugas server atau menjawab pertanyaan.'
    })
    .addStringOption((option) =>
      option
        .setName('prompt')
        .setDescription('Your request or instruction for Fox')
        .setDescriptionLocalizations({
          id: 'Permintaan atau instruksi Anda untuk Fox'
        })
        .setRequired(true)
    )
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const prompt = interaction.options.getString('prompt');
    await interaction.deferReply();

    try {
      const context = {
        client: interaction.client,
        guild: interaction.guild,
        channel: interaction.channel,
        member: interaction.member,
        user: interaction.user
      };

      const response = await runAgent(prompt, context);

      const replyOptions = {
        content: response.responseText || 'Tugas selesai dijalankan.'
      };

      if (response.result?.embeds) {
        replyOptions.components = response.result.embeds;
        replyOptions.flags = MessageFlags.IsComponentsV2;
      }

      if (response.result?.responseText) {
        replyOptions.content = response.result.responseText;
      } else if (response.responseText) {
        replyOptions.content = response.responseText;
      }

      if (replyOptions.components) {
        delete replyOptions.content;
      }

      await interaction.editReply(replyOptions);
    } catch (error) {
      await interaction.editReply({
        content: `Maaf, terjadi kesalahan saat menjalankan perintah: \`${error.message}\``
      });
    }
  }
};
