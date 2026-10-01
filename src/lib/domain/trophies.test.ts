import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import { makeQuest } from "./fixtures";
import { newlyEarned } from "./trophies";

const keys = (trophies: { key: string }[]) => trophies.map((t) => t.key);
const run = (start: string, n: number) =>
  Array.from({ length: n }, (_, i) => addDays(start, i));

describe("newlyEarned", () => {
  it("awards nothing when there are no quests", () => {
    expect(newlyEarned([], [], "2026-09-01")).toEqual([]);
  });

  it("awards First Steps for the first quest", () => {
    expect(keys(newlyEarned([makeQuest()], [], "2026-09-01"))).toEqual(["first-quest"]);
  });

  it("awards Off the Mark for the first check-in", () => {
    const q = makeQuest({ checkIns: ["2026-09-01"] });
    expect(keys(newlyEarned([q], [], "2026-09-01"))).toEqual(["first-quest", "first-check-in"]);
  });

  it("awards Second Wind once a restore has been used", () => {
    const q = makeQuest({ checkIns: ["2026-09-01"], restoredDates: ["2026-09-02"] });
    expect(keys(newlyEarned([q], [], "2026-09-03"))).toContain("first-restore");
  });

  it("awards Quest Complete when a fixed quest is finished", () => {
    const q = makeQuest({ durationDays: 1, checkIns: ["2026-09-01"] });
    expect(keys(newlyEarned([q], [], "2026-09-01"))).toContain("first-complete");
  });

  it("awards Week Warrior at a 7-day streak", () => {
    const q = makeQuest({ durationDays: 30, checkIns: run("2026-09-01", 7) });
    expect(keys(newlyEarned([q], [], "2026-09-07"))).toEqual([
      "first-quest",
      "first-check-in",
      "streak-7",
    ]);
  });

  it("does not award Week Warrior at 6 days", () => {
    const q = makeQuest({ durationDays: 30, checkIns: run("2026-09-01", 6) });
    expect(keys(newlyEarned([q], [], "2026-09-06"))).not.toContain("streak-7");
  });

  it("never re-awards a trophy that was already earned", () => {
    const q = makeQuest({ checkIns: ["2026-09-01"] });
    const earned = ["first-quest", "first-check-in"];
    expect(newlyEarned([q], earned, "2026-09-01")).toEqual([]);
  });
});