# Semantic File Understanding Safety Review

Status: **Reviewed — safe/stable** (slice 145). Base: `bc0d34a`. Strategy/safety-review
batch; no runtime behavior changes.

## Decision Summary

Semantic File Understanding v1 (slice 144) is **safe/stable** as a proposal/context
layer. The new `SemanticFileUnderstandingReport` artifact and the
`rekon semantic file understand` command read one source file and report a
deterministic structural understanding plus an optional, bounded semantic
understanding. Every boundary holds. **Semantic file understanding is proposal/context,
not proof.** The recommended next slice is the **Semantic File Understanding Scan
Integration Decision**; embeddings remain a separate, later track.

## Why This Review Exists

Slice 144 restored the old codebase-intel per-file LLM scan inside Rekon's
provider/router/artifact architecture. Because that capability sends file contents to a
provider (when opted in) and adds a new artifact + command, it must be reviewed before
it is wired into scan or intent context. This review grounds each guarantee in the
shipped source so a later integration decision can build on a verified base.

## Implementation Reviewed

Grounded against the shipped code at `bc0d34a` (kernel comments contain an em dash, so
`grep -a` was used for `kernel-repo-model/src/index.ts`):

- `packages/kernel-repo-model/src/index.ts` — `SemanticFileUnderstandingReport` type,
  `createSemanticFileUnderstandingReport`, `validateSemanticFileUnderstandingReport`,
  `assertSemanticFileUnderstandingReport`, `semanticFileUnderstandingReportSchema`,
  `SEMANTIC_FILE_UNDERSTANDING_BOUNDARY_KEYS`.
- `packages/capability-model/src/semantic-file-understanding-report.ts` — the builder,
  deterministic extraction, and provider-output coercion.
- `packages/sdk/src/index.ts` + `packages/runtime/src/index.ts` — registration (built-in
  type; category `actions`).
- `packages/cli/src/index.ts` — `rekon semantic file understand` +
  `createSemanticFileUnderstandingAdapter`.
- `tests/contract/semantic-file-understanding-report.test.mjs` (23) +
  `tests/docs/semantic-file-understanding-report.test.mjs` (12).

## Artifact Model Review

`SemanticFileUnderstandingReport` (category `actions`) carries `status`, `file`
(path/sha256/language/lineCount/byteLength), `normalizationTrace`, `summary`,
`capabilitySignals`, `findings`, and a `boundaries` block of eight booleans. The factory
forces all eight booleans to `false`; the validator iterates
`SEMANTIC_FILE_UNDERSTANDING_BOUNDARY_KEYS` and rejects any report whose boundary value
is not `false` ("Expected false."). The artifact is therefore structurally incapable of
recording an action it must not perform.

## Deterministic Extraction Review

The builder always computes language (by extension), line count, byte length, imports,
public exports, responsibilities, and a purpose fallback from the file text. The report
sets `summary.publicExports = detExports` and `summary.imports = detImports` —
**deterministic structural facts remain authoritative for imports and public exports.**
A provider's claimed imports/exports are ignored. The extraction regexes are
language-gated (Python patterns only on Python) so JS `import x from "y"` is not
double-counted and an unexported class is never reported as an export.

## Semantic Provider Review

When `--semantic auto|required` selects a provider, the builder calls an injected adapter
and then **provider output is schema-validated and deterministically rechecked**:
`coerceSemanticUnderstanding` drops malformed capability signals/findings and normalizes
invalid confidences/severities to `low` before the report is built, and the deterministic
extraction stays authoritative. The builder reads no files, runs no commands, and makes
no network calls — it imports only `node:crypto` (for the sha256 fallback). The
`normalizationTrace` records method, provider, model, provenance, and warnings.

## CLI Review

`rekon semantic file understand` reads one file with `readFile` and writes exactly one
report with `store.write(report, { category: "actions" })`. **Source files are read, not
modified.** The CLI is the only place that reads the API key (from `OPENAI_API_KEY`);
the OpenAI-compatible provider self-guards on a missing key (clean refusal, no network).
No-key `auto` falls back to a deterministic report with a warning; no-key `required`
exits non-zero and writes no report. The command appears in `usage` and the welcome
"Analysis:" section.

## Boundary Review

All boundaries hold, verified in source and tests:

- **Semantic file understanding executes no commands.**
- **Semantic file understanding writes no source files.**
- **Semantic file understanding generates no embeddings.**
- **Semantic file understanding creates no PreparedIntentPlan.**
- **Semantic file understanding creates no WorkOrder.**
- **Semantic file understanding creates no VerificationPlan.**
- **Semantic file understanding creates no VerificationRun or VerificationResult.**
- **Semantic file understanding runs no Circe.**
- **intent:go remains deferred.**
- **Scan integration remains deferred.**
- **Embeddings remain deferred to a separate track.**

## Surface table

| Surface | Status | Safety Finding |
| --- | --- | --- |
| SemanticFileUnderstandingReport | shipped | proposal/context only |
| buildSemanticFileUnderstandingReport | shipped | pure helper |
| deterministic extraction | shipped | authoritative imports/exports |
| semantic adapter path | shipped | optional provider proposal |
| auto fallback | shipped | safe fallback |
| required failure | shipped | non-zero / no report |
| CLI semantic file understand | shipped | writes one report |
| embeddings | absent | deferred |
| scan integration | absent | deferred |

## Boundary table

| Boundary | Decision |
| --- | --- |
| semantic output vs proof | proposal/context only |
| deterministic facts vs semantic claims | deterministic facts win |
| semantic file understanding vs source files | read-only |
| semantic file understanding vs command execution | no execution |
| semantic file understanding vs embeddings | not generated |
| semantic file understanding vs PreparedIntentPlan | not created |
| semantic file understanding vs WorkOrder | not created |
| semantic file understanding vs VerificationPlan | not created |
| semantic file understanding vs VerificationRun / Result | not created |
| semantic file understanding vs Circe | not run |
| semantic file understanding vs intent:go | deferred |

## Mode table

| Mode | Review Finding |
| --- | --- |
| off | deterministic report |
| auto with unavailable provider | deterministic fallback with warning |
| required with unavailable provider | non-zero / no report |
| semantic provider output | schema-checked and rechecked |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare Semantic File Understanding v1 safe/stable | selected | report-only boundary holds |
| scan integration decision next | selected | next LLM semantic parsing step |
| embeddings next | deferred | separate track |
| auto-run during scan now | rejected | surprise/cost/privacy risk |
| treat semantic output as proof | rejected | proposal-only boundary |

## Decision questions answered

1. **Is `SemanticFileUnderstandingReport` safe/stable?** Yes — boundaries are structurally
   enforced (factory forces false, validator rejects non-false).
2. **Is `rekon semantic file understand` safe/stable?** Yes — read-only, writes one report.
3. **Does deterministic structural extraction remain authoritative for imports/exports?**
   Yes — `summary.publicExports`/`summary.imports` come from the deterministic extraction.
4. **Does semantic provider output remain proposal/context, not proof?** Yes.
5. **Is provider output schema/shape checked?** Yes — `coerceSemanticUnderstanding`.
6. **Is provider output deterministically rechecked?** Yes — deterministic facts win.
7. **Does auto mode fall back safely?** Yes — deterministic report + warning,
   `status: provider-unavailable`.
8. **Does required mode fail cleanly when the provider is unavailable?** Yes — throws; the
   CLI exits non-zero and writes no report.
9. **Does the command read source files without modifying them?** Yes.
10. **Does the command execute no commands?** Yes.
11. **Does the command generate no embeddings?** Yes.
12. **Does the command create no PreparedIntentPlan?** Yes.
13. **Does the command create no WorkOrder?** Yes.
14. **Does the command create no VerificationPlan?** Yes.
15. **Does the command create no VerificationRun or VerificationResult?** Yes.
16. **Does the command run no Circe?** Yes.
17. **Does intent:go remain deferred?** Yes.
18. **Should scan integration be next?** Yes — as an explicit decision, not an
    implementation.
19. **Or should embeddings remain separate and later?** Embeddings remain separate and
    later.
20. **What slice follows?** The Semantic File Understanding Scan Integration Decision.

## Recommendation

**Semantic File Understanding v1 is safe/stable.** Proceed to the **Semantic File
Understanding Scan Integration Decision** next; keep embeddings a separate, later track.

## What This Does Not Do

This review changes no runtime behavior, changes no `SemanticFileUnderstandingReport`
implementation, integrates nothing into scan or intent context, implements no embeddings,
adds no vector storage or retrieval, adds no provider packages, runs no live providers,
executes no commands, writes no source, creates no PreparedIntentPlan / WorkOrder /
VerificationPlan / VerificationRun / VerificationResult, runs no Circe, implements no
intent:go, publishes nothing to npm, and bumps no versions.

## Follow-Up Work

- **Semantic File Understanding Scan Integration Decision** (recommended next): define
  whether/how/when scan may produce `SemanticFileUnderstandingReport` — explicit opt-in
  first, no surprising provider calls, no default LLM during scan, cache/staleness model,
  source-text privacy policy, and the relationship to intent context.
- **Embeddings Parity Audit / Embedding Index Decision** (alternative, later): start the
  separate embeddings track after this safety review.

## Related

- [Semantic File Understanding v1 strategy](./semantic-file-understanding-v1.md)
- [SemanticFileUnderstandingReport artifact](../artifacts/semantic-file-understanding-report.md)
- [Semantic File Understanding concept](../concepts/semantic-file-understanding.md)
- [Classic LLM Semantic Parsing Parity Decision](./classic-llm-semantic-parsing-parity-decision.md)
