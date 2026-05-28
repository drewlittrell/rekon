# Graph-Aware Finding Filters

`@rekon/kernel-findings` ships a deterministic graph-aware
finding filter provider that consumes Rekon artifacts to
suppress structural false positives. The provider is the
first slice toward
[`GraphOntologyValidator`-lite](../strategy/graph-ontology-validator-lite-audit.md)
— preserving classic's outcome (filtered findings with
structural evidence) without porting the monolithic validator.

## Why It Exists

Some architecture findings look like rule violations when
inspected by path or string content alone but are valid
when the surrounding repository structure is considered:

- a `route.ts` that delegates to a sibling `handler.ts`,
- a `route.ts` that only imports HTTP / identity
  middleware,
- an architecture finding that mentions an external API
  family in description but never actually imports its SDK,
- a `Factory.ts` / `factory.ts` / `core/services/**/init/**`
  file that is *supposed* to create dependencies,
- a module gate evaluator whose owning system is
  module-kind ("verified caller" territory).

The pre-existing v2 content filters fire when detectors
surface a structured `details` payload. The graph-aware
provider strengthens those filters by also consulting
`ObservedRepo`, `OwnershipMap`, `CapabilityMap`,
`EvidenceGraph`, and `GraphSlice` so the same conclusions
hold when detectors are quieter.

## What's Included In v1 + v2 + v3

Six deterministic checks, all reusing existing reason codes
(no new reason codes were introduced). v2 strengthens the
evidence each check consumes; v3 introduces the first check
that consumes the new `EvidenceGraph` export / symbol facts
substrate.

| Check | Reason | Inputs |
| --- | --- | --- |
| Route handler / sibling handler | `route-handler-with-service` | `EvidenceGraph` import facts (preferred, v4) → `Finding.details.imports` (fallback) → `ObservedRepo.files` sibling |
| Route HTTP middleware only | `route-http-middleware-only` | `EvidenceGraph` import facts (preferred) → `Finding.details.imports` (fallback) |
| External-API comment only | `external-api-comment-only` | `EvidenceGraph` import facts (preferred) → `Finding.details.imports` (fallback; explicit empty array still proves absence at medium confidence) |
| Factory file creates deps | `factory-file-creates-deps` | path heuristics, `CapabilityMap` entries |
| Module gate verified caller | `module-gate-verified-caller` | `GateEvaluator` path (high) → `OwnershipMap` + `ObservedSystem.kind === "module"` (medium, preferred over path) → `/modules/` path (medium, fallback) |
| Next.js route export convention *(v3)* | `nextjs-route-convention` | `EvidenceGraph` export facts (`listExportsForFile`). When facts exist, the file's non-handler named exports must all be in the Next.js segment-config set (`runtime` / `dynamic` / `revalidate` / `fetchCache` / `preferredRegion`) for the finding to be filtered. **Graph evidence is authoritative**: when export facts exist for the file, the classic content fallback (`details.otherExports`-based) is skipped — graph reality trumps detector details. When no graph facts exist, the classic content filter runs unchanged. |

Each check is a small pure function in
`@rekon/kernel-findings`. The provider iterates them in a
fixed order and returns the first matching decision or
`null`.

## Pipeline Position

`applyFindingFilters` runs filters in fixed priority:

1. **Policy filters** (`findingFilters`).
2. **Graph-aware filters** *(this slice)*. v2 moved this
   stage ahead of classic content so the audit credits the
   strongest artifact-backed source when both layers can
   match. No-op when `graphContext` is absent or its
   artifacts are empty.
3. **Classic content filters** (12 reasons; v2). Fallback
   when graph-aware did not fire — the five shared reason
   codes still bucket as `graphAwareFiltered` in
   filter-health regardless of which stage fired.
4. **Built-in path heuristics** (`generated-file`,
   `external-file`, `test-file`, `canary-file`,
   `content-filter`).
5. **Result filters** (`findingResultFilters`).

The pipeline short-circuits on the first match. The
graph-aware stage sits between the policy layer and the
classic content layer so a structural match always wins
over a generic content heuristic but never over an
operator-supplied policy.

## Inputs

`FindingGraphFilterContext` is structurally typed:

```ts
export type FindingGraphFilterContext = {
  evidenceGraph?: EvidenceGraphLike;
  observedRepo?: ObservedRepoLike;
  ownershipMap?: OwnershipMapLike;
  capabilityMap?: CapabilityMapLike;
  graphSlices?: ReadonlyArray<GraphSliceLike>;
};
```

The kernel uses minimal structural "Like" types so it can
accept the real artifacts from `@rekon/kernel-repo-model`,
`@rekon/kernel-evidence`, and `@rekon/kernel-graph` without
importing those packages at the kernel layer.

`ObservedRepo` gained an additive optional
`files?: string[]` projection in this slice so file-
existence checks can run without scraping the filesystem.
The kernel boundary drops absolute paths and any path
under `.rekon/` so consumers can rely on the shape without
re-filtering.

`ObservedSystem` gained an additive optional
`kind?: string` field so module-kind detection no longer
has to rely on naming conventions.

Both new projections are populated by
`@rekon/capability-model.projector` when the upstream
evidence supports it.

## Import-Fact Consumers (v4)

Three of the six graph-aware checks consume import
evidence: `route-handler-with-service`,
`route-http-middleware-only`, and
`external-api-comment-only`. After the
import-helper-compatibility implementation
(`cce837f`), all three consume EvidenceGraph import
facts via the compatibility-aware
`listImportTargetsForFile` helper rather than matching
`fact.subject` raw.

**Evidence precedence (v4).** When EvidenceGraph
import facts exist for the finding's file, they are
**authoritative** over `Finding.details.imports`. The
order is:

1. `EvidenceGraph` import facts (via
   `listImportTargetsForFile`).
2. `Finding.details.imports` (fallback when no
   EvidenceGraph imports exist for the file).
3. `ObservedRepo.files` sibling lookup (only the
   `route-handler-with-service` check; fires when
   neither import source yields evidence).

This mirrors the
`nextjs-route-convention` v3 invariant: artifact-backed
graph evidence beats detector-supplied details. The
`details.imports` branch is the fallback, not the
default.

**Evidence strings.** Each decision's `evidence`
string names the source explicitly so audit
consumers (filter-health, agent contract, operator
review) can tell at a glance which branch fired:

- `EvidenceGraph import facts show route delegates to
  handler: '<target>'.`
- `Detector import details show route delegates to
  handler: '<target>'.`
- `ObservedRepo file index shows route has sibling
  handler file: '<path>'.`
- `EvidenceGraph import facts show route imports only
  HTTP / Identity middleware infra: <imports>.`
- `EvidenceGraph import facts contain no external API
  package imports (openai / openrouter / @openai/*)
  for '<file>': <targets>.`
- `Detector import details (explicitly empty imports
  list) contain no external API package imports …`

**`usedArtifacts` tracking.** Decisions consulted via
EvidenceGraph return `usedArtifacts: ["EvidenceGraph"]`;
decisions consulted only via `details.imports` return
`usedArtifacts: []`. The runtime cites
`EvidenceGraph` in
`FindingFilterReport.header.inputRefs` exactly when at
least one decision in the run consulted it.

**Operator review.** The
[graph-aware import evidence operator review](../strategy/graph-aware-import-evidence-operator-review.md)
consumes the diagnostic surface below against
available fixtures and recommends **Option C (defer
producer migration) for alpha** — keep the helper
compatibility implementation; revisit producer
migration only when one of the four triggers
documented in the
[import-fact subject-shape decision memo](../strategy/import-fact-subject-shape-decision.md)
fires. The
[refresh](../strategy/graph-aware-import-evidence-operator-review-refresh.md)
re-runs the same data-gathering protocol against the
three deterministic regression fixtures (shipped at
`702afbf`) and confirms Option C against measured
data: EvidenceGraph attribution 3 across the three
fixtures, DetectorDetails 0, ObservedRepo 0, no
fallback-dominance alert fires. The
[v2 review](../strategy/graph-aware-fixture-coverage-operator-review-v2.md)
re-runs the protocol against the now-six
deterministic fixtures (the three above plus
`route-http-middleware-only`, `factory-file`, and
`module-gate` shipped at `b2f74b8`). The v2 baseline
diagnostics were **EvidenceGraph 4, DetectorDetails
2, ObservedRepo 0**. All four migration triggers
re-evaluated — none met. **Option C remains the
alpha decision.** The v2 review identified
`factory-file-creates-deps` and
`module-gate-verified-caller` as the next
evidence-strengthening candidates.

The
[factory / module-gate evidence strengthening v1](../strategy/factory-module-gate-evidence-strengthening.md)
implementation slice landed next. Each of those
two filters gained a new top-priority EvidenceGraph
branch that consumes `listSymbolsForFile` +
`listExportsForFile` and matches canonical factory /
gate-evaluator names (`*Factory`, `create*` +
factory-path; `*GateEvaluator`, `evaluate*Gate`).
All existing path / ObservedSystem.kind /
CapabilityMap branches survive as fallback.
**Post-strengthening aggregate fixture
attribution: EvidenceGraph 6, DetectorDetails 0,
ObservedRepo 0** (against the committed fixtures;
path fallback still fires for repos with
non-canonical symbol/export names). The
[v3 operator review](../strategy/graph-aware-fixture-coverage-operator-review-v3.md)
re-ran the protocol against this baseline,
re-confirmed Option C, and recorded the
**graph-aware v1 / v2 / v3 arc as alpha-complete**:
every shipped graph-aware reason has deterministic
fixture coverage; every fixture positive is
artifact-backed; no remaining reason needs further
strengthening before alpha.

**Regression fixtures.** Six deterministic
fixtures under `tests/fixtures/graph-aware-filters/`
cover every graph-aware reason end-to-end. The
first three (`route-handler`, `external-comment`,
`nextjs-route`) exercise the EvidenceGraph branches
of `route-handler-with-service`,
`external-api-comment-only`, and
`nextjs-route-convention`. Each fixture
is a small JS/TS source tree that `rekon refresh`
projects into an EvidenceGraph; the test seeds a
synthetic `FindingReport` and runs the filter
pipeline. The contract test
`tests/contract/graph-aware-filter-fixtures.test.mjs`
pins `evidenceSource: "EvidenceGraph"` on every
matched finding, EvidenceGraph citation in
`FindingFilterReport.header.inputRefs`,
EvidenceGraph attribution in
`FindingFilterHealthSummary.graphAwareByEvidenceSource`,
and end-to-end rendering of the EvidenceGraph
diagnostic surface in the architecture summary +
agent contract publications. Three additional fixtures
(`route-http-middleware-only`, `factory-file`,
`module-gate`) shipped in the fixture-coverage-v2
slice and exercise the remaining three graph-aware
checks (`route-http-middleware-only` —
EvidenceGraph branch via real source imports;
`factory-file-creates-deps` — path-evidence branch
attributing as `DetectorDetails`;
`module-gate-verified-caller` — GateEvaluator path
signal attributing as `DetectorDetails`). The
route-http fixture additionally includes a negative
case (a route importing `/infra/Database/...`) that
asserts the graph-aware filter correctly does NOT
fire. All six fixtures are
regression data, not product examples — they live
under `tests/fixtures/`, not `examples/`.

**`evidenceSource` per-FilteredFinding attribution.**
The graph-aware import evidence publication
diagnostics slice adds an additive optional
`evidenceSource` field on each `FilteredFinding`:
`EvidenceGraph` / `ObservedRepo` / `DetectorDetails`
(graph-aware stages) or `Policy` / `BuiltIn` /
`ResultFilter` (non-graph-aware stages). Precedence
inside a single graph-aware decision: EvidenceGraph >
ObservedRepo > DetectorDetails. `FindingFilterHealthSummary`
exposes `byEvidenceSource`,
`graphAwareByEvidenceSource`,
`graphAwareReasonEvidenceSources`, and
`dominantGraphAwareEvidenceSource`. Three new advisory
alerts surface when graph-aware filtering leans on
fallback evidence:
`graph-aware-details-fallback-dominance`,
`graph-aware-observedrepo-fallback-dominance`,
`graph-aware-evidencegraph-low-usage`. Architecture
summary renders a `Graph-Aware Evidence Sources` table
+ per-reason × per-source breakdown; agent contract
renders a compact `Graph-aware evidence sources:` list
under Finding Filter Health and adds a new "Do Not Do"
reminder against treating detector-detail fallback as
equivalent to EvidenceGraph-backed structural
evidence.

## Conservative No-Op

When the artifacts the provider would consult are missing,
the relevant check **does not fire**. The provider does
not guess. The pipeline behaves exactly like the v2 filter
stack when no `graphContext` is supplied.

The runtime is conservative too: `FindingFilterReport.header.inputRefs`
cites a graph artifact only when at least one graph-aware
match actually used that specific artifact. v2 sharpened
this further — each
[`FindingGraphFilterDecision`](../artifacts/finding-filter-report.md)
returns a `usedArtifacts` list (`"ObservedRepo"`,
`"EvidenceGraph"`, `"OwnershipMap"`, `"CapabilityMap"`,
`"GraphSlice"`) identifying which artifacts contributed
structural evidence. `applyFindingFilters` collects these
across the run into a deduped `graphArtifactsUsed` array;
the runtime filters its loaded graph-input refs by that
set so the audit lists exactly the artifacts the report
depended on (an artifact loaded but never matched against
is *not* cited).

## v2 Helpers

`@rekon/kernel-findings` exports pure deterministic helpers
that read the structural `Like` types so external rule
packs (and tests) can compose graph-aware logic without
re-implementing path normalization:

- `normalizeRepoPath(path)` — strips leading `./` /
  backslashes; rejects absolute paths and `.rekon/`
  artifact paths (returns the empty string).
- `sameRepoPath(a, b)` — comparison over normalized paths.
- `siblingPath(filePath, siblingName)` — computes the
  sibling path in the same directory.
- `listObservedRepoFiles(ctx)` — sorted, deduped,
  normalized `ObservedRepo.files`.
- `observedRepoHasFile(ctx, path)` — membership test
  against `ObservedRepo.files`.
- `findSiblingFile(ctx, filePath, siblingName)` — returns
  the sibling path when present in `ObservedRepo.files`,
  `undefined` otherwise.
- `listImportTargetsForFile(ctx, filePath)` — reads
  `EvidenceGraph` import facts and returns sorted,
  deduped `value.target` strings. Compatibility-aware:
  a private `matchesFileSubject` predicate accepts both
  the legacy producer shape
  (`subject = "<file>:<target>"`,
  `value: { source, target }`) and the future
  file-subject shape (`subject = <file path>`,
  `value: { target, ... }`). A fact that matches under
  multiple branches contributes its target once. See
  the
  [import fact subject-shape decision memo](../strategy/import-fact-subject-shape-decision.md).
  **Consumers must use this helper for file-scoped
  import lookups** — raw `fact.subject` matching is
  permitted only by the fact's owning producer or by
  tests that own the exact shape.
- `fileImportsTargetMatching(ctx, filePath, predicate)` —
  filters the import targets through a predicate.
  Inherits the same `matchesFileSubject` compatibility
  predicate so external rule packs see identical
  file-scoped lookup behavior across both helpers.
- `listExportsForFile(ctx, filePath)` — reads
  `EvidenceGraph` export facts (`kind === "export"`) and
  returns `FileExportSummary[]` sorted by name + kind.
  Substrate v1; no graph-aware filter consumes it yet.
- `listSymbolsForFile(ctx, filePath)` — reads
  `EvidenceGraph` symbol facts (`kind === "symbol"`) and
  returns `FileSymbolSummary[]` sorted by name + kind.
  Substrate v1; no graph-aware filter consumes it yet.

All helpers are synchronous and side-effect-free. No fs
reads, no LLM, no semantic logic.

## Audit Trail

Every graph-aware match becomes a `FilteredFinding` with:

- `source: "system"`,
- a reason from the graph-aware set (these reason codes are
  shared with the v2 classic content filter; see "Filter
  Health Bucketing" below for how filter-health distinguishes
  the two),
- a deterministic `evidence` string naming the structural
  signal (sibling file path, infra-only imports,
  EvidenceGraph import facts, capability id, ObservedSystem
  kind),
- `confidence: "high"` for path-evidence and direct import
  matches; `confidence: "medium"` for indirect evidence
  (capability map, ownership-map → kind),
- `filteredAt` ISO timestamp.

Raw `FindingReport` is never mutated. Filtered findings
remain inspectable in `FindingFilterReport.filteredFindings`.

## Filter Health Bucketing

`FindingFilterHealthReport.summary` keeps each pipeline
stage in its own mutually-exclusive bucket. Graph-aware
matches are counted in `graphAwareFiltered`, not in
`contentFiltered` — even though both stages can emit the
same five reason codes (`route-handler-with-service`,
`route-http-middleware-only`, `external-api-comment-only`,
`factory-file-creates-deps`, `module-gate-verified-caller`).
Filter-health classifies each entry by inspecting its
`source` and reason:

1. `policyFiltered` — `source === "policy"` (or `policyId`
   is set). Takes precedence so an operator who pins a
   policy to a graph-aware reason code still sees their
   policy attribution.
2. `graphAwareFiltered` — non-policy entry whose reason is
   one of the six graph-aware codes (the five v1 / v2
   reasons plus `nextjs-route-convention`, which was
   moved from the classic content bucket in the v3
   slice).
3. `contentFiltered` — non-policy entry whose reason is one
   of the remaining 11 classic content reasons.
4. `resultFiltered` — `source === "result-filter"`.
5. `builtInPathFiltered` — the broad path / heuristic codes.

Counts always sum to `totalFiltered`. The summary also
includes:

- `byGraphAwareReason` — per-reason count computed only over
  entries that pass `isGraphAwareFiltered` (so policy
  entries sharing a reason code do not inflate the table).
- `filterRateByGraphAwareReason` — rates rounded to four
  decimals.
- `dominantGraphAwareReason` — `{ reason, count, rate }` with
  alphabetic tiebreak.

Two alerts surface when graph-aware filtering looks
suspicious (both gated on `totalFindings >= 5`):

- `graph-aware-filter-dominance` — graph-aware bucket
  consumes >= 50 % of all findings.
- `graph-aware-reason-dominance` — one graph-aware reason
  consumes >= 50 % of all findings.

Architecture summary and agent contract publications render
a `Graph-Aware Filter Reasons` table sourced from
`byGraphAwareReason` plus an audit pointer that tells the
operator (and any agent reading the contract) to inspect
`FindingFilterReport.filteredFindings` when the count is
non-zero. The agent contract also carries a "Do Not Do"
entry reminding agents that graph-aware filtering is
structural evidence, not proof that the underlying issue
never existed.

## What This Is Not

- **Not a monolithic `GraphOntologyValidator` port.** Per
  the
  [audit](../strategy/graph-ontology-validator-lite-audit.md),
  Rekon reproduces the *outcome* (filtered findings with
  structural evidence), not classic's architecture.
- **Not a source scraper.** The provider consumes
  artifacts only. No filter-time fs reads beyond the
  artifact store.
- **Not LLM / semantic / fuzzy / embedding-based.**
  Permanently rejected.
- **Not framework-specific.** v1 ports the five most
  generally-useful checks; deeper Next.js / DDE /
  provider catalogs are deferred to a future slice.
- **Not a status surface.** `accepted` / `ignored` /
  `resolved` decisions remain in `FindingStatusLedger`.

## CLI Surface

No new CLI command. Existing commands now consume graph
artifacts:

```sh
rekon findings filter --root <repo> --json
rekon findings filter-health --root <repo> --json
rekon refresh --root <repo> --json
```

`rekon refresh` runs `observe` and `project` before
`findings.filter`, so graph artifacts are always available
during the filter step.

## Cross-References

- [GraphOntologyValidator-lite audit](../strategy/graph-ontology-validator-lite-audit.md)
- [Capability Ontology Architecture Impact Review](../strategy/capability-ontology-architecture-impact-review.md)
  — pins the boundary between the
  structural graph-aware filters
  documented here and the future
  canonical-purpose translation
  layer. Phase-3 in that review
  schedules an opt-in policy
  provider that filters by canonical
  capability purpose; until that
  phase ships, graph-aware filters
  remain structural-only.
- [Capability Ontology Translation Layer Decision](../strategy/capability-ontology-translation-layer-decision.md)
  — pins the layered ontology
  shape (eight layers from raw
  evidence to preservation
  contracts) and selects Option C
  (layered config-first ontology
  + artifact-backed normalization
  report). The future
  capability-purpose filter
  provider listed in phase 3 of
  the architecture impact review
  will consume the
  `CapabilityNormalizationReport`
  artifact registered by that
  decision's v1 implementation
  slice. Until that artifact
  ships, the graph-aware filters
  documented here remain
  structural-only.
- [Finding filters](finding-filters.md)
- [Finding filter policy status](finding-filter-policy-status.md)
- [Finding filter policy suggestions](finding-filter-policy-suggestions.md)
- [FindingFilterReport artifact](../artifacts/finding-filter-report.md)
- [FindingFilterHealthReport artifact](../artifacts/finding-filter-health-report.md)
- [Refresh pipeline](refresh.md)
- [Beta readiness / remaining classic-parity review](../strategy/beta-readiness-classic-parity-review.md)
- [Capability-Aware Architecture Linting Decision](../strategy/capability-aware-architecture-linting-decision.md)
  — thirty-seventh slice; commits Rekon to a future
  `CapabilityArchitectureLintReport` artifact that
  evaluates `CapabilityContract` placement rules.
  The decision pins that **the lint artifact is not
  `FindingReport` in v1** and that **only a later
  explicit bridge may promote lint rows into governed
  findings** — when that bridge ships, the resulting
  findings will flow through the existing finding
  filter chain documented here (the filter chain is
  not bypassed). Until the bridge decision lands, no
  finding consumer reads
  `CapabilityArchitectureLintReport`.
- [`CapabilityArchitectureLintReport` artifact](../artifacts/capability-architecture-lint-report.md)
  — thirty-eighth slice; v1 evaluation artifact
  shipped. **The finding filter chain documented
  here is NOT bypassed** — the lint artifact emits
  evaluation rows independently and does not enter
  `FindingReport`, `FindingFilterReport`, or
  `FindingLifecycleReport` in v1. A future explicit
  bridge slice would be required before lint rows
  could flow through this filter chain.
- [Capability-Aware Architecture Linting Safety Review](../strategy/capability-architecture-lint-report-safety-review.md)
  — thirty-ninth slice; read-only audit confirming the
  lint report does NOT mutate `FindingFilterReport` or
  bypass this filter chain. Declares v1 safe / stable
  and selects publication surfacing (not a finding
  bridge) as the next slice.
- [Capability-Aware Architecture Linting Publication Safety Review](../strategy/capability-architecture-lint-publication-safety-review.md)
  — forty-first slice; read-only audit confirming the
  publication surfacing does NOT mutate
  `FindingFilterReport` or bypass this filter chain.
  Declares the surfacing safe / stable as read-only
  visibility; the `CapabilityArchitectureLintReport` →
  `FindingReport` bridge decision (next slice) must
  preserve this filter chain if any lint row is ever
  promoted.
- [CapabilityArchitectureLintReport → FindingReport bridge decision](../strategy/capability-lint-finding-bridge-decision.md)
  — forty-second slice; selects an intermediate
  `CapabilityLintFindingBridgeReport` **preview** artifact
  before any `FindingReport` writer. The bridge report
  writes no `FindingReport` and **does NOT bypass this
  filter chain**. Even after a future `FindingReport`
  writer ships, any promoted candidate must flow through
  these graph-aware finding filters before reaching the
  status ledger, adjudication, or `CoherencyDelta`.
- [CapabilityLintFindingBridgeReport artifact](../artifacts/capability-lint-finding-bridge-report.md)
  — forty-third slice; the preview bridge report shipped. It
  classifies lint rows as eligible / ineligible /
  needs-review but writes no `FindingReport` and **does NOT
  bypass this filter chain**. Promotion of any eligible
  candidate requires a separate explicit writer decision and
  still flows through these filters.
- [CapabilityLintFindingBridgeReport safety review](../strategy/capability-lint-finding-bridge-report-safety-review.md)
  — forty-fourth slice; read-only review confirming the bridge
  does not bypass this filter chain and declaring it safe /
  stable.
- [Capability lint finding bridge concept](capability-lint-finding-bridge.md)
- [Capability-Aware Architecture Linting concept](capability-aware-architecture-linting.md)
