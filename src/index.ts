import {
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

async function main(): Promise<void> {
  const config = loadConfig();
  const stateStore = createStateStore(config.statePath);
  const bot = createBot(config.botToken);

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

  await bot.start({
    allowed_updates: [...LONG_POLLING_ALLOWED_UPDATES],
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
