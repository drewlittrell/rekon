# IntentAssessmentReport Safety Review

## Decision Summary

`IntentAssessmentReport` v1 shipped at `f385b4e` as the first artifact of the
staged Rekon intent spine — a read-only readiness assessment of a user request
against the existing context spine, with a `rekon intent assess` CLI command.
This review examines the shipped artifact, factory, validator, helper, and CLI
end-to-end and finds **no blocker**.

**IntentAssessmentReport v1 is safe/stable as read-only readiness assessment.**
It is bounded correctly: **IntentAssessmentReport is assessment, not
WorkOrder.** **IntentAssessmentReport does not create WorkOrder or
VerificationPlan.** **IntentAssessmentReport does not create VerificationRun or
VerificationResult.** **IntentAssessmentReport does not execute commands.**
**IntentAssessmentReport does not write source files.** **RuntimeGraphDriftReport
is an input to readiness, not the intent system itself.** **PreparedIntentPlan
remains the next layer after assessment.** **IntentStatusReport remains
deferred.** **intent:go remains deferred.**

The recommended next slice is **PreparedIntentPlan v1 decision** — the layer
that decides how an assessed intent becomes prepared phases, constraints,
gates, touched paths, and obligations, still without execution or source
writes.

This is a review batch only; it changes no runtime behavior, registers no
artifact, and adds no CLI command.

## Why This Review Exists

`IntentAssessmentReport` is Rekon's first intent artifact. It assesses
readiness before preparation, and it sits close to WorkOrder / VerificationPlan
/ execution language — a request goal, blockers, recommended next actions, and
proof signals. Before `PreparedIntentPlan` work begins, Rekon must verify that
v1 is a bounded read-only assessment that creates no tasks, proof plans,
command runs, or source writes, and that it consumes the graph spine as a
readiness input rather than becoming the graph spine itself.

**Classic intent readiness was gate-based plus hash/staleness-based; Rekon
extends parity by wiring graph-spine readiness into IntentAssessmentReport.**
This review confirms that extension stays read-only and does not overreach.

## Artifact And CLI Reviewed

- **Artifact** `IntentAssessmentReport` { `header`, `request`, `source` (14
  optional refs), `readiness` (`status`, `score?`, `recommendedNextAction`),
  `matchedContext` (`systems` / `capabilities` / `steps` / `paths`),
  `blockers[]`, `warnings[]`, `missingContext[]` }, category `actions`.
- **Factory** `createIntentAssessmentReport` normalizes the request (drops
  empty scope/constraints/non-goals), copies only present source refs, dedupes
  each entry list by id, sorts entries by (severity rank, category, id), sorts
  matched-context arrays, and asserts via `assertIntentAssessmentReport`.
- **Validator** `validateIntentAssessmentReport` enforces the model header,
  required non-empty `goal`, the `kind` / readiness / `recommendedNextAction`
  / blocker-category / severity enums, unique entry ids per list, non-empty
  fields, and `ArtifactRef` validity for `source` refs + entry `sourceRefs`.
- **Helper** `buildIntentAssessmentReport` consumes structural `Like` views of
  the inputs plus their refs; it **reads no files**, runs no commands, and
  writes no artifacts. It applies the readiness/blocker policy and returns the
  report via the factory.
- **CLI** `rekon intent assess` resolves the latest available context
  artifacts, writes exactly one `IntentAssessmentReport` under
  `.rekon/artifacts/actions/`, and prints the readiness summary plus the line
  "No WorkOrder, VerificationPlan, commands, or source writes were created."

## Request / Scope Review

`--goal` is required and a missing goal exits non-zero before any work. `--kind`
defaults to `unknown` and an out-of-enum kind falls back to `unknown`. Scope
flags (`--path` / `--system` / `--capability` / `--step`) and `--constraint` /
`--non-goal` accept repeats and comma-separated values, are trimmed, drop
empties, and are advisory only. The request carries no execution or
source-write directive. Safe.

## Readiness Model Review

Statuses `ready-for-prepare` / `blocked` / `needs-review` /
`insufficient-context` / `stale-context` with precedence
`stale-context > blocked > insufficient-context > needs-review >
ready-for-prepare`. The precedence is safe: a stale request-relevant context or
any high-severity blocker always dominates a "ready" verdict, and an unmappable
request degrades to `insufficient-context` rather than a false "ready".
`recommendedNextAction` is a strict 1:1 map of the status, so the report never
recommends preparing work it just judged unsafe. `run-verification` is a
reserved action value, unemitted in v1.

## Blocker Model Review

`blockers` (gate readiness), `warnings` (inform), and `missingContext` (record
absent inputs) share one shape; the eight categories (`missing-artifact` /
`stale-context` / `runtime-drift` / `handoff-coverage` / `finding-governance` /
`proof-missing` / `scope-ambiguous` / `source-write-unavailable`) are
sufficient for v1. Missing required spine → high blockers; high drift /
unresolved-contract / failed proof / scope-relevant staleness → blockers;
uncovered / parse-errors / missing optional inputs / partial proof → warnings.
`source-write-unavailable` is reserved (the request carries no source-write
flag in v1) and stays unemitted until a source-write policy is decided —
recorded honestly. Deterministic ordering is factory-enforced.

## Matched Context Review

`matchedContext` is built from the request scope, deterministically augmented
by `StepCapabilityGraph` (systems + paths for matched step ids) and
`CapabilityMap` (systems for matched capabilities), then deduped and sorted by
the factory. There is no LLM matching in v1; an empty match yields
`insufficient-context` with a `scope-ambiguous` entry. Deterministic enough for
v1.

## Runtime Drift Dependency Review

**RuntimeGraphDriftReport is an input to readiness, not the intent system
itself.** The helper reads drift `rows`/`summary` by shape, maps high-severity
`missing-expected` / `uncovered-handoff` / `unresolved-contract` rows to
`runtime-drift` blockers, `added-observed` to warnings, and `observation-missing`
to warnings — and it re-evaluates no drift, parses no raw event logs, and
mutates neither `RuntimeGraphDriftReport` nor `PathFreshnessReport`. Drift is
consumed strictly as a readiness signal.

## WorkOrder / VerificationPlan Boundary Review

**IntentAssessmentReport does not create WorkOrder or VerificationPlan.** The
CLI writes exactly one `IntentAssessmentReport` under `actions/` and the
implementation-batch CLI smoke confirmed `artifacts latest --type WorkOrder` /
`VerificationPlan` / `VerificationRun` all returned `null` after `intent
assess`. `WorkOrder` is referenced as prior context only and never produced;
`VerificationResult` / `VerificationRun` / `VerificationPlan` are consumed as
proof refs only.

## Command / Source-Write Boundary Review

**IntentAssessmentReport does not create VerificationRun or VerificationResult.**
**IntentAssessmentReport does not execute commands.** **IntentAssessmentReport
does not write source files.** The helper contains no `child_process`,
`spawnSync`, `execSync`, or filesystem-write call; the CLI's only write is the
single report artifact under `.rekon/artifacts/`. The implementation-batch
smoke confirmed a source file was byte-for-byte unchanged after `intent assess`
and that `artifacts validate` stayed clean.

## Intent Boundary Review

**PreparedIntentPlan remains the next layer after assessment.**
**IntentStatusReport remains deferred.** **intent:go remains deferred.** v1
prepares no phases, reports no lifecycle status, and gates no execution. The
artifact shape supports those downstream layers without implying them.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare v1 safe/stable assessment | selected | bounded read-only assessment |
| PreparedIntentPlan decision next | selected | next layer after assessment |
| publication surfacing next | deferred | CLI visibility sufficient for now |
| WorkOrder / VerificationPlan creation next | rejected | preparation boundary must come first |
| intent:go next | rejected | execution remains deferred |

## Recommendation

`IntentAssessmentReport` v1 is safe/stable as read-only readiness assessment
(no blocker). Proceed to the **PreparedIntentPlan v1 decision**: decide how an
assessed intent becomes prepared phases, constraints, gates, touched paths, and
capability / step / handoff obligations plus verification requirements — still
without execution or source writes. Operator-surface / publication surfacing of
the assessment is deferred (the CLI already exposes assessment state).

## What This Does Not Do

This review changes no `IntentAssessmentReport` behavior, implements no
`PreparedIntentPlan` / `IntentStatusReport` / `IntentGoDecision`, creates no
`WorkOrder` / `VerificationPlan` / `VerificationRun` / `VerificationResult`,
executes nothing, writes no source, mutates no consumed artifact
(`RuntimeGraphDriftReport`, `PathFreshnessReport`, `WorkOrder`,
`VerificationPlan`), imports nothing from classic codebase-intel, bumps no
version, and publishes nothing.

## Follow-Up Work

| Surface | Status | Boundary |
| --- | --- | --- |
| IntentAssessmentReport artifact | shipped | read-only assessment |
| intent assess CLI | shipped | writes assessment only |
| RuntimeGraphDriftReport input | consumed | readiness input only |
| PreparedIntentPlan | deferred | next layer |
| intent:go | deferred | no execution |

| Readiness | V1 Meaning |
| --- | --- |
| ready-for-prepare | enough context to prepare safely |
| blocked | critical blocker present |
| needs-review | ambiguity / medium-risk issue |
| insufficient-context | request cannot be mapped |
| stale-context | freshness says context is stale |

| Boundary | Decision |
| --- | --- |
| IntentAssessmentReport vs WorkOrder | assessment vs implementation guidance |
| IntentAssessmentReport vs VerificationPlan | no proof-plan creation |
| IntentAssessmentReport vs VerificationRun | no command execution |
| IntentAssessmentReport vs PreparedIntentPlan | assessment before phase planning |
| IntentAssessmentReport vs IntentStatusReport | assessment target before status |
| IntentAssessmentReport vs intent:go | execution deferred |
| IntentAssessmentReport vs source files | no writes |

- **PreparedIntentPlan v1 decision** is the next slice.
- `source-write-unavailable` and the `run-verification` next-action stay
  reserved until source-write / execution policy is decided.
- Matched-context resolution can deepen (richer scope mapping) without changing
  the artifact type.

## Cross-References

- [IntentAssessmentReport artifact](../artifacts/intent-assessment-report.md)
- [Intent assessment concept](../concepts/intent-assessment.md)
- [IntentAssessmentReport v1 decision](intent-assessment-report-v1-decision.md)
- [Intent Capability Spine Integration Review](intent-capability-spine-integration-review.md)
- [RuntimeGraphDriftReport safety review](runtime-graph-drift-report-safety-review.md)
- [RuntimeGraphDriftReport artifact](../artifacts/runtime-graph-drift-report.md)
- [Path freshness report artifact](../artifacts/path-freshness-report.md)
- [WorkOrder artifact](../artifacts/work-order.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)

> See also: [PreparedIntentPlan v1 decision](prepared-intent-plan-v1-decision.md) — selects Option B: PreparedIntentPlan v1 as an artifact-backed phase/gate preparation artifact generated from IntentAssessmentReport plus existing Rekon context. Prepared status: prepared / blocked / needs-review / stale-assessment / insufficient-assessment; phases investigate / modify / refactor / verify / review; obligation categories capability-preservation / step-preservation / handoff-preservation / runtime-drift / finding-governance / freshness / verification / source-write-boundary. PreparedIntentPlan is phase/gate preparation, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. Verification requirements are not VerificationPlan. IntentStatusReport is the next layer; intent:go deferred; source-write behavior remains unavailable.

> See also: [PreparedIntentPlan artifact](../artifacts/prepared-intent-plan.md) — the read-only phase/gate preparation generated from an IntentAssessmentReport plus the Rekon context spine, via `rekon intent prepare`. Prepared status: prepared / blocked / needs-review / stale-assessment / insufficient-assessment; phases investigate / modify / refactor / verify / review; obligation categories capability-preservation / step-preservation / handoff-preservation / runtime-drift / finding-governance / freshness / verification / source-write-boundary. PreparedIntentPlan is phase/gate preparation, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. Verification requirements are not VerificationPlan. IntentStatusReport is the next layer; intent:go deferred; source-write behavior remains unavailable.

> See also: [PreparedIntentPlan Approval / Proof Model Decision](prepared-intent-plan-approval-proof-decision.md) — amends the PreparedIntentPlan architecture so a plan cannot be prepared without an explicit approval/proof envelope. PreparedIntentPlan.status.value can be prepared only when approval.status is approved; a plan with phases but without approval is not prepared. Approval cites the IntentAssessmentReport and records readiness, runtime-drift, handoff-coverage, freshness, verification, plan-structure, and source-write-boundary proof. Verification requirements are proof obligations, not VerificationPlan. PreparedIntentPlan does not create WorkOrder / VerificationPlan, execute commands, or write source; intent:go remains deferred. The shipped v1 implementation must be amended to add this envelope before it is treated as proof-bearing.

> Shipped (slice 83): PreparedIntentPlan v1 now carries the required approval/proof envelope — `status.value` can be prepared only when `approval.status` is approved, and a plan with phases but without approval is not prepared. Approval proof re-checks runtime drift, handoff coverage, freshness, and verification from artifact values; `downstreamHandoff.sourceWriteAllowed` is the literal `false`; `explicit-operator-approval` / `manual-risk-acceptance` are reserved reasons. It creates no WorkOrder / VerificationPlan, executes no commands, and writes no source; intent:go remains deferred. See [PreparedIntentPlan artifact](../artifacts/prepared-intent-plan.md) and [PreparedIntentPlan Approval / Proof Model Decision](prepared-intent-plan-approval-proof-decision.md).
