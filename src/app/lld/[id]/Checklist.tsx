"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { basculerChecklist } from "@/app/actions/lld";
import { dateCourte } from "@/lib/format";

export default function Checklist({
  items,
  modifiable,
}: {
  items: {
    id: string;
    libelle: string;
    fait: boolean;
    faitLe: Date | null;
    faitPar: string | null;
  }[];
  modifiable: boolean;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();

  const faits = items.filter((i) => i.fait).length;

  return (
    <div className={enCours ? "opacity-60" : undefined}>
      <div className="mb-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${items.length ? (faits / items.length) * 100 : 0}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-slate-500">
          {faits}/{items.length}
        </span>
      </div>

      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.id}>
            <label className="flex items-start gap-2 rounded-md px-1 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
              <input
                type="checkbox"
                checked={i.fait}
                disabled={!modifiable || enCours}
                onChange={(e) => {
                  const fait = e.target.checked;
                  demarrer(async () => {
                    await basculerChecklist(i.id, fait);
                    router.refresh();
                  });
                }}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 disabled:opacity-50"
              />
              <span className={i.fait ? "text-slate-500 line-through" : undefined}>
                {i.libelle}
                {i.fait && i.faitPar && (
                  <span className="ml-2 text-[10px] text-slate-400">
                    {i.faitPar} · {dateCourte(i.faitLe)}
                  </span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
