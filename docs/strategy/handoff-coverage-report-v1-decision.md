# HandoffCoverageReport v1 Decision

## Decision Summary

This decision fixes the v1 model for `HandoffCoverageReport`, the third
artifact in the staged step/handoff/runtime graph spine. It follows the
[HandoffContract safety review](handoff-contract-safety-review.md) at
`32fbbb4`, which confirmed `HandoffContract` v1 is safe/stable as declared
baton policy and selected `HandoffCoverageReport` as the next layer.

**Select Option B — HandoffCoverageReport v1 as an artifact comparing
HandoffContract against an optional raw handoff event log.** It consumes
the declared `HandoffContract` and an optional
`.rekon/handoff-events.jsonl`, matches declared handoffs to observed
`handoff_event` lines (by event name, then feature, then step pair), and
emits per-handoff coverage rows with statuses `covered` / `uncovered` /
`unresolved-contract` / `added-observed` / `not-evaluated`. It needs
observed handoff events, but it does **not** wait for the generalized
runtime-graph layer.

The boundaries are pinned. **HandoffCoverageReport is handoff-event
coverage, not VerificationRun command success.** **HandoffCoverageReport
v1 does not create RuntimeGraphObservationReport.** **HandoffCoverageReport
v1 does not detect runtime graph drift.** **HandoffCoverageReport v1 does
not create WorkOrder or VerificationPlan.** **RuntimeGraphObservationReport
remains the next runtime layer after coverage.** **RuntimeGraphDriftReport
remains deferred.** **Intent implementation remains deferred.**

This is a decision-only batch; no `HandoffCoverageReport` is implemented
or registered here, and no code reads runtime event files yet.

## Why This Decision Exists

`HandoffContract` now declares expected baton passes over
`StepCapabilityGraph` step ids. Classic codebase-intel compared declared
handoff contracts against observed handoff events, producing intact /
broken coverage. Rekon needs a coverage layer that compares declared
expected handoffs with observed handoff-event evidence — and this layer
must not be confused with `VerificationRun` command success,
`RuntimeGraphDriftReport`, or intent readiness. This decision fixes that
layer's v1 shape, event-source posture, coverage policy, and status model
so the implementation slice has an unambiguous, bounded target.

## Current Boundary

- `HandoffContract` — declared baton policy (`declared` /
  `unresolved-step` rows). **Not coverage.**
- `VerificationPlan` / `VerificationRun` — proof commands + results.
  **Not handoff-event coverage.**
- `RuntimeGraphObservationReport` — (deferred) a generalized observed
  runtime graph. `HandoffCoverageReport` is narrower: it reads a handoff
  event log directly, not a full runtime graph.
- `RuntimeGraphDriftReport` — (deferred) expected-vs-observed graph drift.

`HandoffCoverageReport` slots beside these as the declared-vs-observed
handoff-event coverage layer over `HandoffContract`.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| wait for RuntimeGraphObservationReport | rejected/deferred | narrow handoff coverage can ship first |
| HandoffContract + raw event log | selected | matches classic coverage without full runtime graph |
| HandoffContract only | rejected | coverage requires observation |
| use VerificationRun as coverage | rejected | command proof is not handoff-event coverage |
| start with RuntimeGraphDriftReport | rejected | drift needs coverage/observation first |

- **Option A — defer until RuntimeGraphObservationReport.** Rejected /
  deferred: classic handoff coverage can be represented narrowly first
  using declared contracts + `handoff_event` logs.
- **Option B — HandoffContract + raw handoff event log.** Selected:
  matches classic coverage behavior without prematurely creating a full
  runtime-graph system.
- **Option C — HandoffContract only.** Rejected: coverage requires
  observation; declarations alone cannot establish it.
- **Option D — use VerificationRun results as coverage.** Rejected:
  handoff coverage is event coverage, not command proof.
- **Option E — start with RuntimeGraphDriftReport.** Rejected: drift
  requires declared contracts and observed graph coverage first.

## Recommendation

Adopt **Option B**: `HandoffCoverageReport` v1 compares `HandoffContract`
against an optional raw handoff event log. Inputs: `HandoffContract` +
optional `.rekon/handoff-events.jsonl`. Outputs: per-handoff coverage rows
(observed event references / counts) and a summary, with statuses
`covered` / `uncovered` / `unresolved-contract` / `added-observed` /
`not-evaluated`. Runtime graph observation and runtime graph drift are
**not** implemented in v1.

| Input | V1 Decision |
| --- | --- |
| HandoffContract | consumed |
| .rekon/handoff-events.jsonl | optional |
| logs/handoff-events.jsonl | deferred compatibility |
| RuntimeGraphObservationReport | deferred |
| RuntimeGraphDriftReport | deferred |
| VerificationRun | not coverage input |

## Event Input Model

Recommended raw event path: `.rekon/handoff-events.jsonl` (an alternative
compatible path, `logs/handoff-events.jsonl`, is deferred). Each line is a
JSON object:

```json
{
  "kind": "handoff_event",
  "name": "fixture.user.persist",
  "feature": "fixture-user",
  "fromStepId": "fixture.create-user",
  "toStepId": "fixture.persist-user",
  "timestamp": "2026-05-30T00:00:00.000Z",
  "payloadType": "FixtureUserPersisted",
  "source": "smoke"
}
```

Event matching policy: match by `event.name` when the
`HandoffContract.event.name` exists; else by `feature` when it exists;
else by `fromStepId` + `toStepId`; **never by title / prose**. Multiple
matching events count as `covered` with `observedCount > 1`. Invalid event
lines are counted as `parseErrors` and do not crash the report unless the
whole file is unreadable. A missing event log is valid: declared handoffs
become `not-evaluated`; a present log with no match makes a declared
handoff `uncovered`.

## Artifact Model

Sketch only; not implemented in this batch.

```ts
type HandoffCoverageStatus =
  | "covered"
  | "uncovered"
  | "unresolved-contract"
  | "added-observed"
  | "not-evaluated";

type HandoffCoverageMatchMethod =
  | "event-name"
  | "feature"
  | "step-pair"
  | "none";

type HandoffCoverageRow = {
  id: string;
  handoffId?: string;
  status: HandoffCoverageStatus;
  matchMethod: HandoffCoverageMatchMethod;
  feature?: string;
  eventName?: string;
  fromStepId?: string;
  toStepId?: string;
  observedCount: number;
  observedEventRefs?: Array<{
    line: number;
    timestamp?: string;
    source?: string;
  }>;
  messages?: string[];
};

type HandoffCoverageReport = {
  header: ArtifactHeader;
  source: {
    handoffContractRef: ArtifactRef;
    eventLogPath?: string;
    eventLogHash?: string;
  };
  summary: {
    totalDeclared: number;
    covered: number;
    uncovered: number;
    unresolvedContract: number;
    addedObserved: number;
    notEvaluated: number;
    parseErrors: number;
  };
  rows: HandoffCoverageRow[];
};
```

`observedEventRefs` cite the event log by line number (not by copying
payload); the report carries no source-file contents.

## V1 Coverage Policy

1. Read the latest or pinned `HandoffContract`.
2. Read the optional `.rekon/handoff-events.jsonl`.
3. If no event log exists, emit `not-evaluated` rows for declared
   handoffs.
4. If the event log exists, parse JSONL line by line.
5. Match declared handoffs by `event.name`, then `feature`, then step
   pair.
6. Declared handoff with a match → `covered`.
7. Declared handoff without a match → `uncovered`.
8. `HandoffContract` rows with `unresolved-step` → `unresolved-contract`.
9. Observed `handoff_event` with no declared match → `added-observed`.
10. Invalid JSON / unsupported event rows count as `parseErrors` /
    ignored rows.

| Status | Meaning |
| --- | --- |
| covered | declared handoff observed |
| uncovered | declared handoff not observed despite event log |
| unresolved-contract | handoff contract row unresolved |
| added-observed | observed event has no declared handoff |
| not-evaluated | no event log / insufficient observation input |

## Boundary Model

| Boundary | Decision |
| --- | --- |
| HandoffCoverageReport vs HandoffContract | observed coverage over declared policy |
| HandoffCoverageReport vs VerificationRun | event coverage, not command success |
| HandoffCoverageReport vs RuntimeGraphObservationReport | narrow coverage, not full runtime graph |
| HandoffCoverageReport vs RuntimeGraphDriftReport | no drift detection |
| HandoffCoverageReport vs WorkOrder / VerificationPlan | no task/proof artifact creation |
| HandoffCoverageReport vs intent | prerequisite only |

## Follow-On Artifacts

| Future Artifact | Dependency On HandoffCoverageReport |
| --- | --- |
| RuntimeGraphObservationReport | generalizes the observed handoff-event log into a runtime graph |
| RuntimeGraphDriftReport | compares declared/expected vs observed coverage + graph |
| intent:status | reports handoff coverage state |
| intent:go | may gate on uncovered / unresolved handoffs |

## Intent Impact

Intent integration is out of scope for this decision. The v1 shape is
chosen so a future `intent:status` can report handoff coverage and a
future `intent:go` can gate on `uncovered` / `unresolved-contract`
handoffs once those surfaces are designed. **Intent implementation
remains deferred**, and `HandoffCoverageReport` v1 gates nothing.

## What This Does Not Do

This decision implements no `HandoffCoverageReport`, registers no artifact
type, adds no CLI command, reads no runtime event files in code, mutates
no existing artifact (`HandoffContract` / `StepCapabilityGraph`), creates
no `RuntimeGraphObservationReport` / `RuntimeGraphDriftReport` /
`WorkOrder` / `VerificationPlan`, detects no drift, and starts no intent
implementation. It imports nothing from classic codebase-intel, bumps no
version, and publishes nothing.

## Implementation Sequence

1. **HandoffCoverageReport v1 decision** (this memo) — artifact shape +
   event-source posture + coverage policy + status model.
2. **HandoffCoverageReport v1 implementation** — register the artifact
   type and a read-only generator from `HandoffContract` + optional
   `.rekon/handoff-events.jsonl` (covered / uncovered / unresolved-contract
   / added-observed / not-evaluated; no runtime graph, no drift).
3. **RuntimeGraphObservationReport** → **RuntimeGraphDriftReport**, then
   intent spine integration.

## Cross-References

- [HandoffContract safety review](handoff-contract-safety-review.md)
- [HandoffContract v1 decision](handoff-contract-v1-decision.md)
- [StepCapabilityGraph / HandoffContract architecture decision](step-capability-handoff-architecture-decision.md)
- [Classic step-capability / handoff / runtime drift parity audit](classic-step-capability-handoff-runtime-drift-parity-audit.md)
- [HandoffContract artifact](../artifacts/handoff-contract.md)
- [Handoff contract concept](../concepts/handoff-contract.md)
- [StepCapabilityGraph artifact](../artifacts/step-capability-graph.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)

> See also: [HandoffCoverageReport artifact](../artifacts/handoff-coverage-report.md) — handoff-event coverage over declared HandoffContract handoffs vs an optional raw handoff event log (.rekon/handoff-events.jsonl): missing log → not-evaluated, present-no-match → uncovered, unmatched observed → added-observed, invalid lines → parseErrors (non-fatal). Handoff-event coverage, not VerificationRun command success; no RuntimeGraphObservationReport / RuntimeGraphDriftReport / WorkOrder / VerificationPlan / intent in v1. See the [handoff coverage concept](../concepts/handoff-coverage.md).

> See also: [HandoffCoverageReport safety review](handoff-coverage-report-safety-review.md) — declares HandoffCoverageReport v1 safe / stable as narrow handoff-event coverage (not VerificationRun command success): missing log → not-evaluated, present-no-match → uncovered, unmatched observed → added-observed, invalid lines → parseErrors (non-fatal); no RuntimeGraphObservationReport / RuntimeGraphDriftReport / WorkOrder / VerificationPlan / intent in v1. Next: RuntimeGraphObservationReport architecture / v1 decision.

> See also: [RuntimeGraphObservationReport v1 decision](runtime-graph-observation-report-v1-decision.md) — the next spine layer: an observed runtime graph generated from raw handoff_event logs (.rekon/handoff-events.jsonl). Observed runtime graph, not declared topology; not HandoffCoverageReport; does not evaluate declared coverage, detect drift, or create WorkOrder / VerificationPlan; intent deferred. RuntimeGraphDriftReport remains the next layer after observation.

> See also: [RuntimeGraphObservationReport artifact](../artifacts/runtime-graph-observation-report.md) — observed runtime graph generated from raw handoff_event logs (.rekon/handoff-events.jsonl): observed step/feature/event/source nodes + handoff/emitted-by edges with observedCount + line evidence; non-handoff rows → ignoredRows, invalid lines → parseErrors, missing log → zero nodes/edges. Observed runtime graph, not declared topology; not HandoffCoverageReport; no coverage evaluation / drift / WorkOrder / VerificationPlan / intent. RuntimeGraphDriftReport remains the next layer. See the [runtime graph observation concept](../concepts/runtime-graph-observation.md).
