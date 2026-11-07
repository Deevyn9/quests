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

  describe("start date", () => {
    it("can start in the future", () => {
      const q = createQuest({ ...input, startDate: "2026-09-04" }, "2026-09-01", "id1");
      expect(q.startDate).toBe("2026-09-04");
    });

    it("starts today when no date is given", () => {
      expect(createQuest(input, "2026-09-01", "id1").startDate).toBe("2026-09-01");
    });

    it("rejects a start in the past", () => {
      expect(() => createQuest({ ...input, startDate: "2026-08-31" }, "2026-09-01", "id1")).toThrow(/past/i);
    });

    it("rejects a start more than a year ahead", () => {
      expect(() => createQuest({ ...input, startDate: "2027-09-02" }, "2026-09-01", "id1")).toThrow(/within 365/);
      expect(createQuest({ ...input, startDate: "2027-09-01" }, "2026-09-01", "id1").startDate).toBe("2027-09-01");
    });

    it.each(["tomorrow", "2026-9-4", "2026-02-31", "", 5])("rejects %j as a start date", (bad) => {
      expect(() => createQuest({ ...input, startDate: bad as never }, "2026-09-01", "id1")).toThrow(/invalid/i);
    });

    it("treats a missing or null start date as today", () => {
      expect(createQuest({ ...input, startDate: null as never }, "2026-09-01", "id1").startDate).toBe("2026-09-01");
    });

    it("checks for a scheduled day from the start date, not from today", () => {
      // 1 Sep 2026 is a Tuesday; a 1-day quest on Tuesdays that skips Tuesdays is impossible,
      // but starting on Wednesday makes it fine.
      const skipTuesday = { ...input, durationDays: 1, skipWeekdays: [2] };
      expect(() => createQuest({ ...skipTuesday, startDate: "2026-09-08" }, "2026-09-01", "id1")).toThrow(/skipped/i);
      expect(createQuest({ ...skipTuesday, startDate: "2026-09-02" }, "2026-09-01", "id1").startDate).toBe("2026-09-02");
    });
  });
});
