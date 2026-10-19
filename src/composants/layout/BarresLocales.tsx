/**
 * Barre du haut et barre latérale locales, au dessin de la plateforme Konitys.
 *
 * Elles ne servent que si le hub ne répond pas : la navigation doit toujours
 * fonctionner. Reprises de Stock Manager, sans ses éléments fictifs (compteur
 * de tâches, pastille de notification permanente) — un secours qui affiche de
 * fausses informations ferait plus de mal que de bien.
 */

import { useState, type ComponentType } from "react";
import { LIBELLE_ROLE } from "@/lib/libelles";
import type { Utilisateur } from "@/lib/types";
import { IconeChevrons, IconeMenu, IconeSortie } from "@/composants/Icones";

export type EntreeMenu = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  path: string;
  /** Nombre affiché en pastille, s'il y a lieu. */
  badge?: number;
};

export type SectionMenu = { label: string; items: EntreeMenu[] };

// ---------------------------------------------------------------------------
// Barre du haut
// ---------------------------------------------------------------------------

export function BarreHautLocale({
  utilisateur,
  nomApplication,
  onMenuMobile,
  onDeconnexion,
}: {
  utilisateur: Utilisateur;
  nomApplication: string;
  onMenuMobile: () => void;
  onDeconnexion: () => void;
}) {
  const [compteOuvert, setCompteOuvert] = useState(false);
  const initiales =
    `${utilisateur.prenom[0] ?? ""}${utilisateur.nom[0] ?? ""}`.toUpperCase() || "?";

  return (
    <header className="z-30 shrink-0 border-b border-[var(--k-border)] bg-gradient-to-r from-white to-blue-50 shadow-sm shadow-black/[0.04]">
      <div className="flex h-12 items-center gap-2 px-3 md:gap-3 md:px-4">
        <button
          type="button"
          aria-label="Menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--k-muted)] hover:bg-[var(--k-surface-2)] md:hidden"
          onClick={onMenuMobile}
        >
          <IconeMenu className="h-[18px] w-[18px]" />
        </button>

        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase leading-none tracking-wider text-[var(--k-muted)]">
            Konitys
          </span>
          <span className="text-[13px] font-semibold leading-tight text-[var(--k-text)]">
            {nomApplication}
          </span>
        </div>

        <div className="flex-1" />

        <div className="relative">
          <button
            type="button"
            className="flex h-9 items-center gap-2 rounded-lg px-2 transition hover:bg-[var(--k-surface-2)]"
            onClick={() => setCompteOuvert((v) => !v)}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-[11px] font-semibold text-white">
              {initiales}
            </span>
            <span className="hidden text-[13px] font-medium text-[var(--k-text)] sm:inline">
              {utilisateur.prenom}
            </span>
          </button>
          {compteOuvert && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setCompteOuvert(false)} />
              <div className="absolute right-0 z-40 mt-2 w-[240px] rounded-2xl border border-[var(--k-border)] bg-white py-1 shadow-xl shadow-black/10">
                <div className="border-b border-[var(--k-border)] px-3 py-2.5">
                  <div className="text-[13px] font-semibold text-[var(--k-text)]">
                    {utilisateur.prenom} {utilisateur.nom}
                  </div>
                  <div className="text-xs text-[var(--k-muted)]">
                    {utilisateur.email} · {LIBELLE_ROLE[utilisateur.role]}
                  </div>
                </div>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-[var(--k-danger)] transition hover:bg-[var(--k-surface-2)]"
                  onClick={onDeconnexion}
                >
                  <IconeSortie className="h-4 w-4" />
                  Déconnexion
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Barre latérale
// ---------------------------------------------------------------------------

export function BarreLateraleLocale({
  sections,
  cheminActif,
  replie,
  onBasculer,
  onNaviguer,
}: {
  sections: SectionMenu[];
  cheminActif: string;
  replie: boolean;
  onBasculer: () => void;
  onNaviguer: (chemin: string) => void;
}) {
  return (
    <aside
      className={[
        "sticky top-12 h-[calc(100vh-48px)] shrink-0 bg-[var(--k-sidebar-bg)] transition-all duration-200",
        replie ? "w-[52px]" : "w-[210px]",
      ].join(" ")}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="flex-1 overflow-y-auto pb-2 pt-3">
          {sections.map((section, i) => (
            <div key={section.label} className={i > 0 ? "mt-4" : undefined}>
              {replie ? (
                i > 0 && <div className="mx-3 mb-2 border-t border-[var(--k-sidebar-border)]" />
              ) : (
                <div className="mb-1 px-4 text-[10px] font-semibold uppercase tracking-widest text-[var(--k-sidebar-section)]">
                  {section.label}
                </div>
              )}
              <nav className="space-y-0.5 px-2">
                {section.items.map((item) => {
                  const actif = item.path === cheminActif;
                  const Icone = item.icon;
                  return (
                    <button
                      key={item.path}
                      type="button"
                      title={replie ? item.label : undefined}
                      aria-current={actif ? "page" : undefined}
                      onClick={() => onNaviguer(item.path)}
                      className={[
                        "relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition",
                        replie ? "justify-center px-0" : "justify-start",
                        actif
                          ? "bg-white/10 text-white"
                          : "text-[var(--k-sidebar-text)] hover:bg-white/[0.06] hover:text-[var(--k-sidebar-text-active)]",
                      ].join(" ")}
                    >
                      {actif && !replie && (
                        <span className="absolute bottom-[6px] left-0 top-[6px] w-[2px] rounded-full bg-white" />
                      )}
                      <Icone className="h-4 w-4 shrink-0" />
                      {!replie && <span className="flex-1 truncate text-left">{item.label}</span>}
                      {!replie && item.badge != null && (
                        <span className="rounded-full bg-[var(--k-danger)] px-1.5 text-[10px] font-semibold text-white">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--k-sidebar-border)] px-2 py-2">
          <button
            type="button"
            onClick={onBasculer}
            className={[
              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium text-[var(--k-sidebar-text)] transition hover:bg-white/[0.06] hover:text-[var(--k-sidebar-text-active)]",
              replie ? "justify-center px-0" : "",
            ].join(" ")}
          >
            <IconeChevrons vers={replie ? "droite" : "gauche"} className="h-4 w-4 shrink-0" />
            {!replie && <span>Réduire</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
