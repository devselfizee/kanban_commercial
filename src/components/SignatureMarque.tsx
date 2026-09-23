/**
 * Signature de marque : la forme arrondie rose du coin bas-gauche, avec le
 * logotype blanc posé dessus.
 *
 * Couleurs relevées sur la maquette : rose profond #e30f5d pour la masse
 * principale, rose clair #f99bc2 pour l'arc qui l'éclaire. Deux arcs concentriques
 * plutôt qu'un dégradé linéaire, comme sur l'original.
 *
 * Purement décoratif : `aria-hidden` et `pointer-events-none`, pour ne capter ni
 * le lecteur d'écran ni les clics sur ce qui se trouve dessous.
 */
export default function SignatureMarque() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-0 left-0 z-30 hidden h-44 w-52 overflow-hidden md:block"
    >
      {/* Arc clair, en retrait : il donne son épaisseur à la forme. */}
      <span
        className="absolute -bottom-24 -left-28 h-72 w-72 rounded-full"
        style={{ background: "var(--selfizee-300)" }}
      />
      {/* Masse principale. */}
      <span
        className="absolute -bottom-20 -left-24 h-64 w-64 rounded-full"
        style={{ background: "var(--selfizee-600)" }}
      />

      {/* Logotype blanc, posé sur la masse rose. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/marque/logo-selfizee-blanc.png"
        alt=""
        className="absolute bottom-7 left-6 h-5 w-auto"
      />
    </div>
  );
}
