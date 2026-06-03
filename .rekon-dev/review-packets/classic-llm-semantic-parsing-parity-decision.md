# Review Packet — Classic LLM Semantic Parsing Parity Audit / Completion Decision (slice 143)

Base SHA: `bdf5643`. Branch: none (push to main after the gate). Decision-only batch
(Track A). No runtime behavior changes.

## CHANGES MADE

- `docs/strategy/classic-llm-semantic-parsing-parity-decision.md` — new decision memo.
- `.rekon-dev/review-packets/classic-llm-semantic-parsing-parity-decision.md` — new (this).
- `tests/docs/classic-llm-semantic-parsing-parity-decision.test.mjs` — new (16 assertions).
- Doc updates: 4 strategy + 2 concepts + 1 artifact + 2 release + 2 roadmaps + README + CHANGELOG.
- No source code, no tests-of-behavior, no CLI changes, no package additions.

## PUBLIC API CHANGES

None. This is a decision/strategy batch.

## PURPOSE PRESERVATION CHECK

Rekon restored LLM-backed semantic plan review, but codebase-intel used semantic
parsing across more workflows. The risk was jumping to embeddings before finishing
the live LLM semantic-parsing layer. This audit separates the two tracks, scopes
the remaining non-embedding semantic-parsing work as one coherent completion plan
(Track A), and keeps every Rekon boundary: provider output stays proposal-not-proof;
no approval, no execution, no source writes, no Circe, no intent:go. Purpose
preserved.

## CODEBASE-INTEL ALIGNMENT

Audited the local `codebase-intel` checkout (`/Users/.../Code/codebase-intel`,
`dfe66dc`) — primary source, not a re-upload. Rekon already aligns on plan semantic
normalization and exceeds codebase-intel on hallucination guards and provenance.
The remaining alignment gap is per-file semantic understanding. codebase-intel's
intent classification / elicitation / actionability / merge-back were deterministic
(so Rekon already matches those without LLM).

## SOURCE REVIEW

Three read-only source sweeps over codebase-intel:
- LLM mechanics: `lib/llm.ts`, `lib/llmRuntime.ts`, `infra/providers/{Anthropic,OpenAI}LlmProvider.ts` — tier-routed Anthropic SDK + OpenAI fetch; Zod `safeParse`; `cleanLLMResponse`; retry-with-hint.
- Semantic surfaces inventory: `services/analysis/pure-llm-pipeline.ts` (per-file), `lib/intent-preparation/semantic-normalization.ts` (triage+normalize), `lib/GateSemanticReviewSupport.ts` (critique), `lib/taxonomy/generation.ts` (verb categorization); deterministic: `claim-classifier.ts`, `actionability.ts`, `elicitation.ts`, `assertion-generator.ts`.
- Intent flow: `product-codebase-intel/src/intent/model.ts` `buildIntentMap()` (deterministic, confirmed by direct read) → `IntentPreparationService` (2 LLM calls) → `reconcile/PlanHandler.ts` (deterministic).
Rekon surfaces reviewed: `packages/llm-provider/src/index.ts` (task enum + embedding interfaces), `packages/capability-model/src/intent-plan-actionability-report.ts` (semantic adapter + slice-142 guards), CLI.

## OLD LLM SEMANTIC SURFACES

LLM-backed: per-file scan (`runPureLlmPipeline`), plan triage (haiku) + normalization
(sonnet), gate semantic review (`buildReviewPrompt`), verb categorization, model
comparison. All optional with deterministic fallback. Provider: Anthropic + OpenAI,
tier-routed, Zod-validated, retry-with-hint, prompt-only hallucination guards,
`source:'llm'` provenance (model name not persisted).

## REKON CURRENT STATE

`@rekon/llm-provider`: `RekonLlmRouter` + fetch-based OpenAI-compatible provider +
`coercePhaseDrafts`; task enum declares 6 LLM tasks (only `plan.semantic-normalize`
wired) + 3 embedding tasks + `RekonEmbeddingProvider` interface (no live impl).
`@rekon/capability-model`: deterministic parse + semantic adapter + slice-142
quality guards (unsupported path/command, non-goal preservation, over-actionable) +
`normalizationTrace` persisting provider/model/warnings/provenance. Rekon's guards
and provenance **exceed** codebase-intel.

## GAP MATRIX

See the memo's comparison matrix. The single genuine non-embedding parity gap is
**per-file semantic file understanding** (codebase-intel's `runPureLlmPipeline`),
which Rekon can ground against its existing capability ontology. Intent
classification, elicitation, actionability, and merge-back were deterministic in
codebase-intel — already at parity in Rekon.

## OPTIONS CONSIDERED

A (stop at plan-review) — rejected (broader parity). B (finish LLM semantic parsing
before embeddings) — **selected**. C (jump to embeddings) — deferred. D (literal
clone) — rejected (preserve behavior in Rekon architecture). E (live LLM everywhere
by default) — rejected (cost/privacy/surprise).

## SELECTED ARCHITECTURE

Option B: reuse `@rekon/llm-provider` (routing) + `@rekon/capability-model` (pure
builders + deterministic validators) + `@rekon/cli` (explicit selection); add a
future semantic file-understanding capability. Embeddings stay out.

## BOUNDARY MODEL

LLM semantic output is proposal, not proof. Semantic parsing must not approve plans,
execute commands, write source files, or run Circe. Provider calls must be explicit
or configured. Source-text privacy is an explicit policy decision. Embeddings
deferred. intent:go deferred.

## EMBEDDINGS DEFERRED

codebase-intel's embeddings stack (`lib/embeddings.ts`, Voyage `voyage-code-3`,
feature-bag vectors, HNSW ANN, `EmbeddingRepository`) is mature and separate from
the intent flow. Rekon scaffolds the interfaces only. Embeddings get their own
audit/architecture slice after the LLM semantic-parsing layer is finished.

## TESTS / VERIFICATION

- Docs test: 16 assertions (boundary statements + 4 tables + CHANGELOG + packet).
- Full 9-command gate: green (decision-only; no behavior change).
- No CLI smoke required (decision batch).

## INTENTIONALLY UNTOUCHED

No semantic-parsing implementation; no embeddings; no providers added; no live
provider runs; no package additions; no CLI/source/test-of-behavior changes; no
version bump; no branch.

## RISKS / FOLLOW-UP

- The audit is primary-source but bounded; a future implementation slice should
  re-ground against `runPureLlmPipeline` before building.
- Source-text privacy needs an explicit policy artifact when file contents are sent
  to a provider (flagged for Semantic File Understanding v1).
- Minor parity items (retry-with-hint, Zod-style validation) are optional
  enhancements, not blockers.

## NEXT STEP

**Semantic File Understanding v1** (per-file LLM scan, ontology-grounded,
proposal-not-proof, no writes/execution/Circe/auto-approval). Embeddings follow as
their own later track (Embeddings Parity Audit / Embedding Index Decision). Do not
start without a confirmed Work Order against the new SHA.
