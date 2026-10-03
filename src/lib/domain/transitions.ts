import { createQuest, type NewQuestInput } from "./create";
import * as domain from "./quest";
import { newlyEarned } from "./trophies";
import { INFINITE_REWARD_EVERY, type DateKey, type Quest } from "./types";

export type AppState = {
  quests: Quest[]; // display order: most recent activity first
  restores: number;
  trophies: Record<string, DateKey>; // trophy key -> day earned
};

export type Transition = { state: AppState; message: string | null };

export const EMPTY_STATE: AppState = { quests: [], restores: 0, trophies: {} };

function find(state: AppState, id: string): Quest {
  const quest = state.quests.find((q) => q.id === id);
  if (!quest) throw new Error("Quest not found");
  return quest;
}

const replace = (quests: Quest[], updated: Quest) =>
  quests.map((q) => (q.id === updated.id ? updated : q));

const moveToTop = (quests: Quest[], updated: Quest) => [
  updated,
  ...quests.filter((q) => q.id !== updated.id),
];

// Unlocks any trophies the new state qualifies for and folds them into the message.
function withTrophies(state: AppState, today: DateKey, message: string | null): Transition {
  const earned = newlyEarned(state.quests, Object.keys(state.trophies), today);
  if (earned.length === 0) return { state, message };

  const trophies = { ...state.trophies };
  for (const trophy of earned) trophies[trophy.key] = today;
  const names = earned.map((t) => t.title).join(", ");

  return {
    state: { ...state, trophies },
    message: message ? `${message} · Trophy: ${names}` : `Trophy unlocked: ${names}`,
  };
}

export function addQuest(
  state: AppState,
  input: NewQuestInput,
  today: DateKey,
  id: string,
): Transition {
  const quest = createQuest(input, today, id);
  return withTrophies({ ...state, quests: [quest, ...state.quests] }, today, null);
}

export function checkInQuest(state: AppState, id: string, today: DateKey): Transition {
  const updated = domain.checkIn(find(state, id), today);
  const earned = domain.restoresEarnedOnCheckIn(updated, today);
  const message =
    earned === 0
      ? "Checked in. Nice one!"
      : updated.kind === "fixed"
        ? "Quest complete! +1 restore"
        : `${INFINITE_REWARD_EVERY}-day streak! +1 restore`;

  return withTrophies(
    { ...state, quests: moveToTop(state.quests, updated), restores: state.restores + earned },
    today,
    message,
  );
}

export function restoreStreak(state: AppState, id: string, today: DateKey): Transition {
  const result = domain.restoreQuest(find(state, id), today, state.restores);
  return withTrophies(
    { ...state, quests: replace(state.quests, result.quest), restores: result.restores },
    today,
    "Streak restored",
  );
}

export function restartQuest(state: AppState, id: string, today: DateKey): Transition {
  const updated = domain.restartQuest(find(state, id), today);
  return withTrophies(
    { ...state, quests: replace(state.quests, updated) },
    today,
    "Fresh start",
  );
}

export function holdQuest(state: AppState, id: string, today: DateKey): Transition {
  const updated = domain.holdQuest(find(state, id), today);
  return {
    state: { ...state, quests: replace(state.quests, updated) },
    message: "Quest on hold",
  };
}

export function resumeQuest(state: AppState, id: string, today: DateKey): Transition {
  const updated = domain.resumeQuest(find(state, id), today);
  return {
    state: { ...state, quests: replace(state.quests, updated) },
    message: "Welcome back. Quest resumed",
  };
}

export function deleteQuest(state: AppState, id: string): Transition {
  return {
    state: { ...state, quests: state.quests.filter((q) => q.id !== id) },
    message: null,
  };
}