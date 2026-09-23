/**
 * Fiche détaillée d'un dossier LLD.
 *
 * Elle n'affiche que des faits observables et leurs dates. Les documents liés au
 * financement ne sont visibles que des personnes qui les traitent (§12), et les
 * accès sont journalisés.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { peutVoirDocumentsFinanciers, utilisateurCourant } from "@/lib/session";
import {
  LIBELLE_MOTIF_LLD,
  LIBELLE_STATUT_LLD,
} from "@/lib/domaine/libelles";
import { LIBELLE_ACTION } from "@/lib/journal";
import { verifierCompatibilitePartenaire } from "@/lib/domaine/regles";
import { dateHeure, dateLongue, euros } from "@/lib/format";
import JournalActivites from "@/components/JournalActivites";
import ActionsLld from "./ActionsLld";
import Checklist from "./Checklist";

export const dynamic = "force-dynamic";

export default async function FicheLld({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const utilisateur = await utilisateurCourant();

  const dossier = await prisma.dossierLld.findUnique({
    where: { id },
    include: {
      opportunite: {
        include: { organisation: true, contactPrincipal: true },
      },
      collaboratrice: { select: { prenom: true, nom: true } },
      commercial: { select: { prenom: true, nom: true } },
      checklist: { orderBy: { ordre: "asc" } },
      documents: true,
      activites: {
        orderBy: { dateReelle: "desc" },
        include: { auteur: { select: { prenom: true, nom: true } } },
      },
      taches: {
        orderBy: { echeance: "asc" },
        include: { responsable: { select: { prenom: true, nom: true } } },
      },
    },
  });

  if (!dossier) notFound();

  const journal = await prisma.journalEntree.findMany({
    where: { typeObjet: "DOSSIER_LLD", objetId: id },
    orderBy: { creeLe: "desc" },
    include: { auteur: { select: { prenom: true, nom: true } } },
  });

  const alerte = verifierCompatibilitePartenaire(
    dossier.dureeDemandeeMois,
    dossier.montantFinance ? Number(dossier.montantFinance) : null,
  );

  const voitDocuments = utilisateur
    ? peutVoirDocumentsFinanciers(utilisateur.role)
    : false;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <header className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <Link href="/lld" className="text-xs text-slate-500 hover:underline">
              ← LLD / GRENKE
            </Link>
            <span className="font-mono text-xs text-slate-400">
              {dossier.reference}
            </span>
          </div>

          <h1 className="text-xl font-bold tracking-tight">
            {dossier.locataire ?? dossier.opportunite.organisation.nom}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {LIBELLE_STATUT_LLD[dossier.statut]} ·{" "}
            <Link
              href={`/ventes/${dossier.opportuniteId}`}
              className="underline"
            >
              {dossier.opportunite.reference}
            </Link>{" "}
            — {dossier.opportunite.titre}
          </p>

          {alerte.aConfirmer && (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              ⚠ {alerte.message}
            </p>
          )}
        </header>

        {/* Conditions demandées */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold">Conditions demandées</h2>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Champ libelle="Durée demandée">{dossier.dureeDemandeeMois} mois</Champ>
            <Champ libelle="Montant financé">
              {euros(dossier.montantFinance) ?? "—"}
            </Champ>
            <Champ libelle="Loyer mensuel">{euros(dossier.loyerMensuel) ?? "—"}</Champ>
            <Champ libelle="Locataire">
              {dossier.locataire ?? dossier.opportunite.organisation.nom}
            </Champ>
          </dl>
        </section>

        {/* Faits enregistrés — aucune interprétation */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-1 text-sm font-semibold">Faits enregistrés</h2>
          <p className="mb-3 text-[11px] text-slate-500">
            Dates et sources telles qu&apos;elles ont été constatées. Aucune décision
            de financement n&apos;est déduite en l&apos;absence de retour.
          </p>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Champ libelle="Transmission">
              {dossier.dateTransmission
                ? `${dateLongue(dossier.dateTransmission)} · ${dossier.canalTransmission ?? "canal non précisé"}`
                : "— non transmis"}
            </Champ>
            <Champ libelle="Auteur de la transmission">
              {dossier.auteurTransmission ?? "—"}
            </Champ>
            <Champ libelle="Preuve de transmission" pleineLargeur>
              {dossier.preuveTransmission ?? "—"}
            </Champ>
            <Champ libelle="Retour communiqué">
              {dossier.dateRetourCommunique
                ? `${dateLongue(dossier.dateRetourCommunique)} · source : ${dossier.sourceRetour ?? "non précisée"}`
                : "— aucun retour enregistré"}
            </Champ>
            <Champ libelle="Contenu du retour" pleineLargeur>
              {dossier.contenuRetour ?? "—"}
            </Champ>
            <Champ libelle="Signature client">
              {dateLongue(dossier.signatureClientLe) ?? "—"}
            </Champ>
            <Champ libelle="Autres signatures">
              {dateLongue(dossier.signatureAutresLe) ?? "—"}
            </Champ>
            <Champ libelle="Livraison prévue">
              {dateLongue(dossier.dateLivraisonPrevue) ?? "—"}
            </Champ>
            <Champ libelle="Livraison confirmée">
              {dateLongue(dossier.dateLivraisonConfirmee) ?? "—"}
            </Champ>
          </dl>

          {dossier.elementAttenduLabel && (
            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              En attente : {dossier.elementAttenduLabel} — demandé à{" "}
              {dossier.elementDemandeA} le {dateLongue(dossier.elementDemandeLe)},
              relance prévue le {dateLongue(dossier.prochaineRelanceLe)}.
            </p>
          )}
        </section>

        {/* Checklist interne */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-1 text-sm font-semibold">Checklist interne de complétude</h2>
          <p className="mb-3 text-[11px] text-slate-500">
            Liste propre à Selfizee. Elle ne présume pas des pièces exigées par le
            partenaire, qui restent à confirmer avec lui.
          </p>
          <Checklist
            items={dossier.checklist}
            modifiable={
              utilisateur?.role === "COLLABORATRICE_LLD" ||
              utilisateur?.role === "MANAGER"
            }
          />
        </section>

        {/* Documents, réservés aux personnes qui les traitent */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 text-sm font-semibold">Documents</h2>
          {!voitDocuments ? (
            <p className="text-xs text-slate-500">
              {dossier.documents.length} document(s) au dossier. Leur contenu est
              réservé aux personnes qui traitent le financement.
            </p>
          ) : dossier.documents.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun document.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {dossier.documents.map((d) => (
                <li key={d.id} className="flex items-baseline justify-between py-1.5">
                  <span>{d.nom}</span>
                  <span className="text-xs text-slate-400">
                    {d.confidentiel && "confidentiel · "}
                    {dateLongue(d.deposeLe)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <JournalActivites activites={dossier.activites} taches={dossier.taches} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold">Journal des décisions</h2>
          {journal.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune entrée.</p>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {journal.map((j) => (
                <li
                  key={j.id}
                  className="flex flex-wrap gap-x-2 text-slate-600 dark:text-slate-400"
                >
                  <span className="text-slate-400">{dateHeure(j.creeLe)}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {LIBELLE_ACTION[j.action as keyof typeof LIBELLE_ACTION] ?? j.action}
                  </span>
                  {j.detail && <span>{j.detail}</span>}
                  {j.auteur && (
                    <span className="text-slate-400">
                      par {j.auteur.prenom} {j.auteur.nom}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 text-sm font-semibold">Responsables</h2>
          <dl className="space-y-1.5 text-sm">
            <Champ libelle="Collaboratrice LLD">
              {dossier.collaboratrice
                ? `${dossier.collaboratrice.prenom} ${dossier.collaboratrice.nom}`
                : "Non attribuée"}
            </Champ>
            <Champ libelle="Commercial (relation client)">
              {dossier.commercial
                ? `${dossier.commercial.prenom} ${dossier.commercial.nom}`
                : "—"}
            </Champ>
            <Champ libelle="Prochaine action">
              {dossier.prochaineActionLabel
                ? `${dossier.prochaineActionLabel} · ${dateLongue(dossier.prochaineActionLe)}`
                : "— aucune"}
            </Champ>
          </dl>
          {dossier.motifCloture && (
            <p className="mt-2 rounded-md bg-slate-100 px-2 py-1.5 text-xs dark:bg-slate-800">
              {LIBELLE_MOTIF_LLD[dossier.motifCloture]}
              {dossier.commentaireCloture && ` — ${dossier.commentaireCloture}`}
            </p>
          )}
        </div>

        <ActionsLld
          dossier={{
            id: dossier.id,
            statut: dossier.statut,
            checklistComplete: dossier.checklist.every((c) => c.fait),
            aTransmission: Boolean(dossier.dateTransmission),
            aSignatureClient: Boolean(dossier.signatureClientLe),
          }}
          role={utilisateur?.role ?? null}
        />
      </aside>
    </div>
  );
}

function Champ({
  libelle,
  children,
  pleineLargeur,
}: {
  libelle: string;
  children: React.ReactNode;
  pleineLargeur?: boolean;
}) {
  return (
    <div className={pleineLargeur ? "sm:col-span-2" : undefined}>
      <dt className="text-[11px] uppercase tracking-wide text-slate-400">{libelle}</dt>
      <dd className="text-slate-800 dark:text-slate-200">{children}</dd>
    </div>
  );
}
