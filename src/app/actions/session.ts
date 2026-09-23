"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_UTILISATEUR } from "@/lib/session";

/** Fixe l'utilisateur courant (MVP : sélection sans mot de passe). */
export async function choisirUtilisateur(id: string) {
  const store = await cookies();
  if (id) {
    store.set(COOKIE_UTILISATEUR, id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  } else {
    store.delete(COOKIE_UTILISATEUR);
  }
  revalidatePath("/", "layout");
}

/** Déconnexion Keycloak. Passe par une action serveur pour rester en POST. */
export async function deconnecter() {
  const { signOut } = await import("@/auth");
  await signOut({ redirectTo: "/connexion" });
}
