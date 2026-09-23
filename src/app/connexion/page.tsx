/**
 * Écran de connexion.
 *
 * Il distingue trois situations, parce qu'elles appellent trois réactions
 * différentes de la part de l'utilisateur :
 *   - non connecté : bouton de connexion ;
 *   - refusé par Keycloak : il lui manque le rôle d'accès, à demander à l'IT ;
 *   - authentifié mais inconnu du kanban : son compte doit y être créé.
 */

import Image from "next/image";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { authentificationActive, etatAcces } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string; error?: string }>;
}) {
  const { suite, error } = await searchParams;

  // Sans Keycloak, cette page n'a pas lieu d'être.
  if (!authentificationActive) redirect("/");

  const acces = await etatAcces();
  if (acces.etat === "connecte") redirect(suite || "/");

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
      <div className="rounded-2xl border border-[var(--trait)] bg-white p-8 text-center shadow-sm">
        <Image
          src="/marque/logo-selfizee.png"
          alt="Selfizee"
          width={243}
          height={66}
          priority
          className="mx-auto h-8 w-auto"
        />

        <h1 className="mt-6 text-lg font-bold text-[var(--texte-fort)]">
          Kanban commercial
        </h1>

        {acces.etat === "sans_compte" ? (
          <>
            <p className="mt-2 text-sm text-[var(--texte-doux)]">
              Vous êtes authentifié
              {acces.email ? ` avec l'adresse ${acces.email}` : ""}, mais aucun
              compte ne vous correspond dans le kanban.
            </p>
            <p className="mt-3 rounded-lg bg-[var(--alerte-fond)] px-3 py-2 text-xs text-[var(--alerte-texte)]">
              Demandez à votre manager de créer votre compte, en précisant le
              rôle souhaité : commercial, collaboratrice LLD, manager ou
              direction.
            </p>
            <form
              action={async () => {
                "use server";
                const { signOut } = await import("@/auth");
                await signOut({ redirectTo: "/connexion" });
              }}
            >
              <button
                type="submit"
                className="mt-4 text-xs text-[var(--texte-doux)] underline hover:text-[var(--selfizee-600)]"
              >
                Se déconnecter
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-[var(--texte-doux)]">
              Connectez-vous avec votre compte Selfizee.
            </p>

            {error && (
              <p className="mt-4 rounded-lg bg-[var(--danger-fond)] px-3 py-2 text-xs text-[var(--danger)]">
                {error === "AccessDenied"
                  ? "Accès refusé : votre compte ne dispose pas du rôle nécessaire pour cette application. Contactez votre administrateur."
                  : "La connexion a échoué. Réessayez, et contactez votre administrateur si le problème persiste."}
              </p>
            )}

            <form
              action={async () => {
                "use server";
                await signIn("keycloak", { redirectTo: suite || "/" });
              }}
            >
              <button
                type="submit"
                className="mt-6 w-full rounded-lg bg-[var(--selfizee-600)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--selfizee-700)]"
              >
                Se connecter
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
