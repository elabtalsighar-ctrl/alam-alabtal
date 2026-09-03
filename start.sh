#!/bin/sh
set -e

DB_PATH="/app/server/data/alam.db"

# Ensure DB directory exists
mkdir -p /app/server/data

# If B2 env vars are set, use Litestream backup
if [ -n "$B2_ACCOUNT_ID" ] && [ -n "$B2_ACCOUNT_KEY" ] && [ -n "$B2_BUCKET_NAME" ]; then
  echo "[LITESTREAM] B2 credentials found, setting up backup..."

  # Create litestream config from env vars
  cat > /app/litestream.yml <<EOF
dbs:
  - path: ${DB_PATH}
    replicas:
      - type: s3
        bucket: ${B2_BUCKET_NAME}
        path: db/alam.db
        endpoint: https://s3.us-west-004.backblazeb2.com
        force-sync: true
        access-key-id: ${B2_ACCOUNT_ID}
        secret-access-key: ${B2_ACCOUNT_KEY}
EOF

  # Try to restore from backup if DB doesn't exist or is empty
  if [ ! -f "$DB_PATH" ] || [ ! -s "$DB_PATH" ]; then
    echo "[LITESTREAM] Restoring database from backup..."
    litestream restore -config /app/litestream.yml 2>&1 || echo "[LITESTREAM] No backup found, starting fresh"
  else
    echo "[LITESTREAM] Database exists, skipping restore"
  fi

  # Start Litestream replication in background
  echo "[LITESTREAM] Starting replication to B2..."
  litestream replicate -config /app/litestream.yml &
  LITESTREAM_PID=$!
  echo "[LITESTREAM] Replication started (PID: $LITESTREAM_PID)"
else
  echo "[LITESTREAM] No B2 credentials, running without backup"
fi

# Start Node.js app
echo "[SERVER] Starting Node.js server..."
exec node index.js
