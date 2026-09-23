/**
 * État de la synchronisation avec le CRM.
 *
 * Réservée au manager : c'est un écran de diagnostic, pas un outil quotidien.
 * Il répond à une seule question — « pourquoi cette fiche n'est-elle pas
 * remontée ? » — en montrant les derniers événements et leur issue.
 */

import { prisma } from "@/lib/prisma";
import { utilisateurCourant, peutParametrer } from "@/lib/session";
import { configDepuisEnv, profondeurQueue } from "@/lib/crm/rabbitmq";
import { dateHeure } from "@/lib/format";
import type { ResultatSynchro } from "@prisma/client";

export const dynamic = "force-dynamic";

const LIBELLE_RESULTAT: Record<ResultatSynchro, string> = {
  CREE: "Créé",
  MIS_A_JOUR: "Mis à jour",
  IGNORE_PERIME: "Ignoré (périmé)",
  IGNORE_SUPPRIME: "Détaché (supprimé au CRM)",
  ERREUR: "Erreur",
};

const TON_RESULTAT: Record<ResultatSynchro, string> = {
  CREE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  MIS_A_JOUR: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  IGNORE_PERIME: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  IGNORE_SUPPRIME: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  ERREUR: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export default async function PageSynchro() {
  const utilisateur = await utilisateurCourant();

  if (!utilisateur || !peutParametrer(utilisateur.role)) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900">
        Cet écran est réservé au manager.
      </p>
    );
  }

  const config = configDepuisEnv();
  const enAttente = config ? await profondeurQueue(config) : null;

  const [evenements, stats, organisationsLiees, contactsLies] = await Promise.all([
    prisma.evenementCrm.findMany({
      orderBy: { recuLe: "desc" },
      take: 50,
    }),
    prisma.evenementCrm.groupBy({
      by: ["resultat"],
      _count: { _all: true },
    }),
    prisma.organisation.count({ where: { idCrm: { not: null } } }),
    prisma.contact.count({ where: { idCrm: { not: null } } }),
  ]);

  const parResultat = Object.fromEntries(
    stats.map((s) => [s.resultat, s._count._all]),
  ) as Partial<Record<ResultatSynchro, number>>;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-bold tracking-tight">Synchronisation CRM</h1>
        <p className="text-xs text-slate-500">
          Sens unique : le CRM fait autorité sur l&apos;identité du client. Le
          kanban ne réécrit jamais vers lui.
        </p>
      </header>

      {!config && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-semibold">Bus non configuré.</p>
          <p className="mt-1 text-xs">
            Renseignez <code>RABBITMQ_MGMT_URL</code>, <code>RABBITMQ_USER</code> et{" "}
            <code>RABBITMQ_PASSWORD</code> dans les variables d&apos;environnement.
            Tant que ces variables sont absentes, la synchronisation est inactive
            et le kanban fonctionne de façon autonome.
          </p>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tuile
          libelle="Messages en attente"
          valeur={enAttente != null ? String(enAttente) : "—"}
          aide={config ? `Queue ${config.queue}` : "Bus non joignable"}
          ton={enAttente && enAttente > 100 ? "alerte" : "normal"}
        />
        <Tuile
          libelle="Organisations liées au CRM"
          valeur={String(organisationsLiees)}
        />
        <Tuile libelle="Contacts liés au CRM" valeur={String(contactsLies)} />
        <Tuile
          libelle="Erreurs de traitement"
          valeur={String(parResultat.ERREUR ?? 0)}
          ton={(parResultat.ERREUR ?? 0) > 0 ? "alerte" : "normal"}
          aide="Événements non appliqués"
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-semibold">50 derniers événements reçus</h2>
        {evenements.length === 0 ? (
          <p className="py-3 text-sm text-slate-500">
            Aucun événement reçu pour l&apos;instant.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] uppercase text-slate-400 dark:border-slate-800">
                <th className="pb-1 font-medium">Reçu</th>
                <th className="pb-1 font-medium">Événement</th>
                <th className="pb-1 font-medium">ID CRM</th>
                <th className="pb-1 font-medium">Issue</th>
                <th className="pb-1 font-medium">Détail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {evenements.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap py-1.5 text-xs text-slate-500">
                    {dateHeure(e.recuLe)}
                  </td>
                  <td className="py-1.5 font-mono text-[11px]">{e.routingKey}</td>
                  <td className="py-1.5 tabular-nums text-xs">{e.idCrm}</td>
                  <td className="py-1.5">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${TON_RESULTAT[e.resultat]}`}
                    >
                      {LIBELLE_RESULTAT[e.resultat]}
                    </span>
                  </td>
                  <td className="py-1.5 text-xs text-slate-600 dark:text-slate-400">
                    {e.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 text-xs dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-semibold">Ce qui est synchronisé</h2>
        <table className="w-full">
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            <Ligne
              objet="Organisations"
              source="clients"
              etat="Actif — le CRM publie déjà ces événements"
              ok
            />
            <Ligne
              objet="Contacts"
              source="client_contacts"
              etat="Nécessite l'ajout du behavior EventPublisher côté CRM"
            />
            <Ligne
              objet="Devis"
              source="devis"
              etat="Nécessite l'ajout du behavior EventPublisher côté CRM"
            />
            <Ligne
              objet="Leads, opportunités, dossiers LLD"
              source="—"
              etat="Propres au kanban : jamais synchronisés"
              ok
            />
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Ligne({
  objet,
  source,
  etat,
  ok,
}: {
  objet: string;
  source: string;
  etat: string;
  ok?: boolean;
}) {
  return (
    <tr>
      <td className="py-1.5 font-medium">{objet}</td>
      <td className="py-1.5 font-mono text-[11px] text-slate-500">{source}</td>
      <td className={`py-1.5 ${ok ? "text-slate-600 dark:text-slate-400" : "text-amber-700 dark:text-amber-400"}`}>
        {etat}
      </td>
    </tr>
  );
}

function Tuile({
  libelle,
  valeur,
  aide,
  ton = "normal",
}: {
  libelle: string;
  valeur: string;
  aide?: string;
  ton?: "normal" | "alerte";
}) {
  return (
    <div
      className={[
        "rounded-xl border bg-white p-3 dark:bg-slate-900",
        ton === "alerte"
          ? "border-amber-300 dark:border-amber-900"
          : "border-slate-200 dark:border-slate-800",
      ].join(" ")}
    >
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{libelle}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{valeur}</p>
      {aide && <p className="mt-0.5 text-[10px] text-slate-400">{aide}</p>}
    </div>
  );
}
