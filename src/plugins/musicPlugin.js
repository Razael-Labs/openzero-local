import { getOrCreateSession, fetchVideoInfoViaYtDlp } from '../utils/musicManager.js';
import { V2Embed } from '../utils/v2Embed.js';

export const musicPlugin = {
  name: 'music',
  description: 'Play and control YouTube music playback in voice channels. Actions include "play" (add and play a song), "pause" (pause playback), "resume" (resume playback), "skip" (skip current song), "stop" (stop playback and disconnect), and "queue" (view upcoming songs).',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['play', 'pause', 'resume', 'skip', 'stop', 'queue'], description: 'The music action to execute.' },
      query: { type: 'string', description: 'YouTube URL or search keywords (required for "play").' },
      voiceChannelId: { type: 'string', description: 'The voice channel ID to join (required for "play").' },
      twentyFourSeven: { type: 'boolean', description: 'If true, the bot will stay in the voice channel 24/7 and won\'t leave when the queue is empty.' }
    },
    required: ['action']
  },

  async execute(args, context) {
    const { action, query, voiceChannelId, twentyFourSeven } = args;
    const { guild, member } = context;

    if (!guild) {
      return { success: false, error: 'Context requires a guild.' };
    }

    // Resolve voice channel
    let voiceChannel = member?.voice?.channel;
    if (!voiceChannel && voiceChannelId) {
      voiceChannel = guild.channels.cache.get(voiceChannelId);
    }

    if (!voiceChannel && action === 'play') {
      return { success: false, error: 'Anda harus berada di saluran suara (voice channel) atau menyertakan voiceChannelId.' };
    }

    const textChannel = context.channel || context.textChannel;
    const session = getOrCreateSession(guild.id, voiceChannel, textChannel);

    if (twentyFourSeven !== undefined) {
      session.is247 = twentyFourSeven;
    }

    if (action === 'play') {
      if (!query) {
        return { success: false, error: 'Query lagu wajib diisi untuk aksi "play".' };
      }

      const videoInfo = await fetchVideoInfoViaYtDlp(query);
      const videoUrl = videoInfo.url;
      const videoTitle = videoInfo.title;
      const duration = videoInfo.duration;
      const thumbnail = videoInfo.thumbnail;

      const track = {
        title: videoTitle,
        url: videoUrl,
        duration: duration,
        thumbnail: thumbnail,
        requestedBy: member?.user?.tag || 'AI Agent'
      };

      session.addTrack(track);

      const embed = new V2Embed()
        .setTitle('🎵 Added to Queue')
        .setDescription(`Berhasil memasukkan **[${videoTitle}](${videoUrl})** ke dalam antrean.`)
        .build();

      return {
        success: true,
        method: 'play',
        data: { url: videoUrl, title: videoTitle },
        responseText: `Saya telah memutar **${videoTitle}** di saluran suara **${voiceChannel.name}**.`,
        embeds: [embed]
      };
    } else if (action === 'pause') {
      session.pause();
      const embed = new V2Embed().setTitle('⏸️ Paused').setDescription('Pemutaran musik ditangguhkan.').build();
      return {
        success: true,
        method: 'pause',
        responseText: 'Pemutaran musik berhasil ditangguhkan.',
        embeds: [embed]
      };
    } else if (action === 'resume') {
      session.resume();
      const embed = new V2Embed().setTitle('▶️ Resumed').setDescription('Melanjutkan pemutaran musik.').build();
      return {
        success: true,
        method: 'resume',
        responseText: 'Melanjutkan pemutaran musik.',
        embeds: [embed]
      };
    } else if (action === 'skip') {
      session.skip();
      const embed = new V2Embed().setTitle('⏭️ Skipped').setDescription('Lagu saat ini dilompati.').build();
      return {
        success: true,
        method: 'skip',
        responseText: 'Lagu saat ini telah dilompati.',
        embeds: [embed]
      };
    } else if (action === 'stop') {
      session.destroy();
      const embed = new V2Embed().setTitle('⏹️ Stopped').setDescription('Pemutaran dihentikan dan bot keluar dari voice channel.').build();
      return {
        success: true,
        method: 'stop',
        responseText: 'Pemutaran lagu telah dihentikan sepenuhnya.',
        embeds: [embed]
      };
    } else if (action === 'queue') {
      const q = session.queue || [];
      const current = session.currentTrack;
      let desc = '';
      if (current) {
        desc += `**Playing Now:** [${current.title}](${current.url}) (Diminta oleh: ${current.requestedBy})\n\n`;
      }
      if (q.length > 0) {
        desc += `**Antrean Selanjutnya:**\n` + q.map((t, idx) => `${idx + 1}. [${t.title}](${t.url})`).join('\n');
      } else {
        desc += 'Antrean lagu kosong.';
      }

      const embed = new V2Embed().setTitle('📋 Music Queue').setDescription(desc).build();
      return {
        success: true,
        method: 'queue',
        data: { current, queue: q },
        responseText: `Berikut adalah daftar antrean lagu saat ini.`,
        embeds: [embed]
      };
    }

    return { success: false, error: `Unsupported action: ${action}` };
  }
};
