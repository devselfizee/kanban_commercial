/// <reference types="vite/client" />

/**
 * Variables d'environnement du front.
 *
 * Elles sont figées dans le bundle au moment du build : une valeur secrète n'a
 * rien à faire ici, tout visiteur peut la lire.
 */
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_KEYCLOAK_URL?: string;
  readonly VITE_KEYCLOAK_REALM?: string;
  readonly VITE_KEYCLOAK_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
