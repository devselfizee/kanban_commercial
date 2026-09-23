import Link from "next/link";

/**
 * En-tête commun aux trois pipelines : finalité de l'espace de travail, volume
 * et compteur de cartes sans suivi planifié — ces dernières ne doivent jamais
 * rester sans alerte (§3).
 */
export default function EnTetePipeline({
  titre,
  sousTitre,
  precision,
  total,
  sansSuivi,
  actionNouveau,
  alerte,
}: {
  titre: string;
  sousTitre: string;
  /** Deuxième ligne, pour une mise en garde propre au pipeline. */
  precision?: string;
  total: number;
  sansSuivi: number;
  actionNouveau?: { href: string; libelle: string };
  alerte?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-[var(--texte-fort)]">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--selfizee-100)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--selfizee-500)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
              <path d="M14 3v5h4" />
            </svg>
          </span>
          {titre}
        </h1>
        <p className="mt-1 text-sm text-[var(--texte-doux)]">{sousTitre}</p>
        {precision && (
          <p className="mt-0.5 text-xs text-[var(--texte-tres-doux)]">{precision}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-[var(--selfizee-100)] px-2.5 py-1.5 text-xs font-semibold text-[var(--selfizee-700)]">
          {total} carte{total > 1 ? "s" : ""}
        </span>

        {sansSuivi > 0 && (
          <Link
            href="/mes-actions"
            className="flex items-center gap-1.5 rounded-lg bg-[var(--danger-fond)] px-2.5 py-1.5 text-xs font-semibold text-[var(--danger)] transition hover:brightness-95"
            title="Cartes sans prochaine action ni attente datée"
          >
            ⚠ {sansSuivi} sans suivi planifié
          </Link>
        )}

        {alerte && (
          <span className="rounded-lg bg-[var(--alerte-bord)] px-2.5 py-1.5 text-xs font-semibold text-[#4a3000]">
            {alerte}
          </span>
        )}

        {actionNouveau && (
          <Link
            href={actionNouveau.href}
            className="rounded-lg bg-[var(--selfizee-600)] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[var(--selfizee-700)]"
          >
            + {actionNouveau.libelle}
          </Link>
        )}
      </div>
    </div>
  );
}
