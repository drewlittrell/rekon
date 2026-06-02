# Intent Plan Compiler

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
- Answer / merge-back decision: [`plan-actionability-answer-merge-back-decision.md`](../strategy/plan-actionability-answer-merge-back-decision.md) — a future `rekon intent plan answer` will merge answers into a new report revision.
- Neighboring concepts: [`prepared-intent-plan.md`](./prepared-intent-plan.md), [`intent-assessment.md`](./intent-assessment.md), [`intent-plan-bundle.md`](./intent-plan-bundle.md)
