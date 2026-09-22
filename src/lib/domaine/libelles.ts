/**
 * Libellés français des listes de valeurs.
 *
 * Les valeurs sont contrôlées (enums Prisma) ; les libellés vivent ici pour rester
 * ajustables sans migration. Réf. : §2.1, §2.2, §2.3 du document.
 */

import type {
  CanalDetaille,
  EtapeCommerciale,
  ModeAcquisition,
  MotifClotureLead,
  MotifClotureLld,
  MotifClotureOpportunite,
  Priorite,
  ProjetRecherche,
  Role,
  SegmentClient,
  SensActivite,
  StatutLead,
  StatutLld,
  TypeActivite,
} from "@prisma/client";

export const LIBELLE_ROLE: Record<Role, string> = {
  COMMERCIAL: "Commercial",
  COLLABORATRICE_LLD: "Collaboratrice LLD",
  MANAGER: "Manager",
  DIRECTION: "Direction / administration",
};

export const LIBELLE_MODE_ACQUISITION: Record<ModeAcquisition, string> = {
  ENTRANT: "Entrant",
  PROSPECTION: "Prospection",
  REACTIVATION: "Réactivation / recommandation",
};

export const LIBELLE_CANAL: Record<CanalDetaille, string> = {
  FORMULAIRE_SITE: "Formulaire du site",
  APPEL_ENTRANT: "Appel entrant",
  EMAIL_ENTRANT: "E-mail entrant",
  CHAT: "Chat",
  RESEAU_SOCIAL_ENTRANT: "Réseau social entrant",
  DEMANDE_DEVIS: "Demande de devis",
  DEMANDE_DEMONSTRATION: "Demande de démonstration",
  SALON: "Salon",
  EVENEMENT: "Évènement",
  DEMONSTRATION: "Démonstration",
  SCAN_BADGE: "Scan de badge",
  CARTE_DE_VISITE: "Carte de visite",
  PARTENAIRE: "Partenaire",
  APPORTEUR: "Apporteur",
  PRESCRIPTEUR: "Prescripteur",
  REVENDEUR: "Revendeur",
  RECOMMANDATION_CLIENT: "Recommandation client",
  LISTE_COMPTES_CIBLES: "Liste de comptes ciblés",
  APPEL_SORTANT: "Appel sortant",
  EMAIL_SORTANT: "E-mail sortant",
  LINKEDIN: "LinkedIn",
  VISITE_TERRAIN: "Visite terrain",
  SEQUENCE_PROSPECTION: "Séquence de prospection",
  ANCIEN_CLIENT: "Ancien client",
  ANCIEN_DEVIS: "Ancien devis",
  FIN_DE_CONTRAT: "Fin de contrat",
  RENOUVELLEMENT: "Renouvellement",
  UPSELL: "Upsell",
  CROSS_SELL: "Cross-sell",
  MIGRATION_HISTORIQUE: "Migration historique",
};

/** Canaux proposés pour chaque mode d'acquisition (§2.1). */
export const CANAUX_PAR_MODE: Record<ModeAcquisition, CanalDetaille[]> = {
  ENTRANT: [
    "FORMULAIRE_SITE",
    "APPEL_ENTRANT",
    "EMAIL_ENTRANT",
    "CHAT",
    "RESEAU_SOCIAL_ENTRANT",
    "DEMANDE_DEVIS",
    "DEMANDE_DEMONSTRATION",
    "SALON",
    "EVENEMENT",
    "DEMONSTRATION",
    "SCAN_BADGE",
    "CARTE_DE_VISITE",
    "PARTENAIRE",
    "APPORTEUR",
    "PRESCRIPTEUR",
    "REVENDEUR",
    "RECOMMANDATION_CLIENT",
  ],
  PROSPECTION: [
    "LISTE_COMPTES_CIBLES",
    "APPEL_SORTANT",
    "EMAIL_SORTANT",
    "LINKEDIN",
    "VISITE_TERRAIN",
    "SEQUENCE_PROSPECTION",
  ],
  REACTIVATION: [
    "ANCIEN_CLIENT",
    "ANCIEN_DEVIS",
    "FIN_DE_CONTRAT",
    "RENOUVELLEMENT",
    "UPSELL",
    "CROSS_SELL",
  ],
};

export const LIBELLE_SEGMENT: Record<SegmentClient, string> = {
  AGENCE_EVENEMENTIELLE: "Agence évènementielle",
  LIEU_DE_RECEPTION: "Lieu de réception",
  HOTEL_CAMPING: "Hôtel / camping",
  ENTREPRISE: "Entreprise",
  COLLECTIVITE_ASSOCIATION: "Collectivité / association",
  ANIMATION_LOISIRS: "Animation / loisirs",
  COMMERCE: "Commerce",
  LOUEUR_PRESTATAIRE_EVENEMENTIEL: "Loueur / prestataire évènementiel",
  ETABLISSEMENT_ENSEIGNEMENT: "Établissement d'enseignement",
  PARTICULIER: "Particulier",
  AUTRE_PROFESSIONNEL: "Autre professionnel",
};

export const LIBELLE_PROJET: Record<ProjetRecherche, string> = {
  ACHAT: "Achat",
  LLD: "LLD",
  LOCATION_COURTE_DUREE: "Location courte durée",
  ACHAT_OU_LLD_A_CONSEILLER: "Achat ou LLD à conseiller",
  PRESTATION_PONCTUELLE: "Prestation ponctuelle",
  A_PRECISER: "À préciser",
};

export const LIBELLE_PRIORITE: Record<Priorite, string> = {
  P1_REPONSE_IMMEDIATE: "P1 — réponse immédiate",
  P2_A_TRAITER_AUJOURDHUI: "P2 — à traiter aujourd'hui",
  P3_SUIVI_PLANIFIE: "P3 — suivi planifié",
  P4_NURTURING: "P4 — nurturing / relance longue",
};

export const LIBELLE_PRIORITE_COURT: Record<Priorite, string> = {
  P1_REPONSE_IMMEDIATE: "P1",
  P2_A_TRAITER_AUJOURDHUI: "P2",
  P3_SUIVI_PLANIFIE: "P3",
  P4_NURTURING: "P4",
};

export const LIBELLE_MOTIF_LEAD: Record<MotifClotureLead, string> = {
  PAS_DE_BESOIN: "Pas de besoin",
  MAUVAIS_SEGMENT: "Mauvais segment",
  DOUBLON: "Doublon",
  COORDONNEES_INEXPLOITABLES: "Coordonnées inexploitables",
  REFUS_EXPLICITE: "Refus explicite",
  AUTRE: "Autre — commentaire obligatoire",
};

export const LIBELLE_MOTIF_OPPORTUNITE: Record<MotifClotureOpportunite, string> = {
  CONCURRENT: "Concurrent retenu",
  BUDGET: "Budget",
  PROJET_REPORTE: "Projet reporté",
  PROJET_ANNULE: "Projet annulé",
  SANS_REPONSE: "Sans réponse",
  HORS_PERIMETRE: "Hors périmètre",
  DOUBLON: "Doublon",
  AUTRE: "Autre — commentaire obligatoire",
};

/**
 * Motifs de clôture LLD. Le libellé « non finançable » est volontairement absent :
 * il masquerait la nature réelle de l'information et induirait une conclusion
 * non justifiée sur la solvabilité du client (§7).
 */
export const LIBELLE_MOTIF_LLD: Record<MotifClotureLld, string> = {
  CLIENT_RETIRE_SA_DEMANDE: "Client retire sa demande",
  DOSSIER_INCOMPLET_APRES_RELANCES: "Dossier incomplet après relances",
  SOLUTION_ACHAT_RETENUE: "Solution d'achat retenue",
  SOLUTION_LOCATION_COURTE_DUREE_RETENUE: "Solution de location courte durée retenue",
  RETOUR_PARTENAIRE_DEFAVORABLE_COMMUNIQUE: "Retour partenaire défavorable communiqué",
  PROJET_REPORTE: "Projet reporté",
  DOUBLON: "Doublon",
  AUTRE: "Autre — commentaire obligatoire",
};

export const LIBELLE_TYPE_ACTIVITE: Record<TypeActivite, string> = {
  APPEL_ENTRANT: "Appel entrant",
  APPEL_SORTANT: "Appel sortant",
  EMAIL_ENTRANT: "E-mail entrant",
  EMAIL_SORTANT: "E-mail sortant",
  MESSAGE_WHATSAPP: "Message WhatsApp",
  MESSAGE_SMS: "SMS",
  MESSAGE_LINKEDIN: "Message LinkedIn",
  REUNION: "Réunion",
  DEMONSTRATION: "Démonstration",
  EVENEMENT_SALON_VISITE: "Évènement / salon / visite",
  DEVIS_OFFRE: "Devis / offre",
  ACTIVITE_LLD: "Activité LLD",
  TACHE_INTERNE: "Tâche interne",
  NOTE: "Note",
};

export const LIBELLE_SENS: Record<SensActivite, string> = {
  ENTRANT: "Entrant",
  SORTANT: "Sortant",
  INTERNE: "Interne",
};

export const LIBELLE_STATUT_LEAD: Record<StatutLead, string> = {
  NOUVEAU_NON_ATTRIBUE: "Nouveau — non attribué",
  A_PRENDRE_EN_CHARGE: "À prendre en charge",
  PREMIER_CONTACT_A_REALISER: "Premier contact à réaliser",
  CONTACT_EN_COURS: "Contact en cours",
  CONTACT_ETABLI_A_QUALIFIER: "Contact établi — à qualifier",
  QUALIFIE_A_CONVERTIR: "Qualifié — à convertir",
  NURTURING_A_REACTIVER: "Nurturing / à réactiver",
  NON_QUALIFIE_CLOTURE: "Non qualifié / clôturé",
};

export const LIBELLE_ETAPE: Record<EtapeCommerciale, string> = {
  QUALIFICATION_VALIDEE: "Qualification validée",
  DECOUVERTE_SOLUTION: "Découverte / solution",
  OFFRE_A_CONSTRUIRE: "Offre à construire",
  OFFRE_ENVOYEE: "Offre envoyée",
  NEGOCIATION_VALIDATION_CLIENT: "Négociation / validation client",
  DOSSIER_LLD_EN_COURS: "Dossier LLD en cours",
  CONTRATS_A_SIGNER: "Contrats à signer",
  LIVRAISON_MISE_EN_SERVICE: "Livraison / mise en service",
  GAGNE_ACTIF: "Gagné — actif",
  PERDU_ABANDONNE: "Perdu / abandonné",
};

export const LIBELLE_STATUT_LLD: Record<StatutLld, string> = {
  LLD_A_ETUDIER: "LLD à étudier",
  DOSSIER_A_PREPARER: "Dossier à préparer",
  EN_ATTENTE_ELEMENTS_CLIENT: "En attente d'éléments client",
  PRET_A_TRANSMETTRE: "Prêt à transmettre",
  TRANSMIS_A_GRENKE: "Transmis à GRENKE",
  RETOUR_ANALYSE_EN_ATTENTE: "Retour / analyse en attente",
  REPONSE_COMMUNIQUEE_PAR_GRENKE: "Réponse communiquée par GRENKE",
  CONTRAT_A_SIGNER: "Contrat à signer",
  SIGNE_LIVRAISON_A_CONFIRMER: "Signé — livraison à confirmer",
  LIVRAISON_CONFIRMEE_CONTRAT_ACTIF: "Livraison confirmée / contrat actif",
  CLOTURE_NON_POURSUIVI: "Clôturé — non poursuivi",
};

/** Badge court affiché sur la carte commerciale quand un dossier LLD est en cours (§3). */
export const BADGE_LLD_COURT: Record<StatutLld, string> = {
  LLD_A_ETUDIER: "LLD à étudier",
  DOSSIER_A_PREPARER: "Dossier à préparer",
  EN_ATTENTE_ELEMENTS_CLIENT: "Attente client",
  PRET_A_TRANSMETTRE: "Prêt à transmettre",
  TRANSMIS_A_GRENKE: "Transmis",
  RETOUR_ANALYSE_EN_ATTENTE: "En attente de retour",
  REPONSE_COMMUNIQUEE_PAR_GRENKE: "Réponse reçue",
  CONTRAT_A_SIGNER: "À signer",
  SIGNE_LIVRAISON_A_CONFIRMER: "Livraison à confirmer",
  LIVRAISON_CONFIRMEE_CONTRAT_ACTIF: "Contrat actif",
  CLOTURE_NON_POURSUIVI: "Clôturé",
};

/** Liste ordonnée d'un enum sous forme d'options pour les formulaires. */
export function options<T extends string>(
  libelles: Record<T, string>,
): { valeur: T; libelle: string }[] {
  return (Object.keys(libelles) as T[]).map((valeur) => ({
    valeur,
    libelle: libelles[valeur],
  }));
}
