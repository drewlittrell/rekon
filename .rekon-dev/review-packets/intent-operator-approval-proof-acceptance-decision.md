# Review Packet — Intent Operator Approval / Proof Acceptance Decision (slice 122)

Strategy / architecture **decision-only** batch. Pins the explicit operator approval path that turns a
needs-review draft `PreparedIntentPlan` into a **new approved revision**. No code, CLI, package,
version, or runtime change.

## CHANGES MADE

- Added `docs/strategy/intent-operator-approval-proof-acceptance-decision.md` — the decision memo (12
  `##` sections; answers all 20 decision questions; option / gate / result / boundary tables; 9 pinned
  boundary statements; sketches the `IntentOperatorAcceptedRisk` type). Selects **Option B — a new
  approved PreparedIntentPlan revision**.
- Added `tests/docs/intent-operator-approval-proof-acceptance-decision.test.mjs` — 18 docs-contract
  assertions.
- Added this review packet.
- Additive doc pointers in: `docs/strategy/intent-prepare-needs-review-planfulness.md`,
  `docs/strategy/fresh-repo-intent-readiness-safety-review.md`, `docs/concepts/prepared-intent-plan.md`,
  `docs/concepts/intent-assessment.md`, `docs/concepts/intent-work-order-handoff.md`,
  `docs/concepts/intent-verification-plan-handoff.md`, `docs/concepts/intent-plan-bundle.md`,
  `docs/releases/v1-release-notes.md`, `docs/releases/v1-migration-notes.md`, `README.md`,
  `CHANGELOG.md`.

## PUBLIC API CHANGES

None. No CLI commands / flags, exports, types, schemas, or artifact shapes changed. `rekon intent
approve` and the `IntentOperatorAcceptedRisk` type are **decided** (documented) but **not
implemented**. `PreparedIntentPlan`, the approval/proof envelope, and the WorkOrder / VerificationPlan
gates behave exactly as at `204014a`.

## PURPOSE PRESERVATION CHECK

- **Original problem:** Rekon now creates implementation-bearing draft plans for needs-review
  assessments, but WorkOrder / VerificationPlan handoff correctly require a proof-approved
  `PreparedIntentPlan`. There is no explicit operator approval / proof-acceptance path, so fresh-repo
  plans stay blocked even after an operator reviews and accepts known proof gaps.
- **Product guarantee preserved:** approval is explicit, traceable, and rechecks freshness / drift /
  status before approving; it preserves the original draft (immutable) and produces a **new** approved
  artifact rather than mutating in place; it does not execute commands, run Circe, write source, or
  implement `intent:go`.
- **Verdict:** preserved. The decision encodes exactly these guarantees and weakens no gate.

## CODEBASE-INTEL ALIGNMENT

- Rekon prepares, proves, packages, and exports; Circe imports and orchestrates. Approval stays a
  preparation / proof act: it enables the Rekon → Circe handoff but creates no WorkOrder /
  VerificationPlan and runs nothing.
- Option B keeps a single source of approval truth (`PreparedIntentPlan.approval`) so the existing
  WorkOrder / VerificationPlan generators need no second lookup path.
- Sequences cleanly into Intent Operator Approval / Proof Acceptance Implementation without expanding
  Rekon's authority.

## CURRENT APPROVAL GAP

Grounded at `204014a` in `prepared-intent-plan.ts`: `approval = { status, reasons, proof, blockers }`;
`status = { value, recommendedNextAction }`; `approval.proof.downstreamHandoff = { workOrderAllowed:
approvalStatus === "approved", verificationPlanAllowed: approvalStatus === "approved", sourceWriteAllowed:
false }`; `approval.proof` carries `freshness` / `runtimeDrift` / `handoffCoverage` / `verification` /
`planStructure` / `intentAssessmentReportRef`. `IntentStatusReport.status.value` includes `work-ready`
and the report models high-severity blockers + a runtime-drift override. A needs-review draft is
correctly blocked from handoff; no command turns it into an approved plan. No field shape differs from
the decision's assumptions.

## OPTIONS CONSIDERED

| Option | Decision | Reason |
| --- | --- | --- |
| keep needs-review blocked forever | rejected | no operator path |
| new approved PreparedIntentPlan revision | selected | preserves gates and immutability |
| mutate existing plan | rejected | breaks auditability |
| separate IntentApprovalReport | rejected/deferred | dual-source approval state |
| inline approval in handoff generators | rejected | conflates approval and generation |
| auto-approve needs-review | rejected | hides proof gaps |

## APPROVAL GATE MODEL

Requires: needs-review source plan (not `not-approved` / already-approved); implementation-bearing
phases; verification requirements present for implementation work; `IntentStatusReport` with no
high-severity blockers; non-stale latest/pinned `PathFreshnessReport` for scoped paths; latest/pinned
`RuntimeGraphDriftReport` with no new high-severity drift; accepted gaps matching known proof gaps;
non-empty approval reason; `sourceWriteAllowed` stays `false`. Blocks on missing/already-approved/
not-approved source, hard blockers, missing-and-unaccepted proof refs, materially-changed freshness /
drift, unknown accepted gap, or missing reason.

## ACCEPTED RISK MODEL

Each accepted gap is recorded as an `IntentOperatorAcceptedRisk` (id, category, message, acceptedAt,
optional acceptedBy, reason, sourceRefs) — preferred placement `PreparedIntentPlan.approval.acceptedRisks`
(additive), alternative `approval.proof.operatorAcceptedRisks`. Categories: `verification-proof-missing`,
`runtime-drift-unresolved`, `handoff-coverage-not-evaluated`, `freshness-not-proven`,
`manual-review-required`, `other`. Gaps are recorded, not erased.

## RECHECK MODEL

Freshness: compare latest/pinned `PathFreshnessReport` to the source plan's freshness ref; block if
scoped paths are stale (v1 prefers blocking). Runtime drift: compare latest/pinned
`RuntimeGraphDriftReport` to the source plan's runtimeDrift ref; block on new high-severity drift; allow
already-represented unresolved drift that is explicitly accepted. Intent status: read latest/pinned
`IntentStatusReport`; block on high-severity blockers or incompatible status.

## APPROVED REVISION SEMANTICS

| Field | Approved Revision |
| --- | --- |
| status.value | prepared |
| approval.status | approved |
| approval.acceptedRisks | accepted proof gaps |
| downstreamHandoff.workOrderAllowed | true |
| downstreamHandoff.verificationPlanAllowed | true |
| downstreamHandoff.sourceWriteAllowed | false |
| WorkOrder | not created |
| VerificationPlan | not created |
| VerificationRun / VerificationResult | not created |

## BOUNDARY MODEL

| Boundary | Decision |
| --- | --- |
| approval vs auto-approval | explicit operator action only |
| approved revision vs mutation | new artifact revision |
| accepted risk vs erased risk | risk recorded, not hidden |
| approval vs WorkOrder handoff | enables, does not create |
| approval vs VerificationPlan handoff | enables, does not create |
| approval vs command execution | no commands |
| approval vs source writes | no writes |
| approval vs intent:go | deferred |

Pinned: explicit operator approval (never auto-approved); new revision, not mutation; accepted gaps
recorded not erased; freshness/drift rechecked before handoff; enables but does not create WorkOrder /
VerificationPlan; no VerificationRun/Result; no commands; no source writes; `intent:go` deferred.

## TESTS / VERIFICATION

- New docs test: `tests/docs/intent-operator-approval-proof-acceptance-decision.test.mjs` (18
  assertions) — title, 12 headings, Option-B selection, all 9 boundary statements, 4 tables, CHANGELOG
  mention, review-packet PURPOSE PRESERVATION CHECK.
- Full 9-command gate (no CLI smoke — decision-only batch).

## INTENTIONALLY UNTOUCHED

- All source (`prepared-intent-plan.ts`, `intent-status-report.ts`, handoff generators, CLI) — no
  approval command, no `acceptedRisks` field added, no gate changed.
- No artifact mutation, no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, no
  Circe, no `intent:go`, no dependencies, no version bump, no npm publish, no branch.

## RISKS / FOLLOW-UP

- **Risk:** the implementation could drift into mutating the source plan or opening a gate without a
  recheck. **Mitigation:** the docs test pins the boundaries; the implementation slice must honor them
  and add contract tests (recheck-gated, immutable source, no handoff creation).
- **Follow-up:** Intent Operator Approval / Proof Acceptance Implementation, then an Operator Approval
  Safety Review, then (only if wanted) a Stale-Context Acceptance Policy decision.

## NEXT STEP

**Intent Operator Approval / Proof Acceptance Implementation** — implement the explicit `rekon intent
approve` command that writes a new approved `PreparedIntentPlan` revision after accepted proof gaps and
rechecks. Still no auto-approval, no WorkOrder / VerificationPlan creation in approval, no command
execution, no source writes, no `intent:go`.
