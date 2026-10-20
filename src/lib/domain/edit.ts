import { MAX_DURATION_DAYS } from "./create";
import { addDays, weekdayOf } from "./dates";
import { getStatus, isSkipped } from "./quest";
import type { DateKey, Quest } from "./types";

// Only the fields that changed are sent. A missing field means "leave it as it is".
export type QuestPatch = {
  title?: string;
  skipWeekdays?: number[];
  durationDays?: number | null; // a number makes it a fixed quest, null makes it infinite
};

const KNOWN = ["title", "skipWeekdays", "durationDays"];

function cleanWeekdays(days: unknown): number[] {
  if (!Array.isArray(days)) throw new Error("Invalid weekday");
  const unique = [...new Set(days as unknown[])];
  if (unique.some((d) => typeof d !== "number" || !Number.isInteger(d) || d < 0 || d > 6)) {
    throw new Error("Invalid weekday");
  }
  if (unique.length === 7) throw new Error("You can't skip every day of the week");
  return (unique as number[]).sort((a, b) => a - b);
}

// Days that count towards the quest's length so far. Held days don't count.
export function daysSoFar(q: Quest, today: DateKey): number {
  let n = 0;
  for (let d = q.startDate; d <= today; d = addDays(d, 1)) {
    if (q.pausedFrom !== null && d >= q.pausedFrom) break;
    if (!q.pausedDates.includes(d)) n++;
  }
  return n;
}

const sameList = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

// Applies a patch to one quest. Throws when the change isn't allowed; returns the very
// same object when nothing actually changed.
export function editQuest(q: Quest, patch: QuestPatch, today: DateKey): Quest {
  if (typeof patch !== "object" || patch === null || Array.isArray(patch)) {
    throw new Error("Invalid change");
  }
  if (Object.keys(patch).some((k) => !KNOWN.includes(k))) throw new Error("Invalid change");

  let next = q;

  if (patch.title !== undefined) {
    if (typeof patch.title !== "string") throw new Error("Invalid name");
    const title = patch.title.trim();
    if (!title) throw new Error("Give your quest a name");
    if (title !== q.title) next = { ...next, title };
  }

  const skip = patch.skipWeekdays === undefined ? null : cleanWeekdays(patch.skipWeekdays);
  const skipChanged = skip !== null && !sameList(skip, q.skipWeekdays);

  let days: number | null | undefined;
  if (patch.durationDays !== undefined) {
    days = patch.durationDays;
    if (days !== null && (typeof days !== "number" || !Number.isInteger(days) || days < 1 || days > MAX_DURATION_DAYS)) {
      throw new Error(`Duration must be between 1 and ${MAX_DURATION_DAYS} days`);
    }
  }
  const durationChanged = days !== undefined && days !== q.durationDays;

  if (!skipChanged && !durationChanged) return next;

  // The name can always change. The schedule can only change while the quest is alive,
  // otherwise editing would be a way around restores and rewards.
  const status = getStatus(q, today);
  if (status.state === "completed") throw new Error("A completed quest can't be rescheduled");
  if (status.state === "broken" || status.state === "lapsed") {
    throw new Error("Restore or restart this quest before changing its schedule");
  }

  if (skipChanged && skip) {
    // Past days keep the way they were counted: a weekday you stop skipping must not
    // turn earlier skipped days into missed ones.
    const covered = new Set([...q.checkIns, ...q.restoredDates]);
    const kept = new Set(q.skippedDates);
    for (let d = q.startDate; d < today; d = addDays(d, 1)) {
      const wd = weekdayOf(d);
      if (q.skipWeekdays.includes(wd) && !skip.includes(wd) && !covered.has(d)) kept.add(d);
    }
    next = { ...next, skipWeekdays: skip, skippedDates: [...kept].sort() };
  }

  if (durationChanged) {
    if (days === null) {
      next = { ...next, kind: "infinite", durationDays: null };
    } else if (days !== undefined) {
      const so = daysSoFar(q, today);
      if (days < so) {
        throw new Error(`This quest is already ${so} ${so === 1 ? "day" : "days"} in. Pick ${so} or more`);
      }
      next = { ...next, kind: "fixed", durationDays: days };
    }
  }

  if (next.kind === "fixed" && next.durationDays !== null) {
    const stillScheduled = Array.from({ length: next.durationDays }, (_, i) =>
      addDays(next.startDate, i),
    ).some((d) => !isSkipped(next, d));
    if (!stillScheduled) throw new Error("Every day in this quest would be skipped");
  }

  return next;
}
