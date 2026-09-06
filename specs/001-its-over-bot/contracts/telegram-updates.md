# Contract: Telegram updates (long polling)

**API**: [getUpdates](https://core.telegram.org/bots/api#getupdates)  
**Library mapping**: grammY `bot.start()` (long polling; do not call `getUpdates` manually in app code)

## Deployment mode

- **Long polling only** for MVP.
- Do **not** call `setWebhook` as part of normal operation.
- If a webhook was previously set on the token, operator must delete it (`deleteWebhook`) before polling works — document in quickstart.

## Handled update kinds

| Update | Handler | Behavior |
|--------|---------|----------|
| `message` with bot command `/itsOver` | `handlers/its-over` | If eligible → `sendAnimation`; else silence |
| `my_chat_member` | `handlers/chat-member` | Update presence (see `telegram-my-chat-member.md`) |
| Other messages / commands | — | Ignore (silence) |

## `/itsOver` command contract

| Aspect | Rule |
|--------|------|
| Trigger | Bot command `itsOver` (Telegram command entity), case per Bot API norms |
| Authorization | Chat eligible (allowlist ∧ group/supergroup ∧ present); **any human member** |
| Admin-only? | **No** |
| Ineligible chat | No message, no error tip to the user |
| Sender is another bot | Ignore (silence) |

## Allowed updates (optional optimization)

When starting polling, may restrict:

```text
allowed_updates: ["message", "my_chat_member"]
```

Reduces noise; required for presence tracking.

## Silence rule

Outside eligibility, the bot must not send operational replies (help text, “unauthorized”, etc.). Operator logs are fine.
