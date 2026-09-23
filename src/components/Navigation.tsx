"use client";

/**
 * Navigation entre les trois espaces de travail (§ recommandation en une page).
 *
 * Le sélecteur d'utilisateur tient lieu d'authentification dans le MVP : il fixe
 * le rôle appliqué côté serveur, ce qui permet de tester la matrice de droits.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Role } from "@prisma/client";
import { LIBELLE_ROLE } from "@/lib/domaine/libelles";
import type { UtilisateurSession } from "@/lib/session";
import { choisirUtilisateur } from "@/app/actions/session";

const ESPACES = [
  { href: "/leads", libelle: "Leads à qualifier", objet: "Lead" },
  { href: "/ventes", libelle: "Ventes", objet: "Opportunité" },
  { href: "/lld", libelle: "LLD / GRENKE", objet: "Dossier LLD" },
  { href: "/mes-actions", libelle: "Mes actions", objet: "Tâches" },
  { href: "/pilotage", libelle: "Pilotage", objet: "Indicateurs" },
];

export default function Navigation({
  utilisateur,
  equipe,
}: {
  utilisateur: UtilisateurSession | null;
  equipe: { id: string; nom: string; prenom: string; role: Role }[];
}) {
  const chemin = usePathname();
  const router = useRouter();
  const [enCours, demarrer] = useTransition();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-sm font-bold tracking-tight">Selfizee</span>
          <span className="text-xs text-slate-500">Kanban commercial</span>
        </Link>

        <nav className="flex flex-1 flex-wrap gap-1">
          {ESPACES.map((e) => {
            const actif = chemin === e.href || chemin.startsWith(e.href + "/");
            return (
              <Link
                key={e.href}
                href={e.href}
                title={e.objet}
                className={[
                  "rounded-md px-3 py-1.5 text-sm font-medium transition",
                  actif
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
                ].join(" ")}
              >
                {e.libelle}
              </Link>
            );
          })}
        </nav>

        <label className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Connecté comme</span>
          <select
            value={utilisateur?.id ?? ""}
            disabled={enCours}
            onChange={(e) => {
              const id = e.target.value;
              demarrer(async () => {
                await choisirUtilisateur(id);
                router.refresh();
              });
            }}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="">— choisir —</option>
            {equipe.map((u) => (
              <option key={u.id} value={u.id}>
                {u.prenom} {u.nom} · {LIBELLE_ROLE[u.role]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}
