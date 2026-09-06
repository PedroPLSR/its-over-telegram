import { describe, expect, it } from "vitest";
import { isEligibleChat } from "../src/services/eligibility.js";

const allowlist = [-100111, -100222];

describe("isEligibleChat", () => {
  it("allows allowlisted group that is present", () => {
    expect(
      isEligibleChat({
        chatId: -100111,
        chatType: "group",
        allowlist,
        presence: { "-100111": { present: true } },
      }),
    ).toBe(true);
  });

  it("allows allowlisted supergroup with optimistic default (no presence record)", () => {
    expect(
      isEligibleChat({
        chatId: -100222,
        chatType: "supergroup",
        allowlist,
        presence: {},
      }),
    ).toBe(true);
  });

  it("rejects non-allowlisted chats", () => {
    expect(
      isEligibleChat({
        chatId: -100999,
        chatType: "supergroup",
        allowlist,
        presence: {},
      }),
    ).toBe(false);
  });

  it("rejects private chats even if allowlisted", () => {
    expect(
      isEligibleChat({
        chatId: -100111,
        chatType: "private",
        allowlist,
        presence: {},
      }),
    ).toBe(false);
  });

  it("rejects channels even if allowlisted", () => {
    expect(
      isEligibleChat({
        chatId: -100111,
        chatType: "channel",
        allowlist,
        presence: {},
      }),
    ).toBe(false);
  });

  it("blocks when presence marks chat absent", () => {
    expect(
      isEligibleChat({
        chatId: -100111,
        chatType: "supergroup",
        allowlist,
        presence: { "-100111": { present: false } },
      }),
    ).toBe(false);
  });
});
