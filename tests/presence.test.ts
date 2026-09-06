import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { updatePresenceFromMyChatMember } from "../src/handlers/chat-member.js";
import { isEligibleChat } from "../src/services/eligibility.js";
import { sendGifToChat } from "../src/services/gif-sender.js";
import { createStateStore } from "../src/storage/state-store.js";

const CHAT_ID = -100111;

describe("presence transitions", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(
      dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });

  async function store() {
    const dir = await mkdtemp(join(tmpdir(), "its-over-presence-"));
    dirs.push(dir);
    return createStateStore(join(dir, "state.json"));
  }

  it("treats a missing presence record as optimistically present", () => {
    expect(
      isEligibleChat({
        chatId: CHAT_ID,
        chatType: "supergroup",
        allowlist: [CHAT_ID],
        presence: {},
      }),
    ).toBe(true);
  });

  it.each(["member", "administrator", "restricted"] as const)(
    "marks the bot present on %s",
    async (status) => {
      const stateStore = await store();

      await updatePresenceFromMyChatMember(
        { chatId: CHAT_ID, newStatus: status },
        { stateStore },
      );

      expect((await stateStore.getState()).presence[String(CHAT_ID)]).toMatchObject({
        present: true,
        reason: "join",
      });
    },
  );

  it.each(["left", "kicked"] as const)(
    "marks the bot absent on %s",
    async (status) => {
      const stateStore = await store();

      await updatePresenceFromMyChatMember(
        { chatId: CHAT_ID, newStatus: status },
        { stateStore },
      );

      expect((await stateStore.getState()).presence[String(CHAT_ID)]).toMatchObject({
        present: false,
        reason: "leave",
      });
    },
  );

  it("marks absent when a send error proves the bot is no longer in the chat", async () => {
    const stateStore = await store();

    await expect(
      sendGifToChat(CHAT_ID, {
        sendAnimation: vi
          .fn()
          .mockRejectedValue(new Error("Forbidden: bot was kicked from the supergroup chat")),
        stateStore,
        gifUrl: "https://example.com/over.gif",
        sleep: async () => undefined,
      }),
    ).rejects.toThrow("bot was kicked");

    expect((await stateStore.getState()).presence[String(CHAT_ID)]).toMatchObject({
      present: false,
      reason: "send_failure",
    });
  });

  it("does not change presence on transient network errors", async () => {
    const stateStore = await store();
    await stateStore.setPresence(CHAT_ID, { present: true, reason: "join" });

    await expect(
      sendGifToChat(CHAT_ID, {
        sendAnimation: vi.fn().mockRejectedValue(new Error("fetch failed")),
        stateStore,
        gifUrl: "https://example.com/over.gif",
        sleep: async () => undefined,
        maxTransientRetries: 1,
      }),
    ).rejects.toThrow("fetch failed");

    expect((await stateStore.getState()).presence[String(CHAT_ID)]).toMatchObject({
      present: true,
      reason: "join",
    });
  });

  it("does not mark absent for a generic permissions error", async () => {
    const stateStore = await store();
    await stateStore.setPresence(CHAT_ID, { present: true, reason: "join" });

    await expect(
      sendGifToChat(CHAT_ID, {
        sendAnimation: vi
          .fn()
          .mockRejectedValue(new Error("Forbidden: not enough rights to send an animation")),
        stateStore,
        gifUrl: "https://example.com/over.gif",
        sleep: async () => undefined,
      }),
    ).rejects.toThrow("not enough rights");

    expect((await stateStore.getState()).presence[String(CHAT_ID)]).toMatchObject({
      present: true,
      reason: "join",
    });
  });

  it("never mutates the environment-derived allowlist", async () => {
    const allowlist = [CHAT_ID, -100222];
    const original = [...allowlist];
    const stateStore = await store();

    await updatePresenceFromMyChatMember(
      { chatId: CHAT_ID, newStatus: "member" },
      { stateStore },
    );
    await updatePresenceFromMyChatMember(
      { chatId: CHAT_ID, newStatus: "left" },
      { stateStore },
    );

    expect(allowlist).toEqual(original);
  });
});
