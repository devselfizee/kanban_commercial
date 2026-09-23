/**
 * Vérification de la logique de synchronisation, sans bus.
 *
 * Injecte des événements représentatifs directement dans `appliquerEvenement()`
 * et contrôle les garanties annoncées : création, mise à jour, idempotence,
 * rejet d'un événement périmé, rapprochement d'une fiche saisie à la main,
 * et préservation du travail commercial.
 *
 *   npx tsx scripts/test-synchro.ts
 */

import { PrismaClient } from "@prisma/client";
import { appliquerEvenement } from "../src/lib/crm/synchronisation";

const prisma = new PrismaClient();

let reussis = 0;
let echoues = 0;

function verifier(intitule: string, condition: boolean, constate?: string) {
  if (condition) {
    console.log(`  ✓ ${intitule}`);
    reussis += 1;
  } else {
    console.log(`  ✗ ${intitule}${constate ? ` — constaté : ${constate}` : ""}`);
    echoues += 1;
  }
}

const clientBase = {
  id: 990001,
  client_type: "corporation",
  enseigne: "Château de Test",
  nom: "Dupont",
  prenom: "Jean",
  email: "contact@chateau-test.fr",
  telephone: "0297112233",
  siret: "12345678900011",
  ville: "Vannes",
  cp: "56000",
  adresse: "1 rue des Essais",
  deleted: 0,
  modified: "2026-09-20 10:00:00",
};

async function nettoyer() {
  await prisma.evenementCrm.deleteMany({
    where: { idCrm: { in: [990001, 990002, 990003] } },
  });
  await prisma.contact.deleteMany({ where: { idCrm: { in: [990003] } } });
  await prisma.organisation.deleteMany({
    where: { OR: [{ idCrm: { in: [990001, 990002] } }, { nom: { startsWith: "Château de Test" } }, { nom: "Camping Saisi Main" }] },
  });
}

async function main() {
  await nettoyer();

  // --- 1. Création -------------------------------------------------------
  console.log("\n1. Création d'une organisation");
  let r = await appliquerEvenement({
    routingKey: "crm.clients.inserted",
    charge: { ...clientBase },
  });
  verifier("l'organisation est créée", r.resultat === "CREE", r.detail);

  const creee = await prisma.organisation.findUnique({ where: { idCrm: 990001 } });
  verifier("le nom vient de l'enseigne", creee?.nom === "Château de Test", creee?.nom);
  verifier("le SIREN est dérivé du SIRET", creee?.siren === "123456789", creee?.siren ?? "null");
  verifier(
    "le téléphone est normalisé en E.164",
    creee?.telephone === "+33297112233",
    creee?.telephone ?? "null",
  );
  verifier("une référence ORG est attribuée", /^ORG-\d{4}-\d{5}$/.test(creee?.reference ?? ""), creee?.reference);

  // --- 2. Idempotence ----------------------------------------------------
  console.log("\n2. Relivraison du même message");
  r = await appliquerEvenement({
    routingKey: "crm.clients.inserted",
    charge: { ...clientBase },
  });
  verifier(
    "le doublon de livraison est écarté",
    r.detail.includes("déjà traité"),
    r.detail,
  );
  const compte = await prisma.organisation.count({ where: { idCrm: 990001 } });
  verifier("aucune organisation en double", compte === 1, String(compte));

  // --- 3. Le travail commercial n'est pas écrasé -------------------------
  console.log("\n3. Mise à jour : préservation du travail commercial");
  await prisma.organisation.update({
    where: { idCrm: 990001 },
    data: { segment: "LIEU_DE_RECEPTION", notes: "Visité au salon de Rennes" },
  });

  r = await appliquerEvenement({
    routingKey: "crm.clients.updated",
    charge: { ...clientBase, ville: "Sarzeau", modified: "2026-09-21 09:00:00" },
  });
  verifier("la mise à jour est appliquée", r.resultat === "MIS_A_JOUR", r.detail);

  const maj = await prisma.organisation.findUnique({ where: { idCrm: 990001 } });
  verifier("la ville est actualisée depuis le CRM", maj?.ville === "Sarzeau", maj?.ville ?? "null");
  verifier(
    "le segment affiné par le commercial est conservé",
    maj?.segment === "LIEU_DE_RECEPTION",
    maj?.segment,
  );
  verifier(
    "les notes commerciales sont conservées",
    maj?.notes === "Visité au salon de Rennes",
    maj?.notes ?? "null",
  );

  // --- 4. Événement périmé ------------------------------------------------
  console.log("\n4. Événement livré dans le désordre");
  r = await appliquerEvenement({
    routingKey: "crm.clients.updated",
    charge: { ...clientBase, ville: "ANCIENNE VILLE", modified: "2026-09-19 08:00:00" },
  });
  verifier("l'événement antérieur est ignoré", r.resultat === "IGNORE_PERIME", r.detail);

  const apres = await prisma.organisation.findUnique({ where: { idCrm: 990001 } });
  verifier("la ville récente est préservée", apres?.ville === "Sarzeau", apres?.ville ?? "null");

  // --- 5. Rapprochement d'une fiche saisie à la main ---------------------
  console.log("\n5. Rapprochement sans doublon");
  await prisma.organisation.create({
    data: {
      reference: "ORG-TEST-99999",
      nom: "Camping Saisi Main",
      segment: "HOTEL_CAMPING",
      siren: "987654321",
      ville: "Quiberon",
    },
  });

  r = await appliquerEvenement({
    routingKey: "crm.clients.updated",
    charge: {
      ...clientBase,
      id: 990002,
      enseigne: "Camping des Flots",
      siret: "98765432100022",
      email: "flots@test.fr",
      modified: "2026-09-22 10:00:00",
    },
  });
  verifier("la fiche existante est rapprochée", r.resultat === "MIS_A_JOUR", r.detail);

  const rapprochee = await prisma.organisation.findUnique({ where: { idCrm: 990002 } });
  verifier(
    "c'est bien la fiche saisie à la main qui est liée",
    rapprochee?.reference === "ORG-TEST-99999",
    rapprochee?.reference ?? "null",
  );
  const doublons = await prisma.organisation.count({ where: { siren: "987654321" } });
  verifier("aucun doublon créé", doublons === 1, String(doublons));

  // --- 6. Contact --------------------------------------------------------
  console.log("\n6. Contact rattaché");
  r = await appliquerEvenement({
    routingKey: "crm.client_contacts.inserted",
    charge: {
      id: 990003,
      client_id: 990001,
      nom: "Morvan",
      prenom: "Yann",
      position: "Directeur",
      email: "y.morvan@chateau-test.fr",
      tel: "0612345678", // colonne `tel`, pas `telephone`
      optin: 1,
      modified: "2026-09-22 11:00:00",
    },
  });
  verifier("le contact est créé", r.resultat === "CREE", r.detail);

  const contact = await prisma.contact.findUnique({ where: { idCrm: 990003 } });
  verifier(
    "le téléphone est lu depuis la colonne `tel`",
    contact?.telephone === "+33612345678",
    contact?.telephone ?? "null",
  );
  verifier("la fonction est reprise depuis `position`", contact?.role === "Directeur", contact?.role ?? "null");
  verifier("l'optin est respecté", contact?.accepteEmail === true, String(contact?.accepteEmail));
  verifier(
    "le contact est rattaché à la bonne organisation",
    contact?.organisationId === creee?.id,
    contact?.organisationId ?? "null",
  );

  // --- 7. Contact orphelin -----------------------------------------------
  console.log("\n7. Contact dont l'organisation est inconnue");
  r = await appliquerEvenement({
    routingKey: "crm.client_contacts.inserted",
    charge: {
      id: 990004,
      client_id: 888888, // inexistant
      nom: "Orphelin",
      modified: "2026-09-22 12:00:00",
    },
  });
  verifier("l'erreur est signalée sans planter", r.resultat === "ERREUR", r.detail);

  // --- 8. Suppression ----------------------------------------------------
  console.log("\n8. Suppression côté CRM");
  r = await appliquerEvenement({
    routingKey: "crm.clients.deleted",
    charge: { ...clientBase, deleted: 1, modified: "2026-09-23 10:00:00" },
  });
  verifier("la suppression est traitée", r.resultat === "IGNORE_SUPPRIME", r.detail);

  const detachee = await prisma.organisation.findFirst({
    where: { reference: creee!.reference },
  });
  verifier("la fiche est conservée, pas effacée", detachee != null);
  verifier("le lien au CRM est rompu", detachee?.idCrm === null, String(detachee?.idCrm));

  // --- Bilan --------------------------------------------------------------
  await nettoyer();
  await prisma.evenementCrm.deleteMany({ where: { idCrm: 990004 } });

  console.log(`\n${reussis} vérifications réussies, ${echoues} en échec.`);
  if (echoues > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
