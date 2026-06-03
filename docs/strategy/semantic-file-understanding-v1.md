# Semantic File Understanding v1

Status: **Implemented** (slice 144). Base: `12ae032`. Track A (finish LLM-backed
semantic parsing) — the first non-embedding semantic-parsing capability.

This batch implements the per-file semantic understanding capability decided by the
[Classic LLM Semantic Parsing Parity Decision](./classic-llm-semantic-parsing-parity-decision.md):
the single genuine non-embedding parity gap with the old codebase-intel system was its
per-file LLM scan (`runPureLlmPipeline`). Rekon now has an equivalent, inside its own
provider/router/artifact architecture and under its own boundaries.

## What shipped

- A new artifact, [`SemanticFileUnderstandingReport`](../artifacts/semantic-file-understanding-report.md),
  registered in `@rekon/kernel-repo-model` (type + factory + validator + schema), the
  SDK (built-in artifact type), and the runtime (category `actions`).
- A pure builder `buildSemanticFileUnderstandingReport` in `@rekon/capability-model`
  that reads no files, runs no commands, and makes no network calls — it transforms
  passed-in file text into the report.
- A CLI command `rekon semantic file understand` that reads one file, computes its
  sha256, injects a router-bound provider adapter, and writes one report.

## Architecture

The implementation reuses the existing layers, exactly as the parity decision specified:

```text
@rekon/llm-provider     provider routing + model selection (reused; task artifact.summary)
@rekon/capability-model pure builder + deterministic extraction + provider-output coercion
@rekon/cli              explicit `semantic file understand` command; the only env-key reader
@rekon/kernel-repo-model SemanticFileUnderstandingReport contract + validators
```

The deterministic structural extraction (language, line/byte counts, imports, public
exports, responsibilities) is always on. **Imports and public exports are always the
deterministic extraction — the hallucination guard.** The semantic adapter only adds a
purpose / capability signals / findings, and only when a provider is explicitly
selected. Provider output is schema-validated and deterministically rechecked; it is a
proposal, not proof.

## Modes and provenance

- `off`: deterministic only; no provider, no key read.
- `auto`: provider when available, else deterministic fallback with a warning
  (`status: provider-unavailable`).
- `required`: provider must return a usable result, else exit non-zero and write no
  report.

The `normalizationTrace` records method, whether semantic understanding was invoked,
provider/model when used, provenance, and warnings — stronger provenance than the old
system, which did not persist the model name with per-file results.

## Boundaries

Semantic file understanding **executes no commands**, **writes no source files**,
**generates no embeddings**, **creates no PreparedIntentPlan / WorkOrder /
VerificationPlan**, does not run Circe, and **intent:go remains deferred**. The report's
eight boundary booleans are forced false by the factory and rejected if non-false by the
validator.

## Verification

- Contract test: 23 assertions (deterministic extraction, mode handling, provider
  coercion, boundary enforcement, CLI no-key behavior, source-unchanged).
- Docs test: 12 assertions.
- Full 9-command gate green; CLI smoke matrix (off / auto-fallback / required-block /
  validate / source-unchanged) confirmed.

## Next step

Recommended: **Semantic File Understanding Safety Review** — review this report before
integrating it into scan or intent context. Still no embeddings, no source writes, no
command execution, no approval, no intent:go. A separate later decision governs whether
scan opts into per-file semantic understanding by default; embeddings remain their own
deferred track ([Embeddings Parity Audit](./classic-llm-semantic-parsing-parity-decision.md)).

## Related

- [Semantic File Understanding concept](../concepts/semantic-file-understanding.md)
- [SemanticFileUnderstandingReport artifact](../artifacts/semantic-file-understanding-report.md)
- [Classic LLM Semantic Parsing Parity Decision](./classic-llm-semantic-parsing-parity-decision.md)
- [Intent Plan Semantic Quality Hardening](./intent-plan-semantic-quality-hardening.md)
- [Rekon LLM Provider Routing Implementation](./rekon-llm-provider-routing-implementation.md)

## Semantic File Understanding Safety Review

Semantic File Understanding v1 was reviewed (slice 145) and found **safe/stable** as a proposal/context layer: semantic file understanding is proposal/context, not proof; deterministic structural facts remain authoritative for imports and public exports; provider output is schema-validated and deterministically rechecked; source files are read, not modified; no command execution, embeddings, PreparedIntentPlan / WorkOrder / VerificationPlan / VerificationRun / VerificationResult, or Circe; intent:go, scan integration, and embeddings remain deferred. Next: a Semantic File Understanding Scan Integration Decision. See [Semantic File Understanding Safety Review](./semantic-file-understanding-safety-review.md).
