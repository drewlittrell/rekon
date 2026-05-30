# RuntimeGraphDriftReport v1 Decision

## Decision Summary

This decision fixes the v1 model for `RuntimeGraphDriftReport`, the fifth
and final artifact in the staged step / handoff / runtime graph spine. It
follows the [RuntimeGraphObservationReport safety review](runtime-graph-observation-report-safety-review.md)
at `c0c19c7`, which confirmed `RuntimeGraphObservationReport` v1 is
safe/stable as observed runtime graph and selected `RuntimeGraphDriftReport`
as the next layer.

**Select Option B — RuntimeGraphDriftReport v1 as an artifact comparing the
existing expected / declared / coverage / observed graph artifacts
(`StepCapabilityGraph`, `HandoffContract`, `HandoffCoverageReport`,
`RuntimeGraphObservationReport`).** It consumes already-materialized Rekon
artifacts and emits per-divergence drift rows — `in-sync` /
`missing-expected` / `added-observed` / `uncovered-handoff` /
`unresolved-contract` / `observation-missing` / `not-evaluated` — and a
severity-bucketed summary. It does **not** re-parse raw event logs or
re-evaluate coverage; it compares the artifacts that already own those jobs.

The boundaries are pinned. **RuntimeGraphDriftReport is expected-vs-observed
runtime graph drift, not runtime observation.** **RuntimeGraphDriftReport is
not HandoffCoverageReport.** **RuntimeGraphDriftReport is not
PathFreshnessReport or artifact lineage freshness.** **RuntimeGraphDriftReport
v1 does not read raw handoff event logs directly.**
**RuntimeGraphDriftReport v1 does not create WorkOrder or VerificationPlan.**
**Intent implementation remains deferred.**

This is a decision-only batch; no `RuntimeGraphDriftReport` is implemented
or registered here, no CLI command is added, and no code reads runtime event
files.

## Why This Decision Exists

Rekon now has expected workflow topology (`StepCapabilityGraph`), declared
baton policy (`HandoffContract`), narrow declared-vs-observed handoff
coverage (`HandoffCoverageReport`), and an observed runtime graph
(`RuntimeGraphObservationReport`). Classic codebase-intel performed runtime
graph drift detection over observed runtime truth. Rekon needs a drift layer
that compares the *expected / declared* graph surfaces against the
*observed* runtime graph surfaces — and this layer must not be confused with
path freshness, artifact lineage freshness, handoff coverage alone, or
`VerificationRun` command success. This decision fixes that layer's v1 shape,
input posture, drift model, status set, severity policy, and boundaries so
the implementation slice has an unambiguous, bounded target.

## Current Boundary

- `StepCapabilityGraph` — expected workflow topology. **Declared, not
  observed.**
- `HandoffContract` — declared baton policy. **Declared, not observed.**
- `HandoffCoverageReport` — declared-vs-observed handoff-event coverage.
  **One drift input, not the full comparison.**
- `RuntimeGraphObservationReport` — observed runtime graph. **Observation,
  not drift.** `RuntimeGraphDriftReport` is *not* `RuntimeGraphObservationReport`:
  observation records what ran; drift compares it against what was expected.
- `PathFreshnessReport` / artifact lineage freshness — source/artifact
  currency. **Not runtime topology divergence.**

`RuntimeGraphDriftReport` slots at the top of the spine as the
expected-vs-observed comparison over the four already-materialized graph
artifacts.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| defer drift | rejected/deferred | classic parity gap remains |
| compare existing graph artifacts | selected | preserves layer boundaries |
| read raw event logs directly | rejected | observation owns parsing |
| use HandoffCoverageReport alone | rejected | coverage is one input, not full drift |
| use freshness as drift | rejected | freshness is not runtime topology divergence |

- **Option A — defer `RuntimeGraphDriftReport`.** Rejected/deferred: the
  classic parity gap remains until expected-vs-observed runtime drift is
  represented.
- **Option B — compare existing graph artifacts.** Selected: compares
  `StepCapabilityGraph`, `HandoffContract`, `HandoffCoverageReport`, and
  `RuntimeGraphObservationReport`, preserving layer boundaries and avoiding
  re-reading raw events.
- **Option C — read raw handoff event logs directly.** Rejected for v1:
  `RuntimeGraphObservationReport` owns raw observation parsing; drift should
  not duplicate it.
- **Option D — use `HandoffCoverageReport` alone.** Rejected: coverage is
  one drift input, not the full expected-vs-observed graph comparison.
- **Option E — use `PathFreshnessReport` / artifact freshness as drift.**
  Rejected: freshness is source/artifact currency; runtime graph drift is
  observed runtime topology divergence.

## Recommendation

Adopt **Option B**: `RuntimeGraphDriftReport` v1 compares the four existing
graph artifacts. Inputs: `StepCapabilityGraph`, `HandoffContract`,
`HandoffCoverageReport`, `RuntimeGraphObservationReport` — read as
already-materialized artifacts, never as raw event logs. Outputs: drift rows
(missing expected runtime edges, added observed runtime edges, uncovered
declared handoffs, unresolved contract rows, observation-missing /
not-evaluated rows) and a severity-bucketed summary. Raw event parsing and
coverage evaluation are **not** duplicated in v1.

| Input | V1 Decision |
| --- | --- |
| StepCapabilityGraph | consumed |
| HandoffContract | consumed |
| HandoffCoverageReport | consumed |
| RuntimeGraphObservationReport | consumed |
| .rekon/handoff-events.jsonl | not read directly |
| PathFreshnessReport | not drift input |
| artifact freshness | not drift input |

## Input Model

The four inputs are resolved as latest-or-pinned Rekon artifacts and cited
in `source` by `ArtifactRef`; the builder reads their *materialized
content*, never a raw file. `RuntimeGraphObservationReport` supplies the
observed runtime graph (nodes/edges); `HandoffCoverageReport` supplies the
declared-vs-observed coverage rows; `HandoffContract` supplies the declared
baton policy; `StepCapabilityGraph` supplies the expected topology. **v1 may
rely primarily on `HandoffCoverageReport` statuses for declared-vs-observed
handoff drift and use `RuntimeGraphObservationReport` for observed runtime
graph context.** Raw `.rekon/handoff-events.jsonl` is **not read directly**;
`PathFreshnessReport` and artifact lineage freshness are **not** drift
inputs.

## Drift Model

Sketch only; not implemented in this batch.

```ts
type RuntimeGraphDriftStatus =
  | "in-sync"
  | "missing-expected"
  | "added-observed"
  | "uncovered-handoff"
  | "unresolved-contract"
  | "observation-missing"
  | "not-evaluated";

type RuntimeGraphDriftKind =
  | "step-edge"
  | "handoff"
  | "coverage"
  | "observation"
  | "contract";

type RuntimeGraphDriftRow = {
  id: string;
  kind: RuntimeGraphDriftKind;
  status: RuntimeGraphDriftStatus;
  severity: "low" | "medium" | "high";
  message: string;

  stepId?: string;
  fromStepId?: string;
  toStepId?: string;
  handoffId?: string;
  coverageRowId?: string;
  observedEdgeId?: string;

  expectedRef?: ArtifactRef;
  observedRef?: ArtifactRef;
  evidenceRefs: ArtifactRef[];
};

type RuntimeGraphDriftReport = {
  header: ArtifactHeader;
  source: {
    stepCapabilityGraphRef?: ArtifactRef;
    handoffContractRef?: ArtifactRef;
    handoffCoverageReportRef?: ArtifactRef;
    runtimeGraphObservationReportRef?: ArtifactRef;
  };
  summary: {
    total: number;
    inSync: number;
    missingExpected: number;
    addedObserved: number;
    uncoveredHandoff: number;
    unresolvedContract: number;
    observationMissing: number;
    notEvaluated: number;
    bySeverity: Record<string, number>;
  };
  rows: RuntimeGraphDriftRow[];
};
```

| Status | Meaning |
| --- | --- |
| in-sync | expected and observed runtime graph align |
| missing-expected | expected runtime edge absent from observation |
| added-observed | observed edge/event absent from declared expectations |
| uncovered-handoff | declared handoff not observed |
| unresolved-contract | handoff contract unresolved |
| observation-missing | observation artifact absent or empty |
| not-evaluated | insufficient inputs |

Drift rows cite the compared artifacts via `expectedRef` / `observedRef` /
`evidenceRefs`; the report copies no raw payloads.

## V1 Drift Policy

1. Read the latest (or pinned) `StepCapabilityGraph`.
2. Read the latest (or pinned) `HandoffContract`.
3. Read the latest (or pinned) `HandoffCoverageReport`.
4. Read the latest (or pinned) `RuntimeGraphObservationReport`.
5. If `RuntimeGraphObservationReport` is absent or has no observed graph,
   emit `observation-missing` / `not-evaluated` rows rather than claiming
   drift.
6. `HandoffCoverageReport` `uncovered` rows become `uncovered-handoff` drift
   rows.
7. `HandoffCoverageReport` `added-observed` rows become `added-observed`
   drift rows.
8. `HandoffCoverageReport` `unresolved-contract` rows become
   `unresolved-contract` drift rows.
9. `RuntimeGraphObservationReport` observed handoff edges not represented in
   `HandoffContract` become `added-observed` drift rows, unless already
   represented by coverage rows.
10. `HandoffContract` declared rows with no observed counterpart become
    `missing-expected` or `uncovered-handoff`, depending on the available
    coverage row.
11. Do not create `WorkOrder` / `VerificationPlan`.
12. Do not mark execution readiness.

## Severity Policy

Sketch only; finalized at implementation time.

| Status | Severity |
| --- | --- |
| missing-expected | high |
| uncovered-handoff | high |
| unresolved-contract | medium |
| added-observed | medium |
| observation-missing | low |
| not-evaluated | low |
| in-sync | low |

## Boundary Model

**RuntimeGraphDriftReport is expected-vs-observed runtime graph drift, not
runtime observation.** **RuntimeGraphDriftReport is not HandoffCoverageReport.**
**RuntimeGraphDriftReport is not PathFreshnessReport or artifact lineage
freshness.**

| Boundary | Decision |
| --- | --- |
| RuntimeGraphDriftReport vs RuntimeGraphObservationReport | drift vs observation |
| RuntimeGraphDriftReport vs HandoffCoverageReport | drift over coverage/context, not coverage itself |
| RuntimeGraphDriftReport vs PathFreshnessReport | runtime topology divergence vs working-tree freshness |
| RuntimeGraphDriftReport vs artifact freshness | runtime topology divergence vs lineage freshness |
| RuntimeGraphDriftReport vs WorkOrder / VerificationPlan | no task/proof artifact creation |
| RuntimeGraphDriftReport vs intent | prerequisite only |

**RuntimeGraphDriftReport v1 does not read raw handoff event logs
directly.** **RuntimeGraphDriftReport v1 does not create WorkOrder or
VerificationPlan.**

## Follow-On Artifacts

| Future Artifact | Dependency On RuntimeGraphDriftReport |
| --- | --- |
| intent:assess | can inspect whether runtime graph drift exists |
| intent:prepare | can require drift / coverage gates |
| intent:status | can report runtime graph drift state |
| WorkOrder (later) | could remediate high-severity drift, separately decided |

## Intent Impact

Intent integration is out of scope for this decision. The v1 shape is
chosen so a future `intent:assess` can inspect whether runtime graph drift
exists, `intent:prepare` can require drift / coverage gates, and
`intent:status` can report drift state once those surfaces are designed.
**Intent implementation remains deferred**, and `RuntimeGraphDriftReport` v1
gates nothing.

## What This Does Not Do

This decision implements no `RuntimeGraphDriftReport`, registers no artifact
type, adds no CLI command, reads no runtime event files in code, mutates no
existing artifact (`StepCapabilityGraph` / `HandoffContract` /
`HandoffCoverageReport` / `RuntimeGraphObservationReport`), creates no
`WorkOrder` / `VerificationPlan`, marks no execution readiness, treats no
`PathFreshnessReport` or artifact lineage freshness as drift, and starts no
intent implementation. It imports nothing from classic codebase-intel, bumps
no version, and publishes nothing.

## Implementation Sequence

1. **RuntimeGraphDriftReport v1 decision** (this memo) — artifact shape +
   input posture + drift model + status set + severity policy + boundaries.
2. **RuntimeGraphDriftReport v1 implementation** — register the artifact
   type and a read-only generator from `StepCapabilityGraph`,
   `HandoffContract`, `HandoffCoverageReport`, and
   `RuntimeGraphObservationReport` (drift rows + severity summary; no raw
   event parsing, no `WorkOrder` / `VerificationPlan`).
3. **RuntimeGraphDriftReport safety review**, then intent spine integration.

## Cross-References

- [RuntimeGraphObservationReport safety review](runtime-graph-observation-report-safety-review.md)
- [RuntimeGraphObservationReport v1 decision](runtime-graph-observation-report-v1-decision.md)
- [HandoffCoverageReport safety review](handoff-coverage-report-safety-review.md)
- [StepCapabilityGraph / HandoffContract architecture decision](step-capability-handoff-architecture-decision.md)
- [Classic step-capability / handoff / runtime drift parity audit](classic-step-capability-handoff-runtime-drift-parity-audit.md)
- [RuntimeGraphObservationReport artifact](../artifacts/runtime-graph-observation-report.md)
- [HandoffCoverageReport artifact](../artifacts/handoff-coverage-report.md)
- [Path freshness report artifact](../artifacts/path-freshness-report.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)
