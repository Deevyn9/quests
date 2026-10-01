import { describe, expect, it } from "vitest";
import { createQuest, type NewQuestInput } from "./create";

const input: NewQuestInput = {
  title: "Read",
  kind: "fixed",
  durationDays: 7,
  skipWeekdays: [],
};

describe("createQuest", () => {
  it("trims the title and starts today", () => {
    const q = createQuest({ ...input, title: "  Read  " }, "2026-09-01", "id1");
    expect(q.title).toBe("Read");
    expect(q.startDate).toBe("2026-09-01");
    expect(q.checkIns).toEqual([]);
  });

  it("rejects a blank title", () => {
    expect(() => createQuest({ ...input, title: "   " }, "2026-09-01", "id1")).toThrow(/name/i);
  });

  it("forces infinite quests to have no duration", () => {
    const q = createQuest({ ...input, kind: "infinite", durationDays: 30 }, "2026-09-01", "id1");
    expect(q.durationDays).toBeNull();
  });

  it.each([0, 1.5, 400, null])("rejects a fixed duration of %s", (days) => {
    expect(() => createQuest({ ...input, durationDays: days }, "2026-09-01", "id1")).toThrow();
  });

  it("dedupes and sorts skipped weekdays", () => {
    const q = createQuest({ ...input, skipWeekdays: [6, 0, 6] }, "2026-09-01", "id1");
    expect(q.skipWeekdays).toEqual([0, 6]);
  });

  it("rejects skipping all 7 weekdays", () => {
    const all = [0, 1, 2, 3, 4, 5, 6];
    expect(() => createQuest({ ...input, skipWeekdays: all }, "2026-09-01", "id1")).toThrow();
  });

  it("rejects a quest where every day would be skipped", () => {
    // 2026-09-06 is a Sunday, so a 1-day quest started then has no scheduled day
    expect(() =>
      createQuest({ ...input, durationDays: 1, skipWeekdays: [0, 6] }, "2026-09-06", "id1"),
    ).toThrow(/skipped/i);
  });
});