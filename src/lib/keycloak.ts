/**
 * Détection de la configuration Keycloak.
 *
 * Ce test est utilisé à deux endroits — le filtre `proxy.ts` et la
 * configuration `auth.ts` — qui s'exécutent dans des contextes différents. Les
 * laisser diverger ouvrirait une faille : un filtre plus permissif que
 * l'authentification laisse passer des visiteurs anonymes.
 *
 * Le secret n'entre pas dans ce test : un client Keycloak *public* n'en a pas
 * et s'authentifie par PKCE.
 */
export function keycloakEstConfigure(): boolean {
  return Boolean(
    process.env.AUTH_KEYCLOAK_ISSUER && process.env.AUTH_KEYCLOAK_ID,
  );
}
