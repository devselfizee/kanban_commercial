"use server";

/**
 * Actions du pipeline n°3 — dossier LLD / GRENKE (§7).
 *
 * Règle absolue de ce module : le CRM enregistre des faits observables
 * (transmission, retour communiqué, signature, livraison) et ne déduit jamais
 * une décision de financement. Aucune fonction ici ne calcule, n'estime ni
 * n'affiche de probabilité d'acceptation.
 */

import { revalidatePath } from "next/cache";
import type { Prisma, StatutLld } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";
import { exigerUtilisateur, peutModifierLld } from "@/lib/session";
import { verifierCompatibilitePartenaire } from "@/lib/domaine/regles";
import type { ResultatAction } from "./leads";

// ---------------------------------------------------------------------------
// Déplacement dans le kanban
// ---------------------------------------------------------------------------

export async function deplacerDossierLld(
  dossierId: string,
  nouveauStatut: StatutLld,
  nouveauRang: number,
): Promise<ResultatAction> {
  const utilisateur = await exigerUtilisateur();
  if (!peutModifierLld(utilisateur.role)) {
    return {
      ok: false,
      erreur:
        "Seules la collaboratrice LLD et le manager font progresser un dossier de financement.",
    };
  }

  const dossier = await prisma.dossierLld.findUnique({ where: { id: dossierId } });
  if (!dossier) return { ok: false, erreur: "Dossier introuvable." };

  // Chaque statut sensible exige son fait enregistré : on ne peut pas le
  // contourner par un simple glisser-déposer.
  const blocage = verifierPrerequisStatut(dossier, nouveauStatut);
  if (blocage) return { ok: false, erreur: blocage };

  await prisma.$transaction(async (tx) => {
    if (nouveauStatut !== dossier.statut) {
      await journaliser(tx, {
        typeObjet: "DOSSIER_LLD",
        objetId: dossierId,
        action: "CHANGEMENT_ETAPE",
        ancienneValeur: dossier.statut,
        nouvelleValeur: nouveauStatut,
        auteurId: utilisateur.id,
      });
    }
    await tx.dossierLld.update({
      where: { id: dossierId },
      data: {
        statut: nouveauStatut,
        rang: nouveauRang,
        entreEnEtapeLe:
          nouveauStatut !== dossier.statut ? new Date() : dossier.entreEnEtapeLe,
      },
    });
  });

  revalidatePath("/lld");
  return { ok: true };
}

/** Les faits requis avant d'entrer dans un statut donné. */
function verifierPrerequisStatut(
  dossier: {
    dateTransmission: Date | null;
    dateRetourCommunique: Date | null;
    signatureClientLe: Date | null;
    dateLivraisonConfirmee: Date | null;
    motifCloture: string | null;
  },
  statut: StatutLld,
): string | null {
  switch (statut) {
    case "TRANSMIS_A_GRENKE":
      return dossier.dateTransmission
        ? null
        : "Utilisez « Transmettre » pour horodater l'envoi et conserver la preuve de transmission.";
    case "REPONSE_COMMUNIQUEE_PAR_GRENKE":
      return dossier.dateRetourCommunique
        ? null
        : "Enregistrez d'abord le retour effectivement communiqué par le partenaire, avec sa date et sa source.";
    case "SIGNE_LIVRAISON_A_CONFIRMER":
      return dossier.signatureClientLe
        ? null
        : "Enregistrez d'abord la signature client.";
    case "LIVRAISON_CONFIRMEE_CONTRAT_ACTIF":
      return dossier.dateLivraisonConfirmee
        ? null
        : "La carte ne peut pas passer à « contrat actif » sans évènement de confirmation de livraison saisi.";
    case "CLOTURE_NON_POURSUIVI":
      return dossier.motifCloture
        ? null
        : "Utilisez « Clôturer » pour choisir un motif factuel.";
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Checklist interne de complétude
// ---------------------------------------------------------------------------

export async function basculerChecklist(
  itemId: string,
  fait: boolean,
): Promise<ResultatAction> {
  const utilisateur = await exigerUtilisateur();
  if (!peutModifierLld(utilisateur.role)) {
    return { ok: false, erreur: "Action réservée à la collaboratrice LLD." };
  }

  await prisma.checklistItem.update({
    where: { id: itemId },
    data: {
      fait,
      faitLe: fait ? new Date() : null,
      faitPar: fait ? `${utilisateur.prenom} ${utilisateur.nom}` : null,
    },
  });

  revalidatePath("/lld");
  return { ok: true };
}

/**
 * Passe le dossier en « prêt à transmettre ».
 * La collaboratrice valide elle-même cet état : aucune automatisation ne le fait
 * à sa place, même quand la checklist est complète.
 */
export async function marquerPretATransmettre(
  dossierId: string,
): Promise<ResultatAction> {
  const utilisateur = await exigerUtilisateur();
  if (!peutModifierLld(utilisateur.role)) {
    return { ok: false, erreur: "Action réservée à la collaboratrice LLD." };
  }

  const dossier = await prisma.dossierLld.findUnique({
    where: { id: dossierId },
    include: { checklist: true },
  });
  if (!dossier) return { ok: false, erreur: "Dossier introuvable." };

  const restants = dossier.checklist.filter((i) => !i.fait);
  if (restants.length > 0) {
    return {
      ok: false,
      erreur: `Checklist interne incomplète : ${restants.length} point(s) restant(s).`,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.dossierLld.update({
      where: { id: dossierId },
      data: {
        statut: "PRET_A_TRANSMETTRE",
        entreEnEtapeLe: new Date(),
        prochaineActionLabel: "Transmettre par le canal convenu",
        prochaineActionLe: dansNJours(1),
      },
    });
    await journaliser(tx, {
      typeObjet: "DOSSIER_LLD",
      objetId: dossierId,
      action: "CHANGEMENT_ETAPE",
      ancienneValeur: dossier.statut,
      nouvelleValeur: "PRET_A_TRANSMETTRE",
      detail: "Complétude validée par la collaboratrice",
      auteurId: utilisateur.id,
    });
  });

  revalidatePath("/lld");
  return { ok: true, message: "Dossier prêt à transmettre." };
}

// ---------------------------------------------------------------------------
// Transmission (§8 — rendre le suivi externe auditable)
// ---------------------------------------------------------------------------

export async function transmettreDossier(
  dossierId: string,
  donnees: {
    dateTransmission: string;
    canal: string;
    preuve: string;
    prochaineRelanceLe: string;
  },
): Promise<ResultatAction> {
  const utilisateur = await exigerUtilisateur();
  if (!peutModifierLld(utilisateur.role)) {
    return { ok: false, erreur: "Action réservée à la collaboratrice LLD." };
  }

  if (!donnees.dateTransmission || !donnees.canal.trim()) {
    return {
      ok: false,
      erreur: "La date et le canal de transmission sont obligatoires.",
    };
  }
  if (!donnees.preuve.trim()) {
    return {
      ok: false,
      erreur:
        "Indiquez la preuve ou la référence de transmission : le suivi externe doit être auditable.",
    };
  }
  if (!donnees.prochaineRelanceLe) {
    return {
      ok: false,
      erreur: "Planifiez une relance factuelle dans le délai interne convenu.",
    };
  }

  const dossier = await prisma.dossierLld.findUnique({ where: { id: dossierId } });
  if (!dossier) return { ok: false, erreur: "Dossier introuvable." };

  await prisma.$transaction(async (tx) => {
    await tx.dossierLld.update({
      where: { id: dossierId },
      data: {
        statut: "TRANSMIS_A_GRENKE",
        entreEnEtapeLe: new Date(),
        dateTransmission: new Date(donnees.dateTransmission),
        canalTransmission: donnees.canal.trim(),
        auteurTransmission: `${utilisateur.prenom} ${utilisateur.nom}`,
        preuveTransmission: donnees.preuve.trim(),
        prochaineRelanceLe: new Date(donnees.prochaineRelanceLe),
        prochaineActionLe: new Date(donnees.prochaineRelanceLe),
        prochaineActionLabel: "Relance factuelle si aucun accusé reçu",
      },
    });

    await tx.activite.create({
      data: {
        type: "ACTIVITE_LLD",
        sens: "SORTANT",
        objet: "Demande transmise au partenaire",
        contenu: `Canal : ${donnees.canal.trim()} — preuve : ${donnees.preuve.trim()}`,
        dateReelle: new Date(donnees.dateTransmission),
        resultat: "Demande envoyée",
        suiteAttendue: `Contrôle le ${new Date(donnees.prochaineRelanceLe).toLocaleDateString("fr-FR")}`,
        auteurId: utilisateur.id,
        dossierLldId: dossierId,
      },
    });

    await tx.tache.create({
      data: {
        libelle: "Vérifier l'accusé de réception du partenaire",
        detail: "Relance factuelle. Ne déduire aucune décision en l'absence de retour.",
        echeance: new Date(donnees.prochaineRelanceLe),
        responsableId: dossier.collaboratriceId,
        dossierLldId: dossierId,
      },
    });

    await journaliser(tx, {
      typeObjet: "DOSSIER_LLD",
      objetId: dossierId,
      action: "TRANSMISSION_LLD",
      detail: `Transmis le ${new Date(donnees.dateTransmission).toLocaleDateString("fr-FR")} via ${donnees.canal.trim()}`,
      nouvelleValeur: donnees.preuve.trim(),
      auteurId: utilisateur.id,
    });
  });

  revalidatePath("/lld");
  return { ok: true, message: "Transmission enregistrée." };
}

// ---------------------------------------------------------------------------
// Retour partenaire — on enregistre ce qui a été communiqué, rien de plus
// ---------------------------------------------------------------------------

export async function enregistrerRetourPartenaire(
  dossierId: string,
  donnees: {
    dateRetour: string;
    source: string;
    contenu: string;
    /** Le statut qui découle du message effectivement reçu, choisi par la collaboratrice. */
    statutSuivant: Extract<
      StatutLld,
      | "REPONSE_COMMUNIQUEE_PAR_GRENKE"
      | "RETOUR_ANALYSE_EN_ATTENTE"
      | "EN_ATTENTE_ELEMENTS_CLIENT"
      | "CONTRAT_A_SIGNER"
    >;
    prochaineActionLe?: string;
    prochaineActionLabel?: string;
  },
): Promise<ResultatAction> {
  const utilisateur = await exigerUtilisateur();
  if (!peutModifierLld(utilisateur.role)) {
    return { ok: false, erreur: "Action réservée à la collaboratrice LLD." };
  }

  if (!donnees.dateRetour || !donnees.source.trim() || !donnees.contenu.trim()) {
    return {
      ok: false,
      erreur:
        "La date, la source et le contenu du retour communiqué sont obligatoires.",
    };
  }

  const dossier = await prisma.dossierLld.findUnique({ where: { id: dossierId } });
  if (!dossier) return { ok: false, erreur: "Dossier introuvable." };

  await prisma.$transaction(async (tx) => {
    await tx.dossierLld.update({
      where: { id: dossierId },
      data: {
        statut: donnees.statutSuivant,
        entreEnEtapeLe: new Date(),
        dateRetourCommunique: new Date(donnees.dateRetour),
        sourceRetour: donnees.source.trim(),
        contenuRetour: donnees.contenu.trim(),
        prochaineActionLe: donnees.prochaineActionLe
          ? new Date(donnees.prochaineActionLe)
          : null,
        prochaineActionLabel: donnees.prochaineActionLabel?.trim() || null,
      },
    });

    await tx.activite.create({
      data: {
        type: "ACTIVITE_LLD",
        sens: "ENTRANT",
        objet: "Retour communiqué par le partenaire",
        contenu: donnees.contenu.trim(),
        dateReelle: new Date(donnees.dateRetour),
        resultat: `Source : ${donnees.source.trim()}`,
        suiteAttendue: donnees.prochaineActionLabel?.trim() || null,
        auteurId: utilisateur.id,
        dossierLldId: dossierId,
      },
    });

    await journaliser(tx, {
      typeObjet: "DOSSIER_LLD",
      objetId: dossierId,
      action: "RETOUR_PARTENAIRE",
      detail: donnees.contenu.trim(),
      nouvelleValeur: donnees.statutSuivant,
      auteurId: utilisateur.id,
    });
  });

  revalidatePath("/lld");
  return { ok: true, message: "Retour enregistré." };
}

// ---------------------------------------------------------------------------
// Attente d'éléments client
// ---------------------------------------------------------------------------

export async function demanderElementClient(
  dossierId: string,
  donnees: { element: string; demandeA: string; relanceLe: string },
): Promise<ResultatAction> {
  const utilisateur = await exigerUtilisateur();
  if (!peutModifierLld(utilisateur.role)) {
    return { ok: false, erreur: "Action réservée à la collaboratrice LLD." };
  }
  if (!donnees.element.trim() || !donnees.demandeA.trim() || !donnees.relanceLe) {
    return {
      ok: false,
      erreur:
        "Enregistrez l'élément demandé, son destinataire et l'échéance de relance.",
    };
  }

  const dossier = await prisma.dossierLld.findUnique({ where: { id: dossierId } });
  if (!dossier) return { ok: false, erreur: "Dossier introuvable." };

  await prisma.$transaction(async (tx) => {
    await tx.dossierLld.update({
      where: { id: dossierId },
      data: {
        statut: "EN_ATTENTE_ELEMENTS_CLIENT",
        entreEnEtapeLe: new Date(),
        elementAttenduLabel: donnees.element.trim(),
        elementDemandeLe: new Date(),
        elementDemandeA: donnees.demandeA.trim(),
        prochaineRelanceLe: new Date(donnees.relanceLe),
        prochaineActionLe: new Date(donnees.relanceLe),
        prochaineActionLabel: `Relancer : ${donnees.element.trim()}`,
      },
    });
    await tx.tache.create({
      data: {
        libelle: `Relancer ${donnees.demandeA.trim()} : ${donnees.element.trim()}`,
        echeance: new Date(donnees.relanceLe),
        responsableId: dossier.collaboratriceId,
        dossierLldId: dossierId,
      },
    });
    await journaliser(tx, {
      typeObjet: "DOSSIER_LLD",
      objetId: dossierId,
      action: "MODIFICATION",
      detail: `Élément demandé à ${donnees.demandeA.trim()} : ${donnees.element.trim()}`,
      auteurId: utilisateur.id,
    });
  });

  revalidatePath("/lld");
  return { ok: true, message: "Demande enregistrée." };
}

// ---------------------------------------------------------------------------
// Signatures et livraison
// ---------------------------------------------------------------------------

export async function enregistrerSignature(
  dossierId: string,
  donnees: {
    signatureClientLe?: string;
    signatureAutresLe?: string;
    dateLivraisonPrevue?: string;
  },
): Promise<ResultatAction> {
  const utilisateur = await exigerUtilisateur();
  if (!peutModifierLld(utilisateur.role)) {
    return { ok: false, erreur: "Action réservée à la collaboratrice LLD." };
  }

  const dossier = await prisma.dossierLld.findUnique({ where: { id: dossierId } });
  if (!dossier) return { ok: false, erreur: "Dossier introuvable." };

  const signatureClient = donnees.signatureClientLe
    ? new Date(donnees.signatureClientLe)
    : dossier.signatureClientLe;
  const signatureAutres = donnees.signatureAutresLe
    ? new Date(donnees.signatureAutresLe)
    : dossier.signatureAutresLe;

  // Le passage à « signé » suppose que les signatures suivies sont complètes.
  const toutesSignatures = Boolean(signatureClient && signatureAutres);

  await prisma.$transaction(async (tx) => {
    await tx.dossierLld.update({
      where: { id: dossierId },
      data: {
        signatureClientLe: signatureClient,
        signatureAutresLe: signatureAutres,
        dateLivraisonPrevue: donnees.dateLivraisonPrevue
          ? new Date(donnees.dateLivraisonPrevue)
          : dossier.dateLivraisonPrevue,
        statut: toutesSignatures ? "SIGNE_LIVRAISON_A_CONFIRMER" : dossier.statut,
        entreEnEtapeLe: toutesSignatures ? new Date() : dossier.entreEnEtapeLe,
        prochaineActionLe: donnees.dateLivraisonPrevue
          ? new Date(donnees.dateLivraisonPrevue)
          : dossier.prochaineActionLe,
        prochaineActionLabel: toutesSignatures
          ? "Confirmer la livraison"
          : "Suivre les signatures restantes",
      },
    });
    await journaliser(tx, {
      typeObjet: "DOSSIER_LLD",
      objetId: dossierId,
      action: "SIGNATURE",
      detail: toutesSignatures
        ? "Signatures suivies complètes"
        : "Signature enregistrée ; signatures restantes à suivre",
      auteurId: utilisateur.id,
    });
  });

  revalidatePath("/lld");
  return { ok: true, message: "Signature enregistrée." };
}

/**
 * Confirme la livraison. C'est l'évènement de confirmation requis : sans lui, la
 * carte ne peut pas passer à « contrat actif ».
 */
export async function confirmerLivraison(
  dossierId: string,
  dateConfirmation: string,
): Promise<ResultatAction> {
  const utilisateur = await exigerUtilisateur();
  if (!peutModifierLld(utilisateur.role)) {
    return { ok: false, erreur: "Action réservée à la collaboratrice LLD." };
  }
  if (!dateConfirmation) {
    return { ok: false, erreur: "Indiquez la date de confirmation de livraison." };
  }

  const dossier = await prisma.dossierLld.findUnique({
    where: { id: dossierId },
    include: { opportunite: true },
  });
  if (!dossier) return { ok: false, erreur: "Dossier introuvable." };

  await prisma.$transaction(async (tx) => {
    await tx.dossierLld.update({
      where: { id: dossierId },
      data: {
        statut: "LIVRAISON_CONFIRMEE_CONTRAT_ACTIF",
        entreEnEtapeLe: new Date(),
        dateLivraisonConfirmee: new Date(dateConfirmation),
        prochaineActionLe: null,
        prochaineActionLabel: null,
      },
    });
    await tx.tache.updateMany({
      where: { dossierLldId: dossierId, faite: false },
      data: { faite: true, faiteLe: new Date(), resultat: "Livraison confirmée" },
    });
    await journaliser(tx, {
      typeObjet: "DOSSIER_LLD",
      objetId: dossierId,
      action: "LIVRAISON",
      detail: `Livraison confirmée le ${new Date(dateConfirmation).toLocaleDateString("fr-FR")}`,
      auteurId: utilisateur.id,
    });
  });

  revalidatePath("/lld");
  revalidatePath("/ventes");
  return { ok: true, message: "Livraison confirmée ; contrat actif." };
}

// ---------------------------------------------------------------------------
// Clôture
// ---------------------------------------------------------------------------

export async function cloturerDossierLld(
  dossierId: string,
  motif: Prisma.DossierLldUpdateInput["motifCloture"],
  commentaire?: string,
): Promise<ResultatAction> {
  const utilisateur = await exigerUtilisateur();
  if (!peutModifierLld(utilisateur.role)) {
    return { ok: false, erreur: "Action réservée à la collaboratrice LLD." };
  }
  if (!motif) return { ok: false, erreur: "Le motif de clôture est obligatoire." };
  if (motif === "AUTRE" && !commentaire?.trim()) {
    return { ok: false, erreur: "Le motif « Autre » exige un commentaire." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.dossierLld.update({
      where: { id: dossierId },
      data: {
        statut: "CLOTURE_NON_POURSUIVI",
        motifCloture: motif,
        commentaireCloture: commentaire?.trim() || null,
        dateCloture: new Date(),
        prochaineActionLe: null,
        prochaineActionLabel: null,
        entreEnEtapeLe: new Date(),
      },
    });
    await tx.tache.updateMany({
      where: { dossierLldId: dossierId, faite: false },
      data: { faite: true, faiteLe: new Date(), resultat: "Dossier clôturé" },
    });
    await journaliser(tx, {
      typeObjet: "DOSSIER_LLD",
      objetId: dossierId,
      action: "CLOTURE",
      nouvelleValeur: String(motif),
      motif: commentaire?.trim() || null,
      auteurId: utilisateur.id,
    });
  });

  revalidatePath("/lld");
  return { ok: true, message: "Dossier clôturé." };
}

// ---------------------------------------------------------------------------
// Alerte de compatibilité, exposée à l'interface
// ---------------------------------------------------------------------------

export async function alerteCompatibilite(dossierId: string) {
  const dossier = await prisma.dossierLld.findUnique({
    where: { id: dossierId },
    select: { dureeDemandeeMois: true, montantFinance: true },
  });
  if (!dossier) return { aConfirmer: false, message: null };
  return verifierCompatibilitePartenaire(
    dossier.dureeDemandeeMois,
    dossier.montantFinance ? Number(dossier.montantFinance) : null,
  );
}

function dansNJours(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(9, 0, 0, 0);
  return d;
}
