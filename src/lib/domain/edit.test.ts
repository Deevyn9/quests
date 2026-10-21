import { describe, expect, it } from "vitest";
import { daysSoFar, editQuest } from "./edit";
import { makeQuest } from "./fixtures";
import { getStatus } from "./quest";

// 2026-09-01 is a Tuesday.
const active = (o = {}) => makeQuest({ checkIns: ["2026-09-01", "2026-09-02"], ...o });
const TODAY = "2026-09-02";

describe("editQuest: name", () => {
  it("trims and saves a new name", () => {
    expect(editQuest(active(), { title: "  Run  " }, TODAY).title).toBe("Run");
  });

  it("rejects an empty name", () => {
    expect(() => editQuest(active(), { title: "   " }, TODAY)).toThrow(/name/i);
  });

  it("returns the same quest when nothing changed", () => {
    const q = active();
    expect(editQuest(q, { title: "Read", durationDays: 7, skipWeekdays: [] }, TODAY)).toBe(q);
  });

  it("rejects fields it doesn't know", () => {
    expect(() => editQuest(active(), { startDate: "2020-01-01" } as never, TODAY)).toThrow(/invalid/i);
    expect(() => editQuest(active(), null as never, TODAY)).toThrow(/invalid/i);
  });

  it("rejects a name that isn't text", () => {
    expect(() => editQuest(active(), { title: 5 } as never, TODAY)).toThrow(/invalid/i);
  });
});

describe("editQuest: length", () => {
  it("extends a fixed quest", () => {
    const q = editQuest(active(), { durationDays: 14 }, TODAY);
    expect(q.durationDays).toBe(14);
    expect(q.kind).toBe("fixed");
  });

  it("turns a fixed quest into an infinite one and back", () => {
    const infinite = editQuest(active(), { durationDays: null }, TODAY);
    expect(infinite).toMatchObject({ kind: "infinite", durationDays: null });
    expect(editQuest(infinite, { durationDays: 10 }, TODAY)).toMatchObject({
      kind: "fixed",
      durationDays: 10,
    });
  });

  it("can't shorten below the days already used", () => {
    expect(() => editQuest(active(), { durationDays: 1 }, TODAY)).toThrow(/already 2 days in/);
    expect(editQuest(active(), { durationDays: 2 }, TODAY).durationDays).toBe(2);
  });

  it("rejects lengths outside 1 to 365", () => {
    expect(() => editQuest(active(), { durationDays: 366 }, TODAY)).toThrow(/between 1 and 365/);
    expect(() => editQuest(active(), { durationDays: 0 }, TODAY)).toThrow(/between 1 and 365/);
    expect(() => editQuest(active(), { durationDays: 2.5 }, TODAY)).toThrow(/between 1 and 365/);
  });

  it("doesn't count held days towards the length so far", () => {
    const q = makeQuest({ pausedDates: ["2026-09-02", "2026-09-03"] });
    expect(daysSoFar(q, "2026-09-04")).toBe(2);
    expect(daysSoFar(makeQuest({ pausedFrom: "2026-09-03" }), "2026-09-05")).toBe(2);
  });
});

describe("editQuest: skip days", () => {
  it("adds a skipped weekday", () => {
    expect(editQuest(active(), { skipWeekdays: [0, 6] }, TODAY).skipWeekdays).toEqual([0, 6]);
  });

  it("keeps earlier skipped days skipped when a weekday is no longer skipped", () => {
    // Wed 2 Sep was skipped, so the streak runs through it.
    const q = makeQuest({
      skipWeekdays: [3],
      checkIns: ["2026-09-01", "2026-09-03"],
    });
    const today = "2026-09-04";
    expect(getStatus(q, today)).toMatchObject({ state: "active", streak: 2 });

    const edited = editQuest(q, { skipWeekdays: [] }, today);
    expect(edited.skipWeekdays).toEqual([]);
    expect(edited.skippedDates).toEqual(["2026-09-02"]);
    expect(getStatus(edited, today)).toMatchObject({ state: "active", streak: 2 });
  });

  it("can't skip every day of the week", () => {
    expect(() => editQuest(active(), { skipWeekdays: [0, 1, 2, 3, 4, 5, 6] }, TODAY)).toThrow(
      /every day of the week/i,
    );
  });

  it("rejects an invalid weekday", () => {
    expect(() => editQuest(active(), { skipWeekdays: [9] }, TODAY)).toThrow(/weekday/i);
    expect(() => editQuest(active(), { skipWeekdays: "x" } as never, TODAY)).toThrow(/weekday/i);
  });

  it("rejects a schedule where every day would be skipped", () => {
    const q = makeQuest({ durationDays: 1, checkIns: [] });
    expect(() => editQuest(q, { skipWeekdays: [2] }, "2026-09-01")).toThrow(/would be skipped/i);
  });
});

describe("editQuest: which quests can be rescheduled", () => {
  const broken = makeQuest({ checkIns: ["2026-09-01"] }); // missed the 2nd
  const lapsed = makeQuest({ checkIns: ["2026-09-01"] });
  const done = makeQuest({ durationDays: 2, checkIns: ["2026-09-01", "2026-09-02"] });

  it("blocks schedule changes on a broken or lapsed quest, but not the name", () => {
    expect(getStatus(broken, "2026-09-03").state).toBe("broken");
    expect(() => editQuest(broken, { skipWeekdays: [0] }, "2026-09-03")).toThrow(/restore or restart/i);
    expect(() => editQuest(lapsed, { durationDays: 30 }, "2026-09-10")).toThrow(/restore or restart/i);
    expect(editQuest(broken, { title: "Run" }, "2026-09-03").title).toBe("Run");
  });

  it("blocks schedule changes on a completed quest, but not the name", () => {
    expect(getStatus(done, "2026-09-02").state).toBe("completed");
    expect(() => editQuest(done, { durationDays: 5 }, "2026-09-02")).toThrow(/completed/i);
    expect(editQuest(done, { title: "Run" }, "2026-09-02").title).toBe("Run");
  });

  it("ignores values that match what is already saved, even on a broken quest", () => {
    expect(editQuest(broken, { durationDays: 7, skipWeekdays: [] }, "2026-09-03")).toBe(broken);
  });

  it("works on a quest that is on hold", () => {
    const held = active({ pausedFrom: "2026-09-03" });
    expect(editQuest(held, { durationDays: 10 }, "2026-09-04").durationDays).toBe(10);
  });
});
