import { describe, expect, it } from "vitest";
import { plural, summarizeCompleted } from "./describe";
import { makeQuest } from "./fixtures";

describe("summarizeCompleted", () => {
  it("summarises a finished quest with skipped weekends", () => {
    const q = makeQuest({
      startDate: "2026-09-07", // Monday
      durationDays: 7,
      skipWeekdays: [0, 6],
      checkIns: ["2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11"],
    });
    expect(summarizeCompleted(q)).toEqual({
      length: "7 days",
      skips: "Skips Sat, Sun",
      started: "2026-09-07",
      finished: "2026-09-11",
      checkIns: 5,
      restoredDays: 0,
      heldDays: 0,
      skippedDays: 2,
      bestStreak: 5,
    });
  });

  it("counts restored days", () => {
    const q = makeQuest({
      durationDays: 4,
      checkIns: ["2026-09-01", "2026-09-03", "2026-09-04"],
      restoredDates: ["2026-09-02"],
    });
    expect(summarizeCompleted(q)).toMatchObject({ restoredDays: 1, bestStreak: 4 });
  });

  it("counts days spent on hold", () => {
    const q = makeQuest({
      durationDays: 2,
      checkIns: ["2026-09-01", "2026-09-04"],
      pausedDates: ["2026-09-02", "2026-09-03"],
    });
    expect(summarizeCompleted(q)).toMatchObject({
      heldDays: 2,
      skippedDays: 0,
      finished: "2026-09-04",
    });
  });
});

describe("plural", () => {
  it("only adds an s when it should", () => {
    expect(plural(1, "check-in")).toBe("1 check-in");
    expect(plural(3, "check-in")).toBe("3 check-ins");
    expect(plural(0, "day")).toBe("0 days");
  });
});