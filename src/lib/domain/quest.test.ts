import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import {
  checkIn,
  getStatus,
  restartQuest,
  restoreQuest,
  restoresEarnedOnCheckIn,
  skipDay,
} from "./quest";
import type { Quest } from "./types";

const make = (o: Partial<Quest> = {}): Quest => ({
  id: "q1",
  title: "Read",
  kind: "fixed",
  durationDays: 7,
  startDate: "2026-09-01",
  checkIns: [],
  restoredDates: [],
  skipWeekdays: [],
  skippedDates: [],
  ...o,
});

const run = (start: string, n: number) =>
  Array.from({ length: n }, (_, i) => addDays(start, i));

describe("getStatus", () => {
  it("is active with streak 0 on the day it starts", () => {
    expect(getStatus(make(), "2026-09-01")).toEqual({ state: "active", streak: 0 });
  });

  it("builds a streak from consecutive check-ins", () => {
    const q = make({ checkIns: run("2026-09-01", 3) });
    expect(getStatus(q, "2026-09-04")).toEqual({ state: "active", streak: 3 });
  });

  it("breaks when a full day is missed", () => {
    const q = make({ checkIns: ["2026-09-01", "2026-09-02"] });
    expect(getStatus(q, "2026-09-04")).toEqual({
      state: "broken",
      streak: 2,
      missedDays: 1,
    });
  });

  it("is still restorable at 3 missed days", () => {
    const q = make({ checkIns: ["2026-09-01"] });
    expect(getStatus(q, "2026-09-05").state).toBe("broken");
  });

  it("lapses at 4 missed days", () => {
    const q = make({ checkIns: ["2026-09-01"] });
    expect(getStatus(q, "2026-09-06")).toEqual({ state: "lapsed", missedDays: 4 });
  });

  it("completes a fixed quest once every day is covered", () => {
    const q = make({ durationDays: 3, checkIns: run("2026-09-01", 3) });
    expect(getStatus(q, "2026-09-03").state).toBe("completed");
  });
});

describe("checkIn", () => {
  it("records today", () => {
    expect(checkIn(make(), "2026-09-01").checkIns).toEqual(["2026-09-01"]);
  });

  it("rejects a second check-in on the same day", () => {
    const q = checkIn(make(), "2026-09-01");
    expect(() => checkIn(q, "2026-09-01")).toThrow();
  });

  it("rejects a check-in on a broken quest", () => {
    const q = make({ checkIns: ["2026-09-01"] });
    expect(() => checkIn(q, "2026-09-04")).toThrow();
  });
});

describe("restoreQuest", () => {
  const broken = make({ checkIns: ["2026-09-01"] });

  it("forgives missed days, spends one restore, and keeps the streak", () => {
    const { quest, restores } = restoreQuest(broken, "2026-09-04", 1);
    expect(quest.restoredDates).toEqual(["2026-09-02", "2026-09-03"]);
    expect(restores).toBe(0);
    expect(getStatus(quest, "2026-09-04")).toEqual({ state: "active", streak: 3 });
  });

  it("needs a restore in the balance", () => {
    expect(() => restoreQuest(broken, "2026-09-04", 0)).toThrow();
  });

  it("refuses once the quest has lapsed", () => {
    expect(() => restoreQuest(broken, "2026-09-06", 5)).toThrow();
  });
});

describe("restartQuest", () => {
  it("wipes progress and starts today", () => {
    const q = restartQuest(make({ checkIns: ["2026-09-01"] }), "2026-09-10");
    expect(q.startDate).toBe("2026-09-10");
    expect(q.checkIns).toEqual([]);
    expect(q.restoredDates).toEqual([]);
  });
});

describe("restoresEarnedOnCheckIn", () => {
  it("rewards finishing a fixed quest", () => {
    const q = make({ durationDays: 3, checkIns: run("2026-09-01", 3) });
    expect(restoresEarnedOnCheckIn(q, "2026-09-03")).toBe(1);
  });

  it("gives nothing mid-way through a fixed quest", () => {
    const q = make({ checkIns: run("2026-09-01", 3) });
    expect(restoresEarnedOnCheckIn(q, "2026-09-03")).toBe(0);
  });

  it("rewards every 25th day of an infinite quest", () => {
    const base = { kind: "infinite" as const, durationDays: null };
    const day25 = make({ ...base, checkIns: run("2026-09-01", 25) });
    const day24 = make({ ...base, checkIns: run("2026-09-01", 24) });
    expect(restoresEarnedOnCheckIn(day25, "2026-09-25")).toBe(1);
    expect(restoresEarnedOnCheckIn(day24, "2026-09-24")).toBe(0);
  });
});

describe("skipped days", () => {
  const weekends = [0, 6];

  it("bridges skipped weekdays without breaking the streak", () => {
    const q = make({
      skipWeekdays: weekends,
      checkIns: ["2026-09-03", "2026-09-04", "2026-09-07"], // Thu, Fri, Mon
    });
    expect(getStatus(q, "2026-09-07")).toEqual({ state: "active", streak: 3 });
  });

  it("does not count skipped days as missed", () => {
    const q = make({ skipWeekdays: weekends, checkIns: ["2026-09-04"] }); // Fri
    expect(getStatus(q, "2026-09-07").state).toBe("active");
  });

  it("still counts non-skipped days as missed", () => {
    const q = make({ skipWeekdays: weekends, checkIns: ["2026-09-04"] });
    expect(getStatus(q, "2026-09-09")).toEqual({
      state: "broken",
      streak: 1,
      missedDays: 2, // Mon + Tue
    });
  });

  it("supports one-off skips", () => {
    const q = skipDay(make({ checkIns: ["2026-09-01"] }), "2026-09-02", "2026-09-02");
    expect(getStatus(q, "2026-09-03")).toEqual({ state: "active", streak: 1 });
  });

  it("rejects skipping a past day", () => {
    expect(() => skipDay(make(), "2026-09-01", "2026-09-03")).toThrow();
  });

  it("rejects skipping a day that is already checked in", () => {
    const q = make({ checkIns: ["2026-09-01"] });
    expect(() => skipDay(q, "2026-09-01", "2026-09-01")).toThrow();
  });

  it("restores only the non-skipped missed days", () => {
    const q = make({ skipWeekdays: weekends, checkIns: ["2026-09-04"] });
    const { quest } = restoreQuest(q, "2026-09-09", 1);
    expect(quest.restoredDates).toEqual(["2026-09-07", "2026-09-08"]);
    expect(getStatus(quest, "2026-09-09")).toEqual({ state: "active", streak: 3 });
  });

  it("completes a fixed quest when every non-skipped day in the window is done", () => {
    const q = make({
      startDate: "2026-09-07", // Monday, 7-day window ending Sunday
      skipWeekdays: weekends,
      checkIns: ["2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11"],
    });
    expect(getStatus(q, "2026-09-11").state).toBe("completed");
  });
});