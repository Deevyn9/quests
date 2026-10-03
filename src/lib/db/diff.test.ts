import { describe, expect, it } from "vitest";
import { makeQuest } from "@/lib/domain/fixtures";
import type { AppState } from "@/lib/domain/transitions";
import type { Quest } from "@/lib/domain/types";
import { diffState, type Changes } from "./diff";

const NONE: Changes = {
  insertQuests: [],
  updateQuests: [],
  deleteQuestIds: [],
  bumpQuestIds: [],
  upsertDays: [],
  deleteDays: [],
  restores: null,
  newTrophies: [],
};

const state = (quests: Quest[] = [], over: Partial<AppState> = {}): AppState => ({
  quests,
  restores: 0,
  trophies: {},
  ...over,
});

describe("diffState", () => {
  it("reports nothing when the state is unchanged", () => {
    const s = state([makeQuest()]);
    expect(diffState(s, s)).toEqual(NONE);
  });

  it("inserts a new quest", () => {
    const q = makeQuest();
    expect(diffState(state(), state([q]))).toEqual({ ...NONE, insertQuests: [q] });
  });

  it("records a check-in as a day and bumps the quest to the top", () => {
    const before = makeQuest();
    const after = makeQuest({ checkIns: ["2026-09-01"] });
    expect(diffState(state([before]), state([after]))).toEqual({
      ...NONE,
      bumpQuestIds: ["q1"],
      upsertDays: [{ questId: "q1", date: "2026-09-01", kind: "checked" }],
    });
  });

  it("records a restore as restored days and a lower balance", () => {
    const before = makeQuest({ checkIns: ["2026-09-01"] });
    const after = makeQuest({ checkIns: ["2026-09-01"], restoredDates: ["2026-09-02"] });
    expect(diffState(state([before], { restores: 1 }), state([after], { restores: 0 }))).toEqual({
      ...NONE,
      restores: 0,
      upsertDays: [{ questId: "q1", date: "2026-09-02", kind: "restored" }],
    });
  });

  it("clears days and updates the start date on restart, without bumping", () => {
    const before = makeQuest({ checkIns: ["2026-09-01"] });
    const after = makeQuest({ startDate: "2026-09-10" });
    expect(diffState(state([before]), state([after]))).toEqual({
      ...NONE,
      updateQuests: [after],
      deleteDays: [{ questId: "q1", date: "2026-09-01" }],
    });
  });

  it("updates the quest row when it is put on hold", () => {
    const before = makeQuest();
    const after = makeQuest({ pausedFrom: "2026-09-02" });
    expect(diffState(state([before]), state([after]))).toEqual({ ...NONE, updateQuests: [after] });
  });

  it("deletes a quest", () => {
    expect(diffState(state([makeQuest()]), state())).toEqual({ ...NONE, deleteQuestIds: ["q1"] });
  });

  it("turns a checked-in one-off skip day into a single checked row", () => {
    const before = makeQuest({ skippedDates: ["2026-09-01"] });
    const after = makeQuest({ skippedDates: ["2026-09-01"], checkIns: ["2026-09-01"] });
    expect(diffState(state([before]), state([after]))).toEqual({
      ...NONE,
      bumpQuestIds: ["q1"],
      upsertDays: [{ questId: "q1", date: "2026-09-01", kind: "checked" }],
    });
  });

  it("reports newly earned trophies only", () => {
    const before = state([], { trophies: { "first-quest": "2026-09-01" } });
    const after = state([], { trophies: { "first-quest": "2026-09-01", "streak-7": "2026-09-07" } });
    expect(diffState(before, after).newTrophies).toEqual([
      { key: "streak-7", earnedOn: "2026-09-07" },
    ]);
  });
});