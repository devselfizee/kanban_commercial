/**
 * Formatage des valeurs affichées.
 *
 * Les montants sont tenus séparément selon leur nature (vente, mise en place,
 * loyer) : on ne les additionne jamais automatiquement (§6).
 */


const EUROS = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const DATE_COURTE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
});

const DATE_LONGUE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const DATE_HEURE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function euros(valeur: number | null | undefined): string | null {
  if (valeur == null) return null;
  return EUROS.format(Number(valeur));
}

/**
 * Une date, quelle que soit sa forme d'arrivée.
 *
 * L'API renvoie des chaînes ISO, le code local manipule des `Date`. Convertir
 * ici plutôt qu'à chaque appel évite l'oubli silencieux — une chaîne passée à
 * `Intl.format` lève une exception et blanchit la page.
 *
 * Une date invalide renvoie `null` plutôt que « Invalid Date » : mieux vaut un
 * champ vide qu'un message incompréhensible.
 */
export type DateEntrante = Date | string | null | undefined;

function versDate(d: DateEntrante): Date | null {
  if (d == null) return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dateCourte(d: DateEntrante): string | null {
  const date = versDate(d);
  return date ? DATE_COURTE.format(date) : null;
}

export function dateLongue(d: DateEntrante): string | null {
  const date = versDate(d);
  return date ? DATE_LONGUE.format(date) : null;
}

export function dateHeure(d: DateEntrante): string | null {
  const date = versDate(d);
  return date ? DATE_HEURE.format(date) : null;
}

/** Format court pour un champ input[type=date]. */
export function pourInputDate(d: DateEntrante): string {
  const date = versDate(d);
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

/** « il y a 3 j », « aujourd'hui », « dans 2 j ». */
export function depuis(
  d: DateEntrante,
  maintenant = new Date(),
): string | null {
  const date = versDate(d);
  if (!date) return null;
  const jours = Math.round(
    (date.getTime() - maintenant.getTime()) / 86_400_000,
  );
  if (jours === 0) return "aujourd'hui";
  if (jours === 1) return "demain";
  if (jours === -1) return "hier";
  return jours > 0 ? `dans ${jours} j` : `il y a ${-jours} j`;
}

/**
 * Titre de carte recommandé : Organisation ou nom du particulier — ville — projet.
 * Exemple : « Hôtel Ker Ar Mor — Vannes — borne photo permanente ».
 */
export function titreCarte(parties: {
  nom?: string | null;
  ville?: string | null;
  projet?: string | null;
}): string {
  // Le projet est tronqué : une carte se lit en trois secondes (§3), et une
  // donnée importée trop longue ne doit jamais l'envahir. Le texte complet
  // reste sur la fiche.
  const projet = parties.projet?.replace(/\s+/g, " ").trim();
  const projetCourt =
    projet && projet.length > 90 ? `${projet.slice(0, 89).trimEnd()}…` : projet;
  return [parties.nom, parties.ville, projetCourt]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(" — ");
}
