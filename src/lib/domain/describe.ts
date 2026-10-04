import { infiniteDays } from "./boxes";
import { WEEKDAY_SHORT } from "./dates";
import { isSkipped, longestStreak, windowDays } from "./quest";
import type { DateKey, Quest, QuestStatus } from "./types";

const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];

// How a quest card should look:
//   frozen      on hold                                       -> blue
//   recoverable broken, and a streak restore is available     -> grey
//   dead        broken with no restores, or past the window   -> red
export type Tone = "normal" | "frozen" | "recoverable" | "dead";

export function toneFor(status: QuestStatus, restores: number): Tone {
  switch (status.state) {
    case "paused":
      return "frozen";
    case "broken":
      return restores > 0 ? "recoverable" : "dead";
    case "lapsed":
      return "dead";
    default:
      return "normal";
  }
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function lengthLabel(q: Quest): string {
  if (q.kind === "infinite" || q.durationDays === null) return "Infinite";
  return q.durationDays === 1 ? "1 day" : `${q.durationDays} days`;
}

export function skipLabel(q: Quest): string | null {
  const names = MONDAY_FIRST.filter((d) => q.skipWeekdays.includes(d)).map(
    (d) => WEEKDAY_SHORT[d],
  );
  return names.length ? `Skips ${names.join(", ")}` : null;
}

export function progressLabel(q: Quest, today: DateKey): string {
  if (q.kind === "infinite" || q.durationDays === null) {
    return `Day ${Math.max(1, infiniteDays(q, today).length)}`;
  }
  const reached = windowDays(q).filter((d) => d <= today).length;
  return `Day ${Math.min(q.durationDays, Math.max(1, reached))} of ${q.durationDays}`;
}

export function titleFor(name: string | null): string {
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${first}'s quests` : "My quests";
}

export type CompletedSummary = {
  length: string;
  skips: string | null;
  started: DateKey;
  finished: DateKey;
  checkIns: number;
  restoredDays: number;
  heldDays: number;
  skippedDays: number;
  bestStreak: number;
};

// Everything the "Completed quests" list shows about a finished quest.
export function summarizeCompleted(q: Quest): CompletedSummary {
  const covered = [...q.checkIns, ...q.restoredDates].sort();
  return {
    length: lengthLabel(q),
    skips: skipLabel(q),
    started: q.startDate,
    finished: covered[covered.length - 1] ?? q.startDate,
    checkIns: q.checkIns.length,
    restoredDays: q.restoredDates.length,
    heldDays: q.pausedDates.length,
    skippedDays: windowDays(q).filter((d) => isSkipped(q, d)).length,
    bestStreak: longestStreak(q),
  };
}