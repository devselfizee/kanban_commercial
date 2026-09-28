/**
 * Tableau de bord de pilotage (§11).
 *
 * Le tableau doit aider à agir, pas seulement à regarder des chiffres. Les
 * ventes directes et les LLD sont affichées séparément.
 *
 * Le stock LLD par statut est présenté comme une mesure de complétude du
 * processus : ce n'est ni un « score GRENKE », ni une probabilité d'acceptation,
 * ni un indicateur de solvabilité.
 */

import { useApi } from "@/hooks/useApi";
import { Chargement, Erreur } from "@/composants/Etats";
import { euros } from "@/lib/format";
import {
  LIBELLE_CANAL,
  LIBELLE_ETAPE,
  LIBELLE_MODE_ACQUISITION,
  LIBELLE_STATUT_LLD,
} from "@/lib/libelles";
import type {
  CanalDetaille,
  EtapeCommerciale,
  ModeAcquisition,
  StatutLld,
} from "@/lib/types";

type MoisSignes = {
  mois: string;
  lldNb: number;
  lldHt: number;
  autresNb: number;
  autresHt: number;
};

type Reponse = {
  /** Devis signés dans le CRM, lus à la demande. */
  affairesSignees:
    | { etat: "ok"; mois: MoisSignes[] }
    | { etat: "non_configure" }
    | { etat: "indisponible"; detail: string };
  delaiMoyenHeures: number | null;
  delaiQualifMoyen: number | null;
  couverture: number;
  cycleMoyen: number | null;
  parEtape: { etape: EtapeCommerciale; nb: number; ventes: number; loyers: number }[];
  stockLld: { statut: StatutLld; nb: number; valeur: number }[];
  parCanal: {
    canal: CanalDetaille;
    mode: ModeAcquisition;
    total: number;
    qualifies: number;
  }[];
  gagnees: number;
  perdues: number;
  tauxReussite: number | null;
  delaiTransmission: number | null;
  dossiersEnCours: number;
  qualite: {
    sansProchaineAction: number;
    dossiersSansResponsable: number;
    cloturesSansMotif: number;
  };
};

export default function Pilotage() {
  const { donnees, chargement, erreur, recharger } =
    useApi<Reponse>("/tableaux-bord/pilotage");

  if (chargement) return <Chargement quoi="les indicateurs" />;
  if (erreur) return <Erreur message={erreur} onReessayer={recharger} />;
  if (!donnees) return null;

  const d = donnees;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-bold tracking-tight text-[var(--texte-fort)]">
          Pilotage
        </h1>
        <p className="text-xs text-[var(--texte-doux)]">
          Ventes directes et LLD suivies séparément. Les indicateurs LLD mesurent
          la complétude du processus Selfizee, jamais une politique de crédit.
        </p>
      </header>

      {/* Réactivité */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tuile
          libelle="Délai de 1re prise en charge"
          valeur={
            d.delaiMoyenHeures != null ? `${d.delaiMoyenHeures.toFixed(1)} h` : "—"
          }
          aide="Entre création du lead entrant et première activité réalisée."
        />
        <Tuile
          libelle="Délai jusqu'à qualification"
          valeur={
            d.delaiQualifMoyen != null ? `${d.delaiQualifMoyen.toFixed(1)} j` : "—"
          }
          aide="Entre création du lead et conversion en opportunité."
        />
        <Tuile
          libelle="Couverture d'activité"
          valeur={`${d.couverture} %`}
          aide="Cartes ouvertes disposant d'une prochaine action datée."
          ton={d.couverture < 80 ? "alerte" : "normal"}
        />
        <Tuile
          libelle="Délai de cycle de vente"
          valeur={d.cycleMoyen != null ? `${d.cycleMoyen.toFixed(0)} j` : "—"}
          aide="Entre création de l'opportunité et issue gagnée / perdue."
        />
      </section>

      <AffairesSignees donnees={d.affairesSignees} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Bloc titre="Pipeline commercial par étape">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--trait)] text-left text-[11px] uppercase text-[var(--texte-tres-doux)]">
                <th className="pb-1 font-medium">Étape</th>
                <th className="pb-1 text-right font-medium">Nb</th>
                <th className="pb-1 text-right font-medium">Ventes</th>
                <th className="pb-1 text-right font-medium">Loyers / mois</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--trait)]">
              {d.parEtape.map((e) => (
                <tr key={e.etape}>
                  <td className="py-1.5">{LIBELLE_ETAPE[e.etape]}</td>
                  <td className="py-1.5 text-right tabular-nums">{e.nb}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {e.ventes > 0 ? euros(e.ventes) : "—"}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-indigo-700">
                    {e.loyers > 0 ? euros(e.loyers) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[10px] italic text-[var(--texte-tres-doux)]">
            Les deux colonnes de valeur ne s&apos;additionnent pas.
          </p>
        </Bloc>

        <Bloc titre="Stock LLD par statut">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--trait)] text-left text-[11px] uppercase text-[var(--texte-tres-doux)]">
                <th className="pb-1 font-medium">Statut</th>
                <th className="pb-1 text-right font-medium">Nb</th>
                <th className="pb-1 text-right font-medium">Loyers / mois</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--trait)]">
              {d.stockLld.map((s) => (
                <tr key={s.statut}>
                  <td className="py-1.5">{LIBELLE_STATUT_LLD[s.statut]}</td>
                  <td className="py-1.5 text-right tabular-nums">{s.nb}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {s.valeur > 0 ? euros(s.valeur) : "—"}
                  </td>
                </tr>
              ))}
              {d.stockLld.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-3 text-[var(--texte-doux)]">
                    Aucun dossier LLD.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="mt-2 text-[10px] italic text-[var(--texte-tres-doux)]">
            Ce tableau mesure l&apos;avancement des dossiers. Il ne constitue pas
            un score d&apos;acceptation.
          </p>
        </Bloc>

        <Bloc titre="Leads par canal d'acquisition">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--trait)] text-left text-[11px] uppercase text-[var(--texte-tres-doux)]">
                <th className="pb-1 font-medium">Canal</th>
                <th className="pb-1 font-medium">Mode</th>
                <th className="pb-1 text-right font-medium">Leads</th>
                <th className="pb-1 text-right font-medium">Qualifiés</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--trait)]">
              {d.parCanal.map((c) => (
                <tr key={c.canal}>
                  <td className="py-1.5">{LIBELLE_CANAL[c.canal] ?? c.canal}</td>
                  <td className="py-1.5 text-xs text-[var(--texte-doux)]">
                    {LIBELLE_MODE_ACQUISITION[c.mode] ?? c.mode}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{c.total}</td>
                  <td className="py-1.5 text-right tabular-nums">{c.qualifies}</td>
                </tr>
              ))}
              {d.parCanal.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 text-[var(--texte-doux)]">
                    Aucun lead.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Bloc>

        <Bloc titre="Qualité des données">
          <ul className="space-y-1.5 text-sm">
            <LigneQualite
              libelle="Cartes sans prochaine action"
              valeur={d.qualite.sansProchaineAction}
            />
            <LigneQualite
              libelle="Dossiers LLD sans responsable"
              valeur={d.qualite.dossiersSansResponsable}
            />
            <LigneQualite
              libelle="Clôtures sans motif"
              valeur={d.qualite.cloturesSansMotif}
            />
          </ul>
          <p className="mt-2 text-[10px] italic text-[var(--texte-tres-doux)]">
            À corriger avant que les reportings deviennent trompeurs.
          </p>
        </Bloc>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tuile
          libelle="Opportunités gagnées"
          valeur={String(d.gagnees)}
          aide={
            d.tauxReussite != null
              ? `${d.tauxReussite} % des opportunités closes`
              : "Aucune opportunité close."
          }
        />
        <Tuile libelle="Opportunités perdues" valeur={String(d.perdues)} />
        <Tuile
          libelle="Délai création → transmission LLD"
          valeur={
            d.delaiTransmission != null
              ? `${d.delaiTransmission.toFixed(1)} j`
              : "—"
          }
          aide="Mesure la qualité de préparation du dossier côté Selfizee."
        />
        <Tuile libelle="Dossiers LLD en cours" valeur={String(d.dossiersEnCours)} />
      </section>
    </div>
  );
}

const NOM_MOIS = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" });

function libelleMois(mois: string): string {
  const [a, m] = mois.split("-").map(Number);
  return NOM_MOIS.format(new Date(a, m - 1, 1));
}

/**
 * Affaires signées dans le CRM sur douze mois (§11).
 *
 * La location financière GRENKE et les autres affaires sont deux séries
 * distinctes, jamais additionnées : une vente et un financement ne répondent
 * pas à la même question. Le mois en cours est incomplet, et le dit.
 */
function AffairesSignees({ donnees }: { donnees: Reponse["affairesSignees"] }) {
  if (donnees.etat === "non_configure") return null;

  if (donnees.etat === "indisponible") {
    return (
      <Bloc titre="Affaires signées dans le CRM">
        <p className="text-sm text-[var(--texte-doux)]">
          Chiffres indisponibles — {donnees.detail}
        </p>
      </Bloc>
    );
  }

  const mois = donnees.mois;
  const cumul = mois.reduce(
    (s, m) => ({
      lldNb: s.lldNb + m.lldNb,
      lldHt: s.lldHt + m.lldHt,
      autresNb: s.autresNb + m.autresNb,
      autresHt: s.autresHt + m.autresHt,
    }),
    { lldNb: 0, lldHt: 0, autresNb: 0, autresHt: 0 },
  );
  const moisCourant = mois[mois.length - 1]?.mois;

  return (
    <section className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Tuile
          libelle="Location financière GRENKE — 12 mois"
          valeur={euros(cumul.lldHt) ?? "—"}
          aide={`${cumul.lldNb} devis signés facturés à GRENKE.`}
        />
        <Tuile
          libelle="Autres affaires signées — 12 mois"
          valeur={euros(cumul.autresHt) ?? "—"}
          aide={`${cumul.autresNb} devis signés : ventes et locations directes.`}
        />
      </div>

      <Bloc titre="Affaires signées par mois">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm tabular-nums">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-[var(--texte-doux)]">
                <th className="py-1 text-left font-medium">Mois</th>
                <th className="py-1 text-right font-medium" colSpan={2}>
                  Location financière GRENKE
                </th>
                <th className="py-1 text-right font-medium" colSpan={2}>
                  Autres affaires
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--trait)]">
              {[...mois].reverse().map((m) => (
                <tr key={m.mois}>
                  <td className="py-1.5 text-[var(--texte-fort)]">
                    {libelleMois(m.mois)}
                    {m.mois === moisCourant && (
                      <span className="ml-1.5 text-[10px] text-[var(--texte-tres-doux)]">
                        en cours
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-right text-[var(--texte-doux)]">
                    {m.lldNb || "—"}
                  </td>
                  <td className="py-1.5 pl-3 text-right font-medium text-[var(--texte-fort)]">
                    {m.lldNb ? euros(m.lldHt) : "—"}
                  </td>
                  <td className="py-1.5 pl-6 text-right text-[var(--texte-doux)]">
                    {m.autresNb || "—"}
                  </td>
                  <td className="py-1.5 pl-3 text-right font-medium text-[var(--texte-fort)]">
                    {m.autresNb ? euros(m.autresHt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] italic text-[var(--texte-doux)]">
          Devis signés dans le CRM (accepté, acompte, facturé, payé…), comptés au
          mois de leur création, montants HT après remise. Location financière
          et autres affaires ne s'additionnent pas.
        </p>
      </Bloc>
    </section>
  );
}

function Tuile({
  libelle,
  valeur,
  aide,
  ton = "normal",
}: {
  libelle: string;
  valeur: string;
  aide?: string;
  ton?: "normal" | "alerte";
}) {
  return (
    <div
      className={[
        "rounded-xl border bg-white p-3",
        ton === "alerte" ? "border-[var(--alerte-bord)]" : "border-[var(--trait)]",
      ].join(" ")}
    >
      <p className="text-[10px] uppercase tracking-wide text-[var(--texte-doux)]">
        {libelle}
      </p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{valeur}</p>
      {aide && (
        <p className="mt-0.5 text-[10px] text-[var(--texte-tres-doux)]">{aide}</p>
      )}
    </div>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--trait)] bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold">{titre}</h2>
      {children}
    </section>
  );
}

function LigneQualite({ libelle, valeur }: { libelle: string; valeur: number }) {
  return (
    <li className="flex items-center justify-between">
      <span>{libelle}</span>
      <span
        className={[
          "rounded px-2 py-0.5 text-xs font-semibold tabular-nums",
          valeur > 0
            ? "bg-[var(--danger-fond)] text-[var(--danger)]"
            : "bg-[var(--succes-fond)] text-[var(--succes-texte)]",
        ].join(" ")}
      >
        {valeur}
      </span>
    </li>
  );
}
