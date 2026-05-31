# RuntimeGraphObservationReport

## Purpose

`RuntimeGraphObservationReport` is the fourth artifact in the staged step /
handoff / runtime graph spine. **RuntimeGraphObservationReport is observed
runtime graph, not declared topology.** It generates an observed runtime
graph from an optional raw handoff event log: observed `handoff_event` rows
fold into observed **nodes** (`step` / `feature` / `event` / `source`) and
**edges** (`handoff` / `emitted-by`), each carrying `observedCount` +
first/last observed timestamps + line evidence.

**RuntimeGraphObservationReport is not HandoffCoverageReport.**
`HandoffCoverageReport` interprets observed events against declared
`HandoffContract` policy and emits coverage verdicts;
`RuntimeGraphObservationReport` preserves the *raw observed graph facts*
without interpreting them against any declared artifact.

## What It Does Not Do

v1 is raw observed runtime graph only:

- **RuntimeGraphObservationReport v1 does not evaluate declared handoff
  coverage** — that belongs to `HandoffCoverageReport`.
- **RuntimeGraphObservationReport v1 does not detect runtime graph drift** —
  comparing expected vs observed belongs to a later
  `RuntimeGraphDriftReport`.
- **RuntimeGraphObservationReport v1 does not create WorkOrder /
  VerificationPlan**.
- **Intent implementation remains deferred** and it gates nothing.
- It compares against no `StepCapabilityGraph` or `HandoffContract`, and
  mutates nothing (the event log or upstream artifacts). Optional upstream
  refs are citation / context only.

## Produced By

- `@rekon/capability-model.buildRuntimeGraphObservationReport`
- the `rekon runtime graph observe` CLI command

## Inputs

- `.rekon/handoff-events.jsonl` — optional raw handoff event log of observed
  `handoff_event` lines (the only data input).
- `HandoffCoverageReport` / `HandoffContract` / `StepCapabilityGraph` —
  optional **citation / context** refs only; never read for content,
  compared, or interpreted.

`RuntimeGraphObservationReport` v1 **does not mutate** the event log or any
upstream artifact.

## Event Log Model

`.rekon/handoff-events.jsonl` is an optional JSONL file; each line is one
JSON object. **Only lines whose `kind` is `handoff_event` create observed
graph nodes / edges**; other valid JSON rows increment `ignoredRows`;
invalid JSON lines increment `parseErrors` and do not abort the report. A
**missing event log is valid** and emits zero nodes / zero edges. The input
event log is never mutated.

```json
{ "kind": "handoff_event", "name": "checkout.payment.submitted", "feature": "checkout-payment", "fromStepId": "checkout.preview", "toStepId": "payment.submit", "timestamp": "2026-05-30T00:00:00.000Z", "payloadType": "CheckoutPaymentSubmitted", "source": "runtime" }
```

## Node / Edge Model

For each observed `handoff_event` row, v1 creates/updates:

- a `step` node for `fromStepId` and for `toStepId` (when present),
- a `feature` node when `feature` exists,
- an `event` node when `name` exists,
- a `source` node when `source` exists,
- a `handoff` edge `fromStepId → toStepId` (when both exist),
- an `emitted-by` edge `event → source` (when both `name` and `source`
  exist).

Repeated observations with the same node/edge id increment `observedCount`,
extend `firstObservedAt` / `lastObservedAt`, and append a line `evidenceRef`.
Node ids are `step:<stepId>` / `feature:<feature>` / `event:<name>` /
`source:<source>`; the `handoff` edge id is `handoff:<from>:<to>` — all
slug-safe. The `observed-from` edge kind is reserved in the type for a future
revision and is not emitted in v1.

## Shape

- `source` — `eventLogPath?`, `eventLogHash?` (recorded only when a log is
  present), `handoffCoverageReportRef?`, `handoffContractRef?`,
  `stepCapabilityGraphRef?` (optional citation refs).
- `summary` — `observedNodes`, `observedEdges` (recomputed from
  `nodes`/`edges`), `handoffEvents`, `ignoredRows`, `parseErrors`.
- `nodes[]` — `{ id, kind, label, source: "handoff-event-log",
  firstObservedAt?, lastObservedAt?, observedCount, evidenceRefs }`.
- `edges[]` — `{ id, kind, fromNodeId, toNodeId, feature?, eventName?,
  payloadType?, firstObservedAt?, lastObservedAt?, observedCount,
  evidenceRefs }`.

`evidenceRefs` cite the event log by `line` (plus optional `timestamp` /
`source`), never by copying payloads.

## V1 Observation Policy

1. Read the optional `.rekon/handoff-events.jsonl`.
2. Parse JSONL line by line; invalid lines increment `parseErrors`.
3. For `handoff_event` rows, create/update observed nodes + edges and record
   `observedCount` + first/last timestamps.
4. Non-handoff JSON rows increment `ignoredRows`.
5. A missing event log emits zero nodes / zero edges.
6. Do not compare against `StepCapabilityGraph` or `HandoffContract`.
7. Do not emit drift, and create no other artifact.

## CLI Surface

```sh
rekon runtime graph observe [--root <path>] [--json]
rekon runtime graph observe [--event-log <path>] [--json]
rekon runtime graph observe [--handoff-coverage-report <ref>] [--handoff-contract <ref>] [--step-graph <ref>] [--json]
```

Reads the optional event log (default `.rekon/handoff-events.jsonl`, or an
explicit `--event-log` path), optionally cites latest/pinned upstream refs,
writes a `RuntimeGraphObservationReport` under `.rekon/artifacts/graphs/`,
and prints a summary stating that no `RuntimeGraphDriftReport`, `WorkOrder`,
or `VerificationPlan` artifacts were created.

## Boundary Summary

- **RuntimeGraphObservationReport is observed runtime graph, not declared
  topology.**
- **RuntimeGraphObservationReport is not HandoffCoverageReport.**
- RuntimeGraphObservationReport v1 does not evaluate declared handoff
  coverage.
- RuntimeGraphObservationReport v1 does not detect runtime graph drift.
- RuntimeGraphDriftReport remains the next layer after runtime observation.
- RuntimeGraphObservationReport v1 does not create WorkOrder /
  VerificationPlan.
- Intent implementation remains deferred.

## Cross-References

- [Runtime graph observation concept](../concepts/runtime-graph-observation.md)
- [RuntimeGraphObservationReport v1 decision](../strategy/runtime-graph-observation-report-v1-decision.md)
- [HandoffCoverageReport artifact](handoff-coverage-report.md)
- [Handoff coverage concept](../concepts/handoff-coverage.md)
- [HandoffContract artifact](handoff-contract.md)
- [StepCapabilityGraph artifact](step-capability-graph.md)
- [Classic step-capability / handoff / runtime drift parity audit](../strategy/classic-step-capability-handoff-runtime-drift-parity-audit.md)
- [Roadmap](../strategy/roadmap.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)

> See also: [RuntimeGraphObservationReport safety review](../strategy/runtime-graph-observation-report-safety-review.md) — declares RuntimeGraphObservationReport v1 safe / stable as observed runtime graph: observed step/feature/event/source nodes + handoff/emitted-by edges aggregated from raw handoff_event logs; non-handoff rows → ignoredRows, invalid lines → parseErrors, missing log → zero. Observed runtime graph, not declared topology; not HandoffCoverageReport; no coverage evaluation / drift / WorkOrder / VerificationPlan / intent. Next: RuntimeGraphDriftReport architecture / v1 decision.

> See also: [RuntimeGraphDriftReport v1 decision](../strategy/runtime-graph-drift-report-v1-decision.md) — the next spine layer (final classic-parity drift): compares StepCapabilityGraph / HandoffContract / HandoffCoverageReport / RuntimeGraphObservationReport for expected-vs-observed runtime graph drift. Expected-vs-observed runtime graph drift, not runtime observation; not HandoffCoverageReport; not PathFreshnessReport or artifact lineage freshness; does not read raw handoff event logs directly; no WorkOrder / VerificationPlan; intent deferred.

> See also: [RuntimeGraphDriftReport artifact](runtime-graph-drift-report.md) — the final spine layer: expected-vs-observed runtime graph drift over StepCapabilityGraph / HandoffContract / HandoffCoverageReport / RuntimeGraphObservationReport. Drift rows in-sync / missing-expected / added-observed / uncovered-handoff / unresolved-contract / observation-missing / not-evaluated (severity-bucketed). Not runtime observation; not HandoffCoverageReport; not PathFreshnessReport or artifact lineage freshness; does not read raw handoff event logs directly; no WorkOrder / VerificationPlan; intent deferred. See the [runtime graph drift concept](../concepts/runtime-graph-drift.md).

> See also: [RuntimeGraphDriftReport safety review](../strategy/runtime-graph-drift-report-safety-review.md) — declares RuntimeGraphDriftReport v1 safe / stable as expected-vs-observed runtime graph drift (not runtime observation; not HandoffCoverageReport; not PathFreshnessReport or artifact lineage freshness): reads no raw handoff event logs, re-evaluates no coverage, creates no WorkOrder / VerificationPlan, implements no intent. The classic step/handoff/runtime-drift spine is now complete enough to unblock intent architecture work. Next: Intent Capability Spine Integration Review.

> See also: [Intent Capability Spine Integration Review](../strategy/intent-capability-spine-integration-review.md) — maps the classic intent surfaces (intent:assess / intent:prepare / intent:go / intent:status) onto the Rekon artifact spine: assess → IntentAssessmentReport, prepare → PreparedIntentPlan, status → IntentStatusReport, go deferred. Selects Option B (staged intent artifact spine); first target IntentAssessmentReport v1 decision. Classic intent did not consume the step/handoff/runtime-graph/drift spine; Rekon intent extends parity by wiring StepCapabilityGraph, HandoffContract, HandoffCoverageReport, RuntimeGraphObservationReport, and RuntimeGraphDriftReport into intent readiness. No intent implemented, no artifact registered, no CLI command, no source writes.

> See also: [IntentAssessmentReport v1 decision](../strategy/intent-assessment-report-v1-decision.md) — selects Option B: IntentAssessmentReport v1 as an artifact-backed readiness assessment generated from a user request plus existing Rekon context artifacts (CapabilityMap v2, StepCapabilityGraph, HandoffCoverageReport, RuntimeGraphDriftReport, PathFreshnessReport, VerificationResult when available). Readiness: ready-for-prepare / blocked / needs-review / insufficient-context / stale-context; blocker categories missing-artifact / stale-context / runtime-drift / handoff-coverage / finding-governance / proof-missing / scope-ambiguous / source-write-unavailable. IntentAssessmentReport is assessment, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred. RuntimeGraphDriftReport is an input to readiness, not the intent system itself. No artifact implemented or registered; no CLI; no source writes.

> See also: [IntentAssessmentReport artifact](intent-assessment-report.md) — the read-only readiness assessment of a user request against the Rekon context spine (CapabilityMap, StepCapabilityGraph, HandoffCoverageReport, RuntimeGraphDriftReport, PathFreshnessReport, VerificationResult), via `rekon intent assess`. Readiness: ready-for-prepare / blocked / needs-review / insufficient-context / stale-context. IntentAssessmentReport is assessment, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. RuntimeGraphDriftReport is an input to readiness, not the intent system itself. PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred.
