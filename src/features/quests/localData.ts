import type { AppState } from "@/lib/domain/transitions";
import type { Op } from "./ops";

// Quests kept on this device, so the app can open and be used without a connection.
// Small data (a few KB), so localStorage is plenty: it is synchronous, which means a
// change is on disk before the next line runs, and it is trivial to test.
const PREFIX = "quests:v1:";

export type LocalRecord = { state: AppState | null; outbox: Op[] };

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

function looksLikeState(v: unknown): v is AppState {
  const s = v as AppState | null;
  return (
    !!s &&
    Array.isArray(s.quests) &&
    typeof s.restores === "number" &&
    typeof s.trophies === "object" &&
    s.trophies !== null
  );
}

export function createLocalData(getStorage: () => StorageLike | null) {
  // After sign-out nothing may be written again, or the data would come straight back.
  let locked = false;

  const storage = () => {
    try {
      return getStorage();
    } catch {
      return null; // private mode, blocked site data...
    }
  };

  function read(userId: string): LocalRecord {
    try {
      const raw = storage()?.getItem(PREFIX + userId);
      if (!raw) return { state: null, outbox: [] };
      const parsed = JSON.parse(raw) as { state?: unknown; outbox?: unknown };
      return {
        state: looksLikeState(parsed.state) ? parsed.state : null,
        outbox: Array.isArray(parsed.outbox) ? (parsed.outbox as Op[]) : [],
      };
    } catch {
      return { state: null, outbox: [] }; // corrupt: start from the server
    }
  }

  function write(userId: string, record: LocalRecord) {
    if (locked) return;
    try {
      storage()?.setItem(PREFIX + userId, JSON.stringify(record));
    } catch {
      // quota exceeded or storage unavailable: the app still works online
    }
  }

  return {
    load: read,
    saveState: (userId: string, state: AppState) => write(userId, { ...read(userId), state }),
    saveOutbox: (userId: string, outbox: Op[]) => write(userId, { ...read(userId), outbox }),

    // Sign-out: remove every user's data on this device and refuse further writes.
    clearAll() {
      locked = true;
      try {
        const s = storage();
        if (!s) return;
        const doomed: string[] = [];
        for (let i = 0; i < s.length; i++) {
          const key = s.key(i);
          if (key?.startsWith(PREFIX)) doomed.push(key);
        }
        doomed.forEach((k) => s.removeItem(k));
      } catch {
        // nothing more we can do
      }
    },
  };
}

export const localData = createLocalData(() =>
  typeof window === "undefined" ? null : window.localStorage,
);
