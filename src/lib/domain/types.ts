export type DateKey = string; // "YYYY-MM-DD", in the user's timezone

export type QuestKind = "fixed" | "infinite";

export type Quest = {
  id: string;
  title: string;
  kind: QuestKind;
  durationDays: number | null; // null when infinite
  startDate: DateKey;
  checkIns: DateKey[];
  restoredDates: DateKey[]; // missed days forgiven by a restore
  skipWeekdays: number[]; // 0 = Sunday ... 6 = Saturday
  skippedDates: DateKey[]; // one-off skips
  pausedFrom: DateKey | null; // on hold since this day, until resumed
  pausedDates: DateKey[]; // days from earlier holds
};

export type QuestStatus =
  | { state: "active"; streak: number }
  | { state: "paused"; streak: number }
  | { state: "completed"; streak: number }
  | { state: "broken"; streak: number; missedDays: number } // restorable
  | { state: "lapsed"; missedDays: number }; // too late: delete or restart

export const RESTORE_WINDOW_DAYS = 3;
export const INFINITE_REWARD_EVERY = 25;