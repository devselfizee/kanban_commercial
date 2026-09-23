# Kanban commercial — Selfizee

CRM organisé autour d'une **fiche client unique**, visible dans trois espaces de
travail reliés : qualification des leads, pipeline commercial, suivi LLD / GRENKE.

Implémentation de « Proposition de pipeline commercial et LLD pour Selfizee »
(Manus AI, 21 septembre 2026).

---

## Démarrage

```bash
npm install
cp .env.example .env     # renseigner DATABASE_URL
npm run db:deploy        # applique les migrations
npm run db:seed          # jeu de démonstration (optionnel)
npm run dev              # http://localhost:3000
```

La base de développement tourne dans le conteneur Docker `ventes-postgres-local`
(port 5434), dans une base `kanban_commercial` isolée. Pour repartir d'une base
neuve ailleurs, il suffit de changer `DATABASE_URL`.

Le MVP n'a pas d'authentification : le sélecteur en haut à droite fixe
l'utilisateur courant, ce qui permet de tester la matrice de droits. Cinq comptes
sont créés par le seed — Marie et Thomas (commerciaux), Sophie (collaboratrice
LLD), Laurent (manager), Claire (direction).

## Structure

| Chemin | Rôle |
|---|---|
| `prisma/schema.prisma` | Les 5 objets, les listes de valeurs et les relations |
| `prisma/seed.ts` | Données de démonstration, y compris les cas qui déclenchent les alertes |
| `src/lib/domaine/pipelines.ts` | Les trois pipelines, colonne par colonne, avec définition et sortie attendue |
| `src/lib/domaine/regles.ts` | Priorité, seuil de qualification, compatibilité partenaire, champs obligatoires |
| `src/lib/domaine/libelles.ts` | Libellés français des listes de valeurs |
| `src/app/actions/` | Actions serveur des trois pipelines |
| `src/app/leads`, `ventes`, `lld` | Tableaux et fiches détaillées |
| `src/app/mes-actions` | Tâches échues et cartes sans suivi planifié |
| `src/app/pilotage` | Indicateurs de §11 |

## Le modèle de données

Cinq objets reliés, et une règle : **le passage du lead à l'opportunité est un
changement de maturité, pas un changement de fiche**. Le lead est conservé, les
activités et les tâches lui restent attachées, l'opportunité pointe vers lui.
De même, un dossier LLD est relié à une opportunité unique, sans créer de seconde
fiche client.

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

Le canal d'acquisition est un **champ filtrable**, jamais une colonne de pipeline :
un même lead peut venir d'un salon puis se convertir après une relance téléphonique.
La durée de LLD suit la même règle — c'est un champ numérique, pas une colonne.

## Les garde-fous implémentés

Ces règles sont dans le code, pas seulement dans la documentation.

**Aucune carte n'est perdue.** Une carte sans prochaine action datée ni attente
formalisée est signalée en rouge sur le tableau et listée dans « Mes actions ».
Les étapes terminales et les attentes explicitement datées en sont exclues.

**La priorité n'évalue jamais la solvabilité.** `calculerPriorite()` n'accepte que
des critères commerciaux visibles — demande entrante, échéance proche, devis
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
loyer mensuel et durée sont des champs distincts, affichés séparément sur les
tableaux de bord.

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
automatisation ne le fait à sa place, même quand la checklist interne est complète.

## Déploiement Coolify

### 1. La base de données

**New Resource → Database → PostgreSQL**. Coolify fournit une URL interne du
type `postgres://user:motdepasse@nom-du-service:5432/base`. C'est elle qu'il
faut, pas l'URL publique : les deux ressources partagent le réseau interne.

### 2. L'application

**New Resource → Application → Private Repository (GitHub App)**, puis ce
dépôt. Coolify détecte le `Dockerfile` à la racine — laisser le build pack sur
`Dockerfile`, et non sur Nixpacks.

Port exposé : **3000**.

### 3. Les variables d'environnement

| Variable | Obligatoire | Valeur |
|---|---|---|
| `DATABASE_URL` | oui | l'URL interne du service PostgreSQL |
| `SYNCHRO_SECRET` | non | un secret long et aléatoire, si la synchro CRM est activée |
| `RABBITMQ_*` | non | voir `.env.example` |

Sans les variables `RABBITMQ_*`, la synchronisation reste inactive et
l'application fonctionne de façon autonome.

### 4. Déployer

`docker-entrypoint.sh` applique `prisma migrate deploy` avant de démarrer le
serveur : les migrations suivent chaque déploiement sans intervention. L'image
utilise la sortie `standalone` de Next.js et tourne sous un utilisateur non
privilégié.

La base démarre **vide**. Pour la peupler avec le jeu de démonstration, ouvrir
un terminal sur le conteneur de l'application et lancer :

```bash
node prisma/seed.mjs
```

(Le seed est transpilé au build : l'image de production n'embarque pas `tsx`.)

⚠️ Le seed **efface toutes les données existantes** avant de recréer le jeu de
démonstration. Il ne doit jamais être exécuté sur une base contenant de vraies
données.

### 5. Créer les utilisateurs réels

Le MVP n'a pas d'écran d'administration des comptes. Sur une base vide sans
seed, aucun utilisateur n'existe et le sélecteur reste vide. Les créer en SQL
depuis le terminal du service PostgreSQL :

```sql
INSERT INTO utilisateurs (id, email, nom, prenom, role, actif, "creeLe", "majLe")
VALUES (gen_random_uuid()::text, 'prenom.nom@selfizee.fr', 'Nom', 'Prénom',
        'COMMERCIAL', true, now(), now());
```

Rôles disponibles : `COMMERCIAL`, `COLLABORATRICE_LLD`, `MANAGER`, `DIRECTION`.

## Synchronisation avec le CRM Selfizee

**Sens unique : CRM → kanban.** Le CRM fait autorité sur l'identité du client ;
le kanban ne lui réécrit jamais rien. C'est le choix le plus sûr : aucune
modification du CRM n'est nécessaire, et aucune donnée de référence ne risque
d'être écrasée depuis le kanban.

### Ce qui circule

| Objet du kanban | Table CRM | État |
|---|---|---|
| Organisation | `clients` | Actif — le CRM publie déjà ces événements |
| Contact | `client_contacts` | Nécessite une ligne côté CRM (voir plus bas) |
| Devis | `devis` | Nécessite une ligne côté CRM |
| Lead, opportunité, dossier LLD | — | Propres au kanban, jamais synchronisés |

Le CRM publie sur un bus RabbitMQ à chaque modification, avec des clés de
routage `crm.{table}.{inserted,updated,deleted}`. Le kanban lit sa propre queue
par l'API HTTP de management — même approche que le CRM, parce que le port AMQP
n'est pas joignable sous Coolify.

### Mise en service

Renseigner les variables d'environnement (voir `.env.example`), puis déclencher
le drainage périodiquement :

```bash
curl -X POST https://kanban.exemple.com/api/synchro-crm \
  -H "x-synchro-secret: $SYNCHRO_SECRET"
```

Une tâche planifiée Coolify toutes les deux minutes suffit. La réponse indique
combien de messages restent à traiter (`encoreATraiter`), ce qui permet
d'enchaîner un appel si le retard est important.

Sans les variables `RABBITMQ_*`, la synchronisation reste inactive et le kanban
fonctionne de façon autonome. La route refuse tout appel si `SYNCHRO_SECRET`
n'est pas défini : mieux vaut une synchro inactive qu'un point d'écriture ouvert.

L'écran **Synchro CRM** (réservé au manager) montre les 50 derniers événements
reçus, leur issue et le nombre de messages en attente. C'est l'endroit où
diagnostiquer une fiche qui n'est pas remontée.

### Garanties

- **Idempotence** — le bus livre « au moins une fois » ; une empreinte unique en
  base écarte les relivraisons.
- **Désordre** — un événement antérieur à la version enregistrée est ignoré
  plutôt qu'appliqué à rebours.
- **Non-régression** — seuls les champs dont le CRM est maître sont écrits. Le
  segment affiné par le commercial, le propriétaire, les notes et tout le travail
  commercial sont préservés.
- **Rapprochement** — avant de créer une fiche, le kanban cherche une
  correspondance par SIREN, e-mail, téléphone puis nom, pour ne pas dupliquer une
  organisation saisie à la main.
- **Suppression** — une fiche supprimée côté CRM est détachée, jamais effacée :
  les leads, opportunités et activités qui s'y rattachent sont conservés.

Ces garanties sont vérifiées par `npx tsx scripts/test-synchro.ts`, qui injecte
des événements représentatifs sans passer par le bus.

### Pour étendre aux contacts et aux devis

Le CRM publie déjà les clients. Pour les contacts et les devis, il manque une
ligne dans chacune des deux tables côté CRM :

```php
$this->addBehavior('EventPublisher');
```

dans `ClientContactsTable` et `DevisTable`. Le reste — liaison de la queue,
correspondance des champs, traitement — est déjà en place côté kanban.

## Points à trancher avant le paramétrage définitif

Le document les identifie comme plus importants que la couleur des colonnes.
Ils sont implémentés avec des valeurs par défaut, à ajuster :

- **Délai de première prise en charge** — actuellement 8 h ouvrées pour un entrant,
  72 h pour la prospection (`DELAI_PRISE_EN_CHARGE_HEURES`).
- **Définition de « gagné »** — commande finalisée ou livraison confirmée.
- **Personne qui tient le pool des entrants**.
- **Segments à conserver** — la liste sera ajustée après un mois de données réelles.
- **Informations à confirmer avec GRENKE** — durées acceptées, pièces exigées,
  canal de transmission, délais de réponse et jalons réellement suivis. Tant que
  cette confirmation n'a pas eu lieu, le suivi partenaire reste manuel et factuel.

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
npm run dev          # développement
npm run build        # build de production (génère le client Prisma)
npm run db:migrate   # créer une migration en développement
npm run db:deploy    # appliquer les migrations en production
npm run db:studio    # explorer la base
npm run db:seed      # réinitialiser le jeu de démonstration
npm run lint
```
