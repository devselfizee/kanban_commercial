/**
 * Actions de qualification d'un lead (§3, §5, §8).
 *
 * Chaque action qui fait sortir la carte du tableau exige les informations que
 * le document rend obligatoires à ce moment-là : prochaine action datée pour la
 * prise en charge, seuil de qualification pour la conversion, motif pour la
 * clôture, date de réactivation pour le nurturing.
 *
 * Ces exigences sont appliquées par le back. Ce qui est demandé ici prépare la
 * saisie pour éviter un aller-retour — un refus du serveur s'affiche tel quel.
 */

import { useState } from "react";
import { api } from "@/api/client";
import { LIBELLE_MOTIF_LEAD, options } from "@/lib/libelles";
import type { Role, StatutLead } from "@/lib/types";
import {
  Bouton,
  Formulaire,
  Input,
  Retour,
  Select,
  dansNJours,
  useAction,
} from "./Formulaire";

type Panneau =
  | "prise"
  | "conversion"
  | "cloture"
  | "nurturing"
  | "reattribution"
  | null;

export default function ActionsLead({
  lead,
  equipe,
  role,
  onFait,
}: {
  lead: {
    id: string;
    statut: StatutLead;
    estProprietaire: boolean;
    aProprietaire: boolean;
    dejaConverti: boolean;
    nomOrganisation: string;
    aOrganisation: boolean;
    besoinRenseigne: boolean;
  };
  equipe: { id: string; prenom: string; nom: string }[];
  role: Role | null;
  onFait: () => void;
}) {
  const [panneau, setPanneau] = useState<Panneau>(null);
  const { enCours, message, executer } = useAction(() => {
    setPanneau(null);
    onFait();
  });

  const terminal = lead.statut === "NON_QUALIFIE_CLOTURE";

  return (
    <div className="rounded-xl border border-[var(--trait)] bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-[var(--texte-fort)]">
        Actions
      </h2>

      <Retour message={message} />

      {terminal ? (
        <p className="text-xs text-[var(--texte-doux)]">
          Ce lead est clôturé. Il est conservé pour le pilotage et n'est jamais
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
            <Bouton
              onClick={() => setPanneau("reattribution")}
              disabled={enCours}
            >
              Réattribuer
            </Bouton>
          )}
        </div>
      )}

      {panneau === "prise" && (
        <Formulaire
          titre="Prendre en charge"
          aide="La prise en charge renseigne le propriétaire, la date d'attribution et crée une première action."
          onAnnuler={() => setPanneau(null)}
          enCours={enCours}
          onValider={(d) =>
            void executer(
              () =>
                api.post(`/leads/${lead.id}/prendre-en-charge`, {
                  le: String(d.get("le")),
                  label: String(d.get("label")),
                }),
              "Lead pris en charge.",
            )
          }
        >
          <Input
            nom="label"
            libelle="Première action"
            requis
            defaut="Appeler pour qualifier le besoin"
          />
          <Input
            nom="le"
            libelle="Échéance"
            type="date"
            requis
            defaut={dansNJours(1)}
          />
        </Formulaire>
      )}

      {panneau === "conversion" && (
        <Formulaire
          titre="Convertir en opportunité"
          aide="La conversion conserve les contacts, les notes, les activités et les fichiers déjà associés."
          onAnnuler={() => setPanneau(null)}
          enCours={enCours}
          onValider={(d) =>
            void executer(
              () =>
                api.post(`/leads/${lead.id}/convertir`, {
                  titre: String(d.get("titre")),
                  solutionEnvisagee: String(d.get("solution")),
                  quantiteBornes: d.get("quantite")
                    ? Number(d.get("quantite"))
                    : undefined,
                  dateCible: String(d.get("dateCible")),
                  prochaineActionLe: String(d.get("le")),
                  prochaineActionLabel: String(d.get("label")),
                  montantVente: d.get("montant")
                    ? Number(d.get("montant"))
                    : undefined,
                  nomOrganisation: lead.aOrganisation
                    ? undefined
                    : String(d.get("organisation")),
                }),
              "Lead converti en opportunité.",
            )
          }
        >
          {!lead.besoinRenseigne && (
            <p className="rounded bg-[var(--alerte-fond)] px-2 py-1 text-[11px] text-[var(--alerte-texte)]">
              Le besoin n'est pas renseigné sur la fiche : complétez-le avant de
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
          <Input
            nom="label"
            libelle="Prochaine étape"
            requis
            defaut="Rendez-vous de découverte"
          />
          <Input
            nom="le"
            libelle="Échéance"
            type="date"
            requis
            defaut={dansNJours(5)}
          />
        </Formulaire>
      )}

      {panneau === "nurturing" && (
        <Formulaire
          titre="Mettre en nurturing"
          aide="Un lead en nurturing n'est pas perdu : il reçoit une date de réactivation."
          onAnnuler={() => setPanneau(null)}
          enCours={enCours}
          onValider={(d) =>
            void executer(
              () =>
                api.post(`/leads/${lead.id}/nurturing`, {
                  dateReactivation: String(d.get("date")),
                }),
              "Lead mis en nurturing.",
            )
          }
        >
          <Input
            nom="date"
            libelle="Date de réactivation"
            type="date"
            requis
            defaut={dansNJours(90)}
          />
        </Formulaire>
      )}

      {panneau === "cloture" && (
        <Formulaire
          titre="Clôturer le lead"
          aide="Le motif est obligatoire. La carte est conservée, jamais supprimée."
          onAnnuler={() => setPanneau(null)}
          enCours={enCours}
          onValider={(d) =>
            void executer(
              () =>
                api.post(`/leads/${lead.id}/cloturer`, {
                  motif: String(d.get("motif")),
                  commentaire: String(d.get("commentaire") ?? ""),
                }),
              "Lead clôturé.",
            )
          }
        >
          <Select
            nom="motif"
            libelle="Motif de clôture"
            requis
            options={options(LIBELLE_MOTIF_LEAD).map((o) => ({
              valeur: o.valeur,
              libelle: o.libelle,
            }))}
          />
          <Input nom="commentaire" libelle="Commentaire" />
        </Formulaire>
      )}

      {panneau === "reattribution" && (
        <Formulaire
          titre="Réattribuer"
          aide="Le CRM conserve l'ancien propriétaire, le nouveau, la date, l'auteur et le motif."
          onAnnuler={() => setPanneau(null)}
          enCours={enCours}
          onValider={(d) =>
            void executer(
              () =>
                api.post(`/leads/${lead.id}/reattribuer`, {
                  destinataireId: String(d.get("destinataire")),
                  motif: String(d.get("motif")),
                }),
              "Lead réattribué.",
            )
          }
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
