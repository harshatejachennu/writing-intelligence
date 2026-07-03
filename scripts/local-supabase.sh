#!/usr/bin/env bash
# Spin up a local Supabase-compatible stack for development/verification:
#   Postgres 15 + pgvector  →  PostgREST  →  nginx gateway serving /rest/v1
# The app talks to it through the exact same supabase-js code path as hosted
# Supabase. Usage:
#   ./scripts/local-supabase.sh up      # start + migrate + print .env.local values
#   ./scripts/local-supabase.sh down    # remove everything
set -euo pipefail

JWT_SECRET="super-secret-jwt-token-with-at-least-32-chars"
PG_PORT=54329
API_PORT=54330
DIR="$(cd "$(dirname "$0")/.." && pwd)"

make_jwt() {
  node -e '
const crypto = require("crypto");
const secret = process.argv[1];
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const h = b64u({ alg: "HS256", typ: "JWT" });
const p = b64u({ role: "postgres", iss: "supabase", exp: 2000000000 });
const s = crypto.createHmac("sha256", secret).update(h + "." + p).digest("base64url");
console.log(h + "." + p + "." + s);
' "$JWT_SECRET"
}

down() {
  docker rm -f wi-migration-test wi-postgrest wi-gateway >/dev/null 2>&1 || true
  docker network rm wi-net >/dev/null 2>&1 || true
  echo "Local stack removed."
}

up() {
  down >/dev/null 2>&1 || true
  docker network create wi-net >/dev/null

  echo "Starting Postgres 15 + pgvector..."
  docker run -d --name wi-migration-test --network wi-net \
    -e POSTGRES_PASSWORD=test -p ${PG_PORT}:5432 pgvector/pgvector:pg15 >/dev/null
  for i in $(seq 1 30); do
    docker exec wi-migration-test pg_isready -U postgres >/dev/null 2>&1 && break
    sleep 1
  done

  echo "Applying migrations..."
  for mig in "$DIR"/supabase/migrations/*.sql; do
    echo "  - $(basename "$mig")"
    docker exec -i wi-migration-test psql -U postgres -v ON_ERROR_STOP=1 -f - \
      < "$mig" >/dev/null
  done

  echo "Starting PostgREST..."
  docker run -d --name wi-postgrest --network wi-net \
    -e PGRST_DB_URI="postgres://postgres:test@wi-migration-test:5432/postgres" \
    -e PGRST_DB_SCHEMAS=public \
    -e PGRST_DB_ANON_ROLE=postgres \
    -e PGRST_JWT_SECRET="$JWT_SECRET" \
    postgrest/postgrest >/dev/null

  echo "Starting nginx gateway (/rest/v1)..."
  TMP_CONF="$(mktemp)"
  cat > "$TMP_CONF" <<'EOF'
events {}
http {
  server {
    listen 80;
    location /rest/v1/ {
      proxy_pass http://wi-postgrest:3000/;
      proxy_set_header Authorization $http_authorization;
    }
  }
}
EOF
  docker run -d --name wi-gateway --network wi-net -p ${API_PORT}:80 \
    -v "$TMP_CONF":/etc/nginx/nginx.conf:ro nginx:alpine >/dev/null

  JWT="$(make_jwt)"
  sleep 2
  CODE=$(curl -s -o /dev/null -w '%{http_code}' \
    -H "apikey: $JWT" -H "Authorization: Bearer $JWT" \
    "http://localhost:${API_PORT}/rest/v1/passages")
  if [ "$CODE" != "200" ]; then
    echo "Smoke test failed (HTTP $CODE). Check: docker logs wi-postgrest" >&2
    exit 1
  fi

  echo ""
  echo "Local stack is up. Put this in .env.local:"
  echo ""
  echo "NEXT_PUBLIC_SUPABASE_URL=http://localhost:${API_PORT}"
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$JWT"
  echo "SUPABASE_SERVICE_ROLE_KEY=$JWT"
  echo "DATABASE_URL=postgres://postgres:test@localhost:${PG_PORT}/postgres"
  echo ""
  echo "Then: npm run test:db"
}

case "${1:-up}" in
  up) up ;;
  down) down ;;
  *) echo "Usage: $0 {up|down}"; exit 1 ;;
esac
