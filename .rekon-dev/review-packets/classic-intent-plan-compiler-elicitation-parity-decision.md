# Review Packet — Classic Intent Plan Compiler / Elicitation Parity Decision (slice 128)

> Decides the Rekon artifact/command model for plan intake, normalization,
> actionability, and revision feedback, restoring the old codebase-intel plan
> compiler + critique + elicitation loop. Full memo:
> [Classic Intent Plan Compiler / Elicitation Parity Decision](../../docs/strategy/classic-intent-plan-compiler-elicitation-parity-decision.md).
> Decision-only batch against `7eb6816`. No source, package, or version change; no npm publish.

## CHANGES MADE

- New `docs/strategy/classic-intent-plan-compiler-elicitation-parity-decision.md` (this decision).
- New `.rekon-dev/review-packets/classic-intent-plan-compiler-elicitation-parity-decision.md` (this packet).
- New `tests/docs/classic-intent-plan-compiler-elicitation-parity-decision.test.mjs` (20 assertions).
- Cross-reference pointers added to intent concept / strategy docs + roadmaps + CHANGELOG + README.

## PUBLIC API CHANGES

None. Decision-only. No types, helpers, CLI surfaces, validators, or runtime
behavior changed. The artifact/command model is *decided*, not built.

## PURPOSE PRESERVATION CHECK

Rekon prepares, proves, packages, and exports; Circe imports and orchestrates. The
plan-actionability layer is a prepare/prove capability: it normalizes a plan and
**proves what is missing** so the plan is approvable. It imports nothing,
orchestrates nothing, executes nothing, writes no source, and runs no Circe. The
V1 boundary holds (no command execution, no source writes, no Circe; `intent:go`
deferred). The one new capability — LLM-backed semantic normalization — is bounded
to read / transform / critique / elicit text and never crosses into execution.

## CODEBASE-INTEL ALIGNMENT

This restores the old codebase-intel plan-preparation intelligence (intake
sufficiency, normalization into phase drafts, actionability gates, elicitation)
that Rekon had not rebuilt, while keeping Rekon's stronger artifact / proof /
handoff infrastructure. The actionability report is a first-class intent-spine
artifact consumed alongside `IntentAssessmentReport` and `PreparedIntentPlan`.

## PARITY SUMMARY

Grounded against the live pipeline: `intent assess` checks artifact-context
sufficiency (not plan-material sufficiency); `intent prepare` projects a
`PreparedIntentPlan` from an assessment (it does not compile a raw plan);
`PreparedIntentPhase` lacks `deliverables` / `acceptanceCriteria` / `evidenceGates`
and there is no `actionability` / `elicitationQuestions` / `normalizationTrace`.
Verdict: current `PreparedIntentPlan` is not enough; the plan compiler + critique +
elicitation loop is the missing layer.

## SELECTED MODEL

Add a new read-only `IntentPlanActionabilityReport` + `rekon intent plan review`
(and/or `intent prepare --plan <file> --review`). Report references the plan,
never edits it. Rejected: full new-artifact set (Draft + Critique + Revision +
Actionability) and in-place `PreparedIntentPlan` extension.

## NORMALIZATION MODEL

Deterministic-first with LLM-backed semantic-normalization escalation **in scope**.
The model normalizes implicit / prose plans into executable phase drafts,
provenance-tagged, told not to invent missing requirements. Reads and transforms
text only — no commands, no source, no Circe. Rekon's first model-calling
capability in the intent pipeline, bounded to prepare/prove.

## ACTIONABILITY GATE MODEL

Per-phase and plan-level findings across ambiguity clearance → objective →
deliverables → acceptance criteria → implementation scope → verification evidence,
plus non-goals and evidence gates. Missing required fields become blocking
findings that block approval, mirroring the existing proof-gap gate.

## ELICITATION MODEL

Elicitation questions for the unmet requirements are surfaced in the report.
Report-first: the answer/merge-back loop is deferred to a later gated slice; the
first cut writes no plan.

## CLI SURFACE

`rekon intent plan review --plan <plan.md|PreparedIntentPlan:id|type:id>
[--assessment <ref>] [--root <path>] [--json]`, and/or `intent prepare --plan
<file> --review`. Review pass writes one `IntentPlanActionabilityReport` and no
plan; `--json` reports an all-false boundaries object.

## BOUNDARY MODEL

- The plan-actionability layer is report-only; it writes no source and mutates no plan.
- LLM-backed normalization reads and transforms plan text into structured drafts, findings, and questions; it executes no commands, writes no source, and runs no Circe.
- The actionability report proves what is missing; it does not auto-approve and does not auto-revise the plan.
- Missing required fields produce blocking actionability findings that block approval.
- The elicitation questions are surfaced; answers are merged back into the draft only in a later, gated implementation slice.
- IntentPlanActionabilityReport is the selected model; a full new-artifact set and in-place PreparedIntentPlan mutation are rejected for V1.
- The plan-actionability layer creates no WorkOrder, VerificationPlan, VerificationRun, or VerificationResult.
- The plan-actionability layer executes no commands, writes no source files, and runs no Circe.
- intent:go remains deferred.

## DECISION QUESTIONS

All nine answered in the memo: preserve the old intake/normalize/actionability/
elicitation behavior; current PreparedIntentPlan is not enough; add
IntentPlanActionabilityReport; add revision questions (surfaced, merge-back
deferred); `intent prepare` accepts raw plan files; deterministic-first with
LLM-backed escalation; missing fields become blocking findings; the report
enriches the Circe handoff; next slice is Intent Plan Actionability Report v1.

## RECOMMENDATION

Add the plan-actionability / revision layer before approval, anchored on a
report-first `IntentPlanActionabilityReport`. No blocker found.

## TESTS / VERIFICATION

- `tests/docs/classic-intent-plan-compiler-elicitation-parity-decision.test.mjs` (20 assertions).
- Nine-command verification gate. No CLI smoke required for a decision-only batch.

## INTENTIONALLY UNTOUCHED

`intent assess` / `intent prepare` / `intent approve` / `intent status transition`
behavior; the kernel types; every validator. Nothing is built this batch.

## RISKS / FOLLOW-UP

- LLM-backed normalization is a new capability boundary; the implementation slice
  must keep it read/transform-only, provenance-tagged, and gated.
- The report-first cut intentionally defers the answer/merge-back loop; operators
  revise plans manually until that slice ships.

## NEXT STEP

**Intent Plan Actionability Report v1** — kernel `IntentPlanActionabilityReport` +
deterministic `buildIntentPlanActionabilityReport` helper + `rekon intent plan
review` (report-only). LLM normalization, elicitation merge-back, and approval
coupling follow as separate gated slices.
