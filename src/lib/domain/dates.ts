import type { DateKey } from "./types";

const MS_PER_DAY = 86_400_000;

function toUtcMs(key: DateKey): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(key: DateKey, n: number): DateKey {
  return new Date(toUtcMs(key) + n * MS_PER_DAY).toISOString().slice(0, 10);
}

export function daysBetween(from: DateKey, to: DateKey): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

export function weekdayOf(key: DateKey): number {
  return new Date(toUtcMs(key)).getUTCDay(); // 0 = Sunday
}

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function weekdayShort(key: DateKey): string {
  return WEEKDAY_SHORT[weekdayOf(key)];
}

// "What day is it for this user?" The server's clock is never used.
export function todayIn(timeZone: string, now: Date = new Date()): DateKey {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}