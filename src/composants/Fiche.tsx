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
import { dateCourte, dateHeure } from "@/lib/format";
import type { ActionJournal } from "@/lib/types";
import { TEINTE_ICONE } from "./TableauBord";

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

/** Une section de fiche, titrée comme les blocs du pilotage. */
export function Section({
  titre,
  icone,
  children,
}: {
  titre?: string;
  icone?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-[var(--trait)] bg-white p-4 shadow-sm">
      {titre && (
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--texte-fort)]">
          {icone && (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--selfizee-50)] text-[var(--selfizee-600)]">
              {icone}
            </span>
          )}
          {titre}
        </h2>
      )}
      {children}
    </section>
  );
}

/**
 * En-tête : retour au tableau, pastille de l'espace, titre, référence.
 *
 * La pastille reprend la couleur de l'espace sur l'accueil — bleu pour les
 * leads, rose pour les ventes, violet pour la LLD — pour qu'on sache d'un coup
 * d'œil dans quel tableau on se trouve.
 */
export function EnTeteFiche({
  retourVers,
  retourLibelle,
  reference,
  titre,
  sousTitre,
  icone,
  teinte = "bleu",
  children,
}: {
  retourVers: string;
  retourLibelle: string;
  reference: string;
  titre: string;
  sousTitre?: string;
  icone?: ReactNode;
  teinte?: keyof typeof TEINTE_ICONE;
  children?: ReactNode;
}) {
  return (
    <header className="rounded-xl border border-[var(--trait)] bg-white p-4 shadow-sm">
      <Link
        to={retourVers}
        className="text-xs text-[var(--texte-doux)] hover:text-[var(--selfizee-600)] hover:underline"
      >
        ← {retourLibelle}
      </Link>

      <div className="mt-3 flex items-start gap-3">
        {icone && (
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: TEINTE_ICONE[teinte] }}
          >
            {icone}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[var(--texte-fort)]">
              {titre}
            </h1>
            <span className="shrink-0 rounded-md bg-[var(--neutre-fond)] px-2 py-0.5 font-mono text-[11px] text-[var(--neutre-texte)]">
              {reference}
            </span>
          </div>
          {sousTitre && (
            <p className="mt-0.5 text-sm text-[var(--texte-doux)]">{sousTitre}</p>
          )}
        </div>
      </div>
      {children}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Repères
// ---------------------------------------------------------------------------

export type Repere = {
  libelle: string;
  valeur: ReactNode;
  /** `alerte` : à surveiller ; `danger` : à traiter. Toujours doublé du texte. */
  ton?: "normal" | "alerte" | "danger";
};

/**
 * La prochaine action : en rouge si elle est dépassée ou absente — une carte
 * sans suite est précisément ce que le document interdit (§4).
 * `attenteFormalisee` : une étape d'attente datée ou close n'en exige pas.
 */
export function repereProchaineAction(
  le: string | null | undefined,
  label: string | null | undefined,
  attenteFormalisee = false,
): Repere {
  if (!le) {
    return attenteFormalisee
      ? { libelle: "Prochaine action", valeur: "Aucune requise" }
      : { libelle: "Prochaine action", valeur: "Aucune planifiée", ton: "danger" };
  }
  const enRetard = new Date(le).getTime() < Date.now() - 86_400_000;
  return {
    libelle: "Prochaine action",
    valeur: `${dateCourte(le)} · ${label ?? "action planifiée"}`,
    ton: enRetard ? "danger" : "normal",
  };
}

/** Depuis combien de temps la carte est dans sa colonne. */
export function repereAge(
  entreEnEtapeLe: string | null | undefined,
  /** Étape close : l'ancienneté y est normale, elle n'alerte pas. */
  close = false,
): Repere {
  if (!entreEnEtapeLe) return { libelle: "Dans l'étape depuis", valeur: "—" };
  const jours = Math.max(
    0,
    Math.floor((Date.now() - new Date(entreEnEtapeLe).getTime()) / 86_400_000),
  );
  return {
    libelle: "Dans l'étape depuis",
    valeur: jours === 0 ? "aujourd'hui" : `${jours} j`,
    // Trois semaines sans changer de colonne : à regarder, sans alarmer.
    ton: jours >= 21 && !close ? "alerte" : "normal",
  };
}

/**
 * Les repères d'une fiche, sous l'en-tête : qui agit, quand, depuis combien
 * de temps. Le document veut qu'une carte permette de « décider
 * immédiatement qui doit agir et quand » (§3) — la fiche aussi.
 */
export function Reperes({ reperes }: { reperes: Repere[] }) {
  return (
    <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {reperes.map((r) => (
        <div
          key={r.libelle}
          className={[
            "min-w-0 rounded-xl border bg-white px-3 py-2.5 shadow-sm",
            r.ton === "danger"
              ? "border-[var(--danger)] bg-[var(--danger-fond)]"
              : r.ton === "alerte"
                ? "border-[var(--alerte-bord)] bg-[var(--alerte-fond)]"
                : "border-[var(--trait)]",
          ].join(" ")}
        >
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texte-doux)]">
            {r.libelle}
          </dt>
          <dd
            className={[
              "mt-0.5 truncate text-sm font-semibold",
              r.ton === "danger"
                ? "text-[var(--danger)]"
                : r.ton === "alerte"
                  ? "text-[var(--alerte-texte)]"
                  : "text-[var(--texte-fort)]",
            ].join(" ")}
          >
            {r.valeur}
          </dd>
        </div>
      ))}
    </dl>
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
