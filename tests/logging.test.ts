import { describe, expect, it } from "vitest";
import { redactLogValue } from "../src/logging.js";

describe("redactLogValue", () => {
  it("redacts the configured token from errors", () => {
    const token = "123456789:abcdefghijklmnopqrstuvwxyz_ABCDE";
    const error = new Error(`request failed at /bot${token}/sendAnimation`);

    expect(redactLogValue(error, [token])).toBe(
      "request failed at /bot[REDACTED]/sendAnimation",
    );
  });

  it("redacts token-shaped values before config is available", () => {
    expect(
      redactLogValue(
        "Telegram rejected 987654321:ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcde",
        [],
      ),
    ).toBe("Telegram rejected [REDACTED]");
  });
});
