import { PermissionFlagsBits, Events } from 'discord.js';
import logger from '../utils/logger.js';

/**
 * Memproses command prefix khusus developer untuk keperluan testing/debugging event.
 * @param {import('discord.js').Message} message - Objek pesan dari event messageCreate
 * @returns {Promise<boolean>} Mengembalikan true jika pesan diproses sebagai command developer, sebaliknya false
 */
export async function handleDevCommand(message) {
  // Gunakan prefix '!' untuk command developer
  const prefix = '!';
  if (!message.content.startsWith(prefix)) return false;

  // Hanya izinkan Administrator server untuk mengeksekusi command developer
  if (message.guild) {
    if (!message.member || !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return false;
    }
  } else {
    // Abaikan jika pesan bukan di dalam guild/server
    return false;
  }

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Command untuk mengetes welcome message canvas
  if (command === 'test-welcome' || command === 'testwelcome') {
    const targetMember = message.mentions.members.first() || message.member;
    logger.info(`[Dev Command] Memicu event welcome secara manual untuk member: ${targetMember.user.tag}`);

    const statusMsg = await message.reply(`⚙️ **[Dev Tool]** Memicu event \`GuildMemberAdd\` untuk ${targetMember.toString()}...`);

    try {
      // Emit event GuildMemberAdd secara manual pada client Discord
      message.client.emit(Events.GuildMemberAdd, targetMember);

      setTimeout(async () => {
        try {
          await statusMsg.edit(`⚙️ **[Dev Tool]** Event \`GuildMemberAdd\` untuk ${targetMember.toString()} berhasil dipicu!`);
        } catch (err) {
          // Abaikan jika pesan sudah dihapus oleh pengguna
        }
      }, 1500);
    } catch (error) {
      logger.error('[Dev Command] Gagal memicu event GuildMemberAdd secara manual:', error);
      await statusMsg.edit(`❌ **[Dev Tool]** Gagal memicu event: ${error.message}`).catch(() => {});
    }
    return true;
  }

  return false;
}
