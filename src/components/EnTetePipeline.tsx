import Link from "next/link";

/**
 * En-tête commun aux trois pipelines : finalité de l'espace de travail, volume
 * et compteur de cartes sans suivi planifié — ces dernières ne doivent jamais
 * rester sans alerte (§3).
 */
export default function EnTetePipeline({
  titre,
  sousTitre,
  total,
  sansSuivi,
  actionNouveau,
  alerte,
}: {
  titre: string;
  sousTitre: string;
  total: number;
  sansSuivi: number;
  actionNouveau?: { href: string; libelle: string };
  alerte?: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-lg font-bold tracking-tight">{titre}</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">{sousTitre}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {total} carte{total > 1 ? "s" : ""}
        </span>

        {sansSuivi > 0 && (
          <Link
            href="/mes-actions"
            className="rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
            title="Cartes sans prochaine action ni attente datée"
          >
            ⚠ {sansSuivi} sans suivi planifié
          </Link>
        )}

        {alerte && (
          <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-300">
            {alerte}
          </span>
        )}

        {actionNouveau && (
          <Link
            href={actionNouveau.href}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            + {actionNouveau.libelle}
          </Link>
        )}
      </div>
    </div>
  );
}
