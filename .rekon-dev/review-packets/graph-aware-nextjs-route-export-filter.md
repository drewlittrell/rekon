# Review Packet: Graph-Aware Next.js Route Export Convention Filter

Slice: P1.1 (Issue Adjudication),
graph-aware-nextjs-route-export-filter v3 slice.
Implements step 19 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order (flipped from `(future)` to
`(shipped)`).

First v3 candidate check that consumes the new
`EvidenceGraph` export facts substrate (shipped at
`a776c58` via the export/symbol facts projection v1). The
graph-aware variant of `nextjs-route-convention` reads
`listExportsForFile` to verify a `route.ts` file's
non-handler named exports are all in the Next.js
segment-config set before suppressing the
`routes.single_http_handler_export` finding. The legacy
classic content filter remains as a fallback when no
EvidenceGraph export facts exist.

## CHANGES MADE

### `packages/kernel-findings/src/index.ts`

**Reason-set reclassification.**
`nextjs-route-convention` moved from
`CLASSIC_CONTENT_FILTER_REASONS` to
`GRAPH_AWARE_FILTER_REASONS`. Filter-health now buckets
matches as `graphAwareFiltered` whether the graph-aware
stage or the classic content fallback fired. The
shared-reason discipline established in
graph-aware-filter-health-publications v1 holds: the
reason code identifies the *kind of evidence*, not the
layer that fired. Comment in `GRAPH_AWARE_FILTER_REASONS`
documents the move.

**New graph-aware check
`graphFilterNextjsRouteConvention(finding, ctx)`.**
Triggered by:

- `finding.type === "architecture"`
- `finding.ruleId === "routes.single_http_handler_export"`
- file ends with `route.ts`

Decision flow:

1. Call `listExportsForFile(ctx, file)`. If empty → return
   null (conservative no-op; classic content fallback gets
   its chance).
2. Filter out default exports (`entry.default === true` or
   `entry.name === "default"`).
3. Compute `extras` = named exports NOT in
   `NEXTJS_HANDLER_EXPORTS` (`GET` / `POST` / `PUT` /
   `PATCH` / `DELETE` / `HEAD` / `OPTIONS`).
4. If `extras.length === 0` → return null (no extras to
   suppress; the rule shouldn't have fired in the first
   place).
5. If every entry in `extras` is in
   `NEXTJS_SEGMENT_CONFIG_EXPORTS` (`runtime` / `dynamic`
   / `revalidate` / `fetchCache` / `preferredRegion`) →
   return a match:
   - `reason: "nextjs-route-convention"`
   - `confidence: "high"`
   - `evidence`: "Route's non-handler named exports are
     all Next.js segment-config values (per EvidenceGraph
     export facts): `<sorted extras>`."
   - `usedArtifacts: ["EvidenceGraph"]`
6. Otherwise (at least one extra is NOT a segment-config
   name) → return null (finding stays active).

Added to `GRAPH_FILTER_CHECKS` as the sixth and final
entry (after `graphFilterModuleGateVerifiedCaller`).

**New helper
`isNextjsRouteConventionSupersededByGraph(finding, ctx)`.**
Returns `true` when:

- `finding.type === "architecture"`
- `finding.ruleId === "routes.single_http_handler_export"`
- file ends with `route.ts`
- `listExportsForFile(ctx, file).length > 0`

Used by `applyFindingFilters` to gate the classic content
fallback. When graph evidence exists for a route file's
finding, the graph-aware decision is **authoritative** —
whether it filtered or declined to filter, the classic
content fallback (`details.otherExports`-based) must NOT
override. This prevents a clean-looking detector
`otherExports` from suppressing a finding when graph
reality shows the route exports an invalid extra symbol.

**Pipeline change.** In `applyFindingFilters` step 3
("Classic-inspired deterministic content filters"), a new
guard skips classic content when `graphContextActive` and
`isNextjsRouteConventionSupersededByGraph` is true. All
other classic content filters still run for other rule
ids.

### `tests/contract/graph-aware-nextjs-route-export-filter.test.mjs`

11 new contract tests:

1. `route.ts` export facts `GET + runtime` filter as
   `nextjs-route-convention` (high confidence, evidence
   names EvidenceGraph + the segment-config exports).
2. `route.ts` export facts `GET + runtime + dynamic +
   revalidate + fetchCache + preferredRegion` all
   filter; evidence names every segment-config export.
3. `route.ts` export facts `GET + helper` do NOT filter
   (graph-aware declines because `helper` is not a
   segment-config name).
4. `route.ts` export facts `GET` only do NOT filter (no
   extras; rule shouldn't have fired).
5. `route.ts` default export ignored — `GET + runtime +
   default` filters because `runtime` is the only
   non-default, non-handler export.
6. Graph facts override `details.otherExports`: detector
   claims `details.otherExports = ["runtime"]` but graph
   exports include `helper` → finding stays active (the
   `isNextjsRouteConventionSupersededByGraph` guard
   blocks the classic fallback from overriding graph
   reality).
7. Classic content fallback still filters when no
   `graphContext` is provided (details-based path
   unchanged).
8. `FindingFilterReport.header.inputRefs` includes
   `EvidenceGraph` when the graph-aware check fires
   (end-to-end CLI fixture seeds a synthetic
   EvidenceGraph + FindingReport, runs
   `rekon findings filter`, asserts the inputRefs).
9. Raw `FindingReport` remains byte-identical after the
   filter run.
10. Lifecycle / adjudication / coherency exclude the
    graph-filtered finding; `rekon artifacts validate`
    stays clean.
11. Filter-health buckets the match as
    `graphAwareFiltered` (verified via
    `result.graphArtifactsUsed === ["EvidenceGraph"]`).

## PUBLIC API CHANGES

**New `@rekon/kernel-findings` exports:**

- None (the new check and helper are internal — they
  emit through the existing `FindingGraphFilterDecision`
  shape and the existing `applyFindingFilters` flow).

**Bucket reclassification (effective):**

- `nextjs-route-convention` is now in
  `GRAPH_AWARE_FILTER_REASONS`. Existing
  `FindingFilterHealthReport` artifacts produced before
  this change will continue to validate. Future runs
  bucket the reason under `graphAwareFiltered` (and its
  per-reason rate appears in `filterRateByGraphAwareReason`
  / `byGraphAwareReason`).

No artifact `schemaVersion` bump. No new artifact type.
No new capability role. No new CLI subcommand or flag.
No new reason codes. No version bump. No npm publish.

## PURPOSE PRESERVATION CHECK

**Original problem.** Next.js route files may legally
export segment-config values (`runtime`, `dynamic`,
`revalidate`, `fetchCache`, `preferredRegion`). A
detector that sees "non-handler exports" without
understanding framework convention will flag the file as
a `routes.single_http_handler_export` violation. The
classic content filter avoided this by inspecting
`details.otherExports` — but detectors can omit that
field, and the detector's claim is not authoritative
when the graph proves otherwise.

**Rekon equivalent guarantee.** The new graph-aware
check verifies the file's actual exports structurally,
via `EvidenceGraph` export facts (shipped by the
substrate slice at `a776c58`). When graph facts exist,
they win. The legacy classic content filter remains as a
fallback for repos / runs without graph facts.

**Regression test for original problem.** Test 1 in the
new contract test file proves the canonical case: a
`route.ts` exporting `GET` + `runtime` filters as
`nextjs-route-convention` via the graph-aware check, with
evidence naming the EvidenceGraph source and the
`runtime` export.

**What we explicitly did NOT do:**
- No new reason codes.
- No source-file reads from filter logic.
- No AST, no type checker.
- No LLM / semantic / fuzzy / embedding logic.
- No framework-wide Next.js exception catalog beyond the
  five segment-config exports + seven HTTP methods.
- No `GraphOntologyValidator` port.
- No import-fact shape change.
- No `symbol` fact consumption (deferred to a future
  check).

## CODEBASE-INTEL ALIGNMENT

**Classic capability or failure mode:** rule-id-specific
false-positive filtering for valid Next.js route exports.

**Relevant classic files / systems aligned to:**
- `services/issues/content-filter-ruleid.ts`
- `services/issues/content-filters.ts`
- `services/IssueDetectionService.ts`

**What Rekon keeps:**
- Framework-convention false positives can be filtered.
- Filtering must be auditable (graph-aware evidence
  string names the EvidenceGraph source and the
  segment-config exports inspected).
- Structural evidence is preferred over detector
  details.
- Raw findings remain immutable.
- Graph-aware filters consume artifacts, not source.

**What Rekon simplifies:**
- One Next.js route export convention check only.
- No full framework catalog.
- No source reads.
- No AST/typechecker.
- No semantic / LLM review.

**What Rekon does not port yet:**
- Full Next.js route / page convention catalog.
- React server / client boundary framework checks.
- Framework-specific policy-owner parser.
- Source-level framework analyzer.

## EXPORT FACT EVIDENCE MODEL

The new check reads `EvidenceGraph` export facts via
`listExportsForFile(context, filePath)` (substrate v1).
Each export fact has:

```ts
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
```

The graph-aware check:
- Iterates `listExportsForFile` (sorted by name + kind).
- Drops entries where `default === true` OR `name ===
  "default"` (default exports are not relevant to this
  rule).
- Computes "extras" = named entries NOT in
  `NEXTJS_HANDLER_EXPORTS`.
- Checks every extra is in
  `NEXTJS_SEGMENT_CONFIG_EXPORTS`.

The check does not inspect `value.kind`. Future
graph-aware checks can refine on `kind` (e.g. require
`runtime` to be a `const`), but v3 keeps the rule simple.

## NEXTJS ROUTE CONVENTION FILTER

| Allowed handler exports | Allowed segment-config exports |
| --- | --- |
| `GET` | `runtime` |
| `POST` | `dynamic` |
| `PUT` | `revalidate` |
| `PATCH` | `fetchCache` |
| `DELETE` | `preferredRegion` |
| `HEAD` | |
| `OPTIONS` | |

**Pipeline behavior:**

1. Graph-aware stage runs first (per v2 reorder).
   `graphFilterNextjsRouteConvention` consults
   EvidenceGraph export facts.
   - Match → filter with
     `usedArtifacts: ["EvidenceGraph"]`.
   - Decline (invalid extras or no extras) → return null.
2. **If graph evidence existed**
   (`isNextjsRouteConventionSupersededByGraph` is true),
   skip classic content fallback for this finding. Graph
   reality wins.
3. **If graph evidence did NOT exist**, run classic
   content fallback. The legacy
   `contentFilterNextjsRouteConvention` checks
   `details.otherExports` — unchanged from prior batches.

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

All passed. Full suite: 755 passed / 1 skipped / 0
failed (11 new tests on top of the prior 744 passing
tests).

## INTENTIONALLY UNTOUCHED

- `contentFilterNextjsRouteConvention` — unchanged. Still
  serves as the classic content fallback when no graph
  evidence exists for the route file.
- The other five graph-aware checks
  (`route-handler-with-service` /
  `route-http-middleware-only` /
  `external-api-comment-only` /
  `factory-file-creates-deps` /
  `module-gate-verified-caller`) — unchanged.
- `listExportsForFile` / `listSymbolsForFile` substrate
  helpers — unchanged.
- `kind: "symbol"` facts — not consumed by this check.
- Import facts — not touched (the legacy `subject =
  "${path}:${target}"` shape is still preserved per the
  v1 substrate's documented follow-up).
- `applyFindingFilters` other pipeline stages (policy /
  built-in path / result) — unchanged.
- Publication shapes (architecture summary / agent
  contract) — no rendering change; the new check
  surfaces automatically in the existing Graph-Aware
  Filter Reasons table and dominance alerts.
- `EvidenceGraph` artifact shape — unchanged.
- `FindingFilterReport` / `FindingFilterHealthReport`
  shapes — unchanged.
- LLM / semantic / fuzzy / embedding inference —
  permanently rejected.
- Source-file reads from filter logic — still rejected.

## RISKS / FOLLOW-UP

- **Authoritative-graph guard scope.** The
  `isNextjsRouteConventionSupersededByGraph` helper is
  scoped to `routes.single_http_handler_export`. If
  future v3 checks need the same "graph evidence wins
  over `details`" semantics, they'll each need their own
  guard. A general
  `gateClassicContentFallbackByGraphEvidence` framework
  could land later if multiple checks need it.
- **Conservative segment-config set.** Future Next.js
  versions may add more segment-config exports. The set
  is hard-coded in `NEXTJS_SEGMENT_CONFIG_EXPORTS`;
  updates require a code change. Acceptable for v3 —
  the set is small and stable.
- **No `kind` validation.** The check doesn't verify
  that `runtime` is a `const` declaration vs. a
  function. A `function runtime() {}` would still
  satisfy the check. Documented limit; conservative
  by design (false negatives preferred).
- **Import-fact shape follow-up.** Per the v1 substrate
  review packet, import facts retain the legacy
  `subject = "${path}:${target}"` shape. The v3 check
  doesn't touch import facts; the cleanup decision memo
  remains the recommended next slice.

## NEXT STEP

Per the v1 substrate review packet's documented
follow-up:

> **Import fact subject-shape cleanup decision memo.**
>
> The substrate slice at `a776c58` standardized the new
> export/symbol facts on `subject = file path`. Legacy
> import facts retain `subject = "<file>:<target>"`,
> which doesn't match what the v2
> `listImportTargetsForFile` helper expects. The memo
> should decide whether to migrate import facts, add
> helper compatibility, or leave as-is.

That's a strategy-only batch (no runtime changes). Its
outcome may unblock additional graph-aware checks that
need import-fact lookups against production data.

## CROSS-REFERENCES

- [Graph-aware filter provider v3 decision memo](../../docs/strategy/graph-aware-filter-provider-v3-decision.md)
- [GraphOntologyValidator-lite audit](../../docs/strategy/graph-ontology-validator-lite-audit.md)
- [Issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
- [EvidenceGraph artifact](../../docs/artifacts/evidence-graph.md)
- [Graph-aware finding filters concept](../../docs/concepts/graph-aware-finding-filters.md)
- [EvidenceGraph export / symbol facts projection v1 review packet](evidence-export-symbol-facts-v1.md)
- [graph-aware finding filter provider v2 review packet](graph-aware-finding-filter-provider-v2.md)
- [graph-aware finding filter provider v1 review packet](graph-aware-finding-filter-provider-v1.md)
