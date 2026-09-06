const TELEGRAM_TOKEN_PATTERN = /\b\d{5,}:[A-Za-z0-9_-]{20,}\b/g;
const REDACTED = "[REDACTED]";

/**
 * Redact the configured bot token and token-shaped values before logging.
 * The pattern also protects startup errors that occur before config is loaded.
 */
export function redactLogValue(
  value: unknown,
  secrets: readonly (string | undefined)[] = [process.env.BOT_TOKEN],
): string {
  let output = value instanceof Error ? value.message : String(value);

  for (const secret of secrets) {
    if (secret) {
      output = output.replaceAll(secret, REDACTED);
    }
  }

  return output.replace(TELEGRAM_TOKEN_PATTERN, REDACTED);
}
