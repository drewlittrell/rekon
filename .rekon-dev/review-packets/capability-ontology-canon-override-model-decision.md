# Review Packet: Capability Ontology Canon + Override Model Decision

**Slice:** Strategy / decision batch. Revises the prior
*Capability Ontology Suggestion Safety Review* direction
("manual editing is acceptable for now") and replaces it
with a Rekon-provided canon + repo-local override model.
**Status:** Implemented. Ready for review.
**Owning surface:**
`docs/strategy/capability-ontology-canon-override-model-decision.md`.
**Decision lineage:** [Architecture Impact
Review](../../docs/strategy/capability-ontology-architecture-impact-review.md)
→ [Translation Layer
Decision](../../docs/strategy/capability-ontology-translation-layer-decision.md)
→ [`CapabilityNormalizationReport`
v1](../../docs/artifacts/capability-normalization-report.md)
→ [Built-In Baseline Ontology Coverage
Review](../../docs/strategy/builtin-ontology-coverage-review.md)
→ [`CapabilityNormalizationReviewLedger`
v1](../../docs/artifacts/capability-normalization-review-ledger.md)
→ [`CapabilityOntologySuggestionReport`
v1](../../docs/artifacts/capability-ontology-suggestion-report.md)
→ [Suggestion publication
surfacing](../../docs/artifacts/capability-ontology-suggestion-report.md)
→ [Suggestion Safety
Review](../../docs/strategy/capability-ontology-suggestion-safety-review.md)
→ [Config Authoring Guide + Review-Loop
Quickstart](../../docs/beta/capability-ontology-config-authoring-guide.md)
→ **this memo**.

## CHANGES MADE

- New strategy memo
  `docs/strategy/capability-ontology-canon-override-model-decision.md`
  with all 12 required headings, the option / canon pack /
  override tables, the
  `EffectiveCapabilityOntology` type sketch, the override
  file example, and the implementation sequence.
- New 14-assertion docs test
  `tests/docs/capability-ontology-canon-override-model-decision.test.mjs`.
- This review packet.
- Cross-link updates to: concept doc, suggestion-report
  artifact reference, suggestion safety review,
  translation-layer decision, authoring guide,
  review-loop quickstart, roadmap, classic-behavior
  roadmap, README, and CHANGELOG. The authoring guide +
  quickstart are reframed as **fallback / emergency
  manual** paths, not the steady-state product model.

## PUBLIC API CHANGES

None.

- No package exports added or removed.
- No artifact type registered.
- No CLI command added or removed.
- No SDK / runtime change.
- No publisher behavior change.
- No `tsconfig` change.
- No `package.json` change to any workspace package.

The override-file rename to
`.rekon/capability-ontology.overrides.json` is **not
applied** in this batch. The current loader continues to
read `.rekon/capability-ontology.json`. The rename ships
with the canon-packs-v1 implementation slice, alongside a
back-compat alias and deprecation path.

## PURPOSE PRESERVATION CHECK

This memo corrects the product posture without weakening
any of the previously pinned preview-only guarantees:

- `EvidenceGraph` raw facts remain unchanged.
- `CapabilityNormalizationReport` remains audit-only.
- `CapabilityNormalizationReviewLedger` remains
  append-only.
- `CapabilityOntologySuggestionReport` remains
  preview-only.
- The override file (today
  `.rekon/capability-ontology.json`; tomorrow
  `.rekon/capability-ontology.overrides.json`) is **never
  created or mutated automatically** by Rekon. The new
  decision adds canon packs but does not change that
  guarantee.
- `CapabilityMap` integration remains deferred.
- No LLM normalization is introduced.
- No source-write apply is introduced.
- Suggestion apply remains deferred behind its own
  decision memo + safety review.

The correction is *direction*: Rekon now commits to
shipping a usable canonical baseline + archetype overlays
so operators are not asked to invent the entire vocabulary
themselves.

## CODEBASE-INTEL ALIGNMENT

- Classic `codebase-intel` already shipped a layered
  baseline + workspace override merge model. This memo
  re-states that posture inside Rekon's eight-layer
  translation model.
- Preserves the architecture impact review's "no
  monolithic validator" pin: the canon is a *small set of
  curated packs*, not a single monolithic ruleset.
- Preserves the translation-layer decision's pin that the
  ontology must not be flattened into a single config /
  report layer. Canon (Layer 3 + 4 in the eight-layer
  model) and overrides (Layer 5) remain distinct.

## OPTIONS CONSIDERED

| Option | Decision | Reason |
| --- | --- | --- |
| Manual config authoring | Rejected | Too much manual administration. |
| One global built-in ontology | Rejected | Repo archetypes differ. |
| Canon packs + repo overrides | **Selected** | Preserves baseline + local specificity. |
| Auto-apply suggestions | Deferred | Needs explicit approval and patch preview. |
| LLM-generated ontology | Rejected | LLM-only normalization is not truth. |

## CANON PACK MODEL

- `base` — common capability language; always loaded.
- Archetype overlays — `nextjs-app`, `backend-api`,
  `library-package`, `cli-tooling`, `monorepo`,
  `fullstack-layered`, `test-fixture-heavy`, `data-etl`.
- v1 ship set: `base`, `nextjs-app`, `library-package`,
  `monorepo`.
- Each pack defines canonical verbs, verb aliases, verb
  categories, canonical nouns, noun aliases, noun
  categories, roles, patterns, package / framework
  conventions, and noise terms.
- Packs are read-only assets inside
  `@rekon/capability-ontology`. Operators do not edit
  packs; operators write overrides.

## OVERRIDE MODEL

- File path: `.rekon/capability-ontology.overrides.json`.
- The file is **optional**.
- Rekon **never** creates or mutates the file
  automatically.
- JSON only in v1. YAML is not supported.
- `extends` selects archetype overlays in source order.
- Canonical entries (`verbs.canonical`, `nouns.canonical`)
  **extend** canon — never remove canonical entries.
- Aliases (`verbs.aliases`, `nouns.aliases`) **supersede**
  canon aliases when keys collide; otherwise extend.
- Noise terms (`noise.nouns`, `noise.candidates`)
  **suppress suggestion noise** without deleting raw
  evidence in `EvidenceGraph`.

The legacy path `.rekon/capability-ontology.json` will be
read for one release as a back-compat alias when no
overrides file exists, then deprecation-warned, then
removed. Documented in the canon-packs-v1 slice.

## SUGGESTION WORKFLOW REVISION

Today:

```text
ReviewLedger → SuggestionReport → manual edit of entire config
```

Target:

```text
ReviewLedger → SuggestionReport → OverridePatchPreview → operator-approved apply
```

Until the apply slice ships, operators manually merge the
proposed override patch into
`.rekon/capability-ontology.overrides.json`. The authoring
guide and review-loop quickstart will be updated when the
canon-packs-v1 slice ships; today they remain as
emergency manual fallback references.

## TESTS / VERIFICATION

- 9-command pre-validation gate passed on `a33c3e0`
  before this batch began.
- New 14-assertion docs test passing locally.
- Full 9-command verification gate to be re-run before
  merge.
- No CLI smoke required — strategy / docs / tests only.

## INTENTIONALLY UNTOUCHED

- All built-in ontology vocabulary in
  `packages/capability-ontology/src/index.ts` (no canon
  pack content lands in this batch).
- Lexical splitter, candidate extractor, normalizer.
- `CapabilityNormalizationReport`,
  `CapabilityNormalizationReviewLedger`, and
  `CapabilityOntologySuggestionReport` artifact shapes.
- All CLI commands.
- All publishers.
- `.rekon/capability-ontology.json` loader behavior
  (read-only). The rename to
  `.rekon/capability-ontology.overrides.json` is a future
  implementation slice.
- `CapabilityMap` artifact shape and `runProject` flow.
- `EvidenceGraph` raw facts.
- Any other workspace package.

## RISKS / FOLLOW-UP

- **Pack content is the implementation risk.** Choosing
  too narrow or too broad a canonical set per pack is the
  main quality dial. The next slice's review packet will
  document the v1 pack content explicitly so reviewers
  can push back before publication.
- **Override semantics edge cases.** Operators may try to
  remove canonical entries by re-listing them; the
  decision rejects removal. The canon-packs-v1 slice must
  test and document this clearly.
- **Back-compat for the legacy path.** Operators with an
  existing `.rekon/capability-ontology.json` should not be
  broken on first upgrade. The canon-packs-v1 slice ships
  a read-only alias for one release.
- **Suggestion-report-v2 timing.** Until the suggestion
  report renders against the overrides file rather than
  the legacy config, the operator-facing diff will look
  identical to today. That is acceptable for the
  canon-packs-v1 slice but should be lifted in
  suggestion-report-v2.

## NEXT STEP

**Capability ontology canon packs v1.** Implement:

- A canon pack registry inside `@rekon/capability-ontology`.
- The `base` pack plus the v1 archetype set
  (`nextjs-app`, `library-package`, `monorepo`). Pack
  content is reviewed in the next batch's review packet
  before it ships.
- `extends` resolution from the operator-supplied
  override file.
- The `EffectiveCapabilityOntology.source` block updated
  to record `basePack` + `overlayPacks` +
  `overridePath` + `overrideHash`.
- Loader support for the new
  `.rekon/capability-ontology.overrides.json` path with a
  back-compat alias for the legacy file.

Still no `CapabilityMap` integration. Still no config
apply command.
