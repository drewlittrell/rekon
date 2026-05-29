# Classic Step-Capability / Handoff / Runtime Drift Parity Audit

## Decision Summary

This audit inspected the legacy **codebase-intel** source directly (not
just package scripts) for the step-capability graph, baton / handoff
system, handoff coverage, step-handler validation, derive validation,
runtime graph drift, and the watcher / continuity / memory surfaces that
feed intent preparation.

**Rekon has adjacent foundations, but the classic step-capability /
handoff / runtime drift system is not yet fully accounted for.** Rekon's
`EvidenceGraph`, `CapabilityMap v2`, `CapabilityContract`,
`PathFreshnessReport`, `FindingReport`, `VerificationPlan` /
`VerificationRun`, and `WorkOrder` cover *adjacent* ground, but none of
them models a step→capability→file/handoff **edge graph**, declared
**handoff contracts** verified against **observed runtime handoff
events**, or a **runtime-observed graph drift** signal. Classic treated
these as first-class, runtime-grounded subsystems.

The decision: treat codebase-intel as **design prior art** for this
subsystem and **reserve** a small family of future Rekon
concepts/artifacts — `StepCapabilityGraph`, `HandoffContract`,
`HandoffCoverageReport`, `RuntimeGraphObservationReport`,
`RuntimeGraphDriftReport` — plus evaluate `DerivedGraphValidationReport`
and `StepHandlerValidationReport`. Intent work must account for these
surfaces before claiming classic intent parity. Deeper lifecycle /
`CoherencyDelta` work should wait; the
`BridgeFindingLifecycleIntegrationReport` safety review (already shipped)
needed no dependency on this audit, but the lifecycle *writer* line does.

**No runtime behavior changes ship in this audit.**

## Why This Audit Exists

The operator flagged that classic codebase-intel had a step-capability
graph, baton handoff, and runtime graph drift detection system, and that
a previous answer had only inspected shallow evidence (package scripts
and a referenced `tools/verify-handoff-coverage.mjs`). That is not
enough to claim this North Star area is covered.

This audit reads the actual classic source so Rekon stops *assuming*
this area is covered by its current capability / finding / lifecycle
work. It determines what classic actually did, which concepts must be
preserved, which should be adapted into Rekon's artifact spine, and how
this affects the upcoming intent system.

One premise correction up front: the referenced
`tools/verify-handoff-coverage.mjs` **does not exist** in the classic
tree. Handoff coverage is real, but it lives inside the
`product-capability-contracts` package (drift + scaffold + registry
modules), not a standalone tool. The audit records this as a limitation
rather than inventing a file.

## Classic Source Reviewed

Inspected under `/Users/andrewlittrell/Code/codebase-intel`
(read-only; classic is reference / prior art only — no code was imported
into Rekon):

- **Step-capability graph:** `lib/step-capability-map.ts`,
  `domain/graph/producers/step-capability-graph.ts`,
  `lib/graph-contract-catalog.ts`, `schemas/graph-core.schema.ts`.
- **Baton / handoff:** `packages/sdk-baton-node/src/index.ts`,
  `packages/product-capability-contracts/src/{types,capability-graph,drift-artifacts,registry-artifacts,capability-scaffolds,capability-loader}.ts`,
  `packages/kernel-runtime-truth/src/schema/runtime-truth.schema.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-runtime-truth.ts`,
  `config.project/systems/*.yaml`.
- **Step-handler / derive / conductor validation:**
  `commands/validate-step-handlers.ts`,
  `services/StepHandlerValidationHandler.ts`,
  `commands/validate-derive.ts`,
  `infra/validation/DerivedStateValidationHandler.ts`,
  `services/DerivedStateValidationScanner.ts`,
  `infra/validation/ConductorValidationHandler.ts`.
- **Runtime graph / drift:**
  `schemas/runtime-graph.schema.ts`,
  `packages/product-capability-contracts/src/drift-artifacts.ts`.
- **Watcher / memory / intent:** `infra/providers/WatchProvider.ts`,
  `services/{WatchHandler,WatchBatchRuntime}.ts`, `commands/memory.ts`,
  `lib/turn-memory.ts`, `services/IntentWorkflowService.ts`,
  `lib/intent/`, `lib/intent-preparation/`,
  `.codebase-intel/intent/migrations/*/phases/*`.

Limitation: `tools/verify-handoff-coverage.mjs`,
`tools/validate-gates.mjs`, `tools/build-gates.mjs`,
`tools/build-flows.mjs` were **NOT FOUND** at the referenced paths; their
real responsibilities live in the packages above. This audit does not
invent their internals.

| Classic Surface | Source Evidence | Finding |
| --- | --- | --- |
| step-capability graph | lib/step-capability-map.ts; domain/graph/producers/step-capability-graph.ts; lib/graph-contract-catalog.ts | step→capability (`owns`) + step→file (`implements`) edge graph from a step-capability-map.yaml, runtime-grounded |
| baton / handoff | packages/sdk-baton-node/src/index.ts; packages/kernel-runtime-truth/src/schema/runtime-truth.schema.ts | runtime events → RuntimeTruthGraph DAG; handoff nodes/edges carry handoffContractId |
| handoff coverage | packages/product-capability-contracts/src/{types,drift-artifacts,capability-scaffolds}.ts (NO standalone tools/verify-handoff-coverage.mjs) | declared `handoffs[]` compared to evidence → intact/broken/added/removed + handoff_broken violations |
| step-handler validation | commands/validate-step-handlers.ts; services/StepHandlerValidationHandler.ts; infra/validation/ConductorValidationHandler.ts | step handlers rejected for forbidden infra imports / fetch / Date.now / process.env; conductor requires state{schema,derive,adapter} |
| derive validation | commands/validate-derive.ts; services/DerivedStateValidationScanner.ts | derived files enforced pure (no async/await/fetch/Date.now/random/IO/env) |
| issues delta / drift | packages/product-capability-contracts/src/drift-artifacts.ts; schemas/runtime-graph.schema.ts | base-vs-head EvidenceGraph capability/handoff/outcome change report + observed runtime-truth graph |
| watcher / continuity | infra/providers/WatchProvider.ts; commands/memory.ts; lib/turn-memory.ts | chokidar daemon + change ledger freshness; turn-keyed memory + operator-feedback promotion gates |

## Classic Step-Capability Graph

Classic built a deterministic **bridge graph** linking observability
steps → code symbols → capabilities. Source: a
`step-capability-map.yaml` (`.codebase-intel/graphs/step-capability-map.yaml`
or `core/config/architecture/step-capability-map.yaml`) whose entries
are `{capability, owner_system?, expected_files?, module_key?}`. The
producer (`domain/graph/producers/step-capability-graph.ts`) emits:

- **Nodes:** `step:*`, `capability:*`, `file:*`.
- **Edges:** `step → capability` (kind `owns`, hard, acyclic) and
  `step → file` (kind `implements`, soft, acyclic), declared formally in
  `lib/graph-contract-catalog.ts`.
- **Runtime grounding:** steps observed at runtime are tagged
  `grounded: true` with execution counts, joining static structure to
  runtime evidence.

This is a **two-layer query model** ("which code handles this
capability?", "what actually executed for this step?", "which
capabilities have runtime evidence?"). It is not a flat capability map:
**StepCapabilityGraph is not the same as CapabilityMap v2** —
`CapabilityMap v2` maps a capability to subjects/systems, with no
step/workflow nodes, no `owns`/`implements` edges, and no runtime
grounding.

## Classic Baton / Handoff System

The Baton SDK (`packages/sdk-baton-node/src/index.ts`) records runtime
events: `BatonNodeRuntimeEvent { traceId, handoffId?, operation,
staticRef?, capabilityContractId?, handoffContractId?, timestamp,
attributes? }`. Events accumulate into a `BatonRuntimeTruthExport` /
`RuntimeTruthGraph` — a DAG of nodes (operation, handoff, symbol) and
edges (kind `follows` / `handoff`), where handoff nodes/edges carry a
`handoffContractId`. Capability contracts
(`CapabilityContractDraft.handoffs: string[]`) **declare** expected
cross-system handoffs (e.g. `"api->service"`). The runtime truth graph is
persisted (`.codebase-intel/cache/runtime-truth-graph.json`) and merged
by node id + edge key `from::to::kind::traceId`.

The key guarantee: a handoff contract verifies that **control flow
actually reached the expected system boundary** and that declared
system-to-system transitions remain structurally intact as the
implementation changes — far stronger than "the command exited 0."

## Classic Handoff Coverage

Coverage compares **declared** handoffs (from accepted capability
contracts) against **evidence** of those handoffs, producing a
`HandoffChange { handoff, status: 'intact' | 'broken' | 'added' |
'removed', evidence[] }` and `ContractViolation { kind: 'handoff_broken'
}` rows in a `CapabilityChangeReport`
(`product-capability-contracts/src/drift-artifacts.ts` and
`types.ts`). Test scaffolds emit explicit `"Verify handoff contract:
{handoff}"` steps (`capability-scaffolds.ts`). Violations can be
scope-bound suppressed and are rendered as markdown tables.

**Handoff coverage is not the same as VerificationRun command success.**
Coverage answers "did every *declared* boundary transition remain
present and intact?", which a green command exit cannot answer.

## Classic Step-Handler Validation

`services/StepHandlerValidationHandler.ts` (entry
`commands/validate-step-handlers.ts`) identifies step handlers
(`config/steps/` path, or files containing `StepKindDefinition` +
`execute`) and rejects forbidden patterns: direct `@supabase`/`ioredis`
imports, raw `fetch`/`axios`, `Date.now()`, and `process.env` access.
Output: `StepHandlerValidationResult { success, violations, reportPath
}`. Separately, `infra/validation/ConductorValidationHandler.ts`
validates the conductor config shape — required keys `applicationId`,
`state`, `scopes`, `gateSources`, `flowSources`, `stepKinds`,
`actionProviders`, with `state` requiring `{schema, derive, adapter}`.

This validates that each declared step has a conformant, side-effect-safe
handler — a contract Rekon's capability lint does not currently model.

## Classic Derive Validation

`services/DerivedStateValidationScanner.ts` (entry
`commands/validate-derive.ts`,
handler `infra/validation/DerivedStateValidationHandler.ts`) scans
`domain/state/derived/` and `derive*.ts` files and enforces **purity**:
no `async`/`await`, no `fetch`/`axios`, no `Date.now()`/`new Date()`, no
`Math.random()`/`randomUUID`, no external IO (`@supabase`, `redis`,
`ioredis`), no `process.env`. Success requires zero violations. The
guarantee: derived graph/state outputs are deterministic,
side-effect-free, and replayable — a precondition for trustworthy
re-derivation and drift comparison.

## Classic Runtime Graph Drift / Delta

Classic has **two** layers here, and they must not be conflated:

1. **Observed runtime truth graph** — built from Baton events at
   runtime, persisted to `.codebase-intel/cache/runtime-truth-graph.json`,
   merged across traces. This is *what actually ran*.
2. **Capability change / drift report**
   (`drift-artifacts.ts`, `buildCapabilityChangeReport`) — a
   **base-vs-head** semantic diff of two `EvidenceGraph`s. It indexes
   capability facts by name and compares confidence and evidence-file
   deltas (`added` / `removed` / `modified` / `unchanged`), plus handoff
   (`intact` / `broken` / `added` / `removed`) and outcome changes, and
   emits `ContractViolation`s (`capability_removed`, `handoff_broken`,
   `outcome_missing`, `confidence_degraded`).

**Runtime graph drift is not the same as PathFreshnessReport or artifact
lineage freshness.** `PathFreshnessReport` is a single-point
source-fingerprint/mtime staleness check; classic drift is a
**two-point semantic diff** of extracted knowledge, and the runtime
truth layer is an **observed execution graph** — neither reduces to "is
the artifact older than the source?"

## Classic Watcher / Continuity Surface

A chokidar-based watcher (`infra/providers/WatchProvider.ts`,
`services/WatchBatchRuntime.ts`) runs as an agent-managed daemon
(pre-task / post-session hooks under `tools/dev/`), batches file changes,
and re-runs analysis / labeling / issue services. A change ledger
(`.codebase-intel/ledger/snapshot.json`) drives freshness
(`readLedgerFreshness` → fresh / stale / unknown). Continuity is
turn-based: `lib/turn-memory.ts` keys sessions by `{agentKey, threadId,
turnId}`, persists `turn-sessions.events.jsonl` and
`operator-feedback.events.jsonl`, and promotes operator feedback through
gates (accepted ≥ 2, rejects = 0, evidence diversity ≥ 3).

Intent (`services/IntentWorkflowService.ts`) consumes prepared phases
(`PreparedPhaseArtifact { objective, deliverables, acceptanceCriteria,
touchedPaths, behaviorCommand, semanticCommand, verificationCommand,
gates[], outcomes[] }`); `intent:go` runs an actionability check, then
gates (`path_exists`, `artifact_content`, `json_assertion`,
`semantic_intent_contract`, `meta_intent_contract`), and advances a phase
manifest (`pending` → `prepared` → `verified` → `failed`).

## Current Rekon Equivalent

| Classic Surface | Closest Rekon Today | What's missing |
| --- | --- | --- |
| step-capability map/graph | `CapabilityMap v2` (capability → subjects/systems) | no step/workflow nodes, no `owns`/`implements` edges, no runtime grounding |
| baton runtime events | (none) | no runtime event SDK / observed runtime graph |
| handoff contracts | `CapabilityContract` outcomes; `WorkOrder` guidance | no declared cross-system handoff list |
| handoff coverage | `VerificationRun` + docs tests | no declared-vs-observed handoff comparison |
| runtime graph drift | `PathFreshnessReport`; `FindingReport` | freshness/findings only; no runtime-observed drift |
| derive validation | (none) | no purity gate for derived outputs |
| step-handler validation | capability lint (architecture rules) | no per-step handler conformance gate |
| watcher / continuity | `PathFreshnessReport` (explicit refresh) | no daemon, no turn memory / continuity ledger |
| intent phases | `WorkOrder` / `VerificationPlan` | no phase manifest, no actionability gating, no drift-aware re-verify |

## Gap Matrix

| Classic Capability | Rekon Current Equivalent | Gap | Decision |
| --- | --- | --- | --- |
| step-capability graph | CapabilityMap / CapabilityContract | no step/workflow edge graph | reserve StepCapabilityGraph |
| baton handoff contracts | WorkOrder / agent guidance | no handoff contract artifact | reserve HandoffContract |
| handoff coverage | VerificationRun / docs tests | no handoff event coverage report | reserve HandoffCoverageReport |
| runtime graph observation | EvidenceGraph / PathFreshnessReport | source/artifact freshness only | reserve RuntimeGraphObservationReport |
| runtime graph drift | artifact freshness / findings | no runtime-observed drift report | reserve RuntimeGraphDriftReport |
| derive validation | (none) | no determinism/purity gate | evaluate DerivedGraphValidationReport |
| step-handler validation | capability lint | no per-step handler conformance gate | evaluate StepHandlerValidationReport |

## Methods To Repeat

- **Declared-vs-observed comparison.** Classic's strongest idea: declare
  expected structure (handoffs, capabilities) and compare it to observed
  evidence, emitting `intact` / `broken` / `added` / `removed`. Rekon
  should repeat this pattern for handoffs and runtime graph drift.
- **Formal graph contracts** (node kinds, edge kinds, hardness, acyclic)
  as in `graph-contract-catalog.ts` — Rekon's artifact validators are the
  natural home.
- **Determinism gates** for derived outputs (purity checks) before
  trusting re-derivation.
- **Status-bound suppressions with scope** rather than silent hiding.

## Methods To Adapt

- **Runtime truth via a Baton-style SDK** — adapt as an *optional*,
  opt-in `RuntimeGraphObservationReport` artifact rather than a runtime
  dependency baked into the product; Rekon's spine is artifact-first.
- **Step-capability map source** — adapt the YAML map into a governed
  Rekon artifact (`StepCapabilityGraph`) produced from evidence +
  capability phrases, not a hand-maintained file.
- **Intent phase manifest** — adapt into Rekon's `WorkOrder` /
  `VerificationPlan` spine with explicit actionability + drift-aware
  re-verification, instead of a parallel `.codebase-intel/intent/`
  working tree.

## Methods To Reject

- **Always-on watcher daemon as a product requirement** — Rekon's
  beta stance is explicit `rekon refresh`; a daemon stays
  post-beta/experimental (consistent with the watcher / path-freshness
  decision).
- **Direct coupling of validation to Supabase/Redis/runtime infra** —
  classic step/derive validators hard-code infra assumptions; Rekon
  keeps validators infra-neutral.
- **A parallel `.codebase-intel/`-style mutable working state** outside
  the artifact store — Rekon keeps everything in the governed
  `.rekon/artifacts` spine.

## Proposed Rekon Artifact Spine Additions

Rekon should **reserve** the following future concepts/artifacts (names
reserved here; no registration, schema, or CLI ships in this audit):
`StepCapabilityGraph`, `HandoffContract`, `HandoffCoverageReport`,
`RuntimeGraphObservationReport`, and `RuntimeGraphDriftReport`. Two
validation reports — `DerivedGraphValidationReport` and
`StepHandlerValidationReport` — should be **evaluated** as future
refresh-gate / verification reports.

| Proposed Artifact | Purpose | First Consumer |
| --- | --- | --- |
| StepCapabilityGraph | map steps/workflows to capabilities and handoffs | intent preparation |
| HandoffContract | declare expected baton passes | handoff coverage |
| HandoffCoverageReport | compare declared handoffs to observed handoff events | verification / agent contract |
| RuntimeGraphObservationReport | record observed runtime step/handoff graph | drift detection |
| RuntimeGraphDriftReport | compare expected vs observed runtime graph | intent / governance |
| DerivedGraphValidationReport | validate derived graph outputs | refresh gate |
| StepHandlerValidationReport | validate step handlers against contracts | intent / verification |

## Impact On Intent Work

**Intent parity depends on step-capability, handoff, and runtime drift
surfaces.** Classic `intent:prepare` / `intent:go` assume drift = 0,
gate only *after* implementation, and have no step-graph execution model
or path-conflict detection. Rekon's `WorkOrder` / `VerificationPlan`
spine does not yet model step-capability preconditions, handoff
readiness, or drift-aware re-verification. Intent work must account for
these before claiming classic intent parity.

| Intent Surface | Dependency On This Audit |
| --- | --- |
| intent:assess | needs context completeness and graph/handoff readiness |
| intent:prepare | needs step/capability/handoff/gate model |
| intent:go | must not proceed if runtime graph drift is unresolved |
| intent:status | should report handoff coverage and drift state |

## Recommendation

1. The classic step-capability / handoff / runtime drift system is not
   yet fully accounted for in Rekon.
2. Treat codebase-intel as design prior art for this subsystem.
3–7. Reserve `StepCapabilityGraph`, `HandoffContract`,
   `HandoffCoverageReport`, `RuntimeGraphObservationReport`, and
   `RuntimeGraphDriftReport` as future Rekon concepts/artifacts.
8. Evaluate `DerivedGraphValidationReport` and
   `StepHandlerValidationReport` as future validation reports.
9. Intent work must account for these surfaces before claiming classic
   intent parity.
10. The `BridgeFindingLifecycleIntegrationReport` safety review may
    resume / has shipped, but deeper lifecycle / `CoherencyDelta` work
    should wait until these surfaces are at least architecturally
    decided.

Recommended next slice (if these surfaces are more urgent than lifecycle
work): a **StepCapabilityGraph / HandoffContract architecture decision**.

## What This Does Not Do

This audit implements no runtime behavior, registers no artifact type,
adds no CLI command, mutates no existing schema, changes no
`BridgeFindingLifecycleIntegrationReport` behavior, continues no
lifecycle / `CoherencyDelta` integration, and starts no intent
implementation. It imports nothing from codebase-intel. It bumps no
version and publishes nothing. **No runtime behavior changes ship in
this audit.**

## Follow-Up Work

- `StepCapabilityGraph` / `HandoffContract` architecture decision.
- Intent Capability Spine Integration Review (how reserved surfaces feed
  `intent:assess` / `prepare` / `go` / `status`).
- Evaluate `DerivedGraphValidationReport` + `StepHandlerValidationReport`
  as refresh-gate validators.
- Resume the lifecycle line (lifecycle writer decision) only after the
  reserved surfaces are architecturally placed.

## Cross-References

- [Classic scanner / ontology parity audit](classic-scanner-ontology-parity-audit.md)
- [Capability ontology architecture impact review](capability-ontology-architecture-impact-review.md)
- [EvidenceGraph artifact](../artifacts/evidence-graph.md)
- [CapabilityMap artifact](../artifacts/capability-map.md)
- [CapabilityContract artifact](../artifacts/capability-contract.md)
- [BridgeFindingLifecycleIntegrationReport artifact](../artifacts/bridge-finding-lifecycle-integration-report.md)
- [WorkOrder artifact](../artifacts/work-order.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [Agent operating contract concept](../concepts/agent-operating-contract.md)
- [Remediation work orders concept](../concepts/remediation-work-orders.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)

> See also: [StepCapabilityGraph / HandoffContract architecture decision](step-capability-handoff-architecture-decision.md) — selects a staged step/handoff/runtime graph spine (StepCapabilityGraph → HandoffContract → HandoffCoverageReport → RuntimeGraphObservationReport → RuntimeGraphDriftReport).
