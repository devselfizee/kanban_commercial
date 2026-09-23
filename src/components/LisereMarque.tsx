/**
 * Liseré de marque, ancré en bas de la fenêtre.
 *
 * Camaïeu de roses Selfizee : foncé, vif, clair. Il reste strictement dans la
 * charte — introduire une seconde teinte ici entrerait en concurrence avec
 * l'ambre et le rouge, qui signalent les cartes à traiter.
 *
 * Purement décoratif : `aria-hidden` et `pointer-events-none`, pour qu'il ne
 * capte ni le lecteur d'écran ni les clics sur ce qui se trouve dessous.
 */
export default function LisereMarque() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-1"
      style={{
        background:
          "linear-gradient(90deg, var(--selfizee-600) 0%, var(--selfizee-400) 50%, var(--selfizee-300) 100%)",
      }}
    />
  );
}
