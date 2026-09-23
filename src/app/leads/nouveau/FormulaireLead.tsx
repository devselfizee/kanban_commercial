"use client";

/**
 * Formulaire de création d'un lead.
 *
 * Le canal détaillé s'adapte au mode d'acquisition choisi : proposer « scan de
 * badge » à côté de « e-mail sortant » brouillerait la mesure des origines.
 *
 * La priorité n'est pas saisie : elle est calculée côté serveur à partir de
 * critères commerciaux visibles, et jamais d'une appréciation de solvabilité.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  CanalDetaille,
  ModeAcquisition,
  ProjetRecherche,
  SegmentClient,
} from "@prisma/client";
import { creerLead } from "@/app/actions/leads";
import {
  CANAUX_PAR_MODE,
  LIBELLE_CANAL,
  LIBELLE_MODE_ACQUISITION,
  LIBELLE_PROJET,
  LIBELLE_SEGMENT,
} from "@/lib/domaine/libelles";

export default function FormulaireLead({
  equipe,
  organisations,
  moiId,
}: {
  equipe: { id: string; prenom: string; nom: string }[];
  organisations: { id: string; nom: string; ville: string | null }[];
  moiId: string;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [mode, setMode] = useState<ModeAcquisition>("ENTRANT");

  function envoyer(d: FormData) {
    setErreur(null);
    demarrer(async () => {
      const r = await creerLead({
        modeAcquisition: d.get("mode") as ModeAcquisition,
        canalDetaille: d.get("canal") as CanalDetaille,
        nomBrut: String(d.get("nom") ?? "") || undefined,
        emailBrut: String(d.get("email") ?? "") || undefined,
        telephoneBrut: String(d.get("telephone") ?? "") || undefined,
        organisationId: String(d.get("organisation") ?? "") || undefined,
        segment: (String(d.get("segment") ?? "") || undefined) as
          | SegmentClient
          | undefined,
        projetRecherche: (String(d.get("projet") ?? "") || undefined) as
          | ProjetRecherche
          | undefined,
        besoinResume: String(d.get("besoin") ?? "") || undefined,
        horizonIndicatif: String(d.get("horizon") ?? "") || undefined,
        ville: String(d.get("ville") ?? "") || undefined,
        proprietaireId: String(d.get("proprietaire") ?? "") || undefined,
        prochaineActionLe: String(d.get("actionLe") ?? ""),
        prochaineActionLabel: String(d.get("actionLabel") ?? ""),
        devisDemande: d.get("devisDemande") === "on",
        clientExistant: d.get("clientExistant") === "on",
        joursAvantEcheance: d.get("joursEcheance")
          ? Number(d.get("joursEcheance"))
          : undefined,
        valeurIndicative: d.get("valeur") ? Number(d.get("valeur")) : undefined,
      });

      if (r.ok) {
        router.push("/leads");
        router.refresh();
      } else {
        setErreur(r.erreur);
      }
    });
  }

  return (
    <form action={envoyer} className="space-y-4">
      {erreur && (
        <p
          role="alert"
          className="rounded-xl border border-[var(--alerte-bord)] bg-[var(--alerte-fond)] px-3.5 py-2.5 text-sm text-[var(--alerte-texte)]"
        >
          {erreur}
        </p>
      )}

      {/* Origine */}
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

      {/* Identité */}
      <Bloc
        titre="Identité et contact"
        aide="Un nom ou une organisation, et au moins un moyen de joindre la personne."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ libelle="Organisation existante">
            <select name="organisation" defaultValue="" className={classeSaisie}>
              <option value="">— aucune, je saisis un nom —</option>
              {organisations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nom}
                  {o.ville ? ` — ${o.ville}` : ""}
                </option>
              ))}
            </select>
          </Champ>

          <Champ libelle="Nom ou raison sociale">
            <input name="nom" className={classeSaisie} placeholder="Hôtel Ker Ar Mor" />
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
            <input name="telephone" className={classeSaisie} placeholder="02 97 12 34 56" />
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

      {/* Besoin */}
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

      {/* Priorisation */}
      <Bloc
        titre="Éléments de priorité"
        aide="Critères commerciaux visibles. La priorité est calculée à partir d'eux — jamais d'une appréciation de solvabilité."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ libelle="Jours avant l'échéance" aide="Date d'évènement, si connue.">
            <input name="joursEcheance" type="number" min="0" className={classeSaisie} />
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

      {/* Suivi */}
      <Bloc
        titre="Responsable et prochaine action"
        aide="Obligatoires : une carte ne doit jamais être « perdue »."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ libelle="Responsable" aide="Laissez vide pour le pool partagé.">
            <select name="proprietaire" defaultValue={moiId} className={classeSaisie}>
              <option value="">— pool non attribué —</option>
              {equipe.map((u) => (
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
        <button
          type="button"
          onClick={() => router.push("/leads")}
          className="rounded-lg border border-[var(--trait-fort)] px-4 py-2 text-sm font-medium text-[var(--texte)] transition hover:bg-[var(--fond-page)]"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={enCours}
          className="rounded-lg bg-[var(--selfizee-600)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--selfizee-700)] disabled:opacity-50"
        >
          {enCours ? "Création…" : "Créer le lead"}
        </button>
      </div>
    </form>
  );
}

const classeSaisie =
  "w-full rounded-lg border border-[var(--trait-fort)] bg-white px-3 py-2 text-sm text-[var(--texte)] transition focus:border-[var(--selfizee-400)] focus:outline-none";

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
