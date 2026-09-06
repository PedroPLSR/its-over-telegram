import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Message } from "grammy/types";
import { sendGifToChat } from "../src/services/gif-sender.js";
import { createStateStore } from "../src/storage/state-store.js";

function animationMessage(fileId: string): Message {
  return {
    message_id: 1,
    date: 0,
    chat: { id: -1001, type: "supergroup", title: "t" },
    animation: {
      file_id: fileId,
      file_unique_id: "uniq",
      width: 1,
      height: 1,
      duration: 1,
    },
  } as Message;
}

describe("sendGifToChat", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(
      dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });

  async function store() {
    const dir = await mkdtemp(join(tmpdir(), "its-over-gif-"));
    dirs.push(dir);
    return createStateStore(join(dir, "state.json"));
  }

  it("sends GIF_URL on first send and persists file_id", async () => {
    const stateStore = await store();
    const sendAnimation = vi.fn().mockResolvedValue(animationMessage("file-abc"));

    await sendGifToChat(-1001, {
      sendAnimation,
      stateStore,
      gifUrl: "https://example.com/over.gif",
      sleep: async () => undefined,
    });

    expect(sendAnimation).toHaveBeenCalledWith(
      -1001,
      "https://example.com/over.gif",
    );
    expect((await stateStore.getState()).gifFileId).toBe("file-abc");
  });

  it("prefers stored file_id on later sends", async () => {
    const stateStore = await store();
    await stateStore.setGifFileId("file-abc");
    const sendAnimation = vi.fn().mockResolvedValue(animationMessage("file-abc"));

    await sendGifToChat(-1001, {
      sendAnimation,
      stateStore,
      gifUrl: "https://example.com/over.gif",
      sleep: async () => undefined,
    });

    expect(sendAnimation).toHaveBeenCalledWith(-1001, "file-abc");
    expect(sendAnimation).toHaveBeenCalledTimes(1);
  });

  it("clears invalid file_id and retries with URL", async () => {
    const stateStore = await store();
    await stateStore.setGifFileId("file-stale");
    const sendAnimation = vi
      .fn()
      .mockRejectedValueOnce(new Error("Bad Request: wrong file_id specified"))
      .mockResolvedValueOnce(animationMessage("file-new"));

    await sendGifToChat(-1001, {
      sendAnimation,
      stateStore,
      gifUrl: "https://example.com/over.gif",
      sleep: async () => undefined,
    });

    expect(sendAnimation).toHaveBeenNthCalledWith(1, -1001, "file-stale");
    expect(sendAnimation).toHaveBeenNthCalledWith(
      2,
      -1001,
      "https://example.com/over.gif",
    );
    expect((await stateStore.getState()).gifFileId).toBe("file-new");
  });
});
