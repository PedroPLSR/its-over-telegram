import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const chatIdListSchema = z
  .string()
  .transform((raw, ctx) => {
    const ids: number[] = [];
    const seen = new Set<number>();

    for (const segment of raw.split(",")) {
      const trimmed = segment.trim();
      if (trimmed === "") continue;

      if (!/^-?\d+$/.test(trimmed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid chat ID segment: "${trimmed}"`,
        });
        return z.NEVER;
      }

      const id = Number(trimmed);
      if (!Number.isSafeInteger(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Chat ID out of safe integer range: "${trimmed}"`,
        });
        return z.NEVER;
      }

      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }

    return ids;
  });

const envSchema = z.object({
  BOT_TOKEN: z.string().min(1, "BOT_TOKEN is required"),
  GIF_URL: z
    .string()
    .url("GIF_URL must be a valid URL")
    .refine(
      (value) => value.startsWith("http://") || value.startsWith("https://"),
      "GIF_URL must be an http:// or https:// URL",
    ),
  ALLOWLIST_CHAT_IDS: chatIdListSchema,
  STATE_PATH: z.string().min(1).default("data/state.json"),
});

export type AppConfig = {
  botToken: string;
  gifUrl: string;
  allowlistChatIds: number[];
  statePath: string;
};

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
): AppConfig {
  const parsed = envSchema.safeParse({
    BOT_TOKEN: env.BOT_TOKEN,
    GIF_URL: env.GIF_URL,
    ALLOWLIST_CHAT_IDS: env.ALLOWLIST_CHAT_IDS ?? "",
    STATE_PATH: env.STATE_PATH || undefined,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "config"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid configuration: ${details}`);
  }

  return {
    botToken: parsed.data.BOT_TOKEN,
    gifUrl: parsed.data.GIF_URL,
    allowlistChatIds: parsed.data.ALLOWLIST_CHAT_IDS,
    statePath: parsed.data.STATE_PATH,
  };
}
