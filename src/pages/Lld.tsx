/**
 * Pipeline n°3 — dossier LLD / GRENKE (§7).
 *
 * Vue distincte sur le même projet : le commercial continue d'utiliser le
 * pipeline commercial, la collaboratrice fait progresser le statut du dossier.
 *
 * Ce tableau n'affiche aucune probabilité d'acceptation ni score de solvabilité :
 * uniquement des faits observables et leurs dates.
 */

import { useNavigate } from "react-router-dom";
import { api, ErreurApi } from "@/api/client";
import { useApi } from "@/hooks/useApi";
import Tableau from "@/composants/Tableau";
import EnTetePipeline from "@/composants/EnTetePipeline";
import { Chargement, Erreur } from "@/composants/Etats";
import type { DonneesCarte } from "@/composants/Carte";
import { COLONNES_LLD } from "@/lib/pipelines";
import { dateCourte, depuis, euros, titreCarte } from "@/lib/format";
import type { StatutLld } from "@/lib/types";

type DossierApi = {
  id: string;
  reference: string;
  statut: StatutLld;
  dureeDemandeeMois: number;
  montantFinance: number | null;
  loyerMensuel: number | null;
  locataire: string | null;
  nom: string;
  ville: string | null;
  titreOpportunite: string;
  referenceOpportunite: string;
  checklistFaits: number;
  checklistTotal: number;
  dateTransmission: string | null;
  canalTransmission: string | null;
  elementAttenduLabel: string | null;
  dateLivraisonPrevue: string | null;
  prochaineRelanceLe: string | null;
  prochaineActionLe: string | null;
  prochaineActionLabel: string | null;
  prochaineActionEnRetard: boolean;
  responsable: string | null;
  derniereActivite: { objet: string; date: string } | null;
  nbActivites: number;
  ageEtape: number;
  sansSuivi: boolean;
  alerteCompatibilite: string | null;
};

export default function Lld() {
  const navigate = useNavigate();
  const { donnees, chargement, erreur, recharger } = useApi<DossierApi[]>("/lld");

  if (chargement) return <Chargement quoi="les dossiers LLD" />;
  if (erreur) return <Erreur message={erreur} onReessayer={recharger} />;

  const dossiers = donnees ?? [];
  const maintenant = new Date();

  const cartes: (DonneesCarte & { statut: StatutLld })[] = dossiers.map((d) => {
    const badges: DonneesCarte["badges"] = [
      { texte: `${d.dureeDemandeeMois} mois`, ton: "lld" },
      {
        texte: `Checklist ${d.checklistFaits}/${d.checklistTotal}`,
        titre: "Checklist interne de complétude Selfizee",
      },
    ];
    if (d.dateTransmission) {
      badges.push({
        texte: `Transmis ${dateCourte(new Date(d.dateTransmission))}`,
        titre: `Canal : ${d.canalTransmission ?? "non précisé"}`,
      });
    }
    if (d.elementAttenduLabel && d.statut === "EN_ATTENTE_ELEMENTS_CLIENT") {
      badges.push({ texte: `Attente : ${d.elementAttenduLabel}`, ton: "alerte" });
    }

    return {
      id: d.id,
      statut: d.statut,
      reference: d.reference,
      titre: titreCarte({
        nom: d.nom,
        ville: d.ville,
        projet: d.titreOpportunite,
      }),
      badges,
      contact: `Opp. ${d.referenceOpportunite}`,
      montant: d.loyerMensuel
        ? `${euros(d.loyerMensuel)} / mois`
        : euros(d.montantFinance),
      echeance: d.dateLivraisonPrevue
        ? `Livraison ${dateCourte(new Date(d.dateLivraisonPrevue))}`
        : d.prochaineRelanceLe
          ? `Relance ${dateCourte(new Date(d.prochaineRelanceLe))}`
          : null,
      derniereActivite: d.derniereActivite
        ? `${d.derniereActivite.objet} · ${depuis(new Date(d.derniereActivite.date), maintenant)}`
        : null,
      prochaineAction: d.prochaineActionLe
        ? {
            label: d.prochaineActionLabel ?? "Action planifiée",
            date: dateCourte(new Date(d.prochaineActionLe))!,
            enRetard: d.prochaineActionEnRetard,
          }
        : null,
      ageEtape: d.ageEtape,
      priorite: "P3_SUIVI_PLANIFIE",
      responsable: d.responsable ?? "Non attribué",
      sansSuivi: d.sansSuivi,
      nbActivites: d.nbActivites,
      alerteCompatibilite: d.alerteCompatibilite,
    };
  });

  const colonnes = COLONNES_LLD.map((colonne) => ({
    colonne,
    cartes: cartes.filter((c) => c.statut === colonne.cle),
  }));

  const aConfirmer = cartes.filter((c) => c.alerteCompatibilite).length;

  return (
    <div className="flex h-[calc(100vh-9.5rem)] flex-col">
      <EnTetePipeline
        titre="LLD / GRENKE"
        sousTitre="Préparer, transmettre et suivre le dossier jusqu'aux signatures et à la livraison."
        precision="Ce tableau enregistre des faits observables. Aucune décision de financement n'y est déduite en l'absence de retour du partenaire."
        total={cartes.length}
        sansSuivi={cartes.filter((c) => c.sansSuivi).length}
        alerte={
          aConfirmer > 0
            ? `${aConfirmer} dossier(s) : compatibilité partenaire à confirmer`
            : undefined
        }
      />
      <Tableau
        colonnes={colonnes}
        onOuvrir={(id) => navigate(`/lld/${id}`)}
        onDeplacer={async (id, statut, rang) => {
          try {
            await api.patch(`/lld/${id}/deplacer`, { statut, rang });
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
