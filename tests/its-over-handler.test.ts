import { describe, expect, it } from "vitest";
import { canRunItsOver } from "../src/handlers/its-over.js";

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
