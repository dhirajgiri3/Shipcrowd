# Client Build Strategy (Wave 0 RCA)

## Context

`next build` can be non-deterministic in restricted environments because Turbopack may fail to bind a local port/process resource. This is environment-sensitive and may not reproduce in CI/prod.

## Current Deterministic Gate

Use TypeScript compilation as the hard gate for client correctness during debt burn:

```bash
./client/node_modules/.bin/tsc -p client/tsconfig.json --noEmit
```

## RCA Procedure (run each Wave 0 refresh)

1. Capture full `next build` output into `wave0-client-next-build.log`.
2. Re-run with higher memory:
   - `NODE_OPTIONS='--max-old-space-size=8192' npm run build --prefix client`
3. Re-run with lint disabled if needed for isolation:
   - `next build --no-lint` (from `client/`).
4. Compare behavior across environments (local vs CI).
5. Record whether failure is:
   - environment/process binding issue,
   - resource issue,
   - version/tooling regression.

## Decision

1. Short-term: gate on `tsc --noEmit` for deterministic quality.
2. Long-term: restore `next build` as canonical build gate once RCA confirms stable runtime conditions.
3. Any shift in this strategy must be logged in `plan-deviations.md`.
