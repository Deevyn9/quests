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

export function isSkipped(q: Quest, day: DateKey): boolean {
  return q.skipWeekdays.includes(weekdayOf(day)) || q.skippedDates.includes(day);
}

export function isPaused(q: Quest, day: DateKey): boolean {
  return (q.pausedFrom !== null && day >= q.pausedFrom) || q.pausedDates.includes(day);
}

// A day that is neither required nor missed.
function isOff(q: Quest, day: DateKey): boolean {
  return isSkipped(q, day) || isPaused(q, day);
}

function lastCovered(q: Quest): DateKey {
  const days = [...coveredDays(q)].sort();
  return days.length ? days[days.length - 1] : addDays(q.startDate, -1);
}

// Off days are bridged: they neither add to the streak nor break it.
function streakOf(q: Quest): number {
  const covered = coveredDays(q);
  let cursor = lastCovered(q);
  let streak = 0;
  while (cursor >= q.startDate) {
    if (covered.has(cursor)) streak++;
    else if (!isOff(q, cursor)) break;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// The longest run of covered days over the life of the quest.
export function longestStreak(q: Quest): number {
  const covered = coveredDays(q);
  const last = lastCovered(q);
  let best = 0;
  let run = 0;
  for (let d = q.startDate; d <= last; d = addDays(d, 1)) {
    if (covered.has(d)) {
      run++;
      best = Math.max(best, run);
    } else if (!isOff(q, d)) {
      run = 0;
    }
  }
  return best;
}

// Days after the last covered day and before today that were not off days.
function missedDayList(q: Quest, today: DateKey): DateKey[] {
  const missed: DateKey[] = [];
  for (let d = addDays(lastCovered(q), 1); d < today; d = addDays(d, 1)) {
    if (!isOff(q, d)) missed.push(d);
  }
  return missed;
}

// The calendar days a fixed quest runs over. Held days don't use up the length.
// While on hold the window is shorter than the quest, until it is resumed.
export function windowDays(q: Quest): DateKey[] {
  if (q.kind !== "fixed" || q.durationDays === null) return [];
  const days: DateKey[] = [];
  let d = q.startDate;
  while (days.length < q.durationDays) {
    if (q.pausedFrom !== null && d >= q.pausedFrom) break;
    if (!q.pausedDates.includes(d)) days.push(d);
    d = addDays(d, 1);
  }
  return days;
}

function isCompleted(q: Quest): boolean {
  if (q.kind !== "fixed" || q.durationDays === null) return false;
  const days = windowDays(q);
  if (days.length < q.durationDays) return false; // still has held days to make up
  const covered = coveredDays(q);
  const scheduled = days.filter((d) => !isSkipped(q, d));
  return scheduled.length > 0 && scheduled.every((d) => covered.has(d));
}

export function getStatus(q: Quest, today: DateKey): QuestStatus {
  const streak = streakOf(q);
  if (isCompleted(q)) return { state: "completed", streak };
  // On hold from the moment a hold is set, even if it only starts tomorrow
  // (when today was already checked in).
  if (q.pausedFrom !== null) return { state: "paused", streak };

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

export function holdQuest(q: Quest, today: DateKey): Quest {
  if (getStatus(q, today).state !== "active") {
    throw new Error("Only an active quest can be put on hold");
  }
  // Already checked in today? The hold starts tomorrow, so today's check-in stands.
  const from = coveredDays(q).has(today) ? addDays(today, 1) : today;
  return { ...q, pausedFrom: from };
}

export function resumeQuest(q: Quest, today: DateKey): Quest {
  if (q.pausedFrom === null) throw new Error("Quest is not on hold");
  const held: DateKey[] = [];
  for (let d = q.pausedFrom; d < today; d = addDays(d, 1)) held.push(d);
  return { ...q, pausedFrom: null, pausedDates: [...q.pausedDates, ...held] };
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
  return {
    ...q,
    startDate: today,
    checkIns: [],
    restoredDates: [],
    skippedDates: [],
    pausedFrom: null,
    pausedDates: [],
  };
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