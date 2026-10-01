# Kanban commercial Selfizee — reprendre le projet

Ce document sert à rouvrir le projet après une pause : où sont les dossiers,
comment les lancer, ce qui est branché sur le CRM, et ce qui reste à décider.
Le détail technique de chaque partie est dans son `README.md`.

État décrit : 1er octobre 2026.

## En bref

Le kanban est un outil de suivi commercial posé **à côté** du CRM Selfizee. Il
affiche trois tableaux : **Leads à qualifier**, **Ventes**, **LLD / GRENKE**.

Le CRM reste la source des clients, des demandes et des devis. Le kanban y
ajoute ce que le CRM ne fait pas : le suivi de chaque demande (qui s'en occupe,
quelle est la prochaine action), et le suivi des dossiers de financement GRENKE.

Il suit le document « Proposition de pipeline commercial et LLD pour Selfizee »
(Manus AI, 21 septembre 2026).

## Les trois dossiers

| Dossier | Rôle | Dépôt | Branche |
|---|---|---|---|
| `E:\DEV\kanban_commercial` | Interface (React, Vite, Tailwind) | github.com/devselfizee/kanban_commercial | `main` |
| `E:\DEV\kanban-commercial-api` | API (Node, Express, Prisma, PostgreSQL) | github.com/devselfizee/kanban-commercial-api | `master` |
| `c:\xampp\htdocs\crm-selfizee` | CRM existant (CakePHP 3, MySQL) | devgl.konitys.fr:jeanyves/crm-selfizee | voir ci-dessous |

Attention aux branches : l'interface est sur `main`, l'API sur `master`.

Dans le CRM, le kanban n'a ajouté que des points d'accès en lecture, dans
`src/Controller/ApiV1/`. Ils sont commités. Le dépôt CRM est géré à la main par
l'équipe : ne rien y commiter ni pousser sans demande explicite.

Pour ouvrir le projet dans VS Code : ouvrir `E:\DEV\kanban_commercial`, puis
ajouter `E:\DEV\kanban-commercial-api` à l'espace de travail.

## Lancer en local

Il faut un PostgreSQL joignable. L'API lit `DATABASE_URL` dans son `.env`
(base locale prévue sur `localhost:5434`, conteneur Docker à démarrer).

```bash
# API — http://localhost:4000
cd E:\DEV\kanban-commercial-api
npm install
npm run db:deploy      # applique les migrations
npm run dev

# Interface — http://localhost:5173
cd E:\DEV\kanban_commercial
npm install
npm run dev
```

Sans variables Keycloak, l'interface propose un sélecteur d'utilisateur et l'API
accepte un en-tête `x-utilisateur`. Ce mode sert au développement, jamais en
ligne.

Vérifier avant de commiter : `npx tsc --noEmit` (API) et `npm run build`
(interface). Le script `lint` existe mais ESLint n'est pas installé.

## En ligne (Coolify)

- Interface : https://kanban-commercial.orkessidev.com
- API : une application Coolify distincte (URL à noter ici)
- Connexion : Keycloak `https://plateform-auth.orkessidev.com`, realm `konitys`,
  client public `kanban-commercial`, rôle `kanban-commercial`

**Toujours redéployer l'API avant l'interface.** L'interface s'appuie sur les
champs que l'API renvoie ; dans l'autre ordre, des écrans s'affichent à moitié.

Trois pièges déjà rencontrés :

1. Les variables `VITE_*` de l'interface sont des **Build Arguments**, pas des
   variables d'environnement. Mal placées, le build réussit mais l'écran reste
   bloqué.
2. Keycloak exige HTTPS : en HTTP, le navigateur refuse la connexion.
3. `CORS_ORIGINES` de l'API doit contenir l'URL de l'interface.

Les migrations de base s'appliquent toutes seules au démarrage de l'API.

## Ce qui vient du CRM

Rien n'est importé en masse : le CRM compte 169 708 clients, environ 500 000
contacts et plus de 400 000 devis. Chaque donnée entre selon son usage.

| Donnée | Comment | Fréquence |
|---|---|---|
| Équipe (commerciaux, managers) | profils CRM → rôles du kanban | au démarrage, puis chaque heure |
| Demandes entrantes | opportunités CRM « Pros » et « Achats » → leads | toutes les 5 minutes |
| Dossiers LLD | devis facturés à GRENKE → dossiers LLD + opportunités | toutes les 15 minutes |
| Devis d'un client | lus quand on ouvre une fiche opportunité | à la demande |
| Chiffres du pilotage | devis signés par mois | à la demande |
| Clients | recherche à la création d'un lead | à la demande |

Points d'accès utilisés côté CRM (`/api-v1/…`) :

- `users/equipe?profils=…` — utilisateurs actifs et présents, avec leurs profils
- `opportunites/demandes?pipelines=…` — nouvelles demandes
- `devis/financements?financeur=1853` — devis facturés à GRENKE
- `devis/statistiques?financeur=1853` — devis signés par mois
- `devis/list?client_id=…` — devis d'un client
- `clients/list?search=…` — recherche de clients

Repères propres au CRM Selfizee :

- **GRENKE est le client n° 1853.** Un devis dont `create_facture_to_client_id`
  vaut 1853 est une location financière. GRENKE n'est jamais traité comme un
  prospect.
- **Commercial = profil 11**, avec `etat = actif` et `toujours_present = 1`.
  **Manager = profil 1** (admin, manager et direction partagent ce profil).
- **Pipelines suivis** : 37021 (« Pros ») et 37023 (« Achats »). Les
  particuliers (37022, 82 % du volume) restent dans le CRM.
- Les opportunités du CRM sont en réalité les demandes entrantes : en 2026,
  94 % sont restées « Ouverte » dans la première étape de leur pipeline.

## Réglages de l'API (Coolify)

| Variable | Valeur en place ou attendue |
|---|---|
| `DATABASE_URL` | URL interne du PostgreSQL |
| `CORS_ORIGINES` | URL de l'interface |
| `KEYCLOAK_ISSUER` | `https://plateform-auth.orkessidev.com/realms/konitys` |
| `KEYCLOAK_CLIENT_ID` | `kanban-commercial` |
| `CRM_URL` | racine du CRM |
| `CRM_PROFILS_MANAGER` | `1` |
| `CRM_PROFILS_LLD` | à renseigner quand le profil existera dans le CRM |
| `CRM_COMMERCIAUX_IGNORES` | à renseigner si un compte générique reçoit toutes les demandes |

Les autres variables ont une valeur par défaut correcte ; elles sont décrites
dans `.env.example` de l'API.

Réglages de l'interface (Build Arguments) : `VITE_API_URL`,
`VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID`.

## Commandes dans le conteneur de l'API

```bash
node dist/equipe.cjs                    # relire l'équipe depuis le CRM
node dist/demandes.cjs                  # importer les nouvelles demandes
node dist/demandes.cjs --reimporter     # refaire les leads que personne n'a touchés
node dist/financements.cjs              # importer les devis GRENKE
node dist/nettoyer-demo.cjs             # simulation ; --executer pour appliquer
```

Ne jamais lancer `node dist/seed.cjs` sur la base en ligne : il efface tout.

## Décisions prises

- **Deux dépôts, deux applications Coolify** : interface et API séparées.
- **Le CRM fait autorité** sur les clients, l'équipe et les devis. Le kanban ne
  lui écrit jamais rien.
- **Pas d'import en masse**, vu les volumes. Un client n'entre dans le kanban
  que lorsqu'une demande ou un devis le concerne.
- **Les devis ne passent pas par RabbitMQ** : ils sont lus à la demande.
- **Un dossier LLD déplacé à la main n'est plus repositionné** par l'import :
  le kanban devient alors la référence pour ce dossier.
- **Ventes et loyers ne s'additionnent jamais**, ni dans les fiches ni dans le
  pilotage (exigence du document).

## Points ouverts

1. **Profil « collaboratrice LLD »** à créer dans le CRM, puis à déclarer dans
   `CRM_PROFILS_LLD`. Sans lui, aucun dossier LLD n'a de collaboratrice.
2. **Compte générique** : si toutes les demandes importées vont au même compte
   CRM, le déclarer dans `CRM_COMMERCIAUX_IGNORES`, puis lancer
   `node dist/demandes.cjs --reimporter`.
3. **Contacts** : le CRM n'a pas de point d'accès pour les lire. Un lead importé
   n'a donc pas d'interlocuteur rattaché ; la fiche affiche les coordonnées du
   client.
4. **Listes du CRM** : le kanban traduit les 26 secteurs d'activité et les
   9 sources lead du CRM dans les listes du document. Reprendre directement
   les listes du CRM éviterait cette traduction.
5. **Sécurité de `/api-v1`** : ces points d'accès du CRM sont publics, sans
   authentification. C'est à corriger côté CRM.
6. **Décisions du document encore à prendre** (page 16) : qui tient le pool des
   entrants, délai de première prise en charge, définition de « gagné »,
   informations à confirmer avec GRENKE.
7. **Pilotage** : « Autres affaires » mélange ventes et locations directes. Les
   mois sont ceux de création du devis, faute de date de signature dans le CRM.

## Ce qui n'a pas pu être vérifié en local

Il n'y a pas de base PostgreSQL locale démarrée sur le poste de développement.
Les imports (équipe, demandes, financements) et le nettoyage de la démonstration
ont donc été testés sur leurs règles et contre un faux CRM, puis validés
directement en ligne. Démarrer la base locale permettrait de les tester avant
déploiement.

## Pièges du poste de développement

- Vite n'écoute qu'en IPv6 : utiliser `http://localhost:5173` ou `http://[::1]:5173`,
  pas `127.0.0.1`.
- `pkill` n'existe pas dans Git Bash : arrêter un processus par PowerShell.
- Pour capturer une page sans navigateur ouvert : Edge en mode sans interface,
  avec un profil séparé (`--user-data-dir`). Sa largeur minimale est de 492 px.
