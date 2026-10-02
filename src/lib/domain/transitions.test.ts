import { describe, expect, it } from "vitest";
import { addQuest, checkInQuest, deleteQuest, EMPTY_STATE } from "./transitions";

const input = { title: "Read", kind: "fixed" as const, durationDays: 7, skipWeekdays: [] };

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
    const { state } = addQuest(EMPTY_STATE, input, "2026-09-01", "id1");
    const after = deleteQuest(state, "id1").state;
    expect(after.quests).toEqual([]);
    expect(after.trophies).toHaveProperty("first-quest");
  });
});