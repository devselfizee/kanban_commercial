"use client";

/**
 * Tableau kanban générique, partagé par les trois pipelines.
 *
 * Le glisser-déposer utilise l'API HTML5 native : aucune dépendance externe, et
 * le clavier reste utilisable via le menu de déplacement de chaque carte.
 */

import { useState, useTransition } from "react";
import Carte, { type DonneesCarte } from "./Carte";
import type { Colonne } from "@/lib/domaine/pipelines";

export type ColonneAffichee<T extends string> = {
  colonne: Colonne<T>;
  cartes: DonneesCarte[];
};

export default function Tableau<T extends string>({
  colonnes,
  onDeplacer,
  onOuvrir,
}: {
  colonnes: ColonneAffichee<T>[];
  /** Renvoie un message d'erreur si le déplacement est refusé. */
  onDeplacer: (carteId: string, cible: T, rang: number) => Promise<string | null>;
  onOuvrir: (carteId: string) => void;
}) {
  const [glissee, setGlissee] = useState<string | null>(null);
  const [survolee, setSurvolee] = useState<T | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  function deposer(cible: T, rang: number) {
    const id = glissee;
    setGlissee(null);
    setSurvolee(null);
    if (!id) return;

    demarrer(async () => {
      const message = await onDeplacer(id, cible, rang);
      setErreur(message);
    });
  }

  return (
    <div className="flex h-full flex-col">
      {erreur && (
        <div
          role="alert"
          className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
        >
          <span>{erreur}</span>
          <button
            onClick={() => setErreur(null)}
            className="shrink-0 rounded px-1.5 text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      )}

      <div
        className={`flex flex-1 gap-3 overflow-x-auto pb-4 ${enCours ? "opacity-70" : ""}`}
      >
        {colonnes.map(({ colonne, cartes }) => (
          <section
            key={colonne.cle}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setSurvolee(colonne.cle);
            }}
            onDragLeave={() => setSurvolee((s) => (s === colonne.cle ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              deposer(colonne.cle, cartes.length);
            }}
            className={[
              "flex w-72 shrink-0 flex-col rounded-xl border p-2 transition",
              survolee === colonne.cle
                ? "border-sky-400 bg-sky-50/60 dark:border-sky-700 dark:bg-sky-950/30"
                : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40",
            ].join(" ")}
          >
            <header className="mb-2 px-1">
              <div className="flex items-baseline justify-between gap-2">
                <h2
                  className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300"
                  title={colonne.definition}
                >
                  {colonne.libelle}
                </h2>
                <span className="rounded-full bg-slate-200 px-1.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {cartes.length}
                </span>
              </div>
              <p
                className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-slate-500 dark:text-slate-500"
                title={`Sortie attendue : ${colonne.sortieAttendue}`}
              >
                {colonne.definition}
              </p>
            </header>

            <div className="flex-1 space-y-2 overflow-y-auto">
              {cartes.map((carte) => (
                <Carte
                  key={carte.id}
                  carte={carte}
                  onOuvrir={onOuvrir}
                  onGlisser={setGlissee}
                />
              ))}
              {cartes.length === 0 && (
                <p className="px-1 py-6 text-center text-[11px] text-slate-400">
                  Aucune carte
                </p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
