export function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-slate-400/60 bg-white/50 p-8">
      <h2 className="text-lg font-medium">No quests at the moment</h2>
      <p className="text-sm text-slate-500">
        Pick a challenge, choose how long it runs, and start checking off days.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="rounded-full bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:shadow"
      >
        Start a quest
      </button>
    </div>
  );
}
