/**
 * Authentification par Keycloak (Auth.js).
 *
 * Keycloak répond à une seule question : « qui êtes-vous, et avez-vous le droit
 * d'entrer ? » Le droit d'entrer est porté par le rôle `kanban-commercial`.
 *
 * Le rôle métier — commercial, collaboratrice LLD, manager, direction — reste
 * géré dans le kanban et rapproché par l'e-mail : c'est un découpage propre à
 * cette application, pas une notion d'annuaire.
 *
 * Sans les variables d'environnement Keycloak, l'authentification est désactivée
 * et le sélecteur d'utilisateur du MVP reprend la main. Cela permet de continuer
 * à développer en local sans instance Keycloak.
 */

import NextAuth, { type DefaultSession } from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Rôle Keycloak qui ouvre l'accès à l'application. */
const ROLE_ACCES = process.env.KEYCLOAK_ROLE_ACCES || "kanban-commercial";

export const keycloakConfigure = Boolean(
  process.env.AUTH_KEYCLOAK_ISSUER &&
    process.env.AUTH_KEYCLOAK_ID &&
    process.env.AUTH_KEYCLOAK_SECRET,
);

declare module "next-auth" {
  interface Session {
    user: {
      /** Identifiant de l'utilisateur dans la base du kanban. */
      idKanban: string | null;
      role: Role | null;
    } & DefaultSession["user"];
  }
}

/** Rôles portés par un jeton Keycloak, realm et client confondus. */
type JetonKeycloak = {
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
};

function aLeRoleAcces(jeton: unknown, clientId: string | undefined): boolean {
  const j = jeton as JetonKeycloak | undefined;
  if (!j) return false;

  const realm = j.realm_access?.roles ?? [];
  const client = clientId ? (j.resource_access?.[clientId]?.roles ?? []) : [];

  return [...realm, ...client].includes(ROLE_ACCES);
}

/** Décode la charge utile d'un JWT sans en vérifier la signature. */
function chargeJwt(jwt: string): unknown {
  try {
    const partie = jwt.split(".")[1];
    if (!partie) return null;
    return JSON.parse(Buffer.from(partie, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: keycloakConfigure
    ? [
        Keycloak({
          clientId: process.env.AUTH_KEYCLOAK_ID,
          clientSecret: process.env.AUTH_KEYCLOAK_SECRET,
          issuer: process.env.AUTH_KEYCLOAK_ISSUER,
        }),
      ]
    : [],

  session: { strategy: "jwt" },

  pages: {
    signIn: "/connexion",
    error: "/connexion",
  },

  callbacks: {
    /**
     * Porte d'entrée : sans le rôle d'accès, la connexion est refusée.
     *
     * Le contrôle porte sur le jeton d'accès émis par Keycloak, seule source
     * faisant foi — les rôles ne sont pas déduits de l'e-mail ni du profil.
     */
    async signIn({ account }) {
      if (!account?.access_token) return false;
      return aLeRoleAcces(chargeJwt(account.access_token), process.env.AUTH_KEYCLOAK_ID);
    },

    async jwt({ token, profile }) {
      if (profile?.email) token.email = profile.email;
      return token;
    },

    /**
     * Rapproche l'identité Keycloak d'un utilisateur du kanban, par e-mail.
     *
     * Aucune création automatique : un compte doit exister et être actif dans le
     * kanban. Un utilisateur authentifié mais inconnu ici obtient une session
     * sans rôle, et l'interface le lui dit clairement plutôt que de le laisser
     * face à des écrans vides.
     */
    async session({ session, token }) {
      const email = token.email ?? session.user?.email;

      const utilisateur = email
        ? await prisma.utilisateur
            .findFirst({
              where: { email, actif: true },
              select: { id: true, role: true, prenom: true, nom: true },
            })
            .catch(() => null)
        : null;

      session.user.idKanban = utilisateur?.id ?? null;
      session.user.role = utilisateur?.role ?? null;
      if (utilisateur) {
        session.user.name = `${utilisateur.prenom} ${utilisateur.nom}`;
      }

      return session;
    },
  },
});
