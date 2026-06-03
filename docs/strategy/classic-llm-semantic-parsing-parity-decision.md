# Classic LLM Semantic Parsing Parity Audit / Completion Decision

Status: **Decided** (slice 143). Base: `bdf5643`. Track A (finish LLM-backed semantic
work) before Track B (embeddings).

This memo audits the **non-embedding** LLM-backed semantic parsing behavior of the
old `codebase-intel` system and decides what remains for Rekon to finish before we
open the separate embeddings track. It is a decision-only batch: no semantic
parsing is implemented here, no embeddings are implemented, no providers are added,
no live providers are run.

## Source basis

Primary-source audit of the local `codebase-intel` checkout (`/Users/.../Code/
codebase-intel`, commit `dfe66dc`), grounded in actual files via three read-only
source sweeps, cross-referenced with the current Rekon surfaces
(`@rekon/llm-provider`, `@rekon/capability-model`, `@rekon/cli`). Embeddings were
deliberately scoped out except to confirm they exist as a separate stack.

## Questions answered

1. **Where did codebase-intel use LLM-backed semantic parsing?** In a narrow set
   of surfaces: per-file semantic scan, plan semantic triage + normalization, gate
   semantic review/critique, verb categorization (taxonomy), and a model-comparison
   harness. The intent/plan/reconcile control flow was otherwise deterministic.
2. **During per-file scan?** **Yes** — `services/analysis/pure-llm-pipeline.ts`
   `runPureLlmPipeline()` reads each source file with the LLM and extracts
   capabilities, validated against the ontology. This is the core per-file surface.
3. **For file summaries / code understanding?** Partially — per-file analysis
   produced LLM understanding; standalone "file TLDR" summaries were built from the
   analysis cache (deterministic), with embeddings (Voyage) used only for
   similarity, not generation.
4. **During intent parsing/classification?** **No** — `lib/intent-preparation/
   claim-classifier.ts` and `product-codebase-intel/src/intent/model.ts`
   `buildIntentMap()` are purely deterministic (regex + template inference). Intent
   classification was never LLM-backed, so it is **not a parity gap**.
5. **During plan preparation?** **Yes** — `lib/intent-preparation/
   semantic-normalization.ts` `runSemanticTriage()` (haiku) chooses deterministic
   vs. semantic, then `runSemanticNormalization()` (sonnet) re-parses prose/brain
   dumps into structured phase drafts. **Rekon already matches this.**
6. **For actionability / critique / elicitation?** Actionability and elicitation
   were **deterministic** (`actionability.ts`, `elicitation.ts`). A separate LLM
   **gate semantic review** (`GateSemanticReviewSupport.ts` `buildReviewPrompt()`)
   critiqued gate files for coherence.
7. **For revision prompts / feedback?** Only the gate semantic review produced LLM
   feedback; plan revision prompts were deterministic templates.
8. **Provider/model abstraction?** `lib/llm.ts` + `lib/llmRuntime.ts` +
   `infra/providers/{AnthropicProvider,OpenAILlmProvider}.ts`: Anthropic via SDK
   (haiku/sonnet/opus), OpenAI via raw fetch (gpt-*), routed by tier prefix; keys
   from `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`; config-driven model tiers.
9. **Structured output / schema validation?** Anthropic forced `tool_use`; OpenAI
   `response_format: json_object`; both validated with **Zod `safeParse`**, with
   `cleanLLMResponse()` repair, `coerceMissingArrays()`, and **retry-with-hint** on
   validation failure.
10. **Hallucination guards?** **Prompt-only** ("only report real issues", "do not
    duplicate") — there was **no** deterministic check that file paths or commands
    in LLM output actually exist. Output was validated against the Zod *shape*, not
    against codebase facts.
11. **Source provenance?** LLM findings were tagged (`reviewSource:
    'llm_semantic_review'`, capability `source: 'llm'`), but the **model name was
    not persisted** with findings, and there was no per-field confidence.
12. **What does Rekon already implement?** Provider router + OpenAI-compatible
    provider (`@rekon/llm-provider`); plan semantic triage/normalization
    (`intent plan review --semantic`); schema gate (`coercePhaseDrafts`) +
    deterministic recheck; **slice-142 quality guards** (unsupported path/command,
    non-goal preservation, over-actionable) that **exceed** codebase-intel's
    prompt-only guards; and a `normalizationTrace` that **persists provider + model
    + warnings + provenance confidence** — also stronger than codebase-intel.
13. **What semantic parsing gaps remain (non-embedding)?** Primarily **per-file
    semantic file understanding** (the `runPureLlmPipeline` analogue), grounded
    against Rekon's existing capability ontology. Secondary: optional semantic gate
    critique and verb categorization. The router already declares the unwired tasks
    (`artifact.summary`, `plan.critique`, `plan.revision-prompt`, `plan.answer-merge`,
    `intent.classify`).
14. **Implement semantic per-file scan next?** **Yes** — it is the genuine
    non-embedding parity gap and fits Rekon's ontology + artifact + proof model.
15. **Implement semantic intent classification next?** **No** (not parity) —
    codebase-intel's intent layer was deterministic; a semantic classifier would be
    a *new* enhancement, lower priority than file understanding.
16. **Improve answer/merge-back with semantic parsing next?** Evaluate after file
    understanding; codebase-intel's merge-back was deterministic, so this is an
    enhancement, not parity.
17. **What waits for the embeddings track?** All similarity/retrieval: Voyage-style
    semantic embeddings, feature-bag vectors, the ANN/HNSW index, neighbor labeling,
    duplicate detection — the entire `lib/embeddings.ts` stack.
18. **What slice follows?** **Semantic File Understanding v1** (per-file LLM scan,
    proposal-not-proof, ontology-grounded, no writes/execution/Circe).

## Comparison matrix

| Old codebase-intel Surface | Old LLM Semantic Behavior | Rekon Current State | Gap | Recommended Rekon Work |
| --- | --- | --- | --- | --- |
| per-file semantic scan | `runPureLlmPipeline` reads each file → capabilities | deterministic AST/ontology extraction only | **LLM per-file understanding** | Semantic File Understanding v1 |
| file/code summary | per-file analysis + cache TLDR (det.) | deterministic projections | summaries (optional) | fold into file-understanding artifact |
| intent classification/parsing | deterministic (regex/template) | deterministic IntentAssessmentReport | none (parity met) | optional later enhancement only |
| plan semantic normalization | triage (haiku) + normalize (sonnet) | `plan review --semantic` (routed, guarded) | none (parity met / exceeded) | continue hardening |
| actionability critique | deterministic | deterministic evaluator + guards | none | continue through report layer |
| elicitation question generation | deterministic templates | deterministic elicitation questions | none | none |
| answer/merge-back | deterministic | deterministic answer/merge-back | none (enhancement only) | evaluate after file understanding |
| provider routing | tier-routed Anthropic/OpenAI, Zod, retry | `RekonLlmRouter` + OpenAI-compatible, structural gate | retry/Zod parity (minor) | reuse `@rekon/llm-provider`; add retry if needed |
| provenance / validation | `source:'llm'` tag, model not persisted, prompt-only guards | model+provider+warnings persisted, deterministic guards | Rekon **ahead** | keep |

## Options table

| Option | Decision | Reason |
| --- | --- | --- |
| stop at plan-review semantics | rejected | old parity is broader |
| finish LLM semantic parsing before embeddings | selected | keeps parsing and retrieval separate |
| jump to embeddings now | rejected/deferred | separate track after parsing scope |
| literal old-system clone | rejected | preserve behavior in Rekon architecture |
| live LLM everywhere by default | rejected | cost/privacy/surprise risk |

## Selected architecture

Finish the LLM semantic parsing layer first (Option B), inside the existing
architecture:

```text
@rekon/llm-provider     provider routing + model selection (reuse)
@rekon/capability-model pure semantic builders + deterministic validators
@rekon/cli              explicit commands / config / env selection
future semantic capability
  semantic file understanding (per-file scan)
  optional semantic critique / answer assist
```

No vector storage or retrieval enters this decision beyond noting that embeddings
are the next separate track after semantic-parsing parity.

## Semantic surface table

| Surface | Decision |
| --- | --- |
| per-file semantic scan | audit and prioritize |
| file/code summaries | audit and decide |
| intent classification/parsing | audit and decide |
| plan semantic normalization | continue hardening |
| actionability critique | continue through existing report layer |
| answer/merge-back semantic assist | evaluate next |
| provider routing | reuse @rekon/llm-provider |
| embeddings | separate track |

## Boundary statements

- **LLM semantic output is proposal, not proof.**
- **Semantic parsing must not approve plans.**
- **Semantic parsing must not execute commands.**
- **Semantic parsing must not write source files.**
- **Semantic parsing must not run Circe.**
- **Provider calls must be explicit or configured, not surprising defaults.**
- **Source text privacy must be an explicit policy decision** — sending file
  contents to a provider is opt-in and must be surfaced, never a silent default.
- **Embeddings are intentionally deferred to a separate track.**
- **intent:go remains deferred.**

## Boundary table

| Boundary | Decision |
| --- | --- |
| semantic output vs proof | proposal only |
| semantic parsing vs approval | no approval |
| semantic parsing vs command execution | no execution |
| semantic parsing vs source writes | no writes |
| semantic parsing vs Circe | does not run Circe |
| provider calls | explicit/configured |
| source privacy | explicit policy |
| embeddings | deferred |
| intent:go | deferred |

## Embeddings deferred

codebase-intel ships a mature embeddings stack (`lib/embeddings.ts`, Voyage
`voyage-code-3`, feature-bag vectors, HNSW ANN index, `EmbeddingRepository`) used
for similarity/dedup/labeling — entirely separate from the intent → plan flow.
Rekon already scaffolds the interfaces (`RekonEmbeddingProvider`, the
`code.embedding` / `plan.similarity` / `artifact.retrieval` tasks) with no live
implementation. Embeddings get their own audit/architecture slice **after** the LLM
semantic parsing layer is finished.

## Follow-up table

| Follow-Up | Scope |
| --- | --- |
| Semantic File Understanding v1 | per-file scan summaries / source understanding |
| Intent Semantic Classification v1 | classify / parse intent text through router |
| Plan Answer Semantic Assist | use provider for messy answers, still rechecked |
| Embeddings Parity Audit | separate track after LLM semantic parsing scope |

## Next step

**Semantic File Understanding v1** — restore codebase-intel-style per-file semantic
scan / source understanding through the existing provider router, grounded against
the capability ontology, proposal-not-proof, with no source writes, no command
execution, no auto-approval, no Circe, and intent:go still deferred. Embeddings
follow as their own later track (Embeddings Parity Audit / Embedding Index
Decision).

## Related

- [Intent Plan Semantic Quality Hardening](./intent-plan-semantic-quality-hardening.md)
- [Intent Plan Semantic Quality Dogfood](./intent-plan-semantic-quality-dogfood.md)
- [Rekon LLM Provider Routing Implementation](./rekon-llm-provider-routing-implementation.md)
- [Rekon LLM Provider Routing concept](../concepts/rekon-llm-provider-routing.md)
- [Intent Plan Compiler concept](../concepts/intent-plan-compiler.md)

## Semantic File Understanding v1

Rekon has a per-file semantic understanding capability (slice 144): `rekon semantic file understand` produces a `SemanticFileUnderstandingReport`. Deterministic structural extraction (language, line/byte counts, imports, public exports, responsibilities) is always on and authoritative for imports/exports (the hallucination guard); optional LLM semantic understanding is a schema-validated, deterministically-rechecked proposal, not proof. It executes no commands, writes no source files, generates no embeddings, creates no PreparedIntentPlan / WorkOrder / VerificationPlan, runs no Circe, and intent:go remains deferred. See [Semantic File Understanding v1](./semantic-file-understanding-v1.md) and the [concept](../concepts/semantic-file-understanding.md).

## Semantic File Understanding Safety Review

Semantic File Understanding v1 was reviewed (slice 145) and found **safe/stable** as a proposal/context layer: semantic file understanding is proposal/context, not proof; deterministic structural facts remain authoritative for imports and public exports; provider output is schema-validated and deterministically rechecked; source files are read, not modified; no command execution, embeddings, PreparedIntentPlan / WorkOrder / VerificationPlan / VerificationRun / VerificationResult, or Circe; intent:go, scan integration, and embeddings remain deferred. Next: a Semantic File Understanding Scan Integration Decision. See [Semantic File Understanding Safety Review](./semantic-file-understanding-safety-review.md).
