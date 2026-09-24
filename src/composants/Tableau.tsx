/**
 * Tableau kanban générique, partagé par les trois pipelines.
 *
 * Les colonnes sont numérotées : l'ordre est une information en soi, puisqu'il
 * dit dans quel sens une carte progresse. Les étapes terminales prennent une
 * teinte neutre pour se distinguer du flux actif.
 *
 * Le glisser-déposer utilise l'API HTML5 native : aucune dépendance externe.
 */

import { useState } from "react";
import Carte, { type DonneesCarte } from "./Carte";
import type { Colonne } from "@/lib/pipelines";

export type ColonneAffichee<T extends string> = {
  colonne: Colonne<T>;
  cartes: DonneesCarte[];
};

/** Teintes d'en-tête : rose pour le flux actif, neutre pour les fins de parcours. */
function tonEntete(colonne: Colonne<string>) {
  if (colonne.terminale) {
    return {
      entete: "bg-[var(--neutre-texte)] text-white",
      description: "bg-[var(--neutre-fond)] text-[var(--texte-doux)]",
      compteur: "bg-white/25 text-white",
    };
  }
  if (colonne.attenteFormalisee) {
    return {
      entete: "bg-[var(--selfizee-300)] text-white",
      description: "bg-[var(--fond-colonne-entete-desc)] text-[var(--texte-doux)]",
      compteur: "bg-white/30 text-white",
    };
  }
  return {
    entete: "bg-[var(--selfizee-400)] text-white",
    description: "bg-[var(--fond-colonne-entete-desc)] text-[var(--texte-doux)]",
    compteur: "bg-white/30 text-white",
  };
}

export default function Tableau<T extends string>({
  colonnes,
  onDeplacer,
  onOuvrir,
  onAjouter,
}: {
  colonnes: ColonneAffichee<T>[];
  /** Renvoie un message d'erreur si le déplacement est refusé par le serveur. */
  onDeplacer: (carteId: string, cible: T, rang: number) => Promise<string | null>;
  onOuvrir: (carteId: string) => void;
  onAjouter?: (cible: T) => void;
}) {
  const [glissee, setGlissee] = useState<string | null>(null);
  const [survolee, setSurvolee] = useState<T | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function deposer(cible: T, rang: number) {
    const id = glissee;
    setGlissee(null);
    setSurvolee(null);
    if (!id) return;

    setEnCours(true);
    const message = await onDeplacer(id, cible, rang);
    setErreur(message);
    setEnCours(false);
  }

  return (
    <div className="flex h-full flex-col">
      {erreur && (
        <div
          role="alert"
          className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-[var(--alerte-bord)] bg-[var(--alerte-fond)] px-3.5 py-2.5 text-sm text-[var(--alerte-texte)]"
        >
          <span>{erreur}</span>
          <button
            onClick={() => setErreur(null)}
            className="shrink-0 rounded px-1.5 font-bold hover:bg-black/5"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      )}

      <div
        className={`flex flex-1 gap-3.5 overflow-x-auto pb-4 ${enCours ? "opacity-70" : ""}`}
      >
        {colonnes.map(({ colonne, cartes }, index) => {
          const ton = tonEntete(colonne);
          const survol = survolee === colonne.cle;

          return (
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
                void deposer(colonne.cle, cartes.length);
              }}
              className={[
                "flex w-[19rem] shrink-0 flex-col overflow-hidden rounded-2xl border bg-[var(--fond-colonne)] transition",
                survol
                  ? "border-[var(--selfizee-400)] ring-2 ring-[var(--selfizee-200)]"
                  : "border-[var(--trait)]",
              ].join(" ")}
            >
              {/* En-tête coloré et numéroté */}
              <header className={`flex items-center gap-2 px-3.5 py-2.5 ${ton.entete}`}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4 shrink-0 opacity-90"
                  aria-hidden="true"
                >
                  <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
                  <path d="M14 3v5h4" />
                </svg>
                <h2
                  className="flex-1 truncate text-[11px] font-bold uppercase tracking-wide"
                  title={colonne.definition}
                >
                  {index + 1}. {colonne.libelle}
                </h2>
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${ton.compteur}`}
                >
                  {cartes.length}
                </span>
              </header>

              {/* Définition opérationnelle */}
              <p
                className={`px-3.5 py-2 text-[11px] leading-snug ${ton.description}`}
                title={`Sortie attendue : ${colonne.sortieAttendue}`}
              >
                {colonne.definition}
              </p>

              {/* Cartes */}
              <div className="flex-1 space-y-2.5 overflow-y-auto p-2.5">
                {onAjouter && !colonne.terminale && (
                  <button
                    onClick={() => onAjouter(colonne.cle)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--trait-fort)] bg-white/60 px-3 py-2.5 text-xs font-medium text-[var(--texte-doux)] transition hover:border-[var(--selfizee-300)] hover:bg-[var(--selfizee-50)] hover:text-[var(--selfizee-600)]"
                  >
                    <span className="text-base leading-none">+</span> Ajouter une carte
                  </button>
                )}

                {cartes.map((carte) => (
                  <Carte
                    key={carte.id}
                    carte={carte}
                    onOuvrir={onOuvrir}
                    onGlisser={setGlissee}
                  />
                ))}

                {cartes.length === 0 && !onAjouter && (
                  <p className="px-1 py-8 text-center text-[11px] text-[var(--texte-tres-doux)]">
                    Aucune carte
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
