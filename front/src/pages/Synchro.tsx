/**
 * État de la synchronisation avec le CRM.
 *
 * Écran de diagnostic, réservé au manager : il répond à une seule question —
 * « pourquoi cette fiche n'est-elle pas remontée ? » — en montrant les derniers
 * événements reçus et leur issue.
 */

import { useApi } from "@/hooks/useApi";
import { Chargement, Erreur } from "@/composants/Etats";
import { dateHeure } from "@/lib/format";

type ResultatSynchro =
  | "CREE"
  | "MIS_A_JOUR"
  | "IGNORE_PERIME"
  | "IGNORE_SUPPRIME"
  | "ERREUR";

type Evenement = {
  id: string;
  routingKey: string;
  idCrm: number;
  resultat: ResultatSynchro;
  detail: string | null;
  recuLe: string;
};

type Reponse = {
  configure: boolean;
  queue: string | null;
  enAttente: number | null;
  organisationsLiees: number;
  contactsLies: number;
  parResultat: Partial<Record<ResultatSynchro, number>>;
  evenements: Evenement[];
};

const LIBELLE_RESULTAT: Record<ResultatSynchro, string> = {
  CREE: "Créé",
  MIS_A_JOUR: "Mis à jour",
  IGNORE_PERIME: "Ignoré (périmé)",
  IGNORE_SUPPRIME: "Détaché (supprimé au CRM)",
  ERREUR: "Erreur",
};

const TON_RESULTAT: Record<ResultatSynchro, string> = {
  CREE: "bg-[var(--succes-fond)] text-[var(--succes-texte)]",
  MIS_A_JOUR: "bg-[var(--selfizee-100)] text-[var(--selfizee-700)]",
  IGNORE_PERIME: "bg-[var(--neutre-fond)] text-[var(--neutre-texte)]",
  IGNORE_SUPPRIME: "bg-[var(--neutre-fond)] text-[var(--neutre-texte)]",
  ERREUR: "bg-[var(--danger-fond)] text-[var(--danger)]",
};

export default function Synchro() {
  const { donnees, chargement, erreur, recharger } =
    useApi<Reponse>("/diagnostic-synchro");

  if (chargement) return <Chargement quoi="l'état de la synchronisation" />;
  if (erreur) return <Erreur message={erreur} onReessayer={recharger} />;
  if (!donnees) return null;

  const d = donnees;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-bold tracking-tight text-[var(--texte-fort)]">
          Synchronisation CRM
        </h1>
        <p className="text-xs text-[var(--texte-doux)]">
          Sens unique : le CRM fait autorité sur l&apos;identité du client. Le
          kanban ne réécrit jamais vers lui.
        </p>
      </header>

      {!d.configure && (
        <div className="rounded-xl border border-[var(--alerte-bord)] bg-[var(--alerte-fond)] p-4 text-sm text-[var(--alerte-texte)]">
          <p className="font-semibold">Bus non configuré.</p>
          <p className="mt-1 text-xs">
            Renseignez <code>RABBITMQ_MGMT_URL</code>, <code>RABBITMQ_USER</code>{" "}
            et <code>RABBITMQ_PASSWORD</code> côté API. Tant que ces variables
            sont absentes, la synchronisation est inactive et le kanban
            fonctionne de façon autonome.
          </p>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tuile
          libelle="Messages en attente"
          valeur={d.enAttente != null ? String(d.enAttente) : "—"}
          aide={d.queue ? `Queue ${d.queue}` : "Bus non joignable"}
          ton={d.enAttente && d.enAttente > 100 ? "alerte" : "normal"}
        />
        <Tuile
          libelle="Organisations liées au CRM"
          valeur={String(d.organisationsLiees)}
        />
        <Tuile libelle="Contacts liés au CRM" valeur={String(d.contactsLies)} />
        <Tuile
          libelle="Erreurs de traitement"
          valeur={String(d.parResultat.ERREUR ?? 0)}
          ton={(d.parResultat.ERREUR ?? 0) > 0 ? "alerte" : "normal"}
          aide="Événements non appliqués"
        />
      </section>

      <section className="rounded-xl border border-[var(--trait)] bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">
          50 derniers événements reçus
        </h2>
        {d.evenements.length === 0 ? (
          <p className="py-3 text-sm text-[var(--texte-doux)]">
            Aucun événement reçu pour l&apos;instant.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--trait)] text-left text-[11px] uppercase text-[var(--texte-tres-doux)]">
                <th className="pb-1 font-medium">Reçu</th>
                <th className="pb-1 font-medium">Événement</th>
                <th className="pb-1 font-medium">ID CRM</th>
                <th className="pb-1 font-medium">Issue</th>
                <th className="pb-1 font-medium">Détail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--trait)]">
              {d.evenements.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap py-1.5 text-xs text-[var(--texte-doux)]">
                    {dateHeure(new Date(e.recuLe))}
                  </td>
                  <td className="py-1.5 font-mono text-[11px]">{e.routingKey}</td>
                  <td className="py-1.5 text-xs tabular-nums">{e.idCrm}</td>
                  <td className="py-1.5">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${TON_RESULTAT[e.resultat]}`}
                    >
                      {LIBELLE_RESULTAT[e.resultat]}
                    </span>
                  </td>
                  <td className="py-1.5 text-xs text-[var(--texte-doux)]">
                    {e.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-xl border border-[var(--trait)] bg-white p-4 text-xs">
        <h2 className="mb-2 text-sm font-semibold">Ce qui est synchronisé</h2>
        <table className="w-full">
          <tbody className="divide-y divide-[var(--trait)]">
            <Ligne
              objet="Organisations"
              source="clients"
              etat="Actif — le CRM publie déjà ces événements"
              ok
            />
            <Ligne
              objet="Contacts"
              source="client_contacts"
              etat="Nécessite l'ajout du behavior EventPublisher côté CRM"
            />
            <Ligne
              objet="Devis"
              source="devis"
              etat="Nécessite l'ajout du behavior EventPublisher côté CRM"
            />
            <Ligne
              objet="Leads, opportunités, dossiers LLD"
              source="—"
              etat="Propres au kanban : jamais synchronisés"
              ok
            />
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Ligne({
  objet,
  source,
  etat,
  ok,
}: {
  objet: string;
  source: string;
  etat: string;
  ok?: boolean;
}) {
  return (
    <tr>
      <td className="py-1.5 font-medium">{objet}</td>
      <td className="py-1.5 font-mono text-[11px] text-[var(--texte-doux)]">
        {source}
      </td>
      <td
        className={`py-1.5 ${ok ? "text-[var(--texte-doux)]" : "text-[var(--alerte-texte)]"}`}
      >
        {etat}
      </td>
    </tr>
  );
}

function Tuile({
  libelle,
  valeur,
  aide,
  ton = "normal",
}: {
  libelle: string;
  valeur: string;
  aide?: string;
  ton?: "normal" | "alerte";
}) {
  return (
    <div
      className={[
        "rounded-xl border bg-white p-3",
        ton === "alerte" ? "border-[var(--alerte-bord)]" : "border-[var(--trait)]",
      ].join(" ")}
    >
      <p className="text-[10px] uppercase tracking-wide text-[var(--texte-doux)]">
        {libelle}
      </p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{valeur}</p>
      {aide && (
        <p className="mt-0.5 text-[10px] text-[var(--texte-tres-doux)]">{aide}</p>
      )}
    </div>
  );
}
