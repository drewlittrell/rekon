# HandoffContract

## Purpose

`HandoffContract` is the second artifact in the staged step / handoff /
runtime graph spine. **HandoffContract is declared baton policy.** It
materializes the expected baton passes an operator declares in an
optional `.rekon/handoff-contracts.json`, resolved over the current
`StepCapabilityGraph`.

**HandoffContract is not StepCapabilityGraph topology.**
`StepCapabilityGraph` is the expected workflow topology;
`HandoffContract` is the declared baton policy layered over its step ids.
Each declared handoff references `fromStepId` / `toStepId` (step ids in
the graph) and is resolved to `declared` (both steps exist) or
`unresolved-step` (a referenced step id is missing).

## What It Does Not Do

v1 is declared policy only:

- **HandoffContract v1 does not evaluate coverage** — comparing declared
  handoffs to observed events belongs to a later `HandoffCoverageReport`.
- **HandoffContract v1 does not read runtime events** — runtime event
  ingestion belongs to a later `RuntimeGraphObservationReport`.
- **HandoffContract v1 does not detect runtime graph drift** — that
  belongs to a later `RuntimeGraphDriftReport`.
- **HandoffContract v1 does not create WorkOrder / VerificationPlan**.
- It does not implement intent, infers no handoffs from the graph, and
  mutates nothing.

## Produced By

- `@rekon/capability-model.buildHandoffContract`
- the `rekon handoff contract build` CLI command

## Inputs

- `StepCapabilityGraph` — supplies the step ids that handoffs reference
  (and the step evidence cited on resolved handoffs).
- `.rekon/handoff-contracts.json` — optional operator config declaring
  expected baton passes.

`HandoffContract` v1 **does not mutate** `StepCapabilityGraph` or its
config.

## Config Model

`.rekon/handoff-contracts.json` declares expected baton policy.
**Config is optional and never mutated.** Missing config is valid and
emits zero handoffs; invalid config fails clearly. The config cannot
claim coverage, cannot mark drift resolved, and cannot create runtime
events; the `event` / `payload` blocks are *expected-identity* metadata
for a future coverage layer, not observed events.

```json
{
  "version": "0.1.0",
  "handoffs": [
    {
      "id": "checkout.preview-to-payment.submit",
      "fromStepId": "checkout.preview",
      "toStepId": "payment.submit",
      "feature": "checkout-payment",
      "capability": { "verb": "submit", "noun": "payment", "domain": "checkout" },
      "event": { "name": "checkout.payment.submitted", "kind": "handoff_event" },
      "payload": { "schemaHint": "CheckoutPaymentSubmitted" }
    }
  ]
}
```

When `id` is omitted, a deterministic, slug-safe id is derived as
`handoff:<fromStepId>:<toStepId>:<feature-or-capability-or-event>`.

## Shape

- `source` — `stepCapabilityGraphRef`, `configPath?`, `configHash?`.
- `summary` — `total`, `declared`, `unresolvedStep`, `needsReview`
  (recomputed from `handoffs`).
- `handoffs[]` — `{ id, status: "declared"|"unresolved-step"|"needs-review",
  fromStepId, toStepId, feature?, capability?, event?, payload?,
  evidenceRefs, messages? }`. `unresolved-step` rows carry a diagnostic
  message; declared rows cite the resolved steps' evidence when
  available.

## V1 Resolution Policy

1. Read the latest (or pinned) `StepCapabilityGraph`.
2. Read the optional `.rekon/handoff-contracts.json`.
3. For each configured handoff, check `fromStepId` / `toStepId` exist in
   `StepCapabilityGraph.steps`.
4. Both exist → `declared`. A step id missing → `unresolved-step` with a
   message.
5. No config → a valid `HandoffContract` with zero handoffs.
6. It infers no handoffs, evaluates no coverage, and reads no runtime
   event logs.

## CLI Surface

```sh
rekon handoff contract build [--root <path>] [--json]
rekon handoff contract build [--step-graph <StepCapabilityGraph:id|type:id>] [--json]
```

Reads the latest (or pinned) `StepCapabilityGraph` + optional config,
writes a `HandoffContract` under `.rekon/artifacts/actions/`, and prints
a summary stating that no handoff coverage, runtime events, drift,
`WorkOrder`, or `VerificationPlan` artifacts were created.

## Boundary Summary

- **HandoffContract is declared baton policy.**
- **HandoffContract is not StepCapabilityGraph topology.**
- HandoffContract v1 does not evaluate coverage.
- HandoffContract v1 does not read runtime events.
- HandoffContract v1 does not detect runtime graph drift.
- HandoffContract v1 does not create WorkOrder / VerificationPlan.
- Config is optional and never mutated.

## Cross-References

- [Handoff contract concept](../concepts/handoff-contract.md)
- [HandoffContract v1 decision](../strategy/handoff-contract-v1-decision.md)
- [StepCapabilityGraph artifact](step-capability-graph.md)
- [StepCapabilityGraph / HandoffContract architecture decision](../strategy/step-capability-handoff-architecture-decision.md)
- [Classic step-capability / handoff / runtime drift parity audit](../strategy/classic-step-capability-handoff-runtime-drift-parity-audit.md)
- [Roadmap](../strategy/roadmap.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)

> See also: [HandoffContract safety review](../strategy/handoff-contract-safety-review.md) — declares HandoffContract v1 safe / stable as declared baton policy (not StepCapabilityGraph topology; no handoff coverage / runtime events / drift / WorkOrder / VerificationPlan / intent).

> See also: [HandoffCoverageReport v1 decision](../strategy/handoff-coverage-report-v1-decision.md) — the next spine layer: compares declared HandoffContract handoffs against an optional raw handoff event log (.rekon/handoff-events.jsonl); handoff-event coverage, not VerificationRun command success; no runtime graph observation / drift in v1.

> See also: [HandoffCoverageReport artifact](handoff-coverage-report.md) — handoff-event coverage over declared HandoffContract handoffs vs an optional raw handoff event log (.rekon/handoff-events.jsonl): missing log → not-evaluated, present-no-match → uncovered, unmatched observed → added-observed, invalid lines → parseErrors (non-fatal). Handoff-event coverage, not VerificationRun command success; no RuntimeGraphObservationReport / RuntimeGraphDriftReport / WorkOrder / VerificationPlan / intent in v1. See the [handoff coverage concept](../concepts/handoff-coverage.md).

> See also: [HandoffCoverageReport safety review](../strategy/handoff-coverage-report-safety-review.md) — declares HandoffCoverageReport v1 safe / stable as narrow handoff-event coverage (not VerificationRun command success): missing log → not-evaluated, present-no-match → uncovered, unmatched observed → added-observed, invalid lines → parseErrors (non-fatal); no RuntimeGraphObservationReport / RuntimeGraphDriftReport / WorkOrder / VerificationPlan / intent in v1. Next: RuntimeGraphObservationReport architecture / v1 decision.

> See also: [RuntimeGraphObservationReport v1 decision](../strategy/runtime-graph-observation-report-v1-decision.md) — the next spine layer: an observed runtime graph generated from raw handoff_event logs (.rekon/handoff-events.jsonl). Observed runtime graph, not declared topology; not HandoffCoverageReport; does not evaluate declared coverage, detect drift, or create WorkOrder / VerificationPlan; intent deferred. RuntimeGraphDriftReport remains the next layer after observation.

> See also: [RuntimeGraphObservationReport artifact](runtime-graph-observation-report.md) — observed runtime graph generated from raw handoff_event logs (.rekon/handoff-events.jsonl): observed step/feature/event/source nodes + handoff/emitted-by edges with observedCount + line evidence; non-handoff rows → ignoredRows, invalid lines → parseErrors, missing log → zero nodes/edges. Observed runtime graph, not declared topology; not HandoffCoverageReport; no coverage evaluation / drift / WorkOrder / VerificationPlan / intent. RuntimeGraphDriftReport remains the next layer. See the [runtime graph observation concept](../concepts/runtime-graph-observation.md).
