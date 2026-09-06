# It's Over Telegram Bot

Private Node.js/TypeScript bot for a small allowlist of Telegram groups. It sends one configured GIF on `/itsOver` and every Sunday at 18:00 `America/Sao_Paulo` while the process is online.

See the [operator quickstart](./specs/001-its-over-bot/quickstart.md) to configure and run the bot in under 30 minutes.

## MVP scope

- Long polling with grammY
- One GIF configured by environment variable
- Group/supergroup allowlist configured by environment variable
- Optimistic membership presence and persisted Telegram `file_id`
- Manual `/itsOver` and weekly Sunday delivery

## Non-goals

- Webhooks
- Telegram admin commands such as `/allow` or `/deny`
- Sunday catch-up when the process was offline at the scheduled time
- UI, admin panel, AI, or multiple/random GIFs
