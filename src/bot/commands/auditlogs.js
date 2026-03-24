const { ApplicationCommandOptionType, MessageFlags } = require('discord.js');
const db = require('../../database/connection');
const { CV2, errorReply, text, section, separator } = require('../../utils/messages');
const { logAudit } = require('../../services/audit');
const log = require('../../utils/logger');

const PAGE_SIZE = 4;

function buildLogsPayload(rows, targetUser, category, page) {
  const components = [];

  const headerLines = [
    `## Audit Logs`,
    `**User:** <@${targetUser.id}>`
  ];

  const sec = {
    type: 9,
    components: [{ type: 10, content: headerLines.join('\n') }],
    accessory: { type: 11, media: { url: targetUser.displayAvatarURL({ extension: 'png', size: 256 }) } }
  };

  components.push(sec);
  components.push(separator());

  if (rows.length === 0) {
    components.push(text('-# No logs found for this category.'));
  } else {
    for (const row of rows) {
      let details = {};
      try { details = JSON.parse(row.details || '{}'); } catch {}
      const lines = [`**${row.command}**`];

      if (row.target_user_id) lines.push(`Target: <@${row.target_user_id}>`);
      if (details.robloxUsername) lines.push(`Roblox: ${details.robloxUsername}`);
      if (details.old) lines.push(`${details.old} -> ${details.new}`);

      lines.push(`-# <t:${row.created_at}:R>`);
      components.push(text(lines.join('\n')));
      components.push(separator());
    }
  }

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'actions_done', label: 'Done By' },
    { id: 'actions_against', label: 'Against' },
  ];

  const catButtons = categories.map(cat => ({
    type: 2,
    style: cat.id === category ? 1 : 2,
    label: cat.label,
    custom_id: `audit:${targetUser.id}:${category}:nav:${cat.id}:${page}`
  }));

  components.push({ type: 1, components: catButtons });

  const totalForCategory = countLogs(targetUser.id, category);
  const totalPages = Math.max(1, Math.ceil(totalForCategory / PAGE_SIZE));

  if (totalPages > 1) {
    const navButtons = [
      {
        type: 2,
        style: 2,
        label: 'Previous',
        custom_id: `audit:${targetUser.id}:${category}:prev:${page}`,
        disabled: page === 0
      },
      {
        type: 2,
        style: 2,
        label: `${page + 1}/${totalPages}`,
        custom_id: `audit:${targetUser.id}:${category}:page:${page}`,
        disabled: true
      },
      {
        type: 2,
        style: 2,
        label: 'Next',
        custom_id: `audit:${targetUser.id}:${category}:next:${page}`,
        disabled: page >= totalPages - 1
      }
    ];
    components.push({ type: 1, components: navButtons });
  }

  return {
    flags: CV2 | MessageFlags.Ephemeral,
    components: [{ type: 17, components }]
  };
}

function queryLogs(targetUserId, category, page) {
  const offset = page * PAGE_SIZE;
  let sql, params;

  switch (category) {
    case 'actions_done':
      sql = 'SELECT * FROM audit_log WHERE user_id = ? AND command != ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params = [targetUserId, 'Audit Log View', PAGE_SIZE, offset];
      break;
    case 'actions_against':
      sql = 'SELECT * FROM audit_log WHERE target_user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params = [targetUserId, PAGE_SIZE, offset];
      break;
    default:
      sql = 'SELECT * FROM audit_log WHERE (user_id = ? OR target_user_id = ?) AND command != ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params = [targetUserId, targetUserId, 'Audit Log View', PAGE_SIZE, offset];
  }

  return db.prepare(sql).all(...params);
}

function countLogs(targetUserId, category) {
  let sql, params;

  switch (category) {
    case 'actions_done':
      sql = 'SELECT COUNT(*) as c FROM audit_log WHERE user_id = ? AND command != ?';
      params = [targetUserId, 'Audit Log View'];
      break;
    case 'actions_against':
      sql = 'SELECT COUNT(*) as c FROM audit_log WHERE target_user_id = ?';
      params = [targetUserId];
      break;
    default:
      sql = 'SELECT COUNT(*) as c FROM audit_log WHERE (user_id = ? OR target_user_id = ?) AND command != ?';
      params = [targetUserId, targetUserId, 'Audit Log View'];
  }

  return db.prepare(sql).get(...params).c;
}

async function handleAuditLogsCommand(interaction) {
  const targetUser = interaction.options.getUser('user');

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const rows = queryLogs(targetUser.id, 'all', 0);
  const payload = buildLogsPayload(rows, targetUser, 'all', 0);

  if (interaction.user.id !== targetUser.id) {
    logAudit('Audit Log View', interaction.user.id, targetUser.id, {});
    log.action('audit', `${interaction.user.username} viewed audit logs for ${targetUser.username}`);
  }

  await interaction.editReply(payload);
}

async function handleAuditButton(interaction) {
  const parts = interaction.customId.split(':');
  const targetId = parts[1];
  const action = parts[3];
  const currentPage = parseInt(parts[4]) || 0;

  await interaction.deferUpdate();

  let category, page;

  switch (action) {
    case 'nav':
      category = parts[4];
      page = 0;
      break;
    case 'prev':
      category = parts[2];
      page = Math.max(0, currentPage - 1);
      break;
    case 'next':
      category = parts[2];
      page = currentPage + 1;
      break;
    default:
      return;
  }

  const targetUser = await interaction.client.users.fetch(targetId).catch(() => null);
  if (!targetUser) {
    return interaction.editReply(errorReply('Could not find that user.'));
  }

  const rows = queryLogs(targetId, category, page);
  const payload = buildLogsPayload(rows, targetUser, category, page);

  await interaction.editReply(payload);
}

function getAuditLogsCommandData() {
  return {
    name: 'auditlogs',
    description: 'View audit logs for a user',
    options: [{
      name: 'user',
      description: 'The user to look up',
      type: ApplicationCommandOptionType.User,
      required: true
    }]
  };
}

module.exports = { handleAuditLogsCommand, handleAuditButton, getAuditLogsCommandData };
