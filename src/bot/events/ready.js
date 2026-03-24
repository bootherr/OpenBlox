const { initializeDatabase } = require('../../database/schema');
const { getRankCommandData, setRankConfig } = require('../commands/rank');
const { getAuditLogsCommandData } = require('../commands/auditlogs');
const { getUserInfoCommandData } = require('../commands/userinfo');
const { getGroupInfoCommandData, setGroupInfoConfig } = require('../commands/groupinfo');
const { setVerifyConfig, postVerifyPanel, setupPanelWatcher } = require('../commands/verify');
const { setAuditClient, setAuditConfig } = require('../../services/audit');
const { setAbuseClient, setAbuseConfig, cleanOldRecords } = require('../../services/abuse');
const { cleanExpiredSessions } = require('../../services/verification');
const log = require('../../utils/logger');

module.exports = async (client, config) => {
  initializeDatabase();

  setAuditClient(client);
  setAuditConfig(config);
  setRankConfig(config);
  setVerifyConfig(config);
  setGroupInfoConfig(config);
  setAbuseClient(client);
  setAbuseConfig(config);

  if (config.ranking.enabled) {
    for (const [guildId, guild] of client.guilds.cache) {
      try {
        await guild.commands.create(getRankCommandData());
      } catch (err) {
        log.error('commands', `Failed to register /rank in ${guild.name}`, err);
      }
    }
  }

  try {
    await client.application.commands.create(getAuditLogsCommandData());
    await client.application.commands.create(getUserInfoCommandData());
    await client.application.commands.create(getGroupInfoCommandData());
  } catch (err) {
    log.error('commands', 'Failed to register global commands', err);
  }

  if (config.verification.enabled) {
    await postVerifyPanel(client);
    setupPanelWatcher(client);
  }

  cleanExpiredSessions();
  setInterval(cleanExpiredSessions, 5 * 60 * 1000);

  cleanOldRecords();
  setInterval(cleanOldRecords, 10 * 60 * 1000);

  client.user.setPresence({
    status: config.presence.status,
    activities: [{ name: config.presence.activityText, type: config.presence.activityType }]
  });

  log.online(client.user.tag);
};
