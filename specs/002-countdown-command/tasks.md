# Tasks: Countdown no `/itsOver`

**Input**: Design documents from `/specs/002-countdown-command/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required by the feature request — Vitest coverage for countdown boundaries, handler behavior, GIF-path exclusivity, eligibility silence, and unchanged weekly/GIF regression behavior.

**Organization**: Delta implementation over feature 001. Tasks are grouped by user story (P1 → P2 → P3); no project scaffolding is included.

**Stack (locked)**: Node.js 22+, TypeScript ESM, grammY, Croner, Vitest

**Out of scope**: pluralization, minute/second display, catch-up, webhook, admin commands, UI, new environment variables, GIF delivery from `/itsOver`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches a different file and has no dependency on an incomplete task.
- **[Story]**: Maps the task to US1, US2, or US3 from `specs/002-countdown-command/spec.md`.
- Every implementation task uses repository-root-relative paths.
- Tasks marked **NO-OP / VERIFY UNCHANGED** must not modify the listed production files unless a regression proves the current feature 001 behavior is already broken.

## Path Conventions

- Existing single package: `src/` and `tests/` at repository root.
- Feature documentation: `specs/002-countdown-command/`.

---

## Phase 1: Setup and Baseline (Existing Project)

**Purpose**: Confirm the implemented feature 001 baseline before applying the delta; do not scaffold or install a replacement stack.

- [x] T001 Run the existing test/build baseline from `package.json` and record any pre-existing failures before changing `src/` or `tests/`
- [x] T002 [P] **NO-OP / VERIFY UNCHANGED** confirm the current responsibilities and exported schedule constants in `src/services/weekly-scheduler.ts`, `src/services/gif-sender.ts`, `src/services/eligibility.ts`, `src/storage/state-store.ts`, `src/config.ts`, and `src/handlers/chat-member.ts`

**Checkpoint**: Existing tests/build status is known and the files whose behavior must remain unchanged are identified.

---

## Phase 2: Foundational

**Purpose**: No new shared infrastructure is required. Croner, grammY, Vitest, state storage, eligibility, and schedule constants already exist from feature 001.

**Checkpoint**: Proceed directly to US1 after Phase 1; do not add dependencies, configuration, migrations, or scaffolding.

---

## Phase 3: User Story 1 — Consultar o tempo restante (Priority: P1) 🎯 MVP

**Goal**: In an eligible chat, `/itsOver` replies once with `Ei, calma.. Faltam X horas pro Gif`, where X is the ceiling of hours to the next strictly-future Sunday 18:00 `America/Sao_Paulo`, and sends no GIF.

**Independent Test**: With an injected fixed `Date`, invoke `/itsOver` in an eligible group and assert the exact text and no animation; unit fixtures must prove 2h01m → 3, less than 1h → 1, Sunday 18:00:00 → 168, and the entire 18:00 minute targets the following Sunday.

### Tests for User Story 1

> Write these tests first and confirm the new assertions fail before implementation.

- [x] T003 [P] [US1] Create table-driven countdown tests in `tests/countdown.test.ts` covering an ordinary weekday, week/month/year rollover, 2h01m → 3, less than 1h → 1, Sunday 17:59:59.999 → 1, Sunday 18:00:00.000 → 168, Sunday 18:00:59.999 → 168, Sunday 18:01 → 168, invalid `Date`, strictly-future target, and independence from the host timezone
- [x] T004 [P] [US1] Extend `tests/its-over-handler.test.ts` with an eligible-group handler fixture using injected `now: () => Date`, asserting one exact text reply `Ei, calma.. Faltam X horas pro Gif` for a deterministic X and preserving existing command parsing/bot-mention behavior

### Implementation for User Story 1

- [x] T005 [US1] Implement pure next-occurrence, `Math.ceil` hours calculation, invalid/non-future target guards, and fixed message formatting in `src/services/countdown.ts` using Croner with `WEEKLY_CRON` and `WEEKLY_TIMEZONE` from `src/services/weekly-scheduler.ts` and no fixed UTC offset
- [x] T006 [US1] Refactor `src/handlers/its-over.ts` to remove the `gif-sender` import and `gifUrl` dependency, add optional `now: () => Date`, preserve `canRunItsOver`, and reply only with the formatted countdown while logging redacted calculation/reply failures without media fallback
- [x] T007 [US1] Remove `gifUrl` from the `itsOver` dependency wiring while retaining GIF configuration exclusively in weekly scheduler wiring in `src/index.ts`
- [x] T008 [P] [US1] Change only the `/itsover` BotFather description to countdown-oriented wording while preserving command name, scopes, and allowed updates in `src/bot.ts`
- [x] T009 [US1] Run and fix the focused US1 suites in `tests/countdown.test.ts` and `tests/its-over-handler.test.ts`, then confirm the TypeScript build defined in `package.json` succeeds

**Checkpoint**: US1 MVP is independently demonstrable: eligible `/itsOver` returns the exact countdown text for all required boundaries and the command has no GIF dependency.

---

## Phase 4: User Story 2 — Preservar o envio semanal exclusivo (Priority: P2)

**Goal**: Prove the unchanged Sunday 18:00 job remains the only GIF origin, including when the command and job occur at the same instant, with no catch-up.

**Independent Test**: Scheduler/GIF regression tests still pass; an eligible `/itsOver` at Sunday 18:00 replies with 168 but never invokes `sendAnimation`; only `runWeeklySend` can reach `sendGifToChat`.

### Tests and Contract Boundary for User Story 2

- [x] T010 [US2] Add handler contract-boundary assertions in `tests/its-over-handler.test.ts` that eligible `/itsOver` at Sunday 18:00:00 replies with X = 168, never calls `ctx.api.sendAnimation`, and never falls back to animation when countdown calculation or `ctx.reply` fails
- [x] T011 [P] [US2] **NO-OP / VERIFY UNCHANGED** run `tests/weekly-scheduler.test.ts` and confirm future-only Sunday 18:00 `America/Sao_Paulo`, eligible fan-out, duplicate guard, failure isolation, and no-catch-up behavior remain green without production changes to `src/services/weekly-scheduler.ts`
- [x] T012 [P] [US2] **NO-OP / VERIFY UNCHANGED** run `tests/gif-sender.test.ts` and confirm URL/`file_id` fallback, persistence, transient retries, and absence-proof handling remain green without production changes to `src/services/gif-sender.ts`
- [x] T013 [US2] Audit and enforce the exclusive media path across `src/handlers/its-over.ts` and `src/index.ts`: `/itsOver` must contain no `gif-sender`, `gifUrl`, `sendGifToChat`, or `sendAnimation` path, while the weekly dependency assembly remains intact
- [x] T014 [US2] Run the combined boundary/regression suites in `tests/its-over-handler.test.ts`, `tests/weekly-scheduler.test.ts`, and `tests/gif-sender.test.ts` and verify behavior against `specs/002-countdown-command/contracts/weekly-gif-boundary.md`

**Checkpoint**: US1 + US2 prove that the command is text-only and the existing weekly job remains the sole GIF sender without scheduler behavior changes.

---

## Phase 5: User Story 3 — Manter privacidade e elegibilidade (Priority: P3)

**Goal**: Preserve useful silence for ineligible chats and optimistic presence for allowlisted groups/supergroups.

**Independent Test**: Handler-level tests produce no reply and no animation for non-allowlisted, private, absent, or bot-sender cases, while an allowlisted group with no presence record receives the countdown.

### Tests and Verification for User Story 3

- [x] T015 [US3] Extend handler-level cases in `tests/its-over-handler.test.ts` to assert useful silence for non-allowlisted chat, private chat, known-absent chat, bot sender, and missing context, plus a text countdown for an allowlisted group/supergroup with optimistic presence
- [x] T016 [P] [US3] **NO-OP / VERIFY UNCHANGED** run `tests/eligibility.test.ts` and `tests/presence.test.ts` and confirm no behavioral or schema changes are needed in `src/services/eligibility.ts`, `src/handlers/chat-member.ts`, `src/storage/state-store.ts`, or `src/config.ts`
- [x] T017 [US3] Run `tests/its-over-handler.test.ts`, `tests/eligibility.test.ts`, and `tests/presence.test.ts` together and verify silence/optimistic-presence behavior against `specs/002-countdown-command/contracts/telegram-countdown-command.md`

**Checkpoint**: All three user stories are independently covered and retained privacy rules remain intact.

---

## Phase 6: Polish and Cross-Cutting Validation

**Purpose**: Validate the complete delta and ensure no out-of-scope behavior or unrelated production changes were introduced.

- [x] T018 [P] Dry-run the automated and structural checks documented in `specs/002-countdown-command/quickstart.md`, including exact fixed wording, no pluralization/minutes/seconds, countdown-oriented command description, and no GIF dependency in the handler
- [x] T019 Run the full test suite and TypeScript build from `package.json`, inspect the final diff, and confirm `src/services/weekly-scheduler.ts`, `src/services/gif-sender.ts`, `src/services/eligibility.ts`, `src/storage/state-store.ts`, `src/config.ts`, and `src/handlers/chat-member.ts` are unchanged except for a separately justified pre-existing defect

---

## Dependencies and Execution Order

### Phase Dependencies

- **Phase 1 (Setup/Baseline)**: No dependencies; starts immediately.
- **Phase 2 (Foundational)**: Declarative checkpoint only; no new infrastructure tasks.
- **Phase 3 (US1)**: Starts after baseline; delivers the MVP behavior.
- **Phase 4 (US2)**: Depends on T006–T007 because exclusivity is verified after removing the command GIF path.
- **Phase 5 (US3)**: Depends on T006 because handler-level silence is tested against the refactored command.
- **Phase 6 (Polish)**: Depends on all desired user stories.

### User Story Dependencies

- **US1 (P1)**: No story dependency; implements the user-visible countdown.
- **US2 (P2)**: Depends on the US1 command refactor, but changes no weekly/GIF production behavior.
- **US3 (P3)**: Depends on the US1 handler integration, but reuses unchanged eligibility/presence behavior.

### Within Each User Story

- Write and observe failing new tests before implementing their production behavior.
- Implement `src/services/countdown.ts` before wiring it into `src/handlers/its-over.ts`.
- Refactor the handler before removing its obsolete composition dependency in `src/index.ts`.
- Complete focused story tests before full regression validation.
- A **NO-OP / VERIFY UNCHANGED** task is complete only when tests pass without modifying its protected production files.

### Parallel Opportunities

- T002 can run alongside T001.
- T003 and T004 target different test files and can run in parallel.
- T008 targets `src/bot.ts` and can run in parallel with T005 after expected wording is agreed.
- T011 and T012 are independent unchanged regression suites and can run in parallel.
- T016 can run in parallel with US2 regression work after the US1 handler refactor.
- T018 can begin after story behavior stabilizes while T019 remains the final serial gate.

---

## Parallel Example: User Story 1

```text
Task T003: Create boundary/unit tests in tests/countdown.test.ts
Task T004: Create eligible handler reply tests in tests/its-over-handler.test.ts
Task T008: Update command metadata in src/bot.ts

Then:
Task T005: Implement src/services/countdown.ts
Task T006: Refactor src/handlers/its-over.ts
Task T007: Update src/index.ts
Task T009: Run focused tests/build
```

## Parallel Example: User Story 2

```text
Task T011: Verify unchanged scheduler behavior with tests/weekly-scheduler.test.ts
Task T012: Verify unchanged GIF strategy with tests/gif-sender.test.ts

Then:
Task T013: Audit exclusive path in src/handlers/its-over.ts and src/index.ts
Task T014: Run the combined contract/regression gate
```

## Parallel Example: User Story 3

```text
Task T015: Add handler silence/optimistic-presence cases in tests/its-over-handler.test.ts
Task T016: Verify unchanged eligibility/presence suites and production files

Then:
Task T017: Run the combined US3 verification
```

---

## Implementation Strategy

### MVP First — User Story 1

1. Establish the feature 001 baseline in Phase 1.
2. Skip new infrastructure in Phase 2.
3. Write T003–T004 tests first.
4. Implement T005–T008.
5. Stop at T009 and validate US1 independently.

The MVP scope is Phase 1 through Phase 3: eligible users receive the correct text-only countdown and required boundary fixtures pass.

### Incremental Delivery

1. **US1**: Deliver countdown service and text-only handler.
2. **US2**: Prove weekly job exclusivity and unchanged GIF/no-catch-up behavior.
3. **US3**: Prove useful silence and optimistic presence.
4. **Polish**: Run complete quickstart, suite, build, and diff gates.

### Scope Guard

Do not add pluralization, minutes, seconds, catch-up, webhook, admin commands, UI, new persistence, new env values, or any GIF fallback from `/itsOver`.

## Notes

- Total tasks: 19.
- Story task counts: US1 = 7, US2 = 5, US3 = 3.
- Shared setup/validation tasks: 4.
- `[P]` marks only tasks that can safely touch different files or run independent regression suites.
- All tasks use the required checkbox, sequential ID, optional parallel marker, story label where required, and concrete file paths.
