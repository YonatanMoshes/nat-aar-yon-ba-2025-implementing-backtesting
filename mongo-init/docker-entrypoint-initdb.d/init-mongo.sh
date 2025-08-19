# project-root/mongo-init/docker-entrypoint-initdb.d/init-mongo.sh
#!/bin/bash
set -e

echo ">>> Restoring crypto_predictions from /dumps/crypto_predictions…"
for f in /dumps/crypto_predictions/*.bson; do
  coll=$(basename "$f" .bson)
  echo "  → restoring collection '$coll'"
  mongorestore --db crypto_predictions --collection "$coll" "$f"
done
echo ">>> Restore complete."
