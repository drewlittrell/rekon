# Review Packet — JS/TS AST Evidence Adapter Decision

Strategy / architecture decision memo. Commits Rekon
to upgrading JS/TS evidence extraction from regex-only
to AST-backed, using the TypeScript compiler parser
API, parser-only in v1 (no typechecker semantics).
Regex remains in place as fallback only. Follows the
[Classic Scanner/Ontology Parity Audit](../../docs/strategy/classic-scanner-ontology-parity-audit.md)
which pinned codebase-intel as design prior art and
selected this slice. **Strategy / docs / tests-only.
No runtime change. No `@rekon/capability-js-ts`
behavior change. No `EvidenceGraph` schema mutation
beyond documenting proposed additive fields. No
`CapabilityNormalizationReport` mutation. No
`CapabilityPhraseReport` mutation. No `CapabilityMap`
mutation. No new artifact registration. No new CLI
command. No source writes. No LLM-only inference. No
typechecker dependency. No npm publish. No version
bump. No git tag. No GitHub Release. No new branch.**

## CHANGES MADE

- **New strategy memo**:
  `docs/strategy/js-ts-ast-evidence-adapter-decision.md`
  with the 14 required headings (Decision Summary,
  Why This Decision Exists, Classic Scanner Prior
  Art, Current Rekon JS/TS Extraction, Options
  Considered, Recommendation, Parser Choice,
  Parser-Only V1 Boundary, EvidenceGraph Fact
  Model, Construct Coverage, Regex Fallback
  Policy, Downstream Ontology Impact, What This
  Does Not Do, Implementation Sequence) plus three
  required tables (option / construct coverage /
  fallback).
- **New 18-assertion docs test**:
  `tests/docs/js-ts-ast-evidence-adapter-decision.test.mjs`.
- **New review packet** (this file).
- **Supporting doc updates**:
  - `docs/strategy/classic-scanner-ontology-parity-audit.md`
    — Follow-Up section notes the AST adapter
    decision has shipped and points at the next
    runtime slice.
  - `docs/artifacts/evidence-graph.md` — the
    "Upcoming: AST-backed JS/TS provider"
    subsection now points at this decision memo as
    the source of the proposed additive fact-value
    fields.
  - `docs/artifacts/capability-normalization-report.md`
    — cross-links the AST decision as the upstream
    candidate-quality lever.
  - `docs/artifacts/capability-phrase-report.md` —
    cross-links the AST decision as the upstream
    stable-density lever.
  - `docs/strategy/capability-phrase-post-quality-coverage-review.md`
    — Follow-Up section notes the AST adapter
    decision has shipped.
  - `docs/concepts/capability-ontology.md` —
    Semantic Layer section cross-links the AST
    decision.
  - `docs/strategy/roadmap.md` — twenty-third-slice
    entry.
  - `docs/strategy/classic-behavior-roadmap.md` —
    same.
  - `README.md` — new comment block summarizing
    the AST adapter decision.
  - `CHANGELOG.md` — top entry.

## PUBLIC API CHANGES

None. Strategy / docs / tests-only batch. The memo
*proposes* additive optional fields on `symbol` /
`export` / `import` fact-value payloads, but the
implementation slice (next) is what would actually
ship those fields. No types are exported, validated,
or required in this batch.

## PURPOSE PRESERVATION CHECK

- `EvidenceGraph` protocol unchanged. The decision
  explicitly pins it as the repo-agnostic protocol
  that survives the AST adapter slice. New optional
  fields ride existing fact kinds; no new fact kind is
  introduced.
- `CapabilityNormalizationReport` shape and semantics
  unchanged.
- `CapabilityPhraseReport` shape and projection rules
  unchanged.
- `CapabilityMap` v2 stays deferred. The decision
  explicitly pins it as gated on a post-AST coverage
  review.
- Canon packs, splitter, normalizer, and enrichment
  rules are all unchanged by this decision.
- ADR 0004 (codebase-intel-classic is reference, not
  dependency) is reaffirmed. The decision explicitly
  *does not* import from classic; it uses classic as
  prior art only.
- Eight architectural reservations from the
  [Capability Ontology Architecture Impact Review](../../docs/strategy/capability-ontology-architecture-impact-review.md)
  remain in force. In particular: AST stays optional
  enrichment, not foundational truth in v1; raw
  evidence stays separate from normalized purpose;
  LLM-only inference remains rejected.
- The parity audit's seven verbatim pins are
  preserved:
  - codebase-intel is design prior art.
  - JS/TS AST extraction should be primary where
    available.
  - Regex extraction is fallback, not primary, for
    JS/TS.
  - `EvidenceGraph` remains the repo-agnostic
    protocol.
  - `GraphOntologyValidator` should not be ported
    wholesale.
  - Classic taxonomy extraction / split / discovery
    / normalization should be adapted.
  - `CapabilityMap` v2 should wait until post-AST
    coverage is measured.
- LLM-only inference remains rejected.
- Source writes remain unavailable.

## CODEBASE-INTEL ALIGNMENT

- **Aligned with
  [ADR 0004](../../docs/adr/0004-codebase-intel-classic-is-reference-not-dependency.md)**:
  Rekon does not import classic code; this decision
  adapts the *pattern* (AST-derived typed name
  records with explicit kind metadata) into Rekon's
  artifact-first model.
- **Aligned with the
  [Classic Scanner/Ontology Parity Audit](../../docs/strategy/classic-scanner-ontology-parity-audit.md)**:
  this decision is the audit's selected next slice.
  Every pin from the parity audit is reaffirmed.
- **Aligned with
  [Classic Behavior Distillation](../../docs/strategy/classic-behavior-distillation.md)**:
  classic's AST-backed `ExtractedName` records are
  preserved in spirit (typed metadata on otherwise
  unchanged `EvidenceGraph` facts) without copying
  the layered persistence machinery
  (`TaxonomyRepository`, `VerbVocabularyRepository`)
  the parity audit rejected.
- **Aligned with the
  [Capability Ontology Architecture Impact Review](../../docs/strategy/capability-ontology-architecture-impact-review.md)**:
  the eight architectural reservations remain in
  force; AST is optional enrichment, not foundational
  truth.
- **Aligned with the
  [CapabilityPhraseReport Post-Quality Coverage Review](../../docs/strategy/capability-phrase-post-quality-coverage-review.md)**:
  this decision responds to that review's
  evidence-model bottleneck finding by selecting AST
  extraction as the upstream lever.

## OPTIONS CONSIDERED

Per the memo's option table:

- *Keep regex primary* — **rejected.** Coverage
  reviews show the bottleneck.
- *TypeScript compiler parser API* — **selected.**
  Deterministic JS/TS AST without typechecker
  coupling; first-party; covers TS / TSX / JS / JSX.
- *ESTree parser (acorn / espree / meriyah)* —
  **deferred.** Useful if plugin ecosystem needed
  later; v1 picks narrower TS-first surface.
- *swc parser* — **deferred.** Faster but introduces
  native dependency; revisit if v1 perf becomes a
  problem.
- *ts-morph* — **deferred.** Wraps TS compiler API;
  useful for higher-level walks but adds dependency
  surface v1 does not need.
- *typechecker-backed v1* — **deferred.** Higher
  complexity (project / tsconfig resolution);
  parser-only first.
- *LLM-based extraction* — **rejected.** Violates the
  no-LLM-only-inference architectural reservation.

## PARSER CHOICE

**Selected:** TypeScript compiler parser API
(`ts.createSourceFile`, `ts.forEachChild`).

- First-party (`typescript` already in the JS/TS
  ecosystem; no new vendor dependency).
- Parses TypeScript (`.ts` / `.tsx`) and JavaScript
  (`.js` / `.jsx` / `.cjs` / `.mjs`) with the same
  API surface.
- Parser-only path does **not** require
  `tsconfig.json` resolution or a project graph; the
  AST is a pure function from source text.
- No native compilation step (pure JS / TS package).
- AST node kinds match the construct vocabulary the
  parity audit's `ExtractedName` design wants.

`inferScriptKind` mapping (per memo):

- `.ts` / `.cts` / `.mts` → `ts.ScriptKind.TS`
- `.tsx` → `ts.ScriptKind.TSX`
- `.js` / `.cjs` / `.mjs` → `ts.ScriptKind.JS`
- `.jsx` → `ts.ScriptKind.JSX`

## EVIDENCEGRAPH FACT MODEL

**Existing fact kinds remain unchanged**: `file`,
`import`, `export`, `symbol`, `ownership_hint`,
`capability_hint`.

AST v1 enriches the `value` payloads of `symbol` /
`export` / `import` facts with optional additive
fields:

- `extractionMethod?: "ast" | "regex-fallback"`
- `language?: "typescript" | "javascript"`
- `syntaxKind?: string` (TS compiler `SyntaxKind`
  name, diagnostic)
- `symbolKind?: "function" | "class" | "method" |
  "variable" | "interface" | "type" | "enum" |
  "object" | "unknown"`
- `exportKind?: "named" | "default" | "re-export" |
  "type-only" | "namespace"`
- `importKind?: "value" | "type-only" | "namespace"
  | "side-effect"`
- `location?: { line: number; column: number }`
- `confidence?: "high" | "medium" | "low"`

**Rules:**

- additive only;
- old facts remain valid;
- no new fact kind;
- raw `EvidenceGraph` remains raw evidence;
- no semantic capability claim is made by AST fact
  alone.

## FALLBACK POLICY

- **Regex extraction remains only as fallback.**
- **Fallback fires when:** parser fails (syntax
  error, throw, OOM), unsupported file extension,
  intentionally skipped file. Fallback does **not**
  fire when AST returns zero facts for a legitimately
  empty file.
- **AST facts carry** `extractionMethod: "ast"` and
  `confidence: "high"`.
- **Fallback facts carry** `extractionMethod:
  "regex-fallback"` and `confidence: "low"` or
  `"medium"`.
- **No silent downgrade.** Mixed-method runs surface
  a per-file extraction-method breakdown in the
  provider's diagnostic output (separate concern from
  the artifact shape).

## DOWNSTREAM ONTOLOGY IMPACT

AST v1 **should improve**:

- `CapabilityNormalizationReport` candidate quality
  (better candidate coverage of class methods,
  arrow-function assignments, type-vs-value
  distinctions).
- `CapabilityPhraseReport` stable phrase density
  (more verb:noun pairs that match canonical
  vocabulary).
- Future `CapabilityMap` v2 readiness (post-AST
  coverage review is the gate).

AST v1 **does not**:

- mutate `CapabilityMap` (deferred to v2; gated on
  post-AST coverage review);
- change `CapabilityPhraseReport` shape or projection
  rules;
- change `CapabilityNormalizationReport` shape or
  semantics;
- mutate `EvidenceGraph` raw facts retroactively
  (only future emissions carry the new optional
  fields);
- imply semantic capability claims (raw evidence
  stays separate from normalized purpose).

## TESTS / VERIFICATION

- **New 18-assertion docs test**
  `tests/docs/js-ts-ast-evidence-adapter-decision.test.mjs`
  pins:
  1. decision memo exists.
  2. memo contains all 14 required headings.
  3. memo selects TypeScript compiler parser API.
  4. memo says parser-only v1.
  5. memo says regex extraction is fallback only.
  6. memo says AST facts use `extractionMethod`
     `"ast"`.
  7. memo says fallback facts use
     `extractionMethod` `"regex-fallback"`.
  8. memo says typechecker semantics are deferred.
  9. memo says call graph is deferred.
  10. memo says `EvidenceGraph` remains the
      repo-agnostic protocol.
  11. memo says AST v1 should improve
      `CapabilityNormalizationReport` candidate
      quality.
  12. memo says AST v1 should improve
      `CapabilityPhraseReport` stable phrase
      density.
  13. memo says AST v1 does not mutate
      `CapabilityMap`.
  14. memo includes option table.
  15. memo includes construct coverage table.
  16. memo includes fallback table.
  17. CHANGELOG mentions JS/TS AST Evidence Adapter
      Decision.
  18. review packet exists and contains PURPOSE
      PRESERVATION CHECK.
- Expected full suite: 2490 pass (2472 + 18 new) / 10
  skipped / 0 fail.
- 9-command gate: typecheck / test / build / git
  diff --check / audit-package-exports /
  audit-license / publish-dry-run / install-smoke /
  install-tarball-smoke all expected green.

## INTENTIONALLY UNTOUCHED

- `@rekon/capability-js-ts` runtime behavior.
- `EvidenceGraph` schema (the proposed additive
  fields are documented but not implemented).
- `EvidenceGraph` validators / writers.
- `CapabilityNormalizationReport` shape and
  semantics.
- `CapabilityPhraseReport` shape and projection
  rules.
- Splitter behavior.
- Canon packs.
- Normalizer behavior.
- Enrichment rules.
- Stable phrase threshold.
- `CapabilityMap` v2 (still deferred; still
  evidence-gated).
- `CapabilityNormalizationReviewLedger` and
  `CapabilityOntologySuggestionReport`.
- Publication shape.
- CLI commands.
- No new permission, role, or workflow YAML.
- No version bump. No npm publish. No git tag. No
  GitHub Release. No new branch.

## RISKS / FOLLOW-UP

Risks:

1. AST adapter runtime slice never lands and Rekon's
   capability-ontology track stalls again.
   **Mitigation:** this memo explicitly names the next
   slice (*JS/TS AST EvidenceGraph Provider v1*) and
   the post-AST coverage review that gates
   `CapabilityMap` v2.
2. Parser-only AST misses constructs that look
   different at runtime (e.g. `Object.defineProperty`-
   assigned exports). **Mitigation:** the construct
   coverage table is conservative and explicit;
   uncovered constructs continue to fall through to
   regex or remain unknown rather than silently
   misclassified.
3. AST parse perf becomes a problem on large repos.
   **Mitigation:** v1 is parser-only (no
   typechecker); benchmark on real-repo fixtures
   during the runtime slice; revisit swc / oxc only
   if perf evidence shows it is needed.
4. `extractionMethod` / `symbolKind` / `exportKind`
   field name drift between this decision memo and
   the runtime implementation. **Mitigation:** the
   docs test pins the field names verbatim; the
   runtime slice's contract tests assert against the
   same names.
5. Operators expect AST extraction to ship in this
   batch. **Mitigation:** the memo and CHANGELOG
   explicitly state this batch is the *decision*,
   not the *implementation*.
6. `CapabilityMap` v2 ships before post-AST coverage
   is measured. **Mitigation:** the memo pins
   `CapabilityMap` v2 as gated on the post-AST
   coverage review.

Follow-up:

- **JS/TS AST EvidenceGraph Provider v1** (next
  slice; runtime implementation in
  `@rekon/capability-js-ts`).
- **Post-AST coverage review** (fourth coverage
  review on the phrase track; gates `CapabilityMap`
  v2).
- **`CapabilityMap` v2 high-confidence-only design
  decision** — gated on post-AST coverage.
- **Discovered-vocabulary artifact** (deferred).
- **`synonymsApplied` aggregate surfacing**
  (parallel polish).
- **System-derived verb expansion in base canon
  pack** (parallel; conditioned on AST shape).
- **Canon-pack expansion v2** (parallel; per-
  archetype).
- **Phrase enrichment v2** (parallel; framework /
  architecture-profile-derived).
- **`CapabilityContract` decision** (further
  future).

## NEXT STEP

Recommended: **JS/TS AST EvidenceGraph Provider v1**
— runtime implementation slice that:

- adds AST extraction to `@rekon/capability-js-ts`
  using the TypeScript compiler parser API;
- emits AST symbol / import / export facts with the
  additive metadata fields pinned in this memo
  (`extractionMethod`, `language`, `syntaxKind`,
  `symbolKind`, `exportKind`, `importKind`,
  `location`, `confidence`);
- retains regex extraction as fallback for parser
  failures and unsupported environments;
- covers the v1 construct list (function / class /
  method / arrow / interface / type alias / enum /
  named / default / re-export / type-only / namespace
  / side-effect);
- ships fixtures proving function / class / method /
  export / type-only coverage;
- pins **no typechecker semantics yet**;
- pins **no `CapabilityMap` mutation**;
- pins **no `CapabilityPhraseReport` shape change**;
- pins **no `CapabilityNormalizationReport`
  semantics change**;
- pins **no source writes**, **no LLM-only
  inference**.
