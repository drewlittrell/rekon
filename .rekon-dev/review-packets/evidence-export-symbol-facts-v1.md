# Review Packet: EvidenceGraph Export / Symbol Facts Projection v1

Slice: P1.1 (Issue Adjudication),
evidence-export-symbol-facts-v1 slice.
Implements step 18 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order (flipped from `(future)` to
`(shipped)`).

The substrate the
[graph-aware filter provider v3 decision memo](../../docs/strategy/graph-aware-filter-provider-v3-decision.md)
recommended. The JS/TS evidence provider now emits
`kind: "export"` and `kind: "symbol"` facts on the existing
`EvidenceGraph` with rich
`value: { name, kind, default?/exported? }` shape; the
kernel-findings package exports `listExportsForFile` and
`listSymbolsForFile` helpers. **No graph-aware filter
consumes the new facts yet** — the substrate ships alone,
per the v3 memo's substrate-first discipline.

## CHANGES MADE

### `packages/capability-js-ts/src/index.ts`

**Replaced `extractExportFacts`.** The old extractor emitted
thin facts (`subject: "${path}:${name}"`, `value: { file,
name, line }`). The new extractor follows the work-order
spec:

- `subject` = repo-relative file path (just the path).
- `value: { name, kind, default? }` carries the rich
  shape. `kind` is one of
  `"function" | "class" | "const" | "let" | "var" |
  "type" | "interface" | "namespace" | "default" |
  "unknown"`.
- Five extraction passes (deterministic regex; no AST):
  1. `NAMED_EXPORT_DECL_RE` — `export function|class|
     const|let|var|type|interface|namespace|enum NAME`.
  2. `DEFAULT_FUNCTION_OR_CLASS_RE` — `export default
     function/class …`. Emits `{ name: "default", kind:
     "default", default: true }`.
  3. `DEFAULT_EXPRESSION_RE` — `export default
     <expression>` (anything not function/class). Emits
     same `{ name: "default", kind: "default", default:
     true }`.
  4. `NAMED_EXPORT_LIST_RE` — `export { a, b as c }`.
     Each entry's renamed half (or the bare name) is the
     exported identifier. Source half is dropped per the
     work-order spec ("`export { foo, bar as baz }` →
     `[{ name: "foo", … }, { name: "baz", … }]`").
     `kind` is `"unknown"` for these (the keyword that
     declared the underlying symbol is not always
     adjacent).
  5. `STAR_REEXPORT_RE` — `export * from "..."` →
     `{ name: "*", kind: "namespace" }`. `export * as
     alias from "..."` → `{ name: alias, kind:
     "namespace" }`.
- Emits each export fact with `line` intentionally NOT in
  provenance so duplicate declarations on different lines
  collapse to one fact under the kernel-evidence dedupe
  key (`kind + subject + value + provenance`).
- `enum` keywords are mapped to `kind: "namespace"`
  (TypeScript enums act as namespaces at runtime; the
  work-order export kind enum doesn't include `"enum"`).

**Replaced `extractSymbolFacts`.** Same `subject = path`
shape; `value: { name, kind, exported? }`. The new
extractor:

- Captures every supported declaration keyword (`function
  | class | const | let | var | type | interface |
  namespace | enum`).
- Detects the `exported` flag by checking whether the
  declaration itself begins with `export` (optionally
  followed by `default`). Conservative: a symbol
  re-exported via a separate `export { ... }` clause is
  NOT marked exported; the corresponding `export` fact
  captures the re-export side independently.
- Emits with `line` intentionally NOT in provenance for
  the same dedupe reason as exports.

**Untouched.** `extractImportFacts`, `createFileFact`,
`createOwnershipHintFact`, `createCapabilityHintFact`, the
`fact()` helper, and the `extract` driver remain
unchanged. Per the work order, "existing file/import facts
remain unchanged."

### `packages/kernel-findings/src/index.ts`

**New types:**

```ts
export type FileExportSummary = {
  name: string;
  kind: string;
  default?: boolean;
};

export type FileSymbolSummary = {
  name: string;
  kind: string;
  exported?: boolean;
};
```

**New exported helpers:**

```ts
export function listExportsForFile(
  context: FindingGraphFilterContext,
  filePath: string,
): FileExportSummary[];

export function listSymbolsForFile(
  context: FindingGraphFilterContext,
  filePath: string,
): FileSymbolSummary[];
```

Both read from
`context.evidenceGraph.facts`, match by
`normalizeRepoPath(fact.subject) === normalizeRepoPath(filePath)`,
sort by `name` then `kind`, and return the empty array
when the graph is absent or has no facts for the file.
Both ignore facts whose `value.name` or `value.kind` is
missing / not a string (defensive — older fixtures with
thin `value` shapes don't crash the helper).

### `tests/contract/evidence-export-symbol-facts.test.mjs`

13 new contract tests pinning the substrate behavior:

1. Named declaration exports (function / async function /
   class / const / let / var / type / interface /
   namespace) emit `value.kind` matching the declaration
   keyword.
2. Default exports (function / class / expression) all
   emit `{ name: "default", kind: "default", default:
   true }`.
3. `export { foo, bar as baz }` emits the renamed alias
   only (`foo` + `baz`); the source `bar` is excluded.
4. `export * from "..."` emits `{ name: "*", kind:
   "namespace" }`. `export * as alias from "..."` emits
   the alias.
5. Local declarations (no `export`) emit symbol facts
   with `exported: false`.
6. Declarations beginning with `export` emit symbol facts
   with `exported: true`.
7. Two identical declarations on different lines dedupe
   to a single fact (the work-order requirement).
8. Older `EvidenceGraph` artifacts without export /
   symbol facts continue to validate via
   `assertEvidenceGraph`.
9. `listExportsForFile` returns sorted summaries; handles
   `./` path-prefix normalization; returns empty for
   absent graph.
10. `listSymbolsForFile` returns sorted summaries with
    the `exported` flag; returns empty for absent graph.
11. Existing import facts emit unchanged subject shape
    (`"<file>:<target>"`) — pins that the work-order
    "existing file/import facts remain unchanged"
    invariant holds.
12. Graph-aware filter behavior is unchanged in this
    substrate batch — a route-handler decision with new
    export / symbol facts in the graph still cites
    `ObservedRepo` only and produces the same
    `graphArtifactsUsed`.
13. End-to-end CLI smoke: `rekon refresh` against
    `examples/simple-js-ts` produces an `EvidenceGraph`
    with at least one export fact carrying the new
    `value.kind` field; `rekon artifacts validate` stays
    clean.

## PUBLIC API CHANGES

**New exports from `@rekon/kernel-findings`:**

- `FileExportSummary` (type)
- `FileSymbolSummary` (type)
- `listExportsForFile(context, filePath):
  FileExportSummary[]`
- `listSymbolsForFile(context, filePath):
  FileSymbolSummary[]`

**EvidenceGraph fact shape changes (additive, no schema
bump):**

- `kind: "export"` value gains `name`, `kind`,
  optional `default`. (Previously was `{ file, name,
  line }`.)
- `kind: "symbol"` value gains `name`, `kind`,
  optional `exported`. (Previously was `{ file, name,
  line }`.)
- `subject` for both `export` and `symbol` facts is now
  the repo-relative file path (was
  `"<file>:<name>"`).
- Line is intentionally NOT included in provenance for
  these two kinds.

No artifact `schemaVersion` bump. No new artifact type.
No new capability role. No new CLI subcommand or flag.
No new reason codes. No version bump. No npm publish.

## PURPOSE PRESERVATION CHECK

**Original problem:** several remaining classic
graph / ontology false-positive checks require structural
evidence about *symbols* and *exports*, not just file
paths and imports. Without an export / symbol facts
projection, future graph-aware filters would either guess
from strings or defer too much.

**Classic shape preserved:** structural repo evidence
that distinguishes real architecture violations from
valid framework / provider patterns. The substrate is
*artifact-backed* structural data, not a monolithic
validator.

**Rekon equivalent guarantee:**
- `EvidenceGraph` now includes stable, artifact-backed
  `export` and `symbol` facts.
- Future graph-aware filters can consume the facts via
  the new helpers in `@rekon/kernel-findings`.
- Existing `EvidenceGraph` artifacts continue to
  validate.
- No filtering behavior changes until a separate work
  order ships a check that consumes the new facts.

**What we explicitly did NOT do (rejected in v3 memo,
still rejected here):**
- No new graph-aware filter checks.
- No `GraphOntologyValidator` port.
- No source-file reads from filter logic (extraction
  happens at evidence-extraction time, in the JS/TS
  provider's existing file scan — not in the filter
  pipeline).
- No AST, no type checker, no LLM, no semantic /
  fuzzy / embedding inference.
- No framework-specific exception catalogs.

## CODEBASE-INTEL ALIGNMENT

**Classic capability or failure mode:** structural
graph / ontology evidence for false-positive filtering.

**Relevant classic files / systems aligned to:**
- `infra/validation/GraphOntologyValidator.ts`
- `services/GraphBuildProvider.ts`
- `domain/graph/producers/**`
- `services/issues/content-filter-ruleid.ts`
- `services/issues/content-filter-architecture.ts`
- `services/IssueDetectionService.ts`

**What Rekon keeps:**
- Structural evidence is artifact-backed.
- Future filtering consumes artifacts; no hidden source
  reads in graph-aware filter logic.
- Raw source parsing belongs in evidence providers, not
  filters.

**What Rekon simplifies:**
- Regex / structural extraction only for v1.
- JS / TS only.
- No AST dependency.
- No type checker.
- No semantic role inference.
- No framework catalog.

**What Rekon does not port yet:**
- Full ontology graph.
- Runtime truth graph.
- Provider-role graph slice.
- Policy-owner parser.
- Deep framework-specific export semantics.

## EXPORT / SYMBOL FACT MODEL

```ts
// kind: "export"
{
  kind: "export",
  subject: "<repo-relative-file-path>",
  value: {
    name: string,
    kind: "function" | "class" | "const" | "let" | "var"
        | "type" | "interface" | "namespace"
        | "default" | "unknown",
    default?: true
  }
}

// kind: "symbol"
{
  kind: "symbol",
  subject: "<repo-relative-file-path>",
  value: {
    name: string,
    kind: "function" | "class" | "const" | "let" | "var"
        | "type" | "interface" | "namespace" | "unknown",
    exported?: boolean
  }
}
```

**Dedupe key:** `kind + subject + value + provenance`
(the kernel-evidence default). `line` is intentionally
NOT included in provenance for these two kinds so
duplicate declarations on different lines collapse to one
fact (matching the work-order dedupe rule: `kind +
subject + value.name + value.kind +
value.default/exported`).

## EXTRACTION LIMITS

Documented limitations of the v1 extractor (conservative
by design — false negatives preferred over false
positives):

- **No re-export detection on symbol facts.** A symbol
  declared without `export` and re-exported via a later
  `export { ... }` clause has `exported: false` on its
  symbol fact. The re-export side appears as a separate
  `export` fact with `kind: "unknown"` (since the
  keyword isn't known at the re-export site). Future
  v2 work could intersect the two to upgrade the symbol
  fact's `exported` flag, but v1 leaves them
  independent.
- **No JSDoc / decorator parsing.** Only the keyword
  immediately before the identifier counts.
- **No conditional exports.** `if (cond) { export ... }`
  is not legal TS/JS at the statement level, but
  dynamic-shape patterns
  (`module.exports = { ... }`, namespace augmentation,
  etc.) are not detected. The regex matches what the
  surface text declares.
- **Enum handling.** TypeScript `enum Foo {}` is
  reported as `kind: "namespace"` (the work-order kind
  enum doesn't include `"enum"`; namespace is the
  closest runtime equivalent).
- **No type checker.** Symbol kinds are determined by
  the declaration keyword, not inferred. `const X = (...)
  => ...` is `kind: "const"`, not `"function"`.

These limits are documented in
`docs/artifacts/evidence-graph.md` and in the dedicated
"Export / symbol facts (substrate v1)" section.

## TESTS / VERIFICATION

```sh
npm run typecheck
npm run test
npm run build
git diff --check
node scripts/audit-package-exports.mjs
node scripts/audit-license.mjs
node scripts/publish-dry-run.mjs
node scripts/install-smoke.mjs
node scripts/install-tarball-smoke.mjs
node packages/cli/dist/index.js refresh --root examples/simple-js-ts --json
node packages/cli/dist/index.js findings filter --root examples/simple-js-ts --json
node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json
node packages/cli/dist/index.js artifacts freshness --root examples/simple-js-ts --json
```

All passed. Full test suite: 744 passed / 1 skipped / 0
failed (the 13 new substrate tests on top of the prior
731 passing tests).

CLI smoke against `examples/simple-js-ts` confirms the
producer emits export facts with the new
`value.kind` field and that `rekon artifacts validate`
stays clean. `rekon findings filter` output is unchanged
(no graph-aware filter consumes the new facts).

## INTENTIONALLY UNTOUCHED

- `extractImportFacts` — per the work order, "existing
  file/import facts remain unchanged." The legacy
  `subject: "${path}:${target}"` shape is preserved.
- `applyFindingGraphFilters` and the five v1 / v2
  graph-aware checks — no behavior change.
- `applyFindingFilters` pipeline order — graph-aware
  still runs before classic content (per v2).
- `FindingFilterReport` / `FindingFilterHealthReport`
  shapes — unchanged.
- `EvidenceGraph` artifact `schemaVersion` — unchanged.
- All CLI commands — no new flags, no new subcommands.
- All capability manifests — no new roles, no new
  produces/consumes.
- LLM / semantic / fuzzy / embedding inference —
  permanently rejected.
- Source-file reads from filter logic — still rejected.
- `GraphOntologyValidator` monolithic port — still
  rejected.

## RISKS / FOLLOW-UP

- **Import-fact subject shape mismatch.** The existing
  import-fact subject is `"${path}:${target}"`, but the
  v2 `listImportTargetsForFile` helper matches by
  `fact.subject === filePath`. In production data (the
  shape the JS/TS provider emits) the helper would never
  match. The new export / symbol facts use
  `subject = filePath` (the work-order spec) so the new
  helpers DO match production data. The import-fact
  shape mismatch is a pre-existing inconsistency that
  this slice does not fix (the work order explicitly
  excluded import facts from this batch); current
  graph-aware filters fall back to `details.imports` or
  `ObservedRepo` sibling files when the EvidenceGraph
  path doesn't match. A future slice should either
  migrate import-fact subjects to `path` or update the
  helper to read `value.source`. Tracking as follow-up.
- **Conservative `exported` flag.** A symbol re-exported
  via `export { ... }` shows up twice — once as
  `symbol` with `exported: false` and once as `export`
  with `kind: "unknown"`. Future graph-aware checks
  that need the union should join the two helpers'
  output. The work order's "exported symbols have
  `exported: true`" requirement is met for declarations
  written with leading `export`; re-export joins are
  documented as a v1 limit.
- **Enum keyword.** Reported as `kind: "namespace"`.
  Consumers that care about enum-specific behavior can
  inspect the `provenance.file` and look at the source
  themselves; v1 doesn't carry enum semantics.
- **Regex robustness.** Deterministic regex extraction
  has known limits (e.g. won't catch complex template
  literals with embedded `export` strings inside
  template expressions). Conservative-by-design: tolerate
  false negatives. Future v2 could swap in an AST-based
  extractor without breaking the fact shape contract.

## NEXT STEP

Per the v3 memo's recommendation: ship the **first v3
candidate check that consumes the new facts**. Strongest
candidate is strengthening `nextjs-route-convention` (or
a new graph-aware variant) to confirm route file exports
structurally — using `listExportsForFile` to check that
a `route.ts` file's named exports are all in the Next.js
segment-config set (`runtime`, `dynamic`, `revalidate`,
`fetchCache`, `preferredRegion`) without relying on
`details.otherExports`. That choice can be revisited
based on operator data from the new "Graph-Aware Filter
Reasons" surface and the two graph-aware dominance
alerts.

## CROSS-REFERENCES

- [Graph-aware filter provider v3 decision memo](../../docs/strategy/graph-aware-filter-provider-v3-decision.md)
- [GraphOntologyValidator-lite audit](../../docs/strategy/graph-ontology-validator-lite-audit.md)
- [Issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
- [EvidenceGraph artifact](../../docs/artifacts/evidence-graph.md)
- [Graph-aware finding filters concept](../../docs/concepts/graph-aware-finding-filters.md)
- [graph-aware filter provider v3 decision review packet](graph-aware-filter-provider-v3-decision.md)
- [graph-aware finding filter provider v2 review packet](graph-aware-finding-filter-provider-v2.md)
- [graph-aware finding filter provider v1 review packet](graph-aware-finding-filter-provider-v1.md)
