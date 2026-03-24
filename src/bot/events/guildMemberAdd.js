const db = require('../../database/connection');
const { logAudit } = require('../../services/audit');
const { fetchAvatar } = require('../../services/roblox');
const log = require('../../utils/logger');

module.exports = async (member, config) => {
  if (!config.verification.enabled || !config.verification.verifiedRoleId) return;

  const verified = db.prepare(
    'SELECT * FROM verified_users WHERE discord_id = ?'
  ).get(member.id);

  if (!verified) return;

  try {
    await member.roles.add(config.verification.verifiedRoleId);
    log.action('reverify', `Re-added verified role to ${member.user.username} (${verified.roblox_username})`);

    const avatarUrl = await fetchAvatar(verified.roblox_user_id);
    logAudit('Auto Reverification', member.id, null, {
      robloxUsername: verified.roblox_username,
      robloxUserId: verified.roblox_user_id,
      avatarUrl
    });
  } catch (err) {
    log.error('reverify', `Failed to re-add role to ${member.user.username}`, err);
  }
};
