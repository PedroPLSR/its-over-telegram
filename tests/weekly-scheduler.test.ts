import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStateStore } from "../src/storage/state-store.js";
import {
  formatDateSaoPaulo,
  runWeeklySend,
  startWeeklyScheduler,
  WEEKLY_TIMEZONE,
} from "../src/services/weekly-scheduler.js";

describe("weekly-scheduler", () => {
  const dirs: string[] = [];
  const handles: Array<{ stop: () => void }> = [];

  afterEach(async () => {
    for (const handle of handles.splice(0)) {
      handle.stop();
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
    await Promise.all(
      dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });

  async function store() {
    const dir = await mkdtemp(join(tmpdir(), "its-over-sched-"));
    dirs.push(dir);
    return createStateStore(join(dir, "state.json"));
  }

  it("runWeeklySend fans out to eligible chats and continues after one failure", async () => {
    const stateStore = await store();
    const sendGifToChat = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);

    const result = await runWeeklySend({
      allowlist: [-1001, -1002],
      stateStore,
      getChatType: async () => "supergroup",
      sendGifToChat,
      todaySaoPaulo: () => "2026-09-06",
      log: () => undefined,
    });

    expect(sendGifToChat).toHaveBeenCalledTimes(2);
    expect(result.sent).toBe(1);
    expect((await stateStore.getState()).lastWeeklyRunDate).toBe("2026-09-06");
  });

  it("does not catch up a missed Sunday on startup — only schedules a future run", () => {
    // Wednesday after a missed Sunday 18:00 America/Sao_Paulo
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2026-09-09T15:00:00.000Z"));

    const sendGifToChat = vi.fn();
    const handle = startWeeklyScheduler({
      allowlist: [-1001],
      stateStore: {
        getState: async () => ({
          version: 1,
          gifFileId: null,
          presence: {},
          lastWeeklyRunDate: null,
        }),
        setGifFileId: async (s) => s as never,
        setPresence: async (s) => s as never,
        setLastWeeklyRunDate: async (s) => s as never,
        update: async (s) => s as never,
      },
      getChatType: async () => "supergroup",
      sendGifToChat,
    });
    handles.push(handle);

    expect(sendGifToChat).not.toHaveBeenCalled();

    const next = handle.nextRun();
    expect(next).not.toBeNull();

    const nextParts = new Intl.DateTimeFormat("en-US", {
      timeZone: WEEKLY_TIMEZONE,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(next!);

    const weekday = nextParts.find((p) => p.type === "weekday")?.value;
    const hour = nextParts.find((p) => p.type === "hour")?.value;
    const minute = nextParts.find((p) => p.type === "minute")?.value;

    expect(weekday).toBe("Sun");
    expect(hour).toBe("18");
    expect(minute).toBe("00");
    expect(formatDateSaoPaulo(next!)).not.toBe(
      formatDateSaoPaulo(new Date()),
    );
  });

  it("skips duplicate run for the same Sao_Paulo date (guard only, not catch-up)", async () => {
    const stateStore = await store();
    await stateStore.setLastWeeklyRunDate("2026-09-06");
    const sendGifToChat = vi.fn();

    const result = await runWeeklySend({
      allowlist: [-1001],
      stateStore,
      getChatType: async () => "supergroup",
      sendGifToChat,
      todaySaoPaulo: () => "2026-09-06",
      log: () => undefined,
    });

    expect(sendGifToChat).not.toHaveBeenCalled();
    expect(result.attempted).toBe(0);
  });
});
