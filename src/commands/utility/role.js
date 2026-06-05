import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import logger from '../../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists and set local JSON database path
const DATA_DIR = path.join(__dirname, '../../../data');
const DB_PATH = path.join(DATA_DIR, 'custom_role_templates.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper functions to read/write custom templates database
function getCustomTemplates() {
  if (!fs.existsSync(DB_PATH)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (error) {
    logger.error('[DB Error] Failed to read custom templates database:', error);
    return {};
  }
}

function saveCustomTemplates(templates) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(templates, null, 2), 'utf8');
  } catch (error) {
    logger.error('[DB Error] Failed to write custom templates database:', error);
  }
}

// Permission map bitmask for custom templates creation
const PERMISSION_MAP = {
  // General Server Permissions
  administrator: PermissionFlagsBits.Administrator,
  manage_server: PermissionFlagsBits.ManageGuild,
  manage_roles: PermissionFlagsBits.ManageRoles,
  manage_channels: PermissionFlagsBits.ManageChannels,
  view_audit_log: PermissionFlagsBits.ViewAuditLog,

  // Membership Permissions
  kick: PermissionFlagsBits.KickMembers,
  ban: PermissionFlagsBits.BanMembers,

  // Text Channel Permissions
  view_channel: PermissionFlagsBits.ViewChannel,
  send_messages: PermissionFlagsBits.SendMessages,
  embed_links: PermissionFlagsBits.EmbedLinks,
  attach_files: PermissionFlagsBits.AttachFiles,
  read_history: PermissionFlagsBits.ReadMessageHistory,
  manage_messages: PermissionFlagsBits.ManageMessages,

  // Voice Channel Permissions
  connect: PermissionFlagsBits.Connect,
  speak: PermissionFlagsBits.Speak,
  mute_members: PermissionFlagsBits.MuteMembers,
  deafen_members: PermissionFlagsBits.DeafenMembers,
  move_members: PermissionFlagsBits.MoveMembers,

  // Application Commands
  use_slash: PermissionFlagsBits.UseApplicationCommands
};

// Descriptions for each permission string
const PERMISSION_DESCRIPTIONS = {
  administrator: 'Full administrative control (bypasses all channel protections and permissions).',
  manage_server: 'Allows editing server settings, name, region, integrations, and widgets.',
  manage_roles: 'Allows creating, editing, and deleting roles below the bot\'s highest role.',
  manage_channels: 'Allows creating, editing, and deleting channels on the server.',
  view_audit_log: 'Allows viewing audit logs of admin and moderator actions.',
  kick: 'Allows kicking members from the server.',
  ban: 'Allows banning members permanently from the server.',
  view_channel: 'Allows viewing text and voice channels (basic channel access).',
  send_messages: 'Allows sending messages in text channels.',
  embed_links: 'Allows sending formatted links with rich embeds/previews.',
  attach_files: 'Allows uploading files and media in channels.',
  read_history: 'Allows reading past message history in channels.',
  manage_messages: 'Allows deleting other users\' messages or pinning messages.',
  connect: 'Allows joining voice channels.',
  speak: 'Allows speaking/communicating in voice channels.',
  mute_members: 'Allows muting other members in voice channels.',
  deafen_members: 'Allows deafening other members in voice channels.',
  move_members: 'Allows moving members between voice channels or disconnecting them.',
  use_slash: 'Allows using application commands and slash commands.'
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
    .setDescription('Manage user roles and permissions on the server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false)
    // SUBCOMMAND: ADD
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Assign a role to a specific user.')
        .addUserOption((option) =>
          option.setName('user').setDescription('User to receive the role').setRequired(true)
        )
        .addRoleOption((option) =>
          option.setName('role').setDescription('Role to assign').setRequired(true)
        )
    )
    // SUBCOMMAND: REMOVE
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Remove a role from a specific user.')
        .addUserOption((option) =>
          option.setName('user').setDescription('User to remove the role from').setRequired(true)
        )
        .addRoleOption((option) =>
          option.setName('role').setDescription('Role to remove').setRequired(true)
        )
    )
    // SUBCOMMAND: ID
    .addSubcommand((subcommand) =>
      subcommand
        .setName('id')
        .setDescription('Get detailed ID information for a specific role.')
        .addRoleOption((option) =>
          option.setName('role').setDescription('Role to inspect').setRequired(true)
        )
    )
    // SUBCOMMAND: CREATE
    .addSubcommand((subcommand) =>
      subcommand
        .setName('create')
        .setDescription('Create a new role with a preset or custom permission template.')
        .addStringOption((option) =>
          option.setName('name').setDescription('Name of the new role').setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('template')
            .setDescription('Preset template name or your custom template name')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('color')
            .setDescription('HEX color code for the role (e.g. #FFD700) (optional)')
            .setRequired(false)
        )
    )
    // SUBCOMMAND: SETTEMPLATE
    .addSubcommand((subcommand) =>
      subcommand
        .setName('settemplate')
        .setDescription('Reset existing role permissions based on a template.')
        .addRoleOption((option) =>
          option
            .setName('role')
            .setDescription('Target role to modify permissions')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('template')
            .setDescription('Preset name (owner/admin/mods/member) or custom template name')
            .setRequired(true)
        )
    )
    // SUBCOMMAND: SAVETEMPLATE
    .addSubcommand((subcommand) =>
      subcommand
        .setName('savetemplate')
        .setDescription('Save an existing role\'s permissions as a new custom template.')
        .addStringOption((option) =>
          option.setName('name').setDescription('Name of the new custom template').setRequired(true)
        )
        .addRoleOption((option) =>
          option
            .setName('role')
            .setDescription('Role to use as a template reference')
            .setRequired(true)
        )
    )
    // SUBCOMMAND: CREATETEMPLATE
    .addSubcommand((subcommand) =>
      subcommand
        .setName('createtemplate')
        .setDescription('Create a custom permission template from scratch and save to database.')
        .addStringOption((option) =>
          option.setName('name').setDescription('Name of the new custom template').setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('permissions')
            .setDescription(
              'Comma-separated list of permissions (e.g. view_channel,send_messages,kick)'
            )
            .setRequired(true)
        )
    )
    // SUBCOMMAND: LISTPERMS
    .addSubcommand((subcommand) =>
      subcommand
        .setName('listperms')
        .setDescription('Show all valid permission strings and descriptions for createtemplate.')
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // SUBCOMMAND LISTPERMS
    if (subcommand === 'listperms') {
      try {
        let desc =
          'Here are all the valid permission strings you can use in `/role createtemplate`:\n\n';

        for (const [key, value] of Object.entries(PERMISSION_DESCRIPTIONS)) {
          desc += `*   **\`${key}\`**: ${value}\n`;
        }

        const embedPerms = new V2Embed()
          .setTitle('Valid Permission Strings 📑')
          .setDescription(desc)
          .build();

        await interaction.editReply({
          components: [embedPerms],
          flags: MessageFlags.IsComponentsV2
        });

        logger.info(`[Role Perms Listed] Permissions list displayed for ${interaction.user.tag}`);
      } catch (error) {
        logger.error('[Role Perms List Error] Failed to display permissions list:', error);

        const embedError = new V2Embed()
          .setTitle('Failed to Display List ❌')
          .setDescription(`An error occurred while processing data: \`${error.message}\``)
          .setColor(0xff0000)
          .build();

        await interaction.editReply({
          components: [embedError],
          flags: MessageFlags.IsComponentsV2
        });
      }
      return;
    }

    // SUBCOMMAND ID
    if (subcommand === 'id') {
      try {
        const targetRole = interaction.options.getRole('role');

        const embedInfo = new V2Embed()
          .setTitle('Role ID Information 🔍')
          .setDescription(
            `*   **Role:** ${targetRole}\n` +
              `*   **Name:** \`${targetRole.name}\`\n` +
              `*   **ID:** \`${targetRole.id}\`\n` +
              `*   **Hex Color:** \`${targetRole.hexColor}\`\n` +
              `*   **Position:** \`${targetRole.position}\``
          )
          .build();

        await interaction.editReply({
          components: [embedInfo],
          flags: MessageFlags.IsComponentsV2
        });

        logger.info(
          `[Role ID Checked] ${interaction.user.tag} checked ID for role "${targetRole.name}"`
        );
      } catch (error) {
        logger.error('[Role ID Error] Failed to fetch role ID info:', error);

        const embedError = new V2Embed()
          .setTitle('Failed to Check Role ID ❌')
          .setDescription(`An error occurred while processing your request: \`${error.message}\``)
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
            .setTitle('Failed to Save Template ❌')
            .setDescription(
              'Template name cannot use preset names (`owner`, `admin`, `mods`, `member`).'
            )
            .setColor(0xff0000)
            .build();

          return await interaction.editReply({
            components: [embedError],
            flags: MessageFlags.IsComponentsV2
          });
        }

        const bitfield = role.permissions.bitfield;
        const customTemplates = getCustomTemplates();

        customTemplates[templateName] = bitfield.toString();
        saveCustomTemplates(customTemplates);

        const embedSuccess = new V2Embed()
          .setTitle('Custom Template Saved! 💾')
          .setDescription(
            `Custom template \`${templateName}\` successfully created.\n` +
              `*   **Reference Role:** ${role}\n` +
              `*   **Bitfield Value:** \`${bitfield}\`\n\n` +
              'You can now use this template in `/role create` or `/role settemplate`!'
          )
          .build();

        await interaction.editReply({
          components: [embedSuccess],
          flags: MessageFlags.IsComponentsV2
        });

        logger.info(
          `[Role Template Saved] ${interaction.user.tag} saved template "${templateName}" from role ${role.name}`
        );
      } catch (error) {
        logger.error('[Role Template Save Error] Failed to save custom template:', error);

        const embedError = new V2Embed()
          .setTitle('Failed to Save Template ❌')
          .setDescription(`An error occurred while saving custom template: \`${error.message}\``)
          .setColor(0xff0000)
          .build();

        await interaction.editReply({
          components: [embedError],
          flags: MessageFlags.IsComponentsV2
        });
      }
      return;
    }

    // SUBCOMMAND CREATETEMPLATE
    if (subcommand === 'createtemplate') {
      try {
        const templateName = interaction.options.getString('name').toLowerCase().trim();
        const permissionsInput = interaction.options.getString('permissions').toLowerCase().trim();

        if (['owner', 'admin', 'mods', 'member'].includes(templateName)) {
          const embedError = new V2Embed()
            .setTitle('Failed to Create Template ❌')
            .setDescription(
              'Template name cannot use preset names (`owner`, `admin`, `mods`, `member`).'
            )
            .setColor(0xff0000)
            .build();

          return await interaction.editReply({
            components: [embedError],
            flags: MessageFlags.IsComponentsV2
          });
        }

        const requestedPermissions = permissionsInput.split(',').map((p) => p.trim());
        let finalBitfield = 0n;
        const validList = [];
        const invalidList = [];

        for (const permKey of requestedPermissions) {
          if (PERMISSION_MAP[permKey] !== undefined) {
            finalBitfield |= PERMISSION_MAP[permKey];
            validList.push(`\`${permKey}\``);
          } else {
            invalidList.push(`\`${permKey}\``);
          }
        }

        if (validList.length === 0) {
          const embedError = new V2Embed()
            .setTitle('Failed to Create Template ❌')
            .setDescription(
              'No valid permissions were recognized.\n' +
                'Use `/role listperms` to view a list of valid permission strings.'
            )
            .setColor(0xff0000)
            .build();

          return await interaction.editReply({
            components: [embedError],
            flags: MessageFlags.IsComponentsV2
          });
        }

        const customTemplates = getCustomTemplates();
        customTemplates[templateName] = finalBitfield.toString();
        saveCustomTemplates(customTemplates);

        let details =
          `Custom template \`${templateName}\` successfully saved to database.\n\n` +
          `*   **Active Permissions:** ${validList.join(', ')}\n` +
          `*   **Bitfield Value:** \`${finalBitfield}\``;

        if (invalidList.length > 0) {
          details += `\n*   **Unrecognized (Ignored):** ${invalidList.join(', ')}`;
        }

        const embedSuccess = new V2Embed()
          .setTitle('Template Created Successfully! 💾')
          .setDescription(details)
          .build();

        await interaction.editReply({
          components: [embedSuccess],
          flags: MessageFlags.IsComponentsV2
        });

        logger.info(
          `[Role Template Created] ${interaction.user.tag} created custom template "${templateName}" directly from input`
        );
      } catch (error) {
        logger.error('[Role Template Create Error] Failed to create custom template:', error);

        const embedError = new V2Embed()
          .setTitle('Failed to Create Template ❌')
          .setDescription(`An error occurred while creating custom template: \`${error.message}\``)
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

        // Validate bot role hierarchy
        const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
        if (role.position >= botMember.roles.highest.position) {
          const embedError = new V2Embed()
            .setTitle('Failed to Modify Role ❌')
            .setDescription(
              `Cannot modify permissions for role ${role} because it is equal to or higher than the bot's highest role.`
            )
            .setColor(0xff0000)
            .build();

          return await interaction.editReply({
            components: [embedError],
            flags: MessageFlags.IsComponentsV2
          });
        }

        let targetPermissions = null;

        if (PRESETS[templateInput]) {
          targetPermissions = PRESETS[templateInput];
        } else {
          // Check local custom template database
          const customTemplates = getCustomTemplates();
          if (customTemplates[templateInput]) {
            targetPermissions = BigInt(customTemplates[templateInput]);
          }
        }

        if (targetPermissions === null) {
          const embedError = new V2Embed()
            .setTitle('Template Not Found ❌')
            .setDescription(
              `Template \`${templateInput}\` was not found in presets or custom templates.`
            )
            .setColor(0xff0000)
            .build();

          return await interaction.editReply({
            components: [embedError],
            flags: MessageFlags.IsComponentsV2
          });
        }

        await role.setPermissions(
          targetPermissions,
          `Modified based on template ${templateInput} by ${interaction.user.tag}`
        );

        const embedSuccess = new V2Embed()
          .setTitle('Role Permissions Updated! 🛡️')
          .setDescription(
            `Successfully reset permissions for role ${role} based on template \`${templateInput.toUpperCase()}\`.`
          )
          .build();

        await interaction.editReply({
          components: [embedSuccess],
          flags: MessageFlags.IsComponentsV2
        });

        logger.info(
          `[Role Template Set] Permissions for role "${role.name}" updated to template ${templateInput} by ${interaction.user.tag}`
        );
      } catch (error) {
        logger.error('[Role Template Set Error] Failed to update role permissions:', error);

        const embedError = new V2Embed()
          .setTitle('Failed to Modify Role Permissions ❌')
          .setDescription(`An error occurred while updating role permissions: \`${error.message}\``)
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

        // Validate HEX color
        let roleColor = 0;
        if (hexColorInput) {
          const hexRegex = /^#?[0-9A-F]{6}$/i;
          if (!hexRegex.test(hexColorInput)) {
            const embedError = new V2Embed()
              .setTitle('Invalid Color ❌')
              .setDescription(
                'Incorrect HEX color format. Please use format like `#FFD700` or `FFD700`.'
              )
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

        let permissions = null;
        let defaultColor = roleColor;

        if (PRESETS[templateInput]) {
          permissions = PRESETS[templateInput];
          if (!hexColorInput) {
            if (templateInput === 'owner') defaultColor = 0xe91e63;
            else if (templateInput === 'admin') defaultColor = 0x3498db;
            else if (templateInput === 'mods') defaultColor = 0x2ecc71;
            else if (templateInput === 'member') defaultColor = 0x979c9f;
          }
        } else {
          // Check local custom template database
          const customTemplates = getCustomTemplates();
          if (customTemplates[templateInput]) {
            permissions = BigInt(customTemplates[templateInput]);
          }
        }

        if (permissions === null) {
          const embedError = new V2Embed()
            .setTitle('Template Not Found ❌')
            .setDescription(
              `Template \`${templateInput}\` was not found in presets or custom templates.`
            )
            .setColor(0xff0000)
            .build();

          return await interaction.editReply({
            components: [embedError],
            flags: MessageFlags.IsComponentsV2
          });
        }

        const newRole = await interaction.guild.roles.create({
          name: name,
          permissions: permissions,
          color: defaultColor,
          reason: `Created by ${interaction.user.tag} using /role create subcommand with template ${templateInput}.`
        });

        const embedSuccess = new V2Embed()
          .setTitle('Role Created Successfully! 🎉')
          .setDescription(
            `*   **Role:** ${newRole}\n` +
              `*   **Name:** \`${newRole.name}\`\n` +
              `*   **ID:** \`${newRole.id}\`\n` +
              `*   **Permission Template:** \`${templateInput.toUpperCase()}\`\n` +
              `*   **Hex Color:** \`${newRole.hexColor}\``
          )
          .build();

        await interaction.editReply({
          components: [embedSuccess],
          flags: MessageFlags.IsComponentsV2
        });

        logger.info(
          `[Role Created] Role "${newRole.name}" created by ${interaction.user.tag} with template ${templateInput}`
        );
      } catch (error) {
        logger.error('[Role Create Error] Failed to create new role:', error);

        const embedError = new V2Embed()
          .setTitle('Failed to Create Role ❌')
          .setDescription(`An error occurred while creating role: \`${error.message}\``)
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

    // Fetch GuildMember target
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      const embedError = new V2Embed()
        .setTitle('User Not Found ❌')
        .setDescription('Could not find the specified user in this server.')
        .setColor(0xff0000)
        .build();

      return await interaction.editReply({
        components: [embedError],
        flags: MessageFlags.IsComponentsV2
      });
    }

    // Validate bot role hierarchy
    const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
    if (targetRole.position >= botMember.roles.highest.position) {
      const embedError = new V2Embed()
        .setTitle('Failed to Modify Role ❌')
        .setDescription(
          `Cannot manage role ${targetRole} because it is equal to or higher than the bot's highest role.`
        )
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
            .setTitle('Role Information ℹ️')
            .setDescription(`${targetUser} already has the role ${targetRole}.`)
            .setColor(0xffd700)
            .build();

          return await interaction.editReply({
            components: [embedInfo],
            flags: MessageFlags.IsComponentsV2
          });
        }

        await member.roles.add(
          targetRole,
          `Assigned by ${interaction.user.tag} via slash command.`
        );

        const embedSuccess = new V2Embed()
          .setTitle('Role Successfully Assigned! 🎉')
          .setDescription(`Successfully assigned role ${targetRole} to user ${targetUser}.`)
          .build();

        await interaction.editReply({
          components: [embedSuccess],
          flags: MessageFlags.IsComponentsV2
        });

        logger.info(
          `[Role Added] Role "${targetRole.name}" assigned to ${targetUser.tag} by ${interaction.user.tag}`
        );
      } catch (error) {
        logger.error('[Role Add Error] Failed to assign role:', error);

        const embedError = new V2Embed()
          .setTitle('Failed to Assign Role ❌')
          .setDescription(`An error occurred while assigning role: \`${error.message}\``)
          .setColor(0xff0000)
          .build();

        await interaction.editReply({
          components: [embedError],
          flags: MessageFlags.IsComponentsV2
        });
      }
    } else if (subcommand === 'remove') {
      try {
        if (!member.roles.cache.has(targetRole.id)) {
          const embedInfo = new V2Embed()
            .setTitle('Role Information ℹ️')
            .setDescription(`${targetUser} does not have the role ${targetRole}.`)
            .setColor(0xffd700)
            .build();

          return await interaction.editReply({
            components: [embedInfo],
            flags: MessageFlags.IsComponentsV2
          });
        }

        await member.roles.remove(
          targetRole,
          `Removed by ${interaction.user.tag} via slash command.`
        );

        const embedSuccess = new V2Embed()
          .setTitle('Role Successfully Removed! 🛡️')
          .setDescription(`Successfully removed role ${targetRole} from user ${targetUser}.`)
          .build();

        await interaction.editReply({
          components: [embedSuccess],
          flags: MessageFlags.IsComponentsV2
        });

        logger.info(
          `[Role Removed] Role "${targetRole.name}" removed from ${targetUser.tag} by ${interaction.user.tag}`
        );
      } catch (error) {
        logger.error('[Role Remove Error] Failed to remove role:', error);

        const embedError = new V2Embed()
          .setTitle('Failed to Remove Role ❌')
          .setDescription(`An error occurred while removing role: \`${error.message}\``)
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
