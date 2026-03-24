const { ApplicationCommandOptionType, MessageFlags } = require('discord.js');
const { errorReply, CV2, text, section, separator } = require('../../utils/messages');
const { logAudit } = require('../../services/audit');
const { getVerifiedUser } = require('../../services/verification');
const roblox = require('../../services/roblox');
const log = require('../../utils/logger');

let config = null;

function setRankConfig(conf) { config = conf; }

function hasPermission(member) {
  if (!config.ranking.allowedRoles.length) return true;
  return config.ranking.allowedRoles.some(roleId => member.roles.cache.has(roleId));
}

async function handleRankCommand(interaction) {
  if (!config.ranking.enabled) {
    return interaction.reply(errorReply('Ranking is not enabled on this server.'));
  }

  if (!hasPermission(interaction.member)) {
    return interaction.reply(errorReply('You do not have permission to use this command.'));
  }

  const targetUser = interaction.options.getUser('user');
  const usernameInput = interaction.options.getString('username');

  if (!targetUser && !usernameInput) {
    return interaction.reply(errorReply('Provide either a Discord user or a Roblox username.'));
  }

  if (targetUser && usernameInput) {
    return interaction.reply(errorReply('Provide either a Discord user or a Roblox username, not both.'));
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  let targetRobloxId = null;
  let targetRobloxUsername = null;

  if (usernameInput) {
    const resolved = await roblox.resolveUsername(usernameInput);
    if (!resolved) {
      return interaction.editReply(errorReply(`Roblox username **${usernameInput}** was not found.`));
    }
    targetRobloxId = resolved.id;
    targetRobloxUsername = resolved.username;
  } else {
    const verified = getVerifiedUser(targetUser.id);
    if (!verified) {
      return interaction.editReply(errorReply(`**${targetUser.username}** is not verified. Use the \`username\` option to rank by Roblox username instead.`));
    }
    targetRobloxId = verified.roblox_user_id;
    targetRobloxUsername = verified.roblox_username;
  }

  const apiKey = process.env.ROBLOX_API_KEY;
  const groupId = config.groupId;

  const allRoles = await roblox.fetchGroupRoles(apiKey, groupId);
  if (!allRoles) {
    return interaction.editReply(errorReply('Failed to load group roles. Check your API key and group ID in the config.'));
  }

  const targetRole = await roblox.fetchUserGroupRole(targetRobloxId, groupId);
  if (!targetRole) {
    return interaction.editReply(errorReply(`**${targetRobloxUsername}** is not in the linked Roblox group.`));
  }

  const avatarUrl = await roblox.fetchAvatar(targetRobloxId);

  const availableRanks = allRoles.filter(role => {
    if (role.rank === 0) return false;
    if (role.rank === targetRole.rank) return false;
    return true;
  });

  if (availableRanks.length === 0) {
    return interaction.editReply(errorReply('No available ranks to set this user to.'));
  }

  const selectOptions = availableRanks.slice(0, 25).map(role => ({
    label: role.name,
    value: `${role.id}:${role.rank}:${role.name}`,
    description: `Rank ${role.rank}`
  }));

  const messageComponents = [];

  const headerText = `## Rank Change\n**Username:** ${targetRobloxUsername}\n**Current Rank:** ${targetRole.roleName} (${targetRole.rank})`;

  if (avatarUrl) {
    messageComponents.push(section(headerText, avatarUrl));
  } else {
    messageComponents.push(text(headerText));
  }

  messageComponents.push(
    separator(),
    {
      type: 1,
      components: [{
        type: 3,
        custom_id: `rank_select:${targetRobloxId}:${config.groupId}`,
        placeholder: 'Select a new rank...',
        options: selectOptions,
        min_values: 1,
        max_values: 1
      }]
    }
  );

  const messagePayload = {
    flags: CV2 | MessageFlags.Ephemeral,
    components: [{ type: 17, components: messageComponents }]
  };

  const reply = await interaction.editReply(messagePayload);

  const collector = reply.createMessageComponentCollector({
    filter: (i) => i.customId === `rank_select:${targetRobloxId}:${config.groupId}` && i.user.id === interaction.user.id,
    max: 1,
    time: 30_000
  });

  collector.on('end', async (collected) => {
    if (collected.size > 0) return;
    const expired = structuredClone(messagePayload);
    const container = expired.components[0].components;
    const actionRow = container.find(c => c.type === 1);
    if (actionRow) actionRow.components[0].disabled = true;
    container.push(separator(), text('### Interaction expired'));
    await interaction.editReply(expired).catch(() => {});
  });
}

async function handleRankSelect(interaction) {
  const [, targetRobloxId, groupId] = interaction.customId.split(':');
  const selectedValue = interaction.values[0];
  const [roleId, rankNum, ...roleNameParts] = selectedValue.split(':');
  const roleName = roleNameParts.join(':');

  await interaction.deferUpdate();

  const apiKey = process.env.ROBLOX_API_KEY;

  const beforeRole = await roblox.fetchUserGroupRole(targetRobloxId, groupId);
  const previousRoleName = beforeRole ? beforeRole.roleName : 'Unknown';

  const result = await roblox.setRank(apiKey, groupId, targetRobloxId, roleId);

  const targetInfo = await roblox.fetchUser(targetRobloxId);
  const targetUsername = targetInfo ? targetInfo.username : targetRobloxId;

  if (!result.success) {
    return interaction.editReply(errorReply(`Failed to update rank for **${targetUsername}**. ${result.error}`));
  }

  log.action('rank', `${interaction.user.username} ranked ${targetUsername} to ${roleName} (${rankNum})`);

  const avatarUrl = await roblox.fetchAvatar(targetRobloxId);

  logAudit('Rank Change', interaction.user.id, null, {
    robloxUsername: targetUsername,
    robloxUserId: targetRobloxId,
    old: previousRoleName,
    new: `${roleName} (${rankNum})`,
    avatarUrl
  });

  await interaction.editReply({
    flags: CV2 | MessageFlags.Ephemeral,
    components: [{ type: 17, components: [text('### Rank updated successfully.')] }]
  });

  const publicComponents = [];
  const publicText = `## Rank Changed\n**Username:** ${targetUsername}\n**Previous Rank:** ${previousRoleName}\n**New Rank:** ${roleName} (${rankNum})`;

  if (avatarUrl) {
    publicComponents.push(section(publicText, avatarUrl));
  } else {
    publicComponents.push(text(publicText));
  }

  await interaction.channel.send({
    flags: CV2,
    components: [{ type: 17, components: publicComponents }]
  }).catch(() => {});
}

function getRankCommandData() {
  return {
    name: 'rank',
    description: 'Change a user\'s rank in the Roblox group',
    options: [
      {
        name: 'user',
        description: 'The Discord user to rank',
        type: ApplicationCommandOptionType.User,
        required: false
      },
      {
        name: 'username',
        description: 'The Roblox username to rank',
        type: ApplicationCommandOptionType.String,
        required: false
      }
    ]
  };
}

module.exports = { handleRankCommand, handleRankSelect, getRankCommandData, setRankConfig };
