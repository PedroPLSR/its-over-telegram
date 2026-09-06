import { Cron } from "croner";
import { isEligibleChat, type ChatType } from "./eligibility.js";
import type { StateStore } from "../storage/state-store.js";
import { redactLogValue } from "../logging.js";

export const WEEKLY_CRON = "0 18 * * 0";
export const WEEKLY_TIMEZONE = "America/Sao_Paulo";

export type WeeklySchedulerDeps = {
  allowlist: readonly number[];
  stateStore: StateStore;
  getChatType: (chatId: number) => Promise<ChatType>;
  sendGifToChat: (chatId: number) => Promise<unknown>;
  /** Override "today" in America/Sao_Paulo as YYYY-MM-DD (tests). */
  todaySaoPaulo?: () => string;
  log?: (message: string, error?: unknown) => void;
};

export function formatDateSaoPaulo(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: WEEKLY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Fan-out weekly GIF to eligible allowlisted chats.
 * One chat failure must not cancel others.
 * Duplicate guard via lastWeeklyRunDate only — never used for catch-up.
 */
export async function runWeeklySend(
  deps: WeeklySchedulerDeps,
): Promise<{ attempted: number; sent: number; skipped: number }> {
  const today = (deps.todaySaoPaulo ?? formatDateSaoPaulo)();
  const log = deps.log ?? ((message: string, error?: unknown) => {
    if (error !== undefined) {
      console.error(message, redactLogValue(error));
    } else {
      console.info(message);
    }
  });

  const state = await deps.stateStore.getState();
  if (state.lastWeeklyRunDate === today) {
    log(`Skipping weekly send; already ran for ${today}`);
    return { attempted: 0, sent: 0, skipped: deps.allowlist.length };
  }

  let sent = 0;
  let skipped = 0;
  let attempted = 0;

  for (const chatId of deps.allowlist) {
    attempted += 1;
    try {
      const chatType = await deps.getChatType(chatId);
      const eligible = isEligibleChat({
        chatId,
        chatType,
        allowlist: deps.allowlist,
        presence: state.presence,
      });

      if (!eligible) {
        skipped += 1;
        continue;
      }

      await deps.sendGifToChat(chatId);
      sent += 1;
    } catch (error) {
      log(`Weekly send failed for chat ${chatId}`, error);
    }
  }

  await deps.stateStore.setLastWeeklyRunDate(today);
  return { attempted, sent, skipped };
}

export type WeeklySchedulerHandle = {
  stop: () => void;
  /** Next scheduled fire (future only — croner does not replay missed Sundays). */
  nextRun: () => Date | null;
};

/**
 * Schedule Sunday 18:00 America/Sao_Paulo. No misfire / catch-up on startup.
 */
export function startWeeklyScheduler(
  deps: WeeklySchedulerDeps,
): WeeklySchedulerHandle {
  const job = new Cron(
    WEEKLY_CRON,
    {
      timezone: WEEKLY_TIMEZONE,
      protect: true,
    },
    () => {
      void runWeeklySend(deps);
    },
  );

  return {
    stop: () => {
      job.stop();
    },
    nextRun: () => job.nextRun(),
  };
}
