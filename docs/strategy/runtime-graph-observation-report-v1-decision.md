# RuntimeGraphObservationReport v1 Decision

## Decision Summary

This decision fixes the v1 model for `RuntimeGraphObservationReport`, the
fourth artifact in the staged step / handoff / runtime graph spine. It
follows the [HandoffCoverageReport safety review](handoff-coverage-report-safety-review.md)
at `e5db6d6`, which confirmed `HandoffCoverageReport` v1 is safe/stable as
narrow handoff-event coverage and selected `RuntimeGraphObservationReport`
as the next runtime layer.

**Select Option B — RuntimeGraphObservationReport v1 as an observed runtime
graph artifact generated from raw `handoff_event` logs.** It consumes the
same optional `.rekon/handoff-events.jsonl` that `HandoffCoverageReport`
already understands, folds the observed `handoff_event` rows into observed
runtime **nodes** (steps, features, events, sources) and **edges**
(handoffs), and records observed counts + first/last timestamps + line
evidence — without interpreting those observations against declared policy.

The boundaries are pinned. **RuntimeGraphObservationReport is observed
runtime graph, not declared topology.** **RuntimeGraphObservationReport is
not HandoffCoverageReport.** **RuntimeGraphObservationReport v1 does not
evaluate declared handoff coverage.** **RuntimeGraphObservationReport v1
does not detect runtime graph drift.** **RuntimeGraphDriftReport remains
the next layer after runtime observation.**
**RuntimeGraphObservationReport v1 does not create WorkOrder or
VerificationPlan.** **Intent implementation remains deferred.**

This is a decision-only batch; no `RuntimeGraphObservationReport` is
implemented or registered here, no CLI command is added, and no code reads
runtime event files yet.

## Why This Decision Exists

Rekon now has declared step topology (`StepCapabilityGraph`), declared
handoff policy (`HandoffContract`), and narrow declared-vs-observed
handoff-event coverage (`HandoffCoverageReport`). Classic codebase-intel
maintained an **observed runtime truth graph** built from baton / handoff
events, and used it as the base for runtime drift detection. Rekon needs a
generalized **runtime observation** artifact that records the observed
graph shape before it can compare expected vs observed (drift). This
observation layer must not be confused with coverage (which interprets
observations against declared policy) or with drift (which compares two
graphs). This decision fixes that layer's v1 shape, event-source posture,
node/edge model, and observation policy so the implementation slice has an
unambiguous, bounded target.

## Current Boundary

- `StepCapabilityGraph` — expected workflow topology. **Declared, not
  observed.**
- `HandoffContract` — declared baton policy. **Declared, not observed.**
- `HandoffCoverageReport` — declared-vs-observed handoff-event coverage.
  **Interpreted against declared policy**, with coverage statuses.
  `RuntimeGraphObservationReport` is **not HandoffCoverageReport**: it
  preserves raw observed graph facts rather than coverage verdicts.
- `RuntimeGraphDriftReport` — (deferred) expected-vs-observed graph drift.

`RuntimeGraphObservationReport` slots beside these as the observed runtime
graph layer: raw observed nodes/edges derived from the handoff event log,
not interpreted against any declared artifact.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| defer observation until drift | rejected | drift needs observed graph |
| raw handoff_event log to observed graph | selected | narrow runtime graph first |
| derive from HandoffCoverageReport | rejected/deferred | coverage is interpreted data |
| expected graph to observation | rejected | expected graph is not observation |
| full runtime tracing now | rejected/deferred | too much blast radius |

- **Option A — defer until RuntimeGraphDriftReport.** Rejected: drift needs
  a stable observed graph artifact to compare against expected topology;
  letting drift read raw events directly would entangle observation and
  comparison.
- **Option B — raw `handoff_event` log → observed runtime graph.**
  Selected: builds a generalized observed graph without requiring full
  tracing infrastructure, reusing the event log model
  `HandoffCoverageReport` already understands.
- **Option C — derive from `HandoffCoverageReport`.** Rejected/deferred:
  coverage rows are already interpreted against declared policy;
  observation should preserve raw observed graph facts.
- **Option D — `StepCapabilityGraph` + `HandoffContract` → observation.**
  Rejected: the expected graph and declared policy are not observation.
- **Option E — full runtime tracing system now.** Rejected/deferred: a
  broad runtime trace collector / watcher is too much blast radius; v1
  should reuse the existing `handoff_event` log model.

## Recommendation

Adopt **Option B**: `RuntimeGraphObservationReport` v1 records an observed
runtime graph generated from raw `handoff_event` logs. Default data input:
`.rekon/handoff-events.jsonl`. Optional citation/context inputs:
`HandoffCoverageReport`, `HandoffContract`, `StepCapabilityGraph` — cited
in `source`, never used to interpret or enrich the observed graph. Outputs:
observed nodes, observed edges, observed `handoff_event` count, ignored-row
count, `parseErrors`, event-source metadata, and a summary. Runtime graph
drift is **not** implemented in v1.

| Input | V1 Decision |
| --- | --- |
| .rekon/handoff-events.jsonl | consumed |
| HandoffCoverageReport | optional citation/context |
| HandoffContract | optional citation/context |
| StepCapabilityGraph | optional citation/context |
| RuntimeGraphDriftReport | deferred |
| VerificationRun | not observation input |

## Event Input Model

Recommended default data path: `.rekon/handoff-events.jsonl` — the same raw
handoff event log `HandoffCoverageReport` reads. Each line is a JSON
object:

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

Rules:

- Only `kind === "handoff_event"` rows create observed runtime edges in v1.
- Non-handoff JSON rows are ignored and counted (`ignoredRows`).
- Invalid JSON lines increment `parseErrors` and do not abort the report.
- A missing event log is valid and emits zero observed nodes / edges with a
  not-evaluated-style source marker (no error).
- The input event log is **never mutated**.

## Artifact Model

Sketch only; not implemented in this batch.

```ts
type RuntimeGraphObservationNodeKind =
  | "step"
  | "feature"
  | "event"
  | "source";

type RuntimeGraphObservationEdgeKind =
  | "handoff"
  | "emitted-by"
  | "observed-from";

type RuntimeGraphObservationNode = {
  id: string;
  kind: RuntimeGraphObservationNodeKind;
  label: string;
  source: "handoff-event-log";
  firstObservedAt?: string;
  lastObservedAt?: string;
  observedCount: number;
  evidenceRefs: Array<{ line: number; timestamp?: string; source?: string }>;
};

type RuntimeGraphObservationEdge = {
  id: string;
  kind: RuntimeGraphObservationEdgeKind;
  fromNodeId: string;
  toNodeId: string;
  feature?: string;
  eventName?: string;
  payloadType?: string;
  firstObservedAt?: string;
  lastObservedAt?: string;
  observedCount: number;
  evidenceRefs: Array<{ line: number; timestamp?: string; source?: string }>;
};

type RuntimeGraphObservationReport = {
  header: ArtifactHeader;
  source: {
    eventLogPath?: string;
    eventLogHash?: string;
    handoffCoverageReportRef?: ArtifactRef;
    handoffContractRef?: ArtifactRef;
    stepCapabilityGraphRef?: ArtifactRef;
  };
  summary: {
    observedNodes: number;
    observedEdges: number;
    handoffEvents: number;
    ignoredRows: number;
    parseErrors: number;
  };
  nodes: RuntimeGraphObservationNode[];
  edges: RuntimeGraphObservationEdge[];
};
```

`evidenceRefs` cite the event log by line number (not by copying payload);
the report carries no source-file contents. Citation refs in `source` are
optional and used for context only.

## V1 Observation Policy

1. Read the optional `.rekon/handoff-events.jsonl`.
2. Parse JSONL line by line.
3. For `handoff_event` rows:
   - create/update observed `step` nodes from `fromStepId` and `toStepId`;
   - create/update a `feature` node when `feature` exists;
   - create/update an `event` node when `name` exists;
   - create/update a `handoff` edge from `fromStepId` to `toStepId`;
   - record `observedCount` and first/last timestamps.
4. Ignore non-handoff JSON rows and increment `ignoredRows`.
5. Invalid JSON lines increment `parseErrors`.
6. A missing event log emits zero nodes/edges and no error.
7. Do **not** compare against `StepCapabilityGraph`.
8. Do **not** compare against `HandoffContract`.
9. Do **not** emit drift.

## Boundary Model

**RuntimeGraphObservationReport is observed runtime graph, not declared
topology.** **RuntimeGraphObservationReport is not HandoffCoverageReport.**
**RuntimeGraphObservationReport v1 does not evaluate declared handoff
coverage.** **RuntimeGraphObservationReport v1 does not detect runtime
graph drift.** **RuntimeGraphDriftReport remains the next layer after
runtime observation.**

| Boundary | Decision |
| --- | --- |
| RuntimeGraphObservationReport vs StepCapabilityGraph | observed runtime graph vs expected topology |
| RuntimeGraphObservationReport vs HandoffContract | observed runtime graph vs declared policy |
| RuntimeGraphObservationReport vs HandoffCoverageReport | observed graph vs coverage evaluation |
| RuntimeGraphObservationReport vs RuntimeGraphDriftReport | no drift detection |
| RuntimeGraphObservationReport vs WorkOrder / VerificationPlan | no task/proof artifact creation |
| RuntimeGraphObservationReport vs intent | prerequisite only |

**RuntimeGraphObservationReport v1 does not create WorkOrder or
VerificationPlan.**

## Follow-On Artifacts

| Future Artifact | Dependency On RuntimeGraphObservationReport |
| --- | --- |
| RuntimeGraphDriftReport | compares expected vs observed graph |
| intent:assess | can inspect whether runtime observation exists |
| intent:prepare | can require handoff/drift gates |
| intent:status | can report observed runtime graph freshness |

## Intent Impact

Intent integration is out of scope for this decision. The v1 shape is
chosen so a future `intent:assess` can inspect whether a runtime
observation exists, `intent:prepare` can require handoff/drift gates, and
`intent:status` can report observed runtime graph freshness once those
surfaces are designed. **Intent implementation remains deferred**, and
`RuntimeGraphObservationReport` v1 gates nothing.

## What This Does Not Do

This decision implements no `RuntimeGraphObservationReport`, registers no
artifact type, adds no CLI command, reads no runtime event files in code,
mutates no existing artifact (`HandoffCoverageReport` / `HandoffContract` /
`StepCapabilityGraph` / the event log), creates no `RuntimeGraphDriftReport`
/ `WorkOrder` / `VerificationPlan`, detects no drift, and starts no intent
implementation. It imports nothing from classic codebase-intel, bumps no
version, and publishes nothing.

## Implementation Sequence

1. **RuntimeGraphObservationReport v1 decision** (this memo) — artifact
   shape + event-source posture + node/edge model + observation policy.
2. **RuntimeGraphObservationReport v1 implementation** — register the
   artifact type and a read-only generator from optional
   `.rekon/handoff-events.jsonl` (observed nodes/edges + ignoredRows +
   parseErrors; no coverage, no drift).
3. **RuntimeGraphDriftReport** (compares expected vs observed graph), then
   intent spine integration.

## Cross-References

- [HandoffCoverageReport safety review](handoff-coverage-report-safety-review.md)
- [HandoffCoverageReport v1 decision](handoff-coverage-report-v1-decision.md)
- [HandoffContract safety review](handoff-contract-safety-review.md)
- [StepCapabilityGraph / HandoffContract architecture decision](step-capability-handoff-architecture-decision.md)
- [Classic step-capability / handoff / runtime drift parity audit](classic-step-capability-handoff-runtime-drift-parity-audit.md)
- [HandoffCoverageReport artifact](../artifacts/handoff-coverage-report.md)
- [Handoff coverage concept](../concepts/handoff-coverage.md)
- [HandoffContract artifact](../artifacts/handoff-contract.md)
- [StepCapabilityGraph artifact](../artifacts/step-capability-graph.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)

> See also: [RuntimeGraphObservationReport artifact](../artifacts/runtime-graph-observation-report.md) — observed runtime graph generated from raw handoff_event logs (.rekon/handoff-events.jsonl): observed step/feature/event/source nodes + handoff/emitted-by edges with observedCount + line evidence; non-handoff rows → ignoredRows, invalid lines → parseErrors, missing log → zero nodes/edges. Observed runtime graph, not declared topology; not HandoffCoverageReport; no coverage evaluation / drift / WorkOrder / VerificationPlan / intent. RuntimeGraphDriftReport remains the next layer. See the [runtime graph observation concept](../concepts/runtime-graph-observation.md).

> See also: [RuntimeGraphObservationReport safety review](runtime-graph-observation-report-safety-review.md) — declares RuntimeGraphObservationReport v1 safe / stable as observed runtime graph: observed step/feature/event/source nodes + handoff/emitted-by edges aggregated from raw handoff_event logs; non-handoff rows → ignoredRows, invalid lines → parseErrors, missing log → zero. Observed runtime graph, not declared topology; not HandoffCoverageReport; no coverage evaluation / drift / WorkOrder / VerificationPlan / intent. Next: RuntimeGraphDriftReport architecture / v1 decision.

> See also: [RuntimeGraphDriftReport v1 decision](runtime-graph-drift-report-v1-decision.md) — the next spine layer (final classic-parity drift): compares StepCapabilityGraph / HandoffContract / HandoffCoverageReport / RuntimeGraphObservationReport for expected-vs-observed runtime graph drift. Expected-vs-observed runtime graph drift, not runtime observation; not HandoffCoverageReport; not PathFreshnessReport or artifact lineage freshness; does not read raw handoff event logs directly; no WorkOrder / VerificationPlan; intent deferred.

> See also: [RuntimeGraphDriftReport artifact](../artifacts/runtime-graph-drift-report.md) — the final spine layer: expected-vs-observed runtime graph drift over StepCapabilityGraph / HandoffContract / HandoffCoverageReport / RuntimeGraphObservationReport. Drift rows in-sync / missing-expected / added-observed / uncovered-handoff / unresolved-contract / observation-missing / not-evaluated (severity-bucketed). Not runtime observation; not HandoffCoverageReport; not PathFreshnessReport or artifact lineage freshness; does not read raw handoff event logs directly; no WorkOrder / VerificationPlan; intent deferred. See the [runtime graph drift concept](../concepts/runtime-graph-drift.md).
