"use client";

import { useRouter } from "next/navigation";
import type { EtapeCommerciale } from "@prisma/client";
import Tableau, { type ColonneAffichee } from "@/components/Tableau";
import { deplacerOpportunite } from "@/app/actions/opportunites";

export default function TableauVentes({
  colonnes,
}: {
  colonnes: ColonneAffichee<EtapeCommerciale>[];
}) {
  const router = useRouter();

  return (
    <Tableau
      colonnes={colonnes}
      onOuvrir={(id) => router.push(`/ventes/${id}`)}
      onDeplacer={async (id, cible, rang) => {
        const r = await deplacerOpportunite(id, cible, rang);
        if (!r.ok) return r.erreur;
        router.refresh();
        return null;
      }}
    />
  );
}
