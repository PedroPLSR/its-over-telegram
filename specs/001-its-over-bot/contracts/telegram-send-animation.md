# Contract: Telegram `sendAnimation`

**API**: [sendAnimation](https://core.telegram.org/bots/api#sendanimation)  
**Library mapping**: grammY `api.sendAnimation(chatId, animation)` / `ctx.replyWithAnimation(animation)`

## Purpose

Deliver the single MVP GIF to an eligible chat (weekly job or `/itsOver`).

## Request (logical)

| Field | Value |
|-------|--------|
| `chat_id` | Eligible group/supergroup numeric ID |
| `animation` | Prefer stored `file_id` string; else `GIF_URL` string |

Optional Bot API fields (caption, etc.) are **out of scope** for MVP (send animation only).

## Success response (used fields)

From returned `Message`:

| Path | Use |
|------|-----|
| `animation.file_id` | Persist as `BotState.gifFileId` when present |
| Fallback | If `animation` missing but media exists, do not invent; keep previous `gifFileId` or null |

## Client strategy (normative for this project)

```text
IF gifFileId IS NOT NULL:
  TRY sendAnimation(chat_id, gifFileId)
  ON invalid-file error → clear gifFileId, CONTINUE with URL
ELSE:
  sendAnimation(chat_id, GIF_URL)
ON success → persist animation.file_id
ON absence-proof error → mark presence.present = false for chat_id
ON transient error → retry limited times (weekly window only); do not mark absent
```

## Errors of interest

| Condition | App behavior |
|-----------|--------------|
| Bot not in chat / forbidden / chat not found | Mark absent; no user-facing reply |
| Bad URL / Telegram cannot fetch | Log; no alternate media |
| Invalid `file_id` | Clear and retry once with URL |

## Non-goals

- Uploading local multipart files in MVP (URL + file_id only).
- Random multi-GIF selection.
