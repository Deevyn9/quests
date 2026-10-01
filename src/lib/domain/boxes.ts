import { addDays, daysBetween } from "./dates";
import { isSkipped } from "./quest";
import type { DateKey, Quest } from "./types";

export type BoxState = "checked" | "restored" | "skipped" | "today" | "upcoming" | "missed";
export type Box = { date: DateKey; state: BoxState };

const INFINITE_WINDOW_DAYS = 14;

function datesFor(q: Quest, today: DateKey): DateKey[] {
  if (q.kind === "fixed" && q.durationDays !== null) {
    return Array.from({ length: q.durationDays }, (_, i) => addDays(q.startDate, i));
  }
  // Infinite quests show a rolling window ending today
  const windowStart = addDays(today, -(INFINITE_WINDOW_DAYS - 1));
  const start = windowStart > q.startDate ? windowStart : q.startDate;
  return Array.from({ length: Math.max(0, daysBetween(start, today) + 1) }, (_, i) =>
    addDays(start, i),
  );
}

function stateOf(q: Quest, date: DateKey, today: DateKey): BoxState {
  if (q.checkIns.includes(date)) return "checked";
  if (q.restoredDates.includes(date)) return "restored";
  if (isSkipped(q, date)) return "skipped";
  if (date === today) return "today";
  if (date > today) return "upcoming";
  return "missed";
}

export function boxesFor(q: Quest, today: DateKey): Box[] {
  return datesFor(q, today).map((date) => ({ date, state: stateOf(q, date, today) }));
}