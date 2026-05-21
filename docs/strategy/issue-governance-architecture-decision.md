# Issue Governance Architecture Decision

Status: **Accepted** (2026-05). Author: Rekon core.
Scope: P1.1 (Issue Adjudication) and downstream coherency / publication / resolver surfaces.

This ADR is the canonical reference for how Rekon shapes its
issue-governance pipeline. It exists because issue work spans
several P1.1 slices, mixes faithful classic guarantees with new
product extensions, and risks accidentally promoting product
features (like operator-assisted merge decisions) into "classic
parity" if we are not deliberate.

## Decision

Rekon uses a layered issue-governance model. Every layer is its
own artifact type. Each layer reads from the layer(s) below it,
without mutating them.

1. **`FindingReport`** — raw evaluator output. Never mutated.
   Source of truth for what evaluators detected on this run.
2. **`FindingFilterReport`** — system / policy filtering audit.
   Records filtered findings with reason, evidence, and
   confidence. Does **not** mutate `FindingReport`. Carries a
   `keptFindings` projection alongside `filteredFindings` so
   downstream consumers can opt in to the filtered view without
   re-deriving it.
3. **`FindingStatusLedger`** (already shipped) — operator status
   decisions (accepted / ignored / resolved) with note + reason.
   Append-only; never mutated.
4. **`FindingLifecycleReport`** — run-to-run lifecycle (new /
   existing / resolved) plus the effective status produced by
   joining `FindingReport` × `FindingStatusLedger`. **As of the
   filter-aware lifecycle slice**, the lifecycle prefers
   `FindingFilterReport.keptFindings` as the active latest set
   when the filter report cites the latest `FindingReport` in
   its `inputRefs`. The filter report is cited in the
   lifecycle's own `inputRefs` so freshness flags lifecycle
   stale when a newer filter arrives. When no current filter
   report exists, the lifecycle falls back to the raw
   `FindingReport` transparently and does not cite a stale
   filter.
5. **`IssueAdjudicationReport`** — groups kept findings into
   governed `IssueAdjudicationGroup` records. Deterministic
   grouping first (current shape). The `mergeCandidates` field is
   an advisory product extension (see below).
6. **`IssueMergeDecisionLedger`** — operator-assisted product
   extension. Records `accepted` / `rejected` decisions per
   merge candidate with required note + optional reason.
   Append-only.
7. **`CoherencyDelta`** — operational roll-up of the current
   governed issue state. v3 honors accepted merge decisions as a
   derived projection (merged rollup items); raw groups remain
   inspectable.

The product-extension layers (merge candidates, decision ledger,
accepted-merge roll-ups, publication / resolver awareness of
those roll-ups) are useful and shipped, but they are explicitly
**not** classic parity. Future ADRs may promote them.

## Why

Classic codebase-intel proved the following are non-negotiable
for trustworthy issue governance:

- **Issue id continuity** across runs (so lifecycle / status
  decisions survive re-detection).
- **False positives need an audit trail.** Filtered findings
  must record reason, evidence, and confidence so a future
  operator can debug filters or recover a wrongly-suppressed
  finding.
- **Status / review metadata persists** independent of detection
  re-runs.
- **Coherency roll-ups operate on governed issues**, not raw
  detector noise. Without filtering, raw counts overstate drift
  whenever the repo has test / generated / external paths.

Rekon's current shape satisfies the first three (via
`FindingStatusLedger` + `FindingLifecycleReport` +
`IssueAdjudicationReport`). The fourth is partially satisfied: a
`CoherencyDelta` already operates on adjudicated groups, but the
groups themselves include false positives because the layer
above — system / policy filtering — does not yet exist. This ADR
puts the filter layer between `FindingReport` and the lifecycle /
adjudication chain.

## Product Extension Boundary

The following are Rekon product extensions, not faithful classic
parity:

- `IssueMergeCandidate` (advisory cross-rule merge hints on
  `IssueAdjudicationReport`).
- `IssueMergeDecisionLedger` (operator accept / reject
  decisions).
- Accepted-merge rollup items in `CoherencyDelta` v3
  (`mergedIssueGroupIds`, `mergeDecisionIds`,
  `mergeCandidateIds`).
- Publication / resolver awareness of accepted rollups
  (architecture summary + agent contract sections,
  `IssuePacket.mergeRollup`).

These remain shipped and supported. Future work must explicitly
**label** them as product extensions in the strategy docs and
review packets unless an ADR promotes them. Promotion requires:

1. Documenting the classic behavior the extension preserves.
2. Pinning the regression via the classic-guarantee plan.
3. Removing the "product extension" label in alignment-map /
   subsystem-purpose-map.

## Terminology

| Term | Meaning |
| --- | --- |
| **Finding** | Raw evaluator output. A single `Finding` record. |
| **Filtered finding** | A finding suppressed from active governance by a system / policy filter, with audit evidence. Lives in `FindingFilterReport.filteredFindings`. |
| **Kept finding** | A finding that passed filtering. Lives in `FindingFilterReport.keptFindings`. Becomes a candidate for lifecycle / adjudication. |
| **Issue group** | Governed group of kept findings (`IssueAdjudicationGroup`). |
| **Merge candidate** | Advisory possible relationship between two issue groups. Not automatic; not classic parity. |
| **Merge decision** | Operator decision to accept or reject a merge candidate. Persisted in `IssueMergeDecisionLedger`. |
| **Merge rollup** | Derived projection in `CoherencyDelta` that collapses two or more groups linked by an accepted merge decision into a single rollup item. |
| **Coherency delta** | Operational roll-up of current governed issue state. |

## Consequences

- **Do not** overload `ignored` / `accepted` statuses to mean
  system filtering. Operator status decisions belong in
  `FindingStatusLedger`; system / policy suppression belongs in
  `FindingFilterReport`.
- **Do not** drop filtered findings. They stay in the filter
  report with reason + evidence + confidence so any operator can
  audit them.
- **Do not** treat raw finding counts as governed issue counts.
  The agent contract `Do Not Do` already states this; the
  pattern extends to filter counts (kept vs. filtered) too.
- **Do not** treat merge candidates as automatic merged groups.
  Only accepted decisions reshape the `CoherencyDelta`
  projection.
- **Do not** continue merge-decision freshness work until
  filtering / filter-health exists. The freshness layer over
  merge decisions matters less than restoring the missing
  classic filtering guarantee.
- **Do** add `FindingFilterReport` and
  `FindingFilterHealthReport` as the next implementation slice
  (this batch).
- **Do** label future slices in strategy docs as one of:
  classic-guarantee preservation, Rekon reinterpretation, or
  Rekon product extension.

## Implementation Order

1. **(shipped)** ADR + `FindingFilterReport` +
   `FindingFilterHealthReport` v1 + CLI + refresh wiring.
   Filter artifacts are produced and auditable.
2. **(shipped)** Filter-aware lifecycle:
   `FindingLifecycleReport` consumes
   `FindingFilterReport.keptFindings` when the latest filter
   report cites the latest `FindingReport`. Adjudication and
   `CoherencyDelta` benefit transitively — only kept findings
   flow into issue groups and coherency rollups. Filtered
   findings remain auditable but no longer become active
   governed issue groups or coherency items.
3. **(shipped)** Filter policy / configured exclusions v1:
   `.rekon/config.json` accepts a `findingFilters` array of
   project-specific policy rules. Each rule names a
   `FindingFilterReason`, supplies `evidence`, and matches
   findings by deterministic `pathPattern` (simple glob),
   `type`, `ruleId`, `severity`, `titleIncludes`, and/or
   `descriptionIncludes`. Policy rules run **before** built-in
   deterministic filters, in declared order; the first
   matching rule wins. Filtered entries record
   `source: "policy"` plus a `policyId` so the audit trail
   names the rule. `FindingFilterReport.summary.byPolicy` /
   `FindingFilterHealthReport.summary.byPolicy` report
   per-policy counts. Three new health alerts:
   `policy-over-filtering`, `low-confidence-policy-filter`,
   `unused-policy-filter`. `rekon config validate` enforces
   the policy schema and rejects duplicates / missing
   matchers / absolute or traversal pathPattern.
4. **(shipped)** Filter health / issue adjudication surfaces
   in publications. `@rekon/capability-docs.architecture-summary`
   renders a `## Finding Filter Health` section sourced from
   `FindingFilterReport` + `FindingFilterHealthReport` (kept /
   filtered counts, filter rate, per-reason / per-policy
   tables, alert list, audit pointer to `filteredFindings`).
   `@rekon/capability-docs.agent-contract` renders a
   `### Finding Filter Health` subsection under
   `Active Governance State` that visibly warns when alerts
   exist and instructs agents to inspect
   `FindingFilterReport.filteredFindings` before claiming the
   repo has no active issues. Both publications cite the
   filter artifacts in `header.inputRefs`, so freshness flags
   them stale on newer filter / health reports. The agent
   contract's `Do Not Do` list adds a clean-active-governance
   reminder.
5. **(shipped)** Filter policy / exclusion persistence v2.
   `FindingFilterPolicySuggestionReport` records candidate
   `findingFilters` rules derived deterministically from
   the latest N `FindingFilterReport` artifacts (default 5),
   with reason, confidence, rationale, affected finding ids
   / paths / types, and evidence refs back to the source
   filter reports. Four suggestion reasons:
   `repeated-filtered-policy-gap` (high; computed first so
   it wins over `repeated-filtered-path` at the same
   pathPattern), `repeated-filtered-path` (high ≥ 3 / medium
   = 2), `repeated-filtered-type` (medium), and
   `high-volume-filtered-pattern` (low review prompt with
   no `pathPattern`). New CLI:
   `rekon findings filter-policy suggest` /
   `rekon findings filter-policy list` /
   `rekon findings filter-policy apply <id> [--force]`.
   `apply` is the only mutating command and refuses
   low-confidence + duplicate-id rules without `--force`;
   all other commands are read-only. Existing
   `findingFilters` rules suppress duplicate suggestions by
   `pathPattern` / `type`.
6. **(shipped)** Filter policy suggestions surfaced in
   architecture summary / agent contract.
   `@rekon/capability-docs.architecture-summary` renders a
   `## Finding Filter Policy Suggestions` section sourced
   from `FindingFilterPolicySuggestionReport` (total / high /
   medium / low counts, per-suggestion table, explicit
   `rekon findings filter-policy apply <id>` pointer,
   low-confidence `--force` note).
   `@rekon/capability-docs.agent-contract` renders a
   `### Finding Filter Policy Suggestions` subsection with
   the same counts plus an advisory blockquote and up to
   five suggestion bullets, and adds two `Do Not Do`
   reminders against applying suggestions without operator
   approval or treating them as already-applied config.
   Both publications cite the suggestion report in
   `header.inputRefs`. When the suggestion report does not
   cite the latest `FindingFilterReport`, both surfaces emit
   a stale banner pointing operators back to
   `rekon findings filter-policy suggest`. Manifest update:
   `capability-docs.consumes` adds
   `FindingFilterPolicySuggestionReport`; new
   `finding-filter-policy-suggestions.changed` invalidation
   rule. Config is never mutated by publication; `apply`
   remains the only mutating command.
7. **(shipped)** Filter policy suggestion apply safety v2.
   `rekon findings filter-policy apply` now accepts
   `--dry-run` (alias `--preview`) for non-mutating
   inspection of the proposed rule and a structured config
   diff (`addedFindingFilters` / `replacedFindingFilters` /
   `beforeCount` / `afterCount`). Three force-gated
   blockers: `low-confidence-suggestion`, `broad-path-pattern`
   (deterministic `isBroadFindingFilterPolicyRule` predicate
   over `pathPattern` + narrow-matcher fields), and
   `duplicate-rule-id`. With `--force`, duplicate ids
   **replace** the existing rule rather than appending a
   duplicate. Both dry-run and apply run
   `validateFindingFilterPolicyRules` on the projected
   `findingFilters`; validation failure refuses the write
   even with `--force`. Malformed `.rekon/config.json` is
   never overwritten. New exports from
   `@rekon/kernel-findings`:
   `isBroadFindingFilterPolicyRule`,
   `planFindingFilterPolicyApply`, plus types
   `FindingFilterPolicyApplyPlan`,
   `FindingFilterPolicyApplyDiff`,
   `FindingFilterPolicyApplyWarning`,
   `FindingFilterPolicyApplyBlocker`,
   `PlanFindingFilterPolicyApplyInput`. No publication shape
   change. No new artifact type.
8. **(shipped)** Configured filter policy freshness /
   publication guardrails.
   `FindingFilterReport` now records an order-sensitive
   `policyFingerprint: { digest, ruleCount, ruleIds }` of the
   `findingFilters` policy set used during the run. New
   exported helper `fingerprintFindingFilterPolicies(policies)`
   in `@rekon/kernel-findings`. `buildFindingFilterReport`
   always stamps the fingerprint (including the empty-policy
   fingerprint when no rules are configured). The architecture
   summary and agent contract publishers load
   `.rekon/config.json` `findingFilters`, fingerprint them via
   `loadCurrentFindingFilterPolicies(repoRoot)`, and compare
   against the latest `FindingFilterReport.policyFingerprint`
   via `computeFilterPolicyStaleness`. Status is
   `fresh` / `stale` / `missing` / `unknown`. On `stale`, both
   publications render a "Run `rekon refresh`" warning; the
   agent contract adds a third filter-related `Do Not Do`
   reminder against acting on stale active governance after a
   policy change. `rekon findings filter-policy apply` now
   includes `currentPolicyFingerprint` /
   `projectedPolicyFingerprint` (dry-run) and
   `policyFingerprint` (apply) in its JSON output so operators
   can see exactly which fingerprint the next refresh should
   stamp. Validator accepts the new optional
   `policyFingerprint` field on `FindingFilterReport`; older
   reports without the field collapse to `status: "unknown"`
   so they explicitly prompt a `rekon refresh`. New exports
   from `@rekon/capability-docs`:
   `FilterPolicyStaleness` (type),
   `computeFilterPolicyStaleness`,
   `loadCurrentFindingFilterPolicies`. No artifact
   `schemaVersion` bump (additive optional field). No new
   artifact type. No watcher / daemon.
9. **(shipped)** Classic issue filtering parity v2 —
   content / result filter expansion. `FindingFilterReason`
   union gains 17 classic-inspired content reasons
   (`empty-constructor-stub`,
   `storage-retrieval-placeholder`, `client-safe-infra`,
   `same-directory-import`, `svg-namespace-url`,
   `client-env-node-env`, `speculative-anti-pattern`,
   `archetype-inference-note`, `hardcoded-config-not-dde`,
   `ui-http-provider-abstraction`,
   `ui-hook-uses-http-not-db`,
   `module-gate-verified-caller`,
   `route-handler-with-service`,
   `route-http-middleware-only`,
   `external-api-comment-only`,
   `factory-file-creates-deps`,
   `nextjs-route-convention`) plus 4 result-filter reasons
   (`below-min-confidence`, `below-min-severity`,
   `outside-selected-system`, `configured-path-exclusion`).
   New exported helpers
   `applyFindingContentFilters({ finding })` and
   `applyFindingResultFilters(finding, options)` are pure
   deterministic functions over a new additive optional
   `Finding.details?: Record<string, unknown>`. New
   exported `validateFindingResultFilterOptions` is wired
   into `rekon config validate`. `applyFindingFilters` runs
   filters in priority order: policy → classic content →
   built-in path → result. Result-filtered findings record
   `source: "system"` and a result-filter reason — they are
   not silently deleted and are not operator status
   decisions. New filter-health alerts
   `content-filter-high-volume` and
   `result-filter-over-filtering`; new summary counts
   `contentFiltered` / `resultFiltered`. No artifact
   `schemaVersion` bump; no new artifact type; no LLM /
   semantic / fuzzy matching; `GraphOntologyValidator` port
   still deferred.
10. **(shipped)** Filter-health diagnostics v2.
    `FindingFilterHealthReport.summary` gains
    `builtInPathFiltered`, `filterRateByReason`,
    `filterRateByPolicy`, `dominantReason`, `dominantPolicy`,
    and `policyFingerprint` (additive). Six new deterministic
    alerts: `reason-over-filtering`, `policy-dominance`,
    `content-filter-dominance`, `result-filter-dominance`,
    `policy-fingerprint-missing`, `stale-policy-fingerprint`.
    Dominance alerts use a 50 % threshold with a 5-finding
    minimum corpus and an alphabetic tiebreak. New exported
    classifiers: `isPolicyFiltered`, `isResultFiltered`,
    `isClassicContentFiltered`, `isBuiltInPathFiltered` —
    policy takes precedence; the other three buckets are
    mutually exclusive over the remainder.
    `buildFindingFilterHealth` / `createFindingFilterHealthReport`
    / `buildFindingFilterHealthReport` (runtime) gain an
    optional `currentPolicyFingerprint:
    FindingFilterPolicyFingerprint`. `rekon findings
    filter-health` and `rekon refresh` fingerprint the current
    `.rekon/config.json findingFilters` (via the existing
    `loadFindingFilterPolicies` + `fingerprintFindingFilterPolicies`)
    and forward it so the report can emit
    `stale-policy-fingerprint` / `policy-fingerprint-missing`
    locally. Architecture summary + agent contract render the
    new alert codes automatically via their existing generic
    Filter Health tables — no publication shape change.
    Filtering decisions are not affected. Raw
    `FindingReport` / `FindingFilterReport` /
    `FindingFilterHealthReport` are not mutated. No
    `schemaVersion` bump.
11. **(shipped)** Filter policy operator workflow polish.
    New CLI surface `rekon findings filter-policy status
    [--policy <id>] [--warnings-only] [--unused-only]`
    combines the configured `findingFilters` set with the
    latest `FindingFilterReport` /
    `FindingFilterHealthReport` /
    `FindingFilterPolicySuggestionReport` into a single
    read-only JSON document. Per-policy entries report
    usage count, usage rate, filtered finding ids,
    warnings (`unused-policy`, `dominant-policy`,
    `low-confidence-policy`, `broad-policy`,
    `stale-policy-fingerprint`), and recommended actions.
    Global warnings (`missing-filter-report`,
    `missing-filter-health`) appear when the corresponding
    artifact is absent. Suggestions are included as
    advisory `dryRunCommand` / `applyCommand` strings;
    low-confidence suggestions get `--force` appended. The
    pure helper `summarizeFindingFilterPolicyStatus` is
    exported from `@rekon/kernel-findings`. The command is
    read-only; `.rekon/config.json` is never mutated and
    `rekon findings filter-policy apply` remains the only
    mutating command. Malformed config fails clearly
    without writing. No artifact `schemaVersion` bump. No
    new artifact type.
12. **(future)** Filter policy explicit disable / remove
    workflow — safe, explicit config mutation; dry-run /
    diff first.
13. **(shipped)** `GraphOntologyValidator`-lite parity
    audit. Decision memo at
    [graph-ontology-validator-lite-audit.md](graph-ontology-validator-lite-audit.md).
    Decides:
    - **Do not port `GraphOntologyValidator` as a monolithic
      service.** Recreate the *outcome* (filtered findings
      with structural evidence), not the architecture.
    - Future implementation lives in a new capability-level
      **graph-aware finding filter provider** that consumes
      `EvidenceGraph` / `GraphSlice` / `ObservedRepo` /
      `OwnershipMap` / `CapabilityMap` and contributes
      decisions to `applyFindingFilters` via a new optional
      `graphContext` input. Audit emits
      `FilteredFinding` entries with
      `source: "system"` reusing the existing v2 reasons
      (`route-handler-with-service`,
      `route-http-middleware-only`,
      `external-api-comment-only`,
      `factory-file-creates-deps`,
      `module-gate-verified-caller`).
    - Five candidate checks are port-soon; the
      framework-specific catalog, runtime truth graph,
      source-reading classifier, and LLM / semantic /
      fuzzy review are explicitly rejected or deferred.
    - Required artifact projections (flat file index /
      `ObservedRepo.files?`, optional
      `ObservedSystem.kind?`) ship **first**, before any
      filter logic, so the provider never silently
      returns zero matches.
14. **(shipped)** Graph-aware finding filter provider v1.
    `ObservedRepo.files?: string[]` and
    `ObservedSystem.kind?` projections ship first
    (additive optional, no schemaVersion bump). New pure
    helper `applyFindingGraphFilters({ finding,
    graphContext })` in `@rekon/kernel-findings` consumes
    `FindingGraphFilterContext` (`evidenceGraph?`,
    `observedRepo?`, `ownershipMap?`, `capabilityMap?`,
    `graphSlices?`) and implements the five candidate
    checks from the audit:
    - `route-handler-with-service` via
      `details.imports` OR `ObservedRepo.files` sibling
      lookup,
    - `route-http-middleware-only` via
      `details.imports`,
    - `external-api-comment-only` via `details.imports`
      OR `EvidenceGraph` import facts,
    - `factory-file-creates-deps` via path heuristics
      OR `CapabilityMap` entries,
    - `module-gate-verified-caller` via `GateEvaluator` /
      `/modules/` path OR `OwnershipMap` +
      `ObservedSystem.kind === "module"`.
    `applyFindingFilters` runs the graph stage between
    the classic content layer and the broad path
    heuristics; pipeline short-circuits on first match.
    Filtered findings record `source: "system"` and
    reuse existing v2 reason codes — no new reason
    codes. Runtime `buildFindingFilterReport` reads
    `ObservedRepo` / `OwnershipMap` / `CapabilityMap` /
    `EvidenceGraph` from the store and threads them as
    `graphContext`; `FindingFilterReport.header.inputRefs`
    cites a graph artifact only when at least one
    graph-aware match used the data. Missing graph
    artifacts → conservative no-op (the relevant check
    does not fire). No source-file reads. No LLM,
    semantic, fuzzy, or embedding matching. Raw
    `FindingReport` is never mutated; lifecycle /
    adjudication / coherency exclude graph-filtered
    findings. 20 new contract tests pinning helpers,
    pipeline integration, no-op semantics, audit
    invariants, and end-to-end CLI behavior.
15. **(shipped)** Graph-aware filter provider v1 surfaces
    in publications / filter health. Splits
    `graphAwareFiltered` from `contentFiltered` into a
    mutually-exclusive bucket in
    `FindingFilterHealthSummary` (counts always sum to
    `totalFiltered`). Adds `byGraphAwareReason`,
    `filterRateByGraphAwareReason`, and
    `dominantGraphAwareReason` (alphabetic tiebreak). Adds
    two new alerts: `graph-aware-filter-dominance` and
    `graph-aware-reason-dominance` (both gated on
    `totalFindings >= 5`, both fire at `>= 50 %` rate).
    Architecture summary renders a `Graph-Aware Filter
    Reasons` table plus an audit pointer. Agent contract
    renders the graph-aware count + a conditional audit
    instruction + a new "Do Not Do" reminder
    ("Do not treat graph-aware filtering as proof that the
    underlying issue never existed; inspect
    `FindingFilterReport.filteredFindings` for the
    structural evidence (sibling-file existence,
    import-graph facts, capability ownership, module-kind
    routing) before drawing conclusions."). Policy
    precedence is preserved — a `source: "policy"` entry
    with a graph-aware reason code is counted in
    `policyFiltered`, never inflating
    `graphAwareFiltered` or `byGraphAwareReason`. 16 new
    contract tests covering classifier behavior, bucket
    math, alert thresholds, publication rendering, and
    artifact validation.
16. **(shipped)** Graph-aware filter provider v2 —
    file-existence / import-evidence strengthening.
    Strengthens the five v1 checks with deeper
    artifact-backed evidence: `EvidenceGraph` import
    facts are preferred over `Finding.details.imports`,
    `ObservedRepo.files` supports sibling-file checks for
    `route-handler-with-service`, and the module-gate
    check prefers `OwnershipMap` +
    `ObservedSystem.kind === "module"` over the bare
    `/modules/` path heuristic. Each decision returns
    `usedArtifacts` naming the artifacts that
    contributed; `applyFindingFilters` collects these into
    `graphArtifactsUsed` so the runtime cites only the
    artifacts that actually fired (no inflation by
    artifacts that were loaded but never matched). The
    pipeline reordered to run graph-aware *before* classic
    content so the audit credits the strongest source. New
    pure helpers (`normalizeRepoPath`, `sameRepoPath`,
    `siblingPath`, `listObservedRepoFiles`,
    `observedRepoHasFile`, `findSiblingFile`,
    `listImportTargetsForFile`,
    `fileImportsTargetMatching`) exported for external rule
    packs. 17 new contract tests covering helpers,
    strengthened checks, conservative no-op, precise
    inputRefs, and end-to-end CLI behavior.
    No new reason codes. No source-file reads. No LLM,
    semantic, fuzzy, or embedding matching. No
    `GraphOntologyValidator` port. Raw `FindingReport`
    remains byte-identical. Lifecycle / adjudication /
    coherency continue to exclude graph-filtered findings.
17. **(shipped)** Graph-aware filter provider v3
    decision memo. The memo
    ([`docs/strategy/graph-aware-filter-provider-v3-decision.md`](graph-aware-filter-provider-v3-decision.md))
    reviews the ten most prominent remaining classic
    graph/ontology checks and concludes that no broad v3
    catalog ships next. Every remaining candidate either
    needs a missing artifact projection first
    (export / symbol facts, capability role taxonomy,
    call-graph evidence), is project-specific (belongs in
    an external rule pack rather than core), or is
    permanently rejected (monolithic
    `GraphOntologyValidator` port, source-reading filters,
    LLM / semantic / fuzzy / embedding matching). The
    memo reaffirms every prior rejection in the
    GraphOntologyValidator-lite audit and recommends the
    `EvidenceGraph` export / symbol facts projection v1 as
    the substrate that unblocks 3–4 v3 candidates at once.
    Docs-only slice; no runtime behavior change.
18. **(shipped)** `EvidenceGraph` export / symbol facts
    projection v1. `@rekon/capability-js-ts` now emits
    `kind: "export"` and `kind: "symbol"` facts with rich
    `value: { name, kind, default? }` (exports) and
    `value: { name, kind, exported? }` (symbols) shape,
    subject = repo-relative file path. Extraction covers
    every form named in the work order: named declaration
    exports (function / class / const / let / var / type /
    interface / namespace / enum), default exports
    (function / class / expression),
    `export { a, b as c }` named list (renamed alias is the
    exported identifier; source is excluded), `export *
    from "..."` (`name: "*", kind: "namespace"`), and
    `export * as alias from "..."`. Symbols carry an
    `exported` flag based on whether the declaration itself
    begins with `export` (conservative: separate
    `export { ... }` re-exports show up only as `export`
    facts, not as `exported: true` symbols). New helpers in
    `@rekon/kernel-findings`: `listExportsForFile` /
    `listSymbolsForFile` (sorted by name + kind; empty when
    no facts). **No graph-aware filter consumes the new
    facts yet** — the substrate ships alone, per the v3
    memo's substrate-first discipline. Older
    `EvidenceGraph` artifacts continue to validate (no new
    artifact type, no `schemaVersion` bump). Aligned to
    `domain/graph/producers/**` and
    `services/GraphBuildProvider.ts`. 13 new contract tests
    cover named / default / list / star export shapes,
    symbol declarations with the `exported` flag,
    deterministic deduplication of duplicate declarations,
    older-graph validation, the new helpers, unchanged
    import-fact behavior, and unchanged graph-aware filter
    behavior. No source-file reads at filter time, no AST,
    no type checker, no LLM / semantic / fuzzy / embedding
    inference. No new reason codes. No new capability role.
    No new CLI subcommand or flag.
19. **(shipped)** Graph-aware Next.js route export
    convention filter — the first v3 candidate check that
    consumes the export-facts substrate. New
    `graphFilterNextjsRouteConvention` in
    `@rekon/kernel-findings` reads `listExportsForFile` for
    a `route.ts` file and suppresses the
    `routes.single_http_handler_export` finding when every
    non-handler named export is in the Next.js
    segment-config set
    (`runtime` / `dynamic` / `revalidate` / `fetchCache` /
    `preferredRegion`). Default exports are ignored. HTTP
    method names (`GET` / `POST` / `PUT` / `PATCH` /
    `DELETE` / `HEAD` / `OPTIONS`) are recognized as
    handlers and excluded from the "extras" set. When
    EvidenceGraph carries export facts for the file,
    those facts are authoritative — the classic content
    fallback (`details.otherExports`-based) is gated by
    a new `isNextjsRouteConventionSupersededByGraph`
    helper so a clean-looking `details.otherExports`
    cannot override a graph evidence "this file has an
    invalid extra export" reality. `nextjs-route-convention`
    moved from `CLASSIC_CONTENT_FILTER_REASONS` to
    `GRAPH_AWARE_FILTER_REASONS`; filter-health buckets
    matches as `graphAwareFiltered` whether the graph-aware
    stage or the classic content fallback fired. Decisions
    return `usedArtifacts: ["EvidenceGraph"]` on the graph
    path; the runtime cites EvidenceGraph in
    `FindingFilterReport.header.inputRefs` only when the
    check actually consulted it. 11 new contract tests
    cover all required cases (GET + runtime, full
    segment-config set, GET + helper veto, GET-only no-op,
    default-export ignore, graph-overrides-details
    behavior, classic fallback, inputRefs precision, raw
    `FindingReport` byte-identity, lifecycle exclusion,
    filter-health bucketing). No new reason codes. No
    source-file reads at filter time. No AST, no type
    checker. No LLM / semantic / fuzzy / embedding
    inference. No framework-wide Next.js catalog. No new
    capability role. No new CLI subcommand or flag.
20. **(shipped)** Import-fact subject-shape cleanup
    decision memo. Strategy-only batch (no runtime
    behavior changes ship). The memo
    ([`docs/strategy/import-fact-subject-shape-decision.md`](import-fact-subject-shape-decision.md))
    evaluates three options for the legacy
    `import` fact subject shape
    (`subject = "<file>:<target>"`), which differs from
    the new export / symbol substrate's
    `subject = file path` convention. Recommends
    **Option B**: keep the legacy producer shape, make
    `listImportTargetsForFile` (and any future
    file-scoped import helper) compatibility-aware,
    preserve Option A (full producer migration) as a
    future trigger. Documents the helper-based
    compatibility contract: consumers must use
    `listImportTargetsForFile` /
    `listExportsForFile` /
    `listSymbolsForFile` for file-scoped fact lookups
    rather than matching `fact.subject` raw. Defines
    four future-migration triggers (helper compatibility
    branches exceed ~3 callsites; planned
    `EvidenceGraph` `schemaVersion` bump; external author
    confusion; import facts become publication-facing).
21. **(shipped)** Import helper compatibility
    implementation. `@rekon/kernel-findings.listImportTargetsForFile`
    now consults, in order:
    `fact.subject === filePath` (future shape),
    `fact.value.source === filePath` (legacy producer's
    authoritative file field), and the legacy `subject`
    prefix-before-first-`:` (anchored on the full
    normalized file path — no `startsWith` traps).
    New private `matchesFileSubject` predicate is shared
    with `fileImportsTargetMatching` so external rule
    packs see identical file-scoped lookup behavior
    across both helpers. New `extractImportTarget`
    helper prefers `value.target` but falls back to the
    suffix after the first `":"` in legacy-shape
    subjects so older producers without `value.target`
    remain readable. Targets are deduped via a `Set`
    and returned sorted via `localeCompare`. The
    `@rekon/capability-js-ts` import-fact producer is
    UNCHANGED (per the work order and decision memo —
    no producer migration, no artifact migration, no
    `EvidenceGraph` `schemaVersion` bump). Existing
    `EvidenceGraph` artifacts continue to validate. The
    `listExportsForFile` / `listSymbolsForFile` helpers
    are UNCHANGED (the compatibility branch is
    import-specific). 15 new contract tests cover both
    shapes, mixed-shape dedupe, anchored prefix
    matching (no `src/foo.tsx` ↔ `src/foo.ts`
    confusion), path normalization (`./src/foo.ts` vs
    `src/foo.ts` vs backslashes), `value.source`
    authoritative-field behavior, missing-target
    rejection, both export / symbol helper non-regression
    cases, `fileImportsTargetMatching` parity,
    production-shape preservation (JS/TS provider still
    emits `subject = "<file>:<target>"`),
    `rekon artifacts validate` cleanliness, and an
    end-to-end graph-aware filter case proving the
    EvidenceGraph branch now fires against
    production-shaped import data. No new reason codes.
    No source reads at filter time. No AST, no type
    checker. No LLM / semantic / fuzzy / embedding
    matching. No `GraphOntologyValidator` port. No
    version bump. No npm publish.
22. **(shipped)** Graph-aware import-fact consumers v4.
    Updates the three import-consuming graph-aware
    filters (`graphFilterRouteHandlerWithService`,
    `graphFilterRouteHttpMiddlewareOnly`,
    `graphFilterExternalApiCommentOnly`) to deliberately
    prefer `EvidenceGraph` import facts (via the
    compatibility-aware
    `@rekon/kernel-findings.listImportTargetsForFile`)
    over `Finding.details.imports`.
    `route-handler-with-service` precedence was swapped:
    EvidenceGraph runs first, then `details.imports`,
    then `ObservedRepo.files` sibling. The other two
    filters already preferred EvidenceGraph
    (v2 strengthening) but now produce evidence strings
    that name the source ("EvidenceGraph import facts
    …" / "Detector import details …" / "ObservedRepo
    file index …") so audit consumers can tell which
    branch fired. `usedArtifacts: ["EvidenceGraph"]`
    set exactly when the EvidenceGraph branch is the
    one that produced the decision; the runtime cites
    `EvidenceGraph` in
    `FindingFilterReport.header.inputRefs` precisely.
    No new reason codes. No new graph-aware filter
    categories. No producer change. No
    `EvidenceGraph` `schemaVersion` bump. No source
    reads. No AST / type checker. No LLM, semantic,
    fuzzy, or embedding matching. No
    `GraphOntologyValidator` port. 15 new contract
    tests cover both shapes' production end-to-end
    consumption, evidence-string source labels,
    EvidenceGraph-overrides-details semantics for
    route-handler, details-imports fallback paths,
    middleware-only conservative no-op,
    external-api openai/openrouter rejection,
    explicit empty `details.imports` medium-confidence
    fallback, inputRefs precision, raw `FindingReport`
    byte-identity, lifecycle / adjudication /
    coherency exclusion, and `rekon artifacts validate`
    cleanliness.
23. **(shipped)** Graph-aware import evidence publication
    diagnostics. Adds an additive optional
    `evidenceSource: FindingFilterEvidenceSource` field
    on every `FilteredFinding`
    (`EvidenceGraph` / `ObservedRepo` /
    `DetectorDetails` / `Policy` / `BuiltIn` /
    `ResultFilter` / `Unknown`). `FindingFilterHealthSummary`
    gains `byEvidenceSource`,
    `graphAwareByEvidenceSource`,
    `graphAwareReasonEvidenceSources` (per-reason ×
    per-source matrix), and
    `dominantGraphAwareEvidenceSource` (alphabetic
    tiebreak, rate over `graphAwareFiltered`). Three
    new advisory alerts:
    `graph-aware-details-fallback-dominance`
    (DetectorDetails >= 50% of graph-aware),
    `graph-aware-observedrepo-fallback-dominance`
    (ObservedRepo >= 50%), and
    `graph-aware-evidencegraph-low-usage`
    (EvidenceGraph < 25%) — all gated on
    `graphAwareFiltered >= 5`. Architecture summary
    publication renders a `Graph-Aware Evidence Sources`
    table + per-reason × per-source breakdown + audit
    pointer; agent contract renders a compact
    `Graph-aware evidence sources:` list and adds a new
    "Do Not Do" reminder against treating
    DetectorDetails fallback as equivalent to
    EvidenceGraph-backed evidence. Pipeline behavior
    unchanged — diagnostic surface only. Older
    `FindingFilterReport` artifacts continue to validate
    (additive optional). Producer unchanged. No new
    reason codes. No source reads. No AST / type
    checker. No LLM / semantic / fuzzy / embedding
    matching. No `GraphOntologyValidator` port. 19 new
    contract tests cover per-source attribution across
    all five pipeline stages, summary-level aggregations,
    three new alerts, architecture summary + agent
    contract surfacing, raw `FindingReport` byte-identity,
    and `rekon artifacts validate` cleanliness. The
    diagnostic data feeds the future Option A producer-
    migration decision (per the import-fact
    subject-shape decision memo).
24. **(shipped)** Graph-aware import evidence operator
    review. Strategy-only batch — no runtime behavior
    changes. The memo
    ([`docs/strategy/graph-aware-import-evidence-operator-review.md`](graph-aware-import-evidence-operator-review.md))
    consumes the new diagnostic surface against
    available fixtures
    (`examples/simple-js-ts`,
    `examples/import-boundary-rule-pack/fixtures/bad-imports`,
    `examples/custom-capability`) and concludes
    **Option C (Hybrid — defer producer migration) for
    alpha**: zero graph-aware filter decisions fire in
    any available fixture, none of the four migration
    triggers from the import-fact subject-shape
    decision memo is met (helper compatibility has
    exactly one implementation site / two consumers;
    no `EvidenceGraph` `schemaVersion` bump planned;
    no external authors exist pre-publish; import
    facts are not publication-facing). The decision is
    durable for the entire alpha window. The
    recommended next implementation slice is
    *graph-aware filtering fixture expansion* — add
    deterministic fixtures that exercise the new
    diagnostic surface with real EvidenceGraph-backed
    matches so the next operator review has richer
    data to consume.
25. **(shipped)** Graph-aware filtering fixture
    expansion. Three deterministic regression
    fixtures under
    `tests/fixtures/graph-aware-filters/`
    (`route-handler`, `external-comment`,
    `nextjs-route`) exercise the EvidenceGraph
    branches of `route-handler-with-service`,
    `external-api-comment-only`, and
    `nextjs-route-convention` end-to-end. Each
    fixture is a small JS/TS source tree that
    `rekon refresh` projects into an
    `EvidenceGraph` with the expected import / export
    facts; the contract test
    `tests/contract/graph-aware-filter-fixtures.test.mjs`
    copies each fixture to a tmpdir (committed
    fixtures stay untouched), seeds a synthetic
    `FindingReport` whose `header.inputRefs` cites
    the latest EvidenceGraph, runs
    `findings filter` + `findings filter-health`, and
    pins: the expected reason fires, evidence string
    mentions EvidenceGraph,
    `FilteredFinding.evidenceSource === "EvidenceGraph"`,
    `FindingFilterReport.header.inputRefs` includes
    EvidenceGraph, raw `FindingReport` still contains
    the finding,
    `FindingFilterHealthSummary.graphAwareByEvidenceSource.EvidenceGraph >= 1`,
    `FindingFilterHealthSummary.graphAwareReasonEvidenceSources[reason].EvidenceGraph >= 1`,
    `rekon artifacts validate` stays clean, lifecycle
    / adjudication / coherency exclude the
    graph-filtered finding, and end-to-end
    architecture summary + agent contract
    publications surface EvidenceGraph attribution.
    The fixtures are regression data, not product
    examples (they live under `tests/fixtures/`, not
    `examples/`). No filter behavior change, no
    producer change, no schema bump.
26. **(shipped)** Graph-aware import evidence operator
    review refresh. Strategy-only batch — no runtime
    changes ship. The memo
    ([`docs/strategy/graph-aware-import-evidence-operator-review-refresh.md`](graph-aware-import-evidence-operator-review-refresh.md))
    re-runs the prior operator review against the three
    deterministic regression fixtures shipped at
    `702afbf` (`route-handler`, `external-comment`,
    `nextjs-route`). Each fixture was run via the
    temp-copy flow (committed fixture directories
    untouched): `rekon refresh` produced a real
    EvidenceGraph from source; a synthetic
    FindingReport seeded with `header.inputRefs`
    citing the EvidenceGraph drove the filter
    pipeline. **Measured aggregate diagnostics:
    EvidenceGraph attribution 3 (one per fixture);
    DetectorDetails 0; ObservedRepo 0; no
    fallback-dominance alert fires.** Each fixture's
    `graphAwareByEvidenceSource` = `{ EvidenceGraph:
    1 }`; each fixture's `evidenceSource` =
    `"EvidenceGraph"`; each fixture's evidence string
    explicitly names the artifact source. All four
    migration triggers from the import-fact
    subject-shape decision memo re-evaluated against
    measured data — none met. **Option C remains the
    alpha decision.** The supporting non-trigger
    diagnostic — "EvidenceGraph-backed graph-aware
    filters now work in deterministic fixtures" — is
    the strongest available evidence in favor of
    Option C and is the central improvement over the
    prior memo's sparse-data conclusion.
27. **(shipped)** Graph-aware filter fixture coverage
    v2. Three additional regression fixtures under
    `tests/fixtures/graph-aware-filters/`
    (`route-http-middleware-only/`, `factory-file/`,
    `module-gate/`) plus a positive/negative
    contract test at
    `tests/contract/graph-aware-filter-fixtures-v2.test.mjs`
    (6 cases) close the remaining graph-aware
    coverage gap. Every graph-aware reason now has
    end-to-end fixture coverage.
    `route-http-middleware-only` positive case fires
    via EvidenceGraph (route imports only allowed
    `/infra/http/` + `/infra/Identity/` modules; the
    v4 EvidenceGraph branch reads
    `listImportTargetsForFile`); negative case
    correctly KEEPS the finding when the route
    imports `/infra/Database/...`.
    `factory-file-creates-deps` fires via
    path-evidence with `evidenceSource:
    "DetectorDetails"` (no graph artifact consulted;
    matches current v2 design — `usedArtifacts: []`
    maps to DetectorDetails via
    `evidenceSourceFromGraphArtifacts`).
    `module-gate-verified-caller` fires via the
    GateEvaluator path signal with the same
    DetectorDetails attribution. The test does NOT
    force EvidenceGraph attribution where the
    current filter design uses path evidence — it
    asserts current attribution accurately as the
    work order specified. A publication-rendering
    test runs the route-http fixture through
    `publish architecture` + `publish agent-contract`
    and confirms the `Graph-Aware Evidence Sources`
    table + agent-contract evidence-source list
    surface EvidenceGraph and the
    `route-http-middleware-only` reason. All
    fixtures use temp-copy flow; committed fixture
    directories are never mutated. No filter
    behavior change, no producer change, no helper
    change.
28. **(shipped)** Graph-aware fixture coverage
    operator review v2. Strategy-only batch — no
    runtime changes ship. The memo
    ([`docs/strategy/graph-aware-fixture-coverage-operator-review-v2.md`](graph-aware-fixture-coverage-operator-review-v2.md))
    re-runs the operator review's data-gathering
    protocol against the now-six deterministic
    fixtures shipped at `702afbf` and `b2f74b8`
    (`route-handler`, `external-comment`,
    `nextjs-route`, `route-http-middleware-only`
    positive + negative, `factory-file`,
    `module-gate`). **Measured aggregate
    diagnostics across the six filtered cases:
    `EvidenceGraph` attribution 4 (one per
    artifact-backed reason); `DetectorDetails`
    attribution 2 (`factory-file-creates-deps` and
    `module-gate-verified-caller`, both currently
    path-evidence-only); `ObservedRepo` 0; no
    fallback-dominance alert fires.** All four
    migration triggers from the import-fact
    subject-shape decision memo re-evaluated against
    measured data — none met. **Option C remains
    the alpha decision.** The memo extends the
    refresh memo with an explicit per-reason
    artifact-strength review and identifies
    `factory-file-creates-deps` and
    `module-gate-verified-caller` as the next
    evidence-strengthening candidates (not import
    producer migration) — likely via a role / kind
    / ownership projection at the
    EvidenceGraph / CapabilityMap / ObservedSystem
    substrate. No filter behavior change, no
    producer change, no schema bump.
29. **(shipped)** Factory / module-gate artifact
    evidence strengthening v1. Combined strategy +
    implementation batch. The memo
    ([`docs/strategy/factory-module-gate-evidence-strengthening.md`](factory-module-gate-evidence-strengthening.md))
    selects **EvidenceGraph symbol/export facts** as
    the smallest viable projection target and defers
    ObservedSystem.kind projector population
    (capability-model projector currently emits
    first-segment-only owner systems; per-module
    system synthesis is broad enough churn to defer).
    Implementation adds a new top-priority branch to
    each filter:
    `graphFilterFactoryFileCreatesDeps` (A0:
    high-confidence when any symbol/export name
    includes `"Factory"`; medium when name starts
    with `"create"` AND file path includes
    `"Factory"` / `"factory"`) and
    `graphFilterModuleGateVerifiedCaller` (A0:
    high-confidence when any name includes
    `"GateEvaluator"`; medium when name matches
    `/^evaluate.*Gate/`). Both branches set
    `usedArtifacts: ["EvidenceGraph"]`, which the
    classifier maps to `evidenceSource:
    "EvidenceGraph"`. Existing path /
    ObservedSystem.kind / CapabilityMap branches
    survive as fallback for repos without artifact
    coverage. Pinned by
    `tests/contract/factory-module-gate-artifact-evidence.test.mjs`
    (14 cases): factory + module-gate EvidenceGraph
    attribution; evidence-string symbol-name
    citation; path fallback (`DetectorDetails`) when
    symbol/export names don't match; ObservedRepo
    branch (`evidenceSource: "ObservedRepo"`,
    ObservedRepo cited in `inputRefs`) when a
    synthetic `OwnershipMap` + `ObservedRepo` with
    `kind: "module"` is seeded; path fallback when
    artifact + ObservedRepo evidence is missing;
    `inputRefs` cite EvidenceGraph / ObservedRepo
    only when used; raw `FindingReport` byte-preserved;
    lifecycle / adjudication / coherency excludes;
    `FindingFilterHealthSummary.graphAwareByEvidenceSource`
    counts correct per scenario; `artifacts validate`
    stays clean. The v2 fixture contract test
    (`tests/contract/graph-aware-filter-fixtures-v2.test.mjs`)
    updated to assert the new EvidenceGraph
    attribution for factory + module-gate.
    Aggregate fixture diagnostics shift from
    `EvidenceGraph: 4 / DetectorDetails: 2` to
    `EvidenceGraph: 6 / DetectorDetails: 0`
    (against the committed fixtures; path fallback
    still fires for repos with non-canonical
    symbol/export names). No source reads. No
    `GraphOntologyValidator` port. No producer
    migration. No `schemaVersion` bump.
30. **(future)** Per-module `ObservedSystem`
    projection + CapabilityMap `role` field — the
    deferred substrates documented in the
    factory / module-gate v1 memo. Enables branch B
    of `graphFilterModuleGateVerifiedCaller` to
    fire from real fixtures (currently exercised
    only via synthetic test contexts) and gives
    capability authors a first-class way to
    declare role intent. Still no source reads, no
    `GraphOntologyValidator` port, no import
    producer migration.
31. **(shipped)** Graph-aware fixture coverage
    operator review v3. Strategy-only batch — no
    runtime changes ship. The memo
    ([`docs/strategy/graph-aware-fixture-coverage-operator-review-v3.md`](graph-aware-fixture-coverage-operator-review-v3.md))
    re-runs the operator-review protocol against the
    post-strengthening attribution profile (after
    `a2a2d25` shipped factory / module-gate evidence
    strengthening). **Measured aggregate diagnostics
    across the six filtered cases:
    `EvidenceGraph` 6, `DetectorDetails` 0,
    `ObservedRepo` 0; no fallback-dominance alert
    fires.** All four import-fact-producer migration
    triggers re-evaluated — none met. **Option C
    remains the alpha decision.** The memo records
    the **graph-aware v1 / v2 / v3 arc as
    alpha-complete** (criteria: every shipped
    graph-aware reason has deterministic fixture
    coverage; every fixture positive is
    artifact-backed; fallback branches remain in the
    implementation and are pinned by tests; the
    publication-facing diagnostic surface
    distinguishes evidence sources; the negative
    case is pinned; import producer migration is
    not required; no remaining reason needs further
    strengthening before alpha). The memo
    explicitly states **factory / module-gate
    artifact evidence strengthening closes the
    last known fixture-attribution gap** and
    recommends the next implementation slice
    return to the deferred **issue merge decision
    freshness guardrails** (previously deferred
    until filtering / graph-aware parity was
    stronger; that condition is now satisfied). No
    filter behavior change. No producer change.
    No helper change. No `schemaVersion` bump.
32. **(shipped)** Issue merge decision freshness
    guardrails (v1). Combined strategy + implementation
    batch. The memo
    ([`docs/strategy/issue-merge-decision-freshness-guardrails.md`](issue-merge-decision-freshness-guardrails.md))
    pins the freshness predicate as artifact-lineage
    only (no file-system mtime). Implementation adds a
    pure data-only helper
    `detectIssueMergeRollupFreshness` in
    `@rekon/kernel-findings` that emits one of five
    warning codes — `merge-ledger-missing`,
    `merge-ledger-stale`, `adjudication-stale`,
    `lifecycle-stale`, `merge-decision-superseded` —
    in stable A → B → C → D → E order against the
    `CoherencyDelta` / `IssueMergeDecisionLedger` /
    `IssueAdjudicationReport` /
    `FindingLifecycleReport` lineage. Warnings
    surface in three places: architecture summary
    (new `### Merge Roll-up Freshness` subsection
    below `## Accepted Issue Merge Roll-ups`), agent
    contract (new `### Merge Decision Freshness`
    subsection + Do Not Do reminder), and
    `resolve.issue` (new `issue.merge.freshness`
    `resolutionTrace` step, warning string when
    stale, plus ledger / adjudication / lifecycle
    refs added to `IssuePacket.header.inputRefs`).
    All warnings recommend `rekon refresh`. **No
    artifacts are mutated; no auto-refresh; no
    watcher; no file-system mtime.** Pinned by
    `tests/contract/issue-merge-decision-freshness-guardrails.test.mjs`
    (16 cases) covering every rule end-to-end through
    publications + resolver plus the helper's
    `missing` / `fresh` / `stale` branches. No
    schemaVersion bump. No producer change. No
    helper change in `kernel-findings` beyond the
    new exported types + predicate.
33. **(shipped)** Issue merge decision operator
    ergonomics v1. Combined CLI + publication +
    docs + test batch built on top of the
    freshness guardrails (step 32). The memo
    ([`docs/strategy/issue-merge-decision-operator-ergonomics.md`](issue-merge-decision-operator-ergonomics.md))
    adds four operator-facing surfaces:
    - **Filters on `rekon issues merge candidates`**:
      `--undecided` / `--decision accepted|rejected|none`
      / `--stale` / `--superseded` / `--reason`
      / `--strength` / `--limit`. The command response
      now carries a `summary` block (`total`,
      `accepted`, `rejected`, `undecided`, `stale`,
      `superseded`) plus a structured
      `mergeCandidateViews` array.
    - **New `rekon issues merge candidate <id>`
      detail command** returning the full per-view
      shape (candidate + member groups + member
      finding ids + files + latest decision + full
      decisionHistory + current CoherencyDelta
      rollup + merge-rollup freshness +
      recommendedCommands) so operators inspect
      context without opening raw artifacts.
    - **Enhanced `rekon issues merge decide` output**
      with `previousDecision` (or `null` on first
      decide), `changedDecision` (true only when
      the new decision's status differs from the
      prior status), and `recommendedNextCommands`
      (`rekon coherency delta`,
      `rekon publish architecture`,
      `rekon publish agent-contract`).
    - **Publication decision counts**: architecture
      summary renders a `## Merge Candidate
      Decisions` section with `Total / Accepted
      / Rejected / Undecided` counts and the
      recommended filter commands. Agent contract
      renders `### Merge Candidate Decisions` with
      compact counts plus an explicit "Ask the
      operator to review undecided candidates"
      directive. A new `Do Not Do` reminder warns
      agents against assuming candidates are
      accepted.
    New kernel helper
    `buildIssueMergeCandidateViews` plus
    `IssueMergeCandidateView` /
    `IssueMergeCandidateDecisionState` types
    exported from `@rekon/kernel-findings` (additive
    only; no schema bump). Pinned by
    `tests/contract/issue-merge-operator-ergonomics.test.mjs`
    (16 cases) covering every filter combination,
    candidate detail, decide output enhancements,
    publication renderers, the read-only invariant
    (only `decide` writes), and `rekon artifacts
    validate` cleanliness. Merge candidates remain
    advisory; no automatic merging or semantic /
    LLM review. No `schemaVersion` bump. No artifact
    mutation outside the ledger append that
    `decide` already does.
34. **(shipped)** Issue merge decision publication
    / detail polish v2. Combined CLI + publication
    + docs + test polish batch on top of the
    operator-ergonomics v1. The memo
    ([`docs/strategy/issue-merge-decision-publication-detail-polish.md`](issue-merge-decision-publication-detail-polish.md))
    adds four polish surfaces:
    - **Human-readable `rekon issues merge candidate
      <candidate-id>`** when `--json` is absent —
      renders candidate id, decision state,
      strength / confidence / reasons, member
      groups (with status / severity / type /
      files / members), unioned member finding ids
      + files, latest decision + decision-history
      summary, current `CoherencyDelta` roll-up,
      freshness status, warnings + `rekon refresh`
      recommendation when stale, and the recommended
      decide-commands list.
    - **Human-readable `rekon issues merge candidates`**
      — non-JSON renders a summary line
      (`Merge candidates: N total, …`), an optional
      `Filters:` / `Lineage:` / `Merge-rollup
      freshness:` line, a Markdown table, and an
      empty-state line when filters return zero
      matches.
    - **Enhanced `rekon issues merge decisions`** —
      JSON gains a `summary` block (`total`,
      `current`, `superseded`, `accepted`,
      `rejected`) plus a `current` flag per
      decision; `accepted` / `rejected` counts are
      over current decisions only. Non-JSON renders
      the summary plus a Markdown table. The
      ledger contents are unchanged — `current` is
      computed at read time.
    - **Proof report `## Issue Merge Decision
      Context`** — `@rekon/capability-docs.proof-report`
      now reads `IssueAdjudicationReport` and
      `IssueMergeDecisionLedger`, builds
      `mergeCandidateViews`, and renders the new
      section right after the opening paragraph
      with `Merge candidates / Accepted / Rejected
      / Undecided / Accepted roll-ups in
      CoherencyDelta` counts; an accepted-roll-up
      table when accepted decisions exist; and the
      `rekon issues merge candidates --undecided` /
      `--superseded` / `--stale` recommended
      commands when those counts are non-zero. The
      publisher manifest's `consumes` adds
      `IssueMergeDecisionLedger` and a new
      `issue-merge-decision.changed` invalidation
      rule.

    Architecture summary and agent contract get
    tighter command guidance: both now recommend
    `rekon issues merge candidates --decision
    accepted --json` when accepted candidates exist
    (audit path). The architecture summary's
    closing paragraph now points operators at the
    human-readable detail mode explicitly.

    Pinned by
    `tests/contract/issue-merge-publication-detail-polish.test.mjs`
    (17 cases). No artifact mutation outside the
    existing `decide` ledger append. No
    `schemaVersion` bump. No new artifact type. No
    new capability role. No new producer. Merge
    candidates remain advisory; no automatic
    merging or semantic / LLM review.
35. **(shipped)** Verification runner v1 decision
    memo. Strategy-only batch — no runtime changes
    ship. The memo
    ([`docs/strategy/verification-runner-v1-decision.md`](verification-runner-v1-decision.md))
    decides whether Rekon should execute
    verification commands locally and pins the
    safety contract, artifact model, permission
    boundary, log / secret policy, timeout
    policy, and implementation sequence.
    **Recommendation: Option C — hybrid opt-in
    runner.** Manual `rekon verify record`
    remains the default path; a future
    `rekon verify run --plan <id> --execute`
    command (deferred to a later implementation
    slice) opts in to local execution. A new
    sibling **`VerificationRun`** artifact
    records raw bounded execution detail
    (per-command start / end / duration /
    exitCode / status with `timeout` and
    `killed` additions + stdout / stderr digests
    + redacted truncated excerpts + runner
    version + environment summary).
    **`VerificationResult` remains the proof
    summary** consumed by publications and
    resolvers. **New capability:
    `@rekon/capability-verify`**; **new
    permission: `execute:verification`**.
    Safety contract: no execution during
    `rekon refresh` / `publish` / `resolve` /
    `intent` / `reconcile` / `artifacts`; no
    shell interpolation from artifact-supplied
    strings; per-command (120s) + per-plan
    (600s) timeouts with `SIGTERM` → 3s grace →
    `SIGKILL` process-tree kill; bounded
    redacted logs (8 KB / stream / command
    default); no auto-resolution, no auto-apply,
    no source writes, no automatic retries in
    v1. Pinned by
    `tests/docs/verification-runner-v1-decision.test.mjs`
    (18 assertions). Implementation sequence
    (8 steps, deferred): VerificationRun type
    + docs → capability-verify skeleton +
    conformance → dry-run command → opt-in
    execution → redaction / truncation tests →
    VerificationResult derivation → runner-
    produced proof in publications → CI /
    GitHub adapter (out of scope for v1). No
    schemaVersion bump. No new artifact type
    yet (the type lands in the next slice). No
    new capability yet. No new CLI command yet.
    No mutation of any artifact.
36. **(shipped)** VerificationRun artifact +
    `@rekon/capability-verify` skeleton.
    Implements steps 1–2 of the runner v1
    implementation sequence. **No command
    execution.** Adds the `VerificationRun`
    artifact type + helpers
    (`createVerificationRun`,
    `summarizeVerificationRunCommands`,
    `validateVerificationRun`,
    `assertVerificationRun`) to
    `@rekon/capability-intent` next to
    `VerificationResult`. The summary block adds
    `timeout` + `killed` counters; the
    per-command shape adds argv / digests /
    redacted truncated excerpts / runner
    identity / environment summary / redaction
    audit / `timedOut` + `killed` flags. The SDK
    gains a new `"runner"` role, a new
    `execute:verification` permission, a
    `Runner` handler type, and a
    `registry.runner(...)` registration surface;
    conformance tooling rejects unknown roles /
    permissions and rejects runner-role
    manifests that register no runner handler.
    The runtime artifact category map routes
    `VerificationRun` to `actions`. **`@rekon/capability-verify`**
    is a new package whose manifest declares
    `roles: ["runner"]`,
    `permissions: ["execute:verification",
    "read:artifacts", "write:artifacts"]`,
    `consumes: ["VerificationPlan",
    "WorkOrder"]`, `produces: ["VerificationRun",
    "VerificationResult"]`. The package's runner
    handler is a throw-stub
    (`@rekon/capability-verify: command
    execution is not implemented yet.`) — it
    satisfies the SDK's
    manifest-roles-have-handlers invariant
    without actually spawning processes. The
    capability conformance + the SDK additions
    are pinned by
    `tests/contract/verification-run-artifact.test.mjs`
    (9 cases) +
    `tests/contract/verify-capability-skeleton.test.mjs`
    (12 cases) + the package-local
    `packages/capability-verify/test/verify.test.mjs`
    (9 cases) — a total of 30 new contract +
    package tests. `rekon verify record` is
    unchanged; no new CLI command; no
    `rekon verify run` exists yet. New docs:
    `docs/artifacts/verification-run.md`,
    `docs/concepts/verification-runs.md`. The
    verification-runner-v1 decision memo flips
    steps 1–2 to shipped and re-enumerates
    steps 3–8 (dry-run command → opt-in
    execution → redaction/truncation tests →
    `VerificationResult` derivation →
    runner-produced proof in publications →
    CI / GitHub adapter). No source writes; no
    `apply:*` permission; no shell execution.
37. **Shipped (✅).** Verification runner
    dry-run command. Added
    `rekon verify run --plan <id|type:id>
    --dry-run|--preview [--root <path>]
    [--json]`. Resolves the plan, parses each
    command into argv, validates against the
    safety contract (rejects shell-control
    operators, command substitution,
    env-assignment prefixes, newlines, empty
    commands), and writes a planned-but-not-run
    `VerificationRun` artifact (`status:
    "not-run"`, every command `status:
    "not-run"`, runner id
    `"rekon.local.dry-run"`) when every command
    validates. Refuses to write when any
    command is invalid; refuses `--execute`
    with not-implemented; refuses without
    `--dry-run` / `--preview`; refuses without
    `--plan`. No process is spawned; a
    sentinel-file contract test pins this.
    Step 3 of the runner v1 sequence shipped.
    23 new tests; full suite 1036 passed / 1
    skipped. No `VerificationResult`
    derivation; no `rekon verify record`
    behavior change.
38. **Shipped (✅).** Verification runner
    execution v1. Step 4 of the runner v1
    sequence — **first slice that actually
    spawns processes**. Added
    `rekon verify run --plan <id|type:id>
    --execute [--command-timeout-ms <n>]
    [--timeout-ms <n>] [--max-log-bytes <n>]
    [--root <path>] [--json]`. Each command
    is spawned via
    `spawn(argv[0], argv.slice(1))` with
    `shell: false`, a scrubbed env
    (allowlist + secret-name guard; `PATH`
    survives), per-command (default 120 s)
    and per-plan (default 600 s) timeouts
    with `SIGTERM` → 3 s grace →
    `SIGKILL`. sha256 digests over the full
    pre-redaction streams; bounded
    redacted-then-truncated excerpts
    (default 8 KB / stream). Status priority
    `failed > killed > timeout > partial >
    passed > not-run`. CLI exits non-zero on
    `failed` / `timeout` / `killed`;
    artifact is still written. **No
    `VerificationResult` derivation** — that
    is step 39. **No** mutation of
    `FindingStatusLedger`,
    `FindingLifecycleReport`,
    `CoherencyDelta`, or any reconciliation
    surface. 25 new tests; full suite 1060
    passed / 1 skipped.
39. **Shipped (✅).** `VerificationRun` →
    `VerificationResult` derivation. The
    implementation slice settled on a
    dedicated `rekon verify result from-run
    --run <id|type:id> [--allow-not-run]
    [--root <path>] [--json]` command
    rather than a `--write-result` flag on
    `verify run`. Helper:
    `deriveVerificationResultFromRun(input,
    options)` in `@rekon/capability-verify`.
    Pure — no spawn, no rerun. Command-
    status mapping: `passed → passed`;
    `failed → failed`; **`timeout →
    failed`**; **`killed → failed`**;
    `skipped → skipped`; `not-run →
    not-run`. `recordedBy` =
    `"<runner.id>@<runner.version>"`.
    Cites `VerificationRun`,
    `VerificationPlan`, and `WorkOrder` in
    `header.inputRefs`. Carries
    per-command `stdoutDigest` /
    `stderrDigest` but does NOT copy raw
    excerpts. Refuses dry-run / not-run
    runs by default. No mutation of
    `FindingStatusLedger`,
    `FindingLifecycleReport`,
    `CoherencyDelta`, or any
    reconciliation surface. 24 new tests;
    full suite 1084 passed / 1 skipped.
40. **Shipped (✅).** Verification proof
    surfaces v2. Added the shared classifier
    `summarizeVerificationProofSurface` in
    `@rekon/capability-intent`. Proof report
    renders `## Verification Proof Summary`
    with classifier output + digest prefixes
    (no raw excerpts). Architecture summary
    renders `## Verification Proof Status`.
    Agent contract surfaces `Proof source` /
    `Proof freshness`, adds incomplete /
    stale-proof agent instructions, and adds
    two Do Not Do entries against treating
    passed verification as auto-resolution
    or trusting stale / partial / failed /
    timeout / killed / not-run proof.
    `VerificationEvidenceSummary` gains
    `source`, `freshness`, and
    `verificationRunRef` (additive); the
    resolver trace message includes them.
    22 new tests; full suite 1106 passed /
    1 skipped. No artifact-shape changes
    beyond optional additions. No
    `FindingStatusLedger` /
    `FindingLifecycleReport` /
    `CoherencyDelta` /
    `ReconciliationPlan` mutation.
41. **Shipped (✅).** Verification runner CI /
    GitHub adapter **decision memo** (step 8,
    strategy-only). Decision: Option D —
    alpha stays local-first plus a documented
    GitHub Actions workflow template (no
    GitHub API writes;
    `permissions: contents: read`; no
    secrets; no `pull_request_target`).
    First-party GitHub Check / PR comment
    publisher deferred to beta. Anchor
    invariants: GitHub status is not
    canonical truth; forked PRs must not
    receive secret-bearing execution by
    default. See
    [verification-runner-ci-github-decision.md](verification-runner-ci-github-decision.md).
42. **(future)** Verification runner GitHub
    Actions workflow template (alpha
    implementation). Docs-only slice. Adds
    `.github/workflows/rekon-verify.yml`
    template (in `examples/` or
    `docs/examples/`) with
    `permissions: contents: read`, the
    `pull_request_target` prohibition, the
    `actions/upload-artifact` upload of
    `.rekon/artifacts`, and the
    `$GITHUB_STEP_SUMMARY` proof-report
    surface. No GitHub API writes; no new
    capability; no new CLI command.
43. **(future)** Per-module `ObservedSystem`
    projection + CapabilityMap `role` field —
    the deferred substrates documented in the
    factory / module-gate v1 memo. Optional;
    activate if real-repo data shows
    `DetectorDetails` fallback dominance for
    factory / module-gate.
44. **(future)** Persistent exclusion lists, and
    any further product-extension expansion.

## Open Questions

- When should `CoherencyDelta` switch from
  lifecycle / adjudication input to a final
  filtered-governed projection? Likely after step 2 lands.
- ~~Should finding filters be configurable via
  `.rekon/config.json` (allowlist / denylist paths, custom
  reasons)? Deferred until v1 shape proves stable.~~ Resolved
  by Filter policy / configured exclusions v1 (`findingFilters`
  array in `.rekon/config.json`).
- What filter-health alerts matter before beta? v1 ships two:
  high-filter-rate (`filterRate > 0.8`) and
  low-confidence-filtered (`> 0`). Severity-aware alerts and
  reason-specific thresholds can come later.
- Where do we draw the line between deterministic v1 filters and
  the deferred `GraphOntologyValidator` port? Likely a separate
  capability or rule pack rather than core `@rekon/runtime`.

## Cross-References

- [classic-alignment-map.md](classic-alignment-map.md)
- [classic-behavior-roadmap.md](classic-behavior-roadmap.md)
- [classic-guarantee-regression-plan.md](classic-guarantee-regression-plan.md)
- [classic-subsystem-purpose-map.md](classic-subsystem-purpose-map.md)
- [roadmap.md](roadmap.md)
- [../artifacts/finding-report.md](../artifacts/finding-report.md)
- [../artifacts/finding-filter-report.md](../artifacts/finding-filter-report.md)
- [../artifacts/finding-filter-health-report.md](../artifacts/finding-filter-health-report.md)
- [../artifacts/finding-lifecycle-report.md](../artifacts/finding-lifecycle-report.md)
- [../artifacts/finding-status-ledger.md](../artifacts/finding-status-ledger.md)
- [../artifacts/issue-adjudication-report.md](../artifacts/issue-adjudication-report.md)
- [../artifacts/issue-merge-decision-ledger.md](../artifacts/issue-merge-decision-ledger.md)
- [../artifacts/coherency-delta.md](../artifacts/coherency-delta.md)
