/**
 * Fiche détaillée d'un dossier LLD.
 *
 * Elle ne montre que des faits observables : ce qui a été transmis, quand, par
 * quel canal et avec quelle preuve ; ce que le partenaire a communiqué, et par
 * qui. Aucune ligne n'anticipe une décision du partenaire ni ne la qualifie.
 *
 * Les droits viennent du serveur — `peutModifier` et `voitDocuments` sont
 * calculés par l'API, jamais déduits ici.
 */

import { Link, useParams } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import {
  LIBELLE_ETAPE,
  LIBELLE_MOTIF_LLD,
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
import ChecklistLld, { type ItemChecklist } from "@/composants/ChecklistLld";
import ActionsLld from "@/composants/ActionsLld";
import type { EtapeCommerciale, MotifClotureLld, StatutLld } from "@/lib/types";

type DossierDetaille = {
  id: string;
  reference: string;
  statut: StatutLld;
  /** Absente pour un dossier repris d'un devis CRM : à renseigner. */
  dureeDemandeeMois: number | null;
  referenceDevisCrm: string | null;
  statutCrm: string | null;
  montantFinance: number | null;
  loyerMensuel: number | null;
  locataire: string | null;
  dateTransmission: string | null;
  canalTransmission: string | null;
  auteurTransmission: string | null;
  preuveTransmission: string | null;
  dateRetourCommunique: string | null;
  sourceRetour: string | null;
  contenuRetour: string | null;
  signatureClientLe: string | null;
  signatureAutresLe: string | null;
  dateLivraisonPrevue: string | null;
  dateLivraisonConfirmee: string | null;
  prochaineActionLe: string | null;
  prochaineActionLabel: string | null;
  prochaineRelanceLe: string | null;
  elementAttenduLabel: string | null;
  elementDemandeLe: string | null;
  elementDemandeA: string | null;
  motifCloture: MotifClotureLld | null;
  commentaireCloture: string | null;
  alerteCompatibilite: string | null;
  peutModifier: boolean;
  voitDocuments: boolean;
  nbDocuments: number;
  opportunite: {
    id: string;
    reference: string;
    titre: string;
    etape: EtapeCommerciale;
    organisation?: { nom: string } | null;
  };
  collaboratrice: { prenom: string; nom: string } | null;
  commercial: { prenom: string; nom: string } | null;
  checklist: ItemChecklist[];
  documents: { id: string; libelle: string; deposeLe: string }[];
  activites: ActiviteAffichee[];
  taches: TacheAffichee[];
  journal: EntreeJournal[];
};

export default function FicheLld() {
  const { id } = useParams<{ id: string }>();
  const {
    donnees: d,
    chargement,
    erreur,
    recharger,
  } = useApi<DossierDetaille>(`/lld/${id}`);

  if (chargement) return <Chargement quoi="le dossier" />;
  if (erreur) return <Erreur message={erreur} onReessayer={recharger} />;
  if (!d) return <Erreur message="Dossier introuvable." />;

  const checklistComplete =
    d.checklist.length > 0 && d.checklist.every((i) => i.fait);

  return (
    <DispositionFiche
      actions={
        <>
          <Section titre="Suivi">
            <dl className="space-y-1.5 text-sm">
              <Champ libelle="Statut">{LIBELLE_STATUT_LLD[d.statut]}</Champ>
              <Champ libelle="Collaboratrice">
                {d.collaboratrice
                  ? `${d.collaboratrice.prenom} ${d.collaboratrice.nom}`
                  : "Non attribuée"}
              </Champ>
              <Champ libelle="Commercial">
                {d.commercial
                  ? `${d.commercial.prenom} ${d.commercial.nom}`
                  : "—"}
              </Champ>
              <Champ libelle="Prochaine action">
                {d.prochaineActionLabel
                  ? `${d.prochaineActionLabel} · ${dateLongue(d.prochaineActionLe)}`
                  : "— aucune"}
              </Champ>
              {d.prochaineRelanceLe && (
                <Champ libelle="Relance prévue">
                  {dateLongue(d.prochaineRelanceLe)}
                </Champ>
              )}
            </dl>
            {d.motifCloture && (
              <p className="mt-2 rounded-md bg-[var(--neutre-fond)] px-2 py-1.5 text-xs text-[var(--neutre-texte)]">
                {LIBELLE_MOTIF_LLD[d.motifCloture]}
                {d.commentaireCloture && ` — ${d.commentaireCloture}`}
              </p>
            )}
          </Section>

          {/* Une alerte, jamais un refus : le dossier suit son cours. */}
          {d.alerteCompatibilite && (
            <p className="rounded-xl border border-[var(--alerte-bord)] bg-[var(--alerte-fond)] p-3 text-xs text-[var(--alerte-texte)]">
              ⚠ {d.alerteCompatibilite}
            </p>
          )}

          <ActionsLld
            dossier={{
              id: d.id,
              statut: d.statut,
              checklistComplete,
            }}
            peutAgir={d.peutModifier}
            onFait={recharger}
          />
        </>
      }
    >
      <EnTeteFiche
        retourVers="/lld"
        retourLibelle="Dossiers LLD"
        reference={d.reference}
        titre={d.opportunite.organisation?.nom ?? d.opportunite.titre}
        sousTitre={LIBELLE_STATUT_LLD[d.statut]}
      >
        <p className="mt-2 text-xs text-[var(--texte-doux)]">
          Opportunité{" "}
          <Link to={`/ventes/${d.opportunite.id}`} className="underline">
            {d.opportunite.reference}
          </Link>{" "}
          — {d.opportunite.titre} · {LIBELLE_ETAPE[d.opportunite.etape]}
        </p>
        {d.referenceDevisCrm && (
          <p className="mt-1 text-xs text-[var(--texte-doux)]">
            Repris du devis CRM {d.referenceDevisCrm}, facturé à GRENKE
            {d.statutCrm && ` · statut CRM : ${d.statutCrm}`}. Tant qu'il n'est pas
            déplacé à la main, le dossier suit ce devis.
          </p>
        )}
      </EnTeteFiche>

      <Section titre="Demande de financement">
        <ListeChamps>
          <Champ libelle="Durée demandée">
            {d.dureeDemandeeMois != null ? (
              `${d.dureeDemandeeMois} mois`
            ) : (
              <span className="text-[var(--alerte-texte)]">À renseigner</span>
            )}
          </Champ>
          <Champ libelle="Locataire">{d.locataire ?? "—"}</Champ>
          <Champ libelle="Montant financé">
            {euros(d.montantFinance) ?? "—"}
          </Champ>
          <Champ libelle="Loyer mensuel">{euros(d.loyerMensuel) ?? "—"}</Champ>
        </ListeChamps>
        <p className="mt-2 text-[10px] italic text-[var(--texte-doux)]">
          Montant financé, loyer et durée sont des champs distincts : ils ne
          s'additionnent pas.
        </p>
      </Section>

      {/* Transmission : des faits horodatés et prouvés. */}
      {d.dateTransmission && (
        <Section titre="Transmission">
          <ListeChamps>
            <Champ libelle="Transmis le">
              {dateLongue(d.dateTransmission)}
            </Champ>
            <Champ libelle="Canal">{d.canalTransmission ?? "—"}</Champ>
            <Champ libelle="Par">{d.auteurTransmission ?? "—"}</Champ>
            <Champ libelle="Preuve">{d.preuveTransmission ?? "—"}</Champ>
          </ListeChamps>
        </Section>
      )}

      {/* Retour partenaire : ce qui a été communiqué, sans interprétation. */}
      {d.dateRetourCommunique && (
        <Section titre="Retour communiqué par le partenaire">
          <ListeChamps>
            <Champ libelle="Date">
              {dateLongue(d.dateRetourCommunique)}
            </Champ>
            <Champ libelle="Source">{d.sourceRetour ?? "—"}</Champ>
            <Champ libelle="Contenu" pleineLargeur>
              <span className="whitespace-pre-line">
                {d.contenuRetour ?? "—"}
              </span>
            </Champ>
          </ListeChamps>
        </Section>
      )}

      {d.elementAttenduLabel && (
        <Section titre="Élément attendu">
          <ListeChamps>
            <Champ libelle="Élément">{d.elementAttenduLabel}</Champ>
            <Champ libelle="Demandé à">{d.elementDemandeA ?? "—"}</Champ>
            <Champ libelle="Demandé le">
              {dateLongue(d.elementDemandeLe) ?? "—"}
            </Champ>
          </ListeChamps>
        </Section>
      )}

      {(d.signatureClientLe || d.dateLivraisonPrevue) && (
        <Section titre="Contrat et livraison">
          <ListeChamps>
            <Champ libelle="Signature client">
              {dateLongue(d.signatureClientLe) ?? "—"}
            </Champ>
            <Champ libelle="Signature autres parties">
              {dateLongue(d.signatureAutresLe) ?? "—"}
            </Champ>
            <Champ libelle="Livraison prévue">
              {dateLongue(d.dateLivraisonPrevue) ?? "—"}
            </Champ>
            <Champ libelle="Livraison confirmée">
              {dateLongue(d.dateLivraisonConfirmee) ?? "—"}
            </Champ>
          </ListeChamps>
        </Section>
      )}

      <Section titre="Checklist interne">
        <ChecklistLld
          items={d.checklist}
          modifiable={d.peutModifier}
          onFait={recharger}
        />
      </Section>

      <Section titre="Documents">
        {d.voitDocuments ? (
          d.documents.length === 0 ? (
            <p className="text-sm text-[var(--texte-doux)]">
              Aucun document déposé.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--trait)] text-sm">
              {d.documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-baseline justify-between py-1.5"
                >
                  <span className="text-[var(--texte-fort)]">
                    {doc.libelle}
                  </span>
                  <span className="text-xs text-[var(--texte-doux)]">
                    {dateLongue(doc.deposeLe)}
                  </span>
                </li>
              ))}
            </ul>
          )
        ) : (
          <p className="text-sm text-[var(--texte-doux)]">
            {d.nbDocuments} document{d.nbDocuments > 1 ? "s" : ""} au dossier.
            Le contenu des pièces financières n'est pas accessible depuis votre
            rôle.
          </p>
        )}
      </Section>

      <Section>
        <JournalActivites activites={d.activites} taches={d.taches} />
      </Section>

      <Section titre="Journal des décisions">
        <JournalDecisions entrees={d.journal} />
      </Section>
    </DispositionFiche>
  );
}
