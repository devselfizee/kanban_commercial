/**
 * Carte de kanban — lisible en trois secondes (§3).
 *
 * Titre : Organisation ou nom du particulier — ville — projet principal.
 * Badges permanents : origine, canal, segment, projet, priorité, responsable,
 * date de prochaine action.
 *
 * Le rose de la marque signale la carte et ses accents ; il n'est jamais utilisé
 * pour une alerte, qui garde l'ambre et le rouge — sans quoi une carte en retard
 * se fondrait dans le décor.
 */

import { memo } from "react";
import type { Priorite } from "@/lib/types";
import { LIBELLE_PRIORITE, LIBELLE_PRIORITE_COURT } from "@/lib/libelles";

export type TonBadge =
  | "neutre"
  | "entrant"
  | "prospection"
  | "reactivation"
  | "lld"
  | "alerte"
  | "succes";

export type DonneesCarte = {
  id: string;
  reference: string;
  titre: string;
  badges: { texte: string; ton?: TonBadge; titre?: string }[];
  contact?: string | null;
  montant?: string | null;
  echeance?: string | null;
  derniereActivite?: string | null;
  prochaineAction?: { label: string; date: string; enRetard: boolean } | null;
  /** Âge dans l'étape, en jours. */
  ageEtape: number;
  priorite: Priorite;
  responsable?: string | null;
  /** Vrai quand la carte n'a ni prochaine action ni attente datée. */
  sansSuivi: boolean;
  badgeLld?: string | null;
  alerteCompatibilite?: string | null;
  nbActivites?: number;
};

const TONS: Record<TonBadge, string> = {
  neutre: "bg-[var(--neutre-fond)] text-[var(--neutre-texte)]",
  entrant: "bg-[var(--selfizee-100)] text-[var(--selfizee-700)]",
  prospection: "bg-violet-100 text-violet-700",
  reactivation: "bg-teal-100 text-teal-700",
  lld: "bg-indigo-100 text-indigo-700",
  alerte: "bg-[var(--alerte-fond)] text-[var(--alerte-texte)]",
  succes: "bg-[var(--succes-fond)] text-[var(--succes-texte)]",
};

const TONS_PRIORITE: Record<Priorite, string> = {
  P1_REPONSE_IMMEDIATE: "bg-[var(--danger)] text-white",
  P2_A_TRAITER_AUJOURDHUI: "bg-[var(--alerte-bord)] text-[#4a3000]",
  P3_SUIVI_PLANIFIE: "bg-[var(--trait-fort)] text-[var(--texte-doux)]",
  P4_NURTURING: "bg-[var(--neutre-fond)] text-[var(--neutre-texte)]",
};

/** La bordure gauche reprend la priorité : c'est le repère le plus rapide. */
const BORDURE_PRIORITE: Record<Priorite, string> = {
  P1_REPONSE_IMMEDIATE: "var(--danger)",
  P2_A_TRAITER_AUJOURDHUI: "var(--alerte-bord)",
  P3_SUIVI_PLANIFIE: "var(--selfizee-400)",
  P4_NURTURING: "var(--trait-fort)",
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
      style={{
        borderLeftColor: carte.sansSuivi
          ? "var(--danger)"
          : BORDURE_PRIORITE[carte.priorite],
      }}
      className={[
        "group cursor-grab rounded-xl border border-l-4 bg-white p-3.5 text-left shadow-sm transition",
        "hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing",
        carte.sansSuivi
          ? "border-y-red-200 border-r-red-200"
          : "border-y-[var(--trait)] border-r-[var(--trait)]",
      ].join(" ")}
    >
      {/* Référence et priorité */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--texte-tres-doux)]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
            <path d="M14 3v5h4" />
          </svg>
          {carte.reference}
        </span>
        <span
          title={LIBELLE_PRIORITE[carte.priorite]}
          className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${TONS_PRIORITE[carte.priorite]}`}
        >
          {LIBELLE_PRIORITE_COURT[carte.priorite]}
        </span>
      </div>

      {/* Titre */}
      <h3 className="mb-2 text-sm font-bold leading-snug text-[var(--texte-fort)]">
        {carte.titre}
      </h3>

      {/* Badges */}
      <div className="mb-2 flex flex-wrap gap-1">
        {carte.badges.map((b, i) => (
          <span
            key={i}
            title={b.titre}
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${TONS[b.ton ?? "neutre"]}`}
          >
            {b.texte}
          </span>
        ))}
        {carte.badgeLld && (
          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${TONS.lld}`}>
            LLD · {carte.badgeLld}
          </span>
        )}
      </div>

      {/* Alerte de compatibilité partenaire */}
      {carte.alerteCompatibilite && (
        <p
          className="mb-2 flex items-start gap-1.5 rounded-lg border border-[var(--alerte-bord)] bg-[var(--alerte-fond)] px-2 py-1.5 text-[11px] leading-snug text-[var(--alerte-texte)]"
          title={carte.alerteCompatibilite}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="mt-px h-3.5 w-3.5 shrink-0"
            aria-hidden="true"
          >
            <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          </svg>
          Compatibilité partenaire à confirmer
        </p>
      )}

      {/* Informations */}
      <dl className="space-y-1 text-[11px] text-[var(--texte-doux)]">
        {carte.contact && (
          <Ligne icone="lien">
            <span className="truncate">{carte.contact}</span>
          </Ligne>
        )}
        {carte.montant && <Ligne icone="euro">{carte.montant}</Ligne>}
        {carte.echeance && <Ligne icone="calendrier">{carte.echeance}</Ligne>}
      </dl>

      {/* Fil d'activité */}
      {carte.derniereActivite && (
        <p className="mt-2 flex items-start gap-1.5 border-t border-[var(--trait)] pt-2 text-[11px] text-[var(--texte-tres-doux)]">
          <span aria-hidden="true">›</span>
          <span className="truncate">{carte.derniereActivite}</span>
        </p>
      )}

      {/* Prochaine action, ou alerte d'absence de suivi */}
      <div
        className={
          carte.derniereActivite ? "mt-1" : "mt-2 border-t border-[var(--trait)] pt-2"
        }
      >
        {carte.prochaineAction ? (
          <p
            className={[
              "flex items-start gap-1.5 text-[11px] font-medium",
              carte.prochaineAction.enRetard
                ? "text-[var(--danger)]"
                : "text-[var(--texte)]",
            ].join(" ")}
            title={carte.prochaineAction.label}
          >
            <span aria-hidden="true">
              {carte.prochaineAction.enRetard ? "⏰" : "→"}
            </span>
            <span className="truncate">
              {carte.prochaineAction.date} · {carte.prochaineAction.label}
            </span>
          </p>
        ) : carte.sansSuivi ? (
          <p className="text-[11px] font-semibold text-[var(--danger)]">
            ⚠ Sans suivi planifié
          </p>
        ) : (
          <p className="text-[11px] text-[var(--texte-tres-doux)]">Étape terminale</p>
        )}
      </div>

      {/* Pied : responsable, activités, âge */}
      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-[var(--texte-tres-doux)]">
        <span className="truncate font-medium text-[var(--texte-doux)]">
          {carte.responsable ?? "Non attribué"}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {carte.nbActivites != null && carte.nbActivites > 0 && (
            <span
              className="flex items-center gap-0.5"
              title={`${carte.nbActivites} activité(s) journalisée(s)`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-3 w-3"
                aria-hidden="true"
              >
                <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" />
              </svg>
              {carte.nbActivites}
            </span>
          )}
          <span title="Âge dans l'étape">{carte.ageEtape} j</span>
        </span>
      </div>
    </article>
  );
}

function Ligne({
  icone,
  children,
}: {
  icone: "lien" | "euro" | "calendrier";
  children: React.ReactNode;
}) {
  const chemins = {
    lien: (
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    ),
    euro: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M15 9.5a4 4 0 1 0 0 5M8 11h5M8 13h5" />
      </>
    ),
    calendrier: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>
    ),
  };

  return (
    <div className="flex items-center gap-1.5">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--selfizee-400)"
        strokeWidth="1.8"
        strokeLinecap="round"
        className="h-3.5 w-3.5 shrink-0"
        aria-hidden="true"
      >
        {chemins[icone]}
      </svg>
      <dd className="truncate">{children}</dd>
    </div>
  );
}

export default memo(Carte);
