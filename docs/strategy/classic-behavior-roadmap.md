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
  import-evidence strengthening) shipped next; see the
  "Graph-aware filter provider v2" entry below.
- **Graph-aware finding filter provider v2 — file-existence
  / import-evidence strengthening (P1.1
  graph-aware-finding-filter-provider-v2 slice).** ✅
  Shipped. Strengthens the five v1 checks with deeper
  artifact-backed evidence while preserving every prior
  invariant (no source reads, no LLM / semantic / fuzzy /
  embedding, no monolithic `GraphOntologyValidator` port,
  no new reason codes, raw `FindingReport` never mutated).

  - **New helpers in `@rekon/kernel-findings`.**
    `normalizeRepoPath`, `sameRepoPath`, `siblingPath`,
    `listObservedRepoFiles`, `observedRepoHasFile`,
    `findSiblingFile`, `listImportTargetsForFile`,
    `fileImportsTargetMatching`. Pure deterministic; no
    fs reads. Exported so external rule packs can compose
    graph-aware logic on the same primitives.
  - **Route handler / sibling handler** now consults
    detector-supplied imports first (high), then
    `EvidenceGraph` import facts containing a `*/handler`
    target (high, `usedArtifacts: ["EvidenceGraph"]`),
    then `ObservedRepo.files` sibling `handler.ts` /
    `handler.tsx` (high, `usedArtifacts:
    ["ObservedRepo"]`).
  - **Route HTTP middleware-only** prefers
    `EvidenceGraph` import facts over
    `Finding.details.imports`. Filters only when at least
    one infra import exists AND every infra import lives
    under `/infra/http/` or `/infra/Identity`. No-op when
    no import evidence is available from either source.
  - **External API comment-only** prefers
    `EvidenceGraph` import facts over
    `Finding.details.imports`. An explicit empty
    `details.imports: []` array still proves absence at
    medium confidence. No-op when no import evidence is
    available.
  - **Factory file creates deps** evidence string
    distinguishes path-only matches from CapabilityMap
    matches. Path-evidence runs are no longer cited as
    consulting any artifact (`usedArtifacts: []`).
  - **Module gate verified caller** prefers
    `OwnershipMap` + `ObservedSystem.kind === "module"`
    over the bare `/modules/` path heuristic. The
    GateEvaluator path remains the strongest signal
    (high). When OwnershipMap + ObservedSystem.kind
    confirms the structural routing, evidence cites
    OwnershipMap + ObservedRepo. The `/modules/` path
    heuristic remains as a fallback when no structural
    ownership evidence exists.
  - **`FindingGraphFilterDecision.usedArtifacts`** —
    each decision now returns a deduped list of artifacts
    that contributed evidence
    (`"ObservedRepo"` / `"EvidenceGraph"` /
    `"OwnershipMap"` / `"CapabilityMap"` /
    `"GraphSlice"`).
  - **`ApplyFindingFiltersResult.graphArtifactsUsed`** —
    `applyFindingFilters` collects per-decision
    `usedArtifacts` across the run into a sorted deduped
    array.
  - **Pipeline reorder.** Graph-aware now runs *before*
    classic content (was: after). When both layers can
    match the same finding, the graph-aware version takes
    credit so the audit trail names the strongest source.
    Classic content remains the fallback when graph-aware
    is no-op (missing artifacts). The five shared reason
    codes still bucket as `graphAwareFiltered` in
    filter-health regardless of which stage fired.
  - **Runtime inputRefs precision.**
    `buildFindingFilterReport` now filters its loaded
    graph-input refs by `result.graphArtifactsUsed`, so
    `FindingFilterReport.header.inputRefs` cites only the
    artifacts that actually contributed to a match in
    this run.

  17 new contract tests at
  `tests/contract/graph-aware-finding-filters-v2.test.mjs`
  cover helper behavior, strengthened checks
  (sibling-file / EvidenceGraph routing), conservative
  no-op when evidence is missing, precise
  `graphArtifactsUsed` reporting, end-to-end inputRefs
  citing (ObservedRepo when sibling-file used,
  EvidenceGraph when import-evidence used), raw
  `FindingReport` byte-identity, lifecycle / adjudication
  / coherency exclusion, and `rekon artifacts validate`
  cleanliness. Full suite: 715 passed / 1 skipped / 0
  failed.

  Aligned to `infra/validation/GraphOntologyValidator.ts`,
  `services/issues/content-filter-architecture.ts`,
  `services/IssueDetectionService.ts`,
  `services/GraphBuildProvider.ts`, `domain/graph/producers/**`.
  No artifact `schemaVersion` bump. No new artifact type.
  No new capability role. No new CLI subcommand or flag.
  No version bump. No npm publish.

  Graph-aware filter provider v3 decision memo (review
  what classic checks still warrant porting) shipped next;
  see the "Graph-aware filter provider v3 decision memo"
  entry below.
- **Graph-aware filter provider v3 decision memo — remaining
  classic checks (P1.1
  graph-aware-filter-provider-v3-decision slice).** ✅
  Shipped. Strategy-only batch — no runtime behavior
  changes ship. The memo
  ([`docs/strategy/graph-aware-filter-provider-v3-decision.md`](graph-aware-filter-provider-v3-decision.md))
  evaluates the ten most prominent remaining classic
  graph / ontology checks (UI HTTP provider abstraction,
  UI hook uses HTTP not DB, hardcoded config not DDE,
  module gate verified caller beyond current
  kind/path heuristics, framework-specific route segment
  config conventions, factory-by-capability beyond path,
  provider boundary / external API provider proof,
  runtime truth graph checks, full policy-owner parser,
  test / generated / external graph-ontology checks
  beyond paths) and concludes that **no broad v3 catalog
  ships next**. Every remaining candidate either needs a
  missing artifact projection first
  (`EvidenceGraph` export / symbol facts,
  `CapabilityMap.entries[].role` taxonomy, call-graph /
  referrer evidence), is project-specific (belongs in an
  external rule pack rather than core Rekon), or is
  permanently rejected (monolithic
  `GraphOntologyValidator` port, source-reading filters,
  LLM / semantic / fuzzy / embedding matching). The memo
  recommends the **`EvidenceGraph` export / symbol facts
  projection v1** as the next implementation slice — the
  substrate that unblocks 3–4 v3 candidate checks at
  once (UI hook role, framework-specific route segment
  config beyond v2, capability-confirmed factory). After
  the substrate ships, the follow-up slice should ship
  **one** narrow graph-aware check that depends on it,
  selected based on operator data from the new
  "Graph-Aware Filter Reasons" surface and the two
  graph-aware dominance alerts. Aligned to
  `infra/validation/GraphOntologyValidator.ts`,
  `services/issues/content-filter-*`,
  `services/IssueDetectionService.ts`,
  `services/GraphBuildProvider.ts`, and
  `domain/graph/producers/**`. Docs-only slice; no
  artifact `schemaVersion` bump, no new artifact type,
  no new capability role, no new CLI subcommand or flag,
  no new reason codes, no source reads, no LLM /
  semantic / fuzzy / embedding matching, no
  `GraphOntologyValidator` port, no version bump, no
  npm publish. Pinned by
  `tests/docs/graph-aware-filter-provider-v3-decision.test.mjs`.

  `EvidenceGraph` export / symbol facts projection v1
  (additive optional fact kinds on the existing
  `EvidenceGraph`; no new artifact type; no
  `schemaVersion` bump) shipped next; see the
  "EvidenceGraph export / symbol facts projection v1"
  entry below.
- **EvidenceGraph export / symbol facts projection v1
  (P1.1 evidence-export-symbol-facts-v1 slice).** ✅
  Shipped. The substrate the v3 decision memo
  recommended. `@rekon/capability-js-ts` now emits
  `kind: "export"` and `kind: "symbol"` facts on the
  existing `EvidenceGraph` with the spec'd value shape:

  - **Export facts:** `subject` = repo-relative file
    path; `value: { name, kind, default? }`. `kind` is
    one of `"function" | "class" | "const" | "let" |
    "var" | "type" | "interface" | "namespace" |
    "default" | "unknown"`. `default: true` is set only
    for `export default …` forms. Extraction covers
    named declaration exports (function / class /
    const / let / var / type / interface / namespace /
    enum), default exports (function / class /
    expression), `export { a, b as c }` named lists
    (renamed alias is the exported identifier; source is
    excluded), `export * from "..."`
    (`name: "*", kind: "namespace"`), and
    `export * as alias from "..."`.
  - **Symbol facts:** `subject` = repo-relative file
    path; `value: { name, kind, exported? }`. `exported`
    is `true` when the declaration itself begins with
    `export`; otherwise `false`. Symbols re-exported via
    a separate `export { ... }` clause show up as
    `export` facts (with `exported: false` on the
    symbol) — v1 is conservative about that case so the
    `exported` flag stays a property of the declaration
    site.
  - **Dedupe.** Both kinds dedupe by `kind + subject +
    value` (line intentionally NOT included in
    provenance so duplicate declarations on different
    lines collapse to one fact).

  New exported helpers in `@rekon/kernel-findings`:
  `listExportsForFile(context, filePath)` → sorted
  `FileExportSummary[]`; `listSymbolsForFile(context,
  filePath)` → sorted `FileSymbolSummary[]`. Both return
  the empty array when no facts exist; both normalize
  the input path via the existing v2 helpers.

  **No graph-aware filter consumes the new facts yet.**
  The substrate ships alone, per the v3 memo's
  substrate-first discipline. Existing v1 + v2
  graph-aware filter behavior is unchanged (pinned by
  the new substrate test's "graph-aware filter behavior
  is unchanged in this substrate batch" case). Older
  `EvidenceGraph` artifacts continue to validate (no new
  artifact type, no `schemaVersion` bump).

  Pinned by
  `tests/contract/evidence-export-symbol-facts.test.mjs`
  (13 tests covering: named declaration export shapes,
  default-function / default-class / default-expression
  exports, named-list-with-alias exports, `export *`
  re-exports as namespace, symbol declarations with the
  `exported` flag, deterministic dedupe across multiple
  extractions, older-graph validation, both helpers
  with path normalization, unchanged import-fact subject
  shape, unchanged graph-aware filter decisions, and
  end-to-end `rekon refresh` + `rekon artifacts
  validate` cleanliness against `examples/simple-js-ts`).

  Aligned to `domain/graph/producers/**`,
  `services/GraphBuildProvider.ts`. Deterministic regex
  extraction only — no AST, no type checker, no LLM, no
  semantic role inference, no source-file reads at
  filter time. No new artifact type. No `schemaVersion`
  bump. No new reason codes. No new capability role. No
  new CLI subcommand or flag. No version bump. No npm
  publish.

  The first v3 candidate check that consumes the new
  facts (strongest candidate per the memo:
  strengthening `nextjs-route-convention` to confirm
  route file exports structurally) shipped next; see the
  "Graph-aware Next.js route export convention filter"
  entry below.
- **Graph-aware Next.js route export convention filter
  (P1.1 graph-aware-nextjs-route-export-filter v3
  slice).** ✅ Shipped. First v3 candidate check that
  consumes the new `EvidenceGraph` export facts
  substrate. New `graphFilterNextjsRouteConvention` in
  `@rekon/kernel-findings`:

  - Reads `listExportsForFile` for any
    `routes.single_http_handler_export` finding pointed
    at a `route.ts` file.
  - When export facts exist, suppresses the finding if
    every non-handler named export is in the Next.js
    segment-config set (`runtime` / `dynamic` /
    `revalidate` / `fetchCache` / `preferredRegion`).
    Default exports are ignored; HTTP method names
    (`GET` / `POST` / `PUT` / `PATCH` / `DELETE` /
    `HEAD` / `OPTIONS`) are recognized as handlers and
    excluded from the "extras" set.
  - Decisions carry `usedArtifacts: ["EvidenceGraph"]`
    so the runtime cites EvidenceGraph in
    `FindingFilterReport.header.inputRefs` only when the
    check actually consulted it.
  - Conservative no-op when no export facts exist for
    the file — the legacy classic content filter
    (`details.otherExports`-based) handles that path.

  **Graph evidence is authoritative.** A new helper
  `isNextjsRouteConventionSupersededByGraph` gates the
  classic content fallback inside `applyFindingFilters`:
  when EvidenceGraph carries export facts for a route
  file's
  `routes.single_http_handler_export` finding, the
  classic content fallback is skipped — even if the
  detector-supplied `details.otherExports` would have
  looked clean. The graph-aware decision (filter or
  decline) stands.

  `nextjs-route-convention` moved from
  `CLASSIC_CONTENT_FILTER_REASONS` to
  `GRAPH_AWARE_FILTER_REASONS` so filter-health buckets
  matches as `graphAwareFiltered` whether the graph-aware
  stage or the classic content fallback fired. The
  shared-reason discipline established in
  graph-aware-filter-health-publications v1 holds: the
  reason code identifies the *kind of evidence*, not the
  layer that fired.

  11 new contract tests at
  `tests/contract/graph-aware-nextjs-route-export-filter.test.mjs`
  cover: GET + runtime → filter, full segment-config set
  → filter, GET + helper → veto, GET-only → no-op,
  default-export ignore, graph-overrides-details
  behavior, classic content fallback path,
  `FindingFilterReport.header.inputRefs` precision (cites
  EvidenceGraph when used), raw `FindingReport`
  byte-identity, lifecycle / adjudication / coherency
  exclusion + `rekon artifacts validate` cleanliness,
  filter-health bucketing.

  Aligned to `services/issues/content-filter-ruleid.ts`
  and `services/IssueDetectionService.ts`. No new reason
  codes. No source-file reads at filter time. No AST, no
  type checker. No LLM / semantic / fuzzy / embedding
  inference. No framework-wide Next.js catalog. No new
  capability role. No new CLI subcommand or flag. No
  artifact `schemaVersion` bump. No new artifact type. No
  version bump. No npm publish. Full suite: 755 passed
  / 1 skipped / 0 failed.

  Import-fact subject-shape cleanup decision memo (the
  v1 substrate review packet's documented follow-up)
  shipped next; see the
  "Import-fact subject-shape decision memo" entry below.
- **Import-fact subject-shape decision memo (P1.1
  import-fact-subject-shape-decision slice).** ✅
  Shipped. Strategy-only batch — no runtime behavior
  changes. The memo
  ([`docs/strategy/import-fact-subject-shape-decision.md`](import-fact-subject-shape-decision.md))
  evaluates how Rekon should handle the inconsistency
  between the new
  `EvidenceGraph` export / symbol facts (`subject = file
  path`, shipped at `a776c58`) and the legacy import
  facts (`subject = "<file>:<target>"`).

  **Decision: Option B — compatibility-aware import
  helpers, with Option A (full producer migration)
  preserved as a future trigger.**

  - Five of six built-in `EvidenceGraph` fact kinds use
    `subject = file path`; only `import` uses the
    legacy `"<file>:<target>"` shape.
  - The substrate-side helpers `listExportsForFile` and
    `listSymbolsForFile` work against production data
    because export/symbol producers adopted the new
    shape. `listImportTargetsForFile` does NOT match
    `@rekon/capability-js-ts` production import facts
    today — graph-aware filters relying on it fall back
    to `Finding.details.imports` or
    `ObservedRepo.files` siblings unnoticed (test
    fixtures used the new shape; the example repo has
    no findings).
  - **Option B** lands the correct *consumer* behavior
    in `listImportTargetsForFile` via a small
    `matchesFileSubject` predicate that recognizes
    `fact.subject === filePath`,
    `fact.value.source === filePath`, and the legacy
    `subject` prefix. No producer churn. No
    `schemaVersion` bump. Existing `EvidenceGraph`
    artifacts stay valid.
  - **Option A** (producer migration to
    `subject = file path` for import facts) is the
    cleaner end state but requires regenerating
    every `EvidenceGraph` artifact and risks breaking
    external consumers. Preserved as a future trigger,
    not chosen today.
  - **Option C** (leave as-is permanently) was
    rejected — the
    `listImportTargetsForFile` surface promises
    file-scoped lookup, and leaving it silently broken
    against production data accumulates cost as more
    graph-aware checks land.

  **Future migration triggers for Option A** (any one
  is sufficient): helper compatibility logic exceeds
  ~3 callsites; an `EvidenceGraph` `schemaVersion`
  bump is planned for unrelated reasons; external
  capability authors report confusion about the
  inconsistency; import facts become a
  publication-facing artifact projection.

  **Compatibility contract documented**:
  > Graph-aware consumers must use helper APIs
  > (`listImportTargetsForFile`,
  > `listExportsForFile`,
  > `listSymbolsForFile`) for file-scoped fact lookups.
  > Raw `fact.subject` matching is permitted only by
  > the fact's owning producer or by tests that own
  > the exact shape they construct.

  Docs-only slice. Pinned by
  `tests/docs/import-fact-subject-shape-decision.test.mjs`.
  No artifact `schemaVersion` bump. No new artifact
  type. No new capability role. No new CLI subcommand
  or flag. No new reason codes. No producer change. No
  helper change. No graph-aware filter change. No
  version bump. No npm publish.

  **Import helper compatibility implementation** (the
  follow-up slice that lands the actual
  `listImportTargetsForFile` compatibility branch + the
  graph-aware-filter end-to-end CLI fixture) shipped
  next; see the "Import helper compatibility
  implementation" entry below.
- **Import helper compatibility implementation (P1.1
  import-helper-compatibility slice).** ✅ Shipped.
  Implements Option B of the
  [import-fact subject-shape decision memo](import-fact-subject-shape-decision.md).
  `@rekon/kernel-findings.listImportTargetsForFile`
  now recognizes BOTH the legacy producer shape
  (`subject = "<file>:<target>"`,
  `value: { source, target }`) AND the future
  file-subject shape (`subject = filePath`,
  `value: { target, ... }`).

  - **New private predicate** `matchesFileSubject(fact,
    normalizedFilePath)` consults, in order:
    1. `normalizeRepoPath(fact.subject) ===
       normalizedFilePath` (future shape);
    2. `normalizeRepoPath(fact.value.source) ===
       normalizedFilePath` (legacy producer's
       authoritative file field);
    3. legacy `subject` prefix before the first `":"`
       normalizing to `normalizedFilePath` (anchored on
       the full normalized file path — no `startsWith`
       traps).
  - **New private helper** `extractImportTarget(fact)`
    prefers `value.target` but falls back to the suffix
    after the first `":"` in legacy-shape subjects so
    older producers without `value.target` remain
    readable.
  - **`listImportTargetsForFile`** now dedupes targets
    via a `Set` and returns them sorted via
    `localeCompare`.
  - **`fileImportsTargetMatching`** delegates to the
    new helper so external rule packs see identical
    file-scoped lookup behavior.
  - **`@rekon/capability-js-ts` import-fact producer is
    UNCHANGED.** Per the decision memo + work order: no
    producer migration, no artifact migration, no
    `EvidenceGraph` `schemaVersion` bump. Existing
    `EvidenceGraph` artifacts continue to validate.
  - **`listExportsForFile` / `listSymbolsForFile` are
    UNCHANGED.** The compatibility branch is
    import-specific; export and symbol helpers already
    use the `subject = file path` convention
    natively.

  15 new contract tests at
  `tests/contract/import-helper-compatibility.test.mjs`
  cover: legacy subject shape returns target, future
  file-subject shape returns target, `value.source`
  authoritative-field behavior, mixed-shape dedupe,
  sorted output, `./src/foo.ts` and `src/foo.ts`
  normalization, backslash normalization, anchored
  prefix matching (no `src/foo.tsx` ↔ `src/foo.ts`
  confusion), missing-target rejection,
  `listExportsForFile` non-regression,
  `listSymbolsForFile` non-regression,
  `fileImportsTargetMatching` parity, production JS/TS
  provider import-fact shape preservation (subject
  still `"<file>:<target>"`),
  `rekon artifacts validate` cleanliness, and an
  end-to-end graph-aware filter case proving the
  EvidenceGraph branch now fires against
  production-shaped data. Full suite: 785 passed / 1
  skipped / 0 failed.

  Aligned to `lib/import-graph.ts`,
  `services/GraphBuildProvider.ts`, and
  `domain/graph/producers/**`. No new reason codes.
  No source-file reads at filter time. No AST, no
  type checker. No LLM / semantic / fuzzy / embedding
  matching. No `GraphOntologyValidator` port. No new
  capability role. No new CLI subcommand or flag. No
  artifact `schemaVersion` bump. No new artifact type.
  No producer change. No version bump. No npm publish.

  **Graph-aware import-fact consumers v4** (audit the
  three v1 / v2 graph-aware checks that prefer
  EvidenceGraph imports and confirm their EvidenceGraph
  branches now fire against production data) shipped
  next; see the "Graph-aware import-fact consumers v4"
  entry below.
- **Graph-aware import-fact consumers v4 (P1.1
  graph-aware-import-fact-consumers-v4 slice).** ✅
  Shipped. Updates the three import-consuming
  graph-aware filters (`graphFilterRouteHandlerWithService`,
  `graphFilterRouteHttpMiddlewareOnly`,
  `graphFilterExternalApiCommentOnly`) to deliberately
  prefer `EvidenceGraph` import facts (via the
  compatibility-aware
  `@rekon/kernel-findings.listImportTargetsForFile`)
  over `Finding.details.imports`.

  **`route-handler-with-service` precedence swap.**
  Previously, the detector-supplied `details.imports`
  branch ran *before* the EvidenceGraph branch. v4
  swaps that so EvidenceGraph runs first, then
  `details.imports`, then `ObservedRepo.files`
  sibling. This mirrors the
  `nextjs-route-convention` v3 invariant:
  artifact-backed graph evidence beats detector
  details. (The other two filters,
  `route-http-middleware-only` and
  `external-api-comment-only`, already preferred
  EvidenceGraph from the v2 strengthening; v4 only
  tightens their evidence strings.)

  **Evidence-string source labels.** All three
  filters now emit evidence strings that name the
  source explicitly:
  - `EvidenceGraph import facts show route delegates
    to handler: '<target>'.`
  - `Detector import details show route delegates to
    handler: '<target>'.`
  - `ObservedRepo file index shows route has sibling
    handler file: '<path>'.`
  - `EvidenceGraph import facts show route imports
    only HTTP / Identity middleware infra:
    <imports>.`
  - `Detector import details show route imports only
    HTTP / Identity middleware infra: <imports>.`
  - `EvidenceGraph import facts contain no external
    API package imports (openai / openrouter /
    @openai/*) for '<file>': <targets>.`
  - `Detector import details contain no external API
    package imports …`
  - `Detector import details (explicitly empty
    imports list) contain no external API package
    imports …`

  **`usedArtifacts` tracking unchanged.** Decisions
  consulted via EvidenceGraph return
  `usedArtifacts: ["EvidenceGraph"]`; decisions
  consulted only via `details.imports` return
  `usedArtifacts: []`. The runtime cites
  `EvidenceGraph` in
  `FindingFilterReport.header.inputRefs` exactly when
  at least one decision in the run consulted it.

  15 new contract tests at
  `tests/contract/graph-aware-import-fact-consumers.test.mjs`
  cover: production-shaped legacy EvidenceGraph imports
  for all three filters, EvidenceGraph-overrides-
  details semantics for route-handler,
  details-imports fallback paths,
  middleware-only conservative no-op when
  non-allowed infra import exists,
  external-api openai/openrouter rejection,
  explicit empty `details.imports` medium-confidence
  fallback, `FindingFilterReport.header.inputRefs`
  precision (cites EvidenceGraph when used; does NOT
  cite when only `details.imports` fallback fired),
  raw `FindingReport` byte-identity, lifecycle /
  adjudication / coherency exclusion, and `rekon
  artifacts validate` cleanliness against
  `examples/simple-js-ts`.

  Aligned to `lib/import-graph.ts`,
  `services/GraphBuildProvider.ts`, and
  `domain/graph/producers/**`. No new reason codes.
  No new graph-aware filter categories. No producer
  change. No source-file reads at filter time. No
  AST, no type checker. No LLM / semantic / fuzzy /
  embedding matching. No `GraphOntologyValidator`
  port. No new capability role. No new CLI subcommand
  or flag. No artifact `schemaVersion` bump. No new
  artifact type. No version bump. No npm publish.
  Full suite: 800 passed / 1 skipped / 0 failed.

  **Graph-aware import evidence publication
  diagnostics** (surface whether filters consulted
  EvidenceGraph or fell back to `details.imports` —
  e.g. an `evidenceSource` count in filter-health)
  shipped next; see the entry below.
- **Graph-aware import evidence publication
  diagnostics (P1.1
  graph-aware-import-evidence-publication-diagnostics
  slice).** ✅ Shipped. Adds per-`FilteredFinding`
  `evidenceSource` attribution
  (`EvidenceGraph` / `ObservedRepo` /
  `DetectorDetails` / `Policy` / `BuiltIn` /
  `ResultFilter` / `Unknown`); extends
  `FindingFilterHealthSummary` with `byEvidenceSource`,
  `graphAwareByEvidenceSource`,
  `graphAwareReasonEvidenceSources`, and
  `dominantGraphAwareEvidenceSource`; adds three
  advisory alerts
  (`graph-aware-details-fallback-dominance`,
  `graph-aware-observedrepo-fallback-dominance`,
  `graph-aware-evidencegraph-low-usage`); renders
  Graph-Aware Evidence Sources + per-reason × per-source
  tables in the architecture summary publication and a
  compact `Graph-aware evidence sources:` list in the
  agent contract; adds a new "Do Not Do" reminder
  against treating DetectorDetails fallback as
  equivalent to EvidenceGraph-backed evidence.
  Pipeline behavior unchanged — diagnostic surface
  only. Producer unchanged. Older `FindingFilterReport`
  artifacts continue to validate. 19 new contract tests
  at
  `tests/contract/graph-aware-import-evidence-diagnostics.test.mjs`
  cover per-source attribution across all five pipeline
  stages (graph-aware → EvidenceGraph / ObservedRepo /
  DetectorDetails based on `usedArtifacts`; policy →
  Policy; result filter → ResultFilter; built-in →
  BuiltIn), summary-level aggregations, all three new
  alerts, end-to-end architecture summary + agent
  contract rendering against a seeded fixture, raw
  `FindingReport` byte-identity, and `rekon artifacts
  validate` cleanliness. Full suite: 819 passed / 1
  skipped / 0 failed. Aligned to
  `infra/validation/GraphOntologyValidator.ts`,
  `services/issues/filter-health.ts`,
  `services/IssueDetectionService.ts`,
  `services/GraphBuildProvider.ts`. No new reason
  codes. No source reads. No AST / type checker. No
  LLM / semantic / fuzzy / embedding matching. No
  `GraphOntologyValidator` port. No new capability
  role. No new CLI subcommand or flag. No artifact
  `schemaVersion` bump. No new artifact type. No
  version bump. No npm publish.

  **Graph-aware import evidence operator review**
  (decision memo consuming real diagnostic data from
  operator runs to decide whether the Option A
  producer migration is worth taking) shipped next;
  see the entry below.
- **Graph-aware import evidence operator review (P1.1
  graph-aware-import-evidence-operator-review
  slice).** ✅ Shipped. Strategy-only batch — no
  runtime behavior changes. The memo
  ([`docs/strategy/graph-aware-import-evidence-operator-review.md`](graph-aware-import-evidence-operator-review.md))
  consumes the new diagnostic surface
  (`byEvidenceSource`,
  `graphAwareByEvidenceSource`,
  `graphAwareReasonEvidenceSources`,
  `dominantGraphAwareEvidenceSource`, three
  fallback-dominance alerts) shipped at `499d096`
  against available fixtures and decides whether the
  future Option A producer migration is worth taking
  now.

  **Decision: Option C (Hybrid — defer producer
  migration) for alpha.** The memo explicitly states:
  *"No import fact producer migration in alpha unless
  a trigger is met."*

  **Data gathered:** three local fixtures exercised
  (`examples/simple-js-ts` — 0 findings, 0
  graph-aware; `examples/import-boundary-rule-pack/fixtures/bad-imports`
  — 1 finding, 0 filtered;
  `examples/custom-capability` — 1 finding, 1
  filtered via `BuiltIn` test-file path heuristic).
  **Zero graph-aware filter decisions fire in any
  available fixture.** `byEvidenceSource` IS populated
  correctly when non-graph-aware filters fire
  (confirming the attribution machinery works);
  graph-aware diagnostic surfaces are empty (no
  available fixture exercises them).

  **Four migration triggers evaluated** (from
  [import-fact subject-shape decision memo](import-fact-subject-shape-decision.md)):
  - Helper compatibility callsites > ~3: **Not met.**
    Exactly one `matchesFileSubject` implementation;
    two consumers via delegation.
  - `EvidenceGraph` `schemaVersion` bump planned:
    **Not met.** No bump on the roadmap.
  - External capability author confusion: **Unknown.**
    Pre-publish; no external authors exist yet.
  - Import facts become publication-facing: **Not
    met.** Publications aggregate counts only.

  **Recommended next implementation slice:**
  graph-aware filtering fixture expansion. Add
  deterministic fixtures that exercise the
  EvidenceGraph branches of the import-consuming
  graph-aware filters so the diagnostic surface has
  non-empty real data during development. The next
  operator review will then consume measured
  distributions rather than synthetic test data.

  Docs-only slice. Pinned by
  `tests/docs/graph-aware-import-evidence-operator-review.test.mjs`.
  Aligned to `lib/import-graph.ts`,
  `services/GraphBuildProvider.ts`,
  `domain/graph/producers/**`,
  `services/issues/filter-health.ts`,
  `services/IssueDetectionService.ts`. No artifact
  `schemaVersion` bump. No new artifact type. No new
  capability role. No new CLI subcommand or flag. No
  new reason codes. No producer change. No helper
  change. No graph-aware filter change. No source-file
  reads. No LLM, semantic, fuzzy, or embedding
  matching. No `GraphOntologyValidator` port. No
  version bump. No npm publish.

  Graph-aware filtering fixture expansion (per the
  memo + the follow-up section of the issue
  governance ADR) shipped next; see the entry below.
- **Graph-aware filtering fixture expansion (P1.1
  graph-aware-filter-fixtures slice).** ✅ Shipped.
  Three deterministic regression fixtures under
  `tests/fixtures/graph-aware-filters/`:
  - `route-handler/` — `route.ts` imports `./handler`
    plus a sibling `handler.ts`. Drives the
    EvidenceGraph import branch of
    `route-handler-with-service` (the legacy
    `subject = "<file>:<target>"` shape, surfaced
    correctly by the compatibility-aware
    `listImportTargetsForFile`).
  - `external-comment/` — `util.ts` imports
    `leftpad` only (no openai/openrouter/@openai/*
    SDK), and mentions "openai" in a comment-only
    docstring. Drives the EvidenceGraph branch of
    `external-api-comment-only`.
  - `nextjs-route/` — `route.ts` exports `GET`
    handler plus segment-config exports `runtime`
    and `dynamic`. Drives the EvidenceGraph
    export-facts branch of
    `nextjs-route-convention` (the v3 substrate-
    backed check).

  **Contract test:**
  `tests/contract/graph-aware-filter-fixtures.test.mjs`
  copies each fixture to a `mkdtemp` tmpdir
  (committed fixtures are never mutated), runs
  `rekon refresh`, asserts the produced
  `EvidenceGraph` contains the expected import /
  export facts, seeds a synthetic `FindingReport`
  whose `header.inputRefs` cites the latest
  EvidenceGraph, runs
  `findings filter` + `findings filter-health`, and
  pins:
  - The expected graph-aware reason fires
    (`route-handler-with-service` /
    `external-api-comment-only` /
    `nextjs-route-convention`).
  - `FilteredFinding.evidenceSource === "EvidenceGraph"`.
  - Evidence string mentions `EvidenceGraph`.
  - `FindingFilterReport.header.inputRefs` includes
    `EvidenceGraph`.
  - Raw `FindingReport` still contains the finding
    (artifact-first invariant).
  - `FindingFilterHealthSummary.graphAwareByEvidenceSource.EvidenceGraph >= 1`.
  - `FindingFilterHealthSummary.graphAwareReasonEvidenceSources[reason].EvidenceGraph >= 1`.
  - Lifecycle / adjudication / coherency exclude the
    graph-filtered finding.
  - `rekon artifacts validate` returns
    `{ valid: true, issues: [] }`.

  A separate "publications" test exercises the
  route-handler fixture through the architecture
  summary + agent contract publishers and asserts
  both render the `Graph-Aware Evidence Sources`
  surface (and the agent contract's
  `Graph-aware evidence sources:` list) with
  `EvidenceGraph` attribution. This proves the
  fixture-driven evidence reaches the user-facing
  publication surfaces.

  Aligned to `infra/validation/GraphOntologyValidator.ts`,
  `services/IssueDetectionService.ts`,
  `services/issues/content-filter-ruleid.ts`,
  `services/issues/filter-health.ts`,
  `services/GraphBuildProvider.ts`,
  `domain/graph/producers/**`. **Regression
  fixtures only — these are NOT user-facing
  examples.** They live under `tests/fixtures/`, not
  `examples/`. No filter behavior change. No
  producer change. No helper change. No artifact
  `schemaVersion` bump. No new artifact type. No
  new capability role. No new CLI subcommand or
  flag. No new reason codes. No source-file reads
  at filter time. No AST, no type checker. No LLM
  / semantic / fuzzy / embedding matching. No
  `GraphOntologyValidator` port. No version bump.
  No npm publish. Full suite: 839 passed / 1
  skipped / 0 failed.

  **Graph-aware import evidence operator review
  refresh** (rerun the prior operator review now
  that local evidence is no longer sparse; confirm
  Option C still holds or identify whether any
  migration trigger has changed) shipped next; see
  the entry below.
- **Graph-aware import evidence operator review
  refresh (P1.1
  graph-aware-import-evidence-operator-review-refresh
  slice).** ✅ Shipped. Strategy-only batch — no
  runtime behavior changes ship. The memo
  ([`docs/strategy/graph-aware-import-evidence-operator-review-refresh.md`](graph-aware-import-evidence-operator-review-refresh.md))
  re-runs the prior operator review's data-gathering
  protocol against the three deterministic regression
  fixtures shipped at `702afbf`
  (`tests/fixtures/graph-aware-filters/route-handler/`,
  `external-comment/`, `nextjs-route/`) via temp-copy
  flow.

  **Measured per-fixture diagnostics:**
  | Fixture | Expected Reason | Evidence Source | graphAwareFiltered | EvidenceGraph InputRef | Publication Surfaced |
  | --- | --- | --- | ---: | --- | --- |
  | route-handler | route-handler-with-service | EvidenceGraph | 1 | yes | yes |
  | external-comment | external-api-comment-only | EvidenceGraph | 1 | yes | yes |
  | nextjs-route | nextjs-route-convention | EvidenceGraph | 1 | yes | yes |

  **Aggregate evidence-source counts:**
  - EvidenceGraph: 3
  - DetectorDetails: 0
  - ObservedRepo: 0
  - No fallback-dominance alert fires
    (graph-aware-details-fallback-dominance,
    graph-aware-observedrepo-fallback-dominance,
    graph-aware-evidencegraph-low-usage).

  **Four migration triggers re-evaluated**, none met:
  - Helper compatibility callsites > ~3 → Not met
    (one implementation, two consumers).
  - `EvidenceGraph` `schemaVersion` bump planned →
    Not met.
  - External capability author confusion → Unknown
    (pre-publish).
  - Import facts become publication-facing → Not met
    (publications aggregate counts only).

  **Decision: Option C remains the alpha decision.**
  *"The deterministic fixtures prove
  EvidenceGraph-backed graph-aware filtering works
  through helper compatibility."* *"No import fact
  producer migration in alpha unless a trigger is
  met."* This is the strongest improvement over the
  prior memo's sparse-data conclusion: the same
  recommendation now rests on measured data rather
  than architectural reasoning alone.

  **Recommended next slice:** graph-aware filter
  fixture coverage v2 — add deterministic fixtures
  for the remaining three graph-aware checks
  (`route-http-middleware-only`,
  `factory-file-creates-deps`,
  `module-gate-verified-caller`). **Shipped next; see
  the entry below.**
- **Graph-aware filter fixture coverage v2 (P1.1
  graph-aware-filter-fixtures-v2 slice).** ✅
  Shipped. Three additional regression fixtures under
  `tests/fixtures/graph-aware-filters/` complete the
  graph-aware coverage:
  - `route-http-middleware-only/` —
    `src/api/session/route.ts` imports only allowed
    `/infra/http/auth` + `/infra/Identity/session`
    modules (positive case fires via the
    EvidenceGraph branch); `src/api/bad/route.ts`
    imports `/infra/Database/client` (negative case
    KEEPS the finding, proving the filter doesn't
    over-suppress).
  - `factory-file/` —
    `src/core/services/widgets/WidgetFactory.ts`
    exercises the path-evidence branch of
    `factory-file-creates-deps`. Current attribution
    is `DetectorDetails` (path-only matches set
    `usedArtifacts: []`, which the evidence-source
    classifier maps to `DetectorDetails`).
  - `module-gate/` —
    `src/modules/payments/PaymentGateEvaluator.ts`
    exercises the GateEvaluator path signal of
    `module-gate-verified-caller`. Same
    `DetectorDetails` attribution rationale.

  **Contract test:**
  `tests/contract/graph-aware-filter-fixtures-v2.test.mjs`
  (6 cases) copies each fixture to a tmpdir
  (committed fixtures stay untouched), runs
  `rekon refresh`, asserts the produced
  `EvidenceGraph` contains the expected import /
  file facts, seeds a synthetic `FindingReport`,
  runs `findings filter` + `findings filter-health`,
  and pins per-fixture:
  - The expected graph-aware reason fires (or, for
    the negative case, the finding is KEPT and no
    `route-http-middleware-only` entry exists).
  - `FilteredFinding.evidenceSource` matches the
    current implementation's attribution
    (`EvidenceGraph` for route-http positive;
    `DetectorDetails` for factory + module-gate).
  - `FindingFilterReport.header.inputRefs` includes
    `EvidenceGraph` ONLY when the EvidenceGraph
    branch fired (route-http positive). Path-only
    decisions correctly omit EvidenceGraph from
    inputRefs (precise inputRefs from the v2
    graph-aware filter provider).
  - Raw `FindingReport` still contains the finding
    (artifact-first invariant).
  - `FindingFilterHealthSummary.graphAwareByEvidenceSource[<source>] >= 1`
    where source matches each fixture's
    attribution.
  - `FindingFilterHealthSummary.graphAwareReasonEvidenceSources[<reason>][<source>] >= 1`.
  - Lifecycle / adjudication / coherency exclude
    the graph-filtered finding.
  - `rekon artifacts validate` returns
    `{ valid: true, issues: [] }`.

  A publication-rendering test runs the route-http
  positive case through `publish architecture` +
  `publish agent-contract` and confirms the
  `Graph-Aware Evidence Sources` table renders an
  `EvidenceGraph` row and the
  `route-http-middleware-only` reason. An
  `artifacts validate` smoke test runs against all
  three fixtures.

  **Important design choice (per the work order):**
  the test does NOT force EvidenceGraph attribution
  where the current filter design uses path
  evidence. The factory + module-gate fixtures
  attribute as `DetectorDetails` because their
  decisions set `usedArtifacts: []` (no graph
  artifact contributed); the test pins this
  accurately rather than masking it. This documents
  current behavior; future work could extend those
  checks to consume `CapabilityMap` /
  `OwnershipMap` artifacts more strongly, at which
  point the attribution would shift naturally.

  Aligned to `infra/validation/GraphOntologyValidator.ts`,
  `services/IssueDetectionService.ts`,
  `services/issues/content-filter-ruleid.ts`,
  `services/issues/filter-health.ts`,
  `services/GraphBuildProvider.ts`,
  `domain/graph/producers/**`. Regression fixtures
  only — NOT user-facing examples; they live under
  `tests/fixtures/`, not `examples/`. No filter
  behavior change. No producer change. No helper
  change. No artifact `schemaVersion` bump. No new
  artifact type. No new capability role. No new CLI
  subcommand or flag. No new reason codes. No
  source-file reads at filter time. No AST, no type
  checker. No LLM / semantic / fuzzy / embedding
  matching. No `GraphOntologyValidator` port. No
  version bump. No npm publish. Full suite: 861
  passed / 1 skipped / 0 failed.

  **Graph-aware fixture coverage operator review v2** is
  the recommended next slice. **Shipped next; see the
  entry below.**
- **Graph-aware fixture coverage operator review v2
  (P1.1 graph-aware-fixture-coverage-operator-review-v2
  slice).** ✅ Shipped. Strategy / docs / test batch
  only — no runtime change. The memo
  ([`docs/strategy/graph-aware-fixture-coverage-operator-review-v2.md`](graph-aware-fixture-coverage-operator-review-v2.md))
  re-runs the prior operator review's data-gathering
  protocol against the now-six deterministic fixtures
  shipped at `702afbf` and `b2f74b8`
  (`route-handler`, `external-comment`, `nextjs-route`,
  `route-http-middleware-only` positive + negative,
  `factory-file`, `module-gate`).

  **Measured aggregate diagnostics across the six
  filtered cases (the negative
  `route-http-middleware-only` case is correctly KEPT
  and contributes no graph-aware row):**

  - `EvidenceGraph` attribution: **4** — the four
    artifact-backed reasons
    (`route-handler-with-service`,
    `route-http-middleware-only` positive,
    `external-api-comment-only`,
    `nextjs-route-convention`).
  - `DetectorDetails` attribution: **2** —
    `factory-file-creates-deps` and
    `module-gate-verified-caller`, both currently
    path-evidence-only (their decisions set
    `usedArtifacts: []`, which the
    `evidenceSourceFromGraphArtifacts` classifier maps
    to `DetectorDetails`).
  - `ObservedRepo` attribution: **0**.
  - No fallback-dominance alert fires
    (`graph-aware-details-fallback-dominance`,
    `graph-aware-observedrepo-fallback-dominance`,
    `graph-aware-evidencegraph-low-usage` all silent).

  **Migration trigger review:** all four triggers from
  the import-fact subject-shape decision memo
  re-evaluated against measured data — **none met**:
  - Helper compatibility logic exceeds ~3 callsites —
    not met (`listImportTargetsForFile` remains the
    sole helper; the two `DetectorDetails` fixtures do
    not consume imports).
  - EvidenceGraph `schemaVersion` bump planned for
    unrelated reasons — not met.
  - External capability authors report confusion —
    not met.
  - Import facts become a publication-facing artifact
    projection — not met.

  **Decision: Option C remains the alpha decision.**
  Helper compatibility holds; no import producer
  migration in alpha; revisit only if a trigger fires.

  **Artifact-strength review by reason:** the four
  EvidenceGraph-attributed reasons are **strong
  artifact-backed**; `factory-file-creates-deps` and
  `module-gate-verified-caller` are **acceptable
  fallback for alpha, candidates for stronger artifact
  projection** in a future slice. The memo identifies
  them as the next evidence-strengthening targets (not
  import producer migration) — likely via a role / kind
  / ownership projection at the EvidenceGraph /
  CapabilityMap / ObservedSystem substrate:
  - `ObservedSystem.kind === "module"` for
    `/modules/<name>/` directory roots;
  - CapabilityMap role tags (`role: "factory"`,
    `role: "module-gate"`);
  - or first-class EvidenceGraph symbol / export facts
    for factory and gate-evaluator names.

  Once such a projection exists, the existing
  path-evidence branches can cite the artifact via
  `evidenceSourceFromGraphArtifacts` precedence and
  attribution would shift to `EvidenceGraph` /
  `ObservedRepo` naturally — no filter logic rewrite
  required.

  Docs-only slice. Pinned by
  `tests/docs/graph-aware-fixture-coverage-operator-review-v2.test.mjs`.
  Aligned to `infra/validation/GraphOntologyValidator.ts`,
  `services/IssueDetectionService.ts`,
  `services/issues/content-filter-ruleid.ts`,
  `services/issues/filter-health.ts`,
  `services/GraphBuildProvider.ts`,
  `domain/graph/producers/**`,
  `lib/import-graph.ts`. No artifact `schemaVersion`
  bump. No new artifact type. No new capability role.
  No new CLI subcommand or flag. No new reason codes.
  No producer change. No helper change. No graph-aware
  filter change. No source-file reads. No LLM,
  semantic, fuzzy, or embedding matching. No
  `GraphOntologyValidator` port. No version bump. No
  npm publish.

  **Factory / module-gate artifact evidence
  strengthening** is the recommended next slice.
  **Shipped next; see the entry below.**
- **Factory / module-gate artifact evidence
  strengthening v1
  (P1.1 factory-module-gate-evidence-strengthening
  slice).** ✅ Shipped. Combined strategy +
  implementation batch. The memo
  ([`docs/strategy/factory-module-gate-evidence-strengthening.md`](factory-module-gate-evidence-strengthening.md))
  selects **EvidenceGraph symbol/export facts** as
  the smallest viable projection target — the
  fixtures already produce the right facts via
  `@rekon/capability-js-ts`, and the filter-side
  change is purely additive. Projector-side
  `ObservedSystem.kind` population is deferred
  (capability-model projector currently emits
  first-segment-only owner systems; per-module
  system synthesis is broad enough churn to defer).

  **Filter changes:**

  - `graphFilterFactoryFileCreatesDeps` gains a new
    top-priority branch A0 that consumes
    EvidenceGraph symbol/export facts via
    `listSymbolsForFile` + `listExportsForFile`.
    **High confidence** when any name includes
    `"Factory"`; **medium confidence** when any
    name starts with `"create"` AND the file path
    includes `"Factory"` / `"factory"`.
    `usedArtifacts: ["EvidenceGraph"]` →
    `evidenceSource: "EvidenceGraph"`.
  - `graphFilterModuleGateVerifiedCaller` gains a
    new top-priority branch A0 that consumes the
    same helpers. **High confidence** when any
    name includes `"GateEvaluator"`; **medium
    confidence** when any name matches
    `/^evaluate.*Gate/`.
    `usedArtifacts: ["EvidenceGraph"]` →
    `evidenceSource: "EvidenceGraph"`.
  - All existing branches (path-evidence,
    CapabilityMap hint, OwnershipMap +
    ObservedSystem.kind=module) remain as
    fallback. The path-evidence branch still
    attributes as `DetectorDetails`; the
    OwnershipMap + ObservedSystem.kind branch
    still attributes as `ObservedRepo`.

  **Fixture attribution after the batch:**

  - `factory-file` →
    `evidenceSource: "EvidenceGraph"`, medium
    confidence, evidence text names the
    `createWidgetService` export.
  - `module-gate` →
    `evidenceSource: "EvidenceGraph"`, medium
    confidence, evidence text names the
    `evaluatePaymentGate` export.

  Aggregate fixture diagnostics shift from
  `EvidenceGraph: 4 / DetectorDetails: 2` to
  `EvidenceGraph: 6 / DetectorDetails: 0` against
  the committed fixtures. Path fallback still
  fires (with `DetectorDetails` attribution) for
  repos whose symbol/export names don't match the
  canonical patterns — confirmed by the v3 contract
  test's path-fallback scenarios.

  **Contract test:**
  `tests/contract/factory-module-gate-artifact-evidence.test.mjs`
  (14 cases) pins:
  - factory + module-gate EvidenceGraph attribution
    + symbol-name citation in the evidence string;
  - path fallback (`DetectorDetails` attribution)
    when symbol/export names don't match — fixture
    file source is overwritten in the temp copy so
    `createWidgetService` becomes `helper`,
    `evaluatePaymentGate` becomes `handler`;
  - ObservedRepo branch (`evidenceSource:
    "ObservedRepo"`, ObservedRepo cited in
    `inputRefs`) when a synthetic `OwnershipMap` +
    `ObservedRepo` with `kind: "module"` is seeded;
  - path-only `/modules/` fallback when artifact
    + ObservedRepo evidence is missing;
  - `inputRefs` cite EvidenceGraph / ObservedRepo
    only when used;
  - raw `FindingReport` byte-preserved;
  - lifecycle / adjudication / coherency excludes
    artifact-backed filtered findings;
  - `FindingFilterHealthSummary.graphAwareByEvidenceSource`
    counts correct per scenario;
  - `rekon artifacts validate` stays clean.

  The v2 fixture contract test
  (`tests/contract/graph-aware-filter-fixtures-v2.test.mjs`)
  updated to assert the new EvidenceGraph
  attribution for the factory + module-gate
  fixtures (the prior baseline was
  `DetectorDetails`; the strengthening lifts it
  to `EvidenceGraph` without changing which
  findings are filtered).

  Aligned to `infra/validation/GraphOntologyValidator.ts`
  (intentionally not ported),
  `services/issues/content-filter-ruleid.ts`,
  `services/issues/content-filters.ts`,
  `services/IssueDetectionService.ts`,
  `services/GraphBuildProvider.ts`,
  `domain/graph/producers/**`. No source reads.
  No AST. No typechecker. No LLM / semantic /
  fuzzy / embedding matching. No
  `GraphOntologyValidator` port. No producer
  migration for import facts. No artifact
  `schemaVersion` bump. No new artifact type. No
  new capability role. No new CLI subcommand or
  flag. No new reason codes. No version bump.
  No npm publish.

  **Deferred follow-ups:**

  - Per-module `ObservedSystem` projection
    (`@rekon/capability-model` projector emits
    `kind: "module"` ObservedSystems for
    `src/modules/<name>/` roots) — enables branch
    B of `graphFilterModuleGateVerifiedCaller` to
    fire from real fixtures.
  - CapabilityMap `role` field — first-class
    `role: "factory"` / `role: "module-gate"`
    declaration.
  - `evidenceSourceFromGraphArtifacts`
    CapabilityMap precedence — today
    CapabilityMap-only matches classify as
    `DetectorDetails`; a small follow-up could
    add `CapabilityMap` between `ObservedRepo`
    and `DetectorDetails` in the precedence
    chain.

  **Graph-aware fixture coverage operator review v3**
  is the recommended next slice. **Shipped next; see
  the entry below.**
- **Graph-aware fixture coverage operator review v3
  (P1.1 graph-aware-fixture-coverage-operator-review-v3
  slice).** ✅ Shipped. Strategy / docs / test batch
  only — no runtime change. The memo
  ([`docs/strategy/graph-aware-fixture-coverage-operator-review-v3.md`](graph-aware-fixture-coverage-operator-review-v3.md))
  re-runs the operator-review protocol against the
  post-strengthening attribution profile after
  `a2a2d25` shipped factory / module-gate evidence
  strengthening.

  **Measured aggregate diagnostics across the six
  filtered cases (the negative
  `route-http-middleware-only` case is correctly
  KEPT and contributes no graph-aware row):**

  - `EvidenceGraph` attribution: **6** — every
    shipped graph-aware reason
    (`route-handler-with-service`,
    `route-http-middleware-only` positive,
    `external-api-comment-only`,
    `nextjs-route-convention`,
    `factory-file-creates-deps`,
    `module-gate-verified-caller`) attributes as
    `EvidenceGraph` against the committed fixtures.
  - `DetectorDetails` attribution: **0**.
  - `ObservedRepo` attribution: **0**.
  - No fallback-dominance alert fires
    (`graph-aware-details-fallback-dominance`,
    `graph-aware-observedrepo-fallback-dominance`,
    `graph-aware-evidencegraph-low-usage` all
    silent).

  **Migration trigger review:** all four triggers
  from the import-fact subject-shape decision memo
  re-evaluated against the new data — none met.
  Option C remains the alpha decision.

  **Alpha-completeness decision:** the graph-aware
  v1 / v2 / v3 arc is **alpha-complete**. Every
  shipped graph-aware reason has deterministic
  fixture coverage; every fixture positive is
  artifact-backed; fallback branches remain in the
  implementation and are pinned by the v3 contract
  test; the publication-facing diagnostic surface
  distinguishes evidence sources; the negative
  case is pinned; import producer migration is not
  required; no remaining graph-aware reason needs
  further strengthening before alpha.

  **Recommended next slice:** **issue merge
  decision freshness guardrails**. **Shipped next;
  see the entry below.**

  Docs-only slice. Pinned by
  `tests/docs/graph-aware-fixture-coverage-operator-review-v3.test.mjs`
  (21 assertions). Aligned to
  `infra/validation/GraphOntologyValidator.ts`,
  `services/IssueDetectionService.ts`,
  `services/issues/content-filter-ruleid.ts`,
  `services/issues/filter-health.ts`,
  `services/GraphBuildProvider.ts`,
  `domain/graph/producers/**`,
  `lib/import-graph.ts`. No artifact
  `schemaVersion` bump. No new artifact type. No
  new capability role. No new CLI subcommand or
  flag. No new reason codes. No producer change.
  No helper change. No graph-aware filter
  change. No source-file reads. No LLM, semantic,
  fuzzy, or embedding matching. No
  `GraphOntologyValidator` port. No version bump.
  No npm publish.
- **Issue merge decision freshness guardrails v1
  (P1.1 issue-merge-decision-freshness-guardrails
  slice).** ✅ Shipped. Combined strategy +
  implementation batch. The memo
  ([`docs/strategy/issue-merge-decision-freshness-guardrails.md`](issue-merge-decision-freshness-guardrails.md))
  pins the freshness predicate as **artifact-lineage
  only** (no file-system mtime, no watcher). A
  `CoherencyDelta` is **stale for decision-making**
  when any of five rules fire:
  - `merge-ledger-missing` — `mergedIssueGroupIds`
    exist but the delta cites no
    `IssueMergeDecisionLedger`;
  - `merge-ledger-stale` — the delta cites an older
    ledger than the latest available;
  - `adjudication-stale` — the delta cites an older
    `IssueAdjudicationReport` than the latest;
  - `lifecycle-stale` — the cited adjudication
    cites an older `FindingLifecycleReport` than the
    latest;
  - `merge-decision-superseded` — the latest ledger
    decision for some `mergeCandidateId` used by the
    roll-up has a different id or
    `decision !== "accepted"`.

  Pure data-only helper
  `detectIssueMergeRollupFreshness` in
  `@rekon/kernel-findings` (deterministic A → B → C
  → D → E order; no fs reads; no mutation).
  Architecture summary renders a `### Merge Roll-up
  Freshness` subsection below `## Accepted Issue
  Merge Roll-ups` (status + warnings table + stale
  callout). Agent contract renders `### Merge
  Decision Freshness` with compact per-input status
  lines plus a Do Not Do reminder. `resolve.issue`
  adds an `issue.merge.freshness` `resolutionTrace`
  step (`status: "warning"` when stale, `"used"`
  when fresh), appends a `rekon refresh` warning
  string when stale, and cites the latest ledger /
  adjudication / lifecycle refs in
  `IssuePacket.header.inputRefs` (deduped). All
  warnings recommend `rekon refresh`. Warnings do
  **not** invalidate artifacts structurally; they
  mark the consumed merge-roll-up context as stale
  for decision-making.

  **Contract test:**
  `tests/contract/issue-merge-decision-freshness-guardrails.test.mjs`
  (16 cases) covers every rule end-to-end through
  architecture summary + agent contract +
  `resolve.issue` plus the helper's `missing`,
  `fresh`, and `stale` (Rule A) unit-level branches.
  Also pins an end-to-end-ish scenario: accepted
  decision → newer rejected decision → both
  publications and the resolver surface
  `merge-decision-superseded`. `rekon artifacts
  validate` stays clean across all scenarios.

  Aligned to `services/WatchHandler.ts`,
  `lib/context-freshness.ts`,
  `services/ContextHandler.ts`,
  `services/IssueDetectionService.ts`,
  `domain/issues/mergeIssues.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta-projections.ts`.
  No artifact mutation. No auto-refresh inside
  publishers or resolvers. No watcher / daemon. No
  file-system mtime / path invalidation. No
  artifact header shape change. No `schemaVersion`
  bump. No new artifact type. No new capability
  role. No new CLI subcommand or flag. No new
  reason codes. No producer change. No graph-aware
  filter change. No source-file reads. No LLM,
  semantic, fuzzy, or embedding matching. No
  `GraphOntologyValidator` port. No version bump.
  No npm publish.

  **Recommended next slice:** **issue merge
  decision operator ergonomics**. **Shipped next;
  see the entry below.**
- **Issue merge decision operator ergonomics v1
  (P1.1 issue-merge-decision-operator-ergonomics
  slice).** ✅ Shipped. Combined CLI + publication
  + docs + test batch on top of the freshness
  guardrails. The memo
  ([`docs/strategy/issue-merge-decision-operator-ergonomics.md`](issue-merge-decision-operator-ergonomics.md))
  adds four operator-facing surfaces:

  - **Filters on `rekon issues merge candidates`** —
    `--undecided` / `--decision accepted|rejected|none`
    to find candidates by decision state;
    `--stale` / `--superseded` to find candidates
    whose decision no longer matches the current
    `CoherencyDelta` roll-up; plus `--reason`,
    `--strength`, and `--limit` for narrowing.
    Command response now includes a `summary`
    block (`total`, `accepted`, `rejected`,
    `undecided`, `stale`, `superseded`) plus a
    structured `mergeCandidateViews` array carrying
    decision state, decision history, member
    groups, member finding ids, files, the current
    `CoherencyDelta` roll-up item, and warnings.
  - **`rekon issues merge candidate <candidate-id>`**
    — new detail command returning the same shape
    as a single `mergeCandidateViews[i]` plus a
    `recommendedCommands` array (the accepted /
    rejected decide commands pre-filled with the
    candidate id) and the merge-rollup freshness
    result. Use this before recording a decision
    to inspect context without opening raw
    artifacts.
  - **Enhanced `decide` output** — now includes
    `previousDecision` (or `null` on first decide),
    `changedDecision` (true only when the new
    decision's status differs from the prior
    status), and `recommendedNextCommands`
    (`rekon coherency delta`,
    `rekon publish architecture`,
    `rekon publish agent-contract`).
  - **Publication decision counts** — architecture
    summary renders `## Merge Candidate Decisions`
    with `Total / Accepted / Rejected / Undecided`
    counts plus recommended filter commands; agent
    contract renders `### Merge Candidate
    Decisions` with the same counts plus an
    explicit "Ask the operator to review undecided
    candidates" directive. A new `Do Not Do`
    reminder warns agents against assuming
    candidates are accepted.

  New kernel helper `buildIssueMergeCandidateViews`
  + `IssueMergeCandidateView` /
  `IssueMergeCandidateDecisionState` types exported
  from `@rekon/kernel-findings` (additive only).
  Pinned by
  `tests/contract/issue-merge-operator-ergonomics.test.mjs`
  (16 cases) covering every filter combination,
  candidate detail (groups + memberFindingIds +
  files + decisionHistory newest-first + rollup
  + warnings), decide output enhancements
  (previousDecision / changedDecision /
  recommendedNextCommands), publication renderers,
  the read-only invariant (only `decide` writes),
  and `rekon artifacts validate` cleanliness.

  Aligned to `services/IssueDetectionService.ts`,
  `domain/issues/mergeIssues.ts`,
  `services/issues/**`,
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta-projections.ts`.
  Merge candidates remain advisory; no automatic
  merging or semantic / LLM review. No artifact
  mutation outside the ledger append that
  `decide` already does. No `schemaVersion` bump.
  No new artifact type. No new capability role.
  No producer change. No source-file reads. No
  LLM / semantic / fuzzy / embedding matching. No
  `GraphOntologyValidator` port. No version bump.
  No npm publish.

  **Recommended next slice:** **issue merge
  decision publication / detail polish v2**.
  **Shipped next; see the entry below.**
- **Issue merge decision publication / detail
  polish v2 (P1.1
  issue-merge-decision-publication-detail-polish
  slice).** ✅ Shipped. Combined CLI + publication
  + docs + test polish batch on top of the
  operator-ergonomics v1. The memo
  ([`docs/strategy/issue-merge-decision-publication-detail-polish.md`](issue-merge-decision-publication-detail-polish.md))
  adds four polish surfaces:

  - **Human-readable `rekon issues merge candidate
    <candidate-id>`** when `--json` is absent —
    renders candidate id, decision state,
    strength / confidence / reasons, member groups
    (with status / severity / type / files /
    members), unioned member finding ids + files,
    latest decision + decision-history summary,
    current `CoherencyDelta` roll-up block,
    freshness status, warnings + `rekon refresh`
    recommendation when stale, and the recommended
    decide-commands list. JSON output is
    unchanged.
  - **Human-readable `rekon issues merge candidates`**
    — non-JSON renders a summary line
    (`Merge candidates: N total, N undecided, N
    accepted, N rejected`), an optional
    `Filters:` / `Lineage:` / `Merge-rollup
    freshness:` line, a Markdown table, and an
    empty-state line when filters return zero
    matches.
  - **Enhanced `rekon issues merge decisions`** —
    JSON gains a `summary` block (`total`,
    `current`, `superseded`, `accepted`,
    `rejected`) plus a per-decision `current`
    boolean; `accepted` / `rejected` are over the
    current decisions only. Non-JSON renders the
    summary plus a Markdown table. The ledger
    contents are unchanged — `current` is computed
    at read time.
  - **Proof report `## Issue Merge Decision
    Context` section** — the proof-report
    publisher now reads
    `IssueAdjudicationReport` and
    `IssueMergeDecisionLedger`, builds
    `mergeCandidateViews`, and renders the new
    section right after the opening paragraph
    (so it appears whether or not a
    `VerificationPlan` exists yet). Shows
    `Merge candidates / Accepted / Rejected /
    Undecided / Accepted roll-ups in
    CoherencyDelta` counts; an accepted-roll-up
    table (`Roll-up / Groups / Decision IDs /
    Member Findings / Freshness`) when accepted
    decisions exist; recommended
    `rekon issues merge candidates --undecided` /
    `--superseded` / `--stale` commands when
    those counts are non-zero. Publisher
    manifest `consumes` adds
    `IssueMergeDecisionLedger`; manifest
    `invalidatedBy` adds an
    `issue-merge-decision.changed` rule.

  **Architecture summary + agent contract command
  guidance** tightened: both now also recommend
  `rekon issues merge candidates --decision
  accepted --json` when accepted candidates exist
  (audit path). The architecture summary's
  closing paragraph points operators at the
  human-readable detail mode explicitly.

  Pinned by
  `tests/contract/issue-merge-publication-detail-polish.test.mjs`
  (17 cases) covering all four polish surfaces,
  publication renderers, `decisions` summary
  current vs. superseded annotation, and
  `rekon artifacts validate` cleanliness.

  Aligned to `services/IssueDetectionService.ts`,
  `domain/issues/mergeIssues.ts`,
  `services/issues/**`,
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta-projections.ts`,
  `services/IntentPreparationService.ts`.
  Merge candidates remain advisory. Only `decide`
  mutates the ledger. No automatic merging. No
  semantic / fuzzy / LLM / embedding review. No
  artifact mutation outside the existing ledger
  append. No `schemaVersion` bump. No new
  artifact type. No new capability role. No
  producer change. No graph-aware filter change.
  No source-file reads. No version bump. No npm
  publish.

  **Recommended next slice:** **verification
  runner v1 decision memo**. **Shipped next;
  see the entry below.**
- **Verification runner v1 decision memo (P1.1
  verification-runner-v1-decision slice).** ✅
  Shipped. Strategy-only batch — no runtime
  changes ship. The memo
  ([`docs/strategy/verification-runner-v1-decision.md`](verification-runner-v1-decision.md))
  decides whether Rekon should execute
  verification commands locally and pins the
  contract that governs any future runner.

  **Recommendation: Option C — hybrid opt-in
  runner.** Manual `rekon verify record` remains
  the default path. A future
  `rekon verify run --plan <id> --execute`
  command (deferred to a later implementation
  slice) opts in to local execution.

  **Artifact model:** add a new sibling
  **`VerificationRun`** artifact recording raw
  bounded execution detail (per-command start /
  end / duration / exitCode / status with
  `timeout` and `killed` additions + stdout /
  stderr digests + redacted truncated excerpts +
  runner version + environment summary +
  redaction audit). **`VerificationResult`
  remains the proof summary** consumed by
  publications and resolvers; the runner can
  derive one from a run when `--write-result`
  is supplied.

  **Capability + permission boundary:** new
  package **`@rekon/capability-verify`** with a
  new `"runner"` role and a new
  **`execute:verification`** permission — kept
  distinct from `execute:commands` so the
  narrow scope is visible to manifest review and
  conformance tests.

  **Safety contract** (pinned for the
  implementation slice): no execution during
  `rekon refresh` / `publish` / `resolve` /
  `intent` / `reconcile` / `artifacts`; no
  shell interpolation from artifact-supplied
  strings (findings, work-order titles,
  model-generated notes never reach the
  command line); `spawn(argv[0], argv.slice(1))`
  with `shell: false` unless the plan
  explicitly wraps `["sh", "-c", "…"]`;
  per-command timeout default **120 s**,
  per-plan timeout default **600 s**; process-
  tree kill on timeout (`SIGTERM` → 3 s grace
  → `SIGKILL`); bounded logs (**8 KB / stream /
  command** default, full-stream digests
  always); redaction patterns v1 cover env
  vars matching `TOKEN` / `SECRET` / `KEY` /
  `PASSWORD` / `PAT` / `BEARER` plus
  `Bearer …` / `Basic …` HTTP auth headers
  (high-entropy detection deferred); **no
  auto-resolution**, **no auto-apply**, **no
  source writes**, **no automatic retries in
  v1**.

  **Implementation sequence (deferred to
  subsequent slices):**
  1. `VerificationRun` artifact type + docs;
  2. `@rekon/capability-verify` skeleton +
     conformance tests pinning the new role +
     permission;
  3. dry-run command
     (`rekon verify run --plan <id> --dry-run`);
  4. opt-in execution
     (`rekon verify run --plan <id> --execute`)
     implementing the safety contract;
  5. redaction / truncation tests;
  6. `VerificationResult` derivation via
     `--write-result`;
  7. runner-produced proof in architecture
     summary, agent contract, and proof report;
  8. CI / GitHub adapter (out of scope for
     local-runner v1).

  Pinned by
  `tests/docs/verification-runner-v1-decision.test.mjs`
  (18 assertions). Aligned to
  `services/IntentPreparationService.ts`,
  `packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`,
  `packages/product-codebase-intel/src/intent/**`,
  `services/ContextHandler.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`.
  No runtime behavior changes. No artifact
  mutation. No CLI behavior change. No new
  artifact type yet (lands in the next slice).
  No new capability yet. No `schemaVersion`
  bump. No version bump. No npm publish.

  **Recommended next slice:** **VerificationRun
  artifact + `@rekon/capability-verify`
  skeleton**. **Shipped next; see the entry
  below.**
- **VerificationRun artifact +
  `@rekon/capability-verify` skeleton (P1.1
  verification-runner-v1-skeleton slice).** ✅
  Shipped. Combined kernel + capability + SDK +
  docs + test batch that implements **steps 1–2**
  of the runner v1 implementation sequence
  pinned by the
  [verification runner v1 decision memo](verification-runner-v1-decision.md).
  **No command execution lands.** The
  `@rekon/capability-verify` runner handler is
  a throw-stub until step 4.

  **Artifact:** new `VerificationRun` type +
  helpers (`createVerificationRun`,
  `summarizeVerificationRunCommands`,
  `validateVerificationRun`,
  `assertVerificationRun`) live in
  `@rekon/capability-intent` next to
  `VerificationResult`. The summary block adds
  `timeout` + `killed` counters; the
  per-command shape adds argv, exit
  code, signal, digests (full pre-redaction
  SHA-256 of stdout / stderr), redacted
  truncated excerpts with `truncated` flag and
  byte counts, runner identity (runner id +
  version + capability id), environment summary
  (platform / arch / nodeVersion / shell /
  network policy / env policy), redaction audit
  (pattern ids + match count + max bytes per
  stream), `timedOut` + `killed` flags, and
  optional `cwd`. The runtime artifact category
  map routes `VerificationRun` to `actions`.

  **SDK additions:** new `"runner"` role; new
  `execute:verification` permission (distinct
  from `execute:commands` so the narrow scope
  is visible to manifest review); new `Runner`
  handler type; new `registry.runner(...)`
  registration surface; new `runners: Runner[]`
  field on `RegisteredCapability` +
  `CapabilityRegistrySnapshot`; conformance
  tooling rejects unknown roles + unknown
  permissions; runner-role manifests that
  register no runner handler are rejected at
  registration time. The SDK conformance
  runner deliberately does **not** invoke
  runner handlers automatically — runners run
  only via explicit operator commands (a
  future slice).

  **Capability package:** new
  `packages/capability-verify/`. Manifest:
  `id: "@rekon/capability-verify"`,
  `roles: ["runner"]`,
  `permissions: ["execute:verification",
  "read:artifacts", "write:artifacts"]`,
  `consumes: ["VerificationPlan",
  "WorkOrder"]`,
  `produces: ["VerificationRun",
  "VerificationResult"]`,
  `invalidatedBy: [{ id:
  "verification-plan.changed", inputs:
  ["VerificationPlan"] }]`. The runner handler
  is a throw-stub that raises
  `"@rekon/capability-verify: command execution
  is not implemented yet."` when invoked —
  satisfies the SDK's
  manifest-roles-have-handlers invariant
  without actually spawning processes.
  Importing the capability does not enable
  execution.

  **Tests (30 new contract + package tests):**
  - `tests/contract/verification-run-artifact.test.mjs`
    (9 cases): canonical artifact construction
    with derived summary; validator accepts /
    rejects shapes; `timeout` and `killed`
    command statuses validated; built-in
    artifact type registration; runtime
    category routing to `actions`; `rekon
    artifacts validate` cleanliness for a
    seeded run; summary helper counts every
    bucket.
  - `tests/contract/verify-capability-skeleton.test.mjs`
    (12 cases): capability conforms; role
    runner; permission `execute:verification`;
    no `write:source` / no `apply:*`;
    consumes / produces correct; README says
    no execution; throw-stub runner; SDK
    rejects unknown role; SDK rejects unknown
    permission; SDK accepts synthetic runner
    manifest paired with handler; SDK rejects
    runner manifest with no runner handler.
  - `packages/capability-verify/test/verify.test.mjs`
    (9 cases): package-local conformance
    against the published `dist/` build.

  **Docs:** new
  `docs/artifacts/verification-run.md` +
  `docs/concepts/verification-runs.md`. The
  runner v1 decision memo flips steps 1–2 to
  shipped. Verification result + plan + proof
  report (concept + artifact) docs add
  cross-references. The authoring-capabilities
  doc describes the new `"runner"` role and
  `execute:verification` permission with the
  safety contract reminder. README's CLI
  Commands list is unchanged (no new CLI
  command yet); a follow-up slice (step 3 of
  the sequence) adds
  `rekon verify run --plan <id> --dry-run`.

  Aligned to `services/IntentPreparationService.ts`,
  `packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`,
  `packages/product-codebase-intel/src/intent/**`,
  `services/ContextHandler.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`.
  No runtime command execution. No artifact
  mutation outside the existing
  `IssueMergeDecisionLedger` append + the new
  `VerificationRun` writes. No
  `schemaVersion` bump. No new CLI command.
  No producer change. No graph-aware filter
  change. No source-file reads. No version
  bump. No npm publish.

  **Recommended next slice:** **verification
  runner dry-run command** —
  `rekon verify run --plan <id> --dry-run`.
  **Shipped next; see the entry below.**
- **Verification runner dry-run command
  (P1.1 verification-run-dry-run slice).** ✅
  Shipped. **Step 3** of the runner v1
  implementation sequence pinned by the
  [verification runner v1 decision memo](verification-runner-v1-decision.md).
  Adds the first CLI surface for the future
  verification runner without executing any
  commands. The CLI command
  `rekon verify run --plan <id|type:id>
  --dry-run|--preview [--root <path>]
  [--json]` resolves the named plan,
  validates each command against the safety
  contract, and writes a planned-but-not-run
  `VerificationRun` artifact when every
  command validates. **No process is
  spawned.**

  **Helper:** `createVerificationRunDryRun`
  in `@rekon/capability-verify` tokenizes
  each plan command into argv (whitespace-
  separated with quoted-string support) and
  validates it. Rejected patterns:
  shell-control operators (`;` `&&` `||`
  `|` `<` `>` `<<` `>>` `&`), command
  substitution (`$(…)` `` `…` ``),
  env-assignment prefixes (`NAME=value cmd`),
  newlines, and empty commands. The helper
  returns
  `{ verificationRun, safety,
  validationIssues, ok }`. The companion
  helper `validateVerificationRunCommandString`
  exposes the per-command validation pass.

  **Dry-run artifact:** `status: "not-run"`,
  every command `status: "not-run"`,
  `runner.id` defaults to
  `"rekon.local.dry-run"`,
  `runner.capabilityId` is
  `"@rekon/capability-verify"`,
  `redaction.applied` is `false` (patterns
  list still declared for audit),
  `environment.envPolicy` defaults to
  `"scrubbed"`, `header.inputRefs` cites the
  `VerificationPlan` (and `WorkOrder` when
  present). Dry-run artifacts validate
  clean (`artifacts validate` stays clean).

  **Refusals:** CLI refuses `--execute` with
  a "not implemented yet" message; refuses
  invocations without `--dry-run` /
  `--preview`; refuses invocations without
  `--plan`; refuses to write when any
  command fails validation (reports the
  full validation issue list).

  **Tests:** 23 new tests in
  `tests/contract/verification-run-dry-run.test.mjs`
  cover helper behavior (parsing, accepted
  / rejected patterns, safety summary), CLI
  paths (`--dry-run`, `--preview`,
  refusal of `--execute`, refusal without
  `--plan`, refusal of invalid commands,
  human-readable output), and a **sentinel
  file** assertion that proves no process
  is spawned: a plan containing
  `node -e "writeFileSync('SHOULD_NOT_EXIST',…)"`
  never creates the file when run through
  `--dry-run`. Full suite: 1036 passed / 1
  skipped.

  **Docs:** updated
  [`docs/concepts/verification-runs.md`](../concepts/verification-runs.md),
  [`docs/artifacts/verification-run.md`](../artifacts/verification-run.md),
  [`docs/strategy/verification-runner-v1-decision.md`](verification-runner-v1-decision.md)
  (step 3 flipped to ✅ Shipped),
  [`docs/concepts/verification-results.md`](../concepts/verification-results.md),
  [`docs/artifacts/verification-result.md`](../artifacts/verification-result.md),
  [`docs/artifacts/verification-plan.md`](../artifacts/verification-plan.md),
  [`docs/concepts/proof-report-publication.md`](../concepts/proof-report-publication.md),
  [`docs/artifacts/proof-report-publication.md`](../artifacts/proof-report-publication.md),
  `README.md`, `CHANGELOG.md`, `roadmap.md`,
  this file.

  **Recommended next slice:** **verification
  runner execution v1** —
  `rekon verify run --plan <id> --execute`.
  **Shipped next; see the entry below.**
- **Verification runner execution v1 (P1.1
  verification-run-execution-v1 slice).** ✅
  Shipped. **Step 4** of the runner v1
  implementation sequence — the **first slice
  that actually spawns processes**. The CLI
  command
  `rekon verify run --plan <id|type:id>
  --execute [--command-timeout-ms <n>]
  [--timeout-ms <n>] [--max-log-bytes <n>]
  [--root <path>] [--json]` runs the named
  plan locally and writes a `VerificationRun`
  artifact with recorded execution detail.

  **Safety boundary (every constraint is also
  a contract test):**
  - **`spawn(argv[0], argv.slice(1))` with
    `shell: false`.** Never a shell.
  - **Validator reuse.** The execute path
    re-runs `validateVerificationRunCommandString`
    before any spawn; an unsafe command refuses
    execution and writes no artifact.
  - **Scrubbed environment.** Only an allowlist
    (`PATH`, `HOME`, `USER`, `SHELL`, `TMPDIR` /
    `TEMP` / `TMP`, `NODE_ENV`, `NODE_OPTIONS`,
    `NPM_CONFIG_USERCONFIG`, `CI`, `LANG` /
    `LC_*`, plus Windows essentials
    `SystemRoot` / `ComSpec` / `PATHEXT` /
    `windir` / `USERPROFILE` / `APPDATA` /
    `LOCALAPPDATA`) is forwarded. Allowlist
    entries whose names match the secret guard
    (`TOKEN|SECRET|PASSWORD|KEY|AUTH|
    CREDENTIAL|COOKIE|SESSION|BEARER|PAT` with
    word-component boundaries — `PATH` is
    intentionally NOT matched) are removed.
  - **Per-command timeout** default 120 s
    (override via `--command-timeout-ms`);
    `SIGTERM` first, **3 s grace** (override via
    helper option), then `SIGKILL`.
  - **Per-plan timeout** default 600 s (override
    via `--timeout-ms`). Caps each command's
    effective timeout to the remaining budget;
    marks unspawned commands `not-run` with a
    `plan-timeout-before-start` note.
  - **Stream digests.** `stdoutDigest` and
    `stderrDigest` are sha256 of the full
    **pre-redaction** stream.
  - **Bounded redacted excerpts.** Default 8 KB
    per stream per command (override via
    `--max-log-bytes`); **redact first, then
    truncate**, so a long-running secret near
    the truncation boundary cannot leak.
  - **Redaction patterns:**
    `env-assignment-token-like`,
    `json-secret`, `bearer-token`,
    `basic-auth`. Match counts and matched
    pattern ids are recorded on the artifact's
    `redaction` block.
  - **Status priority:**
    `failed > killed > timeout > partial >
    passed > not-run`.
  - **Continue past failures.** A failing
    command does not stop the remaining
    commands; the run records each one.
  - **CLI exits non-zero** when overall status
    is `failed` / `timeout` / `killed`; the
    artifact is still written.

  **What execute does NOT do:**
  - No `VerificationResult` derivation
    (deferred to step 6).
  - No `FindingStatusLedger` /
    `FindingLifecycleReport` /
    `CoherencyDelta` /
    `ReconciliationPlan` mutation. A passing
    run does **not** auto-resolve findings or
    apply reconciliation.
  - No source writes by the runner itself.
    Commands listed in the plan may write
    files (that's their job).
  - No retries.
  - No sandboxing.
  - No network policy enforcement.
  - No CI / GitHub adapter.

  **New helper exports (`@rekon/capability-verify`):**
  - `executeVerificationRun(input, options)`.
  - `redactVerificationRunStreamText(text)`.
  - `buildScrubbedEnvironment(env?)`.
  - `VERIFICATION_RUN_DEFAULT_COMMAND_TIMEOUT_MS`,
    `VERIFICATION_RUN_DEFAULT_PLAN_TIMEOUT_MS`,
    `VERIFICATION_RUN_DEFAULT_KILL_GRACE_MS`,
    `VERIFICATION_RUN_DEFAULT_MAX_LOG_BYTES`.
  - `VERIFICATION_RUN_ENV_ALLOWLIST`,
    `VERIFICATION_RUN_SECRET_KEY_PATTERN`.
  - `VERIFICATION_RUN_EXECUTION_RUNNER_ID =
    "rekon.local.exec"`.

  **Tests:** 25 new tests in
  `tests/contract/verification-run-execution.test.mjs`
  cover helper behavior (passed / failed /
  timeout / plan-timeout / refusal-before-
  spawn / redaction / scrubbed env), CLI paths
  (`--execute` writes artifact; non-zero CLI
  exit on failed status with artifact still
  written; `--dry-run + --execute` refused;
  shell-control refusal; env-assignment-prefix
  refusal; sentinel-file no-shell-leakage;
  legitimate node command CAN write files;
  dry-run still does not spawn after execute
  ships; `verify record` unchanged;
  `FindingStatusLedger` /
  `FindingLifecycleReport` unmutated;
  `VerificationResult` not written;
  `artifacts validate` clean after passed /
  failed runs). The obsolete dry-run test
  asserting the not-implemented `--execute`
  message was retired. Full suite: **1060
  passed / 1 skipped**.

  **Docs:** updated
  [`docs/concepts/verification-runs.md`](../concepts/verification-runs.md),
  [`docs/artifacts/verification-run.md`](../artifacts/verification-run.md)
  (new Execute Behavior section),
  [`docs/strategy/verification-runner-v1-decision.md`](verification-runner-v1-decision.md)
  (step 4 flipped to ✅ Shipped with the
  recorded implementation choices),
  [`docs/concepts/verification-results.md`](../concepts/verification-results.md),
  [`docs/artifacts/verification-result.md`](../artifacts/verification-result.md),
  [`docs/artifacts/verification-plan.md`](../artifacts/verification-plan.md),
  [`docs/concepts/proof-report-publication.md`](../concepts/proof-report-publication.md),
  [`docs/artifacts/proof-report-publication.md`](../artifacts/proof-report-publication.md),
  this file, `roadmap.md`,
  `issue-governance-architecture-decision.md`
  (step 38 flipped to shipped; step 39 added
  for VerificationResult derivation),
  `README.md`, `CHANGELOG.md`. New review
  packet
  `.rekon-dev/review-packets/verification-run-execution-v1.md`.

  **Recommended next slice:**
  **`VerificationRun` → `VerificationResult`
  derivation** (step 6). **Shipped next; see
  the entry below.**
- **VerificationRun → VerificationResult
  derivation (P1.1
  verification-result-from-run slice).** ✅
  Shipped. **Step 6** of the runner v1
  implementation sequence. Adds a safe
  derivation path so completed
  `VerificationRun` artifacts can feed the
  existing `VerificationResult` proof-summary
  surface (proof report, architecture summary,
  resolvers). **Derivation is pure** — no
  spawn, no source reads, no rerun of plan
  commands.

  **CLI:** new
  `rekon verify result from-run --run
  <id|type:id> [--allow-not-run] [--root
  <path>] [--json]`. Resolves the source
  `VerificationRun`, refuses dry-run /
  not-run runs by default (a dry-run is not
  proof), and writes a
  `VerificationResult` artifact citing the
  run, plan, and work-order in
  `header.inputRefs`. The implementation
  slice deliberately chose a separate
  command over a `--record-result` flag on
  `verify run` so the operator's intent
  (execute vs. derive) is visible in the
  command line.

  **Helper:** new
  `deriveVerificationResultFromRun(input,
  options)` in `@rekon/capability-verify`.
  Maps the run's command statuses to the
  result's four-value enum:
  `passed → passed`; `failed → failed`;
  **`timeout → failed`**;
  **`killed → failed`**;
  `skipped → skipped`;
  `not-run → not-run`. The run keeps
  `timeout` / `killed` first-class as
  evidence; the result rolls them up into
  `failed`. `recordedBy` is set to
  `"<run.runner.id>@<run.runner.version>"`
  (e.g. `"rekon.local.exec@0.1.0"`). The
  result body carries per-command
  `stdoutDigest` / `stderrDigest` and
  `exitCode` / `durationMs` /
  `startedAt` / `completedAt` but **does
  NOT copy `stdoutExcerpt` /
  `stderrExcerpt`** — the result stays
  concise; the run remains the place to
  inspect bounded log evidence.

  **Refusal behavior:** the helper throws
  `"VerificationRun status is not-run..."`
  when invoked on a dry-run; the CLI
  forwards this as a non-zero exit and an
  explicit error message. The
  `--allow-not-run` flag overrides for
  the rare case where an operator wants to
  shape a not-run result.

  **What derivation does NOT do:**
  - No spawn / no rerun of commands.
  - No mutation of
    `FindingStatusLedger`,
    `FindingLifecycleReport`,
    `CoherencyDelta`, or any
    reconciliation surface. A passing
    derived result does not auto-resolve
    findings.
  - No `--record-result` flag on
    `verify run --execute` (deliberate;
    keeps the operator's intent
    explicit).
  - No copy of raw stdout / stderr
    excerpts.
  - No `schemaVersion` bump on
    `VerificationResult`.

  **Tests:** **24 new tests** in
  `tests/contract/verification-result-from-run.test.mjs`
  cover helper status mapping
  (passed / failed / timeout / killed /
  partial / not-run + refusal + allowNotRun
  override), input ref citations, recorded-by
  identity, excerpt-omission +
  digest-preservation, and the CLI paths
  (writes for passed and failed runs,
  refuses dry-run runs, refuses without
  `--run`, cites plan + run, body never
  carries raw stdout, digests preserved,
  no `FindingStatusLedger` /
  `FindingLifecycleReport` /
  `ReconciliationPlan` mutation, proof
  report consumes the derived result, the
  existing `verify record` / `--dry-run` /
  `--execute` paths remain unchanged, and
  `artifacts validate` stays clean). Full
  suite: **1084 passed / 1 skipped**.

  **Docs:** updated
  [`docs/concepts/verification-runs.md`](../concepts/verification-runs.md)
  (new Derivation (Step 6, Shipped)
  subsection),
  [`docs/artifacts/verification-run.md`](../artifacts/verification-run.md)
  (rewrote the Deriving VerificationResult
  section to describe the shipped CLI),
  [`docs/strategy/verification-runner-v1-decision.md`](verification-runner-v1-decision.md)
  (step 6 flipped to ✅ Shipped),
  [`docs/concepts/verification-results.md`](../concepts/verification-results.md),
  [`docs/artifacts/verification-result.md`](../artifacts/verification-result.md),
  [`docs/artifacts/verification-plan.md`](../artifacts/verification-plan.md),
  [`docs/concepts/proof-report-publication.md`](../concepts/proof-report-publication.md),
  [`docs/artifacts/proof-report-publication.md`](../artifacts/proof-report-publication.md),
  this file, `roadmap.md`,
  `issue-governance-architecture-decision.md`
  (step 39 flipped to shipped; subsequent
  steps renumbered),
  `README.md`, `CHANGELOG.md`. New review
  packet
  `.rekon-dev/review-packets/verification-result-from-run.md`.

  **Recommended next slice:** **verification
  proof surfaces v2**. **Shipped next; see the
  entry below.**
- **Verification proof surfaces v2 (P1.1
  verification-proof-surfaces-v2 slice).** ✅
  Shipped. **Step 7** of the runner v1
  implementation sequence — publication-only
  batch that makes proof state legible across
  the proof report, architecture summary, and
  agent contract publications, plus the
  `resolve.issue` verification trace. **No
  command execution. No artifact-shape
  changes** (only additive optional fields on
  `VerificationEvidenceSummary`).

  **Shared helper
  (`@rekon/capability-intent`):** new pure
  function
  `summarizeVerificationProofSurface(input)`
  classifies a `VerificationResult` as
  `manual` / `runner-derived` / `unknown` (via
  a `VerificationRun` ref in
  `header.inputRefs` or a known runner
  identity pattern in `recordedBy` like
  `rekon.local.exec@<version>`); computes
  freshness (`fresh` / `stale` /
  `missing-plan` / `unknown`) against the
  latest `VerificationPlan`; and emits
  machine-readable warnings
  (`proof-failed`, `proof-partial`,
  `proof-not-run`, `proof-stale`,
  `proof-missing-plan`,
  `proof-source-unknown`,
  `runner-run-missing`).

  **Proof report:** renders a new
  `## Verification Proof Summary` section with
  the classifier output, refs to the
  `VerificationResult` / `VerificationPlan` /
  `VerificationRun` / `WorkOrder`, the
  recorded-by identity, and any classifier
  warnings (each with a recommended command).
  The per-command **Verification Results**
  table now carries stdout / stderr **digest
  prefixes** (first 12 hex chars) in a new
  `Digests` column — **raw excerpts are
  never rendered**.

  **Architecture summary:** renders a compact
  `## Verification Proof Status` block right
  after the existing Verification Status
  section. The block shows `Status`,
  `Source`, `Freshness`, and the result + run
  refs. When proof is incomplete or stale, the
  block surfaces
  `> Verification is not complete or current.
  Do not mark governed issues resolved from
  this proof alone.` When proof is passed and
  fresh, the block surfaces
  `Verification passed. Passing proof does not
  automatically resolve findings.`

  **Agent contract:** the
  `## Proof And Verification State` section
  surfaces `Proof source` and `Proof
  freshness` lines, adds agent instructions
  for incomplete and stale proof (`Treat proof
  as incomplete...`, `Do not rely on stale
  proof...`), and renders
  `Runner-derived proof cites
  VerificationRun:<id>.` when applicable. Two
  new entries land in `## Do Not Do`:
  - `Do not treat passed verification as
    automatic finding resolution; status
    changes require explicit lifecycle/status
    artifacts.`
  - `Do not treat stale, partial, failed,
    timeout, killed, or not-run verification
    as proof of completion.`

  **`resolve.issue` (additive):**
  `VerificationEvidenceSummary` now carries
  `source`, `freshness`, and
  `verificationRunRef` optional fields. The
  verification trace message includes the
  proof source (e.g. `(source:
  runner-derived)`) and a freshness suffix
  when stale or missing-plan. No
  `IssuePacket` shape change; `resolve.issue`
  remains explicit about not auto-resolving
  findings.

  **What this batch does NOT do:**
  - No `VerificationResult` /
    `VerificationRun` shape change.
  - No mutation of `FindingStatusLedger`,
    `FindingLifecycleReport`,
    `CoherencyDelta`, or any reconciliation
    surface.
  - No rerun of commands.
  - No copy of raw stdout / stderr excerpts
    into publications.
  - No CI / GitHub adapter.
  - No `schemaVersion` bump.

  **Tests:** **22 new tests** in
  `tests/contract/verification-proof-surfaces-v2.test.mjs`
  cover helper classification (manual vs
  runner-derived via inputRefs or recordedBy,
  freshness mapping, all warning codes,
  missing-result defaults), publication
  rendering (proof report shows source +
  freshness + digest prefixes and never
  leaks raw stdout, failed callout, stale
  callout when a newer plan is generated,
  architecture summary renders the new
  block, agent contract surfaces source +
  freshness + agent instructions + new Do Not
  Do entries), and no-mutation invariants
  (passing runner-derived proof does not
  mutate `FindingStatusLedger`, existing
  `verify record` / `--dry-run` / `--execute`
  paths still work, `artifacts validate`
  remains clean after the full v2 publication
  chain). Full suite: **1106 passed / 1
  skipped**.

  **Docs:** updated
  [`docs/concepts/verification-runs.md`](../concepts/verification-runs.md),
  [`docs/artifacts/verification-run.md`](../artifacts/verification-run.md),
  [`docs/concepts/verification-results.md`](../concepts/verification-results.md),
  [`docs/artifacts/verification-result.md`](../artifacts/verification-result.md),
  [`docs/concepts/proof-report-publication.md`](../concepts/proof-report-publication.md),
  [`docs/artifacts/proof-report-publication.md`](../artifacts/proof-report-publication.md),
  [`docs/concepts/architecture-summary-publication.md`](../concepts/architecture-summary-publication.md),
  [`docs/concepts/agent-operating-contract.md`](../concepts/agent-operating-contract.md),
  [`docs/artifacts/agent-contract-publication.md`](../artifacts/agent-contract-publication.md),
  [`docs/artifacts/resolver-packet.md`](../artifacts/resolver-packet.md),
  [`docs/concepts/resolvers.md`](../concepts/resolvers.md),
  [`docs/strategy/verification-runner-v1-decision.md`](verification-runner-v1-decision.md)
  (step 7 flipped to ✅ Shipped),
  this file, `roadmap.md`,
  `issue-governance-architecture-decision.md`
  (step 40 flipped to shipped; subsequent
  steps renumbered).
  `README.md` and `CHANGELOG.md` updated. New
  review packet
  `.rekon-dev/review-packets/verification-proof-surfaces-v2.md`.

  **Recommended next slice:** **verification
  runner CI / GitHub adapter decision memo**
  (step 8). **Shipped next; see the entry
  below.**
- **Verification runner CI / GitHub adapter
  decision memo (P1.1
  verification-runner-ci-github-decision
  slice).** ✅ Shipped. **Step 8** of the
  runner v1 implementation sequence —
  strategy-only batch. No runtime change.
  The memo
  ([`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md))
  decides whether Rekon's verification
  runner should remain local-only for alpha
  or gain a GitHub Actions / PR-check
  surface, and pins the safety contract any
  future CI surface must respect.

  **Decision: Option D — local-first runner
  plus documented GitHub Actions workflow
  template for alpha; first-party GitHub
  Check / PR comment publisher deferred to
  beta.**

  **Anchor invariants pinned by the memo
  regardless of which slice ships next:**
  - **GitHub status is not canonical
    truth.** Rekon's `VerificationRun`,
    `VerificationResult`, and
    `Publication` artifacts remain
    canonical; any future Check / PR /
    dashboard output is a downstream
    projection, never an independent
    source of truth.
  - **Forked PRs must not receive
    secret-bearing execution by default.**
    The alpha workflow template uses
    `permissions: contents: read`, no
    secrets, and the standard
    `pull_request` trigger.
    `pull_request_target` is forbidden.

  **Alpha workflow contract (memo only —
  the actual YAML lands in the next
  implementation slice):**
  - `permissions: contents: read` at the
    workflow level.
  - No `pull-requests: write` /
    `checks: write` / `contents: write` /
    `id-token`.
  - No secrets declared in the template.
  - No `pull_request_target`.
  - Steps: `refresh` → resolve latest plan
    id → `verify run --execute` →
    `verify result from-run` →
    `publish proof` / `architecture` /
    `agent-contract` →
    `artifacts validate` → upload
    `.rekon/artifacts` (excluding `.log`
    files) with `retention-days: 7` →
    append proof-report markdown to
    `$GITHUB_STEP_SUMMARY`.
  - No GitHub API writes anywhere in the
    template.

  **Artifact upload / retention contract:**
  - Upload `.rekon/artifacts` (canonical
    proof record). Exclude `.log` files
    explicitly; raw command logs never
    cross the publication boundary
    (Rekon's runner already enforces this
    with redacted truncated excerpts +
    sha256 digests).
  - Default `retention-days: 7`; operators
    may raise to GitHub's max (90) but
    7–14 is recommended to bound
    exposure.

  **Job summary contract:**
  - Use GitHub's built-in
    `$GITHUB_STEP_SUMMARY` file. No API
    permissions required. The summary
    body is the existing proof report
    publication markdown.

  **Implementation sequence:**
  1. **(this slice)** Decision memo +
     supporting doc updates.
  2. **GitHub Actions workflow template**
     (alpha, docs-only). Adds
     `.github/workflows/rekon-verify.yml`
     template (under `examples/` or
     `docs/examples/`) plus operator
     documentation.
  3. **CLI ergonomics for CI (optional).**
     Add `rekon artifacts latest
     --type <type> --json` for plan/run
     id lookup.
  4. **Job-summary publisher (optional).**
     A `--summary-only` flag or
     `rekon publish job-summary` command
     for tighter `$GITHUB_STEP_SUMMARY`
     output.
  5. **GitHub Check publisher (beta).**
     Requires `checks: write`, explicit
     per-repo opt-in, and a documented
     fork-safety contract — separate
     decision memo.
  6. **PR comment publisher (beta+).**
     Requires `pull-requests: write`.
  7. **Cross-CI documentation (beta+).**
     GitLab CI / Jenkins / CircleCI /
     etc. patterns. The CLI surface is
     identical; only the YAML envelope
     differs.

  **Tests:** 16 docs-only assertions in
  `tests/docs/verification-runner-ci-github-decision.test.mjs`
  pin the memo's required headings,
  recommendation, anchor invariants
  (`GitHub status is not canonical
  truth`; `forked PRs must not receive
  secret-bearing execution by default`),
  workflow contract
  (`permissions: contents: read`;
  `.rekon/artifacts` upload; no raw logs;
  job summary), implementation sequence
  presence, CHANGELOG mention, and
  review-packet `PURPOSE PRESERVATION
  CHECK`.

  **Docs:** 9 updated
  ([`docs/concepts/verification-runs.md`](../concepts/verification-runs.md),
  [`docs/concepts/verification-results.md`](../concepts/verification-results.md),
  [`docs/concepts/proof-report-publication.md`](../concepts/proof-report-publication.md),
  [`docs/artifacts/proof-report-publication.md`](../artifacts/proof-report-publication.md),
  [`docs/strategy/verification-runner-v1-decision.md`](verification-runner-v1-decision.md)
  (step 8 flipped to shipped),
  this file, `roadmap.md`,
  `issue-governance-architecture-decision.md`
  (step 41 flipped to shipped; step 42
  added for the workflow-template
  implementation slice; subsequent steps
  renumbered)). New strategy doc
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  New review packet
  [`.rekon-dev/review-packets/verification-runner-ci-github-decision.md`](../../.rekon-dev/review-packets/verification-runner-ci-github-decision.md).
  `README.md` + `CHANGELOG.md` updated.

  **Recommended next slice:**
  **verification runner GitHub Actions
  workflow template** (alpha
  implementation, docs-only). **Shipped
  next; see the entry below.**
- **Verification runner GitHub Actions
  workflow template (P1.1
  verification-runner-github-actions-template
  slice).** ✅ Shipped. **Step 2** of the
  CI / GitHub adapter implementation
  sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  **Docs-only batch. No code changes. No
  active workflow in `.github/workflows`.**

  **Shipped artifacts:**
  - Copyable workflow YAML at
    [`docs/examples/workflows/rekon-verification.yml`](../examples/workflows/rekon-verification.yml).
    Operators copy it into their own
    repo's `.github/workflows/` to enable;
    the Rekon repo itself does not install
    it.
  - Operator documentation at
    [`docs/examples/github-actions-verification-runner.md`](../examples/github-actions-verification-runner.md)
    (10-section guide covering what the
    template does / does not do, the
    permission model, fork / secret safety,
    artifact upload policy, job summary
    behavior, plan-lookup customization,
    execute-vs-dry-run swap, why GitHub
    status is not canonical truth, and
    troubleshooting).

  **Workflow contract (pinned by 23
  docs-only assertions):**
  - `permissions: contents: read` only.
    No `pull-requests: write`, no
    `checks: write`, no
    `contents: write`, no
    `id-token: write`.
  - Triggers: `pull_request` and
    `workflow_dispatch`. No
    `pull_request_target`.
  - No secrets declared.
  - Steps: checkout → setup-node@v4 →
    `npm ci` → `npm run build` →
    `rekon refresh` → resolve latest
    `VerificationPlan` id via an inline
    Node snippet (template helper;
    future CLI helper may replace) →
    `rekon verify run --execute` →
    resolve `VerificationRun` id from
    the execute JSON output →
    `rekon verify result from-run` →
    `rekon publish proof` /
    `publish architecture` /
    `publish agent-contract` →
    `rekon artifacts validate` → append
    `# Rekon Verification Summary` plus
    the proof-report markdown to
    `$GITHUB_STEP_SUMMARY` → upload
    `.rekon/artifacts/**` (with
    `!.rekon/artifacts/**/*.log`
    exclusion) as `rekon-artifacts` with
    `retention-days: 7`.
  - No GitHub API writes anywhere.

  **Tests:** **23 docs-only assertions**
  in
  `tests/docs/verification-runner-github-actions-template.test.mjs`
  pin both file's existence; the
  permission contract; the
  `pull_request_target` prohibition; the
  absence of every write permission; every
  CLI step the template runs (`refresh`,
  `verify run`, `verify result from-run`,
  `publish proof`, `artifacts validate`);
  the upload path inclusion / `.log`
  exclusion / `retention-days: 7`; the four
  anchor statements (`GitHub status is not
  canonical truth`; `Rekon artifacts
  remain canonical`; `Forked PRs must not
  receive secret-bearing execution by
  default`; `Passing verification does not
  automatically resolve findings`); the
  CHANGELOG mention; and the review-packet
  `PURPOSE PRESERVATION CHECK`. Full
  suite: **1145 passed / 1 skipped**.

  **Docs:** 9 updated
  ([`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md)
  (step 2 flipped to ✅ Shipped),
  [`docs/strategy/verification-runner-v1-decision.md`](verification-runner-v1-decision.md)
  (cross-reference),
  [`docs/concepts/verification-runs.md`](../concepts/verification-runs.md),
  [`docs/concepts/verification-results.md`](../concepts/verification-results.md),
  [`docs/concepts/proof-report-publication.md`](../concepts/proof-report-publication.md),
  [`docs/artifacts/proof-report-publication.md`](../artifacts/proof-report-publication.md),
  this file, `roadmap.md`,
  `issue-governance-architecture-decision.md`
  (step 42 flipped to ✅ Shipped; step 43
  added for latest-artifact CLI helpers;
  subsequent steps renumbered)).
  `README.md` and `CHANGELOG.md`
  updated. New review packet
  `.rekon-dev/review-packets/verification-runner-github-actions-template.md`.

  **Recommended next slice:**
  **verification runner latest-artifact
  CLI helpers**. **Shipped next; see the
  entry below.**
- **Verification runner latest-artifact
  CLI helper (P1.1
  artifacts-latest-cli-helper slice).** ✅
  Shipped. **Step 3** of the CI / GitHub
  adapter implementation sequence pinned
  by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  Adds a read-only CLI helper and updates
  the GitHub Actions workflow template to
  use it instead of inline Node snippets.

  **CLI:** new
  `rekon artifacts latest --type
  <ArtifactType> [--kind <kind>]
  [--id-only] [--allow-missing] [--root
  <path>] [--json]`.
  - Walks the local artifact index sorted
    by `writtenAt` desc (the canonical
    "latest" ordering used by the
    existing
    `resolveVerificationPlanEntry`
    helper).
  - `--kind <kind>` is valid only with
    `--type Publication`; walks entries
    newest-first and reads each
    Publication body until a matching
    `body.kind` is found (still
    read-only; no mutation; unreadable
    entries are skipped).
  - `--id-only` emits a typed
    `<type>:<id>` ref to stdout (no
    JSON). Shell-friendly for
    `$GITHUB_OUTPUT` capture.
  - `--allow-missing` returns
    `artifact: null` with exit 0 instead
    of exit 1.
  - Default: exit 1 when no matching
    artifact exists; JSON payload still
    written.
  - Refuses `--kind` on a non-
    Publication type with a clear
    error.

  **Workflow template:** the previously-
  inlined
  `node - <<'NODE'` snippets in
  [`docs/examples/workflows/rekon-verification.yml`](../examples/workflows/rekon-verification.yml)
  for resolving the latest
  `VerificationPlan`, the latest
  `VerificationRun`, and the latest
  proof-report `Publication` are now
  `rekon artifacts latest --id-only`
  calls. Workflow contract
  (`permissions: contents: read`,
  no `pull_request_target`, no API
  writes, `actions/upload-artifact`
  upload, `$GITHUB_STEP_SUMMARY` job
  summary, `retention-days: 7`) is
  unchanged.

  **What this batch does NOT do:**
  - No execution change. `rekon verify
    run --execute` behaves identically.
  - No artifact-shape change. The
    helper reads existing index +
    bodies; it never mutates.
  - No new artifact type.
  - No GitHub API writes.
  - No `.github/workflows/` install
    in this repo.

  **Tests:** 12 contract tests in
  `tests/contract/artifacts-latest-cli.test.mjs`
  pin: latest-by-type, missing →
  null + exit 1, `--allow-missing` exit
  0, `--id-only` typed ref + no JSON,
  Publication `--kind` filter,
  `--kind` on non-Publication failure,
  kind reading `body.kind` (not id
  prefix), older artifact ignored,
  read-only invariant (artifact index
  unchanged before/after), `artifacts
  validate` clean, missing `--type`
  rejection, and `--id-only` missing
  case (stderr + empty stdout). 9
  docs-only assertions in
  `tests/docs/verification-runner-github-actions-template-latest-helper.test.mjs`
  pin the workflow template's adoption
  of the helper, the absence of inline
  `node - <<'NODE'` snippets, the
  operator-guide mention + read-only
  description, the CHANGELOG mention,
  and the review-packet `PURPOSE
  PRESERVATION CHECK`. Full suite:
  **1166 passed / 1 skipped**.

  **Docs:** 11 updated
  ([`docs/examples/github-actions-verification-runner.md`](../examples/github-actions-verification-runner.md)
  — Customizing the VerificationPlan
  lookup section rewritten around the
  helper),
  [`docs/examples/workflows/rekon-verification.yml`](../examples/workflows/rekon-verification.yml)
  — inline Node snippets replaced with
  helper calls,
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md)
  — step 3 flipped to ✅ Shipped,
  [`docs/concepts/verification-runs.md`](../concepts/verification-runs.md),
  [`docs/concepts/verification-results.md`](../concepts/verification-results.md),
  [`docs/concepts/proof-report-publication.md`](../concepts/proof-report-publication.md),
  [`docs/artifacts/proof-report-publication.md`](../artifacts/proof-report-publication.md),
  this file, `roadmap.md`,
  `issue-governance-architecture-decision.md`
  — step 43 flipped to ✅ Shipped.
  `README.md` and `CHANGELOG.md`
  updated. New review packet
  `.rekon-dev/review-packets/artifacts-latest-cli-helper.md`.

  **Recommended next slice:**
  **verification runner GitHub Actions
  workflow hardening v2**. **Shipped
  next; see the entry below.**
- **Verification runner GitHub Actions
  workflow hardening v2 (P1.1
  verification-runner-github-actions-hardening-v2
  slice).** ✅ Shipped. **Step 4** of
  the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  Docs / examples / docs-test batch.
  No code changes. No active workflow
  in `.github/workflows`. No GitHub API
  writes.

  **Shipped artifacts:**
  - New copyable dry-run workflow at
    [`docs/examples/workflows/rekon-verification-dry-run.yml`](../examples/workflows/rekon-verification-dry-run.yml).
    Same safety contract as the
    execute variant
    (`permissions: contents: read`,
    no secrets, no
    `pull_request_target`, no GitHub
    API writes,
    `actions/upload-artifact` of
    `.rekon/artifacts/**` excluding
    `.log`, `retention-days: 7`) but
    runs `rekon verify run --dry-run`
    instead of `--execute`. Spawns
    **zero** plan commands.
    Intentionally omits
    `verify result from-run` because
    a dry-run is not proof.
  - Execute workflow at
    [`docs/examples/workflows/rekon-verification.yml`](../examples/workflows/rekon-verification.yml)
    hardened with extended
    `rekon artifacts latest` lookups
    for `VerificationResult`,
    `Publication --kind
    architecture-summary`, and
    `Publication --kind agent-contract`
    so the job summary cites every
    refresh-loop publication ref.
    Header comments updated to call
    out the EXECUTE variant
    relationship to the dry-run
    variant and to expand the safety
    contract description.
  - Both job summaries now include an
    explicit `Mode: execute|dry-run`
    line, an
    `Artifacts valid: true|false`
    line (captured from
    `rekon artifacts validate --json`),
    and rows for every publication
    ref. The dry-run summary states
    `VerificationResult: not produced
    (dry-run is not proof)`.

  **Operator guide updates
  ([`docs/examples/github-actions-verification-runner.md`](../examples/github-actions-verification-runner.md)):**
  - New "Adoption — copy the dry-run
    template first" section near the
    top with a 6-step adoption path.
  - Expanded Troubleshooting section
    with **10 items**, each carrying
    **Likely cause** / **Safe next
    step** / **Do not** triples:
    no `VerificationPlan` found,
    Verification command failed,
    Dry-run produced VerificationRun
    but no VerificationResult,
    `verify result from-run` refuses
    the run, Artifacts validate
    failed, Artifacts upload
    missing, Forked PR needs
    secrets, Workflow summary says
    proof is stale, `verify run
    --execute` fails immediately on
    every command, Job summary
    doesn't render the proof report,
    A reviewer reads the green badge
    and treats it as completion.
  - Cross-references updated to
    list both workflow templates.

  **What this batch does NOT do:**
  - No code changes.
  - No new CLI commands.
  - No new artifact types.
  - No active workflow in
    `.github/workflows/` of the Rekon
    repo.
  - No GitHub API writes.
  - No GitHub Check publisher (still
    deferred to beta).
  - No PR comment publisher (still
    deferred to beta).
  - No write permissions added
    anywhere.

  **Tests:** **23 docs-only assertions**
  in
  `tests/docs/verification-runner-github-actions-hardening.test.mjs`
  pin: dry-run YAML existence; both
  workflows' permission contract; the
  `pull_request_target` prohibition;
  the absence of every write
  permission; the
  `--dry-run` / `--execute` split;
  both workflows' adoption of
  `rekon artifacts latest`; the
  upload path + `.log` exclusion +
  `retention-days: 7` +
  `$GITHUB_STEP_SUMMARY`; the
  adoption-first language in the
  operator guide; the three anchor
  statements (canonical truth,
  artifacts canonical, fork
  secrets); three troubleshooting
  items (no plan, failed command,
  forked-PR secrets); the CHANGELOG
  mention; and the review-packet
  `PURPOSE PRESERVATION CHECK`. Full
  suite: **1189 passed / 1 skipped**.

  **Docs:** 11 updated
  ([`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md)
  (step 4 flipped to ✅ Shipped),
  [`docs/concepts/verification-runs.md`](../concepts/verification-runs.md)
  (CI / GitHub Direction now mentions
  the dry-run variant),
  [`docs/examples/github-actions-verification-runner.md`](../examples/github-actions-verification-runner.md)
  (Adoption section + Troubleshooting
  expansion + cross-references),
  [`docs/examples/workflows/rekon-verification.yml`](../examples/workflows/rekon-verification.yml)
  (hardening + latest-helper
  expansion),
  [`docs/examples/workflows/rekon-verification-dry-run.yml`](../examples/workflows/rekon-verification-dry-run.yml)
  (new), this file, `roadmap.md`,
  `issue-governance-architecture-decision.md`,
  `concepts/verification-results.md`,
  `concepts/proof-report-publication.md`,
  `artifacts/proof-report-publication.md`).
  `README.md` and `CHANGELOG.md`
  updated. New review packet
  `.rekon-dev/review-packets/verification-runner-github-actions-hardening-v2.md`.

  **Recommended next slice:**
  **verification runner GitHub
  workflow validation helper**.
  **Shipped next; see the entry
  below.**
- **Verification runner GitHub
  workflow validation helper (P1.1
  github-workflow-safety-validator
  slice).** ✅ Shipped. **Step 5** of
  the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  CLI + docs + tests batch. No
  artifact-shape change. No new
  capability package. No active
  workflow in `.github/workflows`. No
  GitHub API writes.

  **Shipped artifacts:**
  - New CLI command
    `rekon verify github-workflow
    validate --path <workflow.yml>
    [--json]` (surface in
    `packages/cli/src/index.ts`,
    co-located helper
    `validateGitHubWorkflowSafety`).
    The validator is **pure static
    text analysis** — no YAML parser
    dependency, no GitHub API calls,
    no spawn / exec, no filesystem
    writes, no network. It loads the
    workflow text via `fs.readFile`
    and runs regex-based checks.
  - Quote-aware comment-stripping
    helper that tracks `'`, `"`, and
    `` ` `` modes so workflow
    templates can echo
    `#`-prefixed strings (e.g.
    `# Rekon Verification Summary`)
    into `$GITHUB_STEP_SUMMARY`
    without the validator removing
    the surrounding `$GITHUB_STEP_SUMMARY`
    reference.
  - Both bundled templates
    ([`docs/examples/workflows/rekon-verification.yml`](../examples/workflows/rekon-verification.yml),
    [`docs/examples/workflows/rekon-verification-dry-run.yml`](../examples/workflows/rekon-verification-dry-run.yml))
    gained a top-of-file comment
    block instructing operators to
    run the validator after copying.
    Both pass with zero errors /
    zero warnings (`rekon-verification.yml`
    detects mode = `execute`,
    `rekon-verification-dry-run.yml`
    detects mode = `dry-run`).
  - Operator guide
    [`docs/examples/github-actions-verification-runner.md`](../examples/github-actions-verification-runner.md)
    gained a new "Validate a copied
    workflow" section before
    Adoption.

  **Safety contract enforced
  (errors):**
  - No `pull_request_target` trigger.
  - No GitHub write permissions
    (`pull-requests`, `checks`,
    `contents`, `id-token`, `actions`,
    `deployments`, `statuses`,
    `packages` set to `write`).
  - `permissions: contents: read`
    declared.
  - No GitHub API calls (`gh api`,
    `curl api.github.com`,
    `actions/github-script`).
  - Uses `rekon artifacts latest`.
  - Uploads `.rekon/artifacts/**`.
  - Excludes `.log` files.
  - Appends to
    `$GITHUB_STEP_SUMMARY`.
  - Mode resolvable to `execute`
    (verify run `--execute`) or
    `dry-run` (`--dry-run`); `unknown`
    is an error so operators always
    know which path the workflow takes.

  **Soft checks (warnings only):**
  canonical-truth reminder presence
  in the summary block, `retention-days`
  declared on the upload step.

  **Read-only invariant:** the
  validator never spawns / executes /
  calls GitHub APIs and never mutates
  the workflow file (verified by
  asserting the file's stat / mtime
  is unchanged after a run in the
  contract test).

  **Tests:** new contract suite
  `tests/contract/github-workflow-safety-validator.test.mjs`
  (25 tests covering both templates,
  every error code, the warning
  behaviour, the read-only invariant,
  and the CLI surface incl. exit
  codes). Existing
  `tests/docs/verification-runner-github-actions-hardening.test.mjs`
  gained 3 new assertions (operator
  guide mentions the command, both
  templates carry the validate-command
  comment, CHANGELOG mentions the
  helper). Full suite: **1218 passed
  / 1 skipped**.

  **Docs:** 13 updated
  ([`docs/examples/github-actions-verification-runner.md`](../examples/github-actions-verification-runner.md)
  — new "Validate a copied workflow"
  section),
  [`docs/examples/workflows/rekon-verification.yml`](../examples/workflows/rekon-verification.yml)
  + [`docs/examples/workflows/rekon-verification-dry-run.yml`](../examples/workflows/rekon-verification-dry-run.yml)
  — both gained the validate-command
  comment,
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md)
  — new step 5 (validation helper)
  flipped to ✅ Shipped; subsequent
  steps renumbered,
  [`docs/concepts/verification-runs.md`](../concepts/verification-runs.md),
  [`docs/concepts/verification-results.md`](../concepts/verification-results.md),
  [`docs/concepts/proof-report-publication.md`](../concepts/proof-report-publication.md),
  [`docs/artifacts/proof-report-publication.md`](../artifacts/proof-report-publication.md),
  this file, `roadmap.md`,
  `issue-governance-architecture-decision.md`
  — step 45 flipped to ✅ Shipped.
  `README.md` and `CHANGELOG.md`
  updated. New review packet
  `.rekon-dev/review-packets/github-workflow-safety-validator.md`.

  **Recommended next slice:**
  **verification runner GitHub
  Check publisher (beta)** — the
  optional adapter that publishes
  `VerificationResult` summaries as
  GitHub Checks. Requires
  `checks: write` and per-installation
  setup; sits behind a config flag
  so Rekon artifacts remain the
  canonical truth. Pinned as step 6
  in the CI / GitHub adapter
  implementation sequence.

  No active workflow. No GitHub API
  writes. No artifact-shape change.
  No `schemaVersion` bump. No
  `FindingStatusLedger` /
  `FindingLifecycleReport` /
  `CoherencyDelta` /
  `ReconciliationPlan` mutation. No
  version bump. No npm publish.
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
