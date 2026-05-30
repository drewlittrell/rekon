# RuntimeGraphDriftReport Safety Review

## Decision Summary

`RuntimeGraphDriftReport` v1 (shipped at `41be345`) is **safe / stable as
the expected-vs-observed runtime graph drift layer** — the fifth and final
artifact of the classic step / handoff / runtime-drift spine. It compares
the four already-materialized graph artifacts (`StepCapabilityGraph`,
`HandoffContract`, `HandoffCoverageReport`, `RuntimeGraphObservationReport`)
into per-divergence drift rows (`in-sync` / `missing-expected` /
`added-observed` / `uncovered-handoff` / `unresolved-contract` /
`observation-missing` / `not-evaluated`) with a severity-bucketed summary —
and nothing more.

**RuntimeGraphDriftReport is expected-vs-observed runtime graph drift, not
runtime observation.** **RuntimeGraphDriftReport is not HandoffCoverageReport.**
**RuntimeGraphDriftReport is not PathFreshnessReport or artifact lineage
freshness.** The artifact creates no other artifacts and overclaims no
behavior: **RuntimeGraphDriftReport v1 does not read raw handoff event logs
directly.** **RuntimeGraphDriftReport v1 does not re-evaluate handoff
coverage from events.** **RuntimeGraphDriftReport v1 does not create
WorkOrder or VerificationPlan.** **RuntimeGraphDriftReport v1 does not
implement intent.**

This review finds **no blocker**. **The classic step/handoff/runtime-drift
spine is now complete enough to unblock intent architecture work if no
blockers are found.** The recommended next slice is the **Intent Capability
Spine Integration Review**: now that the full graph spine —
`StepCapabilityGraph` → `HandoffContract` → `HandoffCoverageReport` →
`RuntimeGraphObservationReport` → `RuntimeGraphDriftReport` — is implemented
and safety-reviewed, intent work should account for these surfaces before
rebuilding `intent:assess` / `intent:prepare` / `intent:status`.

| Surface | Status | Boundary |
| --- | --- | --- |
| RuntimeGraphDriftReport artifact | shipped | expected-vs-observed drift |
| runtime graph drift CLI | shipped | writes drift report only |
| raw handoff event log | not read | observation owns parsing |
| WorkOrder / VerificationPlan | deferred | not created by drift |

## Why This Review Exists

`RuntimeGraphDriftReport` is the final layer of the classic
step/handoff/runtime-drift spine. Because drift is the surface closest to
actionability — intent gates, remediation, and verification — Rekon must
verify that v1 remains a *read-only evaluation* and does not quietly imply
`WorkOrder`, `VerificationPlan`, intent, or source-write behavior. This
review also serves as the gate that, finding no blocker, declares the
classic graph spine complete enough to unblock intent architecture work.

## Artifact And CLI Reviewed

Grounded by re-reading the shipped slice-74 implementation:

- **Type shape** (`@rekon/kernel-repo-model`): `RuntimeGraphDriftReport`
  carries `source` (`stepCapabilityGraphRef?`, `handoffContractRef?`,
  `handoffCoverageReportRef?`, `runtimeGraphObservationReportRef?` — **no raw
  event-log path**), a `summary` (`total`, `inSync`, `missingExpected`,
  `addedObserved`, `uncoveredHandoff`, `unresolvedContract`,
  `observationMissing`, `notEvaluated`, `bySeverity`), and `rows[]` (id,
  kind, status, severity, message, optional step/handoff/coverage/observed
  identifiers, `expectedRef?`, `observedRef?`, `evidenceRefs`).
- **Factory** `createRuntimeGraphDriftReport`: dedupes rows by id; sorts by
  `(kind, status, id)`; recomputes the status buckets, `total`, and
  `bySeverity` from `rows`; and asserts. A caller cannot persist a stale
  summary.
- **Validator / assert / schema** `validateRuntimeGraphDriftReport`
  validates the header, the four optional `source` refs (each via
  `validateArtifactRef`), each row (id uniqueness; kind / status / severity
  enums; non-empty message; optional string fields; `expectedRef` /
  `observedRef` / `evidenceRefs` validity), and **re-derives the full
  summary (status buckets + total + bySeverity), rejecting any artifact
  whose summary does not match its rows**.
- **Helper** `buildRuntimeGraphDriftReport` consumes only the four
  materialized artifacts passed as values (structural `Like` types). It
  **reads no files**, parses no raw event logs, reads no upstream contents
  beyond the passed values, and mutates nothing.
- **CLI** `rekon runtime graph drift [--root] [--json] [--step-graph]
  [--handoff-contract] [--handoff-coverage-report]
  [--runtime-observation-report]` reads the latest (or pinned) four input
  artifacts, writes one `RuntimeGraphDriftReport` under
  `.rekon/artifacts/actions/`, and prints "No WorkOrder or VerificationPlan
  artifacts were created."

## Input Boundary Review

The four inputs are resolved as latest-or-pinned Rekon artifacts and cited
in `source` by `ArtifactRef`; the builder reads their *materialized content*
as values. `.rekon/handoff-events.jsonl` is **never read**; the helper takes
no file path and parses no raw event log. `PathFreshnessReport` and artifact
lineage freshness are **not** inputs. The CLI does not call coverage or
observation generation. **RuntimeGraphDriftReport v1 does not read raw
handoff event logs directly** — `RuntimeGraphObservationReport` owns raw
observation parsing.

## Drift Model Review

The drift mapping is deterministic and conservative.

| Input Signal | V1 Drift Row |
| --- | --- |
| covered coverage row | in-sync |
| uncovered coverage row | uncovered-handoff |
| unresolved-contract coverage row | unresolved-contract |
| added-observed coverage row | added-observed |
| not-evaluated coverage row | not-evaluated |
| observation absent / empty | observation-missing / not-evaluated |

Observed handoff edges absent from the `HandoffContract` and not already
represented by a coverage `added-observed` row become `added-observed`;
declared handoffs with no coverage row (observation present) become
`missing-expected`. The added-observed dedupe — by slugged
`handoff:<from>:<to>` edge id shared between coverage rows and observation
edges — prevents the same observed edge from being reported twice. The
factory + validator guarantee identical inputs always produce the identical
drift report.

## Observation Boundary Review

**RuntimeGraphDriftReport is expected-vs-observed runtime graph drift, not
runtime observation.** Observation records what ran; drift compares it
against what was expected/declared. When `RuntimeGraphObservationReport` is
absent or has no observed graph (`observedNodes` and `observedEdges` both
zero), drift emits `observation-missing` rather than claiming false drift —
absence of observation is never reported as observed divergence. The
`observation-missing` vs `not-evaluated` distinction (no observation vs
insufficient inputs) is implemented precisely.

## Coverage Boundary Review

**RuntimeGraphDriftReport is not HandoffCoverageReport.**
**RuntimeGraphDriftReport v1 does not re-evaluate handoff coverage from
events.** Coverage already interpreted observed events against declared
policy; drift consumes those coverage rows (and the observed runtime graph)
and re-expresses them as graph-level divergence. The builder never re-parses
the event log, never re-runs coverage matching, and never overrides a
coverage verdict — it maps each coverage status to a drift status one-to-one.

## Freshness Boundary Review

**RuntimeGraphDriftReport is not PathFreshnessReport or artifact lineage
freshness.** `PathFreshnessReport` and artifact lineage freshness measure
whether source paths or artifact lineage are current; runtime graph drift
measures whether the observed runtime topology diverges from what was
expected. Neither freshness artifact is read or treated as a drift input;
the two axes stay distinct.

| Boundary | Decision |
| --- | --- |
| RuntimeGraphDriftReport vs RuntimeGraphObservationReport | drift vs observation |
| RuntimeGraphDriftReport vs HandoffCoverageReport | drift over coverage/context, not coverage itself |
| RuntimeGraphDriftReport vs PathFreshnessReport | runtime topology divergence vs working-tree freshness |
| RuntimeGraphDriftReport vs artifact freshness | runtime topology divergence vs lineage freshness |
| RuntimeGraphDriftReport vs WorkOrder / VerificationPlan | no task/proof artifact creation |
| RuntimeGraphDriftReport vs intent | prerequisite only |

## WorkOrder / VerificationPlan Boundary Review

**RuntimeGraphDriftReport v1 does not create WorkOrder or VerificationPlan.**
The CLI writes exactly one `RuntimeGraphDriftReport` under `actions/` and
creates no other governed artifact. Severity buckets (`low` / `medium` /
`high`) are an **advisory evaluation hint**, not a remediation priority or
an execution-readiness gate; the report infers no user-facing remediation
ordering beyond the severity label. Task / proof artifact creation stays
downstream and out of v1.

## Intent Boundary Review

**RuntimeGraphDriftReport v1 does not implement intent.** The drift report
is a prerequisite for intent parity (a future `intent:assess` can inspect
whether drift exists; `intent:status` can report drift state once those
surfaces are designed), but v1 runs no intent phase and gates nothing.
Intent implementation remains deferred — and this review is the gate that
unblocks the *architecture* work for it.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare v1 safe/stable drift | selected | bounded artifact comparison |
| unblock intent architecture work | selected | classic graph spine complete |
| publication surfacing next | deferred | intent architecture should decide consumers |
| WorkOrder / VerificationPlan next | rejected | intent/governance gates first |
| source writes next | rejected | not part of graph spine |

## Recommendation

`RuntimeGraphDriftReport` v1 is safe/stable as expected-vs-observed runtime
graph drift (no blocker). **The classic step/handoff/runtime-drift spine is
complete enough to unblock intent architecture work.** Proceed to the
**Intent Capability Spine Integration Review**: map the classic intent
surfaces onto Rekon now that the capability, policy, finding, step, handoff,
coverage, observation, and drift layers all exist — before rebuilding
`intent:assess` / `intent:prepare` / `intent:status`. Defer: `WorkOrder` /
`VerificationPlan` creation from drift, resolver routing from drift, source
writes, and `RuntimeGraphDriftReport` publication surfacing (unless the
intent integration review finds it is needed first).

## What This Does Not Do

This is a read-only review. It changes no runtime behavior, mutates no
artifact (`StepCapabilityGraph` / `HandoffContract` / `HandoffCoverageReport`
/ `RuntimeGraphObservationReport` / `PathFreshnessReport`), creates no
`WorkOrder` / `VerificationPlan`, reads no raw handoff event logs, parses no
runtime event files, re-evaluates no coverage, treats no freshness artifact
as drift, starts no intent implementation, writes no source files, publishes
nothing to npm, and bumps no version.

## Follow-Up Work

- Intent Capability Spine Integration Review (next).
- Deferred to later, separately-decided slices: `WorkOrder` /
  `VerificationPlan` creation from drift, resolver routing from drift,
  intent implementation, source writes, and `RuntimeGraphDriftReport`
  publication surfacing.
- Optional: richer step-edge topology drift (using `StepCapabilityGraph`
  expected edges directly) can deepen the drift model later without changing
  the artifact type.

## Cross-References

- [RuntimeGraphDriftReport artifact](../artifacts/runtime-graph-drift-report.md)
- [Runtime graph drift concept](../concepts/runtime-graph-drift.md)
- [RuntimeGraphDriftReport v1 decision](runtime-graph-drift-report-v1-decision.md)
- [RuntimeGraphObservationReport safety review](runtime-graph-observation-report-safety-review.md)
- [HandoffCoverageReport safety review](handoff-coverage-report-safety-review.md)
- [StepCapabilityGraph / HandoffContract architecture decision](step-capability-handoff-architecture-decision.md)
- [Classic step-capability / handoff / runtime drift parity audit](classic-step-capability-handoff-runtime-drift-parity-audit.md)
- [Path freshness report artifact](../artifacts/path-freshness-report.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)

> See also: [Intent Capability Spine Integration Review](intent-capability-spine-integration-review.md) — maps the classic intent surfaces (intent:assess / intent:prepare / intent:go / intent:status) onto the Rekon artifact spine: assess → IntentAssessmentReport, prepare → PreparedIntentPlan, status → IntentStatusReport, go deferred. Selects Option B (staged intent artifact spine); first target IntentAssessmentReport v1 decision. Classic intent did not consume the step/handoff/runtime-graph/drift spine; Rekon intent extends parity by wiring StepCapabilityGraph, HandoffContract, HandoffCoverageReport, RuntimeGraphObservationReport, and RuntimeGraphDriftReport into intent readiness. No intent implemented, no artifact registered, no CLI command, no source writes.
