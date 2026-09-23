/**
* Barrière d'accès.
 *
 * Quand Keycloak est configuré, aucune page n'est servie à un visiteur non
 * authentifié : la redirection a lieu avant le rendu, donc avant toute requête
 * en base. Les pages appliquent ensuite la matrice de droits par rôle — ce
 * filtre ne dit que « connecté ou non ».
 *
 * Quand Keycloak n'est pas configuré (développement local), tout passe : c'est
 * le mode sélecteur, qui ne doit jamais être exposé publiquement.
 */

import { NextResponse, type NextRequest } from "next/server";
import { keycloakEstConfigure } from "@/lib/keycloak";

const CHEMINS_PUBLICS = ["/connexion", "/api/auth"];

export function proxy(requete: NextRequest) {
  const keycloakConfigure = keycloakEstConfigure();

  if (!keycloakConfigure) return NextResponse.next();

  const { pathname } = requete.nextUrl;

  if (CHEMINS_PUBLICS.some((c) => pathname.startsWith(c))) {
    return NextResponse.next();
  }

  // La synchronisation CRM est appelée par une machine : elle s'authentifie par
  // son propre secret partagé, pas par une session Keycloak.
  if (pathname.startsWith("/api/synchro-crm")) return NextResponse.next();

  // Présence d'un cookie de session. Sa validité est vérifiée par Auth.js dans
  // les pages ; ici on écarte seulement les visiteurs manifestement anonymes,
  // ce qui évite de déchiffrer le jeton à chaque requête d'actif.
  const aSession =
    requete.cookies.has("authjs.session-token") ||
    requete.cookies.has("__Secure-authjs.session-token");

  if (!aSession) {
    const url = requete.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("suite", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Exclut les ressources statiques et les images : inutile de les protéger,
  // et ce filtre ne doit pas se déclencher à chaque fichier servi.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|marque).*)"],
};
