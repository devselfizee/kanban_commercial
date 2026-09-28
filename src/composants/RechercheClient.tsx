/**
 * Recherche d'un client, dans le kanban et dans le CRM.
 *
 * Le CRM compte près de 170 000 clients : une liste déroulante serait
 * inutilisable, et les importer tous encombrerait la base pour en utiliser
 * quelques centaines. On cherche donc, et le client choisi n'entre dans le
 * kanban qu'à cet instant.
 *
 * Les organisations déjà connues viennent en premier : ce sont celles qui
 * portent des leads et des opportunités. Celles du CRM suivent, marquées comme
 * telles pour que le commercial sache qu'il va en créer une.
 */

import { useEffect, useRef, useState } from "react";
import { api } from "@/api/client";

export type ClientTrouve = {
  organisationId: string | null;
  idCrm: number | null;
  nom: string;
  email: string | null;
  telephone: string | null;
  ville: string | null;
  estParticulier: boolean;
  source: "kanban" | "crm";
  /** La fiche CRM d'origine, renvoyée telle quelle à la reprise. */
  ficheCrm?: Record<string, unknown>;
};

type Reponse = {
  resultats: ClientTrouve[];
  crm:
    | { etat: "ok" }
    | { etat: "non_configure" }
    | { etat: "indisponible"; detail: string };
};

/** Laisse le temps de finir de taper avant d'interroger le CRM. */
const DELAI_FRAPPE_MS = 350;

export default function RechercheClient({
  onChoisir,
  choisi,
}: {
  onChoisir: (client: ClientTrouve | null) => void;
  choisi: ClientTrouve | null;
}) {
  const [terme, setTerme] = useState("");
  const [reponse, setReponse] = useState<Reponse | null>(null);
  const [chargement, setChargement] = useState(false);
  const minuteur = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (choisi) return;
    if (terme.trim().length < 2) {
      setReponse(null);
      return;
    }

    window.clearTimeout(minuteur.current);
    minuteur.current = window.setTimeout(async () => {
      setChargement(true);
      try {
        setReponse(
          await api.get<Reponse>(
            `/leads/clients/rechercher?q=${encodeURIComponent(terme.trim())}`,
          ),
        );
      } catch {
        setReponse(null);
      } finally {
        setChargement(false);
      }
    }, DELAI_FRAPPE_MS);

    return () => window.clearTimeout(minuteur.current);
  }, [terme, choisi]);

  if (choisi) {
    return (
      <div className="rounded-lg border border-[var(--selfizee-200)] bg-[var(--selfizee-50)] px-3 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-[var(--texte-fort)]">
            {choisi.nom}
          </span>
          <button
            type="button"
            onClick={() => {
              onChoisir(null);
              setTerme("");
            }}
            className="shrink-0 text-xs text-[var(--texte-doux)] underline"
          >
            Changer
          </button>
        </div>
        <p className="text-[11px] text-[var(--texte-doux)]">
          {[choisi.email, choisi.telephone, choisi.ville]
            .filter(Boolean)
            .join(" · ") || "Aucune coordonnée"}
        </p>
        {choisi.source === "crm" && (
          <p className="mt-1 text-[10px] italic text-[var(--texte-doux)]">
            Client du CRM — sa fiche sera créée dans le kanban à
            l'enregistrement.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <input
        type="search"
        value={terme}
        onChange={(e) => setTerme(e.target.value)}
        placeholder="Nom, enseigne ou e-mail…"
        className="w-full rounded-lg border border-[var(--trait-fort)] bg-white px-3 py-2 text-sm text-[var(--texte)] transition focus:border-[var(--selfizee-400)] focus:outline-none"
      />

      {chargement && (
        <p className="mt-1 text-[11px] text-[var(--texte-doux)]">Recherche…</p>
      )}

      {reponse && reponse.resultats.length > 0 && (
        <ul className="mt-1 max-h-64 overflow-auto rounded-lg border border-[var(--trait)] bg-white">
          {reponse.resultats.map((c) => (
            <li key={`${c.source}-${c.organisationId ?? c.idCrm}`}>
              <button
                type="button"
                onClick={() => onChoisir(c)}
                className="flex w-full items-baseline justify-between gap-2 px-3 py-2 text-left hover:bg-[var(--fond-colonne)]"
              >
                <span>
                  <span className="text-sm text-[var(--texte-fort)]">
                    {c.nom}
                  </span>
                  <span className="ml-2 text-[11px] text-[var(--texte-doux)]">
                    {[c.email, c.ville].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span
                  className={[
                    "shrink-0 rounded px-1.5 py-0.5 text-[10px]",
                    c.source === "kanban"
                      ? "bg-[var(--selfizee-100)] text-[var(--selfizee-700)]"
                      : "bg-[var(--neutre-fond)] text-[var(--neutre-texte)]",
                  ].join(" ")}
                >
                  {c.source === "kanban" ? "déjà suivi" : "CRM"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {reponse && reponse.resultats.length === 0 && !chargement && (
        <p className="mt-1 text-[11px] text-[var(--texte-doux)]">
          Aucun client trouvé — saisissez le nom ci-dessous, la fiche sera
          créée.
        </p>
      )}

      {/* Une recherche partielle ne doit pas passer pour une absence de
          résultat : le commercial risquerait de créer un doublon. */}
      {reponse?.crm.etat === "indisponible" && (
        <p className="mt-1 text-[11px] text-[var(--alerte-texte)]">
          ⚠ CRM injoignable — seuls les clients déjà suivis sont listés.{" "}
          {reponse.crm.detail}
        </p>
      )}
    </div>
  );
}
