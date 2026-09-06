# Quickstart: It's Over bot (MVP)

**Goal**: Operator online in under 30 minutes (SC-006).  
**Stack**: Node.js 22 + TypeScript + grammY, long polling.

## Prerequisites

- Node.js 22+
- A Telegram account
- A public HTTPS (or HTTP) URL to a GIF Telegram can fetch
- Chat ID of the friends **group/supergroup** (negative ID, often `-100…`)

## 1. Create the bot (BotFather)

1. Open [@BotFather](https://t.me/BotFather) → `/newbot` → choose name/username.
2. Copy the **token** (becomes `BOT_TOKEN`). Do not share or commit it.
3. Run `/setjoingroups` → select the bot → leave it **Enabled** temporarily so you can add it to the intended group.
4. **Do not** advertise the username publicly.

## 2. Add bot to the group, then lock joins

1. Add the bot to the friends group.
2. Prefer promoting it enough to post (default member that can send messages is enough if group allows bots).
3. In BotFather: `/setjoingroups` → select the bot → **Disable** (after it is already in the group).
4. Optional: `/setprivacy` as needed so the bot sees commands in groups (commands with `/` usually work; if `/itsOver` is ignored, disable privacy or use a group where bots see commands).

## 3. Get the group chat ID

Common approaches:

- Add a temporary “ID bot”, or
- Temporarily call `getUpdates` once before starting this bot.

Put that ID in `ALLOWLIST_CHAT_IDS` (groups/supergroups only; DMs are ignored even if listed).

## 4. Project setup

```bash
# From the repository root
cp .env.example .env
# Edit .env: BOT_TOKEN, GIF_URL, ALLOWLIST_CHAT_IDS

npm install
npm test
npm run dev
```

`npm run dev` executes the TypeScript entrypoint directly. For a production-style run:

```bash
npm run build
npm start
```

Use either `npm run dev` or `npm start`, not both. On startup the app removes any existing webhook without dropping pending updates, registers `/itsover` with `setMyCommands`, starts the weekly scheduler, and begins long polling.

`.env`, `node_modules/`, `data/`, and `dist/` are already ignored by Git.

### Example `.env`

```env
BOT_TOKEN=123456:REPLACE_ME
GIF_URL=https://example.com/its-over.gif
ALLOWLIST_CHAT_IDS=-1001234567890
STATE_PATH=data/state.json
```

## 5. Validate manually (&lt; 5 minutes)

| Step | Action | Expected |
|------|--------|----------|
| A | In allowlisted group, send `/itsOver` | GIF animation arrives |
| B | Repeat `/itsOver` | Same GIF; state file should gain `gifFileId` after first success |
| C | In a non-allowlisted group (or DM), `/itsOver` | Silence — no GIF, no help text |
| D | Restart process, `/itsOver` again | Still works; uses persisted `file_id` when possible |
| E | Remove bot from group, wait for membership update, `/itsOver` from that chat | No send; presence marked absent |
| F | Sunday 18:00 America/Sao_Paulo with process running | GIF to all eligible chats (or use a test hook / clock mock in tests) |

The bot is deliberately silent for DMs, non-allowlisted chats, commands from bots, unknown commands/messages, and `/itsOver` when it is absent or ineligible. It does not send help, denial, or error replies.

## 6. Weekly schedule notes

- Fire time: **Sunday 18:00** `America/Sao_Paulo` only while the process is up.
- If the process was **down** at that minute: **no catch-up**; use `/itsOver` or wait next Sunday.
- Hosting: any always-on machine with outbound HTTPS to `api.telegram.org` and persistent disk for `data/state.json`.

## 7. Troubleshooting

| Symptom | Check |
|---------|--------|
| Polling errors / no updates | The app calls Bot API `deleteWebhook` on every startup. If troubleshooting manually, call `deleteWebhook` securely without printing or storing the token in logs/shell history. |
| `/itsOver` ignored in group | BotFather privacy / group permissions |
| GIF never sends | `GIF_URL` publicly reachable; chat ID allowlisted; chat is group/supergroup |
| Token in logs | Redact; never print `BOT_TOKEN` |

## References

- [env-config.md](./contracts/env-config.md)
- [telegram-updates.md](./contracts/telegram-updates.md)
- [telegram-send-animation.md](./contracts/telegram-send-animation.md)
- [telegram-my-chat-member.md](./contracts/telegram-my-chat-member.md)
- [data-model.md](./data-model.md)
- [research.md](./research.md)
