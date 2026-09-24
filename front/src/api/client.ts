/**
 * Client HTTP de l'API.
 *
 * Il attache l'identité à chaque requête et traduit les réponses d'erreur en
 * messages lisibles. Le back reste seul juge des droits : une erreur 403 est
 * affichée telle quelle, jamais contournée.
 */

import {
  authentificationActive,
  jetonCourant,
  utilisateurLocal,
} from "@/lib/auth";

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export class ErreurApi extends Error {
  constructor(
    message: string,
    readonly statut: number,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ErreurApi";
  }
}

async function entetes(): Promise<HeadersInit> {
  const h: Record<string, string> = { "Content-Type": "application/json" };

  if (authentificationActive) {
    const jeton = await jetonCourant();
    if (jeton) h.Authorization = `Bearer ${jeton}`;
  } else {
    const id = utilisateurLocal();
    if (id) h["x-utilisateur"] = id;
  }

  return h;
}

async function appeler<T>(
  chemin: string,
  init: RequestInit = {},
): Promise<T> {
  const reponse = await fetch(`${BASE}/api${chemin}`, {
    ...init,
    headers: { ...(await entetes()), ...(init.headers ?? {}) },
  });

  if (reponse.status === 204) return undefined as T;

  const texte = await reponse.text();
  const corps = texte ? JSON.parse(texte) : null;

  if (!reponse.ok) {
    throw new ErreurApi(
      corps?.erreur ?? `Erreur ${reponse.status}`,
      reponse.status,
      corps?.code,
      corps?.details,
    );
  }

  return corps as T;
}

export const api = {
  get: <T>(chemin: string) => appeler<T>(chemin),
  post: <T>(chemin: string, corps?: unknown) =>
    appeler<T>(chemin, {
      method: "POST",
      body: corps ? JSON.stringify(corps) : undefined,
    }),
  patch: <T>(chemin: string, corps?: unknown) =>
    appeler<T>(chemin, {
      method: "PATCH",
      body: corps ? JSON.stringify(corps) : undefined,
    }),
};
