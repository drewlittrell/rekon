# Semantic File Understanding

Status: **Implemented** (v1, slice 144).

Semantic file understanding is Rekon's per-file scan: it reads one source file and
reports what that file is and does. It restores the old codebase-intel per-file LLM
pipeline (`runPureLlmPipeline`) inside Rekon's provider/router/artifact architecture,
under Rekon's boundaries.

It produces one [`SemanticFileUnderstandingReport`](../artifacts/semantic-file-understanding-report.md)
per file: a **deterministic structural understanding** that is always present, plus an
optional **semantic understanding** when an LLM provider is explicitly selected.

## The deterministic core is always on

Regardless of mode, the builder deterministically extracts, from the file text alone:

- the language (from the extension),
- line count and byte length,
- the file's `imports`,
- the file's `publicExports`,
- the file's `responsibilities` (top-level functions / classes).

**Imports and public exports are always the deterministic extraction.** This is the
hallucination guard, mirroring the old per-file pipeline, which always overrode
LLM-claimed imports/exports with the AST ground truth. A provider can never replace
them.

## Semantic understanding is a proposal

When `--semantic auto` or `--semantic required` selects a provider, the builder asks it
for a `purpose`, `responsibilities`, `touchedConcepts`, `capabilitySignals`, and
`findings`. That output is treated as a proposal:

- **Semantic file understanding is proposal/context, not proof.**
- **Provider output is schema-validated and deterministically rechecked** before it is
  trusted: the adapter result is shape-coerced (bad signals dropped, invalid
  confidences/severities normalized), and the deterministic extraction stays
  authoritative for imports and exports.
- The `normalizationTrace` records the `method`
  (`deterministic` / `semantic-llm` / `deterministic-fallback`), whether semantic
  understanding was invoked, the `provider` and `model` when used, the `provenance`
  (`source-only` or `semantic-llm`), and any warnings.

## Modes

- `off` (default): deterministic only; no provider is constructed and no key is read.
- `auto`: use the provider when available; if it is unavailable or returns nothing
  usable, fall back to deterministic understanding with a warning
  (`status: provider-unavailable`).
- `required`: the provider must return a usable result; otherwise the command exits
  non-zero and writes no report.

The CLI is the only place that reads the API key (from `OPENAI_API_KEY`); the
capability-model builder never reads the environment and never stores a key.

## Boundaries

Semantic file understanding reads source; it never acts on it.

- **Semantic file understanding executes no commands.**
- **Semantic file understanding writes no source files.**
- **Semantic file understanding generates no embeddings** — embeddings are a separate,
  deferred track.
- **Semantic file understanding creates no PreparedIntentPlan.**
- **Semantic file understanding creates no WorkOrder or VerificationPlan** (and no
  VerificationRun or VerificationResult).
- **Semantic file understanding does not run Circe.**
- **intent:go remains deferred.**

Every `SemanticFileUnderstandingReport` carries a `boundaries` block whose eight
booleans are all `false`; the kernel factory forces them false and the validator
rejects any report whose boundary value is not `false`.

## CLI

```bash
rekon semantic file understand --path <file> \
  [--semantic off|auto|required] \
  [--llm-provider <id>] [--llm-model <model>] \
  [--root <path>] [--json]
```

It reads one file, computes its sha256, builds the report, and writes exactly one
`SemanticFileUnderstandingReport` artifact (category `actions`). It does not modify the
source file.

## Related

- [SemanticFileUnderstandingReport artifact](../artifacts/semantic-file-understanding-report.md)
- [Semantic File Understanding v1 strategy](../strategy/semantic-file-understanding-v1.md)
- [Classic LLM Semantic Parsing Parity Decision](../strategy/classic-llm-semantic-parsing-parity-decision.md)
- [Rekon LLM Provider Routing concept](./rekon-llm-provider-routing.md)
- [Intent Plan Compiler concept](./intent-plan-compiler.md)

## Semantic File Understanding Safety Review

Semantic File Understanding v1 was reviewed (slice 145) and found **safe/stable** as a proposal/context layer: semantic file understanding is proposal/context, not proof; deterministic structural facts remain authoritative for imports and public exports; provider output is schema-validated and deterministically rechecked; source files are read, not modified; no command execution, embeddings, PreparedIntentPlan / WorkOrder / VerificationPlan / VerificationRun / VerificationResult, or Circe; intent:go, scan integration, and embeddings remain deferred. Next: a Semantic File Understanding Scan Integration Decision. See [Semantic File Understanding Safety Review](../strategy/semantic-file-understanding-safety-review.md).
