import { weekdayOf } from "./dates";
import type { DateKey } from "./types";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export type MonthRef = { year: number; month: number }; // month: 0 = January

const pad = (n: number) => String(n).padStart(2, "0");

export const monthOf = (key: DateKey): MonthRef => ({
  year: Number(key.slice(0, 4)),
  month: Number(key.slice(5, 7)) - 1,
});

export function shiftMonth(m: MonthRef, delta: number): MonthRef {
  const total = m.year * 12 + m.month + delta;
  return { year: Math.floor(total / 12), month: total - Math.floor(total / 12) * 12 };
}

// Negative when a is before b.
export const compareMonths = (a: MonthRef, b: MonthRef) =>
  a.year * 12 + a.month - (b.year * 12 + b.month);

const dayKey = (m: MonthRef, day: number): DateKey => `${m.year}-${pad(m.month + 1)}-${pad(day)}`;

// One month as a flat list of week rows: a date for each day, null for the padding
// before the 1st and after the last day. weekStartsOn: 0 = Sunday, 1 = Monday.
export function monthGrid(m: MonthRef, weekStartsOn = 0): (DateKey | null)[] {
  const count = new Date(Date.UTC(m.year, m.month + 1, 0)).getUTCDate();
  const lead = (weekdayOf(dayKey(m, 1)) - weekStartsOn + 7) % 7;
  const cells: (DateKey | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: count }, (_, i) => dayKey(m, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
