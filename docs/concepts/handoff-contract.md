# Handoff Contract

The **handoff contract** is Rekon's declared baton policy layer: the
expected baton passes between workflow steps, materialized as an artifact
over the current `StepCapabilityGraph`. It is the second artifact in the
staged step / handoff / runtime graph spine, after
[StepCapabilityGraph](step-capability-graph.md) and per the
[HandoffContract v1 decision](../strategy/handoff-contract-v1-decision.md).

## Why it exists

The classic codebase-intel system declared handoff contracts over
workflow features and compared them against observed runtime handoff
events. Rekon now has expected workflow topology
(`StepCapabilityGraph`), but no declared baton policy. `HandoffContract`
fills that gap: an operator declares which boundary transitions are
expected, and Rekon resolves them against the graph's step ids. This is
the prerequisite for any later coverage, runtime observation, or drift
work.

## What it is — and is not

**HandoffContract is declared baton policy.** **HandoffContract is not
StepCapabilityGraph topology** — the graph says which steps realize which
capabilities; the contract says which steps are expected to hand off to
which. v1 is policy only:

- **HandoffContract v1 does not evaluate coverage** (no comparison to
  observed events),
- **HandoffContract v1 does not read runtime events**,
- **HandoffContract v1 does not detect runtime graph drift**,
- **HandoffContract v1 does not create WorkOrder / VerificationPlan**,
- it implements no intent and infers no handoffs from the graph.

## Declared, not inferred

Handoffs are operator-declared in an optional
`.rekon/handoff-contracts.json`. **Config is optional and never
mutated** — missing config emits zero handoffs; invalid config fails
clearly. Each declared handoff references `fromStepId` / `toStepId`; if
both exist in the graph the handoff is `declared`, and if a step id is
missing it is `unresolved-step` with a diagnostic message (never dropped
or guessed). The `event` / `payload` blocks are expected-identity
metadata reserved for the future coverage layer, not observed events.

## Follow-on layers

`HandoffCoverageReport` will compare these declared handoffs to observed
events; `RuntimeGraphObservationReport` will provide the observed event
graph; `RuntimeGraphDriftReport` will compare declared/expected vs
observed. All remain deferred.

## Cross-References

- [HandoffContract artifact](../artifacts/handoff-contract.md)
- [HandoffContract v1 decision](../strategy/handoff-contract-v1-decision.md)
- [StepCapabilityGraph artifact](../artifacts/step-capability-graph.md)
- [Step capability graph concept](step-capability-graph.md)
- [Classic step-capability / handoff / runtime drift parity audit](../strategy/classic-step-capability-handoff-runtime-drift-parity-audit.md)

> See also: [HandoffContract safety review](../strategy/handoff-contract-safety-review.md) — declares HandoffContract v1 safe / stable as declared baton policy (not StepCapabilityGraph topology; no handoff coverage / runtime events / drift / WorkOrder / VerificationPlan / intent).

> See also: [HandoffCoverageReport v1 decision](../strategy/handoff-coverage-report-v1-decision.md) — the next spine layer: compares declared HandoffContract handoffs against an optional raw handoff event log (.rekon/handoff-events.jsonl); handoff-event coverage, not VerificationRun command success; no runtime graph observation / drift in v1.
