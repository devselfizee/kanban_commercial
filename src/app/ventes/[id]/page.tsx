/**
 * Fiche détaillée d'une opportunité.
 *
 * Le commercial y garde la main sur la relation, y compris quand un dossier LLD
 * est en cours : il voit le statut et le prochain jalon du financement, sans accès
 * au contenu des documents (§12).
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/session";
import {
  BADGE_LLD_COURT,
  LIBELLE_ETAPE,
  LIBELLE_MOTIF_OPPORTUNITE,
  LIBELLE_PRIORITE,
  LIBELLE_PROJET,
  LIBELLE_SEGMENT,
  LIBELLE_STATUT_LLD,
} from "@/lib/domaine/libelles";
import { LIBELLE_ACTION } from "@/lib/journal";
import { verifierCompatibilitePartenaire } from "@/lib/domaine/regles";
import { dateHeure, dateLongue, euros } from "@/lib/format";
import JournalActivites from "@/components/JournalActivites";
import ActionsOpportunite from "./ActionsOpportunite";

export const dynamic = "force-dynamic";

export default async function FicheOpportunite({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const utilisateur = await utilisateurCourant();

  const opp = await prisma.opportunite.findUnique({
    where: { id },
    include: {
      organisation: true,
      contactPrincipal: true,
      commercial: { select: { id: true, prenom: true, nom: true } },
      lead: { select: { id: true, reference: true } },
      devis: { orderBy: { version: "desc" } },
      dossierLld: {
        include: {
          collaboratrice: { select: { prenom: true, nom: true } },
          checklist: { select: { fait: true } },
        },
      },
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

  if (!opp) notFound();

  const journal = await prisma.journalEntree.findMany({
    where: { typeObjet: "OPPORTUNITE", objetId: id },
    orderBy: { creeLe: "desc" },
    include: { auteur: { select: { prenom: true, nom: true } } },
  });

  const collaboratrices = await prisma.utilisateur.findMany({
    where: { actif: true, role: { in: ["COLLABORATRICE_LLD", "MANAGER"] } },
    select: { id: true, prenom: true, nom: true },
    orderBy: { nom: "asc" },
  });

  const alerte =
    opp.dureeLldMois || opp.dossierLld
      ? verifierCompatibilitePartenaire(
          opp.dossierLld?.dureeDemandeeMois ?? opp.dureeLldMois!,
          opp.dossierLld?.montantFinance
            ? Number(opp.dossierLld.montantFinance)
            : opp.montantVente
              ? Number(opp.montantVente)
              : null,
        )
      : { aConfirmer: false, message: null };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <header className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <Link href="/ventes" className="text-xs text-slate-500 hover:underline">
              ← Ventes
            </Link>
            <span className="font-mono text-xs text-slate-400">{opp.reference}</span>
          </div>

          <h1 className="text-xl font-bold tracking-tight">{opp.titre}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {opp.organisation.nom}
            {opp.organisation.ville && ` · ${opp.organisation.ville}`} ·{" "}
            {LIBELLE_ETAPE[opp.etape]}
          </p>

          {opp.lead && (
            <p className="mt-2 text-xs text-slate-500">
              Issue du lead{" "}
              <Link href={`/leads/${opp.lead.id}`} className="underline">
                {opp.lead.reference}
              </Link>{" "}
              — l&apos;historique du lead est conservé.
            </p>
          )}
        </header>

        {/* Valeurs, tenues séparément */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold">Offre et valeurs</h2>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
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
            <Champ libelle="Lieu d'installation">{opp.lieuInstallation ?? "—"}</Champ>
            <Champ libelle="Montant de vente">{euros(opp.montantVente) ?? "—"}</Champ>
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
          </dl>
          <p className="mt-2 text-[10px] italic text-slate-400">
            Vente directe et loyers restent des indicateurs distincts.
          </p>
        </section>

        {/* Devis */}
        {opp.devis.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 text-sm font-semibold">Devis</h2>
            <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {opp.devis.map((d) => (
                <li key={d.id} className="flex items-baseline justify-between py-1.5">
                  <span>
                    <span className="font-medium">v{d.version}</span>
                    <span className="ml-2 font-mono text-[11px] text-slate-400">
                      {d.reference}
                    </span>
                  </span>
                  <span className="text-xs text-slate-500">
                    {euros(d.montant) ?? "—"} · envoyé {dateLongue(d.dateEnvoi) ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <JournalActivites activites={opp.activites} taches={opp.taches} />
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
                  {j.ancienneValeur && j.nouvelleValeur && (
                    <span>
                      {j.ancienneValeur} → {j.nouvelleValeur}
                    </span>
                  )}
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
          <h2 className="mb-2 text-sm font-semibold">Suivi</h2>
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
            <p className="mt-2 rounded-md bg-slate-100 px-2 py-1.5 text-xs dark:bg-slate-800">
              {LIBELLE_MOTIF_OPPORTUNITE[opp.motifCloture]}
              {opp.commentaireCloture && ` — ${opp.commentaireCloture}`}
            </p>
          )}
        </div>

        {/* Statut LLD : visible du commercial, sans le contenu des documents */}
        {opp.dossierLld && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
            <h2 className="mb-2 text-sm font-semibold">Dossier LLD</h2>
            <p className="text-sm font-medium">
              {LIBELLE_STATUT_LLD[opp.dossierLld.statut]}
            </p>
            <dl className="mt-2 space-y-1 text-xs">
              <Champ libelle="Référence">{opp.dossierLld.reference}</Champ>
              <Champ libelle="Durée demandée">
                {opp.dossierLld.dureeDemandeeMois} mois
              </Champ>
              <Champ libelle="Collaboratrice">
                {opp.dossierLld.collaboratrice
                  ? `${opp.dossierLld.collaboratrice.prenom} ${opp.dossierLld.collaboratrice.nom}`
                  : "Non attribuée"}
              </Champ>
              <Champ libelle="Prochain jalon">
                {opp.dossierLld.prochaineActionLabel
                  ? `${opp.dossierLld.prochaineActionLabel} · ${dateLongue(opp.dossierLld.prochaineActionLe)}`
                  : "—"}
              </Champ>
              <Champ libelle="Checklist interne">
                {opp.dossierLld.checklist.filter((c) => c.fait).length} /{" "}
                {opp.dossierLld.checklist.length}
              </Champ>
            </dl>
            <Link
              href={`/lld/${opp.dossierLld.id}`}
              className="mt-2 inline-block text-xs font-medium underline"
            >
              Ouvrir le dossier ({BADGE_LLD_COURT[opp.dossierLld.statut]})
            </Link>
            <p className="mt-2 text-[10px] italic text-slate-500">
              Les documents de financement ne sont pas exposés ici.
            </p>
          </div>
        )}

        {alerte.aConfirmer && (
          <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            ⚠ {alerte.message}
          </p>
        )}

        <ActionsOpportunite
          opportunite={{
            id: opp.id,
            etape: opp.etape,
            aDossierLld: Boolean(opp.dossierLld),
            loyerEnvisage: opp.loyerMensuelEnvisage
              ? Number(opp.loyerMensuelEnvisage)
              : null,
            montantVente: opp.montantVente ? Number(opp.montantVente) : null,
            nomOrganisation: opp.organisation.nom,
          }}
          collaboratrices={collaboratrices}
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
