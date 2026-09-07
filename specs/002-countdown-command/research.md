# Research: 002-countdown-command

**Date**: 2026-09-07  
**Goal**: Define a timezone-safe, testable countdown and the smallest integration delta for the existing bot.

## 1. Next weekly occurrence

### Decision

Reuse the installed `croner` recurrence engine to obtain the next run of `0 18 * * 0` in `America/Sao_Paulo` from an injected `Date`.

The countdown service will:

1. Accept a reference instant (`Date`) supplied by the caller.
2. Ask a non-running Croner schedule for the next occurrence after that instant.
3. Assert that the returned target exists and is strictly later than the reference.
4. Return `Math.ceil((targetMs - nowMs) / 3_600_000)`.

The weekly cron expression and timezone exported by `weekly-scheduler.ts` remain the shared source of truth. The countdown must not copy a UTC offset or maintain a second schedule definition.

### Rationale

- Croner is already a production dependency and already defines the weekly schedule.
- Its timezone option uses the named IANA timezone and its `nextRun(reference)` result is strictly future at the boundary.
- This avoids custom civil-time-to-instant conversion and avoids adding a dependency.
- Supplying the reference instant explicitly makes the calculation deterministic in unit tests.

Verified boundary behavior for the current timezone rules:

- Sunday 17:59:59.999 → 1 hour after ceiling.
- Sunday 18:00:00.000 → the following Sunday → 168 hours.
- Sunday 18:00:59.999 → the following Sunday → 168 hours after ceiling.
- 2 hours and 1 minute remaining → 3 hours.

### Alternatives considered

- **Native `Intl` only**: retained for formatting/inspection where useful, but not selected for recurrence calculation. `Intl.DateTimeFormat` exposes zoned civil parts yet does not directly convert a future zoned civil date-time back to an instant; implementing that inverse safely would duplicate timezone logic.
- **Native `Temporal`**: not available by default in the Node 22 target and is outside the current ES2022 TypeScript library configuration.
- **`@js-temporal/polyfill`**: clear timezone model and a good future choice if the product gains more calendrical behavior, but unnecessary dependency weight for one weekly recurrence already represented by Croner.
- **Fixed UTC-3 arithmetic**: rejected because it violates the named-timezone requirement and would ignore future civil rule changes.

## 2. Meaning of “168 hours” at the exact boundary

### Decision

Compute actual elapsed hours to the next zoned occurrence; do not hardcode 168.

For the 2026 acceptance fixtures and current `America/Sao_Paulo` rules, exactly Sunday 18:00 yields 168. If civil timezone rules change between two Sundays, the elapsed duration may correctly become 167 or 169 hours while both occurrences remain Sunday 18:00 local time.

### Rationale

This resolves the apparent tension between a sample boundary value and the requirement to respect the named timezone. Tests will assert 168 against fixed 2026 dates and separately prove that the target is derived from the IANA timezone.

### Alternatives considered

- **Always return 168 at Sunday 18:00**: rejected because it would make the displayed elapsed duration incorrect across a future offset transition.

## 3. Countdown service boundary

### Decision

Add `src/services/countdown.ts` with pure functions for:

- obtaining the strictly future weekly target from a supplied `Date`;
- calculating the ceiling of remaining hours;
- formatting the exact message `Ei, calma.. Faltam X horas pro Gif`.

Invalid reference dates or an absent/non-future next occurrence are programmer/runtime errors. They are logged by the handler; they must not trigger GIF fallback.

### Rationale

Separating time calculation and message formatting from grammY context makes boundary tests fast and deterministic. It also keeps the handler focused on command matching, eligibility, and reply behavior.

### Alternatives considered

- **Inline calculation in `its-over.ts`**: less code initially, but makes timezone boundaries and clock control harder to test.
- **Persist next run/countdown**: rejected; X is derived from the command instant and requires no new state.

## 4. Handler integration

### Decision

Keep `canRunItsOver` and the existing eligibility read unchanged. Replace the eligible branch’s `sendGifToChat` call with a text reply built from the injected clock.

`ItsOverHandlerDeps` changes:

- Keep `allowlist` and `stateStore`.
- Remove `gifUrl`.
- Add optional `now: () => Date` for deterministic tests, defaulting to `() => new Date()`.

The handler must not import `gif-sender`, call `sendAnimation`, or fall back to media if calculation/reply fails. Ineligible chats and bot senders remain silent.

### Rationale

This is the smallest delta to the existing architecture and gives a structural guarantee that `/itsOver` cannot send the GIF.

### Alternatives considered

- **Keep GIF dependencies but leave them unused**: rejected because stale dependencies obscure the exclusive-origin rule.
- **Move eligibility into the countdown service**: rejected because `eligibility.ts` already owns that policy and is shared with the weekly job.

## 5. Weekly GIF boundary

### Decision

Leave `runWeeklySend`, scheduler timing, duplicate guard, GIF send strategy, allowlist, presence, and no-catch-up behavior unchanged.

`src/index.ts` remains the only composition point that gives `sendGifToChat` to the weekly scheduler. The `/itsOver` composition no longer receives `gifUrl` or any animation sender.

### Rationale

The current scheduler already satisfies the retained requirements. Removing the command-side path makes the weekly job the only origin of GIF sends without risking unrelated scheduler behavior.

## 6. Command metadata

### Decision

Update the BotFather command description from the stale “Send the It's Over GIF” wording to a countdown-oriented description. Command name and scopes remain unchanged.

### Rationale

The menu should not promise behavior the command no longer performs. This is metadata only and does not alter eligibility; DMs still receive useful silence.

## 7. Test strategy

### Decision

Add `tests/countdown.test.ts` and extend `tests/its-over-handler.test.ts`.

Countdown tests cover:

- ordinary weekday and week rollover;
- 2 hours 1 minute → 3;
- less than one hour → 1;
- Sunday 17:59:59.999, 18:00:00.000, 18:00:59.999, and 18:01;
- month/year rollover;
- invalid `Date`;
- target instant in `America/Sao_Paulo`, independent of host timezone.

Handler tests retain eligibility coverage and add behavior assertions:

- eligible command replies once with exact text;
- injected clock controls X;
- no animation method is called or available through handler dependencies;
- ineligible command remains silent;
- reply/calculation failure does not trigger GIF.

Existing weekly scheduler and GIF sender tests remain as regression coverage for the only media path.

## Resolved NEEDS CLARIFICATION

None remain. The design uses current dependencies and preserves the existing architecture.
