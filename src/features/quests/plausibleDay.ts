import { daysBetween } from "@/lib/domain/dates";

// Changes made offline are saved later, so the day they carry can be in the past.
// A week is far longer than the 3-day restore window, and still short enough that
// nobody can rewrite history. Any real timezone is within a day of UTC, so the
// future allowance is a single day.
export const MAX_DAYS_BEHIND = 7;
export const MAX_DAYS_AHEAD = 1;

export function assertPlausibleDay(day: string, utcToday: string = new Date().toISOString().slice(0, 10)) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Invalid date");
  const offset = daysBetween(utcToday, day); // positive: the day is in the future
  if (offset > MAX_DAYS_AHEAD || offset < -MAX_DAYS_BEHIND) throw new Error("Date out of range");
}
