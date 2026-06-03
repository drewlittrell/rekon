# Intent Plan Compiler

> **LLM-semantic parity decided (slice 143):** an audit of the old codebase-intel system separated Track A (finish LLM-backed semantic parsing — the one real non-embedding gap is per-file semantic file understanding) from Track B (embeddings, deferred). Semantic output stays proposal-not-proof; no approval/execution/source-writes/Circe. See [`classic-llm-semantic-parsing-parity-decision.md`](../strategy/classic-llm-semantic-parsing-parity-decision.md).

> **Semantic quality hardened (slice 142):** provider phases are re-checked against the source — unsupported touched paths and verification commands become findings + warnings, dropped non-goals are flagged, and a weak plan cannot become actionable by filling fields without source support. Deterministic recheck stays authoritative. See [`intent-plan-semantic-quality-hardening.md`](../strategy/intent-plan-semantic-quality-hardening.md).

> **Semantic quality proven (slice 141):** LLM-backed semantic normalization was dogfooded live (OpenAI `gpt-4o-mini`) — it extracts objectives/deliverables/acceptance/paths/commands and preserves non-goals with **zero invented paths or commands**, while staying a proposal that is schema-gated and deterministically rechecked. See [`intent-plan-semantic-quality-dogfood.md`](../strategy/intent-plan-semantic-quality-dogfood.md).

> **Re-dogfooded end-to-end (slice 140):** the fresh-repo rough-plan path through
> review → answer → prepare → approve → status → handoff → bundle was re-run with
> semantic mode and the bundle imported into Circe — see
> [`../strategy/fresh-repo-intent-handoff-circe-dogfood-review-semantic.md`](../strategy/fresh-repo-intent-handoff-circe-dogfood-review-semantic.md).

> **Semantic normalization wired (slice 139):** the rough-plan normalization step
> can now use a routed LLM provider (the first real adapter,
> `createOpenAiLlmProvider`, behind `RekonLlmRouter`) via `rekon intent plan
> review --semantic auto|required --llm-provider ...`. Provider output is a
> proposal, not proof — schema-gated and deterministically re-checked; no source
> writes, command execution, Circe run, or `intent:go`. See
> [`../strategy/intent-plan-compiler-semantic-normalization-dogfood.md`](../strategy/intent-plan-compiler-semantic-normalization-dogfood.md).

## What it is

The **intent plan compiler** is the part of the Rekon intent spine that turns a
human's rough plan into something safe to prepare and execute. It is the loop the
classic codebase-intel system performed and the current Rekon spine had only
partially rebuilt:

```
raw plan → normalization → phase decomposition → actionability checks
         → missing-info questions → revision feedback
```

The compiler's first integrated step is the
[`IntentPlanActionabilityReport`](../artifacts/intent-plan-actionability-report.md)
artifact, produced by `rekon intent plan review`. It is a **review layer, not a
mutation layer**: it tells you whether a plan is actionable and exactly what is
missing, *before* the plan is prepared, approved, or run.

## Why a compiler, not just an assessor

`IntentAssessmentReport` answers "is there enough context to start?" against the
repository model. The plan compiler answers a different question: "is *this
written plan* actionable, phase by phase?" A plan can pass context assessment and
still be unexecutable because a phase has no acceptance criteria, no verification
evidence, or an unresolved `TODO` that changes what the implementation means.

The compiler closes that gap with a **deterministic-first** evaluation over eight
per-phase requirements (objective, deliverables, acceptance criteria,
implementation scope, verification evidence, ambiguity clearance, phase contract,
evidence gates). Each missing requirement becomes a finding and a question, and
the report ends as `actionable`, `needs-revision`, or `blocked`.

## The review loop

1. **Write** a plan (any shape: a structured Markdown plan, a semi-structured
   outline, or a brain dump).
2. **Review** it: `rekon intent plan review --plan plans/my-plan.md`.
3. **Read** the findings, elicitation questions, and the generated revision
   prompt. The revision prompt is addressed to an operator *or* an LLM and lists
   the exact required changes.
4. **Revise** the plan to answer the questions and close the findings.
5. **Re-review** until the report is `actionable`, then continue down the spine
   (`intent assess` → `intent prepare` → …).

The compiler never edits your plan for you. Answer / merge-back is deliberately
out of scope for this layer — the human (or their agent) owns the revision.

## Normalization and provenance

Normalization is deterministic by default. The parser **extracts** what is
literally in the plan — it never invents file paths, commands, or acceptance
criteria. Missing material is reported, not fabricated.

A bounded, injectable **semantic normalization adapter** can paraphrase a messy
plan into phase drafts when you opt in with `--semantic auto` or
`--semantic required`. It is constrained to *read → transform → critique* and is
**provenance-tagged** in `normalizationTrace`. When you ask for semantic
normalization but no provider is wired, the command falls back to deterministic
parsing and says so in a warning — it never silently claims a model ran.

## Where it sits in the spine

The plan compiler is the **front door**. Everything downstream of review —
preparing a `PreparedIntentPlan`, approving it, generating a `WorkOrder` or
`VerificationPlan`, projecting a Circe handoff bundle, and the still-deferred
`intent:go` source-write step — stays behind its existing gates. The review layer
adds no new execution power; it only makes plans reviewable and revisable
earlier.

As of slice 131, `rekon intent prepare` **consults** the report when you pass
`--actionability-report <ref>`: an actionable report may feed `PreparedIntentPlan`
generation, while a needs-revision / blocked report prevents preparation and
returns the revision guidance. Prepare still does not auto-approve, write source,
run commands, or implement `intent:go`. See
[`intent-prepare-actionability-integration.md`](../strategy/intent-prepare-actionability-integration.md),
safety-reviewed safe/stable (slice 132) in
[`intent-prepare-actionability-integration-safety-review.md`](../strategy/intent-prepare-actionability-integration-safety-review.md).

## Related

- Artifact: [`IntentPlanActionabilityReport`](../artifacts/intent-plan-actionability-report.md)
- Strategy: [`intent-plan-actionability-report-implementation.md`](../strategy/intent-plan-actionability-report-implementation.md)
- Safety review: [`intent-plan-actionability-report-safety-review.md`](../strategy/intent-plan-actionability-report-safety-review.md)
- Decision: [`classic-intent-plan-compiler-elicitation-parity-decision.md`](../strategy/classic-intent-plan-compiler-elicitation-parity-decision.md)
- Answer / merge-back decision: [`plan-actionability-answer-merge-back-decision.md`](../strategy/plan-actionability-answer-merge-back-decision.md) and implementation: [`plan-actionability-answer-merge-back-implementation.md`](../strategy/plan-actionability-answer-merge-back-implementation.md) — `rekon intent plan answer --report <ref> --answer <question-id>=<answer>` merges answers deterministically into a new report revision (slice 134).
- Neighboring concepts: [`prepared-intent-plan.md`](./prepared-intent-plan.md), [`intent-assessment.md`](./intent-assessment.md), [`intent-plan-bundle.md`](./intent-plan-bundle.md)

> **Loop closure (slice 135):** the full plan compiler loop (review → answer → merge-back → prepare) is proven end-to-end on a fresh repo through approval, work-ready status, and the gated WorkOrder / VerificationPlan / Circe-bundle handoff — see [`plan-compiler-loop-closure.md`](../strategy/plan-compiler-loop-closure.md).

> **Dogfood review (slice 136):** that path is dogfooded on a realistic fresh TypeScript package and confirmed Circe-importable end-to-end (boundaries explicit, source/plan files immutable, no Circe-run record, `intent:go` deferred) — see [`fresh-repo-intent-handoff-circe-dogfood-review.md`](../strategy/fresh-repo-intent-handoff-circe-dogfood-review.md).

> **Provider routing implemented (slice 138):** `@rekon/llm-provider` ships the shared router (interfaces, `RekonLlmRouter`, mock, `coercePhaseDrafts`); `rekon intent plan review` gains `--llm-provider` / `--llm-model` and injects a router-bound adapter into the semantic seam — no live provider yet, providers stay proposal-not-proof (schema-validated and deterministically re-checked) — see [`rekon-llm-provider-routing-implementation.md`](../strategy/rekon-llm-provider-routing-implementation.md).

> **Provider routing (slice 137):** the injectable semantic-normalization adapter is being generalized into a shared LLM provider router (task routes, `--llm-provider` / `--llm-model`, `--semantic off|auto|required`) used by review, answer, and future summarizers — providers may read/transform/critique text but never approve/execute/write source/run Circe/implement `intent:go`, and LLM output is proposal, not proof, schema-validated and deterministically re-checked — see [`rekon-llm-provider-routing-semantic-normalization-decision.md`](../strategy/rekon-llm-provider-routing-semantic-normalization-decision.md).

## Semantic File Understanding v1

Rekon has a per-file semantic understanding capability (slice 144): `rekon semantic file understand` produces a `SemanticFileUnderstandingReport`. Deterministic structural extraction (language, line/byte counts, imports, public exports, responsibilities) is always on and authoritative for imports/exports (the hallucination guard); optional LLM semantic understanding is a schema-validated, deterministically-rechecked proposal, not proof. It executes no commands, writes no source files, generates no embeddings, creates no PreparedIntentPlan / WorkOrder / VerificationPlan, runs no Circe, and intent:go remains deferred. See [Semantic File Understanding v1](../strategy/semantic-file-understanding-v1.md) and the [concept](./semantic-file-understanding.md).

## Semantic File Understanding Safety Review

Semantic File Understanding v1 was reviewed (slice 145) and found **safe/stable** as a proposal/context layer: semantic file understanding is proposal/context, not proof; deterministic structural facts remain authoritative for imports and public exports; provider output is schema-validated and deterministically rechecked; source files are read, not modified; no command execution, embeddings, PreparedIntentPlan / WorkOrder / VerificationPlan / VerificationRun / VerificationResult, or Circe; intent:go, scan integration, and embeddings remain deferred. Next: a Semantic File Understanding Scan Integration Decision. See [Semantic File Understanding Safety Review](../strategy/semantic-file-understanding-safety-review.md).

## Semantic File Understanding Intent Context Decision

How `IntentAssessmentReport` and `IntentPlanActionabilityReport` may consume `SemanticFileUnderstandingReport` is decided (slice 149): **Option B — explicit semantic context consumption with latest-by-path fallback** (`rekon intent assess --semantic-context latest|--semantic-context-ref <ref>`, `rekon intent plan review --semantic-context latest|--semantic-context-ref <ref>`). Semantic reports remain proposal/context, not proof; consumption is explicit, not automatic; semantic context never approves plans, satisfies proof gates by itself, replaces deterministic evidence, executes commands, writes source, creates WorkOrder/VerificationPlan, or runs Circe; stale reports are not consumed silently; embeddings and intent:go remain deferred. Next: Semantic File Understanding Intent Context Implementation. See [Semantic File Understanding Intent Context Decision](../strategy/semantic-file-understanding-intent-context-decision.md).
