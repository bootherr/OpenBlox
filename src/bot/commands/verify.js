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

  const modal = new ModalBuilder()
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

  await interaction.showModal(modal);
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
    return interaction.editReply(errorReply(`That Roblox account is already linked to another Discord user.`));
  }

  if (config.bloxlink.apiKey) {
    const bloxlinkId = await roblox.lookupBloxlink(config.bloxlink.apiKey, interaction.guildId, interaction.user.id);

    if (bloxlinkId && bloxlinkId === resolved.id) {
      verify.confirmVerification(interaction.user.id, resolved.id, resolved.username);

      if (config.verification.verifiedRoleId) {
        await interaction.member.roles.add(config.verification.verifiedRoleId).catch(err => {
          log.error('verify', 'Failed to add verified role', err);
        });
      }

      const avatarUrl = await roblox.fetchAvatar(resolved.id);

      logAudit('Verification', interaction.user.id, null, {
        robloxUsername: resolved.username,
        robloxUserId: resolved.id,
        method: 'Bloxlink',
        avatarUrl
      });

      const components = [text('### Verified via Bloxlink')];
      const infoText = `**Username:** ${resolved.username}\n**User ID:** ${resolved.id}`;
      if (avatarUrl) {
        components.push(section(infoText, avatarUrl));
      } else {
        components.push(text(infoText));
      }

      return interaction.editReply({
        flags: CV2 | MessageFlags.Ephemeral,
        components: [{ type: 17, components }]
      });
    }
  }

  const phrase = verify.createSession(interaction.user.id, resolved.id, resolved.username, interaction.guildId);
  const avatarUrl = await roblox.fetchAvatar(resolved.id);

  const components = [];

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
};
