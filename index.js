const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const log = require('./src/utils/logger');
const { startConsole, setClient, onRestart, checkForUpdates } = require('./src/utils/console');

log.printBanner();

async function boot() {
  const { Client, GatewayIntentBits, Partials } = require('discord.js');

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.MessageContent,
    ],
    partials: [
      Partials.Message,
    ]
  });

  const { loadConfig } = require('./src/utils/config');
  const handleReady = require('./src/bot/events/ready');
  const handleInteraction = require('./src/bot/events/interactionCreate');
  const handleMemberAdd = require('./src/bot/events/guildMemberAdd');

  const config = loadConfig();
  log.configLoaded(config);

  client.once('clientReady', () => handleReady(client, config).catch(err => {
    log.fatal('bot', 'Startup failed during initialization.');
    log.error('bot', err.message, err);
  }));
  client.on('interactionCreate', (interaction) => handleInteraction(interaction));
  client.on('guildMemberAdd', (member) => handleMemberAdd(member, config));

  try {
    await client.login(process.env.BOT_TOKEN);
    setClient(client);
  } catch (err) {
    if (err.code === 'TokenInvalid') {
      log.fatal('bot', 'Your bot token is invalid.');
      log.error('bot', 'Double check BOT_TOKEN in your environment (.env or host secrets such as Replit Secrets).');
      log.info('bot', 'Go to https://discord.com/developers/applications > your bot > Bot tab > Reset Token');
    } else if (err.code === 'DisallowedIntents') {
      log.fatal('bot', 'Missing required gateway intents.');
      log.error('bot', 'Turn on every toggle under Privileged Gateway Intents in the Discord Developer Portal:');
      log.info('bot', '  - Presence Intent');
      log.info('bot', '  - Server Members Intent');
      log.info('bot', '  - Message Content Intent');
      log.info('bot', 'Go to https://discord.com/developers/applications > your bot > Bot tab, then Save Changes.');
    } else {
      log.fatal('bot', 'Failed to connect to Discord.');
      log.error('bot', 'Login failed', err);
    }
    process.exit(1);
  }
}

onRestart(boot);
boot().then(async () => {
  startConsole();
  const newCommit = await checkForUpdates();
  if (newCommit) {
    log.warn('update', `An update is available (${newCommit})`);
    log.info('update', 'Type "update" in the console to pull the latest changes.');
  }
}).catch(err => {
  log.fatal('bot', 'Failed to start.');
  log.error('bot', err.message, err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  log.error('process', 'Unhandled promise rejection', err);
});

process.on('uncaughtException', (err) => {
  log.fatal('process', 'Uncaught exception');
  log.error('process', err.message, err);
  process.exit(1);
});
