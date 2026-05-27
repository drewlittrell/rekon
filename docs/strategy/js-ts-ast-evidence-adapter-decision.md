# JS/TS AST Evidence Adapter Decision

**Status:** decision recorded.
**Slice:** `js-ts-ast-evidence-adapter-decision`.
**Sequence position:** Twenty-third slice on the
capability-ontology track. Follows the
[Classic Scanner/Ontology Parity Audit](classic-scanner-ontology-parity-audit.md)
(twenty-second slice) which pinned **codebase-intel is
design prior art** and selected the JS/TS AST Evidence
Adapter Decision as the next slice.

## Decision Summary

**Recommendation:** Rekon's JS/TS evidence extraction
moves from regex-only to **AST-backed extraction using
the TypeScript compiler parser API**, parser-only in
v1 (no typechecker semantics). Regex extraction remains
in place as **fallback only** for parser failures and
unsupported environments.

**Pinned verbatim (asserted by docs test):**

- **JS/TS AST extraction should be primary where
  available.**
- **Regex extraction is fallback only.**
- **The selected parser is the TypeScript compiler
  parser API.**
- **V1 is parser-only; typechecker semantics are
  deferred.**
- **AST facts use `extractionMethod: "ast"`.**
- **Fallback facts use `extractionMethod:
  "regex-fallback"`.**
- **Call graph is deferred.**
- **`EvidenceGraph` remains the repo-agnostic
  protocol.**
- **AST v1 should improve `CapabilityNormalizationReport`
  candidate quality.**
- **AST v1 should improve `CapabilityPhraseReport`
  stable phrase density.**
- **AST v1 does not mutate `CapabilityMap`.**

This memo is a **strategy / architecture decision
only**. It commits to the design but defers the
implementation to the next slice
(*JS/TS AST EvidenceGraph Provider v1*). No runtime
behaviour changes in this batch. No new package. No new
CLI command. No artifact mutation.

## Why This Decision Exists

The
[Classic Scanner/Ontology Parity Audit](classic-scanner-ontology-parity-audit.md)
mapped `codebase-intel-classic`'s scanner / taxonomy /
ontology pipeline against Rekon's current state and
identified the **evidence-model bottleneck**: three
coverage reviews + two runtime slices (phrase
enrichment v1, candidate-quality v1) did not move the
stable phrase foundation. The
[CapabilityPhraseReport Post-Quality Coverage Review](capability-phrase-post-quality-coverage-review.md)
measured stable density as consistently sparse across
fixture + two real repos (0.18% and 0.49%). Vocabulary
and splitter precision are not the blockers — the input
evidence is.

The parity audit pinned **JS/TS AST extraction should
be primary where available; regex is fallback** and
selected this decision memo as the next slice. This
memo answers the design questions that any
implementation slice would otherwise have to
re-litigate:

1. Which parser?
2. Parser-only or typechecker semantics?
3. What `EvidenceGraph` fact shape changes?
4. How is extraction method / confidence represented?
5. What remains regex fallback?
6. What construct kinds are in v1?
7. How do AST facts feed
   `CapabilityNormalizationReport`?
8. What fixtures prove AST extraction improves
   evidence?
9. What stays deferred?

Each is answered below.

## Classic Scanner Prior Art

Per the
[Classic Scanner/Ontology Parity Audit](classic-scanner-ontology-parity-audit.md)
and earlier
[Classic Behavior Distillation](classic-behavior-distillation.md):

- `lib/taxonomy/extraction.ts` walked the AST and
  extracted typed name records (`ExtractedName`) for
  every function / class / method / interface / type /
  variable / export.
- The AST traversal layered the language toolchain
  rather than reimplementing parsing: classic used the
  TypeScript compiler / ts-morph for JS/TS sources.
- Typed `ExtractedName` records preserved syntax kind
  + symbol kind + export kind so downstream stages
  (split, discovery, normalization) could reason about
  shape instead of strings.
- Confidence was implicit: AST was the source of truth
  and only regex was used as fallback for non-JS/TS
  language fragments.

The parity audit explicitly pinned classic as **design
prior art, not dependency** per
[ADR 0004](../adr/0004-codebase-intel-classic-is-reference-not-dependency.md).
Rekon does not import classic code; it adapts the
*pattern* (AST-derived name records with explicit
kind metadata) into Rekon's artifact-first model.

## Current Rekon JS/TS Extraction

`@rekon/capability-js-ts` (428 lines,
`packages/capability-js-ts/src/index.ts`) currently
ships regex-based extraction:

- `importRegex` matches static / dynamic imports +
  CommonJS `require`.
- `EXPORT_DECL_RE` /
  `EXPORT_DEFAULT_FUNCTION_OR_CLASS_RE` /
  `EXPORT_DEFAULT_OTHER_RE` / `NAMED_EXPORT_LIST_RE` /
  `EXPORT_STAR_RE` cover the eight regex-detectable
  export forms.
- Symbol facts emitted from the same regex sweep.
- Inline comment at line 139 (verbatim):

  > regex-based extraction — no AST, no type checker,
  > no LLM, no semantic role inference. Conservative:
  > tolerate false negatives better than false
  > positives.

The conservative posture was correct for shipping a
substrate. It is now the bottleneck. The regex pass
misses:

- Class methods that are not `export class`-prefixed.
- Arrow-function assignments that are not at the
  module top level.
- Re-exports through aliasing chains.
- Type-only imports vs value imports.
- Default exports whose declaration spans multiple
  lines.
- Symbols that are exported via later `export {...}`
  blocks.
- Default-exported symbols whose source identifier is
  important for capability projection.

These misses propagate to `CapabilityCandidateSet` →
`CapabilityLexicalSplit` → `CapabilityNormalizationReport`
→ `CapabilityPhraseReport`, attenuating stable phrase
density.

## Options Considered

### Option table

| Option | Decision | Reason |
| --- | --- | --- |
| keep regex primary | rejected | weak evidence for purpose understanding; coverage reviews confirm the bottleneck |
| TypeScript parser API | selected | deterministic JS/TS AST without typechecker coupling; first-party; covers TS/TSX/JS/JSX |
| ESTree parser (acorn / espree / meriyah) | deferred | useful if plugin ecosystem needed later; v1 picks the narrower TS-first surface |
| swc parser | deferred | faster but introduces native dependency; revisit if v1 perf becomes a problem |
| ts-morph | deferred | wraps TS compiler API; useful for higher-level walks but adds dependency surface v1 does not need |
| typechecker-backed v1 | deferred | higher complexity (project / tsconfig resolution); parser-only first |
| LLM-based extraction | rejected | violates the no-LLM-only-inference architectural reservation |

### Why "keep regex primary" is rejected

Three coverage reviews confirm the bottleneck. Stable
phrase count is 16 on `target-1` across both phrase
enrichment v1 and candidate-quality v1 — vocabulary
and splitter changes did not move it. The evidence
model itself is the lever.

### Why "TypeScript parser API" is selected

- First-party (`typescript` is already in the JS/TS
  ecosystem; no new vendor dependency).
- Parses TypeScript (`.ts` / `.tsx`) and JavaScript
  (`.ts`'s `scanner` and `ts.createSourceFile` both
  accept JS) with the same API surface.
- Parser-only path does **not** require
  `tsconfig.json` resolution or a project graph;
  `ts.createSourceFile(fileName, source,
  ts.ScriptTarget.Latest, /*setParents*/ true,
  ts.ScriptKind.<inferred>)` is a pure function from
  source text to AST.
- No native compilation step (pure JS / TS package).
- AST node kinds match the construct vocabulary the
  parity audit's `ExtractedName` design wants.

### Why typechecker-backed v1 is deferred

A typechecker pass would require:

- `tsconfig.json` resolution (multi-project / monorepo
  paths).
- Whole-program type graph construction (slow on
  large repos).
- Module-resolution mode handling
  (`node16` / `bundler` / classic / etc.).
- Build-tool-specific path remapping (Vite, Next.js,
  workspace packages).

The parity audit explicitly pinned **no type-checker
dependency in v1**. Parser-only closes most of the
regex gap (deterministic syntax kinds + structural
location + import / export kind classification)
without coupling Rekon to project config.

### Why "LLM-based extraction" is rejected

Every prior capability-ontology slice has reaffirmed
the
[Capability Ontology Architecture Impact Review's](capability-ontology-architecture-impact-review.md)
seventh decision: **LLM-only normalization is not
acceptable as truth.** The same principle applies
upstream — raw evidence must remain deterministic.

## Recommendation

**Adopt parser-only AST v1 using the TypeScript
compiler parser API.**

- Owner package: `@rekon/capability-js-ts` (extend the
  existing provider; do not create a new package).
- Extraction order: AST-first, regex-fallback.
- New optional metadata on `symbol` / `export` /
  `import` facts (see EvidenceGraph Fact Model
  below).
- No `EvidenceGraph` shape break — old facts remain
  valid; new fields are additive optional.
- No typechecker semantics.
- Test fixtures prove function / class / method /
  arrow-function-assignment / interface / type-alias /
  enum / named-export / default-export / re-export /
  type-only-import / type-only-export / namespace-
  import / side-effect-import coverage.

The implementation slice that follows
(*JS/TS AST EvidenceGraph Provider v1*) inherits these
answers and ships the runtime.

## Parser Choice

**Selected:** TypeScript compiler parser API
(`ts.createSourceFile`, `ts.forEachChild`).

API surface used by v1:

```ts
import * as ts from "typescript";

const sourceFile = ts.createSourceFile(
  filePath,
  fileContents,
  ts.ScriptTarget.Latest,
  /* setParentNodes */ true,
  inferScriptKind(filePath),
);

ts.forEachChild(sourceFile, (node) => { /* walk */ });
```

`inferScriptKind`:

- `.ts` → `ts.ScriptKind.TS`
- `.tsx` → `ts.ScriptKind.TSX`
- `.cts` → `ts.ScriptKind.TS`
- `.mts` → `ts.ScriptKind.TS`
- `.js` → `ts.ScriptKind.JS`
- `.jsx` → `ts.ScriptKind.JSX`
- `.cjs` → `ts.ScriptKind.JS`
- `.mjs` → `ts.ScriptKind.JS`

Files with unknown extensions skip AST and fall back
to regex (or are ignored, per the existing extension
allow-list).

### Why not ESTree / acorn?

Acorn / ESTree parses JS but not TypeScript or JSX
without plugins. A plugin ecosystem (acorn-jsx,
acorn-typescript, espree, meriyah) would still need a
TypeScript story — we already depend on `typescript`
elsewhere; reusing it removes a parser choice.

### Why not swc / oxc?

Faster, but introduce native binaries (swc) or
WebAssembly (oxc). v1's correctness budget is more
important than its throughput budget; revisit if real
repos show parser time dominating.

### Why not ts-morph?

ts-morph is a wrapper over the TypeScript compiler
API that gives a friendlier object model. v1 walks the
AST once per file and emits facts; the wrapper is not
required for that. Adding ts-morph would pull a
larger dependency surface. Defer to a later slice if
the higher-level model proves useful.

## Parser-Only V1 Boundary

**V1 boundary:** the parser produces a syntactic AST
only. No semantic information beyond what the parser
itself can decide from a single source file:

| In v1 | Out of v1 (deferred) |
| --- | --- |
| `function foo() {}` → symbol record with `symbolKind: "function"` | does `foo` shadow a typed symbol? |
| `import { Bar } from "./x"` → import record with `importKind: "value"` (or `"type-only"` if `import type {...}`) | does `./x` actually export `Bar`? |
| `export type Foo = …` → export record with `exportKind: "type-only"` | is `Foo` referenced anywhere? |
| `export { default as X } from "./y"` → export record with `exportKind: "re-export"` | what is `X`'s declared shape? |
| arrow-function assignment `export const foo = () => {}` → symbol record with `symbolKind: "function"` (best-effort) | what does the arrow function's body call? |

The parser-only boundary preserves the
[Capability Ontology Architecture Impact Review's](capability-ontology-architecture-impact-review.md)
seven other reservations:

- AST stays optional enrichment, not foundational
  truth.
- Raw evidence stays separate from normalized purpose.
- No LLM-only inference.
- No type-checker dependency in v1.
- No source writes.
- `EvidenceGraph` raw facts are read-only.
- `CapabilityMap` v2 stays deferred.

## EvidenceGraph Fact Model

**Existing fact kinds** (unchanged):

```text
file
import
export
symbol
ownership_hint
capability_hint
```

AST v1 **does not introduce new fact kinds**. Instead,
it enriches the `value` payloads of existing `symbol`,
`export`, and `import` facts with optional fields.
Validators are updated to accept the additional
fields; older facts (regex-emitted) continue to
validate without them.

### Proposed additive value-fields (typed)

```ts
type AstFactMetadata = {
  /** "ast" when the parser succeeded; "regex-fallback" when
   *  the regex pass produced the fact. */
  extractionMethod?: "ast" | "regex-fallback";
  /** Source language inferred from extension. */
  language?: "typescript" | "javascript";
  /** TypeScript compiler SyntaxKind name (e.g.
   *  "FunctionDeclaration"). Diagnostic, not authoritative. */
  syntaxKind?: string;
  /** Coarse symbol category derived from the AST node. */
  symbolKind?:
    | "function"
    | "class"
    | "method"
    | "variable"
    | "interface"
    | "type"
    | "enum"
    | "object"
    | "unknown";
  /** Coarse export classification. */
  exportKind?:
    | "named"
    | "default"
    | "re-export"
    | "type-only"
    | "namespace";
  /** Coarse import classification. */
  importKind?:
    | "value"
    | "type-only"
    | "namespace"
    | "side-effect";
  /** 1-based line/column. */
  location?: {
    line: number;
    column: number;
  };
  /** Conservative quality bucket. `"high"` for AST-derived;
   *  `"low"` or `"medium"` for regex-fallback. */
  confidence?: "high" | "medium" | "low";
};
```

### Rules

- **Additive only.** No required field changes. Old
  artifacts validate.
- **No new fact kind.** AST facts ride on existing
  `symbol` / `export` / `import` kinds.
- **No new subject convention.** Subject remains the
  repo-relative file path.
- **Dedup keys unchanged.** Existing canonical
  dedup-by-`kind + subject + value` continues to apply.
- **Raw evidence stays raw.** `symbolKind`,
  `exportKind`, and `importKind` are *syntactic*
  categories, not capability claims. The translation
  layer (`CapabilityNormalizationReport`) still
  decides what these facts mean.
- **No semantic capability claim from AST alone.** AST
  facts are stronger input evidence, not output
  purpose.

### Why ride existing kinds (not introduce new ones)

The parity audit pinned **`EvidenceGraph` remains the
repo-agnostic protocol.** Introducing
`ast-symbol` / `ast-export` / `ast-import` fact kinds
would fork the protocol per provider. Riding existing
kinds with additive metadata preserves cross-provider
substrate: a future provider in another language
(Go, Rust, Python) emits `symbol` facts with the same
shape and its own `extractionMethod` / `language`
fields.

## Construct Coverage

### Construct coverage table

| Construct | V1 Decision |
| --- | --- |
| function declarations (`function foo() {}`) | included |
| class declarations (`class Foo {}`) | included |
| class methods | included |
| arrow-function assignments (`const foo = () => {}`) | included |
| function expression assignments (`const foo = function() {}`) | included |
| interface declarations | included |
| type alias declarations | included |
| enum declarations | included |
| object-literal assigned exports (`export const x = {...}`) | included (symbolKind `object`) |
| named exports (`export { a, b }`) | included |
| default exports (`export default …`) | included |
| re-exports (`export { x } from "./y"`) | included |
| type-only exports (`export type { Foo }`) | included |
| type-only imports (`import type { Foo } from "./y"`) | included |
| namespace imports (`import * as X from "./y"`) | included |
| side-effect imports (`import "./y"`) | included |
| call graph | deferred |
| type resolution (cross-file) | deferred |
| symbol references | deferred |
| inferred return types | deferred |
| side-effect analysis | deferred |
| JSX component tree | deferred |
| test-to-source map | deferred |
| schema inference (Zod / Yup / etc.) | deferred |

### Deferred constructs — rationale

- **Call graph / symbol references / cross-file type
  resolution** require either a typechecker pass or
  a separate cross-file analysis layer. Both are out
  of v1 scope.
- **Inferred return types** require typechecker
  semantics.
- **Side-effect analysis** is inherently inter-
  procedural and requires call graph.
- **JSX component tree** is downstream of symbol
  references.
- **Test-to-source map** is a derivative artifact, not
  raw evidence.
- **Schema inference** is a different track (potential
  future capability pack).

## Regex Fallback Policy

### Fallback table

| Case | Behavior |
| --- | --- |
| AST parse succeeds | emit AST facts with `extractionMethod: "ast"`, `confidence: "high"` |
| AST parse fails (syntax error, throw, OOM) | emit regex-fallback facts with `extractionMethod: "regex-fallback"`, `confidence: "low"` or `"medium"` |
| unsupported file extension | skip (existing behavior) — no regex pass |
| explicitly skipped file (per existing skip rules) | skip — no AST and no regex pass |
| type-only import / export | preserved with `importKind: "type-only"` / `exportKind: "type-only"` |
| supported file but AST parse partial (recoverable diagnostics) | emit AST facts; record diagnostics count in provenance if useful |
| supported file with empty content | skip (no facts) |

### Rules

- **Regex extraction remains only as fallback.** It is
  not the primary path for any supported JS/TS file.
- **Fallback fires only on AST parse failure.** It
  does not fire when AST returns zero facts for a
  legitimately empty file.
- **Fallback facts must carry `extractionMethod:
  "regex-fallback"`** so downstream consumers
  (`CapabilityNormalizationReport`,
  `CapabilityPhraseReport`) can treat them with
  appropriately lower confidence.
- **AST facts must carry `extractionMethod: "ast"`**
  so the same downstream consumers can prefer them.
- **No silent downgrade.** Mixed-method runs surface a
  per-file extraction-method breakdown in the
  provider's diagnostic output (separate concern from
  the artifact shape).

## Downstream Ontology Impact

AST v1 is expected to improve:

- **`CapabilityNormalizationReport` candidate
  quality.** Candidates extracted from AST nodes carry
  `symbolKind` / `exportKind` / `importKind` that the
  splitter can use to refine lexical decisions
  (`CapabilityNameSplit.kind` already accepts
  `"name"` | `"path"`; AST can layer additional kinds
  later).
- **`CapabilityPhraseReport` stable phrase density.**
  Better candidate coverage of class methods,
  arrow-function assignments, and accurate
  type-vs-value distinctions yields more verb:noun
  pairs that match the canonical vocabulary.
- **Future `CapabilityMap` v2 readiness.** The parity
  audit pinned `CapabilityMap` v2 as evidence-gated;
  measuring post-AST stable density is the gate.

AST v1 explicitly does **not**:

- mutate `CapabilityMap` (deferred to v2; gated on a
  post-AST coverage review).
- change `CapabilityPhraseReport` shape or projection
  rules.
- change `CapabilityNormalizationReport` shape or
  semantics.
- mutate `EvidenceGraph` raw facts retroactively
  (only future emissions carry the new optional
  fields).
- imply semantic capability claims (raw evidence
  stays separate from normalized purpose).

## What This Does Not Do

This batch:

- Does **not** implement AST extraction in
  `@rekon/capability-js-ts`.
- Does **not** change `@rekon/capability-js-ts`
  runtime behavior.
- Does **not** modify the `EvidenceGraph` schema in
  this batch beyond *documenting proposed additive
  fields*.
- Does **not** modify validators.
- Does **not** mutate `CapabilityNormalizationReport`
  shape or semantics.
- Does **not** mutate `CapabilityPhraseReport` shape
  or projection rules.
- Does **not** mutate `CapabilityMap`.
- Does **not** add a new CLI command.
- Does **not** add a new artifact type.
- Does **not** add LLM-only inference.
- Does **not** add a typechecker dependency.
- Does **not** add source writes.
- Does **not** publish to npm.
- Does **not** bump versions.
- Does **not** create a git tag or GitHub Release.
- Does **not** create a branch.

The shipped artefacts of this slice are: this memo,
the 18-assertion docs test, the review packet, and
supporting-doc cross-references.

## Implementation Sequence

| Step | Slice | Status |
| --- | --- | --- |
| 1 | [Classic Scanner/Ontology Parity Audit](classic-scanner-ontology-parity-audit.md) | ✅ Shipped |
| 2 | **JS/TS AST Evidence Adapter Decision (this memo)** | ✅ Shipped |
| 3 | JS/TS AST EvidenceGraph Provider v1 — runtime implementation in `@rekon/capability-js-ts` | ✅ Shipped — twenty-fourth slice. Parser-only AST extraction lives in `packages/capability-js-ts/src/ast-extractor.ts`; the provider emits `extractionMethod: "ast"` facts with `language` / `syntaxKind` / `symbolKind` / `exportKind` / `importKind` / `location` / `confidence` metadata, falling back to regex on parser failure. |
| 4 | Post-AST coverage review — re-run normalization + phrase projection on fixture + cohort targets; measure stable phrase density | ✅ Shipped — twenty-fifth slice. See [Post-AST CapabilityPhraseReport Coverage Review](post-ast-capability-phrase-coverage-review.md). Verdict: `CapabilityMap` v2 remains deferred; narrower evidence accepted; cohort re-run on `target-1` + `target-2` is the primary next slice. |
| 5 | Post-AST cohort re-run — execute the matrix against `target-1` + `target-2` when available | ✅ Shipped — twenty-sixth slice. See [Post-AST Cohort Re-Run](post-ast-cohort-rerun.md). Verdict: target-1 16 → 37 stable phrases (+131.3%); target-2 neutral; readiness gate accepts narrower evidence; `CapabilityMap` v2 design ready to begin. |
| 6 | `CapabilityMap` v2 high-confidence-only design decision | next slice; readiness gate satisfied |

Parallel follow-ups (independent tracks):

- Discovered-vocabulary artifact (still deferred).
- `synonymsApplied` aggregate surfacing (parallel
  polish).
- System-derived verb expansion in base canon pack
  (parallel; conditioned on AST shape).
- Canon-pack expansion v2 (parallel; per-archetype).
- Phrase enrichment v2 (parallel; framework /
  architecture-profile-derived).
- `CapabilityContract` decision (further future).
- ts-morph / swc / typechecker-backed parser
  alternatives (revisit only if v1 evidence shows
  they are needed).

## Cross-References

- [Classic Scanner/Ontology Parity Audit](classic-scanner-ontology-parity-audit.md)
  — twenty-second slice. Pinned codebase-intel as
  design prior art and selected this decision memo as
  the next slice.
- [Capability Ontology Architecture Impact Review](capability-ontology-architecture-impact-review.md)
  — eight architectural reservations remain in force.
- [Capability Ontology Translation Layer Decision](capability-ontology-translation-layer-decision.md)
  — Layer 0 (`EvidenceGraph`) is the input layer this
  decision upgrades the JS/TS provider for.
- [Graph Ontology Validator Lite Audit](graph-ontology-validator-lite-audit.md)
  — rejected the monolithic `GraphOntologyValidator`
  port. AST v1 does not revive it.
- [Classic Behavior Distillation](classic-behavior-distillation.md)
  — earlier survey of classic's AST-backed taxonomy
  pipeline.
- [CapabilityPhraseReport Post-Quality Coverage Review](capability-phrase-post-quality-coverage-review.md)
  — third coverage review identifying the evidence-
  model bottleneck.
- [`EvidenceGraph` artifact reference](../artifacts/evidence-graph.md)
  — shape and protocol that this decision preserves.
- [`CapabilityNormalizationReport` artifact reference](../artifacts/capability-normalization-report.md)
  — first downstream consumer of richer AST facts.
- [`CapabilityPhraseReport` artifact reference](../artifacts/capability-phrase-report.md)
  — second downstream consumer; stable phrase density
  is the success metric.
- [Capability ontology concept](../concepts/capability-ontology.md)
- [Roadmap](roadmap.md)
- [Classic-behaviour roadmap](classic-behavior-roadmap.md)
- [ADR 0004 — codebase-intel-classic is reference, not
  dependency](../adr/0004-codebase-intel-classic-is-reference-not-dependency.md)

## Status

Recorded on 2026-05-26 against Rekon commit `5a03aa3`.
No version bump. No npm publish. No git tag. No GitHub
Release. No runtime behaviour change. No new artifact
type registered. No new validator. No new writer. No
new permission. No new role. No new capability
package. Schema unchanged in this batch (proposed
additive fields are documented but not implemented).
Rollback is trivial: revert this memo and the
supporting doc cross-links.
