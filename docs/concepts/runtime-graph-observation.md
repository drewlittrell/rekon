# Runtime Graph Observation

Runtime graph observation answers one narrow question: from the raw
`handoff_event` evidence a system emits, what does the **observed** runtime
graph actually look like? `RuntimeGraphObservationReport` is the artifact
that records it.

## Observed Graph, Not Declared Topology

**RuntimeGraphObservationReport is observed runtime graph, not declared
topology.** `StepCapabilityGraph` is the *expected* workflow topology and
`HandoffContract` is *declared* baton policy — both are statements of
intent. `RuntimeGraphObservationReport` is the opposite axis: it records
what was *observed* to run, derived purely from a raw handoff event log. It
makes no claim about what *should* run.

## Observation, Not Coverage

**RuntimeGraphObservationReport is not HandoffCoverageReport.**
`HandoffCoverageReport` already interprets observed events against declared
`HandoffContract` policy and emits coverage verdicts (covered / uncovered /
…). Observation is deliberately upstream of that interpretation: it
preserves the raw observed nodes and edges so a later layer can compare them
against expected topology. Keeping observation raw is what lets the next
layer be honest.

- **RuntimeGraphObservationReport v1 does not evaluate declared handoff
  coverage.**
- **RuntimeGraphObservationReport v1 does not detect runtime graph drift.**

## What It Reads, What It Records

The only data input is the optional `.rekon/handoff-events.jsonl`. Only
lines whose `kind` is `handoff_event` create observed graph elements; other
JSON rows are counted as `ignoredRows`, and invalid lines are counted as
`parseErrors` without aborting the report. A missing log is valid and
records an empty graph. Each observed event folds into observed `step` /
`feature` / `event` / `source` nodes and `handoff` / `emitted-by` edges,
aggregating `observedCount` and first/last observed timestamps, and citing
the log by line.

Optional `HandoffCoverageReport` / `HandoffContract` / `StepCapabilityGraph`
refs may be recorded for **citation / context only** — they are never read
for content, compared, or interpreted.

## Boundaries

Runtime graph observation is the narrow layer before drift:

- **RuntimeGraphDriftReport remains the next layer after runtime
  observation** — drift compares expected vs observed graph and is not part
  of v1.
- **RuntimeGraphObservationReport v1 does not create WorkOrder /
  VerificationPlan.**
- **Intent implementation remains deferred.**

## Cross-References

- [RuntimeGraphObservationReport artifact](../artifacts/runtime-graph-observation-report.md)
- [RuntimeGraphObservationReport v1 decision](../strategy/runtime-graph-observation-report-v1-decision.md)
- [Handoff coverage concept](handoff-coverage.md)
- [HandoffCoverageReport artifact](../artifacts/handoff-coverage-report.md)
- [Classic step-capability / handoff / runtime drift parity audit](../strategy/classic-step-capability-handoff-runtime-drift-parity-audit.md)
- [Roadmap](../strategy/roadmap.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)

> See also: [RuntimeGraphObservationReport safety review](../strategy/runtime-graph-observation-report-safety-review.md) — declares RuntimeGraphObservationReport v1 safe / stable as observed runtime graph: observed step/feature/event/source nodes + handoff/emitted-by edges aggregated from raw handoff_event logs; non-handoff rows → ignoredRows, invalid lines → parseErrors, missing log → zero. Observed runtime graph, not declared topology; not HandoffCoverageReport; no coverage evaluation / drift / WorkOrder / VerificationPlan / intent. Next: RuntimeGraphDriftReport architecture / v1 decision.

> See also: [RuntimeGraphDriftReport v1 decision](../strategy/runtime-graph-drift-report-v1-decision.md) — the next spine layer (final classic-parity drift): compares StepCapabilityGraph / HandoffContract / HandoffCoverageReport / RuntimeGraphObservationReport for expected-vs-observed runtime graph drift. Expected-vs-observed runtime graph drift, not runtime observation; not HandoffCoverageReport; not PathFreshnessReport or artifact lineage freshness; does not read raw handoff event logs directly; no WorkOrder / VerificationPlan; intent deferred.

> See also: [RuntimeGraphDriftReport artifact](../artifacts/runtime-graph-drift-report.md) — the final spine layer: expected-vs-observed runtime graph drift over StepCapabilityGraph / HandoffContract / HandoffCoverageReport / RuntimeGraphObservationReport. Drift rows in-sync / missing-expected / added-observed / uncovered-handoff / unresolved-contract / observation-missing / not-evaluated (severity-bucketed). Not runtime observation; not HandoffCoverageReport; not PathFreshnessReport or artifact lineage freshness; does not read raw handoff event logs directly; no WorkOrder / VerificationPlan; intent deferred. See the [runtime graph drift concept](runtime-graph-drift.md).

> See also: [RuntimeGraphDriftReport safety review](../strategy/runtime-graph-drift-report-safety-review.md) — declares RuntimeGraphDriftReport v1 safe / stable as expected-vs-observed runtime graph drift (not runtime observation; not HandoffCoverageReport; not PathFreshnessReport or artifact lineage freshness): reads no raw handoff event logs, re-evaluates no coverage, creates no WorkOrder / VerificationPlan, implements no intent. The classic step/handoff/runtime-drift spine is now complete enough to unblock intent architecture work. Next: Intent Capability Spine Integration Review.
