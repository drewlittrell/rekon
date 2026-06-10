# Intent Plan Actionability Report Safety Review

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

> Status: Reviewed — safe/stable (no blocker). Strategy / safety-review batch.
> Reviews the shipped `IntentPlanActionabilityReport` + `rekon intent plan review`
> implementation. Follows
> [Intent Plan Actionability / Compiler Implementation](./intent-plan-actionability-report-implementation.md)
> at `723e5a1`. Docs-only: no runtime behavior change, no implementation change,
> no package bump, no npm publish, no branch.

## Decision Summary

**`IntentPlanActionabilityReport` v1 and `rekon intent plan review` are safe/stable
as a read / transform / report-only plan-compiler layer.** The capability reviews
raw / semi-structured plans before approval, normalizes them into executable phase
drafts, identifies missing actionability requirements, generates elicitation
questions, and emits an operator-or-LLM revision prompt — and it does nothing else.
**Raw plans are reviewed before approval.** No blocker was found.

The central safety property is structural, not merely documentary. The artifact
carries a seven-field `boundaries` block; the factory forces every field to `false`
and the validator **rejects** any report whose boundaries claim otherwise. "No
commands, no source writes, no downstream artifacts, no Circe, no `intent:go`" is
therefore a checkable invariant of every stored report, not a convention.

## Why This Review Exists

The classic codebase-intel system did more than package plans — it **compiled and
interrogated** them before approval (intake sufficiency → normalization into phase
drafts → per-phase actionability gates → missing-info elicitation → answers merged
back). Rekon rebuilt the downstream proof / handoff / approval machinery but had
not rebuilt this upstream plan-intelligence loop. Slice 129 added the first
report-only compiler layer. This review confirms the layer improves plan quality
**without crossing into approval, execution, source mutation, or handoff
generation** — the exact boundary that keeps the still-deferred `intent:go` safe.

## Implementation Reviewed

Reviewed at `723e5a1`:

- `packages/kernel-repo-model/src/index.ts` — `IntentPlanActionabilityReport` types,
  `createIntentPlanActionabilityReport` factory, `validateIntentPlanActionabilityReport` /
  `assertIntentPlanActionabilityReport`, `intentPlanActionabilityReportSchema`.
- `packages/sdk/src/index.ts` + `packages/runtime/src/index.ts` — registration
  (experimental `0.1.0`; category `actions`).
- `packages/capability-model/src/intent-plan-actionability-report.ts` —
  `buildIntentPlanActionabilityReport` (deterministic parser + actionability
  evaluation + finding / question / revision-prompt / evidence-gate generation +
  injectable semantic-normalization adapter boundary).
- `packages/capability-model/src/index.ts` — barrel re-exports.
- `packages/cli/src/index.ts` — `rekon intent plan review` branch + help.
- `tests/contract/intent-plan-actionability-report.test.mjs` (21 blocks) +
  `tests/docs/intent-plan-actionability-report.test.mjs` (12 assertions).
- `docs/artifacts/intent-plan-actionability-report.md`,
  `docs/concepts/intent-plan-compiler.md`,
  `docs/strategy/intent-plan-actionability-report-implementation.md`,
  `.rekon-dev/review-packets/intent-plan-actionability-report-v1.md`, README, CHANGELOG.

## Artifact Model Review

`IntentPlanActionabilityReport` is `{ header, status, sourcePlan, request?,
normalizationTrace, normalizedPhases[], findings[], elicitationQuestions[],
revisionPrompt, evidenceGates[], summary, boundaries }`. `status.value` is
`actionable` | `needs-revision` | `blocked`. The factory normalizes every nested
field, computes `summary`, and **forces all seven `boundaries` booleans to
`false`** before asserting. The validator re-checks `validateModelHeader` plus
every enum / array and, critically, iterates the seven boundary keys and pushes an
issue if any value `!== false`. A report that asserts an executed command, a source
write, a created downstream artifact, a Circe run, or `intent:go` therefore **fails
validation** and cannot be stored. **IntentPlanActionabilityReport normalizes plans
into phase drafts.** The model is sound for a report-only artifact.

## Parser And Normalization Review

Normalization is deterministic-first. The parser segments the plan into phases (by
`Phase` / numbered headings, else one implicit phase after the leading H1), extracts
fields from Markdown headings and bullets, and **extracts only literal path-like
tokens that actually appear in the text** (`PATH_TOKEN_RE`, excluding `.md` / `.txt`,
deduped). It does not synthesize paths, commands, or acceptance criteria — missing
material is reported, never fabricated. `sourcePlan.sourceShape` classifies the
input as `structured-plan` / `semi-structured` / `brain-dump` from heading / bullet
density. Each phase draft records `sourceEvidence` excerpts with line ranges when
present, so normalized drafts cite source evidence rather than inventing it. The
parser is pure text-in / data-out; it touches no filesystem and runs no process.

## Actionability Review

Each phase is evaluated against eight requirements (objective, deliverables,
acceptance-criteria, implementation-scope, verification-evidence, ambiguity-clearance,
phase-contract, evidence-gates). A missing requirement becomes one finding and one
elicitation question. **Missing requirements become findings and questions.**
Unresolved critical ambiguity (`TBD` / `TODO` / `FIXME` / `???` / "open question")
is a `critical` finding that blocks the phase; a report with any blocked phase (or
zero extractable phases) is `blocked`; any non-critical finding yields
`needs-revision`; only a fully-satisfied plan is `actionable`. Weak plans therefore
produce findings / questions / revision prompts, **not false approval** — the
capability never elevates a deficient plan.

## Elicitation Question Review

Each `elicitationQuestion` carries `{ requirement, phaseId?, question, answerShape,
whyAsked, priority }`. `answerShape` is one of `sentence` / `bullets` / `paths` /
`command-or-artifact`, and `priority` mirrors finding severity (critical ambiguity →
`critical`). Questions are generated deterministically from the missing requirements;
they ask for the missing material rather than guessing it. This is the operator/LLM
feedback surface that restores the classic ask side of the loop without yet
implementing answer/merge-back.

## Revision Prompt Review

`revisionPrompt` is `{ prompt, targetAudience: "operator-or-llm", requiredChanges[] }`.
`requiredChanges` is the list of suggested fixes (one per finding); the `prompt` is a
ready-to-use revision instruction that lists what must change and the questions to
answer, and explicitly tells the reviser **not to invent file paths or verification
commands** and to keep stated non-goals. **revisionPrompt gives LLM/operator
feedback.** It is text output only — generating it executes nothing and writes
nothing.

## Semantic Boundary Review

LLM-backed semantic normalization is in scope but bounded. **LLM-backed semantic
normalization is bounded to read/transform/critique.** It is an **injected adapter**
(`IntentPlanSemanticNormalizationAdapter`), not a wired provider: `semanticMode`
`off` uses the deterministic parser; `auto` / `required` invoke the adapter only if
one is supplied. When the adapter runs, its output is provenance-tagged
(`normalizationTrace.method = "semantic-llm"`, `provenance = "semantic-llm"`,
`invokedSemanticNormalization = true`, with `model` / `provider` recorded). When
semantic normalization is requested but no provider is configured, the helper records
`method = "deterministic-fallback"` plus a warning and uses deterministic parsing — so
**semantic fallback never blocks deterministic review**. The adapter only returns
phase drafts; **Semantic normalization executes nothing.** **Semantic normalization
writes no source files.** No live provider is wired in this slice.

## CLI Review

`rekon intent plan review --plan <path> [--goal] [--kind] [--semantic
off|auto|required] [--root] [--json]` reads the plan file, computes its sha256, calls
`buildIntentPlanActionabilityReport`, and writes the result via
`store.write(report, { category: "actions" })`. It writes **exactly one**
`IntentPlanActionabilityReport` and reads nothing but the plan text. Output reports
`actionable` (next: proceed to assess/prepare) or `needs-revision` / `blocked` (next:
revise via the revision prompt), and the human output ends with the explicit
boundary sentence naming every artifact and action it did **not** produce. Invalid
`--semantic`, a missing `--plan`, and an unreadable plan file all error cleanly.

## Boundary Review

The report-only boundary holds at every layer (factory-forced + validator-enforced +
CLI-confirmed by contract test). **Plan review creates no PreparedIntentPlan.**
**Plan review creates no WorkOrder.** **Plan review creates no VerificationPlan.**
**Plan review creates no VerificationRun or VerificationResult.** **Plan review
executes no commands.** **Plan review writes no source files.** **Plan review runs no
Circe.** **intent:go remains deferred.** The slice-129 contract test verifies a
single `IntentPlanActionabilityReport` is written and zero downstream artifacts are
created; the smoke confirmed repository source is unchanged.

### Surface

| Surface | Status | Safety Finding |
| --- | --- | --- |
| IntentPlanActionabilityReport | shipped | report-only compiler output |
| buildIntentPlanActionabilityReport | shipped | pure read/transform helper |
| deterministic parser | shipped | no execution |
| semantic adapter boundary | shipped | bounded / optional |
| findings | shipped | missing requirements explicit |
| elicitationQuestions | shipped | operator/LLM feedback |
| revisionPrompt | shipped | revision guidance |
| boundaries | shipped | all false / validator-enforced |
| CLI plan review | shipped | writes one report |

### Boundary

| Boundary | Decision |
| --- | --- |
| plan review vs PreparedIntentPlan | not created |
| plan review vs WorkOrder | not created |
| plan review vs VerificationPlan | not created |
| plan review vs VerificationRun / Result | not created |
| plan review vs command execution | no execution |
| plan review vs source writes | no writes |
| plan review vs Circe | does not run Circe |
| plan review vs intent:go | deferred |

### Semantic Boundary

| Surface | Decision |
| --- | --- |
| deterministic parsing | default |
| semantic normalization | optional adapter |
| semantic unavailable | deterministic fallback with warning |
| semantic required unavailable | explicit failure / blocked behavior |
| semantic output | phase drafts / findings only |
| semantic execution | none |
| semantic source writes | none |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare plan compiler safe/stable | selected | report-only boundary holds |
| prepare integration next | selected | actionability must gate preparation |
| answer/merge-back next | deferred | follows report and prepare integration |
| live LLM provider wiring next | deferred | adapter boundary exists first |
| auto-approve actionable plans | rejected | approval remains explicit |

## Recommendation

**Intent Plan Actionability / Compiler v1 is safe/stable.** Ship the next slice as
**Intent Prepare Integration With Actionability Report**: `intent prepare` should
respect the report — actionable reports may feed `PreparedIntentPlan` generation,
while blocked / needs-revision reports prevent or downgrade preparation with explicit
revision guidance, and approval stays explicit (no auto-approval). The alternative,
**Plan Actionability Answer / Merge-Back Decision**, restores the classic
ask/answer/merge-back loop and should follow prepare integration (or be decided
separately). The default recommendation is prepare integration.

## What This Does Not Do

This review changes no runtime behavior and no implementation. It does not wire a
live LLM provider, implement prepare integration, or implement answer/merge-back. It
creates no `PreparedIntentPlan`, `WorkOrder`, `VerificationPlan`, `VerificationRun`,
or `VerificationResult`; executes no commands; writes no source files; runs no Circe;
and does not implement `intent:go`. **Actionability review is report-only until the
prepare integration slice.** No version bump, no npm publish, no branch.

## Follow-Up Work

1. **Intent Prepare Integration With Actionability Report** (shipped — slice 131;
   safety-reviewed slice 132) — `intent prepare` now gates on the report without
   auto-approval, source writes, command execution, or `intent:go`. See
   [`intent-prepare-actionability-integration.md`](./intent-prepare-actionability-integration.md)
   and [`intent-prepare-actionability-integration-safety-review.md`](./intent-prepare-actionability-integration-safety-review.md).
2. **Plan Actionability Answer / Merge-Back Decision** (decided — slice 133) — selected
   Option B: a future `rekon intent plan answer` writes a new `IntentPlanActionabilityReport`
   revision. See [`plan-actionability-answer-merge-back-decision.md`](./plan-actionability-answer-merge-back-decision.md) and [`plan-actionability-answer-merge-back-implementation.md`](./plan-actionability-answer-merge-back-implementation.md) (shipped as `rekon intent plan answer`, slice 134).
3. **Semantic normalization provider wiring** — connect a concrete, bounded provider
   behind the existing adapter boundary; keep it read/transform/critique only.

## Related

- Implementation: [`intent-plan-actionability-report-implementation.md`](./intent-plan-actionability-report-implementation.md)
- Decision: [`classic-intent-plan-compiler-elicitation-parity-decision.md`](./classic-intent-plan-compiler-elicitation-parity-decision.md)
- Artifact: [`IntentPlanActionabilityReport`](../artifacts/intent-plan-actionability-report.md)
- Concept: [`intent-plan-compiler.md`](../concepts/intent-plan-compiler.md)
- Review packet: [`intent-plan-actionability-report-safety-review.md`](../../.rekon-dev/review-packets/intent-plan-actionability-report-safety-review.md)
