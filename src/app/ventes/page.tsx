/**
 * Pipeline n°2 — pipeline commercial unique (§6).
 *
 * Le pipeline reste le même pour un achat et une LLD jusqu'au moment où le
 * traitement financier devient nécessaire.
 */

import { prisma } from "@/lib/prisma";
import { utilisateurCourant, voitToutesLesCartes } from "@/lib/session";
import { COLONNES_OPPORTUNITE } from "@/lib/domaine/pipelines";
import { BADGE_LLD_COURT, LIBELLE_PROJET, LIBELLE_SEGMENT } from "@/lib/domaine/libelles";
import {
  estEnRetard,
  estTerminaleOpportunite,
  joursDepuis,
  sansSuiviPlanifie,
  verifierCompatibilitePartenaire,
} from "@/lib/domaine/regles";
import { dateCourte, depuis, euros, titreCarte } from "@/lib/format";
import type { DonneesCarte } from "@/components/Carte";
import TableauVentes from "./TableauVentes";
import EnTetePipeline from "@/components/EnTetePipeline";
import ResumeValeurs from "@/components/ResumeValeurs";

export const dynamic = "force-dynamic";

export default async function PageVentes() {
  const utilisateur = await utilisateurCourant();

  const filtre =
    utilisateur && !voitToutesLesCartes(utilisateur.role)
      ? { commercialId: utilisateur.id }
      : {};

  const opportunites = await prisma.opportunite.findMany({
    where: filtre,
    orderBy: [{ rang: "asc" }, { creeLe: "desc" }],
    include: {
      organisation: { select: { nom: true, ville: true, segment: true } },
      contactPrincipal: { select: { nom: true, prenom: true } },
      commercial: { select: { prenom: true, nom: true } },
      dossierLld: {
        select: { statut: true, dureeDemandeeMois: true, montantFinance: true },
      },
      activites: {
        orderBy: { dateReelle: "desc" },
        take: 1,
        select: { objet: true, dateReelle: true },
      },
      _count: { select: { activites: true } },
    },
  });

  const maintenant = new Date();

  const cartes = opportunites.map((o) => {
    const terminale = estTerminaleOpportunite(o.etape);
    const derniere = o.activites[0];

    const badges: DonneesCarte["badges"] = [
      { texte: LIBELLE_SEGMENT[o.organisation.segment] },
      {
        texte: LIBELLE_PROJET[o.projetRecherche],
        ton: o.projetRecherche === "LLD" ? "lld" : "neutre",
      },
    ];
    if (o.quantiteBornes) {
      badges.push({ texte: `${o.quantiteBornes} borne${o.quantiteBornes > 1 ? "s" : ""}` });
    }

    // L'alerte de compatibilité partenaire suit l'opportunité dès qu'une LLD est
    // envisagée, avant même la création du dossier.
    const alerte =
      o.dossierLld || o.dureeLldMois
        ? verifierCompatibilitePartenaire(
            o.dossierLld?.dureeDemandeeMois ?? o.dureeLldMois!,
            o.dossierLld?.montantFinance
              ? Number(o.dossierLld.montantFinance)
              : o.montantVente
                ? Number(o.montantVente)
                : null,
          )
        : { aConfirmer: false, message: null };

    const carte: DonneesCarte & { etape: typeof o.etape } = {
      id: o.id,
      etape: o.etape,
      reference: o.reference,
      titre: titreCarte({
        nom: o.organisation.nom,
        ville: o.organisation.ville,
        projet: o.solutionEnvisagee ?? o.titre,
      }),
      badges,
      contact: o.contactPrincipal
        ? `${o.contactPrincipal.prenom ?? ""} ${o.contactPrincipal.nom}`.trim()
        : null,
      // Les valeurs restent distinctes : vente d'un côté, loyer de l'autre.
      montant:
        o.projetRecherche === "LLD" && o.loyerMensuelEnvisage
          ? `${euros(o.loyerMensuelEnvisage)} / mois${o.dureeLldMois ? ` × ${o.dureeLldMois} mois` : ""}`
          : euros(o.montantVente),
      echeance: o.dateEvenement
        ? `Évènement ${dateCourte(o.dateEvenement)}`
        : o.dateCible
          ? `Cible ${dateCourte(o.dateCible)}`
          : null,
      derniereActivite: derniere
        ? `${derniere.objet} · ${depuis(derniere.dateReelle, maintenant)}`
        : null,
      prochaineAction: o.prochaineActionLe
        ? {
            label: o.prochaineActionLabel ?? "Action planifiée",
            date: dateCourte(o.prochaineActionLe)!,
            enRetard: estEnRetard(o.prochaineActionLe, maintenant),
          }
        : null,
      ageEtape: joursDepuis(o.entreEnEtapeLe, maintenant),
      priorite: o.priorite,
      responsable: o.commercial ? `${o.commercial.prenom} ${o.commercial.nom}` : null,
      sansSuivi: sansSuiviPlanifie({
        prochaineActionLe: o.prochaineActionLe,
        terminale,
      }),
      badgeLld: o.dossierLld ? BADGE_LLD_COURT[o.dossierLld.statut] : null,
      nbActivites: o._count.activites,
      alerteCompatibilite: alerte.message,
    };
    return carte;
  });

  const colonnes = COLONNES_OPPORTUNITE.map((colonne) => ({
    colonne,
    cartes: cartes.filter((c) => c.etape === colonne.cle),
  }));

  // Ventes directes et LLD sont affichées séparément : on n'additionne jamais
  // un montant de vente et un total de loyers (§6, §11).
  const enCours = opportunites.filter((o) => !estTerminaleOpportunite(o.etape));
  const valeurs = {
    ventes: enCours
      .filter((o) => o.projetRecherche !== "LLD")
      .reduce((s, o) => s + Number(o.montantVente ?? 0), 0),
    nbVentes: enCours.filter((o) => o.projetRecherche !== "LLD").length,
    loyersMensuels: enCours
      .filter((o) => o.projetRecherche === "LLD")
      .reduce((s, o) => s + Number(o.loyerMensuelEnvisage ?? 0), 0),
    nbLld: enCours.filter((o) => o.projetRecherche === "LLD").length,
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <EnTetePipeline
        titre="Ventes"
        sousTitre="Construire l'offre, négocier, obtenir la commande ou orienter vers la LLD."
        total={cartes.length}
        sansSuivi={cartes.filter((c) => c.sansSuivi).length}
      />
      <ResumeValeurs {...valeurs} />
      <TableauVentes colonnes={colonnes} />
    </div>
  );
}
