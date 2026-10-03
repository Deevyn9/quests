import type { AppState } from "@/lib/domain/transitions";
import type { DateKey, Quest } from "@/lib/domain/types";

export type DayKind = "checked" | "restored" | "skipped";
export type DayRow = { questId: string; date: DateKey; kind: DayKind };

export type Changes = {
  insertQuests: Quest[];
  updateQuests: Quest[];
  deleteQuestIds: string[];
  bumpQuestIds: string[]; // existing quests that moved to the top of the list
  upsertDays: DayRow[];
  deleteDays: { questId: string; date: DateKey }[];
  restores: number | null; // new balance, or null when unchanged
  newTrophies: { key: string; earnedOn: DateKey }[];
};

// One row per date in the database, so a date can only have one kind.
// If a one-off skipped day gets checked in, "checked" wins.
function dayMap(q: Quest): Map<DateKey, DayKind> {
  const map = new Map<DateKey, DayKind>();
  for (const d of q.skippedDates) map.set(d, "skipped");
  for (const d of q.restoredDates) map.set(d, "restored");
  for (const d of q.checkIns) map.set(d, "checked");
  return map;
}

const rowFields = (q: Quest) =>
  JSON.stringify([
    q.title,
    q.kind,
    q.durationDays,
    q.startDate,
    q.skipWeekdays,
    q.pausedFrom,
    q.pausedDates,
  ]);

export function diffState(before: AppState, after: AppState): Changes {
  const changes: Changes = {
    insertQuests: [],
    updateQuests: [],
    deleteQuestIds: [],
    bumpQuestIds: [],
    upsertDays: [],
    deleteDays: [],
    restores: after.restores !== before.restores ? after.restores : null,
    newTrophies: Object.entries(after.trophies)
      .filter(([key]) => !(key in before.trophies))
      .map(([key, earnedOn]) => ({ key, earnedOn })),
  };

  const beforeById = new Map(before.quests.map((q) => [q.id, q]));
  const afterIds = new Set(after.quests.map((q) => q.id));

  for (const quest of after.quests) {
    const old = beforeById.get(quest.id);
    const oldDays = old ? dayMap(old) : new Map<DateKey, DayKind>();
    const newDays = dayMap(quest);

    if (!old) changes.insertQuests.push(quest);
    else {
      if (rowFields(old) !== rowFields(quest)) changes.updateQuests.push(quest);
      if (quest.checkIns.length > old.checkIns.length) changes.bumpQuestIds.push(quest.id);
    }

    for (const [date, kind] of newDays) {
      if (oldDays.get(date) !== kind) changes.upsertDays.push({ questId: quest.id, date, kind });
    }
    for (const date of oldDays.keys()) {
      if (!newDays.has(date)) changes.deleteDays.push({ questId: quest.id, date });
    }
  }

  changes.deleteQuestIds = before.quests.filter((q) => !afterIds.has(q.id)).map((q) => q.id);
  return changes;
}