# Getting Started with Traul

Traul is a personal intelligence engine that syncs messages from Slack, Telegram, Discord, Linear, Gmail, WhatsApp, Claude Code sessions, and local Markdown files into a single searchable SQLite database.

> **For AI agents:** If you are an AI assistant setting up Traul for a user, follow this doc step by step. Present the list of available connectors (Section 4), let the user choose which ones they want, then walk through each selected connector one at a time. After setup, start the daemon and verify with a search query.

## 1. Install Prerequisites

### Bun (required)

Traul uses [Bun](https://bun.sh) as its runtime and package manager.

```sh
curl -fsSL https://bun.sh/install | bash
```

Restart your terminal, then verify:

```sh
bun --version   # should be 1.0+
```

### Homebrew SQLite (required on macOS)

Apple's bundled SQLite does not support loadable extensions. Traul needs Homebrew's build for the `sqlite-vec` vector extension.

```sh
brew install sqlite
```

Traul automatically loads the library from `/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib` — no PATH changes needed.

### Ollama (optional — enables vector search)

[Ollama](https://ollama.com) runs embedding models locally. Without it, you can still use keyword search (`--fts`).

```sh
brew install ollama
ollama pull snowflake-arctic-embed2
ollama serve
```

Keep `ollama serve` running in a background terminal or configure it as a launch agent.

### Python 3 + Telethon (optional — for Telegram sync)

Only needed if you want to sync Telegram messages.

```sh
python3 --version          # macOS ships with Python 3
pip3 install telethon
```

You will also need a Telegram API app — see the Telegram section below.

## 2. Install Traul

```sh
git clone <repo-url> && cd traul
bun install
bun link
```

`bun link` registers `traul` as a global CLI command. Verify:

```sh
traul --help
```

## 3. Create Config File

Create `~/.config/traul/config.json` with your desired settings. You can start with an empty object and add connector config as you go:

```json
{}
```

All connector credentials can be set via environment variables (shown in each section below) or in this config file. Environment variables take precedence over config file values.

## 4. Set Up Connectors

Each connector syncs independently. Pick the ones you want and set them up one at a time.

| Connector | Difficulty | What you need |
|-----------|------------|---------------|
| Claude Code | Zero config | Nothing — reads `~/.claude/projects/` |
| Markdown | Minimal | List of directories in config |
| Linear | Easy | API key |
| Discord | Easy | Bot token |
| Slack | Moderate | Token (bot or user) |
| Telegram | Moderate | API ID/hash + one-time auth |
| Gmail | Moderate | OAuth2 credentials |
| WhatsApp | Advanced | WAHA server + QR auth |

### Claude Code (zero config)

Reads session files from `~/.claude/projects/` — nothing to configure.

```sh
traul sync claudecode
```

### Markdown

Add a list of directories to your config file:

```json
{
  "markdown": {
    "dirs": ["~/notes", "~/docs"]
  }
}
```

```sh
traul sync markdown
```

### Linear

Get an API key from [Linear Settings > API](https://linear.app/settings/api).

```sh
export LINEAR_API_KEY="lin_api_..."
```

For multiple workspaces, use suffixed variables:

```sh
export LINEAR_API_KEY_WORK="lin_api_..."
export LINEAR_API_KEY_PERSONAL="lin_api_..."
```

```sh
traul sync linear
```

### Discord

Create a Discord bot at [discord.com/developers/applications](https://discord.com/developers/applications):

1. Create a New Application
2. Go to Bot > Reset Token — copy the token
3. Under Privileged Gateway Intents, enable **Message Content Intent**
4. Go to OAuth2 > URL Generator, select `bot` scope with `Read Message History` permission
5. Open the generated URL to invite the bot to your server

```sh
export DISCORD_TOKEN="your-bot-token"
```

Optional — filter by server or channel in config:

```json
{
  "discord": {
    "servers": {
      "allowlist": ["server_id_1"]
    },
    "channels": {
      "stoplist": ["channel_id_to_skip"]
    }
  }
}
```

```sh
traul sync discord
```

### Slack

You need a Slack token. Two approaches:

**Bot token (xoxb)** — create a Slack app at [api.slack.com/apps](https://api.slack.com/apps), add OAuth scopes (`channels:history`, `channels:read`, `users:read`), install to workspace, copy the Bot User OAuth Token.

**User token (xoxc)** — extract from your browser's Slack session. Open Slack in a browser, find the `xoxc-` token and `d=` cookie value in DevTools (Application > Cookies and Network requests). This gives access to all channels you can see.

```sh
export SLACK_TOKEN="xoxb-..."
# or for xoxc tokens:
export SLACK_TOKEN="xoxc-..."
export SLACK_COOKIE="xoxd=..."
```

For multiple workspaces, use suffixed variables:

```sh
export SLACK_TOKEN_MYTEAM="xoxb-..."
export SLACK_TOKEN_WORK="xoxc-..."
export SLACK_COOKIE_WORK="xoxd=..."
```

```sh
traul sync slack
```

### Telegram

1. Go to [my.telegram.org](https://my.telegram.org), log in, and create an app under "API development tools". Note the `api_id` and `api_hash`.

2. Set environment variables:

```sh
export TELEGRAM_API_ID="12345678"
export TELEGRAM_API_HASH="abc123..."
```

3. Run the one-time interactive auth (enters your phone number, sends a code):

```sh
python3 scripts/tg_sync.py setup
```

This creates a session file at `~/.config/telegram-telethon/session`. You only need to do this once.

4. Sync:

```sh
traul sync telegram
```

### Gmail

Gmail requires OAuth2 credentials. You need a Google Cloud project with the Gmail API enabled.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use an existing one)
3. Enable the Gmail API under APIs & Services > Library
4. Create OAuth2 credentials under APIs & Services > Credentials > Create Credentials > OAuth client ID
5. Set application type to "Desktop app"
6. Note the `client_id` and `client_secret`
7. Obtain a refresh token by completing the OAuth2 flow (use the Google OAuth Playground or a local script)

```sh
export GMAIL_CLIENT_ID="your-client-id"
export GMAIL_CLIENT_SECRET="your-client-secret"
export GMAIL_REFRESH_TOKEN="your-refresh-token"
```

Or as a single JSON variable:

```sh
export GMAIL_CREDS_JSON='{"client_id":"...","client_secret":"...","refresh_token":"..."}'
```

For multiple accounts, use config:

```json
{
  "gmail": {
    "accounts": [
      {
        "name": "personal",
        "client_id": "...",
        "client_secret": "...",
        "refresh_token": "...",
        "labels": ["INBOX"]
      }
    ]
  }
}
```

```sh
traul sync gmail
```

### WhatsApp

WhatsApp sync uses [WAHA](https://waha.devlike.pro/) (WhatsApp HTTP API), a self-hosted service that bridges WhatsApp Web.

1. Start a WAHA instance:

```sh
docker compose -f docker-compose.waha.yml up -d
```

2. Add the instance to your config:

```json
{
  "whatsapp": {
    "instances": [
      {
        "name": "personal",
        "url": "http://localhost:3000",
        "api_key": "your-waha-api-key",
        "session": "default"
      }
    ]
  }
}
```

3. Authenticate by scanning a QR code:

```sh
traul whatsapp auth personal
```

This displays a QR code in your terminal. Scan it with WhatsApp on your phone within 2 minutes.

4. Optional — filter to specific chats:

```json
{
  "whatsapp": {
    "instances": [
      {
        "name": "personal",
        "url": "http://localhost:3000",
        "api_key": "your-waha-api-key",
        "session": "default",
        "chats": ["chat_id_1", "chat_id_2"]
      }
    ]
  }
}
```

```sh
traul sync whatsapp
```

## 5. Start the Daemon

Instead of running `traul sync` manually, start the daemon for continuous background sync:

```sh
traul daemon start --detach
```

This runs the daemon in the background, syncing all configured connectors at regular intervals and generating embeddings automatically. Logs are written to `~/.local/share/traul/daemon.log`.

Check daemon status:

```sh
traul daemon status
```

Stop the daemon:

```sh
traul daemon stop
```

### Auto-start on boot (optional, macOS)

To start the daemon automatically when you log in, create a launchd plist:

```sh
cat > ~/Library/LaunchAgents/com.traul.daemon.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.traul.daemon</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/YOUR_USERNAME/.bun/bin/traul</string>
        <string>daemon</string>
        <string>start</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/YOUR_USERNAME/.local/share/traul/daemon-launchd.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/YOUR_USERNAME/.local/share/traul/daemon-launchd.log</string>
</dict>
</plist>
EOF
```

Replace `YOUR_USERNAME` with your macOS username, then load it:

```sh
launchctl load ~/Library/LaunchAgents/com.traul.daemon.plist
```

To disable auto-start:

```sh
launchctl unload ~/Library/LaunchAgents/com.traul.daemon.plist
```

## 6. Verify It Works

After your first sync, verify everything is working:

```sh
traul stats
```

This shows the number of messages synced per source.

Run a search to confirm:

```sh
traul search "hello" --fts
```

If you have Ollama running and have generated embeddings (`traul embed`), you can use hybrid search:

```sh
traul search "recent discussions about deployments"
```

Browse your synced channels:

```sh
traul channels
traul messages general --limit 20
```

## 7. Database Location

Traul stores everything in a single SQLite file:

```
~/.local/share/traul/traul.db
```

Override with `TRAUL_DB_PATH`:

```sh
export TRAUL_DB_PATH="~/my-data/traul.db"
```

## 8. Troubleshooting

**"unable to load extension" or SQLite errors**
Homebrew SQLite is not installed. Run `brew install sqlite` and try again.

**"connect ECONNREFUSED" on search**
Ollama is not running. Start it with `ollama serve`, or use `--fts` for keyword-only search.

**Telegram "session expired" or auth errors**
Re-run `python3 scripts/tg_sync.py setup` to create a fresh session.

**Slack "not_authed" or 403**
Your token has expired. For xoxc tokens, re-extract the token and cookie from your browser — they rotate periodically.

**"model not found" on embed/search**
Pull the model first: `ollama pull snowflake-arctic-embed2`. If you use a different model, set `TRAUL_EMBED_MODEL`.

**No search results with hybrid mode**
Embeddings may not be generated yet. Run `traul embed` first, or use `--fts` for keyword search.

**Daemon won't start or port conflict**
Check if another daemon is running: `traul daemon status`. The default port is 3847 — change it in config under `daemon.port` if needed.

**WhatsApp QR code expired**
Run `traul whatsapp auth <account>` again — you have 2 minutes to scan before it expires.
