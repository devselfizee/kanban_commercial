/**
 * Journal d'activités (§9).
 *
 * Dans cet ordre : la prochaine activité, les tâches échues, puis l'historique
 * des échanges. Cet ordre n'est pas décoratif — il répond à « qu'est-ce que je
 * fais maintenant ? » avant « que s'est-il passé ? ».
 *
 * L'absence d'action planifiée est signalée en rouge : c'est la règle « une
 * carte ne doit jamais être perdue », rendue visible là où on peut y remédier.
 */

import { LIBELLE_SENS, LIBELLE_TYPE_ACTIVITE } from "@/lib/libelles";
import { dateHeure, depuis } from "@/lib/format";
import type { SensActivite, TypeActivite } from "@/lib/types";

export type ActiviteAffichee = {
  id: string;
  type: TypeActivite;
  sens: SensActivite;
  objet: string;
  contenu: string | null;
  dateReelle: string;
  resultat: string | null;
  suiteAttendue: string | null;
  sansSuite: boolean;
  auteur: { prenom: string; nom: string } | null;
};

export type TacheAffichee = {
  id: string;
  libelle: string;
  detail: string | null;
  echeance: string | null;
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

  // Les dates arrivent en chaînes ISO : il faut les convertir pour comparer.
  const estEchue = (t: TacheAffichee) =>
    t.echeance !== null && new Date(t.echeance).getTime() < maintenant.getTime();

  const echues = ouvertes.filter(estEchue);
  const aVenir = ouvertes.filter((t) => !estEchue(t));

  return (
    <div className="space-y-4">
      {/* 1. Prochaine activité */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--texte-doux)]">
          Prochaine activité
        </h3>
        {aVenir.length > 0 ? (
          <ul className="space-y-1">
            {aVenir.map((t) => (
              <li
                key={t.id}
                className="rounded-md border border-[var(--trait)] bg-white px-3 py-2 text-sm"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-[var(--texte-fort)]">
                    {t.libelle}
                  </span>
                  <span className="shrink-0 text-xs text-[var(--texte-doux)]">
                    {t.echeance ? depuis(t.echeance) : "sans échéance"}
                  </span>
                </div>
                {t.detail && (
                  <p className="mt-0.5 text-xs text-[var(--texte-doux)]">
                    {t.detail}
                  </p>
                )}
                {t.responsable && (
                  <p className="mt-0.5 text-[11px] text-[var(--texte-tres-doux)]">
                    {t.responsable.prenom} {t.responsable.nom}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-[var(--danger)] bg-[var(--danger-fond)] px-3 py-2 text-sm text-[var(--danger)]">
            Aucune action planifiée. Une carte ne doit jamais rester sans suite.
          </p>
        )}
      </section>

      {/* 2. Tâches échues */}
      {echues.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--danger)]">
            Tâches échues ({echues.length})
          </h3>
          <ul className="space-y-1">
            {echues.map((t) => (
              <li
                key={t.id}
                className="rounded-md border border-[var(--danger)] bg-[var(--danger-fond)] px-3 py-2 text-sm"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-[var(--texte-fort)]">
                    {t.libelle}
                  </span>
                  <span className="shrink-0 text-xs text-[var(--danger)]">
                    {depuis(t.echeance)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 3. Historique des échanges */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--texte-doux)]">
          Historique des échanges
        </h3>
        {activites.length === 0 ? (
          <p className="text-sm text-[var(--texte-doux)]">
            Aucune activité journalisée.
          </p>
        ) : (
          <ol className="space-y-2 border-l border-[var(--trait)] pl-4">
            {activites.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-[var(--trait-fort)]" />
                <div className="rounded-md border border-[var(--trait)] bg-white px-3 py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-[var(--texte-fort)]">
                      {a.objet}
                    </span>
                    <span className="text-[11px] text-[var(--texte-tres-doux)]">
                      {dateHeure(a.dateReelle)}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap gap-1">
                    <Etiquette>{LIBELLE_TYPE_ACTIVITE[a.type]}</Etiquette>
                    <Etiquette>{LIBELLE_SENS[a.sens]}</Etiquette>
                    {a.auteur && (
                      <Etiquette>
                        {a.auteur.prenom} {a.auteur.nom}
                      </Etiquette>
                    )}
                  </div>

                  {a.contenu && (
                    <p className="mt-1.5 whitespace-pre-line text-xs text-[var(--texte)]">
                      {a.contenu}
                    </p>
                  )}

                  {/* Une activité terminée conclut ou enchaîne : jamais ni l'un
                      ni l'autre sans que ce soit dit explicitement. */}
                  <dl className="mt-1.5 space-y-0.5 text-[11px]">
                    {a.resultat && (
                      <div className="flex gap-1.5">
                        <dt className="text-[var(--texte-tres-doux)]">
                          Résultat :
                        </dt>
                        <dd className="text-[var(--texte)]">{a.resultat}</dd>
                      </div>
                    )}
                    {a.suiteAttendue ? (
                      <div className="flex gap-1.5">
                        <dt className="text-[var(--texte-tres-doux)]">Suite :</dt>
                        <dd className="font-medium text-[var(--texte-fort)]">
                          {a.suiteAttendue}
                        </dd>
                      </div>
                    ) : a.sansSuite ? (
                      <div className="text-[var(--texte-tres-doux)]">
                        Pas de suite
                      </div>
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

function Etiquette({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-[var(--neutre-fond)] px-1.5 py-0.5 text-[10px] text-[var(--neutre-texte)]">
      {children}
    </span>
  );
}
