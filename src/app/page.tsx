import { auth, signIn, signOut } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { QuestSync } from "@/features/quests/QuestSync";
import { db } from "@/lib/db";
import { loadState } from "@/lib/db/state";

export default async function Home() {
  const session = await auth();
  const userId = session?.user?.id;
  const initialState = userId ? await loadState(db, userId) : null;

  async function signInAction() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <>
      {userId && initialState && (
        <QuestSync key={userId} userId={userId} initialState={initialState} />
      )}
      <AppShell
        user={session?.user ? { name: session.user.name ?? null } : null}
        signInAction={signInAction}
        signOutAction={signOutAction}
      />
    </>
  );
}
