import { create } from "zustand";
import { createQuest, type NewQuestInput } from "@/lib/domain/create";
import { todayIn } from "@/lib/domain/dates";
import * as domain from "@/lib/domain/quest";
import { INFINITE_REWARD_EVERY, type DateKey, type Quest } from "@/lib/domain/types";

type Toast = { id: number; message: string };

export type QuestState = {
  quests: Quest[]; // display order: most recent activity first
  restores: number;
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

    return {
      quests: [],
      restores: 0,
      toast: null,
      today,

      addQuest: (input) => {
        // Throws on invalid input; the modal shows the message.
        const quest = createQuest(input, today(), crypto.randomUUID());
        set((s) => ({ quests: [quest, ...s.quests] }));
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

        set((s) => ({
          quests: moveToTop(s.quests, updated),
          restores: s.restores + earned,
          toast: toast(message),
        }));
      },

      restoreStreak: (id) => {
        const quest = find(id);
        if (!quest) return;
        try {
          const result = domain.restoreQuest(quest, today(), get().restores);
          set((s) => ({
            quests: replace(s.quests, result.quest),
            restores: result.restores,
            toast: toast("Streak restored"),
          }));
        } catch {
          return; // lapsed, or no restores left
        }
      },

      restartQuest: (id) => {
        const quest = find(id);
        if (!quest) return;
        set((s) => ({
          quests: replace(s.quests, domain.restartQuest(quest, today())),
          toast: toast("Fresh start"),
        }));
      },

      deleteQuest: (id) => set((s) => ({ quests: s.quests.filter((q) => q.id !== id) })),

      dismissToast: () => set({ toast: null }),
    };
  });

export const useQuestStore = createQuestStore();