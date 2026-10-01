import { describe, expect, it } from "vitest";
import { boxesFor } from "./boxes";
import { makeQuest } from "./fixtures";

describe("boxesFor", () => {
  it("lays out one box per day of a fixed quest", () => {
    const q = makeQuest({ durationDays: 3, checkIns: ["2026-09-01"] });
    expect(boxesFor(q, "2026-09-02")).toEqual([
      { date: "2026-09-01", state: "checked" },
      { date: "2026-09-02", state: "today" },
      { date: "2026-09-03", state: "upcoming" },
    ]);
  });

  it("marks days that were missed", () => {
    const q = makeQuest({ durationDays: 3, checkIns: ["2026-09-01"] });
    expect(boxesFor(q, "2026-09-03").map((b) => b.state)).toEqual(["checked", "missed", "today"]);
  });

  it("marks restored and skipped days", () => {
    const q = makeQuest({
      startDate: "2026-09-04", // Friday
      durationDays: 3,
      skipWeekdays: [0, 6],
    });
    expect(boxesFor(q, "2026-09-04").map((b) => b.state)).toEqual(["today", "skipped", "skipped"]);
  });

  it("shows a rolling 14-day window for infinite quests", () => {
    const q = makeQuest({ kind: "infinite", durationDays: null, startDate: "2026-09-01" });
    const boxes = boxesFor(q, "2026-09-30");
    expect(boxes).toHaveLength(14);
    expect(boxes[0].date).toBe("2026-09-17");
    expect(boxes[13]).toEqual({ date: "2026-09-30", state: "today" });
  });

  it("starts at the start date when an infinite quest is new", () => {
    const q = makeQuest({ kind: "infinite", durationDays: null, startDate: "2026-09-28" });
    expect(boxesFor(q, "2026-09-30")).toHaveLength(3);
  });
});