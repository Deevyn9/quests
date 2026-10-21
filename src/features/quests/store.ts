import { create } from "zustand";
import type { NewQuestInput } from "@/lib/domain/create";
import { todayIn } from "@/lib/domain/dates";
import type { QuestPatch } from "@/lib/domain/edit";
import * as moves from "@/lib/domain/transitions";
import { EMPTY_STATE, type AppState, type Transition } from "@/lib/domain/transitions";
import type { DateKey } from "@/lib/domain/types";

type Toast = { id: number; message: string };

// What the store needs from the server. Injected, so tests never touch the network.
export type QuestApi = {
  addQuest: (input: NewQuestInput, id: string, today: DateKey) => Promise<void>;
  checkIn: (id: string, today: DateKey) => Promise<void>;
  restore: (id: string, today: DateKey) => Promise<void>;
  restart: (id: string, today: DateKey) => Promise<void>;
  hold: (id: string, today: DateKey) => Promise<void>;
  resume: (id: string, today: DateKey) => Promise<void>;
  edit: (id: string, patch: QuestPatch, today: DateKey) => Promise<void>;
  remove: (id: string) => Promise<void>;
  load: () => Promise<AppState>;
};

export type QuestState = AppState & {
  ready: boolean; // false until the saved quests have been loaded
  toast: Toast | null;
  today: () => DateKey;
  hydrate: (state: AppState) => void;
  connect: (api: QuestApi) => void;
  addQuest: (input: NewQuestInput) => void;
  checkInQuest: (id: string) => void;
  restoreStreak: (id: string) => void;
  restartQuest: (id: string) => void;
  holdQuest: (id: string) => void;
  resumeQuest: (id: string) => void;
  editQuest: (id: string, patch: QuestPatch) => void;
  deleteQuest: (id: string) => void;
  resync: (conflict: boolean) => Promise<void>;
  notify: (message: string) => void;
  dismissToast: () => void;
};

const browserToday = () => todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);

export const createQuestStore = (today: () => DateKey = browserToday, initialApi?: QuestApi) =>
  create<QuestState>()((set, get) => {
    let api = initialApi;
    let toastSeq = 0;
    const toast = (message: string): Toast => ({ id: ++toastSeq, message });

    const snapshot = (): AppState => {
      const { quests, restores, trophies } = get();
      return { quests, restores, trophies };
    };

    // A save failed: trust the server, or fall back to what we had before the change.
    async function recover(server: QuestApi, fallback: AppState) {
      try {
        const fresh = await server.load();
        set({ ...fresh, toast: toast("Couldn't save that, so we refreshed from the server") });
      } catch {
        set({ ...fallback, toast: toast("Couldn't save that. Check your connection") });
      }
    }

    // Shows the change on screen straight away, then saves it in the background.
    function apply(step: (s: AppState) => Transition, save?: (server: QuestApi) => Promise<void>) {
      const before = snapshot();
      const { state, message } = step(before); // throws when the change isn't allowed
      set({ ...state, ...(message ? { toast: toast(message) } : {}) });

      const server = api;
      if (server && save) save(server).catch(() => recover(server, before));
    }

    // Same, but a change that isn't allowed (a double click, say) is silently ignored.
    function tryApply(step: (s: AppState) => Transition, save?: (server: QuestApi) => Promise<void>) {
      try {
        apply(step, save);
      } catch {
        // ignored on purpose
      }
    }

    return {
      ...EMPTY_STATE,
      ready: false,
      toast: null,
      today,

      hydrate: (state) => set({ ...state, ready: true }),
      connect: (server) => {
        api = server;
      },

      addQuest: (input) => {
        // Throws on invalid input; the modal shows the message.
        const now = today();
        const id = crypto.randomUUID();
        apply(
          (s) => moves.addQuest(s, input, now, id),
          (server) => server.addQuest(input, id, now),
        );
      },

      checkInQuest: (id) => {
        const now = today();
        tryApply(
          (s) => moves.checkInQuest(s, id, now),
          (server) => server.checkIn(id, now),
        );
      },

      restoreStreak: (id) => {
        const now = today();
        tryApply(
          (s) => moves.restoreStreak(s, id, now),
          (server) => server.restore(id, now),
        );
      },

      restartQuest: (id) => {
        const now = today();
        tryApply(
          (s) => moves.restartQuest(s, id, now),
          (server) => server.restart(id, now),
        );
      },

      holdQuest: (id) => {
        const now = today();
        tryApply(
          (s) => moves.holdQuest(s, id, now),
          (server) => server.hold(id, now),
        );
      },

      resumeQuest: (id) => {
        const now = today();
        tryApply(
          (s) => moves.resumeQuest(s, id, now),
          (server) => server.resume(id, now),
        );
      },

      // Throws when the change isn't allowed; the edit dialog shows the message.
      editQuest: (id, patch) => {
        const now = today();
        apply(
          (s) => moves.editQuest(s, id, patch, now),
          (server) => server.edit(id, patch, now),
        );
      },

      deleteQuest: (id) =>
        tryApply(
          (s) => moves.deleteQuest(s, id),
          (server) => server.remove(id),
        ),

      // After queued offline changes have been sent: show what the server really has.
      // Only says something when a queued change had to be dropped.
      resync: async (conflict) => {
        const server = api;
        if (!server) return;
        try {
          const fresh = await server.load();
          set({
            ...fresh,
            ...(conflict
              ? { toast: toast("Some changes made offline couldn't be saved, so we refreshed") }
              : {}),
          });
        } catch {
          // keep what's on screen; the next visit refreshes it
        }
      },

      notify: (message) => set({ toast: toast(message) }),

      dismissToast: () => set({ toast: null }),
    };
  });

export const useQuestStore = createQuestStore();
