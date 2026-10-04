import { describe, expect, it } from "vitest";
import { makeQuest } from "./fixtures";
import { longestStreak } from "./quest";

describe("longestStreak", () => {
  it("is 0 for a quest with no check-ins", () => {
    expect(longestStreak(makeQuest())).toBe(0);
  });

  it("finds the longest run, not the latest", () => {
    const q = makeQuest({
      checkIns: ["2026-09-01", "2026-09-02", "2026-09-04", "2026-09-05", "2026-09-06"],
    });
    expect(longestStreak(q)).toBe(3);
  });

  it("bridges skipped weekdays", () => {
    const q = makeQuest({
      skipWeekdays: [0, 6],
      checkIns: ["2026-09-03", "2026-09-04", "2026-09-07"], // Thu, Fri, Mon
    });
    expect(longestStreak(q)).toBe(3);
  });

  it("counts restored days as part of the run", () => {
    const q = makeQuest({
      checkIns: ["2026-09-01", "2026-09-03"],
      restoredDates: ["2026-09-02"],
    });
    expect(longestStreak(q)).toBe(3);
  });
});