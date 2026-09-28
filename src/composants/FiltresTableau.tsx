/**
 * Filtres d'un tableau : type de client, segment, responsable.
 *
 * Le document veut les canaux et segments en « champs filtrables » plutôt qu'en
 * colonnes ou en pipelines séparés (§2) : un commercial qui traite les
 * mariages doit pouvoir ne voir que les particuliers, sans qu'on crée un
 * quatrième tableau pour eux.
 *
 * Le filtrage se fait sur les cartes déjà chargées, sans nouvel appel. Les
 * choix vivent dans l'URL : une vue filtrée se partage et se met en favori, et
 * le retour depuis une fiche la retrouve intacte.
 */

import { useSearchParams } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { LIBELLE_SEGMENT } from "@/lib/libelles";
import type { SegmentClient } from "@/lib/types";
import SelecteurRecherche from "./SelecteurRecherche";

/** Ce qu'une carte doit exposer pour être filtrable. */
export type CarteFiltrable = {
  estParticulier: boolean;
  segment: SegmentClient | null;
  /** L'identifiant, pas le nom : des noms venus du CRM ont des espaces en trop. */
  responsableId: string | null;
};

type Membre = { id: string; prenom: string; nom: string };

type TypeClient = "tous" | "pro" | "particulier";

const SANS_RESPONSABLE = "__aucun__";

/**
 * @param rolesEquipe les rôles proposés comme responsables — commerciaux et
 *   managers pour les leads et les ventes, collaboratrices LLD pour les
 *   dossiers de financement.
 */
export function useFiltres<T extends CarteFiltrable>(
  cartes: T[],
  rolesEquipe: string,
) {
  const [params, setParams] = useSearchParams();
  // Toute l'équipe, pas seulement les responsables des cartes affichées : on
  // doit pouvoir choisir un commercial même s'il n'a encore aucune carte.
  const { donnees: equipe } = useApi<Membre[]>(`/utilisateurs?role=${rolesEquipe}`);

  const type = (params.get("type") as TypeClient | null) ?? "tous";
  const segment = params.get("segment") ?? "";
  const responsable = params.get("responsable") ?? "";

  function definir(cle: string, valeur: string) {
    const suivant = new URLSearchParams(params);
    if (valeur && valeur !== "tous") suivant.set(cle, valeur);
    else suivant.delete(cle);
    setParams(suivant, { replace: true });
  }

  const filtrees = cartes.filter(
    (c) =>
      (type === "tous" ||
        (type === "particulier" ? c.estParticulier : !c.estParticulier)) &&
      (!segment || c.segment === segment) &&
      (!responsable ||
        (responsable === SANS_RESPONSABLE
          ? !c.responsableId
          : c.responsableId === responsable)),
  );

  // Les listes ne proposent que ce qui existe sur le tableau : un segment
  // sans carte ne ferait qu'afficher un tableau vide.
  const segments = [
    ...new Set(cartes.map((c) => c.segment).filter((s): s is SegmentClient => !!s)),
  ].sort((a, b) => LIBELLE_SEGMENT[a].localeCompare(LIBELLE_SEGMENT[b]));
  const responsables = [
    ...(equipe ?? []).map((m) => ({
      valeur: m.id,
      libelle: `${m.prenom} ${m.nom}`.replace(/\s+/g, " ").trim(),
    })),
  ].sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"));
  responsables.push({ valeur: SANS_RESPONSABLE, libelle: "Non attribué" });

  const actif = type !== "tous" || !!segment || !!responsable;

  return {
    filtrees,
    actif,
    barre: (
      <BarreFiltres
        type={type}
        segment={segment}
        responsable={responsable}
        segments={segments}
        responsables={responsables}
        nbAffichees={filtrees.length}
        nbTotal={cartes.length}
        actif={actif}
        onChanger={definir}
        onReinitialiser={() => {
          const suivant = new URLSearchParams(params);
          ["type", "segment", "responsable"].forEach((k) => suivant.delete(k));
          setParams(suivant, { replace: true });
        }}
      />
    ),
  };
}

function BarreFiltres({
  type,
  segment,
  responsable,
  segments,
  responsables,
  nbAffichees,
  nbTotal,
  actif,
  onChanger,
  onReinitialiser,
}: {
  type: TypeClient;
  segment: string;
  responsable: string;
  segments: SegmentClient[];
  responsables: { valeur: string; libelle: string }[];
  nbAffichees: number;
  nbTotal: number;
  actif: boolean;
  onChanger: (cle: string, valeur: string) => void;
  onReinitialiser: () => void;
}) {
  const classeSelect =
    "rounded-lg border border-[var(--trait-fort)] bg-white px-2.5 py-1.5 text-xs text-[var(--texte)] focus:border-[var(--selfizee-400)] focus:outline-none";

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {/* Le filtre le plus utile est un choix à trois : visible d'un coup
          d'œil, sans ouvrir de liste. */}
      <div
        role="group"
        aria-label="Type de client"
        className="inline-flex rounded-lg border border-[var(--trait-fort)] bg-white p-0.5"
      >
        {(
          [
            ["tous", "Tous"],
            ["pro", "Professionnels"],
            ["particulier", "Particuliers"],
          ] as const
        ).map(([valeur, libelle]) => (
          <button
            key={valeur}
            type="button"
            aria-pressed={type === valeur}
            onClick={() => onChanger("type", valeur)}
            className={[
              "rounded-md px-2.5 py-1 text-xs font-medium transition",
              type === valeur
                ? "bg-[var(--selfizee-600)] text-white"
                : "text-[var(--texte)] hover:bg-[var(--fond-colonne)]",
            ].join(" ")}
          >
            {libelle}
          </button>
        ))}
      </div>

      {segments.length > 1 && (
        <select
          aria-label="Segment"
          value={segment}
          onChange={(e) => onChanger("segment", e.target.value)}
          className={classeSelect}
        >
          <option value="">Tous les segments</option>
          {segments.map((s) => (
            <option key={s} value={s}>
              {LIBELLE_SEGMENT[s]}
            </option>
          ))}
        </select>
      )}

      <SelecteurRecherche
        etiquette="Responsable"
        libelleVide="Tous les responsables"
        options={responsables}
        valeur={responsable}
        onChanger={(v) => onChanger("responsable", v)}
      />

      {actif && (
        <>
          <span className="text-xs text-[var(--texte-doux)]">
            {nbAffichees} sur {nbTotal}
          </span>
          <button
            type="button"
            onClick={onReinitialiser}
            className="text-xs text-[var(--texte-doux)] underline hover:text-[var(--selfizee-600)]"
          >
            Effacer les filtres
          </button>
        </>
      )}
    </div>
  );
}
