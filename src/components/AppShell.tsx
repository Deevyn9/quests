"use client";

import { useState } from "react";
import { useQuestStore } from "@/features/quests/store";
import { getStatus } from "@/lib/domain/quest";
import { Cloud } from "./Cloud";
import { EmptyState } from "./EmptyState";
import { NewQuestModal } from "./NewQuestModal";
import { QuestCard } from "./QuestCard";
import { Toast } from "./Toast";
import { TrophyButton } from "./TrophyButton";

const PLACEHOLDER_NAME = "Adventurer"; // replaced by the signed-in user in the auth step

export function AppShell() {
  const [modalOpen, setModalOpen] = useState(false);
  const quests = useQuestStore((s) => s.quests);
  const restores = useQuestStore((s) => s.restores);
  const today = useQuestStore((s) => s.today());

  // Completed quests leave the list; the trophy panel will show them later.
  const visible = quests.filter(
    (q) => getStatus(q, today).state !== "completed",
  );

  return (
    <div className="relative min-h-dvh bg-sky-100 text-slate-800">
      <TrophyButton />

      <main className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-8 px-6 pt-20 pb-40 md:grid md:grid-cols-[1fr_2fr_1fr] md:pt-16">
        <header className="md:sticky md:top-16 md:self-start">
          <p className="text-sm text-slate-500">{PLACEHOLDER_NAME}</p>
          <h1 className="text-4xl font-semibold tracking-tight">Quests</h1>
          <p className="mt-2 text-sm text-slate-500">Restores: {restores}</p>
        </header>

        <section className="flex flex-col gap-6">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="self-start rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            New quest
          </button>

          {visible.length === 0 ? (
            <EmptyState onStart={() => setModalOpen(true)} />
          ) : (
            <ul className="flex flex-col gap-4">
              {visible.map((quest) => (
                <li key={quest.id}>
                  <QuestCard quest={quest} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Third column: intentionally empty, the trophy button is fixed to the viewport */}
        <div aria-hidden className="hidden md:block" />
      </main>

      <Cloud />
      <NewQuestModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <Toast />
    </div>
  );
}
