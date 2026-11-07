import { addDays, daysBetween } from "./dates";
import { isSkipped } from "./quest";
import type { DateKey, Quest, QuestKind } from "./types";

export type NewQuestInput = {
  title: string;
  kind: QuestKind;
  durationDays: number | null;
  skipWeekdays: number[];
  startDate?: DateKey;
};

export const MAX_DURATION_DAYS = 365;
export const MAX_START_AHEAD_DAYS = 365;

function assertStartDate(start: unknown, today: DateKey): asserts start is DateKey {
  const valid =
    typeof start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(start) && addDays(start, 0) === start;
  if (!valid) throw new Error("Invalid start date");
  const ahead = daysBetween(today, start);
  if (ahead < 0) throw new Error("A quest can't start in the past");
  if (ahead > MAX_START_AHEAD_DAYS) {
    throw new Error(`Start date must be within ${MAX_START_AHEAD_DAYS} days`);
  }
}

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

  const startDate = input.startDate ?? today;
assertStartDate(startDate, today);

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
    pausedFrom: null,
    pausedDates: [],
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