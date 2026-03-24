const db = require('./connection');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS verified_users (
      discord_id TEXT PRIMARY KEY,
      roblox_user_id TEXT NOT NULL,
      roblox_username TEXT NOT NULL,
      verified_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS verify_archive (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT NOT NULL,
      roblox_user_id TEXT NOT NULL,
      roblox_username TEXT NOT NULL,
      archived_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS verification_sessions (
      discord_id TEXT PRIMARY KEY,
      roblox_user_id TEXT NOT NULL,
      roblox_username TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      phrase TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      command TEXT NOT NULL,
      user_id TEXT NOT NULL,
      target_user_id TEXT,
      details TEXT DEFAULT '{}',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS bot_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS abuse_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      weight INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS abuse_flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS abuse_cooldowns (
      user_id TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log (user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_log (target_user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log (created_at DESC)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_verified_roblox ON verified_users (roblox_user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON verification_sessions (expires_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_abuse_actions_user ON abuse_actions (user_id, created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_abuse_flags_user ON abuse_flags (user_id)`);
}

module.exports = { initializeDatabase };
