# Tasks: Private Telegram Bot "It's Over"

**Input**: Design documents from `/specs/001-its-over-bot/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included (requested in plan + `/speckit-tasks` args) — Vitest for eligibility, presence, gif-sender, weekly-scheduler (no catch-up)

**Organization**: Phases by user story (P1 → P2 → P3) after shared setup/foundation

**Stack (locked)**: Node.js 22 + TypeScript ESM, grammY, dotenv, croner, zod, JSON `data/state.json`

**Out of scope**: webhook, UI, AI, multi-GIF, admin Telegram commands, Sunday catch-up/misfire replay

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete work)
- **[Story]**: US1 / US2 / US3 maps to spec user stories
- Paths are repo-root relative per plan.md

## Path Conventions

- Single project: `src/`, `tests/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold Node/TypeScript package and ignore secrets/runtime data

- [x] T001 Create directories `src/handlers/`, `src/services/`, `src/storage/`, `tests/`, and `data/` per `specs/001-its-over-bot/plan.md`
- [x] T002 Initialize `package.json` as ESM (`"type": "module"`) with scripts `dev`, `build`, `start`, `test` and dependencies `grammy`, `dotenv`, `croner`, `zod` plus devDependencies `typescript`, `tsx`, `vitest`, `@types/node`
- [x] T003 [P] Add `tsconfig.json` for Node 22 ESM (strict, `outDir` `dist`, `rootDir` `src`)
- [x] T004 [P] Update `.gitignore` to include `.env`, `node_modules/`, `data/`, `dist/` (keep existing entries as needed)
- [x] T005 [P] Add `.env.example` with placeholders `BOT_TOKEN`, `GIF_URL`, `ALLOWLIST_CHAT_IDS`, `STATE_PATH=data/state.json` per `specs/001-its-over-bot/contracts/env-config.md`
- [x] T006 [P] Add `vitest.config.ts` (Node environment, `tests/**/*.test.ts`)

**Checkpoint**: `npm install` succeeds; project layout matches plan

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Config, persistence, and eligibility shared by all stories — MUST finish before US1–US3

**⚠️ CRITICAL**: No user story work until this phase is complete

- [x] T007 Implement env load + zod schema in `src/config.ts` (`BOT_TOKEN`, `GIF_URL`, `ALLOWLIST_CHAT_IDS` → `number[]`, optional `STATE_PATH`; fail fast on invalid config; never log token) per `contracts/env-config.md`
- [x] T008 Implement atomic JSON read/write for `BotState` (`version`, `gifFileId`, `presence`, `lastWeeklyRunDate`) in `src/storage/state-store.ts` per `data-model.md`
- [x] T009 Implement `isEligibleChat({ chatId, chatType, allowlist, presence })` in `src/services/eligibility.ts` (allowlist ∩ `group`|`supergroup` ∩ present; missing presence record → optimistic `true`; DMs never eligible)
- [x] T010 [P] Add Vitest coverage for eligibility rules in `tests/eligibility.test.ts` (allowlisted group present; non-allowlisted; private ignored; absent blocks; optimistic default)

**Checkpoint**: Foundation ready — story implementation can begin

---

## Phase 3: User Story 1 — Envio semanal automático do GIF (Priority: P1) 🎯 MVP

**Goal**: Every Sunday 18:00 `America/Sao_Paulo`, send the configured GIF to all eligible chats while the process is running; no catch-up if the slot was missed

**Independent Test**: With mocked Bot API / clock, assert cron fires only for Sunday 18:00 America/Sao_Paulo, fans out to eligible chats, and does not replay a missed Sunday after restart

### Tests for User Story 1

> Write tests first where practical; ensure they fail before full implementation

- [x] T011 [P] [US1] Add Vitest for GIF send strategy (URL first, persist `file_id`, prefer `file_id`, invalid `file_id` → clear + URL fallback) in `tests/gif-sender.test.ts` with mocked `sendAnimation`
- [x] T012 [P] [US1] Add Vitest proving weekly scheduler has **no catch-up/misfire replay** (missed Sunday not sent on startup; only next future Sunday 18:00 America/Sao_Paulo) in `tests/weekly-scheduler.test.ts`

### Implementation for User Story 1

- [x] T013 [US1] Implement `sendGifToChat` in `src/services/gif-sender.ts` using grammY `api.sendAnimation` per `contracts/telegram-send-animation.md` (URL ↔ `file_id`, persist `gifFileId` via `state-store`; limited transient retries; do not invent media)
- [x] T014 [US1] Implement Sunday 18:00 `America/Sao_Paulo` job with `croner` in `src/services/weekly-scheduler.ts` (no misfire recovery; optional `lastWeeklyRunDate` duplicate guard only; iterate eligible allowlisted chats and call `gif-sender`; one chat failure must not cancel others)
- [x] T015 [US1] Create grammY bot factory in `src/bot.ts` (long polling only; `allowed_updates` include `message` and `my_chat_member`; no webhook setup)
- [x] T016 [US1] Wire boot in `src/index.ts`: load `config`, init `state-store`, create bot, start `weekly-scheduler`, call `bot.start()`; exit non-zero if config invalid
- [x] T017 [US1] Export a testable `runWeeklySend(deps)` helper from `src/services/weekly-scheduler.ts` (or adjacent module) so Vitest can invoke fan-out without waiting for real Sunday

**Checkpoint**: US1 MVP — weekly path works in tests; process can long-poll and schedule (manual Sunday validation optional)

---

## Phase 4: User Story 2 — Comando manual `/itsOver` (Priority: P2)

**Goal**: Any human member in an eligible group/supergroup can trigger the same GIF via `/itsOver`; silence elsewhere

**Independent Test**: Mock context — eligible chat + human → `sendAnimation`; non-allowlisted / DM / absent → no reply

### Tests for User Story 2

- [ ] T018 [P] [US2] Extend `tests/eligibility.test.ts` (or add `tests/its-over-handler.test.ts`) asserting `/itsOver` gate: human + eligible → allow; bot sender / ineligible → deny (no admin-role requirement)

### Implementation for User Story 2

- [ ] T019 [US2] Implement `/itsOver` handler in `src/handlers/its-over.ts` per `contracts/telegram-updates.md` (any human member; no admin check; ineligible → useful silence; call `gif-sender`)
- [ ] T020 [US2] Register `itsOver` command handler on the bot in `src/bot.ts` (and ensure `src/index.ts` uses the registered bot)
- [ ] T021 [US2] On startup in `src/index.ts` (or `src/bot.ts`), call `setMyCommands` with `{ command: "itsOver", description: "..." }` so Telegram clients show the command in eligible chats

**Checkpoint**: US1 + US2 — manual GIF works in allowlisted groups; silence outside

---

## Phase 5: User Story 3 — Allowlist env + presença otimista (Priority: P3)

**Goal**: Allowlist only from env; presence optimistic until `my_chat_member` leave/kick or send failure proves absence; never mutate allowlist from events

**Independent Test**: Join → present; leave/kick → absent (no env change); first deploy without join event still sends; send “bot not in chat” marks absent

### Tests for User Story 3

- [ ] T022 [P] [US3] Add Vitest for presence transitions in `tests/presence.test.ts` (optimistic default; join; leave/kicked; send_failure → absent; allowlist unchanged)

### Implementation for User Story 3

- [ ] T023 [US3] Implement `my_chat_member` handler in `src/handlers/chat-member.ts` per `contracts/telegram-my-chat-member.md` (map status → `present`; persist via `state-store`; do not edit allowlist)
- [ ] T024 [US3] Register `my_chat_member` handler in `src/bot.ts`
- [ ] T025 [US3] Update `src/services/gif-sender.ts` to mark `present=false` (reason `send_failure`) on absence-proof Bot API errors; leave presence unchanged on transient network errors
- [ ] T026 [US3] Confirm `src/config.ts` / docs: allowlist changes require env edit + process restart/reload only (no `/allow`/`/deny` handlers exist)

**Checkpoint**: All three stories independently verifiable via Vitest + quickstart manual checks

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Operator docs and repo hygiene for SC-006 (&lt; 30 min setup)

- [ ] T027 [P] Align `specs/001-its-over-bot/quickstart.md` with actual scripts (`npm run dev` / `npm start` / `npm test`), `setMyCommands`, BotFather `/setjoingroups` Disable, `deleteWebhook` note, and silence rules
- [ ] T028 [P] Add brief root `README.md` linking to `specs/001-its-over-bot/quickstart.md` and stating MVP scope / non-goals (no webhook, no admin commands, no Sunday catch-up)
- [ ] T029 Ensure logs never print `BOT_TOKEN`; redacted error logging in `src/index.ts` / handlers
- [ ] T030 Run `npm test` and a dry walkthrough of quickstart checklist (A–E) against a test bot when credentials are available

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: none
- **Phase 2 (Foundational)**: after Setup — **blocks** US1–US3
- **Phase 3 (US1)**: after Foundational — MVP weekly send
- **Phase 4 (US2)**: after Foundational; practically after T013 (`gif-sender`) and T015 (`bot.ts`) from US1
- **Phase 5 (US3)**: after Foundational; practically after `gif-sender` + `bot.ts`; enhances presence
- **Phase 6 (Polish)**: after desired stories complete

### User Story Dependencies

- **US1 (P1)**: Foundational only — delivers MVP ritual
- **US2 (P2)**: Reuses `gif-sender` + eligibility; independently testable with mocks
- **US3 (P3)**: Extends presence + send failure; independently testable with mocks

### Within Each Story

- Tests (T011/T012, T018, T022) before or alongside implementation; prefer failing first
- Services before wiring in `bot.ts` / `index.ts`
- No webhook or catch-up code in any task

### Parallel Opportunities

- T003, T004, T005, T006 after T001/T002 skeleton
- T010 after T009; T011 ∥ T012 after foundation
- T018 ∥ later US2 work if eligibility API stable
- T022 ∥ T023 once state-store API stable
- T027 ∥ T028 in polish

---

## Parallel Example: User Story 1

```bash
# After Phase 2:
Task: "T011 Vitest gif-sender strategy in tests/gif-sender.test.ts"
Task: "T012 Vitest weekly-scheduler no catch-up in tests/weekly-scheduler.test.ts"

# Then sequential implementation:
Task: "T013 gif-sender.ts"
Task: "T014 weekly-scheduler.ts"
Task: "T015 bot.ts"
Task: "T016 index.ts"
```

---

## Parallel Example: User Story 3

```bash
Task: "T022 presence tests in tests/presence.test.ts"
Task: "T023 chat-member.ts"   # after T008 state-store
# Then:
Task: "T024 register handler in bot.ts"
Task: "T025 gif-sender absence marking"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup  
2. Phase 2 Foundational  
3. Phase 3 US1 (gif-sender + weekly-scheduler + boot)  
4. **STOP**: validate `tests/gif-sender.test.ts` + `tests/weekly-scheduler.test.ts`  
5. Optionally demo with a real token on next Sunday or via `runWeeklySend` helper  

### Incremental Delivery

1. Setup + Foundational → config/state/eligibility ready  
2. US1 → weekly GIF MVP  
3. US2 → `/itsOver` for friends  
4. US3 → presence accuracy  
5. Polish → quickstart / README / SC-006  

### Suggested MVP Scope

**Phases 1–3 only** (through US1). US2/US3 are small follow-ons but not required to prove the Sunday ritual.

---

## Notes

- [P] = different files, safe parallel
- [USn] required on story-phase tasks only
- Every task includes concrete path(s)
- Do not add: webhook server, admin commands, multi-GIF, UI, Sunday catch-up
- Format validation: all tasks use `- [ ] Tnnn ...` with paths
