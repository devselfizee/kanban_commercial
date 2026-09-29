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
import { Bloc, Tuile } from "@/composants/TableauBord";
import {
  IconeBoite,
  IconeCalendrier,
  IconeCoche,
  IconeEntonnoir,
  IconeEuro,
  IconeGraphique,
  IconeGroupe,
  IconeHorloge,
  IconePersonne,
  IconePourcent,
} from "@/composants/Icones";
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
  /** `valeur` : loyers mensuels ; `montantFinance` : montant financé. */
  stockLld: { statut: StatutLld; nb: number; valeur: number; montantFinance: number }[];
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
      <header className="flex items-start gap-3">
        <span className="mt-0.5 text-[var(--selfizee-600)]">
          <IconeGraphique className="h-7 w-7" />
        </span>
        <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--texte-fort)]">
          Pilotage
        </h1>
        <p className="text-xs text-[var(--texte-doux)]">
          Ventes directes et LLD suivies séparément. Les indicateurs LLD mesurent
          la complétude du processus Selfizee, jamais une politique de crédit.
        </p>
        </div>
      </header>

      {/* Réactivité */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tuile
          libelle="Délai de 1re prise en charge"
          valeur={
            d.delaiMoyenHeures != null ? `${d.delaiMoyenHeures.toFixed(1)} h` : "—"
          }
          aide="Entre création du lead entrant et première activité réalisée."
          icone={<IconePersonne />}
          teinte="bleu"
        />
        <Tuile
          libelle="Délai jusqu'à qualification"
          valeur={
            d.delaiQualifMoyen != null ? `${d.delaiQualifMoyen.toFixed(1)} j` : "—"
          }
          aide="Entre création du lead et conversion en opportunité."
          icone={<IconeHorloge />}
          teinte="vert"
        />
        <Tuile
          libelle="Couverture d'activité"
          valeur={`${d.couverture} %`}
          aide="Cartes ouvertes disposant d'une prochaine action datée."
          ton={d.couverture < 80 ? "alerte" : "normal"}
          icone={<IconePourcent />}
          teinte="rose"
        />
        <Tuile
          libelle="Délai de cycle de vente"
          valeur={d.cycleMoyen != null ? `${d.cycleMoyen.toFixed(0)} j` : "—"}
          aide="Entre création de l'opportunité et issue gagnée / perdue."
          icone={<IconeCalendrier />}
          teinte="orange"
        />
      </section>

      <AffairesSignees donnees={d.affairesSignees} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Bloc titre="Pipeline commercial par étape" icone={<IconeEntonnoir className="h-4 w-4" />}>
          <BarresParEtape etapes={d.parEtape} />
        </Bloc>

        <Bloc titre="Stock LLD par statut" icone={<IconeBoite className="h-4 w-4" />}>
          <StockLld stock={d.stockLld} />
        </Bloc>

        <Bloc titre="Leads par canal d'acquisition" icone={<IconePersonne className="h-4 w-4" />}>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[22rem] text-sm">
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
          </div>
        </Bloc>

        <Bloc titre="Qualité des données" icone={<IconeCoche className="h-4 w-4" />}>
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

/** Séries du pipeline — validées au script : séparation daltonisme ≥ 20. */
const SERIE = { nb: "#dd0049", ventes: "#2a78d6", loyers: "#eda100" } as const;

/**
 * Pipeline commercial par étape (§11).
 *
 * La maquette posait nombre, ventes et loyers sur un même axe : des centaines
 * de cartes à côté de dizaines de milliers d'euros, et des ventes à côté de
 * loyers mensuels, que le document interdit de comparer. Chaque mesure a donc
 * sa colonne et sa propre échelle — trois petits graphiques qui partagent les
 * étapes. La valeur est écrite à côté de chaque barre : l'ambre, trop pâle sur
 * fond blanc pour se lire seul, n'est jamais la seule façon de la lire.
 */
function BarresParEtape({ etapes }: { etapes: Reponse["parEtape"] }) {
  if (etapes.length === 0) {
    return <p className="text-sm text-[var(--texte-doux)]">Aucune opportunité.</p>;
  }

  const colonnes = [
    { cle: "nb", libelle: "Nombre", format: (v: number) => String(v) },
    { cle: "ventes", libelle: "Ventes", format: (v: number) => euros(v) ?? "—" },
    { cle: "loyers", libelle: "Loyers / mois", format: (v: number) => euros(v) ?? "—" },
  ] as const;
  const maxi = {
    nb: Math.max(1, ...etapes.map((e) => e.nb)),
    ventes: Math.max(1, ...etapes.map((e) => e.ventes)),
    loyers: Math.max(1, ...etapes.map((e) => e.loyers)),
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[34rem]">
        {/* Légende : chaque colonne est nommée, la couleur ne porte rien seule. */}
        <div className="mb-2 grid grid-cols-[9rem_1fr_1fr_1fr] gap-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--texte-doux)]">
          <span>Étape</span>
          {colonnes.map((c) => (
            <span key={c.cle} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: SERIE[c.cle] }}
                aria-hidden
              />
              {c.libelle}
            </span>
          ))}
        </div>

        <ul className="space-y-1">
          {etapes.map((e) => (
            <li
              key={e.etape}
              className="grid grid-cols-[9rem_1fr_1fr_1fr] items-center gap-3 rounded-md px-1 py-1 hover:bg-[var(--fond-colonne)]"
              title={`${LIBELLE_ETAPE[e.etape]} — ${e.nb} opportunité(s), ventes ${
                euros(e.ventes) ?? "—"
              }, loyers ${euros(e.loyers) ?? "—"} / mois`}
            >
              <span className="truncate text-xs text-[var(--texte-fort)]">
                {LIBELLE_ETAPE[e.etape]}
              </span>
              {colonnes.map((c) => {
                const v = e[c.cle];
                return (
                  <span key={c.cle} className="flex items-center gap-2">
                    <span className="h-2.5 flex-1 overflow-hidden rounded-r bg-transparent">
                      {v > 0 && (
                        <span
                          className="block h-full rounded-r"
                          style={{
                            width: `${Math.max(3, (v / maxi[c.cle]) * 100)}%`,
                            background: SERIE[c.cle],
                          }}
                        />
                      )}
                    </span>
                    <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-[var(--texte)]">
                      {v > 0 ? c.format(v) : "—"}
                    </span>
                  </span>
                );
              })}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-2 text-[10px] italic text-[var(--texte-tres-doux)]">
        Chaque colonne a sa propre échelle. Ventes et loyers ne s'additionnent pas.
      </p>
    </div>
  );
}

/**
 * Stock LLD, regroupé comme sur la maquette en quatre familles, avec le détail
 * des colonnes du tableau LLD dessous (§11 : « dans chaque colonne LLD »).
 *
 * Les couleurs suivent l'état du dossier, toujours accompagnées du libellé.
 * « Clôturé » reste neutre : un dossier non poursuivi n'est pas une alerte.
 */
const FAMILLES_LLD: {
  libelle: string;
  couleur: string;
  statuts: StatutLld[];
}[] = [
  {
    libelle: "En cours chez Selfizee",
    couleur: "#2a78d6",
    statuts: [
      "LLD_A_ETUDIER",
      "DOSSIER_A_PREPARER",
      "EN_ATTENTE_ELEMENTS_CLIENT",
      "PRET_A_TRANSMETTRE",
      "CONTRAT_A_SIGNER",
      "SIGNE_LIVRAISON_A_CONFIRMER",
    ],
  },
  {
    libelle: "En attente de GRENKE",
    couleur: "#eda100",
    statuts: [
      "TRANSMIS_A_GRENKE",
      "RETOUR_ANALYSE_EN_ATTENTE",
      "REPONSE_COMMUNIQUEE_PAR_GRENKE",
    ],
  },
  {
    libelle: "Contrat actif",
    couleur: "#008300",
    statuts: ["LIVRAISON_CONFIRMEE_CONTRAT_ACTIF"],
  },
  {
    libelle: "Clôturé — non poursuivi",
    couleur: "#9ca3af",
    statuts: ["CLOTURE_NON_POURSUIVI"],
  },
];

function StockLld({ stock }: { stock: Reponse["stockLld"] }) {
  const parStatut = new Map(stock.map((s) => [s.statut, s]));
  const total = stock.reduce(
    (t, s) => ({
      nb: t.nb + s.nb,
      montant: t.montant + s.montantFinance,
      loyers: t.loyers + s.valeur,
    }),
    { nb: 0, montant: 0, loyers: 0 },
  );

  if (stock.length === 0) {
    return <p className="text-sm text-[var(--texte-doux)]">Aucun dossier LLD.</p>;
  }

  const cellule = "py-1.5 text-right tabular-nums";

  return (
    <>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[22rem] text-sm">
        <thead>
          <tr className="bg-[var(--fond-colonne)] text-[10px] font-semibold uppercase tracking-wide text-[var(--texte-doux)]">
            <th className="rounded-l-md px-2 py-1.5 text-left">Statut</th>
            <th className="px-2 py-1.5 text-right">Nb</th>
            <th className="px-2 py-1.5 text-right">Montant financé</th>
            <th className="rounded-r-md px-2 py-1.5 text-right">Loyers / mois</th>
          </tr>
        </thead>
        <tbody>
          {FAMILLES_LLD.map((f) => {
            const lignes = f.statuts
              .map((s) => parStatut.get(s))
              .filter((s): s is NonNullable<typeof s> => !!s);
            if (lignes.length === 0) return null;
            const nb = lignes.reduce((t, s) => t + s.nb, 0);
            const montant = lignes.reduce((t, s) => t + s.montantFinance, 0);
            const loyers = lignes.reduce((t, s) => t + s.valeur, 0);
            return [
              <tr key={f.libelle} className="border-t border-[var(--trait)]">
                <td className="px-2 py-1.5 font-medium text-[var(--texte-fort)]">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: f.couleur }}
                      aria-hidden
                    />
                    {f.libelle}
                  </span>
                </td>
                <td className={`px-2 ${cellule} font-medium`}>{nb}</td>
                <td className={`px-2 ${cellule}`}>{montant > 0 ? euros(montant) : "—"}</td>
                <td className={`px-2 ${cellule}`}>{loyers > 0 ? euros(loyers) : "—"}</td>
              </tr>,
              // Le détail par colonne du tableau LLD, en retrait.
              ...(lignes.length > 1
                ? lignes.map((s) => (
                    <tr key={s.statut} className="text-xs text-[var(--texte-doux)]">
                      <td className="py-1 pl-7 pr-2">{LIBELLE_STATUT_LLD[s.statut]}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{s.nb}</td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {s.montantFinance > 0 ? euros(s.montantFinance) : "—"}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {s.valeur > 0 ? euros(s.valeur) : "—"}
                      </td>
                    </tr>
                  ))
                : []),
            ];
          })}
          <tr className="border-t-2 border-[var(--trait-fort)] font-semibold text-[var(--texte-fort)]">
            <td className="px-2 py-1.5">Total</td>
            <td className={`px-2 ${cellule}`}>{total.nb}</td>
            <td className={`px-2 ${cellule}`}>{total.montant > 0 ? euros(total.montant) : "—"}</td>
            <td className={`px-2 ${cellule}`}>{total.loyers > 0 ? euros(total.loyers) : "—"}</td>
          </tr>
        </tbody>
      </table>
      </div>
      <p className="mt-2 text-[10px] italic text-[var(--texte-tres-doux)]">
        Mesure l'avancement des dossiers, jamais un score d'acceptation. Montant
        financé et loyers ne s'additionnent pas.
      </p>
    </>
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
          aide={`${cumul.lldNb} devis signés, facturés à GRENKE.`}
          icone={<IconeEuro />}
          teinte="violet"
        />
        <Tuile
          libelle="Autres affaires signées — 12 mois"
          valeur={euros(cumul.autresHt) ?? "—"}
          aide={`${cumul.autresNb} devis signés : ventes et locations directes.`}
          icone={<IconeGroupe />}
          teinte="turquoise"
        />
      </div>

      <Bloc titre="Affaires signées par mois" icone={<IconeCalendrier className="h-4 w-4" />}>
        <div className="overflow-x-auto">
          {/* Chaque série a son groupe de deux colonnes — nombre et montant —
              séparé de l'autre par un filet : les deux ne se lisent jamais
              comme une seule colonne à additionner. */}
          <table className="w-full min-w-[30rem] text-sm tabular-nums">
            <colgroup>
              <col />
              <col className="w-20" />
              <col className="w-36" />
              <col className="w-20" />
              <col className="w-36" />
            </colgroup>
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texte-doux)]">
                <th rowSpan={2} className="rounded-l-md bg-[var(--fond-colonne)] px-2 py-1.5 text-left align-bottom">
                  Mois
                </th>
                <th colSpan={2} className="bg-[var(--fond-colonne)] px-2 pt-1.5 text-center">
                  Location financière GRENKE
                </th>
                <th colSpan={2} className="rounded-r-md border-l border-[var(--trait)] bg-[var(--fond-colonne)] px-2 pt-1.5 text-center">
                  Autres affaires
                </th>
              </tr>
              <tr className="text-[10px] font-medium text-[var(--texte-tres-doux)]">
                <th className="bg-[var(--fond-colonne)] px-2 pb-1.5 text-right font-medium">Devis</th>
                <th className="bg-[var(--fond-colonne)] px-2 pb-1.5 text-right font-medium">Montant HT</th>
                <th className="border-l border-[var(--trait)] bg-[var(--fond-colonne)] px-2 pb-1.5 text-right font-medium">Devis</th>
                <th className="rounded-br-md bg-[var(--fond-colonne)] px-2 pb-1.5 text-right font-medium">Montant HT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--trait)]">
              {[...mois].reverse().map((m) => (
                <tr key={m.mois} className="hover:bg-[var(--fond-colonne)]">
                  <td className="whitespace-nowrap px-2 py-1.5 text-[var(--texte-fort)]">
                    {libelleMois(m.mois)}
                    {m.mois === moisCourant && (
                      <span className="ml-1.5 text-[10px] text-[var(--texte-tres-doux)]">
                        en cours
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right text-[var(--texte-doux)]">
                    {m.lldNb || "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right font-medium text-[var(--texte-fort)]">
                    {m.lldNb ? euros(m.lldHt) : "—"}
                  </td>
                  <td className="border-l border-[var(--trait)] px-2 py-1.5 text-right text-[var(--texte-doux)]">
                    {m.autresNb || "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right font-medium text-[var(--texte-fort)]">
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
