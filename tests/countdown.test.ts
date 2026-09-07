import { describe, expect, it } from "vitest";
import {
  calculateHoursUntilNextGif,
  formatCountdownMessage,
  getNextWeeklyOccurrence,
} from "../src/services/countdown.js";

describe("countdown", () => {
  it.each([
    ["ordinary weekday", "2026-09-07T15:00:00.000Z", 150],
    ["week and month rollover", "2026-10-29T15:00:00.000Z", 78],
    ["year rollover", "2026-12-31T02:00:00.000Z", 91],
    ["2h01m remaining", "2026-09-06T18:59:00.000Z", 3],
    ["less than one hour remaining", "2026-09-06T20:30:00.000Z", 1],
    ["Sunday 17:59:59.999", "2026-09-06T20:59:59.999Z", 1],
    ["Sunday 18:00:00.000", "2026-09-06T21:00:00.000Z", 168],
    ["Sunday 18:00:59.999", "2026-09-06T21:00:59.999Z", 168],
    ["Sunday 18:01", "2026-09-06T21:01:00.000Z", 168],
  ])("%s", (_label, iso, expected) => {
    expect(calculateHoursUntilNextGif(new Date(iso))).toBe(expected);
  });

  it("rejects an invalid reference date", () => {
    expect(() => calculateHoursUntilNextGif(new Date("invalid"))).toThrow(
      /invalid reference date/i,
    );
  });

  it("always returns a target strictly after the reference instant", () => {
    const reference = new Date("2026-09-06T21:00:00.000Z");
    expect(getNextWeeklyOccurrence(reference).getTime()).toBeGreaterThan(
      reference.getTime(),
    );
  });

  it("uses America/Sao_Paulo independently of the host timezone", () => {
    const reference = new Date("2026-12-31T02:00:00.000Z");
    const target = getNextWeeklyOccurrence(reference);

    expect(target.toISOString()).toBe("2027-01-03T21:00:00.000Z");
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(target);

    expect(parts.find((part) => part.type === "weekday")?.value).toBe("Sun");
    expect(parts.find((part) => part.type === "hour")?.value).toBe("18");
    expect(parts.find((part) => part.type === "minute")?.value).toBe("00");
  });

  it("formats the fixed message without singularization", () => {
    expect(formatCountdownMessage(1)).toBe(
      "Ei, calma.. Faltam 1 horas pro Gif",
    );
  });
});
