#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/docs/Development/Domains/Shipping/migration-artifacts"
WAVE="${1:-}"

if [[ -z "$WAVE" ]]; then
  echo "Usage: $0 <wave-number>"
  exit 1
fi

mkdir -p "$ARTIFACT_DIR"
LOG_FILE="$ARTIFACT_DIR/wave-${WAVE}-exit-verification.log"

run_step() {
  local label="$1"
  shift
  echo ""
  echo "===== ${label} =====" | tee -a "$LOG_FILE"
  "$@" 2>&1 | tee -a "$LOG_FILE"
}

echo "Wave ${WAVE} verification started at $(date -u +"%Y-%m-%dT%H:%M:%SZ")" > "$LOG_FILE"
echo "Repository root: $ROOT_DIR" | tee -a "$LOG_FILE"

run_step "Server build" npm run build --prefix "$ROOT_DIR/server"
run_step "Client typecheck" "$ROOT_DIR/client/node_modules/.bin/tsc" -p "$ROOT_DIR/client/tsconfig.json" --noEmit
run_step "Service-level pricing gate" npm run test:service-level-pricing:gate --prefix "$ROOT_DIR/server"
run_step "Legacy cutover verification" npm run verify:legacy-cutover --prefix "$ROOT_DIR/server"
run_step "Legacy ratecard retired verification" npm run verify:legacy-ratecard-retired --prefix "$ROOT_DIR/server"

if npm run --prefix "$ROOT_DIR/server" | rg -q "^  test:courier:core"; then
  run_step "Courier core tests" npm run test:courier:core --prefix "$ROOT_DIR/server"
else
  echo "" | tee -a "$LOG_FILE"
  echo "===== Courier core tests =====" | tee -a "$LOG_FILE"
  echo "SKIPPED: server package script test:courier:core is not defined yet." | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "Wave ${WAVE} verification completed at $(date -u +"%Y-%m-%dT%H:%M:%SZ")" | tee -a "$LOG_FILE"

