import { getStatus } from "./quest";
import type { DateKey, Quest } from "./types";

export type Trophy = { key: string; title: string; description: string };

export const TROPHIES: readonly Trophy[] = [
  { key: "first-quest", title: "First Steps", description: "Create your first quest" },
  { key: "first-check-in", title: "Off the Mark", description: "Check in for the first time" },
  { key: "first-restore", title: "Second Wind", description: "Use a restore to save a streak" },
  { key: "first-complete", title: "Quest Complete", description: "Finish a fixed quest" },
  { key: "streak-7", title: "Week Warrior", description: "Reach a 7-day streak" },
  { key: "streak-30", title: "Monthly Master", description: "Reach a 30-day streak" },
];

// Which trophies the current quests qualify for.
export function qualifyingTrophies(quests: Quest[], today: DateKey): string[] {
  const statuses = quests.map((q) => getStatus(q, today));
  const bestStreak = Math.max(
    0,
    ...statuses.map((s) => (s.state === "lapsed" ? 0 : s.streak)),
  );

  const keys: string[] = [];
  if (quests.length > 0) keys.push("first-quest");
  if (quests.some((q) => q.checkIns.length > 0)) keys.push("first-check-in");
  if (quests.some((q) => q.restoredDates.length > 0)) keys.push("first-restore");
  if (statuses.some((s) => s.state === "completed")) keys.push("first-complete");
  if (bestStreak >= 7) keys.push("streak-7");
  if (bestStreak >= 30) keys.push("streak-30");
  return keys;
}

// Trophies that qualify now and haven't been earned yet.
export function newlyEarned(quests: Quest[], earned: string[], today: DateKey): Trophy[] {
  const have = new Set(earned);
  const qualifying = new Set(qualifyingTrophies(quests, today));
  return TROPHIES.filter((t) => qualifying.has(t.key) && !have.has(t.key));
}