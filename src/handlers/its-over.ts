import type { Bot } from "grammy";
import {
  isEligibleChat,
  type ChatType,
} from "../services/eligibility.js";
import { sendGifToChat } from "../services/gif-sender.js";
import type { StateStore } from "../storage/state-store.js";
import { redactLogValue } from "../logging.js";

export type ItsOverGateInput = {
  fromIsBot: boolean;
  chatId: number;
  chatType: ChatType;
  allowlist: readonly number[];
  presence: Record<string, { present: boolean } | undefined>;
};

/**
 * Gate for `/itsOver`: human sender + eligible chat.
 * No admin-role check — any human member may trigger.
 */
export function canRunItsOver(input: ItsOverGateInput): boolean {
  if (input.fromIsBot) {
    return false;
  }

  return isEligibleChat({
    chatId: input.chatId,
    chatType: input.chatType,
    allowlist: input.allowlist,
    presence: input.presence,
  });
}

export type ItsOverHandlerDeps = {
  allowlist: readonly number[];
  stateStore: StateStore;
  gifUrl: string;
};

/**
 * Register `/itsOver`: eligible human → same GIF as weekly; else useful silence.
 * Matches `/itsover` and `/itsover@BotName` by text (not only Telegram entities).
 */
export function registerItsOverHandler(
  bot: Bot,
  deps: ItsOverHandlerDeps,
): void {
  bot.on("message:text", async (ctx, next) => {
    const text = ctx.message.text.trim();
    const match = /^\/itsover(?:@(\w+))?$/i.exec(text);
    if (!match) {
      await next();
      return;
    }

    const mentioned = match[1];
    if (
      mentioned &&
      mentioned.toLowerCase() !== ctx.me.username.toLowerCase()
    ) {
      await next();
      return;
    }

    const from = ctx.from;
    const chat = ctx.chat;
    if (!from || !chat) {
      console.log("itsOver skipped: missing from/chat");
      return;
    }

    const state = await deps.stateStore.getState();
    const allowed = canRunItsOver({
      fromIsBot: from.is_bot === true,
      chatId: chat.id,
      chatType: chat.type,
      allowlist: deps.allowlist,
      presence: state.presence,
    });

    if (!allowed) {
      // Operator-only: useful silence toward the user (FR-004).
      console.log(
        `itsOver denied chatId=${chat.id} type=${chat.type} allowlisted=${deps.allowlist.includes(chat.id)}`,
      );
      return;
    }

    try {
      console.log(`itsOver sending to chatId=${chat.id}`);
      await sendGifToChat(chat.id, {
        sendAnimation: (chatId, animation) =>
          ctx.api.sendAnimation(chatId, animation),
        stateStore: deps.stateStore,
        gifUrl: deps.gifUrl,
      });
      console.log(`itsOver sent ok chatId=${chat.id}`);
    } catch (error) {
      console.error(
        `itsOver send failed for chat ${chat.id}: ${redactLogValue(error)}`,
      );
    }
  });
}
