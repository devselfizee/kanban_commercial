/**
 * Checklist interne d'un dossier LLD.
 *
 * Elle prépare la transmission sans la déclencher : même complète, elle ne fait
 * pas passer le dossier à « prêt à transmettre ». Cette validation appartient à
 * la collaboratrice, qui seule sait si les pièces manquantes sont requises.
 *
 * Chaque case cochée conserve qui l'a cochée et quand.
 */

import { useState } from "react";
import { api } from "@/api/client";
import { dateCourte } from "@/lib/format";

export type ItemChecklist = {
  id: string;
  libelle: string;
  fait: boolean;
  faitLe: string | null;
  faitPar: string | null;
};

export default function ChecklistLld({
  items,
  modifiable,
  onFait,
}: {
  items: ItemChecklist[];
  modifiable: boolean;
  onFait: () => void;
}) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const faits = items.filter((i) => i.fait).length;

  async function basculer(itemId: string, fait: boolean) {
    setEnCours(true);
    setErreur(null);
    try {
      await api.patch(`/lld/checklist/${itemId}`, { fait });
      onFait();
    } catch (e) {
      setErreur(
        e instanceof Error ? e.message : "Impossible de joindre le serveur.",
      );
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className={enCours ? "opacity-60" : undefined}>
      <div className="mb-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--neutre-fond)]">
          <div
            className="h-full rounded-full bg-[var(--succes-texte)] transition-all"
            style={{
              width: `${items.length ? (faits / items.length) * 100 : 0}%`,
            }}
          />
        </div>
        <span className="text-xs tabular-nums text-[var(--texte-doux)]">
          {faits}/{items.length}
        </span>
      </div>

      {erreur && (
        <p role="alert" className="mb-2 text-xs text-[var(--danger)]">
          {erreur}
        </p>
      )}

      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.id}>
            <label className="flex items-start gap-2 rounded-md px-1 py-1 text-sm hover:bg-[var(--fond-colonne)]">
              <input
                type="checkbox"
                checked={i.fait}
                disabled={!modifiable || enCours}
                onChange={(e) => void basculer(i.id, e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-[var(--trait-fort)] disabled:opacity-50"
              />
              <span
                className={
                  i.fait
                    ? "text-[var(--texte-doux)] line-through"
                    : "text-[var(--texte-fort)]"
                }
              >
                {i.libelle}
                {i.fait && i.faitPar && (
                  <span className="ml-2 text-[10px] text-[var(--texte-tres-doux)]">
                    {i.faitPar} · {dateCourte(i.faitLe)}
                  </span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
