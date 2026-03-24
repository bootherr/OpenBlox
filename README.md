# OpenBloxBot Beta

**Version:** Beta (`1.0.0-beta` in `package.json`)

Open source Discord bot for managing Roblox groups. Rank members, verify accounts, view group info, and keep audit logs, all from Discord.

Built on the Roblox Open Cloud API. No cookies, no fragile workarounds.

## Features

- **Ranking** - Promote, demote, or set any member's rank with `/rank`
- **Verification** - Link Discord accounts to Roblox via About Me bio check
- **Bloxlink Support** - Optional auto-verification for users already verified through Bloxlink
- **Group Info** - View linked Roblox group details with `/groupinfo`
- **Audit Logs** - Track every action with `/auditlogs`, with pagination and filters
- **User Info** - View Discord and linked Roblox info with `/userinfo`
- **Auto Reverify** - Members who rejoin get their verified role back automatically
- **Abuse Detection** - Configurable rate limiting with scaling cooldowns and exemptions
- **Logging Channels** - Send rank changes, verifications, moderation actions, and abuse detections to specific channels
- **Terminal Commands** - Manage the bot from the console with stop, restart, update, and help
- **Live Updates** - Check for and pull the latest changes without leaving the terminal

## Requirements

- [Node.js](https://nodejs.org/) v18 or higher
- A Discord bot token
- A Roblox Open Cloud API key with `group:read` and `group:write` scopes

## Guided setup (Setup Onboarding)

The OpenBlox **documentation site** (the `openblox` front-end in the same workspace as this bot, not this repo alone) includes **Setup Onboarding**: a full-screen walkthrough—Windows, macOS, Linux, or Replit, then Discord (token, intents, **Public Bot** off), Roblox API key, `.env` / `openblox.conf`, invite URL, and starting the bot—with a progress bar, step list, and saved progress in the browser until you end the session.

**[Click here to start Setup Onboarding](http://localhost:8080/docs?wizard=start)** if you are running the docs site locally (`cd` into the `openblox` folder, `npm install`, `npm run dev`; Vite uses port **8080** by default). That URL drops you straight into the onboarding flow—no extra confirm dialog.

If the site is hosted somewhere public, use the same query on your own origin, for example `https://your-domain.com/docs?wizard=start`.

You can also open **Documentation** (`/docs`) in the site, expand **Getting Started**, and click the **Setup Onboarding** card; that path asks for confirmation before the full-screen flow starts.

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/bootherr/OpenBloxBot.git
cd OpenBloxBot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up your environment

Copy the example env file and fill in your secrets:

```bash
cp .env.example .env
```

Open `.env` and add:
- `BOT_TOKEN` - Your Discord bot token ([get one here](https://discord.com/developers/applications))
- `ROBLOX_API_KEY` - Your Roblox Open Cloud API key ([create one here](https://create.roblox.com/dashboard/credentials))
- `BLOXLINK_API_KEY` - (Optional) Your Bloxlink API key for auto-verification ([get one here](https://blox.link/dashboard/developer))

### 4. Configure the bot

Open `openblox.conf` and set your values:

```ini
[general]
group_id = 123456789

[presence]
status = online
activity_type = watching
activity_text = For Commands

[verification]
enabled = true
channel_id = YOUR_CHANNEL_ID
verified_role_id = YOUR_ROLE_ID

[ranking]
enabled = true
allowed_roles = ROLE_ID_1, ROLE_ID_2

[abuse_detection]
enabled = false
threshold = low
exempt_user_ids =
exempt_role_ids =

[logging]
ranking_channel_id = YOUR_CHANNEL_ID
verification_channel_id = YOUR_CHANNEL_ID
moderation_channel_id = YOUR_CHANNEL_ID
abuse_channel_id = YOUR_CHANNEL_ID
```

### 5. Start the bot

```bash
npm start
```

## Setting Up Your Roblox API Key

1. Go to [Roblox Creator Dashboard > Credentials](https://create.roblox.com/dashboard/credentials)
2. Click **Create API Key**
3. Name it whatever you want
4. Under **Access Permissions**, add your group
5. Enable `group:read` and `group:write` scopes
6. Under **Security**, add your server's IP address (or `0.0.0.0/0` for development)
7. Copy the key into your `.env` file

## Setting Up Your Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the **Bot** tab
4. Click **Reset Token** and copy it into your `.env` file
5. Under **Privileged Gateway Intents**, enable **Presence Intent**, **Server Members Intent**, and **Message Content Intent** (turn all of them on), then save
6. Go to **OAuth2 > URL Generator**
7. Select scopes: `bot`, `applications.commands`
8. Under bot permissions: **Administrator** is recommended (fewer surprise permission errors). If you skip it, enable at least `Manage Roles`, `Send Messages`, `Use External Emojis`, `Read Message History`
9. Copy the generated URL and use it to invite the bot to your server

## Bloxlink Integration (Optional)

If you have a Bloxlink API key, users who are already verified through Bloxlink can skip the manual bio check.

1. Go to [Bloxlink Developer Dashboard](https://blox.link/dashboard/developer)
2. Create a guild-scoped API key for the server your bot is in
3. Add it to your `.env` file as `BLOXLINK_API_KEY`

## How Verification Works

1. User clicks the **Verify** button in the verification channel
2. User enters their Roblox username in the modal
3. If Bloxlink is configured and the user is already verified there, they are auto-verified
4. Otherwise, the bot generates a unique phrase and tells the user to set it as their Roblox bio (About Me)
5. User clicks **Check Bio** and the bot verifies the phrase matches
6. User gets the verified role and can remove the phrase from their bio

## Terminal Commands

Once the bot is running, you can type these commands in the terminal:

- `stop` - Shut down the bot
- `restart` - Reload config and reconnect (same process, no new terminal)
- `update` - Check for updates and install the latest changes from GitHub
- `help` - Show the list of commands

The bot also checks for updates automatically on startup and will let you know if one is available.

## Project Structure

```
OpenBloxBot/
├── index.js                    Entry point
├── openblox.conf               Bot configuration
├── .env.example                Environment variable template
├── package.json
├── LICENSE
└── src/
    ├── bot/
    │   ├── commands/
    │   │   ├── rank.js         /rank command
    │   │   ├── verify.js       Verification flow
    │   │   ├── auditlogs.js    /auditlogs command
    │   │   ├── userinfo.js     /userinfo command
    │   │   └── groupinfo.js    /groupinfo command
    │   └── events/
    │       ├── ready.js        Bot startup
    │       ├── interactionCreate.js  Interaction router
    │       └── guildMemberAdd.js     Auto reverify
    ├── database/
    │   ├── connection.js       SQLite connection
    │   └── schema.js           Table definitions
    ├── services/
    │   ├── roblox.js           Roblox API + Bloxlink
    │   ├── audit.js            Audit logging
    │   ├── abuse.js            Abuse detection
    │   └── verification.js     Session management
    └── utils/
        ├── config.js           Config parser
        ├── console.js          Terminal commands + updater
        ├── logger.js           Terminal output
        └── messages.js         Discord message helpers
```

## Troubleshooting

### "BOT_TOKEN is missing"
Create a `.env` file in the project root and add your bot token. See the setup guide above.

### "ROBLOX_API_KEY is missing"
Add your Roblox Open Cloud API key to the `.env` file. Make sure it has `group:read` and `group:write` scopes.

### "group_id must be a number"
Open `openblox.conf` and make sure the `group_id` under `[general]` is just the numeric ID from your group URL.

### "Your bot token is invalid"
Your token might have been regenerated. Go to the Discord Developer Portal, reset your token, and update `.env`.

### "Missing required gateway intents"
Go to the Discord Developer Portal > your bot > Bot tab > under **Privileged Gateway Intents** enable **Presence**, **Server Members**, and **Message Content**, then save and restart the bot.

### "Failed to fetch group roles"
Check that your API key has the correct group selected and both `group:read` and `group:write` scopes are enabled. Also make sure your server IP is allowed in the API key security settings.

### "Bloxlink API returned 401"
Your Bloxlink API key is invalid or does not have access to the server. Make sure you created a guild-scoped key and the Bloxlink bot is in your server.

### Bot is online but commands don't show up
Wait a few minutes for Discord to propagate global commands (or press Ctrl+R to reload Discord). Guild commands (`/rank`) should appear immediately.

### Update command says "Could not reach GitHub"
The bot checks GitHub for updates. Make sure your server has internet access. If the repo is private, the update check will not work until the repo is public.

## License

[MIT](LICENSE)
