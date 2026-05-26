# Review Packet: Capability Ontology Unknown-Term Operator Review Surface

**Slice:** Capability ontology unknown-term operator review
surface (Option C from the built-in baseline coverage review;
step 4a of the translation-layer implementation sequence).
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
→ **this slice**.

## CHANGES MADE

- New artifact type
  `CapabilityNormalizationReviewLedger`:
  - Registered in `@rekon/sdk` built-in artifact types
    (`schemaVersion: "0.1.0"`, `stability: "experimental"`).
  - Registered in `@rekon/runtime` artifact category map
    under `actions` (alongside `MemoryUsageLedger`,
    `IssueMergeDecisionLedger`).
- New helpers in `@rekon/capability-ontology`:
  - `suggestUnknownTerms(report, options)`.
  - `appendCapabilityNormalizationReviewDecision(input)`.
  - `summarizeCapabilityNormalizationReviewLedger(entries)`.
  - `validateCapabilityNormalizationReviewLedger(value)`.
  - `buildDecidedKeySet(ledger)`.
  - Type exports: `CapabilityNormalizationReviewDecision`,
    `CapabilityNormalizationReviewTermKind`,
    `CapabilityNormalizationReviewEntry`,
    `CapabilityNormalizationReviewLedgerSummary`,
    `CapabilityNormalizationReviewLedger`,
    `CapabilityNormalizationReviewSuggestion`,
    `SuggestUnknownTermsOptions`,
    `AppendCapabilityNormalizationReviewDecisionInput`.
  - Constant export: `DEFAULT_REVIEW_SUGGESTION_LIMIT`.
- Three new CLI subcommands under
  `rekon capability ontology review`:
  - `suggestions --report <ref> [--limit <n>]
    [--include-decided] [--json]`.
  - `decide --term <text> --term-kind verb|noun|candidate
    --decision extend-ontology|rename-symbol|noise-filter|defer
    --reason <text> [--suggested-canonical <text>]
    [--report <ref>] [--candidate <id>] [--json]`.
  - `decisions [--json]`.
- 18-assertion contract test
  `tests/contract/capability-normalization-review-ledger.test.mjs`.
- 12-assertion docs test
  `tests/docs/capability-normalization-review-ledger.test.mjs`.
- New artifact reference doc
  `docs/artifacts/capability-normalization-review-ledger.md`.
- Cross-link updates to: capability ontology concept doc,
  `CapabilityNormalizationReport` artifact reference,
  translation-layer decision memo, built-in ontology coverage
  review memo, roadmap, classic-behavior roadmap, README,
  and CHANGELOG.

## PUBLIC API CHANGES

Additive only.

- New public exports from `@rekon/capability-ontology`:
  helpers, types, and constants listed above.
- New SDK built-in artifact type
  `CapabilityNormalizationReviewLedger`.
- New runtime artifact category mapping (`actions`).
- Three new CLI subcommands. `usage()` lists them.

No existing public exports modified.

## PURPOSE PRESERVATION CHECK

- The ledger is **append-only**. `decide` appends one entry
  to the latest ledger (or creates a new ledger if none
  exists). Existing entries are never rewritten or removed.
- Recording an `extend-ontology` decision does **not**
  mutate `.rekon/capability-ontology.json` (test asserts the
  file is not created).
- The surface does **not** mutate
  `CapabilityNormalizationReport` (test asserts digest
  unchanged before/after `decide`).
- The surface does **not** add new `CapabilityMap` artifacts
  (test asserts the index count of `CapabilityMap` entries
  is unchanged across `decide` calls).
- The surface does **not** mutate `EvidenceGraph` raw facts.
- The surface does **not** invoke an LLM. Suggestions are
  computed from the existing `CapabilityNormalizationReport`
  candidate set by frequency aggregation.
- The layered ontology model is preserved — Layer 5
  (`CapabilityNormalizationReport`) remains the audit
  surface; the new ledger sits next to it as Layer 5'
  operator review surface and does not collapse Layer 6
  (`CapabilityMap`) into the same artifact.
- Source-write apply remains unavailable across the entire
  ontology track.

## CODEBASE-INTEL ALIGNMENT

- Substrate equivalent of the classic ontology review CLI
  expressed as a deterministic CLI + artifact, not a
  monolithic command.
- Avoids the failure mode the built-in baseline coverage
  review identified: blind vocabulary expansion would encode
  symbol noise + lexical-split limitations as canonical
  vocabulary. Operator decisions provide the evidence-driven
  gate.
- Preserves the "no port of the monolithic
  `GraphOntologyValidator`" pin from the architecture impact
  review.

## ARTIFACT MODEL

- Type: `CapabilityNormalizationReviewLedger`.
- Schema version: `0.1.0`.
- Stability: `experimental`.
- Category: `actions` (operator-decision ledger).
- Header carries optional `inputRefs` citing the
  `CapabilityNormalizationReport`(s) used during review.
- `entries[]` are append-only; `summary` recomputes on every
  append.
- Each entry has a stable `id`, the operator-supplied
  `term`, `termKind`, `decision`, `reason`, and `createdAt`,
  plus optional `createdBy`, `sourceReportRef`,
  `sourceCandidateId`, `suggestedCanonical`.

## CLI SURFACE

```bash
rekon capability ontology review suggestions \
  --report <CapabilityNormalizationReport-id|type:id> \
  [--limit <n>] [--include-decided] [--root <path>] [--json]

rekon capability ontology review decide \
  --term <text> \
  --term-kind verb|noun|candidate \
  --decision extend-ontology|rename-symbol|noise-filter|defer \
  --reason <text> \
  [--suggested-canonical <text>] \
  [--report <CapabilityNormalizationReport-id|type:id>] \
  [--candidate <candidate-id>] \
  [--root <path>] [--json]

rekon capability ontology review decisions [--root <path>] [--json]
```

- `suggestions` is read-only.
- `decide` writes a single `CapabilityNormalizationReviewLedger`
  artifact under `.rekon/artifacts/actions/`.
- `decisions` is read-only.

## OPERATOR DECISION MODEL

Decision values:

- `extend-ontology` — the term is a real capability verb or
  noun that belongs in the canonical vocabulary. A future
  vocabulary-expansion slice will use these decisions to
  produce a `.rekon/capability-ontology.json` **preview**.
- `rename-symbol` — the source repo should rename the symbol
  to match canonical capability language. No ontology
  change.
- `noise-filter` — the term is not a capability (e.g. HTTP
  method constant, internal state variable, framework
  constant). A future candidate-extraction filter slice
  will use these decisions.
- `defer` — the decision is not yet clear. Recorded so the
  term is excluded from `suggestions` until the operator
  revisits it explicitly.

Term kinds:

- `verb` — operator is classifying the verb token.
- `noun` — operator is classifying the noun token.
- `candidate` — operator is classifying a single-token name
  / low-confidence candidate as a whole.

## TESTS / VERIFICATION

- 9-command pre-validation gate passed on `acfa5e3` before
  this batch began.
- New 18-assertion contract test passing locally.
- New 12-assertion docs test passing locally.
- Full 9-command verification gate to be re-run before merge.
- CLI smoke against the in-repo fixture exercised in the
  contract test (init → refresh → normalize → review
  suggestions → review decide → review decisions →
  artifacts validate).

## INTENTIONALLY UNTOUCHED

- Built-in ontology vocabulary (`packages/capability-ontology/src/index.ts`
  `BUILTIN_*` tables).
- Lexical splitter, candidate extractor, normalizer.
- `CapabilityNormalizationReport` artifact shape.
- `rekon capability ontology normalize` CLI command.
- `.rekon/capability-ontology.json` loader behavior.
- `CapabilityMap` artifact shape and `runProject` flow.
- `EvidenceGraph` raw facts.
- Any other workspace package.
- All other CLI commands.

## RISKS / FOLLOW-UP

- **Ledger identity.** The CLI keeps appending to the
  newest ledger by default. If an operator wants to start
  a fresh review window, they would need a new ledger id —
  not in scope here. A future flag (`--new-ledger`) could
  add explicit rotation.
- **Decisions are flat.** The schema does not model "this
  decision supersedes that earlier decision." Operators
  resolve conflicts by recording a new entry with a clear
  `reason` and a `defer` or alternative decision. Future
  slices may add explicit supersedes semantics if needed.
- **`suggestions` excludes decided terms by default.** The
  operator can pass `--include-decided` to re-surface them.
  Once vocabulary expansion ships, the preview surface will
  read the entire ledger regardless.
- **No batch decide.** Each decision is one CLI call. For
  large unknown sets, an operator-supplied JSON batch
  input could come later; not in scope here.

## NEXT STEP

**Capability ontology vocabulary expansion v1.** Read the
latest `CapabilityNormalizationReviewLedger`, filter
`extend-ontology` entries (optionally requiring
`suggestedCanonical`), and produce a **preview** of
`.rekon/capability-ontology.json` with the additions
applied — but do not write the config file automatically.
Surface the preview as a separate artifact so operators can
inspect it before applying it themselves.

`CapabilityMap` integration (Layer 6) remains deferred until
the ledger reaches a steady state across multiple operator
targets.
