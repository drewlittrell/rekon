# HandoffCoverageReport Safety Review

## Decision Summary

`HandoffCoverageReport` v1 (shipped at `8e0a617`) is **safe / stable as a
narrow handoff-event coverage artifact**. It compares the declared
handoffs in a `HandoffContract` against an optional raw handoff event log
(`.rekon/handoff-events.jsonl`) and emits per-handoff coverage rows —
`covered` / `uncovered` / `unresolved-contract` / `added-observed` /
`not-evaluated` — and nothing more.

**HandoffCoverageReport is handoff-event coverage, not VerificationRun
command success.** The artifact creates no other artifacts and overclaims
no runtime behavior: **Missing event log means not-evaluated, not
uncovered.** **Present event log without a matching declared handoff means
uncovered.** **added-observed rows are unmatched observed handoff_event
rows.** **Invalid event-log lines count parseErrors without aborting the
report.** **HandoffCoverageReport v1 does not create
RuntimeGraphObservationReport.** **HandoffCoverageReport v1 does not detect
runtime graph drift.** **HandoffCoverageReport v1 does not create WorkOrder
or VerificationPlan.** **Intent implementation remains deferred.**

This review finds **no blocker**. The recommended next slice is the
**RuntimeGraphObservationReport architecture / v1 decision**: declared
handoffs and observed handoff-event coverage now exist, so the next layer
should decide how observed handoff events (and future runtime traces)
become a generalized runtime graph observation artifact.

| Surface | Status | Boundary |
| --- | --- | --- |
| HandoffCoverageReport artifact | shipped | handoff-event coverage |
| handoff coverage report CLI | shipped | writes coverage report only |
| .rekon/handoff-events.jsonl | optional | raw handoff event input |
| RuntimeGraphObservationReport | deferred | not created by coverage |

## Why This Review Exists

`HandoffCoverageReport` is Rekon's first observed-event comparison layer:
the first artifact that compares *declared* baton policy against
*observed* evidence. It is the prerequisite for runtime graph observation,
runtime drift, and intent parity. Before `RuntimeGraphObservationReport`
is designed, Rekon needs to safety-review that `HandoffCoverageReport` v1
is only narrow handoff-event coverage and does not quietly overclaim a
full runtime graph, drift detection, `VerificationRun` command proof,
task/proof artifact creation, or intent gating.

## Artifact And CLI Reviewed

Grounded by re-reading the shipped slice-68 implementation:

- **Type shape** (`@rekon/kernel-repo-model`): `HandoffCoverageReport`
  carries `source` (`handoffContractRef`, `eventLogPath?`,
  `eventLogHash?`), a `summary` (`totalDeclared`, `covered`, `uncovered`,
  `unresolvedContract`, `addedObserved`, `notEvaluated`, `parseErrors`),
  and `rows[]` (`id`, `handoffId?`, `status`, `matchMethod`, `feature?`,
  `eventName?`, `fromStepId?`, `toStepId?`, `observedCount`,
  `observedEventRefs?`, `messages?`).
- **Factory** `createHandoffCoverageReport`: dedupes rows by id; sorts
  contract rows (by id) before `added-observed` rows (by first observed
  line, then id); recomputes the six status counts and
  `totalDeclared = covered + uncovered + unresolvedContract + notEvaluated`;
  and asserts. A caller cannot persist a stale status summary.
- **Validator / assert / schema** `validateHandoffCoverageReport`
  validates the header, the `handoffContractRef`, each row (id uniqueness;
  status / matchMethod enums; per-status `observedCount` invariants —
  `covered` / `added-observed` must be `> 0`, `uncovered` /
  `unresolved-contract` / `not-evaluated` must be `=== 0`; optional string
  fields non-empty; `observedEventRefs` line/`timestamp`/`source` shapes),
  and **re-derives the six status counts + `totalDeclared`, rejecting any
  artifact whose summary does not match its rows**. `parseErrors` is
  type-checked (non-negative integer) but trusted, because it is observed
  during parsing and is not recomputable from rows.
- **Helper** `buildHandoffCoverageReport` reads the `HandoffContract`
  structurally (Like type; no new dependency) and the optional event log
  *content* (never a file). It **reads no files**, makes no network calls,
  and mutates nothing.
- **Parser** `parseHandoffEventLog` splits the raw JSONL string, skips
  blank lines, and parses each line; only rows whose `kind` is
  `handoff_event` become observed events; invalid JSON increments
  `parseErrors` and continues.
- **CLI** `rekon handoff coverage report [--root] [--json]
  [--handoff-contract <ref>] [--event-log <path>]` reads the latest (or
  pinned) `HandoffContract` + the optional event log (default
  `.rekon/handoff-events.jsonl` or an explicit `--event-log`), writes one
  `HandoffCoverageReport` under `.rekon/artifacts/actions/`, and prints
  "No RuntimeGraphObservationReport, RuntimeGraphDriftReport, WorkOrder, or
  VerificationPlan artifacts were created."

## Event Input Review

`.rekon/handoff-events.jsonl` is optional and is **operator/runtime-owned
raw input, never mutated**: the CLI reads it, hashes it (sha256) for
citation, and writes only the coverage report. Only lines whose `kind` is
`handoff_event` are considered observed handoffs; **other valid JSON rows
are ignored** (neither matched nor counted as errors). The builder itself
reads no files — the CLI reads the optional log and passes its content +
hash in — so the artifact cannot read arbitrary runtime files, and a
missing log is a normal, valid state. `observedEventRefs` cite the log by
line number, not by copying payloads, so the report carries no source-file
contents.

## Matching Policy Review

Matching is deterministic and conservative.

| Matching Case | V1 Behavior |
| --- | --- |
| event.name match | covered / event-name |
| feature match | covered / feature |
| fromStepId + toStepId match | covered / step-pair |
| multiple matches | covered with observedCount > 1 |
| no match with event log present | uncovered |
| unresolved contract row | unresolved-contract |
| unmatched observed handoff_event | added-observed |
| non-handoff_event JSON row | ignored |
| invalid JSON line | parseErrors incremented |

Each declared handoff is matched by a single method chosen by priority —
`event.name` (when present), then `feature` (when present), then
`fromStepId` + `toStepId` — and **never by title or prose**. Multiple
matching events count as `covered` with `observedCount > 1`. Events
consumed by a declared match are never also emitted as `added-observed`.
The matching is sufficient for v1: the same inputs always produce the same
report, which the factory + validator enforce.

## Missing Log / Uncovered Boundary Review

The missing-log vs present-unmatched distinction is the safety-critical
property of this artifact, and it is implemented correctly.

**Missing event log means not-evaluated, not uncovered.** When no event
log is present (`eventLog === undefined`), declared handoffs become
`not-evaluated` (coverage was not measured) and no `eventLogPath` /
`eventLogHash` is recorded — absence of observation is not reported as
observed absence. **Present event log without a matching declared handoff
means uncovered** — when a log *is* present and a declared handoff has no
matching observed event, that is a real coverage gap (`uncovered`). This
keeps the report honest: a missing log never produces a false coverage
failure.

## Parse Error Review

**Invalid event-log lines count parseErrors without aborting the report.**
A malformed JSONL line increments the `parseErrors` counter and parsing
continues; one bad line never discards the rest of the coverage signal.
`parseErrors` is surfaced in the summary so partial-quality logs are
visible rather than silently dropped. Because `parseErrors` is observed
during parsing (not derivable from rows), the validator type-checks it but
trusts it; the factory passes the parser's count through. This is safe: a
corrupted or partially-written log degrades gracefully to a still-valid
report with a visible error count.

## Added Observed Review

**added-observed rows are unmatched observed handoff_event rows.** An
observed `handoff_event` that matches no declared handoff becomes an
`added-observed` row (`observedCount > 0`, citing the log line), surfacing
the gap between what runs and what was declared. This is the narrow,
honest precursor to runtime drift: it reports an unmatched observed event
without inferring a full runtime graph or asserting drift. `added-observed`
row ids encode the event log line (`added-observed:<line>`), which is
unique per line; a contract handoff id colliding with that prefix is
astronomically unlikely and operator-controlled. Consumed (matched) events
are never double-counted as `added-observed`.

## Runtime Graph Boundary Review

**HandoffCoverageReport v1 does not create RuntimeGraphObservationReport.**
**HandoffCoverageReport v1 does not detect runtime graph drift.** The
artifact reads a *raw handoff event log* directly — a narrow, single-shape
input — not a generalized observed runtime graph, and it performs no
expected-vs-observed graph comparison. No `RuntimeGraphObservationReport`
or `RuntimeGraphDriftReport` is built or written.
**RuntimeGraphObservationReport remains the next runtime layer after
coverage**, and **RuntimeGraphDriftReport remains deferred**.

| Boundary | Decision |
| --- | --- |
| HandoffCoverageReport vs HandoffContract | coverage over declared policy |
| HandoffCoverageReport vs VerificationRun | event coverage, not command success |
| HandoffCoverageReport vs RuntimeGraphObservationReport | no full runtime graph |
| HandoffCoverageReport vs RuntimeGraphDriftReport | no drift detection |
| HandoffCoverageReport vs WorkOrder / VerificationPlan | no task/proof artifact creation |
| HandoffCoverageReport vs intent | prerequisite only |

## WorkOrder / VerificationPlan Boundary Review

**HandoffCoverageReport v1 does not create WorkOrder or VerificationPlan.**
The CLI writes exactly one `HandoffCoverageReport` under `actions/` and
creates no other governed artifact. Coverage is also explicitly **not**
`VerificationRun` command success: a passing verification command is not
handoff-event coverage, and observed handoff events are not command
results. Task / proof artifact creation stays downstream and out of v1.

## Intent Boundary Review

**Intent implementation remains deferred.** `HandoffCoverageReport` is a
prerequisite for intent parity (a future `intent:status` could report
coverage; a future `intent:go` could gate on `uncovered` /
`unresolved-contract` handoffs once those surfaces exist), but v1 runs no
intent phase and gates nothing.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare v1 safe/stable coverage | selected | bounded handoff-event coverage |
| RuntimeGraphObservationReport decision next | selected | next runtime layer |
| publication surfacing next | deferred | runtime layer boundary first |
| more coverage dogfood first | deferred | tests + smoke sufficient for safety |
| RuntimeGraphDriftReport next | rejected | observation layer needed before drift |

## Recommendation

`HandoffCoverageReport` v1 is safe/stable as narrow handoff-event coverage
(no blocker). Proceed to the **RuntimeGraphObservationReport architecture /
v1 decision**: declared handoffs and observed handoff-event coverage now
exist, so the next layer should decide how observed handoff events (and
possibly other future runtime traces) become a generalized runtime graph
observation artifact — without implementing observation, drift, WorkOrder
/ VerificationPlan, intent, or source writes yet. If caution is preferred,
a `HandoffCoverageReport` publication surfacing decision is the
alternative, but the default recommendation is the
`RuntimeGraphObservationReport` v1 decision because the narrow coverage
layer is now implemented and ready for the next runtime layer.

## What This Does Not Do

This is a read-only review. It changes no runtime behavior, mutates no
artifact (`HandoffContract` / the event log), creates no
`RuntimeGraphObservationReport`, `RuntimeGraphDriftReport`, `WorkOrder`, or
`VerificationPlan`, detects no drift, treats no `VerificationRun` command
success as coverage, starts no intent implementation, writes no source
files, publishes nothing to npm, and bumps no version.

## Follow-Up Work

- RuntimeGraphObservationReport architecture / v1 decision (next).
- Deferred to later, separately-decided slices:
  `RuntimeGraphObservationReport` implementation,
  `RuntimeGraphDriftReport`, intent implementation, `WorkOrder` /
  `VerificationPlan` creation, and source writes.
- Optional: a `HandoffCoverageReport` publication surfacing pass
  (architecture summary / agent contract) can come later without changing
  the artifact type.

## Cross-References

- [HandoffCoverageReport artifact](../artifacts/handoff-coverage-report.md)
- [Handoff coverage concept](../concepts/handoff-coverage.md)
- [HandoffCoverageReport v1 decision](handoff-coverage-report-v1-decision.md)
- [HandoffContract safety review](handoff-contract-safety-review.md)
- [HandoffContract v1 decision](handoff-contract-v1-decision.md)
- [StepCapabilityGraph / HandoffContract architecture decision](step-capability-handoff-architecture-decision.md)
- [Classic step-capability / handoff / runtime drift parity audit](classic-step-capability-handoff-runtime-drift-parity-audit.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)

> See also: [RuntimeGraphObservationReport v1 decision](runtime-graph-observation-report-v1-decision.md) — the next spine layer: an observed runtime graph generated from raw handoff_event logs (.rekon/handoff-events.jsonl). Observed runtime graph, not declared topology; not HandoffCoverageReport; does not evaluate declared coverage, detect drift, or create WorkOrder / VerificationPlan; intent deferred. RuntimeGraphDriftReport remains the next layer after observation.

> See also: [RuntimeGraphObservationReport artifact](../artifacts/runtime-graph-observation-report.md) — observed runtime graph generated from raw handoff_event logs (.rekon/handoff-events.jsonl): observed step/feature/event/source nodes + handoff/emitted-by edges with observedCount + line evidence; non-handoff rows → ignoredRows, invalid lines → parseErrors, missing log → zero nodes/edges. Observed runtime graph, not declared topology; not HandoffCoverageReport; no coverage evaluation / drift / WorkOrder / VerificationPlan / intent. RuntimeGraphDriftReport remains the next layer. See the [runtime graph observation concept](../concepts/runtime-graph-observation.md).

> See also: [RuntimeGraphObservationReport safety review](runtime-graph-observation-report-safety-review.md) — declares RuntimeGraphObservationReport v1 safe / stable as observed runtime graph: observed step/feature/event/source nodes + handoff/emitted-by edges aggregated from raw handoff_event logs; non-handoff rows → ignoredRows, invalid lines → parseErrors, missing log → zero. Observed runtime graph, not declared topology; not HandoffCoverageReport; no coverage evaluation / drift / WorkOrder / VerificationPlan / intent. Next: RuntimeGraphDriftReport architecture / v1 decision.

> See also: [RuntimeGraphDriftReport v1 decision](runtime-graph-drift-report-v1-decision.md) — the next spine layer (final classic-parity drift): compares StepCapabilityGraph / HandoffContract / HandoffCoverageReport / RuntimeGraphObservationReport for expected-vs-observed runtime graph drift. Expected-vs-observed runtime graph drift, not runtime observation; not HandoffCoverageReport; not PathFreshnessReport or artifact lineage freshness; does not read raw handoff event logs directly; no WorkOrder / VerificationPlan; intent deferred.

> See also: [RuntimeGraphDriftReport artifact](../artifacts/runtime-graph-drift-report.md) — the final spine layer: expected-vs-observed runtime graph drift over StepCapabilityGraph / HandoffContract / HandoffCoverageReport / RuntimeGraphObservationReport. Drift rows in-sync / missing-expected / added-observed / uncovered-handoff / unresolved-contract / observation-missing / not-evaluated (severity-bucketed). Not runtime observation; not HandoffCoverageReport; not PathFreshnessReport or artifact lineage freshness; does not read raw handoff event logs directly; no WorkOrder / VerificationPlan; intent deferred. See the [runtime graph drift concept](../concepts/runtime-graph-drift.md).
