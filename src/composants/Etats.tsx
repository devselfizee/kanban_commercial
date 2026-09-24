/**
 * États de chargement et d'erreur.
 *
 * Le rendu côté serveur les rendait inutiles ; ils sont indispensables ici, et
 * doivent rester discrets pour ne pas faire clignoter l'interface à chaque
 * navigation.
 */

export function Chargement({ quoi = "les données" }: { quoi?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <p className="text-sm text-[var(--texte-doux)]">Chargement de {quoi}…</p>
    </div>
  );
}

export function Erreur({
  message,
  onReessayer,
}: {
  message: string;
  onReessayer?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-[var(--alerte-bord)] bg-[var(--alerte-fond)] px-4 py-3 text-sm text-[var(--alerte-texte)]"
    >
      <p>{message}</p>
      {onReessayer && (
        <button
          onClick={onReessayer}
          className="mt-2 text-xs font-semibold underline"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}
