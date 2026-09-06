# Contract: Environment configuration

**Feature**: 001-its-over-bot  
**Consumer**: Bot process at startup  
**Mutability**: Operator edits env and restarts (or reloads) process — no Telegram admin commands

## Required variables

| Name | Format | Example | Notes |
|------|--------|---------|-------|
| `BOT_TOKEN` | Telegram bot token string | `123456:ABC...` | From BotFather; never commit |
| `GIF_URL` | Absolute `http://` or `https://` URL | `https://example.com/over.gif` | Publicly fetchable by Telegram servers |
| `ALLOWLIST_CHAT_IDS` | Comma-separated signed integers | `-1001234567890,-1009876543210` | Group/supergroup IDs (usually negative) |

## Optional variables

| Name | Default | Notes |
|------|---------|-------|
| `STATE_PATH` | `data/state.json` | Writable path for runtime state |

## Parsing rules

- Trim whitespace around each chat ID.
- Ignore empty segments.
- Reject non-integer segments at startup (fail fast) **or** skip invalid segments and log warning (prefer **fail fast** for MVP clarity).
- DM / channel IDs present in the list are loaded but **never** become eligible (type filter at send time).

## Non-goals

- No hot-reload UI.
- No `/allow` or `/deny` commands.
- `.env` must not be committed; provide `.env.example` only.
