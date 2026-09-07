# Contract: Weekly GIF exclusive origin

**Feature**: 002-countdown-command  
**Baseline retained**: [001 sendAnimation contract](../../001-its-over-bot/contracts/telegram-send-animation.md)

## Ownership rule

The automatic weekly job is the only application path allowed to initiate GIF delivery.

```text
weekly scheduler ──► gif-sender ──► Telegram sendAnimation

/itsOver handler ──► countdown text reply
```

## Weekly trigger

| Aspect | Retained rule |
|--------|---------------|
| Schedule | Sunday 18:00 |
| Timezone | `America/Sao_Paulo` |
| Eligibility | allowlist ∩ group/supergroup ∩ present |
| Media | Existing configured GIF sent as Telegram animation |
| Offline at trigger | Miss the cycle; no catch-up |
| Duplicate protection | Existing same-local-date guard |
| Failure isolation | Failure in one chat does not prevent attempts for others |

## Media behavior retained from feature 001

- Prefer persisted Telegram `file_id` when available.
- Fall back to configured `GIF_URL` when no valid `file_id` exists.
- Persist a valid `file_id` returned by a successful animation send.
- Mark presence absent only when an animation failure proves the bot is no longer in the target chat.
- Apply existing limited transient retry behavior.

## Simultaneous command and job

If `/itsOver` is processed while the weekly job fires:

1. The weekly job may send one GIF according to its existing fan-out behavior.
2. The command independently sends one countdown text targeting the next strictly-future weekly occurrence.
3. The command does not suppress, duplicate, or initiate the weekly GIF.
4. At Sunday 18:00:00 under the current timezone rules, the command displays 168 while the job remains responsible for that instant’s GIF.

## Configuration and state

No changes are made to:

- environment variables;
- allowlist parsing;
- BotState schema;
- presence tracking;
- GIF URL or `file_id` storage;
- scheduler startup and no-catch-up behavior.
