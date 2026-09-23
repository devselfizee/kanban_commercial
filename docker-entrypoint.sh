#!/bin/sh
# Applique les migrations avant de démarrer le serveur.
#
# `migrate deploy` n'applique que des migrations déjà écrites et validées : il ne
# génère jamais de schéma à la volée et ne détruit aucune donnée existante.
set -e

echo "→ Application des migrations Prisma..."
npx prisma migrate deploy

echo "→ Démarrage du serveur."
exec "$@"
