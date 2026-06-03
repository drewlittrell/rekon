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

## Semantic File Understanding Scan Integration Decision

How `SemanticFileUnderstandingReport` integrates with scan is decided (slice 146): scan remains deterministic by default; repo-scale understanding arrives first as an explicit batch command (`rekon semantic files understand --changed|--all`) before any `rekon scan --semantic-files` flag. Provider calls are never surprising defaults; source text is not sent to providers by default; reports are proposal/context, not proof; no command execution, source writes, or embeddings; embeddings remain a separate track; intent:go deferred. Next: Semantic Files Understand Batch Command v1. See [Semantic File Understanding Scan Integration Decision](./semantic-file-understanding-scan-integration-decision.md).

## Semantic File Understanding Scan Integration

Semantic file understanding is now an explicit opt-in scan layer (slice 147): `rekon scan --semantic-files auto|required` writes one `SemanticFileUnderstandingReport` per selected file, reusing the shipped single-file builder and router-bound adapter. Plain `rekon scan` (and `--semantic-files off`) stay deterministic and call no provider. Provider calls are never surprising defaults; source text is not sent to providers by default; reports are proposal/context, not proof; no command execution, source writes, or embeddings; embeddings remain a separate track; intent:go deferred. This reverses the slice-146 batch-command-first decision. See [Semantic File Understanding Scan Integration](./semantic-file-understanding-scan-integration.md).

## Semantic File Understanding Scan Integration Safety Review

The `rekon scan --semantic-files off|auto|required` integration was reviewed (slice 148) and found **safe/stable**: plain `rekon scan` remains deterministic; semantic file understanding during scan is explicit opt-in only; provider calls are never surprising defaults; source text is not sent to providers by default; `--semantic-files off` writes no report; auto falls back safely; required fails cleanly without partial report writes; deterministic imports/exports remain authoritative; source files are read, not modified; no command execution, embeddings, PreparedIntentPlan / WorkOrder / VerificationPlan / VerificationRun / VerificationResult, or Circe; intent:go deferred; reports are not yet consumed automatically by intent context. Next: Semantic File Understanding Intent Context Decision; embeddings remain a separate track. See [Semantic File Understanding Scan Integration Safety Review](./semantic-file-understanding-scan-integration-safety-review.md).

## Semantic File Understanding Intent Context Decision

How `IntentAssessmentReport` and `IntentPlanActionabilityReport` may consume `SemanticFileUnderstandingReport` is decided (slice 149): **Option B — explicit semantic context consumption with latest-by-path fallback** (`rekon intent assess --semantic-context latest|--semantic-context-ref <ref>`, `rekon intent plan review --semantic-context latest|--semantic-context-ref <ref>`). Semantic reports remain proposal/context, not proof; consumption is explicit, not automatic; semantic context never approves plans, satisfies proof gates by itself, replaces deterministic evidence, executes commands, writes source, creates WorkOrder/VerificationPlan, or runs Circe; stale reports are not consumed silently; embeddings and intent:go remain deferred. Next: Semantic File Understanding Intent Context Implementation. See [Semantic File Understanding Intent Context Decision](./semantic-file-understanding-intent-context-decision.md).
