# Review Packet — Semantic File Understanding v1 (slice 144)

Base SHA: `12ae032`. Branch: none (push to main after the gate). Track A — the first
non-embedding semantic-parsing implementation.

## CHANGES MADE

- `packages/kernel-repo-model/src/index.ts` — new `SemanticFileUnderstandingReport` type
  + sub-types + `createSemanticFileUnderstandingReport` (factory, forces boundaries
  false) + `validateSemanticFileUnderstandingReport` (rejects non-false boundaries) +
  `assertSemanticFileUnderstandingReport` + `semanticFileUnderstandingReportSchema`.
- `packages/sdk/src/index.ts` — registered `SemanticFileUnderstandingReport` in
  `BUILT_IN_ARTIFACT_TYPES`.
- `packages/runtime/src/index.ts` — registered `SemanticFileUnderstandingReport: "actions"`
  in `ARTIFACT_CATEGORY_BY_TYPE`.
- `packages/capability-model/src/semantic-file-understanding-report.ts` — new pure
  builder `buildSemanticFileUnderstandingReport` + adapter types + deterministic
  extraction (language/imports/exports/responsibilities/purpose) + provider-output
  coercion. Re-exported from the package barrel.
- `packages/cli/src/index.ts` — `rekon semantic file understand` command +
  `createSemanticFileUnderstandingAdapter` (router-bound, `artifact.summary` task) +
  usage line + welcome "Analysis:" section.
- Tests: `tests/contract/semantic-file-understanding-report.test.mjs` (23) +
  `tests/docs/semantic-file-understanding-report.test.mjs` (12).
- Docs: 3 new + this packet + ~9 updates + CHANGELOG + README.

## PUBLIC API CHANGES

New (experimental): `SemanticFileUnderstandingReport` artifact type + kernel
factory/validator/schema; `buildSemanticFileUnderstandingReport` +
`SemanticFileUnderstandingAdapter` in `@rekon/capability-model`; `rekon semantic file
understand` CLI command. No existing API changed; no provider package added; no version
bump.

## PURPOSE PRESERVATION CHECK

The parity decision found one genuine non-embedding gap: the old codebase-intel per-file
LLM scan. This slice restores that behavior inside Rekon's safer architecture —
deterministic extraction always on with imports/exports authoritative (the same
hallucination guard the old pipeline enforced by AST-override), provider output as a
schema-validated, deterministically-rechecked proposal, full provenance (provider +
model + method) persisted, and every Rekon boundary held: no command execution, no
source writes, no embeddings, no PreparedIntentPlan / WorkOrder / VerificationPlan, no
Circe, intent:go deferred. Purpose preserved.

## SOURCE REVIEW

Re-grounded against the primary source (codebase-intel `runPureLlmPipeline`,
`capability.schema.ts`, `analyze-file.txt`, `validateAgainstOntology.ts`) via a
read-only audit: single-file in, deterministic AST facts + LLM merged, imports/exports
always overridden with ground truth, evidence-required capabilities, model + source
provenance persisted, file-hash staleness. Rekon surfaces mirrored: the IntentStatusReport
kernel artifact pattern, the IntentPlanActionabilityReport builder/header/normalizationTrace
pattern, and the slice-138 router-bound CLI adapter.

## ARTIFACT MODEL

`SemanticFileUnderstandingReport` (category `actions`): `status` (understood /
needs-review / provider-unavailable / blocked), `file` (path / sha256 / language /
lineCount / byteLength), `normalizationTrace` (method / invokedSemanticUnderstanding /
provider? / model? / provenance / warnings), `summary` (purpose / responsibilities /
publicExports / imports / touchedConcepts), `capabilitySignals[]`, `findings[]`, and a
`boundaries` block of eight false-only booleans.

## DETERMINISTIC FALLBACK

Always-on extraction from the file text: language by extension; line count; byte length;
imports and public exports by language-gated regex (Python patterns gated to Python so
JS `import x from "y"` is not double-matched and an unexported `class` is never reported
as an export); responsibilities = top-level functions/classes; purpose = leading doc
comment. Imports/exports are authoritative and the provider never overrides them.

## SEMANTIC PROVIDER PATH

`--semantic auto|required` builds a router-bound adapter over the OpenAI-compatible
provider (self-guards on a missing key, no network). The prompt asks for purpose /
responsibilities / touchedConcepts / capabilitySignals / findings and forbids inventing
capabilities, claiming commands ran, or inferring unseen behavior. The adapter returns
the raw result; the builder coerces it (shape gate) and re-checks deterministically. The
builder owns all mode logic: `auto` falls back with a warning; `required` throws (no
report). The CLI is the only env-key reader.

## CLI SURFACE

`rekon semantic file understand --path <file> [--semantic off|auto|required]
[--llm-provider <id>] [--llm-model <model>] [--root <path>] [--json]`. Reads one file,
computes sha256, writes one report. JSON output surfaces status, artifact ref, file
facts, normalization, summary counts, and boundary booleans. Does not modify the source.

## BOUNDARY MODEL

Semantic file understanding is proposal/context, not proof. It executes no commands,
writes no source files, generates no embeddings, creates no PreparedIntentPlan /
WorkOrder / VerificationPlan / VerificationRun / VerificationResult, runs no Circe, and
intent:go remains deferred. Enforced structurally: factory forces the eight boundary
booleans false; validator rejects any non-false boundary.

## TESTS / VERIFICATION

- Contract: 23 assertions (1-17 lib: deterministic extraction, mode handling, provider
  coercion, boundary enforcement; 18-23 CLI no-key: off writes one report, auto falls
  back, required exits non-zero with no report, help lists the command, artifacts
  validate clean, source unchanged).
- Docs: 12 assertions.
- Full 9-command gate green; CLI smoke matrix confirmed.

## INTENTIONALLY UNTOUCHED

No embeddings; no vector storage / retrieval; no new provider package; scan is NOT
changed to run per-file understanding by default; no live provider calls in committed
tests (key-free); no version bump; no branch.

## RISKS / FOLLOW-UP

- The deterministic extraction is regex-based (best-effort), not a full parser; it is
  correct for common JS/TS/Python forms and intentionally conservative. A future slice
  could ground it on the existing AST extractor.
- Source-text privacy: sending file contents to a provider is opt-in (`--semantic`); a
  future policy artifact should make this explicit if scan ever opts in by default.

## NEXT STEP

**Semantic File Understanding Safety Review** — review the report before integrating it
into scan or intent context. Still no embeddings, source writes, command execution,
approval, or intent:go. Embeddings remain a separate, later track.
