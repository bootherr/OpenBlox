const { MessageFlags } = require('discord.js');
const { CV2, errorReply, text, section, separator } = require('../../utils/messages');
const roblox = require('../../services/roblox');
const log = require('../../utils/logger');

let config = null;

function setGroupInfoConfig(conf) { config = conf; }

async function handleGroupInfoCommand(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const groupId = config.groupId;
  const [info, iconUrl] = await Promise.all([
    roblox.fetchGroupInfo(groupId),
    roblox.fetchGroupIcon(groupId),
  ]);

  if (!info) {
    return interaction.editReply(errorReply('Could not fetch group info. Check your group ID in the config.'));
  }

  log.action('groupinfo', `${interaction.user.username} viewed group info`);

  const components = [];

  const headerLines = [`## ${info.name}`];
  if (info.hasVerifiedBadge) headerLines[0] += ' ✅';
  headerLines.push(`-# Group ID: ${info.id}`);

  if (iconUrl) {
    components.push(section(headerLines.join('\n'), iconUrl));
  } else {
    components.push(text(headerLines.join('\n')));
  }

  components.push(separator());

  const detailLines = [];
  if (info.owner) {
    detailLines.push(`**Owner:** ${info.owner.displayName} (@${info.owner.username})`);
  } else {
    detailLines.push('**Owner:** No owner');
  }
  detailLines.push(`**Members:** ${info.memberCount.toLocaleString()}`);
  detailLines.push(`**Public Entry:** ${info.publicEntryAllowed ? 'Yes' : 'No'}`);
  components.push(text(detailLines.join('\n')));

  if (info.description) {
    components.push(separator());
    const desc = info.description.length > 500 ? info.description.slice(0, 497) + '...' : info.description;
    components.push(text(`**Description**\n${desc}`));
  }

  if (info.shout) {
    components.push(separator());
    components.push(text(`**Group Shout** (by ${info.shout.poster})\n> ${info.shout.body}`));
  }

  components.push(separator());
  components.push(text(`-# [View on Roblox](https://www.roblox.com/groups/${info.id})`));

  await interaction.editReply({
    flags: CV2 | MessageFlags.Ephemeral,
    components: [{ type: 17, components }]
  });
}

function getGroupInfoCommandData() {
  return {
    name: 'groupinfo',
    description: 'View info about the linked Roblox group',
  };
}

module.exports = { handleGroupInfoCommand, getGroupInfoCommandData, setGroupInfoConfig };
