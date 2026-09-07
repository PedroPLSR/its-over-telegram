# Implementation Plan: Countdown no /itsOver

**Branch**: `feat/ansioso_pelo_domingo` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-countdown-command/spec.md`

**Note**: Delta plan over the implemented [feature 001 plan](../001-its-over-bot/plan.md); this is not a greenfield redesign.

## Summary

Change `/itsOver` from an on-demand GIF trigger to an eligible-chat countdown reply with exact text `Ei, calma.. Faltam X horas pro Gif`. X is the ceiling of elapsed hours to the next strictly-future Sunday 18:00 in `America/Sao_Paulo`. The existing weekly scheduler remains the only GIF origin, with unchanged eligibility, media persistence/retry, duplicate guard, and no-catch-up behavior.

**Approach**: Add a pure, clock-injected countdown service that reuses Croner and the existing weekly schedule constants. Remove all GIF dependencies from the command handler, reply with text after the existing gate, update command metadata, and add focused countdown/handler tests while retaining scheduler/GIF regression tests.

## Technical Context

**Language/Version**: TypeScript 5.8 on Node.js 22+ (ESM, ES2022 compilation target)

**Primary Dependencies**: Existing grammY 1.x for Telegram updates/replies; existing Croner 9.x for named-timezone next-occurrence calculation; zod/dotenv configuration unchanged

**Storage**: Existing local JSON state only; no schema change, migration, or new persisted countdown data

**Testing**: Vitest 3.x; pure table-driven countdown tests, handler behavior tests with injected clock/mocked Telegram update, and existing weekly/GIF regression suite

**Target Platform**: Existing always-on Node process; deployment environment timezone is irrelevant because the schedule uses `America/Sao_Paulo`

**Project Type**: Existing single long-running Telegram bot service

**Performance Goals**: Eligible countdown response visible within 5 seconds in at least 95% of normal invocations; calculation is constant-time and local; weekly eligible-chat fan-out remains within 2 minutes

**Constraints**: Exact fixed message; ceiling to a strictly-future occurrence; no fixed UTC offset; command never sends animation; ineligible chats remain silent; no catch-up; no new env/config; secrets remain environment-only

**Scale/Scope**: Existing friends-group deployment (~1–10 allowlisted chats), one command behavior delta, one new pure service, no new infrastructure

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

The project constitution remains an unratified placeholder, so enforceable gates are derived from the feature 002 specification and retained feature 001 constraints.

| Gate | Pre-Research | Post-Design | Evidence |
|------|--------------|-------------|----------|
| `/itsOver` produces text only and has no animation path | PASS | PASS | Handler drops `gifUrl`/`gif-sender`; command contract prohibits `sendAnimation` |
| Weekly job remains the sole GIF origin | PASS | PASS | Existing scheduler/GIF service retained; exclusive-origin contract documents composition boundary |
| Next target is strictly future Sunday 18:00 in named timezone | PASS | PASS | Croner recurrence uses shared expression/timezone; no fixed UTC offset |
| X uses ceiling and is never zero before target | PASS | PASS | Pure duration formula and boundary test matrix |
| Eligibility remains allowlist ∩ group/supergroup ∩ present | PASS | PASS | Existing `isEligibleChat` and `canRunItsOver` retained |
| Ineligible chats preserve useful silence | PASS | PASS | Eligibility check occurs before calculation/reply |
| Optimistic presence remains unchanged | PASS | PASS | No changes to eligibility, membership handler, or persisted state |
| No catch-up after missed Sunday | PASS | PASS | Scheduler startup and duplicate guard unchanged |
| Secrets/config remain environment-only | PASS | PASS | No new config; existing env contract remains authoritative |
| No new UI, admin command, webhook, pluralization, or minute/second display | PASS | PASS | Design artifacts keep these out of scope |

**Gate result**: PASS before research and after design. No violations require justification.

## Phase 0: Research Outcome

Research is consolidated in [research.md](./research.md).

Key decisions:

1. Reuse installed Croner for next occurrence; native Temporal is unavailable by default on Node 22, and raw `Intl` would require custom inverse timezone conversion.
2. Inject a `Date` reference into pure countdown functions and the handler clock.
3. Compute actual elapsed hours and apply `Math.ceil`; 168 is asserted for fixed 2026 boundary fixtures rather than hardcoded.
4. Remove GIF dependencies from the command path instead of leaving dormant media plumbing.
5. Keep scheduler, GIF sender, persistence, eligibility, and environment behavior unchanged.

No `NEEDS CLARIFICATION` items remain.

## Phase 1: Design

### Countdown service

Create `src/services/countdown.ts`:

- validate the supplied reference `Date`;
- create/use a non-running Croner recurrence with `WEEKLY_CRON` and `WEEKLY_TIMEZONE`;
- obtain the strictly-future target with `nextRun(reference)`;
- validate a positive duration;
- return ceiling hours;
- format the fixed reply string.

The public calculation accepts an explicit `Date`; no direct clock read occurs inside the calculation. Runtime clock injection lives in handler dependencies.

### `/itsOver` handler delta

Update `src/handlers/its-over.ts`:

- retain command parsing, addressed-bot handling, human-sender gate, state read, and `canRunItsOver`;
- remove `sendGifToChat`, `gifUrl`, and animation calls;
- add optional `now: () => Date`, defaulting to the system clock;
- after eligibility succeeds, calculate X once and call the normal text reply once;
- redact/log calculation or reply errors and stop without media fallback.

### Composition and metadata

Update `src/index.ts` to stop passing `gifUrl` into `itsOver` dependencies. Continue passing GIF sender dependencies only to `WeeklySchedulerDeps`.

Update `src/bot.ts` command description to countdown-oriented wording. Command name, scopes, long polling, and allowed updates do not change.

### Test delta

Add `tests/countdown.test.ts` for deterministic recurrence and ceiling boundaries. Extend `tests/its-over-handler.test.ts` beyond its current pure gate tests to prove exact eligible reply and ineligible silence with an injected clock. Keep all existing `weekly-scheduler.test.ts` and `gif-sender.test.ts` cases green as regression proof that weekly delivery is unchanged.

### Data and contracts

- [data-model.md](./data-model.md): transient `WeeklyOccurrence` and `Countdown`; no persisted delta.
- [telegram-countdown-command.md](./contracts/telegram-countdown-command.md): exact trigger, message, rounding, silence, and prohibited media behavior.
- [weekly-gif-boundary.md](./contracts/weekly-gif-boundary.md): weekly scheduler as exclusive GIF origin and retained feature 001 behavior.
- [quickstart.md](./quickstart.md): delta-only automated/manual validation.

## Project Structure

### Documentation (this feature)

```text
specs/002-countdown-command/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
├── contracts/
│   ├── telegram-countdown-command.md
│   └── weekly-gif-boundary.md
└── tasks.md                         # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── index.ts                         # Remove gifUrl from command composition
├── bot.ts                           # Update /itsover menu description
├── handlers/
│   └── its-over.ts                  # Replace GIF send with countdown text reply
└── services/
    ├── countdown.ts                 # New pure recurrence/hours/message logic
    ├── eligibility.ts               # Unchanged
    ├── gif-sender.ts                # Unchanged; weekly path only
    └── weekly-scheduler.ts           # Behavior unchanged; schedule constants reused

tests/
├── countdown.test.ts                # New time/rounding boundary coverage
├── its-over-handler.test.ts         # Update gate + text-only handler coverage
├── weekly-scheduler.test.ts          # Unchanged regression coverage
├── gif-sender.test.ts                # Unchanged regression coverage
├── eligibility.test.ts               # Unchanged
└── presence.test.ts                  # Unchanged
```

**Structure Decision**: Preserve the existing single-package service layout. Time-domain logic belongs beside scheduler/eligibility services; Telegram command orchestration remains in the handler. No new layer, storage adapter, or package is introduced.

## What Does Not Change from Feature 001

- Node/TypeScript/grammY/Croner stack and long-polling lifecycle.
- Sunday 18:00 `America/Sao_Paulo` job expression and startup behavior.
- `runWeeklySend`, eligible-chat fan-out, failure isolation, and duplicate guard.
- GIF URL/`file_id` send strategy and persistence.
- Environment names, parsing, allowlist source, and secret handling.
- Group/supergroup-only rule, useful silence, and optimistic presence.
- Membership updates, absence-proof send handling, and state schema.
- No catch-up, webhook, admin commands, UI, or extra content.

## Complexity Tracking

No constitution or feature-gate violations. No complexity exceptions are required.
