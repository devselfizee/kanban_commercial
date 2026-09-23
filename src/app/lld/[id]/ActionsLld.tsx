"use client";

/**
 * Actions d'un dossier LLD.
 *
 * Chaque action enregistre un fait daté et sourcé. Aucune n'interprète le silence
 * du partenaire, et aucune ne permet de conclure à sa place : le statut
 * « réponse communiquée » exige que le contenu du retour soit saisi.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MotifClotureLld, Role, StatutLld } from "@prisma/client";
import {
  cloturerDossierLld,
  confirmerLivraison,
  demanderElementClient,
  enregistrerRetourPartenaire,
  enregistrerSignature,
  marquerPretATransmettre,
  transmettreDossier,
} from "@/app/actions/lld";
import { LIBELLE_MOTIF_LLD, LIBELLE_STATUT_LLD } from "@/lib/domaine/libelles";

type Props = {
  dossier: {
    id: string;
    statut: StatutLld;
    checklistComplete: boolean;
    aTransmission: boolean;
    aSignatureClient: boolean;
  };
  role: Role | null;
};

export default function ActionsLld({ dossier, role }: Props) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [panneau, setPanneau] = useState<
    "transmettre" | "retour" | "attente" | "signature" | "livraison" | "cloture" | null
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

  const autorise = role === "COLLABORATRICE_LLD" || role === "MANAGER";
  const terminal =
    dossier.statut === "LIVRAISON_CONFIRMEE_CONTRAT_ACTIF" ||
    dossier.statut === "CLOTURE_NON_POURSUIVI";

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

      {!autorise ? (
        <p className="text-xs text-slate-500">
          Le suivi du dossier est assuré par la collaboratrice LLD. Vous voyez son
          statut et son prochain jalon.
        </p>
      ) : terminal ? (
        <p className="text-xs text-slate-500">
          Dossier {LIBELLE_STATUT_LLD[dossier.statut].toLowerCase()}.
        </p>
      ) : (
        <div className="space-y-2">
          {!dossier.aTransmission && (
            <Bouton
              onClick={() =>
                executer(() => marquerPretATransmettre(dossier.id))
              }
              disabled={enCours || !dossier.checklistComplete}
              titre={
                dossier.checklistComplete
                  ? undefined
                  : "La checklist interne doit être complète."
              }
            >
              Marquer prêt à transmettre
            </Bouton>
          )}
          {!dossier.aTransmission && (
            <Bouton onClick={() => setPanneau("transmettre")} disabled={enCours} principal>
              Transmettre au partenaire
            </Bouton>
          )}
          <Bouton onClick={() => setPanneau("retour")} disabled={enCours}>
            Enregistrer un retour communiqué
          </Bouton>
          <Bouton onClick={() => setPanneau("attente")} disabled={enCours}>
            Demander un élément client
          </Bouton>
          <Bouton onClick={() => setPanneau("signature")} disabled={enCours}>
            Enregistrer une signature
          </Bouton>
          {dossier.aSignatureClient && (
            <Bouton onClick={() => setPanneau("livraison")} disabled={enCours}>
              Confirmer la livraison
            </Bouton>
          )}
          <Bouton onClick={() => setPanneau("cloture")} disabled={enCours}>
            Clôturer le dossier
          </Bouton>
        </div>
      )}

      {panneau === "transmettre" && (
        <Formulaire
          titre="Transmettre au partenaire"
          aide="La preuve de transmission rend le suivi externe auditable."
          onAnnuler={() => setPanneau(null)}
          onValider={(d) =>
            executer(() =>
              transmettreDossier(dossier.id, {
                dateTransmission: String(d.get("date")),
                canal: String(d.get("canal")),
                preuve: String(d.get("preuve")),
                prochaineRelanceLe: String(d.get("relance")),
              }),
            )
          }
          enCours={enCours}
        >
          <Input nom="date" libelle="Date de transmission" type="date" requis defaut={aujourdhui()} />
          <Input nom="canal" libelle="Canal" requis defaut="Portail partenaire" />
          <Input nom="preuve" libelle="Preuve ou référence" requis />
          <Input nom="relance" libelle="Relance prévue" type="date" requis defaut={dansNJours(5)} />
        </Formulaire>
      )}

      {panneau === "retour" && (
        <Formulaire
          titre="Retour communiqué par le partenaire"
          aide="Saisissez le message effectivement reçu. Le statut suivant découle de ce message, il n'est jamais déduit."
          onAnnuler={() => setPanneau(null)}
          onValider={(d) =>
            executer(() =>
              enregistrerRetourPartenaire(dossier.id, {
                dateRetour: String(d.get("date")),
                source: String(d.get("source")),
                contenu: String(d.get("contenu")),
                statutSuivant: d.get("statut") as
                  | "REPONSE_COMMUNIQUEE_PAR_GRENKE"
                  | "RETOUR_ANALYSE_EN_ATTENTE"
                  | "EN_ATTENTE_ELEMENTS_CLIENT"
                  | "CONTRAT_A_SIGNER",
                prochaineActionLe: String(d.get("le")) || undefined,
                prochaineActionLabel: String(d.get("label")) || undefined,
              }),
            )
          }
          enCours={enCours}
        >
          <Input nom="date" libelle="Date du retour" type="date" requis defaut={aujourdhui()} />
          <Input nom="source" libelle="Source (personne, canal)" requis />
          <Zone nom="contenu" libelle="Contenu du retour" requis />
          <Select
            nom="statut"
            libelle="Statut qui en découle"
            requis
            options={[
              {
                valeur: "REPONSE_COMMUNIQUEE_PAR_GRENKE",
                libelle: "Réponse communiquée par GRENKE",
              },
              {
                valeur: "RETOUR_ANALYSE_EN_ATTENTE",
                libelle: "Retour / analyse en attente",
              },
              {
                valeur: "EN_ATTENTE_ELEMENTS_CLIENT",
                libelle: "En attente d'éléments client",
              },
              { valeur: "CONTRAT_A_SIGNER", libelle: "Contrat à signer" },
            ]}
          />
          <Input nom="label" libelle="Prochaine action" />
          <Input nom="le" libelle="Échéance" type="date" />
        </Formulaire>
      )}

      {panneau === "attente" && (
        <Formulaire
          titre="Demander un élément"
          aide="La demande, sa date, son destinataire et l'échéance de relance sont enregistrés."
          onAnnuler={() => setPanneau(null)}
          onValider={(d) =>
            executer(() =>
              demanderElementClient(dossier.id, {
                element: String(d.get("element")),
                demandeA: String(d.get("destinataire")),
                relanceLe: String(d.get("relance")),
              }),
            )
          }
          enCours={enCours}
        >
          <Input nom="element" libelle="Élément demandé" requis />
          <Input nom="destinataire" libelle="Demandé à" requis />
          <Input nom="relance" libelle="Relance prévue" type="date" requis defaut={dansNJours(5)} />
        </Formulaire>
      )}

      {panneau === "signature" && (
        <Formulaire
          titre="Signatures"
          aide="La signature client et les autres signatures sont suivies séparément."
          onAnnuler={() => setPanneau(null)}
          onValider={(d) =>
            executer(() =>
              enregistrerSignature(dossier.id, {
                signatureClientLe: String(d.get("client")) || undefined,
                signatureAutresLe: String(d.get("autres")) || undefined,
                dateLivraisonPrevue: String(d.get("livraison")) || undefined,
              }),
            )
          }
          enCours={enCours}
        >
          <Input nom="client" libelle="Signature client" type="date" />
          <Input nom="autres" libelle="Autres signatures" type="date" />
          <Input nom="livraison" libelle="Livraison prévue" type="date" />
        </Formulaire>
      )}

      {panneau === "livraison" && (
        <Formulaire
          titre="Confirmer la livraison"
          aide="Sans cet évènement de confirmation, la carte ne peut pas passer à « contrat actif »."
          onAnnuler={() => setPanneau(null)}
          onValider={(d) =>
            executer(() => confirmerLivraison(dossier.id, String(d.get("date"))))
          }
          enCours={enCours}
        >
          <Input nom="date" libelle="Date de confirmation" type="date" requis defaut={aujourdhui()} />
        </Formulaire>
      )}

      {panneau === "cloture" && (
        <Formulaire
          titre="Clôturer le dossier"
          aide="Choisissez un motif factuel. Le libellé « non finançable » n'existe pas : il masquerait la nature réelle de l'information."
          onAnnuler={() => setPanneau(null)}
          onValider={(d) =>
            executer(() =>
              cloturerDossierLld(
                dossier.id,
                d.get("motif") as MotifClotureLld,
                String(d.get("commentaire")),
              ),
            )
          }
          enCours={enCours}
        >
          <Select
            nom="motif"
            libelle="Motif"
            requis
            options={Object.entries(LIBELLE_MOTIF_LLD).map(([v, l]) => ({
              valeur: v,
              libelle: l,
            }))}
          />
          <Input nom="commentaire" libelle="Commentaire" />
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
  titre,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  principal?: boolean;
  titre?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={titre}
      className={[
        "w-full rounded-md px-3 py-2 text-xs font-semibold transition disabled:opacity-40",
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

function Zone({
  nom,
  libelle,
  requis,
}: {
  nom: string;
  libelle: string;
  requis?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-slate-600 dark:text-slate-400">
        {libelle}
        {requis && <span className="text-red-500"> *</span>}
      </span>
      <textarea
        name={nom}
        required={requis}
        rows={3}
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
