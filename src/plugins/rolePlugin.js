import { V2Embed } from '../utils/v2Embed.js';

export const rolePlugin = {
  name: 'role',
  commands: ['role'],
  description:
    'Manage member roles in the guild. Actions include "add" (assigns role to a user), "remove" (removes role from a user), and "info" (retrieves details about a role).',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['add', 'remove', 'info'],
        description: 'The role management action.'
      },
      userId: { type: 'string', description: 'ID of the member to modify.' },
      roleId: { type: 'string', description: 'ID of the role to assign, remove, or inspect.' }
    },
    required: ['action', 'roleId']
  },

  async execute(args, context) {
    const { action, userId, roleId } = args;
    const { guild } = context;

    if (!guild) {
      return { success: false, error: 'Context requires a guild.' };
    }

    const role = guild.roles.cache.get(roleId);
    if (!role) {
      return { success: false, error: `Role not found with ID: ${roleId}` };
    }

    if (action === 'add' || action === 'remove') {
      if (!userId) {
        return { success: false, error: 'User ID is required for add/remove actions.' };
      }
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) {
        return { success: false, error: `Member not found with ID: ${userId}` };
      }

      if (action === 'add') {
        await member.roles.add(role);
        const embed = new V2Embed()
          .setTitle('Role Added Successfully! ✅')
          .setDescription(
            `Successfully added role **${role.name}** (\`${role.id}\`) to **${member.user.tag}**.`
          )
          .build();
        return {
          success: true,
          method: 'add',
          responseText: `Saya telah menambahkan role **${role.name}** ke pengguna **${member.user.tag}**.`,
          embeds: [embed]
        };
      } else {
        await member.roles.remove(role);
        const embed = new V2Embed()
          .setTitle('Role Removed Successfully! ✅')
          .setDescription(
            `Successfully removed role **${role.name}** (\`${role.id}\`) from **${member.user.tag}**.`
          )
          .build();
        return {
          success: true,
          method: 'remove',
          responseText: `Saya telah menghapus role **${role.name}** dari pengguna **${member.user.tag}**.`,
          embeds: [embed]
        };
      }
    } else if (action === 'info') {
      const embed = new V2Embed()
        .setTitle('Role Details 🔍')
        .setDescription(
          `*   **Role Name:** **${role.name}**\n` +
            `*   **Role ID:** \`${role.id}\`\n` +
            `*   **Color Hex:** \`${role.hexColor}\`\n` +
            `*   **Position:** \`${role.position}\`\n` +
            `*   **Members Count:** \`${role.members.size}\` members`
        )
        .setColor(role.color)
        .build();

      return {
        success: true,
        method: 'info',
        responseText: `Berikut adalah detail role **${role.name}** (ID: \`${role.id}\`) dengan ${role.members.size} anggota.`,
        embeds: [embed]
      };
    }

    return { success: false, error: `Unsupported action: ${action}` };
  }
};
