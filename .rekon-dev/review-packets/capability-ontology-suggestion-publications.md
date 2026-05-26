# Review Packet: Capability Ontology Suggestion Publication Surfacing

**Slice:** Capability ontology suggestion publication
surfacing (step 4c of the translation-layer implementation
sequence).
**Status:** Implemented. Ready for review.
**Owning package:** `@rekon/capability-docs`.
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
→ [Capability ontology vocabulary expansion
v1](../../docs/artifacts/capability-ontology-suggestion-report.md)
→ **this slice**.

## CHANGES MADE

- New public helper in `@rekon/capability-docs`:
  `buildCapabilityOntologySuggestionPublicationSection`.
- Local duck type `CapabilityOntologySuggestionReportLike`
  in `@rekon/capability-docs` so the package does not
  import `@rekon/capability-ontology` directly.
- Architecture summary publisher reads the latest
  `CapabilityOntologySuggestionReport`, passes it through
  to `renderArchitectureSummary`, and renders the section
  as `## Capability Ontology Suggestions` between
  `## Working Tree Path Freshness` and `## Proof Loop`.
- Agent contract publisher mirrors the same wiring at
  heading level `###` inside the operating-state group,
  and adds one new `Do Not Do` reminder: *"Do not treat
  CapabilityOntologySuggestionReport entries as applied
  ontology config."*.
- Both publishers cite the source report in
  `header.inputRefs` when present.
- `@rekon/capability-docs` manifest `consumes` adds
  `CapabilityOntologySuggestionReport` plus a new
  `capability-ontology-suggestions.changed` invalidation
  rule.
- 13-assertion contract test
  `tests/contract/capability-ontology-suggestion-publications.test.mjs`.
- 9-assertion docs test
  `tests/docs/capability-ontology-suggestion-publications.test.mjs`.
- Doc updates: concept doc, suggestion report artifact
  reference, architecture summary concept + artifact docs,
  agent operating contract concept + artifact docs, proof
  report concept + artifact docs (deferral pin),
  translation-layer decision memo, coverage review memo,
  roadmap, classic-behavior roadmap, README, CHANGELOG.

## PUBLIC API CHANGES

Additive only.

- New public export from `@rekon/capability-docs`:
  - `buildCapabilityOntologySuggestionPublicationSection`
  - Companion types:
    `BuildCapabilityOntologySuggestionPublicationSectionInput`,
    `BuildCapabilityOntologySuggestionPublicationSectionResult`.
- Architecture summary + agent contract publication
  markdown gain a new section. The section is **read-only
  content** — no new artifact types, no new CLI commands.
- Manifest `consumes` gains `CapabilityOntologySuggestionReport`.
- Manifest `invalidatedBy` gains
  `capability-ontology-suggestions.changed`.

No existing public exports modified. No CLI command
modified. No artifact shape modified.

## PURPOSE PRESERVATION CHECK

- **Read-only with respect to ontology state.** Contract
  tests verify that publication generation does not write
  a new `CapabilityOntologySuggestionReport`, does not
  create `.rekon/capability-ontology.json`, and does not
  add new `CapabilityMap` entries.
- **Read-only with respect to source files.** Publications
  never invoke the suggestions CLI, never mutate the
  ledger, and never re-run the normalizer.
- **No LLM normalization.** The helper is a pure markdown
  renderer over the already-computed report.
- **Layered model preserved.** Layer 5 audit, Layer 5'
  operator review, Layer 5'' suggestion preview, and now
  Layer 5''' publication surfacing remain distinct.
  `CapabilityMap` (Layer 6) remains deferred.
- **Operator control preserved.** The agent contract `Do
  Not Do` explicitly says agents must not treat
  suggestions as applied vocabulary. Operators apply
  proposed config changes manually outside the
  publication.
- **Proof report deferral pinned in docs.** The proof
  report intentionally does not render a Capability
  Ontology Suggestions section in this slice; the
  deferral is documented in both the proof report concept
  doc and the artifact reference.

## CODEBASE-INTEL ALIGNMENT

- Matches classic `codebase-intel`'s discipline of
  surfacing review state inside publications rather than
  hiding it in standalone artifacts. Architecture summary
  and agent contract have been Rekon's natural
  publication surfaces; the suggestion report joins
  the path-freshness report, finding filter health, and
  filter policy suggestions as another preview-only
  surface that publications render but do not apply.

## PUBLICATION SURFACES

- **Architecture summary** (`Publication.kind = "architecture-summary"`):
  - Section header: `## Capability Ontology Suggestions`.
  - Renders report ref, config path, summary counts by
    suggestion kind, and a `Preview-only.` callout pinning
    that `.rekon/capability-ontology.json` remains
    unchanged.
  - Bounded suggestion table with columns: Kind, Term,
    Canonical, Reason. Default table limit: 10. Overflow
    rendered as a single "additional suggestion(s)
    omitted" row.
  - Bounded `Skipped decisions (v1)` block when the
    report carries `skipped[]` entries.
- **Agent contract** (`Publication.kind = "agent-contract"`):
  - Section header: `### Capability Ontology Suggestions`
    in the operating-state group, immediately after the
    path-freshness subsection.
  - Same content shape as the architecture summary, at
    `###` instead of `##`.
  - Adds one new `Do Not Do` reminder pinning that
    suggestions are not applied vocabulary.
- **Proof report:** intentionally deferred.

## READ-ONLY GUARANTEE

The publication generation step in this slice is strictly
read-only:

- It calls `artifacts.list("CapabilityOntologySuggestionReport")`
  and reads the latest entry via `artifacts.read`.
- It never writes a new `CapabilityOntologySuggestionReport`.
- It never writes `.rekon/capability-ontology.json`.
- It never writes a new `CapabilityNormalizationReviewLedger`.
- It never writes a new `CapabilityMap`.
- It never invokes the suggestions CLI or any other Rekon
  CLI from within publication generation.

The contract tests pin all four properties.

## INPUT REFS / CITATIONS

- The architecture summary publisher appends the
  suggestion report ref to `inputRefs` when present
  (contract test #5).
- The agent contract publisher appends the suggestion
  report ref to `inputRefs` when present (contract test
  #9).
- Both publishers' `header.inputRefs` flow into the
  publication artifact header so freshness logic tracks
  the source report deterministically.

## PROOF REPORT DEFERRAL

The proof report intentionally does not surface
`CapabilityOntologySuggestionReport` in this slice.

Rationale: ontology suggestions are operator vocabulary /
config proposals, not verification proof. Adding them to
the proof report would create confusion with proof status
and could imply the suggestion report contributes to a
pass / fail decision. The deferral is documented in:

- `docs/concepts/proof-report-publication.md`
- `docs/artifacts/proof-report-publication.md`
- `docs/artifacts/capability-ontology-suggestion-report.md`

Re-evaluate when a future batch defines a natural
ontology / context section for the proof report.

## TESTS / VERIFICATION

- 9-command pre-validation gate passed on `85642c9`
  before this batch began.
- 13-assertion contract test passing locally:
  `tests/contract/capability-ontology-suggestion-publications.test.mjs`.
- 9-assertion docs test passing locally:
  `tests/docs/capability-ontology-suggestion-publications.test.mjs`.
- Full 9-command verification gate to be re-run before
  merge.
- CLI smoke per the work order exercised end-to-end
  against `examples/simple-js-ts` (refresh → normalize →
  review decide → suggestions → publish architecture →
  publish agent-contract → config-absence check →
  artifacts validate).

## INTENTIONALLY UNTOUCHED

- Built-in ontology vocabulary in
  `packages/capability-ontology/src/index.ts`.
- Lexical splitter, candidate extractor, normalizer.
- `CapabilityNormalizationReport` artifact shape.
- `CapabilityNormalizationReviewLedger` artifact shape +
  append semantics + decide / decisions CLI.
- `CapabilityOntologySuggestionReport` artifact shape +
  `rekon capability ontology suggestions` CLI.
- `.rekon/capability-ontology.json` loader / writer
  behavior.
- `CapabilityMap` artifact shape and `runProject` flow.
- `EvidenceGraph` raw facts.
- Proof report publisher behavior (deferred).
- All other CLI commands.

## RISKS / FOLLOW-UP

- **Bounded tables.** The suggestion + skipped tables
  are capped at 10 rows by default. If a future operator
  workflow needs the full set, the helper exposes
  `tableLimit` so a future change can lift the bound
  without rewriting the renderer.
- **Publication size.** Adding another section
  marginally increases publication size. The bounded
  tables keep growth predictable; a future safety
  review can quantify this.
- **Proof report deferral.** Re-evaluate once a natural
  ontology / context section exists for the proof
  report. Until then, the deferral is documented and
  pinned by the docs test.
- **No GitHub review surface.** The GitHub Check + PR
  comment surfaces do not yet render suggestion
  summaries. A future slice can add a compact summary
  consistent with the path-freshness GitHub surfacing,
  but this slice intentionally limits scope to the two
  primary publications.

## NEXT STEP

**Capability ontology suggestion safety review.** Review
the full `normalize → review → suggest → publish` loop
end-to-end. Confirm:

- No path mutates ontology config.
- No path mutates `CapabilityMap`.
- No path treats suggestions as applied vocabulary.
- Publication surfacing is purely additive.
- Proof report deferral remains correct.

Then decide whether an operator-approved config apply
step should exist, or whether manual editing remains the
right operator control.
