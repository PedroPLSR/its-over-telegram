import {
  BOT_COMMAND_SCOPES,
  BOT_COMMANDS,
  createBot,
  LONG_POLLING_ALLOWED_UPDATES,
} from "./bot.js";
import { loadConfig } from "./config.js";
import { sendGifToChat } from "./services/gif-sender.js";
import {
  startWeeklyScheduler,
  type WeeklySchedulerDeps,
} from "./services/weekly-scheduler.js";
import { createStateStore } from "./storage/state-store.js";
import { redactLogValue } from "./logging.js";

async function registerBotCommands(bot: ReturnType<typeof createBot>): Promise<void> {
  const cmds = [...BOT_COMMANDS];
  for (const scope of BOT_COMMAND_SCOPES) {
    if (scope === undefined) {
      await bot.api.setMyCommands(cmds);
    } else {
      await bot.api.setMyCommands(cmds, { scope });
    }
  }
  console.log("Bot commands registered: /itsover");
}

async function main(): Promise<void> {
  const config = loadConfig();
  const stateStore = createStateStore(config.statePath);
  const bot = createBot(config.botToken, {
    chatMember: {
      stateStore,
    },
    itsOver: {
      allowlist: config.allowlistChatIds,
      stateStore,
    },
  });

  bot.catch((err) => {
    console.error("Bot error:", redactLogValue(err.error));
  });

  await bot.api.deleteWebhook({ drop_pending_updates: false });
  await registerBotCommands(bot);

  const weeklyDeps: WeeklySchedulerDeps = {
    allowlist: config.allowlistChatIds,
    stateStore,
    getChatType: async (chatId) => {
      const chat = await bot.api.getChat(chatId);
      return chat.type;
    },
    sendGifToChat: (chatId) =>
      sendGifToChat(chatId, {
        sendAnimation: (id, animation) => bot.api.sendAnimation(id, animation),
        stateStore,
        gifUrl: config.gifUrl,
      }),
  };

  startWeeklyScheduler(weeklyDeps);

  console.log(
    `Polling… allowlist=[${config.allowlistChatIds.join(", ")}]`,
  );
  await bot.start({
    allowed_updates: [...LONG_POLLING_ALLOWED_UPDATES],
    onStart: (info) => {
      console.log(`@${info.username} online (long polling)`);
    },
  });
}

main().catch((error: unknown) => {
  console.error(redactLogValue(error));
  process.exit(1);
});
