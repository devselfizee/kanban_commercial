"use server";

/**
 * Actions du pipeline n°2 — pipeline commercial unique (§6).
 *
 * Le pipeline reste le même pour un achat et une LLD jusqu'au moment où le
 * traitement financier devient nécessaire : l'enjeu commercial ne disparaît pas
 * derrière la procédure de financement.
 */

import { revalidatePath } from "next/cache";
import type { EtapeCommerciale, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { genererReference } from "@/lib/references";
import { journaliser } from "@/lib/journal";
import { exigerUtilisateur, peutModifierCarteCommerciale } from "@/lib/session";
import { verifierCompatibilitePartenaire } from "@/lib/domaine/regles";
import type { ResultatAction } from "./leads";

// ---------------------------------------------------------------------------
// Déplacement dans le kanban
// ---------------------------------------------------------------------------

export async function deplacerOpportunite(
  opportuniteId: string,
  nouvelleEtape: EtapeCommerciale,
  nouveauRang: number,
): Promise<ResultatAction> {
  const utilisateur = await exigerUtilisateur();
  if (!peutModifierCarteCommerciale(utilisateur.role)) {
    return { ok: false, erreur: "Votre rôle ne permet pas de déplacer une carte." };
  }

  const opp = await prisma.opportunite.findUnique({
    where: { id: opportuniteId },
    include: { dossierLld: true },
  });
  if (!opp) return { ok: false, erreur: "Opportunité introuvable." };

  // Les issues passent par leurs actions dédiées : elles exigent un motif ou un
  // évènement de confirmation que le glisser-déposer ne fournit pas.
  if (nouvelleEtape === "PERDU_ABANDONNE" && !opp.motifCloture) {
    return {
      ok: false,
      erreur: "Utilisez « Marquer perdu » pour renseigner le motif normalisé.",
    };
  }
  if (nouvelleEtape === "GAGNE_ACTIF" && !opp.dateCloture) {
    return {
      ok: false,
      erreur:
        "Utilisez « Marquer gagné » : la définition de « gagné » exige une confirmation explicite.",
    };
  }
  if (nouvelleEtape === "DOSSIER_LLD_EN_COURS" && !opp.dossierLld) {
    return {
      ok: false,
      erreur:
        "Créez d'abord le dossier LLD : cette étape suppose qu'un dossier de financement existe.",
    };
  }

  await prisma.$transaction(async (tx) => {
    if (nouvelleEtape !== opp.etape) {
      await journaliser(tx, {
        typeObjet: "OPPORTUNITE",
        objetId: opportuniteId,
        action: "CHANGEMENT_ETAPE",
        ancienneValeur: opp.etape,
        nouvelleValeur: nouvelleEtape,
        auteurId: utilisateur.id,
      });
    }
    await tx.opportunite.update({
      where: { id: opportuniteId },
      data: {
        etape: nouvelleEtape,
        rang: nouveauRang,
        entreEnEtapeLe:
          nouvelleEtape !== opp.etape ? new Date() : opp.entreEnEtapeLe,
      },
    });
  });

  revalidatePath("/ventes");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Offre envoyée (§8)
// ---------------------------------------------------------------------------

export async function enregistrerOffreEnvoyee(
  opportuniteId: string,
  donnees: {
    montant?: number;
    dateEnvoi: string;
    dateRelancePrevue: string;
    lienDevis?: string;
    reference?: string;
  },
): Promise<ResultatAction> {
  const utilisateur = await exigerUtilisateur();

  if (!donnees.dateEnvoi || !donnees.dateRelancePrevue) {
    return {
      ok: false,
      erreur:
        "La date d'envoi et la date de relance sont obligatoires à cette étape.",
    };
  }

  const opp = await prisma.opportunite.findUnique({ where: { id: opportuniteId } });
  if (!opp) return { ok: false, erreur: "Opportunité introuvable." };

  await prisma.$transaction(async (tx) => {
    const rang = await prochainRangOpportunite(tx, "OFFRE_ENVOYEE");

    await tx.opportunite.update({
      where: { id: opportuniteId },
      data: {
        etape: "OFFRE_ENVOYEE",
        rang,
        entreEnEtapeLe: new Date(),
        dateOffreEnvoyee: new Date(donnees.dateEnvoi),
        dateRelancePrevue: new Date(donnees.dateRelancePrevue),
        montantVente: donnees.montant ?? opp.montantVente,
        prochaineActionLe: new Date(donnees.dateRelancePrevue),
        prochaineActionLabel: "Relancer le client sur l'offre",
      },
    });

    const dernier = await tx.devis.findFirst({
      where: { opportuniteId },
      orderBy: { version: "desc" },
    });

    await tx.devis.create({
      data: {
        reference: donnees.reference?.trim() || `${opp.reference}-D${(dernier?.version ?? 0) + 1}`,
        version: (dernier?.version ?? 0) + 1,
        montant: donnees.montant ?? null,
        dateEnvoi: new Date(donnees.dateEnvoi),
        lienDocument: donnees.lienDevis?.trim() || null,
        opportuniteId,
      },
    });

    await tx.activite.create({
      data: {
        type: "DEVIS_OFFRE",
        sens: "SORTANT",
        objet: `Offre v${(dernier?.version ?? 0) + 1} transmise`,
        dateReelle: new Date(donnees.dateEnvoi),
        resultat: "Offre transmise au client",
        suiteAttendue: `Relance le ${new Date(donnees.dateRelancePrevue).toLocaleDateString("fr-FR")}`,
        auteurId: utilisateur.id,
        opportuniteId,
      },
    });

    // Relance : une tâche de contrôle, jamais un envoi automatique au client.
    await tx.tache.create({
      data: {
        libelle: "Relancer le client sur l'offre",
        detail: "Vérifier le ton et le canal avant tout envoi.",
        echeance: new Date(donnees.dateRelancePrevue),
        responsableId: opp.commercialId,
        opportuniteId,
      },
    });

    await journaliser(tx, {
      typeObjet: "OPPORTUNITE",
      objetId: opportuniteId,
      action: "CHANGEMENT_ETAPE",
      ancienneValeur: opp.etape,
      nouvelleValeur: "OFFRE_ENVOYEE",
      auteurId: utilisateur.id,
    });
  });

  revalidatePath("/ventes");
  return { ok: true, message: "Offre enregistrée et relance planifiée." };
}

// ---------------------------------------------------------------------------
// Passage en LLD (§6, §7)
// ---------------------------------------------------------------------------

/**
 * Crée le dossier LLD relié à l'opportunité, sans créer une seconde fiche client.
 * Le commercial reste propriétaire de la relation ; la collaboratrice devient
 * propriétaire opérationnel du dossier.
 */
export async function creerDossierLld(
  opportuniteId: string,
  donnees: {
    dureeDemandeeMois: number;
    montantFinance?: number;
    loyerMensuel?: number;
    locataire?: string;
    collaboratriceId: string;
  },
): Promise<ResultatAction> {
  const utilisateur = await exigerUtilisateur();

  const opp = await prisma.opportunite.findUnique({
    where: { id: opportuniteId },
    include: { dossierLld: true, organisation: true },
  });
  if (!opp) return { ok: false, erreur: "Opportunité introuvable." };
  if (opp.dossierLld) {
    return { ok: false, erreur: "Un dossier LLD existe déjà pour cette opportunité." };
  }
  if (!donnees.collaboratriceId) {
    return {
      ok: false,
      erreur: "Un dossier LLD doit avoir une collaboratrice responsable.",
    };
  }
  if (!donnees.dureeDemandeeMois || donnees.dureeDemandeeMois < 1) {
    return { ok: false, erreur: "Indiquez la durée demandée en mois." };
  }

  // Alerte interne : ne bloque jamais la création du dossier.
  const alerte = verifierCompatibilitePartenaire(
    donnees.dureeDemandeeMois,
    donnees.montantFinance ?? null,
  );

  const dossier = await prisma.$transaction(async (tx) => {
    const reference = await genererReference(tx, "LLD");
    const rang = await prochainRangLld(tx, "LLD_A_ETUDIER");

    const cree = await tx.dossierLld.create({
      data: {
        reference,
        statut: "LLD_A_ETUDIER",
        dureeDemandeeMois: donnees.dureeDemandeeMois,
        montantFinance: donnees.montantFinance ?? null,
        loyerMensuel: donnees.loyerMensuel ?? opp.loyerMensuelEnvisage,
        locataire: donnees.locataire?.trim() || opp.organisation.nom,
        opportuniteId,
        collaboratriceId: donnees.collaboratriceId,
        commercialId: opp.commercialId,
        prochaineActionLe: dansNJours(2),
        prochaineActionLabel:
          "Valider durée, équipement, locataire et interlocuteurs",
        rang,
      },
    });

    // Checklist interne de complétude : elle ne présume pas des pièces exigées
    // par le partenaire, qui restent à confirmer avec GRENKE.
    await tx.checklistItem.createMany({
      data: CHECKLIST_INTERNE.map((libelle, ordre) => ({
        libelle,
        ordre,
        dossierLldId: cree.id,
      })),
    });

    await tx.opportunite.update({
      where: { id: opportuniteId },
      data: {
        etape: "DOSSIER_LLD_EN_COURS",
        entreEnEtapeLe: new Date(),
        projetRecherche: "LLD",
        dureeLldMois: donnees.dureeDemandeeMois,
        rang: await prochainRangOpportunite(tx, "DOSSIER_LLD_EN_COURS"),
      },
    });

    await tx.tache.create({
      data: {
        libelle: "Préparer le dossier LLD",
        echeance: dansNJours(2),
        responsableId: donnees.collaboratriceId,
        dossierLldId: cree.id,
      },
    });

    await journaliser(tx, {
      typeObjet: "DOSSIER_LLD",
      objetId: cree.id,
      action: "CREATION_LLD",
      detail: `${cree.reference} créé depuis ${opp.reference}${
        alerte.aConfirmer ? " — " + alerte.message : ""
      }`,
      auteurId: utilisateur.id,
    });

    return cree;
  });

  revalidatePath("/ventes");
  revalidatePath("/lld");
  return {
    ok: true,
    id: dossier.id,
    message: alerte.aConfirmer
      ? `Dossier ${dossier.reference} créé. ${alerte.message}`
      : `Dossier ${dossier.reference} créé.`,
  };
}

/** Checklist interne Selfizee, indépendante des pièces exigées par le partenaire. */
const CHECKLIST_INTERNE = [
  "Identité et coordonnées du locataire vérifiées",
  "Équipement et configuration arrêtés avec le client",
  "Durée et loyer confirmés avec le commercial",
  "Offre commerciale signée ou validée par le client",
  "Interlocuteur signataire identifié",
  "Coordonnées de facturation et de livraison confirmées",
  "Canal de transmission convenu avec le partenaire",
];

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

export async function marquerGagnee(
  opportuniteId: string,
  donnees: { montantRetenu?: number; commentaire?: string },
): Promise<ResultatAction> {
  const utilisateur = await exigerUtilisateur();

  const opp = await prisma.opportunite.findUnique({ where: { id: opportuniteId } });
  if (!opp) return { ok: false, erreur: "Opportunité introuvable." };

  await prisma.$transaction(async (tx) => {
    await tx.opportunite.update({
      where: { id: opportuniteId },
      data: {
        etape: "GAGNE_ACTIF",
        dateCloture: new Date(),
        montantRetenu: donnees.montantRetenu ?? null,
        commentaireCloture: donnees.commentaire?.trim() || null,
        prochaineActionLe: null,
        prochaineActionLabel: null,
        entreEnEtapeLe: new Date(),
        rang: await prochainRangOpportunite(tx, "GAGNE_ACTIF"),
      },
    });

    // Tâches de démarrage, assistance et suivi client.
    for (const [libelle, jours] of [
      ["Planifier la mise en service", 3],
      ["Transmettre le dossier à l'assistance", 5],
      ["Appel de suivi post-livraison", 30],
    ] as const) {
      await tx.tache.create({
        data: {
          libelle,
          echeance: dansNJours(jours),
          responsableId: opp.commercialId,
          opportuniteId,
        },
      });
    }

    await journaliser(tx, {
      typeObjet: "OPPORTUNITE",
      objetId: opportuniteId,
      action: "CLOTURE",
      nouvelleValeur: "GAGNE_ACTIF",
      auteurId: utilisateur.id,
    });
  });

  revalidatePath("/ventes");
  return { ok: true, message: "Opportunité gagnée ; tâches de démarrage créées." };
}

export async function marquerPerdue(
  opportuniteId: string,
  motif: Prisma.OpportuniteUpdateInput["motifCloture"],
  donnees: { concurrent?: string; commentaire?: string },
): Promise<ResultatAction> {
  const utilisateur = await exigerUtilisateur();

  if (!motif) return { ok: false, erreur: "Le motif de clôture est obligatoire." };
  if (motif === "AUTRE" && !donnees.commentaire?.trim()) {
    return { ok: false, erreur: "Le motif « Autre » exige un commentaire." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.opportunite.update({
      where: { id: opportuniteId },
      data: {
        etape: "PERDU_ABANDONNE",
        motifCloture: motif,
        concurrentIdentifie: donnees.concurrent?.trim() || null,
        commentaireCloture: donnees.commentaire?.trim() || null,
        dateCloture: new Date(),
        prochaineActionLe: null,
        prochaineActionLabel: null,
        entreEnEtapeLe: new Date(),
        rang: await prochainRangOpportunite(tx, "PERDU_ABANDONNE"),
      },
    });
    await tx.tache.updateMany({
      where: { opportuniteId, faite: false },
      data: { faite: true, faiteLe: new Date(), resultat: "Opportunité perdue" },
    });
    await journaliser(tx, {
      typeObjet: "OPPORTUNITE",
      objetId: opportuniteId,
      action: "CLOTURE",
      nouvelleValeur: String(motif),
      motif: donnees.commentaire?.trim() || null,
      auteurId: utilisateur.id,
    });
  });

  revalidatePath("/ventes");
  return { ok: true, message: "Opportunité clôturée." };
}

// ---------------------------------------------------------------------------
// Prochaine action
// ---------------------------------------------------------------------------

export async function definirProchaineAction(
  opportuniteId: string,
  action: { le: string; label: string },
): Promise<ResultatAction> {
  const utilisateur = await exigerUtilisateur();
  if (!action.le || !action.label.trim()) {
    return { ok: false, erreur: "Indiquez une action et sa date." };
  }

  const opp = await prisma.opportunite.findUnique({ where: { id: opportuniteId } });
  if (!opp) return { ok: false, erreur: "Opportunité introuvable." };

  await prisma.$transaction(async (tx) => {
    await tx.opportunite.update({
      where: { id: opportuniteId },
      data: {
        prochaineActionLe: new Date(action.le),
        prochaineActionLabel: action.label.trim(),
      },
    });
    await tx.tache.create({
      data: {
        libelle: action.label.trim(),
        echeance: new Date(action.le),
        responsableId: opp.commercialId,
        opportuniteId,
      },
    });
  });

  revalidatePath("/ventes");
  return { ok: true, message: "Prochaine action planifiée." };
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

function dansNJours(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(9, 0, 0, 0);
  return d;
}

async function prochainRangOpportunite(
  tx: Prisma.TransactionClient,
  etape: EtapeCommerciale,
): Promise<number> {
  const max = await tx.opportunite.aggregate({
    where: { etape },
    _max: { rang: true },
  });
  return (max._max.rang ?? -1) + 1;
}

async function prochainRangLld(
  tx: Prisma.TransactionClient,
  statut: Prisma.DossierLldWhereInput["statut"],
): Promise<number> {
  const max = await tx.dossierLld.aggregate({
    where: { statut },
    _max: { rang: true },
  });
  return (max._max.rang ?? -1) + 1;
}
