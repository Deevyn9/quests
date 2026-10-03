export function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-zinc-300 p-8">
      <h2 className="text-lg font-medium">No quests at the moment</h2>
      <p className="text-sm text-zinc-500">
        Pick a challenge, choose how long it runs, and start crossing off days.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium transition hover:bg-zinc-50"
      >
        Start a quest
      </button>
    </div>
  );
}
