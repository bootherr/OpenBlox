const { MessageFlags } = require('discord.js');

const CV2 = 1 << 15;

function errorReply(text) {
  return {
    flags: CV2 | MessageFlags.Ephemeral,
    components: [{
      type: 17,
      components: [
        { type: 10, content: `### ${text}` }
      ]
    }]
  };
}

function successReply(text) {
  return {
    flags: CV2 | MessageFlags.Ephemeral,
    components: [{
      type: 17,
      components: [
        { type: 10, content: `### ${text}` }
      ]
    }]
  };
}

function container(...components) {
  return {
    flags: CV2,
    components: [{
      type: 17,
      components
    }]
  };
}

function ephemeralContainer(...components) {
  return {
    flags: CV2 | MessageFlags.Ephemeral,
    components: [{
      type: 17,
      components
    }]
  };
}

function text(content) {
  return { type: 10, content };
}

function section(content, avatarUrl) {
  const s = {
    type: 9,
    components: [{ type: 10, content }]
  };
  if (avatarUrl) {
    s.accessory = { type: 11, media: { url: avatarUrl } };
  }
  return s;
}

function separator() {
  return { type: 14, divider: true, spacing: 1 };
}

module.exports = {
  CV2,
  errorReply,
  successReply,
  container,
  ephemeralContainer,
  text,
  section,
  separator,
};
