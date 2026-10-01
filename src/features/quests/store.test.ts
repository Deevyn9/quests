import { describe, expect, it } from "vitest";
import { getStatus } from "@/lib/domain/quest";
import { createQuestStore } from "./store";

const input = { title: "Read", kind: "fixed" as const, durationDays: 7, skipWeekdays: [] };

function setup(start = "2026-09-01") {
  let day = start;
  const store = createQuestStore(() => day);
  return { store, setDay: (d: string) => (day = d) };
}

describe("quest store", () => {
  it("puts new quests on top", () => {
    const { store } = setup();
    store.getState().addQuest({ ...input, title: "A" });
    store.getState().addQuest({ ...input, title: "B" });
    expect(store.getState().quests.map((q) => q.title)).toEqual(["B", "A"]);
  });

  it("moves a checked-in quest back to the top and shows a toast", () => {
    const { store } = setup();
    store.getState().addQuest({ ...input, title: "A" });
    store.getState().addQuest({ ...input, title: "B" });
    const a = store.getState().quests[1];

    store.getState().checkInQuest(a.id);

    expect(store.getState().quests.map((q) => q.title)).toEqual(["A", "B"]);
    expect(store.getState().quests[0].checkIns).toEqual(["2026-09-01"]);
    expect(store.getState().toast?.message).toMatch(/checked in/i);
  });

  it("ignores a second check-in on the same day", () => {
    const { store } = setup();
    store.getState().addQuest(input);
    const id = store.getState().quests[0].id;
    store.getState().checkInQuest(id);
    store.getState().checkInQuest(id);
    expect(store.getState().quests[0].checkIns).toHaveLength(1);
  });

  it("earns a restore when a fixed quest is completed", () => {
    const { store } = setup();
    store.getState().addQuest({ ...input, durationDays: 1 });
    store.getState().checkInQuest(store.getState().quests[0].id);
    expect(store.getState().restores).toBe(1);
    expect(store.getState().toast?.message).toMatch(/\+1 restore/);
  });

  it("spends a restore to repair a broken streak", () => {
    const { store, setDay } = setup();
    store.getState().addQuest(input);
    const id = store.getState().quests[0].id;
    store.getState().checkInQuest(id);
    setDay("2026-09-03"); // Sep 2 was missed
    store.setState({ restores: 1 });

    store.getState().restoreStreak(id);

    expect(store.getState().restores).toBe(0);
    expect(getStatus(store.getState().quests[0], "2026-09-03")).toEqual({
      state: "active",
      streak: 2,
    });
  });

  it("does nothing when there are no restores to spend", () => {
    const { store, setDay } = setup();
    store.getState().addQuest(input);
    const id = store.getState().quests[0].id;
    store.getState().checkInQuest(id);
    setDay("2026-09-03");

    store.getState().restoreStreak(id);

    expect(store.getState().quests[0].restoredDates).toEqual([]);
  });

  it("restarts a quest from today", () => {
    const { store, setDay } = setup();
    store.getState().addQuest(input);
    const id = store.getState().quests[0].id;
    store.getState().checkInQuest(id);
    setDay("2026-09-10");

    store.getState().restartQuest(id);

    expect(store.getState().quests[0].startDate).toBe("2026-09-10");
    expect(store.getState().quests[0].checkIns).toEqual([]);
  });

  it("deletes a quest", () => {
    const { store } = setup();
    store.getState().addQuest(input);
    store.getState().deleteQuest(store.getState().quests[0].id);
    expect(store.getState().quests).toEqual([]);
  });
});

describe("trophies", () => {
  it("unlocks First Steps when the first quest is created", () => {
    const { store } = setup();
    store.getState().addQuest(input);
    expect(store.getState().trophies).toHaveProperty("first-quest", "2026-09-01");
    expect(store.getState().toast?.message).toMatch(/first steps/i);
  });

  it("keeps a trophy after the quest that earned it is deleted", () => {
    const { store } = setup();
    store.getState().addQuest(input);
    store.getState().deleteQuest(store.getState().quests[0].id);
    expect(store.getState().trophies).toHaveProperty("first-quest");
  });

  it("unlocks Week Warrior on a 7-day streak", () => {
    const { store, setDay } = setup();
    store.getState().addQuest({ ...input, durationDays: 30 });
    const id = store.getState().quests[0].id;

    for (let d = 1; d <= 7; d++) {
      setDay(`2026-09-0${d}`);
      store.getState().checkInQuest(id);
    }

    expect(store.getState().trophies).toHaveProperty("streak-7");
  });
});