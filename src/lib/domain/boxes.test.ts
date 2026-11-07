import { describe, expect, it } from "vitest";
import { boxesFor } from "./boxes";
import { makeQuest } from "./fixtures";

describe("boxesFor", () => {
  it("numbers each day and labels its weekday", () => {
    const q = makeQuest({ durationDays: 3, checkIns: ["2026-09-01"] });
    expect(boxesFor(q, "2026-09-02")).toEqual([
      { date: "2026-09-01", day: 1, weekday: "Tue", state: "checked" },
      { date: "2026-09-02", day: 2, weekday: "Wed", state: "today" },
      { date: "2026-09-03", day: 3, weekday: "Thu", state: "upcoming" },
    ]);
  });

  it("marks days that were missed", () => {
    const q = makeQuest({ durationDays: 3, checkIns: ["2026-09-01"] });
    expect(boxesFor(q, "2026-09-03").map((b) => b.state)).toEqual(["checked", "missed", "today"]);
  });

  it("marks skipped days", () => {
    const q = makeQuest({ startDate: "2026-09-04", durationDays: 3, skipWeekdays: [0, 6] });
    const boxes = boxesFor(q, "2026-09-04");
    expect(boxes.map((b) => b.state)).toEqual(["today", "skipped", "skipped"]);
    expect(boxes.map((b) => b.weekday)).toEqual(["Fri", "Sat", "Sun"]);
  });

  it("shows a rolling 14-day window for infinite quests", () => {
    const q = makeQuest({ kind: "infinite", durationDays: null, startDate: "2026-09-01" });
    const boxes = boxesFor(q, "2026-09-30");
    expect(boxes).toHaveLength(14);
    expect(boxes[0]).toMatchObject({ date: "2026-09-17", day: 17 });
    expect(boxes[13]).toMatchObject({ date: "2026-09-30", day: 30, state: "today" });
  });

  it("starts numbering at 1 for a new infinite quest", () => {
    const q = makeQuest({ kind: "infinite", durationDays: null, startDate: "2026-09-28" });
    expect(boxesFor(q, "2026-09-30").map((b) => b.day)).toEqual([1, 2, 3]);
  });

  it("pages long quests around today", () => {
    const q = makeQuest({ durationDays: 60, startDate: "2026-09-01" });

    const first = boxesFor(q, "2026-09-01");
    expect(first).toHaveLength(28);
    expect(first[0].day).toBe(1);

    const second = boxesFor(q, "2026-09-30"); // day 30 sits on the second page
    expect(second).toHaveLength(28);
    expect(second[0].day).toBe(29);
  });

  it("leaves held days out of the numbering", () => {
    const q = makeQuest({
      durationDays: 3,
      checkIns: ["2026-09-01"],
      pausedDates: ["2026-09-02", "2026-09-03", "2026-09-04"],
    });
    expect(boxesFor(q, "2026-09-05")).toEqual([
      { date: "2026-09-01", day: 1, weekday: "Tue", state: "checked" },
      { date: "2026-09-05", day: 2, weekday: "Sat", state: "today" },
      { date: "2026-09-06", day: 3, weekday: "Sun", state: "upcoming" },
    ]);
  });

  it("shows undated placeholders for the rest of a quest on hold", () => {
    const q = makeQuest({
      durationDays: 5,
      checkIns: ["2026-09-01"],
      pausedFrom: "2026-09-02",
    });
    const boxes = boxesFor(q, "2026-09-03");
    expect(boxes).toHaveLength(5);
    expect(boxes[0].state).toBe("checked");
    expect(boxes.slice(1).every((b) => b.date === null && b.state === "upcoming")).toBe(true);
  });
});