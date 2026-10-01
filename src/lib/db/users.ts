import { db } from "./index";
import { users } from "./schema";

export type GoogleUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

// Insert on first sign-in, refresh profile details on later ones.
export async function upsertGoogleUser(user: GoogleUser) {
  await db
    .insert(users)
    .values(user)
    .onConflictDoUpdate({
      target: users.id,
      set: { email: user.email, name: user.name, image: user.image },
    });
}