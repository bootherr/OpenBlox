const db = require('../database/connection');
const log = require('../utils/logger');
const { CV2, text, separator } = require('../utils/messages');

let botClient = null;
let config = null;

function setAbuseClient(client) { botClient = client; }
function setAbuseConfig(conf) { config = conf; }

const THRESHOLDS = {
  none:   null,
  low:    { maxActions: 20, windowSec: 60, baseCooldownSec: 60,   failWeight: 2, scaleMultiplier: 1.5 },
  medium: { maxActions: 12, windowSec: 60, baseCooldownSec: 180,  failWeight: 3, scaleMultiplier: 2.0 },
  high:   { maxActions: 8,  windowSec: 60, baseCooldownSec: 600,  failWeight: 4, scaleMultiplier: 2.5 },
  ultra:  { maxActions: 5,  windowSec: 60, baseCooldownSec: 1800, failWeight: 5, scaleMultiplier: 3.0 },
};

function getThreshold() {
  if (!config || !config.abuse || !config.abuse.enabled) return null;
  return THRESHOLDS[config.abuse.threshold] || null;
}

function isExempt(userId, memberRoles) {
  if (!config || !config.abuse) return true;
  if (config.abuse.exemptUsers.includes(userId)) return true;
  if (memberRoles && config.abuse.exemptRoles.length > 0) {
    for (const roleId of config.abuse.exemptRoles) {
      if (memberRoles.has(roleId)) return true;
    }
  }
  return false;
}

function recordAction(userId, actionType, failed = false) {
  const threshold = getThreshold();
  if (!threshold) return;

  const now = Math.floor(Date.now() / 1000);
  const weight = failed ? threshold.failWeight : 1;

  db.prepare(
    'INSERT INTO abuse_actions (user_id, action_type, weight, created_at) VALUES (?, ?, ?, ?)'
  ).run(userId, actionType, weight, now);
}

function checkAbuse(userId, memberRoles) {
  const threshold = getThreshold();
  if (!threshold) return { blocked: false };
  if (isExempt(userId, memberRoles)) return { blocked: false };

  const now = Math.floor(Date.now() / 1000);

  const activeCooldown = db.prepare(
    'SELECT * FROM abuse_cooldowns WHERE user_id = ? AND expires_at > ?'
  ).get(userId, now);

  if (activeCooldown) {
    return {
      blocked: true,
      reason: 'You are temporarily blocked from using commands due to unusual activity.',
      expiresAt: activeCooldown.expires_at,
    };
  }

  const windowStart = now - threshold.windowSec;
  const row = db.prepare(
    'SELECT COALESCE(SUM(weight), 0) as total FROM abuse_actions WHERE user_id = ? AND created_at > ?'
  ).get(userId, windowStart);

  if (row.total >= threshold.maxActions) {
    const flagCount = db.prepare(
      'SELECT COUNT(*) as c FROM abuse_flags WHERE user_id = ?'
    ).get(userId).c;

    const cooldownSec = Math.floor(threshold.baseCooldownSec * Math.pow(threshold.scaleMultiplier, flagCount));
    const expiresAt = now + cooldownSec;

    db.prepare(
      'INSERT INTO abuse_flags (user_id, reason, created_at) VALUES (?, ?, ?)'
    ).run(userId, `Exceeded ${threshold.maxActions} weighted actions in ${threshold.windowSec}s (total: ${row.total})`, now);

    db.prepare(
      'INSERT OR REPLACE INTO abuse_cooldowns (user_id, expires_at, created_at) VALUES (?, ?, ?)'
    ).run(userId, expiresAt, now);

    db.prepare(
      'DELETE FROM abuse_actions WHERE user_id = ?'
    ).run(userId);

    log.warn('abuse', `Blocked ${userId} for ${cooldownSec}s (flag #${flagCount + 1})`);

    sendAbuseLog(userId, flagCount + 1, cooldownSec, row.total);

    return {
      blocked: true,
      reason: 'You have been temporarily blocked from using commands due to unusual activity.',
      expiresAt,
    };
  }

  return { blocked: false };
}

function sendAbuseLog(userId, flagNumber, cooldownSec, actionTotal) {
  if (!botClient || !config || !config.logging.abuse) return;

  const guild = botClient.guilds.cache.first();
  if (!guild) return;

  guild.channels.fetch(config.logging.abuse).then(channel => {
    if (!channel) return;

    const minutes = Math.ceil(cooldownSec / 60);
    const lines = [
      `## Abuse Detection`,
      `**User:** <@${userId}>`,
      `**Flag #:** ${flagNumber}`,
      `**Cooldown:** ${minutes} minute${minutes !== 1 ? 's' : ''}`,
      `**Weighted Actions:** ${actionTotal}`,
      `**Threshold:** ${config.abuse.threshold}`,
    ];

    channel.send({
      flags: CV2,
      components: [{ type: 17, components: [
        text(lines.join('\n')),
        separator(),
        text(`-# <t:${Math.floor(Date.now() / 1000)}:F>`)
      ]}]
    }).catch(err => {
      log.error('abuse', 'Failed to send abuse log', err);
    });
  }).catch(err => {
    log.error('abuse', `Failed to fetch abuse log channel`, err);
  });
}

function cleanOldRecords() {
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - 3600;

  db.prepare('DELETE FROM abuse_actions WHERE created_at < ?').run(cutoff);
  db.prepare('DELETE FROM abuse_cooldowns WHERE expires_at < ?').run(now);

  const flagCutoff = now - (7 * 24 * 3600);
  const result = db.prepare('DELETE FROM abuse_flags WHERE created_at < ?').run(flagCutoff);
  if (result.changes > 0) {
    log.info('abuse', `Cleaned ${result.changes} old flag(s)`);
  }
}

module.exports = {
  setAbuseClient,
  setAbuseConfig,
  recordAction,
  checkAbuse,
  cleanOldRecords,
};
