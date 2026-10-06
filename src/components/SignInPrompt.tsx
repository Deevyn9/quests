type Props = {
  signInAction: () => Promise<void>;
  label?: string;
};

export function SignInPrompt({
  signInAction,
  label = "Sign in to create quests",
}: Props) {
  return (
    <form action={signInAction}>
      <button
        type="submit"
        className="h-10 rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
      >
        {label}
      </button>
    </form>
  );
}
