#!/usr/bin/env bash
# Deploy this checkout to staging (kusa.yasr.app): copy the code to the server,
# rebuild and restart the database + app containers, then wait until the site
# answers. Used by the CI/CD workflow on every push to main; also works by hand:
#   STAGING_HOST=1.2.3.4 STAGING_USER=ubuntu scripts/deploy-staging.sh
# The server needs Docker with the Compose plugin and ~/kusa/.env.staging.
set -euo pipefail

: "${STAGING_HOST:?Set STAGING_HOST (server address)}"
: "${STAGING_USER:?Set STAGING_USER (SSH user)}"
STAGING_DIR="${STAGING_DIR:-kusa}"
STAGING_URL="${STAGING_URL:-https://kusa.yasr.app}"
TARGET="$STAGING_USER@$STAGING_HOST"
SSH=(ssh -o BatchMode=yes)

echo "→ Uploading to $TARGET:~/$STAGING_DIR"
"${SSH[@]}" "$TARGET" "mkdir -p ~/$STAGING_DIR"
rsync -az --delete -e "${SSH[*]}" \
  --exclude node_modules --exclude .nuxt --exclude .output --exclude .git --exclude .github \
  --exclude android --exclude ios --exclude .data --exclude .photo-candidates \
  --exclude .env --exclude .env.staging \
  ./ "$TARGET:~/$STAGING_DIR/"

echo "→ Building and restarting"
"${SSH[@]}" "$TARGET" "cd ~/$STAGING_DIR && test -f .env.staging || { echo 'Missing ~/$STAGING_DIR/.env.staging on the server (copy .env.example and set AUTH_SECRET)'; exit 1; }
  docker rm -f kusa-staging >/dev/null 2>&1 || true
  docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build --remove-orphans
  docker image prune -f >/dev/null"

echo "→ Waiting for $STAGING_URL"
for i in $(seq 1 30); do
  if curl -fsS -m 10 "$STAGING_URL/api/health" >/dev/null 2>&1; then
    echo "✓ $STAGING_URL is up: $(curl -fsS -m 10 "$STAGING_URL/api/health" | tr -d '\n ')"
    exit 0
  fi
  sleep 6
done
echo "✗ $STAGING_URL didn't answer. On the server: docker compose -f ~/$STAGING_DIR/docker-compose.staging.yml logs web"
exit 1
