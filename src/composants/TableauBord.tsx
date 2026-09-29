/**
 * Les pièces des tableaux de bord : tuile à pastille d'icône, bloc titré.
 *
 * Partagées par l'accueil et le pilotage, pour que les deux pages gardent le
 * même dessin — celui de la maquette.
 */

import type { ReactNode } from "react";

/**
 * Couleurs des pastilles d'icône. Décoratives — le libellé porte le sens —
 * elles distinguent les tuiles d'un coup d'œil, comme sur la maquette.
 */
export const TEINTE_ICONE = {
  bleu: "#2a78d6",
  vert: "#1baf7a",
  rose: "#f93e8e",
  orange: "#eda100",
  violet: "#4a3aa7",
  turquoise: "#0e9aa7",
} as const;

export function Tuile({
  libelle,
  valeur,
  aide,
  ton = "normal",
  icone,
  teinte,
}: {
  libelle: string;
  valeur: string;
  aide?: string;
  ton?: "normal" | "alerte";
  icone?: ReactNode;
  teinte?: keyof typeof TEINTE_ICONE;
}) {
  return (
    <div
      className={[
        "flex min-w-0 gap-3 rounded-xl border bg-white p-4 shadow-sm",
        ton === "alerte" ? "border-[var(--alerte-bord)]" : "border-[var(--trait)]",
      ].join(" ")}
    >
      {icone && (
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: TEINTE_ICONE[teinte ?? "bleu"] }}
        >
          {icone}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texte-doux)]">
          {libelle}
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--texte-fort)]">
          {valeur}
        </p>
        {aide && (
          <p className="mt-1 text-[11px] text-[var(--texte-tres-doux)]">{aide}</p>
        )}
      </div>
    </div>
  );
}

export function Bloc({
  titre,
  icone,
  children,
}: {
  titre: string;
  icone?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-[var(--trait)] bg-white p-4 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--texte-fort)]">
        {icone && (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--selfizee-50)] text-[var(--selfizee-600)]">
            {icone}
          </span>
        )}
        {titre}
      </h2>
      {children}
    </section>
  );
}
