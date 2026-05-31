# IntentAssessmentReport v1 Decision

## Decision Summary

The Intent Capability Spine Integration Review (`64213df`) selected a staged
Rekon intent spine — `IntentAssessmentReport` → `PreparedIntentPlan` →
`IntentStatusReport`, with an `IntentGoDecision` execution gate deferred — and
named `IntentAssessmentReport` the first implementation target. This memo fixes
its v1 shape, inputs, readiness model, blocker model, and request/scope model
before any code is written.

**The decision selects the artifact-backed readiness assessment option
(Option B):** `IntentAssessmentReport` v1 is a read-only assessment generated
from a user request plus the existing Rekon context artifacts (capability,
step, handoff, coverage, observation, drift, finding, freshness, and proof
surfaces). It assesses whether the requested intent is ready to be *prepared*,
records blockers / warnings / missing context, and recommends a next action —
it does not prepare phases, create work, run anything, or write source.

The boundaries are pinned. **IntentAssessmentReport is assessment, not
WorkOrder.** **IntentAssessmentReport does not create WorkOrder or
VerificationPlan.** **IntentAssessmentReport does not execute commands.**
**IntentAssessmentReport does not write source files.** **PreparedIntentPlan
remains the next layer after assessment.** **IntentStatusReport remains
deferred.** **intent:go remains deferred.** **RuntimeGraphDriftReport is an
input to readiness, not the intent system itself.**

This is a decision/architecture batch only. No artifact type is registered, no
generator is implemented, and no CLI command is added.

## Why This Decision Exists

Rekon now has the full codebase-intelligence spine needed to judge whether a
requested change is safe to prepare: capability map / contract, the
step/handoff/runtime-graph/drift spine, finding + lifecycle governance, proof
(`VerificationPlan` / `VerificationRun` / `VerificationResult`), and source
freshness (`PathFreshnessReport`). What it lacks is a first-class *assessment*
artifact that reads a user request and reports readiness against that spine.

Classic codebase-intel performed an analogous assessment before preparation:
its `intent:assess` classified the request and its readiness was gate-based
(actionability requirements) plus hash/staleness-based. **Honest correction
carried from the integration review:** classic intent assessment did **not**
consume the step/handoff/runtime-graph/drift spine — that wiring is a
Rekon-native extension, not literal classic behavior, and is recorded as such.
This memo pins the Rekon assessment so implementation does not drift into
WorkOrder territory, premature preparation, or execution.

## Current Boundary

`WorkOrder` already exists as implementation guidance, and the proof spine
(`VerificationPlan` / `VerificationRun` / `VerificationResult`) already exists
as command-backed proof. Neither answers "is this request ready to prepare,
and what is missing or stale or drifted?" `PreparedIntentPlan`,
`IntentStatusReport`, and `IntentGoDecision` do not exist yet and remain
deferred. `IntentAssessmentReport` fills the assessment gap at the front of the
intent spine without overlapping any of these surfaces.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| WorkOrder as assessment | rejected | guidance is not readiness assessment |
| artifact-backed readiness assessment | selected | preserves gate/staleness behavior |
| PreparedIntentPlan first | rejected | assessment required first |
| IntentStatusReport first | rejected | status needs assessment target |
| IntentGoDecision first | rejected | execution deferred |

- **Option A — `WorkOrder` as intent assessment.** Rejected: `WorkOrder` is
  implementation guidance, not request / scope / readiness assessment.
- **Option B — artifact-backed readiness assessment.** Selected:
  `IntentAssessmentReport` consumes a request plus existing Rekon artifacts to
  assess readiness, preserving classic gate/staleness intent behavior while
  extending it with Rekon's graph spine.
- **Option C — `PreparedIntentPlan` first.** Rejected: preparation requires an
  assessment of context, blockers, drift, handoff coverage, and proof state.
- **Option D — `IntentStatusReport` first.** Rejected: status needs an
  assessment artifact to report against.
- **Option E — `IntentGoDecision` first.** Rejected: execution remains deferred
  until assessment, preparation, status, proof, and a source-write policy
  exist.

## Recommendation

Adopt **Option B**. `IntentAssessmentReport` v1 is an artifact-backed readiness
assessment generated from request input plus existing Rekon context artifacts.
It emits a readiness status, blockers, warnings, missing context, matched
context, and a recommended next action. It **does not** generate `WorkOrder`
or `VerificationPlan` in v1, execute commands, or write source. The next slice
is `IntentAssessmentReport` v1 implementation (read-only generator); the slice
after assessment is `PreparedIntentPlan`.

## Request / Scope Model

The request is the only required input. v1 models it structurally so the
generator reads values, not files:

- `goal` (required string) — what the user wants to accomplish.
- `kind` — `bug` / `feature` / `refactor` / `investigation` / `migration` /
  `unknown`.
- `scope?` — optional `paths` / `systems` / `capabilities` / `steps` hints.
- `constraints?` — declared constraints.
- `nonGoals?` — explicit out-of-scope statements.

Scope hints are advisory; the assessment resolves them against the matched
context model below and records ambiguity as a `scope-ambiguous` blocker rather
than guessing.

## Input Model

| Input | V1 Decision |
| --- | --- |
| user request / goal | required |
| CapabilityMap v2 | consumed when available |
| StepCapabilityGraph | expected |
| HandoffCoverageReport | consumed when available |
| RuntimeGraphDriftReport | expected |
| PathFreshnessReport | consumed when available |
| VerificationResult | consumed when available |
| WorkOrder | reference only, not produced |

All artifact inputs are read as already-materialized Rekon artifacts (latest or
pinned) and cited by `ArtifactRef`; the generator reads values, never raw
source or event files, and mutates nothing. Beyond the table, v1 may also
consume an optional `IntelligenceSnapshot`, `CapabilityContract`,
`HandoffContract`, `RuntimeGraphObservationReport`, `FindingReport`,
`BridgeFindingLifecycleIntegrationReport`, and `VerificationRun` /
`VerificationPlan` when available. `StepCapabilityGraph` and
`RuntimeGraphDriftReport` are *expected*: their absence produces a
`missing-artifact` blocker unless an input explicitly allows it.

## Readiness Model

| Readiness | Meaning |
| --- | --- |
| ready-for-prepare | enough context to prepare safely |
| blocked | critical blocker present |
| needs-review | ambiguity / medium-risk blocker |
| insufficient-context | cannot map request to repo context |
| stale-context | freshness says context is stale |

Readiness carries an optional `score` and a required `recommendedNextAction`
(`prepare-intent` / `refresh-context` / `resolve-blockers` /
`ask-clarifying-question` / `run-verification` / `human-review`). The status
policy:

1. A required input (the user request / goal) is mandatory.
2. Missing `StepCapabilityGraph` / `RuntimeGraphDriftReport` produces a
   `missing-artifact` blocker unless explicitly allowed.
3. `RuntimeGraphDriftReport` rows with high-severity unresolved drift produce a
   `runtime-drift` blocker.
4. `HandoffCoverageReport` uncovered / unresolved rows produce a
   `handoff-coverage` blocker or warning.
5. `PathFreshnessReport` stale paths produce `stale-context` readiness.
6. Missing `VerificationResult` may produce a `proof-missing` warning, not a
   hard blocker, unless the requested action requires proof.
7. Ambiguous request scope produces a `scope-ambiguous` blocker.
8. `source-write-unavailable` is a blocker only when the request implies direct
   source writes; otherwise a warning.
9. `IntentAssessmentReport` recommends `prepare-intent` only when blockers are
   empty or low severity.
10. It never creates `WorkOrder` or `VerificationPlan`.

## Blocker Model

Blockers, warnings, and missing-context entries share one shape so the three
lists are uniform and recomputable. Categories: `missing-artifact` /
`stale-context` / `runtime-drift` / `handoff-coverage` / `finding-governance`
/ `proof-missing` / `scope-ambiguous` / `source-write-unavailable`.

```ts
type IntentAssessmentBlocker = {
  id: string;
  category:
    | "missing-artifact"
    | "stale-context"
    | "runtime-drift"
    | "handoff-coverage"
    | "finding-governance"
    | "proof-missing"
    | "scope-ambiguous"
    | "source-write-unavailable";
  severity: "low" | "medium" | "high";
  message: string;
  sourceRefs?: ArtifactRef[];
};
```

`blockers` gate readiness (high severity → `blocked`); `warnings` inform but do
not gate; `missingContext` records absent inputs the assessment wanted. Each
entry cites the artifacts it derives from via `sourceRefs` and copies no raw
payloads.

## Matched Context Model

The assessment resolves the request against repo intelligence into a
`matchedContext` of `systems` / `capabilities` / `steps` / `paths`. An empty
match (request cannot be mapped to any repo context) yields
`insufficient-context` readiness. The match is evidence for the recommended
next action and for `scope-ambiguous` blockers; it is descriptive, not a plan.

## Boundary Model

| Boundary | Decision |
| --- | --- |
| IntentAssessmentReport vs WorkOrder | assessment vs implementation guidance |
| IntentAssessmentReport vs PreparedIntentPlan | assessment before phase planning |
| IntentAssessmentReport vs IntentStatusReport | assessment target before status |
| IntentAssessmentReport vs VerificationResult | readiness vs proof result |
| IntentAssessmentReport vs source writes | no writes |
| IntentAssessmentReport vs intent:go | execution deferred |

**IntentAssessmentReport is assessment, not WorkOrder** — `WorkOrder` is
implementation guidance produced after preparation. **IntentAssessmentReport
does not create WorkOrder or VerificationPlan**, **does not execute commands**,
and **does not write source files**. **RuntimeGraphDriftReport is an input to
readiness, not the intent system itself**: drift, handoff coverage, and
freshness feed the readiness verdict but are not re-evaluated or mutated here.

## Follow-On Artifacts

**PreparedIntentPlan remains the next layer after assessment** — it turns a
`ready-for-prepare` assessment into phase plans (still not source-write
execution). **IntentStatusReport remains deferred**; it will later report
lifecycle state over assessment / plan / proof / freshness inputs (it is not a
`VerificationResult`). **intent:go remains deferred** as a future
`IntentGoDecision` execution gate, contingent on a separately-decided
source-write and execution policy.

## What This Does Not Do

This decision implements no `IntentAssessmentReport`, registers no artifact
type, adds no CLI command, and implements no `PreparedIntentPlan` /
`IntentStatusReport` / `IntentGoDecision`. It mutates no `WorkOrder`,
`VerificationPlan`, `RuntimeGraphDriftReport`, or `PathFreshnessReport`;
creates no `WorkOrder` / `VerificationPlan`; executes nothing; writes no source;
imports nothing from classic codebase-intel; bumps no version; and publishes
nothing.

## Implementation Sequence

1. **IntentAssessmentReport v1 decision** (this memo).
2. **IntentAssessmentReport v1 implementation** — register the artifact type
   and a read-only generator from the user request plus existing Rekon
   artifacts (`RuntimeGraphDriftReport`, `PathFreshnessReport`,
   `VerificationResult` when available), emitting readiness / blockers /
   warnings / missing context / matched context / recommended next action. No
   `WorkOrder` / `VerificationPlan` creation, no execution, no source writes.
3. **IntentAssessmentReport safety review**, then **PreparedIntentPlan** →
   **IntentStatusReport** → (later, separately decided) **IntentGoDecision**.

## Cross-References

- [Intent Capability Spine Integration Review](intent-capability-spine-integration-review.md)
- [RuntimeGraphDriftReport safety review](runtime-graph-drift-report-safety-review.md)
- [RuntimeGraphDriftReport artifact](../artifacts/runtime-graph-drift-report.md)
- [HandoffCoverageReport artifact](../artifacts/handoff-coverage-report.md)
- [StepCapabilityGraph artifact](../artifacts/step-capability-graph.md)
- [WorkOrder artifact](../artifacts/work-order.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [VerificationResult artifact](../artifacts/verification-result.md)
- [Path freshness report artifact](../artifacts/path-freshness-report.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)

> See also: [IntentAssessmentReport artifact](../artifacts/intent-assessment-report.md) — the read-only readiness assessment of a user request against the Rekon context spine (CapabilityMap, StepCapabilityGraph, HandoffCoverageReport, RuntimeGraphDriftReport, PathFreshnessReport, VerificationResult), via `rekon intent assess`. Readiness: ready-for-prepare / blocked / needs-review / insufficient-context / stale-context. IntentAssessmentReport is assessment, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. RuntimeGraphDriftReport is an input to readiness, not the intent system itself. PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred.

> See also: [IntentAssessmentReport safety review](intent-assessment-report-safety-review.md) — declares IntentAssessmentReport v1 safe / stable as read-only readiness assessment (no blocker): assessment, not WorkOrder; creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult; executes no commands; writes no source; RuntimeGraphDriftReport is an input to readiness, not the intent system itself; PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred. Recommended next slice: PreparedIntentPlan v1 decision.

> See also: [PreparedIntentPlan v1 decision](prepared-intent-plan-v1-decision.md) — selects Option B: PreparedIntentPlan v1 as an artifact-backed phase/gate preparation artifact generated from IntentAssessmentReport plus existing Rekon context. Prepared status: prepared / blocked / needs-review / stale-assessment / insufficient-assessment; phases investigate / modify / refactor / verify / review; obligation categories capability-preservation / step-preservation / handoff-preservation / runtime-drift / finding-governance / freshness / verification / source-write-boundary. PreparedIntentPlan is phase/gate preparation, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. Verification requirements are not VerificationPlan. IntentStatusReport is the next layer; intent:go deferred; source-write behavior remains unavailable.

> See also: [PreparedIntentPlan artifact](../artifacts/prepared-intent-plan.md) — the read-only phase/gate preparation generated from an IntentAssessmentReport plus the Rekon context spine, via `rekon intent prepare`. Prepared status: prepared / blocked / needs-review / stale-assessment / insufficient-assessment; phases investigate / modify / refactor / verify / review; obligation categories capability-preservation / step-preservation / handoff-preservation / runtime-drift / finding-governance / freshness / verification / source-write-boundary. PreparedIntentPlan is phase/gate preparation, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. Verification requirements are not VerificationPlan. IntentStatusReport is the next layer; intent:go deferred; source-write behavior remains unavailable.

> See also: [PreparedIntentPlan Approval / Proof Model Decision](prepared-intent-plan-approval-proof-decision.md) — amends the PreparedIntentPlan architecture so a plan cannot be prepared without an explicit approval/proof envelope. PreparedIntentPlan.status.value can be prepared only when approval.status is approved; a plan with phases but without approval is not prepared. Approval cites the IntentAssessmentReport and records readiness, runtime-drift, handoff-coverage, freshness, verification, plan-structure, and source-write-boundary proof. Verification requirements are proof obligations, not VerificationPlan. PreparedIntentPlan does not create WorkOrder / VerificationPlan, execute commands, or write source; intent:go remains deferred. The shipped v1 implementation must be amended to add this envelope before it is treated as proof-bearing.
