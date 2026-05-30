# HandoffCoverageReport

## Purpose

`HandoffCoverageReport` is the third artifact in the staged step / handoff
/ runtime graph spine. **HandoffCoverageReport is handoff-event coverage,
not VerificationRun command success.** It compares the declared handoffs
in a `HandoffContract` against an optional raw handoff event log and
reports, per declared handoff, whether a matching observed event exists.

**It reads `HandoffContract` and optional `.rekon/handoff-events.jsonl`.**
Each declared handoff is matched to observed `handoff_event` lines by
event name, then feature, then step pair — never by title or prose — and
resolved to `covered`, `uncovered`, `unresolved-contract`,
`added-observed`, or `not-evaluated`.

## What It Does Not Do

v1 is narrow handoff-event coverage only:

- **HandoffCoverageReport v1 creates no `RuntimeGraphObservationReport` /
  `RuntimeGraphDriftReport`** — it reads a raw handoff event log directly,
  not a generalized observed runtime graph, and detects no drift.
- **HandoffCoverageReport v1 creates no `WorkOrder` / `VerificationPlan`**.
- **HandoffCoverageReport v1 includes no intent implementation** and gates
  nothing.
- It is **not** `VerificationRun` command success: a passing verification
  command is not handoff-event coverage, and observed handoff events are
  not command results.
- It mutates nothing — neither the `HandoffContract` nor the event log.

## Produced By

- `@rekon/capability-model.buildHandoffCoverageReport`
- the `rekon handoff coverage report` CLI command

## Inputs

- `HandoffContract` — supplies the declared handoffs (and their statuses)
  that coverage is measured against.
- `.rekon/handoff-events.jsonl` — optional raw handoff event log of
  observed `handoff_event` lines.

`HandoffCoverageReport` v1 **does not mutate** the `HandoffContract` or the
event log.

## Event Log Model

`.rekon/handoff-events.jsonl` is an optional JSONL file; each line is one
JSON object. **Only lines whose `kind` is `handoff_event` are considered
observed handoffs**; other valid JSON rows are ignored. Each observed
event may carry `name`, `feature`, `fromStepId`, `toStepId`, `timestamp`,
`payloadType`, and `source`.

```json
{ "kind": "handoff_event", "name": "checkout.payment.submitted", "feature": "checkout-payment", "fromStepId": "checkout.preview", "toStepId": "payment.submit", "timestamp": "2026-05-30T00:00:00.000Z", "source": "runtime" }
```

**Missing event log means not-evaluated, not uncovered.** When no event
log is present, declared handoffs become `not-evaluated` (coverage was not
measured) rather than `uncovered`. **Present log without a match means
uncovered** — a declared handoff with no matching observed event in a
present log is `uncovered`. **Invalid lines count parseErrors without
aborting the report** — a malformed JSON line increments `parseErrors`
and processing continues.

## Statuses

| Status | Meaning |
| --- | --- |
| covered | declared handoff has at least one matching observed event |
| uncovered | declared handoff has no match despite a present event log |
| unresolved-contract | the `HandoffContract` row was `unresolved-step` |
| added-observed | an observed `handoff_event` matches no declared handoff |
| not-evaluated | no event log present; coverage was not measured |

**Added observed events are unmatched observed `handoff_event` rows** — an
observed event with no declared handoff becomes an `added-observed` row;
events consumed by a declared match never also become `added-observed`.

## Shape

- `source` — `handoffContractRef`, `eventLogPath?`, `eventLogHash?` (the
  event log path/hash are recorded only when a log is present).
- `summary` — `totalDeclared`, `covered`, `uncovered`,
  `unresolvedContract`, `addedObserved`, `notEvaluated`, `parseErrors`
  (the status counts are recomputed from `rows`).
- `rows[]` — `{ id, handoffId?, status, matchMethod, feature?, eventName?,
  fromStepId?, toStepId?, observedCount, observedEventRefs?, messages? }`.
  `observedEventRefs` cite the event log by `line` (plus optional
  `timestamp` / `source`), never by copying payloads.

## V1 Coverage Policy

1. Read the latest (or pinned) `HandoffContract`.
2. Read the optional `.rekon/handoff-events.jsonl`.
3. No event log → declared handoffs become `not-evaluated`.
4. Event log present → parse JSONL line by line; invalid lines increment
   `parseErrors`.
5. Match declared handoffs by `event.name`, then `feature`, then step pair.
6. Declared handoff with a match → `covered` (`observedCount > 0`).
7. Declared handoff without a match (present log) → `uncovered`.
8. `HandoffContract` rows with `unresolved-step` → `unresolved-contract`.
9. Observed `handoff_event` with no declared match → `added-observed`.
10. The report mutates nothing and creates no other artifact.

## CLI Surface

```sh
rekon handoff coverage report [--root <path>] [--json]
rekon handoff coverage report [--handoff-contract <HandoffContract:id|type:id>] [--json]
rekon handoff coverage report [--event-log <path>] [--json]
```

Reads the latest (or pinned) `HandoffContract` + the optional event log
(default `.rekon/handoff-events.jsonl`, or an explicit `--event-log`
path), writes a `HandoffCoverageReport` under `.rekon/artifacts/actions/`,
and prints a summary stating that no `RuntimeGraphObservationReport`,
`RuntimeGraphDriftReport`, `WorkOrder`, or `VerificationPlan` artifacts
were created.

## Boundary Summary

- **HandoffCoverageReport is handoff-event coverage, not VerificationRun
  command success.**
- It reads `HandoffContract` and optional `.rekon/handoff-events.jsonl`.
- Missing event log means not-evaluated, not uncovered.
- Present log without a match means uncovered.
- Added observed events are unmatched observed `handoff_event` rows.
- Invalid lines count parseErrors without aborting the report.
- HandoffCoverageReport v1 creates no `RuntimeGraphObservationReport` /
  `RuntimeGraphDriftReport`.
- HandoffCoverageReport v1 creates no `WorkOrder` / `VerificationPlan`.
- HandoffCoverageReport v1 includes no intent implementation.

## Cross-References

- [Handoff coverage concept](../concepts/handoff-coverage.md)
- [HandoffCoverageReport v1 decision](../strategy/handoff-coverage-report-v1-decision.md)
- [HandoffContract artifact](handoff-contract.md)
- [Handoff contract concept](../concepts/handoff-contract.md)
- [StepCapabilityGraph artifact](step-capability-graph.md)
- [StepCapabilityGraph / HandoffContract architecture decision](../strategy/step-capability-handoff-architecture-decision.md)
- [Classic step-capability / handoff / runtime drift parity audit](../strategy/classic-step-capability-handoff-runtime-drift-parity-audit.md)
- [Roadmap](../strategy/roadmap.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)

> See also: [HandoffCoverageReport safety review](../strategy/handoff-coverage-report-safety-review.md) — declares HandoffCoverageReport v1 safe / stable as narrow handoff-event coverage (not VerificationRun command success): missing log → not-evaluated, present-no-match → uncovered, unmatched observed → added-observed, invalid lines → parseErrors (non-fatal); no RuntimeGraphObservationReport / RuntimeGraphDriftReport / WorkOrder / VerificationPlan / intent in v1. Next: RuntimeGraphObservationReport architecture / v1 decision.

> See also: [RuntimeGraphObservationReport v1 decision](../strategy/runtime-graph-observation-report-v1-decision.md) — the next spine layer: an observed runtime graph generated from raw handoff_event logs (.rekon/handoff-events.jsonl). Observed runtime graph, not declared topology; not HandoffCoverageReport; does not evaluate declared coverage, detect drift, or create WorkOrder / VerificationPlan; intent deferred. RuntimeGraphDriftReport remains the next layer after observation.

> See also: [RuntimeGraphObservationReport artifact](runtime-graph-observation-report.md) — observed runtime graph generated from raw handoff_event logs (.rekon/handoff-events.jsonl): observed step/feature/event/source nodes + handoff/emitted-by edges with observedCount + line evidence; non-handoff rows → ignoredRows, invalid lines → parseErrors, missing log → zero nodes/edges. Observed runtime graph, not declared topology; not HandoffCoverageReport; no coverage evaluation / drift / WorkOrder / VerificationPlan / intent. RuntimeGraphDriftReport remains the next layer. See the [runtime graph observation concept](../concepts/runtime-graph-observation.md).
