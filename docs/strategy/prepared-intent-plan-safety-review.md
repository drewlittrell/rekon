# PreparedIntentPlan Safety Review

## Decision Summary

This review examines the amended `PreparedIntentPlan` v1 implementation
(`0d3957e`) end-to-end and finds it **safe and stable as proof-approved
phase/gate preparation**. The required approval/proof envelope shipped in the
PreparedIntentPlan v1 Approval / Proof Envelope Amendment is enforced by the
kernel validator, not merely produced by the helper: a plan reaches
`status.value === "prepared"` only when its `approval.status` is `approved`, and
the proof record re-checks assessment readiness, runtime drift, handoff
coverage, freshness, verification requirements, plan structure, and the
downstream handoff.

**PreparedIntentPlan must be proof-approved, not merely generated.**
**PreparedIntentPlan.status.value can be prepared only when approval.status is
approved.** **A plan with phases but without approval is not prepared.** The
preparation layer still creates no work or proof artifacts and performs no
execution: **Verification requirements are proof obligations, not
VerificationPlan.** **PreparedIntentPlan does not create WorkOrder or
VerificationPlan.** **PreparedIntentPlan does not create VerificationRun or
VerificationResult.** **PreparedIntentPlan does not execute commands.**
**PreparedIntentPlan does not write source files.** **IntentStatusReport remains
the next layer after preparation.** **intent:go remains deferred.**

The recommended next slice is the **IntentStatusReport v1 decision**.

## Why This Review Exists

The first `PreparedIntentPlan` implementation emitted phase/gate preparation
that could be marked `prepared` purely because the source assessment was
`ready-for-prepare`. The PreparedIntentPlan Approval / Proof Model Decision
declared that too weak and required an explicit approval/proof envelope; the
amendment shipped it. Before Rekon moves on to `IntentStatusReport`, the spine
must confirm that a prepared plan cannot be treated as safe unless its approval
proof says it is approved — and that the amendment did not silently open any
downstream boundary (WorkOrder, VerificationPlan, command execution, source
writes). This review is that confirmation; it changes no runtime behavior.

## Artifact And CLI Reviewed

- **Artifact** `PreparedIntentPlan` (category `actions`) — types, the required
  `approval` envelope (`status`, `reasons[]`, `proof`, `blockers[]`), the
  `createPreparedIntentPlan` factory + normalizers, and
  `validatePreparedIntentPlan` / `assertPreparedIntentPlan` /
  `preparedIntentPlanSchema` in `@rekon/kernel-repo-model`.
- **Helper** `@rekon/capability-model.buildPreparedIntentPlan` — reads the
  assessment plus runtime-drift / handoff-coverage / freshness /
  verification-result VALUES, computes approval status + reasons + proof,
  downgrades the prepared status from the final approval decision, and emits
  phases, obligations, verification requirements, and blocked reasons.
- **CLI** `rekon intent prepare --assessment <IntentAssessmentReport:id|type:id>
  [--root <path>] [--json]` plus the optional context flags — resolves inputs,
  reads the proof-bearing values, writes a `PreparedIntentPlan` under
  `.rekon/artifacts/actions/`, and prints `Approval:` / `Approval reasons:` (and
  `approval` in `--json`).

| Surface | Status | Boundary |
| --- | --- | --- |
| PreparedIntentPlan artifact | shipped | proof-approved preparation |
| intent prepare CLI | shipped | writes prepared plan only |
| approval/proof envelope | shipped | required for prepared status |
| WorkOrder / VerificationPlan | deferred | not created by preparation |
| intent:go | deferred | no execution |

## Approval / Proof Envelope Review

`approval` is a required field; a plan object without it fails validation. The
proof record (`approval.proof`) cites the `IntentAssessmentReport` by ref and
records `assessmentReadiness` / `assessmentApprovedForPrepare`, required-context
presence, a runtime-drift block (unresolved high-severity count), a
handoff-coverage block (uncovered / unresolved-contract / not-evaluated counts),
a freshness block (stale-context state), a verification block
(requirements-present + optional proof refs), a plan-structure block (phase-kind
booleans), and a downstream-handoff block whose `sourceWriteAllowed` is the
literal `false` (enforced by `validatePreparedIntentProof`).

The helper computes approval from the input VALUES rather than trusting
assessment readiness alone: high-severity unresolved runtime drift, uncovered or
unresolved-contract handoff coverage, and stale freshness each push a blocking
reason and force `not-approved`. Authorizing reasons
(`assessment-ready-for-prepare`) and the reserved reasons
(`explicit-operator-approval`, `intake-sufficient`, `manual-risk-acceptance`)
are modeled but the CLI adds no override behavior. The envelope is sound.

| Condition | V1 Behavior |
| --- | --- |
| ready-for-prepare + proof passes | approved |
| blocked assessment | not-approved |
| stale assessment | not-approved |
| insufficient assessment | not-approved |
| needs-review assessment | needs-review |
| high runtime drift unresolved | not-approved |
| uncovered handoff coverage | not-approved |
| implementation-bearing plan missing verification requirements | not-approved |

## Prepared Status Rule Review

The prepared status rule is enforced in the kernel, not just the helper.
`validatePreparedIntentPlan` rejects a plan whose `status.value` is `prepared`
when `approval.status` is not `approved`, and rejects `approved` on a `blocked`
/ `stale-assessment` / `insufficient-assessment` plan. The helper independently
downgrades: `ready-for-prepare` + `approved` → `prepared`; + `needs-review` →
`needs-review`; + `not-approved` → `blocked`; non-`ready-for-prepare`
readiness keeps the readiness-derived status. **A plan with phases but without
approval is not prepared.** Because the factory asserts via the validator, a
helper that produced an inconsistent plan would throw at construction. The rule
holds in both layers.

## Plan Structure Proof Review

`approval.proof.planStructure` records `phasesPresent` / `minimumPhaseCountMet` /
`hasInvestigation` / `hasImplementationOrRefactor` / `hasVerification` /
`hasReview`, and the validator enforces the structure for a `prepared` plan: at
least one phase; an implementation-bearing kind (`bug` / `feature` / `refactor`
/ `migration`) requires a `verify` phase; `refactor` requires a `refactor`
phase; `bug` / `feature` / `migration` require a `modify` phase; an `unknown`
kind cannot be `prepared` without an explicit approval reason (so the helper
routes unknown-kind requests to `needs-review`). Investigation/unknown plans
emit `investigate` + `review` only and are not implementation-bearing. The
structure proof is consistent with the phase generator.

## Verification Requirement Review

`verificationRequirements` express what would need to be proven — `id`, an
optional suggested `command`, a `reason`, optional `sourceRefs` — and are emitted
only for `prepared` plans. They are obligations, never a proof-command artifact.
**Verification requirements are proof obligations, not VerificationPlan.** The
generator materializes no `VerificationPlan`, executes no command, and creates no
`VerificationRun` / `VerificationResult`. Missing proof *results* are acceptable
at preparation time and recorded as `approval.proof.verification.proofResultsPresent`;
missing *requirements* are not acceptable for an implementation-bearing prepared
plan, which the validator rejects. The model is safe.

## WorkOrder / VerificationPlan Boundary Review

Preparation produces neither implementation guidance nor a proof-command
artifact. `approval.proof.downstreamHandoff.workOrderAllowed` and
`verificationPlanAllowed` are advisory flags (true only when approved) that
record *permission to proceed downstream*, not creation. The contract and CLI
smoke confirm no `WorkOrder` / `VerificationPlan` / `VerificationRun` is written
by `rekon intent prepare`. **PreparedIntentPlan does not create WorkOrder or
VerificationPlan.** **PreparedIntentPlan does not create VerificationRun or
VerificationResult.** The boundary is intact.

## Command / Source-Write Boundary Review

The helper reads only materialized artifact values passed in by the CLI; it
opens no source or event files and runs nothing. The CLI reads files/store and
writes a single artifact. `downstreamHandoff.sourceWriteAllowed` is the literal
`false`, enforced by the proof validator, and every prepared plan carries a
`source-write-boundary` obligation. **PreparedIntentPlan does not execute
commands.** **PreparedIntentPlan does not write source files.** The boundary is
intact.

## Intent Boundary Review

Preparation is the middle of the intent spine: assessment → preparation →
status → (later, separately decided) execution. The amendment did not implement
the next layer or any execution gate. **IntentStatusReport remains the next
layer after preparation.** **intent:go remains deferred.** Source-write behavior
remains unavailable.

| Boundary | Decision |
| --- | --- |
| PreparedIntentPlan vs WorkOrder | phase/gate preparation vs implementation guidance |
| PreparedIntentPlan vs VerificationPlan | verification requirements vs proof-plan artifact |
| PreparedIntentPlan vs VerificationRun | no command execution |
| PreparedIntentPlan vs source writes | no writes |
| PreparedIntentPlan vs IntentStatusReport | prepared plan before status reporting |
| PreparedIntentPlan vs intent:go | execution deferred |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare v1 safe/stable proof-approved preparation | selected | approval envelope enforces proof |
| IntentStatusReport decision next | selected | next layer after preparation |
| publication surfacing next | deferred | CLI visibility sufficient for now |
| WorkOrder / VerificationPlan creation next | rejected | status/governance boundary first |
| intent:go next | rejected | execution remains deferred |

- **Declare v1 safe/stable as proof-approved phase/gate preparation.** Selected:
  the kernel enforces the approval/proof envelope and all boundaries hold.
- **IntentStatusReport v1 decision next.** Selected: assessment and
  proof-approved preparation now exist; the next layer should decide how intent
  status is reported across the spine.
- **PreparedIntentPlan publication / operator-surface decision next.** Deferred:
  the CLI already exposes the approval status and reasons; richer surfacing can
  follow IntentStatusReport.
- **WorkOrder / VerificationPlan creation from PreparedIntentPlan next.**
  Rejected: status reporting and governance must come before downstream
  creation.
- **intent:go next.** Rejected: execution and source writes remain deferred.

## Recommendation

**PreparedIntentPlan v1 is safe/stable as proof-approved phase/gate
preparation.** Proceed to the **IntentStatusReport v1 decision**. Assessment and
proof-approved preparation now exist; the next layer should decide how Rekon
reports assessed / prepared / blocked / stale / verified / complete intent state
across `IntentAssessmentReport`, `PreparedIntentPlan`, `WorkOrder`,
`VerificationPlan`, `VerificationRun`, `VerificationResult`, `PathFreshnessReport`,
and `RuntimeGraphDriftReport`. If caution is preferred, a PreparedIntentPlan
publication / operator-surface decision is the alternative — but the default is
IntentStatusReport v1 decision because the artifact and CLI already expose status
and approval state.

## What This Does Not Do

This review changes no runtime behavior. It implements no `IntentStatusReport`
and no `intent:go`. It creates no `WorkOrder` / `VerificationPlan` /
`VerificationRun` / `VerificationResult`, executes nothing, writes no source,
adds no source-write apply, imports nothing from classic codebase-intel, bumps no
version, and publishes nothing. **PreparedIntentPlan does not create WorkOrder or
VerificationPlan.** **PreparedIntentPlan does not execute commands.**
**PreparedIntentPlan does not write source files.**

## Follow-Up Work

1. **IntentStatusReport v1 decision** — decide how intent status is reported
   across the assessment / preparation / work / verification / freshness / drift
   spine. Still no `IntentStatusReport` implementation; still no `WorkOrder` /
   `VerificationPlan` creation from intent; still no command execution; still no
   source writes.
2. Later, separately decided: `IntentStatusReport` implementation, then an
   `IntentGoDecision` execution gate + source-write policy.

## Cross-References

- [PreparedIntentPlan Approval / Proof Model Decision](prepared-intent-plan-approval-proof-decision.md)
- [PreparedIntentPlan v1 decision](prepared-intent-plan-v1-decision.md)
- [PreparedIntentPlan artifact](../artifacts/prepared-intent-plan.md)
- [Prepared intent plan concept](../concepts/prepared-intent-plan.md)
- [IntentAssessmentReport safety review](intent-assessment-report-safety-review.md)
- [Intent capability spine integration review](intent-capability-spine-integration-review.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)
