export function SignInPrompt({
  signInAction,
}: {
  signInAction: () => Promise<void>;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-slate-400/60 bg-white/50 p-8">
      <h2 className="text-lg font-medium">Sign in to start your quests</h2>
      <p className="text-sm text-slate-500">
        Your quests and streaks follow you across devices.
      </p>
      <form action={signInAction}>
        <button
          type="submit"
          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Continue with Google
        </button>
      </form>
    </div>
  );
}
