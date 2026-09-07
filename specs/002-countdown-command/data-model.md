# Data Model Delta: 002-countdown-command

**Date**: 2026-09-07  
**Baseline**: [001 data model](../001-its-over-bot/data-model.md)  
**Spec**: [spec.md](./spec.md)

## Overview

This feature adds no persisted entity, migration, configuration field, or state transition. It introduces two values derived in memory for each eligible `/itsOver` invocation.

```text
Command instant ──► next weekly occurrence ──► ceiling hours ──► reply text
                         ▲
             weekly cron + named timezone
```

## New derived values

### 1. WeeklyOccurrence

A transient target instant representing the next occurrence of the existing weekly schedule.

| Field | Type | Rules |
|-------|------|-------|
| `targetAt` | `Date` / instant | Must be valid and strictly later than `referenceAt` |
| `referenceAt` | `Date` / instant | Captured once per accepted command through the injected clock |
| `timezone` | constant | `America/Sao_Paulo`; same source as the weekly scheduler |
| `schedule` | constant | Sunday 18:00; same source as the weekly scheduler |

**Validation rules**:

1. Invalid `referenceAt` is an error.
2. Missing or non-future `targetAt` is an error.
3. The target is never stored and is recalculated for every command.
4. Exactly at an occurrence, the target is the following occurrence.

### 2. Countdown

A transient response value derived from `WeeklyOccurrence`.

| Field | Type | Rules |
|-------|------|-------|
| `hoursRemaining` | positive integer | `ceil((targetAt - referenceAt) / 1 hour)` |
| `message` | string | Exactly `Ei, calma.. Faltam X horas pro Gif`, with X substituted |

**Validation rules**:

1. `hoursRemaining` must be at least 1 because the target is strictly future.
2. Fractions of an hour always round upward.
3. There is no singular/plural branch; “horas” remains fixed.
4. No minutes, seconds, localization metadata, or Telegram media are part of this value.

## Existing model retained from feature 001

The following remain unchanged:

- `EnvConfig`, including `BOT_TOKEN`, `GIF_URL`, `ALLOWLIST_CHAT_IDS`, and `STATE_PATH`.
- `BotState`, including `gifFileId`, `presence`, and `lastWeeklyRunDate`.
- `PresenceRecord` and optimistic-presence transitions.
- Derived `AuthorizedChat` eligibility: allowlist ∩ group/supergroup ∩ present.
- `GifAsset` URL/`file_id` strategy, now consumed only by the weekly send path.
- Duplicate weekly-run guard and no-catch-up semantics.

## Relationships

- One accepted command reads one current `BotState` snapshot for eligibility.
- An eligible command creates one transient `WeeklyOccurrence`.
- One `WeeklyOccurrence` produces one `Countdown` and one text reply.
- `Countdown` has no relationship to `GifAsset`; it cannot initiate a GIF send.
- The weekly scheduler continues to relate eligible chats to `GifAsset` exactly as in feature 001.

## State transitions

No new state transitions are introduced.

The `/itsOver` behavior changes from:

```text
eligible command ──► GifAsset send ──► possible gifFileId/presence update
```

to:

```text
eligible command ──► derive Countdown ──► text reply
```

Weekly GIF and presence transitions remain unchanged.
