# Semantic File Understanding Intent Context Decision

Status: **Decided** (slice 149). Base: `751757a`. Track A. Decision-only batch; no
runtime behavior changes, no consumption implemented here.

## Decision Summary

`SemanticFileUnderstandingReport` can now be generated safely during scan
(`rekon scan --semantic-files auto|required`, safety-reviewed slice 148). This
decision pins **how** `IntentAssessmentReport` and `IntentPlanActionabilityReport`
may consume those reports as proposal/context — selecting **Option B: explicit
semantic context consumption with latest-by-path fallback**. Semantic context may
enrich matched context, warnings, plan-file grounding, and prompts, but
**SemanticFileUnderstandingReport is proposal/context, not proof.** **Semantic
context consumption is explicit, not automatic.** Deterministic evidence remains
authoritative; semantic context never approves, executes, writes source, or
becomes proof by itself. Embeddings remain a separate, later track.

## Why This Decision Exists

Semantic file reports restore old codebase-intel-style file understanding, and
scan can now produce them safely. But `IntentAssessmentReport` and
`IntentPlanActionabilityReport` still operate mostly without that semantic
context: operators can generate reports, yet the intent pipeline does not benefit.
Connecting the two could weaken proof semantics if done carelessly (e.g. letting an
LLM-authored summary satisfy a readiness gate). This decision defines a safe
consumption model before any implementation.

## Current Semantic File Surface

Grounded against the shipped artifacts at `751757a`:

- **`SemanticFileUnderstandingReport`** (category `actions`): `status.value`
  (`understood` / `needs-review` / `provider-unavailable` / `blocked`), `file`
  (`path`, `sha256`, `language?`, `lineCount`, `byteLength`), `normalizationTrace`
  (`method`, `invokedSemanticUnderstanding`, `provider?`, `model?`, `provenance`,
  `warnings`), `summary` (`purpose`, `responsibilities`, `publicExports`,
  `imports`, `touchedConcepts`), `capabilitySignals`, `findings`, and eight
  all-false `boundaries`. Imports and public exports are the deterministic
  extraction (the hallucination guard); the provider's claimed values are ignored.
- **`IntentAssessmentReport`** (grounded, kernel `IntentAssessmentReport`): actual
  top-level fields are `readiness`, `matchedContext`, `blockers`, `warnings`,
  `missingContext`. **There is no top-level `recommendedNextAction`** — the
  recommended next action is carried inside the `readiness` block (one of
  `prepare-intent` / `refresh-context` / `resolve-blockers` /
  `ask-clarifying-question` / `run-verification` / `human-review`). The assessment
  model **already models `stale-context`** as both a readiness status and a blocker
  category — the natural home for semantic-report staleness.
- **`IntentPlanActionabilityReport`** (grounded): `status`, `sourcePlan`
  (`path?`, `sha256?`, `lineCount?`, `sourceShape`), `normalizationTrace`,
  `normalizedPhases`, `findings`, `elicitationQuestions`, `revisionPrompt`
  (`prompt`, `targetAudience`, `requiredChanges`), `evidenceGates`, `summary`,
  `boundaries`, `answerTrace?`. `sourcePlan.sha256` is already present and the
  `normalizationTrace` already records provider/model/provenance — the same shape
  semantic context provenance will use.

Field-shape differences from the original Work Order are recorded in the review
packet (no top-level `recommendedNextAction`; `blockers`/`warnings` exist; an
existing `stale-context` concept; `sourcePlan.sha256` exists).

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| no consumption | rejected/deferred | reports would not help intent planning |
| explicit semantic context consumption | selected | useful without surprise/proof confusion |
| automatic latest consumption | rejected/deferred | freshness/privacy surprise |
| semantic reports as proof | rejected | proposal/context only |
| wait for embeddings | rejected/deferred | path-indexed reports are already useful |

- **Option A — no consumption.** Reports remain standalone. Restores file
  understanding but does not help intent planning. Rejected/deferred.
- **Option B — explicit semantic context consumption.** Use reports only when
  requested by flag/ref, with latest-by-path fallback. Improves context while
  preserving the proposal-not-proof boundary. **Selected.**
- **Option C — automatic consumption whenever reports exist.** Intent commands
  always read latest semantic reports. Could surprise operators and blur
  freshness/privacy semantics. Rejected/deferred.
- **Option D — semantic reports as proof/evidence.** Use reports to satisfy
  readiness/proof gates. Semantic output is proposal/context, not proof. Rejected.
- **Option E — wait for embeddings first.** Path-indexed semantic reports already
  contain useful context; no need to block on retrieval. Rejected/deferred.

## Recommendation

Implement **Option B — explicit semantic context consumption with latest-by-path
fallback.** `IntentAssessmentReport` and `IntentPlanActionabilityReport` inputs
gain optional `semanticFileUnderstandingReports` / refs, consumed only when the
operator provides explicit refs or opts in (`--semantic-context latest`). Semantic
context is filtered to relevant paths (assess: `--path` values first; plan review:
touched / mentioned / explicit `--path` files). Semantic context does not become
proof, does not approve, does not execute, and does not write source.

## IntentAssessmentReport Consumption

Semantic context **may**: enrich `matchedContext`; improve path/system/capability
explanations; add `warnings` when semantic `findings` exist; improve the
recommended next action (within the `readiness` block) when context is ambiguous
(e.g. prefer `ask-clarifying-question`).

Semantic context **must not**: satisfy proof gates by itself; approve plan
preparation; suppress deterministic `blockers`; replace StepCapabilityGraph /
RuntimeGraphDriftReport / HandoffCoverageReport. A stale or mismatched semantic
report maps onto the existing `stale-context` readiness/blocker concept rather than
silently flipping readiness to `ready-for-prepare`.

## IntentPlanActionabilityReport Consumption

Semantic context **may**: help link plan requirements to known files; surface file
`responsibilities` and `publicExports`; improve `revisionPrompt` grounding; suggest
touched paths when a report matches explicit/mentioned files; flag a plan/file
mismatch as a `finding`.

Semantic context **must not**: invent touched paths without report/source support;
make a weak plan actionable by itself; erase missing-requirement `findings`;
approve or prepare plans. Semantic context informs `normalizedPhases` /
`revisionPrompt` / `findings` as proposal, never as an actionability gate.

## Staleness And Relevance Model

A semantic report is usable as context only if its `file.sha256` matches the
current file hash (when the file is available), its `boundaries` prove no
execution / source writes / embeddings, and its `normalizationTrace`
provider/model is acceptable under current policy. If stale: ignore or warn — do
not consume silently. If multiple reports exist: prefer the newest matching file
path + sha256; if no sha256 match, surface a stale-context warning.

| Condition | Decision |
| --- | --- |
| path + sha256 match | usable as context |
| path match but sha mismatch | stale warning / ignore |
| provider/model changed | policy warning |
| stale report | not consumed silently |

## CLI Surface

```bash
rekon intent assess --semantic-context latest
rekon intent assess --semantic-context-ref <SemanticFileUnderstandingReport ref>

rekon intent plan review --semantic-context latest
rekon intent plan review --semantic-context-ref <SemanticFileUnderstandingReport ref>
```

`--semantic-context latest` performs latest-by-path lookup (filtered to relevant
paths); `--semantic-context-ref` consumes explicit refs. If the explicit-ref flag
is too much for v1, ship `--semantic-context latest` only and defer refs. With no
flag, intent commands behave exactly as today — **semantic context consumption is
explicit, not automatic.**

## Boundary Model

| Boundary | Decision |
| --- | --- |
| semantic context vs proof | proposal/context |
| semantic context vs approval | no approval |
| semantic context vs deterministic evidence | does not replace |
| semantic context vs command execution | no execution |
| semantic context vs source writes | no writes |
| semantic context vs WorkOrder / VerificationPlan | not created |
| semantic context vs Circe | not run |
| embeddings | deferred |
| intent:go | deferred |

Pinned boundary statements:

- **SemanticFileUnderstandingReport is proposal/context, not proof.**
- **Semantic context consumption is explicit, not automatic.**
- **Semantic context must not approve plans.**
- **Semantic context must not satisfy proof gates by itself.**
- **Semantic context must not replace deterministic evidence artifacts.**
- **Semantic context must not execute commands.**
- **Semantic context must not write source files.**
- **Semantic context must not create WorkOrder or VerificationPlan.**
- **Semantic context must not run Circe.**
- **Stale semantic reports must not be consumed silently.**
- **Embeddings remain deferred to a separate track.**
- **intent:go remains deferred.**

### Consumption table

| Consumer | Allowed Use |
| --- | --- |
| IntentAssessmentReport | matchedContext enrichment / warnings |
| IntentPlanActionabilityReport | plan-file grounding / revisionPrompt support |
| PreparedIntentPlan | only via assessment/actionability lineage, not direct proof |
| WorkOrder / VerificationPlan | no direct consumption |

## What This Does Not Do

This decision implements no consumption; changes no `IntentAssessmentReport` or
`IntentPlanActionabilityReport` behavior; makes no semantic report proof; approves
no plans; implements no embeddings; adds no vector storage or retrieval; runs no
providers; executes no commands; writes no source; creates no WorkOrder /
VerificationPlan / VerificationRun / VerificationResult; runs no Circe; implements
no intent:go; publishes nothing to npm; and bumps no versions.

## Implementation Sequence

1. Extend the `IntentAssessmentReport` and `IntentPlanActionabilityReport` builder
   inputs with optional `semanticFileUnderstandingReports` (proposal/context only).
2. Add `--semantic-context latest` (latest-by-path) to `rekon intent assess` and
   `rekon intent plan review`; defer `--semantic-context-ref` if needed.
3. Filter to relevant paths; apply the staleness/relevance model (sha256 match,
   stale warning, policy warning); never consume stale reports silently.
4. Surface semantic context as matchedContext enrichment / warnings / plan-file
   grounding / revisionPrompt support — never as proof, approval, or a gate.
5. Contract + docs tests proving the boundaries hold; full 9-command gate.

## Decision questions answered

1. **Should IntentAssessmentReport consume SemanticFileUnderstandingReport?** Yes,
   as explicit proposal/context.
2. **Should IntentPlanActionabilityReport consume it?** Yes, as explicit
   proposal/context.
3. **What semantic fields are useful?** `summary.purpose`/`responsibilities`/
   `publicExports`/`imports`/`touchedConcepts`, `capabilitySignals`, `findings`,
   `file.path`/`sha256`, `status.value`.
4. **Should it change readiness status?** Only cautiously — toward
   `needs-review`/`ask-clarifying-question`/`stale-context`, never to
   `ready-for-prepare` on its own.
5. **Should it become proof?** No.
6. **Should findings become blockers?** No by default — warnings/context first.
7. **Should capabilitySignals influence matchedContext?** Yes, as enrichment.
8. **Should summaries/responsibilities improve plan review grounding?** Yes.
9. **Are deterministic imports/exports reusable as authoritative context?** Yes —
   they are the deterministic extraction.
10. **How do stale reports affect consumption?** Ignored or warned; never silent.
11. **How is sha256 mismatch handled?** Stale-context warning; not used as fresh.
12. **Explicit refs or latest-by-path?** Both — explicit refs preferred,
    latest-by-path fallback via `--semantic-context latest`.
13. **CLI flags for semantic refs?** Yes — `--semantic-context latest` and
    `--semantic-context-ref`.
14. **Automatic after scan --semantic-files?** No — explicit opt-in.
15. **Interaction with provider privacy?** Consumption reads existing reports only;
    it triggers no new provider calls and sends no source text to providers.
16. **What should implementation do first?** Extend the assessment/actionability
    builder inputs + `--semantic-context latest`.
17. **What remains deferred to embeddings?** Similarity/retrieval-based context.
18. **What slice follows?** Semantic File Understanding Intent Context
    Implementation.

## Related

- [Semantic File Understanding Scan Integration Safety Review](./semantic-file-understanding-scan-integration-safety-review.md)
- [Semantic File Understanding Scan Integration](./semantic-file-understanding-scan-integration.md)
- [SemanticFileUnderstandingReport artifact](../artifacts/semantic-file-understanding-report.md)
- [Semantic File Understanding concept](../concepts/semantic-file-understanding.md)
- [Intent Assessment concept](../concepts/intent-assessment.md)
- [Intent Plan Compiler concept](../concepts/intent-plan-compiler.md)
- [PreparedIntentPlan concept](../concepts/prepared-intent-plan.md)
