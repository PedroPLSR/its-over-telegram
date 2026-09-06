# Data Model: 001-its-over-bot

**Date**: 2026-09-06  
**Spec**: [spec.md](./spec.md)

## Overview

Two sources of truth:

1. **Environment (config)** — allowlist, token, GIF URL (not persisted in app state).
2. **Runtime state file** — presence flags and GIF `file_id`.

```text
Env allowlist ──┐
                ├──► Eligibility ──► sendAnimation
State presence ─┘         ▲
                          │
              my_chat_member / send failure
```

---

## Entities

### 1. EnvConfig (not stored in state file)

| Field | Type | Rules |
|-------|------|-------|
| `botToken` | string | Non-empty; from `BOT_TOKEN` |
| `gifUrl` | string (URL) | Absolute `http:` or `https:` from `GIF_URL` |
| `allowlistChatIds` | `number[]` | Parsed from `ALLOWLIST_CHAT_IDS` (comma-separated integers); duplicates ignored |
| `statePath` | string | Default `data/state.json` |

**Validation**: Process must refuse to start if token or GIF URL missing/invalid. Empty allowlist → start allowed but no sends (operator misconfig).

---

### 2. BotState (persisted JSON)

```json
{
  "version": 1,
  "gifFileId": null,
  "presence": {},
  "lastWeeklyRunDate": null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `version` | `1` | Schema version for future migrations |
| `gifFileId` | `string \| null` | Telegram `file_id` after first successful animation send |
| `presence` | `Record<string, PresenceRecord>` | Keys are chat ID strings |
| `lastWeeklyRunDate` | `string \| null` | `YYYY-MM-DD` in `America/Sao_Paulo` of last successful weekly trigger attempt (duplicate guard only; **not** used for catch-up) |

### PresenceRecord

| Field | Type | Description |
|-------|------|-------------|
| `present` | boolean | Whether bot is considered in the chat |
| `updatedAt` | string (ISO-8601) | Last transition time |
| `reason` | `optimistic \| join \| leave \| send_failure` | Optional audit hint |

---

### 3. AuthorizedChat (derived, not stored)

Logical view for eligibility:

| Attribute | Source |
|-----------|--------|
| `chatId` | Env allowlist entry |
| `chatType` | Live update / known type; must be `group` or `supergroup` |
| `present` | `presence[chatId].present` if key exists; else **`true`** (optimistic) |

**Eligible** ⇔ in allowlist ∧ type ∈ {group, supergroup} ∧ present.

---

### 4. GifAsset (logical)

| Attribute | Source |
|-----------|--------|
| `url` | `GIF_URL` env (always available) |
| `fileId` | `BotState.gifFileId` after first success |

Send prefers `fileId` when set; falls back to `url`.

---

## Relationships

- One **EnvConfig** per process.
- One **BotState** file per deployment.
- Many **PresenceRecord** entries (0–N), keyed by chat ID; subset of or related to allowlist (entries for non-allowlisted chats may exist but are ignored for send).
- Allowlist changes require env edit + restart/reload; state file does **not** auto-prune allowlist.

---

## State transitions — Presence

```text
                    [no record]
                         │
                         ▼
              present=true (optimistic)
                    │         ▲
         leave /    │         │ join / re-add
      send_failure  │         │
                    ▼         │
              present=false ──┘
```

| Event | Transition |
|-------|------------|
| First deploy / allowlisted ID never seen | Treat as `present=true` (may write optimistic record lazily) |
| `my_chat_member` → bot status member/administrator | `present=true`, reason `join` |
| `my_chat_member` → left/kicked | `present=false`, reason `leave` |
| `sendAnimation` fails with “bot not in chat” / chat not found / forbidden | `present=false`, reason `send_failure` |
| Transient network error | No presence change; limited retry within weekly window only |

Allowlist env is **never** mutated by these events.

---

## State transitions — GifAsset

```text
gifFileId=null ──send via URL success──► gifFileId=<id>
       ▲                                      │
       └──── send via file_id invalid ────────┘
                    (clear & retry URL)
```

---

## Validation rules (runtime)

1. Never send to chat ID not in allowlist.
2. Never treat `private` / `channel` as eligible.
3. Never invent GIF content if URL and file_id both fail.
4. Atomic state writes (write temp + rename) to avoid truncated JSON on crash.
5. Do not log `BOT_TOKEN` or full `.env` contents.

---

## Volume assumptions

- Allowlist size: O(1)–O(10)
- State file: &lt; 50 KB typical
- Single writer process
