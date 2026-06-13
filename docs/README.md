# Rekon Docs

> Status: Current public docs map. Use this page after the root README.

This is the human docs map. Use it before browsing the generated freshness
index or historical strategy snapshots.

## Start Here

- [README](../README.md): public product overview and 5-minute demo.
- [First 10 minutes](getting-started/first-10-minutes.md): source-checkout walkthrough.
- [Demo: task context to handoff](demo/task-context-to-handoff.md): reviewer path from repo scan to agent handoff surfaces.
- [NorthStar](strategy/north-star.md): durable product and architecture direction.
- [System model](strategy/rekon-system-model.md): canonical living system model.

## For Reviewers

If you are evaluating Drew's AI-assisted engineering work, inspect these first:

1. [README](../README.md): product framing, 5-minute demo, output excerpts,
   safety model, and current status.
2. [Demo: task context to handoff](demo/task-context-to-handoff.md): the runnable
   path from scan to context, resolver trace, plan review, and agent guidance.
3. [Intent bundle handoff workflow](guides/intent-bundle-handoff-workflow.md):
   the handoff reading order and authority boundaries for humans and agents.

## For Contributors

Start with the public path above, then read:

- [Contributing](../CONTRIBUTING.md): setup, checks, public API expectations,
  and direct-to-main solo maintainer process.
- [Authoring capabilities](extensions/authoring-capabilities.md): extension
  roles, manifests, permissions, conformance, and local testing.
- [NorthStar](strategy/north-star.md): product and architecture direction before
  changing package, artifact, or capability contracts.

## Run The Demo

- [Demo: task context to handoff](demo/task-context-to-handoff.md): current
  reviewer demo with setup, commands, expected output shape, boundaries, and
  troubleshooting.
- [First 10 minutes](getting-started/first-10-minutes.md): broader local CLI
  walkthrough over `examples/simple-js-ts`.

## Core Concepts

- [Capability Evidence Graph](concepts/capability-evidence-graph.md): deterministic repo intelligence substrate.
- [Semantic File Understanding](concepts/semantic-file-understanding.md): semantic interpretation as proposal, not proof.
- [Task-shaped context](concepts/task-shaped-context.md): task context for humans and agents.
- [Intent plan compiler](concepts/intent-plan-compiler.md): review rough plans before preparation.
- [Intent assessment](concepts/intent-assessment.md): readiness, constraints, and explicit gaps.
- [Intent status](concepts/intent-status.md): when handoff is allowed.
- [Intent bundle handoff](concepts/intent-plan-bundle.md): package context, work, proof, and boundaries.
- [Verification runs](concepts/verification-runs.md): command execution records, when explicitly requested.
- [Agent operating contract](concepts/agent-operating-contract.md): generated operating guidance from current artifacts.

## Current Guides And Workflows

- [Task context workflow](guides/task-context-workflow.md)
- [Intent bundle handoff workflow](guides/intent-bundle-handoff-workflow.md)
- [Intent bundle agent reading order](guides/intent-bundle-agent-reading-order.md)
- [Agent context instructions](guides/agent-context-instructions.md)
- [GitHub Actions verification runner](examples/github-actions-verification-runner.md)

## Artifact References

- [Artifact model](artifacts/index.md)
- [Artifact contract](artifacts/artifact-contract.md)
- [CapabilityEvidenceGraph](artifacts/capability-evidence-graph.md)
- [TaskContextReport](artifacts/task-context-report.md)
- [IntentPlanActionabilityReport](artifacts/intent-plan-actionability-report.md)
- [PreparedIntentPlan](artifacts/prepared-intent-plan.md)
- [IntentStatusReport](artifacts/intent-status-report.md)
- [WorkOrder](artifacts/work-order.md)
- [VerificationPlan](artifacts/verification-plan.md)
- [VerificationRun](artifacts/verification-run.md)
- [VerificationResult](artifacts/verification-result.md)
- [Agent contract publication](artifacts/agent-contract-publication.md)
- [Proof report publication](artifacts/proof-report-publication.md)

## Architecture And Safety

- [Freshness and invalidation](concepts/freshness-and-invalidation.md)
- [Path freshness](concepts/path-freshness.md)
- [Proof report publication](concepts/proof-report-publication.md)
- [LLM provider routing](concepts/rekon-llm-provider-routing.md)
- [Embedding provider index](concepts/embedding-provider-index.md)
- [Rekon / Circe handoffs](concepts/rekon-circe-handoffs.md)
- [Runtime graph observation](concepts/runtime-graph-observation.md)
- [Runtime graph drift](concepts/runtime-graph-drift.md)

## Extension Authors

- [Authoring capabilities](extensions/authoring-capabilities.md)
- [Capability manifest](extensions/capability-manifest.md)
- [Security model](extensions/security-model.md)
- [Custom TODO capability example](../examples/custom-capability/README.md)

## Strategy And Historical Decisions

Current living strategy:

- [NorthStar](strategy/north-star.md)
- [System model](strategy/rekon-system-model.md)
- [Roadmap](strategy/roadmap.md)
- [Capability model](strategy/capability-model.md)
- [Classic migration](strategy/codebase-intel-classic-migration.md)

Historical strategy snapshots and slice memos remain under `docs/strategy/`.
They are useful evidence of decisions, but they are not the public starting
point and they do not override source code, current CLI output, artifact
schemas, the system model, or current concept docs.

## Generated Freshness Index

[docs/INDEX.md](INDEX.md) is generated by `rekon docs freshness`. Use it to
inspect living-doc freshness and snapshot inventory. Do not treat it as the
reader-facing docs table of contents.
