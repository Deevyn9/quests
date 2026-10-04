import { describe, expect, it } from "vitest";
import { addDays, daysBetween, formatDay, todayIn, weekdayOf } from "./dates";

describe("dates", () => {
  it("adds days across a month boundary", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
  });

  it("counts days between two dates", () => {
    expect(daysBetween("2026-09-01", "2026-09-04")).toBe(3);
  });

  it("finds the weekday", () => {
    expect(weekdayOf("2026-09-06")).toBe(0); // Sunday
    expect(weekdayOf("2026-09-01")).toBe(2); // Tuesday
  });

  it("formats a day for display", () => {
    expect(formatDay("2026-09-01")).toBe("1 Sep 2026");
    expect(formatDay("2026-12-25")).toBe("25 Dec 2026");
  });

  it("resolves 'today' in the user's timezone, not the server's", () => {
    const now = new Date("2026-09-30T23:30:00Z");
    expect(todayIn("Africa/Lagos", now)).toBe("2026-10-01");
    expect(todayIn("America/Los_Angeles", now)).toBe("2026-09-30");
  });
});