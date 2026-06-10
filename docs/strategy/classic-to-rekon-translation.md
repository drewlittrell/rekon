# Classic To Rekon Translation

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

This document explains how to translate `codebase-intel-classic` behavior
into Rekon-native form. It is the practical companion to
[classic-behavior-distillation.md](classic-behavior-distillation.md) and
[classic-refactor-principles.md](classic-refactor-principles.md).

## Translation Pattern

Every classic-to-Rekon translation follows the same shape:

| Classic Shape | Rekon Translation |
| --- | --- |
| Service handler | Capability with one or more handler types |
| Domain provider (rule evaluator, graph producer, language pack) | SDK handler (`evaluator`, `projector`, `evidence-provider`) |
| Command runner | CLI subcommand backed by the same runtime |
| Cache artifact under `.codebase-intel/cache/**` | Typed artifact under `.rekon/artifacts/**` with header + provenance |
| Generated doc | `Publication` artifact emitted by a `publisher` capability |
| Rule definition (YAML or TS) | `Rulebook` entry consumed by an `evaluator` |
| Memory entry | `OperatorFeedbackEntry` + `MemoryEvent` + `MemorySelection` |
| Reconciliation plan + executor | `ReconciliationPlan` + `actuator` writing `ReconciliationLog` |

For each translation, declare:

- **Capability role(s)**: which SDK role the new code occupies.
- **Artifact type(s)**: what the capability produces.
- **Runtime phase**: where it sits in
  `Observe → Project → Snapshot → Evaluate → Resolve → Publish → Learn → Act`.
- **CLI surface**: which command(s) operate it
  (`evaluate run …`, `resolve run …`, `publish run …`, etc.).
- **Freshness/invalidation**: which `invalidatedBy` rule applies.
- **Permission model**: which `CapabilityPermission` set the capability
  requests.

If any of those cannot be answered, stop. Define the missing substrate
first; do not let a port leak through.

## Examples

### Example 1 — Classic `RuleEvaluatorProvider` Entry → Rekon Evaluator Capability

Classic:

- Source: `domain/issues/evaluators/RuleEvaluatorProvider.ts`.
- Shape: an entry in `RULE_EVALUATORS` keyed by evaluator key. The
  evaluator function takes a `RuleEvaluatorContext` (compiled invariants
  + analysis index + file reader) and returns issues.

Rekon translation:

- Role: `evaluator`.
- Capability: a standalone package (e.g.,
  `@rekon-community/rule-pack-imports`).
- Manifest:
  - `roles: ["evaluator"]`
  - `consumes: ["EvidenceGraph", "ObservedRepo", "GraphSlice", "Rulebook"]`
  - `produces: ["FindingReport"]`
  - `permissions: ["read:artifacts", "write:artifacts"]`
  - `invalidatedBy: [{ id: "inputs.changed", inputs: ["EvidenceGraph", "Rulebook"] }]`
- CLI: `rekon evaluate list` shows it; `rekon evaluate run <id>` runs it.
- Provenance: every `Finding` cites the rule id and the input artifact
  refs that triggered it.

### Example 2 — Classic `GraphBuildProvider` Producer → Rekon Projector Producing `GraphSlice`

Classic:

- Source: `services/GraphBuildProvider.ts` +
  `domain/graph/producers/<slice>-graph.ts`.
- Shape: a `buildXGraphSlice(...)` function called by a central provider
  with a shared `FileAnalysisWithMeta` input.

Rekon translation:

- Role: `projector`.
- Capability: one capability per relationship type, or one capability
  bundling related slices.
- Manifest:
  - `roles: ["projector"]`
  - `consumes: ["EvidenceGraph", "ObservedRepo"]`
  - `produces: ["GraphSlice"]`
  - `permissions: ["read:artifacts", "write:artifacts"]`
  - `invalidatedBy: [{ id: "source.changed", paths: ["**/*"] }]`
- CLI: produced when `rekon project` runs; in the future, dispatchable
  through a per-projector run command if community projectors need it.
- Provenance: each `GraphNode` / `GraphEdge` cites the evidence facts
  that produced it.

### Example 3 — Classic `ContextHandler` Output → Rekon Resolver + Publisher

Classic:

- Source: `services/ContextHandler.ts`, `lib/context/resolver.ts`,
  `lib/agent-docs.ts`.
- Shape: one handler that builds a context bundle, runs the resolver,
  checks freshness, and writes generated agent docs.

Rekon translation:

- Roles: `resolver` + `publisher`, in two separate capabilities.
- Resolver:
  - `consumes: ["IntelligenceSnapshot", "ObservedRepo", "OwnershipMap", "GraphSlice", "FindingReport", "MemorySelection"]`
  - `produces: ["ResolverPacket"]`
  - CLI: `rekon resolve list`, `rekon resolve run <id>`,
    `rekon resolve preflight`.
- Publisher:
  - `consumes: ["IntelligenceSnapshot", "ResolverPacket", "FindingReport", "MemorySelection"]`
  - `produces: ["Publication"]`
  - CLI: `rekon publish list`, `rekon publish run <id>`,
    `rekon publish agents`.
- Provenance: every `ResolverPacket` ships a `resolutionTrace`. Every
  `Publication` cites the snapshot/resolver/finding refs that produced
  it.

### Example 4 — Classic `OperatorFeedback` Entry → Rekon Learner Producing `MemorySelection`

Classic:

- Source: `lib/operator-feedback.ts`,
  `schemas/operator-feedback.schema.ts`,
  `schemas/memory-kind-taxonomy.schema.ts`.
- Shape: typed feedback entries persisted to YAML, with kind/scope/
  evidence/freshness/verification; selection during context resolution;
  usage tracking.

Rekon translation:

- Role: `learner`.
- Capability: `@rekon/capability-memory` (and future curation packs).
- Manifest:
  - `roles: ["learner"]`
  - `consumes: ["IntelligenceSnapshot", "ResolverPacket", "OperatorFeedbackEntry"]`
  - `produces: ["OperatorFeedbackEntry", "MemoryEvent", "MemorySelection"]`
  - `permissions: ["read:artifacts", "write:artifacts"]`
  - `invalidatedBy: [{ id: "memory.changed" }]`
- CLI: `rekon memory add`, `rekon memory list`, `rekon memory select`.
- Provenance: every memory entry cites its source evidence; every
  selection cites the entries it picked.
- Architecture rule: memory enriches resolver output; it does not rewrite
  ownership/rule facts.

### Example 5 — Classic `PlanExecutor` Deterministic Operation → Rekon Actuator Producing `ReconciliationLog`

Classic:

- Source:
  `packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`,
  `packages/product-codebase-intel/src/reconcile/index.ts`.
- Shape: select deterministic operations from a plan, apply them, defer
  risky ones, write applied/deferred logs to cache paths.

Rekon translation:

- Role: `actuator`.
- Capability: `@rekon/capability-reconcile` today; future permissioned
  actuators behind explicit `write:source` per operation.
- Manifest:
  - `roles: ["actuator"]`
  - `consumes: ["ResolverPacket", "FindingReport", "WorkOrder"]`
  - `produces: ["ReconciliationPlan", "ReconciliationLog", "ActionLog"]`
  - `permissions: ["read:artifacts", "write:artifacts"]` (default);
    `write:source` only when an operation explicitly requires it and the
    runtime policy grants it.
  - `invalidatedBy: [{ id: "inputs.changed", inputs: ["ResolverPacket", "FindingReport"] }]`
- CLI: `rekon reconcile` today; future `rekon reconcile apply` only when
  permission gating is real.
- Provenance: every applied/deferred operation cites the plan entry it
  came from.

## Cross-Cutting Translation Rules

- **Caches stay package-private.** Replace `.codebase-intel/cache/**`
  paths with the runtime artifact store. Capabilities should not invent
  their own filesystem caches.
- **Truth flows in one direction.** Lower layers may feed upper layers
  (evidence → projections → evaluations → resolved outputs → publications
  → actions). Upper layers may not silently become lower-layer truth.
- **Memory does not rewrite rules.** A memory entry can enrich a resolver
  packet, but rewriting an `OwnershipMap` or `Rulebook` requires an
  explicit, permissioned `actuator`.
- **Every CLI surface delegates to the runtime.** Do not put business
  logic in the CLI. The CLI selects a handler by id and invokes the
  runtime.

If a port cannot follow these rules, the port is not ready. Update the
substrate (kernels, SDK, runtime, capability contract) before porting.

Cross-references:

- [classic-behavior-distillation.md](classic-behavior-distillation.md)
- [classic-wins.md](classic-wins.md)
- [classic-refactor-principles.md](classic-refactor-principles.md)
- [capability-model.md](capability-model.md)
- [north-star.md](north-star.md)
