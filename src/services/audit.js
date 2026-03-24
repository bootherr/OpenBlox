const db = require('../database/connection');
const log = require('../utils/logger');
const { CV2, text, section, separator } = require('../utils/messages');

let botClient = null;
let config = null;

function setAuditClient(client) { botClient = client; }
function setAuditConfig(conf) { config = conf; }

const LOG_TYPE_MAP = {
  'Rank Change': 'ranking',
  'Verification': 'verification',
  'Unverification': 'verification',
  'Auto Reverification': 'verification',
  'Audit Log View': 'moderation',
};

function getLogType(command) {
  return LOG_TYPE_MAP[command] || 'moderation';
}

function buildRankChangeMessage(userId, targetUserId, details, timestamp) {
  const lines = [
    `## Rank Change`,
    `**Performed By:** <@${userId}>`,
    targetUserId ? `**Target:** <@${targetUserId}>` : null,
    `**Username:** ${details.robloxUsername}`
  ].filter(Boolean);

  const components = [];

  const sec = { type: 9, components: [{ type: 10, content: lines.join('\n') }] };
  if (details.avatarUrl) sec.accessory = { type: 11, media: { url: details.avatarUrl } };

  components.push(sec);
  components.push(separator());
  components.push(text(`**Previous Rank**\n${details.old}\n\n**New Rank**\n${details.new}`));
  components.push(separator());
  components.push(text(`-# <t:${timestamp}:F>`));

  return { flags: CV2, components: [{ type: 17, components }] };
}

function buildVerificationMessage(command, userId, details, timestamp) {
  const lines = [
    `## ${command}`,
    `**User:** <@${userId}>`,
    `**Username:** ${details.robloxUsername}`
  ];

  if (details.method) lines.push(`**Method:** ${details.method}`);

  const sec = { type: 9, components: [{ type: 10, content: lines.join('\n') }] };
  if (details.avatarUrl) sec.accessory = { type: 11, media: { url: details.avatarUrl } };

  return {
    flags: CV2,
    components: [{
      type: 17,
      components: [sec, separator(), text(`-# <t:${timestamp}:F>`)]
    }]
  };
}

function buildGenericMessage(command, userId, targetUserId, details, timestamp) {
  const lines = [`## ${command}`, `**Performed By:** <@${userId}>`];
  if (targetUserId) lines.push(`**Target:** <@${targetUserId}>`);

  if (details) {
    for (const [key, value] of Object.entries(details)) {
      if (key === 'avatarUrl' || key === 'method') continue;
      if (key === 'old' && details.new !== undefined) {
        lines.push(`**Previous:** ${value}`);
        lines.push(`**Updated:** ${details.new}`);
      } else if (key === 'new') {
        continue;
      } else {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
        lines.push(`**${label}:** ${value}`);
      }
    }
  }

  lines.push('', `-# <t:${timestamp}:F>`);

  return {
    flags: CV2,
    components: [{ type: 17, components: [text(lines.join('\n'))] }]
  };
}

function logAudit(command, userId, targetUserId, details) {
  try {
    db.prepare(
      'INSERT INTO audit_log (command, user_id, target_user_id, details) VALUES (?, ?, ?, ?)'
    ).run(command, userId, targetUserId || null, JSON.stringify(details || {}));
  } catch (err) {
    log.error('audit', 'DB insert failed', err);
  }

  if (!botClient || !config) return;

  const logType = getLogType(command);
  const channelId = config.logging[logType];
  if (!channelId) return;

  const guild = botClient.guilds.cache.first();
  if (!guild) return;

  guild.channels.fetch(channelId).then(channel => {
    if (!channel) return;

    const timestamp = Math.floor(Date.now() / 1000);
    let message;

    switch (command) {
      case 'Rank Change':
        message = buildRankChangeMessage(userId, targetUserId, details, timestamp);
        break;
      case 'Verification':
      case 'Unverification':
      case 'Auto Reverification':
        message = buildVerificationMessage(command, userId, details, timestamp);
        break;
      default:
        message = buildGenericMessage(command, userId, targetUserId, details, timestamp);
        break;
    }

    channel.send(message).catch(err => {
      log.error('audit', `Failed to send log to channel ${channelId}`, err);
    });
  }).catch(err => {
    log.error('audit', `Failed to fetch log channel ${channelId}`, err);
  });
}

module.exports = { logAudit, setAuditClient, setAuditConfig, LOG_TYPE_MAP };
