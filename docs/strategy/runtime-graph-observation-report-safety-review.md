# RuntimeGraphObservationReport Safety Review

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

## Decision Summary

`RuntimeGraphObservationReport` v1 (shipped at `2c4ee04`) is **safe /
stable as an observed runtime graph artifact**. It generates an observed
runtime graph from an optional raw handoff event log
(`.rekon/handoff-events.jsonl`): observed `handoff_event` rows fold into
observed nodes (`step` / `feature` / `event` / `source`) and edges
(`handoff` / `emitted-by`), each carrying `observedCount` + first/last
observed timestamps + line evidence — and nothing more.

**RuntimeGraphObservationReport is observed runtime graph, not declared
topology.** **RuntimeGraphObservationReport is not HandoffCoverageReport.**
The artifact creates no other artifacts and overclaims no interpretation:
**RuntimeGraphObservationReport v1 does not evaluate declared handoff
coverage.** **RuntimeGraphObservationReport v1 does not detect runtime
graph drift.** **RuntimeGraphObservationReport v1 does not create WorkOrder
or VerificationPlan.** **Intent implementation remains deferred.**

This review finds **no blocker**. **RuntimeGraphDriftReport remains the
next layer after runtime observation**, and the recommended next slice is
the **RuntimeGraphDriftReport architecture / v1 decision**: the observed
runtime graph now exists, so the next layer should decide how expected
topology / declared contracts / coverage / observed runtime graph are
compared for drift.

| Surface | Status | Boundary |
| --- | --- | --- |
| RuntimeGraphObservationReport artifact | shipped | observed runtime graph |
| runtime graph observe CLI | shipped | writes observation report only |
| .rekon/handoff-events.jsonl | optional | raw event input |
| RuntimeGraphDriftReport | deferred | not created by observation |

## Why This Review Exists

`RuntimeGraphObservationReport` is Rekon's first observed runtime graph
artifact: the first artifact that records runtime graph *facts* (rather
than declared intent or coverage verdicts) from `handoff_event` evidence.
It sits between narrow handoff coverage and future runtime drift. Before
`RuntimeGraphDriftReport` is designed, Rekon must confirm that observation
remains *raw observation* and does not silently become coverage, drift,
remediation, or intent — otherwise drift would inherit a contaminated base.

## Artifact And CLI Reviewed

Grounded by re-reading the shipped slice-71 implementation:

- **Type shape** (`@rekon/kernel-repo-model`):
  `RuntimeGraphObservationReport` carries `source` (`eventLogPath?`,
  `eventLogHash?`, `handoffCoverageReportRef?`, `handoffContractRef?`,
  `stepCapabilityGraphRef?`), a `summary` (`observedNodes`, `observedEdges`,
  `handoffEvents`, `ignoredRows`, `parseErrors`), `nodes[]` (id, kind,
  label, `source: "handoff-event-log"`, first/last observed timestamps,
  observedCount, evidenceRefs), and `edges[]` (id, kind, fromNodeId,
  toNodeId, feature?, eventName?, payloadType?, first/last observed
  timestamps, observedCount, evidenceRefs).
- **Factory** `createRuntimeGraphObservationReport`: dedupes nodes/edges by
  id; sorts nodes by `(kind, id)` and edges by `(kind, fromNodeId,
  toNodeId, id)`; recomputes `observedNodes` / `observedEdges` from
  `nodes`/`edges`; and asserts. A caller cannot persist a stale node/edge
  count.
- **Validator / assert / schema** `validateRuntimeGraphObservationReport`
  validates the header, the optional `source` refs (each via
  `validateArtifactRef`), each node (id uniqueness; kind enum; non-empty
  label; `source === "handoff-event-log"`; **positive** observedCount;
  evidenceRef shapes), each edge (id uniqueness; kind enum; non-empty
  from/to; **positive** observedCount; evidenceRef shapes), and
  **re-derives `observedNodes` / `observedEdges`, rejecting any artifact
  whose summary does not match its nodes/edges**. `handoffEvents` /
  `ignoredRows` / `parseErrors` are type-checked but trusted, because they
  are observed during parsing and are not recomputable from nodes/edges.
- **Helper** `buildRuntimeGraphObservationReport` reads the optional event
  log *content* (never a file), folds rows into observed nodes/edges, and
  mutates nothing. It **reads no files**, makes no network calls, and reads
  no upstream artifact contents.
- **Parser** `parseRuntimeGraphObservationEventLog` splits the raw JSONL
  string, skips blank lines, and parses each line; only rows whose `kind`
  is `handoff_event` become events; other valid JSON rows increment
  `ignoredRows`; invalid JSON increments `parseErrors` and continues.
- **CLI** `rekon runtime graph observe [--root] [--json] [--event-log
  <path>] [--handoff-coverage-report <ref>] [--handoff-contract <ref>]
  [--step-graph <ref>]` reads the optional event log (default
  `.rekon/handoff-events.jsonl` or an explicit `--event-log`), optionally
  cites upstream refs, writes one `RuntimeGraphObservationReport` under
  `.rekon/artifacts/graphs/`, and prints "No RuntimeGraphDriftReport,
  WorkOrder, or VerificationPlan artifacts were created."

## Event Input Review

`.rekon/handoff-events.jsonl` is optional and is **operator/runtime-owned
raw input, never mutated**: the CLI reads it, hashes it (sha256) for
citation, and writes only the observation report. Only lines whose `kind`
is `handoff_event` create observed graph elements; **other valid JSON rows
increment `ignoredRows`** (never silently dropped); invalid JSON increments
`parseErrors` and never aborts. The builder itself reads no files — the CLI
reads the optional log and passes its content + hash in — so the artifact
cannot read arbitrary runtime files, and a missing log is a normal, valid
state. `evidenceRefs` cite the log by line number, not by copying payloads,
so the report carries no source-file contents. Optional upstream refs are
recorded for citation/context only and are never read or interpreted.

## Observation Model Review

Observation is deterministic and conservative.

| Event Case | V1 Behavior |
| --- | --- |
| handoff_event with fromStepId / toStepId | step nodes + handoff edge |
| handoff_event with feature | feature node |
| handoff_event with name | event node |
| handoff_event with source | source node + emitted-by edge |
| repeated event | observedCount incremented |
| non-handoff JSON row | ignoredRows incremented |
| invalid JSON line | parseErrors incremented |
| missing event log | zero nodes / zero edges |

Node ids (`step:<id>` / `feature:<f>` / `event:<n>` / `source:<s>`) and
edge ids (`handoff:<from>:<to>` / `emitted-by:<n>:<s>`) are slug-safe and
derived only from observed fields, so identical inputs always produce the
identical graph (the factory + validator enforce it). The `observed-from`
edge kind is reserved in the type but not emitted in v1, which is honest:
the type leaves room without overclaiming an edge the observation does not
yet produce.

## Aggregation Review

Aggregation is safe. Repeated observations of the same node/edge id
increment `observedCount`, append a line `evidenceRef`, and extend
`firstObservedAt` (minimum observed timestamp) / `lastObservedAt` (maximum
observed timestamp). Timestamps are compared as the ISO-8601 strings the
event log carries; an event without a timestamp simply contributes no
first/last bound. No observation is discarded silently, and the validator's
positive-`observedCount` invariant guarantees every persisted node/edge was
actually observed at least once. The aggregation never infers an
observation that was not present in the log.

## Boundary From Coverage Review

**RuntimeGraphObservationReport is not HandoffCoverageReport.**
**RuntimeGraphObservationReport v1 does not evaluate declared handoff
coverage.** Observation preserves raw observed graph facts;
`HandoffCoverageReport` separately interprets observed events against
declared `HandoffContract` policy and emits coverage verdicts. The
observation builder compares against no declared artifact: it reads no
`HandoffContract`, no `StepCapabilityGraph`, and no `HandoffCoverageReport`
content — those refs, when supplied, are citation/context only. Keeping
observation raw is exactly what lets a later drift layer be honest.

## Runtime Drift Boundary Review

**RuntimeGraphObservationReport v1 does not detect runtime graph drift.**
The artifact records a single observed graph; it performs no
expected-vs-observed comparison and builds no `RuntimeGraphDriftReport`.
**RuntimeGraphDriftReport remains the next layer after runtime
observation.**

| Boundary | Decision |
| --- | --- |
| RuntimeGraphObservationReport vs StepCapabilityGraph | observed runtime graph vs expected topology |
| RuntimeGraphObservationReport vs HandoffContract | observed runtime graph vs declared policy |
| RuntimeGraphObservationReport vs HandoffCoverageReport | observed graph vs coverage evaluation |
| RuntimeGraphObservationReport vs RuntimeGraphDriftReport | no drift detection |
| RuntimeGraphObservationReport vs WorkOrder / VerificationPlan | no task/proof artifact creation |
| RuntimeGraphObservationReport vs intent | prerequisite only |

## WorkOrder / VerificationPlan Boundary Review

**RuntimeGraphObservationReport v1 does not create WorkOrder or
VerificationPlan.** The CLI writes exactly one
`RuntimeGraphObservationReport` under `graphs/` and creates no other
governed artifact. `VerificationRun` is not a runtime observation input.
Task / proof artifact creation stays downstream and out of v1.

## Intent Boundary Review

**Intent implementation remains deferred.**
`RuntimeGraphObservationReport` is a prerequisite for intent parity (a
future `intent:assess` could inspect whether a runtime observation exists;
`intent:status` could report observed runtime graph freshness once those
surfaces exist), but v1 runs no intent phase and gates nothing.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare v1 safe/stable observation | selected | bounded raw observation |
| RuntimeGraphDriftReport decision next | selected | next layer after observation |
| publication surfacing next | deferred | drift boundary should come first |
| more observation dogfood first | deferred | tests + smoke sufficient for safety |
| intent next | rejected | drift boundary needed first |

## Recommendation

`RuntimeGraphObservationReport` v1 is safe/stable as observed runtime graph
(no blocker). Proceed to the **RuntimeGraphDriftReport architecture / v1
decision**: the observed runtime graph now exists, so the next layer should
decide how expected topology (`StepCapabilityGraph`), declared contracts
(`HandoffContract`), handoff coverage (`HandoffCoverageReport`), and the
observed runtime graph (`RuntimeGraphObservationReport`) are compared for
drift — without implementing drift, `WorkOrder` / `VerificationPlan`,
intent, or source writes yet. If caution is preferred, a
`RuntimeGraphObservationReport` publication surfacing decision is the
alternative, but the default recommendation is the `RuntimeGraphDriftReport`
v1 decision because the observed graph is implemented and safety-reviewed
by this slice.

## What This Does Not Do

This is a read-only review. It changes no runtime behavior, mutates no
artifact (`HandoffCoverageReport` / `HandoffContract` / `StepCapabilityGraph`
/ the event log), creates no `RuntimeGraphDriftReport`, `WorkOrder`, or
`VerificationPlan`, detects no drift, evaluates no coverage, treats no
`VerificationRun` as observation input, starts no intent implementation,
writes no source files, publishes nothing to npm, and bumps no version.

## Follow-Up Work

- RuntimeGraphDriftReport architecture / v1 decision (next).
- Deferred to later, separately-decided slices: `RuntimeGraphDriftReport`
  implementation, intent implementation, `WorkOrder` / `VerificationPlan`
  creation, and source writes.
- Optional: a `RuntimeGraphObservationReport` publication surfacing pass
  (architecture summary / agent contract) and emitting the reserved
  `observed-from` edge kind can come later without changing the artifact
  type.

## Cross-References

- [RuntimeGraphObservationReport artifact](../artifacts/runtime-graph-observation-report.md)
- [Runtime graph observation concept](../concepts/runtime-graph-observation.md)
- [RuntimeGraphObservationReport v1 decision](runtime-graph-observation-report-v1-decision.md)
- [HandoffCoverageReport safety review](handoff-coverage-report-safety-review.md)
- [HandoffCoverageReport v1 decision](handoff-coverage-report-v1-decision.md)
- [StepCapabilityGraph / HandoffContract architecture decision](step-capability-handoff-architecture-decision.md)
- [Classic step-capability / handoff / runtime drift parity audit](classic-step-capability-handoff-runtime-drift-parity-audit.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)

> See also: [RuntimeGraphDriftReport v1 decision](runtime-graph-drift-report-v1-decision.md) — the next spine layer (final classic-parity drift): compares StepCapabilityGraph / HandoffContract / HandoffCoverageReport / RuntimeGraphObservationReport for expected-vs-observed runtime graph drift. Expected-vs-observed runtime graph drift, not runtime observation; not HandoffCoverageReport; not PathFreshnessReport or artifact lineage freshness; does not read raw handoff event logs directly; no WorkOrder / VerificationPlan; intent deferred.

> See also: [RuntimeGraphDriftReport artifact](../artifacts/runtime-graph-drift-report.md) — the final spine layer: expected-vs-observed runtime graph drift over StepCapabilityGraph / HandoffContract / HandoffCoverageReport / RuntimeGraphObservationReport. Drift rows in-sync / missing-expected / added-observed / uncovered-handoff / unresolved-contract / observation-missing / not-evaluated (severity-bucketed). Not runtime observation; not HandoffCoverageReport; not PathFreshnessReport or artifact lineage freshness; does not read raw handoff event logs directly; no WorkOrder / VerificationPlan; intent deferred. See the [runtime graph drift concept](../concepts/runtime-graph-drift.md).

> See also: [RuntimeGraphDriftReport safety review](runtime-graph-drift-report-safety-review.md) — declares RuntimeGraphDriftReport v1 safe / stable as expected-vs-observed runtime graph drift (not runtime observation; not HandoffCoverageReport; not PathFreshnessReport or artifact lineage freshness): reads no raw handoff event logs, re-evaluates no coverage, creates no WorkOrder / VerificationPlan, implements no intent. The classic step/handoff/runtime-drift spine is now complete enough to unblock intent architecture work. Next: Intent Capability Spine Integration Review.
