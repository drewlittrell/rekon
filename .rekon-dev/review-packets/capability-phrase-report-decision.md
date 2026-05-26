# Review Packet — CapabilityPhraseReport Decision

Strategy / architecture / docs / tests-only batch. Commits
to **Option B** for the `CapabilityPhrase` v1 carrier: a
separate `CapabilityPhraseReport` artifact, not enrichment
of `CapabilityNormalizationReport`. **No runtime change.
No new artifact registration. No
`CapabilityNormalizationReport` shape mutation. No
`CapabilityMap` mutation. No `EvidenceGraph` mutation. No
source-write apply. No LLM-only semantic inference. No new
CLI command. No new permission. No npm publish. No version
bump. No git tag. No GitHub Release. No new branch.**

## CHANGES MADE

- **New strategy memo**:
  `docs/strategy/capability-phrase-report-decision.md` with
  the 12 required headings (Decision Summary / Why /
  Current Layered Ontology State / Options Considered /
  Recommendation / CapabilityPhraseReport Model / V1 Field
  Policy / Repo-Agnostic Evidence Model / CapabilityMap
  Boundary / CapabilityContract Boundary / What This Does
  Not Do / Implementation Sequence) plus the three
  required diagnostic tables (option / field policy /
  boundary).
- **New 15-assertion docs test**:
  `tests/docs/capability-phrase-report-decision.test.mjs`.
- **New review packet** (this file).
- **Supporting doc updates**:
  - `docs/strategy/capability-phrase-contract-architecture-decision.md`
    — *Follow-Up Work* section's first bullet marked as
    Resolved, pointing at this memo.
  - `docs/strategy/capability-ontology-canon-override-model-decision.md`
    — implementation-sequence row 7 status preserved
    (`✅ Shipped`); the deferred `CapabilityMap` v2 row
    now cross-links the phrase carrier decision.
  - `docs/strategy/capability-ontology-translation-layer-decision.md`
    — Layer 5b note added: `CapabilityPhraseReport` is the
    committed carrier for the semantic projection between
    Layer 5 and Layer 6.
  - `docs/concepts/capability-ontology.md` — *Semantic
    Layer (CapabilityPhrase)* section updated to reference
    this carrier decision.
  - `docs/artifacts/capability-normalization-report.md` —
    *Downstream Consumers* section updated to name
    `CapabilityPhraseReport` as the next layer.
  - `docs/strategy/roadmap.md` — thirteenth-slice entry.
  - `docs/strategy/classic-behavior-roadmap.md` — same
    entry on the classic-behavior track.
  - `README.md` — new comment block summarizing the
    decision.
  - `CHANGELOG.md` — top entry describing the decision.

## PUBLIC API CHANGES

None. The memo only commits to a carrier and sketches the
v1 shape. No types, exports, or schemas change in this
batch.

## PURPOSE PRESERVATION CHECK

- The architectural promise that *normalization audit ≠
  semantic purpose projection* is preserved. `CapabilityPhraseReport`
  is the carrier that keeps them separate.
- `CapabilityNormalizationReport` continues to do exactly
  one job: translation audit. Its shape is not mutated.
- `CapabilityPhraseReport` is **observed** semantic claim,
  not policy. `CapabilityContract` remains the future
  policy / preservation layer; `RefactorPreservationContract`
  remains the phase-specific projection.
- `CapabilityMap` v1 stays as a projection of
  `ObservedRepo` + `OwnershipMap`. v2 is additionally
  gated on `status === "stable"` phrase claims.
- Source writes remain unavailable.
- AST / typechecker evidence remains optional enrichment,
  not foundational truth.

## CODEBASE-INTEL ALIGNMENT

- Aligned with the
  [Capability Ontology Architecture Impact Review](../../docs/strategy/capability-ontology-architecture-impact-review.md):
  the five architectural reservations (ontology must
  exist; not monolithic; raw evidence separate;
  normalization audited; `CapabilityMap` consumes only
  normalized claims) are upheld and tightened —
  `CapabilityMap` now consumes phrase-projection rows,
  not raw audit rows.
- Aligned with the
  [Translation Layer Decision](../../docs/strategy/capability-ontology-translation-layer-decision.md):
  the eight-layer model gains an explicit Layer 5b
  carrier without modifying Layer 5 (audit) or Layer 6
  (canonical projection).
- Aligned with the
  [Canon + Override Decision](../../docs/strategy/capability-ontology-canon-override-model-decision.md):
  canon packs continue to supply the canonical
  vocabulary; phrases enrich; suggestion-report previews
  continue to target the overrides file.
- Aligned with the
  [Suggestion Safety Review](../../docs/strategy/capability-ontology-suggestion-safety-review.md):
  preview-only, operator-control, no auto-mutation.
- Aligned with the
  [CapabilityPhrase + CapabilityContract Architecture
  Decision](../../docs/strategy/capability-phrase-contract-architecture-decision.md):
  this memo answers the open carrier question that memo
  deferred.

## OPTIONS CONSIDERED

| Option | Decision | Reason |
| --- | --- | --- |
| **A — Enrich `CapabilityNormalizationReport`** | rejected | blurs translation audit and semantic purpose projection; collapses the layered ontology model; locks two evolution pressures into one artifact |
| **B — Create `CapabilityPhraseReport`** | **selected** | preserves the layer boundary; gives `CapabilityMap` v2 a clean input; lets phrase fields evolve independently from audit shape |
| **C — Wait / defer** | rejected | blocks `CapabilityMap` v2, architecture linting, resolver routing, verification planning, memory anchoring, and refactor preservation; defers a question that already has enough substrate to answer |

## CAPABILITYPHRASE REPORT MODEL

```ts
type CapabilityPhrase = {
  id: string;
  verb: string;
  noun: string;
  confidence: "high" | "medium" | "low";
  evidenceRefs: ArtifactRef[];
  sourceCandidateIds: string[];
  status: "stable" | "partial" | "low-confidence";
  qualifier?: string[];
  domain?: string;
  pattern?: string;
  layer?: string;
  message?: string;
  sideEffects?: string[];   // reserved
  inputs?: string[];        // reserved
  outputs?: string[];       // reserved
};

type CapabilityPhraseReport = {
  header: ArtifactHeader;
  sourceNormalizationReportRef: ArtifactRef;
  summary: {
    totalPhrases: number;
    stable: number;
    partial: number;
    lowConfidence: number;
    withDomain: number;
    withPattern: number;
    withLayer: number;
  };
  phrases: CapabilityPhrase[];
};
```

Invariants:

- every phrase cites `sourceCandidateIds` and
  `evidenceRefs`;
- `sourceNormalizationReportRef` is the primary input ref
  for freshness;
- the phrase report is read-only with respect to upstream
  artifacts;
- no AST / typechecker evidence is required;
- no LLM-only inference;
- no `CapabilityMap` mutation; no `CapabilityContract`.

## FIELD POLICY

| Field | V1 Status | Evidence Source |
| --- | --- | --- |
| verb | required | CapabilityNormalizationReport |
| noun | required | CapabilityNormalizationReport |
| confidence | required | normalized claim confidence |
| evidenceRefs | required | source artifact refs |
| sourceCandidateIds | required | normalization candidate ids |
| status | required | derived from confidence + completeness |
| qualifier | partial | lexical-split tokens + canon packs |
| domain | partial | path / ownership / system context |
| pattern | partial | path / role / framework convention |
| layer | partial | architecture profile / ObservedRepo / path |
| sideEffects | future | imports / runtime evidence / adapters |
| inputs / outputs | future | schemas / API specs / tests / adapters |

Rule: future fields appear **only** when deterministic
evidence exists. No vibes-driven inference.

## BOUNDARY MODEL

| Layer | Responsibility |
| --- | --- |
| `CapabilityNormalizationReport` | translation audit |
| `CapabilityPhraseReport` | semantic purpose projection |
| `CapabilityMap` | stable capability projection |
| `CapabilityContract` | policy / placement / preservation rules |
| `RefactorPreservationContract` | phase-specific refactor obligations |

The Layer 5b carrier is the only change. Layer 5
(`CapabilityNormalizationReport`) and Layer 6
(`CapabilityMap`) are not mutated.

## TESTS / VERIFICATION

- **New 15-assertion docs test**
  `tests/docs/capability-phrase-report-decision.test.mjs`
  pins every verbatim guarantee + the three required
  tables + CHANGELOG mention + this packet's PURPOSE
  PRESERVATION CHECK section.
- Expected full suite: 2290 pass (2275 + 15 new) / 10
  skipped / 0 fail.
- 9-command gate: typecheck / test / build /
  audit-package-exports / audit-license / publish-dry-run
  / install-smoke / install-tarball-smoke all green.

## INTENTIONALLY UNTOUCHED

- `CapabilityNormalizationReport` shape unchanged.
- `CapabilityNormalizationReviewLedger` unchanged.
- `CapabilityOntologySuggestionReport` unchanged.
- Canon packs / overrides unchanged.
- `CapabilityMap` v1 unchanged.
- `EvidenceGraph` unchanged.
- Publication / GitHub publisher behaviour unchanged.
- CLI commands unchanged.
- No new permission. No workflow YAML change.
- No version bump. No npm publish. No git tag. No
  GitHub Release. No new branch.

## RISKS / FOLLOW-UP

Risks:

1. The phrase carrier becomes load-bearing before phrase
   semantics stabilize. Mitigation: the implementation
   slice will register `CapabilityPhraseReport` with the
   minimal v1 required fields only; future fields land
   behind their own evidence-source slices.
2. `CapabilityMap` v2 ships before phrase claims
   stabilize. Mitigation: v2 is gated on
   `status === "stable"` across multiple cohort targets.
3. Operators conflate phrase (observed) with contract
   (policy). Mitigation: doc updates explicitly call out
   the difference; publications and ledger surfaces
   continue to target only the override file.
4. AST adapters or LLM enrichment get prioritized over
   lexical / canon-pack evidence. Mitigation: the
   evidence-source policy table pins lexical + ontology
   match as the v1 baseline; AST and LLM ship behind
   their own decision memos.

Follow-up:

- **CapabilityPhraseReport v1** — register the artifact,
  implement deterministic projection from
  high-confidence normalized candidates.
- **Confidence + status model decision** — formalize the
  mapping from lexical / ontology / corroborating-source
  signal into `confidence` and `status`.
- Per-evidence-source enrichment slices (path / ownership
  / framework / architecture profile / future AST /
  LLM-as-audit-signal).
- **CapabilityMap v2 design**.
- **CapabilityContract decision** (future).
- **RefactorPreservationContract decision** (far-future).
- **Language adapter decisions** per language.

## NEXT STEP

Recommended: **CapabilityPhraseReport v1** —

- register the artifact in the SDK + runtime (category:
  `projections`);
- implement deterministic projection from high-confidence
  `CapabilityNormalizationReport` candidates;
- cite normalization report + `EvidenceGraph` in
  `header.inputRefs`;
- populate v1 required fields only; mark partial fields
  optional;
- no `CapabilityMap` mutation; no `CapabilityContract`;
  no source writes; no LLM-only inference.
