/**
 * Valeurs du pipeline, affichées séparément (§6, §11).
 *
 * Une vente directe et un total de loyers ne sont pas le même indicateur : ils ne
 * sont jamais additionnés, et aucun total consolidé n'est proposé ici.
 */

const EUROS = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default function ResumeValeurs({
  ventes,
  nbVentes,
  loyersMensuels,
  nbLld,
}: {
  ventes: number;
  nbVentes: number;
  loyersMensuels: number;
  nbLld: number;
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-[10px] uppercase tracking-wide text-slate-500">
          Ventes directes en cours
        </p>
        <p className="text-sm font-semibold">
          {EUROS.format(ventes)}{" "}
          <span className="text-xs font-normal text-slate-500">
            · {nbVentes} opportunité{nbVentes > 1 ? "s" : ""}
          </span>
        </p>
      </div>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 px-3 py-2 dark:border-indigo-900 dark:bg-indigo-950/30">
        <p className="text-[10px] uppercase tracking-wide text-indigo-700 dark:text-indigo-400">
          LLD en cours — loyers mensuels
        </p>
        <p className="text-sm font-semibold">
          {EUROS.format(loyersMensuels)} / mois{" "}
          <span className="text-xs font-normal text-slate-500">
            · {nbLld} dossier{nbLld > 1 ? "s" : ""}
          </span>
        </p>
      </div>

      <p className="self-center text-[10px] italic text-slate-400">
        Les ventes directes et les loyers ne sont pas additionnés : ce sont deux
        indicateurs distincts.
      </p>
    </div>
  );
}
