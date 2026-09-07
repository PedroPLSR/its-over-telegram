# Contract: Telegram `/itsOver` countdown

**Feature**: 002-countdown-command  
**Baseline replaced**: `/itsOver` behavior in [001 Telegram updates contract](../../001-its-over-bot/contracts/telegram-updates.md)  
**Transport**: Existing grammY long-polling message handler

## Trigger

| Aspect | Rule |
|--------|------|
| Command | `/itsOver`, matched case-insensitively as today |
| Bot mention | `/itsOver@CurrentBotUsername` is accepted; commands addressed to another bot pass through |
| Sender | Human Telegram user; bot senders are ignored |
| Authorization | Existing eligible-chat rule: allowlist ∧ group/supergroup ∧ present |
| Admin-only | No; any human member in an eligible chat |

## Eligible response

The handler sends one ordinary text message:

```text
Ei, calma.. Faltam X horas pro Gif
```

`X` is a base-10 positive integer:

```text
X = ceil(
  milliseconds from command instant
  to the next strictly-future Sunday 18:00 America/Sao_Paulo
  ÷ 3,600,000
)
```

Examples under the 2026 timezone rules:

| Command instant in America/Sao_Paulo | X |
|---------------------------------------|---|
| Sunday 15:59:00 | 3 |
| Sunday 17:59:59.999 | 1 |
| Sunday 18:00:00.000 | 168 |
| Sunday 18:00:59.999 | 168 |
| Sunday 18:01:00 | 168 |

The fixed word “horas” is used even when X is 1.

## Prohibited behavior

For every `/itsOver` invocation, the command path:

- MUST NOT call Telegram `sendAnimation`;
- MUST NOT call `gif-sender`;
- MUST NOT use `GIF_URL` or persisted `gifFileId`;
- MUST NOT fall back to a GIF if countdown calculation or text reply fails;
- MUST NOT change presence or weekly-run state because of a successful reply.

## Silence contract

No text, GIF, denial, or help response is produced when:

- the chat ID is not allowlisted;
- the chat is not a group or supergroup;
- presence is known to be false;
- the sender is a bot;
- required message context is absent.

Optimistic presence remains valid: a group/supergroup allowlisted without a presence record is eligible.

## Failure behavior

- Countdown calculation failure: record a redacted operator log; send nothing.
- Telegram text-reply failure: record a redacted operator log; do not retry as media.
- No command failure changes `gifFileId`, `lastWeeklyRunDate`, or presence.

## Unchanged update behavior

- Long polling and allowed update kinds remain unchanged.
- `my_chat_member` continues updating presence according to the feature 001 contract.
- Unknown commands and ordinary messages remain silent.
