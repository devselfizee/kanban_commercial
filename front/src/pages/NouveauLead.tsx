/**
 * Création d'un lead.
 *
 * Seuls les champs exigés à la création par le §8 sont obligatoires : origine,
 * canal, identité, un moyen de contact, un responsable et une prochaine action
 * datée. Le reste peut être complété au fil de la qualification.
 *
 * La priorité n'est pas saisie : elle est calculée côté serveur à partir de
 * critères commerciaux visibles, et jamais d'une appréciation de solvabilité.
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ErreurApi } from "@/api/client";
import { useApi } from "@/hooks/useApi";
import {
  CANAUX_PAR_MODE,
  LIBELLE_CANAL,
  LIBELLE_MODE_ACQUISITION,
  LIBELLE_PROJET,
  LIBELLE_SEGMENT,
} from "@/lib/libelles";
import type { ModeAcquisition, Role } from "@/lib/types";

type Membre = { id: string; prenom: string; nom: string; role: Role };
type Organisation = { id: string; nom: string; ville: string | null };

const classeSaisie =
  "w-full rounded-lg border border-[var(--trait-fort)] bg-white px-3 py-2 text-sm text-[var(--texte)] transition focus:border-[var(--selfizee-400)] focus:outline-none";

export default function NouveauLead() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ModeAcquisition>("ENTRANT");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const { donnees: equipe } = useApi<Membre[]>(
    "/utilisateurs?role=COMMERCIAL,MANAGER",
  );
  const { donnees: organisations } = useApi<Organisation[]>(
    "/tableaux-bord/organisations",
  );

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);

    const d = new FormData(e.currentTarget);
    const nombre = (cle: string) => {
      const v = d.get(cle);
      return v ? Number(v) : undefined;
    };
    const texte = (cle: string) => String(d.get(cle) ?? "").trim() || undefined;

    try {
      await api.post("/leads", {
        modeAcquisition: d.get("mode"),
        canalDetaille: d.get("canal"),
        nomBrut: texte("nom"),
        emailBrut: texte("email"),
        telephoneBrut: texte("telephone"),
        organisationId: texte("organisation"),
        segment: texte("segment"),
        projetRecherche: texte("projet"),
        besoinResume: texte("besoin"),
        horizonIndicatif: texte("horizon"),
        ville: texte("ville"),
        proprietaireId: texte("proprietaire"),
        prochaineActionLe: String(d.get("actionLe")),
        prochaineActionLabel: String(d.get("actionLabel")),
        devisDemande: d.get("devisDemande") === "on",
        clientExistant: d.get("clientExistant") === "on",
        joursAvantEcheance: nombre("joursEcheance"),
        valeurIndicative: nombre("valeur"),
      });
      navigate("/leads");
    } catch (err) {
      setErreur(
        err instanceof ErreurApi ? err.message : "La création a échoué.",
      );
      setEnvoi(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <Link
          to="/leads"
          className="text-xs text-[var(--texte-doux)] hover:text-[var(--selfizee-600)] hover:underline"
        >
          ← Leads à qualifier
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--texte-fort)]">
          Nouveau lead
        </h1>
        <p className="mt-1 text-sm text-[var(--texte-doux)]">
          Une carte n&apos;est jamais créée sans responsable ni prochaine action
          datée.
        </p>
      </div>

      <form onSubmit={envoyer} className="space-y-4">
        {erreur && (
          <p
            role="alert"
            className="rounded-xl border border-[var(--alerte-bord)] bg-[var(--alerte-fond)] px-3.5 py-2.5 text-sm text-[var(--alerte-texte)]"
          >
            {erreur}
          </p>
        )}

        <Bloc titre="Origine" aide="Comment ce contact est-il arrivé ?">
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ libelle="Mode d'acquisition" requis>
              <select
                name="mode"
                required
                value={mode}
                onChange={(e) => setMode(e.target.value as ModeAcquisition)}
                className={classeSaisie}
              >
                {Object.entries(LIBELLE_MODE_ACQUISITION).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Champ>

            <Champ libelle="Canal détaillé" requis>
              <select name="canal" required defaultValue="" className={classeSaisie}>
                <option value="" disabled>
                  — choisir —
                </option>
                {CANAUX_PAR_MODE[mode].map((c) => (
                  <option key={c} value={c}>
                    {LIBELLE_CANAL[c]}
                  </option>
                ))}
              </select>
            </Champ>
          </div>
        </Bloc>

        <Bloc
          titre="Identité et contact"
          aide="Un nom ou une organisation, et au moins un moyen de joindre la personne."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ libelle="Organisation existante">
              <select name="organisation" defaultValue="" className={classeSaisie}>
                <option value="">— aucune, je saisis un nom —</option>
                {(organisations ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nom}
                    {o.ville ? ` — ${o.ville}` : ""}
                  </option>
                ))}
              </select>
            </Champ>

            <Champ libelle="Nom ou raison sociale">
              <input
                name="nom"
                className={classeSaisie}
                placeholder="Hôtel Ker Ar Mor"
              />
            </Champ>

            <Champ libelle="E-mail">
              <input
                name="email"
                type="email"
                className={classeSaisie}
                placeholder="contact@exemple.fr"
              />
            </Champ>

            <Champ libelle="Téléphone">
              <input
                name="telephone"
                className={classeSaisie}
                placeholder="02 97 12 34 56"
              />
            </Champ>

            <Champ libelle="Ville">
              <input name="ville" className={classeSaisie} placeholder="Vannes" />
            </Champ>

            <Champ libelle="Segment client">
              <select name="segment" defaultValue="" className={classeSaisie}>
                <option value="">— à préciser —</option>
                {Object.entries(LIBELLE_SEGMENT).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Champ>
          </div>
        </Bloc>

        <Bloc
          titre="Besoin"
          aide="Ne forcez pas le choix de financement dès le premier contact."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ libelle="Projet recherché">
              <select
                name="projet"
                defaultValue="A_PRECISER"
                className={classeSaisie}
              >
                {Object.entries(LIBELLE_PROJET).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Champ>

            <Champ libelle="Horizon indicatif" aide="Une fourchette suffit.">
              <input
                name="horizon"
                className={classeSaisie}
                placeholder="Été 2026, ou « dans 3 mois »"
              />
            </Champ>

            <Champ libelle="Besoin résumé" pleineLargeur>
              <textarea
                name="besoin"
                rows={2}
                className={classeSaisie}
                placeholder="Borne photo permanente pour l'accueil de l'hôtel"
              />
            </Champ>
          </div>
        </Bloc>

        <Bloc
          titre="Éléments de priorité"
          aide="Critères commerciaux visibles. La priorité est calculée à partir d'eux — jamais d'une appréciation de solvabilité."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ
              libelle="Jours avant l'échéance"
              aide="Date d'évènement, si connue."
            >
              <input
                name="joursEcheance"
                type="number"
                min="0"
                className={classeSaisie}
              />
            </Champ>

            <Champ libelle="Valeur indicative (€)">
              <input name="valeur" type="number" min="0" className={classeSaisie} />
            </Champ>

            <label className="flex items-center gap-2 text-sm">
              <input
                name="devisDemande"
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--trait-fort)] accent-[var(--selfizee-500)]"
              />
              Un devis a déjà été demandé
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                name="clientExistant"
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--trait-fort)] accent-[var(--selfizee-500)]"
              />
              Client déjà existant
            </label>
          </div>
        </Bloc>

        <Bloc
          titre="Responsable et prochaine action"
          aide="Obligatoires : une carte ne doit jamais être « perdue »."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ libelle="Responsable" aide="Laissez vide pour le pool partagé.">
              <select name="proprietaire" defaultValue="" className={classeSaisie}>
                <option value="">— pool non attribué —</option>
                {(equipe ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.prenom} {u.nom}
                  </option>
                ))}
              </select>
            </Champ>

            <Champ libelle="Échéance de la prochaine action" requis>
              <input
                name="actionLe"
                type="date"
                required
                defaultValue={dansNJours(1)}
                className={classeSaisie}
              />
            </Champ>

            <Champ libelle="Prochaine action" requis pleineLargeur>
              <input
                name="actionLabel"
                required
                defaultValue="Appeler pour qualifier le besoin"
                className={classeSaisie}
              />
            </Champ>
          </div>
        </Bloc>

        <div className="flex justify-end gap-2">
          <Link
            to="/leads"
            className="rounded-lg border border-[var(--trait-fort)] px-4 py-2 text-sm font-medium text-[var(--texte)] transition hover:bg-[var(--fond-page)]"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={envoi}
            className="rounded-lg bg-[var(--selfizee-600)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--selfizee-700)] disabled:opacity-50"
          >
            {envoi ? "Création…" : "Créer le lead"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Bloc({
  titre,
  aide,
  children,
}: {
  titre: string;
  aide: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--trait)] bg-white p-4">
      <h2 className="text-sm font-bold text-[var(--texte-fort)]">{titre}</h2>
      <p className="mb-3 mt-0.5 text-xs text-[var(--texte-doux)]">{aide}</p>
      {children}
    </section>
  );
}

function Champ({
  libelle,
  children,
  requis,
  aide,
  pleineLargeur,
}: {
  libelle: string;
  children: React.ReactNode;
  requis?: boolean;
  aide?: string;
  pleineLargeur?: boolean;
}) {
  return (
    <label className={pleineLargeur ? "block sm:col-span-2" : "block"}>
      <span className="mb-1 block text-xs font-medium text-[var(--texte)]">
        {libelle}
        {requis && <span className="text-[var(--danger)]"> *</span>}
      </span>
      {children}
      {aide && (
        <span className="mt-0.5 block text-[11px] text-[var(--texte-tres-doux)]">
          {aide}
        </span>
      )}
    </label>
  );
}

function dansNJours(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
