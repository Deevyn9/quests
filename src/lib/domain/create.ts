import { addDays } from "./dates";
import { isSkipped } from "./quest";
import type { DateKey, Quest, QuestKind } from "./types";

export type NewQuestInput = {
  title: string;
  kind: QuestKind;
  durationDays: number | null;
  skipWeekdays: number[];
};

export const MAX_DURATION_DAYS = 365;

export function createQuest(input: NewQuestInput, today: DateKey, id: string): Quest {
  const title = input.title.trim();
  if (!title) throw new Error("Give your quest a name");

  const skipWeekdays = [...new Set(input.skipWeekdays)].sort((a, b) => a - b);
  if (skipWeekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    throw new Error("Invalid weekday");
  }
  if (skipWeekdays.length === 7) {
    throw new Error("You can't skip every day of the week");
  }

  const quest: Quest = {
    id,
    title,
    kind: input.kind,
    durationDays: null,
    startDate: today,
    checkIns: [],
    restoredDates: [],
    skipWeekdays,
    skippedDates: [],
  };

  if (input.kind === "infinite") return quest;

  const days = input.durationDays;
  if (days === null || !Number.isInteger(days) || days < 1 || days > MAX_DURATION_DAYS) {
    throw new Error(`Duration must be between 1 and ${MAX_DURATION_DAYS} days`);
  }

  // A quest whose every day is skipped could never be completed.
  const hasScheduledDay = Array.from({ length: days }, (_, i) =>
    addDays(today, i),
  ).some((d) => !isSkipped(quest, d));
  if (!hasScheduledDay) throw new Error("Every day in this quest would be skipped");

  return { ...quest, durationDays: days };
}