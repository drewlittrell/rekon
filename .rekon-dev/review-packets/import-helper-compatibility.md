# Review Packet: Import Helper Compatibility Implementation

Slice: P1.1 (Issue Adjudication),
import-helper-compatibility slice.
Implements step 21 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order (flipped from `(future)` to
`(shipped)`).

Implements **Option B** of the
[import-fact subject-shape decision memo](../../docs/strategy/import-fact-subject-shape-decision.md)
(shipped at `2139663`). The decision was: keep the
legacy import-fact producer shape
(`subject = "<file>:<target>"`) and make the
file-scoped import helpers compatibility-aware so they
recognize both the legacy shape AND the future
file-subject shape (`subject = file path`). This slice
lands the helper change. No producer change. No
artifact migration. No `EvidenceGraph` `schemaVersion`
bump.

## CHANGES MADE

### `packages/kernel-findings/src/index.ts`

**New private predicate `matchesFileSubject(fact,
normalizedFilePath)`** at the import-helper layer.
Recognizes file matches in three branches with explicit
precedence:

1. `normalizeRepoPath(fact.subject) === normalizedFilePath`
   — future file-subject shape (matches what
   `listExportsForFile` / `listSymbolsForFile` use).
2. `normalizeRepoPath(fact.value.source) === normalizedFilePath`
   — legacy producer
   (`@rekon/capability-js-ts.extractImportFacts`)
   stores the authoritative file path in
   `value.source`. This is the production data path
   today.
3. Legacy `subject` prefix before the first `":"`
   normalizing to `normalizedFilePath` — anchored on
   the **full** normalized file path (no `startsWith`
   traps). `src/foo.tsx:react` will NOT match
   `src/foo.ts`; `src/foo.ts-extra:react` will NOT
   match `src/foo.ts`. Rekon paths are repo-relative
   and colon-free, so the first colon is the
   legacy-shape separator.

Defensive branch: `fact.subject` and `fact.value`
typed as `EvidenceFactLike` — both shapes are
permissive (the kernel-findings package owns no
producer code; consumers may supply either real
artifacts or synthetic fixtures).

**New private helper `extractImportTarget(fact)`**
prefers `value.target` (used by every producer today)
but falls back to the suffix after the first `":"` in
a legacy-shape subject. Defensive — current producers
always populate `value.target`, but a future or
third-party producer might emit only the legacy
subject. Returns `undefined` when no target can be
determined.

**`listImportTargetsForFile(context, filePath)`**
rewritten:

- Uses `matchesFileSubject` and `extractImportTarget`.
- Dedupes via a `Set<string>` — a fact matched under
  multiple compatibility branches contributes its
  target once.
- Returns targets sorted via `localeCompare`.

The signature is unchanged (`(context, filePath) =>
string[]`). The return shape is unchanged (a string
array). The only observable differences are: (1)
matches now succeed against legacy production data,
and (2) order is now deterministic / sorted (it was
previously insertion order, which the existing v2
tests didn't pin precisely).

**`fileImportsTargetMatching(context, filePath,
predicate)`** unchanged externally — it still
delegates to `listImportTargetsForFile`. The
delegation gives it the same compatibility behavior
for free.

### `tests/contract/import-helper-compatibility.test.mjs`

15 new contract tests:

1. Legacy subject `"<file>:<target>"` returns the
   target.
2. Future file-subject shape returns the target.
3. `value.source` is authoritative when subject is
   legacy / different (a fact whose subject doesn't
   carry the file-prefix but whose `value.source` is
   the file).
4. Mixed legacy + future shapes dedupe identical
   target across branches.
5. Returned targets are sorted.
6. `./src/foo.ts` and `src/foo.ts` normalize to the
   same file.
7. Backslash paths normalize.
8. Anchored prefix matching: `src/foo.ts` does NOT
   match `src/foo.tsx`, `src/foo.ts-extra`, etc.
9. Fact with matching file but missing target is
   ignored.
10. `listExportsForFile` behavior unchanged (legacy
    import facts in the graph do not leak into export
    lookups).
11. `listSymbolsForFile` behavior unchanged.
12. `fileImportsTargetMatching` inherits the same
    compatibility logic (predicate-filtered output
    works across both shapes).
13. Production JS/TS provider STILL emits legacy
    import-fact subject shape (regression test for the
    "producer unchanged" invariant — verifies the
    decision memo's no-producer-migration constraint
    holds).
14. `rekon artifacts validate` remains clean against
    the example repo after the helper update.
15. Bonus end-to-end case: a graph-aware
    `route-handler-with-service` decision fires via
    the EvidenceGraph branch when the graph carries a
    legacy-shape import fact — proving the previously
    dead EvidenceGraph branch now activates against
    production-shaped data, with
    `usedArtifacts: ["EvidenceGraph"]`.

## PUBLIC API CHANGES

**Behavioral changes (no signature change):**

- `listImportTargetsForFile` now matches both the
  legacy `"<file>:<target>"` subject shape and the
  future `subject = file path` shape. Returns sorted,
  deduped targets.
- `fileImportsTargetMatching` inherits the same
  behavior via delegation.

**No new exports.** The new helpers
(`matchesFileSubject`, `extractImportTarget`) are
private to `@rekon/kernel-findings`. External rule
packs should continue to use the existing public
`listImportTargetsForFile` and
`fileImportsTargetMatching` APIs.

**No type-level changes.** `FileExportSummary`,
`FileSymbolSummary`, `FindingGraphFilterContext`,
`EvidenceFactLike`, and the helper signatures are all
unchanged.

No artifact `schemaVersion` bump. No new artifact
type. No new capability role. No new CLI subcommand
or flag. No new reason codes. No version bump. No npm
publish.

## PURPOSE PRESERVATION CHECK

**Original problem.** Graph-aware filters need
reliable file-scoped import lookup. The new export /
symbol facts use `subject = file path`, so
`listExportsForFile` and `listSymbolsForFile` worked
naturally. Legacy import facts use
`subject = "<file>:<target>"`, so
`listImportTargetsForFile` silently missed production
import facts when it only checked `subject ===
filePath`. Silent misses caused graph-aware filters
to fall back to weaker evidence
(`Finding.details.imports`) or incorrectly no-op
(when both `details.imports` and `ObservedRepo`
siblings were absent).

**Classic shape preserved.** codebase-intel-classic's
import graph / graph producers provided structural
truth. The Rekon equivalent guarantee is that
consumers can reliably ask "what imports belong to
this file?" via a helper API — without coupling to
producer-shape internals.

**Rekon equivalent guarantee, now restored:**
- `listImportTargetsForFile` works against legacy
  import facts
  (`subject = "<file>:<target>"`,
  `value: { source, target }`) AND future file-subject
  import facts
  (`subject = filePath`, `value: { target, ... }`).
- Graph-aware consumers use helper APIs instead of
  raw `fact.subject` matching.
- Existing `EvidenceGraph` artifacts continue to
  validate and remain useful.

**Regression test for original problem.** Test 4
(mixed legacy + future shapes dedupe repeated
target) + Test 13 (production JS/TS provider still
emits legacy shape) + Test 15 (graph-aware filter
fires via EvidenceGraph branch with legacy data)
together pin: given both shapes, the helper returns
the same set of targets, dedupes identical targets,
respects anchored prefix matching, AND the
graph-aware filter that depends on the helper now
fires against the producer's actual output shape.

**What would mean we failed (verified by tests we
shipped):**
- Helper still missing production import facts →
  prevented by Tests 1, 13, 15.
- Helper double-counting → prevented by Test 4.
- Helper matching `src/foo.tsx` for `src/foo.ts` →
  prevented by Test 8.
- Graph-aware filters inspecting raw fact shape
  directly → reviewed; all three existing
  EvidenceGraph-import branches
  (`graphFilterRouteHandlerWithService`,
  `graphFilterRouteHttpMiddlewareOnly`,
  `graphFilterExternalApiCommentOnly`) already use
  the helper.
- Import producer shape changes sneaking in →
  prevented by Test 13.

## CODEBASE-INTEL ALIGNMENT

**Classic capability or failure mode:** import graph /
graph intelligence as structural evidence.

**Relevant classic files / systems aligned to:**
- `lib/import-graph.ts`
- `services/GraphBuildProvider.ts`
- `domain/graph/producers/**`
- `services/issues/content-filter-ruleid.ts`
- `services/IssueDetectionService.ts`

**What Rekon keeps:**
- File-scoped structural facts are reliable.
- Graph-aware filters consume helper APIs.
- Old `EvidenceGraph` artifacts continue to work.
- No source reads.
- No producer migration until explicitly decided
  (Option A future-trigger conditions remain
  documented in the decision memo).

**What Rekon simplifies:**
- Helper compatibility only.
- No schema bump.
- No artifact migration.
- No import producer change.
- No graph-aware filter expansion in this batch.

## COMPATIBILITY MODEL

```ts
function matchesFileSubject(
  fact: EvidenceFactLike,
  normalizedFilePath: string,
): boolean {
  if (normalizedFilePath === "") return false;
  // Branch 1: future file-subject shape.
  if (typeof fact.subject === "string"
    && normalizeRepoPath(fact.subject) === normalizedFilePath) {
    return true;
  }
  // Branch 2: legacy producer's authoritative file field.
  const source = fact.value?.source;
  if (typeof source === "string"
    && normalizeRepoPath(source) === normalizedFilePath) {
    return true;
  }
  // Branch 3: legacy "<file>:<target>" subject prefix.
  if (typeof fact.subject === "string") {
    const colon = fact.subject.indexOf(":");
    if (colon > 0) {
      const prefix = fact.subject.slice(0, colon);
      if (normalizeRepoPath(prefix) === normalizedFilePath) return true;
    }
  }
  return false;
}
```

**Anchored matching** — the legacy branch splits on
the FIRST colon and normalizes the prefix before
comparing. The match is `prefix === normalizedFilePath`,
not `subject.startsWith(filePath)`. This rules out:

- `src/foo.tsx:react` matching `src/foo.ts` (prefix
  is `src/foo.tsx`, not `src/foo.ts`).
- `src/foo.ts-extra:react` matching `src/foo.ts`
  (prefix is `src/foo.ts-extra`).
- `src/foo.ts/nested:react` matching `src/foo.ts` if
  someone hand-crafts that subject (prefix is
  `src/foo.ts/nested`).

**`value.source` precedence.** Branch 2 trusts
`value.source` regardless of subject. This handles
the defensive case of a producer that emits an
unusual subject but populates `value.source` with the
authoritative file path. Test 3 pins this.

**Dedupe.** `listImportTargetsForFile` collects
matching targets into a `Set<string>` and returns
`Array.from(seen).sort(localeCompare)`. A fact
matching multiple branches (e.g. a fact emitted with
BOTH `subject = filePath` AND a value with
`source = filePath`) contributes its target once.

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

All passed. Full test suite: 785 passed / 1 skipped /
0 failed (15 new tests on top of the prior 770
passing tests).

## INTENTIONALLY UNTOUCHED

- `@rekon/capability-js-ts.extractImportFacts` —
  unchanged. Production import facts still use
  `subject = "<file>:<target>"`,
  `value: { source, target, line }`. (Pinned by
  Test 13.)
- `listExportsForFile` / `listSymbolsForFile` —
  unchanged. The compatibility branch is
  import-specific; export / symbol facts already use
  the file-subject convention.
- All six graph-aware filter checks
  (`graphFilterRouteHandlerWithService`,
  `graphFilterRouteHttpMiddlewareOnly`,
  `graphFilterExternalApiCommentOnly`,
  `graphFilterFactoryFileCreatesDeps`,
  `graphFilterModuleGateVerifiedCaller`,
  `graphFilterNextjsRouteConvention`) — unchanged.
  The pipeline order, decision shapes,
  `usedArtifacts`, and `inputRefs` precision from
  prior slices remain. The change is consumer-only at
  the helper layer.
- `EvidenceGraph` artifact `schemaVersion` —
  unchanged.
- `FindingFilterReport` /
  `FindingFilterHealthReport` shapes — unchanged.
- All CLI commands — no new flags, no new subcommands.
- All capability manifests — no new roles, no new
  produces/consumes.
- Reason codes — no new codes.
- LLM / semantic / fuzzy / embedding inference —
  permanently rejected.
- Source-file reads from filter logic — still
  rejected.

## RISKS / FOLLOW-UP

- **Observable downstream behavior change.** The
  EvidenceGraph branches of the three v1 / v2
  graph-aware filters
  (`graphFilterRouteHandlerWithService`,
  `graphFilterRouteHttpMiddlewareOnly`,
  `graphFilterExternalApiCommentOnly`) now fire against
  production import facts they previously missed
  (because `listImportTargetsForFile` returned the
  empty array against legacy-shaped data). Operators
  may see graph-aware suppressions appear in repos
  that were previously quiet. **None are new false
  positives** — the underlying filter logic is
  unchanged; the EvidenceGraph branches were always
  designed to fire under exactly these conditions,
  they were just unreachable. Filter-health
  `byGraphAwareReason` / `dominantGraphAwareReason`
  surfaces are correspondingly more accurate, and
  `FindingFilterReport.header.inputRefs` cites
  EvidenceGraph for these matches as designed. The
  release note should warn operators.
- **`fileImportsTargetMatching` ordering.** The
  helper now returns sorted targets via
  `localeCompare` (was: insertion order). Any caller
  that depended on insertion order would see a
  behavior change. None exist in the Rekon repo
  today.
- **Sort stability vs. classic helpers.** Other v2
  helpers (`listObservedRepoFiles`,
  `listExportsForFile`, `listSymbolsForFile`)
  already sort. This change harmonizes
  `listImportTargetsForFile` with that convention.
- **Future migration trigger watch.** The decision
  memo names four conditions for adopting Option A
  (full producer migration). The most likely
  near-term trigger is a future graph-aware check
  that needs the new file-subject shape exclusively
  (e.g. an import-fact field that legacy producers
  omit). Until any trigger fires, the
  compatibility-aware helper is the canonical
  implementation.

## NEXT STEP

Per the work order's "Next Step After This Batch"
section + the decision memo's recommended follow-up:

> **Graph-aware import-fact consumers v4.**
>
> Audit the three v1 / v2 graph-aware filter checks
> that prefer EvidenceGraph imports
> (`graphFilterRouteHandlerWithService`,
> `graphFilterRouteHttpMiddlewareOnly`,
> `graphFilterExternalApiCommentOnly`) and confirm
> their EvidenceGraph branches now fire against
> production data. Strengthen evidence strings to
> reflect the new reach. Optionally adjust confidence
> levels if the structural strength of
> production-shaped EvidenceGraph evidence warrants
> it. Bounded, artifact-backed: no source reads, no
> `GraphOntologyValidator` port, no LLM, no new reason
> codes.

That's a runtime-behavior batch (small audit + test
additions). It validates that the substrate +
compatibility implementation together restore the v2
strengthening invariant ("prefer EvidenceGraph
import facts over `details.imports`") against
production data.

## CROSS-REFERENCES

- [Import fact subject-shape decision memo](../../docs/strategy/import-fact-subject-shape-decision.md)
- [Graph-aware filter provider v3 decision memo](../../docs/strategy/graph-aware-filter-provider-v3-decision.md)
- [GraphOntologyValidator-lite audit](../../docs/strategy/graph-ontology-validator-lite-audit.md)
- [Issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
- [Graph-aware finding filters concept](../../docs/concepts/graph-aware-finding-filters.md)
- [EvidenceGraph artifact](../../docs/artifacts/evidence-graph.md)
- [Import fact subject-shape decision review packet](import-fact-subject-shape-decision.md)
- [EvidenceGraph export / symbol facts projection v1 review packet](evidence-export-symbol-facts-v1.md)
- [Graph-aware Next.js route export convention filter review packet](graph-aware-nextjs-route-export-filter.md)
- [Graph-aware finding filter provider v2 review packet](graph-aware-finding-filter-provider-v2.md)
- [Graph-aware finding filter provider v1 review packet](graph-aware-finding-filter-provider-v1.md)
