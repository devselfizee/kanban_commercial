/**
 * Points d'entrée d'Auth.js : connexion, retour de Keycloak, déconnexion.
 * Aucune logique ici — tout est dans src/auth.ts.
 */
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
