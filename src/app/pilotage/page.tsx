/**
 * Tableau de bord de pilotage (§11).
 *
 * Le tableau doit aider à agir, pas seulement à regarder des chiffres. Les ventes
 * directes et les LLD sont affichées séparément.
 *
 * Le stock LLD par statut est présenté comme une mesure de complétude du processus :
 * ce n'est ni un « score GRENKE », ni une probabilité d'acceptation, ni un
 * indicateur de solvabilité.
 */

import { prisma } from "@/lib/prisma";
import { COLONNES_LLD, COLONNES_OPPORTUNITE } from "@/lib/domaine/pipelines";
import { LIBELLE_CANAL, LIBELLE_MODE_ACQUISITION } from "@/lib/domaine/libelles";
import {
  estTerminaleLead,
  estTerminaleLld,
  estTerminaleOpportunite,
  sansSuiviPlanifie,
} from "@/lib/domaine/regles";

export const dynamic = "force-dynamic";

const EUROS = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default async function PagePilotage() {
  const [leads, opportunites, dossiers] = await Promise.all([
    prisma.lead.findMany(),
    prisma.opportunite.findMany(),
    prisma.dossierLld.findMany(),
  ]);


  // --- Délai de première prise en charge (entrants uniquement) --------------
  const entrantsTraites = leads.filter(
    (l) => l.modeAcquisition === "ENTRANT" && l.premierContactLe,
  );
  const delaiMoyenHeures =
    entrantsTraites.length > 0
      ? entrantsTraites.reduce(
          (s, l) =>
            s + (l.premierContactLe!.getTime() - l.creeLe.getTime()) / 3_600_000,
          0,
        ) / entrantsTraites.length
      : null;

  // --- Délai jusqu'à qualification -----------------------------------------
  const converties = opportunites.filter((o) => o.leadId);
  const leadsParId = new Map(leads.map((l) => [l.id, l]));
  const delaisQualif = converties
    .map((o) => {
      const l = leadsParId.get(o.leadId!);
      return l ? (o.creeLe.getTime() - l.creeLe.getTime()) / 86_400_000 : null;
    })
    .filter((v): v is number => v != null);
  const delaiQualifMoyen =
    delaisQualif.length > 0
      ? delaisQualif.reduce((a, b) => a + b, 0) / delaisQualif.length
      : null;

  // --- Taux de conversion par canal d'acquisition --------------------------
  const parCanal = new Map<
    string,
    { mode: string; total: number; qualifies: number }
  >();
  for (const l of leads) {
    const cle = l.canalDetaille;
    const e = parCanal.get(cle) ?? {
      mode: LIBELLE_MODE_ACQUISITION[l.modeAcquisition],
      total: 0,
      qualifies: 0,
    };
    e.total += 1;
    if (l.statut === "QUALIFIE_A_CONVERTIR") e.qualifies += 1;
    parCanal.set(cle, e);
  }

  // --- Couverture d'activité commerciale -----------------------------------
  const cartesOuvertes =
    leads.filter((l) => !estTerminaleLead(l.statut)).length +
    opportunites.filter((o) => !estTerminaleOpportunite(o.etape)).length +
    dossiers.filter((d) => !estTerminaleLld(d.statut)).length;

  const cartesSansSuivi =
    leads.filter(
      (l) =>
        !estTerminaleLead(l.statut) &&
        sansSuiviPlanifie({
          prochaineActionLe: l.prochaineActionLe,
          dateReactivation: l.dateReactivation,
          terminale: false,
        }),
    ).length +
    opportunites.filter(
      (o) =>
        !estTerminaleOpportunite(o.etape) &&
        sansSuiviPlanifie({ prochaineActionLe: o.prochaineActionLe, terminale: false }),
    ).length +
    dossiers.filter(
      (d) =>
        !estTerminaleLld(d.statut) &&
        sansSuiviPlanifie({
          prochaineActionLe: d.prochaineActionLe,
          prochaineRelanceLe: d.prochaineRelanceLe,
          terminale: false,
        }),
    ).length;

  const couverture =
    cartesOuvertes > 0
      ? Math.round(((cartesOuvertes - cartesSansSuivi) / cartesOuvertes) * 100)
      : 100;

  // --- Pipeline par étape : ventes et LLD séparées -------------------------
  const parEtape = COLONNES_OPPORTUNITE.filter((c) => !c.terminale).map((c) => {
    const lot = opportunites.filter((o) => o.etape === c.cle);
    return {
      libelle: c.libelle,
      nb: lot.length,
      ventes: lot
        .filter((o) => o.projetRecherche !== "LLD")
        .reduce((s, o) => s + Number(o.montantVente ?? 0), 0),
      loyers: lot
        .filter((o) => o.projetRecherche === "LLD")
        .reduce((s, o) => s + Number(o.loyerMensuelEnvisage ?? 0), 0),
    };
  });

  // --- Délai de cycle de vente ---------------------------------------------
  const closes = opportunites.filter((o) => o.dateCloture);
  const cycleMoyen =
    closes.length > 0
      ? closes.reduce(
          (s, o) => s + (o.dateCloture!.getTime() - o.creeLe.getTime()) / 86_400_000,
          0,
        ) / closes.length
      : null;

  const gagnees = opportunites.filter((o) => o.etape === "GAGNE_ACTIF");
  const perdues = opportunites.filter((o) => o.etape === "PERDU_ABANDONNE");
  const tauxReussite =
    gagnees.length + perdues.length > 0
      ? Math.round((gagnees.length / (gagnees.length + perdues.length)) * 100)
      : null;

  // --- Stock LLD par statut ------------------------------------------------
  const stockLld = COLONNES_LLD.map((c) => ({
    libelle: c.libelle,
    nb: dossiers.filter((d) => d.statut === c.cle).length,
    valeur: dossiers
      .filter((d) => d.statut === c.cle)
      .reduce((s, d) => s + Number(d.loyerMensuel ?? 0), 0),
  }));

  // --- Délai de traitement LLD ---------------------------------------------
  const transmis = dossiers.filter((d) => d.dateTransmission);
  const delaiTransmission =
    transmis.length > 0
      ? transmis.reduce(
          (s, d) =>
            s + (d.dateTransmission!.getTime() - d.creeLe.getTime()) / 86_400_000,
          0,
        ) / transmis.length
      : null;

  // --- Qualité des données -------------------------------------------------
  const qualite = {
    sansProchaineAction: cartesSansSuivi,
    dossiersSansResponsable: dossiers.filter((d) => !d.collaboratriceId).length,
    cloturesSansMotif:
      leads.filter((l) => l.statut === "NON_QUALIFIE_CLOTURE" && !l.motifCloture)
        .length +
      opportunites.filter((o) => o.etape === "PERDU_ABANDONNE" && !o.motifCloture)
        .length +
      dossiers.filter((d) => d.statut === "CLOTURE_NON_POURSUIVI" && !d.motifCloture)
        .length,
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-bold tracking-tight">Pilotage</h1>
        <p className="text-xs text-slate-500">
          Ventes directes et LLD suivies séparément. Les indicateurs LLD mesurent la
          complétude du processus Selfizee, jamais une politique de crédit.
        </p>
      </header>

      {/* Réactivité */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tuile
          libelle="Délai de 1re prise en charge"
          valeur={delaiMoyenHeures != null ? `${delaiMoyenHeures.toFixed(1)} h` : "—"}
          aide="Entre création du lead entrant et première activité réalisée."
        />
        <Tuile
          libelle="Délai jusqu'à qualification"
          valeur={delaiQualifMoyen != null ? `${delaiQualifMoyen.toFixed(1)} j` : "—"}
          aide="Entre création du lead et conversion en opportunité."
        />
        <Tuile
          libelle="Couverture d'activité"
          valeur={`${couverture} %`}
          aide="Cartes ouvertes disposant d'une prochaine action datée."
          ton={couverture < 80 ? "alerte" : "normal"}
        />
        <Tuile
          libelle="Délai de cycle de vente"
          valeur={cycleMoyen != null ? `${cycleMoyen.toFixed(0)} j` : "—"}
          aide="Entre création de l'opportunité et issue gagnée / perdue."
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pipeline pondéré */}
        <Bloc titre="Pipeline commercial par étape">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] uppercase text-slate-400 dark:border-slate-800">
                <th className="pb-1 font-medium">Étape</th>
                <th className="pb-1 text-right font-medium">Nb</th>
                <th className="pb-1 text-right font-medium">Ventes</th>
                <th className="pb-1 text-right font-medium">Loyers / mois</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {parEtape.map((e) => (
                <tr key={e.libelle}>
                  <td className="py-1.5">{e.libelle}</td>
                  <td className="py-1.5 text-right tabular-nums">{e.nb}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {e.ventes > 0 ? EUROS.format(e.ventes) : "—"}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-indigo-700 dark:text-indigo-400">
                    {e.loyers > 0 ? EUROS.format(e.loyers) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[10px] italic text-slate-400">
            Les deux colonnes de valeur ne s&apos;additionnent pas.
          </p>
        </Bloc>

        {/* Stock LLD */}
        <Bloc titre="Stock LLD par statut">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] uppercase text-slate-400 dark:border-slate-800">
                <th className="pb-1 font-medium">Statut</th>
                <th className="pb-1 text-right font-medium">Nb</th>
                <th className="pb-1 text-right font-medium">Loyers / mois</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {stockLld
                .filter((s) => s.nb > 0)
                .map((s) => (
                  <tr key={s.libelle}>
                    <td className="py-1.5">{s.libelle}</td>
                    <td className="py-1.5 text-right tabular-nums">{s.nb}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {s.valeur > 0 ? EUROS.format(s.valeur) : "—"}
                    </td>
                  </tr>
                ))}
              {stockLld.every((s) => s.nb === 0) && (
                <tr>
                  <td colSpan={3} className="py-3 text-slate-500">
                    Aucun dossier LLD.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="mt-2 text-[10px] italic text-slate-400">
            Ce tableau mesure l&apos;avancement des dossiers. Il ne constitue pas un
            score d&apos;acceptation.
          </p>
        </Bloc>

        {/* Conversion par canal */}
        <Bloc titre="Leads par canal d'acquisition">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] uppercase text-slate-400 dark:border-slate-800">
                <th className="pb-1 font-medium">Canal</th>
                <th className="pb-1 font-medium">Mode</th>
                <th className="pb-1 text-right font-medium">Leads</th>
                <th className="pb-1 text-right font-medium">Qualifiés</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {[...parCanal.entries()]
                .sort((a, b) => b[1].total - a[1].total)
                .map(([canal, e]) => (
                  <tr key={canal}>
                    <td className="py-1.5">
                      {LIBELLE_CANAL[canal as keyof typeof LIBELLE_CANAL]}
                    </td>
                    <td className="py-1.5 text-xs text-slate-500">{e.mode}</td>
                    <td className="py-1.5 text-right tabular-nums">{e.total}</td>
                    <td className="py-1.5 text-right tabular-nums">{e.qualifies}</td>
                  </tr>
                ))}
              {parCanal.size === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 text-slate-500">
                    Aucun lead.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Bloc>

        {/* Qualité des données */}
        <Bloc titre="Qualité des données">
          <ul className="space-y-1.5 text-sm">
            <LigneQualite
              libelle="Cartes sans prochaine action"
              valeur={qualite.sansProchaineAction}
            />
            <LigneQualite
              libelle="Dossiers LLD sans responsable"
              valeur={qualite.dossiersSansResponsable}
            />
            <LigneQualite
              libelle="Clôtures sans motif"
              valeur={qualite.cloturesSansMotif}
            />
          </ul>
          <p className="mt-2 text-[10px] italic text-slate-400">
            À corriger avant que les reportings deviennent trompeurs.
          </p>
        </Bloc>
      </div>

      {/* Issues et délai LLD */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tuile
          libelle="Opportunités gagnées"
          valeur={String(gagnees.length)}
          aide={
            tauxReussite != null
              ? `${tauxReussite} % des opportunités closes`
              : "Aucune opportunité close."
          }
        />
        <Tuile libelle="Opportunités perdues" valeur={String(perdues.length)} />
        <Tuile
          libelle="Délai création → transmission LLD"
          valeur={
            delaiTransmission != null ? `${delaiTransmission.toFixed(1)} j` : "—"
          }
          aide="Mesure la qualité de préparation du dossier côté Selfizee."
        />
        <Tuile
          libelle="Dossiers LLD en cours"
          valeur={String(dossiers.filter((d) => !estTerminaleLld(d.statut)).length)}
        />
      </section>
    </div>
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
        "rounded-xl border bg-white p-3 dark:bg-slate-900",
        ton === "alerte"
          ? "border-amber-300 dark:border-amber-900"
          : "border-slate-200 dark:border-slate-800",
      ].join(" ")}
    >
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{libelle}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{valeur}</p>
      {aide && <p className="mt-0.5 text-[10px] text-slate-400">{aide}</p>}
    </div>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
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
            ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
        ].join(" ")}
      >
        {valeur}
      </span>
    </li>
  );
}
