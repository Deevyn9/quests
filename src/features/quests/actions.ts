"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { loadState, mutateState } from "@/lib/db/state";
import type { NewQuestInput } from "@/lib/domain/create";
import { daysBetween } from "@/lib/domain/dates";
import type { QuestPatch } from "@/lib/domain/edit";
import * as moves from "@/lib/domain/transitions";
import type { AppState } from "@/lib/domain/transitions";

type Result = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in");
  return session.user.id;
}

// The browser tells us what day it is for the user. Any real timezone is within
// a day of UTC, so anything further out is rejected.
function assertPlausibleDay(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Invalid date");
  const utcToday = new Date().toISOString().slice(0, 10);
  if (Math.abs(daysBetween(utcToday, day)) > 1) throw new Error("Date out of range");
}

function assertId(id: string) {
  if (!UUID.test(id)) throw new Error("Invalid id");
}

async function run(work: () => Promise<void>): Promise<Result> {
  try {
    await work();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
  }
}

export async function addQuestAction(input: NewQuestInput, id: string, today: string) {
  return run(async () => {
    const userId = await requireUserId();
    assertId(id);
    assertPlausibleDay(today);
    await mutateState(userId, (s) => moves.addQuest(s, input, today, id));
  });
}

export async function checkInAction(id: string, today: string) {
  return run(async () => {
    const userId = await requireUserId();
    assertId(id);
    assertPlausibleDay(today);
    await mutateState(userId, (s) => moves.checkInQuest(s, id, today));
  });
}

export async function restoreAction(id: string, today: string) {
  return run(async () => {
    const userId = await requireUserId();
    assertId(id);
    assertPlausibleDay(today);
    await mutateState(userId, (s) => moves.restoreStreak(s, id, today));
  });
}

export async function restartAction(id: string, today: string) {
  return run(async () => {
    const userId = await requireUserId();
    assertId(id);
    assertPlausibleDay(today);
    await mutateState(userId, (s) => moves.restartQuest(s, id, today));
  });
}

export async function holdAction(id: string, today: string) {
  return run(async () => {
    const userId = await requireUserId();
    assertId(id);
    assertPlausibleDay(today);
    await mutateState(userId, (s) => moves.holdQuest(s, id, today));
  });
}

export async function resumeAction(id: string, today: string) {
  return run(async () => {
    const userId = await requireUserId();
    assertId(id);
    assertPlausibleDay(today);
    await mutateState(userId, (s) => moves.resumeQuest(s, id, today));
  });
}

export async function editAction(id: string, patch: QuestPatch, today: string) {
  return run(async () => {
    const userId = await requireUserId();
    assertId(id);
    assertPlausibleDay(today);
    // The patch is validated field by field inside the shared rules.
    await mutateState(userId, (s) => moves.editQuest(s, id, patch, today));
  });
}

export async function deleteAction(id: string) {
  return run(async () => {
    const userId = await requireUserId();
    assertId(id);
    await mutateState(userId, (s) => moves.deleteQuest(s, id));
  });
}

export async function loadAction(): Promise<AppState> {
  return loadState(db, await requireUserId());
}
