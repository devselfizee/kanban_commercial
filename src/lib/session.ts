/**
 * Session et matrice de droits (§5, §12).
 *
 * Deux modes, selon la configuration :
 *
 *   - **Keycloak configuré** : l'identité vient du SSO. Le rôle d'accès
 *     `kanban-commercial` ouvre la porte ; le rôle métier est lu dans la table
 *     `utilisateurs`, rapproché par l'e-mail. Le sélecteur est sans effet.
 *   - **Keycloak absent** : l'utilisateur est choisi par cookie, sans mot de
 *     passe. Ce mode sert au développement local et ne doit jamais être exposé.
 *
 * La matrice de droits ci-dessous est la même dans les deux cas et reste
 * appliquée côté serveur.
 */

import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { auth, keycloakConfigure } from "@/auth";

export const COOKIE_UTILISATEUR = "kc_utilisateur";

export type UtilisateurSession = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
};

/**
 * Vrai quand l'application s'appuie sur Keycloak.
 * L'interface s'en sert pour masquer le sélecteur et afficher un bouton de
 * déconnexion.
 */
export const authentificationActive = keycloakConfigure;

export async function utilisateurCourant(): Promise<UtilisateurSession | null> {
  if (keycloakConfigure) {
    const session = await auth();
    if (!session?.user?.idKanban) return null;

    const u = await prisma.utilisateur.findFirst({
      where: { id: session.user.idKanban, actif: true },
      select: { id: true, nom: true, prenom: true, email: true, role: true },
    });
    return u;
  }

  // Mode local : sélection par cookie.
  const store = await cookies();
  const id = store.get(COOKIE_UTILISATEUR)?.value;
  if (!id) return null;

  return prisma.utilisateur.findFirst({
    where: { id, actif: true },
    select: { id: true, nom: true, prenom: true, email: true, role: true },
  });
}

export async function exigerUtilisateur(): Promise<UtilisateurSession> {
  const u = await utilisateurCourant();
  if (!u) throw new Error("Aucun utilisateur authentifié.");
  return u;
}

/**
 * Distingue « personne n'est connecté » de « connecté mais inconnu du kanban ».
 *
 * Le second cas mérite un message explicite : l'utilisateur s'est authentifié
 * correctement, mais aucun compte ne lui correspond ici.
 */
export async function etatAcces(): Promise<
  | { etat: "anonyme" }
  | { etat: "sans_compte"; email: string | null }
  | { etat: "connecte"; utilisateur: UtilisateurSession }
> {
  const utilisateur = await utilisateurCourant();
  if (utilisateur) return { etat: "connecte", utilisateur };

  if (keycloakConfigure) {
    const session = await auth();
    if (session?.user) {
      return { etat: "sans_compte", email: session.user.email ?? null };
    }
  }

  return { etat: "anonyme" };
}

// ---------------------------------------------------------------------------
// Matrice de droits
// ---------------------------------------------------------------------------

/** Le manager et la direction voient l'ensemble ; les autres leur périmètre. */
export function voitToutesLesCartes(role: Role): boolean {
  return role === "MANAGER" || role === "DIRECTION";
}

/** Seul un manager réattribue une carte déjà prise en charge. */
export function peutReattribuer(role: Role): boolean {
  return role === "MANAGER";
}

/** La collaboratrice LLD et le manager font progresser un dossier de financement. */
export function peutModifierLld(role: Role): boolean {
  return role === "COLLABORATRICE_LLD" || role === "MANAGER";
}

/**
 * Les documents liés au financement ne sont accessibles qu'aux personnes qui
 * les traitent. Le commercial voit le statut LLD et le prochain jalon, pas le
 * contenu des pièces (§12).
 */
export function peutVoirDocumentsFinanciers(role: Role): boolean {
  return role === "COLLABORATRICE_LLD" || role === "MANAGER" || role === "DIRECTION";
}

/** La direction consulte ; elle ne fait pas avancer les cartes au quotidien. */
export function peutModifierCarteCommerciale(role: Role): boolean {
  return role !== "DIRECTION";
}

export function peutParametrer(role: Role): boolean {
  return role === "MANAGER";
}
