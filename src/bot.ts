import { Bot } from "grammy";

/**
 * Create a grammY bot configured for long polling only (no webhook).
 */
export function createBot(token: string): Bot {
  return new Bot(token);
}

export const LONG_POLLING_ALLOWED_UPDATES = [
  "message",
  "my_chat_member",
] as const;
