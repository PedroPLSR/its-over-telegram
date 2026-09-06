# Research: 001-its-over-bot

**Date**: 2026-09-06  
**Goal**: Resolve stack, storage, scheduler, and Telegram animation/`file_id` choices for the MVP.

## 1. Bot framework & language

### Decision

**Node.js 22 + TypeScript + grammY**, long polling via `bot.start()`.

### Rationale

- grammY defaults to long polling — matches FR-012 (no webhook required) and SC-006 (simple host).
- Strong TypeScript types for `Update`, `ChatMemberUpdated`, and `sendAnimation`.
- Small dependency surface; sequential update processing is fine for a friends-group bot.
- Fits operator preference: “Node (TypeScript) + grammy OR Python + python-telegram-bot”.

### Alternatives considered

| Option | Why not for MVP |
|--------|-----------------|
| Python + python-telegram-bot (v21+) | Equally valid; rejected to standardize on one stack. PTB is excellent; choice is team familiarity / TS typing, not capability. |
| Telegraf (Node) | Mature but heavier middleware style; grammY is leaner for greenfield TS. |
| Raw `fetch` to Bot API | Too much boilerplate for handlers/`my_chat_member`/errors. |

---

## 2. Persistence

### Decision

**Single local JSON file** (default `data/state.json`) storing:

- `gifFileId: string | null`
- `presence: Record<chatId, { present: boolean, updatedAt: string }>`

Allowlist is **never** persisted — always from `ALLOWLIST_CHAT_IDS` env.

### Rationale

- Spec needs only two durable facts (FR-013); JSON is enough for &lt;10 chats.
- No DB process to host; restart-safe with atomic write (temp file + rename).
- Aligns with “persistência mínima local (JSON ou SQLite)”.

### Alternatives considered

| Option | Why not |
|--------|---------|
| SQLite | Better for concurrent writers; unnecessary complexity for one process. |
| Redis / cloud DB | Cost and ops overhead vs friends MVP. |
| Persist allowlist in file | Contradicts clarification: env/config only. |

---

## 3. Weekly scheduler

### Decision

**In-process cron with `croner`**: expression equivalent to “Sunday 18:00” with `timezone: "America/Sao_Paulo"`.

- **No misfire / catch-up**: do not configure or implement “run missed jobs on startup”.
- On process start mid-week or after a missed Sunday: schedule only the **next** future fire.
- Optional guard: persist `lastWeeklyRunDate` (YYYY-MM-DD in Sao_Paulo) to skip duplicate fires if the process somehow double-triggers the same Sunday (not used to catch up missed Sundays).

### Rationale

- Spec FR-001 / FR-014 / clarification B: offline at 18:00 → skip week.
- IANA timezone name matches acceptance criteria (no manual UTC offset).
- Same process as the bot → zero extra services.

### Alternatives considered

| Option | Why not |
|--------|---------|
| `node-cron` | Works; weaker first-class timezone DX than croner for named zones. |
| OS crontab | Couples deploy to OS; harder to keep “no catch-up” consistent across hosts. |
| External scheduler (GitHub Actions, etc.) | Needs network wake + token on CI; overkill and flaky for private bot. |
| Libraries that replay missed jobs | Would violate no-catch-up. |

---

## 4. sendAnimation + `file_id`

### Decision

GIF send strategy in `gif-sender`:

1. If `gifFileId` in state → `sendAnimation(chatId, fileId)`.
2. On failure that indicates invalid file → clear `gifFileId`, fall through to URL.
3. Else / first send → `sendAnimation(chatId, GIF_URL)` (public HTTP URL string).
4. On success → read `message.animation.file_id` (or document fallback if Telegram classifies oddly) and persist.

Weekly job and `/itsOver` share this service.

### Rationale

- Telegram Bot API: animation may be `file_id`, HTTP URL, or upload ([sendAnimation](https://core.telegram.org/bots/api#sendanimation)).
- grammY exposes `api.sendAnimation` / `replyWithAnimation`; long polling via `bot.start()` ([deployment types](https://grammy.dev/guide/deployment-types)).
- Reusing `file_id` satisfies FR-005 / SC-004 and avoids re-fetching the URL every week.

### Alternatives considered

| Option | Why not |
|--------|---------|
| Always URL | Simpler but slower/fragile if URL host flakes; fails SC-004 spirit. |
| Always upload local file | Needs packing a binary; URL is operator-configurable as specified. |
| `sendDocument` for GIF | Works sometimes; animation is the correct method for GIF/MPEG4 without sound. |

---

## 5. Eligibility & presence

### Decision

Chat is eligible iff:

1. `chat.id` ∈ parsed `ALLOWLIST_CHAT_IDS`
2. `chat.type` ∈ `{ group, supergroup }` (DM / channel ignored even if ID listed)
3. Presence is present: default **true** for allowlisted IDs with no leave recorded; set **false** on leave-like `my_chat_member` or on send errors proving absence (e.g. bot kicked / chat not found)

`/itsOver`: any human sender in eligible chat — no admin check; bots/senders that are not users may be ignored silently.

Non-eligible: **no reply** (useful silence).

### Rationale

Matches clarifications A–E and FR-002 / FR-003 / FR-015.

---

## 6. Config & secrets

### Decision

Required env:

- `BOT_TOKEN`
- `GIF_URL` (public HTTP/HTTPS URL)
- `ALLOWLIST_CHAT_IDS` (comma-separated Telegram chat IDs, typically negative for groups)

Optional:

- `STATE_PATH` (default `data/state.json`)
- `TZ` not required if croner uses explicit timezone option

Load via `dotenv` in development; production injects env. `.env` gitignored; ship `.env.example`.

### Rationale

FR-006, FR-009, clarification allowlist-via-env.

---

## 7. Testing approach

### Decision

Vitest unit tests for pure logic (eligibility, presence transitions, send strategy branching, “no catch-up” scheduler helpers). Mock `api.sendAnimation`. No live Telegram in CI.

### Rationale

Fast feedback without leaking tokens; SC-003/004 can be asserted with mocks.

---

## Resolved NEEDS CLARIFICATION

None remain for Technical Context — all items decided above.
