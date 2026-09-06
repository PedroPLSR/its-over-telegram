import { Bot } from "grammy";
import {
  registerChatMemberHandler,
  type ChatMemberHandlerDeps,
} from "./handlers/chat-member.js";
import {
  registerItsOverHandler,
  type ItsOverHandlerDeps,
} from "./handlers/its-over.js";

export type CreateBotOptions = {
  chatMember: ChatMemberHandlerDeps;
  itsOver: ItsOverHandlerDeps;
};

/**
 * Create a grammY bot configured for long polling only (no webhook).
 * Registers membership presence tracking and `/itsOver`.
 */
export function createBot(token: string, options: CreateBotOptions): Bot {
  const bot = new Bot(token);

  bot.use(async (ctx, next) => {
    // Log metadata only: message bodies can contain tokens or other secrets.
    console.log(
      `update id=${ctx.update.update_id} chatId=${ctx.chat?.id ?? "none"} type=${ctx.chat?.type ?? "none"}`,
    );
    await next();
  });

  registerChatMemberHandler(bot, options.chatMember);
  registerItsOverHandler(bot, options.itsOver);
  return bot;
}

/**
 * BotFather-visible commands.
 * Telegram Bot API requires lowercase command names (clients still accept /itsOver).
 */
export const BOT_COMMANDS = [
  {
    command: "itsover",
    description: "Send the It's Over GIF",
  },
] as const;

/** Scopes so the slash menu appears in DMs and groups. */
export const BOT_COMMAND_SCOPES = [
  undefined,
  { type: "all_private_chats" as const },
  { type: "all_group_chats" as const },
];

export const LONG_POLLING_ALLOWED_UPDATES = [
  "message",
  "my_chat_member",
] as const;
