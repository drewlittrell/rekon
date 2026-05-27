# Review Packet — JS/TS AST EvidenceGraph Provider v1

Runtime implementation slice. **Twenty-fourth slice on
the capability-ontology track.** Upgrades
`@rekon/capability-js-ts` so JS/TS evidence extraction
uses the **TypeScript compiler parser API** as the
primary extraction path. Regex extraction is preserved
as **fallback only**. Implements the
[JS/TS AST Evidence Adapter Decision](../../docs/strategy/js-ts-ast-evidence-adapter-decision.md)
(twenty-third slice).

**Strategy guardrails: No `EvidenceGraph` schema
mutation. No `CapabilityNormalizationReport`
mutation. No `CapabilityPhraseReport` mutation. No
`CapabilityMap` mutation. No new fact kinds. No new
artifact registration. No new CLI command. No source
writes. No LLM-only inference. No typechecker
dependency. No npm publish. No version bump. No git
tag. No GitHub Release. No new branch.**

## CHANGES MADE

- **`@rekon/capability-js-ts` dependency**:
  added `typescript: ^5.4.5` to the package's
  `dependencies`. The compiler API is used in
  parser-only mode (no Program, no typechecker, no
  tsconfig resolution).
- **New `packages/capability-js-ts/src/ast-extractor.ts`**:
  parser-only AST walker. Exports `extractAstRecords`,
  `astSupportsExtension`, and a small set of typed
  records (`AstSymbolRecord`, `AstExportRecord`,
  `AstImportRecord`, `AstExtractionResult`) plus the
  shared `AstLanguage` / `AstSymbolKind` /
  `AstExportKind` / `AstImportKind` / `AstConfidence`
  type aliases. Walks `ts.SourceFile` via
  `ts.forEachChild` and emits structured records the
  provider promotes into `EvidenceGraph` facts.
- **`packages/capability-js-ts/src/index.ts`** rewires
  the per-file extraction pipeline:
  1. Inspect file extension; if AST-supported
     (`.ts`/`.tsx`/`.js`/`.jsx`/`.mts`/`.cts`/`.mjs`/`.cjs`),
     run AST extraction.
  2. On AST success, emit `symbol` / `export` /
     `import` facts with `extractionMethod: "ast"`,
     `language`, `syntaxKind`, `symbolKind` /
     `exportKind` / `importKind`, and
     `confidence: "high"`.
  3. On AST failure (parser throw), fall through to
     regex extraction. Fallback facts carry
     `extractionMethod: "regex-fallback"`,
     `language`, and `confidence: "medium"`.
  4. `ownership_hint` / `capability_hint` / `file`
     facts continue to be emitted unchanged.
- **`packages/capability-js-ts/src/index.ts`** also
  exports `__extractRegexFallbackFactsForTesting` — an
  `@internal` testing hook so the regex-fallback path
  can be exercised even when the TS parser tolerates
  the input. Not part of the public API.
- **New test fixture** `tests/fixtures/js-ts-ast-evidence/`
  with seven source files (`constructs.ts`,
  `constructs.tsx`, `constructs.js`, `reexports.ts`,
  `type-only.ts`, `broken.ts`, `react-shim.ts`,
  `side-effects.js`) exercising function / class /
  method / arrow / function-expression / interface /
  type-alias / enum / object / named-export /
  default-export / re-export / type-only-export /
  type-only-import / namespace-import / side-effect-
  import constructs across TS, TSX, and JS.
- **New 25-assertion contract test**
  `tests/contract/js-ts-ast-evidence-provider.test.mjs`.
- **New 9-assertion docs test**
  `tests/docs/js-ts-ast-evidence-provider.test.mjs`.
- **Updated existing test**
  `tests/contract/evidence-export-symbol-facts.test.mjs`:
  the legacy default-export `assert.deepEqual` checks
  now assert legacy contract fields (`name`, `kind`,
  `default`) without rejecting the additive AST
  enrichment.
- **Supporting doc updates** (10):
  - `docs/artifacts/evidence-graph.md` — promotes the
    "Upcoming: AST-backed JS/TS provider" section to
    "AST-Backed JS/TS Extraction (v1, shipped)" with
    the additive value fields documented inline.
  - `docs/artifacts/capability-normalization-report.md`
    — Upstream Candidate-Quality Lever section is
    reframed: the provider has shipped; AST facts
    improve candidate quality.
  - `docs/artifacts/capability-phrase-report.md` —
    Upstream Stable-Density Lever section is reframed:
    AST facts may improve stable phrase density (to be
    confirmed by the post-AST coverage review).
  - `docs/strategy/js-ts-ast-evidence-adapter-decision.md`
    — Implementation Sequence updates step 3 to
    "✅ Shipped".
  - `docs/strategy/classic-scanner-ontology-parity-audit.md`
    — Follow-Up Work updates the provider entry to
    "✅ Shipped".
  - `docs/strategy/capability-phrase-post-quality-coverage-review.md`
    — Follow-Up Work marks the provider as shipped;
    the post-AST coverage review remains as the next
    slice.
  - `docs/concepts/capability-ontology.md` — Semantic
    Layer now states the AST provider has shipped.
  - `docs/strategy/roadmap.md` — twenty-fourth-slice
    entry.
  - `docs/strategy/classic-behavior-roadmap.md` —
    same.
  - `README.md` — new comment block summarizing the
    provider.
  - `CHANGELOG.md` — top entry.
- **New review packet** (this file).

## PUBLIC API CHANGES

- **`@rekon/capability-js-ts` package**:
  - `dependencies.typescript: ^5.4.5` added.
- **New exported type aliases** (`AstConfidence`,
  `AstExportKind`, `AstImportKind`, `AstLanguage`,
  `AstSymbolKind`) for downstream consumers that want
  to type-narrow on the new value fields.
- **`__extractRegexFallbackFactsForTesting`** is
  exported as `@internal` for the contract test.
- **`EvidenceGraph` schema unchanged.** Existing fact
  kinds (`file`, `import`, `export`, `symbol`,
  `ownership_hint`, `capability_hint`) are unchanged.
  New optional fields on `value` payloads
  (`extractionMethod`, `language`, `syntaxKind`,
  `symbolKind`, `exportKind`, `importKind`, `location`,
  `confidence`) are additive — older artifacts validate
  unchanged.
- **No new fact kinds.**
- **No new CLI commands.**
- **No new artifact types.**
- **No new permissions or roles.**

## PURPOSE PRESERVATION CHECK

- `EvidenceGraph` protocol unchanged. New fields are
  additive on existing fact-value payloads; old facts
  validate.
- `EvidenceGraph` dedupe semantics unchanged. The
  provider deliberately omits `location` from
  `export` / `symbol` value payloads so duplicate
  declarations continue to dedupe via the canonical
  `kind + subject + value + provenance` key. `location`
  is included on `import` value (where the legacy
  `line` field also lived).
- `CapabilityNormalizationReport` shape and semantics
  unchanged.
- `CapabilityPhraseReport` shape and projection rules
  unchanged.
- `CapabilityMap` not mutated. The contract test
  explicitly asserts the provider emits no
  `CapabilityMap`-referencing facts.
- Canon packs, splitter, normalizer, and enrichment
  rules unchanged.
- ADR 0004 (codebase-intel-classic is reference, not
  dependency) reaffirmed: no classic code imported.
- Eight architectural reservations from the
  [Capability Ontology Architecture Impact Review](../../docs/strategy/capability-ontology-architecture-impact-review.md)
  remain in force. AST stays optional enrichment, not
  foundational truth in v1.
- All eleven verbatim pins from the
  [JS/TS AST Evidence Adapter Decision](../../docs/strategy/js-ts-ast-evidence-adapter-decision.md)
  are preserved:
  - JS/TS AST extraction is primary where available.
  - Regex extraction is fallback only.
  - The selected parser is the TypeScript compiler
    parser API.
  - V1 is parser-only; typechecker semantics are
    deferred.
  - AST facts use `extractionMethod: "ast"`.
  - Fallback facts use
    `extractionMethod: "regex-fallback"`.
  - Call graph is deferred.
  - `EvidenceGraph` remains the repo-agnostic
    protocol.
  - AST v1 improves `CapabilityNormalizationReport`
    candidate quality.
  - AST v1 may improve `CapabilityPhraseReport`
    stable phrase density.
  - AST v1 does not mutate `CapabilityMap`.

## CODEBASE-INTEL ALIGNMENT

- **Aligned with
  [ADR 0004](../../docs/adr/0004-codebase-intel-classic-is-reference-not-dependency.md)**:
  classic remains design prior art only. No code is
  imported from `codebase-intel-classic`. The AST
  extractor uses the TypeScript compiler API
  directly.
- **Aligned with the
  [Classic Scanner/Ontology Parity Audit](../../docs/strategy/classic-scanner-ontology-parity-audit.md)**:
  parity-matrix decisions are honoured —
  `ExtractedName` / `SplitName` patterns are adapted
  into Rekon's record / fact shape; verb / noun
  aliases stay in the canon-pack layer (untouched);
  `GraphOntologyValidator` monolith remains rejected;
  `TaxonomyRepository` standalone persistence layer
  remains rejected.
- **Aligned with the
  [JS/TS AST Evidence Adapter Decision](../../docs/strategy/js-ts-ast-evidence-adapter-decision.md)**:
  this slice ships the runtime that the decision memo
  committed to.

## AST EXTRACTION MODEL

Per the AST decision memo and this implementation:

- **Parser:** `ts.createSourceFile(path, content,
  ts.ScriptTarget.Latest, /*setParentNodes*/ true,
  inferScriptKind(extension))`.
- **Walk:** `ts.forEachChild(sourceFile, visit)` with
  per-node `ts.isFunctionDeclaration` /
  `ts.isClassDeclaration` / `ts.isMethodDeclaration` /
  `ts.isInterfaceDeclaration` /
  `ts.isTypeAliasDeclaration` / `ts.isEnumDeclaration`
  / `ts.isModuleDeclaration` /
  `ts.isVariableStatement` / `ts.isExportDeclaration`
  / `ts.isExportAssignment` / `ts.isImportDeclaration`
  / `ts.isImportEqualsDeclaration` predicates.
- **No Program, no typechecker, no tsconfig
  resolution, no project graph.** Pure function from
  source text + path to records.
- **Variable kind:** `VariableDeclarationList.flags`
  drives `const` / `let` / `var` classification for
  the legacy `value.kind` field; the richer
  `symbolKind` is derived from the initializer shape
  (`function` for arrow / function-expression,
  `class` for class-expression, `object` for
  object-literal, `variable` otherwise).
- **Method names:** identifier, private-identifier,
  string-literal, and numeric-literal property names
  are supported; computed property names fall through
  unrecorded.
- **`import equals`**: `import x = require("./y")`
  records an `import` fact with `importKind: "value"`.

## EVIDENCEGRAPH FACT MODEL

**Existing fact kinds** (unchanged): `file`, `import`,
`export`, `symbol`, `ownership_hint`,
`capability_hint`.

**AST `import` value** (additive fields, plus legacy
`line` and `target` retained):

```json
{
  "source": "src/x.ts",
  "target": "./y",
  "line": 4,
  "extractionMethod": "ast",
  "language": "typescript",
  "syntaxKind": "ImportDeclaration",
  "importKind": "value",
  "location": { "line": 4, "column": 1 },
  "confidence": "high"
}
```

**AST `export` value** (additive fields, plus legacy
`name` / `kind` retained; location intentionally
omitted from value to preserve dedupe):

```json
{
  "name": "createUser",
  "kind": "function",
  "extractionMethod": "ast",
  "language": "typescript",
  "syntaxKind": "FunctionDeclaration",
  "exportKind": "named",
  "confidence": "high"
}
```

**AST `symbol` value** (analogous to export):

```json
{
  "name": "createUser",
  "kind": "function",
  "exported": true,
  "extractionMethod": "ast",
  "language": "typescript",
  "syntaxKind": "FunctionDeclaration",
  "symbolKind": "function",
  "confidence": "high"
}
```

**Regex-fallback values** carry the same legacy
fields plus `extractionMethod: "regex-fallback"`,
`language`, and `confidence: "medium"`.

## REGEX FALLBACK MODEL

- Fires when `extractAstRecords` throws (parser
  failure, OOM, recursive blowup).
- Also reachable directly via
  `__extractRegexFallbackFactsForTesting` for contract
  tests.
- Stamped with `extractionMethod: "regex-fallback"`
  and `confidence: "medium"` on every emitted value.
- No silent unlabelled regex output: every fallback
  value carries the discriminator.
- TypeScript parser is intentionally tolerant — most
  syntactically broken sources still parse to a
  usable SourceFile, so in practice the fallback is a
  defense-in-depth surface rather than a frequently
  triggered path.

## TEST FIXTURES

`tests/fixtures/js-ts-ast-evidence/` contains:

- `src/constructs.ts` — function / class / methods /
  arrow / function-expression / object / interface /
  type alias / enum / value-import sample.
- `src/constructs.tsx` — TSX component, hook,
  default-export, namespace import, type-only import.
- `src/constructs.js` — JS / `language: "javascript"`
  sample with class methods, arrow assignment, and a
  side-effect import.
- `src/reexports.ts` — named re-export, `export * as`,
  `export *`.
- `src/type-only.ts` — `import type` + `export type` +
  `export { type X as Y }`.
- `src/broken.ts` — recoverable-diagnostic sample
  exercising parser tolerance.
- `src/react-shim.ts` — internal shim referenced by
  `constructs.tsx`.
- `src/side-effects.js` — side-effect import target.
- `package.json` — `private: true`, marked as a
  fixture so the publish-dry-run / install-tarball
  smoke skip it.

## DOWNSTREAM ONTOLOGY IMPACT

- `CapabilityNormalizationReport` candidate quality is
  expected to improve: class methods, arrow-function
  assignments, and type-vs-value distinctions are now
  surfaced as first-class evidence facts with rich
  metadata.
- `CapabilityPhraseReport` stable phrase density may
  improve. The post-AST coverage review (next slice)
  will measure this on fixture + `target-1` +
  `target-2`.
- `CapabilityMap` not mutated; v2 remains
  evidence-gated on the coverage review.

## TESTS / VERIFICATION

- **New 25-assertion contract test**
  `tests/contract/js-ts-ast-evidence-provider.test.mjs`
  pins:
  1. AST extraction emits `extractionMethod: "ast"`.
  2. AST symbol facts carry `confidence: "high"`.
  3. Function declaration emits
     `symbolKind: "function"`.
  4. Class declaration emits `symbolKind: "class"`.
  5. Class method emits `symbolKind: "method"`.
  6. Arrow-function const emits
     `symbolKind: "function"`, legacy `kind: "const"`.
  7. Interface declaration emits
     `symbolKind: "interface"`.
  8. Type alias emits `symbolKind: "type"`.
  9. Enum emits `symbolKind: "enum"`.
  10. Named export emits `exportKind: "named"`.
  11. Default export emits `exportKind: "default"`
      and `default: true`.
  12. Re-export emits `exportKind: "named"` for
      `export { X as Y }`; `export * as alias from`
      emits `exportKind: "namespace"` with
      `moduleSpecifier`.
  13. Type-only export emits
      `exportKind: "type-only"` for
      `export { type X as Y }`.
  14. Value import emits `importKind: "value"`.
  15. Type-only import emits
      `importKind: "type-only"`.
  16. Namespace import emits
      `importKind: "namespace"`.
  17. Side-effect import emits
      `importKind: "side-effect"`.
  18. TSX file parses through AST path
      (`language: "typescript"`).
  19. JS file parses through AST path
      (`language: "javascript"`).
  20. Import facts carry `location` with 1-based
      line + 1-based column.
  21. Regex fallback emits regex-fallback facts when
      invoked directly via the testing hook.
  22. Regex fallback facts include
      `extractionMethod: "regex-fallback"` across
      all three fact kinds.
  23. Regex fallback facts carry
      `confidence: "medium"` (or `"low"`).
  24. Provider emits no `CapabilityMap` facts and no
      `CapabilityMap`-referencing values.
  25. `rekon refresh` + `rekon artifacts validate`
      remain clean on the fixture.
- **New 9-assertion docs test**
  `tests/docs/js-ts-ast-evidence-provider.test.mjs`.
- Expected full suite: 2524 pass (2490 + 25 contract +
  9 docs = 34 new) / 10 skipped / 0 fail.
- 9-command gate: typecheck / test / build / git
  diff --check / audit-package-exports /
  audit-license / publish-dry-run / install-smoke /
  install-tarball-smoke all expected green.

## INTENTIONALLY UNTOUCHED

- `EvidenceGraph` schema (only additive optional
  fields documented; validators unchanged).
- `CapabilityNormalizationReport` shape and
  semantics.
- `CapabilityPhraseReport` shape and projection
  rules.
- Splitter behaviour.
- Canon packs.
- Normalizer behaviour.
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

1. AST extraction performance regression on large
   repos. **Mitigation:** parser-only, single AST walk
   per file, no Program / typechecker; identical
   memory profile to TS's own compiler frontend.
   Future swc / oxc swap remains an option if perf
   evidence later demands it.
2. The TypeScript parser is so tolerant that the
   regex fallback is rarely exercised in production.
   **Mitigation:** the contract test exercises the
   fallback via the `__extractRegexFallbackFactsForTesting`
   hook so the path stays maintained; production
   coverage is incidental.
3. `typescript` is now a runtime dependency of
   `@rekon/capability-js-ts`. **Mitigation:** TS is a
   pure-JS package; install-from-tarball smoke
   continues to pass; `audit-license` confirms
   Apache-2.0 root + per-package licenses still
   match.
4. Downstream tests that asserted the exact regex
   shape of `EvidenceGraph` `export` / `symbol` values
   may need updating to allow additive fields.
   **Mitigation:** identified one such test
   (`tests/contract/evidence-export-symbol-facts.test.mjs`)
   and converted its `assert.deepEqual` to legacy-
   contract subset checks. Full suite re-run confirms
   no other failures.
5. The `kind` field on `export`/`symbol` for
   named-export-list entries (`export { x }`) is
   `"unknown"` because the AST cannot know the source
   declaration without cross-file resolution. Matches
   legacy regex behaviour. **Mitigation:** documented
   in the AST extractor and the contract test
   expectations.

Follow-up:

- **Post-AST `CapabilityPhraseReport` coverage
  review** (next slice; gates `CapabilityMap` v2
  design).
- **`CapabilityMap` v2 high-confidence-only design
  decision** — gated on the coverage review.
- **Optional typechecker pass** (deferred; revisit
  only if post-AST coverage evidence shows
  cross-file resolution is needed).
- **Construct expansion** — call graph, symbol
  references, JSX component tree, schema inference,
  test-to-source map remain deferred per the AST
  decision memo's construct coverage table.
- **Canon-pack expansion v2** (parallel; per-
  archetype).
- **Phrase enrichment v2** (parallel; framework /
  architecture-profile-derived).

## NEXT STEP

Recommended: **Post-AST `CapabilityPhraseReport`
Coverage Review** — strategy + dogfood-analysis
slice that:

- re-runs `rekon refresh` + `capability ontology
  normalize` + `capability phrase project` against
  the fixture + `target-1` + `target-2`;
- measures `CapabilityNormalizationReport` candidate
  quality (`normalized` / `unknown` / `ignored` /
  `lowConfidence` counts) before and after AST
  extraction;
- measures `CapabilityPhraseReport` stable phrase
  density before and after AST extraction;
- pins whether the seventh readiness gate (stable
  density sufficient for canonical projection) now
  passes;
- decides whether to begin **`CapabilityMap` v2
  high-confidence-only design** as the next slice;
- pins **no source writes**, **no LLM-only
  inference**, **no `CapabilityMap` mutation**.
