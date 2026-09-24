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

export function dateCourte(d: Date | null | undefined): string | null {
  return d ? DATE_COURTE.format(d) : null;
}

export function dateLongue(d: Date | null | undefined): string | null {
  return d ? DATE_LONGUE.format(d) : null;
}

export function dateHeure(d: Date | null | undefined): string | null {
  return d ? DATE_HEURE.format(d) : null;
}

/** Format court pour un champ input[type=date]. */
export function pourInputDate(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

/** « il y a 3 j », « aujourd'hui », « dans 2 j ». */
export function depuis(d: Date | null | undefined, maintenant = new Date()): string | null {
  if (!d) return null;
  const jours = Math.round((d.getTime() - maintenant.getTime()) / 86_400_000);
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
  return [parties.nom, parties.ville, parties.projet]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(" — ");
}
