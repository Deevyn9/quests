import { describe, expect, it } from "vitest";
import { makeQuest } from "./fixtures";
import { checkIn, getStatus, holdQuest, restartQuest, resumeQuest } from "./quest";

describe("holdQuest", () => {
  it("freezes an active quest from today", () => {
    const held = holdQuest(makeQuest({ checkIns: ["2026-09-01"] }), "2026-09-02");
    expect(held.pausedFrom).toBe("2026-09-02");
    expect(getStatus(held, "2026-09-05")).toEqual({ state: "paused", streak: 1 });
  });

  it("starts tomorrow when today is already checked in", () => {
    const held = holdQuest(makeQuest({ checkIns: ["2026-09-01"] }), "2026-09-01");
    expect(held.pausedFrom).toBe("2026-09-02");
    expect(getStatus(held, "2026-09-01")).toEqual({ state: "active", streak: 1 });
  });

  it("refuses to hold a broken quest", () => {
    const q = makeQuest({ checkIns: ["2026-09-01"] });
    expect(() => holdQuest(q, "2026-09-03")).toThrow();
  });

  it("blocks check-ins while on hold", () => {
    const held = holdQuest(makeQuest(), "2026-09-01");
    expect(() => checkIn(held, "2026-09-01")).toThrow();
  });
});

describe("resumeQuest", () => {
  it("does not count held days as missed and keeps the streak going", () => {
    const held = holdQuest(makeQuest({ checkIns: ["2026-09-01"] }), "2026-09-02");
    const resumed = resumeQuest(held, "2026-09-06");

    expect(resumed.pausedFrom).toBeNull();
    expect(resumed.pausedDates).toEqual([
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
    ]);
    expect(getStatus(resumed, "2026-09-06")).toEqual({ state: "active", streak: 1 });

    const next = checkIn(resumed, "2026-09-06");
    expect(getStatus(next, "2026-09-06")).toEqual({ state: "active", streak: 2 });
  });

  it("rejects resuming a quest that is not on hold", () => {
    expect(() => resumeQuest(makeQuest(), "2026-09-02")).toThrow();
  });

  it("is cleared by a restart", () => {
    const q = restartQuest(holdQuest(makeQuest(), "2026-09-01"), "2026-09-10");
    expect(q.pausedFrom).toBeNull();
    expect(q.pausedDates).toEqual([]);
  });
});

describe("holds and fixed quests", () => {
  const held = ["2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05"];

  it("makes up the days it was on hold", () => {
    const q = makeQuest({
      durationDays: 3,
      pausedDates: held,
      checkIns: ["2026-09-01", "2026-09-06"],
    });
    expect(getStatus(q, "2026-09-06").state).toBe("active");

    const done = { ...q, checkIns: [...q.checkIns, "2026-09-07"] };
    expect(getStatus(done, "2026-09-07").state).toBe("completed");
  });

  it("is not complete while the quest is still on hold", () => {
    const q = makeQuest({
      durationDays: 3,
      checkIns: ["2026-09-01", "2026-09-02"],
      pausedFrom: "2026-09-03",
    });
    expect(getStatus(q, "2026-09-04").state).toBe("paused");
  });
});