/**
 * Les briques des panneaux d'action.
 *
 * Chaque action qui fait sortir une carte de sa colonne exige les informations
 * que le document rend obligatoires à ce moment-là — prochaine action datée,
 * motif de clôture, contenu du retour partenaire. Ces briques rendent cette
 * exigence visible : un champ requis porte une étoile, et le formulaire ne part
 * pas sans lui.
 *
 * Le back revérifie tout. Ce qui est fait ici guide la saisie, sans jamais en
 * tenir lieu de contrôle.
 */

import { useState, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function Bouton({
  children,
  onClick,
  disabled,
  principal,
}: {
  children: ReactNode;
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
          ? "bg-[var(--selfizee-600)] text-white hover:bg-[var(--selfizee-700)]"
          : "border border-[var(--trait-fort)] text-[var(--texte)] hover:bg-[var(--neutre-fond)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/**
 * Un formulaire d'action, replié tant qu'on ne l'ouvre pas.
 *
 * `aide` n'est pas décoratif : il dit pourquoi les champs demandés le sont,
 * pour que l'exigence ne passe pas pour une lourdeur administrative.
 */
export function Formulaire({
  titre,
  aide,
  children,
  onValider,
  onAnnuler,
  enCours,
}: {
  titre: string;
  aide: string;
  children: ReactNode;
  onValider: (donnees: FormData) => void;
  onAnnuler: () => void;
  enCours: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onValider(new FormData(e.currentTarget));
      }}
      className="mt-3 space-y-2 rounded-lg border border-[var(--trait)] bg-[var(--fond-colonne)] p-3"
    >
      <h3 className="text-xs font-semibold text-[var(--texte-fort)]">{titre}</h3>
      <p className="text-[11px] text-[var(--texte-doux)]">{aide}</p>
      {children}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={enCours}
          className="flex-1 rounded-md bg-[var(--selfizee-600)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--selfizee-700)] disabled:opacity-50"
        >
          {enCours ? "…" : "Valider"}
        </button>
        <button
          type="button"
          onClick={onAnnuler}
          className="rounded-md border border-[var(--trait-fort)] px-3 py-1.5 text-xs text-[var(--texte)]"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Champs
// ---------------------------------------------------------------------------

const CLASSE_CHAMP =
  "mt-0.5 w-full rounded-md border border-[var(--trait-fort)] bg-white px-2 py-1 text-xs text-[var(--texte-fort)]";

function Etiquette({
  libelle,
  requis,
  children,
}: {
  libelle: string;
  requis?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-[var(--texte-doux)]">
        {libelle}
        {requis && <span className="text-[var(--danger)]"> *</span>}
      </span>
      {children}
    </label>
  );
}

export function Input({
  nom,
  libelle,
  type = "text",
  requis,
  defaut,
  pas,
}: {
  nom: string;
  libelle: string;
  type?: string;
  requis?: boolean;
  defaut?: string;
  pas?: string;
}) {
  return (
    <Etiquette libelle={libelle} requis={requis}>
      <input
        name={nom}
        type={type}
        step={pas}
        required={requis}
        defaultValue={defaut}
        className={CLASSE_CHAMP}
      />
    </Etiquette>
  );
}

export function ZoneTexte({
  nom,
  libelle,
  requis,
  defaut,
  lignes = 3,
}: {
  nom: string;
  libelle: string;
  requis?: boolean;
  defaut?: string;
  lignes?: number;
}) {
  return (
    <Etiquette libelle={libelle} requis={requis}>
      <textarea
        name={nom}
        rows={lignes}
        required={requis}
        defaultValue={defaut}
        className={CLASSE_CHAMP}
      />
    </Etiquette>
  );
}

export function Select({
  nom,
  libelle,
  options,
  requis,
  defaut = "",
}: {
  nom: string;
  libelle: string;
  options: { valeur: string; libelle: string }[];
  requis?: boolean;
  defaut?: string;
}) {
  return (
    <Etiquette libelle={libelle} requis={requis}>
      <select
        name={nom}
        required={requis}
        defaultValue={defaut}
        className={CLASSE_CHAMP}
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
    </Etiquette>
  );
}

export function Case({
  nom,
  libelle,
  defaut,
}: {
  nom: string;
  libelle: string;
  defaut?: boolean;
}) {
  return (
    <label className="flex items-center gap-2">
      <input
        name={nom}
        type="checkbox"
        defaultChecked={defaut}
        className="h-3.5 w-3.5 rounded border-[var(--trait-fort)]"
      />
      <span className="text-[11px] text-[var(--texte)]">{libelle}</span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Retour d'exécution
// ---------------------------------------------------------------------------

export type Message = { ok: boolean; texte: string };

export function Retour({ message }: { message: Message | null }) {
  if (!message) return null;
  return (
    <p
      role="status"
      className={[
        "mb-3 rounded-md px-3 py-2 text-xs",
        message.ok
          ? "bg-[var(--succes-fond)] text-[var(--succes-texte)]"
          : "bg-[var(--alerte-fond)] text-[var(--alerte-texte)]",
      ].join(" ")}
    >
      {message.texte}
    </p>
  );
}

/**
 * L'exécution d'une action : état d'attente, message, rechargement.
 *
 * Un refus du serveur s'affiche tel quel. Le front ne le reformule pas — le
 * message du back dit précisément ce qui manque, l'édulcorer ferait perdre
 * l'information.
 */
export function useAction(onSucces: () => void) {
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  async function executer(
    action: () => Promise<unknown>,
    succes = "Effectué.",
  ) {
    setEnCours(true);
    setMessage(null);
    try {
      await action();
      setMessage({ ok: true, texte: succes });
      onSucces();
      return true;
    } catch (e) {
      setMessage({
        ok: false,
        texte:
          e instanceof Error ? e.message : "Impossible de joindre le serveur.",
      });
      return false;
    } finally {
      setEnCours(false);
    }
  }

  return { enCours, message, executer };
}

/** Date par défaut d'un champ `date`, à N jours d'ici. */
export function dansNJours(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
