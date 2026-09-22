"use client";

/**
 * Carte de kanban — lisible en trois secondes (§3).
 *
 * Titre : Organisation ou nom du particulier — ville — projet principal.
 * Badges permanents : origine, canal, segment, projet, priorité, responsable,
 * date de prochaine action. Une carte sans prochaine action est signalée en rouge.
 *
 * Tout le reste (coordonnées, interlocuteurs, journal, documents, devis, données
 * LLD) est réservé à la fiche détaillée.
 */

import { memo } from "react";
import type { Priorite } from "@prisma/client";
import { LIBELLE_PRIORITE, LIBELLE_PRIORITE_COURT } from "@/lib/domaine/libelles";

export type DonneesCarte = {
  id: string;
  reference: string;
  titre: string;
  badges: { texte: string; ton?: TonBadge; titre?: string }[];
  /** Nom du contact principal, si connu. */
  contact?: string | null;
  /** Montant indicatif déjà formaté, si connu. */
  montant?: string | null;
  /** Échéance ou date d'évènement déjà formatée. */
  echeance?: string | null;
  derniereActivite?: string | null;
  prochaineAction?: { label: string; date: string; enRetard: boolean } | null;
  /** Âge dans l'étape, en jours. */
  ageEtape: number;
  priorite: Priorite;
  responsable?: string | null;
  /** Vrai quand la carte n'a ni prochaine action ni attente datée. */
  sansSuivi: boolean;
  /** Badge court de statut LLD, affiché sur la carte commerciale. */
  badgeLld?: string | null;
  /** Alerte interne « compatibilité partenaire à confirmer ». */
  alerteCompatibilite?: string | null;
};

type TonBadge = "neutre" | "entrant" | "prospection" | "reactivation" | "lld" | "alerte";

const TONS: Record<TonBadge, string> = {
  neutre: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  entrant: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  prospection: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  reactivation: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  lld: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  alerte: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
};

const TONS_PRIORITE: Record<Priorite, string> = {
  P1_REPONSE_IMMEDIATE: "bg-red-600 text-white",
  P2_A_TRAITER_AUJOURDHUI: "bg-orange-500 text-white",
  P3_SUIVI_PLANIFIE: "bg-slate-400 text-white dark:bg-slate-600",
  P4_NURTURING: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

function Carte({
  carte,
  onOuvrir,
  onGlisser,
}: {
  carte: DonneesCarte;
  onOuvrir: (id: string) => void;
  onGlisser: (id: string) => void;
}) {
  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", carte.id);
        onGlisser(carte.id);
      }}
      onClick={() => onOuvrir(carte.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOuvrir(carte.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${carte.titre} — ${carte.reference}`}
      className={[
        "group cursor-grab rounded-lg border bg-white p-3 text-left shadow-sm transition",
        "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500",
        "active:cursor-grabbing dark:bg-slate-900",
        carte.sansSuivi
          ? "border-red-400 dark:border-red-700"
          : "border-slate-200 dark:border-slate-800",
      ].join(" ")}
    >
      {/* Ligne d'en-tête : référence + priorité */}
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <span className="font-mono text-[11px] text-slate-400">{carte.reference}</span>
        <span
          title={LIBELLE_PRIORITE[carte.priorite]}
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${TONS_PRIORITE[carte.priorite]}`}
        >
          {LIBELLE_PRIORITE_COURT[carte.priorite]}
        </span>
      </div>

      {/* Titre : organisation — ville — projet */}
      <h3 className="mb-2 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
        {carte.titre}
      </h3>

      {/* Badges permanents */}
      <div className="mb-2 flex flex-wrap gap-1">
        {carte.badges.map((b, i) => (
          <span
            key={i}
            title={b.titre}
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${TONS[b.ton ?? "neutre"]}`}
          >
            {b.texte}
          </span>
        ))}
        {carte.badgeLld && (
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${TONS.lld}`}>
            LLD · {carte.badgeLld}
          </span>
        )}
      </div>

      {/* Alerte interne de compatibilité partenaire */}
      {carte.alerteCompatibilite && (
        <p
          className="mb-2 rounded bg-amber-50 px-2 py-1 text-[11px] leading-snug text-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
          title={carte.alerteCompatibilite}
        >
          ⚠ Compatibilité partenaire à confirmer
        </p>
      )}

      {/* Informations visibles sur la carte */}
      <dl className="space-y-0.5 text-[11px] text-slate-600 dark:text-slate-400">
        {carte.contact && (
          <div className="flex gap-1.5">
            <dt className="sr-only">Contact</dt>
            <dd className="truncate">👤 {carte.contact}</dd>
          </div>
        )}
        {carte.montant && (
          <div className="flex gap-1.5">
            <dt className="sr-only">Montant indicatif</dt>
            <dd>💶 {carte.montant}</dd>
          </div>
        )}
        {carte.echeance && (
          <div className="flex gap-1.5">
            <dt className="sr-only">Échéance</dt>
            <dd>📅 {carte.echeance}</dd>
          </div>
        )}
        {carte.derniereActivite && (
          <div className="flex gap-1.5">
            <dt className="sr-only">Dernière activité</dt>
            <dd className="truncate">🕘 {carte.derniereActivite}</dd>
          </div>
        )}
      </dl>

      {/* Prochaine action, ou alerte d'absence de suivi */}
      <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
        {carte.prochaineAction ? (
          <p
            className={[
              "truncate text-[11px] font-medium",
              carte.prochaineAction.enRetard
                ? "text-red-600 dark:text-red-400"
                : "text-slate-700 dark:text-slate-300",
            ].join(" ")}
            title={carte.prochaineAction.label}
          >
            {carte.prochaineAction.enRetard ? "⏰" : "→"} {carte.prochaineAction.date} ·{" "}
            {carte.prochaineAction.label}
          </p>
        ) : carte.sansSuivi ? (
          <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">
            ⚠ Sans suivi planifié
          </p>
        ) : (
          <p className="text-[11px] text-slate-400">Étape terminale</p>
        )}
      </div>

      {/* Pied : responsable et âge dans l'étape */}
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
        <span className="truncate">{carte.responsable ?? "Non attribué"}</span>
        <span title="Âge dans l'étape">{carte.ageEtape} j</span>
      </div>
    </article>
  );
}

export default memo(Carte);
