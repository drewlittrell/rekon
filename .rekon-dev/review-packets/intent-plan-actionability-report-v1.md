# Review Packet — IntentPlanActionabilityReport v1 Implementation

Slice 129 on the intent-spine track. Product-capability batch: the first
integrated Rekon **intent plan compiler** capability — register and implement
`IntentPlanActionabilityReport` plus the `rekon intent plan review` command.
Implements the report-first decision recorded in
`docs/strategy/classic-intent-plan-compiler-elicitation-parity-decision.md`.

## CHANGES MADE

- **kernel-repo-model** (`packages/kernel-repo-model/src/index.ts`): added
  `IntentPlanActionabilityReport` and its supporting types
  (`IntentPlanActionabilityStatus`, `IntentPlanSourceShape`,
  `IntentPlanNormalizationMethod`, `IntentPlanNormalizationProvenance`,
  `IntentPlanActionabilityRequirement`, `IntentPlanActionabilitySeverity`,
  `IntentPlanPhaseDraftKind`, `IntentPlanPhaseDraft`,
  `IntentPlanActionabilityFinding`, `IntentPlanElicitationQuestion`,
  `IntentPlanEvidenceGate`, …), the `createIntentPlanActionabilityReport`
  factory (normalize phases/findings/questions/gates, force the seven
  `boundaries` booleans to `false`, compute `summary`, assert),
  `validateIntentPlanActionabilityReport` / `assertIntentPlanActionabilityReport`
  (validate header via `validateModelHeader`, every enum/array, and the
  boundaries-must-be-`false` hard rule), and `intentPlanActionabilityReportSchema`.
- **sdk** + **runtime**: registered `IntentPlanActionabilityReport`
  (`BUILT_IN_ARTIFACT_TYPES` experimental `0.1.0`; `ARTIFACT_CATEGORY_BY_TYPE`
  `actions`).
- **capability-model**
  (`packages/capability-model/src/intent-plan-actionability-report.ts`):
  `buildIntentPlanActionabilityReport` — deterministic plan segmentation +
  field extraction (literal paths only, never invented), per-phase actionability
  evaluation over eight requirements, finding + elicitation-question generation,
  evidence-gate derivation, revision-prompt assembly, and an injectable
  `IntentPlanSemanticNormalizationAdapter` boundary with `off` / `auto` /
  `required` modes and provenance tagging. Barrel re-exports the builder, the
  adapter/input types, and `INTENT_PLAN_ACTIONABILITY_REPORT_ARTIFACT_ID_PREFIX`.
- **cli** (`packages/cli/src/index.ts`): added
  `rekon intent plan review --plan <path> [--goal] [--kind] [--semantic
  off|auto|required] [--root] [--json]` — reads the plan file, computes its
  sha256, calls the builder, writes ONE `IntentPlanActionabilityReport` to the
  `actions` category, and prints human / JSON output with the no-downstream
  boundary sentence. Added the command to `usage()` (workflow list, signature
  list, and the spine flow line).
- **tests**: `tests/contract/intent-plan-actionability-report.test.mjs` (21
  blocks / 60+ assertions) + `tests/docs/intent-plan-actionability-report.test.mjs`
  (12 assertions).
- **docs**: 3 new (`docs/artifacts/intent-plan-actionability-report.md`,
  `docs/concepts/intent-plan-compiler.md`,
  `docs/strategy/intent-plan-actionability-report-implementation.md`) +
  cross-references across the intent-spine docs + CHANGELOG + README + this
  review packet.

## PUBLIC API CHANGES

- New artifact type `IntentPlanActionabilityReport` (category `actions`,
  experimental `0.1.0`).
- New exported kernel types + `createIntentPlanActionabilityReport` /
  `validateIntentPlanActionabilityReport` / `assertIntentPlanActionabilityReport`
  / `intentPlanActionabilityReportSchema`.
- New `@rekon/capability-model.buildIntentPlanActionabilityReport` + adapter /
  input types + `INTENT_PLAN_ACTIONABILITY_REPORT_ARTIFACT_ID_PREFIX`.
- New `rekon intent plan review` CLI command. All additive.

## PURPOSE PRESERVATION CHECK

The classic codebase-intel system turned a raw plan into an actionable one
through normalization, phase decomposition, actionability checks, missing-info
questions, and revision feedback — *before* execution. Rekon's spine had
`IntentAssessmentReport` (context readiness) and `PreparedIntentPlan`
(proof-approved plan) but no review layer that judged whether a *written plan*
was actionable phase-by-phase. This slice restores that loop as a report-first
artifact. The implementation preserves the guarantee: it reads and transforms
plan **text** only, reports `actionable` / `needs-revision` / `blocked` with
findings + questions + a revision prompt, and does nothing else.

## BOUNDARY / SAFETY CHECK

- `boundaries` is seven booleans, all forced `false` by the factory and
  hard-required `false` by the validator: `executedCommands`,
  `wroteSourceFiles`, `createdPreparedIntentPlan`, `createdWorkOrder`,
  `createdVerificationPlan`, `ranCirce`, `implementedIntentGo`.
- CLI smoke confirms: a brain-dump plan reviews as `blocked` (TODO → critical
  ambiguity) with findings + questions + a revision prompt; a fully-specified
  plan reviews as `actionable`; the written artifact validates clean; the store
  contains exactly one `IntentPlanActionabilityReport` and zero downstream
  artifacts (`PreparedIntentPlan` / `WorkOrder` / `VerificationPlan` /
  `VerificationRun` / `VerificationResult`); repository source is unchanged.
- Deterministic parser extracts only literal path tokens; a no-paths phase
  yields an `implementation-scope` finding and an empty `touchedPaths` — verified
  by contract test.

## CODEBASE-INTEL ALIGNMENT

This is the intent plan compiler's front door. It re-establishes the
"plan → review → revise" loop the classic system relied on, while keeping every
execution-bearing step (prepare, approve, work order, verification, Circe
projection, `intent:go`) behind its existing gates.

## EXPLICITLY DEFERRED

- Answer / merge-back of elicitation answers into the plan.
- Plan approval / `PreparedIntentPlan` creation from a review.
- Concrete semantic-normalization provider wiring (the injectable adapter
  boundary shipped; no provider is connected — the only deferred part of the
  slice).
- `intent:go` and source-write behavior.

## SUGGESTED NEXT SLICE

Intent Plan Actionability / Compiler Safety Review — a ground-the-review pass
over the shipped artifact, helper, and CLI, with a `docs/strategy/…-safety-review.md`
memo, review packet, and docs test.
