import { addDays, daysBetween, weekdayOf } from "./dates";
import {
  INFINITE_REWARD_EVERY,
  RESTORE_WINDOW_DAYS,
  type DateKey,
  type Quest,
  type QuestStatus,
} from "./types";

function coveredDays(q: Quest): Set<DateKey> {
  return new Set([...q.checkIns, ...q.restoredDates]);
}

function isSkipped(q: Quest, day: DateKey): boolean {
  return q.skipWeekdays.includes(weekdayOf(day)) || q.skippedDates.includes(day);
}

function lastCovered(q: Quest): DateKey {
  const days = [...coveredDays(q)].sort();
  return days.length ? days[days.length - 1] : addDays(q.startDate, -1);
}

// Skipped days are bridged: they neither add to the streak nor break it.
function streakOf(q: Quest): number {
  const covered = coveredDays(q);
  let cursor = lastCovered(q);
  let streak = 0;
  while (cursor >= q.startDate) {
    if (covered.has(cursor)) streak++;
    else if (!isSkipped(q, cursor)) break;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// Days after the last covered day and before today that were NOT skipped.
function missedDayList(q: Quest, today: DateKey): DateKey[] {
  const last = lastCovered(q);
  const missed: DateKey[] = [];
  for (let d = addDays(last, 1); d < today; d = addDays(d, 1)) {
    if (!isSkipped(q, d)) missed.push(d);
  }
  return missed;
}

function isCompleted(q: Quest): boolean {
  if (q.kind !== "fixed" || q.durationDays === null) return false;
  const covered = coveredDays(q);
  const scheduled = Array.from({ length: q.durationDays }, (_, i) =>
    addDays(q.startDate, i),
  ).filter((d) => !isSkipped(q, d));
  return scheduled.length > 0 && scheduled.every((d) => covered.has(d));
}

export function getStatus(q: Quest, today: DateKey): QuestStatus {
  const streak = streakOf(q);
  if (isCompleted(q)) return { state: "completed", streak };

  const missedDays = missedDayList(q, today).length;
  if (missedDays === 0) return { state: "active", streak };
  if (missedDays <= RESTORE_WINDOW_DAYS) return { state: "broken", streak, missedDays };
  return { state: "lapsed", missedDays };
}

export function checkIn(q: Quest, today: DateKey): Quest {
  if (getStatus(q, today).state !== "active") {
    throw new Error("Quest is not active");
  }
  if (coveredDays(q).has(today)) {
    throw new Error("Already checked in today");
  }
  return { ...q, checkIns: [...q.checkIns, today] };
}

export function skipDay(q: Quest, day: DateKey, today: DateKey): Quest {
  if (daysBetween(today, day) < 0) throw new Error("Cannot skip a past day");
  if (getStatus(q, today).state !== "active") throw new Error("Quest is not active");
  if (coveredDays(q).has(day)) throw new Error("Day is already checked in");
  if (q.skippedDates.includes(day)) return q;
  return { ...q, skippedDates: [...q.skippedDates, day] };
}

export function restoreQuest(
  q: Quest,
  today: DateKey,
  restores: number,
): { quest: Quest; restores: number } {
  const status = getStatus(q, today);
  if (status.state !== "broken") throw new Error("Quest cannot be restored");
  if (restores < 1) throw new Error("No restores left");

  return {
    quest: { ...q, restoredDates: [...q.restoredDates, ...missedDayList(q, today)] },
    restores: restores - 1,
  };
}

export function restartQuest(q: Quest, today: DateKey): Quest {
  return { ...q, startDate: today, checkIns: [], restoredDates: [], skippedDates: [] };
}

// Call this with the quest as it is *after* checkIn().
export function restoresEarnedOnCheckIn(q: Quest, today: DateKey): number {
  const status = getStatus(q, today);
  if (q.kind === "fixed") return status.state === "completed" ? 1 : 0;
  return status.state === "active" &&
    status.streak > 0 &&
    status.streak % INFINITE_REWARD_EVERY === 0
    ? 1
    : 0;
}