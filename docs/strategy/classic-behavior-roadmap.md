# Classic Behavior Roadmap

A phased plan for distilling `codebase-intel-classic` behavior into Rekon.
Each phase moves wins forward without copying the accidents.

This document complements [roadmap.md](roadmap.md). The general roadmap
covers all Rekon work; this document is the classic-aligned subset.

For the per-subsystem workflow-guarantee audit and the P0/P1/P2
regression plan that the next phases must preserve, see
[classic-guarantees-audit.md](classic-guarantees-audit.md),
[classic-guarantee-regression-plan.md](classic-guarantee-regression-plan.md),
and [classic-subsystem-purpose-map.md](classic-subsystem-purpose-map.md).

## Phase A — Already Represented In Rekon

These classic wins exist today in Rekon (alpha spine):

- `EvidenceGraph` via `@rekon/capability-js-ts` and the kernel-evidence
  contract.
- `ObservedRepo`, `OwnershipMap`, `CapabilityMap` via
  `@rekon/capability-model`.
- `GraphSlice` (import, symbol, ownership) via
  `@rekon/capability-graph`.
- `Rulebook` + `Finding` + `FindingReport` via
  `@rekon/capability-policy` and `@rekon/kernel-rulebook` +
  `@rekon/kernel-findings`.
- `ResolverPacket` with `resolutionTrace` via
  `@rekon/capability-resolver`'s `resolve.preflight` resolver.
- `Publication` via `@rekon/capability-docs`.
- `OperatorFeedbackEntry`, `MemoryEvent`, `MemorySelection` via
  `@rekon/capability-memory`.
- `IntentMap`, `WorkOrder`, `VerificationPlan` via
  `@rekon/capability-intent`.
- `ReconciliationPlan`, `ReconciliationLog`, `ActionLog` via
  `@rekon/capability-reconcile`.
- Capability manifests with `consumes`, `produces`, `permissions`,
  `invalidatedBy`, `compatibility`, plus the `validateCapability()` and
  `assertCapabilityConforms()` helpers in `@rekon/sdk`.
- CLI generic dispatch for `evaluator`, `resolver`, and `publisher` roles
  (`rekon evaluate list/run`, `rekon resolve list/run`,
  `rekon publish list/run`).
- Artifact index integrity validation via `rekon artifacts validate`.
- Optional `REKON_DOGFOOD_CLASSIC_ROOT` dogfood regression harness.

## Phase B — Next Distillations

Small, focused batches that move classic wins forward without expanding
scope:

- **First external rule-pack example.** ✅ Shipped as
  `examples/import-boundary-rule-pack`. Community-style evaluator-only
  capability that consumes `EvidenceGraph` and produces a `FindingReport`
  with `import_boundary.parent_relative_import` (medium) and
  `import_boundary.generated_output_import` (high) findings. Aligned to
  `domain/issues/evaluators/imports/*`,
  `domain/issues/RulesResolver.ts`,
  `services/issues/detection-phases.ts`. Operable end-to-end through
  `rekon evaluate list` / `rekon evaluate run import-boundaries.evaluate`.
- **Richer import governance.** Multiple import-related rules (no-dist,
  no-relative-node_modules, layer-boundary, package-public-surface)
  shipped as rule-pack entries with stable ids — extend the rule pack
  above or fork it.
- **Freshness/invalidation engine.** A runtime feature that consumes
  capability `invalidatedBy` rules and updates artifact freshness on
  change events. Aligned to `lib/context-freshness.ts`,
  `lib/watcher-lifecycle.ts`. Initial lineage-based freshness ships
  today as `validateArtifactFreshness()` and
  `rekon artifacts freshness`; path/event-driven invalidation is part
  of the future watcher.
- **Issue lifecycle and status.** ✅ Initial slice shipped:
  `FindingStatusLedger` + `FindingLifecycleReport` + CLI commands
  (`rekon findings list`, `rekon findings lifecycle`,
  `rekon findings status list/set`) + `resolve.issue` annotates
  matched findings with their effective status. Issue merge / dedupe
  / fuzzy semantic matching across runs remains future work; this
  slice keeps id-based matching and explicit operator decisions.
  Aligned to `domain/issues/mergeIssues.ts` and the lifecycle wins
  distilled from `services/IssueDetectionService.ts`.
- **Coherency delta lite.** ✅ Initial slice shipped:
  `CoherencyDelta` artifact derived from `FindingLifecycleReport`,
  with severity / type / system summaries, top affected paths, and a
  basic `remediationQueue` (`p0`/`p1`/`p2` priority by severity).
  `rekon coherency delta` CLI; `@rekon/runtime.buildCoherencyDelta`
  helper. Health score, trend, watch alerts, assistant-doc
  projection, and remediation auto-apply remain deferred. Aligned to
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`.
- **Issue adjudication / dedupe v1 (P1.1 first slice).** ✅
  Shipped. `IssueAdjudicationReport` groups duplicate / overlapping
  findings from `FindingLifecycleReport` into canonical issue
  groups using deterministic key equality
  (`type | ruleId | files | subjects | singleton`). Status /
  lifecycle context survives grouping in `statusBreakdown`; no
  finding is dropped; raw findings, status ledgers, and lifecycle
  reports are **never** mutated. New CLI: `rekon issues
  adjudicate`, `rekon issues list`. The runtime helper
  `@rekon/runtime.buildIssueAdjudicationReport` underpins both.
  Aligned to `services/IssueDetectionService.ts`,
  `domain/issues/mergeIssues.ts`. Semantic / fuzzy matching,
  false-positive scoring, automatic ignore/accept, and LLM review
  are deliberately deferred.
- **Operator-assisted issue merge decision ledger (P1.1
  merge-decisions slice).** ✅ Shipped.
  `IssueMergeDecisionLedger` records explicit
  `accepted` / `rejected` decisions on
  `IssueMergeCandidate` records with required notes and
  optional reasons (`same-root-cause` / `separate-issues` /
  `false-positive-candidate` / `other`). The runtime helper
  `recordIssueMergeDecision` validates the candidate id against
  the latest `IssueAdjudicationReport`, refuses unknown ids
  with a listing of available candidates, and writes a fresh
  ledger artifact that cites the adjudication report plus prior
  ledger. New CLI surface: `rekon issues merge candidates` /
  `rekon issues merge decide <id> --decision … --note … [--reason …] [--decided-by …]` /
  `rekon issues merge decisions`. `rekon issues list` and
  `rekon issues adjudicate` now annotate the
  `mergeCandidates` array with `decision` / `decisionId` /
  `decisionNote` / `decisionReason` / `decisionDecidedAt` /
  `decisionDecidedBy` fields when a ledger exists. Pure helpers:
  `createIssueMergeDecisionLedger`,
  `validateIssueMergeDecisionLedger`,
  `assertIssueMergeDecisionLedger`,
  `issueMergeDecisionLedgerSchema`,
  `findLatestIssueMergeDecision`,
  `applyIssueMergeDecisionsToCandidates`. Ledger is registered
  as a built-in artifact type and is treated as a canonical
  input by `validateArtifactFreshness` (alongside
  `OperatorFeedbackEntry` and `FindingStatusLedger`). Decisions
  do **not** mutate `IssueAdjudicationReport.groups`,
  `FindingReport`, `FindingStatusLedger`, or
  `FindingLifecycleReport`. In v3, `CoherencyDelta` honors
  accepted decisions (see next bullet); `resolve.issue` and the
  publications continue to operate on raw groups in this batch.
  Aligned to `services/IssueDetectionService.ts`,
  `domain/issues/mergeIssues.ts`. Semantic / fuzzy / embedding
  matching, LLM review, false-positive scoring, and automatic
  candidate-merge approval all remain deferred.
- **CoherencyDelta v3 respects accepted merge decisions (P1.1
  coherency-merge slice).** ✅ Shipped. `buildCoherencyDelta`
  now reads the latest `IssueMergeDecisionLedger` (when it
  carries any decisions) and resolves the latest decision per
  `candidateId`. Accepted decisions form connected components
  across the linked `IssueAdjudicationGroup.id` values via a
  deterministic union-find; rejected decisions, and candidates
  with no decision, keep groups separate. Connected components
  collapse into a single merged `CoherencyDeltaItem`
  (`id: coherency:rollup:merged:<sorted-group-ids-joined-by-+>`)
  carrying `mergedIssueGroupIds`, `mergeDecisionIds`,
  `mergeCandidateIds`, a union of `memberFindingIds`, the worst
  severity in the bucket, the canonical group's
  `issueGroupId` / `canonicalFindingId`, and a
  `groupingReasons` array that includes
  `operator-accepted-merge`. The active merged rollup emits one
  remediation step keyed by
  `remediation:merged:<sorted-group-ids-joined-by-+>`. Groups
  not linked by accepted decisions preserve v2 single-group
  item / step behavior. `IssueAdjudicationReport.groups` is
  **not** mutated; the rollup is a derived projection.
  `inputRefs` cite the adjudication report and the ledger
  (only when decisions exist) so `rekon artifacts freshness`
  marks the delta `stale` on a newer `IssueMergeDecisionLedger`.
  New pure helper
  `rollupIssueGroupsByAcceptedMergeDecisions(input)` and three
  additive optional `CoherencyDeltaItem` fields. Aligned to
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta-projections.ts`,
  `services/issues/**`. Publication / resolver awareness of
  accepted merged rollups shipped after this slice (see next
  bullet).
- **Publication and resolver awareness of accepted merge
  decisions (P1.1 merge-awareness slice).** ✅ Shipped.
  Publications now surface operator-accepted merge roll-ups in
  the places humans and agents actually read:
  `@rekon/capability-docs.architecture-summary` renders an
  `## Accepted Issue Merge Roll-ups` section listing every
  `CoherencyDelta` v3 merged rollup item
  (`mergedIssueGroupIds.length > 1`) with rollup id, member
  group ids, decision ids, member finding counts, severity,
  status, and active flag;
  `@rekon/capability-docs.agent-contract` renders an
  `### Accepted Issue Merge Roll-ups` subsection under
  `Active Governance State` plus an explicit `Do Not Do`
  reminder "Do not treat accepted merge roll-ups as automatic
  mutation of raw issue groups; inspect mergedIssueGroupIds and
  memberFindingIds before editing, and consult both member
  groups for context."
  `@rekon/capability-resolver.issueResolver` adds an optional
  `mergeRollup: IssueMergeRollupSummary` field on `IssuePacket`
  (carrying rollup id, merged group ids, decision/candidate ids,
  unioned member finding ids, severity, status, active) and
  attaches it when the matched group is part of an accepted
  merged rollup in the latest `CoherencyDelta`. The packet also
  gains a sibling-group warning, an `issue.merge` /
  `sourceType: "CoherencyDelta"` / `status: "used"` trace entry,
  and `header.inputRefs` cites the `CoherencyDelta`. Rejected
  decisions never produce a `mergeRollup`; the raw fallback
  path is unchanged. All three surfaces read merged rollup
  metadata from `CoherencyDelta` only — none reads
  `IssueMergeDecisionLedger` directly. Manifest update:
  `@rekon/capability-resolver` adds `CoherencyDelta` to
  `consumes`. New `ResolutionTraceEntry.sourceType` enum value
  `"CoherencyDelta"`. Aligned to
  `services/IssueDetectionService.ts`,
  `domain/issues/mergeIssues.ts`,
  `services/ContextHandler.ts`,
  `services/ArchitectureDocsHandler.ts`. Semantic / fuzzy /
  embedding matching, LLM review, false-positive scoring, and
  PR / GitHub / dashboard surfaces remain deferred. Issue
  governance ADR + false-positive filtering audit (next bullet)
  shipped as the next slice ahead of merge-decision freshness
  guardrails.
- **Issue governance ADR + false-positive filtering audit
  (P1.1 filtering v1 slice).** ✅ Shipped. The
  [issue-governance-architecture-decision ADR](issue-governance-architecture-decision.md)
  documents Rekon's layered issue-governance model
  (FindingReport → FindingFilterReport → FindingStatusLedger →
  FindingLifecycleReport → IssueAdjudicationReport →
  CoherencyDelta) and explicitly labels
  `IssueMergeCandidate` / `IssueMergeDecisionLedger` /
  accepted-merge rollups / publication + resolver awareness of
  rollups as Rekon **product extensions**, not classic parity.
  Two new artifact types ship in `@rekon/kernel-findings` and
  `@rekon/sdk`:
  - `FindingFilterReport` records system / policy false-positive
    suppression as a projection over `FindingReport`. The raw
    report is never mutated; filtered findings remain in
    `filteredFindings` with `reason`, `evidence`, optional
    `filePath`, `confidence`, `filteredAt`, and `source`. The
    `keptFindings` projection lives alongside the filtered list
    so downstream consumers can opt in later.
  - `FindingFilterHealthReport` summarizes the latest filter
    report (`totalFindings`, `totalFiltered`, `filterRate`,
    `highConfidenceFiltered`, `lowConfidenceFiltered`,
    `byReason`) and emits deterministic v1 alerts
    (`high-filter-rate` at `filterRate > 0.8`,
    `low-confidence-filtered` for any low-confidence entry).
  Deterministic v1 filter rules: `generated-file` (path segment
  is `dist`, `build`, `generated`, or contains `__generated__`
  / `.generated.`; confidence high), `external-file`
  (`node_modules` / `vendor` / `third_party`; high),
  `test-file` (`test` / `tests` / `__tests__` / `__test__`
  segment, or filename ends with `.test.{ts,tsx,js,jsx,mjs,cjs}`
  / `.spec.{ts,tsx,js,jsx,mjs,cjs}`; high), `canary-file`
  (path contains `canary`; high), and `content-filter`
  (finding text mentions "generated output" plus generated
  path; medium). Priority order
  `generated > external > test > canary > content`.
  `explicit-exclusion` and `policy-exception` reasons reserved
  for future config-driven exclusions. No LLM, semantic, fuzzy,
  or embedding matching; `GraphOntologyValidator` port deferred.
  New helpers in `@rekon/kernel-findings`:
  `applyFindingFilters`, `summarizeFindingFilterReport`,
  `createFindingFilterReport`, `validateFindingFilterReport`,
  `assertFindingFilterReport`, `findingFilterReportSchema`,
  `buildFindingFilterHealth`,
  `createFindingFilterHealthReport`,
  `validateFindingFilterHealthReport`,
  `assertFindingFilterHealthReport`,
  `findingFilterHealthReportSchema`. New runtime helpers
  `buildFindingFilterReport` and
  `buildFindingFilterHealthReport`. New CLI:
  `rekon findings filter` and `rekon findings filter-health`.
  `rekon refresh` adds `findings.filter` and
  `findings.filter-health` steps between `evaluate` and
  `findings.lifecycle`; `REQUIRED_REFRESH_ARTIFACT_TYPES` adds
  `FindingFilterReport` and `FindingFilterHealthReport`.
  Lifecycle / adjudication / coherency consumed `FindingReport`
  directly in this batch; the filter-aware lifecycle slice
  (next bullet) ports them over. Aligned to
  `services/IssueDetectionService.ts`,
  `services/issues/content-filters.ts`,
  `services/issues/issue-result-filters.ts`,
  `services/issues/filter-health.ts`,
  `services/issues/report-persistence.ts`,
  `domain/issues/mergeIssues.ts`.
- **Filter-aware lifecycle / adjudication (P1.1 filter-aware
  lifecycle v1 slice).** ✅ Shipped.
  `@rekon/runtime.buildFindingLifecycleReport` now lists the
  latest `FindingFilterReport` and uses its `keptFindings` as
  the active latest set when the filter report cites the
  latest `FindingReport.id` in its `header.inputRefs`
  (current-enough check). The lifecycle synthesizes a
  `FindingReport`-shaped object that reuses the raw report's
  header (so previous-report lifecycle comparison stays
  stable) but swaps in `keptFindings` as the active surface;
  the raw `FindingReport` on disk is **not** mutated. The
  lifecycle's own `header.inputRefs` cite the
  `FindingFilterReport` (so `rekon artifacts freshness` flags
  lifecycle stale when a newer filter arrives) plus the
  filter report's transitive raw `FindingReport` lineage. When
  the latest filter is missing or stale (does not cite the
  latest `FindingReport`), the lifecycle falls back to the raw
  `FindingReport` transparently and does **not** cite a stale
  filter. `IssueAdjudicationReport` and `CoherencyDelta` are
  filter-aware **transitively** — adjudication consumes the
  lifecycle, and the delta consumes the adjudication, so only
  kept findings flow into governed issue groups, coherency
  items, and the remediation queue. Filtered findings remain
  auditable in `FindingFilterReport.filteredFindings`. No
  schemaVersion bump; no new CLI surface; `rekon refresh` step
  order unchanged. 7 new contract tests in
  `tests/contract/filter-aware-lifecycle-adjudication.test.mjs`
  covering keptFindings preference, raw-fallback,
  stale-filter rejection, transitive adjudication / coherency
  effects, end-to-end CLI rebuild, refresh on a clean
  fixture, and `artifacts validate` cleanliness. Aligned to
  `services/IssueDetectionService.ts`,
  `services/issues/content-filters.ts`,
  `services/issues/issue-result-filters.ts`,
  `services/issues/filter-health.ts`,
  `services/issues/report-persistence.ts`,
  `domain/issues/mergeIssues.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`.
  Filter policy / configured exclusions v1 followed in the next
  slice (see next bullet).
- **Filter policy / configured exclusions v1 (P1.1 filter
  policy v1 slice).** ✅ Shipped. `.rekon/config.json` now
  accepts an optional `findingFilters` array. Each entry is a
  project-specific policy rule with `id`, `reason`,
  `evidence`, optional `confidence`, plus at least one
  deterministic matcher: `pathPattern` (relative glob with
  `*` per-segment, `**` across segments, `?` per-character),
  `type`, `ruleId`, `severity`, `titleIncludes`,
  `descriptionIncludes`. Path patterns are project-relative;
  absolute paths and `..` traversal are rejected at
  validation time. Policy rules run **before** built-in
  deterministic filters, in declared order — the first
  matching rule wins. Filtered entries record
  `source: "policy"` plus `policyId` so the audit trail names
  the rule that suppressed each finding. The raw
  `FindingReport` is **not** mutated. New types in
  `@rekon/kernel-findings`: `FindingFilterPolicyRule`,
  `FindingFilterPolicyValidationIssue`,
  `ApplyFindingFiltersOptions` (now an exported alias for the
  `applyFindingFilters` argument). Two new exported helpers:
  `validateFindingFilterPolicyRules(value)` (used by
  `rekon config validate` to enforce schema; returns
  sanitized rules + sorted issues) and the existing
  `applyFindingFilters` now accepts an optional
  `policies: FindingFilterPolicyRule[]` array.
  `FindingFilterReport.summary.byPolicy` and
  `FindingFilterHealthReport.summary.byPolicy` /
  `summary.policyFiltered` / `summary.unusedPolicies` report
  per-policy diagnostics. Three new policy-aware
  `FindingFilterHealthReport` alerts:
  `policy-over-filtering` (configured policies suppressed
  more than 80 % of findings),
  `low-confidence-policy-filter` (any policy hit at
  `confidence: "low"`), `unused-policy-filter` (any
  configured policy matched zero findings). New runtime
  helper options: `BuildFindingFilterReportOptions.policies`
  and `BuildFindingFilterHealthReportOptions.policies`. CLI:
  `rekon findings filter` and `rekon findings filter-health`
  load `.rekon/config.json` `findingFilters` and pass them
  through; output includes `policyFilters: <count>`.
  `rekon refresh` loads the policies once and forwards them
  to both filter steps. `rekon config validate` enforces the
  policy schema and rejects duplicate ids, missing matchers,
  unknown reasons, and absolute / traversal `pathPattern`.
  19 new contract tests in
  `tests/contract/finding-filter-policy.test.mjs`. Aligned to
  `services/IssueDetectionService.ts`,
  `services/issues/issue-result-filters.ts`,
  `services/issues/content-filters.ts`,
  `services/issues/filter-health.ts`,
  `services/issues/report-persistence.ts`,
  `domain/issues/mergeIssues.ts`, classic `issueExclude`
  config. No LLM, semantic, fuzzy, or embedding matching;
  `GraphOntologyValidator` port and persistent exclusion
  lists remain deferred. Filter health / issue adjudication
  surfaces in publications shipped immediately after this
  slice (see next bullet).
- **Filter health / issue adjudication surfaces in
  publications (P1.1 filter-health-publications v1 slice).**
  ✅ Shipped.
  `@rekon/capability-docs.architecture-summary` now renders a
  `## Finding Filter Health` section sourced from
  `FindingFilterReport` + `FindingFilterHealthReport`. The
  section lists total / kept / filtered counts, filter rate,
  policy-filtered totals, a Filter Reasons table (per-reason
  counts sorted by descending count), a Policy Filters table
  (per-`findingFilters` policy counts plus any unused policy
  ids), and a Filter Health Alerts table (severity / code /
  message). Always closes with "Filtered findings are not
  deleted. Inspect `FindingFilterReport.filteredFindings`
  for the full audit." Missing filter artifacts emit
  `rekon findings filter` / `rekon findings filter-health` /
  `rekon refresh` hints.
  `@rekon/capability-docs.agent-contract` renders a
  `### Finding Filter Health` subsection under
  `Active Governance State` listing kept / filtered counts,
  filter rate, active policy count, and warning count. When
  any alerts exist, the subsection emits a blockquote
  "Filter-health warnings exist. Do not assume active
  governance is complete until filtered findings are
  reviewed." plus up to five alert bullets. Always closes
  with the inspect-FindingFilterReport hint. The `Do Not Do`
  list gains "Do not treat a clean active-governance surface
  as proof that no raw findings exist; inspect
  FindingFilterReport when filter-health warnings exist or
  the filter rate is high."
  Both publications cite `FindingFilterReport` and
  `FindingFilterHealthReport` in `header.inputRefs`, so
  `rekon artifacts freshness` marks them stale on a newer
  filter / health report. Manifest update:
  `@rekon/capability-docs.consumes` adds `FindingFilterReport`
  and `FindingFilterHealthReport`; new `finding-filter.changed`
  invalidation rule (inputs:
  `FindingFilterReport`, `FindingFilterHealthReport`).
  Two new file-local helpers in `packages/capability-docs`:
  `appendArchitectureFindingFilterHealth` and
  `appendAgentContractFindingFilterHealth`, plus a tiny
  `sortedCountEntries(counts, limit)` utility. 12 new
  contract tests in
  `tests/contract/publications-filter-health.test.mjs`.
  Aligned to `services/IssueDetectionService.ts`,
  `services/issues/filter-health.ts`,
  `services/issues/report-persistence.ts`,
  `services/issues/content-filters.ts`,
  `services/issues/issue-result-filters.ts`. Filter policy /
  exclusion persistence v2 shipped immediately after this
  slice (see next bullet).
- **Filter policy / exclusion persistence v2 (P1.1
  filter-policy-suggestions v2 slice).** ✅ Shipped.
  New `FindingFilterPolicySuggestionReport` artifact
  records candidate `findingFilters` rules derived
  deterministically from the latest N `FindingFilterReport`
  artifacts (default 5, configurable via `--recent-limit`).
  New `@rekon/kernel-findings` exports:
  `FindingFilterPolicySuggestion`,
  `FindingFilterPolicySuggestionReason`,
  `FindingFilterPolicySuggestionConfidence`,
  `FindingFilterPolicySuggestionSummary`,
  `FindingFilterPolicySuggestionReport`,
  `DeriveFindingFilterPolicySuggestionsInput`,
  `deriveFindingFilterPolicySuggestions(input)`,
  `summarizeFindingFilterPolicySuggestions(suggestions)`,
  `createFindingFilterPolicySuggestionReport(input)`,
  `validateFindingFilterPolicySuggestionReport(value)`,
  `assertFindingFilterPolicySuggestionReport(value)`,
  `findingFilterPolicySuggestionReportSchema`. Four
  deterministic suggestion reasons:
  `repeated-filtered-policy-gap` (≥ 3 built-in-filtered
  findings under a path prefix not covered by an existing
  rule; high confidence; computed first so it wins over
  `repeated-filtered-path` at the same pathPattern);
  `repeated-filtered-path` (≥ 2 filtered findings under a
  prefix; high confidence ≥ 3 / medium = 2);
  `repeated-filtered-type` (≥ 3 filtered findings sharing
  `finding.type`; medium); and
  `high-volume-filtered-pattern` (one reason > 80 % of
  filtered findings with ≥ 5 findings; low confidence
  review prompt with no `pathPattern`). Path-prefix
  heuristic uses the first two segments; coverage check
  drops any suggestion whose `pathPattern` / `type` is
  already covered by an existing `findingFilters` rule.
  Suggestion + rule ids are deterministic
  (`policy-suggestion:<reason>:<hash>` /
  `suggested-<hash>`) so reruns over the same inputs stay
  stable. New runtime helper
  `buildFindingFilterPolicySuggestionReport(store,
  options?)` reads the latest N filter reports (or the
  pinned set), runs the derivation, and writes the report
  to the `findings` category with `inputRefs` citing every
  consumed `FindingFilterReport`. Registered in
  `BUILT_IN_ARTIFACT_TYPES` (experimental) and
  `ARTIFACT_CATEGORY_BY_TYPE: "findings"`. New CLI:
  `rekon findings filter-policy suggest` /
  `rekon findings filter-policy list` /
  `rekon findings filter-policy apply <suggestion-id>
  [--force]`. `apply` is the only mutating command: it
  reads `.rekon/config.json`, appends the suggested rule to
  `findingFilters`, preserves every other top-level field
  (including project extensions), writes
  `<JSON>\n` atomically, and creates a default config when
  one doesn't exist. `apply` refuses low-confidence
  suggestions and duplicate rule ids without `--force`;
  `suggest` / `list` are strictly read-only. 15 new
  contract tests in
  `tests/contract/finding-filter-policy-suggestions.test.mjs`
  covering all four suggestion rules, coverage-based
  deduplication, evidence + sourceFilterReportIds, CLI
  happy paths (suggest writes report without mutating
  config; list returns latest; apply appends rule),
  low-confidence rejection + --force override,
  duplicate-id rejection + --force override, unrelated
  config field preservation, post-apply
  `rekon config validate` success, and `artifacts validate`
  cleanliness. Aligned to
  `services/IssueDetectionService.ts`,
  `services/issues/issue-result-filters.ts`,
  `services/issues/content-filters.ts`,
  `services/issues/report-persistence.ts`,
  `services/issues/filter-health.ts`, the classic
  `issueExclude` config, `filtered-issues.json`. No LLM,
  semantic, fuzzy, or embedding matching;
  `GraphOntologyValidator` port and persistent exclusion
  lists beyond config-backed rules remain deferred. Filter
  policy suggestions surfaced in architecture summary /
  agent contract shipped immediately after this slice (see
  next bullet).
- **Filter policy suggestions surfaced in architecture
  summary / agent contract (P1.1
  filter-policy-suggestions-publications v2 slice).**
  ✅ Shipped.
  `@rekon/capability-docs.architecture-summary` now reads
  the latest `FindingFilterPolicySuggestionReport`, cites it
  in `header.inputRefs`, and renders a
  `## Finding Filter Policy Suggestions` section with total
  / high / medium / low counts plus a `Suggestion |
  Confidence | Reason | Suggested Rule | Affected Findings |
  Evidence` table (cap 20 rows). Always closes with
  "Suggestions are advisory and do not mutate
  `.rekon/config.json`. Apply explicitly with
  `rekon findings filter-policy apply <suggestion-id>`."
  When low-confidence suggestions exist, the section
  explicitly notes that `--force` is required to apply
  them. When the report does not cite the latest
  `FindingFilterReport`, the section emits a stale banner
  pointing operators back to
  `rekon findings filter-policy suggest`. Missing-report
  branches emit explicit suggest-command hints.
  `@rekon/capability-docs.agent-contract` renders a
  `### Finding Filter Policy Suggestions` subsection under
  `Active Governance State` with `Suggestions available`,
  `High confidence`, and
  `Low confidence requiring --force` counts; when
  suggestions exist, emits an advisory blockquote ("Filter
  policy suggestions are advisory. Do not assume they are
  applied.") plus up to five
  `<id> — <confidence> — <reason> — affected findings: <n>`
  bullets; always closes with "Ask the operator before
  applying filter policy suggestions. Do not mutate
  `.rekon/config.json` unless explicitly instructed." The
  agent contract `Do Not Do` list gains two new reminders:
  "Do not apply filter policy suggestions without explicit
  operator approval; run `rekon findings filter-policy
  apply <id>` only when the operator instructs it." and
  "Do not treat filter policy suggestions as
  already-applied config; they are advisory until
  `rekon findings filter-policy apply` writes them to
  `.rekon/config.json`."
  Both publications cite `FindingFilterPolicySuggestionReport`
  in `header.inputRefs`. Manifest update:
  `@rekon/capability-docs.consumes` adds
  `FindingFilterPolicySuggestionReport`; new
  `finding-filter-policy-suggestions.changed`
  invalidation rule (inputs:
  `FindingFilterPolicySuggestionReport`). New small helper
  `computeFilterPolicySuggestionStale(suggestionReport,
  latestFilterReport)` and renderer helpers
  `appendArchitectureFindingFilterPolicySuggestions` /
  `appendAgentContractFindingFilterPolicySuggestions`,
  plus three tiny utilities (`summarizeSuggestedRule`,
  `summarizeAffectedFindings`, `summarizeEvidence`). 13 new
  contract tests in
  `tests/contract/publications-filter-policy-suggestions.test.mjs`.
  Aligned to `services/IssueDetectionService.ts`,
  `services/issues/issue-result-filters.ts`,
  `services/issues/report-persistence.ts`,
  `services/issues/filter-health.ts`. Config is never
  mutated by publication; `apply` remains the only
  mutating command. Filter policy suggestion apply safety
  v2 (dry-run / diff preview / broad-pattern guard) is the
  recommended next slice.
- **Filter policy suggestion apply safety v2 (P1.1
  filter-policy-apply-safety v2 slice).** ✅ Shipped.
  `rekon findings filter-policy apply` now accepts two new
  flags: `--dry-run` and `--preview` (aliases). Dry-run runs
  the full apply plan — looks up the suggestion, loads
  `.rekon/config.json`, computes the projected
  `findingFilters`, validates it, and emits a JSON plan with
  the proposed rule, structured config diff, warnings,
  blockers, and `wouldRefuse` — without touching the
  filesystem. The diff shape:
  `addedFindingFilters: FindingFilterPolicyRule[]` +
  `replacedFindingFilters: { before, after }[]` +
  `beforeCount` + `afterCount`. Three deterministic
  force-gated blockers:
  - `low-confidence-suggestion` — fires when the suggestion
    has `confidence: "low"`.
  - `broad-path-pattern` — fires when
    `isBroadFindingFilterPolicyRule(rule)` returns `true`.
    The deterministic predicate flags `pathPattern` values
    of `*`, `**`, `**/*`, `*/**`, `.`, `./**`, or a single
    top-level directory (`src/**`, `packages/**`,
    `apps/**`, `lib/**`, `tests/**`, `test/**`, or any other
    `<segment>/**`). Two segments or more (`src/generated/**`)
    is not broad. A rule that adds `type` / `ruleId` /
    `severity` / `titleIncludes` / `descriptionIncludes` is
    not broad regardless of `pathPattern`. A rule with no
    `pathPattern` AND no narrow matcher (the v2 high-volume
    suggestion shape) is also broad.
  - `duplicate-rule-id` — fires when `findingFilters` already
    contains a rule with the suggestion's id. With `--force`
    the existing rule is **replaced** with the suggested
    rule (recorded in `replacedFindingFilters`), not
    appended. Without `--force`, apply refuses with a clear
    error.
  Both dry-run and apply run
  `validateFindingFilterPolicyRules` against the projected
  `findingFilters`. Validation failure refuses the write
  even with `--force` (the high-volume-filtered-pattern
  suggestion deliberately lacks a matcher and therefore
  cannot be applied directly without operator augmentation).
  Malformed `.rekon/config.json` (existing file that is not
  valid JSON or not a JSON object) is never overwritten —
  both dry-run and apply fail with an explicit
  "Failed to parse" message. Unrelated top-level config
  fields are preserved on write. New exports from
  `@rekon/kernel-findings`: `isBroadFindingFilterPolicyRule`,
  `planFindingFilterPolicyApply`, plus shape types
  `FindingFilterPolicyApplyPlan`,
  `FindingFilterPolicyApplyDiff`,
  `FindingFilterPolicyApplyWarning`,
  `FindingFilterPolicyApplyBlocker`,
  `FindingFilterPolicyApplyWarningCode`,
  `FindingFilterPolicyApplyBlockerCode`,
  `PlanFindingFilterPolicyApplyInput`. New CLI helpers in
  `packages/cli/src/index.ts`: `loadConfigForApply`,
  `parseFindingFiltersFromConfig`, `buildAppliedConfig`,
  `formatApplyRefusalMessage`. 21 new contract tests in
  `tests/contract/finding-filter-policy-apply-safety.test.mjs`
  (5 pure-helper tests for `isBroadFindingFilterPolicyRule`
  / `planFindingFilterPolicyApply`, 16 CLI behavior tests).
  Pre-existing
  `tests/contract/finding-filter-policy-suggestions.test.mjs`
  updated to match the new error-shape and to document that
  `--force` on a high-volume rule still fails validation
  (since the rule has no matcher). Aligned to
  `services/IssueDetectionService.ts`,
  `services/issues/issue-result-filters.ts`,
  `services/issues/report-persistence.ts`,
  `services/issues/filter-health.ts`, `config issueExclude`,
  `filtered-issues.json`. No new artifact type. No artifact
  `schemaVersion` bump. No publication shape change. No new
  capability role. No version bump. No npm publish.
  Configured filter policy freshness / publication
  guardrails (warn or rebuild lifecycle / adjudication /
  coherency / publications when filter policy applies
  invalidate the governed surface) is the recommended next
  slice.
- **Configured filter policy freshness / publication
  guardrails (P1.1 filter-policy-freshness v2 slice).**
  ✅ Shipped.
  `FindingFilterReport` now carries an optional, order-sensitive
  `policyFingerprint: { digest, ruleCount, ruleIds }` of the
  `findingFilters` policy set the run used. New exported helper
  `fingerprintFindingFilterPolicies(policies)` in
  `@rekon/kernel-findings` (canonicalizes each rule, preserves
  array order, drops undefined matchers). `buildFindingFilterReport`
  always stamps the fingerprint — including the empty-policy
  fingerprint when no rules are configured — so future
  comparisons distinguish "no fingerprint recorded" (older
  reports → `unknown`) from "ran with zero policies"
  (`ruleCount: 0`). Validator accepts the additive field
  (digest is a non-empty string; ruleCount is a non-negative
  integer; `ruleIds.length === ruleCount`). No schemaVersion
  bump.
  `@rekon/capability-docs.architecture-summary` and
  `@rekon/capability-docs.agent-contract` now read
  `.rekon/config.json` `findingFilters` via the new
  `loadCurrentFindingFilterPolicies(repoRoot)` helper,
  fingerprint the result, and compare against the latest
  `FindingFilterReport.policyFingerprint` via
  `computeFilterPolicyStaleness`. Status is one of:
  - **`fresh`** — fingerprints match; section reports
    "Finding filter policy fingerprint matches the latest
    FindingFilterReport."
  - **`stale`** — fingerprints diverge; section emits a
    blockquote: "`.rekon/config.json` `findingFilters` changed
    after the latest FindingFilterReport was produced. Active
    governance may be stale. Run `rekon refresh` to rebuild
    the filter chain with the current policy set." Agent
    contract additionally warns: "Do not rely on active
    governance until `rekon refresh` rebuilds findings with
    the current `findingFilters` config."
  - **`missing`** — no `FindingFilterReport` indexed; section
    instructs `rekon refresh` (or `rekon findings filter`).
  - **`unknown`** — latest `FindingFilterReport` predates
    filter-policy-freshness v2; section instructs
    `rekon refresh` to regenerate a fingerprinted report.
  Architecture summary renders `## Finding Filter Policy
  Freshness` between `## Finding Filter Health` and
  `## Finding Filter Policy Suggestions`; agent contract
  renders the matching `### Finding Filter Policy Freshness`
  subsection under `Active Governance State`. Both sections
  always list the current vs. report fingerprint (12-char
  short-digest + rule count). The agent contract's `Do Not Do`
  list gains a third filter-related reminder: "Do not rely on
  active issue / coherency counts after `.rekon/config.json`
  `findingFilters` changed until `rekon refresh` has rebuilt
  the filter chain with the current policy set." Both
  publishers gracefully degrade when `input.repo.root` is
  absent (helps synthetic tests).
  `rekon findings filter-policy apply` JSON output gains
  three new fingerprint fields:
  `currentPolicyFingerprint` (state before apply, always
  emitted), `projectedPolicyFingerprint` (dry-run only;
  what the apply would land), and `policyFingerprint`
  (actual apply only; the fingerprint the next
  `rekon refresh` will stamp onto the new
  `FindingFilterReport`).
  Manifest update: the existing
  `finding-filter.changed` invalidation rule's description
  expanded to mention the new Finding Filter Policy
  Freshness section. No new invalidation rule (the existing
  `finding-filter.changed` rule already invalidates
  publications when `FindingFilterReport` changes, and the
  `policyFingerprint` change is part of that artifact). The
  publishers' `publish({ artifacts })` signatures changed to
  `publish({ artifacts, input })` so the runtime-injected
  `repo.root` flows through to the loader.
  19 new contract tests in
  `tests/contract/filter-policy-freshness-guardrails.test.mjs`
  cover: 4 pure-helper tests for `fingerprintFindingFilterPolicies`
  (deterministic, order-sensitive, empty-array stable,
  undefined-matcher-insensitive), 4 pure-helper tests for
  `computeFilterPolicyStaleness` (missing / unknown / fresh /
  stale), 3 loader / refresh integration tests, 2 apply-CLI
  fingerprint tests (dry-run + apply), 4 end-to-end
  publication tests (architecture fresh after refresh,
  architecture stale after config change, agent contract
  stale + Do Not Do reminder, refresh-clears-stale), and 2
  integrity tests (raw `FindingReport` byte-identical,
  `rekon artifacts validate` clean). Aligned to
  `services/IssueDetectionService.ts`,
  `services/issues/issue-result-filters.ts`,
  `services/issues/content-filters.ts`,
  `services/issues/filter-health.ts`,
  `services/issues/report-persistence.ts`, `config issueExclude`.
  No new artifact type. No artifact `schemaVersion` bump
  (additive optional field). No new capability role. No
  watcher / daemon / file-system event loop. No version
  bump. No npm publish. Classic issue filtering parity v2
  (content / result filter expansion: more deterministic
  content filters and issue-result filters; still no
  GraphOntologyValidator or LLM) is the recommended next
  slice.
- **Classic issue filtering parity v2 — content/result
  filter expansion (P1.1 classic-content-result-filters v2
  slice).** ✅ Shipped.
  `Finding` gains an additive optional
  `details?: Record<string, unknown>` so detectors can
  surface structured detail (`stubName`, `stubReason`,
  `imports`, `envVars`, `evidence`, `decisionConcerns`,
  `decisionCapabilities`, `concernTag`, `owner.kind`,
  `otherExports`, `minCapabilityConfidence`, `system`,
  `ownerSystems`) for the classic-inspired filters to
  match against. `FindingFilterReason` extended additively
  with 17 classic-inspired content reasons:
  - **Stub/import family (6):**
    `empty-constructor-stub`,
    `storage-retrieval-placeholder`,
    `client-safe-infra`, `same-directory-import`,
    `svg-namespace-url`, `client-env-node-env`.
  - **Architecture family (5):**
    `speculative-anti-pattern`,
    `archetype-inference-note`,
    `hardcoded-config-not-dde`,
    `ui-http-provider-abstraction`,
    `ui-hook-uses-http-not-db`.
  - **Rule-id family (6):**
    `module-gate-verified-caller`,
    `route-handler-with-service`,
    `route-http-middleware-only`,
    `external-api-comment-only`,
    `factory-file-creates-deps`,
    `nextjs-route-convention`.
  Plus 4 classic-inspired result-filter reasons:
  `below-min-confidence`, `below-min-severity`,
  `outside-selected-system`,
  `configured-path-exclusion`. New exported helpers:
  - `applyFindingContentFilters({ finding })` — pure
    deterministic function returning the first matching
    `{ reason, evidence, filePath, confidence }`.
  - `applyFindingResultFilters(finding, options)` — pure
    deterministic function over
    `FindingResultFilterOptions`
    (`minConfidence` / `severity` / `systems` /
    `pathExcludes`).
  - `validateFindingResultFilterOptions(value)` —
    structural validator wired into `rekon config validate`.
  Filter priority is fixed: `applyFindingFilters` runs
  **policy → classic content → built-in path → result**.
  The pipeline short-circuits on the first match. Every
  filtered finding (including result-filtered) is recorded
  with `source: "system"` (or `"policy"` for policy hits)
  and stays in `FindingFilterReport.filteredFindings`. Raw
  `FindingReport` is never mutated.
  Operators add `findingResultFilters` to
  `.rekon/config.json`:
  ```json
  {
    "findingResultFilters": {
      "minConfidence": 0.7,
      "severity": "medium",
      "systems": ["runtime", "src"],
      "pathExcludes": ["fixtures/**"]
    }
  }
  ```
  `rekon config validate` enforces: `minConfidence` is a
  number in `[0, 1]`; `severity` is one of `critical` /
  `high` / `medium` / `low`; `systems` is an array of
  non-empty strings; `pathExcludes` is an array of
  project-relative glob patterns (absolute paths and `..`
  traversal are rejected). The CLI loader is best-effort
  (invalid entries are dropped at the loader boundary so a
  malformed config doesn't blow up refresh —
  `rekon config validate` is the full diagnostic).
  `rekon findings filter` / `rekon findings filter-health`
  / `rekon refresh` all load and pass result filters
  through.
  `FindingFilterHealthReport.summary` gains two additive
  counts: `contentFiltered` (findings suppressed by a
  classic content filter) and `resultFiltered` (findings
  suppressed by a result filter). Two new alerts:
  - **`content-filter-high-volume`** — one classic content
    reason accounts for `>= 5` findings AND `> 50 %` of
    total findings.
  - **`result-filter-over-filtering`** — configured
    `findingResultFilters` suppress more than 80 % of total
    findings.
  Result filters are explicitly NOT operator status
  decisions: `accepted` / `ignored` / `resolved` remain in
  `FindingStatusLedger` and are unaffected.
  Tests: new
  `tests/contract/finding-content-result-filters.test.mjs`
  (24 tests). Full suite: 612 passed / 1 skipped / 0 failed.
  Aligned to `services/IssueDetectionService.ts`,
  `services/issues/content-filters.ts`,
  `services/issues/content-filter-stub-and-import.ts`,
  `services/issues/content-filter-architecture.ts`,
  `services/issues/content-filter-ruleid.ts`,
  `services/issues/issue-result-filters.ts`. No new
  artifact type. No artifact `schemaVersion` bump. No new
  capability role. No new CLI subcommand or flag. No LLM,
  semantic, fuzzy, or embedding matching. No
  GraphOntologyValidator. No version bump. No npm publish.
  Filter-health diagnostics v2 (richer over-filtering /
  unused-policy / low-confidence / stale-fingerprint
  alerts) is the recommended next slice.
- **Filter-health diagnostics v2 (P1.1
  filter-health-diagnostics v2 slice).** ✅ Shipped.
  `FindingFilterHealthReport.summary` gains six additive
  diagnostic fields:
  - `builtInPathFiltered: number` — findings suppressed by
    built-in path / content heuristics
    (`generated-file` / `external-file` / `test-file` /
    `canary-file` / `content-filter` / `explicit-exclusion` /
    `policy-exception` / `other`). Combined with the
    pre-existing `policyFiltered` / `contentFiltered` /
    `resultFiltered` counts, all four buckets sum to
    `totalFiltered`.
  - `filterRateByReason: Record<string, number>` — per-reason
    rate (`byReason[reason] / totalFindings`), rounded to
    four decimals. Always present; empty when nothing was
    filtered.
  - `filterRateByPolicy?: Record<string, number>` —
    per-policy rate. Present when `byPolicy` is non-empty.
  - `dominantReason?: { reason, count, rate }` — the reason
    that suppressed the most findings (alphabetic tiebreak).
  - `dominantPolicy?: { policyId, count, rate }` — the
    configured policy id that suppressed the most findings
    (alphabetic tiebreak).
  - `policyFingerprint?: FindingFilterPolicyFingerprint` —
    mirror of the upstream
    `FindingFilterReport.policyFingerprint` so health
    consumers don't have to re-read the filter report.
  Six new deterministic alerts:
  - **`reason-over-filtering`** — `totalFindings >= 5` AND
    `dominantReason.rate >= 0.5`. One reason is doing more
    than half the suppression even when the overall filter
    rate is moderate.
  - **`policy-dominance`** — `totalFindings >= 5` AND
    `dominantPolicy.rate >= 0.5`. Same intent as
    `reason-over-filtering` but applied to configured
    policies.
  - **`content-filter-dominance`** — `totalFindings >= 5`
    AND `contentFiltered / totalFindings >= 0.5`. Classic
    content filters are dominating.
  - **`result-filter-dominance`** — `totalFindings >= 5`
    AND `resultFiltered / totalFindings >= 0.5`. Operator-
    configured result filters are dominating.
  - **`policy-fingerprint-missing`** — `policyFiltered > 0`
    AND the upstream `FindingFilterReport` has no
    `policyFingerprint` (report predates
    filter-policy-freshness v2). Mirrors the freshness
    publisher warning.
  - **`stale-policy-fingerprint`** — caller supplied
    `currentPolicyFingerprint` that does not match
    `report.policyFingerprint`. Operator changed
    `.rekon/config.json findingFilters` after the latest
    filter run. Mirrors the freshness publisher warning.
  Dominance thresholds are deliberately lower than the
  over-filtering thresholds (0.5 vs. 0.8) and require a
  minimum corpus size (5 findings) — they surface a
  different failure mode: one rule / category dominating
  even when the overall filter rate is moderate.
  Existing alerts retained:
  `high-filter-rate`, `low-confidence-filtered` (count in
  message), `policy-over-filtering`,
  `low-confidence-policy-filter`, `unused-policy-filter`
  (policy ids in message), `content-filter-high-volume`,
  `result-filter-over-filtering`. Total alert codes: 13.
  Sorted by code for deterministic output.
  New exported classifiers in `@rekon/kernel-findings`:
  - `isPolicyFiltered(entry)` — `source === "policy"` or
    `policyId` set.
  - `isResultFiltered(entry)` — non-policy entry whose
    reason is in the 4-case result-filter set.
  - `isClassicContentFiltered(entry)` — non-policy entry
    whose reason is in the 17-case classic content set.
  - `isBuiltInPathFiltered(entry)` — non-policy entry whose
    reason is in the 8-case built-in path set.
  Policy takes precedence; the other three buckets are
  mutually exclusive over the remainder.
  Plumbing: `buildFindingFilterHealth` /
  `createFindingFilterHealthReport` /
  `buildFindingFilterHealthReport` (runtime) accept an
  optional
  `currentPolicyFingerprint: FindingFilterPolicyFingerprint`.
  `rekon findings filter-health` and `rekon refresh`
  fingerprint the current `.rekon/config.json findingFilters`
  via the existing `loadFindingFilterPolicies` +
  `fingerprintFindingFilterPolicies` and forward it. The
  CLI JSON output for `rekon findings filter-health` also
  echoes `currentPolicyFingerprint` so operators can
  confirm what was loaded.
  Publication impact: no shape change. The architecture
  summary and agent contract render
  `FindingFilterHealthReport.alerts` generically (code +
  message), so the six new alert codes surface
  automatically in the existing Filter Health table /
  subsection. The test suite asserts this end-to-end.
  Filtering decisions are not affected. Raw
  `FindingReport` / `FindingFilterReport` /
  `FindingFilterHealthReport` are not mutated.
  Tests: new
  `tests/contract/finding-filter-health-diagnostics-v2.test.mjs`
  (17 tests; 13 pure-helper + 4 end-to-end). Full suite:
  629 passed / 1 skipped / 0 failed.
  Aligned to `services/issues/filter-health.ts`,
  `services/IssueDetectionService.ts`,
  `services/issues/report-persistence.ts`. No artifact
  `schemaVersion` bump (additive optional fields). No new
  artifact type. No new capability role. No new CLI
  subcommand or flag. No LLM, semantic, fuzzy, or
  embedding matching. No GraphOntologyValidator. No
  version bump. No npm publish.
  Filter policy operator workflow polish (list active
  policies with usage counts; unused / stale /
  low-confidence policy warnings; optional
  `rekon findings filter-policy status`) is the
  recommended next slice.
- **Filter policy operator workflow polish (P1.1
  filter-policy-status v1 slice).** ✅ Shipped.
  New CLI surface `rekon findings filter-policy status
  [--policy <id>] [--warnings-only] [--unused-only]`
  combines the configured `findingFilters` policy set with
  the latest `FindingFilterReport` /
  `FindingFilterHealthReport` /
  `FindingFilterPolicySuggestionReport` into a single
  read-only JSON document. Per-policy entries report:
  - `id`, `reason`, `confidence?`, `matchers`
    (`pathPattern` / `type` / `ruleId` / `severity` /
    `titleIncludes` / `descriptionIncludes`).
  - `usageCount` (from
    `FindingFilterReport.summary.byPolicy`) and `usageRate`
    (from `FindingFilterHealthReport.summary.filterRateByPolicy`,
    or recomputed from `usageCount / totalFindings`).
  - `filteredFindingIds` — sorted list of finding ids this
    policy suppressed in the latest filter run.
  - `warnings[]` and `recommendedActions[]` derived
    deterministically from the data.
  - Convenience flags `isUnused`, `isDominant`,
    `isLowConfidence`, `isBroadPattern`.
  Per-policy warnings:
  - **`unused-policy`** — `usageCount === 0`.
  - **`dominant-policy`** — id matches
    `healthReport.summary.dominantPolicy.policyId` OR
    `usageRate >= 0.5` AND `totalFindings >= 5`.
  - **`low-confidence-policy`** —
    `rule.confidence === "low"` OR a
    `low-confidence-policy-filter` health alert exists AND
    the policy is the dominant policy.
  - **`broad-policy`** —
    `isBroadFindingFilterPolicyRule(rule)` returns `true`
    (reuses the apply-safety v2 predicate).
  - **`stale-policy-fingerprint`** — propagated to every
    policy when the current vs. report fingerprint digests
    diverge.
  Global warnings:
  - **`missing-filter-report`** — no `FindingFilterReport`
    indexed yet. Policy usage counts unavailable.
  - **`missing-filter-health`** — `FindingFilterReport`
    exists but `FindingFilterHealthReport` does not.
    Alerts unavailable.
  Freshness mirrors filter-policy-freshness v2:
  `fresh` / `stale` / `missing-report` / `unknown`. On
  stale / missing / unknown, the response includes a
  `recommendedCommand` (typically `rekon refresh`).
  Suggestions render as advisory records with
  `dryRunCommand` + `applyCommand` strings; low-confidence
  suggestions get `--force` appended to both. The status
  command **never** applies suggestions on its own
  initiative.
  Optional flags `--policy <id>` / `--warnings-only` /
  `--unused-only` narrow the rendered `policies` array;
  `summary` counts always reflect the full policy set so
  operators see both the global state and the narrowed
  view. The CLI emits a `renderedPolicyCount` field so
  callers can tell how many entries the filter left.
  New exported pure helper
  `summarizeFindingFilterPolicyStatus(input)` from
  `@rekon/kernel-findings` (no filesystem access, no
  mutation). New exported types
  `FindingFilterPolicyStatusResult`,
  `FindingFilterPolicyStatusEntry`,
  `FindingFilterPolicyStatusSuggestion`,
  `FindingFilterPolicyStatusSummary`,
  `FindingFilterPolicyStatusWarning`,
  `FindingFilterPolicyStatusFreshness`,
  `SummarizeFindingFilterPolicyStatusInput`. New file-local
  CLI helper `readLatestArtifactOrUndefined<T>(store,
  artifactType)`.
  Command is read-only. `.rekon/config.json` is never
  mutated. `rekon findings filter-policy apply` remains
  the only mutating command. Malformed config fails
  clearly with a "Failed to parse" error and leaves the
  file unchanged.
  18 new contract tests in
  `tests/contract/finding-filter-policy-status.test.mjs`
  (11 pure-helper + 7 CLI behavior). Full suite: 647
  passed / 1 skipped / 0 failed.
  Aligned to `services/IssueDetectionService.ts`,
  `services/issues/issue-result-filters.ts`,
  `services/issues/filter-health.ts`,
  `services/issues/report-persistence.ts`. No artifact
  `schemaVersion` bump. No new artifact type. No new
  capability role. No LLM, semantic, fuzzy, or embedding
  matching. No GraphOntologyValidator. No version bump.
  No npm publish.
  `GraphOntologyValidator`-lite parity audit (identify
  which classic graph / ontology false-positive checks
  are worth reinterpreting; decision memo before
  implementation) is the recommended next slice.
- **`GraphOntologyValidator`-lite parity audit (P1.1
  graph-ontology-validator-lite-audit slice).** ✅ Shipped.
  Docs-only decision memo at
  [docs/strategy/graph-ontology-validator-lite-audit.md](graph-ontology-validator-lite-audit.md).
  Decision: **do not** port `GraphOntologyValidator` as a
  monolithic service. Reproduce the outcome (filtered
  findings with structural evidence), not the
  architecture. Build a future capability-level
  **graph-aware finding filter provider** that consumes
  the existing artifacts (`EvidenceGraph` / `GraphSlice`
  / `ObservedRepo` / `OwnershipMap` / `CapabilityMap`)
  and contributes decisions to `applyFindingFilters` via
  a new optional `graphContext` input. The provider
  emits `FilteredFinding` entries with `source: "system"`
  reusing the existing v2 reasons; no new artifact type,
  no new reason codes. Five candidate checks queued for
  the next implementation slice (route handler with
  sibling — `route-handler-with-service`; route HTTP
  middleware only — `route-http-middleware-only`;
  external-API comment only —
  `external-api-comment-only`; factory file creates deps
  — `factory-file-creates-deps`; module gate verified
  caller — `module-gate-verified-caller`). Explicitly
  rejected / deferred: monolithic validator port,
  source-reading classifier, runtime truth graph
  (no runtime substrate yet), framework-specific catalog,
  LLM / semantic / fuzzy review, persistent merge of
  classic `filtered-issues.json`. Required artifact
  projections (flat file index — likely
  `ObservedRepo.files?` —, optional
  `ObservedSystem.kind?`) ship **first**, before any
  filter logic, to guarantee the provider never silently
  returns zero matches. Per-check input table, future
  regression tests (12 scenarios), recommended
  implementation order, and capability shape sketch all
  in the audit doc. Aligned to
  `infra/validation/GraphOntologyValidator.ts`,
  `services/IssueDetectionService.ts`,
  `services/issues/content-filters.ts`,
  `services/issues/content-filter-ruleid.ts`,
  `services/issues/content-filter-architecture.ts`,
  `services/issues/filter-health.ts`,
  `domain/issues/evaluators/**`,
  `domain/issues/RulesResolver.ts`,
  `services/GraphBuildProvider.ts`,
  `domain/graph/producers/**`. Strategy docs updated:
  ADR (Implementation Order step 13 flipped to shipped;
  new step 14 "Graph-aware finding filter provider v1"),
  subsystem-purpose-map, behavior-roadmap (this entry),
  guarantee-regression-plan, roadmap. Docs-only — no
  runtime changes, no new public API, no `schemaVersion`
  bump. New docs test
  `tests/docs/graph-ontology-validator-lite-audit.test.mjs`
  pins the audit's structure + decisions. No version
  bump. No npm publish.
  Graph-aware finding filter provider v1 (implement the
  five candidate checks; ship required artifact
  projections first) is the recommended next slice.
- **Graph-aware finding filter provider v1 (P1.1
  graph-aware-finding-filter-provider v1 slice).** ✅ Shipped.
  Implements the five candidate checks from
  [`graph-ontology-validator-lite-audit.md`](graph-ontology-validator-lite-audit.md)
  while preserving the audit's invariants: no source-file
  reads, no LLM / semantic / fuzzy / embedding matching,
  no monolithic validator, filtered findings remain
  auditable, raw `FindingReport` never mutated.

  **Repo-model projections (shipped first, per audit
  guidance):**
  - `ObservedRepo.files?: string[]` — flat, repo-relative,
    sorted file index. Absolute paths and `.rekon/`
    artifact paths are dropped at the kernel boundary.
    Populated by `@rekon/capability-model.projector` from
    `kind: "file"` evidence facts.
  - `ObservedSystem.kind?: string` — optional structural
    kind (`module` / `service` / `route` / `ui` /
    `infra` / `unknown` / custom). Threaded through
    `normalizeSystems` so it survives across merges.
  Both are additive optional; older artifacts continue to
  validate and serialize unchanged. No `schemaVersion`
  bump.

  **Kernel additions:**
  - `FindingGraphFilterContext` type — structural "Like"
    sub-shapes (`EvidenceGraphLike`, `ObservedRepoLike`,
    `OwnershipMapLike`, `CapabilityMapLike`,
    `GraphSliceLike`) keep `@rekon/kernel-findings` free
    of `kernel-repo-model` / `kernel-evidence` /
    `kernel-graph` runtime deps. Real artifacts are
    structurally compatible.
  - `applyFindingGraphFilters({ finding, graphContext })`
    — pure deterministic helper. Iterates five private
    case functions in fixed order; returns the first
    matching `FindingGraphFilterDecision` (or `null`).
  - `ApplyFindingFiltersOptions.graphContext?` — additive
    optional input. When absent or empty, the stage is a
    no-op and the pipeline behaves exactly like the v2
    filter stack.

  **Five checks (all reuse existing v2 reason codes):**
  - `route-handler-with-service` — `details.imports`
    includes a `*/handler` import OR
    `ObservedRepo.files` lists a sibling
    `<dir>handler.ts` / `<dir>handler.tsx`.
  - `route-http-middleware-only` — every `/infra/` import
    under `details.imports` lives under `/infra/http/` or
    `/infra/Identity`.
  - `external-api-comment-only` — `details.imports` (or
    `EvidenceGraph` import facts) contain no
    `openai` / `openrouter` / `@openai/*` reference;
    high confidence with graph evidence, medium with
    only detector-supplied imports.
  - `factory-file-creates-deps` — path heuristics
    (`Factory.ts`, `factory.ts`, `core/services/**/init/**`)
    OR `CapabilityMap` capability whose name contains
    `factory` / `init` / `bootstrap` and whose subjects
    include the file.
  - `module-gate-verified-caller` — `GateEvaluator`
    path (high) OR `/modules/` path (medium) OR
    `OwnershipMap` routes the file to an `ObservedSystem`
    whose `kind === "module"` (medium).

  **Pipeline order:** `applyFindingFilters` now runs
  `policy → classic content → graph-aware →
  built-in path → result`. The pipeline short-circuits on
  the first match; graph-aware filters land between the
  content layer and the broad path heuristics so a
  structural match always wins over a generic path
  heuristic but never over an operator-supplied policy.

  **Runtime integration:** `buildFindingFilterReport`
  reads the latest `ObservedRepo` / `OwnershipMap` /
  `CapabilityMap` / `EvidenceGraph` from the store and
  threads them as `graphContext`. New
  `BuildFindingFilterReportOptions.useGraphContext?` lets
  callers opt out (defaults `true`).
  `FindingFilterReport.header.inputRefs` cites a graph
  artifact only when at least one graph-aware match
  actually used the data — so the audit lists exactly the
  evidence the report depended on.

  **Audit invariants:**
  - Every graph-aware match becomes a `FilteredFinding`
    with `source: "system"` and a deterministic
    `evidence` string naming the structural signal.
  - Raw `FindingReport` is never mutated (byte-identical
    before / after).
  - Lifecycle / adjudication / coherency exclude
    graph-filtered findings (the existing filter-aware
    lifecycle handles this automatically because the
    graph stage runs inside `applyFindingFilters`).
  - Missing graph artifacts → conservative no-op.
  - No source-file reads anywhere in filter logic.

  **Tests:** new
  `tests/contract/graph-aware-finding-filters.test.mjs`
  (20 assertions; all passing): 4 repo-model projection
  tests, 11 graph-helper / pipeline tests, 5 end-to-end
  CLI tests covering refresh-populates-files, sibling-
  handler match through CLI with `ObservedRepo`
  `inputRef` citation, lifecycle / adjudication /
  coherency exclusion, raw `FindingReport` byte-
  identity, and `rekon artifacts validate` cleanliness.
  Full suite: 682 passed / 1 skipped / 0 failed.

  Aligned to `infra/validation/GraphOntologyValidator.ts`,
  `services/IssueDetectionService.ts`,
  `services/issues/content-filters.ts`,
  `services/issues/content-filter-ruleid.ts`,
  `services/issues/content-filter-architecture.ts`,
  `services/issues/filter-health.ts`,
  `domain/issues/evaluators/**`,
  `services/GraphBuildProvider.ts`,
  `domain/graph/producers/**`.

  Docs: new `docs/concepts/graph-aware-finding-filters.md`;
  finding-filters + finding-filter-report + refresh
  concepts updated to mention the new stage; audit doc
  status note updated to reflect v1 has shipped; ADR step
  14 flipped to shipped + new step 15 "Graph-aware filter
  provider v1 surfaces in publications / filter health".
  Strategy docs (subsystem-purpose-map, this entry,
  guarantee-regression-plan, roadmap), README, CHANGELOG.

  No new artifact type. No artifact `schemaVersion` bump
  (additive optional fields only). No new capability
  role. No new CLI subcommand or flag. No new reason
  codes (reuses existing v2 codes). No LLM, semantic,
  fuzzy, or embedding matching. No
  `GraphOntologyValidator`. No version bump. No npm
  publish.

  Graph-aware filter provider v1 surfaces in publications
  / filter health (architecture summary + agent contract
  show graph-aware filter counts / reasons; filter health
  distinguishes graph-aware structural filters from
  content / path / result where useful) shipped next; see
  the "Graph-aware filter surfacing in publications /
  filter health" entry below.
- **Graph-aware filter surfacing in publications / filter
  health (P1.1 graph-aware-filter-health-publications
  slice).** ✅ Shipped.
  `FindingFilterHealthSummary` gains a mutually-exclusive
  `graphAwareFiltered` bucket (split out of
  `contentFiltered` — counts always sum to
  `totalFiltered`), plus `byGraphAwareReason`,
  `filterRateByGraphAwareReason`, and
  `dominantGraphAwareReason` (alphabetic tiebreak). Two
  new alerts fire when graph-aware filtering looks
  dominant: `graph-aware-filter-dominance`
  (graph-aware bucket >= 50 % of `totalFindings`) and
  `graph-aware-reason-dominance` (one graph-aware reason
  >= 50 % of `totalFindings`), both gated on
  `totalFindings >= 5`. Architecture summary renders a
  `Graph-Aware Filter Reasons` table sourced from
  `byGraphAwareReason` plus an audit pointer back to
  `FindingFilterReport.filteredFindings`. Agent contract
  renders the graph-aware count, a conditional audit
  instruction when the count is non-zero, and a new
  "Do Not Do" reminder warning agents not to treat
  graph-aware filtering as proof the underlying issue
  never existed. Policy precedence is preserved — a
  `source: "policy"` entry with a graph-aware reason code
  is counted in `policyFiltered`, never inflating
  `graphAwareFiltered` or `byGraphAwareReason`.
  16 new contract tests at
  `tests/contract/graph-aware-filter-health-publications.test.mjs`
  pin classifier behavior, bucket math, alert thresholds,
  publication rendering (table + audit pointer + Do Not
  Do), and `rekon artifacts validate` cleanliness. Aligned
  to `infra/validation/GraphOntologyValidator.ts` outcome
  surfacing — operators / agents can now see *which* layer
  did the suppression without reading the full filter
  audit. No new CLI subcommand or flag. No new reason
  codes. No source-file reads. No LLM, semantic, fuzzy, or
  embedding matching. No `GraphOntologyValidator` port. No
  version bump. No npm publish.

  Graph-aware filter provider v2 (file-existence /
  import-evidence strengthening) is the recommended next
  slice.
- **Issue adjudication v2: deterministic cross-rule merge hints
  (P1.1 merge-hints slice).** ✅ Shipped.
  `IssueAdjudicationReport` now exposes an optional
  `mergeCandidates: IssueMergeCandidate[]` field plus
  `summary.mergeCandidates: number`. After deterministic exact
  grouping runs, the adjudicator inspects every pair of distinct
  groups and emits advisory candidates for pairs that share at
  least two signals out of: `same-file` /
  `overlapping-files` (+0.35), `same-subject` /
  `overlapping-subjects` (+0.30), `same-severity` (+0.10),
  `related-type-prefix` (+0.15), `same-suggested-action`
  (+0.15, deterministic keyword bucket only), `shared-system`
  (+0.15). Confidence is capped at 1.0; strength is `strong`
  (`>= 0.70`), `medium` (`>= 0.45`), or `weak`. Both-inactive
  pairs are skipped entirely; mixed-activity pairs require
  `strong`. `CoherencyDelta` is unchanged — candidates are
  advisory only and do not merge groups, do not affect
  remediation queue counts, and do not mutate any artifact. The
  CLI surface (`rekon issues adjudicate`, `rekon issues list`)
  now includes a `mergeCandidates` array in JSON output. New
  exported helper `deriveMergeCandidates(groups)` lets future
  consumers re-compute hints from any group set. Aligned to
  `services/IssueDetectionService.ts`,
  `domain/issues/mergeIssues.ts`. Semantic / fuzzy / embedding
  matching, LLM review, false-positive scoring, and automatic
  merge approval all remain deferred. Operator-assisted merge
  decisions + CoherencyDelta v3 respects accepted merge
  decisions both shipped after this slice.
- **Stale-source freshness guardrails for adjudication + coherency
  (P1.1 trust slice).** ✅ Shipped. The surfaces that consume
  `IssueAdjudicationReport` and `CoherencyDelta` now render their
  own inline freshness warnings, not just rely on
  `rekon artifacts freshness`. Architecture summary renders
  `## Input Freshness Warnings` when adjudication is older than
  the latest `FindingLifecycleReport`, when coherency cites an
  older adjudication, when coherency was built from raw lifecycle
  while adjudication now exists, or when staleness is transitive.
  The agent operating contract always renders a
  `### Governance Freshness` subsection showing
  `Issue adjudication: fresh / stale / missing` and
  `Coherency delta: fresh / stale / missing`; on stale it adds a
  blockquote telling agents not to treat governed issue counts as
  current until `rekon refresh` runs. `resolve.issue` (group
  mode) emits an `issue.freshness` `resolutionTrace` entry
  (`status: "warning"` when stale, `"used"` when fresh) and adds
  a `packet.warnings[]` entry recommending `rekon issues
  adjudicate` or `rekon refresh`. All guardrails are read-only.
  No artifact mutation; no auto-regeneration; no watcher/daemon.
  Aligned to `services/WatchHandler.ts`,
  `lib/context-freshness.ts`, `services/ContextHandler.ts`,
  `services/IssueDetectionService.ts`. The path to deeper trust
  infrastructure (watchers, path/event invalidation) remains
  deferred.
- **Publications use adjudicated issue groups (P1.1 publication
  consumption slice).** ✅ Shipped. Both
  `@rekon/capability-docs.architecture-summary` and
  `@rekon/capability-docs.agent-contract` now read the latest
  `IssueAdjudicationReport` when one exists, cite it in
  `header.inputRefs`, and render a "Governed Issue Groups"
  section. The architecture summary emits a full group table
  (`Group | Status | Severity | Type | Members | Files`) so
  duplicate / overlapping findings collapse into one governed
  row; member finding ids stay traceable via the `Members`
  column. The agent contract emits a short subsection under
  `Active Governance State` listing the top 5 active groups with
  member counts, plus a `rekon resolve issue --issue <group-id>`
  instruction. Both publications label the Coherency Summary as
  group-aware vs. raw-finding depending on whether `CoherencyDelta`
  was built from adjudicated groups. The agent contract's Do Not
  Do list adds "Do not treat raw finding count as governed
  issue count when an IssueAdjudicationReport exists". When no
  adjudication report is indexed, both publications emit a "run
  `rekon issues adjudicate`" hint. Aligned to
  `services/ArchitectureDocsHandler.ts`, `lib/agent-docs.ts`,
  `services/ContextHandler.ts`. PR/check publisher surfaces,
  health scoring, trend, and dashboard remain deferred.
  `CoherencyDelta` / `IssueAdjudicationReport` freshness +
  stale-source guardrails is the recommended next slice.
- **resolve.issue v2 from IssueAdjudicationReport (P1.1 resolver
  consumption slice).** ✅ Shipped. `resolve.issue` now prefers
  the latest `IssueAdjudicationReport` group over raw findings.
  Matching order: exact `group.id`, exact `canonicalFindingId`,
  exact member `findingId`, unique substring across the group's
  text. A unique match produces a packet with `matchSource:
  "IssueAdjudicationReport"`, `issueGroup` populated
  (`canonicalFindingId`, `memberFindingIds`, `groupingReasons`,
  `statusBreakdown`), the back-compat `issue` field populated
  with the canonical finding's summary, and
  `verificationByFinding` aggregating per-member evidence (the
  top-level `verification` is the worst-status summary
  `failed > partial > not-run > missing > passed`). Ambiguous
  group fragments warn and refuse to silently choose. Missing
  report or no-match queries fall back to the raw `FindingReport`
  path with an explicit fallback trace citing the adjudication
  report. Ownership combines `group.systems` with the existing
  OwnershipMap precedence; contradictions warn. Group-status
  warnings appear for accepted / ignored / resolved / mixed.
  Next-resolver decision: multi-owner → `resolve.seam`,
  single-owner → `resolve.preflight`, no files → `resolve.route`.
  Aligned to `services/IssueDetectionService.ts`,
  `lib/issue-context.ts`, `services/ContextHandler.ts`.
  Semantic / fuzzy matching, false-positive scoring, LLM review,
  auto-resolution, and health scoring all remain deferred.
  Publication consumption (architecture summary + agent contract)
  is the recommended next slice.
- **CoherencyDelta v2 from IssueAdjudicationReport (P1.1
  consumption slice).** ✅ Shipped. `buildCoherencyDelta` now
  consumes the latest `IssueAdjudicationReport` when one exists
  and emits one delta item per group with `issueGroupId` /
  `canonicalFindingId` / `memberFindingIds` / `groupingReasons`,
  plus one remediation step per active group (id
  `remediation:group:<group-id>`). Duplicate findings collapse
  into one row in the governance rollup instead of inflating
  active counts and remediation steps. Status / lifecycle context
  survives via group → item status mapping
  (`active → existing+active`; `mixed+active → existing+active`;
  `accepted/ignored/resolved → same+inactive`). Raw findings
  remain inspectable via `memberFindingIds` and via the unchanged
  `FindingLifecycleReport` artifact. If no adjudication report
  exists, the legacy lifecycle path is preserved with no breaking
  change. `rekon refresh` runs `issues.adjudicate` between
  `findings.lifecycle` and `coherency.delta` so every refreshed
  delta is group-aware. Aligned to
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`,
  `services/IssueDetectionService.ts`. Health scoring, trend, and
  remediation auto-apply remain deferred. `resolve.issue` v2 from
  `IssueAdjudicationReport` is the recommended next slice.
- **Graph slice expansion (consumer-driven).** Add new `GraphSlice`
  producers (route, call, runtime) only when an evaluator/resolver
  consumes them.
- **Route / seam / issue resolvers.** ✅ Shipped in
  `@rekon/capability-resolver`: `resolve.route`, `resolve.seam`, and
  `resolve.issue` resolver handlers alongside the existing
  `resolve.preflight`. Friendly CLI shortcuts (`rekon resolve route`,
  `rekon resolve seam`, `rekon resolve issue`) and generic dispatch
  both work. Each packet carries `resolverId`, `phase`,
  `resolutionTrace`, `warnings`, `nextSteps`, and a
  `nextRequiredResolver` recommendation. Aligned to
  `lib/context/resolver.ts`'s phase model.
- **Architecture-summary publisher.** ✅ Initial slice shipped.
  `@rekon/capability-docs` now registers a second publisher,
  `@rekon/capability-docs.architecture-summary`, that consumes the
  latest `IntelligenceSnapshot`, `ObservedRepo`, `OwnershipMap`,
  `CapabilityMap`, `CoherencyDelta`, and `FindingLifecycleReport` and
  emits a Markdown governance summary with repo overview, owner
  systems, capability map, coherency summary, top affected paths,
  remediation queue, agent guidance, and input refs.
  `rekon publish architecture` invokes it; generic
  `rekon publish run @rekon/capability-docs.architecture-summary` is
  equivalent. Aligned to `services/ArchitectureDocsHandler.ts` and
  the coherency assistant-doc projections; no per-system generated
  doc tree, no AGENTS.md overwrite, no watcher.
- **Remediation work orders from CoherencyDelta.** ✅ Initial slice
  shipped. `@rekon/capability-intent` registers a second actuator,
  `@rekon/capability-intent.remediation-work-order`, that reads the
  latest `CoherencyDelta` and produces prioritized `IntentMap`,
  `WorkOrder`, and `VerificationPlan` artifacts from the active
  `remediationQueue`. The work order excludes accepted/ignored/
  resolved findings, includes explicit anti-gaming guardrails, and
  ships validate/freshness commands in its verification plan.
  `rekon intent remediation` invokes it with optional `--finding`,
  `--priority`, and `--limit` flags. Aligned to classic
  `IntentPreparationService` discipline (objective, scope, checks,
  anti-gaming) without porting the phase parser, semantic triage,
  elicitation state, or auto-apply machinery.
- **Reconciliation plan suggestions.** ✅ Initial slice shipped.
  `@rekon/capability-reconcile.actuator` now supports a suggestion
  mode that consumes the latest remediation `WorkOrder` (where
  `source === "coherency-delta"`) or `CoherencyDelta` and classifies
  each remediation item into a `ReconciliationPlanOperation` with a
  class (`artifact-only`, `source-write-deferred`,
  `command-deferred`, `manual-review`), status, and
  `requiresPermission` list. The package-local `ReconciliationPlan`
  gained an optional `summary` and richer per-operation fields; a
  new `manual_review` operation gives unknown items a first-class
  home instead of being misclassified. `rekon reconcile suggest`
  invokes it with optional `--finding`, `--priority`, `--limit`,
  and `--apply` flags; `--apply` only applies artifact-only
  operations. Existing `rekon reconcile --operation
  docs_regeneration` behavior is unchanged. Aligned to classic
  `PlanHandler` / `PlanExecutorService` discipline (deterministic-
  first, deferred is first-class, dry-run is the default), without
  the auto-apply path.
- **Verification result recording.** ✅ Initial slice shipped.
  `@rekon/capability-intent` exports `createVerificationResult(...)`
  and the package-local `VerificationResult` /
  `VerificationCommandResult` types. `rekon verify record` records
  operator-supplied outcomes against a `VerificationPlan`, deriving
  an overall status (`passed` / `failed` / `partial` / `not-run`),
  filling missing plan commands as `not-run`, and citing the plan
  (and any paired `WorkOrder`) in `header.inputRefs`. Raw
  stdout/stderr is not stored; digests and notes are. Failures are
  preserved as evidence. Rekon does not execute commands in this
  alpha. Aligned to classic intent proof-gate discipline (objective
  proof, failures as evidence, anti-gaming) without porting the
  command runner, CI integration, or semantic judgment.
- **Architecture summary v2 / proof-loop publication.** ✅ Initial
  slice shipped. `@rekon/capability-docs.architecture-summary` now
  reads the latest `WorkOrder` (remediation and resolver),
  `ReconciliationPlan`, `VerificationPlan`, and `VerificationResult`
  alongside the existing snapshot/ownership/coherency inputs, and
  renders four new sections — Work Orders, Reconciliation Plans,
  Verification Status, Proof Loop — between the existing Remediation
  Queue and Agent Guidance sections. The Verification Status section
  surfaces `passed`/`failed`/`partial`/`not-run`, flags incomplete
  verification, and warns when the latest `VerificationResult`
  references an older plan. The Proof Loop section walks
  `governance -> planning -> verification` and emits a single
  "Suggested next command:" line. Manifest `consumes` now includes
  `WorkOrder`, `ReconciliationPlan`, `VerificationPlan`, and
  `VerificationResult`; a new `proof-loop.changed` invalidation rule
  ensures the summary goes stale when any of those change. The
  publication still does not execute commands or judge verification
  sufficiency.
- **Verification-aware issue and remediation context.** ✅ Initial
  slice shipped. `@rekon/capability-intent` exports
  `lookupVerificationEvidence(artifacts, findingId)` plus the
  `VerificationEvidenceStatus` and `VerificationEvidenceSummary`
  types. The helper chains `findingId ->
  WorkOrder.remediationItems -> VerificationPlan.workOrderRef ->
  VerificationResult.verificationPlanRef` and returns a typed
  evidence summary with one of five statuses (`passed`, `failed`,
  `partial`, `not-run`, `missing`).
  `@rekon/capability-resolver.resolve.issue` attaches
  `IssuePacket.verification`, adds status-specific warnings (except
  for `passed`), and writes an `issue.verification`
  `resolutionTrace` entry. Passing verification never mutates the
  `FindingStatusLedger`, `issue.status`, or relatedFindings.
  `rekon intent remediation --skip-verified` (opt-in flag) excludes
  candidate remediation items whose chain resolves to `passed` and
  reports skipped items via `skippedVerified`. Failed, partial,
  not-run, and missing items remain selected. Aligned to classic
  intent proof-gate discipline (failed proof is first-class, passing
  proof informs but does not auto-resolve) without porting the
  command runner, semantic judge, or CI integration.
- **Proof report publication.** ✅ Initial slice shipped.
  `@rekon/capability-docs` registers a third publisher
  `@rekon/capability-docs.proof-report` (alongside the existing
  `.publisher` and `.architecture-summary`). The publisher reads the
  latest available `IntelligenceSnapshot`, `WorkOrder` (remediation
  and resolver), `VerificationPlan`, `VerificationResult`,
  `CoherencyDelta`, `ReconciliationPlan`, and
  `FindingLifecycleReport`, and emits a focused Markdown readout with
  Proof Status, Work Order, Verification Plan, Verification Results,
  Failed / Missing Evidence, Remediation Context, Reconciliation
  Context, Next Recommended Action, and Input Artifacts sections.
  Failed / partial / not-run states render an explicit "Verification
  is not complete." callout; passed renders "This does not
  automatically resolve findings." When no `VerificationPlan` exists,
  the publication is a short stub recommending the next command.
  `rekon publish proof` invokes it; generic
  `rekon publish run @rekon/capability-docs.proof-report` is
  equivalent. `PublicationArtifact.kind` widens to include
  `"proof-report"`. Aligned to classic agent-doc proof visibility
  without porting CI/check-run publishers, the semantic verification
  judge, or auto-completion projection.
- **Classic guarantees audit.** ✅ Initial slice shipped (docs/tests
  only). The audit doc names the original problem, classic workflow
  guarantee, current Rekon equivalent, gap, regression test, and
  next implementation slice for each of the 15 major classic
  subsystems. The companion regression plan lists 7 P0, 6 P1, and 5
  P2 guarantees with concrete proposed tests. The quick-reference
  purpose map is the table future builders read first. `AGENTS.md`
  and `CONTRIBUTING.md` now require a `PURPOSE PRESERVATION CHECK`
  for major batches and explicitly say "do not call classic
  orchestration weight unless the work order identifies which
  guarantee is preserved elsewhere." No runtime behavior changed
  in this batch.
- **`rekon refresh` (P0.1 closure).** ✅ Initial slice shipped.
  `rekon refresh` orchestrates the full Rekon lifecycle —
  `init` → `config.validate` → `observe` → `project` → `snapshot`
  → `evaluate` → `findings.lifecycle` → `coherency.delta` →
  `publish.architecture` → `artifacts.validate` →
  `artifacts.freshness` — in the documented order. Stops on the
  first failure, records per-step status and artifact refs, and
  exposes `--skip-publish` and `--skip-freshness` opt-outs.
  Freshness is judged by **latest major artifact of each type**
  with historical `newer-input-exists` issues filtered, so a second
  back-to-back refresh still reports `passed` even though the
  artifact store keeps prior `FindingReport` / lifecycle entries
  on disk. Closes guarantee P0.1 from
  [classic-guarantee-regression-plan.md](classic-guarantee-regression-plan.md).
  The classic `FullScanHandler` workflow guarantee is preserved
  without porting the cache or per-phase checkpoint artifacts;
  Rekon's `inputRefs` + `artifacts.validate` +
  `artifacts.freshness` cover what those checkpoints recorded.
- **Agent operating contract publication v1 (P1.3 closure).** ✅
  Initial slice shipped. `@rekon/capability-docs` registers a
  fourth publisher `@rekon/capability-docs.agent-contract`
  (alongside `.publisher`, `.architecture-summary`, and
  `.proof-report`). The publisher reads the latest available
  `IntelligenceSnapshot`, `ObservedRepo`, `OwnershipMap`,
  `CapabilityMap`, `CoherencyDelta`, `FindingLifecycleReport`,
  `WorkOrder` (remediation and resolver), `ReconciliationPlan`,
  `VerificationPlan`, `VerificationResult`, and `MemorySelection`,
  and writes an opinionated Markdown operating contract with 13
  sections (How To Use This Contract, Canonical Truth, Operating
  Rules, Resolver Workflow, Ownership And Capabilities, Active
  Governance State, Proof And Verification State, Memory Guidance,
  Required Checks, Do Not Do, Next Recommended Actions, Input
  Artifacts, plus title/metadata). Memory Guidance reads the v1
  ranked `MemorySelection` and shows only items that carry
  reasons (with score, scope, and the reason list). Failed /
  partial / not-run verification renders an explicit "Verification
  is not complete." callout; passing verification renders the
  "does not automatically resolve findings" callout.
  `PublicationArtifact.kind` widens to include `"agent-contract"`.
  `rekon publish agent-contract` invokes the publisher; generic
  `rekon publish run @rekon/capability-docs.agent-contract` is
  equivalent. Root `AGENTS.md` is never overwritten — the
  publication writes only to
  `.rekon/artifacts/publications/agent-contract.md`. Manifest
  `consumes` gains `MemorySelection`; new `memory.changed`
  invalidation rule fires when ranked memory changes. Closes P1.3
  from
  [classic-guarantee-regression-plan.md](classic-guarantee-regression-plan.md).
  Optional export/install command (`rekon agent-contract export
  --output <path>`) and PR/check integration remain future work.
- **Memory ranking / curation v1 (P1.2 closure).** ✅ Initial
  slice shipped. `@rekon/capability-memory` now ranks
  `OperatorFeedbackEntry` recalls deterministically with reason
  attribution. The score blends scope match (path / system /
  capability / tags), verification status, reliability, priority,
  freshness, and specificity. `OperatorFeedbackEntry` gained
  optional `scope.systems` / `scope.capabilities` /
  `scope.layers` / `scope.tags`, `verification`, `reliability`,
  `priority`, `createdAt` / `updatedAt`, `source`, and `status`.
  `MemorySelection` gained `query`, `selected` (with per-item
  `id` / `score` / `reasons` / `match` / `priority` /
  `verification`), and `rejected` (surfacing `deprecated-rejected`
  / `superseded-rejected` / `disputed-rejected` /
  `scope-mismatch`). The legacy `selections[*]` array is
  preserved so the resolver continues to consume memory without
  changes. `rekon memory add` and `rekon memory select` expose
  the new flags (`--system`, `--capability`, `--tag`, `--layer`,
  `--priority`, `--reliability`, `--verified`, `--rationale`,
  `--limit`). Resolver invariant pinned: memory does not mutate
  `ownerSystems`, `risk`, `findings`, `status`, or
  `nextRequiredResolver`. Closes P1.2 from
  [classic-guarantee-regression-plan.md](classic-guarantee-regression-plan.md).
  Promotion / curation engine, supersession chains, usage
  analytics, and decay policies remain future work.
- **Memory usage evidence / curation v1.** Shipped. Records
  explicit operator feedback about how selected memory was used:
  `MemoryUsageLedger` carries per-event `outcome`
  (`helpful` / `ignored` / `harmful` / `stale` / `unclear`) with
  required notes for harmful/stale/ignored. `MemoryCurationReport`
  derives deterministic recommendations (keep / reinforce / review
  / deprecate / supersede-candidate) **without mutating**
  `OperatorFeedbackEntry.status`. New CLI surface: `rekon memory
  usage record`, `rekon memory usage list`, `rekon memory
  curation`. The agent-contract publication renders a short
  "Memory Curation Status" line citing the latest report. Closes
  the next slice of the operator-feedback guarantee under P1.2 in
  [classic-guarantee-regression-plan.md](classic-guarantee-regression-plan.md).
  Automatic promotion, automatic deprecation, supersession chains,
  and LLM summarization remain future work.

## Phase C — Later Maturity

Larger investments, gated by Phase B outcomes and real demand:

- **Semantic augmentation as an opt-in capability role.** A
  `semantic-provider` / `evaluator` capability that calls an LLM under
  explicit `network:outbound` permission, records model/version in
  provenance, and never silently overwrites deterministic facts.
- **Full rulebook compilation.** A capability that compiles YAML
  invariants into `Rulebook` entries and registers evaluators dynamically.
  Aligned to `services/InvariantsCompilationHandler.ts`,
  `lib/analysis/RuleCompilationRunner.ts`.
- **Memory promotion / curation.** A capability that promotes durable,
  verified memory into `Rulebook` entries through a permissioned
  actuator. Aligned to `lib/operator-feedback.ts` promotion semantics.
- **Intent phase preparation (deep slice).** Phase artifact renderer,
  semantic triage, actionability question engine, elicitation state,
  and parallel work-unit scheduling. The remediation work order
  actuator covers the surface-level discipline (objective, scope,
  required checks, anti-gaming); the deeper port still lives in
  `packages/product-codebase-intel/src/intent/**`.
- **Deterministic source-write reconciliation.** Source writes behind
  explicit `write:source` permission per operation, with dry-run still
  the default. Aligned to
  `packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`.
- **Watcher.** A long-running `rekon watch` subcommand that consumes
  freshness rules and emits `WatcherProof` artifacts.
- **GitHub / CI publishers.** A `publisher` capability that maps
  `FindingReport` severities onto GitHub check semantics. Aligned to
  classic GitHub governance payloads.

## Phase D — Deferred Surfaces

These belong outside the local substrate. They consume Rekon as a
dependency rather than living inside the alpha:

- **Dashboard.** Optional hosted UI that reads `Publication` and
  `FindingReport` artifacts.
- **SaaS surface.** Hosted version of Rekon for organization-wide use.
- **Marketplace / discovery.** Capability marketplace and trust model.

## Sequencing Notes

- Phase B work should land in small batches, each with a
  `CODEBASE-INTEL ALIGNMENT` section per `AGENTS.md`.
- Do not skip ahead to Phase C without Phase B's freshness, issue
  lifecycle, and rule-pack distillations in place.
- Phase D surfaces should never be implemented inside the substrate
  repo; they consume `@rekon/*` packages.
- A new Rekon capability should generally trace back to a classic-behavior
  distillation. Pure speculative capabilities are allowed but should be
  marked as experimental exploration and reviewed against the wins.

Cross-references:

- [classic-behavior-distillation.md](classic-behavior-distillation.md)
- [classic-wins.md](classic-wins.md)
- [classic-to-rekon-translation.md](classic-to-rekon-translation.md)
- [classic-refactor-principles.md](classic-refactor-principles.md)
- [classic-alignment-map.md](classic-alignment-map.md)
- [roadmap.md](roadmap.md)
- [codebase-intel-classic-migration.md](codebase-intel-classic-migration.md)
