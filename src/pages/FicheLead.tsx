/**
 * Fiche détaillée d'un lead.
 *
 * La carte donne l'essentiel en trois secondes ; la fiche porte tout le reste :
 * coordonnées complètes, interlocuteurs, journal d'activités, historique
 * d'attribution et actions de qualification (§3).
 */

import { Link, useParams } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { useUtilisateur } from "@/lib/session";
import {
  LIBELLE_CANAL,
  LIBELLE_MODE_ACQUISITION,
  LIBELLE_MOTIF_LEAD,
  LIBELLE_PRIORITE,
  LIBELLE_PROJET,
  LIBELLE_SEGMENT,
  LIBELLE_STATUT_LEAD,
} from "@/lib/libelles";
import { dateLongue } from "@/lib/format";
import { Chargement, Erreur } from "@/composants/Etats";
import {
  Champ,
  DispositionFiche,
  EnTeteFiche,
  JournalDecisions,
  ListeChamps,
  Section,
  type EntreeJournal,
} from "@/composants/Fiche";
import JournalActivites, {
  type ActiviteAffichee,
  type TacheAffichee,
} from "@/composants/JournalActivites";
import ActionsLead from "@/composants/ActionsLead";
import type {
  CanalDetaille,
  ModeAcquisition,
  MotifClotureLead,
  Priorite,
  ProjetRecherche,
  SegmentClient,
  StatutLead,
} from "@/lib/types";

type LeadDetaille = {
  id: string;
  reference: string;
  statut: StatutLead;
  priorite: Priorite;
  modeAcquisition: ModeAcquisition;
  canalDetaille: CanalDetaille;
  segment: SegmentClient | null;
  projetRecherche: ProjetRecherche;
  ville: string | null;
  horizonIndicatif: string | null;
  besoinResume: string | null;
  nomBrut: string | null;
  emailBrut: string | null;
  telephoneBrut: string | null;
  organisationId: string | null;
  proprietaireId: string | null;
  dateAttribution: string | null;
  motifCloture: MotifClotureLead | null;
  commentaireCloture: string | null;
  /** Renseignés quand le lead vient d'une demande du CRM. */
  numeroCrm: string | null;
  sourceCrm: string | null;
  secteurCrm: string | null;
  demandeCrmLe: string | null;
  idCrmOpportunite: number | null;
  organisation: { nom: string; siren: string | null } | null;
  contactPrincipal: {
    prenom: string | null;
    nom: string;
    role: string | null;
    email: string | null;
    telephone: string | null;
    accepteEmail: boolean;
    accepteTelephone: boolean;
    accepteSms: boolean;
    oppositionNotee: string | null;
  } | null;
  proprietaire: { id: string; prenom: string; nom: string } | null;
  opportunite: { id: string; reference: string; titre: string } | null;
  activites: ActiviteAffichee[];
  taches: TacheAffichee[];
  journal: EntreeJournal[];
};

type MembreEquipe = { id: string; prenom: string; nom: string };

export default function FicheLead() {
  const { id } = useParams<{ id: string }>();
  const utilisateur = useUtilisateur();
  const { donnees: lead, chargement, erreur, recharger } = useApi<LeadDetaille>(
    `/leads/${id}`,
  );
  const { donnees: equipe } = useApi<MembreEquipe[]>(
    "/utilisateurs?role=COMMERCIAL,MANAGER",
  );

  if (chargement) return <Chargement quoi="le lead" />;
  if (erreur) return <Erreur message={erreur} onReessayer={recharger} />;
  if (!lead) return <Erreur message="Lead introuvable." />;

  const nom = lead.organisation?.nom ?? lead.nomBrut ?? "Sans nom";
  const contact = lead.contactPrincipal;

  return (
    <DispositionFiche
      actions={
        <>
          <Section titre="Responsable">
            <p className="text-sm text-[var(--texte-fort)]">
              {lead.proprietaire
                ? `${lead.proprietaire.prenom} ${lead.proprietaire.nom}`
                : "Non attribué"}
            </p>
            {lead.dateAttribution && (
              <p className="mt-0.5 text-xs text-[var(--texte-doux)]">
                Attribué le {dateLongue(lead.dateAttribution)}
              </p>
            )}
            {lead.motifCloture && (
              <p className="mt-2 rounded-md bg-[var(--neutre-fond)] px-2 py-1.5 text-xs text-[var(--neutre-texte)]">
                Clôturé : {LIBELLE_MOTIF_LEAD[lead.motifCloture]}
                {lead.commentaireCloture && ` — ${lead.commentaireCloture}`}
              </p>
            )}
          </Section>

          <ActionsLead
            lead={{
              id: lead.id,
              statut: lead.statut,
              estProprietaire: lead.proprietaireId === utilisateur?.id,
              aProprietaire: Boolean(lead.proprietaireId),
              dejaConverti: Boolean(lead.opportunite),
              nomOrganisation: nom,
              aOrganisation: Boolean(lead.organisationId),
              besoinRenseigne: Boolean(lead.besoinResume?.trim()),
            }}
            equipe={equipe ?? []}
            role={utilisateur?.role ?? null}
            onFait={recharger}
          />
        </>
      }
    >
      <EnTeteFiche
        retourVers="/leads"
        retourLibelle="Leads à qualifier"
        reference={lead.reference}
        titre={nom}
        sousTitre={`${LIBELLE_STATUT_LEAD[lead.statut]} · ${LIBELLE_PRIORITE[lead.priorite]}`}
      >
        {/* L'origine CRM se lit d'emblée : c'est là que se trouvent le
            formulaire rempli par le client et l'historique de ses échanges. */}
        {lead.idCrmOpportunite && (
          <p className="mt-2 rounded-md bg-[var(--neutre-fond)] px-3 py-2 text-xs text-[var(--neutre-texte)]">
            Demande CRM {lead.numeroCrm ?? `#${lead.idCrmOpportunite}`}
            {lead.demandeCrmLe && ` · reçue le ${dateLongue(lead.demandeCrmLe)}`}
            {lead.sourceCrm && ` · ${lead.sourceCrm}`}
          </p>
        )}
        {lead.opportunite && (
          <p className="mt-2 rounded-md bg-[var(--succes-fond)] px-3 py-2 text-sm text-[var(--succes-texte)]">
            Converti en{" "}
            <Link
              to={`/ventes/${lead.opportunite.id}`}
              className="font-semibold underline"
            >
              {lead.opportunite.reference}
            </Link>{" "}
            — {lead.opportunite.titre}
          </p>
        )}
      </EnTeteFiche>

      <Section titre="Qualification">
        <ListeChamps>
          <Champ libelle="Mode d'acquisition">
            {LIBELLE_MODE_ACQUISITION[lead.modeAcquisition]}
          </Champ>
          <Champ libelle="Canal détaillé">
            {LIBELLE_CANAL[lead.canalDetaille]}
          </Champ>
          <Champ libelle="Segment client">
            {lead.segment ? LIBELLE_SEGMENT[lead.segment] : "—"}
            {lead.secteurCrm && (
              <span className="block text-[11px] text-[var(--texte-doux)]">
                CRM : {lead.secteurCrm}
              </span>
            )}
          </Champ>
          <Champ libelle="Projet recherché">
            {LIBELLE_PROJET[lead.projetRecherche]}
          </Champ>
          <Champ libelle="Ville">{lead.ville ?? "—"}</Champ>
          <Champ libelle="Horizon indicatif">
            {lead.horizonIndicatif ?? "—"}
          </Champ>
          <Champ libelle="Besoin résumé" pleineLargeur>
            {lead.besoinResume ?? "—"}
          </Champ>
        </ListeChamps>
      </Section>

      <Section titre="Coordonnées">
        <ListeChamps>
          <Champ libelle="Contact principal">
            {contact
              ? `${contact.prenom ?? ""} ${contact.nom}`.trim()
              : "—"}
          </Champ>
          <Champ libelle="Rôle">{contact?.role ?? "—"}</Champ>
          <Champ libelle="E-mail">
            {contact?.email ?? lead.emailBrut ?? "—"}
          </Champ>
          <Champ libelle="Téléphone">
            {contact?.telephone ?? lead.telephoneBrut ?? "—"}
          </Champ>
          {lead.organisation && (
            <>
              <Champ libelle="Organisation">{lead.organisation.nom}</Champ>
              <Champ libelle="SIREN">{lead.organisation.siren ?? "—"}</Champ>
            </>
          )}
        </ListeChamps>

        {/* Consentements : la collecte reste proportionnée à la vente (§12). */}
        {contact && (
          <p className="mt-3 text-[11px] text-[var(--texte-doux)]">
            Consentements —{" "}
            {[
              contact.accepteEmail ? "e-mail ✓" : "e-mail ✗",
              contact.accepteTelephone ? "téléphone ✓" : "téléphone ✗",
              contact.accepteSms ? "SMS ✓" : "SMS ✗",
            ].join(" · ")}
            {contact.oppositionNotee &&
              ` · opposition : ${contact.oppositionNotee}`}
          </p>
        )}
      </Section>

      <Section>
        <JournalActivites activites={lead.activites} taches={lead.taches} />
      </Section>

      <Section titre="Journal des décisions">
        <JournalDecisions entrees={lead.journal} />
      </Section>
    </DispositionFiche>
  );
}
