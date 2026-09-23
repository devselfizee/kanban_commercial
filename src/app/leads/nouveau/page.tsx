/**
 * Création d'un lead.
 *
 * Seuls les champs exigés à la création par le §8 sont obligatoires : origine,
 * canal, identité, un moyen de contact, un responsable et une prochaine action
 * datée. Le reste peut être complété au fil de la qualification — exiger trop
 * tôt ralentirait la saisie sans fiabiliser quoi que ce soit.
 */

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/session";
import FormulaireLead from "./FormulaireLead";

export const dynamic = "force-dynamic";

export default async function PageNouveauLead() {
  const utilisateur = await utilisateurCourant();

  const [equipe, organisations] = await Promise.all([
    prisma.utilisateur.findMany({
      where: { actif: true, role: { in: ["COMMERCIAL", "MANAGER"] } },
      select: { id: true, prenom: true, nom: true },
      orderBy: { nom: "asc" },
    }),
    prisma.organisation.findMany({
      where: { fusionneeDansId: null },
      select: { id: true, nom: true, ville: true },
      orderBy: { nom: "asc" },
      take: 500,
    }),
  ]);

  if (!utilisateur) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--trait)] bg-white p-6">
        <p className="text-sm text-[var(--texte-doux)]">
          Choisissez un utilisateur dans la barre du haut avant de créer un lead :
          c&apos;est lui qui sera journalisé comme auteur.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <Link
          href="/leads"
          className="text-xs text-[var(--texte-doux)] hover:text-[var(--selfizee-600)] hover:underline"
        >
          ← Leads à qualifier
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--texte-fort)]">
          Nouveau lead
        </h1>
        <p className="mt-1 text-sm text-[var(--texte-doux)]">
          Une carte n&apos;est jamais créée sans responsable ni prochaine action
          datée.
        </p>
      </div>

      <FormulaireLead
        equipe={equipe}
        organisations={organisations}
        moiId={utilisateur.id}
      />
    </div>
  );
}
