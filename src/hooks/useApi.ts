/**
 * Chargement de données depuis l'API.
 *
 * En rendu côté serveur, les données arrivaient avec la page. Ici il faut gérer
 * explicitement les trois états — chargement, erreur, données — sous peine de
 * laisser l'utilisateur devant un écran vide sans explication.
 */

import { useCallback, useEffect, useState } from "react";
import { api, ErreurApi } from "@/api/client";

export type EtatChargement<T> = {
  donnees: T | null;
  chargement: boolean;
  erreur: string | null;
  recharger: () => void;
};

export function useApi<T>(chemin: string): EtatChargement<T> {
  const [donnees, setDonnees] = useState<T | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      setDonnees(await api.get<T>(chemin));
    } catch (e) {
      setErreur(
        e instanceof ErreurApi ? e.message : "Impossible de joindre le serveur.",
      );
    } finally {
      setChargement(false);
    }
  }, [chemin]);

  useEffect(() => {
    void charger();
  }, [charger]);

  return { donnees, chargement, erreur, recharger: () => void charger() };
}
