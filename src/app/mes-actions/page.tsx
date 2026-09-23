/**
 * « Mes actions » — la vue qui empêche une carte d'être perdue (§3, §9, §10).
 *
 * Elle réunit les tâches échues, les actions du jour, et surtout les cartes sans
 * suivi planifié : ces dernières sont signalées, jamais laissées sans alerte.
 */

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { utilisateurCourant, voitToutesLesCartes } from "@/lib/session";
import {
  estTerminaleLead,
  estTerminaleLld,
  estTerminaleOpportunite,
  priseEnChargeEnRetard,
  sansSuiviPlanifie,
} from "@/lib/domaine/regles";
import { depuis } from "@/lib/format";
import {
  LIBELLE_ETAPE,
  LIBELLE_STATUT_LEAD,
  LIBELLE_STATUT_LLD,
} from "@/lib/domaine/libelles";

export const dynamic = "force-dynamic";

export default async function PageActions() {
  const utilisateur = await utilisateurCourant();
  const maintenant = new Date();

  if (!utilisateur) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900">
        Choisissez un utilisateur dans la barre de navigation pour voir ses actions.
      </p>
    );
  }

  const tout = voitToutesLesCartes(utilisateur.role);

  const taches = await prisma.tache.findMany({
    where: {
      faite: false,
      ...(tout ? {} : { responsableId: utilisateur.id }),
    },
    orderBy: { echeance: "asc" },
    include: {
      responsable: { select: { prenom: true, nom: true } },
      lead: { select: { id: true, reference: true } },
      opportunite: { select: { id: true, reference: true } },
      dossierLld: { select: { id: true, reference: true } },
    },
  });

  const [leads, opportunites, dossiers] = await Promise.all([
    prisma.lead.findMany({
      where: tout ? {} : { proprietaireId: utilisateur.id },
      include: { organisation: { select: { nom: true } } },
    }),
    prisma.opportunite.findMany({
      where: tout ? {} : { commercialId: utilisateur.id },
      include: { organisation: { select: { nom: true } } },
    }),
    prisma.dossierLld.findMany({
      where: tout
        ? {}
        : utilisateur.role === "COLLABORATRICE_LLD"
          ? { collaboratriceId: utilisateur.id }
          : { commercialId: utilisateur.id },
      include: { opportunite: { select: { organisation: { select: { nom: true } } } } },
    }),
  ]);

  const echues = taches.filter(
    (t) => t.echeance && t.echeance.getTime() < maintenant.getTime(),
  );
  const aVenir = taches.filter(
    (t) => !t.echeance || t.echeance.getTime() >= maintenant.getTime(),
  );

  // Cartes sans suivi planifié, tous pipelines confondus.
  const sansSuivi = [
    ...leads
      .filter((l) =>
        sansSuiviPlanifie({
          prochaineActionLe: l.prochaineActionLe,
          dateReactivation: l.dateReactivation,
          terminale: estTerminaleLead(l.statut),
        }),
      )
      .map((l) => ({
        href: `/leads/${l.id}`,
        reference: l.reference,
        nom: l.organisation?.nom ?? l.nomBrut ?? "Sans nom",
        etape: LIBELLE_STATUT_LEAD[l.statut],
        espace: "Leads",
      })),
    ...opportunites
      .filter((o) =>
        sansSuiviPlanifie({
          prochaineActionLe: o.prochaineActionLe,
          terminale: estTerminaleOpportunite(o.etape),
        }),
      )
      .map((o) => ({
        href: `/ventes/${o.id}`,
        reference: o.reference,
        nom: o.organisation.nom,
        etape: LIBELLE_ETAPE[o.etape],
        espace: "Ventes",
      })),
    ...dossiers
      .filter((d) =>
        sansSuiviPlanifie({
          prochaineActionLe: d.prochaineActionLe,
          prochaineRelanceLe: d.prochaineRelanceLe,
          terminale: estTerminaleLld(d.statut),
        }),
      )
      .map((d) => ({
        href: `/lld/${d.id}`,
        reference: d.reference,
        nom: d.opportunite.organisation.nom,
        etape: LIBELLE_STATUT_LLD[d.statut],
        espace: "LLD",
      })),
  ];

  // Entrants dont le délai de première prise en charge est dépassé.
  const priseEnChargeTardive = leads.filter((l) =>
    priseEnChargeEnRetard(l.modeAcquisition, l.creeLe, l.premierContactLe, maintenant),
  );

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-bold tracking-tight">Mes actions</h1>
        <p className="text-xs text-slate-500">
          {tout
            ? "Vue complète : toutes les cartes de l'équipe."
            : `Périmètre de ${utilisateur.prenom} ${utilisateur.nom}.`}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Cartes sans suivi planifié */}
        <Bloc
          titre="Sans suivi planifié"
          compte={sansSuivi.length}
          ton={sansSuivi.length > 0 ? "rouge" : "neutre"}
          aide="Ni prochaine action, ni attente datée, hors étapes terminales."
        >
          {sansSuivi.length === 0 ? (
            <Vide>Toutes les cartes ont une suite prévue.</Vide>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {sansSuivi.map((c) => (
                <li key={c.reference}>
                  <Link
                    href={c.href}
                    className="flex items-baseline justify-between gap-2 px-1 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span>
                      <span className="font-medium">{c.nom}</span>
                      <span className="ml-2 text-xs text-slate-500">{c.etape}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-slate-400">
                      {c.reference}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Bloc>

        {/* Prise en charge en retard */}
        <Bloc
          titre="Prise en charge en retard"
          compte={priseEnChargeTardive.length}
          ton={priseEnChargeTardive.length > 0 ? "ambre" : "neutre"}
          aide="Aucun premier contact journalisé dans le délai interne."
        >
          {priseEnChargeTardive.length === 0 ? (
            <Vide>Les délais de première réponse sont tenus.</Vide>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {priseEnChargeTardive.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/leads/${l.id}`}
                    className="flex items-baseline justify-between gap-2 px-1 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span>
                      <span className="font-medium">
                        {l.organisation?.nom ?? l.nomBrut}
                      </span>
                      <span className="ml-2 text-xs text-slate-500">
                        créé {depuis(l.creeLe, maintenant)}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-slate-400">
                      {l.reference}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Bloc>

        {/* Tâches échues */}
        <Bloc
          titre="Tâches échues"
          compte={echues.length}
          ton={echues.length > 0 ? "rouge" : "neutre"}
        >
          {echues.length === 0 ? (
            <Vide>Aucune tâche en retard.</Vide>
          ) : (
            <ListeTaches taches={echues} maintenant={maintenant} />
          )}
        </Bloc>

        {/* À venir */}
        <Bloc titre="À venir" compte={aVenir.length}>
          {aVenir.length === 0 ? (
            <Vide>Aucune tâche planifiée.</Vide>
          ) : (
            <ListeTaches taches={aVenir.slice(0, 15)} maintenant={maintenant} />
          )}
        </Bloc>
      </div>
    </div>
  );
}

type TacheListee = {
  id: string;
  libelle: string;
  echeance: Date | null;
  lead: { id: string; reference: string } | null;
  opportunite: { id: string; reference: string } | null;
  dossierLld: { id: string; reference: string } | null;
  responsable: { prenom: string; nom: string } | null;
};

function ListeTaches({
  taches,
  maintenant,
}: {
  taches: TacheListee[];
  maintenant: Date;
}) {
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {taches.map((t) => {
        const cible = t.lead
          ? { href: `/leads/${t.lead.id}`, ref: t.lead.reference }
          : t.opportunite
            ? { href: `/ventes/${t.opportunite.id}`, ref: t.opportunite.reference }
            : t.dossierLld
              ? { href: `/lld/${t.dossierLld.id}`, ref: t.dossierLld.reference }
              : null;

        const contenu = (
          <div className="flex items-baseline justify-between gap-2 px-1 py-2 text-sm">
            <span className="truncate">
              {t.libelle}
              {t.responsable && (
                <span className="ml-2 text-[11px] text-slate-400">
                  {t.responsable.prenom} {t.responsable.nom}
                </span>
              )}
            </span>
            <span className="shrink-0 text-xs text-slate-500">
              {t.echeance ? depuis(t.echeance, maintenant) : "—"}
              {cible && (
                <span className="ml-2 font-mono text-[10px] text-slate-400">
                  {cible.ref}
                </span>
              )}
            </span>
          </div>
        );

        return (
          <li key={t.id}>
            {cible ? (
              <Link href={cible.href} className="block hover:bg-slate-50 dark:hover:bg-slate-800">
                {contenu}
              </Link>
            ) : (
              contenu
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Bloc({
  titre,
  compte,
  children,
  ton = "neutre",
  aide,
}: {
  titre: string;
  compte: number;
  children: React.ReactNode;
  ton?: "neutre" | "rouge" | "ambre";
  aide?: string;
}) {
  const tons = {
    neutre: "border-slate-200 dark:border-slate-800",
    rouge: "border-red-300 dark:border-red-900",
    ambre: "border-amber-300 dark:border-amber-900",
  };
  return (
    <section
      className={`rounded-xl border bg-white p-4 dark:bg-slate-900 ${tons[ton]}`}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{titre}</h2>
        <span className="rounded-full bg-slate-100 px-2 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          {compte}
        </span>
      </div>
      {aide && <p className="mb-2 text-[11px] text-slate-500">{aide}</p>}
      {children}
    </section>
  );
}

function Vide({ children }: { children: React.ReactNode }) {
  return <p className="py-3 text-sm text-slate-500">{children}</p>;
}
