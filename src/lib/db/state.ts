import type { Quest } from "@/lib/domain/types"
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { AppState, Transition } from "@/lib/domain/transitions";
import { diffState, type Changes, type DayKind } from "./diff";
import { db } from "./index";
import { questDays, quests, trophies, users } from "./schema";

// Either the main connection or a transaction; both can run these queries.
type Executor = Pick<typeof db, "select" | "insert" | "update" | "delete">;

type QuestRecord = typeof quests.$inferSelect;
type DayRecord = typeof questDays.$inferSelect;
type TrophyRecord = typeof trophies.$inferSelect;

export async function loadState(ex: Executor, userId: string): Promise<AppState> {
  const [user] = await ex
    .select({ restores: users.restores })
    .from(users)
    .where(eq(users.id, userId));

  const questRows: QuestRecord[] = await ex
    .select()
    .from(quests)
    .where(eq(quests.userId, userId))
    .orderBy(desc(quests.lastActivityAt), desc(quests.createdAt));

  const ids = questRows.map((q) => q.id);
  const dayRows: DayRecord[] = ids.length
    ? await ex.select().from(questDays).where(inArray(questDays.questId, ids))
    : [];

  const trophyRows: TrophyRecord[] = await ex
    .select()
    .from(trophies)
    .where(eq(trophies.userId, userId));

  return {
    quests: questRows.map((q) => {
      const days = dayRows.filter((d) => d.questId === q.id);
      const pick = (kind: DayKind) =>
        days
          .filter((d) => d.kind === kind)
          .map((d) => d.date)
          .sort();

      return {
        id: q.id,
        title: q.title,
        kind: q.kind,
        durationDays: q.durationDays,
        startDate: q.startDate,
        checkIns: pick("checked"),
        restoredDates: pick("restored"),
        skipWeekdays: q.skipWeekdays,
        skippedDates: pick("skipped"),
      };
    }),
    restores: user?.restores ?? 0,
    trophies: Object.fromEntries(trophyRows.map((t) => [t.key, t.earnedOn])),
  };
}

async function saveChanges(ex: Executor, userId: string, c: Changes, now: Date) {
  if (c.insertQuests.length) {
    await ex.insert(quests).values(
      c.insertQuests.map((q: Quest) => ({
        id: q.id,
        userId,
        title: q.title,
        kind: q.kind,
        durationDays: q.durationDays,
        startDate: q.startDate,
        skipWeekdays: q.skipWeekdays,
        lastActivityAt: now,
      })),
    );
  }

  for (const q of c.updateQuests) {
    await ex
      .update(quests)
      .set({
        title: q.title,
        kind: q.kind,
        durationDays: q.durationDays,
        startDate: q.startDate,
        skipWeekdays: q.skipWeekdays,
      })
      .where(and(eq(quests.id, q.id), eq(quests.userId, userId)));
  }

  if (c.bumpQuestIds.length) {
    await ex
      .update(quests)
      .set({ lastActivityAt: now })
      .where(and(inArray(quests.id, c.bumpQuestIds), eq(quests.userId, userId)));
  }

  if (c.deleteQuestIds.length) {
    await ex
      .delete(quests)
      .where(and(inArray(quests.id, c.deleteQuestIds), eq(quests.userId, userId)));
  }

  if (c.upsertDays.length) {
    await ex
      .insert(questDays)
      .values(c.upsertDays)
      .onConflictDoUpdate({
        target: [questDays.questId, questDays.date],
        set: { kind: sql`excluded.kind` },
      });
  }

  const doomed = new Map<string, string[]>();
  for (const d of c.deleteDays) doomed.set(d.questId, [...(doomed.get(d.questId) ?? []), d.date]);
  for (const [questId, dates] of doomed) {
    await ex
      .delete(questDays)
      .where(and(eq(questDays.questId, questId), inArray(questDays.date, dates)));
  }

  if (c.restores !== null) {
    await ex.update(users).set({ restores: c.restores }).where(eq(users.id, userId));
  }

  if (c.newTrophies.length) {
    await ex
      .insert(trophies)
      .values(c.newTrophies.map((t: { key: string; earnedOn: string }) => ({ userId, ...t })))
      .onConflictDoNothing();
  }
}

// Load -> apply the shared transition -> save only what changed, all in one transaction.
// The row lock makes two devices acting at once take turns instead of clashing.
export async function mutateState(userId: string, step: (s: AppState) => Transition) {
  await db.transaction(async (tx) => {
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
    const before = await loadState(tx, userId);
    const { state: after } = step(before);
    await saveChanges(tx, userId, diffState(before, after), new Date());
  });
}