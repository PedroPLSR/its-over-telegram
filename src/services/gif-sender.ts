import type { Message } from "grammy/types";
import type { StateStore } from "../storage/state-store.js";

export type SendAnimationFn = (
  chatId: number,
  animation: string,
) => Promise<Message>;

export type GifSenderDeps = {
  sendAnimation: SendAnimationFn;
  stateStore: StateStore;
  gifUrl: string;
  sleep?: (ms: number) => Promise<void>;
  maxTransientRetries?: number;
};

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "description" in error &&
    typeof (error as { description: unknown }).description === "string"
  ) {
    return (error as { description: string }).description;
  }
  return String(error);
}

export function isInvalidFileIdError(error: unknown): boolean {
  const message = errorMessage(error).toLowerCase();
  return (
    message.includes("wrong file_id") ||
    message.includes("invalid file_id") ||
    (message.includes("file_id") && message.includes("not found"))
  );
}

export function isTransientSendError(error: unknown): boolean {
  const message = errorMessage(error).toLowerCase();
  const code =
    typeof error === "object" &&
    error !== null &&
    "error_code" in error &&
    typeof (error as { error_code: unknown }).error_code === "number"
      ? (error as { error_code: number }).error_code
      : undefined;

  if (code === 429 || code === 500 || code === 502 || code === 503 || code === 504) {
    return true;
  }

  return (
    message.includes("fetch failed") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("socket hang up") ||
    message.includes("network") ||
    message.includes("temporarily unavailable")
  );
}

/**
 * Errors that prove the bot cannot be present in the target chat.
 * A generic 403 is intentionally insufficient: it can also mean the bot is
 * still a member but lacks permission to post.
 */
export function isAbsenceProofSendError(error: unknown): boolean {
  const message = errorMessage(error).toLowerCase();
  return (
    message.includes("bot was kicked") ||
    message.includes("bot is not a member") ||
    message.includes("bot was blocked") ||
    message.includes("chat not found")
  );
}

async function persistFileIdFromMessage(
  message: Message,
  stateStore: StateStore,
): Promise<void> {
  const fileId = message.animation?.file_id;
  if (typeof fileId === "string" && fileId.length > 0) {
    await stateStore.setGifFileId(fileId);
  }
}

/**
 * Send the configured GIF to one chat: prefer file_id, fall back to GIF_URL.
 * Limited retries on transient errors. Does not invent media.
 */
export async function sendGifToChat(
  chatId: number,
  deps: GifSenderDeps,
): Promise<Message> {
  const sleep = deps.sleep ?? defaultSleep;
  const maxAttempts = deps.maxTransientRetries ?? 3;
  const state = await deps.stateStore.getState();
  let animation = state.gifFileId ?? deps.gifUrl;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const message = await deps.sendAnimation(chatId, animation);
      await persistFileIdFromMessage(message, deps.stateStore);
      return message;
    } catch (error) {
      lastError = error;

      if (animation !== deps.gifUrl && isInvalidFileIdError(error)) {
        await deps.stateStore.setGifFileId(null);
        animation = deps.gifUrl;
        continue;
      }

      if (isTransientSendError(error) && attempt < maxAttempts) {
        await sleep(500 * attempt);
        continue;
      }

      if (isAbsenceProofSendError(error)) {
        await deps.stateStore.setPresence(chatId, {
          present: false,
          reason: "send_failure",
        });
      }

      throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError));
}
