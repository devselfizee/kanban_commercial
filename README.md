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

Le projet se déploie tel quel :

1. Créer un service **PostgreSQL** dans Coolify et récupérer son URL interne.
2. Créer une application depuis ce dépôt Git. Coolify détecte le `Dockerfile`.
3. Définir la variable d'environnement `DATABASE_URL`.
4. Déployer.

`docker-entrypoint.sh` applique `prisma migrate deploy` avant de démarrer le
serveur : les migrations suivent automatiquement chaque déploiement. L'image
utilise la sortie `standalone` de Next.js et tourne sous un utilisateur non
privilégié.

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
