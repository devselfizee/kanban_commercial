/**
 * Icônes du pilotage, dessinées au trait.
 *
 * Décoratives : elles aident à repérer une tuile d'un coup d'œil, mais c'est
 * toujours le libellé qui porte le sens — d'où `aria-hidden`.
 */

type Props = { className?: string };

function Trait({ className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className ?? "h-5 w-5"}
    >
      {children}
    </svg>
  );
}

export const IconePersonne = (p: Props) => (
  <Trait {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Trait>
);

export const IconeHorloge = (p: Props) => (
  <Trait {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Trait>
);

export const IconePourcent = (p: Props) => (
  <Trait {...p}>
    <path d="M19 5 5 19" />
    <circle cx="7" cy="7" r="2.5" />
    <circle cx="17" cy="17" r="2.5" />
  </Trait>
);

export const IconeCalendrier = (p: Props) => (
  <Trait {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 10h18" />
  </Trait>
);

export const IconeEuro = (p: Props) => (
  <Trait {...p}>
    <path d="M17 6.5A7 7 0 1 0 17 17.5" />
    <path d="M4 10h9M4 14h9" />
  </Trait>
);

export const IconeGroupe = (p: Props) => (
  <Trait {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
  </Trait>
);

export const IconeGraphique = (p: Props) => (
  <Trait {...p}>
    <path d="M6 20V14M12 20V8M18 20V4" />
  </Trait>
);

export const IconeBoite = (p: Props) => (
  <Trait {...p}>
    <path d="M21 8 12 3 3 8l9 5 9-5Z" />
    <path d="M3 8v8l9 5 9-5V8M12 13v8" />
  </Trait>
);

export const IconeEntonnoir = (p: Props) => (
  <Trait {...p}>
    <path d="M3 4h18l-7 8.5V19l-4 2v-8.5L3 4Z" />
  </Trait>
);

export const IconeCoche = (p: Props) => (
  <Trait {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12 3 3 5-6" />
  </Trait>
);

export const IconeTelephone = (p: Props) => (
  <Trait {...p}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </Trait>
);

export const IconeListe = (p: Props) => (
  <Trait {...p}>
    <path d="M9 6h12M9 12h12M9 18h12" />
    <path d="M4 6h.01M4 12h.01M4 18h.01" />
  </Trait>
);

export const IconeDocument = (p: Props) => (
  <Trait {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
    <path d="M14 3v5h5M9 13h6M9 17h6" />
  </Trait>
);
