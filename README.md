# It's Over Telegram Bot

Private Node.js/TypeScript bot for a small allowlist of Telegram groups.

## What it does

- **Sunday 18:00** (`America/Sao_Paulo`): the weekly job sends the configured GIF to all eligible groups. This is the **only** way the GIF is sent.
- **`/itsOver`**: in an eligible group, replies with the hours left until that next Sunday delivery:

  `Ei, calma.. Faltam X horas pro Gif`

  `X` is ceiling hours to the next strictly-future Sunday 18:00. The command never sends the GIF.

## Setup

Operator setup (token, allowlist, GIF URL, BotFather): [001 quickstart](./specs/001-its-over-bot/quickstart.md)

Validate countdown behavior: [002 quickstart](./specs/002-countdown-command/quickstart.md)

```powershell
npm install
cp .env.example .env   # fill BOT_TOKEN, GIF_URL, ALLOWLIST_CHAT_IDS
npm run dev
```

## Scope

- Long polling with grammY
- One GIF via environment variable
- Group/supergroup allowlist via environment variable
- Optimistic presence + persisted Telegram `file_id`
- Countdown on `/itsOver`; GIF only on the weekly job

## Non-goals

- Webhooks
- Telegram admin commands such as `/allow` or `/deny`
- Sunday catch-up when the process was offline at the scheduled time
- `/itsOver` sending the GIF on demand
- UI, admin panel, AI, or multiple/random GIFs
