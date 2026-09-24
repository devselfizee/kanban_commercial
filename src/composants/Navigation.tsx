/**
 * Navigation unique de l'application.
 *
 * Une seule barre, horizontale : les tableaux kanban défilent latéralement et
 * ont besoin de toute la largeur disponible. Sous `sm`, les libellés cèdent la
 * place aux seules icônes.
 */

import { Link, useLocation } from "react-router-dom";
import { seDeconnecter } from "@/lib/auth";
import { LIBELLE_ROLE } from "@/lib/libelles";
import type { Utilisateur } from "@/lib/types";

// L'accueil n'y figure pas : le logo y mène déjà.
const ESPACES = [
  { href: "/leads", libelle: "Leads à qualifier", icone: personnes },
  { href: "/ventes", libelle: "Ventes", icone: cible },
  { href: "/lld", libelle: "LLD / GRENKE", icone: document },
  { href: "/mes-actions", libelle: "Mes actions", icone: calendrier },
  { href: "/pilotage", libelle: "Pilotage", icone: barres },
  { href: "/synchro", libelle: "Synchro CRM", icone: fleches },
];

export default function Navigation({
  utilisateur,
  authentifie,
}: {
  utilisateur: Utilisateur;
  authentifie: boolean;
}) {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--trait)] bg-white/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        {/* Logotype officiel, repris du CRM : jamais recoloré ni reconstitué. */}
        <Link to="/" className="flex shrink-0 items-center" aria-label="Accueil">
          <img
            src="/marque/logo-selfizee.png"
            alt="Selfizee"
            className="h-7 w-auto"
          />
        </Link>

        <nav className="flex flex-1 flex-wrap items-center gap-1">
          {ESPACES.map((e) => {
            const actif = pathname.startsWith(e.href);
            return (
              <Link
                key={e.href}
                to={e.href}
                aria-current={actif ? "page" : undefined}
                className={[
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                  actif
                    ? "bg-[var(--selfizee-600)] text-white"
                    : "text-[var(--texte)] hover:bg-[var(--selfizee-50)] hover:text-[var(--selfizee-600)]",
                ].join(" ")}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 shrink-0"
                  aria-hidden="true"
                >
                  {e.icone()}
                </svg>
                <span className="hidden sm:inline">{e.libelle}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full bg-[var(--selfizee-500)]"
            aria-hidden="true"
          />
          <span className="hidden text-xs text-[var(--texte)] sm:inline">
            {utilisateur.prenom} {utilisateur.nom}
            <span className="ml-1.5 text-[var(--texte-doux)]">
              · {LIBELLE_ROLE[utilisateur.role]}
            </span>
          </span>
          <button
            onClick={seDeconnecter}
            className="rounded-lg border border-[var(--trait-fort)] px-2.5 py-1.5 text-xs text-[var(--texte-doux)] transition hover:border-[var(--selfizee-300)] hover:text-[var(--selfizee-600)]"
          >
            {authentifie ? "Déconnexion" : "Changer"}
          </button>

          {/* Pastille d'identité */}
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--selfizee-500)] text-xs font-bold text-white"
            title={`${utilisateur.prenom} ${utilisateur.nom}`}
          >
            {`${utilisateur.prenom[0]}${utilisateur.nom[0]}`.toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
}

// --- Icônes -----------------------------------------------------------------

function personnes() {
  return (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0M17 11h4M19 9v4" />
    </>
  );
}

function cible() {
  return (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </>
  );
}

function document() {
  return (
    <>
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h4" />
    </>
  );
}

function calendrier() {
  return (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  );
}

function barres() {
  return <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />;
}

function fleches() {
  return (
    <>
      <path d="M20 11A8 8 0 0 0 6.3 5.7L4 8" />
      <path d="M4 5v3h3M4 13a8 8 0 0 0 13.7 5.3L20 16" />
      <path d="M20 19v-3h-3" />
    </>
  );
}
