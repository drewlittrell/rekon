# Review Packet: Graph-Aware Finding Filter Provider v1

Slice: P1.1 (Issue Adjudication), graph-aware-finding-filter-provider v1 slice.
Implements step 14 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order (flipped from `(future)` to `(shipped)`).

First Rekon-native graph-aware filter provider. Implements
the five port-soon candidate checks from the
[`GraphOntologyValidator`-lite audit](../../docs/strategy/graph-ontology-validator-lite-audit.md)
while preserving every audit invariant.

## CHANGES MADE

### `packages/kernel-repo-model/src/index.ts`

- `ObservedSystem.kind?: string` — additive optional
  structural kind (`"module"` / `"service"` / `"route"`
  / `"ui"` / `"infra"` / `"unknown"` / custom). Survives
  normalization across system merges via the existing
  `normalizeSystems` helper. Validator accepts a
  non-empty string when present.
- `ObservedRepo.files?: string[]` — additive optional
  flat file index. `createObservedRepo` normalizes to
  sorted unique repo-relative paths, drops absolute paths
  (`/...`) and any path under `.rekon/`, and strips
  leading `./` so consumers can rely on the shape. Empty
  files arrays are dropped (the projection stays
  undefined rather than empty).
- `validateObservedRepo` accepts the additive optional
  `files` field; rejects non-array values.

### `packages/capability-model/src/index.ts`

- The model projector now collects `kind: "file"`
  evidence facts (using `value.path` when present, else
  `subject`) and threads them into `createObservedRepo`
  as the `files` projection. The kernel boundary
  re-sorts, dedupes, and drops `.rekon/` paths so the
  projector just needs to surface candidates.

### `packages/kernel-findings/src/index.ts`

- New exported structural "Like" sub-shapes for graph
  artifacts: `ObservedRepoLike`, `OwnershipMapLike`,
  `CapabilityMapLike`, `EvidenceGraphLike`,
  `EvidenceFactLike`, `GraphSliceLike`. Keeps
  `@rekon/kernel-findings` free of
  `@rekon/kernel-repo-model` / `@rekon/kernel-evidence` /
  `@rekon/kernel-graph` runtime deps; real artifacts are
  structurally compatible.
- New exported types `FindingGraphFilterContext` and
  `FindingGraphFilterDecision`.
- New exported pure helper
  `applyFindingGraphFilters({ finding, graphContext })`.
  Iterates a fixed list of five private case functions in
  priority order and returns the first matching decision
  or `null`. Synchronous; no fs / network / LLM / source
  reads.
- Five private case functions (one per audit candidate):
  - `graphFilterRouteHandlerWithService` — emits
    `route-handler-with-service` when
    `details.imports` includes a `*/handler` import OR
    `ObservedRepo.files` lists a sibling
    `<dir>handler.ts` / `<dir>handler.tsx`. High
    confidence.
  - `graphFilterRouteHttpMiddlewareOnly` — emits
    `route-http-middleware-only` when every `/infra/`
    import under `details.imports` lives under
    `/infra/http/` or `/infra/Identity`. High
    confidence.
  - `graphFilterExternalApiCommentOnly` — emits
    `external-api-comment-only` when the strongest
    available import evidence (graph-resolved or
    detector-supplied) contains no
    `openai` / `openrouter` / `@openai/*` reference.
    High confidence with graph evidence, medium with
    only detector-supplied imports.
  - `graphFilterFactoryFileCreatesDeps` — emits
    `factory-file-creates-deps` for path heuristics
    (`Factory.ts`, `factory.ts`, `core/services/**/init/**`)
    or for `CapabilityMap` capabilities whose name
    contains `factory` / `init` / `bootstrap` and whose
    subjects include the file. High confidence for path
    evidence, medium for capability evidence.
  - `graphFilterModuleGateVerifiedCaller` — emits
    `module-gate-verified-caller` for `GateEvaluator`
    paths (high), `/modules/` paths (medium), or
    `OwnershipMap` → `ObservedSystem.kind === "module"`
    routing (medium).
- `ApplyFindingFiltersOptions.graphContext?:
  FindingGraphFilterContext` (additive optional input).
- `applyFindingFilters` pipeline expanded to five
  stages: `policy → classic content → graph-aware →
  built-in path → result`. The graph stage runs only
  when `graphContext` is supplied AND at least one
  graph artifact in the context is non-empty
  (otherwise it short-circuits to no-op, matching the
  audit's conservative-degradation guarantee).
- New private accessors `findSiblingHandlerPath`,
  `importTargetsForFile`, `capabilityMatchForFile`,
  `ownerSystemForFile`, `findObservedSystem` — small,
  pure, side-effect-free.
- Reuses the existing `details(finding)` accessor and
  `firstFile(finding)` helper from the classic content
  filters; no new accessor duplication.

### `packages/runtime/src/index.ts`

- New imports from `@rekon/kernel-findings`:
  `CapabilityMapLike`, `EvidenceGraphLike`,
  `FindingFilterReason`, `FindingGraphFilterContext`,
  `ObservedRepoLike`, `OwnershipMapLike`.
- `BuildFindingFilterReportOptions.useGraphContext?:
  boolean` (additive optional; defaults `true`). When
  `true`, the runtime reads the latest `ObservedRepo` /
  `OwnershipMap` / `CapabilityMap` / `EvidenceGraph`
  artifacts via the new file-local
  `readLatestRefForType` helper and threads them as
  `graphContext`. When `false`, no graph artifacts are
  read and the pipeline behaves exactly like before.
- `FindingFilterReport.header.inputRefs` cites a graph
  artifact only when at least one graph-aware match
  actually used the data (computed by intersecting
  `filteredFindings[].reason` with the graph-aware
  reason set). No-match runs do not inflate the input
  refs with graph artifacts the run never relied on.

### Tests

- New `tests/contract/graph-aware-finding-filters.test.mjs`
  with **20 assertions** (all passing):
  Repo-model projections (4):
  1. `ObservedRepo.files` is populated and sorted from
     `createObservedRepo` input.
  2. `ObservedRepo.files` excludes `.rekon/` artifact
     paths and absolute paths.
  3. `ObservedSystem.kind` is optional and survives
     normalization.
  4. `OwnershipMap` + `CapabilityMap` accept synthetic
     entries via existing creators.
  Graph-helper / pipeline (11):
  5-12. One per check (A, A sibling, B, C, D path, D
     capability, E path, E ownership).
  13. Graph filters conservatively no-op when
      `graphContext` is empty.
  14. `applyFindingFilters` with `graphContext` records
      sibling-handler match in `filteredFindings`
      (`source: "system"`, `reason` =
      `route-handler-with-service`, `confidence: "high"`,
      non-empty evidence, ISO `filteredAt`).
  15. `applyFindingFilters` without `graphContext`
      leaves graph-applicable findings active (proves
      additive optional input does not change baseline).
  End-to-end CLI (5):
  16. `rekon refresh` produces an `ObservedRepo` with a
      populated `files` projection that excludes
      `.rekon/` paths.
  17. `rekon findings filter` cites `ObservedRepo` in
      `header.inputRefs` when a sibling-handler match
      fires.
  18. Lifecycle / adjudication / coherency exclude the
      graph-filtered finding from active governance.
  19. Raw `FindingReport` remains byte-identical
      before / after.
  20. `rekon artifacts validate` stays clean after
      graph-aware filtering.
- Full suite: **682 passed / 1 skipped / 0 failed**.

### Docs

- New
  `docs/concepts/graph-aware-finding-filters.md` — full
  concept doc covering why the provider exists, the
  five v1 checks, pipeline position, inputs, conservative
  no-op semantics, audit trail, and what this is not.
- `docs/concepts/finding-filters.md` — new
  "Graph-aware filters (v1)" entry under the Reasons
  list pointing at the new concept doc.
- `docs/artifacts/finding-filter-report.md` — new
  "Graph-Aware Filters (v1)" section between the
  classic content/result section and CLI Surface.
- `docs/concepts/refresh.md` — `findings.filter` step
  description expanded to mention graph-aware filters
  + the new
  `docs/concepts/graph-aware-finding-filters.md` link.
- `docs/strategy/graph-ontology-validator-lite-audit.md`
  — status note updated to reflect v1 shipped + link to
  the new concept doc.
- `docs/strategy/issue-governance-architecture-decision.md`
  — Implementation Order step 14 flipped from `(future)`
  to `(shipped)` with the full v1 description; new step
  15 "Graph-aware filter provider v1 surfaces in
  publications / filter health"; old step 15 renumbered
  to 16.
- `docs/strategy/classic-subsystem-purpose-map.md` —
  subsystem 6 row appended with v1 shipped behavior;
  next-slice column changed to "Graph-aware filter
  provider v1 surfaces in publications / filter health";
  status string updated with
  `+ graph-aware-finding-filter-provider v1`.
- `docs/strategy/classic-behavior-roadmap.md` — new
  detailed entry for the v1 slice.
- `docs/strategy/classic-guarantee-regression-plan.md`
  — new shipped entry pinned by the new contract test.
- `docs/strategy/roadmap.md` — new bullet for the v1
  slice.
- `CHANGELOG.md` — detailed entry at the top of
  `0.1.0-alpha.1`.

### Review packet

`.rekon-dev/review-packets/graph-aware-finding-filter-provider-v1.md`
(this file).

## PUBLIC API CHANGES

`@rekon/kernel-repo-model`:
- `ObservedRepo.files?: string[]` (additive optional).
- `ObservedSystem.kind?: string` (additive optional).
- Validator accepts both new fields; both reject invalid
  shapes (non-array files; empty-string kind).

`@rekon/kernel-findings`:
- New exported types:
  `FindingGraphFilterContext`,
  `FindingGraphFilterDecision`,
  `EvidenceGraphLike`, `EvidenceFactLike`,
  `ObservedRepoLike`, `OwnershipMapLike`,
  `CapabilityMapLike`, `GraphSliceLike`.
- New exported function
  `applyFindingGraphFilters({ finding, graphContext })`.
- `ApplyFindingFiltersOptions.graphContext?:
  FindingGraphFilterContext` (additive optional).

`@rekon/runtime`:
- `BuildFindingFilterReportOptions.useGraphContext?:
  boolean` (additive optional; defaults `true`).

`@rekon/capability-model`:
- `modelProjector` now populates
  `ObservedRepo.files` from `kind: "file"` evidence
  facts. Existing consumers see the additional field as
  additive optional.

No SDK API change. No artifact registry change. No
artifact `schemaVersion` bump (additive optional fields
only). No new artifact type. No new capability role. No
new CLI subcommand or flag. No new reason codes. No
version bump. No npm publish.

## PURPOSE PRESERVATION CHECK

Original problem:
- Some architecture findings look like rule violations
  when inspected by path / string alone but are valid
  when the surrounding repository structure is considered.
- Pre-existing v2 content filters trust the detector's
  `details` payload; structural confirmation closes that
  gap.
- Classic codebase-intel solved the same problem with a
  monolithic `GraphOntologyValidator`. The audit
  explicitly rejected porting that architecture.

Classic workflow guarantee:
- codebase-intel-classic used graph / ontology validation
  as a false-positive trust layer before surfacing active
  issues.
- The guarantee is structural repo knowledge can suppress
  false positives with evidence, before lifecycle /
  adjudication / coherency.

Classic shape (per audit):
- `infra/validation/GraphOntologyValidator.ts`,
- `services/IssueDetectionService.ts`,
- `services/issues/content-filters.ts`,
- `services/issues/content-filter-ruleid.ts`,
- `services/issues/content-filter-architecture.ts`,
- `domain/issues/evaluators/**`,
- `services/GraphBuildProvider.ts`,
- `domain/graph/producers/**`.

Rekon equivalent (this slice):
- A pure, deterministic, kernel-level helper
  (`applyFindingGraphFilters`) consumes `ObservedRepo` /
  `OwnershipMap` / `CapabilityMap` / `EvidenceGraph` and
  contributes filter decisions to `applyFindingFilters`.
- Every match becomes a `FilteredFinding` with
  `source: "system"`, a deterministic `evidence` string,
  a confidence band, and a reason from the existing v2
  reason set.
- Raw `FindingReport` is never mutated.
- Lifecycle / adjudication / coherency exclude
  graph-filtered findings (handled automatically by the
  existing filter-aware lifecycle because the new stage
  lives inside `applyFindingFilters`).
- Missing graph artifacts → conservative no-op.

What would mean we failed (and isn't the case):
- We recreate `GraphOntologyValidator` as a hidden
  service → the implementation is a small set of pure
  case functions in `@rekon/kernel-findings`; no
  service, no cache, no source reads.
- Graph-aware filters read source files directly → all
  data comes from artifacts via structural Like types;
  no fs / network / LLM access.
- Filtered findings disappear without
  `FindingFilterReport` evidence → every match emits a
  `FilteredFinding` with full audit fields (test 14).
- A graph-aware filter changes status ledgers or raw
  findings → tests 19, 18 assert raw `FindingReport`
  byte-identity and lifecycle exclusion of filtered
  findings.
- We overfit to framework cases current Rekon artifacts
  cannot prove → each case degrades gracefully when its
  required artifact is missing (test 13).
- Missing artifact inputs cause guessed filtering → the
  pipeline checks for at least one non-empty graph
  artifact in `graphContext` before running the stage at
  all; otherwise it short-circuits.

Regression test for the original problem (test 14 +
tests 17-20):
- Given a `FindingReport` with a `route.ts` finding
  whose detector did not surface `details.imports`,
  `rekon findings filter` consults
  `ObservedRepo.files`, records the finding as
  `route-handler-with-service` in
  `FindingFilterReport.filteredFindings` (high
  confidence, `source: "system"`, evidence that names
  the sibling file), excludes it from lifecycle /
  adjudication / coherency, leaves the raw
  `FindingReport` byte-identical, and cites
  `ObservedRepo` in `header.inputRefs`.

## CODEBASE-INTEL ALIGNMENT

Classic capability / failure mode: graph / ontology-
informed false-positive filtering as a trust layer
before active issue surfacing.

What Rekon keeps:
- graph / ontology context can suppress false positives,
- filtered findings remain auditable,
- structural filters cite evidence,
- graph-aware filters run before active lifecycle /
  adjudication / coherency,
- raw findings remain immutable,
- no source scraping inside filters.

What Rekon simplifies:
- five checks only,
- consumes Rekon artifacts only,
- no monolithic validator,
- no full ontology suite,
- no LLM review,
- no semantic / fuzzy filtering,
- no deep framework catalog,
- no runtime truth graph.

What Rekon does not port yet:
- full graph ontology validation suite,
- runtime truth graph checks,
- deep policy-owner parser,
- framework-specific exception catalog,
- source-reading validator service,
- `GraphOntologyValidator` parity beyond v1 candidate
  checks.

How this advances migration:
- Moves beyond string / path filters into artifact-backed
  structural validation.
- Preserves the classic trust guarantee while respecting
  Rekon's capability / artifact spine.
- Establishes the pattern for future graph-aware filter
  providers (structural Like types, pure helpers,
  conservative no-op semantics, `header.inputRefs`
  citation only when used).

## GRAPH-AWARE FILTER MODEL

Pipeline order (first match wins):

1. **Policy filters** (`findingFilters`).
2. **Classic content filters** (17 reasons; v2).
3. **Graph-aware filters** *(this slice)*.
4. **Built-in path heuristics**.
5. **Result filters** (`findingResultFilters`).

`applyFindingFilters` short-circuits on the first match
at every stage. The graph stage is itself gated:
- The stage runs only when `graphContext` is supplied
  AND at least one of `evidenceGraph`, `observedRepo`,
  `ownershipMap`, `capabilityMap`, or `graphSlices`
  carries non-trivial content. Otherwise the pipeline
  skips straight to the built-in path heuristics.

Decision shape (all five checks share it):

```ts
{
  reason: FindingFilterReason,   // one of the 5 v2 codes
  evidence: string,              // names the structural signal
  filePath?: string,             // typically the first file
  confidence: "high" | "medium", // never "low" in v1
}
```

Audit invariants:
- Every decision becomes a `FilteredFinding` with
  `source: "system"` (never `"policy"`; never
  `"operator"`).
- `evidence` string identifies the structural source
  (sibling file path, infra-only imports, EvidenceGraph
  import facts, capability id, ObservedSystem kind).
- Confidence is `"high"` for direct path / import
  matches; `"medium"` for indirect evidence (capability
  map, ownership-map → kind).
- `filteredAt` is a fresh ISO timestamp.

## INITIAL CHECKS IMPLEMENTED

| Check | Reason | Inputs | Confidence |
| --- | --- | --- | --- |
| A. Route handler / sibling | `route-handler-with-service` | `details.imports` OR `ObservedRepo.files` | high |
| B. Route HTTP middleware only | `route-http-middleware-only` | `details.imports` | high |
| C. External-API comment only | `external-api-comment-only` | `details.imports` OR `EvidenceGraph` import facts | high (graph) / medium (detector-only) |
| D. Factory file creates deps | `factory-file-creates-deps` | path heuristics OR `CapabilityMap` entries | high (path) / medium (capability) |
| E. Module gate verified caller | `module-gate-verified-caller` | `GateEvaluator` path / `/modules/` path / `OwnershipMap` → `ObservedSystem.kind === "module"` | high (`GateEvaluator`) / medium (others) |

All five reuse pre-existing v2 reason codes from the
content-filter slice — no new codes were added.

## ARTIFACT INPUTS

Per-check input table:

| Check | Required artifact(s) | Available? | Notes |
| --- | --- | --- | --- |
| A | `Finding.details.imports` OR `ObservedRepo.files` | yes (post-v1 projection) | both available; ships with the file projection |
| B | `Finding.details.imports` | yes | strictly detector-supplied; no fallback |
| C | `Finding.details.imports` OR `EvidenceGraph` import facts | yes | when both present, declared imports win for confidence ranking |
| D | path heuristics OR `CapabilityMap` entries | yes | capability evidence may be weak in repos without explicit capability hints |
| E | `OwnershipMap` + `ObservedSystem.kind` | yes (post-v1 projection) | `kind` ships as additive optional; only fires when populated |

When the required inputs are not present in the supplied
`graphContext`, the relevant check returns `null` and the
pipeline continues. This is the audit's
"conservative no-op" guarantee.

## TESTS / VERIFICATION

Tests:
- New `tests/contract/graph-aware-finding-filters.test.mjs`
  (20 assertions; all passing).
- Full suite: **682 passed / 1 skipped / 0 failed**.

Required verification commands (all run, all green):
- `npm run typecheck`
- `npm run build`
- `npm run test`
- `git diff --check`
- `node scripts/audit-package-exports.mjs`
- `node scripts/publish-dry-run.mjs`
- `node scripts/audit-license.mjs`
- `node scripts/install-smoke.mjs`
- `node scripts/install-tarball-smoke.mjs`
- `node packages/cli/dist/index.js refresh --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js findings filter --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js findings filter-health --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js artifacts freshness --root examples/simple-js-ts --json`

## INTENTIONALLY UNTOUCHED

- `FindingReport`, `FindingFilterReport`,
  `FindingFilterHealthReport`,
  `FindingFilterPolicySuggestionReport`,
  `FindingFilterPolicyRule`,
  `FindingStatusLedger`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, `CoherencyDelta`,
  `IssueMergeDecisionLedger` — no shape changes; no
  `schemaVersion` bump.
- `applyFindingFilters` pipeline ordering — unchanged
  for non-graph runs; additive new stage when
  `graphContext` is supplied.
- `applyFindingContentFilters`,
  `applyFindingResultFilters`,
  `planFindingFilterPolicyApply`,
  `summarizeFindingFilterPolicyStatus`,
  `fingerprintFindingFilterPolicies`,
  `isBroadFindingFilterPolicyRule`,
  `buildFindingFilterHealth` — no changes.
- `validateArtifactFreshness` — unchanged; graph
  artifact citation in `header.inputRefs` flows through
  the existing freshness path.
- `rekon findings filter` / `filter-health` /
  `filter-policy status` / `suggest` / `list` /
  `apply` CLI signatures — unchanged.
- Architecture summary / agent contract / proof
  publishers — no shape change. Graph-aware match
  counts appear in `FindingFilterReport.summary.byReason`
  exactly like content/path/result reasons; filter
  health renders them via the existing generic alerts.
- `RefreshStepId` / refresh pipeline shape — unchanged.
- All capability manifests, permissions, dist contents,
  `schemaVersion` strings.
- `GraphOntologyValidator` port — explicitly rejected
  (per audit).
- LLM / semantic / fuzzy / embedding matching — never.
- No version bump. No npm publish. No branch.

## RISKS / FOLLOW-UP

- Risk: detectors that don't emit `kind: "file"`
  evidence facts will yield an empty
  `ObservedRepo.files` projection, which makes check A's
  sibling-handler path unable to fire. Mitigation:
  detectors are encouraged to emit file evidence; the
  fallback path via `details.imports` still works.
- Risk: `OwnershipMap` → `ObservedSystem.kind` lookup
  for check E requires both projections to be populated.
  Repos without strong evidence-provider coverage may
  see check E only fire via the `GateEvaluator` /
  `/modules/` path heuristics. Mitigation: documented
  in the concept doc; v1 always degrades gracefully.
- Risk: `CapabilityMap` capability-name heuristics
  (matching on `factory` / `init` / `bootstrap`) could
  miss less conventional names. Mitigation: the path
  heuristics still catch the common cases; future
  iterations can tighten the heuristics with operator
  feedback.
- Risk: graph stage runs only when `graphContext`
  carries non-trivial content. A test environment that
  passes an empty `graphContext: {}` will not exercise
  the stage. Mitigation: 20 tests explicitly exercise
  both code paths (with and without non-empty context);
  the runtime always populates context from store
  artifacts when available.
- Risk: `FindingFilterReport.header.inputRefs` only
  cites graph artifacts when a match used them. Repos
  that consult graph context but produce no matches
  will not show graph inputs in the report. This is
  intentional and matches the audit invariant —
  `inputRefs` is an audit of dependencies, not a
  capability declaration.
- Follow-up: filter-health and publication surfaces
  should distinguish graph-aware matches from content /
  path / result matches where useful. That is the next
  recommended slice ("Graph-aware filter provider v1
  surfaces in publications / filter health").
- Follow-up: surface graph-aware match counts in
  `FindingFilterHealthSummary` as a dedicated bucket
  (parallel to `policyFiltered` / `contentFiltered` /
  `resultFiltered` / `builtInPathFiltered`). Deferred
  to the surfaces slice.
- Follow-up: expand the `ObservedRepo.files` projection
  to surface more file kinds (currently only
  `kind: "file"` evidence facts contribute). Defer to
  evidence provider work.
- Follow-up: `ObservedSystem.kind` could be enriched
  from explicit capability annotations (currently the
  projector does not populate it). Defer until evidence
  provider coverage grows.

## NEXT STEP

Per the ADR's new step 15 and the work order's "Next
Step After This Batch":

> Graph-aware filter provider v1 surfaces in publications
> / filter health

Purpose:
- Architecture summary and agent contract should show
  graph-aware filter counts / reasons.
- Filter health should distinguish graph-aware
  structural filters from content / path / result
  filters where useful.

This is the natural follow-up: the filter logic is now
in place and emits matches, but the existing publication
+ filter-health surfaces render graph-aware matches
identically to content matches (via shared reason
codes). A small slice can split them visually so
operators can see at a glance how much of the filtering
comes from structural artifact evidence vs. detector
`details` payloads.
