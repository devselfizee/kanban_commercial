/**
 * Liste de choix avec recherche.
 *
 * L'équipe compte plusieurs dizaines de personnes : une liste déroulante
 * classique oblige à la parcourir. Ici, on tape quelques lettres — prénom ou
 * nom, sans se soucier des accents ni des majuscules — et la liste se réduit.
 *
 * Clavier : ↑ ↓ pour se déplacer, Entrée pour choisir, Échap pour fermer.
 */

import { useEffect, useId, useRef, useState } from "react";

export type OptionRecherche = { valeur: string; libelle: string };

/** « Maïwen » et « maiwen » doivent se trouver l'un l'autre. */
function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export default function SelecteurRecherche({
  options,
  valeur,
  onChanger,
  libelleVide,
  etiquette,
}: {
  options: OptionRecherche[];
  valeur: string;
  onChanger: (valeur: string) => void;
  /** Libellé de la valeur vide, affiché quand rien n'est choisi. */
  libelleVide: string;
  etiquette: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [survol, setSurvol] = useState(0);
  const conteneur = useRef<HTMLDivElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  const idListe = useId();

  const choisie = options.find((o) => o.valeur === valeur);
  const terme = normaliser(recherche);
  const toutes: OptionRecherche[] = [{ valeur: "", libelle: libelleVide }, ...options];
  const visibles = terme
    ? options.filter((o) => normaliser(o.libelle).includes(terme))
    : toutes;

  // Fermer au clic à l'extérieur.
  useEffect(() => {
    if (!ouvert) return;
    function surClic(e: MouseEvent) {
      if (!conteneur.current?.contains(e.target as Node)) fermer();
    }
    document.addEventListener("mousedown", surClic);
    return () => document.removeEventListener("mousedown", surClic);
  }, [ouvert]);

  function ouvrir() {
    setOuvert(true);
    setRecherche("");
    setSurvol(0);
    requestAnimationFrame(() => champ.current?.focus());
  }

  function fermer() {
    setOuvert(false);
    setRecherche("");
  }

  function choisir(o: OptionRecherche) {
    onChanger(o.valeur);
    fermer();
  }

  function surTouche(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSurvol((i) => Math.min(i + 1, visibles.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSurvol((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (visibles[survol]) choisir(visibles[survol]);
    } else if (e.key === "Escape") {
      fermer();
    }
  }

  return (
    <div ref={conteneur} className="relative">
      <button
        type="button"
        aria-label={etiquette}
        aria-haspopup="listbox"
        aria-expanded={ouvert}
        onClick={() => (ouvert ? fermer() : ouvrir())}
        className="flex min-w-44 items-center justify-between gap-2 rounded-lg border border-[var(--trait-fort)] bg-white px-2.5 py-1.5 text-left text-xs text-[var(--texte)] focus:border-[var(--selfizee-400)] focus:outline-none"
      >
        <span className="truncate">{choisie?.libelle ?? libelleVide}</span>
        <span aria-hidden className="text-[var(--texte-doux)]">▾</span>
      </button>

      {ouvert && (
        <div className="absolute left-0 z-30 mt-1 w-64 rounded-lg border border-[var(--trait)] bg-white shadow-lg">
          <input
            ref={champ}
            type="search"
            value={recherche}
            onChange={(e) => {
              setRecherche(e.target.value);
              setSurvol(0);
            }}
            onKeyDown={surTouche}
            placeholder="Rechercher…"
            role="combobox"
            aria-controls={idListe}
            aria-expanded
            aria-activedescendant={
              visibles[survol] ? `${idListe}-${survol}` : undefined
            }
            className="w-full rounded-t-lg border-b border-[var(--trait)] px-2.5 py-2 text-xs text-[var(--texte)] focus:outline-none"
          />
          <ul id={idListe} role="listbox" className="max-h-64 overflow-auto py-1">
            {visibles.length === 0 && (
              <li className="px-2.5 py-1.5 text-xs text-[var(--texte-doux)]">
                Aucun résultat
              </li>
            )}
            {visibles.map((o, i) => (
              <li
                key={o.valeur || "__vide__"}
                id={`${idListe}-${i}`}
                role="option"
                aria-selected={o.valeur === valeur}
                onMouseEnter={() => setSurvol(i)}
                onMouseDown={(e) => {
                  // mousedown plutôt que click : le choix passe avant la
                  // fermeture déclenchée par la perte de focus.
                  e.preventDefault();
                  choisir(o);
                }}
                className={[
                  "cursor-pointer px-2.5 py-1.5 text-xs",
                  i === survol ? "bg-[var(--fond-colonne)]" : "",
                  o.valeur === valeur
                    ? "font-semibold text-[var(--selfizee-600)]"
                    : "text-[var(--texte)]",
                ].join(" ")}
              >
                {o.libelle}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
