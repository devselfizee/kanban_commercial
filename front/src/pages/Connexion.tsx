/**
 * Écran de connexion.
 *
 * Il distingue trois situations, parce qu'elles appellent trois réactions
 * différentes de la part de l'utilisateur :
 *   - non connecté : bouton de connexion ;
 *   - refusé faute de rôle : à demander à l'administrateur Keycloak ;
 *   - authentifié mais inconnu du kanban : son compte doit y être créé.
 *
 * Sans Keycloak, il présente le sélecteur d'utilisateur du mode local.
 */

import { useEffect, useState } from "react";
import {
  authentificationActive,
  definirUtilisateurLocal,
  seConnecter,
  seDeconnecter,
} from "@/lib/auth";
import { LIBELLE_ROLE } from "@/lib/libelles";
import type { Role } from "@/lib/types";

type UtilisateurLocal = {
  id: string;
  prenom: string;
  nom: string;
  role: Role;
};

export default function Connexion({
  message,
  onUtilisateurChoisi,
}: {
  /** Message du serveur quand l'accès est refusé malgré une authentification. */
  message?: string;
  onUtilisateurChoisi: () => void;
}) {
  const [equipe, setEquipe] = useState<UtilisateurLocal[]>([]);

  useEffect(() => {
    if (authentificationActive) return;
    // Mode local : la liste alimente le sélecteur, avant toute authentification.
    fetch("/api/utilisateurs-locaux")
      .then((r) => (r.ok ? r.json() : []))
      .then(setEquipe)
      .catch(() => setEquipe([]));
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="rounded-2xl border border-[var(--trait)] bg-white p-8 text-center shadow-sm">
        <img
          src="/marque/logo-selfizee.png"
          alt="Selfizee"
          className="mx-auto h-8 w-auto"
        />

        <h1 className="mt-6 text-lg font-bold text-[var(--texte-fort)]">
          Kanban commercial
        </h1>

        {message ? (
          <>
            <p className="mt-4 rounded-lg bg-[var(--alerte-fond)] px-3 py-2.5 text-xs leading-relaxed text-[var(--alerte-texte)]">
              {message}
            </p>
            <p className="mt-3 text-xs text-[var(--texte-doux)]">
              Demandez à votre manager de créer votre compte, en précisant le
              rôle souhaité : commercial, collaboratrice LLD, manager ou
              direction.
            </p>
            <button
              onClick={seDeconnecter}
              className="mt-4 text-xs text-[var(--texte-doux)] underline hover:text-[var(--selfizee-600)]"
            >
              Se déconnecter
            </button>
          </>
        ) : authentificationActive ? (
          <>
            <p className="mt-2 text-sm text-[var(--texte-doux)]">
              Connectez-vous avec votre compte Selfizee.
            </p>
            <button
              onClick={seConnecter}
              className="mt-6 w-full rounded-lg bg-[var(--selfizee-600)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--selfizee-700)]"
            >
              Se connecter
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-[var(--texte-doux)]">
              Mode local : choisissez un utilisateur pour éprouver la matrice de
              droits.
            </p>
            <p className="mt-2 rounded-lg bg-[var(--alerte-fond)] px-3 py-2 text-[11px] text-[var(--alerte-texte)]">
              Sans authentification : réservé au développement, à ne jamais
              exposer publiquement.
            </p>

            <div className="mt-5 space-y-2">
              {equipe.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    definirUtilisateurLocal(u.id);
                    onUtilisateurChoisi();
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-[var(--trait-fort)] px-3 py-2.5 text-left text-sm transition hover:border-[var(--selfizee-300)] hover:bg-[var(--selfizee-50)]"
                >
                  <span className="font-medium text-[var(--texte-fort)]">
                    {u.prenom} {u.nom}
                  </span>
                  <span className="text-xs text-[var(--texte-doux)]">
                    {LIBELLE_ROLE[u.role]}
                  </span>
                </button>
              ))}
              {equipe.length === 0 && (
                <p className="py-4 text-xs text-[var(--texte-doux)]">
                  Aucun utilisateur en base. Lancez le seed ou créez un compte.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
