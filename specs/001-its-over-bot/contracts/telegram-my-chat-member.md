# Contract: Telegram `my_chat_member`

**API**: Update field [`my_chat_member`](https://core.telegram.org/bots/api#chatmemberupdated) (`ChatMemberUpdated`)  
**Library mapping**: grammY `bot.on("my_chat_member", ...)`

## Purpose

Track whether the bot is still a member of a chat so weekly `/itsOver` sends only target chats where the bot is present. Does **not** mutate the env allowlist.

## Input fields used

| Field | Use |
|-------|-----|
| `chat.id` | Presence map key |
| `chat.type` | Informational; eligibility still requires group/supergroup at send time |
| `new_chat_member.status` | Derive present vs absent |
| `old_chat_member.status` | Optional logging |

## Status → presence mapping

| `new_chat_member.status` | `present` |
|--------------------------|-----------|
| `member`, `administrator` | `true` (reason `join`) |
| `restricted` (if bot can still post) | Treat as `true` unless send later fails |
| `left`, `kicked` | `false` (reason `leave`) |

## Interactions with optimistic presence

- If no `my_chat_member` has been seen for an allowlisted group, presence defaults to **present** (first deploy already in group).
- A later `left`/`kicked` overrides optimism.
- Re-add (`member`/`administrator`) sets present again without editing allowlist.

## Non-goals

- Auto-adding chat IDs to allowlist on join.
- Auto-removing chat IDs from allowlist on leave.
- Handling `chat_member` for other users (only `my_chat_member`).
