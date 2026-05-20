# GraphOntologyValidator-Lite Audit

> **Status:** decision memo + v1 in-progress. This document
> records which classic `GraphOntologyValidator` checks
> Rekon should port, which it already covers via the
> existing filter stack, which it should defer, and what
> artifact-backed shape any future implementation should
> take.
>
> **v1 update:** the five port-soon candidates have shipped
> via the **graph-aware finding filter provider v1**
> (`applyFindingGraphFilters` in `@rekon/kernel-findings`).
> See [`docs/concepts/graph-aware-finding-filters.md`](../concepts/graph-aware-finding-filters.md)
> for the runtime behavior. The audit remains the
> authoritative decision memo for everything beyond v1.
>
> **v2 update:** the five v1 checks have been strengthened
> with artifact-backed file-existence and import-evidence
> via the **graph-aware finding filter provider v2**.
> `EvidenceGraph` import facts are now preferred over
> `Finding.details.imports`; `ObservedRepo.files` supports
> sibling-file checks for route-handler-with-service; each
> decision returns `usedArtifacts` so
> `FindingFilterReport.header.inputRefs` cites only the
> artifacts that actually contributed. The graph-aware
> stage now runs *before* classic content so when the same
> finding can be matched by both, the audit credits the
> stronger artifact-backed source. No new reason codes,
> no source reads, no LLM / semantic / fuzzy logic, no
> monolithic validator.
>
> **v3 decision memo:** see
> [`docs/strategy/graph-aware-filter-provider-v3-decision.md`](graph-aware-filter-provider-v3-decision.md).
> The memo concludes that **no broad v3 catalog ships
> next**. Every remaining candidate either needs a missing
> artifact projection first, is project-specific (belongs
> in an external rule pack), or is permanently rejected.
> The recommended next implementation slice is the
> **`EvidenceGraph` export / symbol facts projection v1**
> — the substrate that unblocks 3–4 v3 candidates at
> once.
>
> **Substrate update:** the
> `EvidenceGraph` export / symbol facts projection v1 has
> shipped. `@rekon/capability-js-ts` now emits
> `kind: "export"` and `kind: "symbol"` facts with rich
> `{ name, kind, default?/exported? }` value shape, and
> `@rekon/kernel-findings` exports `listExportsForFile` /
> `listSymbolsForFile` helpers.
>
> **v3 check shipped:** the first v3 candidate check that
> consumes the new export-facts substrate has shipped — a
> graph-aware variant of `nextjs-route-convention` that
> reads `listExportsForFile` to confirm a route file's
> non-handler named exports are all in the Next.js
> segment-config set. When export facts exist, they are
> authoritative over `details.otherExports`. The legacy
> classic content filter remains as a fallback when no
> graph facts exist. `nextjs-route-convention` moved from
> `CLASSIC_CONTENT_FILTER_REASONS` to
> `GRAPH_AWARE_FILTER_REASONS`; filter-health now buckets
> matches as `graphAwareFiltered`. No new reason codes,
> no source reads, no LLM / semantic / fuzzy logic, no
> monolithic validator port.
>
> **Import fact subject-shape decision:** see
> [`docs/strategy/import-fact-subject-shape-decision.md`](import-fact-subject-shape-decision.md).
> Strategy-only memo (no runtime change) deciding how to
> handle the inconsistency between the new export /
> symbol facts (`subject = file path`) and the legacy
> import facts (`subject = "<file>:<target>"`).
> Recommends Option B — keep the legacy producer shape,
> make `listImportTargetsForFile` (and any future
> file-scoped import helper) compatibility-aware, and
> preserve full producer migration as a future trigger.
> Helper compatibility implementation has shipped
> (`cce837f`); graph-aware import-fact consumers v4 has
> shipped (`route-handler-with-service` precedence
> swapped so EvidenceGraph runs first; all three
> import-consuming filters name the evidence source);
> graph-aware import evidence publication diagnostics
> has shipped (every `FilteredFinding` carries
> `evidenceSource`; filter-health summarizes
> evidence-source distribution; architecture summary +
> agent contract render evidence-source tables; three
> new fallback-dominance alerts feed the future Option
> A migration decision).
>
> **Operator review:** see
> [`docs/strategy/graph-aware-import-evidence-operator-review.md`](graph-aware-import-evidence-operator-review.md).
> Strategy memo (no runtime change) that consumes the
> new diagnostic surfaces against available fixture
> data and recommends **Option C (defer producer
> migration) for alpha**. Zero of the four migration
> triggers documented in the import-fact subject-shape
> decision memo are currently met.
>
> **Operator review refresh:** see
> [`docs/strategy/graph-aware-import-evidence-operator-review-refresh.md`](graph-aware-import-evidence-operator-review-refresh.md).
> Re-runs the prior memo against the deterministic
> regression fixtures shipped at `702afbf`. Measured
> diagnostics confirm EvidenceGraph-backed graph-aware
> filtering works end-to-end through helper
> compatibility (every fixture →
> `graphAwareByEvidenceSource.EvidenceGraph === 1`).
> **Option C remains the alpha decision.**

## Decision Summary

- **Do not port `GraphOntologyValidator` as a monolithic
  service.** Classic's validator coupled rule resolution,
  graph construction, source scraping, and exception
  matching into one trust layer. Recreating that shape
  would couple Rekon's filtering pipeline to source IO,
  bypass the artifact-first guarantee, and recreate the
  classic "one service knows everything" problem.
- **Build `GraphOntologyValidator-lite` as a future
  Rekon-native filter layer that:**
  - consumes the existing artifacts
    (`FindingReport`, `EvidenceGraph`, `GraphSlice`,
    `ObservedRepo`, `OwnershipMap`, `CapabilityMap`),
  - emits `FindingFilterReport.filteredFindings` entries
    with explicit `reason` / `evidence` / `confidence` /
    `source: "system"`,
  - preserves the audit invariant (raw `FindingReport`
    never mutated; filtered findings stay inspectable in
    `FindingFilterReport`),
  - remains deterministic (no LLM, no semantic,
    no fuzzy / embedding matching, no source-file scraping
    outside artifacts).
- **Capability shape.** Recommended: a new
  capability-level **graph-aware finding filter
  provider** (option B in the work order) — externalizable,
  testable in isolation, consumes artifacts the runtime
  already produces. The kernel `applyFindingFilters`
  pipeline gets a new optional `graphContext` input that
  the provider populates; the pipeline calls the provider
  between the policy / content layers and the broad path
  heuristics. The provider does not mutate any artifact;
  it returns `{ reason, evidence, confidence }` matches
  that `applyFindingFilters` converts into
  `FilteredFinding` entries the same way it converts the
  existing classic content filters.
- **Scope.** The first implementation slice
  (**Graph-aware finding filter provider v1**) should
  port five candidate checks listed below — they ride on
  artifacts Rekon already produces (or projections that
  are trivially derivable). Everything else is explicitly
  deferred until the artifact substrate or operator
  experience demands it.

## Classic Behavior

Classic's `GraphOntologyValidator` is invoked by
`services/IssueDetectionService.ts` after the rule
engine produces raw findings but before the canonical
issue surface is persisted. It applies a chain of
structural checks that combine:

- **Repository structure facts** — file existence, file
  topology, sibling-file conventions (e.g. `route.ts` +
  `handler.ts`).
- **Import graph facts** — which symbols a file imports,
  which packages it depends on, whether a comment-only
  string is backed by a real import.
- **Layering / ownership facts** — module / system /
  layer membership, "verified caller" of a module gate,
  factory / DI provenance.
- **Framework-specific exceptions** — Next.js route
  config exports, DDE gate decisions, provider
  abstractions, UI HTTP-vs-DB conventions.
- **Path / content exceptions** — generated paths,
  test paths, external / vendor paths, comments-only
  references, SVG / `NODE_ENV` constants.

Filtered findings stay auditable in classic's
`filtered-issues.json`; the validator is **not** a delete
operation, it is an audit projection. That same shape
maps cleanly to Rekon's `FindingFilterReport`.

## Classic Checks / Signals

The table below enumerates every classic check the audit
inspected. Each row notes whether Rekon already covers
the check (`covered`), whether it should be ported in the
next slice (`port-soon`), or whether it should be
deferred (`defer`).

| # | Classic check | Signal | Status |
| --- | --- | --- | --- |
| 1 | Test file false-positive | `test`/`tests`/`__tests__`/`*.test.*`/`*.spec.*` path | **covered** (`test-file`, v1) |
| 2 | Generated file | `dist`/`build`/`generated`/`__generated__`/`.generated.` path | **covered** (`generated-file`, v1) |
| 3 | External / vendor file | `node_modules`/`vendor`/`third_party` path | **covered** (`external-file`, v1) |
| 4 | Canary file | `canary` substring in path | **covered** (`canary-file`, v1) |
| 5 | Same-directory import | `./neighbor` import (no `../`) | **covered** (`same-directory-import`, content/result v2) |
| 6 | SVG namespace URL | `http://www.w3.org/2000/svg` / `xlink` URL | **covered** (`svg-namespace-url`, v2) |
| 7 | `NODE_ENV` client read | only env var is `NODE_ENV` | **covered** (`client-env-node-env`, v2) |
| 8 | Client-safe infra import | `*Client*`, `*ClientBridge`, `*ClientLogger`, `*ClientPreferences` | **covered** (`client-safe-infra`, v2) |
| 9 | Empty constructor stub | `details.stubName === "constructor"`, `details.stubReason === "empty_body"` | **covered** (`empty-constructor-stub`, v2) |
| 10 | Storage-retrieval placeholder | `details.stubName` starts with `getStored` and returns null/undefined | **covered** (`storage-retrieval-placeholder`, v2) |
| 11 | Speculative anti-pattern wording | description contains `may indicate business logic` / `might indicate business logic` | **covered** (`speculative-anti-pattern`, v2) |
| 12 | Archetype inference note | empty `files[]`, description starts with `Topology contract inferred from archetype` | **covered** (`archetype-inference-note`, v2) |
| 13 | Hardcoded config not DDE | empty `decisionCapabilities`, all `decisionConcerns` config-shaped | **covered** (`hardcoded-config-not-dde`, v2) |
| 14 | UI HTTP provider abstraction | `details.concernTag === "ui_http_direct_call"`, hook path | **covered** (`ui-http-provider-abstraction`, v2) |
| 15 | UI hook uses HTTP not DB | description mentions DB + hook + UI + use*Admin/Fetch/Api/Query | **covered** (`ui-hook-uses-http-not-db`, v2) |
| 16 | Route handler with service | file ends `route.ts`, `details.imports` includes sibling `*/handler` | **covered (structurally)** (`route-handler-with-service`, v2). **Port-soon** for graph-backed file-existence confirmation. |
| 17 | Route HTTP middleware only | file ends `route.ts`, all infra imports under `/infra/http/` or `/infra/Identity` | **covered (structurally)** (`route-http-middleware-only`, v2). **Port-soon** for graph-backed confirmation. |
| 18 | External-API comment-only | architecture finding under `external_apis.calls_go_through_providers` with no `openai`/`openrouter`/`@openai/*` import | **covered (structurally)** (`external-api-comment-only`, v2). **Port-soon** for graph-backed import-fact confirmation. |
| 19 | Factory file creates deps | file is `Factory.ts` / `factory.ts` / `core/services/**/init/**` | **covered (structurally)** (`factory-file-creates-deps`, v2). **Port-soon** for capability-backed confirmation. |
| 20 | Next.js route convention | file ends `route.ts`, `details.otherExports` all in route config set | **covered** (`nextjs-route-convention`, v2) |
| 21 | Module gate verified caller | architecture finding under module-gate rule, file under `GateEvaluator`/`/modules/` or `details.owner.kind === "module"` | **covered (structurally)** (`module-gate-verified-caller`, v2). **Port-soon** for graph-backed ownership confirmation. |
| 22 | Sibling-handler file existence | confirm `route.ts` has a real sibling `handler.ts` on disk | **port-soon** (needs file-existence projection) |
| 23 | Import-fact import confirmation | confirm a finding's claimed imports actually exist in the resolved import graph | **port-soon** (needs `EvidenceGraph` import-fact lookup) |
| 24 | Owner-kind confirmation for module gate | confirm finding subject is owned by a module-kind system | **port-soon** (needs `OwnershipMap` + `CapabilityMap` lookup) |
| 25 | Factory by capability signal | confirm a "factory" file actually owns the capability it instantiates | **defer** until `CapabilityMap` strength is proven |
| 26 | Full architecture / DDE policy evaluator | mirror classic's DDE / provider / framework policy owners | **defer** — too coupled to classic source; needs Rekon-native rulebook first |
| 27 | Runtime truth graph | runtime-only correctness facts (e.g. only-called-once invariants) | **defer** — no runtime substrate yet |
| 28 | Source-reading exception classifier | scan finding's source file for inline comments / pragmas | **rejected** — violates artifact-first invariant; defer to a future "operator-supplied inline exception" workflow if needed |
| 29 | Semantic / LLM exception review | LLM proposes whether a finding is a false positive | **rejected** — never, per ADR |
| 30 | Persistent classic `filtered-issues.json` merge | reconcile across runs with classic's merge semantics | **defer** — Rekon already preserves audit history in `FindingFilterReport` artifacts; classic merge semantics not needed |

## Rekon Current Coverage

| Layer | What it covers | Where |
| --- | --- | --- |
| Built-in path heuristics | tests / generated / external / canary / explicit-exclusion / policy-exception / content-filter / other | `applyFindingFilters` v1 path filters (`@rekon/kernel-findings`) |
| Configured policy filters | operator-defined `findingFilters` in `.rekon/config.json` | filter policy v1 + apply safety v2 + freshness v2 + suggestion v2 |
| Classic-inspired content filters | 17 structural reasons (rows 5-21 above) | classic-content-result-filters v2 |
| Configured result filters | `minConfidence`, `severity`, `systems`, `pathExcludes` from `findingResultFilters` | classic-content-result-filters v2 |
| Filter-health diagnostics | counts, alerts, dominance, stale fingerprint | filter-health-publications v1 + filter-health-diagnostics v2 |
| Publication surfacing | architecture summary + agent contract render filter-health, freshness, suggestions, policy status | filter-health-publications v1 + filter-policy-suggestions-publications v2 + filter-policy-freshness v2 |
| Operator workflow | `rekon findings filter-policy status` per-policy view | filter-policy-status v1 |

**Missing (the gap this audit names):** graph / ontology-
backed checks that require **structural confirmation
beyond `Finding.details`**. Rows 16-19 and 21-24 of the
classic table either rely on detector-supplied `details`
that may not be present in every run, or need confirmation
against repo structure that Rekon does not currently
correlate at filter time.

## Gaps

1. **File-existence confirmation.** Classic confirms a
   `route.ts` finding's sibling `handler.ts` actually
   exists on disk. Rekon's v2 `route-handler-with-service`
   filter trusts the detector's `details.imports` payload
   and never confirms the sibling file. When detectors
   omit `details.imports`, the filter silently fails to
   fire even though the structural signal is present in
   `ObservedRepo`.
2. **Import-fact confirmation.** Classic confirms a
   `external_apis.calls_go_through_providers` finding by
   inspecting the file's actual imports. Rekon's v2
   `external-api-comment-only` filter trusts
   `details.imports`. The `EvidenceGraph` import facts
   are the more reliable source.
3. **Owner-kind confirmation.** Classic uses owner /
   module / layer facts to confirm "verified caller"
   status before suppressing a module gate finding.
   Rekon's v2 `module-gate-verified-caller` filter
   trusts `details.owner.kind`. `OwnershipMap` /
   `CapabilityMap` carry the same information when it
   is available, and they should be the source of truth.
4. **Detector-detail divergence.** Several content
   filters fire only when detectors emit a specific
   `details` payload. That is fine for the rule packs we
   own; it is fragile for third-party detectors that
   surface findings without the same `details`
   conventions. Graph-backed confirmation closes that gap.
5. **No graph-aware filter provider.** Rekon's filter
   pipeline currently runs `policy → classic content →
   built-in path → result`. There is no stage that
   consumes structural artifacts at filter time. The
   missing stage is a deterministic provider that pulls
   from `EvidenceGraph` / `GraphSlice` / `ObservedRepo`
   / `OwnershipMap` / `CapabilityMap`.

## Proposed Rekon-Native Shape

**Recommended shape:** a new capability-level
**graph-aware finding filter provider**. The capability
contract is sketched here; no code lands in this batch.

```ts
// future @rekon/capability-* package, e.g. capability-findings-graph
export interface GraphAwareFindingFilterProvider {
  id: string;                       // capability id
  produces: ["FindingFilterDecision"]; // ad-hoc kind, not a new artifact
  evaluate(input: {
    findings: Finding[];
    evidenceGraph?: EvidenceGraph;
    graphSlice?: GraphSlice;
    observedRepo?: ObservedRepo;
    ownershipMap?: OwnershipMap;
    capabilityMap?: CapabilityMap;
  }): Promise<ReadonlyArray<{
    findingId: string;
    reason: FindingFilterReason;
    evidence: string;
    filePath?: string;
    confidence: FindingFilterConfidence;
  }>>;
}
```

**Pipeline integration.** `applyFindingFilters` gains an
optional `graphContext?: GraphAwareFindingFilterContext`
input. When supplied, the kernel runs the graph stage
between content filters and broad path heuristics — the
same precedence order content filters use today — so a
graph-backed match always wins over a generic path
heuristic but never over an operator-supplied policy.
The runtime helper `buildFindingFilterReport` is the
natural caller; it loads the graph artifacts and
forwards them.

**Audit shape.** Every graph-aware match emits a
`FilteredFinding` with `source: "system"` and a reason
from the existing v2 set (`route-handler-with-service`,
`route-http-middleware-only`,
`external-api-comment-only`,
`factory-file-creates-deps`, `module-gate-verified-caller`).
Reusing the existing reason set means filter-health,
filter-policy-status, and publication rendering do not
need new wiring.

**Decision: option B (capability-level provider).**

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| **A.** Inside `@rekon/kernel-findings` as optional `graphContext` | Single home for all filter logic; easy unit tests | Couples kernel to repo-model + evidence types; hard to externalize | Reject |
| **B.** New capability-level filter provider | Externalizable, testable in isolation, fits the capability manifest model, can be replaced or extended by third parties | Slightly more wiring in `runtime` to load graph artifacts | **Recommended** |
| **C.** Runtime helper that composes findings + graph artifacts | Minimal new packages | No clean extension point; mixes orchestration with filter logic | Reject |

Why B: Rekon's existing capability surface
(`@rekon/capability-*`) is the layer that consumes
structural artifacts. The graph-aware filter is exactly
the kind of optional, swappable check that should live
there. The kernel stays focused on the
applyFindingFilters pipeline; the runtime stays focused
on wiring; the capability stays focused on the rule.

## Candidate Checks To Port

The first implementation slice (**Graph-aware finding
filter provider v1**) should port these five checks. All
five already have v2 "structural" filters; the v1 graph
provider strengthens them by adding artifact-backed
confirmation when the upstream detector did not emit
the right `details` payload.

| Check | Reason | Required artifact | Rekon coverage today | What the graph provider adds |
| --- | --- | --- | --- | --- |
| Route handler with sibling | `route-handler-with-service` | `ObservedRepo` (file paths) | content filter fires when `details.imports` mentions `*/handler` | confirm a sibling `handler.ts` exists in `ObservedRepo` even when `details.imports` is missing |
| Route HTTP middleware only | `route-http-middleware-only` | `EvidenceGraph` import facts | content filter fires when `details.imports` lists infra-only entries | confirm via `EvidenceGraph` import facts that the route's only resolved imports live under `/infra/http/` or `/infra/Identity` |
| External-API comment only | `external-api-comment-only` | `EvidenceGraph` import facts | content filter fires when `details.imports` lacks the SDK | confirm via import facts that no `openai` / `openrouter` / `@openai/*` import exists in the file |
| Factory file creates deps | `factory-file-creates-deps` | `OwnershipMap` + `CapabilityMap` | content filter fires on path `Factory.ts` / `factory.ts` / `core/services/**/init/**` | confirm via `CapabilityMap` that the file actually owns the capability it instantiates |
| Module gate verified caller | `module-gate-verified-caller` | `OwnershipMap` + `CapabilityMap` | content filter fires when `details.owner.kind === "module"` or path matches | confirm via `OwnershipMap` that the file's owning system is module-kind |

These reasons already exist in the
`FindingFilterReason` union, so the graph provider does
not need any new reason codes. Filter-health,
filter-policy-status, and publication rendering all
already know how to render them.

## Checks To Defer

Defer until later slices, with rationale:

- **Full graph ontology validation suite.** Wholesale
  port of classic's validator. Would re-introduce the
  monolithic coupling the audit explicitly rejects.
  Revisit only when the substrate has at least three
  more graph-aware filters in production.
- **Framework-specific exception catalog (DDE / Next.js
  / provider semantics).** Beyond the five candidate
  checks. Requires a Rekon-native rulebook expansion
  before the catalog can be expressed declaratively.
- **Runtime truth graph.** Rekon has no runtime
  substrate yet (no `RuntimeLinkReport` artifact, no
  trace facts beyond `runtime_link` in the
  `EvidenceGraph` kind list). Defer until that substrate
  exists.
- **Source-reading validator service.** Reading source
  files directly during filtering would violate the
  artifact-first invariant. Defer (and probably reject).
  If a check truly needs source text, the right move is
  to add an evidence provider that emits artifact facts
  the filter can consume, not to read source from the
  filter.
- **Deep Next.js / DDE / provider semantic owner
  parsing.** Classic owns several "policy owner" parsers
  that resolve which module owns which architectural
  concern. Defer until `CapabilityMap` strength is
  proven by the five candidate checks.
- **Persistent `filtered-issues.json` merge semantics.**
  Rekon's `FindingFilterReport` artifact + freshness
  semantics already carry the audit; classic's merge
  semantics are not needed.

## Rejected Porting Approach

- **Reject:** porting `GraphOntologyValidator` as a
  single service that knows about every check. Rationale:
  the value classic provides is the **outcome** (filtered
  findings with structural evidence), not the
  **architecture** (one service that scrapes source +
  reads rules + builds graph + applies exceptions). The
  Rekon-native shape splits those into evidence
  providers (already exist) and a thin filter provider
  (new), keeps the artifact-first invariant, and lets
  individual checks ship one at a time.
- **Reject:** filter logic that reads source files
  directly. The filter must consume artifacts, not
  scrape source. If a check needs source text, the
  upstream evidence provider should surface the relevant
  facts.
- **Reject:** LLM / semantic / fuzzy filtering.
  Permanently. (Per ADR.)
- **Reject:** filter logic that mutates `FindingReport`
  or `FindingFilterReport`. Filtering is a projection,
  not mutation. (Per ADR.)

## Required Artifact Inputs

Per-check input table. "Available" means the artifact
exists in Rekon today; "Missing" names what would have
to be added or strengthened before the check can run.

| Check | Inputs | Available? | Missing / weak | Suggested producer |
| --- | --- | --- | --- | --- |
| Route handler with sibling | `FindingReport`, `ObservedRepo` file list | partially | stable file-existence projection — `ObservedRepo` lists `systems[].paths` but not every file individually | enrich `ObservedRepo` with a flat `files: string[]` field, or add a small `RepoFileIndex` projection |
| Route HTTP middleware only | `FindingReport`, `EvidenceGraph` import facts (`kind: "import"`) | yes (when import provider runs) | provider coverage may be incomplete on third-party repos | continue improving language / framework evidence providers |
| External-API comment only | `FindingReport`, `EvidenceGraph` import facts | yes | same as above | same |
| Factory file creates deps | `FindingReport`, `OwnershipMap` entries, `CapabilityMap` entries | yes, but strength varies by repo | capability evidence may be weak in repos without explicit capability annotations | strengthen capability evidence providers |
| Module gate verified caller | `FindingReport`, `OwnershipMap` entries, `CapabilityMap` (for `kind: "module"` system membership) | yes, but module-kind classification is convention-based | a `system.kind` field on `ObservedSystem` would make module-kind detection unambiguous | additive optional field on `ObservedSystem.kind?: "module" | "package" | ...` |

If a producer is missing, the audit's stop condition is:
**add the projection first, then the filter**. Building
filter logic that quietly returns no matches because the
upstream artifact is empty would defeat the audit.

## Future Regression Tests

When the graph-aware finding filter provider v1 ships,
the contract test must assert these scenarios. Each
mirrors a row in the candidate-checks table.

1. **route.ts with sibling handler.ts** filters as
   `route-handler-with-service` when the upstream
   detector omits `details.imports` but the
   `ObservedRepo` shows the sibling.
2. **route.ts importing only `/infra/http/*` and
   `/infra/Identity`** (per `EvidenceGraph` import facts)
   filters as `route-http-middleware-only` regardless of
   `details.imports`.
3. **Factory file creating dependencies** filters as
   `factory-file-creates-deps` when the file's owning
   capability matches the rule-id signal in
   `CapabilityMap`.
4. **External API mention in description but no SDK
   import** filters as `external-api-comment-only` when
   `EvidenceGraph` import facts confirm the file does
   not import `openai`/`openrouter`/`@openai/*`.
5. **Module gate evaluator with verified caller**
   filters as `module-gate-verified-caller` when
   `OwnershipMap` confirms the file's owning system is
   module-kind.
6. **Filtered findings remain auditable.** All five
   above produce `FilteredFinding` entries with
   `source: "system"` and the matching reason. The full
   `Finding` payload is preserved in
   `FindingFilterReport.filteredFindings`.
7. **Raw `FindingReport` unchanged.** Byte-identical
   before / after a graph-aware run.
8. **Lifecycle / adjudication / coherency exclude
   graph-filtered findings.** The same exclusion
   guarantee the existing classic-content filters carry.
9. **Provider runs deterministically.** Same artifact
   inputs produce the same `FilteredFinding` outputs
   (sorted, stable evidence strings).
10. **Provider degrades gracefully.** When
    `EvidenceGraph` / `GraphSlice` / `ObservedRepo` /
    `OwnershipMap` / `CapabilityMap` are missing or empty,
    the provider returns zero matches and **does not
    throw**. The kernel pipeline falls through to the
    existing content / built-in / result filters.
11. **No source-file reads.** The provider's
    implementation must use only the supplied artifact
    inputs. Tested by hermetic synthetic-artifact tests
    that pass deliberately fake repo roots.
12. **Filter health surfaces graph matches in
    diagnostics.** Existing
    `content-filter-high-volume` / `dominant-reason` /
    `content-filter-dominance` alerts already fire on the
    reason codes the graph-aware provider shares with v2.
    The graph-aware-filter-health-publications v1 slice
    additionally splits `graphAwareFiltered` into its own
    bucket and ships two new alerts
    (`graph-aware-filter-dominance`,
    `graph-aware-reason-dominance`) so operators can tell
    *which* layer is doing the suppression. The
    architecture-summary and agent-contract publications
    render a dedicated "Graph-Aware Filter Reasons" table
    plus an audit pointer, and the agent contract carries a
    "Do Not Do" reminder warning agents not to treat
    graph-aware filtering as proof the underlying issue
    never existed.

## Recommended Implementation Order

When the graph-aware finding filter provider v1 slice
runs, it should follow this order:

1. **Ship the artifact projections the audit names** —
   the flat file index (or `ObservedRepo.files`), the
   optional `ObservedSystem.kind`. Tests + docs only at
   first; provider isn't wired yet.
2. **Build the capability skeleton** —
   `GraphAwareFindingFilterProvider` interface,
   capability manifest, runtime wiring that loads the
   five artifacts and threads them into
   `applyFindingFilters` via the new
   `graphContext` input.
3. **Port the five candidate checks one at a time** in
   the order listed in the candidate table. Each check
   ships with the relevant regression test and a CLI
   smoke against `examples/simple-js-ts`.
4. **Document under
   `docs/concepts/finding-filters.md`** as a new
   "Graph-aware filters" section that complements the
   existing "Classic Content Filters" /
   "Classic Result Filters" sections.
5. **Update the ADR** Implementation Order: flip the
   "Graph-aware finding filter provider v1" step from
   `(future)` to `(shipped)`.
6. **Update strategy docs** (subsystem-purpose-map,
   behavior-roadmap, guarantee-regression-plan, roadmap)
   the same way every prior P1.1 slice has done.

## v3 Decision Follow-up

The graph-aware finding filter provider v3 decision memo
has shipped at
[`docs/strategy/graph-aware-filter-provider-v3-decision.md`](graph-aware-filter-provider-v3-decision.md).

The memo's conclusions, summarized for this audit:

- **No broad v3 catalog ships next.** Every remaining
  classic check (rows 25-30 of the table above, plus the
  ten candidates enumerated in the v3 memo) either needs
  a missing artifact projection first, is project-specific
  (belongs in an external rule pack), or is permanently
  rejected.
- **Three required artifact projections** were identified
  in priority order: (1) `EvidenceGraph` export / symbol
  facts, (2) `CapabilityMap.entries[].role?: string`,
  (3) call-graph / referrer evidence (helper or new
  `EvidenceFact` kind).
- **Recommended next implementation slice:** the
  **`EvidenceGraph` export / symbol facts projection v1**
  — the substrate that unblocks 3–4 v3 candidate checks
  at once.

The v3 memo reaffirms every rejection in this audit:
no monolithic `GraphOntologyValidator` port, no
source-reading filters, no LLM / semantic / fuzzy /
embedding matching, no project-specific catalogs in
core.

## Graph-Aware Fixture Coverage Operator Review v2

The
[graph-aware fixture coverage operator review v2](graph-aware-fixture-coverage-operator-review-v2.md)
re-ran the operator review against the now-six
deterministic fixtures and re-confirmed Option C for
alpha: helper compatibility holds; no import producer
migration; none of the four migration triggers met.
The v2 review also identifies the next
evidence-strengthening targets relevant to this audit:
**`factory-file-creates-deps` and
`module-gate-verified-caller` attribute as
`DetectorDetails` because their current path-evidence
branches set `usedArtifacts: []`.** Strengthening them
would extend the v3 memo's required-projections list
in a concrete direction:

- A **role / kind projection** for factory-shaped
  files (`role: "factory"` on a CapabilityMap entry,
  or a first-class EvidenceGraph `factoryRole` fact).
- An **ObservedSystem.kind / OwnershipMap projection**
  for module-gate-shaped files (`kind === "module"`
  on `/modules/<name>/` directory roots, or an
  ownership tag for gate evaluators).

Neither requires a monolithic `GraphOntologyValidator`
port, source reads, or LLM / semantic matching — both
are deterministic, capability-author-declarable
projections that fit cleanly into the existing
EvidenceGraph / CapabilityMap / ObservedSystem
substrate.

**Update:** the
[factory / module-gate evidence strengthening](factory-module-gate-evidence-strengthening.md)
slice took the smallest viable approach — adding
`EvidenceGraph` symbol/export branches at the top of
`graphFilterFactoryFileCreatesDeps` and
`graphFilterModuleGateVerifiedCaller`. The existing
`ObservedSystem.kind === "module"` branch on the
module-gate filter is unchanged and remains the future
entry point for a deferred projector slice that gives
factory / module-gate files first-class structural
system evidence. No new artifact type, no monolithic
port, no source reads — exactly the scope this audit
endorsed.

The
[graph-aware fixture coverage operator review v3](graph-aware-fixture-coverage-operator-review-v3.md)
re-ran the operator-review protocol against the
post-strengthening attribution profile and recorded
the **graph-aware v1 / v2 / v3 arc as
alpha-complete**: every shipped graph-aware reason
has deterministic fixture coverage; every fixture
positive is `EvidenceGraph`-backed; the v1 / v2 / v3
arc neither requires nor recommends any port of
classic `GraphOntologyValidator` for alpha. The
deferred substrates (per-module `ObservedSystem`
projection, CapabilityMap `role` field) remain
queued as optional future improvements — none
required for alpha.

## Cross-References

- [Issue governance ADR](issue-governance-architecture-decision.md)
- [Classic guarantees audit](classic-guarantees-audit.md)
- [Classic subsystem purpose map](classic-subsystem-purpose-map.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)
- [Classic guarantee regression plan](classic-guarantee-regression-plan.md)
- [Roadmap](roadmap.md)
- [Graph-aware filter provider v3 decision memo](graph-aware-filter-provider-v3-decision.md)
- [Graph-aware import evidence operator review refresh](graph-aware-import-evidence-operator-review-refresh.md)
- [Graph-aware fixture coverage operator review v2](graph-aware-fixture-coverage-operator-review-v2.md)
- [Graph-aware fixture coverage operator review v3](graph-aware-fixture-coverage-operator-review-v3.md)
- [Factory / module-gate evidence strengthening](factory-module-gate-evidence-strengthening.md)
- [Finding filters concept](../concepts/finding-filters.md)
- [Graph-aware finding filters concept](../concepts/graph-aware-finding-filters.md)
- [Finding filter policy status concept](../concepts/finding-filter-policy-status.md)
- [Finding filter policy suggestions concept](../concepts/finding-filter-policy-suggestions.md)
- [FindingFilterReport artifact](../artifacts/finding-filter-report.md)
- [FindingFilterHealthReport artifact](../artifacts/finding-filter-health-report.md)
