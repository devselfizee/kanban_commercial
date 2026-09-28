/**
 * L'utilisateur connecté, accessible depuis n'importe quelle page.
 *
 * En rendu côté serveur, chaque page appelait `utilisateurCourant()`. Ici
 * l'identité est chargée une fois par `App` et partagée par un contexte : les
 * fiches en ont besoin pour savoir qui est propriétaire d'une carte et quelles
 * actions proposer.
 *
 * Ce que le contexte porte n'est qu'un reflet. Le back reste seul juge : une
 * action masquée ici serait de toute façon refusée par l'API.
 */

import { createContext, useContext } from "react";
import type { Utilisateur } from "./types";

const ContexteSession = createContext<Utilisateur | null>(null);

export const FournisseurSession = ContexteSession.Provider;

/** L'utilisateur connecté. `null` seulement hors de l'arbre authentifié. */
export function useUtilisateur(): Utilisateur | null {
  return useContext(ContexteSession);
}
