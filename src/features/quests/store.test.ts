import { describe, expect, it, vi } from "vitest";
import { getStatus } from "@/lib/domain/quest";
import { createQuestStore, type QuestApi } from "./store";

const input = { title: "Read", kind: "fixed" as const, durationDays: 7, skipWeekdays: [] };

const makeApi = (over: Partial<QuestApi> = {}): QuestApi => ({
  addQuest: vi.fn().mockResolvedValue(undefined),
  checkIn: vi.fn().mockResolvedValue(undefined),
  restore: vi.fn().mockResolvedValue(undefined),
  restart: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
  load: vi.fn().mockResolvedValue({ quests: [], restores: 0, trophies: {} }),
  ...over,
});

function setup(start = "2026-09-01", api?: QuestApi) {
  let day = start;
  const store = createQuestStore(() => day, api);
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

describe("loading", () => {
  it("shows loaded quests and becomes ready", () => {
    const { store } = setup();
    expect(store.getState().ready).toBe(false);

    store.getState().hydrate({ quests: [], restores: 3, trophies: {} });

    expect(store.getState().ready).toBe(true);
    expect(store.getState().restores).toBe(3);
  });
});

describe("saving to the server", () => {
  it("sends a new quest with its id and today's date", () => {
    const api = makeApi();
    const { store } = setup("2026-09-01", api);

    store.getState().addQuest(input);

    expect(api.addQuest).toHaveBeenCalledWith(input, store.getState().quests[0].id, "2026-09-01");
  });

  it("sends a check-in once, and not for an ignored repeat", () => {
    const api = makeApi();
    const { store } = setup("2026-09-01", api);
    store.getState().addQuest(input);
    const id = store.getState().quests[0].id;

    store.getState().checkInQuest(id);
    store.getState().checkInQuest(id);

    expect(api.checkIn).toHaveBeenCalledTimes(1);
    expect(api.checkIn).toHaveBeenCalledWith(id, "2026-09-01");
  });

  it("refreshes from the server when a save fails", async () => {
    const api = makeApi({ checkIn: vi.fn().mockRejectedValue(new Error("nope")) });
    const { store } = setup("2026-09-01", api);
    store.getState().addQuest(input);
    const saved = store.getState().quests[0]; // what the server still has
    vi.mocked(api.load).mockResolvedValue({ quests: [saved], restores: 0, trophies: {} });

    store.getState().checkInQuest(saved.id);
    expect(store.getState().quests[0].checkIns).toHaveLength(1); // optimistic

    await vi.waitFor(() => expect(store.getState().toast?.message).toMatch(/refreshed/i));
    expect(store.getState().quests[0].checkIns).toEqual([]);
  });

  it("rolls back to the earlier state when the refresh fails too", async () => {
    const api = makeApi({
      checkIn: vi.fn().mockRejectedValue(new Error("offline")),
      load: vi.fn().mockRejectedValue(new Error("offline")),
    });
    const { store } = setup("2026-09-01", api);
    store.getState().addQuest(input);
    const id = store.getState().quests[0].id;

    store.getState().checkInQuest(id);

    await vi.waitFor(() => expect(store.getState().toast?.message).toMatch(/connection/i));
    expect(store.getState().quests[0].checkIns).toEqual([]);
  });
});