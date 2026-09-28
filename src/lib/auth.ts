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

/** Vrai au retour d'une déconnexion volontaire. */
function retourDeDeconnexion(): boolean {
  return new URLSearchParams(window.location.search).has("deconnecte");
}

/**
 * Initialise Keycloak et exige une session.
 *
 * `login-required` redirige vers Keycloak avant tout rendu : l'application est
 * réservée, un écran intermédiaire pour cliquer « Se connecter » n'ajouterait
 * qu'une étape. Le retour se fait sur la page demandée.
 */
export async function initialiserAuth(): Promise<boolean> {
  if (!authentificationActive) return true;

  // Après une déconnexion, ne pas relancer la connexion : l'utilisateur vient
  // de demander le contraire.
  if (retourDeDeconnexion()) return false;

  keycloak = new Keycloak({
    url: URL_KEYCLOAK!,
    realm: REALM!,
    clientId: CLIENT_ID,
  });

  const authentifie = await keycloak.init({
    onLoad: "login-required",
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
  // Au retour d'une déconnexion, l'initialisation a été court-circuitée :
  // `keycloak` n'existe pas, et le bouton serait inerte. Recharger sans le
  // marqueur relance `login-required`, donc la redirection.
  if (!keycloak) {
    window.location.href = window.location.origin;
    return;
  }
  keycloak.login();
}

export function seDeconnecter() {
  if (authentificationActive) {
    // `login-required` relancerait la connexion dès le retour sur
    // l'application : on revient avec un marqueur, qui affiche l'écran de
    // sortie au lieu de rediriger. Sans lui, se déconnecter ne servirait à
    // rien — on repartirait aussitôt vers Keycloak.
    keycloak?.logout({
      redirectUri: `${window.location.origin}/?deconnecte=1`,
    });
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
