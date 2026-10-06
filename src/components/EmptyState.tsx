import { HowItWorks } from "./HowItWorks";

export function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col gap-8 rounded-xl border border-dashed border-zinc-300 p-8">
      <div className="flex flex-col items-start gap-3">
        <h2 className="text-lg font-medium">No quests at the moment</h2>
        <p className="text-sm text-zinc-500">
          Pick a challenge, choose how long it runs, and start crossing off
          days.
        </p>
        <button
          type="button"
          onClick={onStart}
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Start a quest
        </button>
      </div>

      <HowItWorks />
    </div>
  );
}
