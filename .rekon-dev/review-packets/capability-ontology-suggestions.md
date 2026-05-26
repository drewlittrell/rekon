# Review Packet: Capability Ontology Vocabulary Expansion v1

**Slice:** Capability ontology vocabulary expansion v1
(preview-first realisation of Option A from the built-in
baseline coverage review; step 4b of the translation-layer
implementation sequence).
**Status:** Implemented. Ready for review.
**Owning package:** `@rekon/capability-ontology`.
**Decision lineage:** [Capability Ontology Architecture Impact
Review](../../docs/strategy/capability-ontology-architecture-impact-review.md)
→ [Capability Ontology Translation Layer
Decision](../../docs/strategy/capability-ontology-translation-layer-decision.md)
→ [CapabilityNormalizationReport
v1](../../docs/artifacts/capability-normalization-report.md)
→ [Built-In Baseline Ontology Coverage
Review](../../docs/strategy/builtin-ontology-coverage-review.md)
→ [Capability ontology unknown-term operator review
surface](../../docs/artifacts/capability-normalization-review-ledger.md)
→ **this slice**.

## CHANGES MADE

- New artifact type `CapabilityOntologySuggestionReport`:
  - Registered in `@rekon/sdk` built-in artifact types
    (`schemaVersion: "0.1.0"`, `stability: "experimental"`).
  - Registered in `@rekon/runtime` artifact category map
    under `actions`.
- New helpers in `@rekon/capability-ontology`:
  - `buildCapabilityOntologySuggestionReport(input)`.
  - `validateCapabilityOntologySuggestionReport(value)`.
  - Type exports: `CapabilityOntologySuggestionKind`,
    `CapabilityOntologySuggestion`,
    `CapabilityOntologySuggestionSkipped`,
    `CapabilityOntologySuggestionSummary`,
    `CapabilityOntologySuggestionPreview`,
    `CapabilityOntologySuggestionReport`,
    `BuildCapabilityOntologySuggestionReportInput`.
- New CLI command
  `rekon capability ontology suggestions
  [--ledger <CapabilityNormalizationReviewLedger-id|type:id>]
  [--root <path>] [--json]`.
- 17-assertion contract test
  `tests/contract/capability-ontology-suggestions.test.mjs`.
- 9-assertion docs test
  `tests/docs/capability-ontology-suggestions.test.mjs`.
- New artifact reference doc
  `docs/artifacts/capability-ontology-suggestion-report.md`.
- Cross-link updates to: capability ontology concept doc,
  review-ledger artifact reference, coverage review memo,
  translation-layer decision memo, roadmap,
  classic-behavior roadmap, README, and CHANGELOG.

## PUBLIC API CHANGES

Additive only.

- New public exports from `@rekon/capability-ontology`:
  helpers + types listed above.
- New SDK built-in artifact type
  `CapabilityOntologySuggestionReport`.
- New runtime artifact category mapping (`actions`).
- One new CLI command. `usage()` lists it.

No existing public exports modified.

## PURPOSE PRESERVATION CHECK

- The report is **preview-only**. The proposed config is
  rendered as `before` / `after` JSON strings under
  `preview.patch`; `.rekon/capability-ontology.json` is
  **not** mutated. Contract test #10 asserts the file is
  not created.
- The surface does **not** mutate the
  `CapabilityNormalizationReviewLedger` (contract test #14
  asserts ledger digest unchanged before/after).
- The surface does **not** mutate
  `CapabilityNormalizationReport` (contract test #15).
- The surface does **not** mutate `CapabilityMap` (contract
  test #16 asserts index count + per-entry digests
  unchanged across `suggestions`).
- The surface does **not** mutate `EvidenceGraph` raw facts.
- The surface does **not** invoke an LLM. The transformation
  is a deterministic case-insensitive normalization of
  `extend-ontology` ledger entries.
- The layered ontology model is preserved — Layer 5
  audit / review surface, Layer 5' (this report)
  vocabulary-expansion preview surface, Layer 6
  (`CapabilityMap`) remains deferred.
- Source-write apply remains unavailable across the entire
  ontology track.

## CODEBASE-INTEL ALIGNMENT

- Preview-first matches classic `codebase-intel`'s
  source-write-reconciliation policy (preview before
  apply). Vocabulary expansion follows the same posture.
- Avoids the failure mode the built-in baseline coverage
  review identified: blind vocabulary expansion would encode
  noise. Operator decisions remain the gate; this report
  only renders an audit-friendly preview of what the
  config would look like.
- Preserves the architecture impact review's "no port of
  the monolithic `GraphOntologyValidator`" pin.

## ARTIFACT MODEL

- Type: `CapabilityOntologySuggestionReport`.
- Schema version: `0.1.0`.
- Stability: `experimental`.
- Category: `actions` (preview / suggestion artifact).
- Header carries the source ledger ref under `inputRefs`.
- `suggestions[]` carry stable ids, the four suggestion
  kinds, the source decision id, and the source ledger ref.
- `skipped[]` records candidate-level decisions skipped in
  v1, with provenance and the explicit v1 reason.
- `preview.patch.before` / `preview.patch.after` are JSON
  strings — readable diff-friendly representations of the
  existing config and the proposed config.
- `preview.message` is constant text that includes "not
  mutated by this report" and "Apply the proposed config
  manually if desired."

## CLI SURFACE

```bash
rekon capability ontology suggestions \
  [--ledger <CapabilityNormalizationReviewLedger-id|type:id>] \
  [--root <path>] [--json]
```

- Without `--ledger`, reads the **latest** ledger in the
  local artifact store.
- Reads optional `.rekon/capability-ontology.json` to seed
  the `before` patch field.
- Writes a single `CapabilityOntologySuggestionReport`
  under `.rekon/artifacts/actions/`.
- Fails with a clear message if no ledger exists.
- Human output ends with `Config remains unchanged.`.

## PREVIEW MODEL

- Only `extend-ontology` decisions feed the report.
- `termKind: verb` without `suggestedCanonical` →
  `add-canonical-verb`.
- `termKind: noun` without `suggestedCanonical` →
  `add-canonical-noun`.
- `termKind: verb` with `suggestedCanonical` →
  `add-verb-alias` (alias `term` → canonical).
- `termKind: noun` with `suggestedCanonical` →
  `add-noun-alias`.
- `termKind: candidate` is skipped with the explicit reason
  *"candidate-level decisions require manual ontology
  editing."*.
- `rename-symbol`, `noise-filter`, and `defer` decisions
  are ignored (do not appear in suggestions or skipped).
- Duplicate suggestions (case-insensitive term + canonical
  pair) collapse to a single suggestion.
- `before` and `after` are JSON strings rendered by
  `JSON.stringify(config, null, 2)` so the diff stays
  diff-friendly.

## TESTS / VERIFICATION

- 9-command pre-validation gate passed on `16c542d` before
  this batch began.
- 17-assertion contract test passing locally.
- 9-assertion docs test passing locally.
- Full 9-command verification gate to be re-run before
  merge.
- CLI smoke per the work order exercised end-to-end
  (refresh → normalize → review decide × N → suggestions →
  config absence assertion → artifacts validate).

## INTENTIONALLY UNTOUCHED

- Built-in ontology vocabulary in
  `packages/capability-ontology/src/index.ts` (the
  `BUILTIN_*` tables).
- Lexical splitter, candidate extractor, normalizer.
- `CapabilityNormalizationReport` artifact shape.
- `CapabilityNormalizationReviewLedger` artifact shape +
  append semantics.
- `rekon capability ontology normalize` CLI command.
- `rekon capability ontology review` subcommands.
- `.rekon/capability-ontology.json` loader behavior
  (`loadCapabilityOntologyConfig` is reused, not changed).
- `CapabilityMap` artifact shape and `runProject` flow.
- `EvidenceGraph` raw facts.
- Any other workspace package.
- All other CLI commands.

## RISKS / FOLLOW-UP

- **Apply path is intentionally manual.** Operators apply
  the proposed config themselves. A future `--apply` flag
  could automate the write step with a confirmation gate,
  but v1 deliberately defers that to keep operator
  control.
- **Skipped candidate-level decisions are inert.** v1
  surfaces them in `skipped[]` but does not propose a
  suggestion. A future slice might propose
  `add-canonical-noun` from candidate decisions when the
  operator supplies `suggestedCanonical`, but that requires
  a CLI surface change to the review `decide` command.
- **No --apply, no diff renderer.** Human output is a flat
  list of suggestions. A future slice can fold this into
  publication surfaces (architecture summary / agent
  contract) so operators see ontology expansion proposals
  in normal Rekon output.

## NEXT STEP

**Capability ontology suggestion publication surfacing.**
Surface the latest `CapabilityOntologySuggestionReport` in
`architecture-summary` and `agent-contract` publications so
operators see ontology expansion proposals without running
the dedicated CLI. The publication path will still **not**
mutate the config file.

`CapabilityMap` integration (Layer 6) remains deferred
until vocabulary expansion reaches a steady state across
multiple operator targets.
