const { execSync } = require('child_process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');
const log = require('./logger');

const ROOT = path.join(__dirname, '../..');
const REPO = 'bootherr/OpenBloxBot';
const PROTECTED_FILES = ['data', 'node_modules'];

let currentClient = null;
let restartCallback = null;

function setClient(client) {
  currentClient = client;
}

function onRestart(callback) {
  restartCallback = callback;
}

function startConsole() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: ''
  });

  process.stdin.setEncoding('utf-8');

  rl.on('line', async (input) => {
    const cmd = input.trim().toLowerCase();
    if (!cmd) return;

    switch (cmd) {
      case 'stop':
        await handleStop();
        break;
      case 'restart':
        await handleRestart();
        break;
      case 'update':
        await handleUpdate();
        break;
      case 'help':
        printHelp();
        break;
      default:
        log.warn('console', `Unknown command: ${cmd}. Type "help" for a list of commands.`);
        break;
    }
  });
}

function printHelp() {
  log.info('console', 'Available commands:');
  log.info('console', '  stop      - Shut down the bot');
  log.info('console', '  restart   - Reload config and reconnect');
  log.info('console', '  update    - Check for updates and install if available');
  log.info('console', '  help      - Show this list');
}

async function handleStop() {
  log.warn('console', 'Shutting down...');
  if (currentClient) {
    currentClient.destroy();
  }
  process.exit(0);
}

async function handleRestart() {
  log.warn('console', 'Restarting...');

  if (currentClient) {
    currentClient.removeAllListeners();
    currentClient.destroy();
    currentClient = null;
  }

  clearRequireCache();

  if (restartCallback) {
    await restartCallback();
  }
}

function clearRequireCache() {
  const rootDir = path.resolve(ROOT);
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(rootDir) && !key.includes('node_modules')) {
      delete require.cache[key];
    }
  }
}

function getLocalCommit() {
  const commitFile = path.join(ROOT, '.openblox_commit');
  if (fs.existsSync(commitFile)) return fs.readFileSync(commitFile, 'utf-8').trim();
  return null;
}

function saveLocalCommit(sha) {
  fs.writeFileSync(path.join(ROOT, '.openblox_commit'), sha, 'utf-8');
}

async function getRemoteCommit() {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/commits/master`, {
      headers: { 'Accept': 'application/vnd.github.v3.sha' }
    });
    if (!res.ok) return null;
    return (await res.text()).trim();
  } catch {
    return null;
  }
}

async function checkForUpdates() {
  const localSha = getLocalCommit();
  if (!localSha) return null;

  const remoteSha = await getRemoteCommit();
  if (!remoteSha) return null;
  if (remoteSha === localSha) return null;
  return remoteSha.slice(0, 7);
}

function parseConfValues(content) {
  const values = {};
  let section = null;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const secMatch = trimmed.match(/^\[(.+)]$/);
    if (secMatch) {
      section = secMatch[1];
      continue;
    }
    const kvMatch = trimmed.match(/^([^=]+)=(.*)$/);
    if (kvMatch && section) {
      const key = `${section}.${kvMatch[1].trim()}`;
      const val = kvMatch[2].trim();
      if (val) values[key] = val;
    }
  }
  return values;
}

function mergeConf(existingPath, newPath) {
  if (!fs.existsSync(existingPath)) {
    fs.cpSync(newPath, existingPath);
    return;
  }

  const existingValues = parseConfValues(fs.readFileSync(existingPath, 'utf-8'));
  const newTemplate = fs.readFileSync(newPath, 'utf-8');

  let section = null;
  const merged = newTemplate.split('\n').map(line => {
    const trimmed = line.trim();
    const secMatch = trimmed.match(/^\[(.+)]$/);
    if (secMatch) {
      section = secMatch[1];
      return line;
    }
    const kvMatch = trimmed.match(/^([^=]+)=(.*)$/);
    if (kvMatch && section) {
      const key = `${section}.${kvMatch[1].trim()}`;
      if (key in existingValues) {
        return `${kvMatch[1].trimEnd()}= ${existingValues[key]}`;
      }
    }
    return line;
  });

  fs.writeFileSync(existingPath, merged.join('\n'), 'utf-8');
}

function parseEnvValues(content) {
  const values = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (val) values[key] = val;
  }
  return values;
}

function mergeEnv(existingPath, newExamplePath) {
  if (!fs.existsSync(existingPath)) return;
  if (!fs.existsSync(newExamplePath)) return;

  const existingContent = fs.readFileSync(existingPath, 'utf-8');
  const existingValues = parseEnvValues(existingContent);
  const exampleContent = fs.readFileSync(newExamplePath, 'utf-8');
  const exampleValues = parseEnvValues(exampleContent);

  const newKeys = Object.keys(exampleValues).filter(k => !(k in existingValues));
  if (newKeys.length === 0) return;

  let additions = '\n';
  const exampleLines = exampleContent.split('\n');
  for (const key of newKeys) {
    for (let i = 0; i < exampleLines.length; i++) {
      const line = exampleLines[i].trim();
      if (line.startsWith(`${key}=`) || line.startsWith(`${key} =`)) {
        let j = i - 1;
        while (j >= 0 && exampleLines[j].trim().startsWith('#')) j--;
        for (let c = j + 1; c <= i; c++) {
          additions += exampleLines[c] + '\n';
        }
        break;
      }
    }
  }

  fs.writeFileSync(existingPath, existingContent.trimEnd() + '\n' + additions, 'utf-8');
}

async function handleUpdate() {
  const localSha = getLocalCommit();
  const shortLocal = localSha ? localSha.slice(0, 7) : 'unknown';

  log.info('update', `Local commit: ${shortLocal}`);
  log.info('update', 'Checking for updates...');

  const remoteSha = await getRemoteCommit();
  if (!remoteSha) {
    log.error('update', 'Could not reach GitHub. Check your internet connection.');
    return;
  }

  const shortRemote = remoteSha.slice(0, 7);

  if (localSha === remoteSha) {
    log.success('update', `Already up to date (${shortLocal})`);
    return;
  }

  log.info('update', `New update available (${shortRemote})`);
  log.info('update', 'Downloading...');

  const tarballUrl = `https://api.github.com/repos/${REPO}/tarball/master`;

  try {
    const tmpDir = path.join(ROOT, '.update_tmp');
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
    fs.mkdirSync(tmpDir);

    const tarPath = path.join(tmpDir, 'release.tar.gz');

    const dlRes = await fetch(tarballUrl);
    if (!dlRes.ok) {
      log.error('update', `Failed to download: ${dlRes.status}`);
      fs.rmSync(tmpDir, { recursive: true });
      return;
    }

    const buffer = Buffer.from(await dlRes.arrayBuffer());
    fs.writeFileSync(tarPath, buffer);

    log.info('update', 'Extracting...');
    execSync(`tar -xzf "${tarPath}" -C "${tmpDir}"`, { stdio: 'pipe' });

    const extracted = fs.readdirSync(tmpDir).find(f => f !== 'release.tar.gz');
    if (!extracted) {
      log.error('update', 'Could not find extracted files');
      fs.rmSync(tmpDir, { recursive: true });
      return;
    }

    const srcDir = path.join(tmpDir, extracted);

    log.info('update', 'Applying update (keeping your config and data)...');

    const entries = fs.readdirSync(srcDir);
    for (const entry of entries) {
      if (PROTECTED_FILES.includes(entry)) continue;

      if (entry === '.env' || entry === '.env.example') continue;

      if (entry === 'openblox.conf') {
        mergeConf(path.join(ROOT, 'openblox.conf'), path.join(srcDir, 'openblox.conf'));
        log.info('update', 'Merged openblox.conf (your values preserved, new fields added)');
        continue;
      }

      const srcPath = path.join(srcDir, entry);
      const destPath = path.join(ROOT, entry);

      if (fs.existsSync(destPath)) {
        fs.rmSync(destPath, { recursive: true });
      }

      fs.cpSync(srcPath, destPath, { recursive: true });
    }

    const newEnvExample = path.join(srcDir, '.env.example');
    if (fs.existsSync(newEnvExample)) {
      fs.cpSync(newEnvExample, path.join(ROOT, '.env.example'));
      mergeEnv(path.join(ROOT, '.env'), newEnvExample);
      log.info('update', 'Merged .env (your keys preserved, new keys added)');
    }

    saveLocalCommit(remoteSha);

    fs.rmSync(tmpDir, { recursive: true });

    log.info('update', 'Installing dependencies...');
    execSync('npm install --production', { cwd: ROOT, stdio: 'pipe' });

    log.success('update', `Updated to ${shortRemote}`);
    log.info('update', 'Type "restart" to apply the update.');
  } catch (err) {
    log.error('update', 'Update failed', err);
    const tmpDir = path.join(ROOT, '.update_tmp');
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
  }
}

module.exports = { startConsole, setClient, onRestart, checkForUpdates };
