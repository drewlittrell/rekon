# Rekon

> Status: Current public product entry point. Start here, then use
> [docs/README.md](docs/README.md) for the maintained docs map.

**Rekon is an evidence-backed AI handoff system for codebases. It builds structured repo intelligence, task context, intent plans, verification handoffs, and agent-readable bundles without letting AI output become proof or execution authority.**

Rekon is a repo intelligence and handoff system for AI-assisted engineering
that separates context, inference, proof, approval, and execution.

Naming is part of the public contract: product `Rekon`, CLI `rekon`, workspace
`.rekon/`, environment prefix `REKON_`, and packages `@rekon/*`.

## Why Rekon Exists

AI agents fail in real codebases when they lack grounded repo context, confuse
guesses with evidence, and blur the line between planning, approval, and
execution. Rekon makes those boundaries explicit.

It gives humans and agents a shared substrate:

- deterministic repo evidence and graph context;
- semantic file understanding where configured;
- embedding-backed retrieval as neighbor evidence, not proof;
- task-shaped context for a specific change;
- intent planning review before implementation;
- work orders, verification plans, and handoff bundles;
- artifact validators, freshness checks, and proof publications.

## What Rekon Does

Rekon scans a repository and writes typed artifacts under `.rekon/`. Those
artifacts can then be resolved into task context, intent plans, proof reports,
agent operating contracts, and handoff bundles.

The current product path is:

```text
scan -> capability graph -> task context -> intent plan review -> intent handoff -> verification record -> publication
```

The lower-level substrate is still available:

```text
Observe -> Project -> Snapshot -> Evaluate -> Resolve -> Publish -> Learn -> Act
```

## What Makes Rekon Different

Rekon does not ask an LLM to "understand the repo" and hope for the best.

It separates:

- deterministic facts from semantic interpretation;
- context from proof;
- recommendations from approval;
- verification hints from command execution;
- handoff artifacts from source writes.

That makes it suitable for AI-assisted engineering workflows where agents need
context, but operators still need traceability and control.

## 5-Minute Demo

From a fresh clone:

```sh
npm install
npm run build

rm -rf /tmp/rekon-demo
cp -R examples/simple-js-ts /tmp/rekon-demo
rm -rf /tmp/rekon-demo/.rekon

node packages/cli/dist/index.js scan --root /tmp/rekon-demo --json
node packages/cli/dist/index.js capability graph build --root /tmp/rekon-demo --json
node packages/cli/dist/index.js context task --root /tmp/rekon-demo --task "Modify the greeting in src/index.ts" --path src/index.ts --provider mock --json
node packages/cli/dist/index.js resolve preflight --root /tmp/rekon-demo --path src/index.ts --goal "Modify the greeting" --json
node packages/cli/dist/index.js publish agent-contract --root /tmp/rekon-demo --json
node packages/cli/dist/index.js artifacts validate --root /tmp/rekon-demo --json
```

What this proves:

- `scan` initializes `.rekon/`, observes the repo, projects models, evaluates
  governance, writes a snapshot, and validates artifacts.
- `capability graph build` creates a `CapabilityEvidenceGraph` from
  deterministic repo facts.
- `context task` creates a `TaskContextReport` with `agentContext`,
  warnings, evidence refs, and explicit boundaries.
- `resolve preflight` creates an explainable `ResolverPacket`.
- `publish agent-contract` writes a current operating contract for agents
  without overwriting root `AGENTS.md`.
- `artifacts validate` checks index paths, headers, and digests.

## What The Output Looks Like

`rekon scan` reports boundaries:

```json
{
  "boundaries": {
    "executedCommands": false,
    "wroteSourceFiles": false,
    "createdVerificationPlan": false,
    "implementedIntentGo": false
  }
}
```

`rekon context task` reports context, not proof:

```json
{
  "artifact": { "type": "TaskContextReport" },
  "summary": {
    "contextItems": 2,
    "graphClaims": 1
  },
  "boundaries": {
    "retrievalIsProof": false,
    "approvedPlans": false,
    "executedCommands": false,
    "wroteSourceFiles": false
  }
}
```

`rekon resolve preflight` reports why it answered:

```json
{
  "packet": {
    "ownerSystems": ["src"],
    "risk": { "tier": "high" },
    "resolutionTrace": [
      { "step": "ownership.resolve", "sourceType": "OwnershipMap", "status": "used" },
      { "step": "risk.evaluate", "sourceType": "RiskRule", "status": "used" }
    ]
  }
}
```

## Demo: Task Context To Handoff

The deeper reviewer path is documented in
[docs/demo/task-context-to-handoff.md](docs/demo/task-context-to-handoff.md).
It shows:

- Demo A: generate task context.
- Demo B: review an intent plan.
- Demo C: publish an agent operating contract and prepare the handoff path.
- Deep path: move from assessment to prepared plan, approval, work order,
  verification plan, and bundle when operator gates are satisfied.

Fresh-repo intent handoff starts with the scan/context substrate. Use
`rekon scan`, then `rekon intent context prepare`, then `rekon intent assess`
before generating work handoff artifacts. The work-order handoff command is
`rekon intent work-order generate`; it consumes approved/prepared intent state
and writes a WorkOrder artifact rather than implementing the change.

Intent bundles are Rekon artifacts first. Private downstream orchestrators can
consume projections of those bundles, but those orchestrators are integrations,
not Rekon requirements or headline features.

## Architecture

```text
Source repo
  -> EvidenceGraph
  -> CapabilityEvidenceGraph / ObservedRepo / OwnershipMap
  -> TaskContextReport
  -> IntentPlanActionabilityReport / IntentAssessmentReport
  -> PreparedIntentPlan / IntentStatusReport
  -> WorkOrder / VerificationPlan / intent bundle
  -> VerificationRun / VerificationResult / proof publication
```

Rekon's architecture rule:

> Lower layers may feed upper layers. Upper layers may not silently become lower-layer truth.

## Safety Model

- Context is not proof.
- LLM output is not proof.
- Embeddings are neighbor evidence.
- Approvals are explicit.
- Verification hints are not command execution.
- Rekon does not write source by default.
- Rekon does not run downstream orchestrators.
- Reconciliation remains permissioned and artifact-first.
- Generated docs and agent contracts are publications, not canonical truth.

## Phase-Level Commands

The single-command entry point is `rekon scan`. The phase verbs remain useful
when you want to inspect a specific layer:

```sh
node packages/cli/dist/index.js init --root examples/simple-js-ts
node packages/cli/dist/index.js observe --root examples/simple-js-ts --json
node packages/cli/dist/index.js project --root examples/simple-js-ts --json
node packages/cli/dist/index.js snapshot --root examples/simple-js-ts --json
node packages/cli/dist/index.js evaluate --root examples/simple-js-ts --json
node packages/cli/dist/index.js resolve preflight --root examples/simple-js-ts --path src/index.ts --goal "modify bootstrap" --json
node packages/cli/dist/index.js publish agents --root examples/simple-js-ts
node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json
```

## Docs Map

Start with [docs/README.md](docs/README.md). Key entry points:

- [First 10 minutes](docs/getting-started/first-10-minutes.md)
- [Task context workflow](docs/guides/task-context-workflow.md)
- [Intent bundle handoff workflow](docs/guides/intent-bundle-handoff-workflow.md)
- [Agent operating contract](docs/concepts/agent-operating-contract.md)
- [Capability evidence graph](docs/concepts/capability-evidence-graph.md)
- [Artifact model](docs/artifacts/index.md)
- [NorthStar](docs/strategy/north-star.md)
- [System model](docs/strategy/rekon-system-model.md)

`docs/INDEX.md` is generated by `rekon docs freshness` and is useful for
freshness status. It is not the human landing page.

## Status

Rekon is version `1.0.0`. The private workspace root and every public
`@rekon/*` package in this repository are versioned lockstep at `1.0.0`.
Treat the source tree, CLI, artifact contracts, and docs as the current public
surface. Registry publishing remains a separate release/distribution action and
should be verified before assuming an npm install path.

Current public strengths:

- real CLI surfaces;
- typed artifacts with headers, input refs, freshness, and provenance;
- artifact index and digest validation;
- capability SDK and conformance checks;
- deterministic repo scan and capability graph;
- task context, intent review, handoff bundle, proof, and agent-contract
  surfaces;
- explicit no-proof/no-execution boundaries.

Deferred or experimental:

- registry publishing automation;
- marketplace/discovery;
- source-writing reconciliation by default;
- full watcher/freshness engine;
- hosted SaaS/dashboard;
- `intent:go`;
- downstream orchestrator execution.

## For Reviewers And Decision Makers

If you have 10 minutes:

1. Read this README, then [docs/README.md](docs/README.md).
2. Run the [5-minute demo](#5-minute-demo) and the deeper
   [task-context-to-handoff demo](docs/demo/task-context-to-handoff.md).
3. Inspect `TaskContextReport`, `ResolverPacket`, `IntentPlanActionabilityReport`,
   `WorkOrder`, `VerificationPlan`, and `Publication` artifacts under
   `/tmp/rekon-demo/.rekon/artifacts`.
4. Run `node packages/cli/dist/index.js artifacts validate --root /tmp/rekon-demo --json`.
5. Check the [safety model](#safety-model) and the current guide for
   [intent bundle handoff workflow](docs/guides/intent-bundle-handoff-workflow.md).

The point is not that Rekon creates many files. The point is that the files
separate context, inference, proof, approval, and execution in a way a reviewer
can audit.
