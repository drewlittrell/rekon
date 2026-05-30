# Step Capability Graph

The **step capability graph** is Rekon's expected workflow topology
layer: a graph of workflow/step nodes linked to the capabilities, files,
and systems they realize. It is the first artifact in the staged step /
handoff / runtime graph spine selected by the
[architecture decision](../strategy/step-capability-handoff-architecture-decision.md),
and its v1 shape is fixed by the
[v1 decision](../strategy/step-capability-graph-v1-decision.md).

## Why it exists

Rekon's `CapabilityMap` projects *what* capabilities exist and *where*.
It does not model *which steps/workflows* realize them, through which
files and systems, or where they hand off. The classic codebase-intel
system had a step-capability graph for exactly this; the
[parity audit](../strategy/classic-step-capability-handoff-runtime-drift-parity-audit.md)
found Rekon had no equivalent. `StepCapabilityGraph` fills that gap as
the expected-topology foundation that later handoff and runtime-drift
layers build on.

## What it is — and is not

**StepCapabilityGraph v1 is expected workflow topology.** It is a static
projection: which steps realize which capabilities, in which files and
systems. It is **not CapabilityMap v2** (capability projection), and it
makes no runtime claims:

- it **does not model runtime handoff coverage**,
- it **does not detect runtime graph drift**,
- it **does not create HandoffContract**,
- it **does not create WorkOrder / VerificationPlan**,
- it **does not implement intent**.

`handoffPlaceholders` is reserved (empty in v1) for the later
`HandoffContract` layer; runtime grounding is reserved for the later
`RuntimeGraphObservationReport`.

## Projection-first, optional config

v1 is **projection-first**: it derives steps and edges from
`EvidenceGraph` + `CapabilityMap v2` + `CapabilityPhraseReport`. An
operator may add an optional `.rekon/step-capability-map.json`, but
**optional config is grouping/labeling only** — it groups, relabels, or
merges projected steps. It is never the only source of truth and is
never mutated. Projection works with no config at all, so the graph
never becomes a hand-maintained admin burden.

## How steps are assigned

Configured steps come from the config; derived steps come from grouping
phrase-backed capabilities by domain. A capability attaches to a
configured step by a deterministic match order: capability (verb+noun,
optional domain) > path prefix > system > config order > id ascending. A
configured step that absorbs a non-declared capability becomes `mixed`;
a capability that matches no configured step and has no domain is
recorded as an `unresolvedCapability` rather than force-fit.

## Cross-References

- [StepCapabilityGraph artifact](../artifacts/step-capability-graph.md)
- [StepCapabilityGraph v1 decision](../strategy/step-capability-graph-v1-decision.md)
- [StepCapabilityGraph / HandoffContract architecture decision](../strategy/step-capability-handoff-architecture-decision.md)
- [Classic step-capability / handoff / runtime drift parity audit](../strategy/classic-step-capability-handoff-runtime-drift-parity-audit.md)
- [CapabilityMap artifact](../artifacts/capability-map.md)
- [CapabilityPhraseReport artifact](../artifacts/capability-phrase-report.md)

> See also: [StepCapabilityGraph safety review](../strategy/step-capability-graph-safety-review.md) — declares StepCapabilityGraph v1 safe / stable as expected workflow topology (not CapabilityMap v2, not runtime truth; no handoff coverage / drift / HandoffContract / WorkOrder / VerificationPlan / intent).

> See also: [HandoffContract v1 decision](../strategy/handoff-contract-v1-decision.md) — the next spine layer: declares expected baton passes over StepCapabilityGraph step ids as a config + artifact effective contract (no handoff coverage / runtime events / drift in v1).

> See also: [HandoffContract artifact](../artifacts/handoff-contract.md) — the declared baton policy layer over StepCapabilityGraph step ids (config + artifact effective contract; declared / unresolved-step only; no handoff coverage / runtime events / drift in v1).

> See also: [HandoffContract safety review](../strategy/handoff-contract-safety-review.md) — declares HandoffContract v1 safe / stable as declared baton policy (not StepCapabilityGraph topology; no handoff coverage / runtime events / drift / WorkOrder / VerificationPlan / intent).

> See also: [HandoffCoverageReport v1 decision](../strategy/handoff-coverage-report-v1-decision.md) — the next spine layer: compares declared HandoffContract handoffs against an optional raw handoff event log (.rekon/handoff-events.jsonl); handoff-event coverage, not VerificationRun command success; no runtime graph observation / drift in v1.

> See also: [HandoffCoverageReport artifact](../artifacts/handoff-coverage-report.md) — handoff-event coverage over declared HandoffContract handoffs vs an optional raw handoff event log (.rekon/handoff-events.jsonl): missing log → not-evaluated, present-no-match → uncovered, unmatched observed → added-observed, invalid lines → parseErrors (non-fatal). Handoff-event coverage, not VerificationRun command success; no RuntimeGraphObservationReport / RuntimeGraphDriftReport / WorkOrder / VerificationPlan / intent in v1. See the [handoff coverage concept](handoff-coverage.md).

> See also: [HandoffCoverageReport safety review](../strategy/handoff-coverage-report-safety-review.md) — declares HandoffCoverageReport v1 safe / stable as narrow handoff-event coverage (not VerificationRun command success): missing log → not-evaluated, present-no-match → uncovered, unmatched observed → added-observed, invalid lines → parseErrors (non-fatal); no RuntimeGraphObservationReport / RuntimeGraphDriftReport / WorkOrder / VerificationPlan / intent in v1. Next: RuntimeGraphObservationReport architecture / v1 decision.
