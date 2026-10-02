"use client";

import { useRef, useState } from "react";
import { useFlipReorder } from "@/features/quests/useFlipReorder";
import { useQuestStore } from "@/features/quests/store";
import { getStatus } from "@/lib/domain/quest";
import { Cloud } from "./Cloud";
import { EmptyState } from "./EmptyState";
import { NewQuestModal } from "./NewQuestModal";
import { QuestCard } from "./QuestCard";
import { SignInPrompt } from "./SignInPrompt";
import { SignOutDialog } from "./SignOutDialog";
import { Toast } from "./Toast";
import { TrophyButton } from "./TrophyButton";
import { TrophyPanel } from "./TrophyPanel";

type Props = {
  user: { name: string | null } | null;
  signInAction: () => Promise<void>;
  signOutAction: () => Promise<void>;
};

function ListSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      {[0, 1].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/50" />
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

  const visible = quests.filter(
    (q) => getStatus(q, today).state !== "completed",
  );
  const completed = quests.filter(
    (q) => getStatus(q, today).state === "completed",
  );

  useFlipReorder(listRef, visible.map((q) => q.id).join(","));

  return (
    <div className="relative min-h-dvh bg-sky-100 text-slate-800">
      {user && <TrophyButton onClick={() => setTrophiesOpen(true)} />}

      <main className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-8 px-6 pt-20 pb-40 md:grid md:grid-cols-[1fr_2fr_1fr] md:pt-16">
        <header className="md:sticky md:top-16 md:self-start">
          {user && (
            <p className="text-sm text-slate-500">
              {user.name ?? "Adventurer"}
            </p>
          )}
          <h1 className="text-4xl font-semibold tracking-tight">Quests</h1>
          {user && (
            <>
              <p className="mt-2 text-sm text-slate-500">
                Restores: {restores}
              </p>
              <button
                type="button"
                onClick={() => setSignOutOpen(true)}
                className="mt-3 text-xs text-slate-500 underline hover:text-slate-800"
              >
                Sign out
              </button>
            </>
          )}
        </header>

        <section className="flex flex-col gap-6">
          {!user ? (
            <SignInPrompt signInAction={signInAction} />
          ) : (
            <>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="self-start rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                New quest
              </button>

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
          <SignOutDialog
            open={signOutOpen}
            onCancel={() => setSignOutOpen(false)}
            signOutAction={signOutAction}
          />
        </>
      )}
      <Toast />
    </div>
  );
}
