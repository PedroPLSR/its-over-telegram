# Implementation Plan: Private Telegram Bot "It's Over"

**Branch**: `001-its-over-bot` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-its-over-bot/spec.md` (clarified session 2026-09-06)

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Private Telegram bot that sends a single configured GIF (animation) to allowlisted **group/supergroup** chats every Sunday at 18:00 `America/Sao_Paulo`, and on `/itsOver` from any human member in an eligible chat. Allowlist, `BOT_TOKEN`, and `GIF_URL` come only from environment. Runtime persists optimistic presence flags and the Telegram `file_id` after the first successful send. Long polling only; no webhook, admin commands, UI, or Sunday catch-up.

**Approach**: Node.js + TypeScript + grammY, JSON state file, in-process timezone cron (`croner`) with no misfire recovery.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS (ESM)

**Primary Dependencies**: grammY (Bot API + long polling), dotenv (local `.env`), croner (timezone cron), zod (env validation)

**Storage**: Local JSON file (e.g. `data/state.json`) for presence map + `gifFileId`; allowlist not stored (env only)

**Testing**: Vitest — unit tests for eligibility, presence transitions, GIF send strategy (URL → file_id → fallback); light integration tests with mocked Bot API

**Target Platform**: Always-on Node process (VPS, local machine, or cheap PaaS with persistent disk); Linux preferred for hosting

**Project Type**: Single long-running bot service (CLI entrypoint)

**Performance Goals**: `/itsOver` GIF delivery under 5s under normal network (SC-002); weekly fan-out to a handful of chats within 2 minutes of 18:00 (SC-001)

**Constraints**: Bot API free tier; long polling (no public HTTPS required); secrets never committed; silence outside eligibility; no Sunday catch-up; groups/supergroups only

**Scale/Scope**: ~1–10 allowlisted chats; one GIF; one command; friends-group MVP

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Project constitution is still a placeholder template (no ratified principles). Gates derived from **spec + clarifications**:

| Gate | Status | Notes |
|------|--------|-------|
| Allowlist only via env/config; no Telegram admin commands | PASS | Design uses `ALLOWLIST_CHAT_IDS` env |
| No catch-up if offline at Sunday 18:00 | PASS | Scheduler must not replay missed runs |
| `/itsOver` any human member in eligible chat | PASS | No admin-role check |
| Eligible types: group/supergroup only | PASS | Filter chat type; ignore DM IDs |
| Optimistic presence until leave / send failure | PASS | Default present for allowlisted IDs |
| Secrets via env; `.env` not versioned | PASS | Documented in quickstart + `.gitignore` |
| No webhook / UI / AI / multi-GIF / admin panel | PASS | Explicitly out of structure |
| Persist presence + `file_id` across restarts | PASS | JSON state file |

**Post-Phase 1 re-check**: All gates still PASS; contracts and data model align with gates (see `research.md`, `data-model.md`, `contracts/`).

## Project Structure

### Documentation (this feature)

```text
specs/001-its-over-bot/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── env-config.md
│   ├── telegram-send-animation.md
│   ├── telegram-updates.md
│   └── telegram-my-chat-member.md
└── tasks.md             # Created by /speckit-tasks (not this command)
```

### Source Code (repository root)

```text
├── package.json
├── tsconfig.json
├── .env.example                 # No secrets; placeholders only
├── .gitignore                   # Must include .env, node_modules, data/
├── src/
│   ├── index.ts                 # Boot: load env, start bot + scheduler
│   ├── config.ts                # Parse/validate BOT_TOKEN, GIF_URL, ALLOWLIST_CHAT_IDS, STATE_PATH
│   ├── bot.ts                   # grammY bot, handlers registration
│   ├── handlers/
│   │   ├── its-over.ts          # /itsOver command
│   │   └── chat-member.ts       # my_chat_member presence updates
│   ├── services/
│   │   ├── eligibility.ts       # allowlist ∩ group/supergroup ∩ present
│   │   ├── gif-sender.ts        # sendAnimation URL/file_id + persist file_id
│   │   └── weekly-scheduler.ts  # Sunday 18:00 America/Sao_Paulo, no catch-up
│   └── storage/
│       └── state-store.ts       # Read/write JSON state
├── data/                        # Runtime only (gitignored)
│   └── state.json
└── tests/
    ├── eligibility.test.ts
    ├── gif-sender.test.ts
    ├── presence.test.ts
    └── weekly-scheduler.test.ts
```

**Structure Decision**: Single Node/TypeScript package at repo root. Small service modules mirror domains (eligibility, GIF send, presence, schedule). No frontend, no separate API server.

## Complexity Tracking

> No constitution violations. Table intentionally empty.
