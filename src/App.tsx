/**
 * Ossature de l'application : navigation, routage et garde d'accès.
 *
 * Le front ne décide jamais des droits — il reflète ce que le back lui répond.
 * Une erreur 403 s'affiche telle quelle plutôt que d'être contournée.
 */

import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Navigation from "./composants/Navigation";
import Connexion from "./pages/Connexion";
import Accueil from "./pages/Accueil";
import Leads from "./pages/Leads";
import NouveauLead from "./pages/NouveauLead";
import Ventes from "./pages/Ventes";
import Lld from "./pages/Lld";
import MesActions from "./pages/MesActions";
import Pilotage from "./pages/Pilotage";
import Synchro from "./pages/Synchro";
import { api, ErreurApi } from "./api/client";
import {
  authentificationActive,
  estAuthentifie,
  utilisateurLocal,
} from "./lib/auth";
import type { Utilisateur } from "./lib/types";

type Etat =
  | { phase: "chargement" }
  | { phase: "anonyme" }
  | { phase: "sans_compte"; message: string }
  | { phase: "connecte"; utilisateur: Utilisateur };

export default function App() {
  const [etat, setEtat] = useState<Etat>({ phase: "chargement" });

  async function chargerIdentite() {
    // Sans session, inutile d'interroger l'API : elle répondrait 401.
    if (!estAuthentifie()) {
      setEtat({ phase: "anonyme" });
      return;
    }
    try {
      const utilisateur = await api.get<Utilisateur>("/utilisateurs/moi");
      setEtat({ phase: "connecte", utilisateur });
    } catch (e) {
      if (e instanceof ErreurApi && e.statut === 403) {
        // Authentifié côté Keycloak, mais inconnu du kanban ou sans le rôle :
        // le message du serveur dit précisément lequel des deux.
        setEtat({ phase: "sans_compte", message: e.message });
      } else {
        setEtat({ phase: "anonyme" });
      }
    }
  }

  useEffect(() => {
    void chargerIdentite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (etat.phase === "chargement") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-[var(--texte-doux)]">Chargement…</p>
      </div>
    );
  }

  if (etat.phase !== "connecte") {
    return (
      <Connexion
        message={etat.phase === "sans_compte" ? etat.message : undefined}
        onUtilisateurChoisi={() => void chargerIdentite()}
      />
    );
  }

  return (
    <>
      <Navigation
        utilisateur={etat.utilisateur}
        authentifie={authentificationActive}
      />
      <main className="px-5 py-5">
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/leads/nouveau" element={<NouveauLead />} />
          <Route path="/leads/:id" element={<Leads />} />
          <Route path="/ventes" element={<Ventes />} />
          <Route path="/ventes/:id" element={<Ventes />} />
          <Route path="/lld" element={<Lld />} />
          <Route path="/lld/:id" element={<Lld />} />
          <Route path="/mes-actions" element={<MesActions />} />
          <Route path="/pilotage" element={<Pilotage />} />
          <Route path="/synchro" element={<Synchro />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

/** Exporté pour que les pages sachent qui est connecté sans le recharger. */
export function utilisateurDepuisStockage(): string | null {
  return utilisateurLocal();
}
