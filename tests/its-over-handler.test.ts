import type { Bot } from "grammy";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canRunItsOver,
  registerItsOverHandler,
} from "../src/handlers/its-over.js";
import type { StateStore } from "../src/storage/state-store.js";

const allowlist = [-100111, -100222];

describe("canRunItsOver (/itsOver gate)", () => {
  it("allows human sender in eligible allowlisted group (no admin required)", () => {
    expect(
      canRunItsOver({
        fromIsBot: false,
        chatId: -100111,
        chatType: "group",
        allowlist,
        presence: { "-100111": { present: true } },
      }),
    ).toBe(true);
  });

  it("allows human sender in eligible supergroup with optimistic presence", () => {
    expect(
      canRunItsOver({
        fromIsBot: false,
        chatId: -100222,
        chatType: "supergroup",
        allowlist,
        presence: {},
      }),
    ).toBe(true);
  });

  it("denies when sender is a bot even if chat is eligible", () => {
    expect(
      canRunItsOver({
        fromIsBot: true,
        chatId: -100111,
        chatType: "supergroup",
        allowlist,
        presence: {},
      }),
    ).toBe(false);
  });

  it("denies non-allowlisted chats", () => {
    expect(
      canRunItsOver({
        fromIsBot: false,
        chatId: -100999,
        chatType: "supergroup",
        allowlist,
        presence: {},
      }),
    ).toBe(false);
  });

  it("denies private chats (DM) even if allowlisted", () => {
    expect(
      canRunItsOver({
        fromIsBot: false,
        chatId: -100111,
        chatType: "private",
        allowlist,
        presence: {},
      }),
    ).toBe(false);
  });

  it("denies when presence marks chat absent", () => {
    expect(
      canRunItsOver({
        fromIsBot: false,
        chatId: -100111,
        chatType: "supergroup",
        allowlist,
        presence: { "-100111": { present: false } },
      }),
    ).toBe(false);
  });
});

describe("registerItsOverHandler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function captureHandler(
    now: () => Date = () => new Date("2026-09-07T15:00:00.000Z"),
    presence: Record<string, { present: boolean }> = {},
  ) {
    let handler: ((ctx: any, next: () => Promise<void>) => Promise<void>) | undefined;
    const bot = {
      on: (_filter: string, middleware: typeof handler) => {
        handler = middleware;
      },
    } as unknown as Bot;

    const stateStore = {
      getState: vi.fn().mockResolvedValue({
        version: 1,
        gifFileId: null,
        presence,
        lastWeeklyRunDate: null,
      }),
    } as unknown as StateStore;

    registerItsOverHandler(bot, {
      allowlist,
      stateStore,
      now,
    });

    if (!handler) {
      throw new Error("message:text handler was not registered");
    }

    return { handler, stateStore };
  }

  function eligibleContext(
    text: string,
    options: {
      chatId?: number;
      chatType?: string;
      fromIsBot?: boolean;
      missingFrom?: boolean;
      missingChat?: boolean;
    } = {},
  ) {
    return {
      message: { text },
      me: { username: "ItsOverBot" },
      from: options.missingFrom
        ? undefined
        : { is_bot: options.fromIsBot ?? false },
      chat: options.missingChat
        ? undefined
        : {
            id: options.chatId ?? -100111,
            type: options.chatType ?? "supergroup",
          },
      api: { sendAnimation: vi.fn().mockResolvedValue(undefined) },
      reply: vi.fn().mockResolvedValue(undefined),
    };
  }

  it("replies once with the exact countdown using the injected clock", async () => {
    const { handler } = captureHandler();
    const ctx = eligibleContext("/itsOver");

    await handler(ctx, vi.fn());

    expect(ctx.reply).toHaveBeenCalledOnce();
    expect(ctx.reply).toHaveBeenCalledWith(
      "Ei, calma.. Faltam 150 horas pro Gif",
    );
  });

  it("accepts a command addressed to the current bot", async () => {
    const { handler } = captureHandler();
    const ctx = eligibleContext("/ITSOVER@itsoverbot");

    await handler(ctx, vi.fn());

    expect(ctx.reply).toHaveBeenCalledWith(
      "Ei, calma.. Faltam 150 horas pro Gif",
    );
  });

  it("passes through a command addressed to another bot", async () => {
    const { handler, stateStore } = captureHandler();
    const ctx = eligibleContext("/itsOver@AnotherBot");
    const next = vi.fn().mockResolvedValue(undefined);

    await handler(ctx, next);

    expect(next).toHaveBeenCalledOnce();
    expect(stateStore.getState).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it("at Sunday 18:00 replies with 168 and never sends animation", async () => {
    const { handler } = captureHandler(
      () => new Date("2026-09-06T21:00:00.000Z"),
    );
    const ctx = eligibleContext("/itsOver");

    await handler(ctx, vi.fn());

    expect(ctx.reply).toHaveBeenCalledOnce();
    expect(ctx.reply).toHaveBeenCalledWith(
      "Ei, calma.. Faltam 168 horas pro Gif",
    );
    expect(ctx.api.sendAnimation).not.toHaveBeenCalled();
  });

  it("does not fall back to animation when countdown calculation fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { handler } = captureHandler(() => new Date("invalid"));
    const ctx = eligibleContext("/itsOver");

    await handler(ctx, vi.fn());

    expect(ctx.reply).not.toHaveBeenCalled();
    expect(ctx.api.sendAnimation).not.toHaveBeenCalled();
  });

  it("does not fall back to animation when the text reply fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { handler } = captureHandler();
    const ctx = eligibleContext("/itsOver");
    ctx.reply.mockRejectedValueOnce(new Error("reply failed"));

    await handler(ctx, vi.fn());

    expect(ctx.reply).toHaveBeenCalledOnce();
    expect(ctx.api.sendAnimation).not.toHaveBeenCalled();
  });

  it.each([
    ["a non-allowlisted chat", { chatId: -100999 }],
    ["a private chat", { chatType: "private" }],
    ["a bot sender", { fromIsBot: true }],
  ])("keeps useful silence for %s", async (_label, options) => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const { handler } = captureHandler();
    const ctx = eligibleContext("/itsOver", options);

    await handler(ctx, vi.fn());

    expect(ctx.reply).not.toHaveBeenCalled();
    expect(ctx.api.sendAnimation).not.toHaveBeenCalled();
  });

  it("keeps useful silence when presence is known absent", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const { handler } = captureHandler(undefined, {
      "-100111": { present: false },
    });
    const ctx = eligibleContext("/itsOver");

    await handler(ctx, vi.fn());

    expect(ctx.reply).not.toHaveBeenCalled();
    expect(ctx.api.sendAnimation).not.toHaveBeenCalled();
  });

  it.each([
    ["sender", { missingFrom: true }],
    ["chat", { missingChat: true }],
  ])("keeps useful silence when %s context is missing", async (_label, options) => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const { handler, stateStore } = captureHandler();
    const ctx = eligibleContext("/itsOver", options);

    await handler(ctx, vi.fn());

    expect(stateStore.getState).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
    expect(ctx.api.sendAnimation).not.toHaveBeenCalled();
  });

  it.each([
    ["group", -100111],
    ["supergroup", -100222],
  ])(
    "replies with countdown for an allowlisted %s with optimistic presence",
    async (chatType, chatId) => {
      const { handler } = captureHandler();
      const ctx = eligibleContext("/itsOver", { chatId, chatType });

      await handler(ctx, vi.fn());

      expect(ctx.reply).toHaveBeenCalledOnce();
      expect(ctx.reply).toHaveBeenCalledWith(
        "Ei, calma.. Faltam 150 horas pro Gif",
      );
      expect(ctx.api.sendAnimation).not.toHaveBeenCalled();
    },
  );
});
