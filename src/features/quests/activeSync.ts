"use client";

import { useSyncExternalStore } from "react";
import type { Sync, SyncStatus } from "./sync";

// The running save queue, so any component can show its status.
// Only the client creates one (QuestSync), so there is no server-side state here.
const IDLE: SyncStatus = { pending: 0, syncing: false, offline: false, needsSignIn: false };

let active: Sync | null = null;
const listeners = new Set<() => void>();
let detach: (() => void) | null = null;

export function setActiveSync(sync: Sync | null) {
  detach?.();
  active = sync;
  detach = sync ? sync.subscribe(() => listeners.forEach((l) => l())) : null;
  listeners.forEach((l) => l());
}

export const getSyncStatus = (): SyncStatus => active?.getStatus() ?? IDLE;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribe, getSyncStatus, () => IDLE);
}
