# Kanban commercial — Selfizee

CRM organisé autour d'une **fiche client unique**, visible dans trois espaces de
travail reliés : qualification des leads, pipeline commercial, suivi LLD / GRENKE.

Implémentation de « Proposition de pipeline commercial et LLD pour Selfizee »
(Manus AI, 21 septembre 2026).

---

## Architecture

Deux applications distinctes, déployées séparément :

| Dossier | Rôle | Stack | Port |
|---|---|---|---|
| `back/` | API et logique métier | Node.js, Express, Prisma, TypeScript | 4000 |
| `front/` | Interface | React, Vite, TypeScript, Tailwind | 5173 (dev) |

**Le back décide, le front affiche.** Les règles du document — priorité, seuil de
qualification, alerte de compatibilité partenaire, matrice de droits — sont
appliquées côté serveur. Le front peut les refléter pour guider la saisie, il ne
peut pas les contourner : les drapeaux « sans suivi » ou « prise en charge
tardive » arrivent calculés depuis l'API.

L'ancienne version en Next.js est conservée sur la branche `next-js-archive`.

## Démarrage en local

Il faut un PostgreSQL joignable. Deux terminaux :

```bash
# API
cd back
cp ../.env.example .env        # renseigner DATABASE_URL
npm install
npm run db:deploy              # applique les migrations
npm run db:seed                # jeu de démonstration (optionnel)
npm run dev                    # http://localhost:4000

# Interface
cd front
npm install
npm run dev                    # http://localhost:5173
```

Le serveur Vite relaie `/api` vers le back : rien à configurer pour les appels.

**Authentification.** Sans les variables Keycloak, l'interface propose un
sélecteur d'utilisateur et l'API accepte un en-tête `x-utilisateur`. Pratique
pour éprouver la matrice de droits en changeant de rôle d'un clic, à ne jamais
exposer publiquement. Cinq comptes sont créés par le seed — Marie et Thomas
(commerciaux), Sophie (collaboratrice LLD), Laurent (manager), Claire
(direction).

## Structure

```
back/
├── prisma/
│   ├── schema.prisma        les 5 objets, les listes de valeurs, les relations
│   ├── migrations/          l'historique du schéma
│   └── seed.ts              données de démonstration, y compris les cas qui
│                            déclenchent les alertes
└── src/
    ├── serveur.ts           montage des routes, CORS, sonde de santé
    ├── domaine/             les 3 pipelines, les règles, les libellés
    ├── routes/              une route par espace de travail
    ├── crm/                 synchronisation RabbitMQ entrante
    └── lib/                 Prisma, authentification, journal, références

front/
└── src/
    ├── App.tsx              routage et garde d'accès
    ├── api/client.ts        client HTTP, porte le jeton
    ├── lib/                 auth Keycloak, types, libellés, colonnes, formats
    ├── composants/          Carte, Tableau, Navigation, en-têtes
    └── pages/               les écrans
```

`libelles.ts` et `pipelines.ts` existent des deux côtés : le back en a besoin
pour ses réponses, le front pour l'affichage. C'est la rançon de la séparation —
toute modification doit être reportée dans les deux.

## Le modèle de données

Cinq objets reliés, et une règle : **le passage du lead à l'opportunité est un
changement de maturité, pas un changement de fiche**. Le lead est conservé, les
activités et les tâches lui restent attachées, l'opportunité pointe vers lui.
De même, un dossier LLD est relié à une opportunité unique, sans créer de
seconde fiche client.

```
Organisation ─┬─ Contact
              ├─ Lead ──────► Opportunité ──────► Dossier LLD
              └─ Opportunité      │                    │
                                  ├─ Devis             ├─ ChecklistItem
                                  │                    └─ Document
                                  └─ Activité, Tâche, JournalEntrée
```

Chaque enregistrement porte une référence stable et lisible — `L-2026-00184`,
`OPP-2026-00073`, `LLD-2026-00018` — destinée à circuler dans les exports, devis
et échanges internes.

### Quatre notions distinctes

Le modèle sépare volontairement quatre informations que les CRM mal paramétrés
confondent :

| Notion | Question | Champ |
|---|---|---|
| Origine | Comment le contact est arrivé | `modeAcquisition` + `canalDetaille` |
| Statut de lead | Sa maturité avant qualification | `statut` (pipeline 1) |
| Étape commerciale | L'avancement de la vente | `etape` (pipeline 2) |
| Statut LLD | Des événements de dossier et de contrat | `statut` (pipeline 3) |

Le canal d'acquisition est un **champ filtrable**, jamais une colonne de
pipeline : un même lead peut venir d'un salon puis se convertir après une
relance téléphonique. La durée de LLD suit la même règle — c'est un champ
numérique, pas une colonne.

## Les garde-fous implémentés

Ces règles sont dans le code du back, pas seulement dans la documentation.

**Aucune carte n'est perdue.** Une carte sans prochaine action datée ni attente
formalisée est signalée en rouge et listée dans « Mes actions ». Les étapes
terminales et les attentes explicitement datées en sont exclues.

**La priorité n'évalue jamais la solvabilité.** `calculerPriorite()` n'accepte
que des critères commerciaux visibles — demande entrante, échéance proche, devis
demandé, client existant, valeur indicative. Aucune donnée financière n'y entre.

**Le CRM n'interprète pas le partenaire.** Le pipeline LLD n'enregistre que des
faits observables : date et preuve de transmission, date et source du retour
communiqué, signatures, livraison. Passer à « réponse communiquée par GRENKE »
exige d'avoir saisi le contenu du retour ; passer à « contrat actif » exige
l'évènement de confirmation de livraison.

**La compatibilité est une alerte, jamais un refus.** Selfizee propose des durées
de 1 à 36 mois ; les informations publiques du partenaire indiquent 12 à 60 mois.
Hors de cette plage, `verifierCompatibilitePartenaire()` affiche « compatibilité
partenaire à confirmer » — et le dossier suit son cours.

**Le libellé « non finançable » n'existe pas.** Les motifs de clôture LLD sont
factuels : client retire sa demande, dossier incomplet après relances, solution
d'achat retenue, retour partenaire défavorable communiqué, etc.

**Les valeurs ne sont jamais additionnées.** Montant de vente, mise en place,
loyer mensuel et durée sont des champs distincts, affichés séparément.

**La réattribution laisse une trace.** Le journal conserve l'ancien propriétaire,
le nouveau, la date, l'auteur et le motif — ce dernier étant obligatoire.

## Matrice de droits

| Rôle | Périmètre |
|---|---|
| Commercial | Ses leads et opportunités, plus le pool non attribué ; lecture du statut LLD associé, sans le contenu des documents financiers |
| Collaboratrice LLD | Ses dossiers LLD ; seule elle (avec le manager) fait progresser un dossier |
| Manager | Vision complète, réattribution, paramétrage |
| Direction | Lecture des rapports et des dossiers |

La collaboratrice valide elle-même l'état « prêt à transmettre » : aucune
automatisation ne le fait à sa place, même quand la checklist interne est
complète.

## Déploiement Coolify

Trois ressources.

### 1. La base de données

**New Resource → Database → PostgreSQL**. Coolify fournit une URL interne du
type `postgres://user:motdepasse@nom-du-service:5432/base`. C'est elle qu'il
faut, pas l'URL publique : les ressources partagent le réseau interne.

### 2. L'API

**New Resource → Application → Private Repository**, ce dépôt, avec :

- **Base Directory** : `back`
- **Build Pack** : Dockerfile
- **Port** : 4000

Variables d'environnement :

| Variable | Obligatoire | Valeur |
|---|---|---|
| `DATABASE_URL` | oui | l'URL interne du service PostgreSQL |
| `CORS_ORIGINES` | oui | l'URL publique du front |
| `KEYCLOAK_ISSUER` | recommandé | `https://.../realms/NOM_DU_REALM` |
| `KEYCLOAK_CLIENT_ID` | recommandé | `kanban-commercial` |
| `SYNCHRO_SECRET` | non | si la synchro CRM est activée |
| `RABBITMQ_*` | non | voir `.env.example` |

⚠️ **Sans `KEYCLOAK_ISSUER`, l'API accepte un simple en-tête `x-utilisateur`**
pour désigner le compte. Ce mode convient au développement local ; il ne doit
jamais être exposé publiquement.

### 3. L'interface

Même dépôt, avec :

- **Base Directory** : `front`
- **Build Pack** : Dockerfile
- **Port** : 80

⚠️ Les variables `VITE_*` sont **figées dans le bundle au moment du build**.
Elles se déclarent en **Build Arguments**, pas en variables d'environnement :

| Argument | Valeur |
|---|---|
| `VITE_API_URL` | l'URL publique de l'API |
| `VITE_KEYCLOAK_URL` | `https://plateform-auth.exemple.com` |
| `VITE_KEYCLOAK_REALM` | le realm |
| `VITE_KEYCLOAK_CLIENT_ID` | `kanban-commercial` |

Aucun secret ne doit y figurer : tout visiteur peut les lire.

### 4. Le client Keycloak

Dans la console Keycloak, sur le realm concerné :

1. **Clients → Create client**
   - Client ID : `kanban-commercial`
   - Client authentication : **Off** pour un client public (PKCE)
   - Standard flow : coché
2. **Valid redirect URIs** : `https://kanban.exemple.com/*`
3. **Web origins** : `https://kanban.exemple.com`
4. **Realm roles → Create role** : `kanban-commercial`, puis l'attribuer aux
   personnes autorisées.

Ce rôle unique ouvre l'accès. Le rôle métier reste géré dans le kanban et
rapproché par l'adresse e-mail.

### 5. Après le premier déploiement

`docker-entrypoint.sh` applique `prisma migrate deploy` avant de démarrer l'API :
les migrations suivent chaque déploiement sans intervention.

La base démarre **vide**. Pour la peupler avec le jeu de démonstration, ouvrir un
terminal sur le conteneur de l'API :

```bash
node dist/seed.mjs
```

⚠️ Le seed **efface toutes les données existantes**. Il ne doit jamais être
exécuté sur une base contenant de vraies données.

Sans seed, aucun utilisateur n'existe et la connexion aboutira sur « aucun compte
ne vous correspond ». Les créer en SQL, avec **les mêmes e-mails que dans
Keycloak** :

```sql
INSERT INTO utilisateurs (id, email, nom, prenom, role, actif, "creeLe", "majLe")
VALUES (gen_random_uuid()::text, 'prenom.nom@selfizee.fr', 'Nom', 'Prénom',
        'COMMERCIAL', true, now(), now());
```

Rôles : `COMMERCIAL`, `COLLABORATRICE_LLD`, `MANAGER`, `DIRECTION`.

## Synchronisation avec le CRM Selfizee

**Sens unique : CRM → kanban.** Le CRM fait autorité sur l'identité du client ;
le kanban ne lui réécrit jamais rien.

| Objet du kanban | Table CRM | État |
|---|---|---|
| Organisation | `clients` | Actif — le CRM publie déjà ces événements |
| Contact | `client_contacts` | Nécessite une ligne côté CRM |
| Devis | `devis` | Nécessite une ligne côté CRM |
| Lead, opportunité, dossier LLD | — | Propres au kanban, jamais synchronisés |

Le CRM publie sur un bus RabbitMQ à chaque modification, avec des clés de
routage `crm.{table}.{inserted,updated,deleted}`. Le kanban lit sa queue par
l'API HTTP de management — même approche que le CRM, le port AMQP n'étant pas
joignable sous Coolify.

Déclencher le drainage périodiquement :

```bash
curl -X POST https://kanban-api.exemple.com/api/synchro \
  -H "x-synchro-secret: $SYNCHRO_SECRET"
```

Une tâche planifiée toutes les deux minutes suffit.

### Garanties

- **Idempotence** — le bus livre « au moins une fois » ; une empreinte unique en
  base écarte les relivraisons.
- **Désordre** — un événement antérieur à la version enregistrée est ignoré.
- **Non-régression** — seuls les champs dont le CRM est maître sont écrits. Le
  segment affiné par le commercial, le propriétaire et les notes sont préservés.
- **Rapprochement** — recherche par SIREN, e-mail, téléphone puis nom avant toute
  création, pour ne pas dupliquer une fiche saisie à la main.
- **Suppression** — une fiche supprimée au CRM est détachée, jamais effacée.

### Pour étendre aux contacts et aux devis

Une ligne à ajouter côté CRM, dans `ClientContactsTable` et `DevisTable` :

```php
$this->addBehavior('EventPublisher');
```

## Points à trancher avant le paramétrage définitif

Implémentés avec des valeurs par défaut, à ajuster :

- **Délai de première prise en charge** — 8 h ouvrées pour un entrant, 72 h pour
  la prospection (`DELAI_PRISE_EN_CHARGE_HEURES`).
- **Définition de « gagné »** — commande finalisée ou livraison confirmée.
- **Personne qui tient le pool des entrants**.
- **Segments à conserver** — à ajuster après un mois de données réelles.
- **Informations à confirmer avec GRENKE** — durées acceptées, pièces exigées,
  canal de transmission, délais de réponse. Tant que cette confirmation n'a pas
  eu lieu, le suivi partenaire reste manuel et factuel.

## RGPD

Les consentements et préférences de contact sont portés par le contact. Les
organisations conservent leur source, leur date de collecte et le fondement du
contact. Les changements de statut LLD, les transmissions et les accès aux
documents sont journalisés.

Une **politique de conservation** reste à définir avec la personne compétente en
protection des données : durée de vie des leads non qualifiés, des devis perdus,
des contrats actifs et des pièces liées au financement. Le CRM n'est pas un
coffre-fort documentaire.

## Commandes

```bash
# API (dans back/)
npm run dev          # développement
npm run build        # compilation TypeScript
npm run db:migrate   # créer une migration
npm run db:deploy    # appliquer les migrations
npm run db:studio    # explorer la base
npm run db:seed      # réinitialiser le jeu de démonstration

# Interface (dans front/)
npm run dev          # développement
npm run build        # bundle de production
npm run preview      # servir le bundle localement
```
