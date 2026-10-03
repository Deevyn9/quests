import { addDays, weekdayShort } from "./dates";
import { isSkipped, windowDays } from "./quest";
import type { DateKey, Quest } from "./types";

export type BoxState = "checked" | "restored" | "skipped" | "today" | "upcoming" | "missed";

// `date` is null for days that don't have a calendar date yet (the rest of a held quest).
export type Box = { date: DateKey | null; day: number; weekday: string | null; state: BoxState };

export const PAGE_SIZE = 28;
const INFINITE_WINDOW_DAYS = 14;

function stateOf(q: Quest, date: DateKey, today: DateKey): BoxState {
  if (q.checkIns.includes(date)) return "checked";
  if (q.restoredDates.includes(date)) return "restored";
  if (isSkipped(q, date)) return "skipped";
  if (date === today) return "today";
  if (date > today) return "upcoming";
  return "missed";
}

const makeBox = (q: Quest, date: DateKey, day: number, today: DateKey): Box => ({
  date,
  day,
  weekday: weekdayShort(date),
  state: stateOf(q, date, today),
});

// Every day of an infinite quest up to today, leaving out held days.
export function infiniteDays(q: Quest, today: DateKey): DateKey[] {
  const end =
    q.pausedFrom !== null && q.pausedFrom <= today ? addDays(q.pausedFrom, -1) : today;
  const days: DateKey[] = [];
  for (let d = q.startDate; d <= end; d = addDays(d, 1)) {
    if (!q.pausedDates.includes(d)) days.push(d);
  }
  return days;
}

// Long quests show one page of boxes: the one holding today.
function pageAround(boxes: Box[], today: DateKey): Box[] {
  if (boxes.length <= PAGE_SIZE) return boxes;

  let current = boxes.findIndex((b) => b.date !== null && b.date >= today);
  if (current === -1) {
    current = 0;
    boxes.forEach((b, i) => {
      if (b.date !== null) current = i;
    });
  }
  const start = Math.floor(current / PAGE_SIZE) * PAGE_SIZE;
  return boxes.slice(start, start + PAGE_SIZE);
}

export function boxesFor(q: Quest, today: DateKey): Box[] {
  if (q.kind === "infinite" || q.durationDays === null) {
    return infiniteDays(q, today)
      .map((date, i) => makeBox(q, date, i + 1, today))
      .slice(-INFINITE_WINDOW_DAYS);
  }

  const days = windowDays(q);
  const boxes = days.map((date, i) => makeBox(q, date, i + 1, today));
  // On hold, the rest of the quest has no dates yet.
  for (let i = days.length; i < q.durationDays; i++) {
    boxes.push({ date: null, day: i + 1, weekday: null, state: "upcoming" });
  }
  return pageAround(boxes, today);
}