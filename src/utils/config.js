const fs = require('fs');
const path = require('path');
const log = require('./logger');

const ACTIVITY_TYPES = {
  playing: 0,
  listening: 2,
  watching: 3,
  competing: 5,
  custom: 4,
};

const VALID_STATUSES = ['online', 'idle', 'dnd', 'invisible'];

function parseConf(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const config = {};
  let section = null;

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const sectionMatch = trimmed.match(/^\[(.+)]$/);
    if (sectionMatch) {
      section = sectionMatch[1];
      config[section] = {};
      continue;
    }

    const kvMatch = trimmed.match(/^([^=]+)=(.*)$/);
    if (kvMatch && section) {
      const key = kvMatch[1].trim();
      const val = kvMatch[2].trim();
      config[section][key] = val;
    }
  }

  return config;
}

function loadConfig() {
  const confPath = path.join(__dirname, '../../openblox.conf');

  if (!fs.existsSync(confPath)) {
    log.fatal('config', 'openblox.conf not found.');
    log.error('config', 'Make sure openblox.conf exists in the project root.');
    log.info('config', 'Copy the example from the repo and fill in your values.');
    process.exit(1);
  }

  if (!process.env.BOT_TOKEN) {
    log.fatal('config', 'BOT_TOKEN is missing from your .env file.');
    log.error('config', 'Create a .env file in the project root with your bot token.');
    log.info('config', 'Get your token at https://discord.com/developers/applications');
    log.info('config', 'Select your bot > Bot tab > Reset Token > Copy it into .env');
    process.exit(1);
  }

  if (!process.env.ROBLOX_API_KEY) {
    log.fatal('config', 'ROBLOX_API_KEY is missing from your .env file.');
    log.error('config', 'Create a .env file in the project root with your API key.');
    log.info('config', 'Get your key at https://create.roblox.com/dashboard/credentials');
    log.info('config', 'Make sure it has group:read and group:write scopes for your group.');
    process.exit(1);
  }

  const raw = parseConf(confPath);

  if (!raw.general || !raw.general.group_id) {
    log.fatal('config', 'group_id is missing from openblox.conf');
    log.error('config', 'Open openblox.conf and set your Roblox group ID under [general].');
    log.info('config', 'Your group ID is the number in the URL: roblox.com/groups/YOUR_ID');
    process.exit(1);
  }

  if (!/^\d+$/.test(raw.general.group_id)) {
    log.fatal('config', 'group_id must be a number.');
    log.error('config', `Got "${raw.general.group_id}" but expected a numeric group ID.`);
    log.info('config', 'Your group ID is the number in the URL: roblox.com/groups/YOUR_ID');
    process.exit(1);
  }

  const activityType = raw.presence?.activity_type?.toLowerCase() || 'watching';
  const statusValue = raw.presence?.status?.toLowerCase() || 'online';

  const VALID_THRESHOLDS = ['none', 'low', 'medium', 'high', 'ultra'];
  const abuseThreshold = raw.abuse_detection?.threshold?.toLowerCase() || 'medium';

  const conf = {
    groupId: raw.general.group_id,

    presence: {
      status: VALID_STATUSES.includes(statusValue) ? statusValue : 'online',
      activityType: ACTIVITY_TYPES[activityType] ?? ACTIVITY_TYPES.watching,
      activityText: raw.presence?.activity_text || 'OpenBlox',
    },

    verification: {
      enabled: raw.verification?.enabled === 'true',
      channelId: raw.verification?.channel_id || null,
      verifiedRoleId: raw.verification?.verified_role_id || null,
    },

    ranking: {
      enabled: raw.ranking?.enabled === 'true',
      allowedRoles: raw.ranking?.allowed_roles
        ? raw.ranking.allowed_roles.split(',').map(r => r.trim()).filter(Boolean)
        : [],
    },

    bloxlink: {
      apiKey: process.env.BLOXLINK_API_KEY || null,
    },

    abuse: {
      enabled: raw.abuse_detection?.enabled === 'true',
      threshold: VALID_THRESHOLDS.includes(abuseThreshold) ? abuseThreshold : 'low',
      exemptUsers: raw.abuse_detection?.exempt_user_ids
        ? raw.abuse_detection.exempt_user_ids.split(',').map(r => r.trim()).filter(Boolean)
        : [],
      exemptRoles: raw.abuse_detection?.exempt_role_ids
        ? raw.abuse_detection.exempt_role_ids.split(',').map(r => r.trim()).filter(Boolean)
        : [],
    },

    logging: {
      ranking: raw.logging?.ranking_channel_id || null,
      verification: raw.logging?.verification_channel_id || null,
      moderation: raw.logging?.moderation_channel_id || null,
      abuse: raw.logging?.abuse_channel_id || null,
    },
  };

  if (conf.verification.enabled && !conf.verification.channelId) {
    log.warn('config', 'Verification is enabled but no channel_id is set. The verify panel will not be posted.');
  }

  if (conf.verification.enabled && !conf.verification.verifiedRoleId) {
    log.warn('config', 'Verification is enabled but no verified_role_id is set. Users will not receive a role on verify.');
  }

  return conf;
}

module.exports = { loadConfig };
