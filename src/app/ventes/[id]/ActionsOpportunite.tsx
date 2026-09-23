"use client";

/**
 * Actions d'une opportunité.
 *
 * Le passage en LLD crée le dossier de financement sans dupliquer la fiche client,
 * et notifie la collaboratrice. Les issues « gagné » et « perdu » exigent une
 * confirmation explicite, jamais un simple glisser-déposer.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EtapeCommerciale, MotifClotureOpportunite, Role } from "@prisma/client";
import {
  creerDossierLld,
  definirProchaineAction,
  enregistrerOffreEnvoyee,
  marquerGagnee,
  marquerPerdue,
} from "@/app/actions/opportunites";
import {
  DUREE_GRENKE_PUBLIEE_MAX,
  DUREE_GRENKE_PUBLIEE_MIN,
  DUREE_LLD_MAX_SELFIZEE,
  DUREE_LLD_MIN_SELFIZEE,
} from "@/lib/domaine/regles";
import { LIBELLE_MOTIF_OPPORTUNITE } from "@/lib/domaine/libelles";

type Props = {
  opportunite: {
    id: string;
    etape: EtapeCommerciale;
    aDossierLld: boolean;
    loyerEnvisage: number | null;
    montantVente: number | null;
    nomOrganisation: string;
  };
  collaboratrices: { id: string; prenom: string; nom: string }[];
  role: Role | null;
};

export default function ActionsOpportunite({
  opportunite: opp,
  collaboratrices,
  role,
}: Props) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [panneau, setPanneau] = useState<
    "offre" | "lld" | "gagne" | "perdu" | "action" | null
  >(null);

  function executer(
    action: () => Promise<{ ok: boolean; erreur?: string; message?: string }>,
  ) {
    demarrer(async () => {
      const r = await action();
      setMessage({ ok: r.ok, texte: r.ok ? (r.message ?? "Effectué.") : r.erreur! });
      if (r.ok) {
        setPanneau(null);
        router.refresh();
      }
    });
  }

  const terminale = opp.etape === "GAGNE_ACTIF" || opp.etape === "PERDU_ABANDONNE";
  const lecture = role === "DIRECTION";

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

      {lecture ? (
        <p className="text-xs text-slate-500">
          Votre rôle donne un accès en lecture aux indicateurs et aux dossiers.
        </p>
      ) : terminale ? (
        <p className="text-xs text-slate-500">
          Opportunité clôturée. Elle reste disponible pour le pilotage et une
          éventuelle réactivation.
        </p>
      ) : (
        <div className="space-y-2">
          <Bouton onClick={() => setPanneau("action")} disabled={enCours}>
            Planifier la prochaine action
          </Bouton>
          <Bouton onClick={() => setPanneau("offre")} disabled={enCours}>
            Enregistrer une offre envoyée
          </Bouton>
          {!opp.aDossierLld && (
            <Bouton onClick={() => setPanneau("lld")} disabled={enCours} principal>
              Créer le dossier LLD
            </Bouton>
          )}
          <Bouton onClick={() => setPanneau("gagne")} disabled={enCours}>
            Marquer gagné
          </Bouton>
          <Bouton onClick={() => setPanneau("perdu")} disabled={enCours}>
            Marquer perdu
          </Bouton>
        </div>
      )}

      {panneau === "action" && (
        <Formulaire
          titre="Prochaine action"
          aide="Une carte sans prochaine action datée est signalée en rouge."
          onAnnuler={() => setPanneau(null)}
          onValider={(d) =>
            executer(() =>
              definirProchaineAction(opp.id, {
                le: String(d.get("le")),
                label: String(d.get("label")),
              }),
            )
          }
          enCours={enCours}
        >
          <Input nom="label" libelle="Action" requis />
          <Input nom="le" libelle="Échéance" type="date" requis defaut={dansNJours(3)} />
        </Formulaire>
      )}

      {panneau === "offre" && (
        <Formulaire
          titre="Offre envoyée"
          aide="La date de relance est obligatoire : elle crée une tâche de contrôle, sans envoi automatique au client."
          onAnnuler={() => setPanneau(null)}
          onValider={(d) =>
            executer(() =>
              enregistrerOffreEnvoyee(opp.id, {
                montant: d.get("montant") ? Number(d.get("montant")) : undefined,
                dateEnvoi: String(d.get("envoi")),
                dateRelancePrevue: String(d.get("relance")),
                lienDevis: String(d.get("lien")) || undefined,
              }),
            )
          }
          enCours={enCours}
        >
          <Input
            nom="montant"
            libelle="Montant (€)"
            type="number"
            defaut={opp.montantVente?.toString()}
          />
          <Input nom="envoi" libelle="Date d'envoi" type="date" requis defaut={aujourdhui()} />
          <Input
            nom="relance"
            libelle="Date de relance"
            type="date"
            requis
            defaut={dansNJours(7)}
          />
          <Input nom="lien" libelle="Lien vers le devis" />
        </Formulaire>
      )}

      {panneau === "lld" && (
        <Formulaire
          titre="Créer le dossier LLD"
          aide="Le dossier est relié à cette opportunité. Le commercial reste propriétaire de la relation."
          onAnnuler={() => setPanneau(null)}
          onValider={(d) =>
            executer(() =>
              creerDossierLld(opp.id, {
                dureeDemandeeMois: Number(d.get("duree")),
                montantFinance: d.get("montant") ? Number(d.get("montant")) : undefined,
                loyerMensuel: d.get("loyer") ? Number(d.get("loyer")) : undefined,
                locataire: String(d.get("locataire")) || undefined,
                collaboratriceId: String(d.get("collaboratrice")),
              }),
            )
          }
          enCours={enCours}
        >
          <Input
            nom="duree"
            libelle={`Durée demandée (mois, ${DUREE_LLD_MIN_SELFIZEE}–${DUREE_LLD_MAX_SELFIZEE})`}
            type="number"
            requis
            defaut="36"
          />
          <p className="rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            Hors de la plage publiée par le partenaire ({DUREE_GRENKE_PUBLIEE_MIN}–
            {DUREE_GRENKE_PUBLIEE_MAX} mois), une alerte interne « compatibilité à
            confirmer » s&apos;affiche. Le dossier n&apos;est jamais écarté
            automatiquement.
          </p>
          <Input
            nom="montant"
            libelle="Montant financé (€)"
            type="number"
            defaut={opp.montantVente?.toString()}
          />
          <Input
            nom="loyer"
            libelle="Loyer mensuel (€)"
            type="number"
            defaut={opp.loyerEnvisage?.toString()}
          />
          <Input nom="locataire" libelle="Locataire" defaut={opp.nomOrganisation} />
          <Select
            nom="collaboratrice"
            libelle="Collaboratrice LLD"
            requis
            options={collaboratrices.map((u) => ({
              valeur: u.id,
              libelle: `${u.prenom} ${u.nom}`,
            }))}
          />
        </Formulaire>
      )}

      {panneau === "gagne" && (
        <Formulaire
          titre="Marquer gagné"
          aide="Confirme la définition de « gagné » retenue par la direction et crée les tâches de démarrage."
          onAnnuler={() => setPanneau(null)}
          onValider={(d) =>
            executer(() =>
              marquerGagnee(opp.id, {
                montantRetenu: d.get("montant") ? Number(d.get("montant")) : undefined,
                commentaire: String(d.get("commentaire")) || undefined,
              }),
            )
          }
          enCours={enCours}
        >
          <Input
            nom="montant"
            libelle="Montant retenu (€)"
            type="number"
            defaut={opp.montantVente?.toString()}
          />
          <Input nom="commentaire" libelle="Commentaire" />
        </Formulaire>
      )}

      {panneau === "perdu" && (
        <Formulaire
          titre="Marquer perdu"
          aide="Motif normalisé, concurrent éventuel et commentaire factuel."
          onAnnuler={() => setPanneau(null)}
          onValider={(d) =>
            executer(() =>
              marquerPerdue(opp.id, d.get("motif") as MotifClotureOpportunite, {
                concurrent: String(d.get("concurrent")) || undefined,
                commentaire: String(d.get("commentaire")) || undefined,
              }),
            )
          }
          enCours={enCours}
        >
          <Select
            nom="motif"
            libelle="Motif"
            requis
            options={Object.entries(LIBELLE_MOTIF_OPPORTUNITE).map(([v, l]) => ({
              valeur: v,
              libelle: l,
            }))}
          />
          <Input nom="concurrent" libelle="Concurrent identifié" />
          <Input nom="commentaire" libelle="Commentaire factuel" />
        </Formulaire>
      )}
    </div>
  );
}

// --- Composants de formulaire ----------------------------------------------

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

function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10);
}

function dansNJours(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
