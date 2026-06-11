# Demo: Task Context To Handoff

> Status: Current public demo. Commands are intended to run from a fresh Rekon
> checkout after `npm install` and `npm run build`.

This demo shows Rekon's public workflow on a small TypeScript repo. It does not
write source files, approve plans, execute commands, or run Circe.

## Prerequisites

- Node.js compatible with the root `package.json` engines.
- A fresh Rekon checkout.
- No provider keys are required; the demo uses deterministic graph context and
  `--provider mock`.

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

What this proves:

- Rekon can create task-shaped context from repo evidence.
- The no-key path remains useful because deterministic graph and explicit path
  context still work.
- Warnings remain visible instead of being hidden behind a polished success path.

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

What this proves:

- Rekon can review a rough plan without approving it.
- Weak or incomplete plans stay blocked until the operator supplies the missing
  detail.

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

What this proves:

- Resolver output is explainable through `resolutionTrace`.
- Agent guidance is a publication derived from artifacts, not canonical truth.
- Artifact validation gives reviewers a concrete integrity check.

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

## What Rekon Does Not Do In This Demo

- It does not write source files.
- It does not approve plans.
- It does not execute verification commands.
- It does not run Circe.
- It does not treat embeddings, LLM output, or generated publications as proof.

## Troubleshooting

- If a command cannot find `packages/cli/dist/index.js`, run `npm run build`
  from the Rekon repo first.
- If `/tmp/rekon-demo` already contains stale artifacts, rerun the setup block to
  delete and recreate the demo copy.
- If `context task` reports retrieval warnings, that is expected in the no-key
  demo; graph and explicit path context are still produced.
