import { auth, signIn, signOut } from "@/auth";
import { AppShell } from "@/components/AppShell";

export default async function Home() {
  const session = await auth();

  async function signInAction() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <AppShell
      user={session?.user ? { name: session.user.name ?? null } : null}
      signInAction={signInAction}
      signOutAction={signOutAction}
    />
  );
}
