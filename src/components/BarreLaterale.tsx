"use client";

/**
 * Barre latérale de navigation.
 *
 * Elle ne liste que des écrans qui existent : une entrée qui mène à une page
 * vide coûte plus de confiance qu'elle n'apporte de promesse.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

type Entree = {
  href: string;
  libelle: string;
  icone: React.ReactNode;
};

const ENTREES: Entree[] = [
  {
    href: "/",
    libelle: "Accueil",
    icone: (
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5Z" />
    ),
  },
  {
    href: "/leads",
    libelle: "Leads à qualifier",
    icone: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20a6 6 0 0 1 12 0M17 11h4M19 9v4" />
      </>
    ),
  },
  {
    href: "/ventes",
    libelle: "Ventes",
    icone: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  },
  {
    href: "/lld",
    libelle: "LLD / GRENKE",
    icone: (
      <>
        <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
        <path d="M14 3v5h4" />
      </>
    ),
  },
  {
    href: "/mes-actions",
    libelle: "Mes actions",
    icone: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4" />
      </>
    ),
  },
  {
    href: "/pilotage",
    libelle: "Pilotage",
    icone: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  },
  {
    href: "/synchro",
    libelle: "Synchro CRM",
    icone: (
      <>
        <path d="M20 11A8 8 0 0 0 6.3 5.7L4 8" />
        <path d="M4 5v3h3M4 13a8 8 0 0 0 13.7 5.3L20 16" />
        <path d="M20 19v-3h-3" />
      </>
    ),
  },
];

export default function BarreLaterale() {
  const chemin = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col justify-between border-r border-[var(--trait)] bg-[var(--fond-lateral)] lg:flex">
      <div>
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 px-5 py-4"
          aria-label="Accueil"
        >
          <LogoSelfizee />
        </Link>

        <nav className="mt-2 space-y-0.5 px-3">
          {ENTREES.map((e) => {
            const actif =
              e.href === "/" ? chemin === "/" : chemin.startsWith(e.href);
            return (
              <Link
                key={e.href}
                href={e.href}
                aria-current={actif ? "page" : undefined}
                className={[
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  actif
                    ? "bg-[var(--selfizee-500)] text-white shadow-sm shadow-[var(--selfizee-200)]"
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
                  className="h-5 w-5 shrink-0"
                  aria-hidden="true"
                >
                  {e.icone}
                </svg>
                <span className="truncate">{e.libelle}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Pied : rappel de marque */}
      <div className="relative overflow-hidden px-5 py-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-24 h-56 w-56 rounded-full bg-gradient-to-tr from-[var(--selfizee-500)] to-[var(--selfizee-300)] opacity-90"
        />
        <div className="relative">
          <LogoSelfizee inverse />
        </div>
      </div>
    </aside>
  );
}

function LogoSelfizee({ inverse }: { inverse?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <svg
        viewBox="0 0 32 32"
        className="h-8 w-8 shrink-0"
        aria-hidden="true"
      >
        <rect
          x="2"
          y="6"
          width="28"
          height="21"
          rx="5"
          fill={inverse ? "#ffffff" : "var(--selfizee-500)"}
        />
        <rect
          x="11"
          y="2"
          width="10"
          height="5"
          rx="2"
          fill={inverse ? "#ffffff" : "var(--selfizee-500)"}
        />
        <circle
          cx="16"
          cy="16.5"
          r="6"
          fill="none"
          stroke={inverse ? "var(--selfizee-500)" : "#ffffff"}
          strokeWidth="2.4"
        />
      </svg>
      <span
        className={[
          "text-xl font-bold tracking-tight",
          inverse ? "text-white" : "text-[var(--selfizee-500)]",
        ].join(" ")}
      >
        Selfizee
      </span>
    </span>
  );
}
