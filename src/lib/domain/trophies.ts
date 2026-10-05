import { getStatus } from "./quest";
import type { DateKey, Quest } from "./types";

export type TrophyGroup = "start" | "streak" | "completed" | "same-day";

export type Trophy = {
  key: string;
  title: string;
  description: string;
  group: TrophyGroup;
  restores: number; // streak restores granted when it unlocks
};

export const TROPHY_GROUPS: { id: TrophyGroup; label: string }[] = [
  { id: "start", label: "Getting started" },
  { id: "streak", label: "Streaks" },
  { id: "completed", label: "Quests completed" },
  { id: "same-day", label: "In one day" },
];

export const STREAK_STEPS = [3, 5, 7, 10, 20, 25, 50, 100] as const;
export const COMPLETE_STEPS = [3, 5, 7, 10, 20, 25, 50, 100] as const;
export const SAME_DAY_STEPS = [2, 3, 5, 10] as const;

const STREAK_TITLES: Record<number, string> = {
  3: "Getting Warm",
  5: "On a Roll",
  7: "Week Warrior",
  10: "Double Digits",
  20: "Twenty Strong",
  25: "Quarter Century",
  50: "Unstoppable",
  100: "Centurion",
};

const COMPLETE_TITLES: Record<number, string> = {
  3: "Triple Threat",
  5: "Five Finished",
  7: "Lucky Seven",
  10: "Perfect Ten",
  20: "Twenty Down",
  25: "Quarter Master",
  50: "Half Century",
  100: "Hundred Club",
};

const SAME_DAY_TITLES: Record<number, string> = {
  2: "Double Up",
  3: "Triple Play",
  5: "Full Hand",
  10: "Ten-Fold",
};

// Restores granted for a milestone on the streak and completed ladders.
const ladderReward = (n: number) => (n >= 100 ? 5 : n >= 50 ? 3 : n >= 20 ? 2 : 1);
const SAME_DAY_REWARD: Record<number, number> = { 2: 1, 3: 1, 5: 2, 10: 3 };

export const TROPHIES: readonly Trophy[] = [
  { key: "first-quest", title: "First Steps", description: "Create your first quest", group: "start", restores: 0 },
  { key: "first-check-in", title: "Off the Mark", description: "Check in for the first time", group: "start", restores: 0 },
  { key: "first-restore", title: "Second Wind", description: "Use a streak restore to save a streak", group: "start", restores: 0 },
  { key: "first-complete", title: "Quest Complete", description: "Finish a fixed quest", group: "start", restores: 0 },
  ...STREAK_STEPS.map((n) => ({
    key: `streak-${n}`,
    title: STREAK_TITLES[n],
    description: `Reach a ${n}-day streak`,
    group: "streak" as const,
    restores: ladderReward(n),
  })),
  ...COMPLETE_STEPS.map((n) => ({
    key: `complete-${n}`,
    title: COMPLETE_TITLES[n],
    description: `Complete ${n} quests`,
    group: "completed" as const,
    restores: ladderReward(n),
  })),
  ...SAME_DAY_STEPS.map((n) => ({
    key: `day-${n}`,
    title: SAME_DAY_TITLES[n],
    description: `Check in on ${n} quests in one day`,
    group: "same-day" as const,
    restores: SAME_DAY_REWARD[n],
  })),
];

// Which trophies the current quests qualify for.
export function qualifyingTrophies(quests: Quest[], today: DateKey): string[] {
  const statuses = quests.map((q) => getStatus(q, today));
  const bestStreak = Math.max(
    0,
    ...statuses.map((s) => (s.state === "lapsed" ? 0 : s.streak)),
  );
  const completedCount = statuses.filter((s) => s.state === "completed").length;
  const checkedInToday = quests.filter((q) => q.checkIns.includes(today)).length;

  const keys: string[] = [];
  if (quests.length > 0) keys.push("first-quest");
  if (quests.some((q) => q.checkIns.length > 0)) keys.push("first-check-in");
  if (quests.some((q) => q.restoredDates.length > 0)) keys.push("first-restore");
  if (completedCount > 0) keys.push("first-complete");
  for (const n of STREAK_STEPS) if (bestStreak >= n) keys.push(`streak-${n}`);
  for (const n of COMPLETE_STEPS) if (completedCount >= n) keys.push(`complete-${n}`);
  for (const n of SAME_DAY_STEPS) if (checkedInToday >= n) keys.push(`day-${n}`);
  return keys;
}

// Trophies that qualify now and haven't been earned yet.
export function newlyEarned(quests: Quest[], earned: string[], today: DateKey): Trophy[] {
  const have = new Set(earned);
  const qualifying = new Set(qualifyingTrophies(quests, today));
  return TROPHIES.filter((t) => qualifying.has(t.key) && !have.has(t.key));
}