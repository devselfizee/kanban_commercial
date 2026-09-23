"use server";

/**
 * Actions du pipeline n°1 — boîte de qualification des leads (§4, §5).
 */

import { revalidatePath } from "next/cache";
import type { Prisma, StatutLead } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { genererReference } from "@/lib/references";
import { journaliser } from "@/lib/journal";
import { exigerUtilisateur, peutReattribuer } from "@/lib/session";
import {
  calculerPriorite,
  estTerminaleLead,
  normaliserEmail,
  normaliserNom,
  normaliserTelephone,
  peutConvertir,
} from "@/lib/domaine/regles";

export type ResultatAction =
  | { ok: true; message?: string; id?: string }
  | { ok: false; erreur: string };

// ---------------------------------------------------------------------------
// Création
// ---------------------------------------------------------------------------

export async function creerLead(donnees: {
  modeAcquisition: Prisma.LeadCreateInput["modeAcquisition"];
  canalDetaille: Prisma.LeadCreateInput["canalDetaille"];
  nomBrut?: string;
  emailBrut?: string;
  telephoneBrut?: string;
  organisationId?: string;
  contactPrincipalId?: string;
  segment?: Prisma.LeadCreateInput["segment"];
  projetRecherche?: Prisma.LeadCreateInput["projetRecherche"];
  besoinResume?: string;
  horizonIndicatif?: string;
  ville?: string;
  proprietaireId?: string;
  prochaineActionLe?: string;
  prochaineActionLabel?: string;
  /** Critères de priorité visibles (jamais de solvabilité). */
  devisDemande?: boolean;
  clientExistant?: boolean;
  joursAvantEcheance?: number;
  valeurIndicative?: number;
}): Promise<ResultatAction> {
  const utilisateur = await exigerUtilisateur();

  // §8 — champs exigés à la création : identité, un moyen de contact, une prochaine action.
  const aIdentite = Boolean(donnees.nomBrut?.trim() || donnees.organisationId);
  const aContact = Boolean(
    donnees.emailBrut?.trim() ||
      donnees.telephoneBrut?.trim() ||
      donnees.contactPrincipalId,
  );
  if (!aIdentite) {
    return { ok: false, erreur: "Indiquez un nom ou une organisation." };
  }
  if (!aContact) {
    return { ok: false, erreur: "Indiquez au moins un moyen de contact." };
  }
  if (!donnees.prochaineActionLe || !donnees.prochaineActionLabel?.trim()) {
    return {
      ok: false,
      erreur:
        "Une prochaine action datée est obligatoire : une carte ne doit jamais être perdue.",
    };
  }
  const prochaineActionLe = new Date(donnees.prochaineActionLe);
  const prochaineActionLabel = donnees.prochaineActionLabel.trim();

  const { priorite } = calculerPriorite({
    estEntrant: donnees.modeAcquisition === "ENTRANT",
    joursAvantEcheance: donnees.joursAvantEcheance ?? null,
    devisDemande: donnees.devisDemande,
    clientExistant: donnees.clientExistant,
    valeurIndicative: donnees.valeurIndicative ?? null,
  });

  const attribue = Boolean(donnees.proprietaireId);
  const statut: StatutLead = attribue
    ? "PREMIER_CONTACT_A_REALISER"
    : "NOUVEAU_NON_ATTRIBUE";

  const lead = await prisma.$transaction(async (tx) => {
    const reference = await genererReference(tx, "L");
    const rang = await prochainRang(tx, "lead", statut);

    const cree = await tx.lead.create({
      data: {
        reference,
        modeAcquisition: donnees.modeAcquisition,
        canalDetaille: donnees.canalDetaille,
        statut,
        priorite,
        segment: donnees.segment ?? null,
        projetRecherche: donnees.projetRecherche ?? "A_PRECISER",
        besoinResume: donnees.besoinResume?.trim() || null,
        horizonIndicatif: donnees.horizonIndicatif?.trim() || null,
        ville: donnees.ville?.trim() || null,
        nomBrut: donnees.nomBrut?.trim() || null,
        emailBrut: normaliserEmail(donnees.emailBrut ?? null),
        telephoneBrut: normaliserTelephone(donnees.telephoneBrut ?? null),
        organisationId: donnees.organisationId || null,
        contactPrincipalId: donnees.contactPrincipalId || null,
        proprietaireId: donnees.proprietaireId || null,
        dateAttribution: attribue ? new Date() : null,
        prochaineActionLe,
        prochaineActionLabel,
        rang,
      },
    });

    await journaliser(tx, {
      typeObjet: "LEAD",
      objetId: cree.id,
      action: "CREATION",
      detail: `${cree.reference} créé (${donnees.modeAcquisition.toLowerCase()})`,
      auteurId: utilisateur.id,
    });

    // La prochaine action est aussi une tâche : elle apparaît dans « mes actions ».
    await tx.tache.create({
      data: {
        libelle: prochaineActionLabel,
        echeance: prochaineActionLe,
        responsableId: donnees.proprietaireId || null,
        leadId: cree.id,
      },
    });

    return cree;
  });

  revalidatePath("/leads");
  return { ok: true, id: lead.id, message: `Lead ${lead.reference} créé.` };
}

// ---------------------------------------------------------------------------
// Prise en charge (§5)
// ---------------------------------------------------------------------------

/**
 * Affecte la carte au commercial connecté, renseigne la date d'attribution,
 * crée une tâche de première action et ajoute une ligne au journal.
 */
export async function prendreEnCharge(
  leadId: string,
  prochaineAction: { le: string; label: string },
): Promise<ResultatAction> {
  const utilisateur = await exigerUtilisateur();

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, erreur: "Lead introuvable." };

  if (lead.proprietaireId && lead.proprietaireId !== utilisateur.id) {
    if (!peutReattribuer(utilisateur.role)) {
      return {
        ok: false,
        erreur:
          "Cette carte appartient déjà à un autre commercial. Seul un manager peut la réattribuer.",
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    const statut: StatutLead =
      lead.statut === "NOUVEAU_NON_ATTRIBUE" ||
      lead.statut === "A_PRENDRE_EN_CHARGE"
        ? "PREMIER_CONTACT_A_REALISER"
        : lead.statut;

    await tx.lead.update({
      where: { id: leadId },
      data: {
        proprietaireId: utilisateur.id,
        dateAttribution: new Date(),
        statut,
        entreEnEtapeLe: statut !== lead.statut ? new Date() : lead.entreEnEtapeLe,
        prochaineActionLe: new Date(prochaineAction.le),
        prochaineActionLabel: prochaineAction.label.trim(),
        rang:
          statut !== lead.statut ? await prochainRang(tx, "lead", statut) : lead.rang,
      },
    });

    await tx.tache.create({
      data: {
        libelle: prochaineAction.label.trim(),
        echeance: new Date(prochaineAction.le),
        responsableId: utilisateur.id,
        leadId,
      },
    });

    await journaliser(tx, {
      typeObjet: "LEAD",
      objetId: leadId,
      action: "PRISE_EN_CHARGE",
      detail: `Pris en charge par ${utilisateur.prenom} ${utilisateur.nom}`,
      auteurId: utilisateur.id,
    });
  });

  revalidatePath("/leads");
  return { ok: true, message: "Carte prise en charge." };
}

/** Réattribution par un manager : l'historique conserve l'ancien et le nouveau propriétaire. */
export async function reattribuerLead(
  leadId: string,
  nouveauProprietaireId: string,
  motif: string,
): Promise<ResultatAction> {
  const utilisateur = await exigerUtilisateur();
  if (!peutReattribuer(utilisateur.role)) {
    return { ok: false, erreur: "Seul un manager peut réattribuer une carte." };
  }
  if (!motif.trim()) {
    return { ok: false, erreur: "Le motif de réattribution est obligatoire." };
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { proprietaire: true },
  });
  if (!lead) return { ok: false, erreur: "Lead introuvable." };

  const nouveau = await prisma.utilisateur.findUnique({
    where: { id: nouveauProprietaireId },
  });
  if (!nouveau) return { ok: false, erreur: "Utilisateur destinataire introuvable." };

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: { proprietaireId: nouveauProprietaireId, dateAttribution: new Date() },
    });

    await journaliser(tx, {
      typeObjet: "LEAD",
      objetId: leadId,
      action: "REATTRIBUTION",
      ancienneValeur: lead.proprietaire
        ? `${lead.proprietaire.prenom} ${lead.proprietaire.nom}`
        : "non attribué",
      nouvelleValeur: `${nouveau.prenom} ${nouveau.nom}`,
      motif: motif.trim(),
      auteurId: utilisateur.id,
    });
  });

  revalidatePath("/leads");
  return { ok: true, message: "Carte réattribuée." };
}

// ---------------------------------------------------------------------------
// Déplacement dans le kanban
// ---------------------------------------------------------------------------

export async function deplacerLead(
  leadId: string,
  nouveauStatut: StatutLead,
  nouveauRang: number,
): Promise<ResultatAction> {
  const utilisateur = await exigerUtilisateur();

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, erreur: "Lead introuvable." };

  // La conversion et la clôture passent par leurs actions dédiées : elles exigent
  // des informations que le seul glisser-déposer ne fournit pas.
  if (nouveauStatut === "NON_QUALIFIE_CLOTURE" && !lead.motifCloture) {
    return {
      ok: false,
      erreur:
        "Utilisez « Clôturer » pour renseigner le motif obligatoire et la date de clôture.",
    };
  }

  await prisma.$transaction(async (tx) => {
    if (nouveauStatut !== lead.statut) {
      await journaliser(tx, {
        typeObjet: "LEAD",
        objetId: leadId,
        action: "CHANGEMENT_ETAPE",
        ancienneValeur: lead.statut,
        nouvelleValeur: nouveauStatut,
        auteurId: utilisateur.id,
      });
    }

    await tx.lead.update({
      where: { id: leadId },
      data: {
        statut: nouveauStatut,
        rang: nouveauRang,
        entreEnEtapeLe:
          nouveauStatut !== lead.statut ? new Date() : lead.entreEnEtapeLe,
        // Le premier contact réalisé alimente le délai de prise en charge.
        premierContactLe:
          !lead.premierContactLe &&
          nouveauStatut !== "NOUVEAU_NON_ATTRIBUE" &&
          nouveauStatut !== "A_PRENDRE_EN_CHARGE" &&
          nouveauStatut !== "PREMIER_CONTACT_A_REALISER"
            ? new Date()
            : lead.premierContactLe,
      },
    });
  });

  revalidatePath("/leads");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Conversion en opportunité (§1, §4)
// ---------------------------------------------------------------------------

/**
 * Le passage du lead à l'opportunité est un changement de maturité, pas un
 * changement de fiche : le lead est conservé, les activités et les tâches lui
 * restent attachées et l'opportunité pointe vers lui.
 */
export async function convertirEnOpportunite(
  leadId: string,
  donnees: {
    titre: string;
    solutionEnvisagee: string;
    quantiteBornes?: number;
    dateCible: string;
    prochaineActionLe: string;
    prochaineActionLabel: string;
    commercialId?: string;
    montantVente?: number;
    loyerMensuelEnvisage?: number;
    dureeLldMois?: number;
    /** Organisation à créer si le lead n'en a pas encore. */
    nomOrganisation?: string;
  },
): Promise<ResultatAction> {
  const utilisateur = await exigerUtilisateur();

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { opportunite: true },
  });
  if (!lead) return { ok: false, erreur: "Lead introuvable." };
  if (lead.opportunite) {
    return { ok: false, erreur: "Ce lead est déjà converti." };
  }

  const verification = peutConvertir({
    organisation: Boolean(lead.organisationId || donnees.nomOrganisation?.trim()),
    interlocuteurPrincipal: Boolean(
      lead.contactPrincipalId || lead.emailBrut || lead.telephoneBrut,
    ),
    besoinOuCasDUsage: Boolean(lead.besoinResume?.trim()),
    solutionEnvisagee: Boolean(donnees.solutionEnvisagee.trim()),
    horizonDecisionOuEvenement: Boolean(donnees.dateCible),
    prochaineEtape: Boolean(
      donnees.prochaineActionLe && donnees.prochaineActionLabel.trim(),
    ),
  });

  if (!verification.ok) {
    return {
      ok: false,
      erreur: `Qualification incomplète : il manque ${verification.manquants.join(", ")}.`,
    };
  }

  const opportunite = await prisma.$transaction(async (tx) => {
    // L'organisation est créée si le lead n'en portait pas encore.
    let organisationId = lead.organisationId;
    if (!organisationId) {
      const refOrg = await genererReference(tx, "ORG");
      const org = await tx.organisation.create({
        data: {
          reference: refOrg,
          nom: donnees.nomOrganisation!.trim(),
          segment: lead.segment ?? "AUTRE_PROFESSIONNEL",
          estParticulier: lead.segment === "PARTICULIER",
          email: lead.emailBrut,
          telephone: lead.telephoneBrut,
          ville: lead.ville,
          modeAcquisitionInitial: lead.modeAcquisition,
          canalInitial: lead.canalDetaille,
          dateCollecte: lead.creeLe,
          proprietaireId: lead.proprietaireId,
        },
      });
      organisationId = org.id;
      await tx.lead.update({
        where: { id: leadId },
        data: { organisationId },
      });
    }

    const reference = await genererReference(tx, "OPP");
    const rang = await prochainRang(tx, "opportunite", "QUALIFICATION_VALIDEE");

    const opp = await tx.opportunite.create({
      data: {
        reference,
        titre: donnees.titre.trim(),
        etape: "QUALIFICATION_VALIDEE",
        priorite: lead.priorite,
        projetRecherche: lead.projetRecherche,
        solutionEnvisagee: donnees.solutionEnvisagee.trim(),
        quantiteBornes: donnees.quantiteBornes ?? null,
        dateCible: new Date(donnees.dateCible),
        montantVente: donnees.montantVente ?? null,
        loyerMensuelEnvisage: donnees.loyerMensuelEnvisage ?? null,
        dureeLldMois: donnees.dureeLldMois ?? null,
        organisationId: organisationId!,
        contactPrincipalId: lead.contactPrincipalId,
        commercialId: donnees.commercialId || lead.proprietaireId || utilisateur.id,
        leadId: lead.id,
        prochaineActionLe: new Date(donnees.prochaineActionLe),
        prochaineActionLabel: donnees.prochaineActionLabel.trim(),
        rang,
      },
    });

    // Le lead sort du tableau de qualification en conservant son historique.
    await tx.lead.update({
      where: { id: leadId },
      data: { statut: "QUALIFIE_A_CONVERTIR", entreEnEtapeLe: new Date() },
    });

    await tx.tache.create({
      data: {
        libelle: donnees.prochaineActionLabel.trim(),
        echeance: new Date(donnees.prochaineActionLe),
        responsableId: opp.commercialId,
        opportuniteId: opp.id,
      },
    });

    await journaliser(tx, {
      typeObjet: "LEAD",
      objetId: leadId,
      action: "CONVERSION_LEAD",
      detail: `Converti en ${opp.reference}`,
      nouvelleValeur: opp.reference,
      auteurId: utilisateur.id,
    });
    await journaliser(tx, {
      typeObjet: "OPPORTUNITE",
      objetId: opp.id,
      action: "CREATION",
      detail: `Créée depuis le lead ${lead.reference}`,
      auteurId: utilisateur.id,
    });

    return opp;
  });

  revalidatePath("/leads");
  revalidatePath("/ventes");
  return {
    ok: true,
    id: opportunite.id,
    message: `Opportunité ${opportunite.reference} créée.`,
  };
}

// ---------------------------------------------------------------------------
// Clôture et nurturing
// ---------------------------------------------------------------------------

export async function cloturerLead(
  leadId: string,
  motif: Prisma.LeadUpdateInput["motifCloture"],
  commentaire?: string,
): Promise<ResultatAction> {
  const utilisateur = await exigerUtilisateur();

  if (!motif) return { ok: false, erreur: "Le motif de clôture est obligatoire." };
  if (motif === "AUTRE" && !commentaire?.trim()) {
    return {
      ok: false,
      erreur: "Le motif « Autre » exige un commentaire.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: {
        statut: "NON_QUALIFIE_CLOTURE",
        motifCloture: motif,
        commentaireCloture: commentaire?.trim() || null,
        dateCloture: new Date(),
        prochaineActionLe: null,
        prochaineActionLabel: null,
        entreEnEtapeLe: new Date(),
      },
    });
    // Les tâches ouvertes n'ont plus lieu d'être ; la carte n'est pas supprimée.
    await tx.tache.updateMany({
      where: { leadId, faite: false },
      data: { faite: true, faiteLe: new Date(), resultat: "Lead clôturé" },
    });
    await journaliser(tx, {
      typeObjet: "LEAD",
      objetId: leadId,
      action: "CLOTURE",
      nouvelleValeur: String(motif),
      motif: commentaire?.trim() || null,
      auteurId: utilisateur.id,
    });
  });

  revalidatePath("/leads");
  return { ok: true, message: "Lead clôturé." };
}

export async function mettreEnNurturing(
  leadId: string,
  dateReactivation: string,
): Promise<ResultatAction> {
  const utilisateur = await exigerUtilisateur();
  if (!dateReactivation) {
    return {
      ok: false,
      erreur:
        "Une date de réactivation est obligatoire : un lead en nurturing n'est pas un lead perdu.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: {
        statut: "NURTURING_A_REACTIVER",
        dateReactivation: new Date(dateReactivation),
        priorite: "P4_NURTURING",
        entreEnEtapeLe: new Date(),
      },
    });
    await journaliser(tx, {
      typeObjet: "LEAD",
      objetId: leadId,
      action: "CHANGEMENT_ETAPE",
      nouvelleValeur: "NURTURING_A_REACTIVER",
      detail: `Réactivation prévue le ${new Date(dateReactivation).toLocaleDateString("fr-FR")}`,
      auteurId: utilisateur.id,
    });
  });

  revalidatePath("/leads");
  return { ok: true, message: "Lead placé en nurturing." };
}

// ---------------------------------------------------------------------------
// Détection de doublons (§10)
// ---------------------------------------------------------------------------

/**
 * Compare e-mail, téléphone normalisé, nom d'organisation et SIREN.
 * Les prospects issus d'un salon ou d'une recommandation doivent être rapprochés
 * avant toute nouvelle relance.
 */
export async function chercherDoublons(criteres: {
  email?: string;
  telephone?: string;
  nomOrganisation?: string;
  siren?: string;
}) {
  const email = normaliserEmail(criteres.email ?? null);
  const telephone = normaliserTelephone(criteres.telephone ?? null);
  const nom = normaliserNom(criteres.nomOrganisation ?? null);
  const siren = criteres.siren?.replace(/\D/g, "") || null;

  if (!email && !telephone && !nom && !siren) return [];

  const ou: Prisma.OrganisationWhereInput[] = [];
  if (email) ou.push({ email });
  if (telephone) ou.push({ telephone });
  if (siren) ou.push({ siren });
  if (nom) ou.push({ nom: { contains: nom, mode: "insensitive" } });

  return prisma.organisation.findMany({
    where: { OR: ou, fusionneeDansId: null },
    include: { contacts: true, _count: { select: { leads: true, opportunites: true } } },
    take: 10,
  });
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

async function prochainRang(
  tx: Prisma.TransactionClient,
  table: "lead" | "opportunite" | "dossierLld",
  statut: string,
): Promise<number> {
  if (table === "lead") {
    const max = await tx.lead.aggregate({
      where: { statut: statut as StatutLead },
      _max: { rang: true },
    });
    return (max._max.rang ?? -1) + 1;
  }
  if (table === "opportunite") {
    const max = await tx.opportunite.aggregate({
      where: { etape: statut as Prisma.OpportuniteWhereInput["etape"] },
      _max: { rang: true },
    });
    return (max._max.rang ?? -1) + 1;
  }
  const max = await tx.dossierLld.aggregate({
    where: { statut: statut as Prisma.DossierLldWhereInput["statut"] },
    _max: { rang: true },
  });
  return (max._max.rang ?? -1) + 1;
}

export { estTerminaleLead };
