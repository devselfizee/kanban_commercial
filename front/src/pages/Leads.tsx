/**
 * Pipeline n°1 — boîte de qualification des leads (§4).
 *
 * Ce tableau absorbe les entrants et les cibles créées par prospection : les
 * cartes sont les mêmes, seules les règles de priorité diffèrent selon l'origine.
 *
 * Les drapeaux « sans suivi » et « prise en charge en retard » viennent du
 * serveur : le front ne recalcule pas les règles métier, il les affiche.
 */

import { useNavigate } from "react-router-dom";
import { api, ErreurApi } from "@/api/client";
import { useApi } from "@/hooks/useApi";
import Tableau from "@/composants/Tableau";
import EnTetePipeline from "@/composants/EnTetePipeline";
import { Chargement, Erreur } from "@/composants/Etats";
import type { DonneesCarte } from "@/composants/Carte";
import { COLONNES_LEAD } from "@/lib/pipelines";
import {
  LIBELLE_CANAL,
  LIBELLE_MODE_ACQUISITION,
  LIBELLE_PROJET,
  LIBELLE_SEGMENT,
} from "@/lib/libelles";
import { dateCourte, depuis, titreCarte } from "@/lib/format";
import type {
  CanalDetaille,
  ModeAcquisition,
  Priorite,
  ProjetRecherche,
  SegmentClient,
  StatutLead,
} from "@/lib/types";

type LeadApi = {
  id: string;
  reference: string;
  statut: StatutLead;
  priorite: Priorite;
  modeAcquisition: ModeAcquisition;
  canalDetaille: CanalDetaille;
  segment: SegmentClient | null;
  projetRecherche: ProjetRecherche;
  nom: string | null;
  ville: string | null;
  besoinResume: string | null;
  horizonIndicatif: string | null;
  contact: string | null;
  responsable: string | null;
  prochaineActionLe: string | null;
  prochaineActionLabel: string | null;
  prochaineActionEnRetard: boolean;
  dateReactivation: string | null;
  derniereActivite: { objet: string; date: string } | null;
  nbActivites: number;
  ageEtape: number;
  sansSuivi: boolean;
  priseEnChargeTardive: boolean;
};

export default function Leads() {
  const navigate = useNavigate();
  const { donnees, chargement, erreur, recharger } =
    useApi<LeadApi[]>("/leads");

  if (chargement) return <Chargement quoi="les leads" />;
  if (erreur) return <Erreur message={erreur} onReessayer={recharger} />;

  const leads = donnees ?? [];
  const maintenant = new Date();

  const cartes: (DonneesCarte & { statut: StatutLead })[] = leads.map((l) => {
    const badges: DonneesCarte["badges"] = [
      {
        texte: LIBELLE_MODE_ACQUISITION[l.modeAcquisition],
        ton:
          l.modeAcquisition === "ENTRANT"
            ? "entrant"
            : l.modeAcquisition === "PROSPECTION"
              ? "prospection"
              : "reactivation",
      },
      { texte: LIBELLE_CANAL[l.canalDetaille] },
    ];
    if (l.segment) badges.push({ texte: LIBELLE_SEGMENT[l.segment] });
    badges.push({ texte: LIBELLE_PROJET[l.projetRecherche] });

    // Délai de première prise en charge dépassé : la carte doit sauter aux yeux.
    if (l.priseEnChargeTardive) {
      badges.push({
        texte: "Prise en charge en retard",
        ton: "alerte",
        titre: "Aucun premier contact journalisé dans le délai interne.",
      });
    }

    return {
      id: l.id,
      statut: l.statut,
      reference: l.reference,
      titre: titreCarte({
        nom: l.nom,
        ville: l.ville,
        projet: l.besoinResume,
      }),
      badges,
      contact: l.contact,
      echeance: l.dateReactivation
        ? `Réactivation ${dateCourte(new Date(l.dateReactivation))}`
        : l.horizonIndicatif,
      derniereActivite: l.derniereActivite
        ? `${l.derniereActivite.objet} · ${depuis(new Date(l.derniereActivite.date), maintenant)}`
        : null,
      prochaineAction: l.prochaineActionLe
        ? {
            label: l.prochaineActionLabel ?? "Action planifiée",
            date: dateCourte(new Date(l.prochaineActionLe))!,
            enRetard: l.prochaineActionEnRetard,
          }
        : null,
      ageEtape: l.ageEtape,
      priorite: l.priorite,
      responsable: l.responsable,
      sansSuivi: l.sansSuivi,
      nbActivites: l.nbActivites,
    };
  });

  const colonnes = COLONNES_LEAD.map((colonne) => ({
    colonne,
    cartes: cartes.filter((c) => c.statut === colonne.cle),
  }));

  return (
    <div className="flex h-[calc(100vh-9.5rem)] flex-col">
      <EnTetePipeline
        titre="Leads à qualifier"
        sousTitre="Répondre vite, comprendre le besoin, décider si le lead mérite une opportunité."
        total={cartes.length}
        sansSuivi={cartes.filter((c) => c.sansSuivi).length}
        actionNouveau={{ href: "/leads/nouveau", libelle: "Nouveau lead" }}
      />
      <Tableau
        colonnes={colonnes}
        onOuvrir={(id) => navigate(`/leads/${id}`)}
        // La création part toujours du formulaire : les champs obligatoires du
        // §8 ne peuvent pas être saisis dans une carte vide.
        onAjouter={() => navigate("/leads/nouveau")}
        onDeplacer={async (id, statut, rang) => {
          try {
            await api.patch(`/leads/${id}/deplacer`, { statut, rang });
            recharger();
            return null;
          } catch (e) {
            return e instanceof ErreurApi ? e.message : "Déplacement refusé.";
          }
        }}
      />
    </div>
  );
}
