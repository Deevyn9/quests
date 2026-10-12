"use client";

import { useRef, useState } from "react";
import { useFlipReorder } from "@/features/quests/useFlipReorder";
import { useQuestStore } from "@/features/quests/store";
import { titleFor } from "@/lib/domain/describe";
import { getStatus } from "@/lib/domain/quest";
import { Cloud } from "./Cloud";
import { ConfirmDialog } from "./ConfirmDialog";
import { EmptyState } from "./EmptyState";
import { RestoreIcon } from "./Icons";
import { NewQuestModal } from "./NewQuestModal";
import { QuestCard } from "./QuestCard";
import { SignInPrompt } from "./SignInPrompt";
import { Toast } from "./Toast";
import { TrophyButton } from "./TrophyButton";
import { TrophyPanel } from "./TrophyPanel";
import { Welcome } from "./Welcome";
import { InstallButton } from "./InstallButton";
import { getSyncStatus } from "@/features/quests/activeSync";
import { clearLocalData } from "@/features/quests/cleanup";
import { SyncBanner } from "./SyncBanner";

type Props = {
  user: { name: string | null } | null;
  signInAction: () => Promise<void>;
  signOutAction: () => Promise<void>;
};

function ListSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      {[0, 1].map((i) => (
        <div key={i} className="h-40 animate-pulse rounded-xl bg-zinc-100" />
      ))}
    </div>
  );
}

export function AppShell({ user, signInAction, signOutAction }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [trophiesOpen, setTrophiesOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  const ready = useQuestStore((s) => s.ready);
  const quests = useQuestStore((s) => s.quests);
  const restores = useQuestStore((s) => s.restores);
  const trophies = useQuestStore((s) => s.trophies);
  const today = useQuestStore((s) => s.today());
  const notify = useQuestStore((s) => s.notify);

  const visible = quests.filter(
    (q) => getStatus(q, today).state !== "completed",
  );
  const completed = quests.filter(
    (q) => getStatus(q, today).state === "completed",
  );

  // With no quests the empty state has its own "Start a quest" button, so the
  // "New quest" button would just be a duplicate. It shows while loading to avoid a pop-in.
  const showNewQuest = !ready || visible.length > 0;

  useFlipReorder(listRef, visible.map((q) => q.id).join(","));

  const title = user ? titleFor(user.name) : "Quests";

  return (
    <div className="min-h-dvh bg-white text-zinc-900">
      {user && <TrophyButton onClick={() => setTrophiesOpen(true)} />}

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 pt-8 pb-40 md:grid md:grid-cols-[1fr_2fr_1fr]">
        <header className="pr-14 md:sticky md:top-8 md:self-start md:pr-0">
          <div className="flex h-11 items-center">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          </div>
          <InstallButton />
          {user ? (
            <>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
                <RestoreIcon className="size-4" />
                Streak restore: {restores}
              </p>
              <button
                type="button"
                onClick={() => {
                  // Signing out clears this device's copy, so unsent changes must be sent first.
                  const { pending, offline } = getSyncStatus();
                  if (pending > 0 || offline) {
                    notify(
                      offline
                        ? "You're offline. Reconnect before signing out so nothing is lost."
                        : "Still saving your changes. Try again in a moment.",
                    );
                    return;
                  }
                  setSignOutOpen(true);
                }}
                className="mt-2 text-xs text-zinc-500 underline hover:text-zinc-900"
              >
                Sign out
              </button>
            </>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">
              Build streaks, one day at a time.
            </p>
          )}
        </header>

        <section className="flex flex-col gap-6">
          {!user ? (
            <>
              <div className="flex h-11 items-center">
                <SignInPrompt signInAction={signInAction} />
              </div>
              <p className="text-sm text-zinc-500">
                Your quests and streaks follow you across devices.
              </p>

              {user && <SyncBanner />}

              <Welcome signInAction={signInAction} />
            </>
          ) : (
            <>
              {showNewQuest && (
                <div className="flex h-11 items-center">
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="h-10 rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
                  >
                    New quest
                  </button>
                </div>
              )}

              {!ready ? (
                <ListSkeleton />
              ) : visible.length === 0 ? (
                <EmptyState onStart={() => setModalOpen(true)} />
              ) : (
                <ul ref={listRef} className="flex flex-col gap-4">
                  {visible.map((quest) => (
                    <li key={quest.id} data-flip-id={quest.id}>
                      <QuestCard quest={quest} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        {/* Third column: intentionally empty, the trophy button is fixed to the viewport */}
        <div aria-hidden className="hidden md:block" />
      </main>

      <Cloud />
      <NewQuestModal open={modalOpen} onClose={() => setModalOpen(false)} />
      {user && (
        <>
          <TrophyPanel
            open={trophiesOpen}
            onClose={() => setTrophiesOpen(false)}
            trophies={trophies}
            completed={completed}
          />
          <ConfirmDialog
            open={signOutOpen}
            title="Sign out?"
            description="Your quests are saved and will be here when you sign back in."
            confirmLabel="Sign out"
            onConfirm={() => {
              setSignOutOpen(false);
              clearLocalData();
              void signOutAction();
            }}
            onCancel={() => setSignOutOpen(false)}
          />
        </>
      )}
      <Toast />
    </div>
  );
}
