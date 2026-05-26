# Review Packet — CapabilityPhrase + CapabilityContract Architecture Decision

Strategy / architecture / docs / tests-only batch. Defines
the semantic layer between `CapabilityNormalizationReport`
and the future `CapabilityMap` v2. **No runtime behavior. No
new artifact registration. No `CapabilityMap` mutation. No
`EvidenceGraph` mutation. No source writes. No AST-first
assumption. No LLM-only inference. No npm publish. No
version bump. No git tag. No GitHub Release. No new
branch.**

## CHANGES MADE

- **New strategy memo:**
  `docs/strategy/capability-phrase-contract-architecture-decision.md`
  with all 16 required headings (Decision Summary / Why /
  North Star / Repo-Agnostic Evidence Model /
  CapabilityPhrase Model / CapabilityContract Model /
  CapabilityPhrase vs Normalized / CapabilityContract vs
  RefactorPreservationContract / Evidence Sources By Field /
  Use Cases Unlocked / CapabilityMap v2 Boundary / AST /
  Language Adapter Boundary / Risks / Recommendation / What
  This Does Not Do / Follow-Up Work), plus the three
  required diagnostic tables (evidence-source, use-case,
  layer / boundary).
- **New 18-assertion docs test:**
  `tests/docs/capability-phrase-contract-architecture-decision.test.mjs`.
- **New review packet** (this file).
- **Supporting doc updates:**
  - `docs/strategy/capability-ontology-canon-override-model-decision.md`
    — implementation-sequence table appends a row for the
    new architecture decision and cross-links the memo.
  - `docs/strategy/capability-ontology-translation-layer-decision.md`
    — adds a pointer to the new memo + notes that Layer 6
    (`CapabilityMap`) will consume `CapabilityPhrase`, not
    raw normalization rows.
  - `docs/concepts/capability-ontology.md` — adds a
    "Semantic layer (CapabilityPhrase)" forward-pointer
    section.
  - `docs/artifacts/capability-normalization-report.md` —
    adds a "Downstream consumers" cross-link to the
    CapabilityPhrase memo.
  - `docs/strategy/roadmap.md` — twelfth-slice roadmap
    entry.
  - `docs/strategy/classic-behavior-roadmap.md` — same
    entry on the classic-behavior track.
  - `README.md` — new comment block summarizing the
    decision.
  - `CHANGELOG.md` — top entry describing the decision.

## PUBLIC API CHANGES

None. The memo only reserves the names `CapabilityPhrase`
and `CapabilityContract` and sketches their future shape.
Nothing is registered, no exports change, no schemas are
updated.

## PURPOSE PRESERVATION CHECK

- Rekon's purpose is to understand *purpose* across
  arbitrary repos. The phrase model is the structural
  answer to "what does this do?"; the contract layer is
  the structural answer to "where does it belong?". Both
  remain repo / language / architecture agnostic.
- The normalization-audit layer is preserved exactly.
  `CapabilityPhrase` does not replace
  `CapabilityNormalizationReport`; it consumes the
  normalized verb / noun pair and enriches it with
  repo-agnostic evidence.
- The canon + override model continues to govern the
  vocabulary. Phrase enrichment lands per evidence-source
  slice; canon packs remain the substrate.
- `CapabilityMap` v1 is unchanged. v2 is gated on stable
  high-confidence phrases.
- Source writes remain unavailable across every layer.

## CODEBASE-INTEL ALIGNMENT

- Aligned with the
  [Capability Ontology Translation Layer Decision](../../docs/strategy/capability-ontology-translation-layer-decision.md):
  Layer 5 (`CapabilityNormalizationReport`) keeps its
  audit role; the new phrase layer slots between Layer 5
  and Layer 6 without breaking the eight-layer model.
- Aligned with the
  [Canon + Override Model Decision](../../docs/strategy/capability-ontology-canon-override-model-decision.md):
  canon packs supply canonical vocabulary; phrases
  enrich.
- Aligned with the
  [Architecture Impact Review](../../docs/strategy/capability-ontology-architecture-impact-review.md):
  the five architectural reservations (ontology must
  exist; not monolithic; raw evidence separate;
  normalization audited; `CapabilityMap` consumes only
  normalized claims) are upheld.
- Aligned with the
  [Suggestion Safety Review](../../docs/strategy/capability-ontology-suggestion-safety-review.md):
  preview-only, operator-control, no auto-mutation.

## OPTIONS CONSIDERED

- **Skip phrase layer, go straight to `CapabilityMap` v2
  on normalization rows** — rejected. Loses the
  repo-agnostic semantic projection. Forces `CapabilityMap`
  v2 to absorb domain / pattern / layer inference inline,
  conflating audit and policy.
- **Inline phrase fields into
  `CapabilityNormalizationReport`** — rejected as the
  default. Possible v1 carrier (Option A in the follow-up
  decision), but the boundary memo's preferred carrier is
  a separate `CapabilityPhraseReport` (Option B) because
  normalization audit and semantic purpose projection
  answer different questions.
- **Define `CapabilityContract` now** — rejected for v1.
  Premature: phrases must stabilize first. Defer to a
  future memo.
- **AST-first phrase inference** — rejected. Forces every
  language to ship an adapter before phrases are usable.
- **LLM-only phrase generation** — rejected. Cannot be
  load-bearing; only enrichment with operator review.

**Selected:** reserve names; pin field shape; defer
artifact registration to the next decision; defer
`CapabilityContract` further.

## CAPABILITYPHRASE MODEL

```ts
type CapabilityPhrase = {
  // Required (v1)
  verb: string;
  noun: string;
  confidence: "high" | "medium" | "low";
  evidenceRefs: ArtifactRef[];

  // Optional (v1 partial)
  qualifier?: string[];
  domain?: string;
  pattern?: string;
  layer?: string;

  // Reserved (future)
  sideEffects?: string[];
  inputs?: string[];
  outputs?: string[];
};
```

Key invariants:

- `verb` + `noun` always seed the phrase; both come from
  the latest `CapabilityNormalizationReport`.
- `confidence` is required and consumers gate on it.
- `evidenceRefs` cite every contributing artifact for the
  audit chain.
- AST evidence is optional; lexical + ownership +
  framework signal are the baseline.
- LLM enrichment surfaces as audit signal only.

## CAPABILITYCONTRACT MODEL

```ts
type CapabilityContract = {
  capability: CapabilityPhrase;
  allowedLayers?: string[];
  allowedSystems?: string[];
  forbiddenLayers?: string[];
  requiredChecks?: string[];
  requiredNeighbors?: CapabilityPhrase[];
  forbiddenNeighbors?: CapabilityPhrase[];
  preservationRules?: string[];
};
```

Boundary pin: `CapabilityContract` is policy.
`RefactorPreservationContract` is a refactor-phase
projection of that policy. Neither registers in this
batch.

## EVIDENCE

| Field | Evidence Sources | V1 Status |
| --- | --- | --- |
| verb | CapabilityNormalizationReport | v1 |
| noun | CapabilityNormalizationReport | v1 |
| qualifier | lexical split tokens + canon packs | v1 (lexical) |
| domain | path / ownership / docs / system hints | partial |
| pattern | path / role / export shape / framework conv. | partial |
| layer | architecture profile / ObservedRepo / path | partial |
| sideEffects | imports / packages / runtime / adapters | future |
| inputs / outputs | schemas / API specs / tests / AST | future |

## USE CASES

architecture linting, naming honesty, overloaded files,
resolver routing, verification planning, semantic impact,
memory, refactor preservation, docs / publication,
`CapabilityMap` v2.

## TESTS / VERIFICATION

- **New 18-assertion docs test**
  `tests/docs/capability-phrase-contract-architecture-decision.test.mjs`
  pins every verbatim guarantee in the memo + the three
  required tables + CHANGELOG mention + this packet's
  PURPOSE PRESERVATION CHECK section.
- Full suite expected: 2275 pass (2257 + 18 new) / 10
  skipped / 0 fail.
- 9-command gate: typecheck / test / build / git diff
  check / audit-package-exports / audit-license /
  publish-dry-run / install-smoke / install-tarball-smoke
  all green.

## INTENTIONALLY UNTOUCHED

- `CapabilityNormalizationReport` schema unchanged.
- `CapabilityNormalizationReviewLedger` unchanged.
- `CapabilityOntologySuggestionReport` unchanged.
- Canon packs / overrides unchanged.
- `CapabilityMap` v1 unchanged.
- `EvidenceGraph` unchanged.
- `FindingReport` / `FindingFilterReport` /
  `CoherencyDelta` / `ReconciliationPlan` /
  `VerificationRun` / `VerificationResult` unchanged.
- Publication / GitHub publisher behavior unchanged.
- CLI commands unchanged.
- No new permission. No workflow YAML change.
- No version bump. No npm publish. No git tag. No
  GitHub Release. No new branch.

## RISKS / FOLLOW-UP

Risks (and mitigations) are documented in full in the
memo's *Risks* section. Top risks:

1. Field bloat — mitigated by freezing v1 fields.
2. AST adapters ship before lexical evidence is stable —
   mitigated by per-language decision memos.
3. LLM enrichment becomes load-bearing — mitigated by
   restricting LLM output to operator-reviewable ledger
   entries.
4. `CapabilityMap` v2 ships before phrase stability —
   mitigated by gating v2 on the canon-pack coverage
   review.
5. `CapabilityContract` collapses into
   `RefactorPreservationContract` — mitigated by the
   boundary pin in this memo.

Follow-up:

- *CapabilityPhrase v1 artifact / report decision*
  (next memo; Option A vs B vs C; B preferred).
- *Phrase confidence model decision*.
- Per-evidence-source enrichment slices.
- *CapabilityMap v2 design*.
- *CapabilityContract decision*.
- *RefactorPreservationContract decision* (far future).
- Per-language AST adapter decisions.
- LLM enrichment decision.

## NEXT STEP

Recommended: **CapabilityPhrase v1 artifact / report
decision**. Pick A (enrich
`CapabilityNormalizationReport`), B (new
`CapabilityPhraseReport`), or C (wait). Preferred:
**Option B** — preserves *normalization audit ≠ semantic
purpose projection*.
