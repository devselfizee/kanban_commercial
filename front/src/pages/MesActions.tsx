/**
 * « Mes actions » — la vue qui empêche une carte d'être perdue (§3, §9, §10).
 *
 * Elle réunit les tâches échues, les actions du jour, et surtout les cartes sans
 * suivi planifié : ces dernières sont signalées, jamais laissées sans alerte.
 */

import { Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { Chargement, Erreur } from "@/composants/Etats";
import { depuis } from "@/lib/format";
import {
  LIBELLE_ETAPE,
  LIBELLE_STATUT_LEAD,
  LIBELLE_STATUT_LLD,
} from "@/lib/libelles";

type Cible = { espace: string; id: string; reference: string } | null;

type Tache = {
  id: string;
  libelle: string;
  detail: string | null;
  echeance: string | null;
  responsable: string | null;
  cible: Cible;
};

type CarteSansSuivi = {
  espace: string;
  id: string;
  reference: string;
  nom: string;
  etape: string;
};

type Reponse = {
  perimetreComplet: boolean;
  echues: Tache[];
  aVenir: Tache[];
  sansSuivi: CarteSansSuivi[];
  priseEnChargeTardive: {
    id: string;
    reference: string;
    nom: string;
    creeLe: string;
  }[];
};

/** Traduit un code d'étape, quel que soit le pipeline d'origine. */
function libelleEtape(espace: string, code: string): string {
  const table =
    espace === "leads"
      ? LIBELLE_STATUT_LEAD
      : espace === "ventes"
        ? LIBELLE_ETAPE
        : LIBELLE_STATUT_LLD;
  return (table as Record<string, string>)[code] ?? code;
}

export default function MesActions() {
  const { donnees, chargement, erreur, recharger } = useApi<Reponse>(
    "/tableaux-bord/mes-actions",
  );

  if (chargement) return <Chargement quoi="vos actions" />;
  if (erreur) return <Erreur message={erreur} onReessayer={recharger} />;
  if (!donnees) return null;

  const maintenant = new Date();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-bold tracking-tight text-[var(--texte-fort)]">
          Mes actions
        </h1>
        <p className="text-xs text-[var(--texte-doux)]">
          {donnees.perimetreComplet
            ? "Vue complète : toutes les cartes de l'équipe."
            : "Votre périmètre."}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Bloc
          titre="Sans suivi planifié"
          compte={donnees.sansSuivi.length}
          ton={donnees.sansSuivi.length > 0 ? "rouge" : "neutre"}
          aide="Ni prochaine action, ni attente datée, hors étapes terminales."
        >
          {donnees.sansSuivi.length === 0 ? (
            <Vide>Toutes les cartes ont une suite prévue.</Vide>
          ) : (
            <ul className="divide-y divide-[var(--trait)]">
              {donnees.sansSuivi.map((c) => (
                <li key={`${c.espace}-${c.id}`}>
                  <Link
                    to={`/${c.espace}/${c.id}`}
                    className="flex items-baseline justify-between gap-2 px-1 py-2 text-sm hover:bg-[var(--fond-page)]"
                  >
                    <span>
                      <span className="font-medium">{c.nom}</span>
                      <span className="ml-2 text-xs text-[var(--texte-doux)]">
                        {libelleEtape(c.espace, c.etape)}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-[var(--texte-tres-doux)]">
                      {c.reference}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Bloc>

        <Bloc
          titre="Prise en charge en retard"
          compte={donnees.priseEnChargeTardive.length}
          ton={donnees.priseEnChargeTardive.length > 0 ? "ambre" : "neutre"}
          aide="Aucun premier contact journalisé dans le délai interne."
        >
          {donnees.priseEnChargeTardive.length === 0 ? (
            <Vide>Les délais de première réponse sont tenus.</Vide>
          ) : (
            <ul className="divide-y divide-[var(--trait)]">
              {donnees.priseEnChargeTardive.map((l) => (
                <li key={l.id}>
                  <Link
                    to={`/leads/${l.id}`}
                    className="flex items-baseline justify-between gap-2 px-1 py-2 text-sm hover:bg-[var(--fond-page)]"
                  >
                    <span>
                      <span className="font-medium">{l.nom}</span>
                      <span className="ml-2 text-xs text-[var(--texte-doux)]">
                        créé {depuis(new Date(l.creeLe), maintenant)}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-[var(--texte-tres-doux)]">
                      {l.reference}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Bloc>

        <Bloc
          titre="Tâches échues"
          compte={donnees.echues.length}
          ton={donnees.echues.length > 0 ? "rouge" : "neutre"}
        >
          {donnees.echues.length === 0 ? (
            <Vide>Aucune tâche en retard.</Vide>
          ) : (
            <ListeTaches taches={donnees.echues} maintenant={maintenant} />
          )}
        </Bloc>

        <Bloc titre="À venir" compte={donnees.aVenir.length}>
          {donnees.aVenir.length === 0 ? (
            <Vide>Aucune tâche planifiée.</Vide>
          ) : (
            <ListeTaches
              taches={donnees.aVenir.slice(0, 15)}
              maintenant={maintenant}
            />
          )}
        </Bloc>
      </div>
    </div>
  );
}

function ListeTaches({
  taches,
  maintenant,
}: {
  taches: Tache[];
  maintenant: Date;
}) {
  return (
    <ul className="divide-y divide-[var(--trait)]">
      {taches.map((t) => {
        const contenu = (
          <div className="flex items-baseline justify-between gap-2 px-1 py-2 text-sm">
            <span className="truncate">
              {t.libelle}
              {t.responsable && (
                <span className="ml-2 text-[11px] text-[var(--texte-tres-doux)]">
                  {t.responsable}
                </span>
              )}
            </span>
            <span className="shrink-0 text-xs text-[var(--texte-doux)]">
              {t.echeance ? depuis(new Date(t.echeance), maintenant) : "—"}
              {t.cible && (
                <span className="ml-2 font-mono text-[10px] text-[var(--texte-tres-doux)]">
                  {t.cible.reference}
                </span>
              )}
            </span>
          </div>
        );

        return (
          <li key={t.id}>
            {t.cible ? (
              <Link
                to={`/${t.cible.espace}/${t.cible.id}`}
                className="block hover:bg-[var(--fond-page)]"
              >
                {contenu}
              </Link>
            ) : (
              contenu
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Bloc({
  titre,
  compte,
  children,
  ton = "neutre",
  aide,
}: {
  titre: string;
  compte: number;
  children: React.ReactNode;
  ton?: "neutre" | "rouge" | "ambre";
  aide?: string;
}) {
  const tons = {
    neutre: "border-[var(--trait)]",
    rouge: "border-red-300",
    ambre: "border-[var(--alerte-bord)]",
  };
  return (
    <section className={`rounded-xl border bg-white p-4 ${tons[ton]}`}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{titre}</h2>
        <span className="rounded-full bg-[var(--neutre-fond)] px-2 text-xs font-medium text-[var(--texte-doux)]">
          {compte}
        </span>
      </div>
      {aide && <p className="mb-2 text-[11px] text-[var(--texte-doux)]">{aide}</p>}
      {children}
    </section>
  );
}

function Vide({ children }: { children: React.ReactNode }) {
  return <p className="py-3 text-sm text-[var(--texte-doux)]">{children}</p>;
}
