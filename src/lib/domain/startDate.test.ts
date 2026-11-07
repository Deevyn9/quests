import { describe, expect, it } from "vitest";
import { boxesFor } from "./boxes";
import { createQuest, type NewQuestInput } from "./create";
import { progressLabel } from "./describe";
import { editQuest } from "./edit";
import { makeQuest } from "./fixtures";
import { checkIn, getStatus, holdQuest } from "./quest";
import { addQuest, checkInQuest, EMPTY_STATE } from "./transitions";
import { qualifyingTrophies } from "./trophies";

const input: NewQuestInput = { title: "Read", kind: "fixed", durationDays: 7, skipWeekdays: [] };

describe("createQuest: start date", () => {
  it("starts today when no date is given, and treats null the same", () => {
    expect(createQuest(input, "2026-09-01", "id1").startDate).toBe("2026-09-01");
    expect(createQuest({ ...input, startDate: null as never }, "2026-09-01", "id1").startDate).toBe("2026-09-01");
  });

  it("can start in the future", () => {
    expect(createQuest({ ...input, startDate: "2026-09-04" }, "2026-09-01", "id1").startDate).toBe("2026-09-04");
  });

  it("rejects a start in the past", () => {
    expect(() => createQuest({ ...input, startDate: "2026-08-31" }, "2026-09-01", "id1")).toThrow(/past/i);
  });

  it("allows up to a year ahead, not more", () => {
    expect(createQuest({ ...input, startDate: "2027-09-01" }, "2026-09-01", "id1").startDate).toBe("2027-09-01");
    expect(() => createQuest({ ...input, startDate: "2027-09-02" }, "2026-09-01", "id1")).toThrow(/within 365/);
  });

  it.each(["tomorrow", "2026-9-4", "2026-02-31", "", 5])("rejects %j as a start date", (bad) => {
    expect(() => createQuest({ ...input, startDate: bad as never }, "2026-09-01", "id1")).toThrow(/invalid/i);
  });

  it("checks for a scheduled day from the start date, not from today", () => {
    // 1 Sep 2026 is a Tuesday.
    const skipTuesday = { ...input, durationDays: 1, skipWeekdays: [2] };
    expect(() => createQuest({ ...skipTuesday, startDate: "2026-09-08" }, "2026-09-01", "id1")).toThrow(/skipped/i);
    expect(createQuest({ ...skipTuesday, startDate: "2026-09-02" }, "2026-09-01", "id1").startDate).toBe("2026-09-02");
  });
});

describe("a quest that starts later", () => {
  const later = makeQuest({ startDate: "2026-09-05", durationDays: 7 });

  it("is upcoming until its start day, then active with nothing missed", () => {
    expect(getStatus(later, "2026-09-01")).toEqual({ state: "upcoming", startsOn: "2026-09-05" });
    expect(getStatus(later, "2026-09-04").state).toBe("upcoming");
    expect(getStatus(later, "2026-09-05")).toEqual({ state: "active", streak: 0 });
  });

  it("can't be checked in or held before it starts, but can on the start day", () => {
    expect(() => checkIn(later, "2026-09-02")).toThrow(/not active/i);
    expect(() => holdQuest(later, "2026-09-02")).toThrow();
    expect(checkIn(later, "2026-09-05").checkIns).toEqual(["2026-09-05"]);
  });

  it("counts towards First Steps but never towards a streak", () => {
    expect(qualifyingTrophies([makeQuest({ startDate: "2026-09-10" })], "2026-09-01")).toEqual(["first-quest"]);
  });

  it("is created and guarded through the shared transitions", () => {
    const { state } = addQuest(EMPTY_STATE, { ...input, startDate: "2026-09-04" }, "2026-09-01", "id1");
    expect(state.quests[0].startDate).toBe("2026-09-04");
    expect(() => checkInQuest(state, "id1", "2026-09-01")).toThrow(/not active/i);
    expect(checkInQuest(state, "id1", "2026-09-04").state.quests[0].checkIns).toEqual(["2026-09-04"]);
  });

  it("can still be renamed, lengthened and given skipped days", () => {
    const q = makeQuest({ startDate: "2026-09-10", checkIns: [] });
    expect(editQuest(q, { title: "Run", durationDays: 1, skipWeekdays: [0] }, "2026-09-02")).toMatchObject({
      title: "Run",
      durationDays: 1,
      skipWeekdays: [0],
      startDate: "2026-09-10",
    });
  });
});

describe("what a quest that starts later looks like", () => {
  it("shows a fixed quest as all upcoming days from its start date", () => {
    const boxes = boxesFor(makeQuest({ startDate: "2026-09-05", durationDays: 3 }), "2026-09-01");
    expect(boxes.map((b) => [b.date, b.state])).toEqual([
      ["2026-09-05", "upcoming"],
      ["2026-09-06", "upcoming"],
      ["2026-09-07", "upcoming"],
    ]);
  });

  it("previews the first week of an infinite quest", () => {
    const boxes = boxesFor(makeQuest({ kind: "infinite", durationDays: null, startDate: "2026-09-05" }), "2026-09-01");
    expect(boxes).toHaveLength(7);
    expect(boxes[0]).toMatchObject({ date: "2026-09-05", day: 1, state: "upcoming" });
  });

  it("labels the start as tomorrow or by day, then counts days once started", () => {
    const q = makeQuest({ startDate: "2026-09-05", durationDays: 7 });
    expect(progressLabel(q, "2026-09-04")).toBe("Starts tomorrow");
    expect(progressLabel(q, "2026-09-01")).toBe("Starts Sat 5 Sep");
    expect(progressLabel(q, "2026-09-05")).toBe("Day 1 of 7");
  });
});
