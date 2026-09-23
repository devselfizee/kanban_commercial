/**
 * Pipeline n°1 — boîte de qualification des leads (§4).
 *
 * Ce tableau absorbe les entrants et les cibles créées par prospection : les
 * cartes sont les mêmes, seules les règles de priorité diffèrent selon l'origine.
 */

import { prisma } from "@/lib/prisma";
import { utilisateurCourant, voitToutesLesCartes } from "@/lib/session";
import { COLONNES_LEAD } from "@/lib/domaine/pipelines";
import {
  LIBELLE_CANAL,
  LIBELLE_MODE_ACQUISITION,
  LIBELLE_PROJET,
  LIBELLE_SEGMENT,
} from "@/lib/domaine/libelles";
import {
  estEnRetard,
  estTerminaleLead,
  joursDepuis,
  priseEnChargeEnRetard,
  sansSuiviPlanifie,
} from "@/lib/domaine/regles";
import { dateCourte, depuis, titreCarte } from "@/lib/format";
import type { DonneesCarte } from "@/components/Carte";
import TableauLeads from "./TableauLeads";
import EnTetePipeline from "@/components/EnTetePipeline";

export const dynamic = "force-dynamic";

export default async function PageLeads({
  searchParams,
}: {
  searchParams: Promise<{ mien?: string }>;
}) {
  const params = await searchParams;
  const utilisateur = await utilisateurCourant();

  // Le commercial voit ses leads et le pool non attribué ; manager et direction
  // voient l'ensemble.
  const filtreProprietaire =
    utilisateur && !voitToutesLesCartes(utilisateur.role)
      ? {
          OR: [
            { proprietaireId: utilisateur.id },
            { proprietaireId: null },
          ],
        }
      : params.mien === "1" && utilisateur
        ? { proprietaireId: utilisateur.id }
        : {};

  const leads = await prisma.lead.findMany({
    where: filtreProprietaire,
    orderBy: [{ rang: "asc" }, { creeLe: "desc" }],
    include: {
      organisation: { select: { nom: true, ville: true } },
      contactPrincipal: { select: { nom: true, prenom: true } },
      proprietaire: { select: { prenom: true, nom: true } },
      activites: {
        orderBy: { dateReelle: "desc" },
        take: 1,
        select: { objet: true, dateReelle: true },
      },
      _count: { select: { activites: true } },
      opportunite: { select: { reference: true } },
    },
  });

  const maintenant = new Date();

  const cartes: (DonneesCarte & { statut: (typeof leads)[number]["statut"] })[] = leads.map((l) => {
    const terminale = estTerminaleLead(l.statut);
    const derniere = l.activites[0];

    const badges: DonneesCarte["badges"] = [
      {
        texte: LIBELLE_MODE_ACQUISITION[l.modeAcquisition],
        ton:
          l.modeAcquisition === "ENTRANT"
            ? "entrant"
            : l.modeAcquisition === "PROSPECTION"
              ? "prospection"
              : "reactivation",
      },
      { texte: LIBELLE_CANAL[l.canalDetaille] },
    ];
    if (l.segment) badges.push({ texte: LIBELLE_SEGMENT[l.segment] });
    badges.push({ texte: LIBELLE_PROJET[l.projetRecherche] });

    // Délai de première prise en charge dépassé : la carte doit sauter aux yeux.
    if (
      priseEnChargeEnRetard(l.modeAcquisition, l.creeLe, l.premierContactLe, maintenant)
    ) {
      badges.push({
        texte: "Prise en charge en retard",
        ton: "alerte",
        titre: "Aucun premier contact journalisé dans le délai interne.",
      });
    }

    return {
      id: l.id,
      statut: l.statut,
      reference: l.reference,
      titre: titreCarte({
        nom: l.organisation?.nom ?? l.nomBrut,
        ville: l.ville ?? l.organisation?.ville,
        projet: l.besoinResume,
      }),
      badges,
      contact: l.contactPrincipal
        ? `${l.contactPrincipal.prenom ?? ""} ${l.contactPrincipal.nom}`.trim()
        : (l.emailBrut ?? l.telephoneBrut),
      echeance: l.dateReactivation
        ? `Réactivation ${dateCourte(l.dateReactivation)}`
        : l.horizonIndicatif,
      derniereActivite: derniere
        ? `${derniere.objet} · ${depuis(derniere.dateReelle, maintenant)}`
        : null,
      prochaineAction: l.prochaineActionLe
        ? {
            label: l.prochaineActionLabel ?? "Action planifiée",
            date: dateCourte(l.prochaineActionLe)!,
            enRetard: estEnRetard(l.prochaineActionLe, maintenant),
          }
        : null,
      ageEtape: joursDepuis(l.entreEnEtapeLe, maintenant),
      priorite: l.priorite,
      responsable: l.proprietaire
        ? `${l.proprietaire.prenom} ${l.proprietaire.nom}`
        : null,
      sansSuivi: sansSuiviPlanifie({
        prochaineActionLe: l.prochaineActionLe,
        dateReactivation: l.dateReactivation,
        terminale,
      }),
      nbActivites: l._count.activites,
    };
  });

  const colonnes = COLONNES_LEAD.map((colonne) => ({
    colonne,
    cartes: cartes.filter((c) => c.statut === colonne.cle),
  }));

  const sansSuivi = cartes.filter((c) => c.sansSuivi).length;

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <EnTetePipeline
        titre="Leads à qualifier"
        sousTitre="Répondre vite, comprendre le besoin, décider si le lead mérite une opportunité."
        total={cartes.length}
        sansSuivi={sansSuivi}
        actionNouveau={{ href: "/leads/nouveau", libelle: "Nouveau lead" }}
      />
      <TableauLeads colonnes={colonnes} />
    </div>
  );
}
