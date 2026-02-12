#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/docs/Development/Domains/Shipping/migration-artifacts"
PROVIDER_SMOKE_DIR="$ARTIFACT_DIR/provider-smoke"

mkdir -p "$ARTIFACT_DIR" "$PROVIDER_SMOKE_DIR"

REPORT_FILE="$ARTIFACT_DIR/tech-debt-baseline.md"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

SERVER_BUILD_LOG="$TMP_DIR/server-build.log"
CLIENT_TSC_LOG="$TMP_DIR/client-tsc.log"
PROVIDER_TEST_LOG="$TMP_DIR/provider-tests.log"
GATE_TEST_LOG="$TMP_DIR/service-level-gate.log"
VERIFY_CUTOVER_LOG="$TMP_DIR/verify-cutover.log"
VERIFY_RETIRED_LOG="$TMP_DIR/verify-retired.log"

run_capture() {
  local out="$1"
  shift
  set +e
  "$@" >"$out" 2>&1
  local code=$?
  set -e
  echo "$code"
}

SERVER_BUILD_CODE="$(run_capture "$SERVER_BUILD_LOG" npm run build --prefix "$ROOT_DIR/server")"
CLIENT_TSC_CODE="$(run_capture "$CLIENT_TSC_LOG" "$ROOT_DIR/client/node_modules/.bin/tsc" -p "$ROOT_DIR/client/tsconfig.json" --noEmit)"
PROVIDER_TEST_CODE="$(run_capture "$PROVIDER_TEST_LOG" npm test --prefix "$ROOT_DIR/server" -- tests/unit/velocity tests/unit/ekart tests/integration/velocity tests/integration/ekart tests/integration/delhivery)"
GATE_TEST_CODE="$(run_capture "$GATE_TEST_LOG" npm run test:service-level-pricing:gate --prefix "$ROOT_DIR/server")"
VERIFY_CUTOVER_CODE="$(run_capture "$VERIFY_CUTOVER_LOG" npm run verify:legacy-cutover --prefix "$ROOT_DIR/server")"
VERIFY_RETIRED_CODE="$(run_capture "$VERIFY_RETIRED_LOG" npm run verify:legacy-ratecard-retired --prefix "$ROOT_DIR/server")"

SERVER_ERROR_COUNT="$(rg -c "error TS[0-9]+" "$SERVER_BUILD_LOG" || true)"
CLIENT_ERROR_COUNT="$(rg -c "error TS[0-9]+" "$CLIENT_TSC_LOG" || true)"
FAILING_SUITES="$(rg -o "([0-9]+) failed" "$PROVIDER_TEST_LOG" | head -n 1 || true)"
FAILING_TESTS="$(rg -o "([0-9]+) failed" "$PROVIDER_TEST_LOG" | sed -n '2p' || true)"

cat > "$REPORT_FILE" <<EOF
# Tech Debt Baseline

Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Status Summary

- Server build exit code: \`${SERVER_BUILD_CODE}\`
- Client typecheck exit code: \`${CLIENT_TSC_CODE}\`
- Provider suite exit code: \`${PROVIDER_TEST_CODE}\`
- Service-level pricing gate exit code: \`${GATE_TEST_CODE}\`
- Verify legacy cutover exit code: \`${VERIFY_CUTOVER_CODE}\`
- Verify legacy ratecard retired exit code: \`${VERIFY_RETIRED_CODE}\`

## Error Counts

- Server TypeScript errors detected: \`${SERVER_ERROR_COUNT}\`
- Client TypeScript errors detected: \`${CLIENT_ERROR_COUNT}\`
- Provider failed suites summary: \`${FAILING_SUITES:-not-detected}\`
- Provider failed tests summary: \`${FAILING_TESTS:-not-detected}\`

## Logs

- server build: \`wave0-server-build.log\`
- client typecheck: \`wave0-client-typecheck.log\`
- provider tests: \`wave0-provider-tests.log\`
- service-level gate: \`wave0-service-level-gate.log\`
- verify legacy cutover: \`wave0-verify-legacy-cutover.log\`
- verify legacy retired: \`wave0-verify-legacy-retired.log\`
EOF

cp "$SERVER_BUILD_LOG" "$ARTIFACT_DIR/wave0-server-build.log"
cp "$CLIENT_TSC_LOG" "$ARTIFACT_DIR/wave0-client-typecheck.log"
cp "$PROVIDER_TEST_LOG" "$ARTIFACT_DIR/wave0-provider-tests.log"
cp "$GATE_TEST_LOG" "$ARTIFACT_DIR/wave0-service-level-gate.log"
cp "$VERIFY_CUTOVER_LOG" "$ARTIFACT_DIR/wave0-verify-legacy-cutover.log"
cp "$VERIFY_RETIRED_LOG" "$ARTIFACT_DIR/wave0-verify-legacy-retired.log"

echo "Baseline report written to $REPORT_FILE"
