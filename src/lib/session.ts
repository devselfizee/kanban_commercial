/**
 * Session et matrice de droits (§5, §12).
 *
 * MVP : l'utilisateur courant est choisi via un cookie, sans mot de passe. Le modèle
 * de droits ci-dessous est en revanche complet et appliqué côté serveur ; brancher
 * une vraie authentification ne changera que `utilisateurCourant()`.
 */

import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { prisma } from "./prisma";

export const COOKIE_UTILISATEUR = "kc_utilisateur";

export type UtilisateurSession = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
};

export async function utilisateurCourant(): Promise<UtilisateurSession | null> {
  const store = await cookies();
  const id = store.get(COOKIE_UTILISATEUR)?.value;
  if (!id) return null;

  const u = await prisma.utilisateur.findFirst({
    where: { id, actif: true },
    select: { id: true, nom: true, prenom: true, email: true, role: true },
  });
  return u;
}

export async function exigerUtilisateur(): Promise<UtilisateurSession> {
  const u = await utilisateurCourant();
  if (!u) throw new Error("Aucun utilisateur sélectionné.");
  return u;
}

// ---------------------------------------------------------------------------
// Matrice de droits
// ---------------------------------------------------------------------------

/** Le manager et la direction voient l'ensemble ; les autres voient leur périmètre. */
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
 * Les documents liés au financement ne sont accessibles qu'aux personnes qui les
 * traitent. Le commercial voit le statut LLD et le prochain jalon, pas le contenu
 * des pièces (§12).
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
