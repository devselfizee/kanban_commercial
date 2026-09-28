/**
 * Les pièces communes aux trois fiches détaillées.
 *
 * Lead, opportunité et dossier LLD montrent des informations différentes mais
 * se lisent de la même façon : un en-tête qui situe, des sections de champs,
 * un journal. Les factoriser garde les trois fiches cohérentes, et évite que
 * l'une dérive au fil des retouches.
 */

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LIBELLE_ACTION } from "@/lib/libelles";
import { dateHeure } from "@/lib/format";
import type { ActionJournal } from "@/lib/types";

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

/** Deux colonnes : la fiche à gauche, les actions à droite. */
export function DispositionFiche({
  children,
  actions,
}: {
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">{children}</div>
      <aside className="space-y-4">{actions}</aside>
    </div>
  );
}

export function Section({
  titre,
  children,
}: {
  titre?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--trait)] bg-white p-4">
      {titre && (
        <h2 className="mb-3 text-sm font-semibold text-[var(--texte-fort)]">
          {titre}
        </h2>
      )}
      {children}
    </section>
  );
}

/** En-tête : retour au tableau, référence, titre, sous-titre. */
export function EnTeteFiche({
  retourVers,
  retourLibelle,
  reference,
  titre,
  sousTitre,
  children,
}: {
  retourVers: string;
  retourLibelle: string;
  reference: string;
  titre: string;
  sousTitre?: string;
  children?: ReactNode;
}) {
  return (
    <header className="rounded-xl border border-[var(--trait)] bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <Link
          to={retourVers}
          className="text-xs text-[var(--texte-doux)] hover:underline"
        >
          ← {retourLibelle}
        </Link>
        <span className="font-mono text-xs text-[var(--texte-doux)]">
          {reference}
        </span>
      </div>

      <h1 className="text-xl font-bold tracking-tight text-[var(--texte-fort)]">
        {titre}
      </h1>
      {sousTitre && (
        <p className="mt-0.5 text-sm text-[var(--texte-doux)]">{sousTitre}</p>
      )}
      {children}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Champs
// ---------------------------------------------------------------------------

export function ListeChamps({ children }: { children: ReactNode }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">{children}</dl>
  );
}

export function Champ({
  libelle,
  children,
  pleineLargeur,
}: {
  libelle: string;
  children: ReactNode;
  pleineLargeur?: boolean;
}) {
  return (
    <div className={pleineLargeur ? "sm:col-span-2" : undefined}>
      <dt className="text-[11px] uppercase tracking-wide text-[var(--texte-doux)]">
        {libelle}
      </dt>
      <dd className="text-[var(--texte-fort)]">{children}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Journaux
// ---------------------------------------------------------------------------

export type EntreeJournal = {
  id: string;
  action: ActionJournal | string;
  ancienneValeur?: string | null;
  nouvelleValeur?: string | null;
  detail?: string | null;
  motif?: string | null;
  creeLe: string;
  auteur?: { prenom: string; nom: string } | null;
};

/**
 * Le journal des décisions.
 *
 * Il rend visible ce qui doit rester traçable : réattributions avec leur motif,
 * transmissions horodatées, clôtures. C'est la contrepartie de la règle « la
 * réattribution laisse une trace » — une trace que personne ne lit ne sert à
 * rien.
 */
export function JournalDecisions({ entrees }: { entrees: EntreeJournal[] }) {
  if (entrees.length === 0) {
    return <p className="text-sm text-[var(--texte-doux)]">Aucune entrée.</p>;
  }

  return (
    <ul className="space-y-1.5 text-xs">
      {entrees.map((j) => (
        <li key={j.id} className="flex flex-wrap gap-x-2 text-[var(--texte)]">
          <span className="text-[var(--texte-doux)]">{dateHeure(j.creeLe)}</span>
          <span className="font-medium text-[var(--texte-fort)]">
            {LIBELLE_ACTION[j.action as ActionJournal] ?? j.action}
          </span>
          {j.ancienneValeur && j.nouvelleValeur && (
            <span>
              {j.ancienneValeur} → {j.nouvelleValeur}
            </span>
          )}
          {j.detail && <span>{j.detail}</span>}
          {j.motif && <span className="italic">motif : {j.motif}</span>}
          {j.auteur && (
            <span className="text-[var(--texte-doux)]">
              par {j.auteur.prenom} {j.auteur.nom}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
