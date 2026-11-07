import { addDays, formatDay } from "./dates";
import type { DateKey } from "./types";

// What the person picked in the "When does it start?" section of the new quest form.
export type StartChoice = {
  immediately: boolean; // the default: start today
  pick: "tomorrow" | "date"; // used when `immediately` is off
  date: DateKey | null; // the calendar choice, when pick is "date"
};

export const START_IMMEDIATELY: StartChoice = { immediately: true, pick: "tomorrow", date: null };

// The start date to send, or undefined to start today. Throws if a calendar date is
// wanted but none was picked.
export function startDateFor(choice: StartChoice, today: DateKey): DateKey | undefined {
  if (choice.immediately) return undefined;
  if (choice.pick === "tomorrow") return addDays(today, 1);
  if (!choice.date) throw new Error("Pick a start date");
  return choice.date;
}

export function describeStart(choice: StartChoice, today: DateKey): string {
  if (choice.immediately) return "Starts today";
  if (choice.pick === "tomorrow") return `Starts tomorrow · ${formatDay(addDays(today, 1))}`;
  return choice.date ? `Starts ${formatDay(choice.date)}` : "Choose a day on the calendar";
}
