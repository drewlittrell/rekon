# Review Packet — Intent Prepare Needs-Review Planfulness Fix (slice 121)

Product-capability batch. Makes `rekon intent prepare` produce an implementation-bearing **draft**
plan when the assessment is `needs-review` with zero hard blockers, without auto-approving and
without weakening any handoff gate.

## CHANGES MADE

- `packages/capability-model/src/prepared-intent-plan.ts`:
  - Added optional `availableScripts?: string[]` to `BuildPreparedIntentPlanInput`.
  - Added `DRAFT_SCRIPT_REQUIREMENTS` + `deriveDraftVerificationRequirements(scripts, refList)` —
    derives safe default verification requirements (command strings only) from repo scripts; never
    empty for implementation-bearing drafts (falls back to a manual reviewer-gated requirement).
  - Added a `draftImplementationBearing` gate: `statusValue === "needs-review"` &&
    implementation-bearing kind && zero hard assessment blockers && matched context present.
  - Verification-requirement block now also emits draft requirements when `draftImplementationBearing`.
  - Phase block now emits implementation-bearing draft phases (investigate / modify|refactor / verify /
    review, all `needs-review`) when `draftImplementationBearing`; requirements attach to
    modify/refactor + verify.
- `packages/cli/src/index.ts`: `intent prepare` reads `package.json` scripts and passes
  `availableScripts` to `buildPreparedIntentPlan`.
- Tests: new `tests/contract/intent-prepare-needs-review-planfulness.test.mjs` (24 assertions); new
  `tests/docs/intent-prepare-needs-review-planfulness.test.mjs` (11 assertions); updated one existing
  `prepared-intent-plan.test.mjs` assertion (the needs-review case is now a draft, with a review-only
  case kept for `kind=unknown`).
- Docs: new `docs/strategy/intent-prepare-needs-review-planfulness.md`; this review packet; additive
  pointers in 7 supporting docs + CHANGELOG + README.

## PUBLIC API CHANGES

- `BuildPreparedIntentPlanInput` gains an **optional** `availableScripts?: string[]` (backward
  compatible: `undefined` assumes the standard safe trio — preserves prior prepared-path behavior).
- No CLI flags, commands, schemas, or artifact shapes changed. `PreparedIntentPlan` shape is
  unchanged; only the content for the needs-review draft case is richer (more phases + requirements).

## PURPOSE PRESERVATION CHECK

- **Original problem:** Rekon can build fresh-repo context and reach assessment without missing-spine
  blockers, but `intent prepare` produced only a review phase when the assessment was needs-review,
  leaving operators with no implementation-bearing plan to review or approve.
- **Product guarantee preserved:** `intent prepare` now produces a useful draft plan when the
  assessment has no hard blockers; the draft preserves `needs-review` approval state, includes
  implementation-bearing phases where the request requires work, includes verification requirements
  where safe defaults exist, and remains blocked from WorkOrder / VerificationPlan handoff until a
  future explicit approval bridge.
- **Verdict:** preserved. Approval/proof semantics are unchanged; only plan structure improved.

## ROOT CAUSE

Both the verification-requirement block and the implementation-phase block in `buildPreparedIntentPlan`
were gated on `statusValue === "prepared"`. Any `needs-review` plan fell through to a single
`phase:review` with no requirements, regardless of whether the request was implementation-bearing
with matched context and zero hard blockers.

## SOURCE REVIEW

The approval envelope (lines computing `approvalStatus` / `reasons` / `proof` /
`downstreamHandoff.workOrderAllowed = approvalStatus === "approved"`) already kept the plan
needs-review and the handoff gates closed. The fix is confined to the plan-structure generation
(phases + verification requirements) plus threading `availableScripts` from the CLI; the approval/proof
computation is untouched.

## PLANFULNESS POLICY

Hard-blocked / insufficient / stale assessments are unaffected. A `needs-review` assessment with zero
hard blockers and an implementation-bearing kind (`feature` / `bug` / `refactor` / `migration`) with
matched context yields an implementation-bearing draft that stays `needs-review` /
`approval.status = needs-review` / `recommendedNextAction = human-review`. `documentation` and
`unknown` stay review-only.

## PHASE MODEL

feature/bug/migration → investigate, modify, verify, review. refactor → investigate, refactor, verify,
review. All draft phases are `needs-review`.

## VERIFICATION REQUIREMENT MODEL

Derived from `package.json` scripts (command strings only, never executed): `typecheck` →
`npm run typecheck`, `test` → `npm test`, `build` → `npm run build`. Unknown script set → assume the
trio. Known set with none of these → a single `verify:manual-review` (no command). Never empty for
implementation-bearing drafts.

## APPROVAL BOUNDARY

No auto-approval. `approval.status` stays `needs-review`; `approval.reasons` continue to include the
unresolved proof issues; `downstreamHandoff.workOrderAllowed` / `verificationPlanAllowed` stay `false`.
No VerificationRun / VerificationResult is created; missing runtime proof is not treated as success.

## FRESH REPO ACCEPTANCE PROOF

Fresh fixture, after `scan` → `intent context prepare` → `intent assess` (needs-review, 0 blockers):

- `intent prepare`: `needs-review` / `needs-review`; phases investigate+modify+verify+review;
  requirements verify:typecheck/test/build attached to modify + verify.
- `intent work-order generate`: BLOCKED (`plan-not-approved`, `plan-not-prepared`,
  `next-action-not-work-order`, `status-not-work-ready`, `handoff-not-allowed`).
- `intent verification-plan generate`: BLOCKED.
- `artifacts validate`: `valid: true`. `src/index.ts`: unchanged.

## TESTS / VERIFICATION

- New contract test (24 assertions) — CLI-driven fresh-repo pipeline.
- New docs test (11 assertions).
- Updated `prepared-intent-plan.test.mjs` (draft + review-only cases) → 33/33.
- `intent-plan-bundle.test.mjs` 105/105, `cli-fresh-repo-intent-context.test.mjs` 4/4 unaffected.
- Full 9-command gate + CLI smoke (fresh-repo matrix).

## INTENTIONALLY UNTOUCHED

- Approval / proof computation; WorkOrder / VerificationPlan generation gates; `intent assess`,
  `scan`, `refresh`, `intent context prepare` behavior.
- No new artifact types; no VerificationRun / VerificationResult; no Circe; no `intent:go`; no source
  writes; no dependencies; no version bump.

## RISKS / FOLLOW-UP

- **Risk:** a future change could let the draft path flip approval or open a gate. **Mitigation:** the
  contract test asserts approval stays needs-review and both handoffs stay blocked; the approval
  computation is unchanged.
- **Follow-up:** Intent Operator Approval / Proof Acceptance Decision (explicit approval bridge).

## NEXT STEP

**Intent Operator Approval / Proof Acceptance Decision** — decide the explicit public command path
for an operator to approve a needs-review PreparedIntentPlan by accepting specific proof gaps after
rechecking freshness / drift. Still no auto-approval, no source writes, no command execution, no
`intent:go`.
