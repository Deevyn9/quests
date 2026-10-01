import { create } from "zustand";
import { createQuest, type NewQuestInput } from "@/lib/domain/create";
import { todayIn } from "@/lib/domain/dates";
import * as domain from "@/lib/domain/quest";
import { newlyEarned } from "@/lib/domain/trophies";
import { INFINITE_REWARD_EVERY, type DateKey, type Quest } from "@/lib/domain/types";

type Toast = { id: number; message: string };

export type QuestState = {
  quests: Quest[]; // display order: most recent activity first
  restores: number;
  trophies: Record<string, DateKey>; // trophy key -> day it was earned
  toast: Toast | null;
  today: () => DateKey;
  addQuest: (input: NewQuestInput) => void;
  checkInQuest: (id: string) => void;
  restoreStreak: (id: string) => void;
  restartQuest: (id: string) => void;
  deleteQuest: (id: string) => void;
  dismissToast: () => void;
};

const browserToday = () => todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);

export const createQuestStore = (today: () => DateKey = browserToday) =>
  create<QuestState>()((set, get) => {
    let toastSeq = 0;
    const toast = (message: string): Toast => ({ id: ++toastSeq, message });
    const find = (id: string) => get().quests.find((q) => q.id === id);
    const replace = (quests: Quest[], updated: Quest) =>
      quests.map((q) => (q.id === updated.id ? updated : q));
    const moveToTop = (quests: Quest[], updated: Quest) => [
      updated,
      ...quests.filter((q) => q.id !== updated.id),
    ];

    // Works out any newly unlocked trophies and builds the matching state + toast.
    const grant = (s: QuestState, quests: Quest[], now: DateKey, message: string | null) => {
      const earned = newlyEarned(quests, Object.keys(s.trophies), now);
      const trophies = { ...s.trophies };
      for (const t of earned) trophies[t.key] = now;

      const names = earned.map((t) => t.title).join(", ");
      const text = earned.length
        ? message
          ? `${message} · Trophy: ${names}`
          : `Trophy unlocked: ${names}`
        : message;

      return { trophies, ...(text ? { toast: toast(text) } : {}) };
    };

    return {
      quests: [],
      restores: 0,
      trophies: {},
      toast: null,
      today,

      addQuest: (input) => {
        // Throws on invalid input; the modal shows the message.
        const now = today();
        const quest = createQuest(input, now, crypto.randomUUID());
        set((s) => {
          const quests = [quest, ...s.quests];
          return { quests, ...grant(s, quests, now, null) };
        });
      },

      checkInQuest: (id) => {
        const quest = find(id);
        if (!quest) return;
        const now = today();

        let updated: Quest;
        try {
          updated = domain.checkIn(quest, now);
        } catch {
          return; // not active, or already checked in today
        }

        const earned = domain.restoresEarnedOnCheckIn(updated, now);
        const message =
          earned === 0
            ? "Checked in. Nice one!"
            : updated.kind === "fixed"
              ? "Quest complete! +1 restore"
              : `${INFINITE_REWARD_EVERY}-day streak! +1 restore`;

        set((s) => {
          const quests = moveToTop(s.quests, updated);
          return {
            quests,
            restores: s.restores + earned,
            ...grant(s, quests, now, message),
          };
        });
      },

      restoreStreak: (id) => {
        const quest = find(id);
        if (!quest) return;
        const now = today();
        try {
          const result = domain.restoreQuest(quest, now, get().restores);
          set((s) => {
            const quests = replace(s.quests, result.quest);
            return {
              quests,
              restores: result.restores,
              ...grant(s, quests, now, "Streak restored"),
            };
          });
        } catch {
          return; // lapsed, or no restores left
        }
      },

      restartQuest: (id) => {
        const quest = find(id);
        if (!quest) return;
        const now = today();
        set((s) => {
          const quests = replace(s.quests, domain.restartQuest(quest, now));
          return { quests, ...grant(s, quests, now, "Fresh start") };
        });
      },

      deleteQuest: (id) => set((s) => ({ quests: s.quests.filter((q) => q.id !== id) })),

      dismissToast: () => set({ toast: null }),
    };
  });

export const useQuestStore = createQuestStore();