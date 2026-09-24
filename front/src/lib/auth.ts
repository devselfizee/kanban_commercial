/**
 * Authentification Keycloak côté navigateur.
 *
 * Même approche que les autres applications Selfizee : `keycloak-js` en flux
 * PKCE, avec les variables `VITE_KEYCLOAK_*`. Le jeton obtenu accompagne chaque
 * appel à l'API, qui en vérifie la signature de son côté — le front ne décide
 * jamais des droits, il les reflète.
 *
 * Sans configuration Keycloak, un mode local désigne l'utilisateur par un
 * en-tête. Il sert au développement et ne doit jamais être exposé.
 */

import Keycloak from "keycloak-js";

const URL_KEYCLOAK = import.meta.env.VITE_KEYCLOAK_URL as string | undefined;
const REALM = import.meta.env.VITE_KEYCLOAK_REALM as string | undefined;
const CLIENT_ID =
  (import.meta.env.VITE_KEYCLOAK_CLIENT_ID as string | undefined) ??
  "kanban-commercial";

export const authentificationActive = Boolean(URL_KEYCLOAK && REALM);

let keycloak: Keycloak | null = null;

/** Clé du mode local : l'identifiant choisi dans le sélecteur. */
const CLE_UTILISATEUR_LOCAL = "kanban_utilisateur_local";

export function utilisateurLocal(): string | null {
  try {
    return localStorage.getItem(CLE_UTILISATEUR_LOCAL);
  } catch {
    return null;
  }
}

export function definirUtilisateurLocal(id: string | null) {
  try {
    if (id) localStorage.setItem(CLE_UTILISATEUR_LOCAL, id);
    else localStorage.removeItem(CLE_UTILISATEUR_LOCAL);
  } catch {
    // Stockage indisponible (navigation privée) : on ignore, la session sera
    // simplement perdue au rechargement.
  }
}

/**
 * Initialise Keycloak et exige une session.
 *
 * `check-sso` plutôt que `login-required` : le premier laisse la page s'afficher
 * pour proposer une connexion explicite, le second redirige avant tout rendu.
 */
export async function initialiserAuth(): Promise<boolean> {
  if (!authentificationActive) return true;

  keycloak = new Keycloak({
    url: URL_KEYCLOAK!,
    realm: REALM!,
    clientId: CLIENT_ID,
  });

  const authentifie = await keycloak.init({
    onLoad: "check-sso",
    pkceMethod: "S256",
    checkLoginIframe: false,
  });

  if (authentifie) {
    // Le jeton expire : on le renouvelle en arrière-plan plutôt que de laisser
    // l'utilisateur tomber sur un 401 au milieu d'une saisie.
    setInterval(() => {
      keycloak?.updateToken(60).catch(() => {
        // Le renouvellement a échoué : la session est perdue côté Keycloak.
        keycloak?.login();
      });
    }, 30_000);
  }

  return authentifie;
}

export function seConnecter() {
  keycloak?.login();
}

export function seDeconnecter() {
  if (authentificationActive) {
    keycloak?.logout({ redirectUri: window.location.origin });
  } else {
    definirUtilisateurLocal(null);
    window.location.reload();
  }
}

export function estAuthentifie(): boolean {
  if (!authentificationActive) return Boolean(utilisateurLocal());
  return Boolean(keycloak?.authenticated);
}

/** Jeton courant, rafraîchi si nécessaire. */
export async function jetonCourant(): Promise<string | null> {
  if (!authentificationActive || !keycloak) return null;
  try {
    await keycloak.updateToken(30);
  } catch {
    return null;
  }
  return keycloak.token ?? null;
}

/** E-mail porté par le jeton, pour les messages d'erreur. */
export function emailJeton(): string | null {
  const profil = keycloak?.tokenParsed as
    | { email?: string; preferred_username?: string }
    | undefined;
  return profil?.email ?? profil?.preferred_username ?? null;
}
