#!/usr/bin/env bash
# Starts the database, the API and the web app for local development.
#
#   ./scripts/dev.sh
#
# It checks the ports first: if the app is already running it tells you so (and where to open it)
# instead of failing with "address already in use".
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_PORT="${API_PORT:-5080}"
WEB_PORT="${WEB_PORT:-5173}"
DB_PORT="${DB_PORT:-3308}"
DB_NAME="${DB_NAME:-ems_demo}"
export DOTNET_ROOT="${DOTNET_ROOT:-$HOME/.dotnet}"
export PATH="$DOTNET_ROOT:$PATH"

in_use() { (echo > "/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1; }

if in_use "$API_PORT" && in_use "$WEB_PORT"; then
  echo "The app is already running."
  echo "  Open http://localhost:$WEB_PORT"
  echo "  To stop it:  fuser -k $API_PORT/tcp $WEB_PORT/tcp"
  exit 0
fi

for port in "$API_PORT" "$WEB_PORT"; do
  if in_use "$port"; then
    echo "Port $port is already used by another program, but the app is not fully running."
    echo "Free it with:  fuser -k $port/tcp   (or choose another port: API_PORT=... WEB_PORT=... ./scripts/dev.sh)"
    exit 1
  fi
done

echo "Starting MySQL container (ems-e2e-mysql)..."
docker start ems-e2e-mysql >/dev/null 2>&1 || {
  echo "Could not start the 'ems-e2e-mysql' container. Create it first (see README: Getting started)."
  exit 1
}

cleanup() { kill "${API_PID:-}" "${WEB_PID:-}" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

echo "Starting the API on :$API_PORT ..."
(
  cd "$ROOT/backend"
  ASPNETCORE_ENVIRONMENT=Development \
  ConnectionStrings__DefaultConnection="Server=127.0.0.1;Port=$DB_PORT;Database=$DB_NAME;User=root;Password=e2e_root_password" \
  Jwt__AccessTokenSecret="$(openssl rand -base64 48)" Jwt__RefreshTokenSecret="$(openssl rand -base64 48)" \
  Cors__AllowedOrigins__0="http://localhost:$WEB_PORT" \
  exec dotnet run --project src/EMS.Api --no-launch-profile --urls "http://localhost:$API_PORT"
) &
API_PID=$!

echo "Starting the web app on :$WEB_PORT ..."
(
  cd "$ROOT/frontend"
  [ -d node_modules ] || npm install
  VITE_API_PROXY_TARGET="http://localhost:$API_PORT" exec npm run dev -- --port "$WEB_PORT" --strictPort
) &
WEB_PID=$!

echo "Open http://localhost:$WEB_PORT   (Ctrl+C stops both)"
wait
