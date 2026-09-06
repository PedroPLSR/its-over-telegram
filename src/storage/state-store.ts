import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type PresenceReason =
  | "optimistic"
  | "join"
  | "leave"
  | "send_failure";

export type PresenceRecord = {
  present: boolean;
  updatedAt: string;
  reason?: PresenceReason;
};

export type BotState = {
  version: 1;
  gifFileId: string | null;
  presence: Record<string, PresenceRecord>;
  lastWeeklyRunDate: string | null;
};

const DEFAULT_STATE: BotState = {
  version: 1,
  gifFileId: null,
  presence: {},
  lastWeeklyRunDate: null,
};

export type StateStore = {
  getState(): Promise<BotState>;
  setGifFileId(fileId: string | null): Promise<BotState>;
  setPresence(
    chatId: number | string,
    record: Omit<PresenceRecord, "updatedAt"> & { updatedAt?: string },
  ): Promise<BotState>;
  setLastWeeklyRunDate(date: string | null): Promise<BotState>;
  update(mutator: (state: BotState) => BotState | Promise<BotState>): Promise<BotState>;
};

function normalizeState(raw: unknown): BotState {
  if (!raw || typeof raw !== "object") {
    return structuredClone(DEFAULT_STATE);
  }

  const data = raw as Partial<BotState>;
  return {
    version: 1,
    gifFileId:
      typeof data.gifFileId === "string" || data.gifFileId === null
        ? data.gifFileId
        : null,
    presence:
      data.presence && typeof data.presence === "object" ? data.presence : {},
    lastWeeklyRunDate:
      typeof data.lastWeeklyRunDate === "string" || data.lastWeeklyRunDate === null
        ? data.lastWeeklyRunDate
        : null,
  };
}

export function createStateStore(statePath: string): StateStore {
  let writeChain: Promise<unknown> = Promise.resolve();

  async function readState(): Promise<BotState> {
    try {
      const content = await readFile(statePath, "utf8");
      return normalizeState(JSON.parse(content) as unknown);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        return structuredClone(DEFAULT_STATE);
      }
      throw error;
    }
  }

  async function writeState(state: BotState): Promise<BotState> {
    const dir = dirname(statePath);
    await mkdir(dir, { recursive: true });
    const tempPath = `${statePath}.${process.pid}.${Date.now()}.tmp`;
    const payload = `${JSON.stringify(state, null, 2)}\n`;
    await writeFile(tempPath, payload, "utf8");
    await rename(tempPath, statePath);
    return state;
  }

  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = writeChain.then(operation, operation);
    writeChain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  return {
    getState() {
      return enqueue(readState);
    },

    setGifFileId(fileId) {
      return enqueue(async () => {
        const current = await readState();
        return writeState({ ...current, gifFileId: fileId });
      });
    },

    setPresence(chatId, record) {
      return enqueue(async () => {
        const current = await readState();
        const key = String(chatId);
        const next: BotState = {
          ...current,
          presence: {
            ...current.presence,
            [key]: {
              present: record.present,
              reason: record.reason,
              updatedAt: record.updatedAt ?? new Date().toISOString(),
            },
          },
        };
        return writeState(next);
      });
    },

    setLastWeeklyRunDate(date) {
      return enqueue(async () => {
        const current = await readState();
        return writeState({ ...current, lastWeeklyRunDate: date });
      });
    },

    update(mutator) {
      return enqueue(async () => {
        const current = await readState();
        const next = await mutator(structuredClone(current));
        return writeState(normalizeState(next));
      });
    },
  };
}
