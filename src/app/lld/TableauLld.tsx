"use client";

import { useRouter } from "next/navigation";
import type { StatutLld } from "@prisma/client";
import Tableau, { type ColonneAffichee } from "@/components/Tableau";
import { deplacerDossierLld } from "@/app/actions/lld";

export default function TableauLld({
  colonnes,
}: {
  colonnes: ColonneAffichee<StatutLld>[];
}) {
  const router = useRouter();

  return (
    <Tableau
      colonnes={colonnes}
      onOuvrir={(id) => router.push(`/lld/${id}`)}
      onDeplacer={async (id, cible, rang) => {
        const r = await deplacerDossierLld(id, cible, rang);
        if (!r.ok) return r.erreur;
        router.refresh();
        return null;
      }}
    />
  );
}
