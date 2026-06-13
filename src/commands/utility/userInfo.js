import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AuditLogEvent
} from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import { getMessageCount } from '../../utils/database.js';
import { t } from '../../utils/i18n.js';
import logger from '../../utils/logger.js';
import { resolveEmoji } from '../../utils/symbols.js';

export default {
  data: new ContextMenuCommandBuilder()
    .setName('User Info')
    .setNameLocalizations({
      id: 'Informasi Pengguna',
      'en-US': 'User Info'
    })
    .setType(ApplicationCommandType.User)
    .setDMPermission(false),

  /**
   * @param {import('discord.js').UserContextMenuCommandInteraction} interaction
   */
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const targetUser = interaction.targetUser;
    const targetMember = interaction.targetMember;
    const locale = interaction.locale;

    // Fetch full user object from API to get banner and decoration
    let fullUser = targetUser;
    try {
      fullUser = await interaction.client.users.fetch(targetUser.id, { force: true });
    } catch (err) {
      logger.error('[User Info Command] Failed to fetch user:', err);
    }

    const createdTimestamp = Math.floor(targetUser.createdTimestamp / 1000);
    const createdAt = `<t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)`;

    const joinedTimestamp = targetMember ? Math.floor(targetMember.joinedTimestamp / 1000) : null;
    const joinedAt = joinedTimestamp
      ? `<t:${joinedTimestamp}:F> (<t:${joinedTimestamp}:R>)`
      : 'N/A';

    // Get display name and nickname
    const displayName = targetMember
      ? targetMember.displayName
      : targetUser.globalName || targetUser.username;

    const nickname = targetMember?.nickname || t('none', locale);

    // Get roles list
    let rolesString = t('none', locale);
    if (targetMember && targetMember.roles) {
      const roles = targetMember.roles.cache
        .filter((role) => role.id !== interaction.guild.id)
        .map((role) => role.toString());
      if (roles.length > 0) {
        rolesString = roles.join(', ');
      }
    }

    // Get Avatar, Banner and Accent Color
    const globalAvatar = targetUser.displayAvatarURL({ size: 4096 });
    const bannerUrl = fullUser.bannerURL({ size: 4096 });
    const bannerColor = fullUser.hexAccentColor || t('none', locale);

    // Get Server Avatar if available
    const serverAvatar = targetMember?.avatarURL ? targetMember.avatarURL({ size: 4096 }) : null;

    // Get Badges / Flags
    let badges = t('none', locale);
    if (fullUser.flags && typeof fullUser.flags.toArray === 'function') {
      const flagArray = fullUser.flags.toArray();
      if (flagArray.length > 0) {
        const badgeEmojis = {
          Staff: '💼 Discord Staff',
          Partner: '🤝 Partnered Server Owner',
          Hypesquad: '🎗️ HypeSquad Events',
          BugHunterLevel1: '🐛 Bug Hunter Lvl 1',
          BugHunterLevel2: '🐛 Bug Hunter Lvl 2',
          HypeSquadOnlineHouse1: '🏠 Bravery',
          HypeSquadOnlineHouse2: '⚡ Brilliance',
          HypeSquadOnlineHouse3: '🔮 Balance',
          PremiumEarlySupporter: '🎖️ Early Supporter',
          TeamPseudoUser: '👥 Team User',
          VerifiedBot: '🤖 Verified Bot',
          VerifiedDeveloper: '🛠️ Early Verified Bot Developer',
          CertifiedModerator: '👮 Certified Moderator',
          ActiveDeveloper: '💻 Active Developer'
        };
        badges = flagArray.map((flag) => badgeEmojis[flag] || flag).join(', ');
      }
    }

    // Get Bot / System status
    const isBot = targetUser.bot ? `${t('yes', locale)} 🤖` : `${t('no', locale)} 👤`;
    const isSystem = targetUser.system ? `${t('yes', locale)} ⚙️` : `${t('no', locale)} 👤`;

    // Server Booster status
    let boosterText = t('no', locale);
    if (targetMember && targetMember.premiumSinceTimestamp) {
      const boosterTimestamp = Math.floor(targetMember.premiumSinceTimestamp / 1000);
      boosterText = `${t('yes', locale)} 🚀 (Since <t:${boosterTimestamp}:F>)`;
    }

    // Key Guild Permissions
    const keyPermissions = [];
    if (targetMember && targetMember.permissions) {
      if (targetMember.permissions.has('Administrator')) {
        keyPermissions.push('Administrator 👑');
      } else {
        const permsToCheck = [
          'ManageGuild',
          'KickMembers',
          'BanMembers',
          'ManageChannels',
          'ManageMessages',
          'ManageRoles',
          'ManageWebhooks',
          'MentionEveryone'
        ];
        for (const perm of permsToCheck) {
          if (targetMember.permissions.has(perm)) {
            const formatted = perm
              .replace('Guild', ' Server')
              .replace('Members', ' Members')
              .replace('Channels', ' Channels')
              .replace('Messages', ' Messages')
              .replace('Roles', ' Roles')
              .replace('Webhooks', ' Webhooks')
              .replace('Everyone', ' Everyone');
            keyPermissions.push(formatted);
          }
        }
      }
    }
    const keyPermsString =
      keyPermissions.length > 0
        ? keyPermissions.join(', ')
        : `${t('none', locale)} (Regular Member)`;

    // Setup action buttons for PFP and Banner downloads
    const actionRow = new ActionRowBuilder();
    actionRow.addComponents(
      new ButtonBuilder()
        .setLabel(t('downloadPfp', locale))
        .setStyle(ButtonStyle.Link)
        .setURL(globalAvatar)
        .setEmoji(resolveEmoji(interaction.guild, '🖼️'))
    );

    if (serverAvatar) {
      actionRow.addComponents(
        new ButtonBuilder()
          .setLabel(t('downloadServerAvatar', locale))
          .setStyle(ButtonStyle.Link)
          .setURL(serverAvatar)
          .setEmoji(resolveEmoji(interaction.guild, '👤'))
      );
    }

    if (bannerUrl) {
      actionRow.addComponents(
        new ButtonBuilder()
          .setLabel(t('downloadBanner', locale))
          .setStyle(ButtonStyle.Link)
          .setURL(bannerUrl)
          .setEmoji(resolveEmoji(interaction.guild, '🏳️'))
      );
    }

    // Activity and Presence Info
    let presenceText = `Offline / ${t('none', locale)}`;
    let userStatusText = 'Offline / Invisible ⚫';
    const guildMember = interaction.guild?.members?.cache?.get(targetUser.id) || targetMember;
    const presence = guildMember?.presence;

    if (presence) {
      if (presence.status) {
        const statusMap = {
          online: 'Online 🟢',
          idle: 'Idle 🌙',
          dnd: 'Do Not Disturb 🔴',
          offline: 'Offline / Invisible ⚫'
        };
        userStatusText = statusMap[presence.status] || presence.status;
      }

      if (presence.activities && presence.activities.length > 0) {
        presenceText = presence.activities
          .map((act) => {
            if (act.type === 4) return `Custom Status: "${act.state || ''}"`;
            if (act.type === 0) return `Playing: **${act.name}**`;
            if (act.type === 2) return `Listening to: **${act.name}** (${act.state || ''})`;
            return `${act.name}`;
          })
          .join(', ');
      }
    }

    // Check Mute and Timeout punishments
    const isVoiceMuted = guildMember?.voice?.mute ? t('yes', locale) : t('no', locale);

    let hasMutedRole = t('no', locale);
    if (targetMember && targetMember.roles) {
      const hasMute = targetMember.roles.cache.some(
        (r) => r.name.toLowerCase() === 'muted' || r.name.toLowerCase() === 'mute'
      );
      if (hasMute) hasMutedRole = t('yes', locale);
    }

    const isTimedOut =
      guildMember && guildMember.isCommunicationDisabled
        ? guildMember.isCommunicationDisabled()
        : false;
    const timeoutUntil = isTimedOut
      ? `<t:${Math.floor(guildMember.communicationDisabledUntilTimestamp / 1000)}:R>`
      : t('no', locale);

    // Punishment History Checks (Audit Logs & Guild Ban Fetching)
    let isCurrentlyBanned = false;
    try {
      const ban = await interaction.guild.bans.fetch(targetUser.id);
      if (ban) isCurrentlyBanned = true;
    } catch {
      // Ignore
    }

    let historyText = `${t('currentlyBanned', locale)}: ${isCurrentlyBanned ? `${t('yes', locale)} ❌` : `${t('no', locale)} ✅`}`;
    try {
      const auditLogs = await interaction.guild.fetchAuditLogs({
        limit: 100,
        target: targetUser.id
      });
      let kicks = 0;
      let bans = 0;
      let timeouts = 0;

      for (const entry of auditLogs.entries.values()) {
        if (entry.action === AuditLogEvent.MemberKick) kicks++;
        if (entry.action === AuditLogEvent.MemberBanAdd) bans++;
        if (entry.action === AuditLogEvent.MemberUpdate) {
          const timeoutChange = entry.changes?.find(
            (c) => c.key === 'communication_disabled_until'
          );
          if (timeoutChange) timeouts++;
        }
      }
      historyText += ` | ${t('kicksLogged', locale)}: ${kicks} | ${t('bansLogged', locale)}: ${bans} | ${t('timeoutsLogged', locale)}: ${timeouts}`;
    } catch {
      historyText += ` | ${t('lacksAuditLogPerm', locale)}`;
    }

    const msgCount = getMessageCount(interaction.guildId || '', targetUser.id);

    const description =
      `*   **${t('username', locale)}:** ${targetUser.username}\n` +
      `*   **${t('displayName', locale)}:** ${displayName}\n` +
      `*   **${t('serverNickname', locale)}:** ${nickname}\n` +
      `*   **${t('userId', locale)}:** \`${targetUser.id}\`\n` +
      `*   **${t('botAccount', locale)}:** ${isBot}\n` +
      `*   **${t('systemAccount', locale)}:** ${isSystem}\n` +
      `*   **${t('accountBadges', locale)}:** ${badges}\n` +
      `*   **${t('roles', locale)}:** ${rolesString}\n` +
      `*   **${t('serverBooster', locale)}:** ${boosterText}\n` +
      `*   **${t('keyServerPermissions', locale)}:** ${keyPermsString}\n` +
      `*   **${t('userStatus', locale)}:** ${userStatusText}\n` +
      `*   **${t('presenceActivity', locale)}:** ${presenceText}\n` +
      `*   **${t('messagesSent', locale)}:** **${t('messagesCountSuffix', locale, { count: msgCount })}**\n` +
      `*   **${t('globalAvatar', locale)}:** [URL Link](${globalAvatar})\n` +
      `*   **${t('serverAvatar', locale)}:** ${serverAvatar ? `[URL Link](${serverAvatar})` : t('none', locale)}\n` +
      `*   **${t('bannerColor', locale)}:** \`${bannerColor}\`\n\n` +
      `**${t('historyDates', locale)}**\n` +
      `*   **${t('joinedDiscord', locale)}:** ${createdAt}\n` +
      `*   **${t('joinedServer', locale)}:** ${joinedAt}\n\n` +
      `**${t('punishmentStatus', locale)}**\n` +
      `*   **${t('voiceMuted', locale)}:** ${isVoiceMuted}\n` +
      `*   **${t('mutedRoleAssigned', locale)}:** ${hasMutedRole}\n` +
      `*   **${t('timedOutMuted', locale)}:** ${timeoutUntil}\n` +
      `*   **${t('historyLogs', locale)}:** ${historyText}`;

    const embed = new V2Embed()
      .setTitle(t('userInfoTitle', locale))
      .setDescription(description)
      .addActionRow(actionRow)
      .build();

    await interaction.editReply({
      components: [embed],
      flags: MessageFlags.IsComponentsV2
    });

    logger.info(`[User Info Command] Sukses menampilkan info lengkap untuk ${targetUser.tag}`);
  }
};
