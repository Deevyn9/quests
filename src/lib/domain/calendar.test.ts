import { describe, expect, it } from "vitest";
import { compareMonths, monthGrid, monthOf, shiftMonth } from "./calendar";
import { formatDay } from "./dates";

const SEP_2026 = { year: 2026, month: 8 }; // 1 Sep 2026 is a Tuesday

describe("monthGrid", () => {
  it("pads the first week so the 1st lands on its weekday (Sunday first)", () => {
    const cells = monthGrid(SEP_2026, 0);
    expect(cells.slice(0, 3)).toEqual([null, null, "2026-09-01"]);
  });

  it("pads one less with Monday first", () => {
    expect(monthGrid(SEP_2026, 1).slice(0, 2)).toEqual([null, "2026-09-01"]);
  });

  it("holds every day of the month once and fills out whole weeks", () => {
    const cells = monthGrid(SEP_2026, 0);
    const days = cells.filter((c): c is string => c !== null);
    expect(days).toHaveLength(30);
    expect(days.at(-1)).toBe("2026-09-30");
    expect(cells.length % 7).toBe(0);
  });

  it("knows a leap February", () => {
    expect(monthGrid({ year: 2028, month: 1 }).filter(Boolean)).toHaveLength(29);
    expect(monthGrid({ year: 2027, month: 1 }).filter(Boolean)).toHaveLength(28);
  });
});

describe("months", () => {
  it("steps across year boundaries", () => {
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonth({ year: 2026, month: 5 }, 14)).toEqual({ year: 2027, month: 7 });
  });

  it("reads a month from a date and compares months", () => {
    expect(monthOf("2026-11-07")).toEqual({ year: 2026, month: 10 });
    expect(compareMonths({ year: 2026, month: 10 }, { year: 2027, month: 0 })).toBeLessThan(0);
    expect(compareMonths({ year: 2026, month: 10 }, { year: 2026, month: 10 })).toBe(0);
  });
});

describe("formatDay", () => {
  it("writes weekday, day and month without a leading zero", () => {
    expect(formatDay("2026-09-01")).toBe("Tue 1 Sep");
    expect(formatDay("2026-12-25")).toBe("Fri 25 Dec");
  });
});
