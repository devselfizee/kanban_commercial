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
      // La création part toujours du formulaire : les champs obligatoires du §8
      // ne peuvent pas être saisis dans une carte vide.
      onAjouter={(cible) => router.push(`/leads/nouveau?statut=${cible}`)}
      onDeplacer={async (id, cible, rang) => {
        const r = await deplacerLead(id, cible, rang);
        if (!r.ok) return r.erreur;
        router.refresh();
        return null;
      }}
    />
  );
}
