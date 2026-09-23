"use client";

import { useRouter } from "next/navigation";
import type { StatutLead } from "@prisma/client";
import Tableau, { type ColonneAffichee } from "@/components/Tableau";
import { deplacerLead } from "@/app/actions/leads";

export default function TableauLeads({
  colonnes,
}: {
  colonnes: ColonneAffichee<StatutLead>[];
}) {
  const router = useRouter();

  return (
    <Tableau
      colonnes={colonnes}
      onOuvrir={(id) => router.push(`/leads/${id}`)}
      onDeplacer={async (id, cible, rang) => {
        const r = await deplacerLead(id, cible, rang);
        if (!r.ok) return r.erreur;
        router.refresh();
        return null;
      }}
    />
  );
}
