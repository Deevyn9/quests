import type { Quest } from "./types";

export const makeQuest = (o: Partial<Quest> = {}): Quest => ({
  id: "q1",
  title: "Read",
  kind: "fixed",
  durationDays: 7,
  startDate: "2026-09-01",
  checkIns: [],
  restoredDates: [],
  skipWeekdays: [],
  skippedDates: [],
  pausedFrom: null,
  pausedDates: [],
  ...o,
});