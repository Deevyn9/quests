import { describe, expect, it } from "vitest";
import { makeQuest } from "./fixtures";
import {
  addQuest,
  checkInQuest,
  deleteQuest,
  EMPTY_STATE,
  holdQuest,
  resumeQuest,
  type AppState,
} from "./transitions";

const input = { title: "Read", kind: "fixed" as const, durationDays: 7, skipWeekdays: [] };

const withOneQuest = () => addQuest(EMPTY_STATE, input, "2026-09-01", "id1").state;

describe("toast messages", () => {
  it("names the quest when it is created", () => {
    const { message } = addQuest(EMPTY_STATE, input, "2026-09-01", "id1");
    expect(message).toContain('"Read" quest created');
  });

  it("names the quest on check-in", () => {
    const { message } = checkInQuest(withOneQuest(), "id1", "2026-09-01");
    expect(message).toContain('"Read" checked in');
  });

  it("names the quest when holding and resuming", () => {
    const held = holdQuest(withOneQuest(), "id1", "2026-09-01");
    expect(held.message).toBe('"Read" quest on hold');
    expect(resumeQuest(held.state, "id1", "2026-09-01").message).toBe('"Read" quest resumed');
  });

  it("names the quest when it is deleted", () => {
    expect(deleteQuest(withOneQuest(), "id1").message).toBe('"Read" quest deleted');
  });
});

describe("transitions", () => {
  it("announces a trophy when the first quest is created", () => {
    const { state, message } = addQuest(EMPTY_STATE, input, "2026-09-01", "id1");
    expect(message).toMatch(/first steps/i);
    expect(state.trophies).toHaveProperty("first-quest", "2026-09-01");
  });

  it("rejects a check-in on a quest that does not exist", () => {
    expect(() => checkInQuest(EMPTY_STATE, "nope", "2026-09-01")).toThrow(/not found/i);
  });

  it("keeps trophies when a quest is deleted", () => {
    const after = deleteQuest(withOneQuest(), "id1").state;
    expect(after.quests).toEqual([]);
    expect(after.trophies).toHaveProperty("first-quest");
  });
});

describe("trophy rewards", () => {
  const earnedSoFar = { "first-quest": "2026-09-01", "first-check-in": "2026-09-01" };

  it("pays no restores for the starter trophies", () => {
    expect(withOneQuest().restores).toBe(0);
  });

  it("pays a restore when a streak trophy unlocks", () => {
    const state: AppState = {
      ...EMPTY_STATE,
      quests: [makeQuest({ durationDays: 30, checkIns: ["2026-09-01", "2026-09-02"] })],
      trophies: earnedSoFar,
    };

    const { state: after, message } = checkInQuest(state, "q1", "2026-09-03");

    expect(after.trophies).toHaveProperty("streak-3", "2026-09-03");
    expect(after.restores).toBe(1);
    expect(message).toContain("(+1 restore)");
  });

  it("adds up the rewards when several trophies unlock at once", () => {
    const state: AppState = {
      ...EMPTY_STATE,
      quests: [
        makeQuest({
          durationDays: 30,
          checkIns: ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"],
        }),
      ],
      trophies: earnedSoFar,
    };

    const { state: after, message } = checkInQuest(state, "q1", "2026-09-05");

    expect(after.trophies).toHaveProperty("streak-3");
    expect(after.trophies).toHaveProperty("streak-5");
    expect(after.restores).toBe(2);
    expect(message).toContain("(+2 restores)");
  });

  it("pays each trophy only once", () => {
    const state: AppState = {
      ...EMPTY_STATE,
      quests: [makeQuest({ durationDays: 30, checkIns: ["2026-09-01", "2026-09-02"] })],
      trophies: { ...earnedSoFar, "streak-3": "2026-09-03" },
      restores: 1,
    };

    const { state: after } = checkInQuest(state, "q1", "2026-09-03");

    expect(after.restores).toBe(1);
  });
});