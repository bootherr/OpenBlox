const { MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { CV2, errorReply, text, section, separator } = require('../../utils/messages');
const { logAudit } = require('../../services/audit');
const verify = require('../../services/verification');
const roblox = require('../../services/roblox');
const db = require('../../database/connection');
const log = require('../../utils/logger');

let config = null;

function setVerifyConfig(conf) { config = conf; }

function getState(key) {
  const row = db.prepare('SELECT value FROM bot_state WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setState(key, value) {
  db.prepare('INSERT OR REPLACE INTO bot_state (key, value) VALUES (?, ?)').run(key, value);
}

function buildUsernameModal() {
  return new ModalBuilder()
    .setCustomId('verify_username_modal')
    .setTitle('Verify your Roblox account')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('roblox_username')
          .setLabel('Roblox Username')
          .setPlaceholder('Enter your exact Roblox username')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(3)
          .setMaxLength(20)
      )
    );
}

function buildPanelPayload() {
  return {
    flags: CV2,
    components: [{ type: 17, components: [
      text('## Verification\nLink your Roblox account to get access to this server.\nClick the button below to get started.'),
      separator(),
      {
        type: 1,
        components: [{
          type: 2,
          style: 1,
          label: 'Verify',
          custom_id: 'verify_start'
        }]
      }
    ]}]
  };
}

async function postVerifyPanel(client) {
  if (!config.verification.enabled || !config.verification.channelId) return;

  const guild = client.guilds.cache.first();
  if (!guild) return;

  const channel = await guild.channels.fetch(config.verification.channelId).catch(() => null);
  if (!channel) {
    log.warn('verify', `Verification channel ${config.verification.channelId} not found`);
    return;
  }

  const storedMessageId = getState('verify_panel_message_id');
  const storedChannelId = getState('verify_panel_channel_id');

  if (storedMessageId && storedChannelId === config.verification.channelId) {
    const existing = await channel.messages.fetch(storedMessageId).catch(() => null);
    if (existing) return;
  }

  const msg = await channel.send(buildPanelPayload()).catch(err => {
    log.error('verify', 'Failed to post verify panel', err);
    return null;
  });

  if (msg) {
    setState('verify_panel_message_id', msg.id);
    setState('verify_panel_channel_id', channel.id);
    log.success('verify', `Posted verify panel in #${channel.name}`);
  }
}

function setupPanelWatcher(client) {
  if (!config.verification.enabled || !config.verification.channelId) return;

  client.on('messageDelete', async (message) => {
    const storedMessageId = getState('verify_panel_message_id');
    if (!storedMessageId || message.id !== storedMessageId) return;

    log.warn('verify', 'Verify panel was deleted, resending...');

    const channel = await client.channels.fetch(config.verification.channelId).catch(() => null);
    if (!channel) return;

    const msg = await channel.send(buildPanelPayload()).catch(err => {
      log.error('verify', 'Failed to resend verify panel', err);
      return null;
    });

    if (msg) {
      setState('verify_panel_message_id', msg.id);
      setState('verify_panel_channel_id', channel.id);
      log.success('verify', `Resent verify panel in #${channel.name}`);
    }
  });
}

async function completeBloxlinkVerification(interaction, robloxUserId, robloxUsername) {
  verify.confirmVerification(interaction.user.id, robloxUserId, robloxUsername);

  if (config.verification.verifiedRoleId) {
    await interaction.member.roles.add(config.verification.verifiedRoleId).catch(err => {
      log.error('verify', 'Failed to add verified role', err);
    });
  }

  const avatarUrl = await roblox.fetchAvatar(robloxUserId);

  logAudit('Verification', interaction.user.id, null, {
    robloxUsername,
    robloxUserId,
    method: 'Bloxlink',
    avatarUrl
  });

  const components = [text('### Verified via Bloxlink')];
  const infoText = `**Username:** ${robloxUsername}\n**User ID:** ${robloxUserId}`;
  if (avatarUrl) {
    components.push(section(infoText, avatarUrl));
  } else {
    components.push(text(infoText));
  }

  await interaction.editReply({
    flags: CV2 | MessageFlags.Ephemeral,
    components: [{ type: 17, components }]
  });
}

async function handleVerifyButton(interaction) {
  if (!config.verification.enabled) {
    return interaction.reply(errorReply('Verification is not enabled on this server.'));
  }

  const existing = verify.getVerifiedUser(interaction.user.id);
  if (existing) {
    return interaction.reply({
      flags: CV2 | MessageFlags.Ephemeral,
      components: [{ type: 17, components: [
        text(`### Already Verified\nYou are linked to **${existing.roblox_username}**.`),
        separator(),
        { type: 1, components: [
          { type: 2, style: 4, label: 'Unlink Account', custom_id: 'verify_unlink' }
        ]}
      ]}]
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  let bloxlinkId = null;
  if (config.bloxlink.apiKey && interaction.guildId) {
    bloxlinkId = await roblox.lookupBloxlink(config.bloxlink.apiKey, interaction.guildId, interaction.user.id);
  }

  if (bloxlinkId) {
    const robloxUser = await roblox.fetchUser(bloxlinkId);
    const usernameLine = robloxUser
      ? `**${robloxUser.username}** (ID: ${bloxlinkId})`
      : `**ID:** ${bloxlinkId}`;

    return interaction.editReply({
      flags: CV2 | MessageFlags.Ephemeral,
      components: [{ type: 17, components: [
        text('### Bloxlink account found'),
        text(`Bloxlink has this Discord account linked to Roblox ${usernameLine} in this server. Is this you?`),
        separator(),
        { type: 1, components: [
          { type: 2, style: 3, label: 'Yes, verify me', custom_id: `verify_bloxlink_confirm:${bloxlinkId}` },
          { type: 2, style: 2, label: 'No, different account', custom_id: 'verify_bloxlink_different' }
        ]}
      ]}]
    });
  }

  if (config.bloxlink.apiKey && interaction.guildId) {
    log.info('bloxlink', `No Bloxlink roblox id for discord=${interaction.user.id} guild=${interaction.guildId} (404, error, or unlinked)`);
  }

  const noLinkBody = config.bloxlink.apiKey
    ? 'No Bloxlink link was found for you in **this server**. Use the button below to verify with your Roblox username and profile bio, or link your account with Bloxlink in this server first.'
    : 'Click the button below and enter your Roblox username.';

  return interaction.editReply({
    flags: CV2 | MessageFlags.Ephemeral,
    components: [{ type: 17, components: [
      text('### Verify your Roblox account'),
      text(noLinkBody),
      separator(),
      { type: 1, components: [
        { type: 2, style: 1, label: 'Enter Roblox username', custom_id: 'verify_open_username_modal' }
      ]}
    ]}]
  });
}

async function handleBloxlinkConfirm(interaction) {
  const match = interaction.customId.match(/^verify_bloxlink_confirm:(\d+)$/);
  if (!match) {
    return interaction.reply(errorReply('Invalid confirmation.'));
  }
  const claimedId = match[1];

  if (!config.verification.enabled) {
    return interaction.reply(errorReply('Verification is not enabled on this server.'));
  }

  await interaction.deferUpdate();

  if (!config.bloxlink.apiKey || !interaction.guildId) {
    return interaction.editReply(errorReply('Bloxlink is not configured.'));
  }

  const bloxlinkId = await roblox.lookupBloxlink(config.bloxlink.apiKey, interaction.guildId, interaction.user.id);
  if (!bloxlinkId || String(bloxlinkId) !== String(claimedId)) {
    return interaction.editReply(errorReply('That link is no longer valid. Press **Verify** on the panel to try again.'));
  }

  const alreadyLinked = verify.getVerifiedByRobloxId(claimedId);
  if (alreadyLinked && alreadyLinked.discord_id !== interaction.user.id) {
    return interaction.editReply(errorReply('That Roblox account is already linked to another Discord user.'));
  }

  const robloxUser = await roblox.fetchUser(claimedId);
  if (!robloxUser) {
    return interaction.editReply(errorReply('Could not load that Roblox account. Try again.'));
  }

  await completeBloxlinkVerification(interaction, String(claimedId), robloxUser.username);
}

async function handleBloxlinkDifferent(interaction) {
  await interaction.deferUpdate();
  await interaction.editReply({
    flags: CV2 | MessageFlags.Ephemeral,
    components: [{ type: 17, components: [
      text('### Verify with username'),
      text('Enter your Roblox username. You will set a short phrase in your Roblox bio to complete verification.'),
      separator(),
      { type: 1, components: [
        { type: 2, style: 1, label: 'Enter Roblox username', custom_id: 'verify_open_username_modal' }
      ]}
    ]}]
  });
}

async function handleOpenUsernameModal(interaction) {
  if (!config.verification.enabled) {
    return interaction.reply(errorReply('Verification is not enabled on this server.'));
  }

  const existing = verify.getVerifiedUser(interaction.user.id);
  if (existing) {
    return interaction.reply({
      flags: CV2 | MessageFlags.Ephemeral,
      components: [{ type: 17, components: [
        text(`### Already Verified\nYou are linked to **${existing.roblox_username}**.`),
        separator(),
        { type: 1, components: [
          { type: 2, style: 4, label: 'Unlink Account', custom_id: 'verify_unlink' }
        ]}
      ]}]
    });
  }

  await interaction.showModal(buildUsernameModal());
}

async function handleUsernameModal(interaction) {
  const username = interaction.fields.getTextInputValue('roblox_username').trim();

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const resolved = await roblox.resolveUsername(username);
  if (!resolved) {
    return interaction.editReply(errorReply(`Could not find a Roblox account named **${username}**. Check the spelling and try again.`));
  }

  const alreadyLinked = verify.getVerifiedByRobloxId(resolved.id);
  if (alreadyLinked && alreadyLinked.discord_id !== interaction.user.id) {
    return interaction.editReply(errorReply('That Roblox account is already linked to another Discord user.'));
  }

  let bloxlinkId = null;
  if (config.bloxlink.apiKey && interaction.guildId) {
    bloxlinkId = await roblox.lookupBloxlink(config.bloxlink.apiKey, interaction.guildId, interaction.user.id);
    if (bloxlinkId && String(bloxlinkId) === String(resolved.id)) {
      await completeBloxlinkVerification(interaction, resolved.id, resolved.username);
      return;
    }
  }

  let mismatchHint = null;
  if (bloxlinkId && String(bloxlinkId) !== String(resolved.id)) {
    const other = await roblox.fetchUser(bloxlinkId);
    mismatchHint = other
      ? `Bloxlink links your Discord to **${other.username}** in this server, not **${resolved.username}**. You can verify as **${other.username}** from the verification panel, or continue below with your bio.`
      : `Bloxlink links your Discord to a different Roblox account (ID ${bloxlinkId}) than **${resolved.username}**. Continue below to verify with your bio, or use the account Bloxlink has on file.`;
  }

  const phrase = verify.createSession(interaction.user.id, resolved.id, resolved.username, interaction.guildId);
  const avatarUrl = await roblox.fetchAvatar(resolved.id);

  const components = [];

  if (mismatchHint) {
    components.push(text(mismatchHint));
    components.push(separator());
  }

  const headerText = `### Verify as ${resolved.username}\nSet your **Roblox bio** to the phrase below, then press **Check Bio**.`;

  if (avatarUrl) {
    components.push(section(headerText, avatarUrl));
  } else {
    components.push(text(headerText));
  }

  components.push(separator());
  components.push(text(`\`\`\`\n${phrase}\n\`\`\``));
  components.push(separator());
  components.push(text('-# Go to your Roblox profile > Edit Profile > paste the phrase into your About Me > Save.'));
  components.push(text('-# This session expires in 10 minutes.'));
  components.push(separator());
  components.push({
    type: 1,
    components: [
      { type: 2, style: 1, label: 'Check Bio', custom_id: 'verify_check' },
      { type: 2, style: 4, label: 'Cancel', custom_id: 'verify_cancel' }
    ]
  });

  await interaction.editReply({
    flags: CV2 | MessageFlags.Ephemeral,
    components: [{ type: 17, components }]
  });
}

async function handleCheckDescription(interaction) {
  await interaction.deferUpdate();

  const session = verify.getSession(interaction.user.id);
  if (!session) {
    return interaction.editReply(errorReply('Your verification session has expired. Please start again.'));
  }

  const user = await roblox.fetchUser(session.roblox_user_id);
  if (!user) {
    return interaction.editReply(errorReply('Could not reach the Roblox API right now. Please try again in a moment.'));
  }

  const description = (user.description || '').toLowerCase().trim();
  const expectedPhrase = session.phrase.toLowerCase().trim();

  if (!description.includes(expectedPhrase)) {
    return interaction.editReply({
      flags: CV2 | MessageFlags.Ephemeral,
      components: [{ type: 17, components: [
        text('### Phrase not found\nYour Roblox bio does not contain the verification phrase.\n\nMake sure you:'),
        text('- Copied the **entire** phrase including the number\n- Saved your profile after pasting\n- Did not add extra text around it'),
        separator(),
        text(`Expected phrase:\n\`\`\`\n${session.phrase}\n\`\`\``),
        separator(),
        { type: 1, components: [
          { type: 2, style: 1, label: 'Try Again', custom_id: 'verify_check' },
          { type: 2, style: 4, label: 'Cancel', custom_id: 'verify_cancel' }
        ]}
      ]}]
    });
  }

  verify.confirmVerification(interaction.user.id, session.roblox_user_id, session.roblox_username);

  if (config.verification.verifiedRoleId) {
    await interaction.member.roles.add(config.verification.verifiedRoleId).catch(err => {
      log.error('verify', 'Failed to add verified role', err);
    });
  }

  const avatarUrl = await roblox.fetchAvatar(session.roblox_user_id);

  logAudit('Verification', interaction.user.id, null, {
    robloxUsername: session.roblox_username,
    robloxUserId: session.roblox_user_id,
    method: 'About Me Prompt',
    avatarUrl
  });

  const components = [text('### Verified successfully')];

  const infoText = `**Username:** ${session.roblox_username}\n**User ID:** ${session.roblox_user_id}`;
  if (avatarUrl) {
    components.push(section(infoText, avatarUrl));
  } else {
    components.push(text(infoText));
  }

  components.push(separator());
  components.push(text('-# You can remove the phrase from your bio now.'));

  await interaction.editReply({
    flags: CV2 | MessageFlags.Ephemeral,
    components: [{ type: 17, components }]
  });
}

async function handleCancel(interaction) {
  verify.clearSession(interaction.user.id);
  await interaction.update({
    flags: CV2 | MessageFlags.Ephemeral,
    components: [{ type: 17, components: [text('### Verification cancelled')] }]
  });
}

async function handleUnlink(interaction) {
  await interaction.deferUpdate();
  const removed = verify.removeVerification(interaction.user.id);

  if (!removed) {
    return interaction.editReply(errorReply('You are not verified.'));
  }

  if (config.verification.verifiedRoleId) {
    await interaction.member.roles.remove(config.verification.verifiedRoleId).catch(err => {
      log.error('verify', 'Failed to remove verified role', err);
    });
  }

  logAudit('Unverification', interaction.user.id, null, {
    robloxUsername: removed.roblox_username,
    robloxUserId: removed.roblox_user_id
  });

  await interaction.editReply({
    flags: CV2 | MessageFlags.Ephemeral,
    components: [{ type: 17, components: [
      text(`### Account unlinked\n**${removed.roblox_username}** has been removed from your profile.`)
    ]}]
  });
}

module.exports = {
  setVerifyConfig,
  postVerifyPanel,
  setupPanelWatcher,
  handleVerifyButton,
  handleUsernameModal,
  handleCheckDescription,
  handleCancel,
  handleUnlink,
  handleBloxlinkConfirm,
  handleBloxlinkDifferent,
  handleOpenUsernameModal,
};
