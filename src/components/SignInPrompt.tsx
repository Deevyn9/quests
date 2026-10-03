export function SignInPrompt({
  signInAction,
}: {
  signInAction: () => Promise<void>;
}) {
  return (
    <form action={signInAction}>
      <button
        type="submit"
        className="h-10 rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition hover:bg-zinc-700"
      >
        Sign in to create quests
      </button>
    </form>
  );
}
