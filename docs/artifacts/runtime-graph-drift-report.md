# RuntimeGraphDriftReport

## Purpose

`RuntimeGraphDriftReport` is the fifth and final artifact in the staged
step / handoff / runtime graph spine. **RuntimeGraphDriftReport is
expected-vs-observed runtime graph drift, not runtime observation.** It
compares the four already-materialized graph artifacts —
`StepCapabilityGraph` (expected topology), `HandoffContract` (declared baton
policy), `HandoffCoverageReport` (declared-vs-observed coverage), and
`RuntimeGraphObservationReport` (observed runtime graph) — into per-divergence
drift rows.

**RuntimeGraphDriftReport is not HandoffCoverageReport.** Coverage
interprets observed events against declared policy and emits coverage
verdicts; this artifact compares the *expected/declared* graph surfaces
against the *observed* runtime graph and reports divergence.
**RuntimeGraphDriftReport is not PathFreshnessReport or artifact lineage
freshness** — freshness is source/artifact currency, while runtime graph
drift is observed runtime topology divergence.

## What It Does Not Do

v1 compares materialized artifacts only:

- **RuntimeGraphDriftReport v1 does not read raw handoff event logs
  directly** — `RuntimeGraphObservationReport` owns raw observation parsing.
- **RuntimeGraphDriftReport v1 does not create WorkOrder /
  VerificationPlan**.
- **Intent implementation remains deferred** and it gates nothing.
- It re-evaluates no coverage, marks no execution readiness, and mutates no
  upstream artifact.

## Produced By

- `@rekon/capability-model.buildRuntimeGraphDriftReport`
- the `rekon runtime graph drift` CLI command

## Inputs

- `StepCapabilityGraph` — expected workflow topology.
- `HandoffContract` — declared baton policy.
- `HandoffCoverageReport` — declared-vs-observed coverage rows (the primary
  declared-vs-observed handoff axis).
- `RuntimeGraphObservationReport` — observed runtime graph (nodes/edges).

All four are read as already-materialized Rekon artifacts (latest or
pinned). v1 **does not read** `.rekon/handoff-events.jsonl`; it never parses
raw runtime event files; it mutates nothing.

## Drift Model

| Status | Meaning |
| --- | --- |
| in-sync | expected and observed runtime graph align |
| missing-expected | expected runtime edge absent from observation |
| added-observed | observed edge/event absent from declared expectations |
| uncovered-handoff | declared handoff not observed |
| unresolved-contract | handoff contract unresolved |
| observation-missing | observation artifact absent or empty |
| not-evaluated | insufficient inputs |

Each `RuntimeGraphDriftRow` carries `id`, `kind`
(`step-edge`/`handoff`/`coverage`/`observation`/`contract`), `status`,
`severity` (`low`/`medium`/`high`), `message`, optional `stepId` /
`fromStepId` / `toStepId` / `handoffId` / `coverageRowId` / `observedEdgeId`,
optional `expectedRef` / `observedRef`, and `evidenceRefs` citing the
compared artifacts (no raw payloads are copied).

## V1 Drift Policy

1. If `RuntimeGraphObservationReport` is absent or has no observed graph,
   emit `observation-missing` rows rather than false drift.
2. `HandoffCoverageReport` `covered` → `in-sync`; `uncovered` →
   `uncovered-handoff`; `unresolved-contract` → `unresolved-contract`;
   `added-observed` → `added-observed`; `not-evaluated` → `not-evaluated`.
3. Observed `handoff` edges not represented in `HandoffContract` and not
   already represented by a coverage `added-observed` row → `added-observed`.
4. Declared `HandoffContract` handoffs with no coverage row (observation
   present) → `missing-expected`.
5. Missing inputs emit `not-evaluated` / `observation-missing` rows rather
   than crashing.

## Severity Policy

| Status | Severity |
| --- | --- |
| missing-expected | high |
| uncovered-handoff | high |
| unresolved-contract | medium |
| added-observed | medium |
| observation-missing | low |
| not-evaluated | low |
| in-sync | low |

## Shape

- `source` — `stepCapabilityGraphRef?`, `handoffContractRef?`,
  `handoffCoverageReportRef?`, `runtimeGraphObservationReportRef?` (no raw
  event-log path).
- `summary` — `total`, `inSync`, `missingExpected`, `addedObserved`,
  `uncoveredHandoff`, `unresolvedContract`, `observationMissing`,
  `notEvaluated`, `bySeverity` (all recomputed from `rows`).
- `rows[]` — the drift rows above, sorted by `(kind, status, id)`.

## CLI Surface

```sh
rekon runtime graph drift [--root <path>] [--json]
rekon runtime graph drift [--step-graph <ref>] [--handoff-contract <ref>] [--handoff-coverage-report <ref>] [--runtime-observation-report <ref>] [--json]
```

Reads the latest (or pinned) `StepCapabilityGraph`, `HandoffContract`,
`HandoffCoverageReport`, and `RuntimeGraphObservationReport`, writes a
`RuntimeGraphDriftReport` under `.rekon/artifacts/actions/`, and prints a
summary stating that no `WorkOrder` or `VerificationPlan` artifacts were
created.

## Boundary Summary

- **RuntimeGraphDriftReport is expected-vs-observed runtime graph drift, not
  runtime observation.**
- **RuntimeGraphDriftReport is not HandoffCoverageReport.**
- **RuntimeGraphDriftReport is not PathFreshnessReport or artifact lineage
  freshness.**
- RuntimeGraphDriftReport v1 does not read raw handoff event logs directly.
- RuntimeGraphDriftReport v1 does not create WorkOrder / VerificationPlan.
- Intent implementation remains deferred.

## Cross-References

- [Runtime graph drift concept](../concepts/runtime-graph-drift.md)
- [RuntimeGraphDriftReport v1 decision](../strategy/runtime-graph-drift-report-v1-decision.md)
- [RuntimeGraphObservationReport artifact](runtime-graph-observation-report.md)
- [HandoffCoverageReport artifact](handoff-coverage-report.md)
- [HandoffContract artifact](handoff-contract.md)
- [StepCapabilityGraph artifact](step-capability-graph.md)
- [Path freshness report artifact](path-freshness-report.md)
- [Classic step-capability / handoff / runtime drift parity audit](../strategy/classic-step-capability-handoff-runtime-drift-parity-audit.md)
- [Roadmap](../strategy/roadmap.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
