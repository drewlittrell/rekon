# Intent Plan Actionability Report — Implementation

## Status

Shipped (slice 129). This memo records *how* the first integrated intent
plan-compiler capability was built, and the boundaries that were deliberately
held.

**Reviewed (safety review):** the shipped capability was reviewed end-to-end and
declared safe/stable as a read / transform / report-only layer (no blocker) — see
[`intent-plan-actionability-report-safety-review.md`](./intent-plan-actionability-report-safety-review.md).
The recommended next slice is Intent Prepare Integration With Actionability Report.

This is the implementation of the decision recorded in
[`classic-intent-plan-compiler-elicitation-parity-decision.md`](./classic-intent-plan-compiler-elicitation-parity-decision.md):
add a **report-first** plan-review layer (`IntentPlanActionabilityReport`) rather
than a mutating plan rewriter, and do it in **one bounded slice** to avoid the
"30-slice trap" of shipping a compiler one inert sub-artifact at a time.

> **Provider routing (slice 137):** the deferred live-provider wiring for semantic normalization is now decided as
> a shared `RekonLlmRouter` (task routes, injected adapters, `--llm-provider` / `--llm-model`), kept out of the
> report builder; providers may read/transform/critique text but never approve/execute/write source/run
> Circe/implement `intent:go`, and LLM output is proposal, not proof — see
> [`rekon-llm-provider-routing-semantic-normalization-decision.md`](./rekon-llm-provider-routing-semantic-normalization-decision.md).

## What shipped

- A kernel artifact: `IntentPlanActionabilityReport` (types, factory
  `createIntentPlanActionabilityReport`, validator
  `validateIntentPlanActionabilityReport`, schema) registered in
  `@rekon/kernel-repo-model`, the SDK manifest, and the runtime category map
  (category `actions`).
- A capability-model helper:
  `@rekon/capability-model.buildIntentPlanActionabilityReport` — the
  deterministic plan parser + actionability evaluator + question/revision
  generator, with an injectable semantic-normalization adapter boundary.
- A CLI command:
  `rekon intent plan review --plan <path> [--goal <text>] [--kind <kind>]
  [--semantic off|auto|required] [--root <path>] [--json]`.

## Design choices

**Report-first, single artifact.** One artifact carries the whole review:
normalized phases, findings, elicitation questions, the revision prompt, and the
evidence gates. The plan file is never mutated. The eight-requirement model is
evaluated per phase; the report status rolls phase statuses up
(`blocked` if any phase is blocked or zero phases were extractable;
`needs-revision` if any finding; else `actionable`).

**Deterministic-first; never invent.** The parser extracts only what is literally
present in the plan text. Missing scope, missing acceptance criteria, and
ambiguous `TODO`/`TBD` language are *reported* as findings and questions — never
fabricated into fields. This is enforced by contract tests that assert a
no-paths phase yields an `implementation-scope` finding and an empty
`touchedPaths`.

**Bounded semantic adapter; provenance-tagged.** LLM-backed semantic
normalization is in scope but bounded to *read → transform → critique*. It is an
**injected adapter**, not a wired provider. When `--semantic auto|required` is
requested without an adapter, the helper records
`normalizationTrace.method = "deterministic-fallback"` plus a warning and uses
deterministic parsing. When an adapter runs, its output is tagged
`provenance = "semantic-llm"`, `invokedSemanticNormalization = true`, and its
`model`/`provider` are recorded. **Provider wiring is the only deferred part of
the slice**, exactly as the work order permitted: the deterministic core plus the
adapter boundary shipped; no concrete LLM provider was wired.

**Boundaries are structural, not just documentary.** The artifact carries a
seven-field `boundaries` block; the factory forces every field to `false` and the
validator rejects any report that claims otherwise. This makes "no commands, no
source writes, no downstream artifacts, no Circe, no `intent:go`" a checkable
property of every stored report.

## Verification

- Kernel/SDK/runtime registration compiles and type-checks.
- Contract test `tests/contract/intent-plan-actionability-report.test.mjs`
  exercises the builder, validator, factory boundary-forcing, the
  semantic-fallback and semantic-adapter paths, and the CLI (brain-dump →
  blocked, structured → actionable, single-artifact + no-downstream, error
  paths).
- Docs test `tests/docs/intent-plan-actionability-report.test.mjs` pins the
  documented boundaries.
- CLI smoke: a brain-dump plan (`TODO`) reviews as `blocked` with findings,
  questions, and a revision prompt; a fully-specified plan reviews as
  `actionable`; the written artifact validates clean; no `PreparedIntentPlan` /
  `WorkOrder` / `VerificationPlan` / `VerificationRun` / `VerificationResult` is
  produced; repository source is unchanged.

## Explicitly deferred

- Answering questions and merging revisions back into the plan.
- Approving plans / creating `PreparedIntentPlan` from a review.
- Wiring a concrete semantic-normalization provider (the adapter boundary exists;
  no provider is connected).
- `intent:go` and any source-write behavior.

## Related

- Artifact: [`IntentPlanActionabilityReport`](../artifacts/intent-plan-actionability-report.md)
- Concept: [`intent-plan-compiler.md`](../concepts/intent-plan-compiler.md)
- Decision: [`classic-intent-plan-compiler-elicitation-parity-decision.md`](./classic-intent-plan-compiler-elicitation-parity-decision.md)
- Prepare integration: [`intent-prepare-actionability-integration.md`](./intent-prepare-actionability-integration.md) — `intent prepare` now gates on this report.
- Prepare integration safety review: [`intent-prepare-actionability-integration-safety-review.md`](./intent-prepare-actionability-integration-safety-review.md) — declared the integration safe/stable.
