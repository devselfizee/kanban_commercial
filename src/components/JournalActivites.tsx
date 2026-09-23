/**
 * Journal d'activités (§9).
 *
 * La fiche affiche, dans cet ordre : la prochaine activité, les tâches échues,
 * les activités récentes, puis l'historique complet. Chaque activité terminée
 * produit soit une prochaine action, soit une conclusion explicite.
 */

import type { SensActivite, TypeActivite } from "@prisma/client";
import { LIBELLE_SENS, LIBELLE_TYPE_ACTIVITE } from "@/lib/domaine/libelles";
import { dateHeure, depuis } from "@/lib/format";

export type ActiviteAffichee = {
  id: string;
  type: TypeActivite;
  sens: SensActivite;
  objet: string;
  contenu: string | null;
  dateReelle: Date;
  resultat: string | null;
  suiteAttendue: string | null;
  sansSuite: boolean;
  auteur: { prenom: string; nom: string } | null;
};

export type TacheAffichee = {
  id: string;
  libelle: string;
  detail: string | null;
  echeance: Date | null;
  faite: boolean;
  responsable: { prenom: string; nom: string } | null;
};

export default function JournalActivites({
  activites,
  taches,
}: {
  activites: ActiviteAffichee[];
  taches: TacheAffichee[];
}) {
  const maintenant = new Date();
  const ouvertes = taches.filter((t) => !t.faite);
  const echues = ouvertes.filter(
    (t) => t.echeance && t.echeance.getTime() < maintenant.getTime(),
  );
  const aVenir = ouvertes.filter(
    (t) => !t.echeance || t.echeance.getTime() >= maintenant.getTime(),
  );

  return (
    <div className="space-y-4">
      {/* 1. Prochaine activité */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Prochaine activité
        </h3>
        {aVenir.length > 0 ? (
          <ul className="space-y-1">
            {aVenir.map((t) => (
              <li
                key={t.id}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{t.libelle}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {t.echeance ? depuis(t.echeance, maintenant) : "sans échéance"}
                  </span>
                </div>
                {t.detail && (
                  <p className="mt-0.5 text-xs text-slate-500">{t.detail}</p>
                )}
                {t.responsable && (
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {t.responsable.prenom} {t.responsable.nom}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            Aucune action planifiée. Une carte ne doit jamais rester sans suite.
          </p>
        )}
      </section>

      {/* 2. Tâches échues */}
      {echues.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
            Tâches échues ({echues.length})
          </h3>
          <ul className="space-y-1">
            {echues.map((t) => (
              <li
                key={t.id}
                className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm dark:border-red-900 dark:bg-red-950/40"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{t.libelle}</span>
                  <span className="shrink-0 text-xs text-red-600 dark:text-red-400">
                    {depuis(t.echeance, maintenant)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 3 et 4. Activités récentes puis historique complet */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Historique des échanges
        </h3>
        {activites.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune activité journalisée.</p>
        ) : (
          <ol className="space-y-2 border-l border-slate-200 pl-4 dark:border-slate-800">
            {activites.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                <div className="rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">{a.objet}</span>
                    <span className="text-[11px] text-slate-400">
                      {dateHeure(a.dateReelle)}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {LIBELLE_TYPE_ACTIVITE[a.type]}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {LIBELLE_SENS[a.sens]}
                    </span>
                    {a.auteur && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {a.auteur.prenom} {a.auteur.nom}
                      </span>
                    )}
                  </div>

                  {a.contenu && (
                    <p className="mt-1.5 whitespace-pre-line text-xs text-slate-600 dark:text-slate-400">
                      {a.contenu}
                    </p>
                  )}

                  {/* Résultat et suite : une activité terminée conclut ou enchaîne. */}
                  <dl className="mt-1.5 space-y-0.5 text-[11px]">
                    {a.resultat && (
                      <div className="flex gap-1.5">
                        <dt className="text-slate-400">Résultat :</dt>
                        <dd className="text-slate-600 dark:text-slate-400">
                          {a.resultat}
                        </dd>
                      </div>
                    )}
                    {a.suiteAttendue ? (
                      <div className="flex gap-1.5">
                        <dt className="text-slate-400">Suite :</dt>
                        <dd className="font-medium text-slate-700 dark:text-slate-300">
                          {a.suiteAttendue}
                        </dd>
                      </div>
                    ) : a.sansSuite ? (
                      <div className="text-slate-400">Pas de suite</div>
                    ) : null}
                  </dl>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
