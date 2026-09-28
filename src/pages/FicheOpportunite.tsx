/**
 * Fiche détaillée d'une opportunité.
 *
 * Les valeurs y sont tenues séparément — montant de vente, mise en place, loyer
 * mensuel, durée (§6). Les additionner donnerait un chiffre qui ne répond à
 * aucune question réelle : une vente directe et des loyers sur trois ans ne se
 * comparent pas.
 *
 * Le commercial voit le statut du dossier LLD associé, sans le contenu des
 * pièces financières.
 */

import { Link, useParams } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { useUtilisateur } from "@/lib/session";
import {
  LIBELLE_ETAPE,
  LIBELLE_MOTIF_OPPORTUNITE,
  LIBELLE_PRIORITE,
  LIBELLE_PROJET,
  LIBELLE_SEGMENT,
  LIBELLE_STATUT_LLD,
} from "@/lib/libelles";
import { dateLongue, euros } from "@/lib/format";
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
import ActionsOpportunite from "@/composants/ActionsOpportunite";
import type {
  EtapeCommerciale,
  MotifClotureOpportunite,
  Priorite,
  ProjetRecherche,
  SegmentClient,
  StatutLld,
} from "@/lib/types";

type OpportuniteDetaillee = {
  id: string;
  reference: string;
  titre: string;
  etape: EtapeCommerciale;
  priorite: Priorite;
  projetRecherche: ProjetRecherche;
  solutionEnvisagee: string | null;
  quantiteBornes: number | null;
  lieuInstallation: string | null;
  montantVente: number | null;
  montantMiseEnPlace: number | null;
  loyerMensuelEnvisage: number | null;
  dureeLldMois: number | null;
  dateCible: string | null;
  dateEvenement: string | null;
  prochaineActionLe: string | null;
  prochaineActionLabel: string | null;
  motifCloture: MotifClotureOpportunite | null;
  commentaireCloture: string | null;
  alerteCompatibilite: string | null;
  organisation: {
    id: string;
    nom: string;
    ville: string | null;
    segment: SegmentClient;
  };
  contactPrincipal: { prenom: string | null; nom: string } | null;
  commercial: { id: string; prenom: string; nom: string } | null;
  lead: { id: string; reference: string } | null;
  devis: {
    id: string;
    version: number;
    reference: string;
    montant: number | null;
    dateEnvoi: string | null;
  }[];
  /**
   * Les devis du CRM, lus à la demande — plus de 400 000 en base, jamais
   * synchronisés. L'état distingue « aucun devis » de « je n'ai pas pu
   * regarder », qui ne veulent pas dire la même chose.
   */
  devisCrm:
    | {
        etat: "ok";
        devis: {
          id: number;
          reference: string | null;
          objet: string | null;
          statut: string | null;
          dateCreation: string | null;
          montantHt: number | null;
          /** Facturé à GRENKE : affaire financée en location financière. */
          financeGrenke: boolean;
        }[];
        total: number;
      }
    | { etat: "non_configure" }
    | { etat: "indisponible"; detail: string };
  dossierLld: {
    id: string;
    reference: string;
    statut: StatutLld;
    dureeDemandeeMois: number;
    prochaineActionLe: string | null;
    prochaineActionLabel: string | null;
    collaboratrice: { prenom: string; nom: string } | null;
    checklist: { fait: boolean }[];
  } | null;
  activites: ActiviteAffichee[];
  taches: TacheAffichee[];
  journal: EntreeJournal[];
};

type MembreEquipe = { id: string; prenom: string; nom: string };

export default function FicheOpportunite() {
  const { id } = useParams<{ id: string }>();
  const utilisateur = useUtilisateur();
  const {
    donnees: opp,
    chargement,
    erreur,
    recharger,
  } = useApi<OpportuniteDetaillee>(`/opportunites/${id}`);
  const { donnees: collaboratrices } = useApi<MembreEquipe[]>(
    "/utilisateurs?role=COLLABORATRICE_LLD,MANAGER",
  );

  if (chargement) return <Chargement quoi="l'opportunité" />;
  if (erreur) return <Erreur message={erreur} onReessayer={recharger} />;
  if (!opp) return <Erreur message="Opportunité introuvable." />;

  const lld = opp.dossierLld;

  return (
    <DispositionFiche
      actions={
        <>
          <Section titre="Suivi">
            <dl className="space-y-1.5 text-sm">
              <Champ libelle="Commercial">
                {opp.commercial
                  ? `${opp.commercial.prenom} ${opp.commercial.nom}`
                  : "Non attribué"}
              </Champ>
              <Champ libelle="Priorité">{LIBELLE_PRIORITE[opp.priorite]}</Champ>
              <Champ libelle="Contact principal">
                {opp.contactPrincipal
                  ? `${opp.contactPrincipal.prenom ?? ""} ${opp.contactPrincipal.nom}`.trim()
                  : "—"}
              </Champ>
              <Champ libelle="Prochaine action">
                {opp.prochaineActionLabel
                  ? `${opp.prochaineActionLabel} · ${dateLongue(opp.prochaineActionLe)}`
                  : "— aucune"}
              </Champ>
            </dl>
            {opp.motifCloture && (
              <p className="mt-2 rounded-md bg-[var(--neutre-fond)] px-2 py-1.5 text-xs text-[var(--neutre-texte)]">
                {LIBELLE_MOTIF_OPPORTUNITE[opp.motifCloture]}
                {opp.commentaireCloture && ` — ${opp.commentaireCloture}`}
              </p>
            )}
          </Section>

          {/* Statut LLD : visible du commercial, sans le contenu des pièces. */}
          {lld && (
            <div className="rounded-xl border border-[var(--selfizee-200)] bg-[var(--selfizee-50)] p-4">
              <h2 className="mb-2 text-sm font-semibold text-[var(--texte-fort)]">
                Dossier LLD
              </h2>
              <p className="text-sm font-medium text-[var(--texte-fort)]">
                {LIBELLE_STATUT_LLD[lld.statut]}
              </p>
              <dl className="mt-2 space-y-1 text-xs">
                <Champ libelle="Référence">{lld.reference}</Champ>
                <Champ libelle="Durée demandée">
                  {lld.dureeDemandeeMois} mois
                </Champ>
                <Champ libelle="Collaboratrice">
                  {lld.collaboratrice
                    ? `${lld.collaboratrice.prenom} ${lld.collaboratrice.nom}`
                    : "Non attribuée"}
                </Champ>
                <Champ libelle="Prochain jalon">
                  {lld.prochaineActionLabel
                    ? `${lld.prochaineActionLabel} · ${dateLongue(lld.prochaineActionLe)}`
                    : "—"}
                </Champ>
                <Champ libelle="Checklist interne">
                  {lld.checklist.filter((c) => c.fait).length} /{" "}
                  {lld.checklist.length}
                </Champ>
              </dl>
              <Link
                to={`/lld/${lld.id}`}
                className="mt-2 inline-block text-xs font-medium underline"
              >
                Ouvrir le dossier
              </Link>
              <p className="mt-2 text-[10px] italic text-[var(--texte-doux)]">
                Les documents de financement ne sont pas exposés ici.
              </p>
            </div>
          )}

          {/* Une alerte, pas un refus : le dossier suit son cours. */}
          {opp.alerteCompatibilite && (
            <p className="rounded-xl border border-[var(--alerte-bord)] bg-[var(--alerte-fond)] p-3 text-xs text-[var(--alerte-texte)]">
              ⚠ {opp.alerteCompatibilite}
            </p>
          )}

          <ActionsOpportunite
            opportunite={{
              id: opp.id,
              etape: opp.etape,
              dejaLld: Boolean(lld),
              montantVente: opp.montantVente,
              dureeLldMois: opp.dureeLldMois,
            }}
            collaboratrices={collaboratrices ?? []}
            role={utilisateur?.role ?? null}
            onFait={recharger}
          />
        </>
      }
    >
      <EnTeteFiche
        retourVers="/ventes"
        retourLibelle="Ventes"
        reference={opp.reference}
        titre={opp.titre}
        sousTitre={[
          opp.organisation.nom,
          opp.organisation.ville,
          LIBELLE_ETAPE[opp.etape],
        ]
          .filter(Boolean)
          .join(" · ")}
      >
        {opp.lead && (
          <p className="mt-2 text-xs text-[var(--texte-doux)]">
            Issue du lead{" "}
            <Link to={`/leads/${opp.lead.id}`} className="underline">
              {opp.lead.reference}
            </Link>{" "}
            — l'historique du lead est conservé.
          </p>
        )}
      </EnTeteFiche>

      <Section titre="Offre et valeurs">
        <ListeChamps>
          <Champ libelle="Projet recherché">
            {LIBELLE_PROJET[opp.projetRecherche]}
          </Champ>
          <Champ libelle="Segment">
            {LIBELLE_SEGMENT[opp.organisation.segment]}
          </Champ>
          <Champ libelle="Solution envisagée" pleineLargeur>
            {opp.solutionEnvisagee ?? "—"}
          </Champ>
          <Champ libelle="Nombre de bornes">{opp.quantiteBornes ?? "—"}</Champ>
          <Champ libelle="Lieu d'installation">
            {opp.lieuInstallation ?? "—"}
          </Champ>
          <Champ libelle="Montant de vente">
            {euros(opp.montantVente) ?? "—"}
          </Champ>
          <Champ libelle="Montant de mise en place">
            {euros(opp.montantMiseEnPlace) ?? "—"}
          </Champ>
          <Champ libelle="Loyer mensuel envisagé">
            {euros(opp.loyerMensuelEnvisage) ?? "—"}
          </Champ>
          <Champ libelle="Durée LLD">
            {opp.dureeLldMois ? `${opp.dureeLldMois} mois` : "—"}
          </Champ>
          <Champ libelle="Date cible">{dateLongue(opp.dateCible) ?? "—"}</Champ>
          <Champ libelle="Date d'évènement">
            {dateLongue(opp.dateEvenement) ?? "—"}
          </Champ>
        </ListeChamps>
        <p className="mt-2 text-[10px] italic text-[var(--texte-doux)]">
          Vente directe et loyers restent des indicateurs distincts.
        </p>
      </Section>

      {opp.devis.length > 0 && (
        <Section titre="Devis">
          <ul className="divide-y divide-[var(--trait)] text-sm">
            {opp.devis.map((d) => (
              <li
                key={d.id}
                className="flex items-baseline justify-between py-1.5"
              >
                <span>
                  <span className="font-medium text-[var(--texte-fort)]">
                    v{d.version}
                  </span>
                  <span className="ml-2 font-mono text-[11px] text-[var(--texte-doux)]">
                    {d.reference}
                  </span>
                </span>
                <span className="text-xs text-[var(--texte-doux)]">
                  {euros(d.montant) ?? "—"} · envoyé{" "}
                  {dateLongue(d.dateEnvoi) ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Devis du CRM : lus à l'ouverture de la fiche, jamais recopiés. */}
      {opp.devisCrm.etat === "ok" && opp.devisCrm.devis.length > 0 && (
        <Section titre="Devis du CRM">
          <ul className="divide-y divide-[var(--trait)] text-sm">
            {opp.devisCrm.devis.map((d) => (
              <li key={d.id} className="py-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] text-[var(--texte-doux)]">
                      {d.reference ?? `#${d.id}`}
                    </span>
                    {/* Un devis facturé à GRENKE est une affaire en LLD : le
                        signaler, c'est montrer qu'un dossier de financement
                        existe ou devrait exister. */}
                    {d.financeGrenke && (
                      <span className="rounded bg-[var(--selfizee-100)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--selfizee-700)]">
                        Financement GRENKE
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-[var(--texte-doux)]">
                    {euros(d.montantHt) ?? "—"} HT ·{" "}
                    {dateLongue(d.dateCreation) ?? "—"}
                  </span>
                </div>
                {d.objet && (
                  <p className="text-[var(--texte-fort)]">{d.objet}</p>
                )}
                {d.statut && (
                  <span className="text-[10px] text-[var(--texte-tres-doux)]">
                    {d.statut}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {opp.devisCrm.total > opp.devisCrm.devis.length && (
            <p className="mt-2 text-[11px] text-[var(--texte-doux)]">
              {opp.devisCrm.devis.length} des {opp.devisCrm.total} devis de ce
              client, les plus récents d'abord.
            </p>
          )}
        </Section>
      )}

      {/* Un CRM injoignable n'est pas un client sans devis : le dire. */}
      {opp.devisCrm.etat === "indisponible" && (
        <Section titre="Devis du CRM">
          <p className="text-sm text-[var(--texte-doux)]">
            Liste indisponible — {opp.devisCrm.detail}
          </p>
        </Section>
      )}

      <Section>
        <JournalActivites activites={opp.activites} taches={opp.taches} />
      </Section>

      <Section titre="Journal des décisions">
        <JournalDecisions entrees={opp.journal} />
      </Section>
    </DispositionFiche>
  );
}
