# traul

Give your AI agent memory across all your communications.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

## The Problem

Every time you ask your AI agent to find something — a Slack thread, an email, a Telegram message — it has to request items one by one from each source. It can never see the full picture. You end up being the middleman: searching manually, copy-pasting context, bridging the gap between your agent and your data.

I built Traul to fix this. It creates a searchable, local-only index across all your communication channels — Slack, Discord, Telegram, Gmail, Linear, WhatsApp, and more. Your agent gets a single tool that searches everything at once, with semantic understanding. Instead of you hunting for context, your agent finds it on its own.

## What This Looks Like in Practice

**Track a project across scattered conversations.** An integration is being discussed in Slack, Telegram, and various group chats simultaneously. Your agent sees through all of them at once — who's blocking, whose court the ball is in, what the next steps are.

**Monitor your community.** Ask your agent to summarize what users are writing in your Discord. Get a clear breakdown: main topics this week, overall sentiment, what people are unhappy about, most requested features, how attitudes are shifting over time. Minutes, not hours.

**Find anything you've ever received.** Someone sent you a relevant link weeks ago — but where? Telegram? Slack? Email? Your agent searches across all your history with semantic search that works far better than keyword matching. It finds the exact message without you remembering which app it was in.

**Prep for a meeting in seconds.** Before a call with a recruiter, ask your agent to find everything related to that person. It pulls up the email thread, the LinkedIn message, the calendar invite — across all your connected sources.

**Stop remembering where things live.** The agent tries different keywords, reads intermediate results, follows the chain, and arrives at the answer. You don't need to remember if it was in Slack, Telegram, or your task tracker.

## Privacy First

All data stays on your machine. No APIs, no external services, no cloud sync. Traul indexes and stores everything in a local SQLite database. Nothing is sent to third parties. Your communications remain yours.

## Connectors

Slack · Discord · Telegram · Gmail · Linear · WhatsApp · Claude Code sessions · Markdown files

## How It Works

Traul syncs messages from your connected sources into a local SQLite database. It builds both a full-text index (FTS5) and vector embeddings (via local Ollama) for hybrid search. Your AI agent — or you directly from the terminal — queries this unified index.

```
Your sources → Traul sync → Local SQLite (FTS5 + vectors) → Agent search tool
```

## Quick Start

```sh
git clone <repo-url> && cd traul
bun install
bun link
```

**Requirements:** [Bun](https://bun.sh) v1.0+, [Homebrew SQLite](https://formulae.brew.sh/formula/sqlite) (macOS), optionally [Ollama](https://ollama.com) for vector search.

See **[Getting Started](docs/getting-started.md)** for the full setup walkthrough.

## Usage

```sh
# Sync all configured sources
traul sync

# Sync a specific source
traul sync slack
traul sync discord
traul sync telegram

# Search across everything (hybrid vector + keyword)
traul search "deployment issue"
traul search "marketing launch status" --source slack --after 2025-01-01

# Keyword-only search (no Ollama needed)
traul search "error" --fts

# Browse channels and messages
traul channels
traul messages general --limit 50

# Generate embeddings for semantic search
traul embed

# Background daemon for continuous sync
traul daemon start --detach

# Database stats
traul stats
```

## Configuration

Optional config at `~/.config/traul/config.json`. Environment variables for tokens:

| Variable | Description |
|----------|-------------|
| `SLACK_TOKEN` | Slack token (xoxb or xoxc) |
| `DISCORD_TOKEN` | Discord bot token |
| `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` | Telegram API credentials |
| `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` | Gmail OAuth2 |
| `LINEAR_API_KEY` | Linear API key |

Per-workspace tokens supported via `SLACK_TOKEN_<WORKSPACE>`, `LINEAR_API_KEY_<WORKSPACE>`.

See **[Getting Started](docs/getting-started.md)** for full configuration details.

## Development

```sh
bun test
bun run dev
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). All contributions require a DCO sign-off.

## License

[GNU Affero General Public License v3.0](LICENSE) — use, modify, and distribute freely. Network service deployments must release source code.
