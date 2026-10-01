import { Cloud } from "./Cloud";
import { EmptyState } from "./EmptyState";
import { TrophyButton } from "./TrophyButton";

const PLACEHOLDER_NAME = "Adventurer"; // replaced by the signed-in user in the auth step

export function AppShell() {
  return (
    <div className="relative min-h-dvh bg-sky-100 text-slate-800">
      <TrophyButton />

      <main className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-8 px-6 pt-20 pb-40 md:grid md:grid-cols-[1fr_2fr_1fr] md:pt-16">
        <header className="md:sticky md:top-16 md:self-start">
          <p className="text-sm text-slate-500">{PLACEHOLDER_NAME}</p>
          <h1 className="text-4xl font-semibold tracking-tight">Quests</h1>
        </header>

        <section className="flex flex-col gap-6">
          <button
            type="button"
            className="self-start rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            New quest
          </button>
          <EmptyState />
        </section>

        {/* Third column: intentionally empty, the trophy button is fixed to the viewport */}
        <div aria-hidden className="hidden md:block" />
      </main>

      <Cloud />
    </div>
  );
}
