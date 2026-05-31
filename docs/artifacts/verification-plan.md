# VerificationPlan

## Purpose

`VerificationPlan` describes the verification commands that prove a
`WorkOrder` is correctly resolved. It is a *plan*, not a runner; the
intent capability writes the plan but does not execute the commands.

## Produced By

- `@rekon/capability-intent.work-order` — paired with a resolver-based
  work order.
- `@rekon/capability-intent.remediation-work-order` — paired with a
  remediation work order.

## Consumed By

- humans and agents executing work
- `@rekon/capability-intent` via `createVerificationResult` and the
  `rekon verify record` CLI to write
  [`VerificationResult`](verification-result.md) artifacts that
  record the outcome of each command in the plan.

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`VerificationPlan`. `inputRefs` cites the `WorkOrder` and any
governance inputs (`CoherencyDelta`, `FindingLifecycleReport`,
`ResolverPacket`).

## Common Fields

- `workOrderRef` — the work order this plan verifies.
- `commands` — a list of shell commands to run.
- `successCriteria` — concise success criteria mirrored from the work
  order.
- `source` — `"resolver"` or `"coherency-delta"` (optional).

## Resolver Plan Commands

For resolver-based work orders, `commands` defaults to the work order's
`requiredChecks` (driven by the `ResolverPacket`):

```text
npm run typecheck
npm run test
npm run build
```

## Remediation Plan Commands

For remediation work orders, `commands` adds Rekon-specific checks to
prove the governance state really changed:

```text
npm run typecheck
npm run test
npm run build
rekon artifacts validate --json
rekon artifacts freshness --json
```

The `rekon artifacts validate` and `rekon artifacts freshness`
commands force the operator to confirm the new evaluate -> lifecycle ->
coherency delta cycle no longer lists the addressed findings as
active.

## Anti-Gaming

Verification gates are not implementation targets. Commands listed in
the plan should prove real correctness; modifying tests, rules,
validators, or finding status purely to make the plan green is a
guardrail violation captured by the work order's
`antiGamingInstruction`.

## Example

```json
{
  "header": {
    "artifactType": "VerificationPlan",
    "artifactId": "verification-plan-...",
    "schemaVersion": "0.1.0",
    "generatedAt": "2026-05-14T11:00:00.000Z",
    "subject": { "repoId": "simple-js-ts" },
    "producer": { "id": "@rekon/capability-intent", "version": "0.1.0" },
    "inputRefs": [
      { "type": "WorkOrder", "id": "work-order-...", "schemaVersion": "0.1.0" },
      { "type": "CoherencyDelta", "id": "coherency-delta-...", "schemaVersion": "0.1.0" }
    ],
    "provenance": { "confidence": 0.7 }
  },
  "workOrderRef": { "type": "WorkOrder", "id": "work-order-...", "schemaVersion": "0.1.0" },
  "commands": [
    "npm run typecheck",
    "npm run test",
    "npm run build",
    "rekon artifacts validate --json",
    "rekon artifacts freshness --json"
  ],
  "successCriteria": [
    "Selected findings are addressed by real implementation changes.",
    "No checks are weakened, removed, or bypassed."
  ],
  "source": "coherency-delta"
}
```

## Freshness

`VerificationPlan` freshness follows its `WorkOrder`. When the work
order is invalidated (newer `CoherencyDelta` or `ResolverPacket`), the
plan is also marked `stale` and should be regenerated alongside the
new work order.

## Runner Direction

`VerificationPlan.commands` are today consumed by
operators running commands externally and feeding
outcomes back via `rekon verify record`.

**Dry-run preview is shipped.**
`rekon verify run --plan <id> --dry-run`
(or `--preview`) parses each command into argv,
validates it against the safety contract
(rejects shell-control operators, command
substitution, env-assignment prefixes,
newlines, empty commands), and writes a
planned-but-not-run `VerificationRun`. It does
not execute anything.

**Opt-in execution is shipped.**
`rekon verify run --plan <id> --execute` runs
exactly the commands listed in
`VerificationPlan.commands` (no shell
interpolation from artifact-supplied strings),
emits execution detail into the same
`VerificationRun` shape, and writes the
artifact. The runner uses
`spawn(argv[0], argv.slice(1))` with
`shell: false`; commands that need shell
semantics must be explicitly wrapped
(`["sh", "-c", "<command>"]`) in the plan
itself.

**`VerificationResult` derivation is shipped.**
After `rekon verify run --execute`, run
`rekon verify result from-run --run <id>` to
produce a concise `VerificationResult` proof
summary citing the `VerificationRun`,
`VerificationPlan`, and (when present)
`WorkOrder`. The derivation maps `timeout` and
`killed` command statuses to `failed`, refuses
dry-run / not-run runs by default, and never
auto-resolves findings. See the
[verification runner v1 decision memo](../strategy/verification-runner-v1-decision.md)
step 6 for the safety contract.

`rekon verify record` remains available for
manually recording a `VerificationResult`
without a paired `VerificationRun`.

## Cross-References

- [VerificationResult](verification-result.md)
- [WorkOrder](work-order.md)
- [Remediation work orders concept](../concepts/remediation-work-orders.md)
- [Verification results concept](../concepts/verification-results.md)
- [Verification runner v1 decision](../strategy/verification-runner-v1-decision.md)
- [VerificationRun artifact](verification-run.md)
- [Verification runs concept](../concepts/verification-runs.md)
- [CoherencyDelta](coherency-delta.md)
- [ResolverPacket](resolver-packet.md)
- [CapabilityLintFindingBridgeReport → FindingReport writer decision](../strategy/capability-lint-finding-writer-decision.md)
  — forty-seventh slice; selects Option B (a future, opt-in
  `FindingReport` writer with dry-run preview + explicit confirmation;
  not implemented). **The writer creates no `VerificationPlan`** —
  verification plans remain downstream of governed findings and
  `CoherencyDelta`, never of capability-lint bridge candidates or their
  writer. The writer's **dry-run helper / CLI** has shipped
  (forty-eighth slice, preview only): it previews the proposed
  `FindingReport` body and creates no `VerificationPlan`; write mode is
  deferred. The dry-run **safety review** (forty-ninth slice) declared
  it **safe / stable as preview-only writer modeling**; verification
  plans stay downstream and are not created by the dry-run. The
  **writer mode decision** (fiftieth slice) selected an opt-in
  write mode behind `--confirm-finding-write` (now **shipped** in
  the fifty-first slice as the writer implementation); it creates
  no `VerificationPlan`. The **writer safety review** (fifty-second
  slice) confirmed the writer **safe / stable as a controlled,
  opt-in writer**; verification plans remain downstream. The
  **bridge-derived findings publication decision** (fifty-third
  slice) then selected **Option B** — surface the written
  bridge-derived `FindingReport` entries in the architecture summary
  and agent operating contract first; that surfacing creates no
  `VerificationPlan`, and verification plans remain downstream. See
  [bridge-derived findings publication decision](../strategy/bridge-derived-findings-publication-decision.md). The surfacing
implementation shipped in the fifty-fourth slice (read-only, in the
architecture summary + agent contract); it creates no
`VerificationPlan` and verification plans remain downstream. The surfacing was safety-reviewed safe / stable as read-only visibility in the fifty-fifth slice. The lifecycle / CoherencyDelta integration decision (fifty-sixth slice) then selected a BridgeFindingLifecycleIntegrationReport preview artifact first; lifecycle / adjudication / CoherencyDelta mutation remain deferred to later safety-reviewed slices. The preview artifact `BridgeFindingLifecycleIntegrationReport` then shipped in the fifty-seventh slice (read-only; `rekon capability lint lifecycle-preview`); see [its artifact reference](bridge-finding-lifecycle-integration-report.md). It was safety-reviewed safe / stable in the fifty-eighth slice (no blocker).

> See also: [Classic step-capability / handoff / runtime drift parity audit](../strategy/classic-step-capability-handoff-runtime-drift-parity-audit.md) — reserves StepCapabilityGraph / HandoffContract / HandoffCoverageReport / RuntimeGraphObservationReport / RuntimeGraphDriftReport as future surfaces not yet modeled by Rekon.

> See also: [StepCapabilityGraph / HandoffContract architecture decision](../strategy/step-capability-handoff-architecture-decision.md) — selects a staged step/handoff/runtime graph spine (StepCapabilityGraph → HandoffContract → HandoffCoverageReport → RuntimeGraphObservationReport → RuntimeGraphDriftReport).

> See also: [StepCapabilityGraph v1 decision](../strategy/step-capability-graph-v1-decision.md) — v1 is projection from EvidenceGraph + CapabilityMap v2 + CapabilityPhraseReport with an optional grouping/labeling config; expected workflow topology only (no runtime truth / handoff coverage / drift).

> See also: [StepCapabilityGraph artifact](step-capability-graph.md) — the first artifact in the staged step/handoff/runtime graph spine: an expected workflow topology graph projected from EvidenceGraph + CapabilityMap v2 + CapabilityPhraseReport (+ optional grouping/labeling config). Not CapabilityMap v2; no runtime coverage / drift.

> See also: [StepCapabilityGraph safety review](../strategy/step-capability-graph-safety-review.md) — declares StepCapabilityGraph v1 safe / stable as expected workflow topology (not CapabilityMap v2, not runtime truth; no handoff coverage / drift / HandoffContract / WorkOrder / VerificationPlan / intent).

> See also: [HandoffContract v1 decision](../strategy/handoff-contract-v1-decision.md) — the next spine layer: declares expected baton passes over StepCapabilityGraph step ids as a config + artifact effective contract (no handoff coverage / runtime events / drift in v1).

> See also: [HandoffContract artifact](handoff-contract.md) — the declared baton policy layer over StepCapabilityGraph step ids (config + artifact effective contract; declared / unresolved-step only; no handoff coverage / runtime events / drift in v1).

> See also: [HandoffContract safety review](../strategy/handoff-contract-safety-review.md) — declares HandoffContract v1 safe / stable as declared baton policy (not StepCapabilityGraph topology; no handoff coverage / runtime events / drift / WorkOrder / VerificationPlan / intent).

> See also: [HandoffCoverageReport v1 decision](../strategy/handoff-coverage-report-v1-decision.md) — the next spine layer: compares declared HandoffContract handoffs against an optional raw handoff event log (.rekon/handoff-events.jsonl); handoff-event coverage, not VerificationRun command success; no runtime graph observation / drift in v1.

> See also: [HandoffCoverageReport artifact](handoff-coverage-report.md) — handoff-event coverage over declared HandoffContract handoffs vs an optional raw handoff event log (.rekon/handoff-events.jsonl): missing log → not-evaluated, present-no-match → uncovered, unmatched observed → added-observed, invalid lines → parseErrors (non-fatal). Handoff-event coverage, not VerificationRun command success; no RuntimeGraphObservationReport / RuntimeGraphDriftReport / WorkOrder / VerificationPlan / intent in v1. See the [handoff coverage concept](../concepts/handoff-coverage.md).

> See also: [HandoffCoverageReport safety review](../strategy/handoff-coverage-report-safety-review.md) — declares HandoffCoverageReport v1 safe / stable as narrow handoff-event coverage (not VerificationRun command success): missing log → not-evaluated, present-no-match → uncovered, unmatched observed → added-observed, invalid lines → parseErrors (non-fatal); no RuntimeGraphObservationReport / RuntimeGraphDriftReport / WorkOrder / VerificationPlan / intent in v1. Next: RuntimeGraphObservationReport architecture / v1 decision.

> See also: [RuntimeGraphObservationReport v1 decision](../strategy/runtime-graph-observation-report-v1-decision.md) — the next spine layer: an observed runtime graph generated from raw handoff_event logs (.rekon/handoff-events.jsonl). Observed runtime graph, not declared topology; not HandoffCoverageReport; does not evaluate declared coverage, detect drift, or create WorkOrder / VerificationPlan; intent deferred. RuntimeGraphDriftReport remains the next layer after observation.

> See also: [RuntimeGraphObservationReport artifact](runtime-graph-observation-report.md) — observed runtime graph generated from raw handoff_event logs (.rekon/handoff-events.jsonl): observed step/feature/event/source nodes + handoff/emitted-by edges with observedCount + line evidence; non-handoff rows → ignoredRows, invalid lines → parseErrors, missing log → zero nodes/edges. Observed runtime graph, not declared topology; not HandoffCoverageReport; no coverage evaluation / drift / WorkOrder / VerificationPlan / intent. RuntimeGraphDriftReport remains the next layer. See the [runtime graph observation concept](../concepts/runtime-graph-observation.md).

> See also: [RuntimeGraphObservationReport safety review](../strategy/runtime-graph-observation-report-safety-review.md) — declares RuntimeGraphObservationReport v1 safe / stable as observed runtime graph: observed step/feature/event/source nodes + handoff/emitted-by edges aggregated from raw handoff_event logs; non-handoff rows → ignoredRows, invalid lines → parseErrors, missing log → zero. Observed runtime graph, not declared topology; not HandoffCoverageReport; no coverage evaluation / drift / WorkOrder / VerificationPlan / intent. Next: RuntimeGraphDriftReport architecture / v1 decision.

> See also: [RuntimeGraphDriftReport v1 decision](../strategy/runtime-graph-drift-report-v1-decision.md) — the next spine layer (final classic-parity drift): compares StepCapabilityGraph / HandoffContract / HandoffCoverageReport / RuntimeGraphObservationReport for expected-vs-observed runtime graph drift. Expected-vs-observed runtime graph drift, not runtime observation; not HandoffCoverageReport; not PathFreshnessReport or artifact lineage freshness; does not read raw handoff event logs directly; no WorkOrder / VerificationPlan; intent deferred.

> See also: [RuntimeGraphDriftReport artifact](runtime-graph-drift-report.md) — the final spine layer: expected-vs-observed runtime graph drift over StepCapabilityGraph / HandoffContract / HandoffCoverageReport / RuntimeGraphObservationReport. Drift rows in-sync / missing-expected / added-observed / uncovered-handoff / unresolved-contract / observation-missing / not-evaluated (severity-bucketed). Not runtime observation; not HandoffCoverageReport; not PathFreshnessReport or artifact lineage freshness; does not read raw handoff event logs directly; no WorkOrder / VerificationPlan; intent deferred. See the [runtime graph drift concept](../concepts/runtime-graph-drift.md).

> See also: [RuntimeGraphDriftReport safety review](../strategy/runtime-graph-drift-report-safety-review.md) — declares RuntimeGraphDriftReport v1 safe / stable as expected-vs-observed runtime graph drift (not runtime observation; not HandoffCoverageReport; not PathFreshnessReport or artifact lineage freshness): reads no raw handoff event logs, re-evaluates no coverage, creates no WorkOrder / VerificationPlan, implements no intent. The classic step/handoff/runtime-drift spine is now complete enough to unblock intent architecture work. Next: Intent Capability Spine Integration Review.

> See also: [Intent Capability Spine Integration Review](../strategy/intent-capability-spine-integration-review.md) — maps the classic intent surfaces (intent:assess / intent:prepare / intent:go / intent:status) onto the Rekon artifact spine: assess → IntentAssessmentReport, prepare → PreparedIntentPlan, status → IntentStatusReport, go deferred. Selects Option B (staged intent artifact spine); first target IntentAssessmentReport v1 decision. Classic intent did not consume the step/handoff/runtime-graph/drift spine; Rekon intent extends parity by wiring StepCapabilityGraph, HandoffContract, HandoffCoverageReport, RuntimeGraphObservationReport, and RuntimeGraphDriftReport into intent readiness. No intent implemented, no artifact registered, no CLI command, no source writes.

> See also: [IntentAssessmentReport v1 decision](../strategy/intent-assessment-report-v1-decision.md) — selects Option B: IntentAssessmentReport v1 as an artifact-backed readiness assessment generated from a user request plus existing Rekon context artifacts (CapabilityMap v2, StepCapabilityGraph, HandoffCoverageReport, RuntimeGraphDriftReport, PathFreshnessReport, VerificationResult when available). Readiness: ready-for-prepare / blocked / needs-review / insufficient-context / stale-context; blocker categories missing-artifact / stale-context / runtime-drift / handoff-coverage / finding-governance / proof-missing / scope-ambiguous / source-write-unavailable. IntentAssessmentReport is assessment, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred. RuntimeGraphDriftReport is an input to readiness, not the intent system itself. No artifact implemented or registered; no CLI; no source writes.

> See also: [IntentAssessmentReport artifact](intent-assessment-report.md) — the read-only readiness assessment of a user request against the Rekon context spine (CapabilityMap, StepCapabilityGraph, HandoffCoverageReport, RuntimeGraphDriftReport, PathFreshnessReport, VerificationResult), via `rekon intent assess`. Readiness: ready-for-prepare / blocked / needs-review / insufficient-context / stale-context. IntentAssessmentReport is assessment, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. RuntimeGraphDriftReport is an input to readiness, not the intent system itself. PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred.

> See also: [IntentAssessmentReport safety review](../strategy/intent-assessment-report-safety-review.md) — declares IntentAssessmentReport v1 safe / stable as read-only readiness assessment (no blocker): assessment, not WorkOrder; creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult; executes no commands; writes no source; RuntimeGraphDriftReport is an input to readiness, not the intent system itself; PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred. Recommended next slice: PreparedIntentPlan v1 decision.
