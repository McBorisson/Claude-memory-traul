# Getting Started with Traul

This guide walks you through installing Traul and its dependencies from scratch on macOS.

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

## 3. Sync Your First Source

Start with the easiest source and add more later. Each source syncs independently.

### Claude Code sessions (zero config)

Reads session files from `~/.claude/projects/` — nothing to configure.

```sh
traul sync claudecode
```

### Markdown files (minimal config)

Create `~/.config/traul/config.json`:

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

### Slack

You need a Slack token. Two approaches:

**Bot token (xoxb)** — create a Slack app at [api.slack.com/apps](https://api.slack.com/apps), add OAuth scopes (`channels:history`, `channels:read`, `users:read`), install to workspace, copy the Bot User OAuth Token.

**User token (xoxc)** — extract from your browser's Slack session. Open Slack in a browser, find the `xoxc-` token and `d=` cookie value in DevTools (Application > Cookies and Network requests). This gives access to all channels you can see.

Set environment variables:

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

### Linear

Get an API key from [Linear Settings > API](https://linear.app/settings/api).

```sh
export LINEAR_API_KEY="lin_api_..."
```

For multiple workspaces:

```sh
export LINEAR_API_KEY_WORK="lin_api_..."
export LINEAR_API_KEY_PERSONAL="lin_api_..."
```

```sh
traul sync linear
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

## 4. Search Your Data

### Keyword search (no Ollama needed)

Uses SQLite FTS5 full-text search. Fast, but all terms must appear in the message.

```sh
traul search "deploy error" --fts
```

### Hybrid search (requires Ollama)

Combines keyword matching with vector similarity — finds semantically related messages even when exact words differ.

```sh
traul search "deployment issues last week"
traul search "onboarding flow" --source slack --after 2025-01-01
```

### Browse messages

```sh
traul channels                      # list all synced channels
traul messages general --limit 50   # read messages from a channel
```

## 5. Enable Vector Search

If you installed Ollama and want semantic search:

1. Make sure Ollama is running: `ollama serve`
2. Generate embeddings for all synced messages:

```sh
traul embed
```

This processes messages in batches of 200. Run it again after future syncs to embed new messages.

Now `traul search` uses hybrid mode (vector + keyword) by default.

## 6. Database Location

Traul stores everything in a single SQLite file:

```
~/.local/share/traul/traul.db
```

Override with `TRAUL_DB_PATH`:

```sh
export TRAUL_DB_PATH="~/my-data/traul.db"
```

To see database stats:

```sh
traul stats
```

## 7. Troubleshooting

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
