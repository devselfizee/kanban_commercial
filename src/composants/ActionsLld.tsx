/**
 * Actions sur un dossier LLD (§7).
 *
 * Le pipeline LLD n'enregistre que des faits observables. Passer à « réponse
 * communiquée » exige d'avoir saisi le contenu du retour ; passer à « contrat
 * actif » exige la confirmation de livraison. Le CRM n'interprète jamais ce que
 * dit le partenaire, et n'anticipe jamais sa décision.
 *
 * La collaboratrice valide elle-même l'état « prêt à transmettre » : aucune
 * automatisation ne le fait à sa place, même quand la checklist est complète.
 */

import { useState } from "react";
import { api } from "@/api/client";
import {
  LIBELLE_MOTIF_LLD,
  LIBELLE_STATUT_LLD,
  options,
} from "@/lib/libelles";
import type { StatutLld } from "@/lib/types";
import {
  Bouton,
  Formulaire,
  Input,
  Retour,
  Select,
  ZoneTexte,
  dansNJours,
  useAction,
} from "./Formulaire";

type Panneau =
  | "pret"
  | "transmettre"
  | "retour"
  | "element"
  | "signature"
  | "livraison"
  | "cloture"
  | null;

/** Les seuls statuts que le back accepte après un retour du partenaire. */
const STATUTS_APRES_RETOUR: StatutLld[] = [
  "REPONSE_COMMUNIQUEE_PAR_GRENKE",
  "RETOUR_ANALYSE_EN_ATTENTE",
  "EN_ATTENTE_ELEMENTS_CLIENT",
  "CONTRAT_A_SIGNER",
];

export default function ActionsLld({
  dossier,
  peutAgir,
  onFait,
}: {
  dossier: { id: string; statut: StatutLld; checklistComplete: boolean };
  peutAgir: boolean;
  onFait: () => void;
}) {
  const [panneau, setPanneau] = useState<Panneau>(null);
  const { enCours, message, executer } = useAction(() => {
    setPanneau(null);
    onFait();
  });

  const terminal =
    dossier.statut === "LIVRAISON_CONFIRMEE_CONTRAT_ACTIF" ||
    dossier.statut === "CLOTURE_NON_POURSUIVI";

  if (!peutAgir) {
    return (
      <div className="rounded-xl border border-[var(--trait)] bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-[var(--texte-fort)]">
          Actions
        </h2>
        <p className="text-xs text-[var(--texte-doux)]">
          Seules la collaboratrice LLD en charge et le manager font progresser un
          dossier. Vous en suivez le statut.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--trait)] bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-[var(--texte-fort)]">
        Actions
      </h2>

      <Retour message={message} />

      {terminal ? (
        <p className="text-xs text-[var(--texte-doux)]">
          Ce dossier est clos. Il reste consultable.
        </p>
      ) : (
        <div className="space-y-2">
          <Bouton onClick={() => setPanneau("pret")} disabled={enCours}>
            Marquer prêt à transmettre
          </Bouton>
          <Bouton
            onClick={() => setPanneau("transmettre")}
            disabled={enCours}
            principal
          >
            Transmettre au partenaire
          </Bouton>
          <Bouton onClick={() => setPanneau("retour")} disabled={enCours}>
            Enregistrer un retour partenaire
          </Bouton>
          <Bouton onClick={() => setPanneau("element")} disabled={enCours}>
            Demander un élément
          </Bouton>
          <Bouton onClick={() => setPanneau("signature")} disabled={enCours}>
            Enregistrer les signatures
          </Bouton>
          <Bouton onClick={() => setPanneau("livraison")} disabled={enCours}>
            Confirmer la livraison
          </Bouton>
          <Bouton onClick={() => setPanneau("cloture")} disabled={enCours}>
            Clôturer le dossier
          </Bouton>
        </div>
      )}

      {panneau === "pret" && (
        <Formulaire
          titre="Prêt à transmettre"
          aide="Cette validation vous appartient : la checklist complète ne la déclenche pas d'elle-même."
          onAnnuler={() => setPanneau(null)}
          enCours={enCours}
          onValider={() =>
            void executer(
              () => api.post(`/lld/${dossier.id}/pret-a-transmettre`),
              "Dossier prêt à transmettre.",
            )
          }
        >
          {!dossier.checklistComplete && (
            <p className="rounded bg-[var(--alerte-fond)] px-2 py-1 text-[11px] text-[var(--alerte-texte)]">
              La checklist interne n'est pas complète. Vous pouvez valider
              malgré tout si les pièces manquantes ne sont pas requises.
            </p>
          )}
        </Formulaire>
      )}

      {panneau === "transmettre" && (
        <Formulaire
          titre="Transmettre au partenaire"
          aide="La transmission est horodatée et prouvée : canal et preuve sont conservés."
          onAnnuler={() => setPanneau(null)}
          enCours={enCours}
          onValider={(d) =>
            void executer(
              () =>
                api.post(`/lld/${dossier.id}/transmettre`, {
                  dateTransmission: String(d.get("date")),
                  canal: String(d.get("canal")),
                  preuve: String(d.get("preuve")),
                  prochaineRelanceLe: String(d.get("relance")),
                }),
              "Dossier transmis.",
            )
          }
        >
          <Input
            nom="date"
            libelle="Date de transmission"
            type="date"
            requis
            defaut={dansNJours(0)}
          />
          <Input
            nom="canal"
            libelle="Canal"
            requis
            defaut="Portail partenaire"
          />
          <Input
            nom="preuve"
            libelle="Preuve (référence, accusé)"
            requis
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

      {panneau === "retour" && (
        <Formulaire
          titre="Retour du partenaire"
          aide="Le contenu du retour est obligatoire : on enregistre ce qui a été communiqué, sans l'interpréter."
          onAnnuler={() => setPanneau(null)}
          enCours={enCours}
          onValider={(d) =>
            void executer(
              () =>
                api.post(`/lld/${dossier.id}/retour-partenaire`, {
                  dateRetour: String(d.get("date")),
                  source: String(d.get("source")),
                  contenu: String(d.get("contenu")),
                  statutSuivant: String(d.get("statut")),
                  prochaineActionLe: String(d.get("le") ?? "") || undefined,
                  prochaineActionLabel:
                    String(d.get("label") ?? "") || undefined,
                }),
              "Retour enregistré.",
            )
          }
        >
          <Input
            nom="date"
            libelle="Date du retour"
            type="date"
            requis
            defaut={dansNJours(0)}
          />
          <Input
            nom="source"
            libelle="Source (qui l'a communiqué)"
            requis
          />
          <ZoneTexte
            nom="contenu"
            libelle="Contenu communiqué"
            requis
            lignes={3}
          />
          <Select
            nom="statut"
            libelle="Statut suivant"
            requis
            options={STATUTS_APRES_RETOUR.map((s) => ({
              valeur: s,
              libelle: LIBELLE_STATUT_LLD[s],
            }))}
          />
          <Input nom="label" libelle="Prochaine action" />
          <Input nom="le" libelle="Échéance" type="date" />
        </Formulaire>
      )}

      {panneau === "element" && (
        <Formulaire
          titre="Demander un élément"
          aide="La date de relance évite qu'une demande reste sans réponse."
          onAnnuler={() => setPanneau(null)}
          enCours={enCours}
          onValider={(d) =>
            void executer(
              () =>
                api.post(`/lld/${dossier.id}/demander-element`, {
                  element: String(d.get("element")),
                  demandeA: String(d.get("demandeA")),
                  relanceLe: String(d.get("relance")),
                }),
              "Demande enregistrée.",
            )
          }
        >
          <Input nom="element" libelle="Élément demandé" requis />
          <Input nom="demandeA" libelle="Demandé à" requis />
          <Input
            nom="relance"
            libelle="Relance le"
            type="date"
            requis
            defaut={dansNJours(5)}
          />
        </Formulaire>
      )}

      {panneau === "signature" && (
        <Formulaire
          titre="Signatures"
          aide="La date de livraison prévue prépare la confirmation qui fera passer le contrat en actif."
          onAnnuler={() => setPanneau(null)}
          enCours={enCours}
          onValider={(d) =>
            void executer(
              () =>
                api.post(`/lld/${dossier.id}/signature`, {
                  signatureClientLe: String(d.get("client")),
                  signatureAutresLe: String(d.get("autres") ?? "") || undefined,
                  dateLivraisonPrevue:
                    String(d.get("livraison") ?? "") || undefined,
                }),
              "Signatures enregistrées.",
            )
          }
        >
          <Input
            nom="client"
            libelle="Signature du client"
            type="date"
            requis
            defaut={dansNJours(0)}
          />
          <Input
            nom="autres"
            libelle="Signature des autres parties"
            type="date"
          />
          <Input
            nom="livraison"
            libelle="Livraison prévue"
            type="date"
            defaut={dansNJours(14)}
          />
        </Formulaire>
      )}

      {panneau === "livraison" && (
        <Formulaire
          titre="Confirmer la livraison"
          aide="Le contrat ne devient actif que sur cet évènement de confirmation — jamais par déduction."
          onAnnuler={() => setPanneau(null)}
          enCours={enCours}
          onValider={(d) =>
            void executer(
              () =>
                api.post(`/lld/${dossier.id}/confirmer-livraison`, {
                  dateConfirmation: String(d.get("date")),
                }),
              "Livraison confirmée, contrat actif.",
            )
          }
        >
          <Input
            nom="date"
            libelle="Date de confirmation"
            type="date"
            requis
            defaut={dansNJours(0)}
          />
        </Formulaire>
      )}

      {panneau === "cloture" && (
        <Formulaire
          titre="Clôturer le dossier"
          aide="Les motifs sont factuels. Le libellé « non finançable » n'existe pas : le CRM ne préjuge pas de la décision du partenaire."
          onAnnuler={() => setPanneau(null)}
          enCours={enCours}
          onValider={(d) =>
            void executer(
              () =>
                api.post(`/lld/${dossier.id}/cloturer`, {
                  motif: String(d.get("motif")),
                  commentaire: String(d.get("commentaire") ?? ""),
                }),
              "Dossier clôturé.",
            )
          }
        >
          <Select
            nom="motif"
            libelle="Motif"
            requis
            options={options(LIBELLE_MOTIF_LLD).map((o) => ({
              valeur: o.valeur,
              libelle: o.libelle,
            }))}
          />
          <Input nom="commentaire" libelle="Commentaire" />
        </Formulaire>
      )}
    </div>
  );
}
