import { describe, expect, it } from "vitest";
import { addQuest, checkInQuest, deleteQuest, editQuest, EMPTY_STATE } from "./transitions";

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

  it("edits a quest and says so", () => {
    const { state } = addQuest(EMPTY_STATE, input, "2026-09-01", "id1");
    const result = editQuest(state, "id1", { title: "Read more", durationDays: 14 }, "2026-09-01");
    expect(result.message).toBe("Quest updated");
    expect(result.state.quests[0]).toMatchObject({ title: "Read more", durationDays: 14 });
  });

  it("stays quiet when an edit changes nothing", () => {
    const { state } = addQuest(EMPTY_STATE, input, "2026-09-01", "id1");
    const result = editQuest(state, "id1", { title: "Read" }, "2026-09-01");
    expect(result.message).toBeNull();
    expect(result.state).toBe(state);
  });

  it("rejects editing a quest that does not exist", () => {
    expect(() => editQuest(EMPTY_STATE, "nope", { title: "x" }, "2026-09-01")).toThrow(/not found/i);
  });
});
