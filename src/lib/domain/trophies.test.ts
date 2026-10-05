import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import { makeQuest } from "./fixtures";
import { newlyEarned, TROPHIES } from "./trophies";

const keys = (trophies: { key: string }[]) => trophies.map((t) => t.key);
const run = (start: string, n: number) =>
  Array.from({ length: n }, (_, i) => addDays(start, i));

describe("trophy catalog", () => {
  it("has unique keys", () => {
    expect(new Set(TROPHIES.map((t) => t.key)).size).toBe(TROPHIES.length);
  });

  it("only pays whole, non-negative restore rewards", () => {
    for (const t of TROPHIES) {
      expect(Number.isInteger(t.restores)).toBe(true);
      expect(t.restores).toBeGreaterThanOrEqual(0);
    }
  });

  it("pays more for harder milestones", () => {
    const reward = (key: string) => TROPHIES.find((t) => t.key === key)?.restores;
    expect(reward("streak-3")).toBe(1);
    expect(reward("streak-100")).toBe(5);
    expect(reward("complete-50")).toBe(3);
    expect(reward("day-10")).toBe(3);
  });
});

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

  it("awards every streak milestone reached", () => {
    const q = makeQuest({ durationDays: 30, checkIns: run("2026-09-01", 7) });
    expect(keys(newlyEarned([q], [], "2026-09-07"))).toEqual([
      "first-quest",
      "first-check-in",
      "streak-3",
      "streak-5",
      "streak-7",
    ]);
  });

  it("does not award a streak milestone early", () => {
    const q = makeQuest({ durationDays: 30, checkIns: run("2026-09-01", 6) });
    const earned = keys(newlyEarned([q], [], "2026-09-06"));
    expect(earned).toContain("streak-5");
    expect(earned).not.toContain("streak-7");
  });

  it("awards the completed quests ladder and same-day trophies together", () => {
    const done = (id: string) => makeQuest({ id, durationDays: 1, checkIns: ["2026-09-01"] });
    const quests = [done("a"), done("b"), done("c")];
    expect(keys(newlyEarned(quests, [], "2026-09-01"))).toEqual([
      "first-quest",
      "first-check-in",
      "first-complete",
      "complete-3",
      "day-2",
      "day-3",
    ]);
  });

  it("awards Double Up for checking in on two quests in one day", () => {
    const quests = [
      makeQuest({ id: "a", checkIns: ["2026-09-01"] }),
      makeQuest({ id: "b", checkIns: ["2026-09-01"] }),
    ];
    expect(keys(newlyEarned(quests, [], "2026-09-01"))).toEqual([
      "first-quest",
      "first-check-in",
      "day-2",
    ]);
  });

  it("does not count check-ins from other days towards the same-day trophies", () => {
    const quests = [
      makeQuest({ id: "a", checkIns: ["2026-09-01"] }),
      makeQuest({ id: "b", checkIns: ["2026-09-02"] }),
    ];
    expect(keys(newlyEarned(quests, [], "2026-09-02"))).not.toContain("day-2");
  });

  it("never re-awards a trophy that was already earned", () => {
    const q = makeQuest({ checkIns: ["2026-09-01"] });
    const earned = ["first-quest", "first-check-in"];
    expect(newlyEarned([q], earned, "2026-09-01")).toEqual([]);
  });
});