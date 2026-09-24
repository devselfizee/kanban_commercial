/**
 * Définition des trois pipelines et de leurs colonnes.
 *
 * Réf. : Proposition de pipeline commercial et LLD pour Selfizee, §4, §6, §7.
 * Chaque colonne porte sa définition opérationnelle et la sortie attendue :
 * c'est ce qui permet à un commercial de savoir quoi faire ensuite sans relire le doc.
 */

import type { EtapeCommerciale, StatutLead, StatutLld } from "./types";

export type Colonne<T extends string> = {
  cle: T;
  libelle: string;
  /** Définition opérationnelle : à quoi correspond exactement la colonne. */
  definition: string;
  /** Ce qui doit se passer avant que la carte en sorte. */
  sortieAttendue: string;
  /** Étape terminale : la carte n'a plus besoin de prochaine action datée. */
  terminale?: boolean;
  /** Attente formalisée : une carte peut y rester sans alerte « sans suivi ». */
  attenteFormalisee?: boolean;
  couleur: string;
};

// ---------------------------------------------------------------------------
// Pipeline n°1 — boîte de qualification des leads
// ---------------------------------------------------------------------------

export const COLONNES_LEAD: Colonne<StatutLead>[] = [
  {
    cle: "NOUVEAU_NON_ATTRIBUE",
    libelle: "Nouveau — non attribué",
    definition:
      "Demande entrante créée automatiquement ou cible ajoutée sans propriétaire.",
    sortieAttendue:
      "Le responsable commercial ou le manager attribue la carte ; un entrant reçoit une première action dans le délai de service défini.",
    couleur: "slate",
  },
  {
    cle: "A_PRENDRE_EN_CHARGE",
    libelle: "À prendre en charge",
    definition: "Lead visible dans un pool partagé, prêt à être réclamé.",
    sortieAttendue:
      "Un commercial utilise « Prendre en charge », ce qui renseigne le propriétaire, la date d'attribution et une prochaine action.",
    couleur: "sky",
  },
  {
    cle: "PREMIER_CONTACT_A_REALISER",
    libelle: "Premier contact à réaliser",
    definition:
      "Le commercial est attribué mais n'a pas encore réalisé son premier contact.",
    sortieAttendue:
      "Appel, e-mail ou message planifié puis journalisé ; la carte avance après une tentative ou un échange.",
    couleur: "amber",
  },
  {
    cle: "CONTACT_EN_COURS",
    libelle: "Contact en cours",
    definition:
      "Une ou plusieurs tentatives sont réalisées ; la qualification n'est pas terminée.",
    sortieAttendue:
      "Le commercial poursuit les relances avec une prochaine activité datée.",
    couleur: "amber",
  },
  {
    cle: "CONTACT_ETABLI_A_QUALIFIER",
    libelle: "Contact établi — à qualifier",
    definition:
      "Un interlocuteur est joint, mais besoin, calendrier, budget ou décideur restent à clarifier.",
    sortieAttendue: "Compléter les informations minimales de qualification.",
    couleur: "violet",
  },
  {
    cle: "QUALIFIE_A_CONVERTIR",
    libelle: "Qualifié — à convertir",
    definition:
      "Besoin réel, interlocuteur et prochaine étape commerciale identifiés.",
    sortieAttendue:
      "Créer l'opportunité et conserver le lien avec le lead ; la carte sort du tableau de qualification.",
    couleur: "emerald",
  },
  {
    cle: "NURTURING_A_REACTIVER",
    libelle: "Nurturing / à réactiver",
    definition: "Intérêt réel mais projet trop lointain ou moment inadapté.",
    sortieAttendue:
      "Programmer une date de réactivation ; ne pas traiter comme perdu.",
    attenteFormalisee: true,
    couleur: "teal",
  },
  {
    cle: "NON_QUALIFIE_CLOTURE",
    libelle: "Non qualifié / clôturé",
    definition:
      "Pas de besoin, mauvais segment, doublon, coordonnées inexploitables ou refus explicite.",
    sortieAttendue:
      "Motif obligatoire et date de clôture ; aucune carte n'est supprimée pour cette raison.",
    terminale: true,
    couleur: "stone",
  },
];

// ---------------------------------------------------------------------------
// Pipeline n°2 — pipeline commercial unique (achat comme LLD)
// ---------------------------------------------------------------------------

export const COLONNES_OPPORTUNITE: Colonne<EtapeCommerciale>[] = [
  {
    cle: "QUALIFICATION_VALIDEE",
    libelle: "Qualification validée",
    definition: "Lead converti, besoin et interlocuteur confirmés.",
    sortieAttendue:
      "Vérifier le cas d'usage, le nombre de bornes, la date cible et les parties prenantes.",
    couleur: "sky",
  },
  {
    cle: "DECOUVERTE_SOLUTION",
    libelle: "Découverte / solution",
    definition: "Rendez-vous ou échange de découverte engagé.",
    sortieAttendue:
      "Définir configuration, services, installation, exploitation et contraintes du client.",
    couleur: "sky",
  },
  {
    cle: "OFFRE_A_CONSTRUIRE",
    libelle: "Offre à construire",
    definition: "Solution et cadre économique suffisamment clairs.",
    sortieAttendue:
      "Préparer l'offre, les variantes achat / LLD et la proposition de valeur Selfizee.",
    couleur: "amber",
  },
  {
    cle: "OFFRE_ENVOYEE",
    libelle: "Offre envoyée",
    definition: "Devis ou proposition transmis au client.",
    sortieAttendue: "Dater la relance et documenter les objections / retours.",
    couleur: "amber",
  },
  {
    cle: "NEGOCIATION_VALIDATION_CLIENT",
    libelle: "Négociation / validation client",
    definition: "Échange sur prix, périmètre, calendrier ou conditions.",
    sortieAttendue: "Identifier le décideur et la prochaine décision client.",
    couleur: "violet",
  },
  {
    cle: "DOSSIER_LLD_EN_COURS",
    libelle: "Dossier LLD en cours",
    definition: "Le client souhaite la LLD ; un dossier LLD est créé.",
    sortieAttendue:
      "Le commercial maintient la relation et répond aux sujets d'offre pendant que le dossier est suivi dans le tableau LLD.",
    attenteFormalisee: true,
    couleur: "indigo",
  },
  {
    cle: "CONTRATS_A_SIGNER",
    libelle: "Contrats à signer",
    definition: "Accord client et contrat disponible à la signature.",
    sortieAttendue: "Suivre chaque signataire et la date d'échéance.",
    couleur: "indigo",
  },
  {
    cle: "LIVRAISON_MISE_EN_SERVICE",
    libelle: "Livraison / mise en service",
    definition: "Signatures requises obtenues et livraison préparée.",
    sortieAttendue:
      "Dater la livraison, la mise en service et le passage éventuel à l'assistance.",
    couleur: "emerald",
  },
  {
    cle: "GAGNE_ACTIF",
    libelle: "Gagné — actif",
    definition:
      "Commande finalisée ou livraison confirmée selon la règle de gestion choisie.",
    sortieAttendue:
      "Créer les tâches de démarrage, assistance et suivi client.",
    terminale: true,
    couleur: "emerald",
  },
  {
    cle: "PERDU_ABANDONNE",
    libelle: "Perdu / abandonné",
    definition: "Le projet ne se réalisera pas ou le client retire sa demande.",
    sortieAttendue: "Motif normalisé, concurrent éventuel, date et commentaire factuel.",
    terminale: true,
    couleur: "stone",
  },
];

// ---------------------------------------------------------------------------
// Pipeline n°3 — dossier LLD / GRENKE
// ---------------------------------------------------------------------------

export const COLONNES_LLD: Colonne<StatutLld>[] = [
  {
    cle: "LLD_A_ETUDIER",
    libelle: "LLD à étudier",
    definition:
      "Le commercial a identifié une demande potentielle ; aucune conclusion financière n'est saisie.",
    sortieAttendue:
      "Valider la durée, l'équipement, le locataire et les interlocuteurs ; désigner la collaboratrice LLD.",
    couleur: "slate",
  },
  {
    cle: "DOSSIER_A_PREPARER",
    libelle: "Dossier à préparer",
    definition:
      "Les informations commerciales existent, mais le dossier n'est pas prêt à être transmis.",
    sortieAttendue:
      "Utiliser la checklist interne de complétude, sans présumer des pièces exigées par le partenaire.",
    couleur: "sky",
  },
  {
    cle: "EN_ATTENTE_ELEMENTS_CLIENT",
    libelle: "En attente d'éléments client",
    definition: "Un élément précis est demandé au client ou au commercial.",
    sortieAttendue:
      "Enregistrer la demande, sa date, son auteur et l'échéance de relance.",
    attenteFormalisee: true,
    couleur: "amber",
  },
  {
    cle: "PRET_A_TRANSMETTRE",
    libelle: "Prêt à transmettre",
    definition:
      "La checklist interne est achevée et la transmission est autorisée par Selfizee.",
    sortieAttendue:
      "Transmettre par le canal convenu ; horodater et conserver la preuve de transmission.",
    couleur: "violet",
  },
  {
    cle: "TRANSMIS_A_GRENKE",
    libelle: "Transmis à GRENKE",
    definition:
      "Selfizee a envoyé la demande ; aucun retour interprété n'est encore enregistré.",
    sortieAttendue:
      "Planifier une relance factuelle si aucun accusé ou retour n'arrive dans le délai interne convenu.",
    attenteFormalisee: true,
    couleur: "indigo",
  },
  {
    cle: "RETOUR_ANALYSE_EN_ATTENTE",
    libelle: "Retour / analyse en attente",
    definition:
      "Un retour, une question ou une demande complémentaire est signalé ; le détail est journalisé.",
    sortieAttendue:
      "Répondre ou demander les compléments, avec le commercial en copie si une action client est nécessaire.",
    couleur: "indigo",
  },
  {
    cle: "REPONSE_COMMUNIQUEE_PAR_GRENKE",
    libelle: "Réponse communiquée par GRENKE",
    definition:
      "Le partenaire a communiqué un résultat ou une orientation ; la date et la source sont enregistrées.",
    sortieAttendue:
      "Faire avancer vers signatures, compléments ou clôture selon le message effectivement reçu.",
    couleur: "violet",
  },
  {
    cle: "CONTRAT_A_SIGNER",
    libelle: "Contrat à signer",
    definition: "Un contrat est disponible et les signataires sont identifiés.",
    sortieAttendue:
      "Suivre séparément la signature client et les autres signatures applicables.",
    couleur: "emerald",
  },
  {
    cle: "SIGNE_LIVRAISON_A_CONFIRMER",
    libelle: "Signé — livraison à confirmer",
    definition:
      "Les signatures suivies sont complètes ; la livraison reste à confirmer.",
    sortieAttendue:
      "Coordonner la livraison et obtenir l'évènement de confirmation requis.",
    couleur: "emerald",
  },
  {
    cle: "LIVRAISON_CONFIRMEE_CONTRAT_ACTIF",
    libelle: "Livraison confirmée / contrat actif",
    definition: "La livraison est confirmée selon le processus applicable.",
    sortieAttendue:
      "Lier le dossier au suivi client, à l'assistance et aux échéances de contrat.",
    terminale: true,
    couleur: "emerald",
  },
  {
    cle: "CLOTURE_NON_POURSUIVI",
    libelle: "Clôturé — non poursuivi",
    definition:
      "Le client se retire, le dossier n'est pas transmis, ou un retour défavorable est communiqué.",
    sortieAttendue:
      "Choisir un motif factuel et décider d'un éventuel retour à une offre d'achat ou de location.",
    terminale: true,
    couleur: "stone",
  },
];

// ---------------------------------------------------------------------------
// Accès utilitaires
// ---------------------------------------------------------------------------

export const colonneLead = (cle: StatutLead) =>
  COLONNES_LEAD.find((c) => c.cle === cle)!;

export const colonneOpportunite = (cle: EtapeCommerciale) =>
  COLONNES_OPPORTUNITE.find((c) => c.cle === cle)!;

export const colonneLld = (cle: StatutLld) =>
  COLONNES_LLD.find((c) => c.cle === cle)!;

/** Une carte en étape terminale ou en attente formalisée n'exige pas de prochaine action. */
export function exigeProchaineAction(
  colonne: Colonne<string>,
  attenteDatee: boolean,
): boolean {
  if (colonne.terminale) return false;
  if (colonne.attenteFormalisee && attenteDatee) return false;
  return true;
}
