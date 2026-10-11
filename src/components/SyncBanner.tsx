"use client";

import { useSyncStatus } from "@/features/quests/activeSync";

const changes = (n: number) => (n === 1 ? "1 change" : `${n} changes`);

// A quiet line that tells the truth about what's saved where.
// Nothing shows when everything is saved and we're online.
export function SyncBanner() {
  const { pending, offline, needsSignIn } = useSyncStatus();

  let text: string | null = null;
  if (needsSignIn) {
    text = `Your session ended. Reload and sign in again to save ${changes(pending)}.`;
  } else if (offline) {
    text =
      pending > 0
        ? `You're offline. ${changes(pending)} saved on this device, waiting to sync.`
        : "You're offline. Changes you make are saved on this device and sync later.";
  } else if (pending > 0) {
    text = `Syncing ${changes(pending)}...`;
  }

  if (!text) return null;

  return (
    <p
      role="status"
      className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-600"
    >
      {text}
    </p>
  );
}
