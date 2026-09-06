export type ChatType =
  | "private"
  | "group"
  | "supergroup"
  | "channel"
  | string;

export type EligibilityInput = {
  chatId: number;
  chatType: ChatType;
  allowlist: readonly number[];
  presence: Record<string, { present: boolean } | undefined>;
};

/**
 * Eligible = allowlist ∩ group|supergroup ∩ present.
 * Missing presence record → optimistic true. DMs/channels never eligible.
 */
export function isEligibleChat(input: EligibilityInput): boolean {
  const { chatId, chatType, allowlist, presence } = input;

  if (!allowlist.includes(chatId)) {
    return false;
  }

  if (chatType !== "group" && chatType !== "supergroup") {
    return false;
  }

  const record = presence[String(chatId)];
  if (record === undefined) {
    return true;
  }

  return record.present === true;
}
