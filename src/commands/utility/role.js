import {
  SlashCommandBuilder,
  MessageFlags,
  PermissionFlagsBits
} from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import logger from '../../utils/logger.js';
import fs from 'fs';
import path from 'path';

// Pastikan direktori data ada dan siapkan path database JSON lokal
const DATA_DIR = path.resolve('./data');
const DB_PATH = path.join(DATA_DIR, 'custom_role_templates.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Fungsi helper untuk membaca/menulis database kustom template
function getCustomTemplates() {
  if (!fs.existsSync(DB_PATH)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (error) {
    logger.error('[DB Error] Gagal membaca berkas database kustom template:', error);
    return {};
  }
}

function saveCustomTemplates(templates) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(templates, null, 2), 'utf8');
  } catch (error) {
    logger.error('[DB Error] Gagal menulis berkas database kustom template:', error);
  }
}

// Map permission bitmask yang dapat digunakan dalam pembuatan template custom
const PERMISSION_MAP = {
  // General Server Permissions
  'administrator': PermissionFlagsBits.Administrator,
  'manage_server': PermissionFlagsBits.ManageGuild,
  'manage_roles': PermissionFlagsBits.ManageRoles,
  'manage_channels': PermissionFlagsBits.ManageChannels,
  'view_audit_log': PermissionFlagsBits.ViewAuditLog,
  
  // Membership Permissions
  'kick': PermissionFlagsBits.KickMembers,
  'ban': PermissionFlagsBits.BanMembers,
  
  // Text Channel Permissions
  'view_channel': PermissionFlagsBits.ViewChannel,
  'send_messages': PermissionFlagsBits.SendMessages,
  'embed_links': PermissionFlagsBits.EmbedLinks,
  'attach_files': PermissionFlagsBits.AttachFiles,
  'read_history': PermissionFlagsBits.ReadMessageHistory,
  'manage_messages': PermissionFlagsBits.ManageMessages,
  
  // Voice Channel Permissions
  'connect': PermissionFlagsBits.Connect,
  'speak': PermissionFlagsBits.Speak,
  'mute_members': PermissionFlagsBits.MuteMembers,
  'deafen_members': PermissionFlagsBits.DeafenMembers,
  'move_members': PermissionFlagsBits.MoveMembers,

  // Application Commands
  'use_slash': PermissionFlagsBits.UseApplicationCommands
};

// Preset standard permissions
const PRESETS = {
  owner: [PermissionFlagsBits.Administrator],
  admin: [
    PermissionFlagsBits.ManageGuild,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.ViewAuditLog,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.MuteMembers,
    PermissionFlagsBits.DeafenMembers,
    PermissionFlagsBits.MoveMembers,
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.Connect,
    PermissionFlagsBits.Speak
  ],
  mods: [
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.ViewAuditLog,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.MuteMembers,
    PermissionFlagsBits.DeafenMembers,
    PermissionFlagsBits.MoveMembers,
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.Connect,
    PermissionFlagsBits.Speak
  ],
  member: [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.Connect,
    PermissionFlagsBits.Speak,
    PermissionFlagsBits.UseApplicationCommands
  ]
};

export default {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Mengelola role atau peran untuk pengguna di server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false)
    // SUBCOMMAND: ADD
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Menambahkan role ke pengguna tertentu.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('Pengguna yang ingin diberikan role')
            .setRequired(true)
        )
        .addRoleOption((option) =>
          option
            .setName('role')
            .setDescription('Role yang ingin ditambahkan')
            .setRequired(true)
        )
    )
    // SUBCOMMAND: REMOVE
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Menghapus role dari pengguna tertentu.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('Pengguna yang rolenya ingin dihapus')
            .setRequired(true)
        )
        .addRoleOption((option) =>
          option
            .setName('role')
            .setDescription('Role yang ingin dihapus')
            .setRequired(true)
        )
    )
    // SUBCOMMAND: ID
    .addSubcommand((subcommand) =>
      subcommand
        .setName('id')
        .setDescription('Mengecek informasi ID dari role spesifik.')
        .addRoleOption((option) =>
          option
            .setName('role')
            .setDescription('Role yang ingin dicek ID-nya')
            .setRequired(true)
        )
    )
    // SUBCOMMAND: CREATE
    .addSubcommand((subcommand) =>
      subcommand
        .setName('create')
        .setDescription('Membuat role baru dengan template permission tertentu.')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Nama role yang ingin dibuat')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('template')
            .setDescription('Pilih template preset bawaan atau masukkan nama template custom Anda')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('color')
            .setDescription('Kode warna HEX untuk role (contoh: #FFD700) (opsional)')
            .setRequired(false)
        )
    )
    // SUBCOMMAND: SETTEMPLATE
    .addSubcommand((subcommand) =>
      subcommand
        .setName('settemplate')
        .setDescription('Menetapkan ulang permission role yang ada berdasarkan template.')
        .addRoleOption((option) =>
          option
            .setName('role')
            .setDescription('Role target yang ingin diubah permission-nya')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('template')
            .setDescription('Pilih nama template preset (owner/admin/mods/member) atau template kustom')
            .setRequired(true)
        )
    )
    // SUBCOMMAND: SAVETEMPLATE (custom)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('savetemplate')
        .setDescription('Menyimpan konfigurasi permission role yang ada saat ini sebagai template kustom baru.')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Nama template kustom baru yang ingin disimpan')
            .setRequired(true)
        )
        .addRoleOption((option) =>
          option
            .setName('role')
            .setDescription('Role yang permission-nya ingin dijadikan referensi template kustom')
            .setRequired(true)
        )
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // SUBCOMMAND ID
    if (subcommand === 'id') {
      try {
        const targetRole = interaction.options.getRole('role');

        const embedInfo = new V2Embed()
          .setTitle('Informasi ID Role 🔍')
          .setDescription(
            `*   **Nama Role:** ${targetRole}\n` +
            `*   **Nama Teks:** \`${targetRole.name}\`\n` +
            `*   **ID Role:** \`${targetRole.id}\`\n` +
            `*   **Warna Hex:** \`${targetRole.hexColor}\`\n` +
            `*   **Posisi:** \`${targetRole.position}\``
          )
          .build();

        await interaction.editReply({
          components: [embedInfo],
          flags: MessageFlags.IsComponentsV2
        });

        logger.info(`[Role ID Checked] ${interaction.user.tag} mengecek ID untuk role "${targetRole.name}"`);
      } catch (error) {
        logger.error('[Role ID Error] Gagal mengambil informasi ID role:', error);

        const embedError = new V2Embed()
          .setTitle('Gagal Mengecek ID Role ❌')
          .setDescription(`Terjadi kesalahan saat memproses permintaan: \`${error.message}\``)
          .setColor(0xff0000)
          .build();

        await interaction.editReply({
          components: [embedError],
          flags: MessageFlags.IsComponentsV2
        });
      }
      return;
    }

    // SUBCOMMAND SAVETEMPLATE
    if (subcommand === 'savetemplate') {
      try {
        const templateName = interaction.options.getString('name').toLowerCase().trim();
        const role = interaction.options.getRole('role');

        if (['owner', 'admin', 'mods', 'member'].includes(templateName)) {
          const embedError = new V2Embed()
            .setTitle('Gagal Menyimpan Template ❌')
            .setDescription('Nama template tidak boleh menggunakan nama preset bawaan (`owner`, `admin`, `mods`, `member`).')
            .setColor(0xff0000)
            .build();

          return await interaction.editReply({
            components: [embedError],
            flags: MessageFlags.IsComponentsV2
          });
        }

        // Dapatkan bitmask permissions role saat ini & jadikan array string permission yang aktif
        const bitfield = role.permissions.bitfield;
        const customTemplates = getCustomTemplates();
        
        customTemplates[templateName] = bitfield.toString(); // Simpan bitfield sebagai string karena JSON tidak mendukung BigInt secara langsung
        saveCustomTemplates(customTemplates);

        const embedSuccess = new V2Embed()
          .setTitle('Template Kustom Disimpan! 💾')
          .setDescription(
            `Template kustom \`${templateName}\` berhasil dibuat.\n` +
            `*   **Role Referensi:** ${role}\n` +
            `*   **Nilai Bitfield:** \`${bitfield}\`\n\n` +
            `Sekarang Anda dapat menggunakan template ini di \`/role create\` atau \`/role settemplate\`!`
          )
          .build();

        await interaction.editReply({
          components: [embedSuccess],
          flags: MessageFlags.IsComponentsV2
        });

        logger.info(`[Role Template Saved] ${interaction.user.tag} menyimpan template baru "${templateName}" dari role ${role.name}`);
      } catch (error) {
        logger.error('[Role Template Save Error] Gagal menyimpan template kustom:', error);

        const embedError = new V2Embed()
          .setTitle('Gagal Menyimpan Template ❌')
          .setDescription(`Terjadi kesalahan saat menyimpan template kustom: \`${error.message}\``)
          .setColor(0xff0000)
          .build();

        await interaction.editReply({
          components: [embedError],
          flags: MessageFlags.IsComponentsV2
        });
      }
      return;
    }

    // SUBCOMMAND SETTEMPLATE
    if (subcommand === 'settemplate') {
      try {
        const role = interaction.options.getRole('role');
        const templateInput = interaction.options.getString('template').toLowerCase().trim();

        // Validasi hierarki role bot
        const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
        if (role.position >= botMember.roles.highest.position) {
          const embedError = new V2Embed()
            .setTitle('Gagal Mengubah Role ❌')
            .setDescription(`Tidak dapat mengubah permission untuk role ${role} karena posisi role tersebut sama atau lebih tinggi dari role tertinggi bot ini.`)
            .setColor(0xff0000)
            .build();

          return await interaction.editReply({
            components: [embedError],
            flags: MessageFlags.IsComponentsV2
          });
        }

        // Tentukan set permissions
        let targetPermissions = null;

        if (PRESETS[templateInput]) {
          targetPermissions = PRESETS[templateInput];
        } else {
          // Cari di database template kustom lokal
          const customTemplates = getCustomTemplates();
          if (customTemplates[templateInput]) {
            targetPermissions = BigInt(customTemplates[templateInput]);
          }
        }

        if (targetPermissions === null) {
          const embedError = new V2Embed()
            .setTitle('Template Tidak Ditemukan ❌')
            .setDescription(`Template \`${templateInput}\` tidak ditemukan di preset bawaan maupun template kustom lokal.`)
            .setColor(0xff0000)
            .build();

          return await interaction.editReply({
            components: [embedError],
            flags: MessageFlags.IsComponentsV2
          });
        }

        // Ubah permission role
        await role.setPermissions(targetPermissions, `Diubah berdasarkan template ${templateInput} oleh ${interaction.user.tag}`);

        const embedSuccess = new V2Embed()
          .setTitle('Permission Role Diperbarui! 🛡️')
          .setDescription(`Berhasil menetapkan ulang permission untuk role ${role} berdasarkan template \`${templateInput.toUpperCase()}\`.`)
          .build();

        await interaction.editReply({
          components: [embedSuccess],
          flags: MessageFlags.IsComponentsV2
        });

        logger.info(`[Role Template Set] Permission untuk role "${role.name}" diubah ke template ${templateInput} oleh ${interaction.user.tag}`);
      } catch (error) {
        logger.error('[Role Template Set Error] Gagal mengubah permission role:', error);

        const embedError = new V2Embed()
          .setTitle('Gagal Mengubah Permission Role ❌')
          .setDescription(`Terjadi kesalahan saat memperbarui permission role: \`${error.message}\``)
          .setColor(0xff0000)
          .build();

        await interaction.editReply({
          components: [embedError],
          flags: MessageFlags.IsComponentsV2
        });
      }
      return;
    }

    // SUBCOMMAND CREATE
    if (subcommand === 'create') {
      try {
        const name = interaction.options.getString('name');
        const templateInput = interaction.options.getString('template').toLowerCase().trim();
        const hexColorInput = interaction.options.getString('color') || null;

        // Validasi input warna HEX jika disediakan
        let roleColor = 0; // Default: tanpa warna kustom
        if (hexColorInput) {
          const hexRegex = /^#?[0-9A-F]{6}$/i;
          if (!hexRegex.test(hexColorInput)) {
            const embedError = new V2Embed()
              .setTitle('Warna Tidak Valid ❌')
              .setDescription('Format warna HEX salah. Harap gunakan format seperti `#FFD700` atau `FFD700`.')
              .setColor(0xff0000)
              .build();

            return await interaction.editReply({
              components: [embedError],
              flags: MessageFlags.IsComponentsV2
            });
          }
          const cleanHex = hexColorInput.replace('#', '');
          roleColor = parseInt(cleanHex, 16);
        }

        // Dapatkan permission dari template preset atau kustom database
        let permissions = null;
        let defaultColor = roleColor;

        if (PRESETS[templateInput]) {
          permissions = PRESETS[templateInput];
          // Set warna default jika user tidak menentukan
          if (!hexColorInput) {
            if (templateInput === 'owner') defaultColor = 0xe91e63;
            else if (templateInput === 'admin') defaultColor = 0x3498db;
            else if (templateInput === 'mods') defaultColor = 0x2ecc71;
            else if (templateInput === 'member') defaultColor = 0x979c9f;
          }
        } else {
          // Cari di database template kustom lokal
          const customTemplates = getCustomTemplates();
          if (customTemplates[templateInput]) {
            permissions = BigInt(customTemplates[templateInput]);
          }
        }

        if (permissions === null) {
          const embedError = new V2Embed()
            .setTitle('Template Tidak Ditemukan ❌')
            .setDescription(`Template \`${templateInput}\` tidak ditemukan di preset bawaan maupun template kustom lokal.`)
            .setColor(0xff0000)
            .build();

          return await interaction.editReply({
            components: [embedError],
            flags: MessageFlags.IsComponentsV2
          });
        }

        // Membuat role baru di server
        const newRole = await interaction.guild.roles.create({
          name: name,
          permissions: permissions,
          color: defaultColor,
          reason: `Dibuat oleh ${interaction.user.tag} menggunakan subcommand /role create dengan template ${templateInput}.`
        });

        const embedSuccess = new V2Embed()
          .setTitle('Role Berhasil Dibuat! 🎉')
          .setDescription(
            `*   **Nama Role:** ${newRole}\n` +
            `*   **Nama Teks:** \`${newRole.name}\`\n` +
            `*   **ID Role:** \`${newRole.id}\`\n` +
            `*   **Template Permission:** \`${templateInput.toUpperCase()}\`\n` +
            `*   **Warna Hex:** \`${newRole.hexColor}\``
          )
          .build();

        await interaction.editReply({
          components: [embedSuccess],
          flags: MessageFlags.IsComponentsV2
        });

        logger.info(`[Role Created] Role "${newRole.name}" berhasil dibuat oleh ${interaction.user.tag} dengan template ${templateInput}`);
      } catch (error) {
        logger.error('[Role Create Error] Gagal membuat role baru:', error);

        const embedError = new V2Embed()
          .setTitle('Gagal Membuat Role ❌')
          .setDescription(`Terjadi kesalahan saat memproses pembuatan role: \`${error.message}\``)
          .setColor(0xff0000)
          .build();

        await interaction.editReply({
          components: [embedError],
          flags: MessageFlags.IsComponentsV2
        });
      }
      return;
    }

    const targetUser = interaction.options.getUser('user');
    const targetRole = interaction.options.getRole('role');

    // Mendapatkan GuildMember target
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      const embedError = new V2Embed()
        .setTitle('Pengguna Tidak Ditemukan ❌')
        .setDescription('Tidak dapat menemukan pengguna tersebut di dalam server ini.')
        .setColor(0xff0000)
        .build();

      return await interaction.editReply({
        components: [embedError],
        flags: MessageFlags.IsComponentsV2
      });
    }

    // Mendapatkan posisi tertinggi bot di server untuk validasi hierarki role
    const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
    if (targetRole.position >= botMember.roles.highest.position) {
      const embedError = new V2Embed()
        .setTitle('Gagal Mengelola Role ❌')
        .setDescription(`Tidak dapat mengelola role ${targetRole} karena posisinya sama atau lebih tinggi dari posisi role tertinggi bot ini.`)
        .setColor(0xff0000)
        .build();

      return await interaction.editReply({
        components: [embedError],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (subcommand === 'add') {
      try {
        if (member.roles.cache.has(targetRole.id)) {
          const embedInfo = new V2Embed()
            .setTitle('Informasi Role ℹ️')
            .setDescription(`${targetUser} sudah memiliki role ${targetRole}.`)
            .setColor(0xffd700)
            .build();

          return await interaction.editReply({
            components: [embedInfo],
            flags: MessageFlags.IsComponentsV2
          });
        }

        await member.roles.add(targetRole, `Diberikan oleh ${interaction.user.tag} via slash command.`);

        const embedSuccess = new V2Embed()
          .setTitle('Role Berhasil Ditambahkan! 🎉')
          .setDescription(`Berhasil menambahkan role ${targetRole} ke pengguna ${targetUser}.`)
          .build();

        await interaction.editReply({
          components: [embedSuccess],
          flags: MessageFlags.IsComponentsV2
        });

        logger.info(`[Role Added] Role "${targetRole.name}" ditambahkan ke ${targetUser.tag} oleh ${interaction.user.tag}`);
      } catch (error) {
        logger.error('[Role Add Error] Gagal menambahkan role:', error);

        const embedError = new V2Embed()
          .setTitle('Gagal Menambahkan Role ❌')
          .setDescription(`Terjadi kesalahan saat menambahkan role: \`${error.message}\``)
          .setColor(0xff0000)
          .build();

        await interaction.editReply({
          components: [embedError],
          flags: MessageFlags.IsComponentsV2
        });
      }
    } 
    
    else if (subcommand === 'remove') {
      try {
        if (!member.roles.cache.has(targetRole.id)) {
          const embedInfo = new V2Embed()
            .setTitle('Informasi Role ℹ️')
            .setDescription(`${targetUser} tidak memiliki role ${targetRole}.`)
            .setColor(0xffd700)
            .build();

          return await interaction.editReply({
            components: [embedInfo],
            flags: MessageFlags.IsComponentsV2
          });
        }

        await member.roles.remove(targetRole, `Dihapus oleh ${interaction.user.tag} via slash command.`);

        const embedSuccess = new V2Embed()
          .setTitle('Role Berhasil Dihapus! 🛡️')
          .setDescription(`Berhasil menghapus role ${targetRole} dari pengguna ${targetUser}.`)
          .build();

        await interaction.editReply({
          components: [embedSuccess],
          flags: MessageFlags.IsComponentsV2
        });

        logger.info(`[Role Removed] Role "${targetRole.name}" dihapus dari ${targetUser.tag} oleh ${interaction.user.tag}`);
      } catch (error) {
        logger.error('[Role Remove Error] Gagal menghapus role:', error);

        const embedError = new V2Embed()
          .setTitle('Gagal Menghapus Role ❌')
          .setDescription(`Terjadi kesalahan saat menghapus role: \`${error.message}\``)
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
