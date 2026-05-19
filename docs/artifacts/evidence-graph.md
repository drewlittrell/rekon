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
is intentional and stable. The
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
