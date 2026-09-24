/**
 * Types du domaine, côté navigateur.
 *
 * Ils reprennent les énumérations du schéma Prisma. Le front n'accède pas à la
 * base : il reçoit ces valeurs du back, qui reste seul à les produire et à les
 * valider. Toute évolution du schéma doit être reportée ici — c'est le prix de
 * la séparation, et la raison pour laquelle ce fichier ne contient que des
 * listes de valeurs, jamais de logique.
 */

export type Role = "COMMERCIAL" | "COLLABORATRICE_LLD" | "MANAGER" | "DIRECTION";

export type ModeAcquisition = "ENTRANT" | "PROSPECTION" | "REACTIVATION";

export type CanalDetaille =
  | "FORMULAIRE_SITE"
  | "APPEL_ENTRANT"
  | "EMAIL_ENTRANT"
  | "CHAT"
  | "RESEAU_SOCIAL_ENTRANT"
  | "DEMANDE_DEVIS"
  | "DEMANDE_DEMONSTRATION"
  | "SALON"
  | "EVENEMENT"
  | "DEMONSTRATION"
  | "SCAN_BADGE"
  | "CARTE_DE_VISITE"
  | "PARTENAIRE"
  | "APPORTEUR"
  | "PRESCRIPTEUR"
  | "REVENDEUR"
  | "RECOMMANDATION_CLIENT"
  | "LISTE_COMPTES_CIBLES"
  | "APPEL_SORTANT"
  | "EMAIL_SORTANT"
  | "LINKEDIN"
  | "VISITE_TERRAIN"
  | "SEQUENCE_PROSPECTION"
  | "ANCIEN_CLIENT"
  | "ANCIEN_DEVIS"
  | "FIN_DE_CONTRAT"
  | "RENOUVELLEMENT"
  | "UPSELL"
  | "CROSS_SELL"
  | "MIGRATION_HISTORIQUE";

export type SegmentClient =
  | "AGENCE_EVENEMENTIELLE"
  | "LIEU_DE_RECEPTION"
  | "HOTEL_CAMPING"
  | "ENTREPRISE"
  | "COLLECTIVITE_ASSOCIATION"
  | "ANIMATION_LOISIRS"
  | "COMMERCE"
  | "LOUEUR_PRESTATAIRE_EVENEMENTIEL"
  | "ETABLISSEMENT_ENSEIGNEMENT"
  | "PARTICULIER"
  | "AUTRE_PROFESSIONNEL";

export type ProjetRecherche =
  | "ACHAT"
  | "LLD"
  | "LOCATION_COURTE_DUREE"
  | "ACHAT_OU_LLD_A_CONSEILLER"
  | "PRESTATION_PONCTUELLE"
  | "A_PRECISER";

export type Priorite =
  | "P1_REPONSE_IMMEDIATE"
  | "P2_A_TRAITER_AUJOURDHUI"
  | "P3_SUIVI_PLANIFIE"
  | "P4_NURTURING";

export type StatutLead =
  | "NOUVEAU_NON_ATTRIBUE"
  | "A_PRENDRE_EN_CHARGE"
  | "PREMIER_CONTACT_A_REALISER"
  | "CONTACT_EN_COURS"
  | "CONTACT_ETABLI_A_QUALIFIER"
  | "QUALIFIE_A_CONVERTIR"
  | "NURTURING_A_REACTIVER"
  | "NON_QUALIFIE_CLOTURE";

export type MotifClotureLead =
  | "PAS_DE_BESOIN"
  | "MAUVAIS_SEGMENT"
  | "DOUBLON"
  | "COORDONNEES_INEXPLOITABLES"
  | "REFUS_EXPLICITE"
  | "AUTRE";

export type EtapeCommerciale =
  | "QUALIFICATION_VALIDEE"
  | "DECOUVERTE_SOLUTION"
  | "OFFRE_A_CONSTRUIRE"
  | "OFFRE_ENVOYEE"
  | "NEGOCIATION_VALIDATION_CLIENT"
  | "DOSSIER_LLD_EN_COURS"
  | "CONTRATS_A_SIGNER"
  | "LIVRAISON_MISE_EN_SERVICE"
  | "GAGNE_ACTIF"
  | "PERDU_ABANDONNE";

export type MotifClotureOpportunite =
  | "CONCURRENT"
  | "BUDGET"
  | "PROJET_REPORTE"
  | "PROJET_ANNULE"
  | "SANS_REPONSE"
  | "HORS_PERIMETRE"
  | "DOUBLON"
  | "AUTRE";

export type StatutLld =
  | "LLD_A_ETUDIER"
  | "DOSSIER_A_PREPARER"
  | "EN_ATTENTE_ELEMENTS_CLIENT"
  | "PRET_A_TRANSMETTRE"
  | "TRANSMIS_A_GRENKE"
  | "RETOUR_ANALYSE_EN_ATTENTE"
  | "REPONSE_COMMUNIQUEE_PAR_GRENKE"
  | "CONTRAT_A_SIGNER"
  | "SIGNE_LIVRAISON_A_CONFIRMER"
  | "LIVRAISON_CONFIRMEE_CONTRAT_ACTIF"
  | "CLOTURE_NON_POURSUIVI";

export type MotifClotureLld =
  | "CLIENT_RETIRE_SA_DEMANDE"
  | "DOSSIER_INCOMPLET_APRES_RELANCES"
  | "SOLUTION_ACHAT_RETENUE"
  | "SOLUTION_LOCATION_COURTE_DUREE_RETENUE"
  | "RETOUR_PARTENAIRE_DEFAVORABLE_COMMUNIQUE"
  | "PROJET_REPORTE"
  | "DOUBLON"
  | "AUTRE";

export type TypeActivite =
  | "APPEL_ENTRANT"
  | "APPEL_SORTANT"
  | "EMAIL_ENTRANT"
  | "EMAIL_SORTANT"
  | "MESSAGE_WHATSAPP"
  | "MESSAGE_SMS"
  | "MESSAGE_LINKEDIN"
  | "REUNION"
  | "DEMONSTRATION"
  | "EVENEMENT_SALON_VISITE"
  | "DEVIS_OFFRE"
  | "ACTIVITE_LLD"
  | "TACHE_INTERNE"
  | "NOTE";

export type SensActivite = "ENTRANT" | "SORTANT" | "INTERNE";

// ---------------------------------------------------------------------------
// Utilisateur courant
// ---------------------------------------------------------------------------

export type Utilisateur = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
};
