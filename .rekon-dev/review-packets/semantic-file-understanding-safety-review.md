# Review Packet — Semantic File Understanding Safety Review (slice 145)

Base SHA: `bc0d34a`. Branch: none (push to main after the gate). Strategy/safety-review
batch. No runtime behavior changes.

## CHANGES MADE

- `docs/strategy/semantic-file-understanding-safety-review.md` — new safety-review memo.
- `.rekon-dev/review-packets/semantic-file-understanding-safety-review.md` — new (this).
- `tests/docs/semantic-file-understanding-safety-review.test.mjs` — new (23 assertions).
- Doc updates: strategy memo + artifact + concept + parity decision + 2 concepts + 2
  release docs + README + CHANGELOG (+ optional roadmaps).
- No source code, no tests-of-behavior, no CLI changes, no package additions.

## PUBLIC API CHANGES

None. Documentation-only batch.

## PURPOSE PRESERVATION CHECK

Slice 144 restored the old codebase-intel per-file LLM scan as a report-only file
understanding layer. The risk was shipping a provider-touching capability without an
explicit safety review before any scan/intent-context integration. This review grounds
each guarantee in the shipped source: semantic output is proposal/context, not proof;
deterministic facts win for imports/exports; provider output is schema-validated and
deterministically rechecked; no source mutation, command execution, embeddings, or
spine-artifact creation occurs; intent:go stays deferred. It selects the scan-integration
decision as the next step and keeps embeddings separate. Purpose preserved.

## CODEBASE-INTEL ALIGNMENT

The old per-file pipeline overrode LLM-claimed imports/exports with AST ground truth;
Rekon mirrors that with deterministic extraction authoritative for imports/exports, and
goes further by persisting provider/model/method provenance and structurally enforcing
boundaries. Alignment confirmed; Rekon's guards exceed the old prompt-only approach.

## IMPLEMENTATION REVIEWED

Grounded at `bc0d34a` (using `grep -a` for the em-dash kernel file): kernel type +
factory + validator + schema + boundary keys; the capability-model builder (deterministic
extraction + coercion); SDK/runtime registration (category `actions`); the CLI command +
router adapter; the contract + docs tests.

## ARTIFACT MODEL REVIEW

Eight-field report with a `boundaries` block of eight false-only booleans. Factory forces
them false; validator rejects `boundaries[key] !== false`. Status values: `understood`,
`needs-review`, `provider-unavailable`, `blocked`.

## DETERMINISTIC EXTRACTION REVIEW

`summary.publicExports = detExports` and `summary.imports = detImports` — deterministic
extraction is authoritative; provider-claimed imports/exports are ignored. Language-gated
regexes prevent JS/Python cross-contamination and unexported-class false positives.

## SEMANTIC PROVIDER REVIEW

`coerceSemanticUnderstanding` shape-gates provider output (drops bad signals/findings,
normalizes invalid confidence/severity to `low`); the deterministic recheck remains
authoritative. The builder imports only `node:crypto` — no fs, no child_process, no
fetch. Provider/model/provenance/warnings recorded in `normalizationTrace`.

## CLI REVIEW

Reads one file (`readFile`), computes sha256, writes one report
(`store.write(report, { category: "actions" })`); never writes the source. The CLI is the
sole env-key reader. No-key `auto` falls back; no-key `required` exits non-zero with no
report. Command surfaced in `usage` + welcome.

## BOUNDARY REVIEW

Verified: no command execution, no source writes, no embeddings, no PreparedIntentPlan /
WorkOrder / VerificationPlan / VerificationRun / VerificationResult, no Circe; intent:go,
scan integration, and embeddings all deferred.

## RECOMMENDATION

Semantic File Understanding v1 is safe/stable. Next: Semantic File Understanding Scan
Integration Decision. Embeddings remain a separate, later track.

## TESTS / VERIFICATION

- Docs test: 23 assertions (headings, statements, 4 tables, CHANGELOG, packet).
- Full 9-command gate: green (no behavior change). No CLI smoke (strategy batch).

## INTENTIONALLY UNTOUCHED

No implementation changes; no scan/intent-context integration; no embeddings; no provider
packages; no live provider runs; no version bump; no branch.

## RISKS / FOLLOW-UP

- The deterministic extraction is regex-based (best-effort), not a full parser — adequate
  for common JS/TS/Python; a future slice could ground it on the AST extractor.
- Source-text privacy: sending file contents to a provider is opt-in today; the scan
  integration decision must make any default-on behavior an explicit, surfaced policy.

## NEXT STEP

**Semantic File Understanding Scan Integration Decision** — explicit opt-in, no surprising
provider calls, no default LLM during scan, cache/staleness + privacy policy, and the
relationship to intent context. Embeddings follow as their own later track.
