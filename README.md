# Kanban commercial — interface

Interface du CRM Selfizee : qualification des leads, pipeline commercial, suivi
LLD / GRENKE, autour d'une **fiche client unique**.

Implémentation de « Proposition de pipeline commercial et LLD pour Selfizee »
(Manus AI, 21 septembre 2026).

L'API est un projet distinct : **kanban-commercial-api**.

---

## Le principe

**Le back décide, le front affiche.** Les règles du document — priorité, seuil de
qualification, alerte de compatibilité partenaire, matrice de droits — sont
appliquées par l'API. Cette interface les reflète pour guider la saisie, elle ne
les rejoue pas : les drapeaux « sans suivi » ou « prise en charge tardive »
arrivent déjà calculés.

Un refus de l'API s'affiche tel quel plutôt que d'être contourné.

## Démarrage

L'API doit tourner en parallèle (port 4000 par défaut).

```bash
npm install
npm run dev        # http://localhost:5173
```

Le serveur Vite relaie `/api` vers le back : rien à configurer pour les appels.

**Authentification.** Sans les variables `VITE_KEYCLOAK_*`, l'interface propose
un sélecteur d'utilisateur. Pratique pour éprouver la matrice de droits en
changeant de rôle d'un clic, à ne jamais exposer publiquement. Cinq comptes sont
créés par le seed de l'API — Marie et Thomas (commerciaux), Sophie
(collaboratrice LLD), Laurent (manager), Claire (direction).

## Structure

```
src/
├── main.tsx             point d'entrée : résout Keycloak avant le premier rendu
├── App.tsx              routage et garde d'accès
├── styles.css           la charte Selfizee
│
├── api/client.ts        client HTTP : attache le jeton à chaque requête
│
├── lib/
│   ├── auth.ts          keycloak-js en PKCE
│   ├── types.ts         les énumérations du domaine
│   ├── libelles.ts      les libellés français des listes de valeurs
│   ├── pipelines.ts     les colonnes des trois tableaux
│   └── format.ts        dates, euros, titres de cartes
│
├── hooks/useApi.ts      chargement : états chargement / erreur / données
│
├── composants/
│   ├── Carte.tsx        la carte kanban
│   ├── Tableau.tsx      colonnes et glisser-déposer
│   ├── Navigation.tsx   barre horizontale
│   ├── EnTetePipeline.tsx
│   └── Etats.tsx        chargement et erreur
│
└── pages/               Accueil, Leads, NouveauLead, Ventes, Lld,
                         MesActions, Pilotage, Synchro, Connexion
```

### `pipelines.ts`

C'est la traduction en code du tableau du document : pour chaque colonne, son
libellé, sa définition opérationnelle et la sortie attendue — ce que le
commercial lit en en-tête et en infobulle.

Deux propriétés dépassent l'affichage :

- **`terminale`** — « Gagné », « Perdu ». Une carte qui y arrive n'a plus besoin
  de prochaine action, donc elle n'est pas signalée en rouge.
- **`attenteFormalisee`** — « Nurturing », « Transmis à GRENKE ». Une carte peut
  y attendre sans alerte, à condition d'avoir une date de relance.

Ces deux drapeaux implémentent la règle « une carte ne doit jamais être perdue »,
avec ses exceptions.

## Barres et thème : la plateforme Konitys

Comme Stock Manager, le kanban s'intègre à la plateforme Konitys :

- **La barre du haut et la barre latérale sont chargées en ligne** depuis le
  hub (`VITE_PLATEFORM_URL`, `https://plateform.orkessidev.com` par défaut),
  par Module Federation — `src/remoteLoader.ts`, repris de Stock Manager. Une
  évolution du hub (sélecteur d'applications, compte, notifications) arrive
  sans redéployer le kanban.
- **Si le hub ne répond pas**, des versions locales au même dessin prennent le
  relais (`src/composants/layout/BarresLocales.tsx`) : la navigation ne dépend
  jamais d'un service tiers.
- **Le thème** reprend les jetons `--k-*` de Stock Manager : fond bleu clair,
  accent indigo, barre latérale bleu nuit, police Inter. Les variables
  historiques du kanban (`--selfizee-*`, `--texte…`, `--trait…`) pointent vers
  ces jetons dans `styles.css` ; `--selfizee-*` est donc l'échelle de l'accent
  indigo, non plus le rose de la charte Selfizee.

Chaque tableau porte en badge, dans la barre latérale, ses cartes sans suivi.

L'ambre et le rouge restent réservés aux cartes qui demandent une action —
distincts de l'accent, pour qu'une carte en retard ne se fonde jamais dans le
décor.

| Élément | Couleur |
|---|---|
| Accent, élément actif | `--k-primary` `#4f46e5` |
| Fond de page | `--k-bg` `#ebf0fa` |
| Barre latérale | `--k-sidebar-bg` `#1e2a40` |
| Alerte partenaire | `--alerte-bord` `#fec046` |
| Carte sans suivi | `--danger` `#dc2626` |

## Déploiement Coolify

**New Resource → Application → Private Repository**, ce dépôt, avec le build
pack **Dockerfile** et le port **80**.

⚠️ Les variables `VITE_*` sont **figées dans le bundle au moment du build**.
Elles se déclarent en **Build Arguments**, pas en variables d'environnement :
placées au mauvais endroit, le build réussit mais l'interface ne sait pas où
joindre l'API, et l'écran reste en chargement.

| Argument | Valeur |
|---|---|
| `VITE_API_URL` | l'URL publique de l'API |
| `VITE_KEYCLOAK_URL` | `https://plateform-auth.exemple.com` |
| `VITE_KEYCLOAK_REALM` | le realm |
| `VITE_KEYCLOAK_CLIENT_ID` | `kanban-commercial` |

Aucun secret ne doit y figurer : tout visiteur peut les lire.

Côté API, `CORS_ORIGINES` doit contenir l'URL publique de cette interface — sans
quoi le navigateur bloquera tous les appels, avec une erreur qui ressemble à une
panne réseau.

### Le client Keycloak

Dans la console Keycloak, sur le realm concerné :

1. **Clients → Create client**
   - Client ID : `kanban-commercial`
   - Client authentication : **Off** pour un client public (PKCE)
   - Standard flow : coché
2. **Valid redirect URIs** : `https://kanban.exemple.com/*`
3. **Web origins** : `https://kanban.exemple.com`
4. **Realm roles → Create role** : `kanban-commercial`, puis l'attribuer aux
   personnes autorisées.

Ce rôle unique ouvre l'accès. Le rôle métier — commercial, collaboratrice LLD,
manager, direction — est géré côté API et rapproché par l'adresse e-mail : un
utilisateur authentifié mais sans compte dans le kanban obtient un message
explicite, pas un écran vide.

## Commandes

```bash
npm run dev          # développement
npm run build        # bundle de production
npm run preview      # servir le bundle localement
npm run lint
```
