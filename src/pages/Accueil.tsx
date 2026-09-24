/**
 * Accueil : les trois espaces de travail et leur finalité.
 *
 * Réf. : tableau de la recommandation en une page.
 */

import { Link } from "react-router-dom";

const ESPACES = [
  {
    href: "/leads",
    titre: "Leads à qualifier",
    objet: "Lead",
    responsable: "Commercial qui le prend en charge",
    finalite:
      "Répondre vite, comprendre le besoin, décider si le lead mérite une opportunité.",
  },
  {
    href: "/ventes",
    titre: "Ventes",
    objet: "Opportunité",
    responsable: "Commercial attribué",
    finalite:
      "Construire l'offre, négocier, obtenir la commande ou orienter vers la LLD.",
  },
  {
    href: "/lld",
    titre: "LLD / GRENKE",
    objet: "Dossier LLD lié à une opportunité",
    responsable: "Collaboratrice LLD, avec commercial associé",
    finalite:
      "Préparer, transmettre et suivre le dossier jusqu'aux signatures et à la livraison.",
  },
];

export default function Accueil() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--texte-fort)]">
          Kanban commercial
        </h1>
        <p className="mt-1 text-sm text-[var(--texte-doux)]">
          Une fiche client unique, visible dans trois espaces de travail reliés. Le
          commercial conserve la responsabilité de la relation ; la collaboratrice
          LLD traite le dossier de financement avec ses propres statuts, dates,
          tâches et droits d&apos;accès.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {ESPACES.map((e) => (
          <Link
            key={e.href}
            to={e.href}
            className="group rounded-xl border border-[var(--trait)] bg-white p-4 transition hover:border-[var(--selfizee-300)] hover:shadow-md"
          >
            <h2 className="text-sm font-semibold group-hover:underline">
              {e.titre}
            </h2>
            <dl className="mt-2 space-y-1.5 text-[11px]">
              <div>
                <dt className="text-[var(--texte-tres-doux)]">Objet suivi</dt>
                <dd className="text-[var(--texte)]">{e.objet}</dd>
              </div>
              <div>
                <dt className="text-[var(--texte-tres-doux)]">
                  Responsable principal
                </dt>
                <dd className="text-[var(--texte)]">{e.responsable}</dd>
              </div>
              <div>
                <dt className="text-[var(--texte-tres-doux)]">Finalité</dt>
                <dd className="text-[var(--texte)]">{e.finalite}</dd>
              </div>
            </dl>
          </Link>
        ))}
      </div>

      <section className="rounded-xl border border-[var(--trait)] bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Principe structurant</h2>
        <p className="text-sm text-[var(--texte-doux)]">
          Une carte ne doit jamais être « perdue ». Elle a toujours un
          responsable, une prochaine action datée ou un motif de clôture.
          Lorsqu&apos;un lead devient une opportunité, l&apos;historique est
          conservé ; lorsqu&apos;une opportunité passe en LLD, le dossier est
          relié à la même opportunité sans créer une seconde fiche client.
        </p>

        <h3 className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--texte-doux)]">
          Quatre notions à ne pas confondre
        </h3>
        <dl className="grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
          <Notion terme="Origine">Comment le contact est arrivé.</Notion>
          <Notion terme="Statut de lead">Sa maturité avant qualification.</Notion>
          <Notion terme="Étape commerciale">
            L&apos;avancement de la vente.
          </Notion>
          <Notion terme="Statut LLD">
            Des événements de dossier et de contrat.
          </Notion>
        </dl>
      </section>

      <p className="text-center text-[11px] text-[var(--texte-tres-doux)]">
        Conception issue de « Proposition de pipeline commercial et LLD pour
        Selfizee ».
      </p>
    </div>
  );
}

function Notion({
  terme,
  children,
}: {
  terme: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="font-semibold text-[var(--texte)]">{terme}</dt>
      <dd className="text-[var(--texte-doux)]">{children}</dd>
    </div>
  );
}
