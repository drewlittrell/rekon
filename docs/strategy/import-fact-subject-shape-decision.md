# Import Fact Subject-Shape Decision

> Strategy memo only. **No runtime behavior changes ship in
> this slice.** The memo evaluates how Rekon should handle
> the inconsistency between the new
> `EvidenceGraph` export / symbol facts substrate
> (`subject = file path`) and the legacy import fact shape
> (`subject = "<file>:<target>"`). It recommends a direction
> so the next implementation slice (`listImportTargetsForFile`
> helper compatibility) can land without surprises.
>
> **Implementation status:** Option B has shipped via the
> import-helper-compatibility implementation slice.
> `listImportTargetsForFile` and `fileImportsTargetMatching`
> in `@rekon/kernel-findings` now recognize both the legacy
> producer shape and the future file-subject shape via a
> shared `matchesFileSubject` predicate. The
> `@rekon/capability-js-ts` import-fact producer is
> unchanged. No artifact migration. No `EvidenceGraph`
> `schemaVersion` bump. The four future-migration triggers
> for Option A (helper compatibility logic exceeding ~3
> callsites; a planned `schemaVersion` bump; external
> author confusion; import facts becoming
> publication-facing) remain documented below.
>
> **Consumer follow-through (graph-aware import-fact
> consumers v4):** the three import-consuming graph-aware
> filters (`route-handler-with-service`,
> `route-http-middleware-only`,
> `external-api-comment-only`) now deliberately prefer
> EvidenceGraph import facts over
> `Finding.details.imports`. `route-handler-with-service`'s
> precedence was swapped so EvidenceGraph runs first;
> evidence strings across all three filters name the
> source ("EvidenceGraph import facts …" / "Detector
> import details …" / "ObservedRepo file index …") so
> audit consumers can tell which branch fired.
>
> **Publication diagnostics (graph-aware import evidence
> publication diagnostics):** every `FilteredFinding` now
> carries `evidenceSource`
> (`EvidenceGraph` / `ObservedRepo` /
> `DetectorDetails` / `Policy` / `BuiltIn` /
> `ResultFilter`). `FindingFilterHealthSummary` exposes
> `byEvidenceSource`, `graphAwareByEvidenceSource`,
> `graphAwareReasonEvidenceSources`, and
> `dominantGraphAwareEvidenceSource`. Three new advisory
> alerts surface when graph-aware filtering leans on
> fallback evidence:
> `graph-aware-details-fallback-dominance` (>= 50%),
> `graph-aware-observedrepo-fallback-dominance` (>= 50%),
> `graph-aware-evidencegraph-low-usage` (< 25%).
> Architecture summary renders a `Graph-Aware Evidence
> Sources` table + per-reason × per-source breakdown;
> agent contract renders a compact
> `Graph-aware evidence sources:` list and a new "Do Not
> Do" reminder against treating fallback as equivalent.
> The data feeds the future Option A migration decision
> by showing whether `EvidenceGraph` import facts are
> actually firing in real repos.
>
> **Operator review (graph-aware import evidence operator
> review):** see
> [`docs/strategy/graph-aware-import-evidence-operator-review.md`](graph-aware-import-evidence-operator-review.md).
> The review evaluates the new diagnostic surface
> against available fixture data and concludes
> **Option C (defer producer migration) for alpha**:
> zero graph-aware filter decisions fire in any
> available fixture; none of the four migration
> triggers documented above is met; the helper
> compatibility implementation at `cce837f` remains
> canonical. The decision is durable for the entire
> alpha window and revisitable when any trigger
> transitions to "Met" or when real operator data
> from third-party repos materially changes the
> diagnostic picture.
>
> **Operator review refresh (post-fixture
> expansion):** see
> [`docs/strategy/graph-aware-import-evidence-operator-review-refresh.md`](graph-aware-import-evidence-operator-review-refresh.md).
> Re-runs the prior review against the three
> deterministic regression fixtures shipped at
> `702afbf` (`route-handler`, `external-comment`,
> `nextjs-route`). Measured diagnostics: every
> fixture produces an EvidenceGraph-attributed
> graph-aware match
> (`graphAwareByEvidenceSource.EvidenceGraph === 1`
> per fixture); zero DetectorDetails / ObservedRepo
> attribution; no fallback-dominance alert fires.
> Re-evaluates all four migration triggers against
> measured data — none met. **Option C remains the
> alpha decision.** The supporting non-trigger
> diagnostic — "EvidenceGraph-backed graph-aware
> filters now work in deterministic fixtures" — is
> the strongest available evidence in favor of
> Option C.
>
> **Operator review v2 (post-complete-coverage):**
> see
> [`docs/strategy/graph-aware-fixture-coverage-operator-review-v2.md`](graph-aware-fixture-coverage-operator-review-v2.md).
> Re-runs the data-gathering protocol against the
> now-six deterministic fixtures (the three above
> plus `route-http-middleware-only`, `factory-file`,
> `module-gate` shipped at `b2f74b8`). Measured
> aggregate diagnostics: `EvidenceGraph` attribution
> 4, `DetectorDetails` 2, `ObservedRepo` 0; no
> fallback-dominance alert fires.
> `factory-file-creates-deps` and
> `module-gate-verified-caller` attribute as
> `DetectorDetails` by current design — their
> path-evidence branches set `usedArtifacts: []`,
> which the evidence-source classifier maps to
> `DetectorDetails`. **All four migration triggers
> re-evaluated against the new data — none met.
> Option C remains the alpha decision.** The v2
> review also extends this memo's framing with an
> explicit per-reason artifact-strength review and
> identifies `factory-file-creates-deps` and
> `module-gate-verified-caller` as the next
> evidence-strengthening candidates (not import
> producer migration).
>
> **Operator review v3 (post-strengthening):** see
> [`docs/strategy/graph-aware-fixture-coverage-operator-review-v3.md`](graph-aware-fixture-coverage-operator-review-v3.md).
> Re-runs the protocol against the post-strengthening
> baseline (after
> [`factory-module-gate-evidence-strengthening.md`](factory-module-gate-evidence-strengthening.md)
> shipped at `a2a2d25`). Measured aggregate
> diagnostics: `EvidenceGraph` attribution 6,
> `DetectorDetails` 0, `ObservedRepo` 0 across the
> committed fixtures. All four migration triggers
> re-evaluated — **none met. Option C remains the
> alpha decision.** The v3 review additionally
> records the **graph-aware v1 / v2 / v3 arc as
> alpha-complete** and recommends the next
> implementation slice return to the deferred
> **issue merge decision freshness guardrails**
> (previously deferred until filtering / graph-aware
> parity was stronger; that condition is now
> satisfied).

## Decision Summary

**Recommended: Option B — keep the legacy import fact
producer shape, make `listImportTargetsForFile` (and any
future file-scoped import helper) compatibility-aware, and
preserve Option A (full migration) as a future trigger.**

The graph-aware filter provider v1 (`776adcf`), v2
(`0ab0b16`), and Next.js route convention v3 (`837c943`)
have all consumed graph context through helper APIs. Today
the `listImportTargetsForFile` helper assumes
`subject === filePath`, which never matches against
`@rekon/capability-js-ts` production data
(`subject = "<file>:<target>"`). Graph-aware filters that
rely on import facts have therefore been falling back to
`Finding.details.imports` or `ObservedRepo.files` siblings
without operators noticing — because the test fixtures used
the new shape and the example repo has no findings.

Migrating producer shape now would regenerate every
existing `EvidenceGraph` artifact in user repos and risk
breaking external consumers that assume the legacy shape.
Helper-aware compatibility lands the correct *consumer*
behavior in one place, leaves existing artifacts valid,
and keeps the migration door open.

## Current Fact Shapes

| Fact kind | Subject | Value | Producer |
| --- | --- | --- | --- |
| `file` | repo-relative file path | `{ path, extension, language }` | `@rekon/capability-js-ts` |
| `import` *(legacy)* | `"<file>:<target>"` | `{ source: <file>, target: <target>, line }` | `@rekon/capability-js-ts` |
| `export` *(substrate v1)* | repo-relative file path | `{ name, kind, default? }` | `@rekon/capability-js-ts` |
| `symbol` *(substrate v1)* | repo-relative file path | `{ name, kind, exported? }` | `@rekon/capability-js-ts` |
| `ownership_hint` | repo-relative file path | `{ path, system, layer }` | `@rekon/capability-js-ts` |
| `capability_hint` | repo-relative file path | `{ path, capability }` | `@rekon/capability-js-ts` |

**Five of six built-in fact kinds use `subject = file
path`. Only `import` uses the legacy
`"<file>:<target>"` shape.**

Export / symbol facts shipped at `a776c58` (the
`EvidenceGraph` export / symbol facts projection v1
substrate) deliberately picked `subject = file path` so
`listExportsForFile(ctx, filePath)` and
`listSymbolsForFile(ctx, filePath)` could match by
`fact.subject === normalizeRepoPath(filePath)`.

The `import` fact's `subject = "<file>:<target>"` shape
predates the substrate slice and was preserved unchanged
in the substrate batch (the work order explicitly excluded
import facts). The shape is internally consistent — the
target is encoded into the subject so each fact has a
unique identifier — but it does not match the
file-scoped lookup convention the rest of the substrate
adopted.

## Problem

`@rekon/kernel-findings.listImportTargetsForFile` matches
by `normalizeRepoPath(fact.subject) === normalizeRepoPath(filePath)`:

```ts
export function listImportTargetsForFile(
  context: FindingGraphFilterContext,
  filePath: string,
): string[] {
  const normalized = normalizeRepoPath(filePath);
  if (normalized === "") return [];
  const facts = context.evidenceGraph?.facts;
  if (!Array.isArray(facts)) return [];
  const targets: string[] = [];
  for (const fact of facts) {
    if (!fact || fact.kind !== "import") continue;
    if (normalizeRepoPath(fact.subject) !== normalized) continue;
    const target = fact.value?.target;
    if (typeof target === "string" && target.length > 0) {
      targets.push(target);
    }
  }
  return targets;
}
```

Against the legacy producer shape, `fact.subject` is
`"src/api/widgets/route.ts:./handler"` while `filePath`
is `"src/api/widgets/route.ts"`. The two never match, so
the helper returns the empty array.

**Concrete consequences:**

1. `graphFilterRouteHttpMiddlewareOnly` falls back to
   `Finding.details.imports` even when EvidenceGraph
   import facts exist. The strengthened v2 behavior
   ("prefer EvidenceGraph import facts over
   `details.imports`") is effectively dead code against
   production data.
2. `graphFilterExternalApiCommentOnly` falls back to
   `Finding.details.imports` similarly.
3. `graphFilterRouteHandlerWithService`'s
   `EvidenceGraph`-import branch never fires against
   production data (it falls through to the
   `ObservedRepo.files` sibling branch when the
   detector also omits `details.imports`).
4. `FindingFilterReport.header.inputRefs` never cites
   `EvidenceGraph` for production import-fact matches.
5. Filter-health's
   `byGraphAwareReason` / `dominantGraphAwareReason`
   surfaces operator-facing counts for reasons that
   actually fired via `ObservedRepo` or
   `details.imports`, not EvidenceGraph, which is
   misleading when reviewing graph-aware coverage.

The v1 / v2 contract tests pass because they construct
synthetic `EvidenceGraph` artifacts with the new
`subject = file path` shape. The real producer's output
is never exercised end-to-end at the import-fact level
because `examples/simple-js-ts` has no findings to
filter and no other test fixture seeds a real run
through the JS/TS provider into a graph-aware filter
case that depends on import facts.

## Option A: Migrate Import Facts To File Subject

Change `@rekon/capability-js-ts.extractImportFacts` to
emit facts with the new shape:

```ts
{
  kind: "import",
  subject: "<repo-relative-file-path>",
  value: {
    source: "<repo-relative-file-path>",  // identical to subject
    target: "<import-target>",
    kind?: "static" | "dynamic" | "type" | "unknown"
  }
}
```

**Pros:**

- Consistent with export / symbol / file /
  ownership_hint / capability_hint facts. The producer
  emits one uniform "subject = file" convention across
  all built-in fact kinds.
- File-scoped helpers stay one-line; no legacy branch
  needed.
- Future graph-aware filters reading import facts get
  correct behavior without per-helper compatibility
  logic.
- Removes a hidden dead-code path from graph-aware
  filters (the EvidenceGraph branch starts firing
  against production data automatically).

**Cons:**

- Existing `EvidenceGraph` artifacts on disk in user
  repos contain old import facts. They continue to
  validate (the validator does not constrain subject
  format), but no helper would match them — operators
  need to regenerate via `rekon refresh` to get the new
  shape.
- External capabilities that produce or consume import
  facts using the legacy shape would need transition.
- The kernel-evidence dedupe key includes `subject`. A
  fact written under the legacy shape and re-emitted
  under the new shape would NOT dedupe across the
  boundary, so a mixed-shape EvidenceGraph could carry
  both copies until the legacy ones expire (via
  artifact freshness / refresh).
- Tests that synthesize legacy import facts (none today
  in this repo, but possibly in user-side packs) would
  break.

**Implementation if chosen** (sketch — not part of this
batch):

- Update `extractImportFacts` in
  `packages/capability-js-ts/src/index.ts` to emit
  `subject: path`, with `value.source = path` and
  `value.target` carrying the import target. Keep
  `value.line` for provenance parity with the legacy
  shape.
- Document the producer change in `CHANGELOG.md` and
  `docs/artifacts/evidence-graph.md`.
- Add a producer-shape contract test asserting the new
  fact shape.
- Verify the existing v1 / v2 graph-aware tests still
  pass against synthetic data with the new shape.
- Note in the migration entry that operators should run
  `rekon refresh` to regenerate import facts.

## Option B: Compatibility-Aware Import Helpers

Keep `@rekon/capability-js-ts.extractImportFacts`
unchanged. Update `listImportTargetsForFile` (and any
future file-scoped import helper) to recognize both the
legacy and the new shape:

```ts
export function listImportTargetsForFile(
  context: FindingGraphFilterContext,
  filePath: string,
): string[] {
  const normalized = normalizeRepoPath(filePath);
  if (normalized === "") return [];
  const facts = context.evidenceGraph?.facts;
  if (!Array.isArray(facts)) return [];
  const seen = new Set<string>();
  for (const fact of facts) {
    if (!fact || fact.kind !== "import") continue;
    if (matchesFileSubject(fact, normalized)) {
      const target = fact.value?.target;
      if (typeof target === "string" && target.length > 0) {
        seen.add(target);
      }
    }
  }
  return [...seen];
}

function matchesFileSubject(
  fact: EvidenceFactLike,
  normalized: string,
): boolean {
  // New shape: subject is the file path.
  if (normalizeRepoPath(fact.subject) === normalized) return true;
  // Legacy shape: value.source is the file path; subject is
  // "<file>:<target>".
  const source = fact.value?.source;
  if (typeof source === "string" && normalizeRepoPath(source) === normalized) {
    return true;
  }
  // Defensive: legacy subjects have the form "<file>:<target>".
  // If the prefix before the *first* `:` normalizes to our
  // file path, accept that too. (Edge case: file paths with
  // colons would not match, but Rekon paths are repo-relative
  // and colon-free.)
  const subject = typeof fact.subject === "string" ? fact.subject : "";
  if (subject) {
    const idx = subject.indexOf(":");
    if (idx > 0 && normalizeRepoPath(subject.slice(0, idx)) === normalized) {
      return true;
    }
  }
  return false;
}
```

**Pros:**

- Zero producer churn. Every existing
  `EvidenceGraph` artifact on disk keeps working.
- External capabilities that already produce import
  facts in either shape get correct helper behavior
  without action.
- The dead-code paths in graph-aware filters
  (EvidenceGraph import branches in `route-http-middleware-only`,
  `external-api-comment-only`,
  `route-handler-with-service`) start firing
  immediately against production data once the helper
  ships.
- Migrating producer shape later (Option A) becomes
  additive — the helper already handles both shapes —
  so a future migration is decoupled from the
  consumer-side fix.
- Lower risk: a helper-level test can pin both shapes
  produce identical lookups, and the change is
  contained to one function.

**Cons:**

- The helper carries permanent compatibility logic
  unless a future migration completes.
- New contributors copying the helper logic might
  preserve the compatibility branch even when it is no
  longer needed.
- The kernel must document the compatibility contract
  ("use helpers, do not match `fact.subject` raw") so
  external rule packs do not re-introduce the bug.

**Implementation if chosen** (next slice, not this
batch):

1. Update `listImportTargetsForFile` in
   `@rekon/kernel-findings` to support both shapes via
   the `matchesFileSubject` predicate above. Dedupe
   targets via a `Set` so a fact appearing under both
   shapes does not double-count.
2. Add `tests/contract/import-fact-helper-compat.test.mjs`
   (or extend the existing
   `graph-aware-finding-filters-v2.test.mjs` /
   `evidence-export-symbol-facts.test.mjs`) covering:
   - Legacy `subject = "<file>:<target>"` returns
     targets.
   - Future `subject = file` returns targets.
   - Mixed shapes dedupe identical targets.
   - Empty / missing graph context returns the empty
     array.
   - Path normalization (`./src/foo.ts` matches
     `src/foo.ts`) for both shapes.
3. Add an end-to-end CLI smoke against
   `examples/simple-js-ts` (extended to include a
   minimal `route.ts` finding) confirming that the
   graph-aware filter consumes EvidenceGraph import
   facts from the JS/TS producer.
4. Update `docs/concepts/graph-aware-finding-filters.md`
   "v2 Helpers" section to document the
   compatibility contract.
5. No producer change. No
   `EvidenceGraph` `schemaVersion` bump.

## Option C: Leave As-Is

Document the inconsistency permanently. Require
graph-aware filters that want import facts to either:

- Use `value.source` directly (bypassing the helper).
- Use `Finding.details.imports` as the primary source.

**Pros:**

- Zero churn.

**Cons:**

- Helper API surface is misleading:
  `listImportTargetsForFile` promises file-scoped lookup
  but silently fails against production data.
- Future graph-aware filters keep relying on
  `details.imports` or `ObservedRepo` fallbacks even
  when import-graph evidence exists — the substrate is
  underutilized.
- Filter-health `byGraphAwareReason` /
  `dominantGraphAwareReason` permanently underrepresents
  EvidenceGraph-import attribution.
- New contributors reading the v2 strengthening claim
  ("prefer EvidenceGraph import facts over
  `Finding.details.imports`") encounter behavior that
  contradicts the documentation.

This option is **not recommended**. The cost of fixing
the helper is small; the cost of leaving the surface
broken accumulates as more graph-aware checks land.

## Recommendation

**Choose Option B now. Preserve Option A as a future
migration triggered by the conditions below.**

The compatibility-aware helper is the smallest
correctness-preserving change. It:

- restores the v2 strengthening invariant ("prefer
  EvidenceGraph import facts over `details.imports`")
  against production data,
- keeps every existing `EvidenceGraph` artifact valid,
- requires no `schemaVersion` bump,
- contains the change to a single helper function and
  its tests,
- documents the contract that all file-scoped lookups
  must go through helpers, never through raw
  `fact.subject` matching.

Option A's producer migration becomes an additive
follow-up: the helper continues to work, and the
producer change is isolated. Option C is rejected
because the surface is already documented to support
file-scoped lookup.

## Consequences

If Option B is adopted in the next slice:

- `listImportTargetsForFile` returns the full set of
  import targets for a file regardless of which shape
  the producer used.
- `graphFilterRouteHttpMiddlewareOnly`,
  `graphFilterExternalApiCommentOnly`, and
  `graphFilterRouteHandlerWithService` begin firing
  against production data via the EvidenceGraph branch
  (rather than always falling back to
  `details.imports` or `ObservedRepo` siblings).
- Some repos may see new graph-aware suppressions
  appear after the next refresh — none of them are
  false positives (the v2 import-fact branches were
  designed conservatively), but operators should expect
  the
  graph-aware-filter-dominance /
  graph-aware-reason-dominance alert thresholds to
  potentially trip on previously-quiet repos.
- Filter-health counts and dominance alerts surface
  more accurate EvidenceGraph-attributed numbers.
- Decisions consulted EvidenceGraph in those cases
  now carry `usedArtifacts: ["EvidenceGraph"]`, and
  `FindingFilterReport.header.inputRefs` cites the
  graph artifact appropriately.

If Option B is **not** adopted:

- The current inconsistency persists. The substrate
  remains effectively dead for import-fact lookups.
- Future graph-aware checks must either avoid import
  facts or inline ad-hoc subject-shape detection (which
  is exactly the anti-pattern this memo wants to
  prevent).

## Implementation Plan If Accepted

The next slice (separate batch) should:

1. **Update `listImportTargetsForFile`** in
   `@rekon/kernel-findings` to consult, in order:
   - `fact.subject === filePath` (the new convention);
   - `fact.value.source === filePath` (the legacy
     convention's authoritative file field);
   - `fact.subject` prefix before the first `:`
     normalizing to `filePath` (defensive fallback for
     legacy facts that omit `value.source`).
2. **Dedupe targets** within the helper so a fact
   matched under multiple shape branches contributes
   only once.
3. **Add a `matchesFileSubject` private predicate** so
   `fileImportsTargetMatching` and any future helper
   shares the same compatibility logic.
4. **Add tests:**
   - Legacy `subject = "<file>:<target>"` returns
     targets correctly.
   - New `subject = filePath` returns targets
     correctly.
   - Mixed shapes dedupe identical targets.
   - Export / symbol helper behavior remains unchanged.
   - Path normalization (`./src/foo.ts` vs
     `src/foo.ts`) works for both shapes.
   - End-to-end CLI fixture: a JS/TS source file with
     imports flows through the producer → graph-aware
     filter consumes via the helper → match fires →
     `inputRefs` cites EvidenceGraph.
5. **Update graph-aware filters** to rely on the
   helper. Audit
   `graphFilterRouteHandlerWithService`,
   `graphFilterRouteHttpMiddlewareOnly`, and
   `graphFilterExternalApiCommentOnly` to ensure they
   call `listImportTargetsForFile` (they already do,
   per v2; verify they do not match
   `fact.subject` raw anywhere).
6. **No artifact migration required.** Older
   `EvidenceGraph` artifacts continue to validate; the
   helper handles them automatically.
7. **No `EvidenceGraph` `schemaVersion` bump.** No
   change to the artifact schema.
8. **Document the contract** in
   `docs/concepts/graph-aware-finding-filters.md` and
   `docs/artifacts/evidence-graph.md`: consumers must
   use helper APIs (`listImportTargetsForFile`,
   `listExportsForFile`, `listSymbolsForFile`) for
   file-scoped fact lookups. Raw `fact.subject`
   matching is permitted only by the fact's owning
   producer or by tests that own the exact shape they
   construct.

## Compatibility Contract

This memo establishes the following contract for
`EvidenceGraph` consumers:

> **Graph-aware consumers must use helper APIs for
> file-scoped fact lookups:**
> - `listImportTargetsForFile(context, filePath)`
> - `listExportsForFile(context, filePath)`
> - `listSymbolsForFile(context, filePath)`
>
> Consumers must not match raw `fact.subject` for
> file-scoped lookups unless they own the fact's
> producer and shape (i.e. tests that synthesize fixed
> fact shapes, or the producer that emits the fact).
>
> The helpers normalize repo paths, handle both legacy
> and current subject shapes, and dedupe identical
> values. Bypassing them risks misaligned subject
> matching, missed facts, and shape-coupling to
> producer internals.

## Future Migration Trigger

Adopt Option A (producer-side migration to
`subject = file path` for import facts) when **any** of
the following conditions hold:

- **Helper compatibility logic exceeds ~3 callsites**
  beyond `listImportTargetsForFile` (i.e. another
  helper or surface needs the same fallback) — the
  maintenance cost has outgrown the migration cost.
- **An `EvidenceGraph` `schemaVersion` bump is planned**
  for an unrelated reason — bundle the import-fact
  shape migration into the same bump so consumers see
  one transition, not two.
- **External capability authors report confusion** about
  why import facts use a different subject convention
  than the rest of the fact kinds (specifically: a
  community PR proposes producing import facts in the
  new shape, or a community capability author files an
  issue asking which shape to follow).
- **Import facts become a publication-facing or
  user-facing artifact projection** (e.g. a "Repository
  imports" surface in the architecture summary
  publication). User-facing shapes should not carry
  legacy compatibility quirks; migrate before
  publishing.

When any trigger fires, ship a small migration slice:
update `extractImportFacts`, regenerate the example
repo's `EvidenceGraph`, document the change, and remove
the legacy compatibility branch from
`listImportTargetsForFile` (with a deprecation note in
the CHANGELOG).

## Tests Required For Implementation

When the helper-compatibility slice (Option B
implementation) lands, it must pin:

1. **Legacy producer shape returns targets.** Synthetic
   graph with
   `{ kind: "import", subject: "src/foo.ts:./bar",
   value: { source: "src/foo.ts", target: "./bar" } }`
   → `listImportTargetsForFile(ctx, "src/foo.ts")`
   returns `["./bar"]`.
2. **New file-subject producer shape returns targets.**
   Synthetic graph with
   `{ kind: "import", subject: "src/foo.ts",
   value: { target: "./bar" } }` → same result.
3. **Mixed shapes dedupe.** Two facts (one of each
   shape) pointing at the same `(file, target)` pair
   → the helper returns the target once.
4. **`value.source` mismatch.** A legacy-shape fact
   with `value.source` pointing at a different file
   than the subject prefix → the helper trusts
   `value.source` (it is the authoritative file
   field).
5. **Path normalization.** `listImportTargetsForFile(ctx,
   "./src/foo.ts")` and
   `listImportTargetsForFile(ctx, "src/foo.ts")`
   return the same set for both shapes.
6. **No false matches across files.** A fact with
   subject `"src/foo.ts:./bar"` must NOT match
   `listImportTargetsForFile(ctx, "src/foo")` (prefix
   matching is anchored on the full normalized file
   path).
7. **Empty / missing graph returns empty array** for
   both shapes.
8. **`fileImportsTargetMatching` delegates correctly**
   and works against both shapes.
9. **Producer end-to-end CLI fixture.** A minimal
   `route.ts` source file with imports → `rekon
   refresh` → graph-aware filter consumes the produced
   facts via `listImportTargetsForFile` and matches
   (assert match + `usedArtifacts: ["EvidenceGraph"]`
   + `inputRefs` cites EvidenceGraph).
10. **Existing export / symbol helper tests remain
    unchanged.** No regression in
    `tests/contract/evidence-export-symbol-facts.test.mjs`.

## Cross-References

- [GraphOntologyValidator-lite audit](graph-ontology-validator-lite-audit.md)
- [Graph-aware filter provider v3 decision memo](graph-aware-filter-provider-v3-decision.md)
- [Graph-aware import evidence operator review refresh](graph-aware-import-evidence-operator-review-refresh.md)
- [Graph-aware fixture coverage operator review v2](graph-aware-fixture-coverage-operator-review-v2.md)
- [Graph-aware fixture coverage operator review v3](graph-aware-fixture-coverage-operator-review-v3.md)
- [Factory / module-gate evidence strengthening](factory-module-gate-evidence-strengthening.md)
- [Issue governance ADR](issue-governance-architecture-decision.md)
- [Graph-aware finding filters concept](../concepts/graph-aware-finding-filters.md)
- [EvidenceGraph artifact](../artifacts/evidence-graph.md)
- [Classic guarantee regression plan](classic-guarantee-regression-plan.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)
- [Roadmap](roadmap.md)
