import { describe, expect, it } from "vitest";
import { lengthLabel, progressLabel, skipLabel, titleFor, toneFor } from "./describe";
import { makeQuest } from "./fixtures";

const infinite = { kind: "infinite" as const, durationDays: null };

describe("lengthLabel", () => {
  it("describes fixed and infinite quests", () => {
    expect(lengthLabel(makeQuest({ durationDays: 7 }))).toBe("7 days");
    expect(lengthLabel(makeQuest({ durationDays: 1 }))).toBe("1 day");
    expect(lengthLabel(makeQuest(infinite))).toBe("Infinite");
  });
});

describe("skipLabel", () => {
  it("lists skipped weekdays Monday first", () => {
    expect(skipLabel(makeQuest({ skipWeekdays: [0, 6] }))).toBe("Skips Sat, Sun");
  });

  it("is null when nothing is skipped", () => {
    expect(skipLabel(makeQuest())).toBeNull();
  });
});

describe("progressLabel", () => {
  it("shows the day out of the total for fixed quests", () => {
    const q = makeQuest({ durationDays: 3 });
    expect(progressLabel(q, "2026-09-01")).toBe("Day 1 of 3");
    expect(progressLabel(q, "2026-09-02")).toBe("Day 2 of 3");
  });

  it("only shows the day for infinite quests", () => {
    const q = makeQuest({ ...infinite, startDate: "2026-09-28" });
    expect(progressLabel(q, "2026-09-30")).toBe("Day 3");
  });

  it("stops counting while on hold", () => {
    const q = makeQuest({ durationDays: 5, startDate: "2026-09-01", pausedFrom: "2026-09-03" });
    expect(progressLabel(q, "2026-09-04")).toBe("Day 2 of 5");
  });
});

describe("titleFor", () => {
  it("uses the first name", () => {
    expect(titleFor("Divine Obeten")).toBe("Divine's quests");
  });

  it("falls back when there is no name", () => {
    expect(titleFor(null)).toBe("My quests");
  });
});

describe("toneFor", () => {
  it("is frozen while on hold", () => {
    expect(toneFor({ state: "paused", streak: 3 }, 0)).toBe("frozen");
  });

  it("is recoverable when broken and a restore is available", () => {
    expect(toneFor({ state: "broken", streak: 3, missedDays: 1 }, 1)).toBe("recoverable");
  });

  it("is dead when broken with no restores", () => {
    expect(toneFor({ state: "broken", streak: 3, missedDays: 1 }, 0)).toBe("dead");
  });

  it("is dead once lapsed, even with restores", () => {
    expect(toneFor({ state: "lapsed", missedDays: 5 }, 4)).toBe("dead");
  });

  it("is normal for active and completed quests", () => {
    expect(toneFor({ state: "active", streak: 2 }, 0)).toBe("normal");
    expect(toneFor({ state: "completed", streak: 7 }, 0)).toBe("normal");
  });
});