/**
 * Fiche détaillée d'un lead.
 *
 * La carte donne l'essentiel en trois secondes ; la fiche porte tout le reste :
 * coordonnées complètes, interlocuteurs, journal d'activités, historique
 * d'attribution et actions de qualification (§3).
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/session";
import {
  LIBELLE_CANAL,
  LIBELLE_MODE_ACQUISITION,
  LIBELLE_MOTIF_LEAD,
  LIBELLE_PRIORITE,
  LIBELLE_PROJET,
  LIBELLE_SEGMENT,
  LIBELLE_STATUT_LEAD,
} from "@/lib/domaine/libelles";
import { LIBELLE_ACTION } from "@/lib/journal";
import { dateHeure, dateLongue } from "@/lib/format";
import JournalActivites from "@/components/JournalActivites";
import ActionsLead from "./ActionsLead";

export const dynamic = "force-dynamic";

export default async function FicheLead({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const utilisateur = await utilisateurCourant();

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      organisation: true,
      contactPrincipal: true,
      proprietaire: { select: { id: true, prenom: true, nom: true } },
      opportunite: { select: { id: true, reference: true, titre: true } },
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

  if (!lead) notFound();

  const journal = await prisma.journalEntree.findMany({
    where: { typeObjet: "LEAD", objetId: id },
    orderBy: { creeLe: "desc" },
    include: { auteur: { select: { prenom: true, nom: true } } },
  });

  const equipe = await prisma.utilisateur.findMany({
    where: { actif: true, role: { in: ["COMMERCIAL", "MANAGER"] } },
    select: { id: true, prenom: true, nom: true },
    orderBy: { nom: "asc" },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        {/* En-tête */}
        <header className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <Link href="/leads" className="text-xs text-slate-500 hover:underline">
              ← Leads à qualifier
            </Link>
            <span className="font-mono text-xs text-slate-400">{lead.reference}</span>
          </div>

          <h1 className="text-xl font-bold tracking-tight">
            {lead.organisation?.nom ?? lead.nomBrut ?? "Sans nom"}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {LIBELLE_STATUT_LEAD[lead.statut]} ·{" "}
            {LIBELLE_PRIORITE[lead.priorite]}
          </p>

          {lead.opportunite && (
            <p className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              Converti en{" "}
              <Link
                href={`/ventes/${lead.opportunite.id}`}
                className="font-semibold underline"
              >
                {lead.opportunite.reference}
              </Link>{" "}
              — {lead.opportunite.titre}
            </p>
          )}
        </header>

        {/* Qualification */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold">Qualification</h2>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Champ libelle="Mode d'acquisition">
              {LIBELLE_MODE_ACQUISITION[lead.modeAcquisition]}
            </Champ>
            <Champ libelle="Canal détaillé">
              {LIBELLE_CANAL[lead.canalDetaille]}
            </Champ>
            <Champ libelle="Segment client">
              {lead.segment ? LIBELLE_SEGMENT[lead.segment] : "—"}
            </Champ>
            <Champ libelle="Projet recherché">
              {LIBELLE_PROJET[lead.projetRecherche]}
            </Champ>
            <Champ libelle="Ville">{lead.ville ?? "—"}</Champ>
            <Champ libelle="Horizon indicatif">{lead.horizonIndicatif ?? "—"}</Champ>
            <Champ libelle="Besoin résumé" pleineLargeur>
              {lead.besoinResume ?? "—"}
            </Champ>
          </dl>
        </section>

        {/* Coordonnées */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold">Coordonnées</h2>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Champ libelle="Contact principal">
              {lead.contactPrincipal
                ? `${lead.contactPrincipal.prenom ?? ""} ${lead.contactPrincipal.nom}`.trim()
                : "—"}
            </Champ>
            <Champ libelle="Rôle">{lead.contactPrincipal?.role ?? "—"}</Champ>
            <Champ libelle="E-mail">
              {lead.contactPrincipal?.email ?? lead.emailBrut ?? "—"}
            </Champ>
            <Champ libelle="Téléphone">
              {lead.contactPrincipal?.telephone ?? lead.telephoneBrut ?? "—"}
            </Champ>
            {lead.organisation && (
              <>
                <Champ libelle="Organisation">{lead.organisation.nom}</Champ>
                <Champ libelle="SIREN">{lead.organisation.siren ?? "—"}</Champ>
              </>
            )}
          </dl>

          {/* Consentements : la collecte reste proportionnée à la vente (§12). */}
          {lead.contactPrincipal && (
            <p className="mt-3 text-[11px] text-slate-500">
              Consentements —{" "}
              {[
                lead.contactPrincipal.accepteEmail ? "e-mail ✓" : "e-mail ✗",
                lead.contactPrincipal.accepteTelephone ? "téléphone ✓" : "téléphone ✗",
                lead.contactPrincipal.accepteSms ? "SMS ✓" : "SMS ✗",
              ].join(" · ")}
              {lead.contactPrincipal.oppositionNotee &&
                ` · opposition : ${lead.contactPrincipal.oppositionNotee}`}
            </p>
          )}
        </section>

        {/* Journal d'activités */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <JournalActivites activites={lead.activites} taches={lead.taches} />
        </section>

        {/* Historique d'attribution et de décisions */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold">Journal des décisions</h2>
          {journal.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune entrée.</p>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {journal.map((j) => (
                <li key={j.id} className="flex flex-wrap gap-x-2 text-slate-600 dark:text-slate-400">
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
                  {j.motif && <span className="italic">motif : {j.motif}</span>}
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

      {/* Colonne d'actions */}
      <aside className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold">Responsable</h2>
          <p className="text-sm">
            {lead.proprietaire
              ? `${lead.proprietaire.prenom} ${lead.proprietaire.nom}`
              : "Non attribué"}
          </p>
          {lead.dateAttribution && (
            <p className="mt-0.5 text-xs text-slate-500">
              Attribué le {dateLongue(lead.dateAttribution)}
            </p>
          )}
          {lead.motifCloture && (
            <p className="mt-2 rounded-md bg-slate-100 px-2 py-1.5 text-xs dark:bg-slate-800">
              Clôturé : {LIBELLE_MOTIF_LEAD[lead.motifCloture]}
              {lead.commentaireCloture && ` — ${lead.commentaireCloture}`}
            </p>
          )}
        </div>

        <ActionsLead
          lead={{
            id: lead.id,
            statut: lead.statut,
            estProprietaire: lead.proprietaireId === utilisateur?.id,
            aProprietaire: Boolean(lead.proprietaireId),
            dejaConverti: Boolean(lead.opportunite),
            nomOrganisation: lead.organisation?.nom ?? lead.nomBrut ?? "",
            aOrganisation: Boolean(lead.organisationId),
            besoinRenseigne: Boolean(lead.besoinResume?.trim()),
            aInterlocuteur: Boolean(
              lead.contactPrincipalId || lead.emailBrut || lead.telephoneBrut,
            ),
          }}
          equipe={equipe}
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
