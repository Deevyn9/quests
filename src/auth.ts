import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { upsertGoogleUser } from "@/lib/db/users";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google], // reads AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET automatically
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !account.providerAccountId || !user.email) {
        return false;
      }
      await upsertGoogleUser({
        id: account.providerAccountId,
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
      });
      return true;
    },
    jwt({ token, account }) {
  if (account?.provider === "google") {
    token.userId = account.providerAccountId;
  }

  return token;
},

session({ session, token }) {
  if (typeof token.userId === "string") {
    session.user.id = token.userId;
  }

  return session;
},
  },
});