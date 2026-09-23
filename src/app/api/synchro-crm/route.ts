/**
 * Drainage de la queue CRM.
 *
 * Appelée périodiquement (tâche planifiée Coolify, cron, ou bouton de la page
 * d'administration). Chaque appel consomme un lot de messages et s'arrête :
 * pas de processus résident à surveiller.
 *
 * L'accès est protégé par un secret partagé, sans quoi n'importe qui pourrait
 * déclencher des écritures en base.
 */

import { NextResponse } from "next/server";
import { configDepuisEnv, lireMessages, profondeurQueue } from "@/lib/crm/rabbitmq";
import { appliquerEvenement } from "@/lib/crm/synchronisation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Taille d'un lot : borne la durée d'un appel. */
const LOT = 50;

function autorise(requete: Request): boolean {
  const attendu = process.env.SYNCHRO_SECRET;
  // Sans secret configuré, la route reste fermée : mieux vaut une synchro
  // inactive qu'un point d'écriture ouvert.
  if (!attendu) return false;

  const fourni =
    requete.headers.get("x-synchro-secret") ??
    requete.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  return fourni === attendu;
}

export async function POST(requete: Request) {
  if (!autorise(requete)) {
    return NextResponse.json(
      { erreur: "Non autorisé." },
      { status: 401 },
    );
  }

  const config = configDepuisEnv();
  if (!config) {
    return NextResponse.json(
      {
        erreur:
          "Bus non configuré : renseignez RABBITMQ_MGMT_URL, RABBITMQ_USER et RABBITMQ_PASSWORD.",
      },
      { status: 503 },
    );
  }

  const debut = Date.now();
  const messages = await lireMessages(config, LOT);

  const bilan = {
    lus: messages.length,
    crees: 0,
    misAJour: 0,
    ignores: 0,
    erreurs: 0,
    details: [] as string[],
  };

  for (const message of messages) {
    const issue = await appliquerEvenement({
      routingKey: message.routingKey,
      charge: message.charge,
    });

    switch (issue.resultat) {
      case "CREE":
        bilan.crees += 1;
        break;
      case "MIS_A_JOUR":
        bilan.misAJour += 1;
        break;
      case "ERREUR":
        bilan.erreurs += 1;
        bilan.details.push(`${message.routingKey} : ${issue.detail}`);
        break;
      default:
        bilan.ignores += 1;
    }
  }

  const restants = await profondeurQueue(config);

  return NextResponse.json({
    ...bilan,
    restants,
    dureeMs: Date.now() - debut,
    // Indique à l'appelant qu'un nouvel appel immédiat est utile.
    encoreATraiter: (restants ?? 0) > 0,
  });
}

/** État de la synchronisation, sans rien consommer. */
export async function GET(requete: Request) {
  if (!autorise(requete)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  const config = configDepuisEnv();
  if (!config) {
    return NextResponse.json({ configure: false }, { status: 200 });
  }

  return NextResponse.json({
    configure: true,
    queue: config.queue,
    exchange: config.exchange,
    liaisons: config.liaisons,
    enAttente: await profondeurQueue(config),
  });
}
