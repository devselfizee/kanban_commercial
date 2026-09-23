/**
 * Pipeline n°3 — dossier LLD / GRENKE (§7).
 *
 * Vue distincte sur le même projet : le commercial continue d'utiliser le pipeline
 * commercial, la collaboratrice fait progresser le statut du dossier.
 *
 * Ce tableau n'affiche aucune probabilité d'acceptation ni score de solvabilité :
 * uniquement des faits observables et leurs dates.
 */

import { prisma } from "@/lib/prisma";
import { utilisateurCourant, voitToutesLesCartes } from "@/lib/session";
import { COLONNES_LLD } from "@/lib/domaine/pipelines";
import {
  estEnRetard,
  estTerminaleLld,
  joursDepuis,
  sansSuiviPlanifie,
  verifierCompatibilitePartenaire,
} from "@/lib/domaine/regles";
import { dateCourte, depuis, euros, titreCarte } from "@/lib/format";
import type { DonneesCarte } from "@/components/Carte";
import TableauLld from "./TableauLld";
import EnTetePipeline from "@/components/EnTetePipeline";

export const dynamic = "force-dynamic";

export default async function PageLld() {
  const utilisateur = await utilisateurCourant();

  // La collaboratrice voit ses dossiers ; manager et direction voient tout ;
  // le commercial voit les dossiers de ses opportunités (statut et jalon seulement).
  const filtre =
    !utilisateur || voitToutesLesCartes(utilisateur.role)
      ? {}
      : utilisateur.role === "COLLABORATRICE_LLD"
        ? { collaboratriceId: utilisateur.id }
        : { commercialId: utilisateur.id };

  const dossiers = await prisma.dossierLld.findMany({
    where: filtre,
    orderBy: [{ rang: "asc" }, { creeLe: "desc" }],
    include: {
      opportunite: {
        select: {
          reference: true,
          titre: true,
          organisation: { select: { nom: true, ville: true } },
        },
      },
      collaboratrice: { select: { prenom: true, nom: true } },
      commercial: { select: { prenom: true, nom: true } },
      checklist: { select: { fait: true } },
      activites: {
        orderBy: { dateReelle: "desc" },
        take: 1,
        select: { objet: true, dateReelle: true },
      },
    },
  });

  const maintenant = new Date();

  const cartes = dossiers.map((d) => {
    const terminale = estTerminaleLld(d.statut);
    const derniere = d.activites[0];
    const faits = d.checklist.filter((c) => c.fait).length;

    const alerte = verifierCompatibilitePartenaire(
      d.dureeDemandeeMois,
      d.montantFinance ? Number(d.montantFinance) : null,
    );

    const badges: DonneesCarte["badges"] = [
      { texte: `${d.dureeDemandeeMois} mois`, ton: "lld" },
      {
        texte: `Checklist ${faits}/${d.checklist.length}`,
        titre: "Checklist interne de complétude Selfizee",
      },
    ];
    if (d.dateTransmission) {
      badges.push({
        texte: `Transmis ${dateCourte(d.dateTransmission)}`,
        titre: `Canal : ${d.canalTransmission ?? "non précisé"}`,
      });
    }
    if (d.elementAttenduLabel && d.statut === "EN_ATTENTE_ELEMENTS_CLIENT") {
      badges.push({ texte: `Attente : ${d.elementAttenduLabel}`, ton: "alerte" });
    }

    const carte: DonneesCarte & { statut: typeof d.statut } = {
      id: d.id,
      statut: d.statut,
      reference: d.reference,
      titre: titreCarte({
        nom: d.locataire ?? d.opportunite.organisation.nom,
        ville: d.opportunite.organisation.ville,
        projet: d.opportunite.titre,
      }),
      badges,
      contact: `Opp. ${d.opportunite.reference}`,
      montant: d.loyerMensuel
        ? `${euros(d.loyerMensuel)} / mois`
        : euros(d.montantFinance),
      echeance: d.dateLivraisonPrevue
        ? `Livraison ${dateCourte(d.dateLivraisonPrevue)}`
        : d.prochaineRelanceLe
          ? `Relance ${dateCourte(d.prochaineRelanceLe)}`
          : null,
      derniereActivite: derniere
        ? `${derniere.objet} · ${depuis(derniere.dateReelle, maintenant)}`
        : null,
      prochaineAction: d.prochaineActionLe
        ? {
            label: d.prochaineActionLabel ?? "Action planifiée",
            date: dateCourte(d.prochaineActionLe)!,
            enRetard: estEnRetard(d.prochaineActionLe, maintenant),
          }
        : null,
      ageEtape: joursDepuis(d.entreEnEtapeLe, maintenant),
      priorite: "P3_SUIVI_PLANIFIE",
      responsable: d.collaboratrice
        ? `${d.collaboratrice.prenom} ${d.collaboratrice.nom}`
        : "Non attribué",
      sansSuivi: sansSuiviPlanifie({
        prochaineActionLe: d.prochaineActionLe,
        prochaineRelanceLe: d.prochaineRelanceLe,
        terminale,
      }),
      alerteCompatibilite: alerte.message,
    };
    return carte;
  });

  const colonnes = COLONNES_LLD.map((colonne) => ({
    colonne,
    cartes: cartes.filter((c) => c.statut === colonne.cle),
  }));

  const aConfirmer = cartes.filter((c) => c.alerteCompatibilite).length;

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <EnTetePipeline
        titre="LLD / GRENKE"
        sousTitre="Préparer, transmettre et suivre le dossier jusqu'aux signatures et à la livraison."
        total={cartes.length}
        sansSuivi={cartes.filter((c) => c.sansSuivi).length}
        alerte={
          aConfirmer > 0
            ? `${aConfirmer} dossier(s) : compatibilité partenaire à confirmer`
            : undefined
        }
      />
      <p className="mb-2 text-[11px] italic text-slate-500 dark:text-slate-400">
        Ce tableau enregistre des faits observables. Aucune décision de financement
        n&apos;y est déduite en l&apos;absence de retour du partenaire.
      </p>
      <TableauLld colonnes={colonnes} />
    </div>
  );
}
