import { Cron } from "croner";
import {
  WEEKLY_CRON,
  WEEKLY_TIMEZONE,
} from "./weekly-scheduler.js";

const MILLISECONDS_PER_HOUR = 3_600_000;

export function getNextWeeklyOccurrence(referenceAt: Date): Date {
  const referenceMs = referenceAt.getTime();
  if (!Number.isFinite(referenceMs)) {
    throw new Error("Invalid reference date");
  }

  const recurrence = new Cron(WEEKLY_CRON, {
    timezone: WEEKLY_TIMEZONE,
    paused: true,
  });
  const targetAt = recurrence.nextRun(referenceAt);

  if (targetAt === null || targetAt.getTime() <= referenceMs) {
    throw new Error("Weekly occurrence must be strictly future");
  }

  return targetAt;
}

export function calculateHoursUntilNextGif(referenceAt: Date): number {
  const targetAt = getNextWeeklyOccurrence(referenceAt);
  const durationMs = targetAt.getTime() - referenceAt.getTime();
  const hoursRemaining = Math.ceil(durationMs / MILLISECONDS_PER_HOUR);

  if (!Number.isSafeInteger(hoursRemaining) || hoursRemaining < 1) {
    throw new Error("Countdown hours must be a positive integer");
  }

  return hoursRemaining;
}

export function formatCountdownMessage(hoursRemaining: number): string {
  if (!Number.isSafeInteger(hoursRemaining) || hoursRemaining < 1) {
    throw new Error("Countdown hours must be a positive integer");
  }

  return `Ei, calma.. Faltam ${hoursRemaining} horas pro Gif`;
}
