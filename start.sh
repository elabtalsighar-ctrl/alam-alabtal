#!/bin/sh

DB_PATH="/app/server/data/alam.db"

mkdir -p /app/server/data

if [ -n "$B2_ACCOUNT_ID" ] && [ -n "$B2_ACCOUNT_KEY" ] && [ -n "$B2_BUCKET_NAME" ]; then
  echo "[LITESTREAM] B2 credentials found, setting up backup..."

  cat > /tmp/litestream.yml <<EOF
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

  if [ ! -f "$DB_PATH" ] || [ ! -s "$DB_PATH" ]; then
    echo "[LITESTREAM] Restoring database from B2 backup..."
    litestream restore -config /tmp/litestream.yml 2>&1 || echo "[LITESTREAM] No backup found or restore failed, starting fresh"
  else
    echo "[LITESTREAM] Database already exists, skipping restore"
  fi

  echo "[LITESTREAM] Starting replication to B2..."
  litestream replicate -config /tmp/litestream.yml &
  LITESTREAM_PID=$!
  echo "[LITESTREAM] Replication started (PID: $LITESTREAM_PID)"
else
  echo "[LITESTREAM] No B2 credentials, running without backup"
fi

echo "[SERVER] Starting Node.js server..."
node index.js &
NODE_PID=$!

wait $NODE_PID
