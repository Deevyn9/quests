import { describe, expect, it } from "vitest";
import { describeStart, START_IMMEDIATELY, startDateFor, type StartChoice } from "./start";

const TODAY = "2026-11-07"; // a Saturday

describe("startDateFor", () => {
  it("starts immediately by default", () => {
    expect(START_IMMEDIATELY.immediately).toBe(true);
    expect(startDateFor(START_IMMEDIATELY, TODAY)).toBeUndefined();
  });

  it("starts tomorrow", () => {
    const c: StartChoice = { immediately: false, pick: "tomorrow", date: null };
    expect(startDateFor(c, TODAY)).toBe("2026-11-08");
  });

  it("starts on the calendar date", () => {
    const c: StartChoice = { immediately: false, pick: "date", date: "2026-11-20" };
    expect(startDateFor(c, TODAY)).toBe("2026-11-20");
  });

  it("asks for a date when the calendar is chosen but empty", () => {
    expect(() => startDateFor({ immediately: false, pick: "date", date: null }, TODAY)).toThrow(/pick a start date/i);
  });

  it("ignores a leftover calendar date while starting immediately", () => {
    expect(startDateFor({ immediately: true, pick: "date", date: "2026-11-20" }, TODAY)).toBeUndefined();
  });
});

describe("describeStart", () => {
  it("summarises each choice", () => {
    expect(describeStart(START_IMMEDIATELY, TODAY)).toBe("Starts today");
    expect(describeStart({ immediately: false, pick: "tomorrow", date: null }, TODAY)).toBe("Starts tomorrow · Sun 8 Nov");
    expect(describeStart({ immediately: false, pick: "date", date: null }, TODAY)).toBe("Choose a day on the calendar");
    expect(describeStart({ immediately: false, pick: "date", date: "2026-11-20" }, TODAY)).toBe("Starts Fri 20 Nov");
  });
});
