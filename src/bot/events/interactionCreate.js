const { MessageFlags } = require('discord.js');
const { handleRankCommand, handleRankSelect } = require('../commands/rank');
const { handleAuditLogsCommand, handleAuditButton } = require('../commands/auditlogs');
const { handleUserInfoCommand, handleUserInfoButton } = require('../commands/userinfo');
const { handleGroupInfoCommand } = require('../commands/groupinfo');
const {
  handleVerifyButton,
  handleUsernameModal,
  handleCheckDescription,
  handleCancel,
  handleUnlink,
} = require('../commands/verify');
const { checkAbuse, recordAction } = require('../../services/abuse');
const { CV2 } = require('../../utils/messages');
const log = require('../../utils/logger');

function genericError(code) {
  return {
    flags: CV2 | MessageFlags.Ephemeral,
    components: [{
      type: 17,
      components: [{ type: 10, content: `### Something went wrong\nPlease try again. If this keeps happening, contact a server admin.\n-# Error reference: ${code}` }]
    }]
  };
}

function generateErrorCode() {
  return `OBX-${Date.now().toString(36).toUpperCase()}`;
}

async function safeReply(interaction, err) {
  const code = generateErrorCode();
  log.error('interaction', `${code} | ${interaction.customId || interaction.commandName || 'unknown'}`, err);
  try {
    const payload = genericError(code);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch (replyErr) {
    log.error('interaction', 'Failed to send error response', replyErr);
  }
}

function abuseBlockReply(result) {
  return {
    flags: CV2 | MessageFlags.Ephemeral,
    components: [{
      type: 17,
      components: [{ type: 10, content: `### Temporarily blocked\n${result.reason}\n-# Expires <t:${result.expiresAt}:R>` }]
    }]
  };
}

module.exports = async (interaction) => {
  if (interaction.isChatInputCommand() || interaction.isButton() || interaction.isStringSelectMenu()) {
    const memberRoles = interaction.member?.roles?.cache;
    const abuse = checkAbuse(interaction.user.id, memberRoles);
    if (abuse.blocked) {
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(abuseBlockReply(abuse));
        } else {
          await interaction.reply(abuseBlockReply(abuse));
        }
      } catch {}
      return;
    }
  }

  if (interaction.isChatInputCommand()) {
    recordAction(interaction.user.id, `command:${interaction.commandName}`);

    switch (interaction.commandName) {
      case 'rank':
        try { await handleRankCommand(interaction); }
        catch (err) { await safeReply(interaction, err); }
        return;

      case 'auditlogs':
        try { await handleAuditLogsCommand(interaction); }
        catch (err) { await safeReply(interaction, err); }
        return;

      case 'userinfo':
        try { await handleUserInfoCommand(interaction); }
        catch (err) { await safeReply(interaction, err); }
        return;

      case 'groupinfo':
        try { await handleGroupInfoCommand(interaction); }
        catch (err) { await safeReply(interaction, err); }
        return;

      default:
        await interaction.reply({
          flags: CV2 | MessageFlags.Ephemeral,
          components: [{ type: 17, components: [{ type: 10, content: '### Unknown command\nThis command is not recognized. It may be outdated.' }] }]
        }).catch(() => {});
        return;
    }
  }

  if (interaction.isModalSubmit()) {
    recordAction(interaction.user.id, `modal:${interaction.customId}`);

    if (interaction.customId === 'verify_username_modal') {
      try { await handleUsernameModal(interaction); }
      catch (err) { await safeReply(interaction, err); }
      return;
    }
  }

  if (interaction.isStringSelectMenu()) {
    recordAction(interaction.user.id, `select:${interaction.customId.split(':')[0]}`);

    if (interaction.customId.startsWith('rank_select:')) {
      try { await handleRankSelect(interaction); }
      catch (err) { await safeReply(interaction, err); }
      return;
    }
  }

  if (interaction.isButton()) {
    recordAction(interaction.user.id, `button:${interaction.customId.split(':')[0]}`);

    if (interaction.customId === 'verify_start') {
      try { await handleVerifyButton(interaction); }
      catch (err) { await safeReply(interaction, err); }
      return;
    }

    if (interaction.customId === 'verify_check') {
      try { await handleCheckDescription(interaction); }
      catch (err) { await safeReply(interaction, err); }
      return;
    }

    if (interaction.customId === 'verify_cancel') {
      try { await handleCancel(interaction); }
      catch (err) { await safeReply(interaction, err); }
      return;
    }

    if (interaction.customId === 'verify_unlink') {
      try { await handleUnlink(interaction); }
      catch (err) { await safeReply(interaction, err); }
      return;
    }

    if (interaction.customId.startsWith('audit:')) {
      try { await handleAuditButton(interaction); }
      catch (err) { await safeReply(interaction, err); }
      return;
    }

    if (interaction.customId.startsWith('userinfo_')) {
      try { await handleUserInfoButton(interaction); }
      catch (err) { await safeReply(interaction, err); }
      return;
    }
  }
};
