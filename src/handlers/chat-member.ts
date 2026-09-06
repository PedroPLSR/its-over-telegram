import type { Bot } from "grammy";
import type { StateStore } from "../storage/state-store.js";

export type MyChatMemberStatus =
  | "member"
  | "administrator"
  | "restricted"
  | "left"
  | "kicked"
  | string;

export type MyChatMemberUpdate = {
  chatId: number;
  newStatus: MyChatMemberStatus;
};

export type ChatMemberHandlerDeps = {
  stateStore: StateStore;
};

/**
 * Persist presence only. The env-derived allowlist is deliberately not a
 * dependency, so membership updates cannot add or remove authorized chats.
 */
export async function updatePresenceFromMyChatMember(
  update: MyChatMemberUpdate,
  deps: ChatMemberHandlerDeps,
): Promise<void> {
  if (
    update.newStatus === "member" ||
    update.newStatus === "administrator" ||
    update.newStatus === "restricted"
  ) {
    await deps.stateStore.setPresence(update.chatId, {
      present: true,
      reason: "join",
    });
    return;
  }

  if (update.newStatus === "left" || update.newStatus === "kicked") {
    await deps.stateStore.setPresence(update.chatId, {
      present: false,
      reason: "leave",
    });
  }
}

export function registerChatMemberHandler(
  bot: Bot,
  deps: ChatMemberHandlerDeps,
): void {
  bot.on("my_chat_member", async (ctx) => {
    await updatePresenceFromMyChatMember(
      {
        chatId: ctx.myChatMember.chat.id,
        newStatus: ctx.myChatMember.new_chat_member.status,
      },
      deps,
    );
  });
}
