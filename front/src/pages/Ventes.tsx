/**
 * Pipeline n°2 — pipeline commercial unique (§6).
 *
 * Le pipeline reste le même pour un achat et une LLD jusqu'au moment où le
 * traitement financier devient nécessaire.
 */

import { useNavigate } from "react-router-dom";
import { api, ErreurApi } from "@/api/client";
import { useApi } from "@/hooks/useApi";
import Tableau from "@/composants/Tableau";
import EnTetePipeline from "@/composants/EnTetePipeline";
import { Chargement, Erreur } from "@/composants/Etats";
import type { DonneesCarte } from "@/composants/Carte";
import { COLONNES_OPPORTUNITE } from "@/lib/pipelines";
import { BADGE_LLD_COURT, LIBELLE_PROJET, LIBELLE_SEGMENT } from "@/lib/libelles";
import { dateCourte, depuis, euros, titreCarte } from "@/lib/format";
import type {
  EtapeCommerciale,
  Priorite,
  ProjetRecherche,
  SegmentClient,
  StatutLld,
} from "@/lib/types";

type OpportuniteApi = {
  id: string;
  reference: string;
  titre: string;
  etape: EtapeCommerciale;
  priorite: Priorite;
  projetRecherche: ProjetRecherche;
  segment: SegmentClient;
  nom: string;
  ville: string | null;
  solutionEnvisagee: string | null;
  quantiteBornes: number | null;
  montantVente: number | null;
  loyerMensuelEnvisage: number | null;
  dureeLldMois: number | null;
  dateCible: string | null;
  dateEvenement: string | null;
  contact: string | null;
  responsable: string | null;
  prochaineActionLe: string | null;
  prochaineActionLabel: string | null;
  prochaineActionEnRetard: boolean;
  derniereActivite: { objet: string; date: string } | null;
  nbActivites: number;
  ageEtape: number;
  sansSuivi: boolean;
  statutLld: StatutLld | null;
  alerteCompatibilite: string | null;
};

type ReponseVentes = {
  cartes: OpportuniteApi[];
  valeurs: {
    ventes: number;
    nbVentes: number;
    loyersMensuels: number;
    nbLld: number;
  };
};

export default function Ventes() {
  const navigate = useNavigate();
  const { donnees, chargement, erreur, recharger } =
    useApi<ReponseVentes>("/opportunites");

  if (chargement) return <Chargement quoi="les opportunités" />;
  if (erreur) return <Erreur message={erreur} onReessayer={recharger} />;

  const opportunites = donnees?.cartes ?? [];
  const valeurs = donnees?.valeurs;
  const maintenant = new Date();

  const cartes: (DonneesCarte & { etape: EtapeCommerciale })[] = opportunites.map(
    (o) => {
      const badges: DonneesCarte["badges"] = [
        { texte: LIBELLE_SEGMENT[o.segment] },
        {
          texte: LIBELLE_PROJET[o.projetRecherche],
          ton: o.projetRecherche === "LLD" ? "lld" : "neutre",
        },
      ];
      if (o.quantiteBornes) {
        badges.push({
          texte: `${o.quantiteBornes} borne${o.quantiteBornes > 1 ? "s" : ""}`,
        });
      }

      return {
        id: o.id,
        etape: o.etape,
        reference: o.reference,
        titre: titreCarte({
          nom: o.nom,
          ville: o.ville,
          projet: o.solutionEnvisagee ?? o.titre,
        }),
        badges,
        contact: o.contact,
        // Les valeurs restent distinctes : vente d'un côté, loyer de l'autre.
        montant:
          o.projetRecherche === "LLD" && o.loyerMensuelEnvisage
            ? `${euros(o.loyerMensuelEnvisage)} / mois${o.dureeLldMois ? ` × ${o.dureeLldMois} mois` : ""}`
            : euros(o.montantVente),
        echeance: o.dateEvenement
          ? `Évènement ${dateCourte(new Date(o.dateEvenement))}`
          : o.dateCible
            ? `Cible ${dateCourte(new Date(o.dateCible))}`
            : null,
        derniereActivite: o.derniereActivite
          ? `${o.derniereActivite.objet} · ${depuis(new Date(o.derniereActivite.date), maintenant)}`
          : null,
        prochaineAction: o.prochaineActionLe
          ? {
              label: o.prochaineActionLabel ?? "Action planifiée",
              date: dateCourte(new Date(o.prochaineActionLe))!,
              enRetard: o.prochaineActionEnRetard,
            }
          : null,
        ageEtape: o.ageEtape,
        priorite: o.priorite,
        responsable: o.responsable,
        sansSuivi: o.sansSuivi,
        badgeLld: o.statutLld ? BADGE_LLD_COURT[o.statutLld] : null,
        nbActivites: o.nbActivites,
        alerteCompatibilite: o.alerteCompatibilite,
      };
    },
  );

  const colonnes = COLONNES_OPPORTUNITE.map((colonne) => ({
    colonne,
    cartes: cartes.filter((c) => c.etape === colonne.cle),
  }));

  return (
    <div className="flex h-[calc(100vh-9.5rem)] flex-col">
      <EnTetePipeline
        titre="Ventes"
        sousTitre="Construire l'offre, négocier, obtenir la commande ou orienter vers la LLD."
        total={cartes.length}
        sansSuivi={cartes.filter((c) => c.sansSuivi).length}
      />

      {valeurs && <ResumeValeurs {...valeurs} />}

      <Tableau
        colonnes={colonnes}
        onOuvrir={(id) => navigate(`/ventes/${id}`)}
        onDeplacer={async (id, etape, rang) => {
          try {
            await api.patch(`/opportunites/${id}/deplacer`, { etape, rang });
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

/**
 * Valeurs du pipeline, affichées séparément (§6, §11).
 *
 * Une vente directe et un total de loyers ne sont pas le même indicateur : ils
 * ne sont jamais additionnés, et aucun total consolidé n'est proposé ici.
 */
function ResumeValeurs({
  ventes,
  nbVentes,
  loyersMensuels,
  nbLld,
}: {
  ventes: number;
  nbVentes: number;
  loyersMensuels: number;
  nbLld: number;
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      <div className="rounded-lg border border-[var(--trait)] bg-white px-3 py-2">
        <p className="text-[10px] uppercase tracking-wide text-[var(--texte-doux)]">
          Ventes directes en cours
        </p>
        <p className="text-sm font-semibold">
          {euros(ventes)}{" "}
          <span className="text-xs font-normal text-[var(--texte-doux)]">
            · {nbVentes} opportunité{nbVentes > 1 ? "s" : ""}
          </span>
        </p>
      </div>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wide text-indigo-700">
          LLD en cours — loyers mensuels
        </p>
        <p className="text-sm font-semibold">
          {euros(loyersMensuels)} / mois{" "}
          <span className="text-xs font-normal text-[var(--texte-doux)]">
            · {nbLld} dossier{nbLld > 1 ? "s" : ""}
          </span>
        </p>
      </div>

      <p className="self-center text-[10px] italic text-[var(--texte-tres-doux)]">
        Les ventes directes et les loyers ne sont pas additionnés : ce sont deux
        indicateurs distincts.
      </p>
    </div>
  );
}
