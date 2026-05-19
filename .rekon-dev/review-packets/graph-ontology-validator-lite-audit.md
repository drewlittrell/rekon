# Review Packet: GraphOntologyValidator-Lite Parity Audit

Slice: P1.1 (Issue Adjudication), graph-ontology-validator-lite-audit slice.
Implements step 13 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order (flipped from `(future)` to `(shipped)`).

Docs-only batch. No runtime code changes. No public API
changes. No new artifact type. No `schemaVersion` bump. No
version bump. No npm publish.

## CHANGES MADE

### New: `docs/strategy/graph-ontology-validator-lite-audit.md`

Decision memo for whether to port classic's
`GraphOntologyValidator` and what the Rekon-native shape
should be. Twelve required sections (Decision Summary,
Classic Behavior, Classic Checks / Signals, Rekon Current
Coverage, Gaps, Proposed Rekon-Native Shape, Candidate
Checks To Port, Checks To Defer, Rejected Porting
Approach, Required Artifact Inputs, Future Regression
Tests, Recommended Implementation Order). Includes:

- 30-row table classifying every classic check as
  **covered** / **port-soon** / **defer** / **rejected**.
- Per-check input matrix (Check / Required inputs /
  Currently available? / Missing artifact / Suggested
  producer).
- Capability shape sketch with a
  `GraphAwareFindingFilterProvider` interface and the
  `applyFindingFilters({ ..., graphContext })` pipeline
  integration point.
- Option matrix comparing A (kernel-internal), B
  (capability-level provider), C (runtime composer) —
  with **B recommended**.
- 12 future regression test scenarios for the next
  implementation slice.
- Six-step recommended implementation order
  (projections → capability skeleton → five checks →
  docs → ADR → strategy).
- Cross-references to every related concept / artifact /
  strategy doc.

### Updated: `docs/strategy/issue-governance-architecture-decision.md`

- Implementation Order step 13 flipped from `(future)`
  to `(shipped)` with the audit's decision summary
  inlined.
- New step 14 `(future)`: "Graph-aware finding filter
  provider v1" — implements the five candidate checks
  from the audit; ships required artifact projections
  first.
- Old step 14 renumbered to 15.

### Updated: `docs/strategy/classic-subsystem-purpose-map.md`

- Subsystem 6 row appended with the shipped audit and
  the recommended next-slice column changed to
  "Graph-aware finding filter provider v1".
- Status string updated with
  `+ graph-ontology-validator-lite-audit`.

### Updated: `docs/strategy/classic-behavior-roadmap.md`

- New "GraphOntologyValidator-lite parity audit (P1.1
  graph-ontology-validator-lite-audit slice)" detailed
  entry placed immediately after the filter-policy-status
  v1 entry. Records the audit's full decision summary,
  classic-source alignment, classified checks, rejected
  approaches, and the next recommended slice.

### Updated: `docs/strategy/classic-guarantee-regression-plan.md`

- New "`GraphOntologyValidator`-lite parity audit"
  shipped entry. Pinned by
  `tests/docs/graph-ontology-validator-lite-audit.test.mjs`.

### Updated: `docs/strategy/roadmap.md`

- New bullet under the alpha spine for the audit slice
  with the same decision summary + classified checks.

### Updated: `CHANGELOG.md`

- Detailed entry at the top of `0.1.0-alpha.1` covering
  decision summary, classified checks, required artifact
  projections, audit deliverables, and updated strategy
  docs.

### New test: `tests/docs/graph-ontology-validator-lite-audit.test.mjs`

15 deterministic assertions:

1. Audit doc exists.
2. Decision summary rejects monolithic
   `GraphOntologyValidator` port.
3. Audit doc contains every required heading **in
   order**.
4. Audit references every required Rekon artifact input
   (`FindingFilterReport`, `EvidenceGraph`, `GraphSlice`,
   `ObservedRepo`, `OwnershipMap`, `CapabilityMap`).
5. Audit names each candidate-port reason code (the
   five reasons queued for the next implementation
   slice).
6. Audit names checks that are explicitly deferred
   (runtime truth graph, framework-specific catalog,
   source-reading classifier).
7. Audit proposes the capability-level graph-aware
   finding filter provider shape and the `graphContext`
   plumbing.
8. Audit rejects LLM / semantic / fuzzy / embedding
   filtering and source scraping from filter logic.
9. Audit lists at least five future regression test
   scenarios.
10. Audit names the required artifact projections (flat
    file index / `ObservedRepo.files`, optional
    `ObservedSystem.kind`).
11. ADR Implementation Order references the audit + queues
    the next implementation step (`Graph-aware finding
    filter provider v1`).
12. CHANGELOG mentions the audit.
13. classic-guarantee-regression-plan adds the audit
    shipped entry pinned by the docs test.
14. subsystem-purpose-map + behavior-roadmap + roadmap
    each reference the audit + link the doc.
15. Review packet exists and uses the required section
    headings (this file).

### New: `.rekon-dev/review-packets/graph-ontology-validator-lite-audit.md`

This file.

## PUBLIC API CHANGES

None. Docs-only batch:

- No new SDK exports.
- No new kernel exports.
- No new runtime exports.
- No new CLI subcommand or flag.
- No new artifact type.
- No `schemaVersion` bump.
- No new capability role.
- No new permission.

## PURPOSE PRESERVATION CHECK

Original problem:
- Some apparent architecture violations are false positives
  when interpreted with graph / ontology context.
- Pure path / content filters only catch part of that.
- But blindly porting `GraphOntologyValidator` could
  recreate heavy coupling before Rekon's graph substrate
  is mature.

Classic workflow guarantee:
- codebase-intel-classic uses graph / ontology validation
  as a trust layer before surfacing issues as active
  governance.
- The guarantee is the *outcome* (filtered findings with
  structural evidence), not the *architecture* (one
  service that knows everything).

Classic shape that provided the guarantee:
- `infra/validation/GraphOntologyValidator.ts`,
- `services/IssueDetectionService.ts`,
- `services/issues/content-filters.ts`,
- `services/issues/content-filter-ruleid.ts`,
- `services/issues/content-filter-architecture.ts`,
- `services/issues/filter-health.ts`,
- `domain/issues/evaluators/**`,
- `domain/issues/RulesResolver.ts`,
- `services/GraphBuildProvider.ts`,
- `domain/graph/producers/**`.

Rekon equivalent (this audit):
- The audit memo records the decision **not** to port a
  monolithic validator. The Rekon-native shape is a
  future capability-level **graph-aware finding filter
  provider** consuming the existing artifact stack and
  emitting `FilteredFinding` entries via
  `applyFindingFilters`'s new optional `graphContext`
  input.
- Filtering remains a projection: raw `FindingReport` is
  never mutated; filtered findings remain auditable in
  `FindingFilterReport.filteredFindings`.
- All 17 of classic's most-impactful checks are already
  covered by the existing v2 content/result filters.
- Five additional checks are queued for the next
  implementation slice; the rest are explicitly deferred
  or rejected with rationale.

What would mean we failed (and isn't the case):
- We port `GraphOntologyValidator` as a monolithic
  service → the audit's Decision Summary explicitly
  rejects this; test 2 pins the rejection.
- We add graph-aware filtering that hides findings
  without audit evidence → the audit's Proposed Shape
  requires every match to emit `FilteredFinding` with
  `source: "system"` and a reason from the existing v2
  set.
- We build graph checks before identifying which
  artifact inputs they need → the audit's Required
  Artifact Inputs table is per-check and explicitly
  marks "available" vs. "missing"; required projections
  ship **first**.
- We lose classic's false-positive protection because
  we are afraid of the complexity → the audit names 22
  classic checks already covered by v2 plus 5 more
  queued for the next slice.
- We treat path / content filters as sufficient when
  classic clearly needed structural validation → the
  audit's Gaps section explicitly names the five
  scenarios where the v2 content filter trusts
  detector-supplied `details` that may be missing.

Regression test for future implementation (test 9):
- The audit lists 12 numbered regression scenarios; the
  test asserts at least 5 are present. Each scenario
  maps to one of the five candidate checks plus invariant
  checks (audit, raw findings unchanged, lifecycle /
  adjudication / coherency exclusion, deterministic
  output, graceful degradation, no source reads,
  filter-health surfacing).

## CODEBASE-INTEL ALIGNMENT

Classic capability / failure mode: graph / ontology-
informed false-positive filtering as a trust layer
before active issue surfacing.

Relevant classic files (per work order):
- `infra/validation/GraphOntologyValidator.ts`,
- `services/IssueDetectionService.ts`,
- `services/issues/content-filters.ts`,
- `services/issues/content-filter-ruleid.ts`,
- `services/issues/content-filter-architecture.ts`,
- `services/issues/filter-health.ts`,
- `domain/issues/evaluators/**`,
- `domain/issues/RulesResolver.ts`,
- `services/GraphBuildProvider.ts`,
- `domain/graph/producers/**`.

What Rekon preserves:
- graph / ontology context can suppress false positives,
- filtered findings remain auditable,
- filtering must cite evidence,
- graph-aware filters run before active lifecycle /
  adjudication / coherency,
- graph validation does not mutate raw findings.

What Rekon simplifies:
- no monolithic `GraphOntologyValidator` port,
- no hidden cache / service coupling,
- no LLM / semantic / fuzzy / embedding review,
- no source scraping outside artifacts,
- no full ontology validator until needed,
- no framework-specific exception catalog wholesale.

What Rekon does not port yet:
- full graph ontology validation suite,
- framework-specific exception catalog,
- runtime truth graph (no runtime substrate yet),
- source-reading validator service,
- deep Next.js / DDE / provider semantic owner parsing.

How this advances migration:
- Names the gap between v2 content filters and a fully
  graph-aware filter layer.
- Sets the Rekon-native shape (capability-level provider
  + `graphContext` input) so the next slice can build
  against a fixed contract.
- Identifies the artifact projections that must ship
  first (`ObservedRepo.files?`, `ObservedSystem.kind?`)
  so the provider never silently returns zero matches.
- Defers the failure-prone parts of classic
  (source scraping, framework catalog, runtime graph)
  with explicit rationale.

## CLASSIC CHECKS REVIEWED

The audit reviews 30 classic checks and signals,
organized into three buckets:

**Already covered by Rekon (22):**

Path / content built-ins (rows 1-4):
- `test-file`, `generated-file`, `external-file`,
  `canary-file`.

Classic-content-result-filters v2 (rows 5-21):
- `same-directory-import`, `svg-namespace-url`,
  `client-env-node-env`, `client-safe-infra`,
  `empty-constructor-stub`,
  `storage-retrieval-placeholder`,
  `speculative-anti-pattern`,
  `archetype-inference-note`,
  `hardcoded-config-not-dde`,
  `ui-http-provider-abstraction`,
  `ui-hook-uses-http-not-db`,
  `route-handler-with-service` (structurally),
  `route-http-middleware-only` (structurally),
  `external-api-comment-only` (structurally),
  `factory-file-creates-deps` (structurally),
  `nextjs-route-convention`,
  `module-gate-verified-caller` (structurally).

**Port-soon (5):** structural confirmation of the five
content filters above that today trust the detector's
`details` payload.

**Defer (5):** full graph ontology validation suite,
framework-specific exception catalog, runtime truth
graph, deep policy-owner parsing, persistent
`filtered-issues.json` merge.

**Rejected (3):** monolithic validator port,
source-reading validator service, LLM / semantic /
fuzzy / embedding review.

## REKON-NATIVE RECOMMENDATION

Future implementation lives in a new **capability-level
graph-aware finding filter provider**:

```ts
// future @rekon/capability-* package
export interface GraphAwareFindingFilterProvider {
  id: string;
  produces: ["FindingFilterDecision"];
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

Pipeline integration:
- `applyFindingFilters` gains a new optional
  `graphContext?: ...` input.
- The graph stage runs between content filters and broad
  path heuristics. Policy filters always win; broad
  path filters lose to a structural match.
- Every match becomes a `FilteredFinding` with
  `source: "system"` and a reason from the existing v2
  set — no new reason codes.

Option comparison:

| Option | Verdict |
| --- | --- |
| A. Inside `@rekon/kernel-findings` as optional `graphContext` | Reject — couples kernel to repo-model / evidence types |
| B. New capability-level filter provider | **Recommended** — externalizable, testable, fits capability manifest model |
| C. Runtime composer | Reject — mixes orchestration with filter logic |

## CANDIDATES TO PORT / DEFER

**Port soon (next implementation slice):**

| Check | Reason | Required artifact |
| --- | --- | --- |
| Route handler with sibling | `route-handler-with-service` | `ObservedRepo` (file paths) |
| Route HTTP middleware only | `route-http-middleware-only` | `EvidenceGraph` import facts |
| External-API comment only | `external-api-comment-only` | `EvidenceGraph` import facts |
| Factory file creates deps | `factory-file-creates-deps` | `OwnershipMap` + `CapabilityMap` |
| Module gate verified caller | `module-gate-verified-caller` | `OwnershipMap` + `CapabilityMap` |

**Defer:**
- Full graph ontology validation suite.
- Framework-specific exception catalog.
- Runtime truth graph.
- Deep policy-owner parsing.
- Factory-by-capability signal until `CapabilityMap`
  strength is proven.
- Persistent `filtered-issues.json` merge.

**Rejected:**
- Monolithic `GraphOntologyValidator` port.
- Source-file reads from filter logic.
- LLM / semantic / fuzzy / embedding review.

**Required artifact projections (ship first):**
- A flat file index (likely `ObservedRepo.files?:
  string[]`) so file-existence checks don't require
  iterating `systems[].paths`.
- An optional `ObservedSystem.kind?` ("module" /
  "package" / ...) so module-gate detection is
  unambiguous.

## TESTS / VERIFICATION

Tests:
- New `tests/docs/graph-ontology-validator-lite-audit.test.mjs`
  (15 assertions; all pinned to deterministic doc
  structure / references).

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

No CLI smoke required (docs-only batch).

## INTENTIONALLY UNTOUCHED

- `@rekon/kernel-findings` — no exports change, no new
  reason codes, no new helpers.
- `@rekon/runtime`, `@rekon/cli`, `@rekon/sdk`,
  `@rekon/capability-docs`, `@rekon/capability-graph`,
  `@rekon/capability-findings` (none exists yet) — no
  changes.
- `FindingReport`, `FindingFilterReport`,
  `FindingFilterHealthReport`,
  `FindingFilterPolicySuggestionReport`,
  `FindingFilterPolicyRule`,
  `FindingStatusLedger`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, `CoherencyDelta`,
  `IssueMergeDecisionLedger` — no shape changes.
- `applyFindingFilters` and the four filter classifiers
  (`isPolicyFiltered`, `isResultFiltered`,
  `isClassicContentFiltered`, `isBuiltInPathFiltered`)
  — no changes.
- `buildFindingFilterReport` /
  `buildFindingFilterHealthReport` (runtime) — no
  changes.
- `rekon findings filter-policy status` /
  `suggest` / `list` / `apply` — no changes.
- Architecture summary / agent contract / proof
  publishers — no changes.
- All capability manifests, permissions, dist
  contents, `schemaVersion` strings.
- LLM / semantic / fuzzy / embedding matching —
  permanently rejected (per ADR).
- No version bump. No npm publish. No branch.

## RISKS / FOLLOW-UP

- Risk: deferring the framework-specific catalog leaves
  Rekon without explicit DDE / Next.js / provider policy
  evaluators. Mitigation: the audit notes the five
  candidate checks cover the highest-value classic
  cases; further checks ship once the v1 provider proves
  the shape.
- Risk: the five candidate checks ride on detector-side
  `details` payloads today. If detectors evolve and
  drop those payloads, the v2 structural filters will
  miss matches the future graph provider catches.
  Mitigation: that is precisely why the audit queues the
  graph-backed confirmation slice next — it strengthens
  the existing filters rather than replacing them.
- Risk: required artifact projections
  (`ObservedRepo.files?`, `ObservedSystem.kind?`) are
  additive optional but still require evidence providers
  to populate them. Repos without strong evidence
  coverage may see weaker results. Mitigation: the audit
  documents this and the v1 implementation slice must
  ship the projections **first** with provider
  coverage.
- Risk: a future maintainer skips the audit and
  attempts a monolithic port. Mitigation: the test
  suite includes a structural assertion that the
  audit's rejection of the monolithic port stays
  documented; the ADR step is `(shipped)` and visible
  in every strategy doc.
- Risk: the future graph-aware filter provider could
  drift toward source reads if a check feels easier to
  express against raw source. Mitigation: the audit
  rejects source reads explicitly and lists "add an
  evidence provider that emits artifact facts" as the
  correct alternative.
- Follow-up (immediate): **Graph-aware finding filter
  provider v1** (ADR step 14). Implements the five
  candidate checks against artifact inputs identified
  by the audit; ships missing artifact projections
  first.
- Follow-up: filter-health alerts that distinguish
  graph-backed matches from detector-detail matches
  (so dominance / over-filtering signals can be tuned
  per layer).
- Follow-up: documentation pass after v1 lands —
  promote the five candidate reasons from
  "covered (structurally)" to "covered (graph-backed)"
  in the audit's table and `docs/concepts/finding-filters.md`.
- Follow-up: PR / GitHub / dashboard surfaces for the
  graph-aware filter activity. Deferred to the
  surfaces phase.

## NEXT STEP

Per the audit's "Recommended Implementation Order" and
the ADR's new step 14, the next slice is:

> Graph-aware finding filter provider v1

Initial checks (in implementation order):
1. Route handler with sibling
   (`route-handler-with-service`) — uses the new
   `ObservedRepo.files?` projection.
2. Route HTTP middleware only
   (`route-http-middleware-only`) — uses `EvidenceGraph`
   import facts.
3. External-API comment only
   (`external-api-comment-only`) — uses `EvidenceGraph`
   import facts.
4. Factory file creates deps
   (`factory-file-creates-deps`) — uses `OwnershipMap`
   + `CapabilityMap`.
5. Module gate verified caller
   (`module-gate-verified-caller`) — uses `OwnershipMap`
   + the new `ObservedSystem.kind?` projection.

Required artifact-side prerequisites (ship **first**,
before any provider code):
- `ObservedRepo.files?: string[]` (or an equivalent
  `RepoFileIndex` projection).
- Optional `ObservedSystem.kind?` field.

The next slice is the natural follow-up: the substrate
has the artifacts, the audit defines the contract, and
the five checks have stable Rekon-native names. The
slice is bounded (no LLM, no framework catalog, no
source reads, no monolithic validator) and audited
(every match goes through `FindingFilterReport` exactly
like the v2 structural filters today).
