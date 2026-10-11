import { describe, expect, it } from "vitest";
import { assertPlausibleDay } from "./plausibleDay";

const today = "2026-10-11";

describe("assertPlausibleDay", () => {
  it("accepts today, tomorrow (a timezone ahead of UTC) and yesterday", () => {
    for (const d of ["2026-10-11", "2026-10-12", "2026-10-10"]) {
      expect(() => assertPlausibleDay(d, today)).not.toThrow();
    }
  });

  it("accepts a day up to a week old, for changes made offline", () => {
    expect(() => assertPlausibleDay("2026-10-04", today)).not.toThrow();
  });

  it("rejects anything older than a week", () => {
    expect(() => assertPlausibleDay("2026-10-03", today)).toThrow("Date out of range");
  });

  it("rejects the future beyond tomorrow", () => {
    expect(() => assertPlausibleDay("2026-10-13", today)).toThrow("Date out of range");
  });

  it("rejects malformed dates", () => {
    expect(() => assertPlausibleDay("tomorrow", today)).toThrow("Invalid date");
    expect(() => assertPlausibleDay("2026-1-1", today)).toThrow("Invalid date");
  });
});
