# Intent Capability Spine Integration Review

## Decision Summary

The full classic-parity step / handoff / runtime-drift spine
(`StepCapabilityGraph` → `HandoffContract` → `HandoffCoverageReport` →
`RuntimeGraphObservationReport` → `RuntimeGraphDriftReport`) is shipped and
safety-reviewed. This review maps the classic codebase-intel intent surfaces
(`intent:assess` / `intent:prepare` / `intent:go` / `intent:status`) onto
Rekon's artifact spine and selects the next implementation target.

**Select Option B — a staged intent artifact spine.** Rekon should make
intent artifact-backed (not prose-only) through three new read-only
artifacts before any execution surface: **`IntentAssessmentReport`** (assess)
→ **`PreparedIntentPlan`** (prepare) → **`IntentStatusReport`** (status), with
an **`IntentGoDecision`** execution gate deferred to a separately-decided
later track. The first implementation target is **`IntentAssessmentReport`**.

The boundaries are pinned. **IntentAssessmentReport is not WorkOrder.**
**PreparedIntentPlan is not source-write execution.** **IntentStatusReport
is not VerificationResult.** **RuntimeGraphDriftReport is an input to intent
readiness, not the intent system itself.** **Intent parity depends on
StepCapabilityGraph, HandoffContract, HandoffCoverageReport,
RuntimeGraphObservationReport, and RuntimeGraphDriftReport.** **intent:go
remains deferred.** **No source-write behavior ships in this review.**

This is a review/architecture batch only; no intent artifact is implemented
or registered here, and no CLI command is added.

## Why This Review Exists

Classic codebase-intel had an intent system around assess / prepare / go /
status. Rekon has many adjacent artifacts (capability, policy, finding,
step, handoff, coverage, observation, drift, work, verification, freshness)
but has not yet explicitly mapped the classic intent capability onto the
Rekon artifact spine. The newly completed step/handoff/runtime-drift spine
must be included in the intent architecture, or intent parity will be
incomplete. This review fixes that mapping, the gap matrix, the artifact
sketches, and the next implementation slice — without implementing intent.

## Classic Intent Source Reviewed

Grounded by a targeted source-level audit of classic codebase-intel (not
inferred from command names). Cited paths are relative to the classic repo.

- **CLI surfaces** live in `commands/cli-entry.ts` (`intent:assess` ~5329,
  `intent:status` ~5575, `intent:prepare` ~5629, `intent:go` ~5841) and
  dispatch into `services/IntentWorkflowService.ts` and
  `services/IntentPreparationService.ts`.
- **Artifacts on disk** live under `.codebase-intel/intent/`: a
  `phases-manifest.json` registry plus per-migration
  `migrations/<id>/{source-plan.md, manifest.json, phases/phase-N-title.{json,md}}`.
  (The work order's example path `.codebase-intel/intent/migrations/**/*`
  resolves to this per-migration `phases/` layout.)
- **Type models** live in `lib/intent/types.ts`,
  `packages/product-codebase-intel/src/intent/model.ts`, and
  `lib/intent-preparation/types.ts`: `IntentMap`, `IntentGate`,
  `IntentOutcome`, `PreparedPhaseArtifact`, `IntentPhaseManifest`,
  `PreparedPhaseActionability`, `IntentVerificationReport`,
  `PreparedPhaseFileSnapshot` (codebase baseline).

**Honest premise corrections** recorded from the audit:

1. **Classic intent did not consume step-capability / handoff / runtime-graph
   / drift surfaces.** The intent code references none of them; its readiness
   is gate-based (actionability + verification gates) plus hash-based
   staleness, not runtime-drift-based. Rekon's intent architecture therefore
   *extends* parity by wiring the graph spine into intent readiness — a
   Rekon-native improvement, not a literal classic feature.
2. **Classic readiness = two-level gates + hash staleness.** `PreparedPhaseActionability`
   requires `objective`, `deliverables`, `acceptance_criteria`,
   `implementation_scope`, `verification_evidence`, `ambiguity_clearance`;
   `IntentGate`/`IntentVerificationReport` enforce required gates; a
   prepared-artifact-hash mismatch blocks with a "reconcile" message
   (`IntentWorkflowService.ts` ~447). Rekon's `PathFreshnessReport` maps onto
   that staleness guard.
3. **Classic intent never wrote source.** `intent:go` executes *verification
   commands* and writes manifest/report/completion artifacts, but source
   implementation is user-driven (`IntentPreparationService.ts` ~57
   IMPLEMENTATION_CONSTRAINTS). No conductor / turn / plan-compiler loop
   drives intent.

## Classic Intent Surfaces

- **`intent:assess`** — read-only classification. Builds an intent map
  (`createIntentMap`, `write:false`), infers owner systems / concerns,
  evaluates against `.codebase-intel/config/intent-policy.json`, classifies
  small / medium / large with a score, detects an active migration guard, and
  decides whether intent gating is required. Writes nothing; enforces no
  blockers.
- **`intent:prepare`** — artifact generation. Parses a source plan markdown,
  normalizes into phases (deterministic or LLM-semantic), and per phase:
  merges elicitation answers, resolves command roles, scans codebase context,
  generates assertions + meta-gates, evaluates actionability (marks `blocked`
  on missing deliverables / acceptance criteria / scope / evidence), computes
  an artifact hash, and builds an execution graph + preparation manifest.
  Writes phase JSON/MD, a `source-plan.md` copy, and `manifest.json`. Executes
  nothing.
- **`intent:go`** — lifecycle driver. Acquires a migration lock, bootstraps
  context, and for the next pending phase prepares it or verifies-and-advances:
  the actionability gate blocks (returns a `work_order` with blocking reasons)
  before any verification; otherwise non-meta gates (path_exists, command) run
  and a pass advances the manifest entry to `verified`. Executes verification
  shell commands; writes manifest status / completion / verification reports;
  **does not modify source**.
- **`intent:status`** — read-only inspection. Reads the phase manifest,
  summarizes per-migration phase counts (verified / failed / prepared /
  pending), surfaces unregistered prepared artifacts, the next pending entry,
  and a recommended resume command. Writes nothing.

| Classic Surface | Role | Rekon Mapping |
| --- | --- | --- |
| `intent:assess` | read-only classification | `IntentAssessmentReport` |
| `intent:prepare` | phase artifact generation | `PreparedIntentPlan` |
| `intent:go` | execution lifecycle gate | deferred execution gate |
| `intent:status` | read-only lifecycle inspection | `IntentStatusReport` |

## Current Rekon Spine

Rekon already ships the surfaces intent must consume: `EvidenceGraph`,
`CapabilityNormalizationReport`, `CapabilityPhraseReport`, `CapabilityMap`
v2, `CapabilityContract`, `CapabilityArchitectureLintReport`,
`CapabilityLintFindingBridgeReport`, the FindingReport writer path,
`BridgeFindingLifecycleIntegrationReport`, the full graph spine
(`StepCapabilityGraph` → `HandoffContract` → `HandoffCoverageReport` →
`RuntimeGraphObservationReport` → `RuntimeGraphDriftReport`), `WorkOrder`,
`VerificationPlan`, `VerificationRun`, `VerificationResult`,
`PathFreshnessReport`, and the architecture-summary / agent-contract
publications. What is missing is the intent layer that *assembles and
gates* on these surfaces.

## Gap Matrix

| Classic intent piece | Rekon equivalent | Status |
| --- | --- | --- |
| IntentMap (request / scope / gates) | — | **missing** → IntentAssessmentReport |
| actionability evaluation | — | **missing** → IntentAssessmentReport blockers |
| PreparedPhaseArtifact (phases / gates / constraints / baseline) | — | **missing** → PreparedIntentPlan |
| IntentPhaseManifest + status | — | **missing** → IntentStatusReport |
| IntentGate / verification | VerificationPlan / VerificationRun / VerificationResult | partial (proof exists; intent wiring missing) |
| WorkOrder (implementation guidance) | WorkOrder | exists (guidance, not intent) |
| hash-staleness reconcile guard | PathFreshnessReport | exists (stale-context guard) |
| runtime readiness inputs | StepCapabilityGraph / HandoffContract / HandoffCoverageReport / RuntimeGraphObservationReport / RuntimeGraphDriftReport | exists (Rekon-native parity extension) |
| intent:go execution gate | — | **deferred** → IntentGoDecision |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| WorkOrder as intent | rejected | guidance is not assessment/preparation/status |
| staged intent artifact spine | selected | preserves classic boundaries |
| start with PreparedIntentPlan | rejected/deferred | assessment comes first |
| start with intent:go | rejected | execution is too early |
| runtime drift as intent | rejected | drift is one input |

- **Option A — map intent onto existing `WorkOrder`.** Rejected: `WorkOrder`
  is implementation guidance, not intent assessment / preparation / status.
- **Option B — staged intent artifact spine.** Selected:
  `IntentAssessmentReport` → `PreparedIntentPlan` → `IntentStatusReport`,
  with a later execution gate. Preserves the classic assess / prepare /
  status / go boundaries and avoids jumping to execution.
- **Option C — start with `PreparedIntentPlan`.** Rejected/deferred:
  preparation needs an assessment of missing context, drift, handoff
  coverage, verification, and safety blockers first.
- **Option D — start with `intent:go`.** Rejected: execution must wait for
  assessment, preparation, proof gates, and a source-write policy.
- **Option E — treat runtime drift as the intent system.** Rejected:
  `RuntimeGraphDriftReport` is one input to intent readiness, not the intent
  system itself.

## Recommendation

Adopt **Option B** and ship `IntentAssessmentReport` first. Before preparing
work or running anything, Rekon needs an artifact-backed assessment of the
requested intent, current codebase context, step / handoff / drift readiness,
missing inputs, and safety blockers. Defer `intent:go` and all source-write
behavior to a separately-decided later track.

## IntentAssessmentReport Model

Sketch only; not implemented in this batch. Purpose: assess a requested user
intent against current repo intelligence and safety context.

- **Inputs (citation/context; read as materialized artifacts):** the user
  request / goal; `EvidenceGraph` / intelligence snapshot when available;
  `CapabilityMap` v2; `CapabilityContract`; `StepCapabilityGraph`;
  `HandoffContract`; `HandoffCoverageReport`; `RuntimeGraphObservationReport`;
  `RuntimeGraphDriftReport`; `FindingReport` /
  `BridgeFindingLifecycleIntegrationReport`; `PathFreshnessReport`;
  `WorkOrder` / `VerificationPlan` / `VerificationResult` when available.
- **Outputs:** intent kind; scope; candidate systems / capabilities / steps;
  missing context; blockers; drift state; handoff coverage state;
  verification readiness; source-write posture; recommended next action.

## PreparedIntentPlan Model

Sketch only. Purpose: prepare implementation phases after assessment passes
(or is accepted with known risks).

- **Outputs:** phases; touched paths; capability / step / handoff
  obligations; preservation requirements; gates; verification commands;
  required artifacts; `blocked` / `needs-review` status. **PreparedIntentPlan
  is not source-write execution** — it prepares phase plans, it does not run
  them.

## IntentStatusReport Model

Sketch only. Purpose: report whether intent work is assessed, prepared,
blocked, stale, verified, or complete.

- **Inputs:** `IntentAssessmentReport`; `PreparedIntentPlan`; `WorkOrder` /
  `VerificationPlan` / `VerificationRun` / `VerificationResult`;
  `PathFreshnessReport`; `RuntimeGraphDriftReport`. **IntentStatusReport is
  not VerificationResult** — it reports intent-lifecycle state over many
  inputs, not a single command-proof result.

## Intent Go Boundary

`IntentGoDecision` is a **future execution gate only**. **intent:go remains
deferred.** No `intent:go` implementation ships in this track until
source-write and execution policy are explicitly decided in a separate
slice.

## Runtime Drift / Handoff Dependency

**Intent parity depends on StepCapabilityGraph, HandoffContract,
HandoffCoverageReport, RuntimeGraphObservationReport, and
RuntimeGraphDriftReport.** Classic intent did not consume these surfaces;
Rekon's intent architecture extends parity by treating them as readiness
inputs. **RuntimeGraphDriftReport is an input to intent readiness, not the
intent system itself**: a high-severity drift row, an `uncovered-handoff`,
an `observation-missing`, or a stale `PathFreshnessReport` should make
`IntentAssessmentReport` surface a blocker rather than claim readiness.

| Rekon Artifact | Intent Use |
| --- | --- |
| StepCapabilityGraph | step/capability scope |
| HandoffContract | expected baton obligations |
| HandoffCoverageReport | handoff coverage readiness |
| RuntimeGraphObservationReport | observed runtime context |
| RuntimeGraphDriftReport | drift blockers / readiness |
| PathFreshnessReport | stale context guard |
| WorkOrder | implementation guidance after preparation |
| VerificationPlan / VerificationRun / VerificationResult | proof state |

## WorkOrder / Verification Boundary

**IntentAssessmentReport is not WorkOrder.** `WorkOrder` is implementation
guidance produced *after* preparation; assessment decides scope, readiness,
and blockers *before* it. Verification (`VerificationPlan` /
`VerificationRun` / `VerificationResult`) supplies the proof state that
`IntentStatusReport` reports on — intent never re-implements proof, it
consumes it. **No source-write behavior ships in this review.**

## What This Does Not Do

This review implements no intent, registers no artifact type, adds no CLI
command, mutates no existing artifact (`WorkOrder`, `VerificationPlan`,
`RuntimeGraphDriftReport`, `StepCapabilityGraph`, `HandoffContract`,
`HandoffCoverageReport`, `RuntimeGraphObservationReport`), creates no
`WorkOrder` / `VerificationPlan` from drift, adds no source-write or
auto-execution behavior, imports nothing from classic codebase-intel, bumps
no version, and publishes nothing.

## Implementation Sequence

| Stage | Next Role |
| --- | --- |
| IntentAssessmentReport | first implementation target |
| PreparedIntentPlan | second |
| IntentStatusReport | third |
| intent:go | deferred |

1. **Intent Capability Spine Integration Review** (this memo).
2. **IntentAssessmentReport v1 decision** — request / goal model, scope
   model, readiness model, blocker model, dependency on the graph spine +
   `PathFreshnessReport`, boundary from `WorkOrder` and `VerificationPlan`.
3. **IntentAssessmentReport v1 implementation** → **PreparedIntentPlan** →
   **IntentStatusReport** → (later, separately decided) **IntentGoDecision**
   execution gate + source-write policy.

## Cross-References

- [Classic step-capability / handoff / runtime drift parity audit](classic-step-capability-handoff-runtime-drift-parity-audit.md)
- [RuntimeGraphDriftReport safety review](runtime-graph-drift-report-safety-review.md)
- [RuntimeGraphDriftReport artifact](../artifacts/runtime-graph-drift-report.md)
- [RuntimeGraphObservationReport artifact](../artifacts/runtime-graph-observation-report.md)
- [HandoffCoverageReport artifact](../artifacts/handoff-coverage-report.md)
- [HandoffContract artifact](../artifacts/handoff-contract.md)
- [StepCapabilityGraph artifact](../artifacts/step-capability-graph.md)
- [WorkOrder artifact](../artifacts/work-order.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [Path freshness report artifact](../artifacts/path-freshness-report.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)

> See also: [IntentAssessmentReport v1 decision](intent-assessment-report-v1-decision.md) — selects Option B: IntentAssessmentReport v1 as an artifact-backed readiness assessment generated from a user request plus existing Rekon context artifacts (CapabilityMap v2, StepCapabilityGraph, HandoffCoverageReport, RuntimeGraphDriftReport, PathFreshnessReport, VerificationResult when available). Readiness: ready-for-prepare / blocked / needs-review / insufficient-context / stale-context; blocker categories missing-artifact / stale-context / runtime-drift / handoff-coverage / finding-governance / proof-missing / scope-ambiguous / source-write-unavailable. IntentAssessmentReport is assessment, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred. RuntimeGraphDriftReport is an input to readiness, not the intent system itself. No artifact implemented or registered; no CLI; no source writes.

> See also: [IntentAssessmentReport artifact](../artifacts/intent-assessment-report.md) — the read-only readiness assessment of a user request against the Rekon context spine (CapabilityMap, StepCapabilityGraph, HandoffCoverageReport, RuntimeGraphDriftReport, PathFreshnessReport, VerificationResult), via `rekon intent assess`. Readiness: ready-for-prepare / blocked / needs-review / insufficient-context / stale-context. IntentAssessmentReport is assessment, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. RuntimeGraphDriftReport is an input to readiness, not the intent system itself. PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred.

> See also: [IntentAssessmentReport safety review](intent-assessment-report-safety-review.md) — declares IntentAssessmentReport v1 safe / stable as read-only readiness assessment (no blocker): assessment, not WorkOrder; creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult; executes no commands; writes no source; RuntimeGraphDriftReport is an input to readiness, not the intent system itself; PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred. Recommended next slice: PreparedIntentPlan v1 decision.

> See also: [PreparedIntentPlan v1 decision](prepared-intent-plan-v1-decision.md) — selects Option B: PreparedIntentPlan v1 as an artifact-backed phase/gate preparation artifact generated from IntentAssessmentReport plus existing Rekon context. Prepared status: prepared / blocked / needs-review / stale-assessment / insufficient-assessment; phases investigate / modify / refactor / verify / review; obligation categories capability-preservation / step-preservation / handoff-preservation / runtime-drift / finding-governance / freshness / verification / source-write-boundary. PreparedIntentPlan is phase/gate preparation, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. Verification requirements are not VerificationPlan. IntentStatusReport is the next layer; intent:go deferred; source-write behavior remains unavailable.

> See also: [PreparedIntentPlan artifact](../artifacts/prepared-intent-plan.md) — the read-only phase/gate preparation generated from an IntentAssessmentReport plus the Rekon context spine, via `rekon intent prepare`. Prepared status: prepared / blocked / needs-review / stale-assessment / insufficient-assessment; phases investigate / modify / refactor / verify / review; obligation categories capability-preservation / step-preservation / handoff-preservation / runtime-drift / finding-governance / freshness / verification / source-write-boundary. PreparedIntentPlan is phase/gate preparation, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. Verification requirements are not VerificationPlan. IntentStatusReport is the next layer; intent:go deferred; source-write behavior remains unavailable.

> See also: [PreparedIntentPlan Approval / Proof Model Decision](prepared-intent-plan-approval-proof-decision.md) — amends the PreparedIntentPlan architecture so a plan cannot be prepared without an explicit approval/proof envelope. PreparedIntentPlan.status.value can be prepared only when approval.status is approved; a plan with phases but without approval is not prepared. Approval cites the IntentAssessmentReport and records readiness, runtime-drift, handoff-coverage, freshness, verification, plan-structure, and source-write-boundary proof. Verification requirements are proof obligations, not VerificationPlan. PreparedIntentPlan does not create WorkOrder / VerificationPlan, execute commands, or write source; intent:go remains deferred. The shipped v1 implementation must be amended to add this envelope before it is treated as proof-bearing.

> Shipped (slice 83): PreparedIntentPlan v1 now carries the required approval/proof envelope — `status.value` can be prepared only when `approval.status` is approved, and a plan with phases but without approval is not prepared. Approval proof re-checks runtime drift, handoff coverage, freshness, and verification from artifact values; `downstreamHandoff.sourceWriteAllowed` is the literal `false`; `explicit-operator-approval` / `manual-risk-acceptance` are reserved reasons. It creates no WorkOrder / VerificationPlan, executes no commands, and writes no source; intent:go remains deferred. See [PreparedIntentPlan artifact](../artifacts/prepared-intent-plan.md) and [PreparedIntentPlan Approval / Proof Model Decision](prepared-intent-plan-approval-proof-decision.md).

> Reviewed (slice 84): PreparedIntentPlan v1 is safe/stable as proof-approved phase/gate preparation — `status.value` can be prepared only when `approval.status` is approved, and a plan with phases but without approval is not prepared. Verification requirements are proof obligations, not VerificationPlan; preparation creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no commands, and writes no source; IntentStatusReport remains the next layer and intent:go remains deferred. See [PreparedIntentPlan safety review](prepared-intent-plan-safety-review.md).

> IntentStatusReport v1 decision (slice 85): the next intent layer is an artifact-backed status rollup generated read-only from IntentAssessmentReport, PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, PathFreshnessReport, and RuntimeGraphDriftReport. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself. It creates no WorkOrder / VerificationPlan, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport v1 decision](intent-status-report-v1-decision.md).

> IntentStatusReport v1 (slice 86): the intent status layer has shipped as a read-only rollup status report (`rekon intent status`) over IntentAssessmentReport, PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, PathFreshnessReport, and RuntimeGraphDriftReport. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself. It creates no WorkOrder / VerificationPlan / VerificationRun, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport artifact](../artifacts/intent-status-report.md).
