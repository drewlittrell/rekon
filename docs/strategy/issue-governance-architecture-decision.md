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
16. **(future)** Graph-aware filter provider v2 —
    file-existence / import-evidence strengthening.
17. **(future)** Merge-decision freshness guardrails,
    persistent exclusion lists, and any further
    product-extension expansion.

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
