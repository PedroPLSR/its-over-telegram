# Quickstart Delta: Validate `/itsOver` Countdown

**Feature**: 002-countdown-command  
**Baseline setup**: [001 quickstart](../001-its-over-bot/quickstart.md)

## Purpose

Validate the behavioral delta: `/itsOver` replies with hours remaining, while the unchanged weekly job is the only GIF origin.

All installation, BotFather, environment, allowlist, long-polling, persistence, and hosting steps remain as documented for feature 001.

## Prerequisites

- Node.js 22+
- Existing dependencies installed with `npm install`
- A valid local `.env` configured as in feature 001
- Bot added to an allowlisted group or supergroup

No new environment variable, state migration, or external service is required.

## Automated validation

From the repository root:

```powershell
npm test
npm run build
```

Expected:

- countdown unit tests pass for normal and boundary instants;
- handler tests prove eligible text reply and ineligible silence;
- GIF sender and weekly scheduler regression tests remain green;
- TypeScript build completes without errors.

## Manual validation

Start the bot:

```powershell
npm run dev
```

Run these scenarios:

| Step | Action | Expected |
|------|--------|----------|
| A | In an allowlisted group, send `/itsOver` outside Sunday 18:00 | One message matching `Ei, calma.. Faltam X horas pro Gif`; no GIF |
| B | Repeat `/itsOver` shortly afterward | Another text response with X recalculated; no GIF |
| C | Send `/itsOver` in a non-allowlisted group | Silence |
| D | Send `/itsOver` in a DM | Silence |
| E | Trigger the weekly job through the existing scheduler test seam | GIF sent to eligible chats as before |
| F | Simulate process startup after a missed Sunday | No catch-up GIF; next scheduled fire remains future |

For deterministic edge cases, rely on automated tests with an injected clock instead of changing the machine clock:

- 2 hours and 1 minute before the target → X = 3;
- Sunday 17:59:59.999 → X = 1;
- Sunday 18:00:00.000 in a fixed 2026 fixture → X = 168;
- Sunday 18:00:59.999 → X = 168;
- year/month rollover → next local Sunday 18:00.

## Structural exclusivity check

Confirm that:

- `src/handlers/its-over.ts` has no import from `gif-sender`;
- `ItsOverHandlerDeps` no longer contains `gifUrl` or an animation sender;
- `src/index.ts` supplies `sendGifToChat` only to weekly scheduler dependencies;
- the handler’s only successful user-facing action is a text reply.

The normative contracts are:

- [Telegram countdown command](./contracts/telegram-countdown-command.md)
- [Weekly GIF exclusive origin](./contracts/weekly-gif-boundary.md)

## Command menu

After restart, the bot re-registers commands. The `/itsover` description should describe the countdown instead of promising immediate GIF delivery. Command name and scopes stay unchanged.

## Troubleshooting delta

| Symptom | Check |
|---------|-------|
| X differs near Sunday 18:00 | Confirm the test instant and `America/Sao_Paulo`; do not use a fixed UTC offset |
| X is zero before the target | Verify ceiling is applied to a strictly positive duration |
| `/itsOver` sends a GIF | Remove all `gif-sender`/`sendAnimation` dependencies from the command path |
| Eligible command is silent | Check countdown error logs, allowlist, chat type, and presence |
| Ineligible command replies | Ensure the existing eligibility gate runs before countdown calculation/reply |
| Weekly GIF stopped | Run unchanged scheduler/GIF regression tests and verify existing `.env` values |

## Explicitly unchanged from feature 001

- Environment names and validation.
- Allowlist semantics and useful silence.
- Optimistic presence and membership handling.
- GIF persistence and retry strategy.
- Sunday 18:00 `America/Sao_Paulo` schedule.
- No catch-up after downtime.
- Long polling and webhook deletion behavior.
