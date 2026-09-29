/**
 * Actions commerciales sur une opportunité (§4, §6).
 *
 * Les valeurs restent séparées : montant de vente, mise en place, loyer mensuel
 * et durée ne sont jamais additionnés, parce qu'ils ne répondent pas à la même
 * question. Le formulaire les demande distinctement plutôt que de proposer un
 * total qui n'aurait pas de sens.
 *
 * L'ouverture d'un dossier LLD ne fait pas sortir l'opportunité du pipeline :
 * le financement suit son cours en parallèle de la vente.
 */

import { useState } from "react";
import { api } from "@/api/client";
import { LIBELLE_MOTIF_OPPORTUNITE, options } from "@/lib/libelles";
import type { EtapeCommerciale, Role } from "@/lib/types";
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
  | "action"
  | "offre"
  | "lld"
  | "gagnee"
  | "perdue"
  | null;

export default function ActionsOpportunite({
  opportunite,
  collaboratrices,
  role,
  onFait,
}: {
  opportunite: {
    id: string;
    etape: EtapeCommerciale;
    dejaLld: boolean;
    montantVente: number | null;
    dureeLldMois: number | null;
  };
  collaboratrices: { id: string; prenom: string; nom: string }[];
  role: Role | null;
  onFait: () => void;
}) {
  const [panneau, setPanneau] = useState<Panneau>(null);
  const { enCours, message, executer } = useAction(() => {
    setPanneau(null);
    onFait();
  });

  const terminal =
    opportunite.etape === "GAGNE_ACTIF" ||
    opportunite.etape === "PERDU_ABANDONNE";

  return (
    <div className="rounded-xl border border-[var(--trait)] bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-[var(--texte-fort)]">
        Actions
      </h2>

      <Retour message={message} />

      {terminal ? (
        <p className="text-xs text-[var(--texte-doux)]">
          Cette opportunité est close. Elle reste consultable pour le pilotage.
        </p>
      ) : (
        <div className="space-y-2">
          <Bouton onClick={() => setPanneau("action")} disabled={enCours}>
            Planifier la prochaine action
          </Bouton>
          <Bouton onClick={() => setPanneau("offre")} disabled={enCours}>
            Enregistrer l'offre envoyée
          </Bouton>
          {!opportunite.dejaLld && (
            <Bouton onClick={() => setPanneau("lld")} disabled={enCours}>
              Ouvrir un dossier LLD
            </Bouton>
          )}
          <Bouton
            onClick={() => setPanneau("gagnee")}
            disabled={enCours}
            principal
          >
            Marquer gagnée
          </Bouton>
          <Bouton onClick={() => setPanneau("perdue")} disabled={enCours}>
            Marquer perdue
          </Bouton>
        </div>
      )}

      {panneau === "action" && (
        <Formulaire
          titre="Prochaine action"
          aide="Une opportunité sans prochaine action datée est signalée sur le tableau."
          onAnnuler={() => setPanneau(null)}
          enCours={enCours}
          onValider={(d) =>
            void executer(
              () =>
                api.post(`/opportunites/${opportunite.id}/prochaine-action`, {
                  le: String(d.get("le")),
                  label: String(d.get("label")),
                }),
              "Action planifiée.",
            )
          }
        >
          <Input nom="label" libelle="Action" requis />
          <Input
            nom="le"
            libelle="Échéance"
            type="date"
            requis
            defaut={dansNJours(3)}
          />
        </Formulaire>
      )}

      {panneau === "offre" && (
        <Formulaire
          titre="Offre envoyée"
          aide="La date de relance prévue évite que l'offre reste sans suite."
          onAnnuler={() => setPanneau(null)}
          enCours={enCours}
          onValider={(d) =>
            void executer(
              () =>
                api.post(`/opportunites/${opportunite.id}/offre-envoyee`, {
                  montant: d.get("montant")
                    ? Number(d.get("montant"))
                    : undefined,
                  dateEnvoi: String(d.get("dateEnvoi")),
                  dateRelancePrevue: String(d.get("relance")),
                  lienDevis: String(d.get("lien") ?? "") || undefined,
                  reference: String(d.get("reference") ?? "") || undefined,
                }),
              "Offre enregistrée.",
            )
          }
        >
          <Input
            nom="montant"
            libelle="Montant de l'offre (€)"
            type="number"
            defaut={opportunite.montantVente?.toString()}
          />
          <Input nom="reference" libelle="Référence du devis" />
          <Input nom="lien" libelle="Lien vers le devis" />
          <Input
            nom="dateEnvoi"
            libelle="Date d'envoi"
            type="date"
            requis
            defaut={dansNJours(0)}
          />
          <Input
            nom="relance"
            libelle="Relance prévue"
            type="date"
            requis
            defaut={dansNJours(7)}
          />
        </Formulaire>
      )}

      {panneau === "lld" && (
        <Formulaire
          titre="Ouvrir un dossier LLD"
          aide="Le dossier suit son cours en parallèle : l'opportunité reste dans le pipeline commercial."
          onAnnuler={() => setPanneau(null)}
          enCours={enCours}
          onValider={(d) =>
            void executer(
              () =>
                api.post(`/opportunites/${opportunite.id}/dossier-lld`, {
                  dureeDemandeeMois: Number(d.get("duree")),
                  montantFinance: d.get("montant")
                    ? Number(d.get("montant"))
                    : undefined,
                  loyerMensuel: d.get("loyer")
                    ? Number(d.get("loyer"))
                    : undefined,
                  locataire: String(d.get("locataire") ?? "") || undefined,
                  collaboratriceId: String(d.get("collaboratrice")),
                }),
              "Dossier LLD ouvert.",
            )
          }
        >
          {/* Selfizee propose 1 à 36 mois, le partenaire annonce 12 à 60 : hors
              de cette plage, le back signale sans bloquer. */}
          <Input
            nom="duree"
            libelle="Durée demandée (mois)"
            type="number"
            requis
            defaut={opportunite.dureeLldMois?.toString() ?? "36"}
          />
          <Input
            nom="montant"
            libelle="Montant à financer (€)"
            type="number"
            defaut={opportunite.montantVente?.toString()}
          />
          <Input nom="loyer" libelle="Loyer mensuel (€)" type="number" />
          <Input nom="locataire" libelle="Locataire (si différent)" />
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

      {panneau === "gagnee" && (
        <Formulaire
          titre="Marquer gagnée"
          aide="Le montant retenu est celui de la commande finalisée, distinct du montant indicatif."
          onAnnuler={() => setPanneau(null)}
          enCours={enCours}
          onValider={(d) =>
            void executer(
              () =>
                api.post(`/opportunites/${opportunite.id}/gagnee`, {
                  montantRetenu: d.get("montant")
                    ? Number(d.get("montant"))
                    : undefined,
                  commentaire: String(d.get("commentaire") ?? ""),
                }),
              "Opportunité gagnée.",
            )
          }
        >
          <Input
            nom="montant"
            libelle="Montant retenu (€)"
            type="number"
            defaut={opportunite.montantVente?.toString()}
          />
          <Input nom="commentaire" libelle="Commentaire" />
        </Formulaire>
      )}

      {panneau === "perdue" && (
        <Formulaire
          titre="Marquer perdue"
          aide="Le motif alimente le pilotage. Il est factuel, jamais une appréciation du client."
          onAnnuler={() => setPanneau(null)}
          enCours={enCours}
          onValider={(d) =>
            void executer(
              () =>
                api.post(`/opportunites/${opportunite.id}/perdue`, {
                  motif: String(d.get("motif")),
                  concurrent: String(d.get("concurrent") ?? "") || undefined,
                  commentaire: String(d.get("commentaire") ?? ""),
                }),
              "Opportunité close.",
            )
          }
        >
          <Select
            nom="motif"
            libelle="Motif"
            requis
            options={options(LIBELLE_MOTIF_OPPORTUNITE).map((o) => ({
              valeur: o.valeur,
              libelle: o.libelle,
            }))}
          />
          <Input nom="concurrent" libelle="Concurrent retenu" />
          <Input nom="commentaire" libelle="Commentaire" />
        </Formulaire>
      )}

      {role === "COMMERCIAL" && opportunite.dejaLld && (
        <p className="mt-3 text-[11px] text-[var(--texte-doux)]">
          Le dossier LLD est suivi par la collaboratrice : vous en voyez le
          statut, sans le contenu des pièces financières.
        </p>
      )}
    </div>
  );
}
