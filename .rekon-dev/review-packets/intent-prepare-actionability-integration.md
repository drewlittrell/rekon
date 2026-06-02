# Review Packet — Intent Prepare Integration With Actionability Report

Slice 131 on the intent-spine track. Product-capability implementation: integrate
the shipped `IntentPlanActionabilityReport` into `rekon intent prepare` so plan
actionability gates preparation. Follows Intent Plan Actionability / Compiler Safety
Review at `fc3e1c2`.

## CHANGES MADE

- **capability-model** (`packages/capability-model/src/prepared-intent-plan.ts`):
  added `PreparedIntentActionabilityReportLike` structural type; added optional
  `intentPlanActionabilityReport` + `intentPlanActionabilityReportRef` inputs to
  `BuildPreparedIntentPlanInput`; added `mapReportPhaseKind`; pushed the report ref
  into the plan's `refList`; added the actionable-report phase/verification override
  (preserves order via zero-padded ids, kind, objective→goal, touchedPaths→paths,
  verification commands/evidence→verificationRequirements; deliverables + acceptance
  → phase constraints). Barrel re-exports the new Like type.
- **cli** (`packages/cli/src/index.ts`): `rekon intent prepare` now accepts
  `--actionability-report` (canonical) / `--plan-actionability-report` (alias),
  resolves + reads the report, **blocks** (exit 1, no PreparedIntentPlan) when the
  report is not actionable with a JSON/human revision-guidance payload, threads an
  actionable report into `buildPreparedIntentPlan`, records the ref in `header.inputRefs`,
  and surfaces it in success output. Updated `usage()` (prepare signature + flow line).
- **tests**: `tests/contract/intent-prepare-actionability-integration.test.mjs`
  (14 blocks / 27 WO assertions) + `tests/docs/intent-prepare-actionability-integration.test.mjs`
  (12 assertions).
- **docs**: 1 new strategy memo + this review packet + cross-references across the
  intent-spine docs + CHANGELOG + README.

## PUBLIC API CHANGES

- `@rekon/capability-model.buildPreparedIntentPlan` gains two optional inputs +
  exports `PreparedIntentActionabilityReportLike`. All additive / backward-compatible.
- `rekon intent prepare` gains an optional `--actionability-report` flag. No kernel
  type/validator change.

## PURPOSE PRESERVATION CHECK

The old codebase-intel system compiled, critiqued, decomposed, and interrogated
plans before approval; Rekon restored the report-only compiler (slice 129) and
safety-reviewed it (slice 130) but `intent prepare` did not yet respect it. This
slice makes preparation gate on actionability so weak plans cannot skip the compiler
loop. Preserved guarantees, verified against the shipped code + CLI smoke: raw plans
are reviewed before approval; non-actionable plans produce revision guidance, not a
prepared handoff (no PreparedIntentPlan is written); actionable reports become useful
PreparedIntentPlan structure (order/kind/paths/verification preserved); prepare
grants no approval; downstream handoff still requires explicit approval + work-ready
status.

## SOURCE REVIEW

Grounded in the real shapes at `fc3e1c2`: `PreparedIntentPhaseKind`
(investigate/modify/refactor/verify/review — no `unknown`); `PreparedIntentPlanStatus`
(prepared/blocked/needs-review/stale-assessment/insufficient-assessment — no
`revise-plan`); the factory `preparedIntentNormalizePhases` sorts phases by
`id.localeCompare` (→ zero-padded ids); `PREPARED_INTENT_SOURCE_OPTIONAL_FIELDS`
excludes actionability (→ ref carried in `header.inputRefs`).

## ACTIONABILITY REPORT INPUT

Optional, injected as a value + ref. `PreparedIntentActionabilityReportLike` reads
`status.value`, `summary`, `revisionPrompt`, and `normalizedPhases`. Absent flag =
existing behavior.

## ACTIONABLE REPORT PATH

For an implementation-bearing plan (prepared or needs-review draft) with an
actionable report, phases + verification requirements are derived from the report's
normalized drafts. Approval/status are unchanged.

## NON-ACTIONABLE REPORT PATH

CLI-level block: no PreparedIntentPlan written; exit 1; JSON `{ status: "blocked",
reason: "plan-actionability-<status>", actionabilityReport, summary, revisionPrompt,
boundaries(all false) }`; human output with revision steps + the no-downstream
boundary sentence.

## PREPARED PLAN MAPPING

order → zero-padded phase ids; kind → `mapReportPhaseKind` (unknown→modify);
objective → goal (fallback request goal); touchedPaths → paths; deliverables /
acceptance criteria → phase constraints (`deliverable:` / `acceptance:` prefixes);
verification commands/evidence → verificationRequirements; report ref → refList +
header.inputRefs.

## REVISION GUIDANCE PRESERVATION

The blocked path emits the report's `revisionPrompt.prompt`, findings count, and
questions count verbatim, plus the rerun commands.

## CLI SURFACE

`--actionability-report` canonical, `--plan-actionability-report` alias; type-checked
to `IntentPlanActionabilityReport`; help + flow updated.

## BOUNDARY MODEL

No PreparedIntentPlan on the blocked path; no WorkOrder / VerificationPlan /
VerificationRun / VerificationResult; no command execution; no source writes; no
Circe; no auto-approval; intent:go deferred. Verified by contract test + smoke.

## TESTS / VERIFICATION

Helper-level: order/kind/paths/verification preservation, not-auto-approved, clean
validation, unknown→modify, ref in sourceRefs. CLI-level: blocked exit 1 + no plan +
JSON shape; actionable writes one not-auto-approved plan with inputRefs citing the
report; WorkOrder still blocked; source unchanged; artifacts validate; help lists the
flag; backward-compat without the flag. Plus full 9-command gate.

## INTENTIONALLY UNTOUCHED

Kernel `PreparedIntentPlan` type/factory/validator; the plan-compiler implementation;
approval policy; all other commands. No version bump, no npm publish, no branch.

## RISKS / FOLLOW-UP

- Deliverables / acceptance criteria live in phase constraints (no dedicated kernel
  field). Documented limitation; a future additive PreparedIntentPhase field could
  carry them first-class.
- Answer / merge-back remains unimplemented (deferred).
- Safety review of this integration recommended next.

## NEXT STEP

Confirm and run **Intent Prepare Integration With Actionability Report Safety
Review** against the SHA produced by this batch.
