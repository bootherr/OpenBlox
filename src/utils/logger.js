const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const WHITE = '\x1b[37m';
const GRAY = '\x1b[90m';
const BG_RED = '\x1b[41m';

const pkg = require('../../package.json');

const BANNER = `
${BLUE}${BOLD}  ██████╗ ██████╗ ███████╗███╗   ██╗${RESET}
${BLUE}${BOLD} ██╔═══██╗██╔══██╗██╔════╝████╗  ██║${RESET}
${BLUE}${BOLD} ██║   ██║██████╔╝█████╗  ██╔██╗ ██║${RESET}
${BLUE}${BOLD} ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║${RESET}
${BLUE}${BOLD} ╚██████╔╝██║     ███████╗██║ ╚████║${RESET}
${BLUE}${BOLD}  ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝${RESET}
${CYAN}${BOLD} ██████╗ ██╗      ██████╗ ██╗  ██╗${RESET}
${CYAN}${BOLD} ██╔══██╗██║     ██╔═══██╗╚██╗██╔╝${RESET}
${CYAN}${BOLD} ██████╔╝██║     ██║   ██║ ╚███╔╝ ${RESET}
${CYAN}${BOLD} ██╔══██╗██║     ██║   ██║ ██╔██╗ ${RESET}
${CYAN}${BOLD} ██████╔╝███████╗╚██████╔╝██╔╝ ██╗${RESET}
${CYAN}${BOLD} ╚═════╝ ╚══════╝ ╚═════╝ ╚═╝  ╚═╝${RESET}
`;

function timestamp() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function printBanner() {
  console.log(BANNER);
  console.log(`${CYAN}${BOLD}  OpenBlox${RESET} ${DIM}v${pkg.version}${RESET}\n`);
}

function online(botTag) {
  console.log(`${GREEN}${BOLD} ✓ ${RESET}${WHITE}${BOLD}OpenBlox online as ${CYAN}${botTag}${RESET}`);
  console.log(`${GRAY}   ${timestamp()}${RESET}`);
  console.log();
}

function info(tag, message) {
  console.log(`${GRAY}${timestamp()} ${BLUE}[${tag}]${RESET} ${message}`);
}

function success(tag, message) {
  console.log(`${GRAY}${timestamp()} ${GREEN}[${tag}]${RESET} ${GREEN}${message}${RESET}`);
}

function warn(tag, message) {
  console.log(`${GRAY}${timestamp()} ${YELLOW}[${tag}]${RESET} ${YELLOW}${message}${RESET}`);
}

function error(tag, message, err) {
  console.error(`${GRAY}${timestamp()} ${RED}[${tag}]${RESET} ${RED}${message}${RESET}`);
  if (err) {
    const code = err.code || err.status || 'UNKNOWN';
    console.error(`${GRAY}${timestamp()} ${RED}[${tag}]${RESET} ${DIM}Code: ${code} | ${err.message || err}${RESET}`);
  }
}

function fatal(tag, message) {
  console.error(`${BG_RED}${WHITE}${BOLD} FATAL ${RESET} ${RED}${message}${RESET}`);
}

function action(tag, message) {
  console.log(`${GRAY}${timestamp()} ${CYAN}[${tag}]${RESET} ${message}`);
}

function configLoaded(config) {
  console.log();
  console.log(`${WHITE}${BOLD} Configuration${RESET}`);
  console.log(`${GRAY} ├─ Group ID:     ${WHITE}${config.groupId}${RESET}`);
  console.log(`${GRAY} ├─ Verification: ${config.verification.enabled ? `${GREEN}Enabled` : `${YELLOW}Disabled`}${RESET}`);
  console.log(`${GRAY} ├─ Ranking:      ${config.ranking.enabled ? `${GREEN}Enabled` : `${YELLOW}Disabled`}${RESET}`);
  console.log(`${GRAY} ├─ Bloxlink:     ${config.bloxlink.apiKey ? `${GREEN}Enabled` : `${GRAY}Not configured`}${RESET}`);
  console.log(`${GRAY} ├─ Abuse Detect: ${config.abuse.enabled ? `${GREEN}Enabled ${GRAY}(${config.abuse.threshold})` : `${YELLOW}Disabled`}${RESET}`);
  console.log(`${GRAY} ├─ Status:       ${WHITE}${config.presence.status}${RESET}`);
  console.log(`${GRAY} ├─ Activity:     ${WHITE}${config.presence.activityText}${RESET}`);
  console.log(`${GRAY} └─ Log Channels: ${[config.logging.ranking && 'Ranking', config.logging.verification && 'Verification', config.logging.moderation && 'Moderation', config.logging.abuse && 'Abuse'].filter(Boolean).join(', ') || `${YELLOW}None`}${RESET}`);
  console.log();
}

module.exports = {
  printBanner,
  online,
  info,
  success,
  warn,
  error,
  fatal,
  action,
  configLoaded,
};
