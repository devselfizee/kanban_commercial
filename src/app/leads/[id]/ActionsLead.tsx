"use client";

/**
 * Actions de qualification d'un lead.
 *
 * Chaque action qui fait sortir la carte du tableau exige les informations que le
 * document rend obligatoires à ce moment-là : prochaine action datée pour la prise
 * en charge, seuil de qualification pour la conversion, motif pour la clôture,
 * date de réactivation pour le nurturing.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MotifClotureLead, Role, StatutLead } from "@prisma/client";
import {
  cloturerLead,
  convertirEnOpportunite,
  mettreEnNurturing,
  prendreEnCharge,
  reattribuerLead,
} from "@/app/actions/leads";
import { LIBELLE_MOTIF_LEAD } from "@/lib/domaine/libelles";

type Props = {
  lead: {
    id: string;
    statut: StatutLead;
    estProprietaire: boolean;
    aProprietaire: boolean;
    dejaConverti: boolean;
    nomOrganisation: string;
    aOrganisation: boolean;
    besoinRenseigne: boolean;
    aInterlocuteur: boolean;
  };
  equipe: { id: string; prenom: string; nom: string }[];
  role: Role | null;
};

export default function ActionsLead({ lead, equipe, role }: Props) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [panneau, setPanneau] = useState<
    "prise" | "conversion" | "cloture" | "nurturing" | "reattribution" | null
  >(null);

  function executer(action: () => Promise<{ ok: boolean; erreur?: string; message?: string }>) {
    demarrer(async () => {
      const r = await action();
      setMessage({ ok: r.ok, texte: r.ok ? (r.message ?? "Effectué.") : r.erreur! });
      if (r.ok) {
        setPanneau(null);
        router.refresh();
      }
    });
  }

  const terminal = lead.statut === "NON_QUALIFIE_CLOTURE";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 text-sm font-semibold">Actions</h2>

      {message && (
        <p
          role="status"
          className={[
            "mb-3 rounded-md px-3 py-2 text-xs",
            message.ok
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
          ].join(" ")}
        >
          {message.texte}
        </p>
      )}

      {terminal ? (
        <p className="text-xs text-slate-500">
          Ce lead est clôturé. Il est conservé pour le pilotage et n&apos;est jamais
          supprimé.
        </p>
      ) : (
        <div className="space-y-2">
          {!lead.estProprietaire && (
            <Bouton onClick={() => setPanneau("prise")} disabled={enCours}>
              Prendre en charge
            </Bouton>
          )}
          {!lead.dejaConverti && (
            <Bouton
              onClick={() => setPanneau("conversion")}
              disabled={enCours}
              principal
            >
              Convertir en opportunité
            </Bouton>
          )}
          <Bouton onClick={() => setPanneau("nurturing")} disabled={enCours}>
            Mettre en nurturing
          </Bouton>
          <Bouton onClick={() => setPanneau("cloture")} disabled={enCours}>
            Clôturer
          </Bouton>
          {role === "MANAGER" && lead.aProprietaire && (
            <Bouton onClick={() => setPanneau("reattribution")} disabled={enCours}>
              Réattribuer
            </Bouton>
          )}
        </div>
      )}

      {/* Prise en charge */}
      {panneau === "prise" && (
        <Formulaire
          titre="Prendre en charge"
          aide="La prise en charge renseigne le propriétaire, la date d'attribution et crée une première action."
          onAnnuler={() => setPanneau(null)}
          onValider={(d) =>
            executer(() =>
              prendreEnCharge(lead.id, {
                le: String(d.get("le")),
                label: String(d.get("label")),
              }),
            )
          }
          enCours={enCours}
        >
          <Input nom="label" libelle="Première action" requis defaut="Appeler pour qualifier le besoin" />
          <Input nom="le" libelle="Échéance" type="date" requis defaut={dansNJours(1)} />
        </Formulaire>
      )}

      {/* Conversion */}
      {panneau === "conversion" && (
        <Formulaire
          titre="Convertir en opportunité"
          aide="La conversion conserve les contacts, les notes, les activités et les fichiers déjà associés."
          onAnnuler={() => setPanneau(null)}
          onValider={(d) =>
            executer(() =>
              convertirEnOpportunite(lead.id, {
                titre: String(d.get("titre")),
                solutionEnvisagee: String(d.get("solution")),
                quantiteBornes: d.get("quantite")
                  ? Number(d.get("quantite"))
                  : undefined,
                dateCible: String(d.get("dateCible")),
                prochaineActionLe: String(d.get("le")),
                prochaineActionLabel: String(d.get("label")),
                montantVente: d.get("montant") ? Number(d.get("montant")) : undefined,
                nomOrganisation: lead.aOrganisation
                  ? undefined
                  : String(d.get("organisation")),
              }),
            )
          }
          enCours={enCours}
        >
          {!lead.besoinRenseigne && (
            <p className="rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              Le besoin n&apos;est pas renseigné sur la fiche : complétez-le avant de
              convertir.
            </p>
          )}
          {!lead.aOrganisation && (
            <Input
              nom="organisation"
              libelle="Organisation à créer"
              requis
              defaut={lead.nomOrganisation}
            />
          )}
          <Input nom="titre" libelle="Titre de l'opportunité" requis />
          <Input nom="solution" libelle="Solution envisagée" requis />
          <Input nom="quantite" libelle="Nombre de bornes" type="number" />
          <Input nom="montant" libelle="Montant indicatif (€)" type="number" />
          <Input nom="dateCible" libelle="Date cible" type="date" requis />
          <Input nom="label" libelle="Prochaine étape" requis defaut="Rendez-vous de découverte" />
          <Input nom="le" libelle="Échéance" type="date" requis defaut={dansNJours(5)} />
        </Formulaire>
      )}

      {/* Nurturing */}
      {panneau === "nurturing" && (
        <Formulaire
          titre="Mettre en nurturing"
          aide="Un lead en nurturing n'est pas perdu : il reçoit une date de réactivation."
          onAnnuler={() => setPanneau(null)}
          onValider={(d) =>
            executer(() => mettreEnNurturing(lead.id, String(d.get("date"))))
          }
          enCours={enCours}
        >
          <Input nom="date" libelle="Date de réactivation" type="date" requis defaut={dansNJours(90)} />
        </Formulaire>
      )}

      {/* Clôture */}
      {panneau === "cloture" && (
        <Formulaire
          titre="Clôturer le lead"
          aide="Le motif et la date sont obligatoires. La carte est conservée, jamais supprimée."
          onAnnuler={() => setPanneau(null)}
          onValider={(d) =>
            executer(() =>
              cloturerLead(
                lead.id,
                d.get("motif") as MotifClotureLead,
                String(d.get("commentaire")),
              ),
            )
          }
          enCours={enCours}
        >
          <Select
            nom="motif"
            libelle="Motif de clôture"
            requis
            options={Object.entries(LIBELLE_MOTIF_LEAD).map(([v, l]) => ({
              valeur: v,
              libelle: l,
            }))}
          />
          <Input nom="commentaire" libelle="Commentaire" />
        </Formulaire>
      )}

      {/* Réattribution */}
      {panneau === "reattribution" && (
        <Formulaire
          titre="Réattribuer"
          aide="Le CRM conserve l'ancien propriétaire, le nouveau, la date, l'auteur et le motif."
          onAnnuler={() => setPanneau(null)}
          onValider={(d) =>
            executer(() =>
              reattribuerLead(
                lead.id,
                String(d.get("destinataire")),
                String(d.get("motif")),
              ),
            )
          }
          enCours={enCours}
        >
          <Select
            nom="destinataire"
            libelle="Nouveau propriétaire"
            requis
            options={equipe.map((u) => ({
              valeur: u.id,
              libelle: `${u.prenom} ${u.nom}`,
            }))}
          />
          <Input nom="motif" libelle="Motif de la réattribution" requis />
        </Formulaire>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Petits composants de formulaire
// ---------------------------------------------------------------------------

function Bouton({
  children,
  onClick,
  disabled,
  principal,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  principal?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "w-full rounded-md px-3 py-2 text-xs font-semibold transition disabled:opacity-50",
        principal
          ? "bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          : "border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Formulaire({
  titre,
  aide,
  children,
  onValider,
  onAnnuler,
  enCours,
}: {
  titre: string;
  aide: string;
  children: React.ReactNode;
  onValider: (donnees: FormData) => void;
  onAnnuler: () => void;
  enCours: boolean;
}) {
  return (
    <form
      action={onValider}
      className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"
    >
      <h3 className="text-xs font-semibold">{titre}</h3>
      <p className="text-[11px] text-slate-500">{aide}</p>
      {children}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={enCours}
          className="flex-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          {enCours ? "…" : "Valider"}
        </button>
        <button
          type="button"
          onClick={onAnnuler}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-600"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

function Input({
  nom,
  libelle,
  type = "text",
  requis,
  defaut,
}: {
  nom: string;
  libelle: string;
  type?: string;
  requis?: boolean;
  defaut?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-slate-600 dark:text-slate-400">
        {libelle}
        {requis && <span className="text-red-500"> *</span>}
      </span>
      <input
        name={nom}
        type={type}
        required={requis}
        defaultValue={defaut}
        className="mt-0.5 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-900"
      />
    </label>
  );
}

function Select({
  nom,
  libelle,
  options,
  requis,
}: {
  nom: string;
  libelle: string;
  options: { valeur: string; libelle: string }[];
  requis?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-slate-600 dark:text-slate-400">
        {libelle}
        {requis && <span className="text-red-500"> *</span>}
      </span>
      <select
        name={nom}
        required={requis}
        defaultValue=""
        className="mt-0.5 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-900"
      >
        <option value="" disabled>
          — choisir —
        </option>
        {options.map((o) => (
          <option key={o.valeur} value={o.valeur}>
            {o.libelle}
          </option>
        ))}
      </select>
    </label>
  );
}

function dansNJours(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
