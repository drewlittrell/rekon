# Demo: Task Context To Handoff

This demo shows Rekon's public workflow on a small TypeScript repo. It does not
write source files, approve plans, execute commands, or run Circe.

## Setup

From the Rekon repo:

```sh
npm install
npm run build

rm -rf /tmp/rekon-demo
cp -R examples/simple-js-ts /tmp/rekon-demo
rm -rf /tmp/rekon-demo/.rekon
```

## Demo A: Generate Repo Intelligence And Task Context

Scan the repo:

```sh
node packages/cli/dist/index.js scan --root /tmp/rekon-demo --json
```

Build the deterministic capability evidence graph:

```sh
node packages/cli/dist/index.js capability graph build --root /tmp/rekon-demo --json
```

Generate task-shaped context:

```sh
node packages/cli/dist/index.js context task --root /tmp/rekon-demo --task "Modify the greeting in src/index.ts" --path src/index.ts --provider mock --json
```

Expected shape:

```json
{
  "artifact": { "type": "TaskContextReport" },
  "summary": {
    "contextItems": 2,
    "graphClaims": 1
  },
  "warnings": [
    "retrieval-unavailable: no embeddings indexed..."
  ],
  "boundaries": {
    "retrievalIsProof": false,
    "approvedPlans": false,
    "executedCommands": false,
    "wroteSourceFiles": false
  }
}
```

The warning is acceptable in the no-key demo: Rekon falls back to graph and
explicit path context. Embedding retrieval is optional and remains neighbor
evidence, not proof.

## Demo B: Review A Rough Intent Plan

Create a rough plan outside the repo:

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
```

Review the plan:

```sh
node packages/cli/dist/index.js intent plan review --root /tmp/rekon-demo --plan /tmp/rekon-demo-plan.md --goal "Modify the greeting in src/index.ts" --path src/index.ts --json
```

Expected shape:

```json
{
  "status": "needs-revision",
  "artifact": { "type": "IntentPlanActionabilityReport" },
  "nextAction": "revise-plan"
}
```

This is a feature, not a failure. Rekon is allowed to say a plan is not yet
actionable. The report asks for missing details instead of converting a weak
plan into implementation authority.

## Demo C: Resolve And Publish Agent Guidance

Generate a preflight packet:

```sh
node packages/cli/dist/index.js resolve preflight --root /tmp/rekon-demo --path src/index.ts --goal "Modify the greeting" --json
```

Publish an agent operating contract:

```sh
node packages/cli/dist/index.js publish agent-contract --root /tmp/rekon-demo --json
```

Validate artifacts:

```sh
node packages/cli/dist/index.js artifacts validate --root /tmp/rekon-demo --json
```

Inspect outputs:

```sh
node packages/cli/dist/index.js artifacts list --root /tmp/rekon-demo --json
```

The important artifacts are:

- `CapabilityEvidenceGraph`: what the repo contains.
- `TaskContextReport`: what matters for this task.
- `IntentPlanActionabilityReport`: what is missing before a plan is actionable.
- `ResolverPacket`: who owns the path, what risk applies, and why.
- `Publication`: generated agent guidance from current artifacts.

## Deep Handoff Path

The full handoff path is longer because it keeps approval and execution
boundaries explicit:

```text
rekon scan
-> rekon intent context prepare
-> rekon intent plan review
-> rekon intent plan answer
-> rekon intent assess
-> rekon intent prepare
-> rekon intent status
-> rekon intent approve
-> rekon intent status transition --to work-ready
-> rekon intent work-order generate
-> rekon intent verification-plan generate
-> rekon intent bundle write
```

The bundle can include:

```text
README.md
agent/instructions.md
agent/handoff.md
agent/context.json
agent/verification.json
agent/source-refs.json
context/task-context.md
context/task-context.agent.json
circe/handoff.json
circe/actor-contracts/*
```

Rekon prepares, proves, packages, and exports. Circe imports and orchestrates.
Rekon does not run Circe.

## Boundaries To Notice

- `TaskContextReport` is context, not proof.
- `IntentPlanActionabilityReport` can block weak plans.
- `PreparedIntentPlan` is not approval.
- `IntentStatusReport` is the work-readiness gate.
- `WorkOrder` and `VerificationPlan` describe work and proof obligations.
- `VerificationRun` records executed commands only when explicitly requested.
- `VerificationResult` records proof summaries; it does not auto-resolve findings.
- Handoff bundles guide humans and agents; they do not mutate source.
