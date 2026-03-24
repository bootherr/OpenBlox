const db = require('../database/connection');
const log = require('../utils/logger');

const WORDS = [
  'apple', 'banana', 'cherry', 'mango', 'peach', 'lemon', 'melon', 'berry',
  'grape', 'orange', 'pizza', 'pasta', 'bread', 'toast', 'rice', 'soup',
  'table', 'chair', 'lamp', 'clock', 'piano', 'violin', 'drum', 'guitar',
  'cloud', 'storm', 'rain', 'snow', 'sunny', 'winter', 'spring', 'summer',
  'river', 'ocean', 'lake', 'forest', 'garden', 'field', 'valley', 'island',
  'train', 'truck', 'boat', 'plane', 'rocket', 'bike', 'wagon', 'bus',
  'rabbit', 'tiger', 'dolphin', 'eagle', 'parrot', 'panda', 'penguin', 'turtle',
  'helmet', 'shield', 'crown', 'castle', 'tower', 'bridge', 'fence', 'flag',
  'soccer', 'tennis', 'swimming', 'running', 'jumping', 'hiking', 'skating', 'skiing',
  'painting', 'drawing', 'reading', 'cooking', 'singing', 'dancing', 'fishing', 'camping',
  'keyboard', 'monitor', 'laptop', 'tablet', 'robot', 'camera', 'radio', 'speaker',
  'diamond', 'crystal', 'silver', 'bronze', 'copper', 'marble', 'cotton', 'velvet', "emerald", "van"
];

function generatePhrase() {
  const used = new Set();
  const picks = [];
  while (picks.length < 4) {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    if (!used.has(word)) {
      used.add(word);
      picks.push(word);
    }
  }
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `openblox ${picks.join(' ')} ${num}`;
}

function createSession(discordId, robloxUserId, robloxUsername, guildId) {
  const phrase = generatePhrase();
  const expiresAt = Math.floor(Date.now() / 1000) + 600;

  db.prepare(`DELETE FROM verification_sessions WHERE discord_id = ?`).run(discordId);

  db.prepare(`
    INSERT INTO verification_sessions (discord_id, roblox_user_id, roblox_username, guild_id, phrase, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(discordId, robloxUserId, robloxUsername, guildId, phrase, expiresAt);

  return phrase;
}

function getSession(discordId) {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare(
    'SELECT * FROM verification_sessions WHERE discord_id = ? AND expires_at > ?'
  ).get(discordId, now) || null;
}

function clearSession(discordId) {
  db.prepare('DELETE FROM verification_sessions WHERE discord_id = ?').run(discordId);
}

function confirmVerification(discordId, robloxUserId, robloxUsername) {
  db.prepare(`
    INSERT OR REPLACE INTO verified_users (discord_id, roblox_user_id, roblox_username)
    VALUES (?, ?, ?)
  `).run(discordId, robloxUserId, robloxUsername);

  clearSession(discordId);
  log.action('verify', `Verified ${robloxUsername} (${robloxUserId}) for Discord user ${discordId}`);
}

function getVerifiedUser(discordId) {
  return db.prepare('SELECT * FROM verified_users WHERE discord_id = ?').get(discordId) || null;
}

function getVerifiedByRobloxId(robloxUserId) {
  return db.prepare('SELECT * FROM verified_users WHERE roblox_user_id = ?').get(robloxUserId) || null;
}

function removeVerification(discordId) {
  const user = getVerifiedUser(discordId);
  if (!user) return null;

  db.prepare(
    'INSERT INTO verify_archive (discord_id, roblox_user_id, roblox_username) VALUES (?, ?, ?)'
  ).run(user.discord_id, user.roblox_user_id, user.roblox_username);

  db.prepare('DELETE FROM verified_users WHERE discord_id = ?').run(discordId);
  log.action('verify', `Unverified ${user.roblox_username} for Discord user ${discordId}`);
  return user;
}

function getArchive(discordId) {
  return db.prepare(
    'SELECT * FROM verify_archive WHERE discord_id = ? ORDER BY archived_at DESC LIMIT 10'
  ).all(discordId);
}

function cleanExpiredSessions() {
  const now = Math.floor(Date.now() / 1000);
  const result = db.prepare('DELETE FROM verification_sessions WHERE expires_at <= ?').run(now);
  if (result.changes > 0) {
    log.info('verify', `Cleaned ${result.changes} expired session(s)`);
  }
}

module.exports = {
  generatePhrase,
  createSession,
  getSession,
  clearSession,
  confirmVerification,
  getVerifiedUser,
  getVerifiedByRobloxId,
  removeVerification,
  getArchive,
  cleanExpiredSessions,
};
