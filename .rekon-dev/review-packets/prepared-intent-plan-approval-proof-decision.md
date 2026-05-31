# Review Packet — PreparedIntentPlan Approval / Proof Model Decision

Slice 82 on the capability-ontology track. Strategy / architecture-decision
batch. Amends the `PreparedIntentPlan` architecture so a plan cannot be
considered prepared unless it carries an explicit approval/proof envelope. This
follows the PreparedIntentPlan v1 Decision (`a7feb33`) and supersedes the next
implementation slice as previously written; the un-amended v1 implementation
shipped at `decc93c` and must be amended before it is treated as a finished
proof-bearing preparation layer. No code is implemented and no schema is
changed in this batch.

## CHANGES MADE

- New strategy memo
  `docs/strategy/prepared-intent-plan-approval-proof-decision.md` (16 headings;
  option / approval / proof / boundary tables; approval + proof models;
  prepared-requires-approved rule).
- New 17-assertion docs test
  `tests/docs/prepared-intent-plan-approval-proof-decision.test.mjs`.
- Cross-reference updates to the PreparedIntentPlan v1 decision + artifact +
  concept, the IntentAssessmentReport safety review / v1 decision, the
  integration review, the intent-assessment-report + work-order +
  verification-plan / run / result + runtime-graph-drift-report +
  handoff-coverage-report + path-freshness-report docs, the intent-assessment +
  agent-operating-contract + remediation-work-orders concepts, both roadmaps,
  README, and CHANGELOG.
- This review packet.

## PUBLIC API CHANGES

None. Docs-only batch. No `packages/` source, artifact type, CLI command,
validator, factory, or schema changed.

## PURPOSE PRESERVATION CHECK

- **Original problem.** PreparedIntentPlan v1 was specified, and shipped
  (`decc93c`), as phase/gate preparation that can reach `prepared` from a
  `ready-for-prepare` assessment without an explicit approval/proof record.
  Classic preparation required proof/authorization before a plan was approved;
  Rekon must not weaken that standard by allowing a generated plan to be marked
  prepared without evidence.
- **Guarantee preserved.** `PreparedIntentPlan` is proof-approved preparation.
  Prepared status requires approval. Approval cites the assessment and readiness
  evidence, records why preparation is authorized, and records graph-spine,
  freshness, handoff, drift, and verification proof state. Verification
  requirements are proof obligations, not `VerificationPlan`. `WorkOrder` /
  `VerificationPlan` / command execution / source writes remain downstream and
  unavailable. This memo pins those guarantees before the amended implementation
  ships.

## CODEBASE-INTEL ALIGNMENT

Uses the integration review's recorded classic-source findings rather than
re-copying classic code: plan output was allowed only through explicit
authorization or intake sufficiency (`PlanIntakeSufficiency.ts`); placeholder /
empty data did not satisfy intake sufficiency; planning while `not_ready`
without an approved reason was a critical violation (`itoReadiness.test.ts`);
plan output required minimum structure; post-stream proof expectations included
trajectory, plan-review, evaluator recordings, and added evidence
(`judge-run.ts`, `ito.criteria.yaml`). Rekon preserves that proof-before-plan
discipline and improves it with the Rekon graph spine — recorded honestly, not
literal classic behavior. Nothing from classic codebase-intel is imported.

## CLASSIC PROOF DISCIPLINE

Plan-output authorization (explicit authorization OR intake sufficiency =
desire + structure + grounding); no premature plan while not-ready;
minimum plan structure; post-stream proof expectations. Rekon improves this with
`IntentAssessmentReport` readiness, `RuntimeGraphDriftReport`,
`HandoffCoverageReport`, `PathFreshnessReport`, and verification refs.

## OPTIONS CONSIDERED

- A — keep prior v1 shape: rejected (weakens proof-before-plan discipline).
- B — required approval/proof envelope: **selected** (preserves classic plan
  authorization).
- C — approval only in assessment: rejected (prepared plan needs its own proof).
- D — defer proof to WorkOrder: rejected (WorkOrder should consume an approved
  plan).
- E — defer proof to VerificationPlan: rejected (proof command planning cannot
  authorize preparation).

## APPROVAL MODEL

`PreparedIntentPlanApproval { status (approved / not-approved / needs-review),
reasons[], proof, blockers[] }`. Reasons carry both authorizing reasons
(assessment-ready-for-prepare / explicit-operator-approval / intake-sufficient /
manual-risk-acceptance) and blocking reasons (blocked-assessment /
stale-assessment / insufficient-context / runtime-drift-unresolved /
handoff-coverage-unresolved / verification-proof-missing). `blockers` reuse the
existing `PreparedIntentObligation` shape.

## PROOF MODEL

`PreparedIntentPlanApprovalProof` records: `intentAssessmentReportRef` +
`assessmentReadiness` + `assessmentApprovedForPrepare`; `requiredContextPresent`
+ `missingContext`; optional `intakeSufficiency`; `runtimeDrift`
(unresolvedHighSeverity + accepted + ref); `handoffCoverage` (uncovered /
unresolvedContract / notEvaluated + accepted + ref); `freshness` (staleContext +
accepted + ref); `verification` (requirementsPresent / proofResultsPresent /
verificationRefs); `planStructure` (phase-presence booleans); `downstreamHandoff`
(workOrderAllowed / verificationPlanAllowed / sourceWriteAllowed=false).

## PREPARED STATUS RULE

`PreparedIntentPlan.status.value` can be `prepared` only when `approval.status`
is `approved`. A plan with phases but without approval is not prepared; a
non-`approved` envelope forces a non-`prepared` `status.value`.

## APPROVAL POLICY

Assessment required; prepared requires approved; approved requires
ready-for-prepare or an explicit accepted reason; blocked / stale /
insufficient → not-approved; needs-review → needs-review unless explicit
operator approval; high-severity unresolved drift / uncovered or
unresolved-contract handoff / stale context block approval unless accepted;
verification requirements must exist for implementation-bearing work; source
writes always false.

## PLAN STRUCTURE PROOF

prepared plans have phases; implementation-bearing plans include a verify phase;
refactor → refactor phase; bug/feature/migration → modify phase; investigation →
investigate + review only; unknown → needs-review unless approved.
`approval.proof.planStructure` records these as booleans.

## VERIFICATION PROOF

`verificationRequirements` are proof obligations, not `VerificationPlan`; they
execute no commands and create no `VerificationPlan`; proof results are cited as
refs; missing results may be acceptable at preparation time, but missing
requirements are not acceptable for implementation-bearing plans.

## BOUNDARY MODEL

Approval is the plan's own proof (assessment is source proof); no WorkOrder /
VerificationPlan creation; requirements only, no proof-plan artifact; no command
execution; `sourceWriteAllowed=false`; intent:go execution deferred. The
approval envelope adds proof; it relaxes no downstream boundary.

## TESTS / VERIFICATION

- New docs test (17 assertions): memo exists, all 16 headings, selects the
  required approval/proof envelope, eight boundary statements, option / approval
  / proof / boundary tables, CHANGELOG mention, and this packet's PURPOSE
  PRESERVATION CHECK.
- Full gate: `npm run typecheck`, `npm run test`, `npm run build`,
  `git diff --check`, `node scripts/audit-package-exports.mjs`, `node
  scripts/audit-license.mjs`, `node scripts/publish-dry-run.mjs`, `node
  scripts/install-smoke.mjs`, `node scripts/install-tarball-smoke.mjs`. No CLI
  smoke (strategy-only).

## INTENTIONALLY UNTOUCHED

All `packages/` source (including the shipped `PreparedIntentPlan` types /
factory / validator / schema / helper / CLI — amended in the next slice, not
this one); every existing artifact type and schema; `IntentAssessmentReport`;
the graph spine; `WorkOrder` / `VerificationPlan` / `VerificationRun` /
`VerificationResult` / `PathFreshnessReport`; `IntentStatusReport` /
`IntentGoDecision` (deferred); all version numbers; classic codebase-intel (not
imported); `pnpm-lock.yaml`.

## RISKS / FOLLOW-UP

- The shipped PreparedIntentPlan v1 (`decc93c`) lacks the approval envelope;
  until the amended implementation slice ships, "prepared" plans it emits are
  not proof-bearing and must not be treated as authorized.
- The approval/proof shapes here are sketches; the amended implementation slice
  fixes factory / validator / schema (including the `prepared ⇒ approved`
  invariant) precisely before re-shipping.
- "Accepted" exceptions (operator approval / risk acceptance) must be recorded
  as explicit reasons, never inferred, so an approved plan always cites why a
  blocker was accepted.

## NEXT STEP

PreparedIntentPlan v1 implementation, amended with the approval/proof envelope —
amend the shipped `PreparedIntentPlan` to add the required `approval` envelope +
proof record and enforce `prepared ⇒ approved`. Still no `WorkOrder` /
`VerificationPlan` creation, no command execution, and no source writes.
