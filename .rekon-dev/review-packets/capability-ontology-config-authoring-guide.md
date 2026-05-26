# Review Packet: Capability Ontology Config Authoring Guide + Review-Loop Quickstart

**Slice:** Docs / support batch on the capability-ontology
track. Follows the
[Capability Ontology Suggestion Safety
Review](../../docs/strategy/capability-ontology-suggestion-safety-review.md).
**Status:** Implemented. Ready for review.
**Owning surface:** `docs/beta/`.
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
→ [Suggestion safety
review](../../docs/strategy/capability-ontology-suggestion-safety-review.md)
→ **this batch**.

## CHANGES MADE

- New operator authoring guide
  `docs/beta/capability-ontology-config-authoring-guide.md`
  with every required heading + the canonical JSON example +
  config section table + decision table.
- New operator quickstart
  `docs/beta/capability-ontology-review-loop-quickstart.md`
  walking through the full
  `normalize → review → decide → suggest → edit → rerun`
  loop with command snippets, the loop table, and the
  decision table.
- New 22-assertion docs test
  `tests/docs/capability-ontology-config-authoring-guide.test.mjs`.
- This review packet.
- Cross-link updates to: concept doc, three artifact
  references, two strategy memos, roadmap,
  classic-behavior roadmap, README, and CHANGELOG.

## PUBLIC API CHANGES

None.

- No package exports added or removed.
- No artifact type registered.
- No CLI command added or removed.
- No SDK / runtime change.
- No publisher behavior change.
- No `tsconfig` change.
- No `package.json` change to any workspace package.

## PURPOSE PRESERVATION CHECK

This batch documents the operator path without weakening
any of the preview-only guarantees pinned by prior batches:

- `EvidenceGraph` raw facts remain unchanged.
- `CapabilityNormalizationReport` remains audit-only.
- `CapabilityNormalizationReviewLedger` remains
  append-only.
- `CapabilityOntologySuggestionReport` remains
  preview-only and **not applied vocabulary**. The guide
  and quickstart both repeat this verbatim.
- Rekon **never creates or mutates**
  `.rekon/capability-ontology.json` automatically. The
  guide and quickstart both pin this verbatim.
- `CapabilityMap` integration remains deferred.
- Manual editing is the operator-control boundary.
- No LLM normalization.
- No source-write apply.

The docs test asserts the verbatim statements (preview-only,
no-config-mutation, no-CapabilityMap-mutation, JSON only in
v1) cannot silently disappear.

## CODEBASE-INTEL ALIGNMENT

- Matches classic `codebase-intel`'s preview-before-apply
  discipline. Ontology vocabulary expansion is operator-
  driven, evidence-driven, and never silent.
- Provides the procedural backbone that turns the
  audit-artifact + suggestion-artifact + publication
  surfacing chain into something operators can actually
  use without misinterpreting suggestions as applied
  vocabulary.
- Preserves the architecture impact review's "no
  monolithic validator" pin by documenting how each
  artifact in the chain plays a different role.

## AUTHORING GUIDE

`docs/beta/capability-ontology-config-authoring-guide.md`:

- Documents the canonical config shape with a JSON
  example covering every supported field (`version`,
  `verbs.{canonical,aliases,categories,includeSystemVerbs}`,
  `nouns.{canonical,aliases,categories,thresholds.autoMap,includeSystemNouns}`).
- Documents the manual editing workflow with shell
  snippets for `refresh → normalize → review suggestions
  → review decide → suggestions` then the manual edit +
  rerun.
- Documents the validation loop with explicit
  `rekon capability ontology normalize` + `rekon
  artifacts validate` commands and the expected count
  shifts (`normalized` up, `unknown*` down,
  `ontology.source` flips from `"builtin"` to
  `"builtin+config"`).
- Documents what suggestions mean — the four kinds
  (`add-canonical-verb`, `add-canonical-noun`,
  `add-verb-alias`, `add-noun-alias`), the
  candidate-skipped rule, and the no-mutation contract.
- Includes a `What This Does Not Do` section enumerating
  the deferrals.

## REVIEW LOOP QUICKSTART

`docs/beta/capability-ontology-review-loop-quickstart.md`:

- Seven explicit steps (normalize → review suggestions →
  decide → generate suggestions → inspect publications →
  manually edit → rerun normalize).
- Each step lists the exact CLI commands with parameters.
- Step 5 (Inspect Publications) explicitly notes the
  agent contract's `Do Not Do` reminder.
- Step 6 (Manually Edit Ontology Config) is the manual
  mutation channel. Repeats the JSON-only-in-v1 pin and
  the `Rekon never creates or mutates this file
  automatically` pin.
- Step 7 (Rerun Normalize) calls out the expected count
  shifts and the `rekon artifacts validate` step.
- `Interpreting Results` section gives operators concrete
  failure-mode hints (lexical-split mismatch, alias target
  missing, schema-version mismatch).
- `Next Steps` flags operator friction as the gate for
  any future apply-command decision memo.

## MANUAL EDITING BOUNDARY

The manual editing boundary is repeated four times across
both docs:

1. *"The file is optional. If absent, Rekon uses the
   built-in baseline ontology."*
2. *"Rekon never creates or mutates this file automatically."*
3. *"JSON only in v1. YAML is not supported."*
4. *"`CapabilityOntologySuggestionReport` is preview-only
   and not applied vocabulary."*

These four pins are asserted by the docs test. They
collectively establish that:

- the operator's text editor is the only mutation channel
  for `.rekon/capability-ontology.json`;
- the suggestion report is a proposal, not a write;
- removing or weakening any of these pins is a test
  failure.

## TESTS / VERIFICATION

- 9-command pre-validation gate passed on `a5d8983` before
  this batch began.
- New 22-assertion docs test passing locally.
- Full 9-command verification gate to be re-run before
  merge.
- No CLI smoke required — docs-only batch.

## INTENTIONALLY UNTOUCHED

- Built-in ontology vocabulary in
  `packages/capability-ontology/src/index.ts`.
- Lexical splitter, candidate extractor, normalizer.
- `CapabilityNormalizationReport`,
  `CapabilityNormalizationReviewLedger`, and
  `CapabilityOntologySuggestionReport` artifact shapes.
- All CLI commands.
- All publishers.
- `.rekon/capability-ontology.json` loader behavior
  (read-only).
- `CapabilityMap` artifact shape and `runProject` flow.
- `EvidenceGraph` raw facts.

## RISKS / FOLLOW-UP

- **Operator friction not yet measured.** The dogfood
  follow-up batch should exercise the full guide on one
  real repo and record where the manual editing step gets
  painful. That evidence (or lack of it) gates any future
  apply-command decision memo.
- **Schema-version drift.** The guide pins `"version":
  "0.1.0"`. A future schema bump must update the guide,
  the quickstart, the docs test, and the loader together.
- **Diff readability.** The suggestion report renders
  `before` / `after` JSON strings. The guide tells
  operators to read both, but does not yet provide a
  rendered diff helper. A future helper could surface a
  cleaner diff inside the publications; not in scope here.

## NEXT STEP

**Manual ontology config dogfood.** Run the authoring
guide + quickstart on one real repo (likely the same
anonymized `target-1` from the built-in baseline coverage
review). Capture:

1. Counts before / after the manual edit.
2. Concrete failure modes operators hit (if any).
3. Whether manual editing was straightforward or
   frustrating.

That evidence determines whether an operator-approved
apply command should be drafted. Until then, manual
editing remains the control boundary.
