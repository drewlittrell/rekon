# Demo: Task Context To Handoff

This demo shows the public Rekon workflow on a small TypeScript repo. It writes
artifacts, not source files, and it does not approve plans or execute
verification commands.

## Setup

```sh
npm install
npm run build

rm -rf /tmp/rekon-demo
cp -R examples/simple-js-ts /tmp/rekon-demo
rm -rf /tmp/rekon-demo/.rekon
```

## Generate Repository Intelligence

```sh
node packages/cli/dist/index.js scan --root /tmp/rekon-demo --json
node packages/cli/dist/index.js capability graph build --root /tmp/rekon-demo --json
```

`scan` initializes `.rekon/`, observes the repo, projects models, evaluates
findings, writes a snapshot, and validates artifacts. The capability graph gives
later commands deterministic context.

## Generate Task Context

```sh
node packages/cli/dist/index.js context task --root /tmp/rekon-demo --task "Modify the greeting in src/index.ts" --path src/index.ts --provider mock --json
```

The result is a `TaskContextReport`: scoped context for a task, with evidence
refs and explicit boundaries. It is context, not proof.

## Review A Rough Plan

```sh
cat > /tmp/rekon-demo-plan.md <<'EOF'
# Plan

Goal: modify greeting in src/index.ts.

Steps:
- Inspect src/index.ts.
- Change greet output deliberately.
- Run npm run typecheck and npm run test if available.

Non-goals:
- Do not change package metadata.
EOF

node packages/cli/dist/index.js intent plan review --root /tmp/rekon-demo --plan /tmp/rekon-demo-plan.md --goal "Modify the greeting in src/index.ts" --path src/index.ts --json
```

Rekon may return `needs-revision` when a plan lacks enough detail. That is the
point: weak plans should not silently become implementation authority.

## Resolve And Publish Guidance

```sh
node packages/cli/dist/index.js resolve preflight --root /tmp/rekon-demo --path src/index.ts --goal "Modify the greeting" --json
node packages/cli/dist/index.js publish agent-contract --root /tmp/rekon-demo --json
node packages/cli/dist/index.js artifacts validate --root /tmp/rekon-demo --json
```

The preflight packet includes `resolutionTrace`, so readers can see which
artifact source was used and why the risk tier was selected. The agent contract
is a publication derived from current artifacts.

## Handoff Artifacts

When an intent is approved and prepared, Rekon can package a handoff bundle with
human and agent guidance, source refs, verification posture, task context, and
adapter-specific projections. Those projections are optional integrations. Rekon
itself remains the artifact producer and does not run downstream orchestrators.

## Boundaries To Notice

- `TaskContextReport` is context, not proof.
- `IntentPlanActionabilityReport` can block weak plans.
- `PreparedIntentPlan` is not approval.
- `WorkOrder` and `VerificationPlan` describe work and proof obligations.
- `VerificationRun` records executed commands only when explicitly requested.
- Publications guide readers; they do not mutate source.
