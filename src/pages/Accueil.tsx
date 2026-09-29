/**
 * Accueil : les trois espaces de travail, leur finalité, et leur état.
 *
 * Chaque espace affiche ses cartes et, en rouge, celles sans suivi planifié :
 * la règle « une carte ne doit jamais être perdue » se lit dès l'arrivée, pas
 * seulement au détour d'un tableau.
 *
 * Réf. : tableau de la recommandation en une page.
 */

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { Bloc, TEINTE_ICONE } from "@/composants/TableauBord";
import {
  IconeCalendrier,
  IconeCoche,
  IconeEntonnoir,
  IconeEuro,
  IconeGraphique,
  IconeHorloge,
  IconePersonne,
} from "@/composants/Icones";

type CarteResumee = { sansSuivi: boolean };

type Espace = {
  href: string;
  titre: string;
  objet: string;
  responsable: string;
  finalite: string;
  icone: ReactNode;
  teinte: keyof typeof TEINTE_ICONE;
  cartes: CarteResumee[] | null;
};

export default function Accueil() {
  // Les trois tableaux, tels que l'utilisateur les voit : un commercial ne
  // compte que ses cartes, le manager toutes.
  const leads = useApi<CarteResumee[]>("/leads");
  const ventes = useApi<{ cartes: CarteResumee[] }>("/opportunites");
  const lld = useApi<CarteResumee[]>("/lld");

  const espaces: Espace[] = [
    {
      href: "/leads",
      titre: "Leads à qualifier",
      objet: "Lead",
      responsable: "Commercial qui le prend en charge",
      finalite:
        "Répondre vite, comprendre le besoin, décider si le lead mérite une opportunité.",
      icone: <IconePersonne />,
      teinte: "bleu",
      cartes: leads.donnees,
    },
    {
      href: "/ventes",
      titre: "Ventes",
      objet: "Opportunité",
      responsable: "Commercial attribué",
      finalite:
        "Construire l'offre, négocier, obtenir la commande ou orienter vers la LLD.",
      icone: <IconeEntonnoir />,
      teinte: "rose",
      cartes: ventes.donnees?.cartes ?? null,
    },
    {
      href: "/lld",
      titre: "LLD / GRENKE",
      objet: "Dossier LLD lié à une opportunité",
      responsable: "Collaboratrice LLD, avec commercial associé",
      finalite:
        "Préparer, transmettre et suivre le dossier jusqu'aux signatures et à la livraison.",
      icone: <IconeEuro />,
      teinte: "violet",
      cartes: lld.donnees,
    },
  ];

  return (
    <div className="space-y-4">
      <header className="flex items-start gap-3">
        <span className="mt-0.5 text-[var(--selfizee-600)]">
          <IconeGraphique className="h-7 w-7" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--texte-fort)]">
            Kanban commercial
          </h1>
          <p className="max-w-3xl text-xs text-[var(--texte-doux)]">
            Une fiche client unique, visible dans trois espaces de travail reliés.
            Le commercial conserve la responsabilité de la relation ; la
            collaboratrice LLD traite le dossier de financement avec ses propres
            statuts, dates, tâches et droits d&apos;accès.
          </p>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        {espaces.map((e) => (
          <CarteEspace key={e.href} espace={e} />
        ))}
      </div>

      <Bloc titre="Principe structurant" icone={<IconeCoche className="h-4 w-4" />}>
        <p className="max-w-4xl text-sm text-[var(--texte)]">
          Une carte ne doit jamais être « perdue ». Elle a toujours un
          responsable, une prochaine action datée ou un motif de clôture.
          Lorsqu&apos;un lead devient une opportunité, l&apos;historique est
          conservé ; lorsqu&apos;une opportunité passe en LLD, le dossier est
          relié à la même opportunité sans créer une seconde fiche client.
        </p>

        <h3 className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wide text-[var(--texte-doux)]">
          Quatre notions à ne pas confondre
        </h3>
        <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Notion terme="Origine" icone={<IconePersonne className="h-4 w-4" />}>
            Comment le contact est arrivé.
          </Notion>
          <Notion terme="Statut de lead" icone={<IconeHorloge className="h-4 w-4" />}>
            Sa maturité avant qualification.
          </Notion>
          <Notion terme="Étape commerciale" icone={<IconeEntonnoir className="h-4 w-4" />}>
            L&apos;avancement de la vente.
          </Notion>
          <Notion terme="Statut LLD" icone={<IconeCalendrier className="h-4 w-4" />}>
            Des événements de dossier et de contrat.
          </Notion>
        </dl>
      </Bloc>

      <p className="text-center text-[11px] text-[var(--texte-tres-doux)]">
        Conception issue de « Proposition de pipeline commercial et LLD pour
        Selfizee ».
      </p>
    </div>
  );
}

function CarteEspace({ espace: e }: { espace: Espace }) {
  const total = e.cartes?.length ?? null;
  const sansSuivi = e.cartes?.filter((c) => c.sansSuivi).length ?? 0;

  return (
    <Link
      to={e.href}
      className="group flex min-w-0 flex-col rounded-xl border border-[var(--trait)] bg-white p-4 shadow-sm transition hover:border-[var(--selfizee-300)] hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: TEINTE_ICONE[e.teinte] }}
        >
          {e.icone}
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--texte-fort)] group-hover:underline">
            {e.titre}
          </h2>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-[var(--texte-fort)]">
            {total ?? "—"}
            <span className="ml-1 text-xs font-normal text-[var(--texte-doux)]">
              {total === 1 ? "carte" : "cartes"}
            </span>
          </p>
          {/* Le signal « sans suivi » est écrit, jamais porté par la couleur
              seule. Quand tout est suivi, une mention neutre garde la ligne :
              les trois cartes restent alignées, sans faux bruit coloré. */}
          {total != null &&
            (sansSuivi > 0 ? (
              <p className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-[var(--danger-fond)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--danger)]">
                ⚠ {sansSuivi} sans suivi planifié
              </p>
            ) : (
              <p className="mt-0.5 py-0.5 text-[11px] text-[var(--texte-tres-doux)]">
                Tout est suivi
              </p>
            ))}
        </div>
      </div>

      <dl className="mt-3 space-y-1.5 border-t border-[var(--trait)] pt-3 text-[11px]">
        <Detail terme="Objet suivi">{e.objet}</Detail>
        <Detail terme="Responsable principal">{e.responsable}</Detail>
        <Detail terme="Finalité">{e.finalite}</Detail>
      </dl>

      <span className="mt-auto pt-3 text-xs font-medium text-[var(--selfizee-600)]">
        Ouvrir le tableau →
      </span>
    </Link>
  );
}

function Detail({ terme, children }: { terme: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[var(--texte-tres-doux)]">{terme}</dt>
      <dd className="text-[var(--texte)]">{children}</dd>
    </div>
  );
}

function Notion({
  terme,
  icone,
  children,
}: {
  terme: string;
  icone: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-2 rounded-lg bg-[var(--fond-colonne)] p-3">
      <span className="mt-0.5 text-[var(--selfizee-600)]">{icone}</span>
      <div>
        <dt className="text-xs font-semibold text-[var(--texte-fort)]">{terme}</dt>
        <dd className="text-xs text-[var(--texte-doux)]">{children}</dd>
      </div>
    </div>
  );
}
