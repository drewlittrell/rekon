# EvidenceGraph

## Purpose

`EvidenceGraph` is the canonical evidence input artifact produced by observe.
It contains evidence facts extracted from a repository.

## Produced By

- `@rekon/runtime.observe`
- evidence providers such as `@rekon/capability-js-ts`
- community evidence-provider capabilities

## Consumed By

- `@rekon/capability-model`
- `@rekon/capability-graph`
- `@rekon/capability-policy`
- `@rekon/capability-resolver` as fallback ownership evidence

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`EvidenceGraph`.

## Common Fields

- `facts`
- `facts[].kind`
- `facts[].subject`
- `facts[].value`
- `facts[].confidence`
- `facts[].provenance`

Unknown fact kinds are allowed. Community kinds should be namespaced when they
may collide with built-ins.

## Built-in Fact Kinds

| Kind | Subject | Value shape |
| --- | --- | --- |
| `file` | repo-relative file path | `{ path, extension, language }` |
| `import` | `"<file>:<target>"` (legacy shape) | `{ source, target, line }` |
| `export` | repo-relative file path | `{ name, kind, default? }` |
| `symbol` | repo-relative file path | `{ name, kind, exported? }` |
| `ownership_hint` | repo-relative file path | `{ path, system, layer }` |
| `capability_hint` | repo-relative file path | `{ path, capability, ... }` |

The legacy `import` subject shape (`"<file>:<target>"`)
is intentional and stable. Graph-aware import-consuming
filters
(`route-handler-with-service`,
`route-http-middleware-only`,
`external-api-comment-only`) prefer these `import`
facts over `Finding.details.imports` (v4 graph-aware
import-fact consumers); their evidence strings name
the source explicitly. The
[graph-aware import evidence operator review](../strategy/graph-aware-import-evidence-operator-review.md)
evaluates the diagnostic surface and confirms
**Option C (defer producer migration) for alpha** —
the legacy subject shape stays, helper compatibility
remains canonical, and producer migration is gated on
the four triggers documented in the
[import-fact subject-shape decision memo](../strategy/import-fact-subject-shape-decision.md).
The
[refresh](../strategy/graph-aware-import-evidence-operator-review-refresh.md)
re-runs the protocol against the deterministic
regression fixtures shipped at `702afbf` and
re-confirms Option C against measured data
(EvidenceGraph: 3 across three fixtures;
DetectorDetails: 0; ObservedRepo: 0). The
[v2 review](../strategy/graph-aware-fixture-coverage-operator-review-v2.md)
re-ran the protocol against the now-six deterministic
fixtures and recorded a baseline of **EvidenceGraph
4, DetectorDetails 2, ObservedRepo 0**, re-confirmed
Option C, and identified `factory-file-creates-deps`
and `module-gate-verified-caller` as the next
evidence-strengthening candidates. The
[factory / module-gate evidence strengthening v1](../strategy/factory-module-gate-evidence-strengthening.md)
implementation slice then added new top-priority
EvidenceGraph branches to both filters that consume
`listSymbolsForFile` + `listExportsForFile` against
canonical factory / gate-evaluator names. **Post-
strengthening aggregate fixture attribution:
EvidenceGraph 6, DetectorDetails 0, ObservedRepo 0**
against the committed fixtures. All path /
ObservedSystem.kind / CapabilityMap fallback
branches survive for repos whose symbol/export
names don't match the canonical patterns. The
[v3 operator review](../strategy/graph-aware-fixture-coverage-operator-review-v3.md)
re-ran the protocol against this baseline,
re-confirmed Option C, and recorded the
**graph-aware v1 / v2 / v3 arc as alpha-complete** —
every shipped graph-aware reason has deterministic
fixture coverage, every fixture positive is
artifact-backed, and no remaining graph-aware reason
needs further strengthening before alpha. The
[import fact subject-shape decision memo](../strategy/import-fact-subject-shape-decision.md)
documents Rekon's stance: keep the legacy producer
shape, make file-scoped helpers compatibility-aware,
and treat migrating to `subject = file path` as a
future option triggered by specific conditions
(more than ~3 helper callsites needing custom logic, a
planned `schemaVersion` bump, external author
confusion, or import facts becoming a publication-facing
artifact). Option B of that memo has shipped:
`@rekon/kernel-findings.listImportTargetsForFile` and
`fileImportsTargetMatching` now recognize both the
legacy shape AND the future file-subject shape
(`subject = file path`, `value: { source, target }`)
via a shared `matchesFileSubject` predicate. The
helpers dedupe targets across branches and return them
sorted. Consumers must look up file-scoped import
facts via these helpers — not by matching
`fact.subject` raw.

### Export / symbol facts (substrate v1)

`export` and `symbol` facts ship with the
graph-aware-filter-provider v3 decision memo's recommended
substrate (the `EvidenceGraph` export / symbol facts
projection v1). They are deterministic, regex-extracted, and
intentionally conservative — false negatives are preferred
over false positives. No source-file reads at filter time; no
AST, no type checker, no LLM, no semantic role inference.

**`export` value shape:**

```ts
{
  name: string,                                 // "default" / "*" / identifier
  kind: "function" | "class" | "const" | "let" | "var"
      | "type" | "interface" | "namespace"
      | "default" | "unknown",
  default?: true                                // only for `export default …`
}
```

Examples:

- `export function handle() {}` → `{ name: "handle", kind: "function" }`
- `export default function Page() {}` → `{ name: "default", kind: "default", default: true }`
- `export { foo, bar as baz }` → `[{ name: "foo", kind: "unknown" }, { name: "baz", kind: "unknown" }]`
- `export * from "./other"` → `{ name: "*", kind: "namespace" }`
- `export * as helpers from "./helpers"` → `{ name: "helpers", kind: "namespace" }`

**`symbol` value shape:**

```ts
{
  name: string,
  kind: "function" | "class" | "const" | "let" | "var"
      | "type" | "interface" | "namespace" | "unknown",
  exported?: boolean                            // true when the declaration itself begins with `export`
}
```

`exported` is conservative: a symbol re-exported via a later
`export { ... }` clause is NOT marked exported; the
corresponding entry appears as a separate `export` fact.

**Deduplication.** Both `export` and `symbol` facts dedupe by
`kind + subject + value` (line is intentionally NOT
included in provenance for these kinds — duplicate
declarations on different lines collapse to one fact).

**Consumers.** The `EvidenceGraph` export / symbol facts are
not consumed by any graph-aware filter yet. Two helpers in
`@rekon/kernel-findings` expose them for future graph-aware
checks:

- `listExportsForFile(context, filePath): FileExportSummary[]`
- `listSymbolsForFile(context, filePath): FileSymbolSummary[]`

Both helpers sort by `name` then `kind`; return the empty
array when the graph is absent or has no facts for the file.
See
[`docs/strategy/graph-aware-filter-provider-v3-decision.md`](../strategy/graph-aware-filter-provider-v3-decision.md)
for the substrate-first decision and the v3 candidate checks
that will consume these facts.

## Example

```json
{
  "header": {
    "artifactType": "EvidenceGraph",
    "artifactId": "evidence-123",
    "schemaVersion": "0.1.0",
    "generatedAt": "2026-05-13T18:00:00.000Z",
    "subject": { "repoId": "simple-js-ts" },
    "producer": { "id": "@rekon/runtime.observe", "version": "0.1.0" },
    "inputRefs": [],
    "provenance": { "confidence": 1 }
  },
  "facts": [
    {
      "id": "js-ts:abc",
      "kind": "ownership_hint",
      "subject": "src/index.ts",
      "value": { "path": "src/index.ts", "system": "src" },
      "confidence": 0.9,
      "provenance": {
        "source": "repo",
        "pack": "@rekon/capability-js-ts",
        "file": "src/index.ts",
        "extractorVersion": "0.1.0"
      }
    }
  ]
}
```

## Freshness And Provenance

Evidence facts must carry provenance. Derived artifacts should point back to
the `EvidenceGraph` through `inputRefs` or evidence refs.

## Raw Evidence vs Normalized Purpose

`EvidenceGraph` is the canonical home of **raw observed facts**. It is the
read-only input to every downstream interpretation layer. The
[Capability Ontology Architecture Impact Review](../strategy/capability-ontology-architecture-impact-review.md)
pins this boundary explicitly: the future capability-ontology / translation
layer reads `EvidenceGraph` symbols / exports / imports but **never mutates**
them. Normalized capability claims live in a separate audit artifact
(`CapabilityNormalizationReport`, **registered as of v1**; see the
[`CapabilityNormalizationReport` artifact reference](capability-normalization-report.md)
and the [capability ontology concept](../concepts/capability-ontology.md)).
Operators must always be able to trace a normalized purpose claim back to the
raw symbol facts in this artifact.

The
[Capability Ontology Translation Layer Decision](../strategy/capability-ontology-translation-layer-decision.md)
refines this boundary into an eight-layer internal model: `EvidenceGraph`
(Layer 0) feeds a `CapabilityCandidateSet` (Layer 1, internal helper) →
`CapabilityLexicalSplit` (Layer 2, helper) → `CapabilityOntology` (Layer 3,
config) → `EffectiveCapabilityOntology` (Layer 4, internal compiled model) →
`CapabilityNormalizationReport` (Layer 5, **first registered artifact**) →
`CapabilityMap` (Layer 6, deferred to v2) →
`RefactorPreservationContract` (Layer 7, future). `EvidenceGraph` remains
Layer 0 and is unchanged. **EvidenceGraph raw facts are unchanged** by the
ontology track.

### AST-backed JS/TS extraction (v1, shipped)

The
[Classic Scanner/Ontology Parity Audit](../strategy/classic-scanner-ontology-parity-audit.md)
identified the **evidence-model bottleneck**:
regex-based JS/TS extraction missed the structured
names AST traversal would surface. The
[JS/TS AST Evidence Adapter Decision](../strategy/js-ts-ast-evidence-adapter-decision.md)
(twenty-third slice) committed to the design, and the
**JS/TS AST EvidenceGraph Provider v1** (twenty-fourth
slice) has now shipped. `@rekon/capability-js-ts` uses
AST-backed JS/TS extraction as the primary path; regex
extraction is fallback only.

Provider v1 design:

- **Parser:** the TypeScript compiler parser API
  (`ts.createSourceFile`, `ts.forEachChild`); parses
  TS / TSX / JS / JSX with one API surface; no
  `tsconfig` resolution required.
- **Parser-only in v1:** no typechecker semantics; call
  graph, type resolution, and symbol references are
  deferred.
- **Existing fact kinds unchanged.** AST v1 emits the
  same `symbol` / `export` / `import` fact kinds as
  the regex era.
- **Additive value-fields** on `symbol` / `export` /
  `import` facts (shipped by Provider v1):
  - `extractionMethod?: "ast" | "regex-fallback"`
  - `language?: "typescript" | "javascript"`
  - `syntaxKind?: string` (diagnostic)
  - `symbolKind?: "function" | "class" | "method" |
    "variable" | "interface" | "type" | "enum" |
    "object" | "unknown"`
  - `exportKind?: "named" | "default" | "re-export" |
    "type-only" | "namespace"`
  - `importKind?: "value" | "type-only" | "namespace" |
    "side-effect"`
  - `location?: { line: number; column: number }`
  - `confidence?: "high" | "medium" | "low"`
- **Additive only.** Old facts validate. No new fact
  kind. No new subject convention. Dedup keys
  unchanged.
- **Regex stays as fallback.** Regex fires on AST parse
  failure or unsupported file extension. Fallback facts
  carry `extractionMethod: "regex-fallback"` and
  `confidence: "low"` or `"medium"`.

The decision memo pins these verbatim guarantees,
preserved by Provider v1:

- **`EvidenceGraph` remains the repo-agnostic protocol.**
  Adding an AST-backed JS/TS provider does **not** change
  the shape or protocol of this artifact. The adapter is
  an additional provider, not a replacement layer.
- **AST-backed JS/TS extraction** is primary where
  available.
- **Regex extraction is fallback only** for JS/TS.
- **Typechecker semantics are deferred.** AST alone
  closes most of the regex gap.
- **AST stays optional enrichment, not foundational truth
  in v1.** The eight architectural reservations from the
  Capability Ontology Architecture Impact Review remain
  in force.
- **Raw evidence stays raw.** `symbolKind`, `exportKind`,
  and `importKind` are *syntactic* categories, not
  capability claims. The translation layer
  (`CapabilityNormalizationReport`) still decides what
  these facts mean.

**Convention pin (Provider v1):** `location.line` and
`location.column` are 1-based. AST facts carry
`extractionMethod: "ast"` and `confidence: "high"`.
Regex fallback facts carry
`extractionMethod: "regex-fallback"` and
`confidence: "medium"`. `import` facts include
`location` in `value` (mirroring the legacy `line`
field); `export` / `symbol` facts intentionally omit
`location` from `value` so duplicate declarations
continue to dedupe via the canonical
`kind + subject + value + provenance` key.

The audit explicitly pins
`codebase-intel-classic` as **design prior art, not
dependency** — Rekon does not import classic code; the
audit names which classic *patterns* (`ExtractedName` /
`SplitName` / taxonomy discovery / verb-noun aliases /
canonical+alias vocabularies) to repeat / adapt /
reject inside Rekon's artifact-first model.

### Downstream impact (measured)

The
[Post-AST CapabilityPhraseReport Coverage Review](../strategy/post-ast-capability-phrase-coverage-review.md)
(twenty-fifth slice) measured AST extraction's impact
on `CapabilityNormalizationReport` candidate quality
and `CapabilityPhraseReport` stable phrase density on
the two available targets. On the AST-rich fixture
(`tests/fixtures/js-ts-ast-evidence`): 80 facts (70%
AST-derived), 8 normalized candidates from 66, **6
stable phrases** with meaningful verb:noun pairs
(`create:user`, `fetch:user`, `handle:request`).
`examples/simple-js-ts` is unchanged from the pre-AST
baseline — expected, since the fixture has too little
structure to exercise AST richness. The
[Post-AST Cohort Re-Run](../strategy/post-ast-cohort-rerun.md)
(twenty-sixth slice) completed the cohort
measurement: **`target-1` (Next.js TS scale): 10,331
facts (93.4% AST), 9,327 candidates, 299 normalized,
37 stable phrases — a 131% lift vs the 16 stable
phrases pre-AST.** Stable pairs include
`get:response` (14), `build:plan` (13),
`get:schema` (12), `get:session` (10),
`save:response` (8), `build:report` (8). **`target-2`
(small TS + workflows): 587 facts (68.8% AST), 406
candidates, 12 normalized, 2 stable** — unchanged
from pre-AST baseline, neutral signal. With narrower
evidence accepted, `CapabilityMap` v2 design is now
ready to begin.

> See also: [Classic step-capability / handoff / runtime drift parity audit](../strategy/classic-step-capability-handoff-runtime-drift-parity-audit.md) — reserves StepCapabilityGraph / HandoffContract / HandoffCoverageReport / RuntimeGraphObservationReport / RuntimeGraphDriftReport as future surfaces not yet modeled by Rekon.
