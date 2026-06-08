# IntentPlanActionabilityReport

> **LLM-semantic parity decided (slice 143):** an audit of the old codebase-intel system separated Track A (finish LLM-backed semantic parsing — the one real non-embedding gap is per-file semantic file understanding) from Track B (embeddings, deferred). Semantic output stays proposal-not-proof; no approval/execution/source-writes/Circe. See [`classic-llm-semantic-parsing-parity-decision.md`](../strategy/classic-llm-semantic-parsing-parity-decision.md).

> **Semantic quality hardened (slice 142):** provider phases are re-checked against the source — unsupported touched paths and verification commands become findings + warnings, dropped non-goals are flagged, and a weak plan cannot become actionable by filling fields without source support. Deterministic recheck stays authoritative. See [`intent-plan-semantic-quality-hardening.md`](../strategy/intent-plan-semantic-quality-hardening.md).

> **Semantic quality proven (slice 141):** LLM-backed semantic normalization was dogfooded live (OpenAI `gpt-4o-mini`) — it extracts objectives/deliverables/acceptance/paths/commands and preserves non-goals with **zero invented paths or commands**, while staying a proposal that is schema-gated and deterministically rechecked. See [`intent-plan-semantic-quality-dogfood.md`](../strategy/intent-plan-semantic-quality-dogfood.md).

> **Re-dogfooded end-to-end (slice 140):** review → answer → actionable was
> re-proven on a fresh repo (rough plan blocked with questions; answered revision
> actionable; source report byte-unchanged), feeding prepare → approve → handoff →
> bundle — see
> [`../strategy/fresh-repo-intent-handoff-circe-dogfood-review-semantic.md`](../strategy/fresh-repo-intent-handoff-circe-dogfood-review-semantic.md).

> **Semantic normalization wired (slice 139):** the phase-draft normalization
> step can now use a routed LLM provider (the first real adapter behind
> `RekonLlmRouter`). Provider output is schema-gated and deterministically
> re-checked into the same findings/actionability — proposal, not proof; no
> source writes, command execution, Circe run, or `intent:go`. See
> [`../strategy/intent-plan-compiler-semantic-normalization-dogfood.md`](../strategy/intent-plan-compiler-semantic-normalization-dogfood.md).

## Purpose

`IntentPlanActionabilityReport` is the **plan-review** artifact of the Rekon
intent spine. It is the first integrated step of the Rekon **intent plan
compiler**: it reads a raw or semi-structured plan file, normalizes it into
executable **phase drafts**, evaluates each phase's **actionability**, surfaces
the missing requirements as **findings** and **elicitation questions**, and
emits an LLM/operator-facing **revision prompt**.

It restores a capability the classic codebase-intel system had and the current
Rekon spine had only partially rebuilt: the **raw plan → normalization → phase
decomposition → actionability checks → missing-info questions → revision
feedback** loop, performed *before* a plan is prepared, approved, or executed.

**IntentPlanActionabilityReport is a review, not an approval.** It reports
whether a plan is `actionable`, `needs-revision`, or `blocked`. It does not
approve plans, does not create a `PreparedIntentPlan`, and does not produce any
downstream work artifact.

## What It Does Not Do

This artifact is **read / transform / report-only**. Its `boundaries` block
records — and its validator hard-requires — that every one of the following is
`false`:

- **It executes no commands.** (`boundaries.executedCommands === false`)
- **It writes no source files.** (`boundaries.wroteSourceFiles === false`)
- **It creates no `PreparedIntentPlan`.** (`boundaries.createdPreparedIntentPlan === false`)
- **It creates no `WorkOrder`.** (`boundaries.createdWorkOrder === false`)
- **It creates no `VerificationPlan`.** (`boundaries.createdVerificationPlan === false`)
- **It runs no Circe.** (`boundaries.ranCirce === false`)
- **It does not implement `intent:go`.** (`boundaries.implementedIntentGo === false`)

It also creates no `VerificationRun` / `VerificationResult` and does not
answer its own questions or merge revisions back into the plan. Answer /
merge-back, approval, and `intent:go` remain deferred to later slices.

## Produced By

- `@rekon/capability-model.buildIntentPlanActionabilityReport`
- the `rekon intent plan review` CLI command

## Inputs

The producer reads the plan **text** only — never the surrounding repository
source, and never an event log. Inputs:

- `planText` (required) — the raw / semi-structured plan content.
- `planPath`, `planSha256` — provenance for the source file (recorded under
  `sourcePlan`).
- `goal`, `kind` — optional request framing (recorded under `request`).
- `semanticMode` (`off` | `auto` | `required`, default `off`) and an optional
  injected `semanticNormalization` adapter (see **Normalization** below).

## Shape

| Field | Meaning |
| --- | --- |
| `header` | Standard `ArtifactHeader` (`artifactType: "IntentPlanActionabilityReport"`). |
| `status` | `{ value: "actionable" \| "needs-revision" \| "blocked", reason }`. |
| `sourcePlan` | `{ path?, sha256?, lineCount?, sourceShape }` — `sourceShape` is `structured-plan` \| `semi-structured` \| `brain-dump`. |
| `request` | Optional `{ goal?, kind? }`. |
| `normalizationTrace` | How the phases were produced (see **Normalization**). |
| `normalizedPhases[]` | The executable phase drafts, each with `actionability` status + satisfied/missing requirements. |
| `findings[]` | Actionability gaps, each with `severity`, `requirement`, `phaseId?`, `message`, `suggestedFix`. |
| `elicitationQuestions[]` | The questions a human/LLM must answer to make the plan actionable. |
| `revisionPrompt` | `{ prompt, targetAudience: "operator-or-llm", requiredChanges[] }`. |
| `evidenceGates[]` | Per-phase gate describing the proof each phase owes the user intent. |
| `summary` | `{ totalPhases, actionablePhases, blockedPhases, questions, findings }`. |
| `boundaries` | The seven all-`false` safety booleans listed above. |

## Actionability Requirements

Each phase is evaluated against eight requirements. A missing requirement
becomes one finding and one elicitation question. The deterministic core never
fabricates the missing material — it asks for it.

| Requirement | Default severity |
| --- | --- |
| `objective` | high |
| `deliverables` | medium |
| `acceptance-criteria` | medium |
| `implementation-scope` | high |
| `verification-evidence` | high |
| `ambiguity-clearance` | critical |
| `phase-contract` | low |
| `evidence-gates` | medium |

Unresolved **critical** ambiguity (`TBD`, `TODO`, `FIXME`, `???`, "open
question") blocks the plan: a phase with a critical finding is `blocked`, and a
report with any blocked phase (or zero usable phases) is `blocked`. A report
with non-critical findings is `needs-revision`. A report with no findings is
`actionable`.

## Normalization

Normalization is **deterministic-first**. The deterministic parser segments the
plan into phases (by `Phase`/numbered headings, else one implicit phase),
extracts fields from Markdown headings and bullets, and **extracts literal
path-like tokens that actually appear in the text — it never invents paths,
commands, or acceptance criteria.**

### Phase Kind And Source Change Classification

Each normalized phase records its phase `kind`, a `sourceChange` posture, and
classification evidence:

- `kind`: `modify`, `implement`, `refactor`, `investigate`, `review`, `verify`,
  or `unknown`.
- `sourceChange`: `required`, `allowed`, or `forbidden`.
- `classification`: `{ source, signals[], warnings[] }`, showing which plan text
  drove the decision.

The deterministic classifier gives source-changing implementation language higher
priority than verification wording. A mutation phase may mention tests,
verification commands, validation, or evidence gates without becoming a read-only
`verify` phase. Classification priority is:

1. Explicit `Source Change:` / `Source Change Policy:` and `Phase Kind:` lines.
2. The phase objective.
3. `Expected Changed Files` / `Changed files should include`.
4. Deliverables.
5. The phase title.
6. Verification commands and evidence gates.

Verification commands and evidence gates do not classify a phase as read-only by
themselves. When a phase mixes implementation intent with read-only source-change
language, the report emits `phase_source_change_intent_ambiguous` and asks for an
explicit `Source Change: required`, `allowed`, or `forbidden`. Conflicting
explicit metadata, such as `Phase Kind: verify` with `Source Change: required`,
emits `phase_kind_source_change_conflict` and blocks preparation until the plan is
clarified.

For mixed implementation/verification prose, prefer explicit metadata:

```md
## Phase 1: Add regression coverage
Phase Kind: modify
Source Change: required

Objective: Modify source by adding the regression test and the minimal fix.

### Verification Commands
- npm run typecheck
- npm test
```

An optional, injected **semantic normalization adapter** may transform the plan
text into phase drafts when `semanticMode` is `auto` or `required`. It is
bounded to *read → transform → critique*: it executes nothing, and its output is
**provenance-tagged**. `normalizationTrace.method` records `deterministic`,
`semantic-llm`, or `deterministic-fallback`; `normalizationTrace.provenance`
records `source-only` or `semantic-llm`. When semantic normalization is
requested but no provider is configured, the report falls back to deterministic
parsing and records a warning — it never silently pretends a model ran.

## Boundary

`IntentPlanActionabilityReport` is the plan **compiler's front door**: it makes a
plan reviewable and revisable before any preparation, approval, work order,
verification, Circe handoff, or source write happens. Everything past review
stays behind the existing intent-spine gates and the still-deferred `intent:go`.

## Consumed by `intent prepare`

`rekon intent prepare --assessment <ref> --actionability-report <ref>` reads this
report (never mutates it). An **actionable** report may feed `PreparedIntentPlan`
generation — its `normalizedPhases` shape the prepared phases + verification
requirements, and the report ref is recorded in the prepared plan's input refs. A
**needs-revision** / **blocked** report makes `intent prepare` write no
`PreparedIntentPlan`, exit non-zero, and surface this report's `summary.findings`,
`summary.questions`, and `revisionPrompt`. Prepare still grants no approval. See
[`intent-prepare-actionability-integration.md`](../strategy/intent-prepare-actionability-integration.md).

## Related

- Concept: [`docs/concepts/intent-plan-compiler.md`](../concepts/intent-plan-compiler.md)
- Strategy: [`docs/strategy/intent-plan-actionability-report-implementation.md`](../strategy/intent-plan-actionability-report-implementation.md)
- Safety review: [`docs/strategy/intent-plan-actionability-report-safety-review.md`](../strategy/intent-plan-actionability-report-safety-review.md)
- Decision: [`docs/strategy/classic-intent-plan-compiler-elicitation-parity-decision.md`](../strategy/classic-intent-plan-compiler-elicitation-parity-decision.md)
- Prepare integration: [`docs/strategy/intent-prepare-actionability-integration.md`](../strategy/intent-prepare-actionability-integration.md)
- Prepare integration safety review: [`docs/strategy/intent-prepare-actionability-integration-safety-review.md`](../strategy/intent-prepare-actionability-integration-safety-review.md)
- Answer / merge-back decision: [`docs/strategy/plan-actionability-answer-merge-back-decision.md`](../strategy/plan-actionability-answer-merge-back-decision.md) and implementation: [`plan-actionability-answer-merge-back-implementation.md`](../strategy/plan-actionability-answer-merge-back-implementation.md) — `rekon intent plan answer` merges answers into a new report revision and records an additive `answerTrace` (slice 134).
- Spine neighbors: [`IntentAssessmentReport`](./intent-assessment-report.md), [`PreparedIntentPlan`](./prepared-intent-plan.md), [`IntentStatusReport`](./intent-status-report.md)

> **Loop closure (slice 135):** the full plan compiler loop (review → answer → merge-back → prepare) is proven end-to-end on a fresh repo through approval, work-ready status, and the gated WorkOrder / VerificationPlan / Circe-bundle handoff — see [`plan-compiler-loop-closure.md`](../strategy/plan-compiler-loop-closure.md).

> **Dogfood review (slice 136):** the closed public path is dogfooded on a realistic fresh TypeScript package and confirmed Circe-importable end-to-end — boundaries explicit, source/plan/test files immutable, no Circe-run record, `intent:go` deferred — see [`fresh-repo-intent-handoff-circe-dogfood-review.md`](../strategy/fresh-repo-intent-handoff-circe-dogfood-review.md).

> **Provider routing implemented (slice 138):** the `normalizationTrace` provider/model provenance is now populated by a router-bound adapter (`@rekon/llm-provider` + `rekon intent plan review --llm-provider` / `--llm-model`); no live provider yet, output stays proposal-not-proof, schema-validated and deterministically re-checked — see [`rekon-llm-provider-routing-implementation.md`](../strategy/rekon-llm-provider-routing-implementation.md).

> **Provider routing (slice 137):** the report's `normalizationTrace` records provider/model provenance from a shared LLM provider router; LLM output is proposal, not proof — schema-validated and deterministically re-checked, never approving/executing/writing source/running Circe/implementing `intent:go` — see [`rekon-llm-provider-routing-semantic-normalization-decision.md`](../strategy/rekon-llm-provider-routing-semantic-normalization-decision.md).

## Semantic File Understanding Intent Context

`rekon intent assess` and `rekon intent plan review` may explicitly consume SemanticFileUnderstandingReport(s) as proposal/context via `--semantic-context latest` or `--semantic-context-ref <ref>` — proposal/context, not proof; it never changes readiness or actionability status, and stale reports are never consumed silently. See [Semantic File Understanding Intent Context Implementation](../strategy/semantic-file-understanding-intent-context-implementation.md).
