const { ApplicationCommandOptionType, MessageFlags, PermissionsBitField } = require('discord.js');
const db = require('../../database/connection');
const { CV2, errorReply, text, section, separator } = require('../../utils/messages');
const { fetchAvatar } = require('../../services/roblox');
const log = require('../../utils/logger');

function getPermissionLevel(member) {
  const perms = member.permissions;
  if (member.guild.ownerId === member.id) return 'Owner';
  if (perms.has(PermissionsBitField.Flags.Administrator)) return 'Administrator';
  if (perms.has(PermissionsBitField.Flags.ManageGuild) || perms.has(PermissionsBitField.Flags.ManageRoles)) return 'Moderator';
  if (perms.has(PermissionsBitField.Flags.KickMembers) || perms.has(PermissionsBitField.Flags.BanMembers)) return 'Limited';
  return 'None';
}

async function buildMainPayload(member) {
  const components = [];

  const discordLines = [
    `## User Info`,
    `**Username:** ${member.user.username}`,
    `**ID:** ${member.id}`,
    `**Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
    `**Joined:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
    `**Permission Level:** ${getPermissionLevel(member)}`
  ];

  components.push(section(
    discordLines.join('\n'),
    member.user.displayAvatarURL({ extension: 'png', size: 256 })
  ));

  const verified = db.prepare('SELECT * FROM verified_users WHERE discord_id = ?').get(member.id);

  if (verified) {
    const avatar = await fetchAvatar(verified.roblox_user_id);
    components.push(separator());

    const verifyLines = [
      `**Roblox Account**`,
      `**Username:** ${verified.roblox_username}`,
      `**User ID:** ${verified.roblox_user_id}`,
      `**Verified:** <t:${verified.verified_at}:R>`
    ];

    if (avatar) {
      components.push(section(verifyLines.join('\n'), avatar));
    } else {
      components.push(text(verifyLines.join('\n')));
    }
  }

  const archiveCount = db.prepare('SELECT COUNT(*) as c FROM verify_archive WHERE discord_id = ?').get(member.id).c;

  if (archiveCount > 0) {
    components.push(separator());
    components.push({
      type: 1,
      components: [{
        type: 2,
        style: 2,
        label: `Past Verifications (${archiveCount})`,
        custom_id: `userinfo_archive:${member.id}`
      }]
    });
  }

  return {
    flags: CV2 | MessageFlags.Ephemeral,
    components: [{ type: 17, components }]
  };
}

async function handleUserInfoCommand(interaction) {
  const targetUser = interaction.options.getUser('user');

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!member) {
    return interaction.editReply(errorReply('Could not find that member in this server.'));
  }

  log.action('userinfo', `${interaction.user.username} looked up ${targetUser.username}`);

  const payload = await buildMainPayload(member);
  await interaction.editReply(payload);
}

async function handleUserInfoButton(interaction) {
  const parts = interaction.customId.split(':');
  const targetId = parts[1];

  await interaction.deferUpdate();

  if (interaction.customId.startsWith('userinfo_archive:')) {
    const archive = db.prepare(
      'SELECT * FROM verify_archive WHERE discord_id = ? ORDER BY archived_at DESC LIMIT 10'
    ).all(targetId);

    const components = [text('## Past Verifications')];

    for (const entry of archive) {
      const avatar = await fetchAvatar(entry.roblox_user_id);
      components.push(separator());
      const line = `**${entry.roblox_username}** (${entry.roblox_user_id})\n-# <t:${entry.archived_at}:R>`;
      if (avatar) {
        components.push(section(line, avatar));
      } else {
        components.push(text(line));
      }
    }

    components.push(separator());
    components.push({
      type: 1,
      components: [{
        type: 2,
        style: 2,
        label: 'Back',
        custom_id: `userinfo_back:${targetId}`
      }]
    });

    await interaction.editReply({
      flags: CV2 | MessageFlags.Ephemeral,
      components: [{ type: 17, components }]
    });
  }

  if (interaction.customId.startsWith('userinfo_back:')) {
    const member = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!member) return;
    const payload = await buildMainPayload(member);
    await interaction.editReply(payload);
  }
}

function getUserInfoCommandData() {
  return {
    name: 'userinfo',
    description: 'View info about a user',
    options: [{
      name: 'user',
      description: 'The user to look up',
      type: ApplicationCommandOptionType.User,
      required: true
    }]
  };
}

module.exports = { handleUserInfoCommand, handleUserInfoButton, getUserInfoCommandData };
