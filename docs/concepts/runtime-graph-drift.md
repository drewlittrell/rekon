# Runtime Graph Drift

Runtime graph drift answers the spine's final question: does what the system
was *expected/declared* to do match what was *observed* to run?
`RuntimeGraphDriftReport` is the artifact that answers it, by comparing the
four graph artifacts the earlier slices produced.

## Drift, Not Observation

**RuntimeGraphDriftReport is expected-vs-observed runtime graph drift, not
runtime observation.** `RuntimeGraphObservationReport` records what ran;
drift *compares* that observed graph against the expected topology
(`StepCapabilityGraph`), declared baton policy (`HandoffContract`), and
declared-vs-observed coverage (`HandoffCoverageReport`). Observation is one
input to drift, not drift itself.

## Drift, Not Coverage

**RuntimeGraphDriftReport is not HandoffCoverageReport.** Coverage already
interpreted observed events against declared `HandoffContract` policy and
emitted per-handoff verdicts. Drift consumes those coverage rows (along with
the observed runtime graph) and re-expresses them as graph-level divergence
— it does **not** re-evaluate coverage from raw events.

## Drift, Not Freshness

**RuntimeGraphDriftReport is not PathFreshnessReport or artifact lineage
freshness.** Freshness measures whether source paths or artifact lineage are
current; runtime graph drift measures whether the observed runtime topology
diverges from what was expected. They are different axes and must not be
conflated.

## What It Reads, What It Emits

The four inputs are read as already-materialized artifacts. **RuntimeGraphDriftReport
v1 does not read raw handoff event logs directly** — `RuntimeGraphObservationReport`
owns raw observation parsing. Each divergence becomes a drift row:
`in-sync` / `missing-expected` / `added-observed` / `uncovered-handoff` /
`unresolved-contract` / `observation-missing` / `not-evaluated`, with a
`low` / `medium` / `high` severity hint. When the observation artifact is
absent or empty, drift emits `observation-missing` rather than claiming
false drift; when inputs are insufficient, it emits `not-evaluated`.

## Boundaries

Drift is the top of the spine, and it stays a report:

- **RuntimeGraphDriftReport v1 does not create WorkOrder /
  VerificationPlan.**
- **Intent implementation remains deferred.**

Remediation and intent gating are downstream, separately-decided layers.

## Cross-References

- [RuntimeGraphDriftReport artifact](../artifacts/runtime-graph-drift-report.md)
- [RuntimeGraphDriftReport v1 decision](../strategy/runtime-graph-drift-report-v1-decision.md)
- [Runtime graph observation concept](runtime-graph-observation.md)
- [Handoff coverage concept](handoff-coverage.md)
- [Classic step-capability / handoff / runtime drift parity audit](../strategy/classic-step-capability-handoff-runtime-drift-parity-audit.md)
- [Roadmap](../strategy/roadmap.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
