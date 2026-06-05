# Classic Behavior Roadmap

> **First retrieval consumer intent-integration dogfood safety-reviewed (slice 174):** the embeddings track (classic Track B) reviewed the slice-173 task-shaped-context intent dogfood path end-to-end and declared it safe/stable — codebase-intel context-packet value confirmed with every deterministic gate holding; context stays proposal/context, not proof; intent:go deferred. See [`task-context-report-intent-dogfood-safety-review.md`](./task-context-report-intent-dogfood-safety-review.md).

> **First retrieval consumer intent-integration dogfooded (slice 173):** the embeddings track (classic Track B) ran the full operator path with opt-in task-shaped context — it improved matchedContext / revisionPrompt (codebase-intel context-packet value) while every gate held; source unchanged; intent:go deferred. See [`task-context-report-intent-dogfood.md`](./task-context-report-intent-dogfood.md).

> **First retrieval consumer intent-integration safety-reviewed (slice 172):** the embeddings track (classic Track B) reviewed the slice-171 task-shaped-context intent integration end-to-end and declared it safe/stable — additive context only (codebase-intel context-packet analogue), prepare by lineage, context not proof; intent:go deferred. See [`task-context-report-intent-integration-safety-review.md`](./task-context-report-intent-integration-safety-review.md).

> **First retrieval consumer intent-integration implemented (slice 171):** the embeddings track (classic Track B) wired task-shaped context into the intent spine — explicit opt-in `--task-context latest|<ref>` on assess / plan review (mirroring codebase-intel context packets as planning context), additive only (readiness / status decided first), prepare by lineage, context not proof. See [`task-context-report-intent-integration-implementation.md`](./task-context-report-intent-integration-implementation.md).

> **First retrieval consumer intent-integration decided (slice 170):** the embeddings track (classic Track B) decided how task-shaped context feeds the intent spine — explicit, opt-in consumption by assess / plan review (mirroring codebase-intel context packets as planning context), prepare by lineage only, context not proof. See [`task-context-report-intent-integration-decision.md`](./task-context-report-intent-integration-decision.md).

> **First retrieval consumer selection-quality fixed (slice 169):** the embeddings track (classic Track B) tightened task-shaped context — free-form verification intent (codebase-intel checkMatrix parity) now yields hints without inventing commands, and weak retrieval degrades to labelled supporting context. Context, not proof. See [`task-context-report-selection-quality-fix.md`](./task-context-report-selection-quality-fix.md).

> **First retrieval consumer dogfooded (slice 168):** the embeddings track (classic Track B) dogfooded task-shaped context — the explicit-path + graph baseline mirrors codebase-intel's context packets usefully (mustNot → do-not-touch, checkMatrix → verification hints); the lexical mock retrieval path is low-signal, so a real embedding provider (Voyage) is needed before relying on retrieval for context. Context, not proof. Next: selection-quality fix. See [`task-context-report-dogfood-review.md`](./task-context-report-dogfood-review.md).

> **First consumer safety-reviewed (slice 167):** the embeddings track (classic Track B) confirmed task-shaped context is safe/stable as context only — mirroring codebase-intel's context packets (guidance, not automation). Next: dogfood review. See [`task-context-report-safety-review.md`](./task-context-report-safety-review.md).

> **First retrieval consumer shipped (slice 166):** the embeddings track (classic Track B) shipped task-shaped context — `TaskContextReport` / `rekon context task` — mirroring codebase-intel's context bundle (mustNot → do-not-touch, checkMatrix → verification hints) while keeping duplicate detection and canonical recommendations deferred. See [`task-context-report-v1.md`](./task-context-report-v1.md).

> **First retrieval consumer decided (slice 165):** the embeddings track (classic Track B) decided task-shaped context as the first retrieval consumer — a future `TaskContextReport` / `rekon context task` that mirrors codebase-intel's context bundle (its `mustNot` → do-not-touch zones, `checkMatrix` → verification hints, representative selection → graph-grounded diversity) while keeping similarity-only canonical scoring deferred. Context, not proof; deterministic facts outrank similarity. See [`task-shaped-context-embedding-retrieval-decision.md`](./task-shaped-context-embedding-retrieval-decision.md).

> **Embedding retrieval ranking implemented (slice 164):** the embeddings track (classic Track B) shipped its ranking policy — `input_type=query` for queries (an improvement over codebase-intel, which only ever used `document`), default top-k 8 / max 20, and score bands on every result. Duplicate detection and canonical recommendations stay deferred until similarity is combined with deterministic ownership/fan-in/runtime evidence (codebase-intel's `base + log2(fanIn+1)*5` ranking). See [`embedding-query-input-type-ranking-policy-implementation.md`](./embedding-query-input-type-ranking-policy-implementation.md).

> **Embedding retrieval ranking decided (slice 163):** the embeddings track (classic Track B) now has a pinned retrieval ranking policy — score bands, top-k defaults, `input_type=query` for queries, and task-shaped context as the first consumer. codebase-intel parity informed the calibration (its top-k 10, near-duplicate 0.86, and canonical = base + `log2(fanIn+1)*5` ranking), and Rekon improves on it by adopting `input_type=query` (codebase-intel only ever used `document`). Duplicate detection and canonical recommendations stay deferred until similarity is combined with deterministic ownership/fan-in/runtime evidence; linear scan replaces ANN/HNSW for v1. See [`embedding-retrieval-similarity-ranking-decision.md`](./embedding-retrieval-similarity-ranking-decision.md).

> **LLM-semantic parity decided (slice 143):** an audit of the old codebase-intel system separated Track A (finish LLM-backed semantic parsing — the one real non-embedding gap is per-file semantic file understanding) from Track B (embeddings, deferred). Semantic output stays proposal-not-proof; no approval/execution/source-writes/Circe. See [`classic-llm-semantic-parsing-parity-decision.md`](./classic-llm-semantic-parsing-parity-decision.md).

> **Semantic quality hardened (slice 142):** provider phases are re-checked against the source — unsupported touched paths and verification commands become findings + warnings, dropped non-goals are flagged, and a weak plan cannot become actionable by filling fields without source support. Deterministic recheck stays authoritative. See [`intent-plan-semantic-quality-hardening.md`](./intent-plan-semantic-quality-hardening.md).

> **Semantic quality proven (slice 141):** LLM-backed semantic normalization was dogfooded live (OpenAI `gpt-4o-mini`) — it extracts objectives/deliverables/acceptance/paths/commands and preserves non-goals with **zero invented paths or commands**, while staying a proposal that is schema-gated and deterministically rechecked. See [`intent-plan-semantic-quality-dogfood.md`](./intent-plan-semantic-quality-dogfood.md).

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

- **Intent plan compiler (plan review / elicitation).** ✅ Shipped (slice 129) as
  `rekon intent plan review` / `IntentPlanActionabilityReport` — restores the classic
  raw-plan → normalization → phase-decomposition → actionability-checks →
  elicitation-questions → revision-feedback loop as a report-first layer. Deterministic-first;
  bounded provenance-tagged semantic adapter (provider wiring deferred); report-only — no plan
  mutation, source writes, command execution, or Circe. Slice 131 wired the report into
  `rekon intent prepare` (actionable → may shape the PreparedIntentPlan; non-actionable →
  blocks with revision guidance, no auto-approval), safety-reviewed safe/stable in slice 132.
  The remaining classic `askPreparedPhaseQuestions` / `answerPreparedPhaseQuestions`
  answer/merge-back loop was **decided** in slice 133 (Option B — a future `rekon intent plan
  answer` merges answers into a new `IntentPlanActionabilityReport` revision; no source writes,
  no command execution, no auto-approval, no `intent:go`); implementation follows. See
  [the intent plan compiler](../concepts/intent-plan-compiler.md), the
  [Intent Prepare Actionability Integration Safety Review](./intent-prepare-actionability-integration-safety-review.md),
  and the [Plan Actionability Answer / Merge-Back Decision](./plan-actionability-answer-merge-back-decision.md), shipped as `rekon intent plan answer` ([implementation](./plan-actionability-answer-merge-back-implementation.md), slice 134).
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
  Check publisher** — decision memo +
  gated skeleton (step 6a of the CI /
  GitHub adapter implementation
  sequence). **Shipped next; see the
  entry below.**
- **Verification runner GitHub Check
  publisher — decision + gated skeleton
  (P1.1 github-check-publisher-decision
  slice).** ✅ Shipped. **Step 6a** of
  the CI / GitHub adapter implementation
  sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  Decision memo + skeleton + tests +
  docs batch. No GitHub API calls. No
  active workflow in `.github/workflows`.
  No new GitHub write permissions in any
  bundled template. No artifact-shape
  change. No new capability package.

  **Decision memo:**
  [`docs/strategy/verification-runner-github-check-publisher-decision.md`](verification-runner-github-check-publisher-decision.md).
  Recommends **Option B** (split
  shipment: decision + skeleton now,
  dry-run CLI next, API call later).
  Eleven required headings present:
  Decision Summary, Problem, Current
  GitHub Workflow State, Options
  Considered, Recommendation, Canonical
  Artifact Boundary, Permission Model,
  Fork And Secret Safety, Check Payload
  Model, What This Does Not Do,
  Implementation Sequence, Tests
  Required For Implementation.

  **Skeleton in
  `@rekon/capability-docs`:**
  - `buildGitHubCheckPayload(input)` —
    pure helper that builds the Check
    payload (name, conclusion,
    output.title, output.summary,
    externalId, citedRefs) from
    artifact-like inputs.
  - `assessGitHubCheckPublisherReadiness(input)` —
    pure helper that returns
    `{ ready, issues[] }` after
    evaluating opt-in env vars
    (`REKON_GITHUB_CHECKS`,
    `GITHUB_TOKEN`,
    `GITHUB_REPOSITORY`, head SHA),
    event trust, and write-permission
    confirmation.
  - Exported types: `GitHubCheckPayload`,
    `GitHubCheckConclusion`,
    `GitHubCheckPublisherConfig`,
    `GitHubCheckPublisherReadiness` (+
    issue-code / event-trust /
    freshness / proof-status / run-status
    aliases).
  - Exported constants:
    `GITHUB_CHECK_PUBLISHER_CANONICAL_TRUTH_REMINDER`,
    `GITHUB_CHECK_PUBLISHER_DEFAULT_NAME`.

  **Safety contract enforced:**
  - **No GitHub API call.** No
    `octokit`, no `node-fetch`, no
    `fetch(`, no `https.request`. A
    contract test scans the
    capability-docs source for those
    tokens and fails the build if any
    are present.
  - **Readiness gate is default-deny.**
    Returns `ready: false` unless every
    gate condition passes:
    `REKON_GITHUB_CHECKS=1` (or
    `true`), non-empty `GITHUB_TOKEN`,
    non-empty `GITHUB_REPOSITORY`,
    head SHA present, trusted event,
    explicit
    `writePermissionConfirmed: true`.
  - **Forked PRs are untrusted by
    default.** `pull_request` events
    with `pullRequestIsFork: true` fail
    the gate; `forkOverride: true` is
    the only escape hatch.
  - **`pull_request_target` is refused
    unconditionally** — even with
    `forkOverride: true`. This matches
    the alpha workflow validator.
  - **Payload always cites the
    canonical artifacts** it
    summarised: `VerificationResult`,
    `VerificationRun`, proof report,
    architecture summary, agent
    contract.
  - **Payload always contains the
    canonical-truth reminder:**
    `GitHub status is not canonical
    truth; Rekon artifacts remain
    canonical.`

  **Conclusion mapping** (precedence
  high-to-low):
  - `artifactsValid === false` →
    `failure`.
  - Run killed → `failure`.
  - Run timeout → `timed_out`.
  - Result failed → `failure`.
  - Result partial → `action_required`.
  - Result missing → `action_required`.
  - Freshness stale / missing-plan →
    `action_required`.
  - Result not-run → `neutral`.
  - Result passed + fresh → `success`.

  **Tests:** new contract suite
  `tests/contract/github-check-publisher-skeleton.test.mjs`
  (25 tests covering every conclusion
  mapping case, summary content,
  readiness gates, and the
  no-network-client invariant). New
  docs suite
  `tests/docs/verification-runner-github-check-publisher-decision.test.mjs`
  (13 assertions covering memo
  headings, gate language, env var
  names, conclusion mapping mention,
  CHANGELOG mention, review-packet
  PURPOSE PRESERVATION CHECK). Full
  suite expected ≥ 1256 passed / 1
  skipped.

  **Docs:** 11 updated
  (decision memo; CI / GitHub
  adapter decision memo — step 6 flipped
  to ✅ Shipped with the split-shipment
  plan;
  [`docs/examples/github-actions-verification-runner.md`](../examples/github-actions-verification-runner.md)
  — "Does not create GitHub Checks"
  expanded to reference the
  decision memo + skeleton;
  [`docs/concepts/verification-runs.md`](../concepts/verification-runs.md),
  [`docs/concepts/verification-results.md`](../concepts/verification-results.md),
  [`docs/concepts/proof-report-publication.md`](../concepts/proof-report-publication.md),
  [`docs/artifacts/proof-report-publication.md`](../artifacts/proof-report-publication.md),
  this file, `roadmap.md`,
  `issue-governance-architecture-decision.md`
  — step 46 flipped to ✅ Shipped.
  `README.md` and `CHANGELOG.md`
  updated. New review packet
  `.rekon-dev/review-packets/verification-runner-github-check-publisher-decision.md`.

  **Recommended next slice:**
  **verification runner GitHub Check
  publisher dry-run CLI** (step 6b).
  **Shipped next; see the entry
  below.**
- **Verification runner GitHub Check
  publisher dry-run CLI (P1.1
  github-check-publisher-dry-run-cli
  slice).** ✅ Shipped. **Step 6b** of
  the CI / GitHub adapter implementation
  sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  CLI + tests + docs batch. No
  GitHub API calls. No active workflow
  in `.github/workflows`. No new GitHub
  write permissions in any bundled
  template. No artifact-shape change.
  No new capability package.

  **Shipped CLI command:**
  - `rekon publish github-check
    --dry-run [--root <path>] [--json]`.
    The CLI is registered alongside the
    existing `publish architecture` /
    `publish proof` /
    `publish agent-contract` commands
    in `packages/cli/src/index.ts`.
    Reads the latest local
    `VerificationResult`,
    `VerificationRun`, and
    `VerificationPlan` from the
    artifact store; reads the latest
    `Publication` of each kind
    (`proof-report`,
    `architecture-summary`,
    `agent-contract`) by walking
    entries newest-first and matching
    `body.kind`. Runs `artifacts
    validate` (read-only) so the
    payload reflects current local
    index state.

  **Safety contract:**
  - `--dry-run` is **required.** The CLI
    refuses to run without it (exit 1).
    The actual GitHub API write lives
    in step 6c.
  - **No GitHub API call.** The CLI
    imports no HTTP client and no
    GitHub SDK. A contract test scans
    the CLI source for forbidden imports
    (`@octokit/*`, `@actions/github`,
    `octokit`, `node-fetch`, `axios`,
    `undici`, `got`) and call-sites
    (`fetch(`, `https.request`,
    `http.request`, `new Request(`) and
    fails the build if any are
    present.
  - **No token reads.** The CLI does
    not read `GITHUB_TOKEN` /
    `GH_TOKEN` from `process.env`.
    The readiness assessor receives
    an explicitly empty env map, so
    readiness `ready: false` is the
    expected default until operators
    pass an explicit env in the
    step-6c CLI.
  - **The CLI delegates conclusion
    mapping** to
    `buildGitHubCheckPayload` — no
    duplicate precedence ladder in
    the CLI. A contract test scans
    the CLI source for
    `pickConclusion` and counts the
    GitHub Check conclusion string
    literals (`"success"`,
    `"failure"`, `"neutral"`,
    `"timed_out"`,
    `"action_required"`); finding
    four or more would imply a
    duplicate mapping and fails the
    test.
  - **Readiness `ready: false` is
    exit 0.** The render path
    succeeding does not imply a
    publish-ready environment; the
    payload + issue list lets
    operators see which gates remain.
  - **Missing / malformed local
    artifacts is exit 1.** The CLI
    surfaces an explicit error
    message including the artifact
    id when read fails.

  **Output JSON shape:**

  ```json
  {
    "kind": "rekon.github-check.dry-run",
    "dryRun": true,
    "payload": { /* GitHubCheckPayload */ },
    "readiness": { /* GitHubCheckPublisherReadiness */ },
    "canonicalTruthReminder": "GitHub status is not canonical truth; Rekon artifacts remain canonical."
  }
  ```

  **Tests:** new contract suite
  `tests/contract/github-check-publisher-dry-run-cli.test.mjs`
  (9 tests covering `--dry-run`
  requirement, JSON shape,
  readiness-false-is-exit-0, payload
  cites publications produced by
  `refresh` + explicit publish, CLI
  delegates conclusion mapping, no
  token reads, no network-client
  imports, read-only / index
  unchanged, usage line registered).
  Full suite expected ≥ 1265 passed
  / 1 skipped.

  **Docs:** 8 updated (decision memo —
  step 5 / 6b flipped to ✅; CI / GitHub
  adapter memo — step 6b flipped to ✅;
  operator guide — Check publisher
  paragraph extended with the new CLI;
  this file, `roadmap.md`,
  `issue-governance-architecture-decision.md`
  — step 47 flipped to ✅).
  `README.md` and `CHANGELOG.md`
  updated. New review packet
  `.rekon-dev/review-packets/github-check-publisher-dry-run-cli.md`.

  **Recommended next slice:**
  **verification runner GitHub Check
  publisher API write** (step 6c).
  **Shipped next; see the entry
  below.**
- **Verification runner GitHub Check
  publisher send mode (P1.1
  github-check-publisher-send slice).**
  ✅ Shipped. **Step 6c** of the CI /
  GitHub adapter implementation
  sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md)
  and the API implementation pin in
  [`docs/strategy/verification-runner-github-check-publisher-decision.md`](verification-runner-github-check-publisher-decision.md).
  CLI + helper + tests + docs batch.
  **First GitHub-write surface in
  Rekon.** Default-deny gated. No
  active workflow in the Rekon repo.
  No GitHub write permissions added
  to any bundled template. No
  artifact-shape change.

  **New helper in
  `@rekon/capability-docs`:**
  - `publishGitHubCheckRun(input)` —
    POSTs to
    `/repos/{owner}/{repo}/check-runs`
    via Node's built-in `fetch`. Sets
    `Authorization: Bearer <token>`,
    `Accept: application/vnd.github+json`,
    `X-GitHub-Api-Version`,
    `User-Agent`, and
    `Connection: close` so CLI exits
    promptly. Maps camelCase payload
    to snake_case body. Returns
    `{ id, url, htmlUrl, status,
    conclusion }`. Throws
    `GitHubCheckPublishError` on
    non-2xx — **never** echoes the
    token.

  **New CLI mode:** `rekon publish
  github-check --send [--root <path>]
  [--confirm-checks-write]
  [--api-base-url <url>] [--json]`.
  Mutually exclusive with `--dry-run`;
  passing both is exit 1, passing
  neither is exit 1. The **only** CLI
  branch that reads
  `process.env.GITHUB_TOKEN`. Refuses
  unless `assessGitHubCheckPublisherReadiness`
  returns `ready: true`. Forked PRs
  denied by default
  (`REKON_GITHUB_CHECKS_PR_IS_FORK=0`
  required to declare same-repo);
  `pull_request_target` denied
  unconditionally. Write-permission
  confirmation required via
  `--confirm-checks-write` flag or
  `REKON_GITHUB_CHECKS_WRITE_CONFIRMED=1`
  env var. Exit 0 on API success
  even when the Check conclusion is
  `failure` / `timed_out` /
  `action_required`; exit 1 on
  readiness failure or API error
  with sanitized message
  (`{ status, message,
  documentationUrl? }` — token
  never appears).

  **Updated dry-run safety contract:**
  the previous step-6b source-scan
  for `GITHUB_TOKEN` reads + network-
  client imports is replaced with
  behavioural tests proving the
  dry-run branch reads no token and
  makes no network call.

  **Tests:** new contract suite
  `tests/contract/github-check-publisher-send-cli.test.mjs`
  (19 tests). Uses a local
  `node:http` fake server +
  `--api-base-url` to redirect the
  CLI's request without contacting
  real GitHub. Tests use async
  `spawn` (not `spawnSync`) so the
  fake server's event loop keeps
  ticking while the CLI runs. New
  docs suite
  `tests/docs/github-check-publisher-send.test.mjs`
  (10 assertions). Full suite
  expected ≥ 1294 passed / 1
  skipped.

  **Docs:** 9 updated (decision memo
  — step 6c flipped to ✅ + new "API
  Implementation Pin" section; CI /
  GitHub adapter memo — step 6c
  flipped to ✅; operator guide —
  Check publisher paragraph extended
  with an optional commented opt-in
  block; this file, `roadmap.md`,
  `issue-governance-architecture-decision.md`
  — step 48 flipped to ✅).
  `README.md` and `CHANGELOG.md`
  updated. New review packet
  `.rekon-dev/review-packets/github-check-publisher-send.md`.

  **Recommended next slice:**
  **verification runner GitHub
  Check publisher opt-in workflow
  template**. **Shipped next; see
  the entry below.**
- **Verification runner GitHub Check
  publisher opt-in workflow template
  (P1.1
  github-check-publisher-opt-in-workflow-template
  slice).** ✅ Shipped. **Step 6d** of
  the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md)
  and the
  [GitHub Check publisher decision memo](verification-runner-github-check-publisher-decision.md).
  Workflow template + validator profile
  + tests + docs batch. No active
  workflow added to the Rekon repo. No
  change to the
  `publishGitHubCheckRun` helper or the
  `rekon publish github-check
  --dry-run|--send` CLI behaviour.

  **New workflow template:**
  - [`docs/examples/workflows/rekon-verification-check-send.yml`](../examples/workflows/rekon-verification-check-send.yml)
    — first Rekon workflow template
    that requests `checks: write`.
    Triggers on `workflow_dispatch` +
    `push` to `main` only (no
    `pull_request` by default; no
    `pull_request_target` ever).
    Permissions: `contents: read` +
    `checks: write` only. Sets
    `REKON_GITHUB_CHECKS: "1"` and
    `REKON_GITHUB_CHECKS_WRITE_CONFIRMED:
    "1"` at the workflow level. Runs
    the full execute proof loop, a
    `publish github-check --dry-run`
    preview, then `publish github-check
    --send --confirm-checks-write`.
    Uploads `.rekon/artifacts/**`
    excluding `.log` with
    `retention-days: 7`. Job summary
    includes `Mode: check-send`, every
    refresh-loop ref, the GitHub Check
    send outcome, and the
    canonical-truth reminder.

  **Validator profile support:**
  - New flag `rekon verify
    github-workflow validate --path
    <workflow.yml> --profile read-only
    | github-check-send [--root <path>]
    [--json]`. Default profile is
    `read-only` (backward compatible).
  - `read-only` profile preserves the
    existing contract: any GitHub write
    scope (including `checks: write`)
    is rejected. The bundled read-only
    templates still validate clean.
  - `github-check-send` profile permits
    `checks: write`, requires
    `permissions: contents: read +
    checks: write`,
    `REKON_GITHUB_CHECKS: "1"`,
    `REKON_GITHUB_CHECKS_WRITE_CONFIRMED:
    "1"`, a `publish github-check
    --dry-run` step, a
    `publish github-check --send` step,
    and the `--confirm-checks-write`
    flag. Rejects every other write
    scope, `pull_request_target`, and
    the `pull_request` trigger (forks
    would inherit the workflow's
    `checks: write` + opt-in env).
  - New issue codes (additive):
    `missing-checks-write`,
    `missing-rekon-github-checks-opt-in`,
    `missing-write-confirmation`,
    `missing-publish-github-check-dry-run`,
    `missing-publish-github-check-send`,
    `missing-confirm-checks-write-flag`,
    `pull-request-trigger-disallowed`.
  - New `mode` value: `check-send`.

  **Tests:** new validator helper +
  CLI tests (16 helper + 3 CLI = 19
  added; suite now 42 total). New docs
  suite
  `tests/docs/github-check-publisher-opt-in-workflow-template.test.mjs`
  (21 assertions covering template
  location, permissions, env, steps,
  artifact upload, job summary,
  canonical-truth reminder,
  operator-guide language, CHANGELOG,
  review packet). Full suite expected
  ≥ 1330 passed / 1 skipped.

  **Operator guide:** new "Optional:
  publish a GitHub Check" section
  instructs operators to adopt one of
  the read-only templates first, then
  copy the opt-in template and run the
  validator with
  `--profile github-check-send`.

  **Recommended next slice:**
  **GitHub Check publisher send
  workflow safety review**.
  **Shipped next; see the entry
  below.**
- **GitHub Check publisher send
  workflow safety review (P1.1
  github-check-publisher-send-workflow-safety-review
  slice).** ✅ Shipped. **Step 6e** of
  the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  Strategy / docs / tests-only batch.
  **No runtime behaviour change.** New
  strategy memo at
  [`docs/strategy/github-check-publisher-send-workflow-safety-review.md`](github-check-publisher-send-workflow-safety-review.md)
  reviews the full GitHub Check
  publishing path (payload helper,
  readiness helper, dry-run CLI, send
  CLI, read-only + opt-in workflow
  templates, validator profiles, token
  / permission behaviour, fork / event
  safety, canonical-artifact boundary,
  test coverage, remaining risks).
  Contains the workflow-surface
  diagnostic table + the
  risk diagnostic table required by
  the work order.

  **Decision: beta-ready as an opt-in
  surface.** Read-only templates
  remain the recommended alpha
  default. PR comments remain
  deferred until the PR Comment
  Publisher Decision Memo (next
  slice) decides whether they add
  review-time value worth their
  broader scope.

  **Reinforced invariants:**
  - GitHub status is not canonical
    truth; Rekon artifacts remain
    canonical.
  - Forked PRs and
    `pull_request_target` remain
    blocked by default (three-layer
    defence: template trigger list,
    validator profile, runtime
    readiness assessor).
  - No automatic finding resolution
    or reconciliation apply is
    implied by a successful GitHub
    Check.
  - Tokens never echo into stdout /
    stderr; the helper's sanitizer
    shape is `{ status, message,
    documentationUrl }` only.
  - The Rekon artifact index is
    byte-identical before / after a
    `--send` run.

  **Tests:** new docs suite
  `tests/docs/github-check-publisher-send-workflow-safety-review.test.mjs`
  (16 assertions covering memo
  existence, required headings,
  beta-ready language, read-only
  alpha default, canonical-truth
  language, fork / pull_request_target
  blocked, PR comments deferred,
  dry-run / send / validator /
  opt-in template references,
  no-auto-resolution language,
  CHANGELOG mention, review-packet
  PURPOSE PRESERVATION CHECK).
  Full suite expected ≥ 1347 passed
  / 1 skipped.

  **Docs:** 11 updated (new memo;
  CI / GitHub adapter decision memo
  step 6 amended; GitHub Check
  publisher decision memo step 7
  added; operator guide + concept /
  artifact docs Cross-References
  lists; this file, `roadmap.md`,
  `issue-governance-architecture-decision.md`
  — step 50 flipped to ✅).
  `README.md` and `CHANGELOG.md`
  updated. New review packet
  `.rekon-dev/review-packets/github-check-publisher-send-workflow-safety-review.md`.

  **Recommended next slice:**
  **PR Comment Publisher Decision
  Memo**. **Shipped next; see the
  entry below.**
- **PR Comment Publisher Decision
  Memo (P1.1
  pr-comment-publisher-decision
  slice).** ✅ Shipped. **Step 7a**
  of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  Strategy / docs / tests-only
  batch. **No runtime behaviour
  change.** No new package, no new
  CLI command, no new helper, no
  workflow-template modification,
  no GitHub API call.

  **New strategy memo** at
  [`docs/strategy/pr-comment-publisher-decision.md`](pr-comment-publisher-decision.md)
  decides whether Rekon adds a PR
  comment surface after the GitHub
  Check publisher path. **Decision:
  Option B — design a PR comment
  dry-run renderer; defer actual PR
  comment posting.** Reviews all
  four options (A: no PR comments
  for beta; B: dry-run only; C:
  opt-in idempotent publisher; D:
  hosted / GitHub App). Pins the
  GitHub permission context
  (creating / updating PR timeline
  comments requires `issues: write`
  or `pull-requests: write`; forked
  PRs do not receive write tokens
  by default), the comment content
  model (artifact refs + status +
  `artifacts validate` outcome +
  stale warnings + canonical-truth
  phrase + link to uploaded
  artifacts; no raw logs / secrets
  / full stdout/stderr), the
  idempotency strategy
  (update-in-place via the
  `<!-- rekon:pr-comment:v1 -->`
  marker; the marker is not proof),
  and the implementation sequence
  (decision → dry-run renderer +
  CLI → validator / docs → API
  write).

  **Reinforced invariants:**
  - GitHub status and GitHub
    comments are not canonical
    truth; Rekon artifacts remain
    canonical.
  - Forked PRs and
    `pull_request_target` remain
    blocked by default.
  - No automatic finding
    resolution or reconciliation
    apply is implied by a
    successful GitHub Check or PR
    comment.
  - PR comments are not required
    for beta if GitHub Checks +
    Rekon artifacts are sufficient
    for review (the safety review
    already pinned that they are).

  **Tests:** new docs suite at
  `tests/docs/pr-comment-publisher-decision.test.mjs`
  (18 assertions covering memo
  existence, required headings,
  Option B recommendation, defer-
  posting language, beta-not-
  required language, permission
  context, fork-default-deny,
  opt-in / same-repo-only /
  update-in-place language,
  marker present + marker-is-not-
  proof, canonical-truth language,
  no raw logs / secrets / full
  stdout/stderr, implementation
  sequence, CHANGELOG mention,
  review-packet PURPOSE
  PRESERVATION CHECK). Full suite
  expected ≥ 1365 passed / 1
  skipped.

  **Docs:** 11 updated (new memo;
  CI / GitHub adapter decision memo
  step 7 amended; GitHub Check
  publisher decision memo step 9
  added; GitHub Check publisher
  safety review Follow-Up Work
  updated; operator guide + four
  concept / artifact docs
  Cross-References; this file,
  `roadmap.md`,
  `issue-governance-architecture-decision.md`
  — step 51 added). `README.md`
  and `CHANGELOG.md` updated. New
  review packet
  `.rekon-dev/review-packets/pr-comment-publisher-decision.md`.

  **Recommended next slice** (if
  Option B is approved): **PR
  comment body dry-run helper.**
  **Shipped next; see the entry
  below.** If Option B were not
  approved, default to Option A:
  keep the GitHub Check Run +
  artifact upload combination as
  the beta surface.
- **PR comment body dry-run helper
  + CLI (P1.1
  pr-comment-dry-run-cli slice).**
  ✅ Shipped. **Step 7b** of the CI /
  GitHub adapter implementation
  sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md)
  and the
  [PR comment publisher decision memo](pr-comment-publisher-decision.md).
  Helper + CLI + tests + docs
  batch. **No GitHub API call. No
  token reads. No network-client
  import. No workflow-template
  modification.**

  **New `@rekon/capability-docs`
  exports:**
  - `buildPrCommentBody(input)` —
    pure helper that renders the
    Rekon-owned PR comment markdown
    body from artifact-like inputs.
    Always emits the idempotency
    marker
    `<!-- rekon:pr-comment:v1 -->`
    at the top + the canonical-
    truth reminder
    (`GitHub comments are not
    canonical truth; Rekon
    artifacts remain canonical.`)
    + a citation table for every
    supplied ref + optional
    Warnings + Next-steps blocks
    based on the proof state.
  - `assessPrCommentPublisherReadiness(input)`
    — pure helper that returns
    `{ ready, issues[] }` after
    evaluating `REKON_PR_COMMENTS`,
    `GITHUB_REPOSITORY`, a
    PR-number gate
    (`GITHUB_PR_NUMBER` /
    `PR_NUMBER`), `GITHUB_TOKEN`,
    event-trust classification
    (`workflow_dispatch` / `push` /
    same-repo `pull_request`
    trusted; forked `pull_request`
    untrusted by default;
    `pull_request_target` refused
    unconditionally), and explicit
    `writePermissionConfirmed`.
  - `PR_COMMENT_PUBLISHER_MARKER`
    + `PR_COMMENT_PUBLISHER_CANONICAL_TRUTH_REMINDER`
    constants + 10 type aliases.

  **New CLI command:** `rekon
  publish pr-comment --dry-run
  [--root <path>] [--json]`.
  Registered alongside the
  existing `publish github-check`
  dispatch. **`--dry-run` is
  required.** `--send` / `--publish`
  / `--execute` are refused with
  exit 1. Reads the latest local
  `VerificationResult` /
  `VerificationRun` /
  `VerificationPlan` and the latest
  `Publication` of each kind
  (`proof-report`,
  `architecture-summary`,
  `agent-contract`); runs
  `artifacts validate` read-only;
  calls the shared helpers; prints
  `{ kind: "rekon.pr-comment.dry-run",
  dryRun: true, wouldPublish: false,
  readiness, comment, citedRefs,
  canonicalTruthReminder }` as
  JSON. **Reads no
  `GITHUB_TOKEN`** in dry-run mode
  (the readiness assessor
  receives an explicitly empty env
  map; a behavioural test asserts
  a sentinel token never appears
  in stdout / stderr). **Calls no
  GitHub API.** A source-scan
  test on the pr-comment branch
  asserts no `fetch(`, no
  `https.request(`, no
  `publishGitHubCheckRun(` call.

  **Comment body model:**
  - Marker at line 1.
  - `## Rekon Verification Summary`
    heading + field/value table
    (VerificationResult,
    Status, Source, Freshness,
    VerificationPlan,
    VerificationRun, Proof report,
    Architecture summary, Agent
    contract, Artifacts valid).
  - Canonical-truth reminder as
    blockquote.
  - Optional Warnings block for
    failed / partial / not-run /
    missing / stale / `artifactsValid:
    false` cases.
  - Next-steps block tailored to
    the detected proof state.
  - **Excludes** raw stdout /
    stderr, full artifact bodies,
    secrets, tokens, arbitrary
    user-supplied fields like
    `evidenceNotes` / `notes` /
    `recordedBy`. Contract tests
    pin all exclusions with
    sentinel values.

  **Tests:** new contract suite
  `tests/contract/pr-comment-dry-run-cli.test.mjs`
  (18 tests covering helper
  invariants — marker, canonical
  truth, ref citations, validate
  surface, stale warning, no
  stdout/stderr leak, no token-
  looking inputs leak; readiness
  rules — `not-enabled`,
  `pull_request_target` denied,
  forked `pull_request` denied;
  CLI shape — JSON shape, source-
  scan on the pr-comment branch,
  no `GITHUB_TOKEN` leak,
  required `--dry-run`, refused
  `--send` / `--publish` /
  `--execute`, index unchanged,
  `artifacts validate` clean,
  usage line registered). New
  docs suite
  `tests/docs/pr-comment-dry-run-cli.test.mjs`
  (9 assertions). Full suite
  expected ≥ 1392 passed / 1
  skipped.

  **Docs:** 10 updated (PR comment
  publisher decision memo step 2
  flipped to ✅; CI / GitHub adapter
  decision memo step 7b flipped to
  ✅; operator guide gains an
  "Optional: preview a PR comment
  (dry-run only)" section; concept
  / artifact docs Cross-References;
  this file, `roadmap.md`,
  `issue-governance-architecture-decision.md`
  — step 52 added). `README.md`
  and `CHANGELOG.md` updated. New
  review packet
  `.rekon-dev/review-packets/pr-comment-dry-run-cli.md`.

  **Recommended next slice:**
  **PR comment publisher API
  implementation decision gate**.
  **Shipped next; see the entry
  below.**
- **PR Comment Publisher API
  Decision Gate (P1.1
  pr-comment-publisher-api-decision-gate
  slice).** ✅ Shipped. **Step 7c**
  of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md)
  and the
  [PR comment publisher decision memo](pr-comment-publisher-decision.md).
  Strategy / docs / tests-only batch.
  **No runtime behaviour change.** No
  new package, no new CLI command, no
  new helper, no workflow-template
  modification, no validator profile
  change, no GitHub API call.

  **New strategy memo** at
  [`docs/strategy/pr-comment-publisher-api-decision-gate.md`](pr-comment-publisher-api-decision-gate.md)
  reviews the shipped PR comment
  dry-run components (`buildPrCommentBody`,
  `assessPrCommentPublisherReadiness`,
  `rekon publish pr-comment --dry-run`),
  the GitHub permission boundary
  (`issues: write` / `pull-requests:
  write` required; broader than
  `checks: write`), the fork-default-
  deny posture, the comment-body
  model, the idempotency + noise
  strategy, and four implementation
  options.

  **Decision: Option C — add a
  workflow / validator profile gate
  first; do not implement the API
  writer in the next slice.** The
  next slice (step 7d) ships the
  `github-pr-comment-send` validator
  profile and an opt-in workflow
  template under
  `docs/examples/workflows/`; step
  7e (the actual `--send` mode) is
  deferred until the boundary is
  pinned.

  **Required statements pinned:**
  - Actual PR comment posting
    remains deferred until a PR
    comment workflow / validator
    profile exists.
  - PR comments are not canonical
    truth; Rekon artifacts remain
    canonical.
  - The idempotency marker is not
    proof; it is only an update-in-
    place handle.
  - Forked PRs must not receive
    secret-bearing comment publishing
    by default.

  **Diagnostic tables:** the memo
  contains a component table
  (`buildPrCommentBody` / readiness /
  dry-run CLI / marker shipped; API
  writer + workflow/validator profile
  not shipped) and a risk table
  (comment spam / stale comment / fork
  token misuse / comment-treated-as-
  proof — each with a current
  guardrail and a remaining
  follow-up).

  **Tests:** new docs suite
  `tests/docs/pr-comment-publisher-api-decision-gate.test.mjs`
  (18 assertions covering memo
  existence; all 13 required
  headings; Option C recommendation;
  deferred posting; profile-before-
  API-writer language; canonical-
  truth; artifacts-canonical; marker-
  not-proof; helper references
  (`buildPrCommentBody`,
  `assessPrCommentPublisherReadiness`);
  CLI reference (`publish pr-comment
  --dry-run`); permission scopes
  (`issues: write`, `pull-requests:
  write`); fork-default-deny; both
  diagnostic tables; CHANGELOG
  mention; review-packet PURPOSE
  PRESERVATION CHECK). Full suite
  expected ≥ 1410 passed / 1
  skipped.

  **Docs:** 11 updated (new memo;
  PR comment publisher decision memo
  Implementation Sequence steps 3-5
  updated; CI / GitHub adapter
  decision memo step 7c flipped to
  ✅; GitHub Check publisher decision
  memo step 9 cross-reference;
  GitHub Check publisher safety
  review Follow-Up Work updated;
  operator guide + four concept /
  artifact docs Cross-References;
  this file, `roadmap.md`,
  `issue-governance-architecture-decision.md`
  — step 53 added). `README.md` and
  `CHANGELOG.md` updated. New review
  packet
  `.rekon-dev/review-packets/pr-comment-publisher-api-decision-gate.md`.

  **Recommended next slice (if Option
  C approved):** **PR comment
  workflow / validator profile**
  (step 7d). **Shipped next; see the
  entry below.**
- **PR comment workflow / validator
  profile (P1.1
  pr-comment-workflow-validator-profile
  slice).** ✅ Shipped. **Step 7d** of
  the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md)
  and the
  [PR Comment Publisher API Decision Gate](pr-comment-publisher-api-decision-gate.md).
  Workflow template + validator
  profile + tests + docs batch. **No
  PR comment posted. No GitHub API
  call. No token read.** No active
  workflow added to the Rekon repo.

  **New workflow template** at
  [`docs/examples/workflows/rekon-pr-comment-send.yml`](../examples/workflows/rekon-pr-comment-send.yml).
  `workflow_dispatch` trigger only;
  `permissions: contents: read +
  pull-requests: write` only;
  workflow-level env declares
  `REKON_PR_COMMENTS: "1"` and
  `REKON_PR_COMMENTS_WRITE_CONFIRMED:
  "1"`; runs the full execute proof
  loop + `publish pr-comment
  --dry-run` (no `--send`); uploads
  `.rekon/artifacts/**` excluding
  `.log`; job summary carries `Mode:
  pr-comment-dry-run`, every
  refresh-loop ref, the canonical-
  truth reminder, and the marker-
  not-proof reminder.

  **New validator profile**
  `github-pr-comment-send` extends
  `rekon verify github-workflow
  validate --profile`. The new
  profile:
  - permits `pull-requests: write`
    only (and the baseline
    `contents: read`);
  - rejects every other write
    scope including `checks: write`,
    `contents: write`,
    `id-token: write`,
    `actions: write`,
    `deployments: write`,
    `statuses: write`,
    `packages: write`;
  - rejects `pull_request_target`
    + the `pull_request` trigger;
  - requires the Rekon opt-in env
    (`REKON_PR_COMMENTS=1` +
    `REKON_PR_COMMENTS_WRITE_CONFIRMED=1`);
  - requires the `publish pr-comment
    --dry-run` step;
  - refuses `publish pr-comment
    --send` (the API writer is not
    yet implemented).

  **New issue codes** (additive):
  `missing-pull-requests-write`,
  `missing-rekon-pr-comments-opt-in`,
  `missing-pr-comments-write-confirmation`,
  `missing-publish-pr-comment-dry-run`,
  `forbidden-publish-pr-comment-send`,
  `missing-pr-comment-marker-reminder`.
  Reuses the existing
  `pull-request-trigger-disallowed`
  code (now applied to both the
  `github-check-send` and the
  `github-pr-comment-send` profiles).

  **New `mode` value:**
  `pr-comment-dry-run`.

  **Tests:** 14 new validator helper
  tests + 1 CLI test (now 56 total)
  + 22 new docs assertions in
  `tests/docs/pr-comment-workflow-validator-profile.test.mjs`.
  Full suite expected ≥ 1448 passed
  / 1 skipped.

  **Operator-guide update:** new
  "Optional: preview a PR comment
  workflow" section points at the
  new template + the validator
  command + reiterates the
  canonical-truth + marker-not-proof
  reminders.

  **Recommended next slice:** **PR
  comment API writer go/no-go
  review** (step 7e gate) — review
  the dry-run body / readiness
  helpers (7b), the workflow /
  validator profile (this slice),
  the permission model
  (`pull-requests: write`
  pinned), the idempotency marker
  (documented as not-proof), and
  the three-layer fork-safety
  defence, then decide whether to
  ship `rekon publish pr-comment
  --send` or stop at dry-run for
  beta.

  No active workflow. No PR comment
  posted. No GitHub API call. No
  artifact-shape change. No
  `schemaVersion` bump. No
  `FindingStatusLedger` /
  `FindingLifecycleReport` /
  `CoherencyDelta` /
  `ReconciliationPlan` mutation. No
  version bump. No npm publish.
- **Capability ontology translation
  layer decision (P1.1
  capability-ontology-translation-layer-decision
  slice).** ✅ Shipped. **Second slice
  on the capability-ontology track.**
  Pins **Option C — layered
  config-first ontology +
  artifact-backed normalization
  report**, defining the eight-layer
  internal model (Layer 0
  `EvidenceGraph` → Layer 7
  `RefactorPreservationContract`)
  that refines the architecture
  impact review's macro five-layer
  boundary. Selects
  `@rekon/capability-ontology` as the
  owning package (new) and
  `.rekon/capability-ontology.json`
  as the v1 config source.
  `CapabilityNormalizationReport`
  becomes the first registered
  artifact; `CapabilityMap`
  integration is deferred to v2.
  Pinned verbatim: do not flatten
  the ontology into a single
  config / report layer;
  EvidenceGraph raw facts are
  unchanged; LLM suggestions are
  not truth in v1; unknown verbs /
  nouns must surface to operators.
  See
  [`docs/strategy/capability-ontology-translation-layer-decision.md`](capability-ontology-translation-layer-decision.md).
  **Recommended next slice:**
  `CapabilityNormalizationReport` v1.
- **CapabilityNormalizationReport v1
  (P1.1 capability-normalization-report-v1
  slice).** ✅ Shipped. **First runtime
  implementation slice on the
  capability-ontology track.** Ships
  `@rekon/capability-ontology` (new
  package, `projector` role,
  read-only) + registers
  `CapabilityNormalizationReport` in
  the SDK + runtime
  (`projections` category). The
  package compiles an in-memory
  `EffectiveCapabilityOntology` from
  the built-in baseline + optional
  `.rekon/capability-ontology.json`,
  extracts candidates from
  `EvidenceGraph` symbol / export /
  capability-hint / ownership-hint
  facts, deterministically splits
  names (camelCase / snake_case /
  kebab-case), and emits an
  audit-only normalization report.
  New CLI command
  `rekon capability ontology normalize`.
  **No `EvidenceGraph` mutation. No
  `CapabilityMap` mutation. No
  finding mutation. No LLM
  normalization. No source-write
  apply. No new permission. No
  workflow YAML. No version bump.
  No npm publish.** See
  [`docs/artifacts/capability-normalization-report.md`](../artifacts/capability-normalization-report.md)
  and
  [`docs/concepts/capability-ontology.md`](../concepts/capability-ontology.md).
  **Recommended next slice:** built-in
  baseline ontology coverage review
  against operator dogfood output
  (step 4 of the translation-layer
  decision implementation sequence) —
  gated on one or more operator runs
  of the normalize CLI.
- **Built-in baseline ontology
  coverage review (P1.1
  builtin-ontology-coverage-review
  slice).** ✅ Shipped. **Fourth
  slice on the capability-ontology
  track. Strategy /
  dogfood-analysis batch.** Ran
  `rekon capability ontology normalize`
  against `examples/simple-js-ts`
  (4 candidates) and an anonymized
  real-world Next.js TypeScript
  target (`target-1`, 9,110
  candidates: 100 normalized,
  5,558 unknown, 2,054
  low-confidence, 226 ignored,
  561 alias-applied). Pins:
  baseline acceptable for
  audit-only v1; baseline not yet
  sufficient for `CapabilityMap`
  v2; unknowns dominated by symbol
  noise + lexical-split
  limitations rather than pure
  vocabulary gap. **Selected next
  slice: Option C — capability
  ontology unknown-term operator
  review surface.** Option A
  (vocabulary expansion) follows,
  gated on Option C. Option B
  (`CapabilityMap` v2) remains
  deferred. **No runtime change.
  No vocabulary change. No splitter
  change. No artifact-shape change.
  No CLI change. No new permission.
  No source-write apply.** See
  [`docs/strategy/builtin-ontology-coverage-review.md`](builtin-ontology-coverage-review.md).
- **Capability ontology unknown-term
  operator review surface (P1.1
  capability-normalization-review-ledger
  slice).** ✅ Shipped. **Fifth slice
  on the capability-ontology track
  and the second runtime
  implementation batch.** Ships
  `CapabilityNormalizationReviewLedger`
  (registered in the SDK + runtime,
  category `actions`) plus three
  new CLI subcommands
  `rekon capability ontology review
  {suggestions,decide,decisions}`.
  Append-only operator decisions
  over unknown / low-confidence
  terms produced by
  `CapabilityNormalizationReport`.
  Four decision values:
  `extend-ontology`,
  `rename-symbol`, `noise-filter`,
  `defer`. **No automatic
  `.rekon/capability-ontology.json`
  mutation. No
  `CapabilityNormalizationReport`
  mutation. No `CapabilityMap`
  mutation. No `EvidenceGraph`
  mutation. No source-write apply.
  No LLM normalization. No new
  permission.** See
  [`docs/artifacts/capability-normalization-review-ledger.md`](../artifacts/capability-normalization-review-ledger.md).
  **Recommended next slice:**
  *capability ontology vocabulary
  expansion v1* — produce a
  `.rekon/capability-ontology.json`
  preview from `extend-ontology`
  ledger entries without applying
  it.
- **Capability ontology vocabulary
  expansion v1 (P1.1
  capability-ontology-suggestions
  slice).** ✅ Shipped. **Sixth
  slice on the capability-ontology
  track and the third runtime
  implementation batch.** Ships
  `CapabilityOntologySuggestionReport`
  (registered in the SDK + runtime,
  category `actions`) plus the new
  CLI command
  `rekon capability ontology
  suggestions`. The report is
  preview-only: it transforms
  `extend-ontology` decisions in
  the latest review ledger into a
  proposed
  `.rekon/capability-ontology.json`
  patch rendered as `before` /
  `after` JSON. Four suggestion
  kinds: `add-canonical-verb`,
  `add-canonical-noun`,
  `add-verb-alias`,
  `add-noun-alias`. Candidate-level
  decisions are skipped in v1.
  **No `.rekon/capability-ontology.json`
  mutation. No
  `CapabilityNormalizationReviewLedger`
  mutation. No
  `CapabilityNormalizationReport`
  mutation. No `CapabilityMap`
  mutation. No `EvidenceGraph`
  mutation. No source-write apply.
  No LLM normalization. No new
  permission.** See
  [`docs/artifacts/capability-ontology-suggestion-report.md`](../artifacts/capability-ontology-suggestion-report.md).
  **Recommended next slice:**
  *capability ontology suggestion
  publication surfacing* — surface
  the latest suggestion report
  inside `architecture-summary` /
  `agent-contract` publications.
- **Capability ontology suggestion
  publication surfacing (P1.1
  capability-ontology-suggestion-publications
  slice).** ✅ Shipped. **Seventh
  slice on the capability-ontology
  track and the fourth runtime
  implementation batch.** Wires
  the latest
  `CapabilityOntologySuggestionReport`
  into the architecture summary
  (`## Capability Ontology
  Suggestions`) and agent contract
  (`### Capability Ontology
  Suggestions` + `Do Not Do`
  reminder). Both publishers cite
  the source report in
  `header.inputRefs`. Manifest
  `consumes` and a new
  `capability-ontology-suggestions.changed`
  invalidation rule keep
  publications fresh when a new
  report lands. **Read-only —
  publications never mutate
  `.rekon/capability-ontology.json`,
  the review ledger, the
  suggestion report, or
  `CapabilityMap`.** Proof report
  surfacing is deliberately
  deferred (suggestions are
  vocabulary / config proposals,
  not verification proof). See
  [`docs/artifacts/capability-ontology-suggestion-report.md`](../artifacts/capability-ontology-suggestion-report.md).
  **Recommended next slice:**
  *capability ontology suggestion
  safety review*.
- **Capability ontology suggestion
  safety review (P1.1
  capability-ontology-suggestion-safety-review
  slice).** ✅ Shipped. **Eighth
  slice on the capability-ontology
  track and the safety gate before
  any new mutation path.** Strategy
  / docs / tests-only batch.
  Reviews the full
  `normalize → review ledger →
  suggestion report → publication
  surfacing` loop end-to-end. Pins
  verbatim: suggestion entries are
  preview-only and not applied
  vocabulary; no current path
  mutates
  `.rekon/capability-ontology.json`
  or `CapabilityMap`; proof report
  surfacing remains deferred;
  `CapabilityMap` integration
  remains deferred until reviewed
  terms produce stable
  high-confidence claims.
  **Decision: the workflow is safe
  / stable as a preview-only loop;
  manual editing of
  `.rekon/capability-ontology.json`
  remains the operator-control
  boundary; no config apply
  command in this batch.** See
  [`docs/strategy/capability-ontology-suggestion-safety-review.md`](capability-ontology-suggestion-safety-review.md).
  **Recommended next slice:**
  *capability ontology config
  authoring guide + review-loop
  quickstart* (docs-only).
- **Capability ontology config
  authoring guide + review-loop
  quickstart (P1.1
  capability-ontology-config-authoring-guide
  slice).** ✅ Shipped. **Ninth
  slice on the capability-ontology
  track. Docs / support / tests-only
  batch.** Two new operator-facing
  docs under `docs/beta/`: the
  authoring guide
  ([`capability-ontology-config-authoring-guide.md`](../beta/capability-ontology-config-authoring-guide.md))
  and the seven-step quickstart
  ([`capability-ontology-review-loop-quickstart.md`](../beta/capability-ontology-review-loop-quickstart.md)).
  Documents the full operator path
  (refresh → normalize → review →
  decide → suggest → inspect
  publications → manually edit
  `.rekon/capability-ontology.json`
  → rerun normalize). Both docs
  pin verbatim that the config
  file is optional, that Rekon
  never creates or mutates it
  automatically, that JSON only
  is supported in v1, and that
  suggestions remain preview-only.
  **No runtime change. No CLI
  change. No artifact shape
  change. No
  `.rekon/capability-ontology.json`
  mutation. No `CapabilityMap`
  mutation. No source-write
  apply. No new permission.**
  **Recommended next slice:**
  *manual ontology config
  dogfood* — exercise the guide
  end-to-end on one real repo.
  **Subsequently reframed as a
  fallback / emergency manual
  path by the canon + override
  model decision below.**
- **Capability ontology canon +
  override model decision (P1.1
  capability-ontology-canon-override-model-decision
  slice).** ✅ Shipped. **Tenth
  slice on the capability-ontology
  track and the steady-state
  product posture revision for
  the track.** Strategy /
  decision / docs / tests-only
  batch. Pins verbatim that
  **CapabilityOntology is not
  user-authored from scratch.
  CapabilityOntology is
  Rekon-provided canon +
  repo-local overrides.** Replaces
  the prior "manual config
  authoring guide is the
  steady-state model" direction.
  Selects **Option C — built-in
  canonical ontology packs
  (`base` + archetype overlays)
  + repo-local overrides file**.
  Names v1 ship set: `base`,
  `nextjs-app`, `library-package`,
  `monorepo`. Defines the
  override file rename target
  `.rekon/capability-ontology.overrides.json`
  for the canon-packs-v1
  implementation slice. **Do not
  implement canonical packs yet.
  Do not implement override
  apply yet. Do not mutate
  `.rekon/capability-ontology.json`.
  Do not change normalizer
  behavior. Do not mutate
  `CapabilityMap`. Do not mutate
  `EvidenceGraph`. Do not add
  source writes. Do not add
  LLM-only normalization. Do not
  publish to npm. Do not bump
  versions.** See
  [`docs/strategy/capability-ontology-canon-override-model-decision.md`](capability-ontology-canon-override-model-decision.md).
  **Recommended next slice:**
  capability ontology canon packs
  v1 — ship the four canonical
  packs, register the pack
  loader, rename the loader
  target, and migrate
  `EffectiveCapabilityOntology.source`.
- **Capability ontology canon packs v1
  (P1.1 capability-ontology-canon-packs-v1
  slice).** ✅ Shipped. **Eleventh slice
  on the capability-ontology track and
  the first implementation slice on the
  canon + override model.** Ships four
  built-in canon packs (`base`,
  `nextjs-app`, `library-package`,
  `monorepo`), an override loader that
  prefers
  `.rekon/capability-ontology.overrides.json`
  with legacy
  `.rekon/capability-ontology.json`
  fallback, conservative archetype
  auto-detection (`next` /
  `app|pages` → `nextjs-app`;
  `workspaces` / `pnpm-workspace.yaml`
  / `packages/*` → `monorepo`; library
  exports without app pattern →
  `library-package`), an `extends`
  field for explicit overlay
  selection, and extended
  `EffectiveCapabilityOntology.source`
  carrying `basePack` / `overlayPacks`
  / `overridePath` / `overrideHash` /
  `overrideKind` /
  `legacyOverrideIgnored` /
  `systemSeedCount`. Suggestion
  preview targets the canonical
  overrides path. Override behaviors:
  canonical terms extend canon;
  aliases supersede on key collision;
  noise suppresses suggestion noise
  (not raw evidence). **No
  override-file mutation. No
  `CapabilityMap` mutation. No
  `EvidenceGraph` mutation. No
  source-write apply. No LLM-only
  normalization. No version bump.
  No npm publish.** New 23-assertion
  contract test
  `tests/contract/capability-ontology-canon-packs.test.mjs`.
  New 13-assertion docs test
  `tests/docs/capability-ontology-canon-packs.test.mjs`.
  **Recommended next slice:**
  capability ontology canon-pack
  coverage review.
- **CapabilityPhrase + CapabilityContract
  architecture decision (P1.1
  capability-phrase-contract-architecture-decision
  slice).** ✅ Shipped. **Twelfth
  slice on the capability-ontology
  track and the semantic primitive
  every later layer depends on.**
  Strategy / architecture / docs /
  tests-only batch. Reserves
  `CapabilityPhrase` as the
  intermediate semantic unit
  between
  `CapabilityNormalizationReport`
  and the future `CapabilityMap`
  v2, and reserves
  `CapabilityContract` as the
  future policy / preservation
  layer (distinct from
  `RefactorPreservationContract`,
  which is a phase-specific
  projection). Pins verbatim that
  AST evidence is optional
  enrichment, not foundational
  truth; that repo / language /
  architecture agnostic evidence
  is required; that
  `CapabilityMap` v2 consumes only
  stable, confidence-scored
  `CapabilityPhrase` claims; and
  that source writes remain
  unavailable. Sketches the v1
  `CapabilityPhrase` shape
  (required `verb` + `noun` +
  `confidence` + `evidenceRefs`;
  optional v1 `qualifier` /
  `domain` / `pattern` / `layer`;
  reserved future `sideEffects` /
  `inputs` / `outputs`) plus the
  `CapabilityContract` shape
  (`allowedLayers` /
  `allowedSystems` /
  `forbiddenLayers` /
  `requiredChecks` /
  `requiredNeighbors` /
  `forbiddenNeighbors` /
  `preservationRules`). Defines
  the evidence-source matrix, the
  use-cases unlocked, and the
  layer-boundary table. **No
  runtime change. No new artifact
  registration. No `CapabilityMap`
  mutation. No
  `CapabilityNormalizationReport`
  mutation. No `EvidenceGraph`
  mutation. No source-write apply.
  No AST-first assumption. No
  LLM-only inference. No version
  bump. No npm publish.** New
  18-assertion docs test
  `tests/docs/capability-phrase-contract-architecture-decision.test.mjs`.
  See
  [`docs/strategy/capability-phrase-contract-architecture-decision.md`](capability-phrase-contract-architecture-decision.md).
  **Recommended next slice:**
  CapabilityPhrase v1 artifact /
  report decision — pick Option
  A (enrich
  `CapabilityNormalizationReport`),
  Option B (new
  `CapabilityPhraseReport`), or
  Option C (wait). Preferred:
  **Option B**.
- **CapabilityPhraseReport decision
  (P1.1
  capability-phrase-report-decision
  slice).** ✅ Shipped.
  **Thirteenth slice on the
  capability-ontology track and
  the carrier commitment for
  `CapabilityPhrase` v1.**
  Strategy / decision / docs /
  tests-only batch. Resolves the
  carrier question deferred by
  the previous architecture
  decision. Selects **Option B**:
  emit `CapabilityPhrase` v1 as
  a separate
  `CapabilityPhraseReport`
  artifact, not enrichment of
  `CapabilityNormalizationReport`.
  Rejects Option A (enrich the
  normalization report) and
  Option C (wait / defer). Pins
  verbatim that
  `CapabilityNormalizationReport`
  is a translation audit;
  `CapabilityPhraseReport` is a
  semantic purpose projection;
  `CapabilityMap` v2 should
  consume `CapabilityPhraseReport`
  (not raw normalization rows);
  only high-confidence / stable
  `CapabilityPhrase` claims are
  eligible for `CapabilityMap`
  v2; `CapabilityContract` is the
  future policy / preservation
  layer; AST / typechecker
  evidence is optional
  enrichment, not foundational
  truth; phrase v1 must remain
  repo / language / architecture
  agnostic; source writes remain
  unavailable. **No runtime
  change. No new artifact
  registration. No
  `CapabilityNormalizationReport`
  shape mutation. No
  `CapabilityMap` mutation. No
  `EvidenceGraph` mutation. No
  source writes. No LLM-only
  inference. No version bump.
  No npm publish.** See
  [`docs/strategy/capability-phrase-report-decision.md`](capability-phrase-report-decision.md).
  **Recommended next slice:**
  *CapabilityPhraseReport v1* —
  register the artifact in the
  SDK + runtime, implement
  deterministic projection from
  high-confidence
  `CapabilityNormalizationReport`
  candidates, cite normalization
  + EvidenceGraph in
  `inputRefs`. v1 required
  fields only. No `CapabilityMap`
  mutation. No `CapabilityContract`.
- **CapabilityPhraseReport v1
  (P1.1 capability-phrase-report-v1
  slice).** ✅ Shipped.
  **Fourteenth slice on the
  capability-ontology track and
  the first runtime
  implementation of the Layer 5b
  semantic-purpose-projection
  carrier.** Implements the
  CapabilityPhraseReport
  Decision: registers
  `CapabilityPhraseReport` as a
  new `projections` artifact
  type in the SDK + runtime, adds
  `buildCapabilityPhraseReport`
  + `validateCapabilityPhraseReport`
  to `@rekon/capability-ontology`,
  and ships the
  `rekon capability phrase project
  --report <CapabilityNormalizationReport-id|type:id>`
  CLI command. Projection rules:
  emit a phrase **only when** the
  source candidate is
  `status === "normalized"` +
  `confidence === "high"` +
  high-confidence lexical split.
  Every emitted phrase has
  `status === "stable"` in v1.
  Deterministic ids
  (`phrase-<candidate-id>-<verb>-<noun>`)
  and ordering. Pinned verbatim
  that `CapabilityNormalizationReport`
  remains the translation audit,
  `CapabilityPhraseReport` is
  the semantic purpose
  projection, `CapabilityMap`
  integration remains deferred,
  AST / typechecker evidence is
  optional enrichment, no
  LLM-only inference, and
  source writes remain
  unavailable. **No
  `CapabilityNormalizationReport`
  shape mutation. No
  `CapabilityMap` mutation. No
  `EvidenceGraph` mutation. No
  version bump. No npm
  publish.** New 20-assertion
  contract test
  `tests/contract/capability-phrase-report.test.mjs`.
  New 11-assertion docs test
  `tests/docs/capability-phrase-report.test.mjs`.
  New artifact doc
  [`docs/artifacts/capability-phrase-report.md`](../artifacts/capability-phrase-report.md).
  **Recommended next slice:**
  CapabilityPhraseReport
  publication surfacing.
- **CapabilityPhraseReport
  publication surfacing (P1.1
  capability-phrase-publications
  slice).** ✅ Shipped.
  **Fifteenth slice on the
  capability-ontology track.**
  Surfaces the latest
  `CapabilityPhraseReport` in the
  architecture summary
  (`## Capability Phrases`) and
  agent contract
  (`### Capability Phrases`)
  publishers. **Read-only**:
  neither publisher mutates the
  phrase report, the source
  `CapabilityNormalizationReport`,
  `CapabilityMap`, or
  `EvidenceGraph`. Proof report
  surfacing is deferred —
  `CapabilityPhraseReport` is
  semantic context, not
  verification proof. New export
  from `@rekon/capability-docs`:
  `buildCapabilityPhrasePublicationSection`.
  `@rekon/capability-docs.consumes`
  gains `CapabilityPhraseReport`;
  new manifest invalidation rule
  `capability-phrases.changed`.
  Agent contract gains a new
  `Do Not Do` reminder against
  treating phrases as
  `CapabilityMap` ownership or
  placement policy. Pinned
  verbatim that
  `CapabilityNormalizationReport`
  remains the translation audit,
  `CapabilityPhraseReport` is
  the semantic purpose
  projection, `CapabilityMap`
  integration remains deferred,
  AST evidence is optional
  enrichment, and no LLM-only
  inference. **No new artifact
  registration. No new CLI
  command. No version bump. No
  npm publish.** New 18-assertion
  contract test
  `tests/contract/capability-phrase-publications.test.mjs`.
  New 10-assertion docs test
  `tests/docs/capability-phrase-publications.test.mjs`.
  **Recommended next slice:**
  CapabilityPhraseReport safety
  review.
- **CapabilityPhraseReport safety
  review (P1.1
  capability-phrase-report-safety-review
  slice).** ✅ Shipped. **Sixteenth
  slice on the capability-ontology
  track.** Strategy / docs /
  tests-only batch. End-to-end
  review of the
  `CapabilityNormalizationReport →
  CapabilityPhraseReport →
  architecture summary / agent
  contract publication surfacing`
  path. Verdict:
  **CapabilityPhraseReport is safe
  and stable as the semantic
  purpose projection layer.
  `CapabilityMap` v2 stays
  deferred until one real-repo
  phrase coverage review measures
  stable-phrase quality.** Pinned
  verbatim:
  **`CapabilityPhraseReport` is
  semantic purpose projection, not
  ownership or placement policy.**
  **`CapabilityNormalizationReport`
  remains the translation audit.**
  **`CapabilityMap` integration
  remains deferred until phrase
  coverage is measured on real
  repos.** **Proof report
  surfacing remains deferred
  because phrase projection is
  semantic context, not
  verification proof.** **Only
  stable high-confidence phrases
  are eligible for future
  `CapabilityMap` v2.** **No
  runtime change. No
  `CapabilityMap` mutation. No
  phrase projection rule change.
  No new artifact registration. No
  new CLI command. No source
  writes. No LLM-only inference.
  No npm publish. No version bump.
  No git tag. No GitHub Release.
  No new branch.** New strategy
  memo
  [`docs/strategy/capability-phrase-report-safety-review.md`](capability-phrase-report-safety-review.md)
  with 14 required headings + 3
  required diagnostic tables
  (projection path / option /
  boundary). New 12-assertion docs
  test
  `tests/docs/capability-phrase-report-safety-review.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-phrase-report-safety-review.md`.
  **Recommended next slice:**
  CapabilityPhraseReport real-repo
  coverage review — measure phrase
  count per archetype,
  stable-phrase ratio, evidence-ref
  distribution, and publication
  usefulness on the fixture + at
  least one real cohort target.
- **CapabilityPhraseReport real-repo
  coverage review (P1.1
  capability-phrase-report-coverage-review
  slice).** ✅ Shipped. **Seventeenth
  slice on the capability-ontology
  track.** Strategy / dogfood-
  analysis / docs / tests-only
  batch. Measured phrase output on
  a fixture (`examples/simple-js-ts`)
  and one real, anonymized Next.js
  TypeScript target (`target-1`).
  Fixture: 0 phrases (strict v1
  rules hold). `target-1`: 9,110
  candidates, 241 normalized, **16
  stable phrases (0.18% of
  candidates; 6.6% of normalized)**.
  All 16 phrases carry
  `EvidenceGraph` refs;
  `status="stable"`,
  `confidence="high"`. Phrase
  publications render cleanly with
  deferred-`CapabilityMap` callout.
  Artifacts validate clean on both
  targets. Verdict: **phrase
  quality is high; coverage is
  sparse.** Pinned verbatim:
  **`CapabilityMap` v2 is
  evidence-gated. Stable
  high-confidence phrases were
  measured on a real repo.
  Unknown / low-confidence rows
  remain excluded.** Six readiness
  gates evaluated; five pass; the
  sixth (coverage density) fails
  at 0.18%. **No runtime change.
  No `CapabilityMap` mutation. No
  `CapabilityPhraseReport` shape
  change. No phrase projection
  rule change. No canon-pack
  change. No new artifact
  registration. No new CLI
  command. No source writes. No
  LLM-only inference. No npm
  publish. No version bump. No
  git tag. No GitHub Release. No
  new branch.** New strategy memo
  [`docs/strategy/capability-phrase-report-coverage-review.md`](capability-phrase-report-coverage-review.md)
  with 13 required headings + 5
  required tables. New 12-assertion
  docs test
  `tests/docs/capability-phrase-report-coverage-review.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-phrase-report-coverage-review.md`.
  **Recommended next slice:**
  phrase enrichment v1 —
  deterministic `domain` /
  `pattern` / `layer` enrichment
  from `ObservedRepo` +
  `OwnershipMap`; allows `partial`
  phrases to emit; keeps `stable`
  reserved for the strictest
  (`CapabilityMap` v2-eligible)
  case.
- **CapabilityPhraseReport phrase
  enrichment v1 (P1.1
  capability-phrase-enrichment-v1
  slice).** ✅ Shipped. **Eighteenth
  slice on the capability-ontology
  track.** Product capability
  batch. `buildCapabilityPhraseReport`
  in `@rekon/capability-ontology`
  now consumes optional
  `ObservedRepo` + `OwnershipMap`
  and populates `domain` /
  `pattern` / `layer` enrichment
  fields when deterministic context
  is available. CLI reads latest
  enrichment artifacts
  automatically; missing context
  is not a failure. **The stable
  threshold is unchanged.** New
  `partial` phrases emit only when
  at least one deterministic
  enrichment field is present.
  **Partial phrases are semantic
  context, not `CapabilityMap`-
  ready placement or ownership
  policy.** Coverage on `target-1`
  rose from 16 → 239 phrases (16
  stable + 223 partial; 0 low-
  confidence). Pinned verbatim:
  Phrase enrichment v1 uses
  deterministic artifact context;
  the stable threshold is
  unchanged; partial phrases are
  semantic context, not
  `CapabilityMap`-ready placement
  or ownership policy; `domain` /
  `pattern` / `layer` can be
  enriched deterministically from
  `ObservedRepo` + `OwnershipMap`;
  `sideEffects` / `inputs` /
  `outputs` remain deferred;
  `CapabilityMap` integration
  remains deferred. **No
  CapabilityMap mutation. No
  CapabilityPhraseReport shape
  change. No CapabilityNormalization-
  Report semantics change. No
  EvidenceGraph mutation. No new
  artifact registration. No new
  CLI command. No source reads.
  No AST/typechecker/LLM evidence.
  No source writes. No version
  bump. No npm publish. No git
  tag. No GitHub Release. No new
  branch.** New strategy memo
  [`docs/strategy/capability-phrase-enrichment-v1.md`](capability-phrase-enrichment-v1.md).
  New 22-assertion contract test
  `tests/contract/capability-phrase-enrichment.test.mjs`.
  New 10-assertion docs test
  `tests/docs/capability-phrase-enrichment.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-phrase-enrichment-v1.md`.
  **Recommended next slice:**
  CapabilityPhraseReport enrichment
  coverage review — re-measure
  stable + partial yield, enrichment
  ratios, and publication
  usefulness.
- **CapabilityPhraseReport
  enrichment coverage review (P1.1
  capability-phrase-enrichment-coverage-review
  slice).** ✅ Shipped. **Nineteenth
  slice on the capability-ontology
  track.** Strategy / dogfood-
  analysis / docs / tests-only
  batch. Measured phrase output
  after Phrase Enrichment v1 on
  the fixture + `target-1`.
  Before / after on `target-1`:
  total 16 → 239 (+1394%), stable
  16 → 16 (**unchanged**), partial
  0 → 223. Pinned verbatim: phrase
  enrichment materially improved
  coverage; the stable threshold
  remains unchanged; partial
  phrases alone do not justify
  `CapabilityMap` v2;
  `CapabilityMap` v2 is
  evidence-gated. **No runtime
  change. No `CapabilityMap`
  mutation. No
  `CapabilityPhraseReport` shape
  change. No phrase projection
  rule change. No canon-pack
  change. No new artifact
  registration. No new CLI
  command. No source writes. No
  LLM-only inference. No version
  bump. No npm publish. No git
  tag. No GitHub Release. No new
  branch.** New strategy memo
  [`docs/strategy/capability-phrase-enrichment-coverage-review.md`](capability-phrase-enrichment-coverage-review.md)
  with 14 required headings + 6
  required tables. New
  14-assertion docs test
  `tests/docs/capability-phrase-enrichment-coverage-review.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-phrase-enrichment-coverage-review.md`.
  **Recommended next slice:**
  candidate-quality improvements
  — canon-pack expansion +
  lexical-splitter sharpening to
  raise the upstream normalized
  count (currently 2.6%).
- **Capability ontology
  candidate-quality improvements
  v1 (P1.1
  capability-ontology-candidate-quality-v1
  slice).** ✅ Shipped. **Twentieth
  slice on the capability-ontology
  track.** Product capability
  batch. Two deterministic
  improvements: canon-pack
  confirmation (four nouns +
  three verbs already canonical;
  no duplicates) and
  lexical-splitter sharpening
  (path-shaped → `ignored`,
  single-token known nouns →
  precise low-confidence
  message). Pinned verbatim:
  candidate-quality improvements
  are deterministic; canon-pack
  additions are evidence-backed;
  lexical splitter sharpening
  reduces noise; noun-only
  candidates do not become
  phrases; stable phrase
  threshold remains unchanged;
  `CapabilityMap` integration
  remains deferred. Measured on
  `target-1`: 223 path-shaped
  candidates moved from
  `unknown` → `ignored`; stable
  count unchanged at 16; total
  unchanged at 239. **No
  `CapabilityMap` mutation. No
  `CapabilityPhraseReport` shape
  change. No phrase projection
  rule change. No
  `CapabilityNormalizationReport`
  semantics change. No
  `EvidenceGraph` mutation. No
  new artifact registration. No
  new CLI command. No source
  reads. No AST/typechecker/LLM
  evidence. No source writes. No
  version bump. No npm publish.
  No git tag. No GitHub Release.
  No new branch.** New strategy
  memo
  [`docs/strategy/capability-ontology-candidate-quality-v1.md`](capability-ontology-candidate-quality-v1.md).
  New 16-assertion contract test
  `tests/contract/capability-ontology-candidate-quality.test.mjs`.
  New 9-assertion docs test
  `tests/docs/capability-ontology-candidate-quality.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-ontology-candidate-quality-v1.md`.
  **Recommended next slice:**
  `CapabilityPhraseReport`
  post-quality coverage review.
- **CapabilityPhraseReport
  post-quality coverage review
  (P1.1
  capability-phrase-post-quality-coverage-review
  slice).** ✅ Shipped.
  **Twenty-first slice on the
  capability-ontology track.**
  Third coverage review on the
  phrase track. Measured fixture
  + `target-1` + new `target-2`.
  Three-stage comparison on
  target-1: stable phrases
  unchanged at 16 through all
  three coverage reviews;
  `unknown` 4,088 → 3,865;
  `ignored` 226 → 449; total
  phrases 16 → 239 → 239.
  `target-2`: 408 candidates,
  12 normalized, 2 stable + 10
  partial. Cross-target verdict:
  stable density consistently
  sparse on both real repos
  (0.18% and 0.49%); the
  evidence model is the
  bottleneck. Pinned verbatim:
  candidate-quality improvements
  reduced unknown noise; stable
  phrase count remained
  unchanged; `CapabilityMap` v2
  is evidence-gated; partial
  phrases alone do not justify
  `CapabilityMap` v2. **No
  runtime change. No
  `CapabilityMap` mutation. No
  `CapabilityPhraseReport` shape
  change. No phrase projection
  rule change. No canon-pack
  change. No splitter change. No
  new artifact registration. No
  new CLI command. No source
  writes. No LLM-only inference.
  No npm publish. No version
  bump. No git tag. No GitHub
  Release. No new branch.** New
  strategy memo
  [`docs/strategy/capability-phrase-post-quality-coverage-review.md`](capability-phrase-post-quality-coverage-review.md)
  with 15 required headings + 7
  required tables. New
  15-assertion docs test
  `tests/docs/capability-phrase-post-quality-coverage-review.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-phrase-post-quality-coverage-review.md`.
  **Recommended next slice
  (superseded by the parity audit
  below):** *repo-agnostic purpose
  understanding architecture
  review* was the original framing,
  but the twenty-second slice
  (parity audit) selects the
  **JS/TS AST Evidence Adapter
  Decision** as the next slice.
- **PreparedIntentPlan Approval / Proof Model Decision (P1.1
  prepared-intent-plan-approval-proof-decision slice).** ✅ Shipped.
  Eighty-second slice. Amends the PreparedIntentPlan architecture to require an
  approval/proof envelope before a plan is prepared. **Recommendation: Option
  B.** PreparedIntentPlan.status.value can be prepared only when approval.status
  is approved; a plan with phases but without approval is not prepared. Approval
  cites the IntentAssessmentReport + records readiness / runtime-drift /
  handoff-coverage / freshness / verification / plan-structure proof. Pinned:
  proof-approved, not merely generated; verification requirements are proof
  obligations, not VerificationPlan; no WorkOrder / VerificationPlan creation;
  no execution; no source writes; intent:go deferred. Classic required
  proof/authorization before plan approval (PlanIntakeSufficiency, itoReadiness,
  judge-run, ito.criteria); Rekon preserves that proof-before-plan discipline
  and improves it with the graph spine. The shipped v1 implementation (decc93c)
  must be amended. Next: PreparedIntentPlan v1 implementation, amended with the
  approval/proof envelope.
- **PreparedIntentPlan v1 (P1.1 prepared-intent-plan slice).** ✅ Shipped.
  Eighty-first slice. Registers `PreparedIntentPlan` (category `actions`) +
  `buildPreparedIntentPlan` (`@rekon/capability-model`) + `rekon intent
  prepare` CLI. A read-only phase/gate preparation generated from an
  IntentAssessmentReport plus the Rekon context spine. Prepared status prepared
  / blocked / needs-review / stale-assessment / insufficient-assessment; phases
  investigate / modify / refactor / verify / review. Phase/gate preparation, not
  WorkOrder; no WorkOrder / VerificationPlan creation; no execution; no source
  writes; verification requirements are not VerificationPlan; IntentStatusReport
  next; intent:go deferred. Classic intent:prepare produced PreparedPhaseArtifacts
  but executed nothing; Rekon re-homes preparation into the artifact-first spine
  and adds graph-spine obligations. Next: PreparedIntentPlan safety review.
- **PreparedIntentPlan v1 decision (P1.1
  prepared-intent-plan-v1-decision slice).** ✅ Shipped. Eightieth slice.
  Decides the v1 shape of `PreparedIntentPlan`, the layer after
  `IntentAssessmentReport`. **Recommendation: Option B — artifact-backed
  phase/gate preparation** from IntentAssessmentReport plus existing Rekon
  context. Prepared status prepared / blocked / needs-review / stale-assessment
  / insufficient-assessment; phases investigate / modify / refactor / verify /
  review. Pinned: phase/gate preparation, not WorkOrder; no WorkOrder /
  VerificationPlan creation; no execution; no source writes; verification
  requirements are not VerificationPlan; IntentStatusReport next; intent:go
  deferred. Classic intent:prepare produced PreparedPhaseArtifacts but executed
  nothing; Rekon re-homes preparation into the artifact-first spine and adds
  graph-spine obligations. Next: PreparedIntentPlan v1 implementation.
- **IntentAssessmentReport safety review (P1.1
  intent-assessment-report-safety-review slice).** ✅ Shipped. Seventy-ninth
  slice. Read-only review of `IntentAssessmentReport` v1. **Recommendation:
  safe / stable as read-only readiness assessment (no blocker); proceed to
  PreparedIntentPlan v1 decision.** Pinned: assessment, not WorkOrder; no
  WorkOrder / VerificationPlan / VerificationRun / VerificationResult creation;
  no command execution; no source writes; RuntimeGraphDriftReport is an input
  to readiness, not the intent system itself; PreparedIntentPlan next;
  IntentStatusReport / intent:go deferred. Classic intent readiness was
  gate/staleness-based; Rekon extends parity by wiring graph-spine readiness
  in. Next: PreparedIntentPlan v1 decision.
- **IntentAssessmentReport v1 (P1.1 intent-assessment-report slice).**
  ✅ Shipped. Seventy-eighth slice. Registers `IntentAssessmentReport`
  (category `actions`) + `buildIntentAssessmentReport`
  (`@rekon/capability-model`) + `rekon intent assess` CLI. A read-only
  readiness assessment of a user request against the Rekon context spine
  (CapabilityMap / StepCapabilityGraph / HandoffCoverageReport /
  RuntimeGraphDriftReport / PathFreshnessReport / VerificationResult).
  Readiness: ready-for-prepare / blocked / needs-review / insufficient-context
  / stale-context. Assessment, not WorkOrder; no WorkOrder / VerificationPlan
  creation; no execution; no source writes. RuntimeGraphDriftReport is an input
  to readiness, not the intent system itself. Classic intent readiness was
  gate/staleness-based and did not consume the graph spine; Rekon wires it in.
  Next: IntentAssessmentReport safety review.
- **IntentAssessmentReport v1 decision (P1.1
  intent-assessment-report-v1-decision slice).** ✅ Shipped. Seventy-seventh
  slice. Decides the v1 shape of `IntentAssessmentReport`, the first artifact
  of the staged Rekon intent spine. **Recommendation: Option B —
  artifact-backed readiness assessment** from a user request plus existing
  Rekon artifacts (StepCapabilityGraph / HandoffCoverageReport /
  RuntimeGraphDriftReport / PathFreshnessReport / VerificationResult).
  Readiness: ready-for-prepare / blocked / needs-review / insufficient-context
  / stale-context. Pinned: assessment, not WorkOrder; no WorkOrder /
  VerificationPlan creation; no execution; no source writes; PreparedIntentPlan
  next; IntentStatusReport / intent:go deferred. Classic intent readiness was
  gate/staleness-based and did not consume the graph spine; Rekon wires it into
  readiness (recorded as a Rekon-native extension). Next: IntentAssessmentReport
  v1 implementation.
- **Intent Capability Spine Integration Review (P1.1
  intent-capability-spine-integration-review slice).** ✅ Shipped.
  Seventy-sixth slice. Read-only mapping of classic `intent:assess` /
  `intent:prepare` / `intent:go` / `intent:status` onto Rekon artifacts:
  assess → `IntentAssessmentReport`, prepare → `PreparedIntentPlan`,
  status → `IntentStatusReport`, go deferred. **Recommendation: Option B
  (staged intent artifact spine); first target IntentAssessmentReport v1
  decision.** Honest finding: classic intent did not reference
  step/handoff/runtime-graph/drift; Rekon intent adds that spine dependency to
  readiness. No intent implemented; no artifact registered; no CLI; no source
  writes. Next: IntentAssessmentReport v1 decision.
- **RuntimeGraphDriftReport safety review (P1.1
  runtime-graph-drift-report-safety-review slice).** ✅ Shipped. Seventy-fifth
  slice. Read-only review of `RuntimeGraphDriftReport` v1. **Recommendation:
  safe / stable as expected-vs-observed runtime graph drift (no blocker); the
  classic step/handoff/runtime-drift spine is complete enough to unblock
  intent architecture work.** Pinned: drift, not observation; not
  HandoffCoverageReport; not PathFreshnessReport / lineage freshness; reads no
  raw event logs; re-evaluates no coverage; no WorkOrder / VerificationPlan /
  intent. Next: Intent Capability Spine Integration Review.
- **RuntimeGraphDriftReport v1 (P1.1 runtime-graph-drift-report slice).**
  ✅ Shipped. Seventy-fourth slice. Registers `RuntimeGraphDriftReport`
  (category `actions`) + `buildRuntimeGraphDriftReport`
  (`@rekon/capability-model`) + `rekon runtime graph drift` CLI. Compares
  `StepCapabilityGraph` / `HandoffContract` / `HandoffCoverageReport` /
  `RuntimeGraphObservationReport` for expected-vs-observed runtime graph
  drift; in-sync / missing-expected / added-observed / uncovered-handoff /
  unresolved-contract / observation-missing / not-evaluated. Not runtime
  observation; not HandoffCoverageReport; not PathFreshnessReport / lineage
  freshness; does not read raw event logs directly; no WorkOrder /
  VerificationPlan / intent. The final classic-parity drift layer. Next:
  RuntimeGraphDriftReport safety review.
- **RuntimeGraphDriftReport v1 decision (P1.1
  runtime-graph-drift-report-v1-decision slice).** ✅ Shipped. Seventy-third
  slice. Decides the v1 model for `RuntimeGraphDriftReport`
  (expected-vs-observed runtime graph drift over the four spine artifacts).
  **Recommendation: Option B — compare existing graph artifacts.** Pinned:
  expected-vs-observed runtime graph drift, not observation; not
  HandoffCoverageReport; not PathFreshnessReport / lineage freshness; does
  not read raw event logs directly; no WorkOrder / VerificationPlan; intent
  deferred. Recommended next slice: RuntimeGraphDriftReport v1
  implementation.
- **RuntimeGraphObservationReport safety review (P1.1
  runtime-graph-observation-report-safety-review slice).** ✅ Shipped.
  Seventy-second slice. Read-only review of `RuntimeGraphObservationReport`
  v1. **Recommendation: safe / stable as observed runtime graph (no
  blocker).** Pinned: observed runtime graph, not declared topology; not
  HandoffCoverageReport; no coverage / drift / WorkOrder / VerificationPlan /
  intent. RuntimeGraphDriftReport remains the next layer. Next slice:
  RuntimeGraphDriftReport architecture / v1 decision.
- **RuntimeGraphObservationReport v1 (P1.1
  runtime-graph-observation-report slice).** ✅ Shipped. Seventy-first slice.
  Registers `RuntimeGraphObservationReport` (category `graphs`) +
  `buildRuntimeGraphObservationReport` / `parseRuntimeGraphObservationEventLog`
  (`@rekon/capability-model`) + `rekon runtime graph observe` CLI.
  Observed runtime graph from raw handoff_event logs
  (`.rekon/handoff-events.jsonl`): step/feature/event/source nodes +
  handoff/emitted-by edges; ignoredRows + parseErrors; missing log → zero.
  Observed runtime graph, not declared topology; not HandoffCoverageReport;
  no coverage / drift / WorkOrder / VerificationPlan / intent. Next:
  RuntimeGraphObservationReport safety review.
- **RuntimeGraphObservationReport v1 decision (P1.1
  runtime-graph-observation-report-v1-decision slice).** ✅ Shipped.
  Seventieth slice. Decides the v1 model for
  `RuntimeGraphObservationReport` (observed runtime graph from raw
  handoff_event logs). **Recommendation: Option B — raw handoff_event log →
  observed graph.** Pinned: observed runtime graph, not declared topology;
  not HandoffCoverageReport; no coverage evaluation / drift / WorkOrder /
  VerificationPlan / intent. RuntimeGraphDriftReport remains the next layer
  after observation. Recommended next slice: RuntimeGraphObservationReport
  v1 implementation.
- **HandoffCoverageReport safety review (P1.1
  handoff-coverage-report-safety-review slice).** ✅ Shipped. Sixty-ninth
  slice. Read-only review of `HandoffCoverageReport` v1. **Recommendation:
  safe / stable as narrow handoff-event coverage (no blocker).** Pinned:
  handoff-event coverage, not VerificationRun command success; missing log →
  not-evaluated; present-no-match → uncovered; unmatched observed →
  added-observed; invalid lines → parseErrors; no runtime graph observation
  / drift / WorkOrder / VerificationPlan / intent. Next slice:
  RuntimeGraphObservationReport architecture / v1 decision.
- **HandoffCoverageReport v1 (P1.1 handoff-coverage-report slice).** ✅
  Shipped. Sixty-eighth slice. Registers `HandoffCoverageReport` (category
  `actions`) + `buildHandoffCoverageReport` / `parseHandoffEventLog`
  (`@rekon/capability-model`) + `rekon handoff coverage report` CLI.
  Compares declared `HandoffContract` handoffs vs an optional raw handoff
  event log (`.rekon/handoff-events.jsonl`); `covered` / `uncovered` /
  `unresolved-contract` / `added-observed` / `not-evaluated` (missing
  log → not-evaluated; present-no-match → uncovered; invalid lines →
  parseErrors). Handoff-event coverage, not VerificationRun command success;
  no runtime graph observation / drift / WorkOrder / VerificationPlan /
  intent. Next: HandoffCoverageReport safety review.
- **HandoffCoverageReport v1 decision (P1.1
  handoff-coverage-report-v1-decision slice).** ✅ Shipped. **Sixty-seventh
  slice on the capability-ontology track.** Strategy / architecture
  decision batch. Decides the v1 model for `HandoffCoverageReport`
  (declared HandoffContract vs observed handoff events). **Recommendation:
  Option B — HandoffContract + an optional raw handoff event log**
  (`.rekon/handoff-events.jsonl`; covered / uncovered / unresolved-contract
  / added-observed / not-evaluated). Rejected: defer-for-observation,
  contract-only, VerificationRun-as-coverage, start-with-drift. Pinned:
  handoff-event coverage, not VerificationRun command success; no runtime
  graph observation / drift; no WorkOrder / VerificationPlan; observation is
  the next runtime layer; drift + intent deferred. New memo + 17-assertion
  docs test + review packet. Recommended next slice: HandoffCoverageReport
  v1 implementation.
- **HandoffContract safety review (P1.1 handoff-contract-safety-review
  slice).** ✅ Shipped. **Sixty-sixth slice on the capability-ontology
  track.** Strategy / safety-review batch. Read-only review of
  `HandoffContract` v1. **Recommendation: safe / stable as declared baton
  policy (no blocker).** Pinned: declared baton policy, not topology; no
  handoff coverage / runtime events / drift; no WorkOrder / VerificationPlan;
  no intent; HandoffCoverageReport is the next layer; observation / drift
  deferred. New memo + 16-assertion docs test + review packet. Recommended
  next slice: HandoffCoverageReport architecture / v1 decision.
- **HandoffContract v1 (P1.1 handoff-contract slice).** ✅ Shipped.
  **Sixty-fifth slice on the capability-ontology track.** Product
  capability batch. Second artifact in the staged spine: declared baton
  policy over `StepCapabilityGraph` step ids. New artifact type
  `HandoffContract` + `buildHandoffContract` (`@rekon/capability-model`) +
  optional config loader + `rekon handoff contract build` CLI. Materializes
  declared baton policy from `.rekon/handoff-contracts.json` over the
  current StepCapabilityGraph (`declared` / `unresolved-step`). Pinned:
  declared baton policy, not topology; no handoff coverage / runtime events
  / drift; no WorkOrder / VerificationPlan; config optional + never
  mutated. 27-assertion contract test + 11-assertion docs test + review
  packet. Recommended next slice: HandoffContract safety review.
- **HandoffContract v1 decision (P1.1 handoff-contract-v1-decision
  slice).** ✅ Shipped. **Sixty-fourth slice on the capability-ontology
  track.** Strategy / architecture decision batch. Decides the v1 model for
  `HandoffContract` (declared baton passes over `StepCapabilityGraph` step
  ids). **Recommendation: Option B — config + artifact effective contract**
  (optional `.rekon/handoff-contracts.json`; missing step refs →
  `unresolved-step`). Rejected: config-only, auto-derive, fold into
  StepCapabilityGraph, start with HandoffCoverageReport. Pinned: declared
  baton policy, not topology; no handoff coverage / runtime events / drift;
  HandoffCoverageReport is next; observation/drift deferred; no WorkOrder /
  VerificationPlan; intent deferred. New memo + 18-assertion docs test +
  review packet. Recommended next slice: HandoffContract v1 implementation.
- **StepCapabilityGraph safety review (P1.1
  step-capability-graph-safety-review slice).** ✅ Shipped. **Sixty-third
  slice on the capability-ontology track.** Strategy / safety-review batch.
  Read-only review of `StepCapabilityGraph` v1. **Recommendation: safe /
  stable as expected workflow topology (no blocker).** Pinned: expected
  workflow topology, not runtime truth; not CapabilityMap v2; optional
  config grouping/labeling only; no HandoffContract / handoff coverage /
  runtime graph drift / WorkOrder / VerificationPlan; intent deferred. New
  memo + 16-assertion docs test + review packet. Recommended next slice:
  HandoffContract architecture / v1 decision.
- **StepCapabilityGraph v1 (P1.1 step-capability-graph slice).** ✅ Shipped.
  **Sixty-second slice on the capability-ontology track.** Product
  capability batch. First artifact in the staged step/handoff/runtime graph
  spine. New artifact type `StepCapabilityGraph` + projection helper
  `buildStepCapabilityGraph` (`@rekon/capability-model`) + optional config
  loader + `rekon step graph build` CLI. Projects an expected workflow
  topology graph (step→capability `realizes`, step→file `touches`, system
  edges) from `EvidenceGraph` + `CapabilityMap v2` + `CapabilityPhraseReport`
  with optional `.rekon/step-capability-map.json` grouping/labeling. Pinned:
  expected workflow topology only; not CapabilityMap v2; no runtime handoff
  coverage / drift; no HandoffContract / WorkOrder / VerificationPlan; no
  intent; reserved-empty handoffPlaceholders; inputs/config never mutated.
  28-assertion contract test + 12-assertion docs test + review packet.
  Recommended next slice: StepCapabilityGraph safety review.
- **StepCapabilityGraph v1 decision (P1.1
  step-capability-graph-v1-decision slice).** ✅ Shipped. **Sixty-first
  slice on the capability-ontology track.** Strategy / architecture
  decision batch (v1 shape + inputs only). **Decision: projection +
  optional config** — projection from `EvidenceGraph` + `CapabilityMap v2`
  + `CapabilityPhraseReport`; optional `.rekon/step-capability-map.json`
  for grouping/labeling. Pinned: expected workflow topology only (no
  runtime truth / handoff coverage / execution readiness); not
  CapabilityMap v2; optional config not manual-admin-heavy;
  expected-handoff + runtime-grounding reserved (empty in v1). Rejected:
  projection-only, config-only, runtime-grounded v1. New memo +
  16-assertion docs test + review packet. Recommended next slice:
  StepCapabilityGraph v1 implementation.
- **StepCapabilityGraph / HandoffContract architecture decision (P1.1
  step-capability-handoff-architecture-decision slice).** ✅ Shipped.
  **Sixtieth slice on the capability-ontology track.** Strategy /
  architecture decision batch. **Recommendation: Option B — a staged
  step/handoff/runtime graph spine** (`StepCapabilityGraph` →
  `HandoffContract` → `HandoffCoverageReport` →
  `RuntimeGraphObservationReport` → `RuntimeGraphDriftReport`); does not
  start with runtime drift. Rejected: CapabilityMap/Contract-enough,
  start-at-drift, fold-into-WorkOrder/VerificationPlan, fold-into-
  CapabilityMap v2. Pinned: StepCapabilityGraph is workflow topology, not
  CapabilityMap v2; HandoffContract is declared baton policy, not WorkOrder;
  HandoffCoverageReport is handoff-event coverage, not VerificationRun
  command success; RuntimeGraphDriftReport is runtime graph drift, not
  PathFreshnessReport / artifact lineage freshness. New memo + 15-assertion
  docs test + review packet. Recommended next slice: StepCapabilityGraph v1
  decision.
- **Classic step-capability / handoff / runtime drift parity audit
  (P1.1 classic-step-capability-handoff-runtime-drift-parity-audit slice).**
  ✅ Shipped. **Fifty-ninth slice on the capability-ontology track.**
  Strategy / architecture audit batch. Deep read-only audit of the legacy
  codebase-intel step-capability graph (step→capability→file edges), baton /
  handoff runtime-truth graph, declared-vs-observed handoff coverage,
  step-handler + derive purity validation, runtime graph drift, and watcher /
  continuity / memory + intent phases. **Finding: Rekon has adjacent
  foundations, but the classic step-capability / handoff / runtime drift
  system is not yet fully accounted for.** Reserves `StepCapabilityGraph`,
  `HandoffContract`, `HandoffCoverageReport`, `RuntimeGraphObservationReport`,
  `RuntimeGraphDriftReport`; evaluates `DerivedGraphValidationReport` +
  `StepHandlerValidationReport`. Premise corrections recorded:
  `tools/verify-handoff-coverage.mjs` does not exist (logic is in
  product-capability-contracts); classic drift is base-vs-head EvidenceGraph
  diff over an observed runtime-truth graph. New memo + 20-assertion docs
  test + review packet. Recommended next slice: StepCapabilityGraph /
  HandoffContract architecture decision.
- **BridgeFindingLifecycleIntegrationReport safety review (P1.1
  bridge-finding-lifecycle-integration-report-safety-review slice).** ✅
  Shipped. **Fifty-eighth slice on the capability-ontology track.**
  Strategy / safety-review batch. Read-only review of the v1 preview
  artifact at `c908857`. **Recommendation: safe / stable (no
  blocker).** Pinned: BridgeFindingLifecycleIntegrationReport is
  preview, not FindingLifecycleReport; initialLifecycleStatus is
  modeled status only; no `FindingFilterReport` /
  `FindingLifecycleReport` / `IssueAdjudicationReport` /
  `CoherencyDelta` mutation; no `WorkOrder` / `VerificationPlan`
  creation; no source writes; `CoherencyDelta` downstream of lifecycle
  + adjudication; `WorkOrder` / `VerificationPlan` downstream of
  `CoherencyDelta`. New memo + 16-assertion docs test + review packet.
  Recommended next slice: BridgeFindingLifecycleIntegrationReport
  publication surfacing.
- **BridgeFindingLifecycleIntegrationReport v1 (P1.1
  bridge-finding-lifecycle-integration-report slice).** ✅ Shipped.
  **Fifty-seventh slice on the capability-ontology track.** Product
  capability batch. Implements the read-only preview artifact chosen by
  the fifty-sixth slice (Option B). New artifact type
  `BridgeFindingLifecycleIntegrationReport` (kernel-repo-model + SDK +
  runtime `actions`), `buildBridgeFindingLifecycleIntegrationReport` +
  `isBridgeDerivedFinding` in `@rekon/capability-model`, and a
  `rekon capability lint lifecycle-preview` CLI command. The preview
  identifies bridge-derived findings structurally from `FindingReport`
  trace fields and classifies readiness (ready-for-lifecycle with modeled
  initial status `new`, needs-review, duplicate, ineligible; filtered
  reserved); non-bridge findings omitted. Pinned:
  BridgeFindingLifecycleIntegrationReport is preview, not
  FindingLifecycleReport; ready-for-lifecycle rows receive a proposed
  initial status `new`; duplicates / missing evidence / missing trace are
  not automatically promoted; no `FindingFilterReport` /
  `FindingLifecycleReport` / `IssueAdjudicationReport` / `CoherencyDelta`
  mutation; no `WorkOrder` / `VerificationPlan` creation; source writes
  unavailable. New artifact + concept docs + 23-assertion contract test +
  11-assertion docs test + review packet. Recommended next slice:
  `BridgeFindingLifecycleIntegrationReport` safety review.
- **Bridge-derived findings lifecycle / CoherencyDelta integration
  decision (P1.1 bridge-finding-lifecycle-integration-decision
  slice).** ✅ Shipped. **Fifty-sixth slice on the
  capability-ontology track.** Strategy / architecture decision
  batch. Decides how bridge-derived `FindingReport` entries should
  enter `FindingLifecycleReport`, `IssueAdjudicationReport`, and
  `CoherencyDelta`. **Recommendation: Option B — a preview artifact
  first (`BridgeFindingLifecycleIntegrationReport`), previewing
  filter / lifecycle / adjudication / `CoherencyDelta` eligibility
  without mutation.** Pinned:
  `BridgeFindingLifecycleIntegrationReport` is preview, not
  `FindingLifecycleReport`; no `FindingFilterReport` /
  `FindingLifecycleReport` / `IssueAdjudicationReport` /
  `CoherencyDelta` mutation in this decision slice; `CoherencyDelta`
  downstream of lifecycle + adjudication; `WorkOrder` /
  `VerificationPlan` downstream of `CoherencyDelta`; source writes
  unavailable. New memo + 14-assertion docs test + review packet.
  Recommended next slice: `BridgeFindingLifecycleIntegrationReport`
  v1 (preview only).
- **Bridge-derived findings publication safety review (P1.1
  bridge-derived-findings-publication-safety-review slice).** ✅
  Shipped. **Fifty-fifth slice on the capability-ontology track.**
  Strategy / safety-review batch. Read-only end-to-end review of the
  bridge-derived findings publication surfacing.
  **Recommendation: safe / stable as read-only visibility (no
  blocker).** Pinned: surfacing is read-only visibility;
  bridge-derived findings are governed `FindingReport` entries, not
  `FindingLifecycleReport` status; no mutation of `FindingReport` /
  `FindingFilterReport` / `FindingLifecycleReport` /
  `IssueAdjudicationReport` / `CoherencyDelta`; no `WorkOrder` /
  `VerificationPlan` creation; no resolver routing, verification
  planning, `RefactorPreservationContract`, or source-write
  implication; proof report deferred; lifecycle / `CoherencyDelta`
  integration decision may begin next. New memo + 15-assertion docs
  test + review packet. Recommended next slice: bridge-derived
  findings lifecycle / `CoherencyDelta` integration decision.
- **Bridge-derived findings publication surfacing (P1.1
  bridge-derived-findings-publication slice).** ✅ Shipped.
  **Fifty-fourth slice on the capability-ontology track.** Product
  capability batch implementing the slice-53 Option B decision. The
  architecture summary (`## Bridge-Derived Findings`) and agent
  operating contract (`### Bridge-Derived Findings` + `Do Not Do`)
  surface the governed bridge-derived `FindingReport` entries the
  controlled `--confirm-finding-write` writer wrote, read-only with
  provenance. New helper
  `buildBridgeDerivedFindingsPublicationSection` (+
  `isBridgeDerivedFinding`) identifies them by `type`,
  `details.source`, or `details.source*` — never title text alone.
  Manifest gains `FindingReport` consume + a
  `bridge-derived-findings.changed` invalidation rule.
  **Publications read the latest FindingReport, never run the bridge
  writer, never mutate FindingReport / FindingLifecycleReport /
  IssueAdjudicationReport / CoherencyDelta, never create WorkOrder /
  VerificationPlan; bridge-derived findings are governed
  FindingReport entries, not lifecycle status; proof report
  deferred; lifecycle / CoherencyDelta integration downstream.**
  23-assertion contract test + 11-assertion docs test + review
  packet. Recommended next slice: bridge-derived findings
  publication safety review.
- **Bridge-derived findings publication decision (P1.1
  bridge-derived-findings-publication-decision slice).** ✅
  Shipped. **Fifty-third slice on the capability-ontology
  track.** Strategy / architecture decision batch. Decides how
  bridge-derived `FindingReport` entries (written by the
  controlled, opt-in `--confirm-finding-write` writer) should be
  surfaced after the writer passed safety review.
  **Recommendation: Option B — surface bridge-derived
  `FindingReport` entries in the architecture summary and the
  agent operating contract first; the proof report is deferred.**
  No publication behavior is implemented. Pinned: bridge-derived
  findings are governed `FindingReport` entries, not lifecycle
  status; publication surfacing does not mutate `FindingReport`;
  publication surfacing does not mutate `FindingLifecycleReport`,
  `IssueAdjudicationReport`, or `CoherencyDelta`; publication
  surfacing does not create `WorkOrder` or `VerificationPlan`;
  proof report surfacing remains deferred; lifecycle and
  `CoherencyDelta` integration remain downstream. Source
  identification uses `finding.type =
  capability_architecture_policy` plus the `details.source*`
  trace fields — never title text alone. New memo
  `docs/strategy/bridge-derived-findings-publication-decision.md`
  (12 headings + 4 tables) + 15-assertion docs test + review
  packet. Recommended next slice: bridge-derived findings
  publication surfacing.
- **CapabilityLintFindingBridgeReport → FindingReport writer
  safety review (P1.1 capability-lint-finding-writer-safety-review
  slice).** ✅ Shipped. **Fifty-second slice on the
  capability-ontology track.** Strategy / safety-review batch.
  Read-only end-to-end review of the FindingReport writer mode.
  **Recommendation: safe / stable as a controlled, opt-in writer**
  (no blocker). Pinned: writer mode is opt-in / requires
  `--confirm-finding-write`; dry-run remains preview-only; writes
  exactly one new `FindingReport` on success; no in-place
  `FindingReport` mutation; no `FindingFilterReport` /
  `FindingLifecycleReport` / `IssueAdjudicationReport` /
  `CoherencyDelta` mutation; no `WorkOrder` / `VerificationPlan`
  creation; no source writes; lifecycle / `CoherencyDelta`
  integration remain downstream. 15-assertion docs test + review
  packet. Recommended next slice: FindingReport writer publication
  / operator-surface decision.
- **CapabilityLintFindingBridgeReport → FindingReport writer
  implementation (P1.1 capability-lint-finding-writer slice).**
  ✅ Shipped. **Fifty-first slice on the capability-ontology
  track.** Product capability batch (controlled writer). `rekon
  capability lint write-findings` gains an opt-in write mode
  (`--confirm-finding-write`) that reuses the dry-run preview and
  writes **exactly one new `FindingReport`** artifact.
  **Requires `--confirm-finding-write`; mutually exclusive with
  `--dry-run`; `--write` / `--send` / `--execute` rejected; exits
  non-zero on 0 eligible findings; no in-place `FindingReport`
  mutation; no `FindingFilterReport` / `FindingLifecycleReport` /
  `IssueAdjudicationReport` / `CoherencyDelta` mutation; no
  `WorkOrder` / `VerificationPlan` creation; source writes remain
  unavailable.** 25-assertion contract test + 11-assertion docs
  test + review packet. Recommended next slice: FindingReport
  writer safety review.
- **CapabilityLintFindingBridgeReport → FindingReport writer
  mode decision (P1.1 capability-lint-finding-writer-mode-decision
  slice).** ✅ Shipped. **Fiftieth slice on the
  capability-ontology track.** Strategy / architecture decision
  batch. Decides whether and how to add an opt-in `FindingReport`
  write mode after the dry-run safety review. **Recommendation:
  Option B — a future, opt-in write mode gated behind
  `--confirm-finding-write`, reusing the dry-run preview and
  writing a new `FindingReport` artifact only; not implemented in
  this slice.** Pinned: no `FindingReport` written in this decision
  slice; future write mode must require `--confirm-finding-write`;
  `--write` / `--send` / `--execute` remain rejected; new-artifact
  write (no in-place mutation); no `FindingFilterReport` /
  `FindingLifecycleReport` / `IssueAdjudicationReport` /
  `CoherencyDelta` mutation; no `WorkOrder` / `VerificationPlan`
  creation; source writes remain unavailable. 16-assertion docs
  test + review packet. Recommended next slice: FindingReport
  writer implementation.
- **CapabilityLintFindingBridgeReport → FindingReport writer
  dry-run safety review (P1.1
  capability-lint-finding-writer-dry-run-safety-review slice).**
  ✅ Shipped. **Forty-ninth slice on the capability-ontology
  track.** Strategy / safety-review batch. Read-only end-to-end
  review of the FindingReport writer dry-run helper / CLI.
  **Recommendation: safe / stable as preview-only writer
  modeling** (no blocker). Pinned: dry-run is preview-only;
  `--dry-run` required; `--confirm-finding-write` / `--write` /
  `--send` / `--execute` rejected; no `FindingReport`
  write/mutation; no `FindingFilterReport` /
  `FindingLifecycleReport` / `IssueAdjudicationReport` /
  `CoherencyDelta` mutation; no `WorkOrder` / `VerificationPlan`
  creation; no artifact-index mutation; write mode remains
  deferred. 16-assertion docs test + review packet. Recommended
  next slice: FindingReport writer mode decision.
- **CapabilityLintFindingBridgeReport → FindingReport writer
  dry-run helper / CLI (P1.1
  capability-lint-finding-writer-dry-run slice).** ✅ Shipped.
  **Forty-eighth slice on the capability-ontology track.**
  Product capability batch (**dry-run preview only**). New helper
  `@rekon/capability-model.buildFindingReportWritePreview` + CLI
  `rekon capability lint write-findings --bridge-report
  <id|type:id> --dry-run` preview the `FindingReport` body a future
  writer would emit. **The dry-run writes no `FindingReport`. Write
  mode is deferred. `--dry-run` is required; `--confirm-finding-write`
  / `--write` / `--send` / `--execute` are rejected.** No governance
  mutation (`FindingReport` / `FindingFilterReport` /
  `FindingLifecycleReport` / `IssueAdjudicationReport` /
  `CoherencyDelta`), no `WorkOrder` / `VerificationPlan` creation, no
  artifact-index mutation, no source writes. 27-assertion contract
  test + 9-assertion docs test + review packet. Recommended next
  slice: FindingReport writer dry-run safety review.
- **CapabilityLintFindingBridgeReport → FindingReport writer
  decision (P1.1 capability-lint-finding-writer-decision
  slice).** ✅ Shipped. **Forty-seventh slice on the
  capability-ontology track.** Strategy / architecture decision
  batch. Decides whether and how eligible
  `CapabilityLintFindingBridgeReport` candidates may become
  governed `FindingReport` entries. **Recommendation: Option B —
  a future, separate, opt-in `FindingReport` writer with
  required dry-run preview and explicit confirmation; the writer
  is not implemented in this slice.** Pinned: no `FindingReport`
  entries are written in this decision slice; a future writer
  must support dry-run preview before write mode and require
  explicit confirmation before writing `FindingReport`; the
  writer writes a new `FindingReport` artifact, not mutating an
  existing one in place; `FindingFilterReport` /
  `FindingLifecycleReport` / `IssueAdjudicationReport` /
  `CoherencyDelta` remain downstream and are not mutated by the
  writer; `WorkOrder` / `VerificationPlan` creation remain
  downstream and are not part of the writer; source writes remain
  unavailable. New memo
  `docs/strategy/capability-lint-finding-writer-decision.md` (13
  headings + 4 tables: option / eligibility / boundary /
  future-sequence). New 16-assertion docs test. Review packet
  `.rekon-dev/review-packets/capability-lint-finding-writer-decision.md`.
  **No runtime behavior changes. No source under `packages/`
  modified. No new artifact type. No new CLI command. No version
  bump. No npm publish.** Recommended next slice:
  CapabilityLintFindingBridgeReport → FindingReport writer
  dry-run helper / CLI (preview only).
- **CapabilityLintFindingBridgeReport publication safety review
  (P1.1
  capability-lint-finding-bridge-publication-safety-review
  slice).** ✅ Shipped. **Forty-sixth slice on the
  capability-ontology track.** Strategy / safety-review batch.
  Read-only end-to-end review of the
  `CapabilityLintFindingBridgeReport` publication surfacing
  shipped at `41e0f32`. **Recommendation: surfacing is safe /
  stable as read-only visibility.** Pinned: surfacing is
  read-only visibility; preview, not `FindingReport`;
  `proposedFinding` is preview-only and writes no
  `FindingReport`; surfacing implies no `FindingReport` /
  `FindingLifecycleReport` / `IssueAdjudicationReport` /
  `CoherencyDelta` mutation, `WorkOrder` / `VerificationPlan`
  creation, resolver routing, verification planning,
  `RefactorPreservationContract`, or source writes; publications
  read the latest bridge report and never run `rekon capability
  lint bridge-findings`; proof-report surfacing remains
  deferred; FindingReport writer decision work may begin next.
  New strategy memo
  `docs/strategy/capability-lint-finding-bridge-publication-safety-review.md`
  (11 headings + 3 tables: surface / boundary / option). New
  14-assertion docs test. Review packet
  `.rekon-dev/review-packets/capability-lint-finding-bridge-publication-safety-review.md`.
  **No runtime behavior changes. No source under `packages/`.
  No new artifact type. No new CLI command. No npm publish. No
  version bump.** **Recommended next slice:**
  *CapabilityLintFindingBridgeReport → FindingReport writer
  decision*.
- **CapabilityLintFindingBridgeReport publication surfacing
  (P1.1 capability-lint-finding-bridge-publications slice).**
  ✅ Shipped. **Forty-fifth slice on the capability-ontology
  track.** Product capability batch. The architecture summary
  and agent contract publications surface the latest
  `CapabilityLintFindingBridgeReport` as read-only visibility
  (summary counts, bounded candidate table, eligible /
  ineligible / needs-review guidance), citing it in
  `header.inputRefs`. New `@rekon/capability-docs` helper
  `buildCapabilityLintFindingBridgePublicationSection`; manifest
  `consumes` + `capability-lint-finding-bridge.changed`
  invalidation rule; new agent-contract Do Not Do reminder.
  **Read-only:** publications never run bridge generation,
  never write `FindingReport`, never mutate `FindingFilterReport`
  / `FindingLifecycleReport` / `IssueAdjudicationReport` /
  `CoherencyDelta`, never create `WorkOrder` /
  `VerificationPlan`; `proposedFinding` stays preview-only;
  surfacing does not imply source writes; proof-report
  surfacing deferred. New 23-assertion contract test +
  11-assertion docs test. Review packet
  `.rekon-dev/review-packets/capability-lint-finding-bridge-publications.md`.
  **No new artifact type. No new CLI command. No npm publish.
  No version bump.** **Recommended next slice:**
  *CapabilityLintFindingBridgeReport publication safety review*.
- **CapabilityLintFindingBridgeReport safety review (P1.1
  capability-lint-finding-bridge-report-safety-review slice).**
  ✅ Shipped. **Forty-fourth slice on the
  capability-ontology track.** Strategy / safety-review batch.
  Read-only end-to-end review of
  `CapabilityLintFindingBridgeReport` v1 (shipped at `166e07a`).
  **Recommendation: `CapabilityLintFindingBridgeReport` v1 is
  safe / stable as a preview bridge artifact.** Pinned verbatim:
  preview not `FindingReport`; no `FindingReport` writes in v1;
  no `FindingFilterReport` / `FindingLifecycleReport` /
  `IssueAdjudicationReport` / `CoherencyDelta` mutation; no
  `WorkOrder` / `VerificationPlan` creation; only a later
  explicit writer decision may promote candidates; the next
  slice may surface the report in publications but must not
  write findings. New strategy memo
  `docs/strategy/capability-lint-finding-bridge-report-safety-review.md`
  (13 headings + 4 tables: surface / eligibility / boundary /
  option). New 14-assertion docs test. Review packet
  `.rekon-dev/review-packets/capability-lint-finding-bridge-report-safety-review.md`.
  **No runtime behavior changes. No source files under
  `packages/` modified. No new artifact type. No new CLI
  command. No npm publish. No version bump.** **Recommended next
  slice:** *CapabilityLintFindingBridgeReport publication
  surfacing*.
- **CapabilityLintFindingBridgeReport v1 (P1.1
  capability-lint-finding-bridge-report slice).**
  ✅ Shipped. **Forty-third slice on the
  capability-ontology track.** Implements Option B of the
  bridge decision — a **preview** bridge artifact
  (`CapabilityLintFindingBridgeReport`, schemaVersion 0.1.0,
  experimental; runtime category `actions`) that classifies
  each `CapabilityArchitectureLintReport` row as eligible /
  ineligible / needs-review for a future `FindingReport`
  writer, with a deterministic slug-safe proposed finding id
  (`capability-architecture-policy:<rule>:<contractId>:<phraseCapabilityId>`)
  and duplicate-id collisions flipped to needs-review. New
  helper `buildCapabilityLintFindingBridgeReport`
  (`@rekon/capability-model`); new CLI command
  `rekon capability lint bridge-findings [--lint-report <ref>]`;
  registered in `@rekon/sdk` + `@rekon/runtime`. New artifact
  doc `docs/artifacts/capability-lint-finding-bridge-report.md`
  + concept `docs/concepts/capability-lint-finding-bridge.md`,
  24-assertion contract test + 9-assertion docs test, review
  packet `capability-lint-finding-bridge-report-v1.md`.
  **CapabilityLintFindingBridgeReport is preview, not
  FindingReport: the bridge does not write FindingReport,
  does not mutate FindingFilterReport / FindingLifecycleReport
  / IssueAdjudicationReport / CoherencyDelta, and creates no
  WorkOrder / VerificationPlan. Only a later explicit writer
  decision may allow eligible bridge candidates to become
  governed findings. No source writes. No npm publish. No
  version bump.** **Recommended next slice:**
  *CapabilityLintFindingBridgeReport safety review*.
- **CapabilityArchitectureLintReport → FindingReport
  bridge decision (P1.1
  capability-lint-finding-bridge-decision slice).**
  ✅ Shipped. **Forty-second slice on the
  capability-ontology track.** Strategy / architecture
  decision memo. First bridge decision between the
  capability-policy evaluation layer and the existing
  finding / governance pipeline. **Recommendation:
  Option B — introduce an intermediate
  `CapabilityLintFindingBridgeReport` first** (a preview
  artifact). v1 eligibility: status `violation` +
  `findingCandidate` + confidence high/medium + severity
  high/medium + `evidenceRefs`; pass / not-evaluated /
  missing-candidate / low-confidence / low-severity rows
  ineligible; duplicate id / missing evidence / uncertain
  category needs-review. Deterministic finding id sketch
  `capability-architecture-policy:<rule>:<contractId>:<phraseCapabilityId>`
  (no timestamp; duplicates collapse). All five boundary
  statements asserted:
  `CapabilityLintFindingBridgeReport` is preview, not
  `FindingReport`; no `FindingReport` writes in v1; no
  `FindingFilterReport` / `FindingLifecycleReport` /
  `IssueAdjudicationReport` / `CoherencyDelta` mutation;
  only a later explicit writer decision may promote bridge
  candidates to governed findings; finding lifecycle +
  `CoherencyDelta` remain downstream. Five options
  evaluated; Option B selected; direct `FindingReport`
  writer rejected for v1; direct lifecycle mutation and
  direct `CoherencyDelta` remediation rejected.
  Implementation sequence: (1) decision memo (this
  slice); (2) `CapabilityLintFindingBridgeReport` v1
  (preview only); (3) bridge safety review; (4)
  `FindingReport` writer decision; (5) writer
  implementation only if explicitly approved. New
  strategy memo
  [`docs/strategy/capability-lint-finding-bridge-decision.md`](capability-lint-finding-bridge-decision.md).
  New 15-assertion docs test
  `tests/docs/capability-lint-finding-bridge-decision.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-lint-finding-bridge-decision.md`.
  **No implementation. No new artifact type registered.
  No runtime behavior changes. No FindingReport /
  FindingFilterReport / FindingLifecycleReport /
  IssueAdjudicationReport / CoherencyDelta mutation. No
  WorkOrder / VerificationPlan creation. No npm publish.
  No version bump.** **Recommended next slice:**
  *CapabilityLintFindingBridgeReport v1*.
- **CapabilityArchitectureLintReport publication safety
  review (P1.1
  capability-architecture-lint-publication-safety-review
  slice).** ✅ Shipped. **Forty-first slice on the
  capability-ontology track.** Strategy / safety-review
  batch. Read-only end-to-end audit of the
  `CapabilityArchitectureLintReport` publication
  surfacing shipped at `d01fe23`. **Recommendation:
  surfacing is safe / stable as read-only visibility.**
  Reviewed the publication helper, both sections, the
  agent-contract `Do Not Do` reminder, the proof-report
  deferral, and the contract / docs tests. All seven
  boundary statements asserted: read-only visibility;
  evaluation not enforcement; `findingCandidate`
  preview-only and writes no `FindingReport`; surfacing
  does not imply `FindingReport` mutation,
  `FindingLifecycleReport` mutation, `CoherencyDelta`
  mutation, resolver routing, verification planning,
  `RefactorPreservationContract` behavior, or
  source-write permission; publications read the latest
  report and never run `rekon capability lint
  architecture`; proof-report surfacing remains
  deferred; finding-bridge decision work may begin. Five
  options evaluated; declare surfacing safe / stable +
  finding-bridge decision next selected; more
  publication polish deferred (no blocker); resolver
  routing and verification planning rejected. New
  strategy memo
  [`docs/strategy/capability-architecture-lint-publication-safety-review.md`](capability-architecture-lint-publication-safety-review.md).
  New 14-assertion docs test
  `tests/docs/capability-architecture-lint-publication-safety-review.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-architecture-lint-publication-safety-review.md`.
  **No runtime behavior changes. No publication behavior
  changes. No source files under `packages/` modified.
  No new artifact type. No new CLI command. No
  FindingReport / FindingFilterReport /
  FindingLifecycleReport / CoherencyDelta mutation. No
  CapabilityContract / CapabilityMap mutation. No npm
  publish. No version bump.** **Recommended next
  slice:** *CapabilityArchitectureLintReport →
  FindingReport bridge decision*.
- **CapabilityArchitectureLintReport publication
  surfacing (P1.1
  capability-architecture-lint-publications slice).**
  ✅ Shipped. **Fortieth slice on the
  capability-ontology track.** Product capability batch.
  The architecture summary and agent contract
  publications surface the latest
  `CapabilityArchitectureLintReport` as **read-only
  visibility**. New
  `buildCapabilityArchitectureLintPublicationSection`
  helper in `@rekon/capability-docs` renders a
  `Capability Architecture Linting` section (summary
  counts + bounded lint-row table); both publishers cite
  the report in `header.inputRefs` and render no-report
  guidance when absent. New agent-contract "Do Not Do"
  reminder. Manifest `consumes` gains
  `CapabilityArchitectureLintReport`; new invalidation
  rule `capability-architecture-lint.changed`. All
  boundary statements pinned: evaluation visibility
  only; does not write findings, mutate lifecycle state,
  route resolvers, generate verification plans, or write
  source files; `findingCandidate` preview-only;
  publications never run `rekon capability lint
  architecture` and never mutate `FindingReport`,
  `FindingFilterReport`, `FindingLifecycleReport`,
  `CoherencyDelta`, `CapabilityContract`, or
  `CapabilityMap`; proof-report surfacing **deferred**.
  20-assertion contract test
  `tests/contract/capability-architecture-lint-publications.test.mjs`.
  10-assertion docs test
  `tests/docs/capability-architecture-lint-publications.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-architecture-lint-publications.md`.
  **No new artifact type. No new CLI command. No version
  bump. No npm publish.** **Recommended next slice:**
  *CapabilityArchitectureLintReport publication safety
  review*.
- **CapabilityArchitectureLintReport safety review
  (P1.1 capability-architecture-lint-report-safety-review
  slice).** ✅ Shipped. **Thirty-ninth slice on the
  capability-ontology track.** Strategy /
  safety-review batch. Read-only end-to-end audit of
  the `CapabilityArchitectureLintReport` v1
  implementation shipped at `0bd7af0`.
  **Recommendation: v1 is safe / stable as a separate
  evaluation artifact.** Reviewed artifact type shape,
  factory, validator / assert / schema,
  `buildCapabilityArchitectureLintReport` helper,
  `rekon capability lint architecture` CLI, rule
  evaluation, the `findingCandidate` preview payload,
  and the contract / docs tests. All five required
  boundary statements asserted: evaluation, not
  enforcement; `findingCandidate` is preview-only and
  does not write `FindingReport`; does not mutate
  `FindingFilterReport`, `FindingLifecycleReport`, or
  `CoherencyDelta`; does not implement resolver
  routing, verification planning,
  `RefactorPreservationContract`, or source writes;
  the next slice may surface
  `CapabilityArchitectureLintReport` in publications
  but must not bridge to findings yet. Four options
  evaluated; declare v1 safe / stable + publication
  surfacing next selected; finding bridge and resolver
  routing rejected/deferred. New strategy memo
  [`docs/strategy/capability-architecture-lint-report-safety-review.md`](capability-architecture-lint-report-safety-review.md).
  New 13-assertion docs test
  `tests/docs/capability-architecture-lint-report-safety-review.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-architecture-lint-report-safety-review.md`.
  **No runtime behavior changes. No source files under
  `packages/` modified. No new artifact type. No new
  CLI command. No FindingReport / FindingFilterReport /
  FindingLifecycleReport / CoherencyDelta mutation. No
  CapabilityContract / CapabilityMap mutation. No npm
  publish. No version bump.** **Recommended next
  slice:** *CapabilityArchitectureLintReport
  publication surfacing* — surface lint report summary /
  violations / not-evaluated rows read-only in
  architecture summary + agent contract.
- **CapabilityArchitectureLintReport v1
  implementation (P1.1
  capability-architecture-lint-report-v1 slice).**
  ✅ Shipped. **Thirty-eighth slice on the
  capability-ontology track.** Product capability
  batch. Registers
  `CapabilityArchitectureLintReport` in SDK +
  runtime + kernel-repo-model.
  `buildCapabilityArchitectureLintReport` helper
  added to `@rekon/capability-model`. New CLI
  command `rekon capability lint architecture`
  (with optional `--capability-contract` /
  `--capability-map` pins). v1 scope:
  `allowed/forbidden layer` rules emit
  `pass` / `violation` / `not-evaluated`;
  `allowed/forbidden system` rules emit
  `not-evaluated` until a deterministic system
  field exists on phrase-backed capabilities.
  `requiredChecks` reserved as a row kind but
  not evaluated. Neighbor + preservation rules
  deferred. All six required boundary statements
  honored at runtime: evaluation, not enforcement;
  not `FindingReport`; does NOT mutate
  `FindingFilterReport`,
  `FindingLifecycleReport`, or `CoherencyDelta`;
  does NOT add resolver routing or verification
  planning; does NOT add
  `RefactorPreservationContract`; does NOT add
  source writes. `findingCandidate` on violation
  rows is a preview payload only — `FindingReport`
  is never authored by the lint command. New
  artifact doc
  [`docs/artifacts/capability-architecture-lint-report.md`](../artifacts/capability-architecture-lint-report.md).
  New concept doc
  [`docs/concepts/capability-aware-architecture-linting.md`](../concepts/capability-aware-architecture-linting.md).
  23-assertion contract test
  `tests/contract/capability-architecture-lint-report.test.mjs`.
  12-assertion docs test
  `tests/docs/capability-architecture-lint-report.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-architecture-lint-report-v1.md`.
  **No version bump. No npm publish. No
  CapabilityContract / CapabilityMap /
  CapabilityPhraseReport / EvidenceGraph mutation.
  No FindingReport / FindingFilterReport /
  FindingLifecycleReport / CoherencyDelta
  mutation. No resolver routing. No verification
  planning. No source writes.**
  **Recommended next slice:**
  *`CapabilityArchitectureLintReport` safety
  review* — review the lint artifact and confirm
  it is safe / stable before any publication
  surfacing or finding bridge decision.
- **Capability-aware architecture linting
  decision (P1.1
  capability-aware-architecture-linting-decision
  slice).** ✅ Shipped. **Thirty-seventh slice on
  the capability-ontology track.** Strategy /
  architecture decision memo. **Recommendation:
  select Option B — emit a separate
  `CapabilityArchitectureLintReport` artifact**
  from `CapabilityContract` + `CapabilityMap` v2.
  v1 scope (next slice): `allowedLayers` /
  `forbiddenLayers` / `allowedSystems` /
  `forbiddenSystems` over configured contract
  rows. `requiredChecks` may optionally surface
  as `not-evaluated`. Neighbor + preservation
  rules deferred. All six required boundary
  statements asserted (evaluation, not source
  mutation; not `FindingReport`; does not mutate
  lifecycle / `CoherencyDelta`; does not
  implement resolver routing or verification
  planning; only a later explicit bridge
  promotes). Five options evaluated; Option B
  selected. New strategy memo
  [`docs/strategy/capability-aware-architecture-linting-decision.md`](capability-aware-architecture-linting-decision.md).
  New 15-assertion docs test. Review packet
  `.rekon-dev/review-packets/capability-aware-architecture-linting-decision.md`.
  **No implementation. No runtime behavior
  changes. No FindingReport,
  FindingLifecycleReport, or CoherencyDelta
  mutation. No CapabilityMap mutation. No
  CapabilityContract mutation. No npm publish.
  No version bump.** **Recommended next slice:**
  *`CapabilityArchitectureLintReport` v1
  implementation*.
- **CapabilityContract publication safety review
  (P1.1 capability-contract-publication-safety-review
  slice).** ✅ Shipped. **Thirty-sixth slice on
  the capability-ontology track.** Strategy /
  safety-review batch. Read-only end-to-end audit
  of the publication surfacing shipped at
  `ebf8b56`. **Recommendation: declare publication
  surfacing safe / stable as read-only
  visibility.** All six required boundary
  statements asserted (read-only visibility;
  CapabilityContract is policy, not projection or
  enforcement; surfacing does not imply
  architecture linting, resolver routing,
  verification planning, finding resolution,
  RefactorPreservationContract, or source-write
  permission; publications read the latest
  CapabilityContract and never generate it; proof
  report surfacing remains deferred; architecture
  linting decision may begin after this safety
  review). Five options evaluated; capability-aware
  architecture linting decision selected as next
  slice (strategy / decision memo only; no
  implementation). Enforcement consumers
  (architecture linting, resolver routing,
  verification planning, finding resolution,
  RefactorPreservationContract, source writes)
  remain deferred and gated on their own decision +
  safety review pairs. New strategy memo
  [`docs/strategy/capability-contract-publication-safety-review.md`](capability-contract-publication-safety-review.md).
  New 13-assertion docs test. Review packet
  `.rekon-dev/review-packets/capability-contract-publication-safety-review.md`.
  **No runtime behavior changes. No source files
  under `packages/` modified. No publication
  surface modified. No CapabilityMap mutation. No
  CapabilityPhraseReport mutation. No
  `.rekon/capability-contracts.json` mutation.
  No npm publish. No version bump.**
  **Recommended next slice:**
  *capability-aware architecture linting decision*
  — strategy / decision memo only; no
  implementation.
- **CapabilityContract publication surfacing
  (P1.1 capability-contract-publications
  slice).** ✅ Shipped. **Thirty-fifth slice
  on the capability-ontology track.** Product
  capability batch. Architecture summary +
  agent contract publishers now render a
  read-only **Capability Contracts** section
  sourced from the latest `CapabilityContract`.
  New pure helper
  `buildCapabilityContractPublicationSection`
  in `@rekon/capability-docs`. Publisher
  manifest extended: `consumes:
  CapabilityContract` + new
  `capability-contract.changed` invalidation
  rule. New `Do Not Do` reminder: *"Do not
  treat CapabilityContract publication
  surfacing as architecture linting, resolver
  routing, verification planning, finding
  resolution, RefactorPreservationContract,
  or source-write permission."* **Read-only:**
  publications never run `rekon capability
  contract generate`, never mutate the
  contract or
  `.rekon/capability-contracts.json`, never
  mutate `CapabilityMap`,
  `CapabilityPhraseReport`, or
  `EvidenceGraph`, and never enforce policy.
  Proof report surfacing remains explicitly
  **deferred**. New 19-assertion contract
  test + 11-assertion docs test. Review packet
  `.rekon-dev/review-packets/capability-contract-publications.md`.
  **No new permission. No new artifact type.
  No CapabilityContract mutation. No config
  mutation. No npm publish. No version bump.**
  **Recommended next slice:**
  *CapabilityContract publication safety
  review.*
- **CapabilityContract v1 safety review
  (P1.1 capability-contract-v1-safety-review
  slice).** ✅ Shipped. **Thirty-fourth
  slice on the capability-ontology
  track.** Strategy / safety-review batch.
  Read-only end-to-end audit of the v1
  artifact, helper, validator, config
  model, and CLI shipped at `63e7b71`.
  **Recommendation: declare v1 safe /
  stable as an artifact-backed policy
  layer.** All seven required boundary
  statements asserted (CapabilityContract
  is policy, not projection;
  CapabilityMap v2 remains projection;
  configured + unmatched rows only;
  suggested reserved; no architecture
  linting / resolver routing /
  verification planning / source writes /
  RefactorPreservationContract; next
  slice may surface CapabilityContract in
  publications but must not create
  enforcement). Four options evaluated;
  publication surfacing selected as next
  slice (read-only visibility in
  architecture summary + agent contract,
  same model as CapabilityMap v2
  publication safety review).
  Enforcement consumers (architecture
  linting, resolver routing,
  verification planning, source writes,
  RefactorPreservationContract) remain
  deferred and gated on their own
  decision + safety review pairs. New
  strategy memo
  [`docs/strategy/capability-contract-v1-safety-review.md`](capability-contract-v1-safety-review.md).
  New 13-assertion docs test. Review
  packet
  `.rekon-dev/review-packets/capability-contract-v1-safety-review.md`.
  **No runtime behavior changes. No
  source files under `packages/`
  modified. No publication surface
  modified. No CapabilityMap mutation.
  No CapabilityPhraseReport mutation.
  No `.rekon/capability-contracts.json`
  mutation. No npm publish. No version
  bump.** **Recommended next slice:**
  *CapabilityContract publication
  surfacing* — read-only visibility in
  architecture summary + agent contract,
  carrying the boundary statement
  verbatim, with no enforcement consumer.
- **CapabilityContract v1 implementation
  (P1.1 capability-contract-v1
  slice).** ✅ Shipped. **Thirty-third
  slice on the capability-ontology
  track.** Registers `CapabilityContract`
  as a typed artifact in
  `@rekon/kernel-repo-model` (types +
  `createCapabilityContract` +
  `validateCapabilityContract` +
  `assertCapabilityContract` +
  `capabilityContractSchema`), in the
  SDK `BUILT_IN_ARTIFACT_TYPES`, and in
  the runtime `ARTIFACT_CATEGORY_BY_TYPE`
  map (category `actions`). Ships
  `buildCapabilityContract` in
  `@rekon/capability-model` plus the
  `rekon capability contract generate
  [--root <path>] [--json]
  [--capability-map <id|type:id>]` CLI.
  Reads the latest (or specified)
  `CapabilityMap` v2 + optional
  `.rekon/capability-contracts.json` and
  emits the effective contract artifact.
  V1 emits **`configured`** +
  **`unmatched`** rows only; `suggested`
  reserved for future. Match is
  conjunctive (`verb` + `noun`
  required; `domain` / `pattern` /
  `layer` checked when populated);
  most-specific match wins; ties break
  by phrase-backed id asc. Citation
  chain (`CapabilityContract` →
  `CapabilityMap` → `CapabilityPhrase`
  → `EvidenceGraph`) preserved on
  every configured row. **Diagnostic
  only — no architecture linting, no
  resolver routing by capability, no
  verification planning by capability,
  no source mutation, no config
  mutation.** No publication surfacing
  yet. New artifact reference
  [`docs/artifacts/capability-contract.md`](../artifacts/capability-contract.md)
  + concept doc
  [`docs/concepts/capability-contracts.md`](../concepts/capability-contracts.md).
  20-assertion contract test +
  21-assertion docs test. Review packet
  `.rekon-dev/review-packets/capability-contract-v1.md`.
  **No CapabilityMap mutation. No
  CapabilityPhraseReport mutation. No
  source mutation. No config mutation.
  No npm publish. No version bump.**
  **Recommended next slice:**
  *CapabilityContract v1 safety review*
  — confirm the new producer + validator
  + CLI surface meet the same bar as
  prior projection-layer safety reviews
  before publication-surfacing decisions
  can land.
- **CapabilityContract Architecture
  Decision (P1.1
  capability-contract-architecture-decision
  slice).** ✅ Shipped.
  **Thirty-second slice on the
  capability-ontology track.**
  Strategy / architecture decision
  / docs / tests-only batch.
  Commits Rekon to Option B
  (config + artifact effective
  contract): operator config at
  `.rekon/capability-contracts.json`
  expresses policy; Rekon emits a
  `CapabilityContract` artifact
  citing the latest `CapabilityMap`
  v2. All seven required boundary
  statements asserted (policy not
  projection; CapabilityMap v2
  remains projection; not
  architecture linting; not
  resolver routing; not
  verification planning; not source
  writes; RefactorPreservationContract
  remains phase-specific). Five
  options evaluated; B selected.
  V1 emits `configured` +
  `unmatched` rows only;
  `suggested` deferred. All future
  consumers deferred until the
  contract artifact exists and
  passes safety review. New
  strategy memo
  [`docs/strategy/capability-contract-architecture-decision.md`](capability-contract-architecture-decision.md).
  New 16-assertion docs test +
  review packet. **No
  implementation. No artifact /
  type / helper. No CapabilityMap
  mutation. No source writes. No
  npm publish.** **Recommended next
  slice:** *CapabilityContract v1
  implementation* — register the
  artifact type and ship a
  producer reading
  `.rekon/capability-contracts.json`
  + the latest CapabilityMap v2.
- **CapabilityMap v2 publication safety
  review (P1.1
  capability-map-v2-publication-safety-review
  slice).** ✅ Shipped.
  **Thirty-first slice on the
  capability-ontology track.**
  Strategy / safety review / docs
  / tests-only batch. Read-only
  audit of the publication
  surfacing committed by the
  thirtieth slice. **Recommendation:
  safe / stable as read-only
  visibility. No blockers.** Helper
  confirmed pure; both publishers
  strictly read-only; boundary
  statement always emitted;
  proof-report deferral preserved;
  agent contract Do Not Do reminder
  covers all five overclaim
  surfaces. All five required
  statements carry through
  (read-only visibility, projection
  context not CapabilityContract
  policy, no implication of
  routing / linting / verification /
  writes / resolution, proof report
  deferred, CapabilityContract
  decision may begin). Four options
  evaluated: declare surfacing
  safe / stable + CapabilityContract
  decision next (both selected);
  more publication polish first
  (deferred); resolver routing next
  (rejected). New strategy memo
  [`docs/strategy/capability-map-v2-publication-safety-review.md`](capability-map-v2-publication-safety-review.md).
  New 13-assertion docs test +
  review packet. **No runtime
  changes. No publisher mutation.
  No CapabilityContract introduced.
  No source writes. No npm
  publish.** **Recommended next
  slice:** *CapabilityContract
  architecture decision* —
  strategy / decision memo only.
- **CapabilityMap v2 publication
  surfacing (P1.1
  capability-map-v2-publications
  slice).** ✅ Shipped.
  **Thirtieth slice on the
  capability-ontology track.**
  Product / capability batch.
  Architecture summary and agent
  contract publications now
  render the additive
  `phraseBackedCapabilities` /
  `phraseBackedSummary` /
  `phraseSourceRef` projection as
  operator + agent context. New
  `buildCapabilityMapV2PublicationSection`
  helper in `@rekon/capability-docs`,
  structurally typed
  (CapabilityMapV2Like), pure
  function. Architecture summary
  renders `## CapabilityMap v2
  Phrase-Backed Capabilities`;
  agent contract renders
  `### CapabilityMap v2
  Phrase-Backed Capabilities`.
  Both surfaces emit the same
  boundary statement (*projection
  context, not CapabilityContract
  policy; does not imply
  placement / ownership / routing
  / linting / verification /
  source-write authority*) plus a
  proof-report-deferral line.
  Agent contract `Do Not Do` list
  extended with a v2-specific
  reminder. Proof report
  surfacing explicitly deferred.
  New 16-assertion contract test +
  9-assertion docs test. Review
  packet
  `.rekon-dev/review-packets/capability-map-v2-publications.md`.
  **No runtime changes outside
  the publication helper. No
  CapabilityMap mutation. No
  CapabilityContract. No source
  writes. No npm publish.**
  **Recommended next slice:**
  *CapabilityMap v2 publication
  safety review* — read-only
  audit of the publication
  surfacing.
- **CapabilityMap v2 safety review
  (P1.1
  capability-map-v2-safety-review
  slice).** ✅ Shipped.
  **Twenty-ninth slice on the
  capability-ontology track.**
  Strategy / safety review / docs
  / tests-only batch. Read-only
  audit of the additive
  `phraseBackedCapabilities` /
  `phraseBackedSummary` /
  `phraseSourceRef` projection
  committed by the twenty-eighth
  slice. **Recommendation: v2
  safe / stable as additive
  high-confidence projection. No
  blockers.** Projection path
  walked end-to-end; eligibility
  filter enforced at three layers
  (helper guard, validator guard,
  TypeScript literal types);
  citation chain complete and
  walkable; freshness model
  sufficient; v1 `entries[]`
  compatibility preserved;
  projection vs policy boundary
  preserved; no source writes.
  All five required statements
  carry through (additive,
  consumes phrase report not raw
  normalization rows, partial
  phrases excluded, not
  `CapabilityContract`, no policy
  / routing / linting / writes).
  Five options evaluated:
  publication surfacing selected
  next; `CapabilityContract`
  deferred; resolver routing
  deferred. New strategy memo
  [`docs/strategy/capability-map-v2-safety-review.md`](capability-map-v2-safety-review.md).
  New 14-assertion docs test +
  review packet. **No runtime
  changes. No `CapabilityMap`
  mutation. No
  `CapabilityContract`. No
  source writes. No npm
  publish.** **Recommended next
  slice:** *`CapabilityMap` v2
  publication surfacing* —
  extend
  `@rekon/capability-docs` with
  a `buildCapabilityMapV2PublicationSection`
  helper, wire it into the
  architecture summary + agent
  contract publishers, contract
  + docs tests, cite this
  safety review as the gate.
- **CapabilityMap v2 high-confidence-
  only implementation (P1.1
  capability-map-v2-high-confidence-implementation
  slice).** ✅ Shipped.
  **Twenty-eighth slice on the
  capability-ontology track.**
  Product / capability batch.
  Implements the additive v2
  projection committed to by the
  twenty-seventh slice's decision
  memo. `@rekon/kernel-repo-model`
  `CapabilityMap` type gains three
  optional fields:
  `phraseBackedCapabilities` /
  `phraseBackedSummary` /
  `phraseSourceRef`. v1
  `entries[]` is unchanged.
  `@rekon/capability-model`
  projector reads the latest
  `CapabilityPhraseReport` (when
  present) and emits the additive
  v2 fields after applying the
  conjunctive eligibility filter
  (status stable + confidence high
  + non-empty verb + noun +
  evidenceRefs + sourceCandidateIds).
  New manifest invalidation rule
  `capability-phrases.changed`. New
  artifact reference doc
  [`docs/artifacts/capability-map.md`](../artifacts/capability-map.md).
  New 19-assertion contract test +
  11-assertion docs test. Review
  packet
  `.rekon-dev/review-packets/capability-map-v2-high-confidence-implementation.md`.
  All six decision-memo pins carry
  through unchanged. **No
  `EvidenceGraph` /
  `CapabilityNormalizationReport` /
  `CapabilityPhraseReport`
  mutation. No partial-phrase
  consumption. No
  `CapabilityContract`. No source
  writes. No LLM-only inference.
  No npm publish. No version
  bump.** **Recommended next
  slice:** *`CapabilityMap` v2
  high-confidence-only safety
  review* — read-only audit of the
  additive projection.
- **CapabilityMap v2 high-confidence-
  only decision (P1.1
  capability-map-v2-high-confidence-decision
  slice).** ✅ Shipped.
  **Twenty-seventh slice on the
  capability-ontology track.**
  Strategy / architecture / docs /
  tests-only batch. Commits Rekon
  to an **additive**
  `CapabilityMap` v2 projection
  consuming **only stable
  high-confidence**
  `CapabilityPhraseReport` claims.
  Option B (additive stable-
  phrase-backed v2) selected;
  section name
  `phraseBackedCapabilities`;
  conjunctive eligibility filter
  (status stable + confidence
  high + evidenceRefs +
  sourceCandidateIds +
  canonical-vocabulary lookup);
  freshness via
  `capability-phrases.changed`
  invalidation rule (reserved
  for the implementation slice).
  `CapabilityContract` boundary
  explicitly pinned (read-only
  projection, not policy).
  Documentation gap noted:
  `docs/artifacts/capability-map.md`
  is created in the
  implementation slice. New
  strategy memo
  [`docs/strategy/capability-map-v2-high-confidence-decision.md`](capability-map-v2-high-confidence-decision.md)
  with 11 required headings +
  4 required tables. New
  16-assertion docs test.
  Review packet
  `.rekon-dev/review-packets/capability-map-v2-high-confidence-decision.md`.
  **Recommended next slice:**
  *`CapabilityMap` v2
  high-confidence-only
  implementation.*
- **Post-AST cohort re-run (P1.1
  post-ast-cohort-rerun
  slice).** ✅ Shipped.
  **Twenty-sixth slice on the
  capability-ontology track.**
  Strategy / dogfood-analysis /
  docs / tests-only batch. Fifth
  coverage review on the phrase
  track. Real-repo measurement on
  `target-1` and `target-2` with
  anonymized labels only.
  Headline: target-1 16 → 37
  stable phrases (+131.3%, 2.3×
  lift) with textbook verb:noun
  pairs (`get:response`,
  `build:plan`, `get:schema`,
  `get:session`, `save:response`,
  `build:report`); target-2
  neutral (2 → 2, no
  regression). Readiness gate
  accepts narrower evidence;
  **`CapabilityMap` v2
  high-confidence-only decision
  memo becomes the primary next
  slice.** New strategy memo
  [`docs/strategy/post-ast-cohort-rerun.md`](post-ast-cohort-rerun.md)
  with 15 required headings +
  7 required tables. New
  15-assertion docs test. Review
  packet
  `.rekon-dev/review-packets/post-ast-cohort-rerun.md`.
  **Recommended next slice:**
  *`CapabilityMap` v2
  high-confidence-only decision
  memo.*
- **Post-AST CapabilityPhraseReport
  Coverage Review (P1.1
  post-ast-capability-phrase-coverage-review
  slice).** ✅ Shipped.
  **Twenty-fifth slice on the
  capability-ontology track.**
  Strategy / dogfood-analysis /
  docs / tests-only batch. Fourth
  coverage review on the phrase
  track. Measured AST extraction's
  impact on
  `CapabilityNormalizationReport`
  candidate quality and
  `CapabilityPhraseReport` stable
  phrase density on available
  targets (AST fixture +
  `simple-js-ts`). Headline:
  AST-rich fixture produced 6
  stable phrases (`create:user`,
  `fetch:user`, `handle:request`)
  on 66 candidates;
  `simple-js-ts` unchanged from
  pre-AST baseline (expected for
  single-file fixture);
  `target-1` and `target-2`
  unavailable in the review
  session. Seven readiness gates
  evaluated; six pass; the
  "consistent across more than
  one real repo" gate fails.
  **`CapabilityMap` v2 design
  remains deferred** — narrower
  evidence accepted; the primary
  next slice is the post-AST
  cohort re-run (intake request
  issued inside the memo). New
  strategy memo
  [`docs/strategy/post-ast-capability-phrase-coverage-review.md`](post-ast-capability-phrase-coverage-review.md)
  with 11 required headings + 7
  required tables. New
  15-assertion docs test. Review
  packet
  `.rekon-dev/review-packets/post-ast-capability-phrase-coverage-review.md`.
  **Recommended next slice:**
  *Post-AST cohort re-run.*
- **JS/TS AST EvidenceGraph Provider
  v1 (P1.1
  js-ts-ast-evidence-provider-v1
  slice).** ✅ Shipped.
  **Twenty-fourth slice on the
  capability-ontology track.**
  Product capability batch.
  Runtime implementation of the
  AST adapter decision. Upgrades
  `@rekon/capability-js-ts` so JS
  / TS evidence extraction uses
  the **TypeScript compiler parser
  API** as primary; regex stays
  as **labelled fallback only**.
  AST facts carry
  `extractionMethod: "ast"`,
  `language`, `syntaxKind`,
  `symbolKind` / `exportKind` /
  `importKind`, `location` (on
  imports), and `confidence:
  "high"`. New `ast-extractor.ts`
  module (parser-only). New
  `typescript: ^5.4.5` dependency
  on `@rekon/capability-js-ts`.
  Construct coverage: function /
  class / method / arrow /
  function-expression / interface
  / type alias / enum / object /
  named / default / re-export /
  type-only / namespace /
  side-effect import. Call graph,
  type resolution, symbol
  references, inferred return
  types, side-effect analysis,
  JSX component tree, test-to-
  source map, schema inference
  all deferred. **No
  `EvidenceGraph` schema
  mutation. No
  `CapabilityNormalizationReport`
  mutation. No
  `CapabilityPhraseReport`
  mutation. No `CapabilityMap`
  mutation. No new fact kinds.
  No new artifact registration.
  No new CLI command. No source
  writes. No LLM-only inference.
  No typechecker dependency. No
  npm publish. No version bump.
  No git tag. No GitHub Release.
  No new branch.** New 7-file
  fixture
  `tests/fixtures/js-ts-ast-evidence/`.
  New 25-assertion contract test.
  New 9-assertion docs test.
  Review packet
  `.rekon-dev/review-packets/js-ts-ast-evidence-provider-v1.md`.
  **Recommended next slice:**
  *Post-AST CapabilityPhraseReport
  Coverage Review.*
- **JS/TS AST Evidence Adapter
  Decision (P1.1
  js-ts-ast-evidence-adapter-decision
  slice).** ✅ Shipped.
  **Twenty-third slice on the
  capability-ontology track.**
  Strategy / architecture / docs /
  tests-only batch. Follows the
  Classic Scanner/Ontology Parity
  Audit and commits Rekon to
  upgrading JS/TS evidence
  extraction from regex-only to
  AST-backed, using the
  **TypeScript compiler parser
  API**, **parser-only in v1** (no
  typechecker semantics). Regex
  remains in place as **fallback
  only**. **Pinned verbatim:**
  *JS/TS AST extraction should be
  primary where available.* *Regex
  extraction is fallback only.*
  *The selected parser is the
  TypeScript compiler parser API.*
  *V1 is parser-only; typechecker
  semantics are deferred.* *AST
  facts use `extractionMethod:
  "ast"`.* *Fallback facts use
  `extractionMethod:
  "regex-fallback"`.* *Call graph
  is deferred.* *`EvidenceGraph`
  remains the repo-agnostic
  protocol.* *AST v1 should
  improve `CapabilityNormalizationReport`
  candidate quality.* *AST v1
  should improve
  `CapabilityPhraseReport` stable
  phrase density.* *AST v1 does
  not mutate `CapabilityMap`.*
  Existing `EvidenceGraph` fact
  kinds (`symbol`, `export`,
  `import`) remain unchanged; AST
  v1 enriches `value` payloads
  with additive optional fields
  (`extractionMethod`, `language`,
  `syntaxKind`, `symbolKind`,
  `exportKind`, `importKind`,
  `location`, `confidence`).
  Construct coverage in v1:
  function / class / method /
  arrow / interface / type alias /
  enum / named / default / re-
  export / type-only / namespace
  / side-effect. Call graph, type
  resolution, symbol references,
  inferred return types, side-
  effect analysis, JSX component
  tree, test-to-source map,
  schema inference are deferred.
  **No runtime change. No
  `@rekon/capability-js-ts`
  runtime behavior change. No
  `EvidenceGraph` schema
  mutation beyond documenting
  proposed additive fields. No
  `CapabilityNormalizationReport`
  mutation. No
  `CapabilityPhraseReport`
  mutation. No `CapabilityMap`
  mutation. No new artifact
  registration. No new CLI
  command. No source writes. No
  LLM-only inference. No
  typechecker dependency. No npm
  publish. No version bump. No
  git tag. No GitHub Release. No
  new branch.** New strategy memo
  [`docs/strategy/js-ts-ast-evidence-adapter-decision.md`](js-ts-ast-evidence-adapter-decision.md)
  with 14 required headings + 3
  required tables (option /
  construct coverage / fallback).
  New 18-assertion docs test
  `tests/docs/js-ts-ast-evidence-adapter-decision.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/js-ts-ast-evidence-adapter-decision.md`.
  **Recommended next slice:**
  *JS/TS AST EvidenceGraph
  Provider v1* — runtime
  implementation in
  `@rekon/capability-js-ts`.
- **Classic scanner / ontology
  parity audit (P1.1
  classic-scanner-ontology-parity-audit
  slice).** ✅ Shipped.
  **Twenty-second slice on the
  capability-ontology track.**
  Strategy / architecture / docs /
  tests-only batch. Reverses the
  recent posture of solving the
  ontology / scanner problem from
  scratch and treats
  `codebase-intel-classic` as
  **design prior art** per
  [ADR 0004](../adr/0004-codebase-intel-classic-is-reference-not-dependency.md)
  (reference, not dependency). Maps
  classic's scanner pipeline
  (source scan → AST parse →
  `ExtractedName` → `SplitName` →
  taxonomy discovery → hierarchy →
  runtime normalization →
  `GraphOntologyValidator`) and
  ontology / taxonomy pipeline
  (`lib/verb-rules.ts` /
  `lib/noun-rules.ts` /
  `domain/ontology/mergeOntology.ts`
  / `infra/repositories/TaxonomyRepository.ts`)
  against Rekon's current
  `EvidenceGraph` /
  `CapabilityNormalizationReport`
  / `CapabilityPhraseReport`
  pipeline. **Pinned verbatim:**
  *codebase-intel is design prior
  art.* *JS/TS AST extraction
  should be primary where
  available.* *Regex extraction is
  fallback, not primary, for
  JS/TS.* *`EvidenceGraph` remains
  the repo-agnostic protocol.*
  *`GraphOntologyValidator` should
  not be ported wholesale.*
  *Classic taxonomy extraction /
  split / discovery / normalization
  should be adapted.*
  *`CapabilityMap` v2 should wait
  until post-AST coverage is
  measured.* Parity matrix
  decisions: `ExtractedName` /
  `SplitName` → adapt (needs AST
  extraction to be strong);
  taxonomy discovery → adapt
  (deferred artifact); verb /
  noun aliases → repeat (shipped);
  base + workspace ontology merge
  → repeat (shipped);
  `synonymsApplied` → adapt
  (per-candidate shipped; aggregate
  is a future polish);
  `GraphOntologyValidator`
  monolith → reject wholesale (per
  the lite audit); AST-backed
  scanner → adapt (the next
  product slice);
  `TaxonomyRepository` standalone
  persistence layer → reject
  (artifact store already covers
  persistence). **No runtime
  change. No `CapabilityMap`
  mutation. No
  `CapabilityPhraseReport` shape
  change. No
  `CapabilityNormalizationReport`
  semantics change. No
  `EvidenceGraph` mutation. No
  phrase projection rule change.
  No canon-pack change. No
  splitter change. No new artifact
  registration. No new CLI
  command. No source writes. No
  LLM-only inference. No npm
  publish. No version bump. No
  git tag. No GitHub Release. No
  new branch.** New strategy memo
  [`docs/strategy/classic-scanner-ontology-parity-audit.md`](classic-scanner-ontology-parity-audit.md)
  with 15 required headings + 3
  required tables (classic method /
  scanner parity / next-step
  decision). New 13-assertion docs
  test
  `tests/docs/classic-scanner-ontology-parity-audit.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/classic-scanner-ontology-parity-audit.md`.
  **Recommended next slice:**
  *JS/TS AST Evidence Adapter
  Decision* — strategy memo that
  picks a parser (TypeScript
  compiler API, ts-morph, swc, or
  alternative); defines emitted
  `EvidenceGraph` fact shapes
  (likely extending `export` /
  `symbol` / `import` with
  `function-signature` /
  `class-member` / `type-alias`
  / `enum-member`); pins fallback
  behaviour for non-JS/TS targets
  and AST-unavailable
  environments (regex stays
  available as fallback); pins
  per-fact confidence metadata;
  lists test fixtures; pins **no
  source writes**, **no LLM-only
  inference**, **no type-checker
  dependency in v1**; pins
  **AST adapter is the primary
  JS/TS scanner where available;
  regex is fallback**.
- **Capability ontology architecture
  impact review (P1.1
  capability-ontology-architecture-impact-review
  slice).** ✅ Shipped. **First slice
  on the capability-ontology track.**
  Strategy / architecture / docs /
  tests-only batch. Maps the blast
  radius of a future ontology /
  translation layer across every Rekon
  surface. Pins **eight architectural
  decisions** (ontology still needed;
  must not be monolithic; raw
  evidence remains separate from
  normalized purpose; normalization
  decisions need an audit artifact;
  `CapabilityMap` eventually consumes
  normalized claims;
  `RefactorPreservationContract`
  depends on the layer; LLM-only
  normalization not acceptable as
  truth; unknown verbs / nouns must
  surface to operators). Establishes
  the **five-layer boundary**
  (`EvidenceGraph` → `CapabilityOntology`
  → `CapabilityNormalizationReport`
  → `CapabilityMap` →
  `RefactorPreservationContract`).
  Reserves three names; registers
  none. No port of the classic
  `GraphOntologyValidator` monolith.
  No runtime change. See
  [`docs/strategy/capability-ontology-architecture-impact-review.md`](capability-ontology-architecture-impact-review.md).
  **Recommended next slice:**
  capability ontology translation
  layer decision memo.
- **Reconciliation exact-diff operation
  v1 (P1.1
  reconciliation-exact-diff-operation-v1
  slice).** ✅ Shipped. **First
  reconciliation implementation slice
  after the Plan-Generator Diff Data
  Discovery memo's recommended next
  step.** Adds the new
  `exact_text_replacement` operation
  kind to `ReconciliationOperation` plus
  optional additive `beforeText` /
  `afterText` / `diffKind` fields on
  `CoherencyRemediationStep`,
  `RemediationItemLike`, and
  `ReconciliationPlanOperation`. The
  classifier emits patch fields only
  when an **eight-precondition safety
  gate** passes (patch triple non-empty,
  recognized `diffKind`, `repoRoot`
  supplied, single repo-relative path,
  current file exists + matches
  `beforeText`, `afterText` differs).
  Any failing check silently drops the
  patch fields. Reconciliation Preview
  v1 now renders a **real unified diff**
  against a real generator output via
  its existing forward-compatible diff
  branch. **Source-write apply remains
  unavailable.** `source:write`
  permission still unregistered.
  `ReconciliationApplyReport` still
  unregistered. `ReconciliationPreviewReport`
  still unregistered (gating condition
  #1 now satisfied; reservation still
  stands since *at least two* signals
  must fire). New 13-assertion contract
  test + 7-assertion docs test. Pinned
  verbatim: *Source-write apply remains
  unavailable.* / *Exact diff is
  generated only when deterministic.* /
  *Previewable diff does not resolve
  findings.* **Recommended next slice:**
  exact-diff operation safety review.
- **Plan-generator diff data discovery
  (P1.1
  plan-generator-diff-data-discovery
  slice).** ✅ Shipped. **First
  reconciliation slice after the
  deliberate pause point pinned by the
  ReconciliationPreviewReport artifact
  decision.** Strategy /
  product-discovery / docs / tests-only
  batch. Inspects current plan
  generation paths (`runLegacyMode` +
  `runSuggestionMode`) and the
  `classifyRemediationItem` mapping.
  **Finding:** no current plan
  generator emits exact `beforeText` /
  `afterText`. **Recommendation:** do
  NOT register
  `ReconciliationPreviewReport` yet;
  schedule the next slice as **narrow
  `ReconciliationPlan` exact-diff
  operation v1** — pick one
  deterministic operation class, emit
  exact patch text, keep source-write
  apply unavailable. Fallback memo
  ready if operation-class pick is
  blocked. Pinned verbatim:
  *Source-write apply remains
  unavailable.* / *ReconciliationPreviewReport
  remains unregistered.* See
  [`docs/strategy/plan-generator-diff-data-discovery.md`](plan-generator-diff-data-discovery.md).
- **ReconciliationPreviewReport artifact
  decision (P1.1
  reconciliation-preview-report-artifact-decision
  slice).** ✅ Shipped. **First decision
  slice after the Reconciliation Preview
  v1 shipment.** Records **Option A —
  reserve the `ReconciliationPreviewReport`
  artifact name; defer registration.** No
  artifact type, validator, writer, or
  category lands. v1 preview helper + CLI
  continue to write no artifacts. Future
  registration is gated on at least two
  of four named product signals
  (forward-compat plan-generator diff
  data, a queued / shipped source-write
  apply slice, a publication / review
  surface that needs preview content
  inline, or operator cohort feedback
  explicitly asking for persistence). New
  strategy memo at
  [`docs/strategy/reconciliation-preview-report-artifact-decision.md`](reconciliation-preview-report-artifact-decision.md).
  Pinned verbatim:
  *ReconciliationPreviewReport is not
  registered as a Rekon artifact in this
  slice.* / *The artifact name
  `ReconciliationPreviewReport` is
  reserved.* / *No
  `ReconciliationPreviewReport`
  validator, writer, or category is
  added.* / *Reconciliation Preview v1
  remains a read-only, in-memory
  projection of `ReconciliationPlan`.* /
  *Source-write apply remains
  unavailable.* **Recommended next
  slice:** any of plan-generator diff
  data / apply permission + rollback
  design memo / publication that
  consumes preview content / operator
  cohort onboarding — whichever product
  signal arrives first. The
  reconciliation track is now at a
  deliberate pause point.
- **Reconciliation preview v1 (P1.1
  reconciliation-preview-v1 slice).** ✅
  Shipped. **First product capability
  batch after the private-beta
  operator-support track.** Adds the
  read-only `rekon reconcile preview
  --plan <id> [--json]` CLI + pure
  `buildReconciliationPreview` helper in
  `@rekon/capability-reconcile` that
  projects a `ReconciliationPlan` into
  five preview kinds (`artifact-only`,
  `source-patch`, `generated-file`,
  `manual`, `not-previewable`) with four
  risk bands (`low`/`medium`/`high`/
  `unknown`). Forward-compatible
  unified-diff path emits a diff only
  when operations carry `beforeText` +
  `afterText` and the current file
  matches; v1 plans carry no diff
  fields, so v1 emits no diffs through
  normal flow. **Source-write apply is
  not available.** **`ReconciliationApplyReport`
  artifact + `source:write` permission
  + `rekon reconcile apply` command —
  all still deferred and unchanged.**
  New concept doc + strategy memo
  pinning *"Exact diff preview is
  mandatory before any apply
  implementation."* and *"The preview
  does not resolve findings."* New
  contract test (13 assertions) + docs
  test (8 assertions). **Recommended
  next slice:** *ReconciliationPreviewReport
  artifact decision.*
- **Private beta onboarding quickstart
  refinements v2 (P1.1
  private-beta-onboarding-quickstart-refinements-v2
  slice).** ✅ Shipped. **Fourth
  post-track operator-support slice**
  following the onboarding validation
  report. Docs / support / tests-only
  batch. Closes the two documentation
  gaps surfaced by the validation run:
  (1) *Three Freshness Surfaces
  Operators Confuse* subsection inside
  *Run Path Freshness* with a diagnostic
  table covering `artifacts validate` vs
  `artifacts freshness` (historical
  `newer-input-exists` after
  re-publication is acceptable) vs
  `paths freshness` (working-tree
  freshness) + three rules of thumb;
  (2) *Inspect The Plan Before
  Executing* subsection inside *Optional
  Verification Flow* covering common
  package managers (npm / pnpm / yarn /
  bun / turbo / nx / make), the
  dry-run-first flow, and
  package-manager mismatch as a
  planning / ergonomics report.
  Playbook *Acceptable First-Class
  Outcomes* extended; bug-report template
  gains package-manager + scripts +
  artifacts-freshness +
  VerificationPlan↔package-manager-match
  fields. Validation report's
  *Follow-Up Work* updated to record
  the gaps were closed. Pinned
  verbatim: *`artifacts validate` is
  the structural artifact validity
  gate.*, *`artifacts freshness` can
  report historical `newer-input-exists`
  entries after re-publication ...*,
  *`paths freshness` is working-tree
  freshness and is separate from
  artifact lineage freshness.*
  **Recommended next slice:** private
  beta cohort onboarding plan.
- **Private beta onboarding validation run
  (P1.1
  private-beta-onboarding-validation-run
  slice — post-intake completion).** ✅
  Shipped. **Outcome:
  `pass-with-known-limitations`.** The
  operator authorised a target in a
  subsequent prompt; the prior
  intake-blocked posture was resolved
  and the full validation ran end-to-end
  against a temp copy of one non-Rekon
  Next.js target. Quickstart followed
  verbatim; 22 of 25 commands returned
  `pass`; 3 verification commands
  recorded `failed` honestly (target uses
  `pnpm-workspace`, install was
  deliberately not run in the temp copy
  — first-class acceptable outcome);
  both GitHub dry-runs made zero HTTP
  calls; path freshness `unknown` →
  `fresh` (295 / 295) as documented. New
  canonical
  [`docs/beta/private-beta-onboarding-validation-report.md`](../beta/private-beta-onboarding-validation-report.md).
  Two minor documentation refinements
  surfaced (non-npm package managers in
  *Optional Verification Flow* +
  historical `newer-input-exists` after
  re-publication in *Inspect The Main
  Outputs*); zero blockers.
  **Recommended next slice:** private
  beta onboarding quickstart refinements
  v2.
- **Private beta onboarding validation run
  (P1.1
  private-beta-onboarding-validation-run
  slice).** ✅ Shipped (intake-blocked).
  **Third post-track operator-support slice**
  following the private beta onboarding
  quickstart. **Outcome:** `intake-blocked`
  — the work order requires one
  operator-supplied non-Rekon target repo +
  four other intake fields, none of which
  were supplied. Per the work order's
  explicit stop condition, this batch ships
  the short intake request memo at
  [`docs/beta/private-beta-onboarding-validation-intake-request.md`](../beta/private-beta-onboarding-validation-intake-request.md)
  instead of the full validation report. The
  memo carries the five required intake
  fields, operator selection guidance,
  anonymization posture, what-happens-next,
  and the pre-validation gate results on
  commit `8771cf5`. All 9 pre-validation
  commands passed before the memo was
  written. Required verbatim pins (asserted
  by the docs test): *"This batch does not
  publish to npm."*, *"This batch does not
  change package versions."*, *"This batch
  does not create a git tag."*, *"This batch
  does not create a GitHub Release."*, *"The
  validation run, when executed, used a temp
  copy of a non-Rekon repository."*, *"Rekon
  artifacts remain canonical; GitHub
  dry-runs are downstream previews."*
  **Next slice (blocking):** operator
  answers the intake questionnaire so the
  post-intake validation run can produce
  the canonical
  `docs/beta/private-beta-onboarding-validation-report.md`.
- **Private beta onboarding quickstart (P1.1
  private-beta-onboarding-quickstart slice).**
  ✅ Shipped. **Second post-track
  operator-support slice** following the
  private beta support playbook. Distills the
  playbook into a concise "start here" path
  for new operators: install from source
  checkout (`git clone` + `npm ci` + `npm run
  build`), pick a target repo (clone into a
  `mktemp -d` temp copy via `git clone --local
  --no-hardlinks`, `rsync` fallback), run the
  first-scan matrix (`init` → `refresh` →
  `paths freshness` → `artifacts validate`),
  walk the findings + governance chain,
  inspect publications, run path freshness,
  optional verification + GitHub review
  dry-runs, recognise first-class outcomes
  vs. blockers, redact before sharing, plan
  the next step. New
  [`docs/beta/private-beta-onboarding-quickstart.md`](../beta/private-beta-onboarding-quickstart.md).
  Pinned verbatim: *"Private beta users
  should not install Rekon from npm."*,
  *"Private beta is source-checkout based."*,
  *"Rekon artifacts are canonical; GitHub
  Checks and PR comments are downstream
  review surfaces."*, *"Run first scans
  against a temp copy so Rekon artifacts and
  any target-side build / test artifacts do
  not pollute the committed repo."*,
  *"Artifact lineage freshness is not
  working-tree freshness."*, *"Dry-run
  commands make no network calls."*, *"GitHub
  status and comments are not canonical
  truth; Rekon artifacts remain canonical."*
  Opening blockquote pins the playbook as
  canonical and *"playbook wins"* on any
  conflict. **Recommended next slice:**
  private beta onboarding validation run.
- **Private beta support playbook (P1.1
  private-beta-support-playbook slice).** ✅
  Shipped. **First post-track operator-support
  slice** after the path-freshness safety
  review. Converts the now-stable no-NPM
  private-beta posture (verification + GitHub
  review surfaces + path freshness) into a
  repeatable operator support process:
  source-checkout install, command matrix,
  artifact-sharing policy with explicit
  redaction guidance, blocker taxonomy vs
  acceptable first-class outcomes,
  path-freshness rerun guidance, GitHub review
  surface guidance. New
  [`docs/beta/private-beta-support-playbook.md`](../beta/private-beta-support-playbook.md)
  + new
  [`docs/beta/private-beta-bug-report-template.md`](../beta/private-beta-bug-report-template.md).
  Pinned: npm install is not supported during
  beta; bug reports must include Rekon
  artifacts or explicit redacted substitutes;
  artifact validation failure is a blocker;
  findings / failed verification / stale
  aggregate freshness / GitHub readiness gaps
  are NOT automatically blockers. **Followed
  up by:** private beta onboarding quickstart
  (✅ shipped above).
- **Path freshness safety review (P1.1
  path-freshness-safety-review slice).** ✅
  Shipped. **Final slice in the post-beta
  watcher / path-freshness track.** Reviews
  every component end-to-end (artifact +
  fingerprint helper + CLI + publication
  surfacing + GitHub review surfacing +
  read-only guarantees + no-daemon policy +
  mtime/hash policy + Check conclusion
  policy). **Decision: the path freshness
  track is beta-private stable.** Required
  statements pinned verbatim: *"Artifact
  lineage freshness is not working-tree
  freshness." / "PathFreshnessReport is
  explicit and operator-triggered." / "No
  daemon or background refresh exists." /
  "Stale path freshness is a warning, not a
  GitHub Check conclusion override."* See
  [`docs/strategy/path-freshness-safety-review.md`](path-freshness-safety-review.md).
  **Recommended next slice:** private beta
  support playbook.
- **Path freshness GitHub review surfacing (P1.1
  path-freshness-github-review-surfacing
  slice).** ✅ Shipped. **Third watcher /
  path-freshness implementation slice**
  following publication surfacing. New helper
  `buildPathFreshnessGitHubSummary` in
  `@rekon/capability-docs`; wired into
  `buildGitHubCheckPayload` (Check
  `output.summary`) + `buildPrCommentBody` (PR
  comment summary table + warnings list). Both
  CLI flows (`publish github-check
  --dry-run`/`--send` and `publish pr-comment
  --dry-run`/`--send`) read the latest
  `PathFreshnessReport` and pass it through; both
  surfaces cite the report in `citedRefs`.
  **CONCLUSION POLICY (pinned this slice): stale
  `PathFreshnessReport` is a visible trust
  warning but does not by itself flip the GitHub
  Check conclusion.** Both flows are read-only
  with respect to the report. GitHub status /
  comments remain non-canonical. **Recommended
  next slice:** path freshness safety review.
- **Path freshness publication surfacing (P1.1
  path-freshness-publication-surfacing slice).**
  ✅ Shipped. **Second watcher / path-freshness
  implementation slice** following the
  PathFreshnessReport artefact slice. New helper
  `buildPathFreshnessPublicationSection` in
  `@rekon/capability-docs` renders a consistent
  `Working Tree Path Freshness` block; wired into
  architecture summary, agent contract, and proof
  report publishers. Agent contract gains a new
  `Do Not Do` reminder against treating artifact
  lineage freshness as proof the working tree has
  not changed. **Publications are read-only with
  respect to PathFreshnessReport; they never run
  `rekon paths freshness` and never run `rekon
  refresh`.** GitHub Check / PR comment dry-run
  surfacing **deferred** to the next slice
  ("path freshness GitHub review surfacing").
  See
  [`docs/concepts/path-freshness.md`](../concepts/path-freshness.md)
  + the publication doc updates for the rendered
  shape. **Recommended next slice:** path
  freshness GitHub review surfacing.
- **PathFreshnessReport artifact + source-state
  fingerprint skeleton (P1.1
  path-freshness-report slice).** ✅ Shipped.
  **First watcher / path-freshness
  implementation slice** selected by the
  post-beta dogfood evidence triage decision
  (Option C). New `PathFreshnessReport`
  artifact type + `buildSourceStateFingerprint`
  helper + `comparePathFreshness` comparator +
  `rekon paths freshness` CLI. **No daemon. No
  background refresh. No source mutation. No
  `ArtifactHeader` change. No new permission.
  Mtimes advisory only.** The CLI is read-only
  with respect to source; it writes exactly one
  diagnostic `PathFreshnessReport` per
  invocation and recommends `rekon refresh`
  when the working tree has drifted — but
  never spawns refresh itself. **Artifact
  lineage freshness is not working-tree
  freshness; both surfaces coexist.** See
  [`docs/artifacts/path-freshness-report.md`](../artifacts/path-freshness-report.md)
  and
  [`docs/concepts/path-freshness.md`](../concepts/path-freshness.md).
  **Recommended next slice:** path freshness
  publication surfacing — render the latest
  report in the architecture summary, agent
  contract, and (if useful) proof report +
  GitHub review dry-run payloads.
- **Post-beta dogfood evidence triage decision
  (P1.1 post-beta-dogfood-evidence-triage
  slice).** ✅ Shipped. **Strategy / docs /
  tests-only batch.** No runtime behaviour
  change. No schema change. No new permission,
  no new artifact type, no new CLI command,
  no workflow-template change, no validator
  profile change. No npm publish. No version
  bump. Reviewed cohort findings + the
  missing-script tolerance slice; selected the
  next post-beta track: **Option C — watcher /
  path freshness implementation, starting with
  the `PathFreshnessReport` artifact +
  source-state fingerprint skeleton.** Memo
  classifies every cohort observation as
  blocker / shipped polish / deferred post-beta
  track / by-design / not-a-defect. Source-write
  apply (Option B), rule breadth (Option D),
  memory maturity (Option E) remain queued but
  later in sequence; each still requires its
  own work order. See
  [`docs/strategy/post-beta-dogfood-evidence-triage.md`](post-beta-dogfood-evidence-triage.md).
  **Recommended next slice:**
  `PathFreshnessReport` artifact + source-state
  fingerprint skeleton.
- **VerificationPlan missing-script tolerance
  (P1.1 verification-missing-script-tolerance
  slice).** ✅ Shipped. **First post-beta polish
  slice** surfaced by the real-repo cohort.
  Runtime polish + tests + docs batch. **No
  schema change. No new permission. No new
  artifact type. No new CLI command. No
  workflow-template change. No npm publish.**
  Pre-flight detection in
  `executeVerificationRun`: `npm | pnpm | yarn
  run <script>` commands whose script is
  provably absent from the runner's
  `<cwd>/package.json` are recorded `skipped`
  (not `failed`) with a `missing-script: <name>`
  note and the package manager is never spawned.
  Aggregate run status follows the existing
  rules — `partial` for mixed pass + skip,
  `not-run` for all-skipped, `failed` only on
  true failure. New strategy memo at
  [`docs/strategy/verification-missing-script-tolerance.md`](verification-missing-script-tolerance.md).
  New helper `detectMissingScriptCommands` in
  `@rekon/capability-verify`. Conservative by
  construction: only the `pkgmgr run <name>`
  argv shape is inspected; only the cwd's
  `package.json` is read (no directory walk, no
  monorepo workspace resolution); missing /
  unreadable / malformed `package.json` falls
  through to the normal spawn path. Real-world
  impact on the cohort: structured-evals
  (missing `build`) and figma-ds (missing
  `test`) rows move from `failed` to
  `partial`. **Recommended next slice:**
  operator decision about whether to continue
  post-beta polish, pivot to post-beta tracks
  (source-write / watcher / breadth), or open a
  no-NPM policy revision.
- **Additional real-repo dogfood execution
  (P1.1 additional-real-repo-dogfood-execution
  slice).** ✅ Shipped. **Step 7b of the
  post-blocker release sequence** — the cohort
  execution itself, following the operator's
  approved intake table. Release-validation +
  docs batch. **No runtime behaviour change. No
  npm publish.** Three distinct operator-approved
  real repositories dogfooded
  (`boundary-contracts`, `structured-evals`,
  `figma-ds`) covering all 5 archetypes via 2
  documented consolidations. **Cohort decision:
  `pass-with-known-limitations`. No release
  blockers found.** Aggregate metrics: 102
  artefacts across 19 types; every artefact
  validated clean; no corruption; no token leak;
  no source mutation outside any `mktemp -d`
  copy. Verify pipeline propagated state
  correctly in both directions (`success` ↔
  `failure`). Two honest verification failures
  recorded as first-class behaviour per the
  cohort plan's success criteria. New cohort
  summary at
  [`docs/strategy/real-repo-cohort-summary.md`](real-repo-cohort-summary.md);
  per-target reports under
  `docs/strategy/real-repo-cohort/`. 15 new
  docs assertions. Recommended next slice:
  operator decision (continue beta with
  no-NPM posture, add more cohort targets,
  pivot to post-beta tracks, or open a
  no-NPM-policy-revision work order).
- **Real-repo dogfood cohort intake request
  (P1.1 real-repo-cohort-intake-request slice).**
  ✅ Shipped. **Step 7a of the post-blocker
  release sequence** — the cohort execution
  batch's intake substep, triggered when the
  operator did not supply concrete cohort repos
  in the work-order prompt. **Strategy / docs /
  tests-only batch.** No runtime behaviour
  change. No new package, no new CLI command,
  no new helper, no workflow-template change,
  no validator profile change, no GitHub API
  call, no `npm publish`, no version bump, no
  release tag, no GitHub Release, no active
  workflow YAML, no `package.json` /
  `package-lock.json` mutation, no source-file
  mutation, **no invented repo names**.

  **New strategy memo** at
  [`docs/strategy/real-repo-cohort-intake-request.md`](real-repo-cohort-intake-request.md)
  records the intake request the operator needs
  to answer before the cohort execution can
  run. Honors the work-order stop condition
  verbatim: "If the operator has not supplied
  repos yet: Stop after writing a short intake
  request. Do not invent repo names. Do not run
  the cohort."

  **The cohort itself was not run.** Step 7b
  (additional real-repo dogfood execution)
  remains blocked on the operator's intake
  response.

  **Pre-cohort verification (run on this
  commit):** all 9 mandatory verification
  commands passed (typecheck; test 1728 / 1
  skipped; build; git diff --check;
  audit-package-exports; audit-license;
  publish-dry-run; install-smoke;
  install-tarball-smoke). The Rekon CLI is
  ready; only the cohort execution is blocked.

  **Pinned reminders carried forward by the
  memo + the docs test:**
  - No npm publish during beta.
  - Beta is private / local / repo-based.
  - At least three distinct real repositories
    must be exercised before any post-beta
    publish reconsideration.
  - No cohort target may be Rekon itself.
  - Do not invent repo names.
  - This batch does not run the cohort.

  **Implementation Sequence updated:** step 6
  (cohort plan) shipped; step 7a (intake
  request, this slice) shipped; step 7b
  (cohort execution) blocked on operator
  intake. Steps 8-11 unchanged.

  **Tests:** new docs suite
  `tests/docs/real-repo-cohort-intake-request.test.mjs`
  with 10 assertions. Full suite expected ≥
  1738 passed / 1 skipped.

  **Recommended next slice:** wait for operator
  intake response; then the additional
  real-repo dogfood execution batch can run.

  No new package, no new CLI command, no new
  helper, no workflow template change, no
  validator profile change, no GitHub API
  call, no token read, no artifact-shape
  change, no `schemaVersion` bump, no version
  bump, no npm publish, no release tag, no
  GitHub Release.
- **Additional real-repo dogfood cohort plan
  (P1.1
  additional-real-repo-dogfood-cohort-plan
  slice).** ✅ Shipped. **Step 6 of the
  post-blocker release sequence** pinned by the
  No-NPM Beta Distribution Policy. **Strategy /
  docs / tests-only batch. Does not run the
  cohort.** No runtime behaviour change. No new
  package, no new CLI command, no new helper, no
  workflow-template change, no validator profile
  change, no GitHub API call, no `npm publish`,
  no version bump, no release tag, no GitHub
  Release, no active workflow YAML, no
  `package.json` / `package-lock.json` mutation,
  no source-file mutation.

  **New strategy memo** at
  [`docs/strategy/additional-real-repo-dogfood-cohort-plan.md`](additional-real-repo-dogfood-cohort-plan.md)
  defines the 5-archetype cohort plan for the
  next dogfood batches.

  **Five cohort archetypes pinned** (placeholders
  for operator-supplied repos at
  cohort-execution time): small TypeScript
  package; medium monorepo; Next.js / React app;
  mixed JS/TS repo; existing GitHub workflows
  repo. **At least three distinct real
  repositories** required; single-repo
  consolidation allowed when a repo legitimately
  covers multiple archetypes; no cohort target
  may be Rekon itself.

  **Pinned reminders carried forward from the
  No-NPM Beta Distribution Policy:**
  - No npm publish during beta.
  - Beta is private / local / repo-based.
  - At least three distinct real repositories
    must be exercised before any post-beta
    publish reconsideration.
  - Findings are acceptable outcomes when
    recorded honestly.
  - Failed verification is acceptable when
    `VerificationRun` + `VerificationResult`
    accurately record the failed proof and
    `artifacts validate` remains clean.
  - `artifacts validate: invalid` is a release
    blocker.

  **Three diagnostic tables in the memo:**
  cohort archetype (5 rows); success / blocker
  (7-row success + 6-row acceptable + 9-row
  blocker); metrics (27-row required-metric
  list).

  **Command matrix pinned** (mirrors the first
  dogfood matrix for cross-target
  comparability): core matrix + representative-
  path matrix + workflow validator matrix. No
  `--send` flow. No npm publish. No version
  bump. No source mutation outside the temp
  copy.

  **Reporting format pinned:** per-target
  dogfood reports under
  `docs/strategy/real-repo-cohort/`; cohort
  summary report at
  `docs/strategy/real-repo-cohort-summary.md`;
  cohort execution review packet at
  `.rekon-dev/review-packets/additional-real-repo-dogfood-cohort-execution.md`;
  cohort execution docs test at
  `tests/docs/real-repo-cohort-summary.test.mjs`.
  Cohort execution writes all four; this plan
  does not.

  **Implementation Sequence updated to 11
  steps:** checklist memo → execution plan →
  version bump report → dogfood report → no-NPM
  policy → **cohort plan (this step, shipped)**
  → cohort execution (next slice) → post-beta
  source-write apply roadmap (4 slices) →
  post-beta path freshness + watcher roadmap (4
  slices) → post-beta breadth / maturity /
  polish work → (optional, deferred) post-beta
  publish authorization work order.

  **Tests:** new docs suite
  `tests/docs/additional-real-repo-dogfood-cohort-plan.test.mjs`
  with 18 assertions. Full suite expected ≥
  1728 passed / 1 skipped.

  **Recommended next slice:** **Additional
  real-repo dogfood execution** (substitutes
  operator-selected concrete repositories for
  each archetype placeholder; runs the matrix;
  writes per-target + cohort reports).

  No new package, no new CLI command, no new
  helper, no workflow template change, no
  validator profile change, no GitHub API call,
  no token read, no artifact-shape change, no
  `schemaVersion` bump, no version bump, no
  npm publish, no release tag, no GitHub
  Release.
- **No-NPM beta distribution policy (P1.1
  no-npm-beta-distribution-policy slice).** ✅
  Shipped. **Step 5 of the post-blocker release
  sequence** — **replaces** the previously-planned
  publish authorization work order. **Strategy /
  docs / tests-only batch.** No runtime behaviour
  change. No new package, no new CLI command, no
  new helper, no workflow-template change, no
  validator profile change, no GitHub API call, no
  `npm publish`, no version bump, no release tag,
  no GitHub Release, no active workflow YAML, no
  `package.json` / `package-lock.json` mutation.

  **New strategy memo** at
  [`docs/strategy/no-npm-beta-distribution-policy.md`](no-npm-beta-distribution-policy.md)
  pins the post-dogfood release posture.
  **Decision: Rekon beta will not be published to
  npm.** Beta is a validated product / checklist
  state, not an npm-published package state.
  Distribution during beta is source-controlled,
  local-build, and tarball-smoke based; the npm
  registry path is deferred until after beta or
  until a new explicit operator decision reverses
  the policy.

  **Pinned reminders carried forward by the memo
  + the docs test:**
  - Rekon beta will not be published to npm.
  - npm publish is deferred until after beta or
    until a new explicit operator decision
    reverses this policy.
  - `0.1.0-beta.0` remains the internal / repo
    version for beta validation.
  - Beta distribution is source-controlled /
    local-build / tarball-smoke based, not
    public npm registry based.

  **Required statements pinned verbatim:**
  - Beta readiness is a product / checklist
    state, not an npm-published state.
  - No npm publish should be attempted during
    beta.
  - Real-repo dogfood passed and should continue
    across more repos before public package
    release.

  **Three diagnostic tables in the memo:**
  distribution (6 rows: source checkout +
  local build + local tarball smoke + GitHub
  workflow templates allowed; npm registry +
  GitHub Release deferred); policy (6 rows: npm
  publish deferred, version already at
  `0.1.0-beta.0`, public registry install not
  supported, source checkout install supported,
  more real-repo dogfood required, publish
  authorization work order replaced); dogfood (1
  row: Rekon repo temp copy passed).

  **Implementation Sequence updated to 11
  steps:** checklist memo → execution plan →
  version bump report → dogfood report →
  **no-NPM policy (this step, shipped)** →
  additional dogfood cohort plan (next) →
  cohort execution → post-beta source-write
  apply roadmap (4 slices) → post-beta path
  freshness + watcher roadmap (4 slices) →
  post-beta breadth / maturity / polish work →
  (optional, deferred) post-beta publish
  authorization work order.

  **Tests:** new docs suite
  `tests/docs/no-npm-beta-distribution-policy.test.mjs`
  with 15 assertions. Full suite expected ≥
  1710 passed / 1 skipped.

  **Recommended next slice:** **Additional
  real-repo dogfood cohort plan** (defines 3–5
  more real repositories / repo archetypes to
  dogfood before any post-beta publish is
  reconsidered).

  No new package, no new CLI command, no new
  helper, no workflow template change, no
  validator profile change, no GitHub API call,
  no token read, no artifact-shape change, no
  `schemaVersion` bump, no version bump, no
  npm publish, no release tag, no GitHub
  Release.
- **Real-repo beta dogfood report (P1.1
  real-repo-beta-dogfood slice).** ✅ Shipped.
  **Step 4 of the post-blocker release sequence**
  pinned by the Beta Release Readiness Checklist +
  advanced by the Beta Release Candidate Execution
  Plan + the Beta Version Bump Execution Report.
  **Release-validation (real-repo dogfood) batch.**
  No runtime behaviour change. No new package, no
  new CLI command, no new helper, no
  workflow-template change, no validator profile
  change, no GitHub API call, no `npm publish`,
  no version bump, no release tag, no GitHub
  Release, no active workflow YAML, no mutation of
  committed examples.

  **New strategy memo** at
  [`docs/strategy/real-repo-beta-dogfood-report.md`](real-repo-beta-dogfood-report.md)
  executes the dogfood matrix against a temp copy
  of the Rekon repository itself (489 files / 7.8
  MB rsync copy at SHA `83ba723`). **Dogfood
  Decision: `pass-with-known-limitations`.** This
  batch does not publish to npm, does not change
  package versions, does not create a git tag,
  and does not create a GitHub Release. The next
  publish step still requires explicit operator
  authorization.

  **Two dogfood wins vs. the fixture:**
  - `verify run --execute` actually ran real
    commands and all 3 **passed** (`npm run
    typecheck` exit 0 / 280ms; `npm run test`
    exit 0 / 37 246ms; `npm run build` exit 0
    / 2 214ms). First end-to-end pass on real
    commands.
  - `publish github-check --dry-run` propagated
    `conclusion: success` + `output.title:
    "Verification: passed (fresh)"` end-to-end.

  **Pinned reminders carried forward by the memo
  + the docs test:**
  - This batch does not publish to npm.
  - This batch does not change package versions.
  - This batch does not create a git tag.
  - This batch does not create a GitHub Release.
  - The dogfood run used a temp copy of a real
    repository and did not mutate committed
    examples.
  - The next publish step still requires
    explicit operator authorization.

  **24-entry dogfood command matrix exercised:**
  init, refresh (14 lifecycle steps, freshness
  fresh), validate, freshness, findings filter
  (134 filtered all `test-file` / 1 kept,
  filterRate 0.9926), filter-health, list,
  issues adjudicate (1 group, 1 active), issues
  list, coherency delta (1 active item — the
  intentional `import-boundary-rule-pack` demo
  fixture), publish proof / architecture /
  agent-contract, resolve preflight, intent
  work-order, verify run dry-run + execute,
  verify result from-run, republish, publish
  github-check + pr-comment dry-runs, 4
  workflow validators, final validate (clean),
  final freshness (aggregate stale with 20
  historical issues — documented).

  **Artifact summary:** 36 artefacts across 19
  types written to the dogfood's `.rekon/artifacts/**`
  tree. Every artefact validated clean; no
  corruption; no unreadable publication.

  **Known limitations observed (all previously
  disclosed):** no source-write apply; no
  watcher daemon; no hosted GitHub App; active
  workflows not installed automatically; GitHub
  writes opt-in only; aggregate freshness
  historical stale entries; host Node engine
  25.9.0 vs. declared `^20.12 || ^22 || ^24`
  (`EBADENGINE` warning; non-blocking);
  `pr-comment --dry-run` readiness gaps without
  GitHub env. **No new defect.**

  **Implementation Sequence pinned:**
  1. Beta release readiness checklist memo
     (shipped).
  2. Beta release candidate execution plan
     (shipped — against SHA `54d1dfd`).
  3. Beta version bump execution report
     (shipped — `0.1.0-beta.0` applied).
  4. Real-repo beta dogfood report (this
     report, shipped — `pass-with-known-
     limitations`).
  5. Beta npm publish authorization work order
     (next slice — explicit operator
     authorization; `npm publish --provenance`;
     git tag; GitHub Release).
  6. Post-beta source-write apply roadmap (4
     post-beta slices).
  7. Post-beta path freshness + watcher roadmap
     (4 post-beta slices).
  8. Post-beta breadth / maturity / polish
     work.

  **Tests:** new docs suite
  `tests/docs/real-repo-beta-dogfood-report.test.mjs`
  with 15 assertions. Full suite expected ≥
  1695 passed / 1 skipped.

  **Recommended next slice:** **Beta npm publish
  authorization work order** — the first slice
  in the entire Rekon sequence allowed to invoke
  `npm publish`, and only with explicit operator
  authorization.

  No new package, no new CLI command, no new
  helper, no workflow template change, no
  validator profile change, no GitHub API call,
  no token read, no artifact-shape change, no
  `schemaVersion` bump, no npm publish, no
  release tag, no GitHub Release.
- **Beta version bump execution report (P1.1
  beta-version-bump slice).** ✅ Shipped. **Step 3
  of the post-blocker release sequence** pinned by
  the Beta Release Readiness Checklist + advanced
  by the Beta Release Candidate Execution Plan.
  **Release-prep (version-coherence) batch.** No
  runtime behaviour change. No new package, no new
  CLI command, no new helper, no workflow-template
  change, no validator profile change, no GitHub
  API call, no `npm publish`, no release tag, no
  GitHub Release, no active workflow YAML. **Does
  mutate `package.json` `version` fields +
  `package-lock.json` — intentionally, exactly per
  the version bump scope.**

  **New strategy memo** at
  [`docs/strategy/beta-version-bump-execution-report.md`](beta-version-bump-execution-report.md)
  records the bump. **Decision: Version
  `0.1.0-beta.0` has been applied coherently
  across the root package and all 20 workspace
  packages.** This batch does not publish to npm,
  does not create a git tag, and does not create
  a GitHub Release. The next publish step requires
  explicit operator authorization.

  **Pinned reminders carried forward by the memo
  + the docs test:**
  - Version `0.1.0-beta.0` has been applied
    coherently.
  - This batch does not publish to npm.
  - This batch does not create a git tag.
  - This batch does not create a GitHub Release.
  - The next publish step requires explicit
    operator authorization.

  **Bump scope:** root `package.json` + 20
  workspace `package.json` files +
  `package-lock.json` (root version + 21
  workspace version entries + 70 `@rekon/*`
  dependency pins) + 70 `@rekon/*` dependency
  pins inside workspace `package.json` files.
  Method: deterministic Node JSON rewrite.
  Coherence verified (0 `0.1.0-alpha.1`
  references remain).

  **Four diagnostic tables in the memo:** git
  state (3 rows) / package version (5 rows) /
  mandatory verification (9 rows) / CLI smoke
  matrix (15 + 2 final-validation rows).

  **All 9 mandatory verification commands
  passed** (typecheck reports `rekon@0.1.0-beta.0`;
  test 1662/1; build reports
  `@rekon/sdk@0.1.0-beta.0`; git diff --check;
  five audit/smoke scripts with all 20 packages
  inspected).

  **15-entry CLI smoke matrix re-run against a
  temporary fixture root** with results identical
  in shape to Batch 30's pre-bump run, confirming
  the bump introduces no behavioural change.

  **Implementation Sequence pinned:**
  1. Beta release readiness checklist memo
     (shipped).
  2. Beta release candidate execution plan
     (shipped — executed against SHA `54d1dfd`).
  3. Beta version bump execution report (this
     report, shipped — `0.1.0-beta.0` applied).
  4. Beta npm publish authorization work order
     (next slice — explicit operator
     authorization; `npm publish --provenance`;
     git tag; GitHub Release).
  5. Post-beta source-write apply roadmap (4
     post-beta slices).
  6. Post-beta path freshness + watcher roadmap
     (4 post-beta slices).
  7. Post-beta breadth / maturity / polish
     work.

  **Tests:** new docs suite
  `tests/docs/beta-version-bump-execution-report.test.mjs`
  with 18 assertions. Full suite expected ≥
  1680 passed / 1 skipped.

  **Recommended next slice:** **Beta npm publish
  authorization work order** — the first slice
  in the entire Rekon sequence allowed to invoke
  `npm publish`, and only with explicit operator
  authorization.

  No new package, no new CLI command, no new
  helper, no workflow template change, no
  validator profile change, no GitHub API call,
  no token read, no artifact-shape change, no
  `schemaVersion` bump, no npm publish, no
  release tag, no GitHub Release.
- **Beta release candidate execution plan (P1.1
  beta-release-candidate-execution-plan slice).**
  ✅ Shipped. **Step 2 of the post-blocker release
  sequence** pinned by the Beta Release Readiness
  Checklist. **Release-candidate execution + docs
  batch.** No runtime behaviour change. No new
  package, no new CLI command, no new helper, no
  workflow-template change, no validator profile
  change, no GitHub API call, no `npm publish`, no
  version bump, no release tag, no active workflow
  YAML.

  **New strategy memo** at
  [`docs/strategy/beta-release-candidate-execution-plan.md`](beta-release-candidate-execution-plan.md)
  executes the pinned checklist against `main` SHA
  `54d1dfd`. **Decision: the current `main` SHA
  qualifies as a beta release candidate.** This
  batch does not publish to npm, does not bump
  versions, and does not tag a release.

  **Recommended beta version: `0.1.0-beta.0`**
  (deferred to the version bump work order).

  **All 9 mandatory verification commands passed**
  (typecheck; test 1644/1; build; git diff --check;
  package-exports audit; license audit; publish
  dry-run; install smoke; install tarball smoke).

  **15-entry CLI smoke matrix ran against a
  temporary fixture root**; results recorded
  honestly in the memo's CLI Smoke Matrix Results
  table. Two documented first-class behaviours
  (failed `verify run --execute` against a fixture
  with no real test command; `pr-comment
  --dry-run` readiness reporting expected gaps
  with no GitHub env set) are not regressions.

  **Package / version state recorded:** root
  `0.1.0-alpha.1`; all 20 workspace packages
  coherent.

  **No release stop condition was triggered.**
  Release candidate qualifies.

  **8-step release work order preview pinned**
  (gated by operator authorisation before
  publish): pre-flight → version bump → re-run
  audits + smokes on bumped SHA → operator
  authorisation gate → `npm publish --provenance`
  → push tag → GitHub Release → post-publish
  smoke from npm.

  **Tests:** new docs suite
  `tests/docs/beta-release-candidate-execution-plan.test.mjs`
  with 18 assertions. Full suite expected ≥ 1662
  passed / 1 skipped.

  **Recommended next slice:** **Beta version bump
  work order** (applies `0.1.0-beta.0` to root +
  every workspace package; re-runs audits + smokes
  on the bumped SHA; still avoids `npm publish`
  unless operator explicitly authorises).

  No new package, no new CLI command, no new
  helper, no workflow template change, no
  validator profile change, no GitHub API call, no
  token read, no artifact-shape change, no
  `schemaVersion` bump, no version bump, no npm
  publish, no release tag.
- **Beta release readiness checklist memo (P1.1
  beta-release-readiness-checklist slice).** ✅
  Shipped. **Third (and final) of three beta
  blockers** identified by the Beta Readiness /
  Remaining Classic-Parity Review. **Strategy /
  docs / tests-only batch.** No runtime behaviour
  change. No new package, no new CLI command, no
  new helper, no workflow-template change, no
  validator profile change, no GitHub API call,
  no version bump, no npm publish, no release
  tag, no active workflow YAML.

  **New strategy memo** at
  [`docs/strategy/beta-release-readiness-checklist.md`](beta-release-readiness-checklist.md)
  pins the final beta release readiness contract.
  **Decision: with this checklist pinned + the
  mandatory verification commands passing on
  main, Rekon is beta-ready. Beta-ready is a
  checklist state, not an npm publish event; the
  actual publish is a separate explicit operator
  work order.**

  **Pinned reminders carried forward by the memo
  + the docs test:**
  - Beta readiness is a checklist state, not an
    npm publish event.
  - npm publish requires a separate explicit
    release work order.
  - No version bump occurs in this checklist
    batch.
  - Known beta limitations must be documented
    before beta is announced.

  **All three beta blockers resolved**
  (source-write reconciliation policy; watcher
  / path freshness policy; release readiness
  checklist).

  **Four diagnostic tables in the memo:** beta
  blocker / verification command / known
  limitations / release stop-condition.

  **Mandatory verification commands pinned**
  (9 commands). **CLI smoke matrix pinned**
  (14 commands). **Versioning policy pinned**
  (current `0.1.0-alpha.1`; beta target
  `0.1.0-beta.<n>`). **NPM publish policy
  pinned** (no publish in this batch; separate
  work order required).

  **Known limitations disclosed** (15 total:
  source-write apply not available; watcher
  daemon not available; hosted GitHub App not
  available; active workflows not installed
  automatically; GitHub writes opt-in only;
  Windows process-tree kill direct-child-only;
  full classic parity not claimed; plus 8
  additional reserved-but-not-implemented /
  post-beta-polish items).

  **Implementation Sequence pinned:**
  1. Beta release readiness checklist memo
     (this memo, shipped).
  2. Beta release candidate execution plan
     (next slice).
  3. Beta release (explicit operator work
     order).
  4. Post-beta source-write apply roadmap (4
     slices).
  5. Post-beta path freshness + watcher
     roadmap (4 slices).
  6. Post-beta breadth / maturity / polish
     work.

  **Tests:** new docs suite
  `tests/docs/beta-release-readiness-checklist.test.mjs`
  with 22 assertions. Full suite expected ≥
  1644 passed / 1 skipped.

  **Recommended next slice:** **Beta release
  candidate execution plan** (executes
  checklist on release SHA; still avoids `npm
  publish` unless operator explicitly
  authorises).

  No new package, no new CLI command, no new
  helper, no workflow template change, no
  validator profile change, no GitHub API call,
  no token read, no artifact-shape change, no
  `schemaVersion` bump, no version bump, no
  npm publish, no release tag.
- **Watcher / path freshness policy decision memo
  (P1.1 watcher-path-freshness-policy-decision
  slice).** ✅ Shipped. **Second of three beta
  blockers** identified by the Beta Readiness /
  Remaining Classic-Parity Review. **Strategy /
  docs / tests-only batch.** No runtime behaviour
  change. No new package, no new CLI command, no
  new helper, no workflow-template change, no
  validator profile change, no GitHub API call,
  no file-system event subscription, no daemon,
  no background refresh, no path mtime tracking,
  no artifact-type registration, no
  `ArtifactHeader` change.

  **New strategy memo** at
  [`docs/strategy/watcher-path-freshness-policy-decision.md`](watcher-path-freshness-policy-decision.md)
  pins the watcher / path freshness boundary for
  beta. **Decision: Option C — watcher-lite /
  path freshness policy for beta. No daemon by
  default; explicit `rekon refresh` remains the
  canonical operator action; future
  `PathFreshnessReport` artifact reserved by
  name; agent contract instructs agents to
  refresh after source edits.** Four options
  analysed (manual refresh only / full daemon /
  watcher-lite + path policy / opt-in daemon);
  Option C wins because it resolves the beta
  policy blocker without shipping a daemon and
  preserves the no-background-mutation
  invariant.

  **Pinned reminders carried forward by the memo
  + the docs test:**
  - Watcher daemon is not required for beta.
  - Path/source freshness policy is required
    for beta.
  - Rekon must not silently mutate artifacts in
    the background.
  - Agents should treat artifacts as stale after
    source edits until `rekon refresh` has run.
  - Artifact lineage freshness is not the same
    as working-tree freshness.

  **Reserved by name (docs-only reservation; no
  SDK / runtime registration):**
  `PathFreshnessReport` artifact type. Registers
  in a post-beta implementation slice, not this
  memo.

  **Three diagnostic tables in the memo:**
  - Policy table (8 rows: beta watcher daemon
    not required / background refresh not
    allowed by default / refresh command
    explicit / source edits require refresh /
    path freshness evidence content-hash + git
    state preferred / mtimes advisory only /
    `PathFreshnessReport` reserved / agent
    guidance to recommend refresh).
  - Option table (4 rows: manual refresh only /
    full daemon / watcher-lite + path policy /
    opt-in daemon).
  - Risk table (5 rows: stale source context /
    hidden artifact mutation / mtime
    unreliability / agent stale inference /
    daemon lifecycle complexity — each with its
    guardrail).

  **Implementation Sequence pinned:**
  1. Watcher / path freshness policy decision
     memo (this memo, shipped).
  2. Beta release readiness checklist memo
     (next slice — third beta blocker).
  3. Beta release execution (final pre-beta
     slice).
  4. Path freshness artefact slice (post-beta).
  5. Watcher daemon design memo (post-beta).
  6. Watcher daemon implementation slice
     (post-beta).
  7. Watcher / path freshness safety review
     slice (post-beta).

  **Tests:** new docs suite
  `tests/docs/watcher-path-freshness-policy-decision.test.mjs`
  with 17 assertions. Full suite expected ≥
  1622 passed / 1 skipped.

  **Recommended next slice:** **Beta release
  readiness checklist memo** (third and final
  of three beta blockers).

  No new package, no new CLI command, no new
  helper, no workflow template change, no
  validator profile change, no GitHub API call,
  no token read, no `ArtifactHeader` change, no
  `schemaVersion` bump, no
  `IntelligenceSnapshot` / `EvidenceGraph` /
  `ObservedRepo` / `FindingReport` /
  `VerificationRun` schema change, no version
  bump, no npm publish.
- **Source-write reconciliation policy decision
  memo (P1.1
  source-write-reconciliation-policy-decision
  slice).** ✅ Shipped. **First of three beta
  blockers** identified by the Beta Readiness /
  Remaining Classic-Parity Review. **Strategy /
  docs / tests-only batch.** No runtime behaviour
  change. No new package, no new CLI command, no
  new helper, no workflow-template change, no
  validator profile change, no GitHub API call,
  no source-file mutation, no artifact-type
  registration, no permission registration.

  **New strategy memo** at
  [`docs/strategy/source-write-reconciliation-policy-decision.md`](source-write-reconciliation-policy-decision.md)
  pins the source-write boundary for beta.
  **Decision: Option C — beta pins the
  source-write policy + preview requirements;
  the actual apply implementation remains
  deferred post-beta.** Four options analysed
  (no apply / deterministic narrow apply /
  preview-first / full apply); Option C wins
  because it resolves the beta policy blocker
  without shipping any source-write
  implementation.

  **Pinned reminders carried forward by the
  memo + the docs test:**
  - Source-write apply is not required for
    beta, but the policy boundary is required
    for beta.
  - No agent-autonomous source writes.
  - Every future source-write apply must be
    preceded by exact diff preview and
    explicit operator confirmation.
  - A successful apply must not automatically
    resolve findings; lifecycle / status
    updates remain explicit artifacts.

  **Reserved by name (docs-only reservation; no
  SDK / runtime registration):**
  `ReconciliationApplyReport` artifact type,
  `source:write` permission. Both register in
  follow-on slices, not this memo.

  **Three diagnostic tables in the memo:**
  - Policy table (8 rows: beta source-write
    apply deferred / preview required /
    confirmation required / verification
    mandatory / rollback required /
    `ReconciliationApplyReport` reserved /
    `source:write` reserved / no agent
    autonomy).
  - Operation-class table (5 rows: artifact-only
    allowed / deterministic source patch
    preview-only / generated file creation
    preview-only / command execution via
    verification runner / ambiguous remediation
    manual-only).
  - Risk table (5 rows: corrupting source /
    hidden agent writes / failed verification /
    false resolution / irreversible patch —
    each with its guardrail).

  **Implementation Sequence pinned:**
  1. Source-write reconciliation policy
     decision memo (this memo, shipped).
  2. Watcher / path freshness policy decision
     memo (next slice — second beta blocker).
  3. Beta release readiness checklist (third
     beta blocker).
  4. Beta release execution (final pre-beta
     slice).
  5. Patch preview artefact slice (post-beta).
  6. Apply permission + rollback design memo
     (post-beta).
  7. Apply implementation slice (post-beta) —
     adds `reconcile apply` +
     `ReconciliationApplyReport` registration.
  8. Source-write safety review slice
     (post-beta).

  **Tests:** new docs suite
  `tests/docs/source-write-reconciliation-policy-decision.test.mjs`
  with 18 assertions. Full suite expected ≥
  1605 passed / 1 skipped.

  **Recommended next slice:** **Watcher / path
  freshness policy decision memo** (second of
  three beta blockers).

  No new package, no new CLI command, no new
  helper, no workflow template change, no
  validator profile change, no GitHub API call,
  no token read, no artifact-shape change, no
  `schemaVersion` bump, no
  `FindingStatusLedger` /
  `FindingLifecycleReport` /
  `CoherencyDelta` /
  `ReconciliationPlan` mutation, no version
  bump, no npm publish.
- **Beta readiness / remaining classic-parity
  review (P1.1
  beta-readiness-classic-parity-review slice).**
  ✅ Shipped. **First beta-readiness review**
  following the completed CI / GitHub adapter
  sequence. **Strategy / docs / tests-only
  batch.** No runtime behaviour change. No new
  package, no new CLI command, no new helper, no
  workflow-template change, no validator profile
  change, no GitHub API call.

  **New strategy memo** at
  [`docs/strategy/beta-readiness-classic-parity-review.md`](beta-readiness-classic-parity-review.md)
  steps back from the verification + GitHub
  review-surface arc and assesses Rekon's
  remaining delta to beta. Reviews 15 subsystems
  (observe / refresh, finding detection, finding
  filters, graph-aware filtering, issue
  lifecycle / adjudication / merge decisions,
  CoherencyDelta / remediation queue, WorkOrder
  / ReconciliationPlan / VerificationPlan,
  verification runner / VerificationRun /
  VerificationResult, proof surfaces, GitHub
  review surfaces, memory, resolver packets /
  resolve.issue, source-write reconciliation,
  watcher / path freshness, packaging /
  release readiness) against codebase-intel's
  classic goals (understand, govern, fix,
  verify, communicate).

  **Decision: Rekon is beta-close but not
  beta-ready.** Three policy blockers remain,
  each a decision rather than a missing
  implementation:
  1. Source-write reconciliation policy
     (apply path is undecided;
     `ReconciliationPlan` is preview-only
     today).
  2. Watcher / path freshness policy (live
     invalidation + staleness recovery not
     pinned).
  3. Beta release readiness checklist
     (packaging / version / docs / smoke
     constraints not pinned in a single
     checklist).

  **Beta-ready subsystems:** verification
  runner + proof surfaces; GitHub review
  surfaces (beta-complete per step 8,
  beta-stable per step 10); finding filters +
  filter health + filter policy; graph-aware
  filtering; issue governance core loop
  (adjudication + merge decisions +
  freshness); resolver packets; publications /
  agent contract; memory selection / curation;
  snapshot refresh.

  **Post-beta work:** hosted GitHub App;
  deeper rule catalog expansion; richer
  memory promotion / supersession; Windows
  process-tree kill (Job Objects); PR comment
  refinements (bounded retry, same-repo
  `pull_request` guard); source-write
  automation beyond the explicit gated policy.

  **Required statements pinned by the memo +
  the docs test:**
  - Beta readiness is not the same as full
    classic parity.
  - Rekon should not add more GitHub review
    surfaces before beta.
  - The remaining pre-beta work is policy /
    guardrail oriented, not another major
    review-surface expansion.

  **Three diagnostic tables in the memo:**
  - Subsystem readiness matrix (15 rows;
    every row classified as strong /
    incomplete + beta-ready / beta blocker +
    notes).
  - Beta blocker table (3 blockers; each with
    why-it-blocks + recommended next slice).
  - Post-beta table (6 items; each with
    why-post-beta reason).

  **Tests:** new docs suite
  `tests/docs/beta-readiness-classic-parity-review.test.mjs`
  with 19 assertions. Full suite expected ≥
  1587 passed / 1 skipped.

  **Recommended next slice:** **Source-write
  reconciliation policy decision memo** —
  pin whether beta supports source-write
  apply at all; if yes, pin preview / diff
  first, explicit operator confirmation,
  verification before AND after, rollback
  strategy, no agent-autonomous source
  writes, artifact trail
  (`ReconciliationLog` or equivalent). After
  that: watcher / path freshness policy
  decision memo, then beta release readiness
  checklist, then beta release execution.

  No new package, no new CLI command, no new
  helper, no workflow template change, no
  validator profile change, no GitHub API
  call, no token read, no artifact-shape
  change, no `schemaVersion` bump, no
  `FindingStatusLedger` /
  `FindingLifecycleReport` /
  `CoherencyDelta` /
  `ReconciliationPlan` mutation, no
  version bump, no npm publish.
- **Verification / GitHub trust-boundary
  safety review (P1.1
  verification-github-trust-boundary-safety-review
  slice).** ✅ Shipped. **Step 10** of the CI
  / GitHub adapter implementation sequence
  pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  **Strategy / docs / tests-only batch.** No
  runtime behaviour change. No new package,
  no new CLI command, no new helper, no
  workflow-template change, no validator
  profile change, no GitHub API call.

  **New strategy memo** at
  [`docs/strategy/verification-github-trust-boundary-safety-review.md`](verification-github-trust-boundary-safety-review.md)
  walks every step-9 hardening fix in
  isolation (proof-chain coherence, bounded
  streaming capture, POSIX process-tree
  timeout, NODE_OPTIONS removal, bounded
  GitHub API error reads, PR head SHA safety)
  + the affected surfaces (runner, both
  publishers' dry-run + send modes,
  VerificationRun / VerificationResult
  semantics, GitHub Check payloads, PR
  comment body / update path, workflow
  templates + validator profiles).

  **Decision: beta-stable.** No additional
  GitHub review surfaces should be added
  before beta. Remaining work is operational
  polish + documented platform caveats, not
  new GitHub APIs.

  **Required statements pinned by the memo +
  the docs test:**
  - GitHub status and comments are not
    canonical truth; Rekon artifacts remain
    canonical.
  - A successful GitHub Check or PR comment
    publish does not imply findings are
    resolved or reconciliation has been
    applied.
  - VerificationResult and VerificationRun
    must remain chain-coherent in every
    review surface.
  - Windows timeout behaviour is direct-
    child-only unless a future platform-
    specific process-tree strategy is
    implemented.

  **Three diagnostic tables in the memo:**
  - Hardening table: six fixes (proof-chain
    coherence / bounded output capture /
    timeout semantics / environment policy /
    GitHub error bounds / PR head SHA policy)
    — each with status, evidence, and
    remaining follow-up.
  - Risk table: mixed proof chain / memory
    exhaustion via output / orphan child
    process / env-based Node injection / huge
    GitHub error body / wrong PR SHA — each
    with current guardrail and remaining
    follow-up.
  - Beta decision table: coherent proof chain
    / bounded execution logs / token-log
    safety / timeout semantics documented /
    PR SHA policy safe / canonical artifact
    boundary preserved / no auto-resolution
    — **every criterion passes**.

  **Tests:** new docs suite
  `tests/docs/verification-github-trust-boundary-safety-review.test.mjs`
  with 18 assertions. Full suite expected ≥
  1568 passed / 1 skipped.

  **Recommended next slice:** **Beta
  readiness / remaining classic-parity
  review.** Step back from GitHub-specific
  work and assess the remaining delta to
  beta (verification runner gaps; GitHub
  review surfaces — already beta-complete;
  issue governance; filtering /
  graph-aware filters; memory; publications;
  source-write / reconciliation gaps;
  watcher / path freshness gaps). Decide
  which gaps must close before beta and
  which are post-beta.

  No new package, no new CLI command, no
  new helper, no workflow template change,
  no validator profile change, no GitHub
  API call, no token read, no artifact-
  shape change, no `schemaVersion` bump,
  no `FindingStatusLedger` /
  `FindingLifecycleReport` /
  `CoherencyDelta` /
  `ReconciliationPlan` mutation, no
  version bump, no npm publish.
- **Verification / GitHub trust-boundary
  hardening (P1.1
  verification-github-trust-boundary-hardening
  slice).** ✅ Shipped. **Step 9** of the CI
  / GitHub adapter implementation sequence
  pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  Hardening batch — runtime fixes in
  `@rekon/capability-docs`,
  `@rekon/capability-verify`, and the CLI.
  No new surfaces, no new workflow
  templates, no new GitHub API calls.

  Six trust-boundary fixes paged by the
  step-8 parity review:
  1. **Coherent GitHub Check proof-chain
     selection.** `publish github-check`
     uses the VerificationRun cited by
     `VerificationResult.header.inputRefs`,
     not the unrelated latest run. Missing
     cited run surfaces a
     `proofChainWarnings` entry.
  2. **Bounded stdout/stderr streaming
     capture.** Incremental sha256 + bounded
     excerpt buffer; large streams cannot
     exhaust memory before truncation.
  3. **POSIX process-tree timeout kill.**
     `detached: true` + `process.kill(-pid,
     signal)`. Windows direct-child-only
     documented honestly.
  4. **`NODE_OPTIONS` removed** from
     `VERIFICATION_RUN_ENV_ALLOWLIST`.
  5. **Bounded GitHub API error-body
     reads** in both publishers via a new
     shared `readBoundedResponseBody`
     (64 KiB cap, streaming reader).
  6. **PR head SHA safety.** New
     `missing-pr-head-sha` readiness issue;
     `pull_request*` events require
     explicit `--head-sha` or
     `GITHUB_HEAD_SHA`.

  **Public API changes** (all additive or
  explicit scope reductions):
  - New readiness issue code
    `missing-pr-head-sha`.
  - `VERIFICATION_RUN_ENV_ALLOWLIST` no
    longer contains `NODE_OPTIONS`
    (subtractive).
  - New optional `--head-sha <sha>` flag on
    `publish github-check --send`.
  - New optional `proofChainWarnings` JSON
    field on `publish github-check` dry-run
    + send output.

  **Tests:** new contract suite
  `tests/contract/verification-github-trust-boundary-hardening.test.mjs`
  with 17 tests across 5 groups (proof-
  chain coherence, execution bounds,
  timeout semantics, GitHub API error
  bounds, PR head SHA). Two existing
  readiness tests updated to pass explicit
  `headShaOverride`; one new readiness
  rejection test added. Full suite 1550
  passed / 1 skipped.

  **Recommended next slice:** Verification /
  GitHub trust-boundary safety review —
  walk every fix in isolation + the
  affected surfaces and decide whether the
  trust boundary is beta-stable.

  No artifact-shape change, no
  `schemaVersion` bump, no version bump,
  no npm publish.
- **GitHub review surfaces parity review
  (P1.1 github-review-surfaces-parity-review
  slice).** ✅ Shipped. **Step 8** of the CI
  / GitHub adapter implementation sequence
  pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  **Strategy / docs / tests-only batch.** No
  runtime behaviour change. No new package,
  no new CLI command, no new helper, no
  workflow-template change, no validator
  profile change, no GitHub API call.

  **New strategy memo** at
  [`docs/strategy/github-review-surfaces-parity-review.md`](github-review-surfaces-parity-review.md)
  reviews the combined GitHub review surface
  end-to-end (read-only workflow templates,
  opt-in Check + PR comment workflow
  templates, three validator profiles,
  both publishers' dry-run + send CLIs,
  proof / architecture-summary / agent-
  contract publications, uploaded
  `.rekon/artifacts`, job summary markdown,
  `rekon artifacts latest` helper,
  canonical artifact boundary, fork / token
  / permission safety, operator ergonomics
  gaps).

  **Decision: beta-complete as an opt-in
  surface.** Read-only templates remain the
  recommended alpha default. GitHub Checks
  remain the primary status surface. PR
  comments remain the narrative companion
  surface. Uploaded Rekon artifacts remain
  canonical truth. **No additional GitHub
  API surface is needed before beta.**

  **Required statements pinned by the memo
  + the docs test:**
  - GitHub status and comments are not
    canonical truth; Rekon artifacts remain
    canonical.
  - A successful GitHub Check or PR comment
    publish does not imply findings are
    resolved or reconciliation has been
    applied.
  - Forked PRs and `pull_request_target`
    remain blocked by default.
  - Read-only workflows remain the
    recommended starting point for
    adoption.

  **Three diagnostic tables in the memo:**
  - Surface table: read-only dry-run /
    execute / Check workflow / PR comment
    workflow / Check publisher / PR comment
    publisher / uploaded artifacts / job
    summary — each with role + status +
    notes.
  - Risk table: GitHub status treated as
    truth / comment noise / fork token
    misuse / stale proof / raw log leakage
    — each with current guardrail and
    remaining follow-up.
  - Beta decision table: canonical
    artifacts preserved / Check status
    surface exists / narrative PR surface
    exists / read-only adoption path
    exists / workflow safety validation
    exists / fork-default-deny posture
    preserved / automatic resolution
    avoided — every criterion passes.

  **Tests:** new docs suite
  `tests/docs/github-review-surfaces-parity-review.test.mjs`
  with 20 assertions. Full suite expected
  ≥ 1532 passed / 1 skipped.

  **Recommended next slice:** **Verification
  / GitHub Trust-Boundary Hardening.** Return
  to foundational hardening before adding any
  new review surfaces: coherent
  VerificationResult → VerificationRun proof-
  chain selection for GitHub Check payloads;
  bounded stdout/stderr streaming memory;
  process-tree timeout semantics;
  `NODE_OPTIONS` removal from runner env;
  bounded GitHub API error-body reads (re-
  confirm); PR head-SHA policy.

  No new package, no new CLI command, no new
  helper, no workflow template change, no
  validator profile change, no GitHub API
  call, no token read, no artifact-shape
  change, no `schemaVersion` bump, no
  `FindingStatusLedger` /
  `FindingLifecycleReport` /
  `CoherencyDelta` /
  `ReconciliationPlan` mutation, no version
  bump, no npm publish.
- **PR comment publisher safety review
  (P1.1 pr-comment-publisher-safety-review
  slice).** ✅ Shipped. **Step 7g** of the
  CI / GitHub adapter implementation
  sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  **Strategy / docs / tests-only batch.**
  No runtime behaviour change. No new
  package, no new CLI command, no new
  helper, no workflow-template change, no
  validator profile change, no GitHub API
  call.

  **New strategy memo** at
  [`docs/strategy/pr-comment-publisher-safety-review.md`](pr-comment-publisher-safety-review.md)
  walks the full PR comment publishing
  path end-to-end (body helper, readiness
  helper, dry-run CLI, send CLI, API
  writer, workflow template, validator
  profile, idempotency marker, pagination
  + update-in-place, token + error
  sanitization, fork + event safety,
  canonical-artifact boundary, test
  coverage) and pins **beta-ready as an
  opt-in, trusted-context-only, update-
  in-place review surface**.

  **GitHub Checks remain the primary
  status surface; PR comments are a
  narrative companion surface.** The two
  are intentionally complementary; each
  can ship independently.

  **Required statements pinned by the
  memo + the docs test:**
  - PR comments are not canonical truth;
    Rekon artifacts remain canonical.
  - The idempotency marker is not proof;
    it is only an update-in-place handle.
  - Forked PRs and `pull_request_target`
    remain blocked by default.
  - No automatic finding resolution or
    reconciliation apply is implied by a
    successful PR comment publish.

  **Diagnostic tables in the memo:**
  - Component status table: body helper,
    readiness helper, dry-run CLI, send
    CLI, API writer, workflow template,
    validator profile — all shipped /
    beta-ready.
  - Risk table: duplicate comments, stale
    comments, fork token misuse, token
    leakage, comment treated as proof —
    each with current guardrail and
    remaining follow-up.
  - Pinned-safety-facts table: cross-
    references every test that pins the
    safety contract (helper PATCH/POST,
    pagination, no-token-leak, dry-run
    no-network, readiness gates, workflow
    triggers, validator rejections,
    artifact-index byte-identical).

  **Tests:** new docs suite
  `tests/docs/pr-comment-publisher-safety-review.test.mjs`
  with 18 assertions. Full suite expected
  ≥ 1512 passed / 1 skipped.

  **Recommended next slice:** **GitHub
  review surfaces parity review.** Walk
  the combined GitHub surface (Checks,
  PR comments, workflow templates,
  validators, proof publications,
  uploaded artifacts) and decide whether
  the GitHub review surface is beta-
  complete or whether Check / PR comment
  refinements remain.

  No new package, no new CLI command, no
  new helper, no workflow template
  change, no validator profile change,
  no GitHub API call, no token read, no
  artifact-shape change, no
  `schemaVersion` bump, no
  `FindingStatusLedger` /
  `FindingLifecycleReport` /
  `CoherencyDelta` /
  `ReconciliationPlan` mutation, no
  version bump, no npm publish.
- **PR comment API writer (P1.1
  pr-comment-send-cli slice).** ✅
  Shipped. **Step 7f** of the CI / GitHub
  adapter implementation sequence pinned
  by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md)
  and the
  [PR Comment API Writer Go/No-Go Review](pr-comment-api-writer-go-no-go-review.md).
  Adds Rekon's first GitHub PR-comment
  write surface.

  **New helper:**
  `publishPrCommentRun(input)` in
  `@rekon/capability-docs` (parallel to
  `publishGitHubCheckRun`). Uses
  Node's built-in `fetch`; no third-party
  network client. Lists existing PR
  timeline comments via
  `GET /repos/{owner}/{repo}/issues/{n}/comments`
  paginated (`per_page=100`, bounded at
  20 pages), filters by the marker
  `<!-- rekon:pr-comment:v1 -->`, PATCHes
  the first marker-bearing comment via
  `PATCH /repos/{owner}/{repo}/issues/comments/{id}`
  on match, or POSTs a new comment via
  `POST /repos/{owner}/{repo}/issues/{n}/comments`
  on miss. Never deletes reviewer-touched
  comments. Bounded response-body reads
  (≤ 64 KiB). Sanitized error class
  `PrCommentPublishError` carries
  `{ status, message, documentationUrl }`
  — the token never appears.

  **New CLI mode:**
  `rekon publish pr-comment --send
  [--root <path>] [--pr-number <n>]
  [--confirm-pr-comment-write]
  [--api-base-url <url>] [--json]`.
  Mutually exclusive with `--dry-run`;
  passing both or neither is exit 1.
  Reads `process.env` (`GITHUB_TOKEN`,
  `GITHUB_REPOSITORY`,
  `GITHUB_PR_NUMBER` / `PR_NUMBER`,
  `REKON_PR_COMMENTS`,
  `REKON_PR_COMMENTS_WRITE_CONFIRMED`,
  event context) only in the `--send`
  branch. Refuses unless the readiness
  assessor returns
  `ready: true`. Exit 0 on API success
  regardless of underlying proof status;
  exit 1 on readiness failure or API
  error.

  **Workflow template update:**
  [`docs/examples/workflows/rekon-pr-comment-send.yml`](../examples/workflows/rekon-pr-comment-send.yml)
  now declares a required
  `workflow_dispatch` input
  `pr-number` and runs both
  `publish pr-comment --dry-run` (as a
  preview) AND
  `publish pr-comment --send
  --confirm-pr-comment-write` (the
  actual write).

  **Validator profile update:** the
  `github-pr-comment-send` profile now
  REQUIRES the `--send` step + the
  `--confirm-pr-comment-write` flag.
  New issue codes:
  `missing-publish-pr-comment-send`,
  `missing-confirm-pr-comment-write-flag`.
  The previously emitted
  `forbidden-publish-pr-comment-send`
  code has been retired (the writer
  shipped). New mode value:
  `pr-comment-send`. New summary field:
  `hasConfirmPrCommentWriteFlag`.

  **Pinned reminders carried forward:**
  - PR comments are not canonical truth;
    Rekon artifacts remain canonical.
  - The idempotency marker is not proof;
    it is only an update-in-place handle.
  - Forked PRs remain denied by default.
  - `pull_request_target` remains denied
    unconditionally.
  - The token never appears in stdout /
    stderr or in errors (sentinel-token
    contract test pins this).

  **Tests:** new contract suite
  `tests/contract/pr-comment-send-cli.test.mjs`
  with 19 tests using a local `node:http`
  fake server + `--api-base-url`
  redirection. Covers readiness gates,
  pagination walks, PATCH-on-marker /
  POST-on-miss, sanitized errors,
  sentinel-token leak prevention,
  dry-run still no-token / no-network,
  artifact index byte-identical before /
  after `--send`, exit 0 on proof
  failed / stale. Validator contract
  suite extended (now 57 tests). New
  docs suite
  `tests/docs/pr-comment-send-cli.test.mjs`
  with 9 assertions. Full suite expected
  ≥ 1492 passed / 1 skipped.

  **Out-of-scope (deferred to step 7g):**
  bounded retry / rate-limit backoff,
  same-repo `pull_request` guard,
  hosted publisher, PR-review endpoints
  (rejected by Option C in the go/no-go
  review).
- **PR comment API writer go/no-go
  review (P1.1
  pr-comment-api-writer-go-no-go-review
  slice).** ✅ Shipped. **Step 7e** of
  the CI / GitHub adapter implementation
  sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md)
  and the
  [PR Comment Publisher API Decision Gate](pr-comment-publisher-api-decision-gate.md).
  **Strategy / docs / tests-only batch.**
  No runtime behaviour change. No new
  package, no new CLI command, no new
  helper, no workflow-template change,
  no validator profile change, no
  GitHub API call.

  **New strategy memo** at
  [`docs/strategy/pr-comment-api-writer-go-no-go-review.md`](pr-comment-api-writer-go-no-go-review.md)
  reviews the full pre-API PR comment
  publishing path (dry-run body helper,
  readiness helper, dry-run CLI,
  workflow template, validator profile,
  idempotency marker, permission model,
  endpoint model, fork / event safety,
  canonical-artifact boundary).

  **Decision: Go — adopt Option B.**
  Proceed to `rekon publish pr-comment
  --send` using GitHub issue comments
  (`POST/PATCH/GET /repos/{owner}/{repo}/issues/{n}/comments`),
  update-in-place by
  `<!-- rekon:pr-comment:v1 -->`,
  `pull-requests: write` permission
  (already declared by the bundled
  template), gated by
  `REKON_PR_COMMENTS=1` +
  `REKON_PR_COMMENTS_WRITE_CONFIRMED=1`
  + trusted event context + explicit
  write confirmation.

  **Required statements pinned by the
  memo + the docs test:**
  - PR comments are not canonical
    truth; Rekon artifacts remain
    canonical.
  - The idempotency marker is not
    proof; it is only an update-in-
    place handle.
  - Forked PRs remain denied by
    default.
  - `pull_request_target` remains
    denied unconditionally.

  **Diagnostic tables in the memo:**
  - Component status table: every
    pre-API slice (7a / 7b / 7c / 7d /
    7e) marked Shipped; 7f / 7g
    flagged as next / future.
  - Permission table: GitHub Check
    (`checks: write`) vs PR comment
    (`pull-requests: write`) vs
    read-only (`contents: read`).
  - Risk table: comment spam / stale
    comment / fork token misuse /
    endpoint permission mismatch —
    each with current guardrail and
    remaining follow-up.

  **Tests:** new docs suite
  `tests/docs/pr-comment-api-writer-go-no-go-review.test.mjs`
  (18 assertions: memo existence; all
  13 required headings; Go / Option B
  recommendation; endpoint pinned to
  issue-comment endpoints; permission
  pinned to `pull-requests: write`;
  marker pinned to
  `<!-- rekon:pr-comment:v1 -->`;
  canonical-truth language; marker-not-
  proof language; forked-PR denied-by-
  default; `pull_request_target` denied
  unconditionally; no `--send` /
  no GitHub API call in this batch;
  references the prior PR comment
  slices (7a / 7b / 7d) by name; all
  three diagnostic tables; CHANGELOG
  mention; review-packet PURPOSE
  PRESERVATION CHECK).

  **Recommended next slice:** **PR
  comment API writer** (step 7f) — add
  `publishPrCommentRun(input)` helper
  in `@rekon/capability-docs` (parallel
  to `publishGitHubCheckRun`) + `rekon
  publish pr-comment --send` CLI mode +
  workflow template update +
  validator-profile lift +
  `tests/contract/pr-comment-send-cli.test.mjs`
  with a local `node:http` fake server
  + `--api-base-url` flag + sentinel-
  token contract test.

  No new package, no new CLI command,
  no new helper, no workflow template
  change, no validator profile change,
  no GitHub API call, no token read,
  no artifact-shape change, no
  `schemaVersion` bump, no
  `FindingStatusLedger` /
  `FindingLifecycleReport` /
  `CoherencyDelta` /
  `ReconciliationPlan` mutation, no
  version bump, no npm publish.
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

> Shipped (slice 83): PreparedIntentPlan v1 now carries the required approval/proof envelope — `status.value` can be prepared only when `approval.status` is approved, and a plan with phases but without approval is not prepared. Approval proof re-checks runtime drift, handoff coverage, freshness, and verification from artifact values; `downstreamHandoff.sourceWriteAllowed` is the literal `false`; `explicit-operator-approval` / `manual-risk-acceptance` are reserved reasons. It creates no WorkOrder / VerificationPlan, executes no commands, and writes no source; intent:go remains deferred. See [PreparedIntentPlan artifact](../artifacts/prepared-intent-plan.md) and [PreparedIntentPlan Approval / Proof Model Decision](prepared-intent-plan-approval-proof-decision.md).

> Reviewed (slice 84): PreparedIntentPlan v1 is safe/stable as proof-approved phase/gate preparation — `status.value` can be prepared only when `approval.status` is approved, and a plan with phases but without approval is not prepared. Verification requirements are proof obligations, not VerificationPlan; preparation creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no commands, and writes no source; IntentStatusReport remains the next layer and intent:go remains deferred. See [PreparedIntentPlan safety review](prepared-intent-plan-safety-review.md).

> IntentStatusReport v1 decision (slice 85): the next intent layer is an artifact-backed status rollup generated read-only from IntentAssessmentReport, PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, PathFreshnessReport, and RuntimeGraphDriftReport. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself. It creates no WorkOrder / VerificationPlan, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport v1 decision](intent-status-report-v1-decision.md).

> IntentStatusReport v1 (slice 86): the intent status layer has shipped as a read-only rollup status report (`rekon intent status`) over IntentAssessmentReport, PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, PathFreshnessReport, and RuntimeGraphDriftReport. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself. It creates no WorkOrder / VerificationPlan / VerificationRun, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport artifact](../artifacts/intent-status-report.md).

> Reviewed (slice 87): IntentStatusReport v1 is safe/stable as read-only status reporting — it reports assessment / preparation / approval / work / verification / freshness / drift state but performs none of those steps. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself; WorkOrder / VerificationPlan generation remains deferred to a separate decision. It creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport safety review](intent-status-report-safety-review.md).

> Decided (slice 88): the intent work/proof handoff uses separate, explicit, gated generators — PreparedIntentPlan -> WorkOrder and PreparedIntentPlan -> VerificationPlan, each decided / implemented / safety-reviewed on its own. Intent work/proof handoff is artifact generation, not intent:go; WorkOrder generation must require a proof-approved PreparedIntentPlan; VerificationPlan generation must require PreparedIntentPlan verification requirements; IntentStatusReport gates handoff but does not generate downstream artifacts; generated WorkOrder and VerificationPlan must trace back to PreparedIntentPlan; handoff generation does not execute commands or write source files; intent:go remains deferred. See [Intent Work / Proof Handoff Decision](intent-work-proof-handoff-decision.md).

> Decided (slice 89): the Intent WorkOrder handoff uses an explicit gated WorkOrder generator (rekon intent work-order generate) that creates one WorkOrder from a proof-approved PreparedIntentPlan after the approval / IntentStatusReport work-ready / freshness / drift gates pass. Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go; WorkOrder generation must require a proof-approved PreparedIntentPlan; IntentStatusReport gates WorkOrder generation but does not generate WorkOrder; generated WorkOrder must trace back to PreparedIntentPlan; WorkOrder generation does not create VerificationPlan, execute commands, or write source files; intent:go remains deferred. See [Intent WorkOrder Handoff Decision](intent-work-order-handoff-decision.md).

> Shipped (slice 90): the Intent WorkOrder handoff generator shipped — `rekon intent work-order generate` reads a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready + a handoff-time freshness / drift recheck) and writes exactly one `WorkOrder` (`source: "intent-handoff"`) that traces back to the plan / status / assessment refs and the phase / obligation / verification-requirement ids. **Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go**; it creates no `VerificationPlan`, executes no commands, and writes no source files; intent:go remains deferred. See [intent WorkOrder handoff](../concepts/intent-work-order-handoff.md).

> Reviewed (slice 91): the Intent WorkOrder handoff is safe/stable as an explicit gated WorkOrder generator — `rekon intent work-order generate` requires a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready + a handoff-time freshness / drift recheck); the blocked path writes no `WorkOrder`, and the generated path writes exactly one `WorkOrder` that traces back to the plan. **Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go**; WorkOrder generation creates no `VerificationPlan` / `VerificationRun` / `VerificationResult`, executes no commands, and writes no source files; intent:go remains deferred. Next: Intent VerificationPlan Handoff Decision. See [Intent WorkOrder Handoff Safety Review](./intent-work-order-handoff-safety-review.md).

> Decided (slice 92): the Intent VerificationPlan handoff uses an explicit gated `VerificationPlan` generator (`rekon intent verification-plan generate`) that creates one `VerificationPlan` from a proof-approved `PreparedIntentPlan`'s verification requirements after the approval / IntentStatusReport (work-ready / work-in-progress / verification-ready) / `verificationPlanAllowed` / freshness / drift gates pass. **Intent VerificationPlan handoff is VerificationPlan artifact generation, not intent:go**; it requires a proof-approved PreparedIntentPlan and non-empty verification requirements; IntentStatusReport gates generation but does not generate VerificationPlan; generated VerificationPlan must trace back to PreparedIntentPlan; VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. WorkOrder is optional in v1 (cited when available). Next: Intent VerificationPlan Handoff Implementation. See [Intent VerificationPlan Handoff Decision](./intent-verification-plan-handoff-decision.md).

> Shipped (slice 93): the Intent VerificationPlan handoff generator shipped — `rekon intent verification-plan generate` reads a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready / work-in-progress / verification-ready + a handoff-time freshness / drift recheck), classifies each requirement command for safety, and writes exactly one `VerificationPlan` (`source: "intent-handoff"`) that traces back to the plan; the blocked gate writes none. **Intent VerificationPlan handoff generates VerificationPlan only from a proof-approved PreparedIntentPlan**; WorkOrder is optional in v1 (cited when available); VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. Next: Intent VerificationPlan Handoff Safety Review. See [intent VerificationPlan handoff](../concepts/intent-verification-plan-handoff.md).

> Reviewed (slice 94): the Intent VerificationPlan handoff is safe/stable as an explicit gated VerificationPlan generator — `rekon intent verification-plan generate` requires a proof-approved `PreparedIntentPlan` with non-empty verification requirements (gated by `IntentStatusReport` work-ready / work-in-progress / verification-ready + a handoff-time freshness / drift recheck), classifies each requirement command for safety, blocks unsafe / ambiguous commands, and writes exactly one `VerificationPlan` on pass; the blocked path writes none. **Intent VerificationPlan handoff is VerificationPlan artifact generation, not intent:go**; WorkOrder is optional in v1 (cited when available); VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. Plan bundle / LLM-agent handoff directory work is deferred to the next phase. Next: Intent Plan Bundle / Agent Handoff Directory Decision. See [Intent VerificationPlan Handoff Safety Review](./intent-verification-plan-handoff-safety-review.md).

> Decided (slice 95): intent plan bundles project canonical artifacts into a repo-local `.rekon/intent/plans/<intent-id>/` directory (human-readable root files + agent handoff files under `agent/`), generated as a regenerable projection with a `manifest.json` recording source artifact refs / digests / staleness. **Intent plan bundle is a projection, not canonical artifact truth**; canonical source of truth remains `.rekon/artifacts/`; agent handoff files live under `agent/`; bundle generation executes no commands, writes no source files, and implements no intent:go; stale bundles must not be treated as current handoff. Next: Intent Plan Bundle / Agent Handoff Implementation. See [Intent Plan Bundle / Agent Handoff Directory Decision](./intent-plan-bundle-agent-handoff-directory-decision.md).

> Shipped (slice 96): the Intent plan bundle generator shipped — `rekon intent bundle write` projects the canonical intent artifacts into a regenerable human + LLM-agent handoff bundle under `.rekon/intent/plans/<intent-id>/` (manifest + human files + `agent/` files), recording source refs / digests / staleness. **Intent plan bundle is a projection, not canonical artifact truth**; canonical source of truth remains `.rekon/artifacts/`; bundle generation executes no commands, writes no source files outside the bundle directory, creates no canonical artifacts, and does not implement intent:go; stale bundles must not be treated as current handoff. Next: Intent Plan Bundle / Agent Handoff Safety Review. See [intent plan bundle](../concepts/intent-plan-bundle.md).

> Reviewed (slice 97): the Intent plan bundle generator is safe/stable as a human + LLM-agent filesystem projection — `rekon intent bundle write` writes the bundle only under `.rekon/intent/plans/<intent-id>/` with path-traversal safety on the intent id and every file path. **Intent plan bundle is a projection, not canonical artifact truth**; canonical source of truth remains `.rekon/artifacts/`; bundle generation creates no canonical artifacts, executes no commands, and writes no source files; stale bundles must not be treated as current handoff; intent:go remains deferred. Next: Intent Go / Execution Boundary Decision. See [Intent Plan Bundle / Agent Handoff Safety Review](./intent-plan-bundle-agent-handoff-safety-review.md).

> Decided (slice 98): the Intent plan bundle → Circe handoff projection is an import adapter, not a new planning system — Rekon emits a Circe `rekon-circe-handoff` package under `.rekon/intent/plans/<intent-id>/circe/` (handoff.json, phase-plan.json, work-orders/, verification-plans/) derived from the bundle. **Canonical Rekon truth remains `.rekon/artifacts/`**; Rekon does not execute the Circe handoff, does not run Circe commands during bundle generation, and does not write source files; Circe owns orchestration after import; intent:go remains deferred. Next: Intent Plan Bundle → Circe Handoff Projection Implementation. See [Intent Plan Bundle → Circe Handoff Projection Decision](./intent-plan-bundle-circe-handoff-projection-decision.md).

> Implemented (slice 99): the Intent plan bundle → Circe handoff projection now ships under `.rekon/intent/plans/<intent-id>/circe/` (handoff.json, phase-plan.json, work-orders/, verification-plans/), matching Circe's `rekon-circe-handoff` schema (validated against Circe's real normalizers). The bundle includes a Circe projection under `circe/`; **Circe handoff projection is an import adapter, not a new planning system**; **Canonical Rekon truth remains `.rekon/artifacts/`**; Rekon does not run Circe commands during bundle generation, does not execute the Circe handoff, and does not write source files; Circe owns orchestration after import; intent:go remains deferred. Next: Intent Plan Bundle → Circe Handoff Projection Safety Review. See [Intent Plan Bundle concept](../concepts/intent-plan-bundle.md).

> Reviewed (slice 100): the Intent plan bundle → Circe handoff projection is safe/stable as a Circe import adapter (schema-valid against Circe's real normalizers, boundary preserved, no Circe execution) — no blocker. But proof/gate traceability is incomplete: the PreparedIntentPlan approval/proof envelope, the IntentStatusReport gate status, and freshness/drift refs do not survive into `circe/`. **Circe handoff projection is an import adapter, not a new planning system**; **Canonical Rekon truth remains `.rekon/artifacts/`**; Rekon does not run Circe commands during bundle generation, does not execute the Circe handoff, and does not write source files; Circe owns orchestration after import; Circe projection must preserve Rekon's proof/gate traceability, and if it is incomplete, intent:go must remain blocked; intent:go remains deferred. Next: Intent Plan Bundle → Circe Proof/Gate Projection Enrichment. See [Intent Plan Bundle → Circe Handoff Projection Safety Review](./intent-plan-bundle-circe-handoff-projection-safety-review.md).

> Enriched (slice 101): the Intent plan bundle → Circe proof/gate projection now also emits `circe/rekon-proof.json` (kind rekon-circe-proof), carrying the PreparedIntentPlan approval/proof envelope, the IntentStatusReport gate state, the freshness/drift refs, and per-phase gate metadata; the per-phase WorkOrder / VerificationPlan projections gain additive `intentHandoff` traceability and `handoff.json` a `rekonProofPath` pointer. The sidecar never claims approval/readiness the source does not support; **sourceWriteAllowed remains false**, **commandsExecuted remains false**, **intentGoDeferred remains true**; **Canonical Rekon truth remains `.rekon/artifacts/`**; Rekon does not run Circe commands during bundle generation, does not execute the Circe handoff, and does not write source files; Circe schema validation remains intact (re-validated against Circe's real normalizers); intent:go remains deferred. Next: Intent Plan Bundle → Circe Proof/Gate Projection Safety Review. See [Intent Plan Bundle concept](../concepts/intent-plan-bundle.md).

> Reviewed (slice 102): the Intent plan bundle → Circe proof/gate projection is safe/stable — no blocker. `circe/rekon-proof.json` carries the PreparedIntentPlan approval/proof envelope, the IntentStatusReport gate state, the freshness/runtime-drift refs, and per-phase gate metadata; the sidecar never claims approval/readiness the source artifacts do not support; **sourceWriteAllowed remains false**, **commandsExecuted remains false**, **intentGoDeferred remains true**; the enriched projection remains compatible with Circe's real normalizers; **Canonical Rekon truth remains `.rekon/artifacts/`**; Rekon does not run Circe commands during bundle generation, does not execute commands, and does not write source files; intent:go remains deferred. The non-executing handoff pipeline is complete. Next: Intent Go / Execution Boundary Decision. See [Intent Plan Bundle → Circe Proof/Gate Projection Safety Review](./intent-plan-bundle-circe-proof-gate-projection-safety-review.md).

> Shipped (slice 104, CLI Intent Help Surface Alignment): top-level `rekon help` now lists all six shipped rich intent commands (intent assess / intent prepare / intent status / intent work-order generate / intent verification-plan generate / intent bundle write), states the canonical flow (intent assess → … → intent bundle write, then circe rekon-handoff validate/routes/import), and restates the boundary: **Rekon prepares, proves, packages, and exports; Circe imports and orchestrates**; Rekon does not run Circe, does not execute commands, and does not write source files, and does not implement intent:go. Discoverability fix only — no command behavior changed, no new command, `intent go` is not listed as a shipped command, **intentGoDeferred remains true**. Next: V1 Readiness / Release Review. See [Intent Plan Bundle → Circe Proof/Gate Projection Safety Review](./intent-plan-bundle-circe-proof-gate-projection-safety-review.md).

> Reviewed (slice 105, V1 Readiness / Release Review): V1 readiness is **conditionally approved** for the non-executing Rekon → Circe prepared-plan handoff (Option B). **V1 means prepare/prove/package/export, not Rekon-side execution; Circe owns orchestration for V1.** Included: IntentAssessmentReport, PreparedIntentPlan (approval/proof), IntentStatusReport, WorkOrder + VerificationPlan handoffs, plan bundle, Circe proof/gate projection, and the six help-listed intent commands. Proven by the full Rekon suite (4281 / 0 fail) + package gates, Circe handoff schema validation, and the serve-loop proof (pass 1 / fail 0). Excluded/deferred beyond V1: **intent:go**, Rekon-side command execution, Rekon-side source writes, and **VerificationRun / VerificationResult generation**. Release mechanics (version / tag / publish) are deferred to a separate slice; no publish. Next: V1 Release Mechanics / Versioning Decision. See [V1 Readiness / Release Review](./v1-readiness-release-review.md).

> Decided (slice 106, V1 Release Mechanics / Versioning Decision): selected **Option B — staged V1 release mechanics**. **V1 release mechanics do not publish to npm in this slice; V1 release mechanics do not bump versions in this slice.** Real package state recorded (not edited): a private workspace root `rekon` + 21 public packages, all lockstep at `0.1.0-beta.0`, none private; intended release target `1.0.0` applied lockstep, deferred to an explicit versioning slice. The version-bump / git-tag / npm-publish gates and the release-notes + migration-notes models are pinned (canonical `intent assess → … → intent bundle write` flow + `circe rekon-handoff validate/routes/import`; legacy `rekon prepare plan` / `.rekon/handoffs` superseded by `.rekon/intent/plans/<intent-id>/circe/`). V1 boundaries reaffirmed: prepare/prove/package/export, not Rekon-side execution; Circe owns orchestration; intent:go deferred; no Rekon command execution / source writes / VerificationRun / VerificationResult. Next: V1 Release Prep Implementation. See [V1 Release Mechanics / Versioning Decision](./v1-release-mechanics-versioning-decision.md).

> Prepared (slice 107, V1 Release Prep Implementation): drafted the V1 release materials under `docs/releases/` — [V1 Release Notes](../releases/v1-release-notes.md), [V1 Migration Notes](../releases/v1-migration-notes.md), and [V1 Release Checklist](../releases/v1-release-checklist.md). Release notes pin V1 = prepare/prove/package/export (not Rekon-side execution), the six rich `rekon intent ...` commands, the Rekon/Circe boundary, and the proof/safety evidence (incl. the external serve-loop proof, pass 1 / fail 0). Migration notes pin the canonical `intent assess → … → intent bundle write` flow + `circe rekon-handoff validate/routes/import`, that legacy `rekon prepare plan` / `.rekon/handoffs` is superseded by `.rekon/intent/plans/<intent-id>/circe/`, that `intent:go` is not available in V1, and that `.rekon/artifacts/` remains canonical truth. The checklist pins the version-bump / git-tag / npm-publish gates. Package state re-confirmed and recorded (not edited): private root + 21 public packages lockstep at `0.1.0-beta.0`; **no version bump, no tag, no npm publish** occurred. Next: V1 Versioning Decision / Implementation. See [V1 Release Notes](../releases/v1-release-notes.md).

> Shipped (slice 108, V1 Versioning Implementation): executed the staged lockstep version bump — all 21 public workspace packages **and the private root `rekon`** move from `0.1.0-beta.0` to **`1.0.0`**, with every internal `@rekon/*` exact-version dependency pin updated to `1.0.0` and `package-lock.json` regenerated (no deps added/removed). Versioning is lockstep; no package excluded; root aligned (still `private: true`) per the release-readiness coherence convention. Lockstep is enforced by `tests/docs/release-readiness.test.mjs` (`EXPECTED_VERSION = "1.0.0"`) + new `tests/docs/v1-versioning.test.mjs`. **No git tag and no npm publish occurred.** V1 remains prepare/prove/package/export, not Rekon-side execution; `intent:go` remains deferred. Next: V1 Tagging Decision / Implementation. See [V1 Versioning Implementation](./v1-versioning-implementation.md).

> Shipped (slice 109, V1 Tagging Decision / Implementation): selected **Option B — an annotated `v1.0.0` git tag** and created it from the verified final commit, pushing it to origin after the full nine-command gate passed. The tag is the durable V1 release anchor; **package versions remain `1.0.0` (no bump), npm publish does not occur in this slice**, and `intent:go` remains deferred. Pre-tag state re-confirmed: root + 21 public packages lockstep at `1.0.0`, with no pre-existing local or remote `v1.0.0` tag. V1 remains prepare/prove/package/export, not Rekon-side execution; Circe owns orchestration for V1. Next: V1 Publish Decision / Implementation. See [V1 Tagging Decision](./v1-tagging-decision.md).

> Decided (slice 110, Rekon First-Run Scan / Install Onboarding Decision): selected **Option B — `rekon scan` as the canonical first-run command**. A new user installs Rekon and runs `rekon scan`, which initializes `.rekon/` if needed and creates the first repository intelligence substrate; docs / agent-context / verification / CI options are offered only **after** the first scan (`snapshot_ready`), never before. `refresh` is demoted to an expert / compatibility alias. Recorded UX gap at `6297d69`: no `rekon scan` exists; `rekon init` + `rekon refresh` lead `usage()` and the README "First 10 Minutes" leads with `refresh`. Pins the workspace state model, pre-scan messaging, post-scan actions, and ASCII/branding posture (no ASCII art in `--json`). **No `rekon scan` implementation, no CLI change, no prompts, no ASCII art, no version bump, no npm publish, no intent:go.** Next: Rekon First-Run Scan Implementation. See [Rekon First-Run Scan / Install Onboarding Decision](./rekon-first-run-scan-onboarding-decision.md).

> Shipped (slice 111, Rekon First-Run Scan Implementation): implemented the canonical first-run command **`rekon scan [--root <path>] [--json]`** — a thin wrapper over the existing `runRefresh` substrate pipeline that initializes `.rekon/` if needed and creates the first repository intelligence substrate, then reports the workspace state (`not_initialized` / `initialized_without_snapshot` / `snapshot_ready`), artifact count, post-scan next actions, and seven boundary booleans (all false). `scan --json` emits no ASCII art. `refresh` is unchanged and retained as the expert / compatibility update command; top-level help lists `scan` first. Recorded that the shared pipeline normalizes `config.capabilities` to `[]` (= default capabilities), existing refresh behavior. Contract test (25) + docs test (9). **No prompts, no ASCII art, no create-rekon, no version bump, no npm publish, no `intent:go`, no source writes outside `.rekon/`.** Next: Rekon First-Run Scan Safety Review. See [Rekon First-Run Scan / Install Onboarding Decision](./rekon-first-run-scan-onboarding-decision.md).

> Reviewed (slice 112, Rekon First-Run Scan Safety Review): reviewed the shipped **`rekon scan`** end-to-end and confirmed it **safe/stable as the canonical first-run command** — the first-run path (initialize + build the first repository intelligence substrate, reusing `runRefresh`) and the repeat path (update substrate, non-destructive config) both pass (25-assertion contract test + slice-111 CLI smoke). `refresh` is preserved as the expert / compatibility update command; the no-docs/agent/CI/verification-before-scan, no-command-execution, no-source-write, and no-ASCII-art-in-`--json` boundaries all hold; `intent:go` stays deferred. The `config.capabilities` normalization (`[]` = default capabilities) is recorded as acceptable for v1 (existing refresh behavior). No code or behavior change. Next: Rekon Install / Setup / ASCII Art UX Decision. See [Rekon First-Run Scan Safety Review](./rekon-first-run-scan-safety-review.md).

> Fixed (slice 113, Fresh Repo Intent Readiness / Proof Context Fix): closed the fresh-repo intent-preparation gap surfaced by Circe operator dogfood — `rekon scan → rekon intent assess` was blocked by missing `StepCapabilityGraph` and `RuntimeGraphDriftReport`. Added the orchestrator command **`rekon intent context prepare`**, which runs the existing producer commands (`step graph build`, `handoff contract build`, `runtime graph observe`/`drift`, `handoff coverage report`) in dependency order, best-effort, so the public path `rekon scan → rekon intent context prepare → rekon intent assess → … → rekon intent bundle write` works on a fresh repo with **no manual `.rekon/artifacts` seeding**. The orchestrator + producers are now listed in top-level help, and the two `intent assess` blocker messages point at the one-step command and state the not-evaluated honesty. Fresh-repo acceptance proof passed end-to-end (context prepare built 5/5; assess 0 blockers / needs-review; bundle emitted `circe/handoff.json`; artifacts valid; source unchanged). **No change to `scan` / `refresh` or the `intent assess` approval/proof policy; no `intent:go`; no Circe execution by Rekon; no source writes.** Next: Fresh Repo Intent Readiness Safety Review. See [intent assessment](../concepts/intent-assessment.md).

> Reviewed (slice 114, Fresh Repo Intent Readiness Safety Review): reviewed the slice-113 fresh-repo intent-context fix end-to-end and confirmed it **safe/stable** — the fresh-repo public path (`rekon scan → rekon intent context prepare → rekon intent assess → … → rekon intent bundle write`) works without private `.rekon/artifacts` seeding; `rekon intent context prepare` uses the existing producer commands in dependency order; `rekon scan` / `rekon refresh` and the `intent assess` severity policy are unchanged; missing runtime/handoff evidence is recorded as `not-evaluated` / `observation-missing`, not false success; Rekon runs no Circe and writes no source in this path; `intent:go` remains deferred; phase-level VerificationPlan behavior is a recorded follow-up. Adds the safety-review memo, a 19-assertion docs test, a review packet, the deferred slice-113 concept/strategy cross-links, and additive doc pointers. No code or behavior change. Next: Intent Bundle Phase-Level Verification Policy / Implementation. See [Fresh Repo Intent Readiness Safety Review](./fresh-repo-intent-readiness-safety-review.md).

> Shipped (slice 115, Intent Bundle Phase-Level Verification Policy / Implementation): made phase-level verification explicit in the intent plan bundle and its Circe projection so skipped verification never reads as proof. Every phase now carries an explicit `verificationPosture` (`executable` / `final-verification` / `manual-review` / `needs-review`) in `circe/rekon-proof.json` `phaseGates[]` (+ `manualGate` / `needsReview` / `reason` / `verificationPlanPath`), on `circe/phase-plan.json` `phases[].rekon`, in `verification-plan.md`, and in `agent/verification.json`. `phase-modify` / `phase-refactor` map the plan's safe executable verification requirements and ship a per-phase VerificationPlan (else `needs-review`); `phase-verify` carries final verification; `phase-investigate` / `phase-review` are reviewer-gated `manual-review`. `rekon intent bundle write` reports a `phaseVerification` summary. Derived in the bundle projection layer only — **no canonical artifact, approval/proof, scan/refresh, or runtime-execution change; no `intent:go`; no Circe execution by Rekon; no source writes.** New exported type `IntentPhaseVerificationPosture`; all projection fields additive and Circe-schema-compatible. Contract +20 (105 pass) + docs (8). Next: Intent Bundle Phase-Level Verification Safety Review. See [intent plan bundle](../concepts/intent-plan-bundle.md).

> Reviewed (slice 116, Intent Bundle Phase-Level Verification Safety Review): reviewed the slice-115 phase-level verification posture implementation end-to-end and confirmed it **safe/stable** — every phase has explicit verification posture (`executable` / `final-verification` / `manual-review` / `needs-review`); `phase-modify` / `phase-refactor` get executable verification when safe requirements exist (else `needs-review`); `phase-verify` carries final verification; `phase-investigate` / `phase-review` are explicit manual / reviewer gates; a phase without executable verification is never silently treated as verified; skipped verification is not proof; posture is projection metadata, not a VerificationRun. **No commands executed, no VerificationRun / VerificationResult created, no source writes, no Circe run by Rekon, `intent:go` deferred.** Adds the safety-review memo, a 22-assertion docs test, and a review packet. No code or behavior change. Next: Rekon Install / Setup / ASCII Art UX Decision. See [Intent Bundle Phase-Level Verification Safety Review](./intent-bundle-phase-level-verification-safety-review.md).

> Decided (slice 117, Rekon Install / Setup / ASCII Art UX Decision): defined the polished V1 install + first-run setup + ASCII / branding UX and selected **Option B — staged install/setup polish**. The V1 install path stays scriptable (`npm install -D @rekon/cli` → `npx rekon scan`); a future optional `rekon setup` and later `npm init rekon` layer interactive guidance without changing the safe scan-first model. **Install must not run onboarding automatically** (`@rekon/cli` ships no postinstall); first-run setup starts with scan; docs / agent / verification options are not offered before the first scan; ASCII art never appears in `--json`; non-TTY / CI never prompt and default to no banner; `NO_COLOR` / `REKON_NO_BANNER` respected; `refresh` stays expert / compat; onboarding never implies command execution, source writes, or Circe execution by Rekon; `intent:go` deferred. Records the brand line / compact mark and a resource candidate plan — no dependency added, no setup / prompts / ASCII / create-rekon implemented. Adds the decision memo, a 20-assertion docs test, and a review packet. No code or behavior change. Next: Rekon Setup / Welcome UI Implementation. See [Rekon Install / Setup / ASCII Art UX Decision](./rekon-install-setup-ascii-ux-decision.md).

> Shipped (slice 118, Rekon Setup / Welcome UI Implementation): added the non-interactive-safe welcome / setup UI foundation. **`rekon welcome [--json] [--no-banner]`** prints a branded Scan → Snapshot → Act lifecycle introduction (lifecycle, first-run command, intent workflow, boundaries); **`rekon setup [--root <path>] [--json] [--no-banner]`** is deterministic and non-interactive — it detects the workspace state read-only (no scan, no `.rekon/` creation before scan) and prints recommended next actions. ASCII art never appears in `--json`; `NO_COLOR` disables color, `REKON_NO_BANNER` / `--no-banner` disable the banner, non-TTY shows the compact mark and never prompts. **No prompts, no `create-rekon`, no postinstall onboarding, no dependency, no Circe execution, no command execution, no source writes; `intent:go` deferred.** New concept doc + contract test (32) + docs test (12) + review packet. Next: Rekon Setup / Welcome UI Safety Review. See [Rekon Setup / Welcome UI](../concepts/rekon-setup-welcome.md).

> Reviewed (slice 119, Rekon Setup / Welcome UI Safety Review): reviewed the slice-118 `rekon welcome` / `rekon setup` implementation end-to-end and confirmed it **safe/stable** — `rekon welcome` is explanatory (not action-taking); `rekon setup` is deterministic and non-interactive, does not run scan, does not create `.rekon/` before scan, and generates no docs / agent handoff / CI / VerificationPlan; ASCII art never appears in `--json`; `REKON_NO_BANNER` suppresses the banner and `NO_COLOR` suppresses ANSI color; non-TTY setup does not prompt; onboarding implies no Circe run, command execution, or source writes; `intent:go` deferred. Adds the safety-review memo, a 20-assertion docs test, and a review packet. No code or behavior change. Next: Rekon Interactive Setup Prompt Decision. See [Rekon Setup / Welcome UI Safety Review](./rekon-setup-welcome-ui-safety-review.md).

> Decided (slice 120, Rekon Interactive Setup Prompt Decision): pinned the interactive prompt policy for `rekon setup` — **selected TTY-only scan-first prompts**. Prompts are allowed only in human TTY mode; `rekon setup --json`, non-TTY, and CI never prompt. Before scan, setup may ask only whether to run the first scan; after a snapshot exists it may present post-scan next actions as explicit choices. A decided (unimplemented) `--yes` flag may run the first scan only and must not perform downstream actions automatically. Prompt answers are not persisted in v1; cancellation runs nothing and persists nothing. Setup does not run Circe, execute arbitrary commands, or write source files; `intent:go` deferred. Decision-only — no code or behavior change. Next: Rekon Interactive Setup Prompt Implementation. See [Rekon Interactive Setup Prompt Decision](./rekon-interactive-setup-prompt-decision.md).

---

_Re-reviewed (slice 103): the Intent plan bundle → Circe proof/gate projection is safe/stable — no blocker. The current built Rekon CLI passed the Circe validate/routes/import/serve-loop proof (Circe's `rekon-intent-handoff-serve-loop.test.ts`, pass 1 / fail 0), so the enriched projection remains compatible with Circe. Top-level Rekon help is stale (0 of 6 richer intent commands listed) and must be aligned before V1/operator-ready release. `sourceWriteAllowed` / `commandsExecuted` stay false; `intent:go` remains deferred. See [Circe Proof/Gate Projection Safety Review](./intent-plan-bundle-circe-proof-gate-projection-safety-review.md)._

> Reviewed (slice 124): the explicit operator approval path (`rekon intent approve`) was reviewed
> safe/stable — accepted proof gaps are recorded, the source draft stays immutable, approval enables but
> does not create the downstream handoffs, and no commands / source writes / Circe occur; `intent:go`
> remains deferred. Next: Intent Status Work-Ready Transition Decision. See
> [Intent Operator Approval / Proof Acceptance Safety Review](./intent-operator-approval-proof-acceptance-safety-review.md).

> Decided (slice 125): the explicit status work-ready transition was pinned — an approved plan reaches
> work-ready via a new `IntentStatusReport` revision (not in-place mutation, not an approval side
> effect), enabling but not creating the WorkOrder / VerificationPlan handoffs; no commands / source
> writes / Circe; `intent:go` deferred. Next: Intent Status Work-Ready Transition Implementation. See
> [Intent Status Work-Ready Transition Decision](./intent-status-work-ready-transition-decision.md).
>
> Shipped (slice 126): the explicit transition is `rekon intent status transition` — see the
> [Intent Status Work-Ready Transition Implementation](./intent-status-work-ready-transition-implementation.md).
> Reviewed safe/stable (slice 127): see the
> [Intent Status Work-Ready Transition Safety Review](./intent-status-work-ready-transition-safety-review.md).

> Decided (slice 128): the missing classic plan-preparation intelligence (intake / normalization /
> actionability / elicitation) is restored by the
> [Classic Intent Plan Compiler / Elicitation Parity Decision](./classic-intent-plan-compiler-elicitation-parity-decision.md)
> — a report-first `IntentPlanActionabilityReport` before approval. No source writes, no command
> execution, no Circe; `intent:go` deferred. Next: Intent Plan Actionability Report v1.

## Semantic File Understanding v1

Rekon has a per-file semantic understanding capability (slice 144): `rekon semantic file understand` produces a `SemanticFileUnderstandingReport`. Deterministic structural extraction (language, line/byte counts, imports, public exports, responsibilities) is always on and authoritative for imports/exports (the hallucination guard); optional LLM semantic understanding is a schema-validated, deterministically-rechecked proposal, not proof. It executes no commands, writes no source files, generates no embeddings, creates no PreparedIntentPlan / WorkOrder / VerificationPlan, runs no Circe, and intent:go remains deferred. See [Semantic File Understanding v1](./semantic-file-understanding-v1.md) and the [concept](../concepts/semantic-file-understanding.md).

## Semantic File Understanding Safety Review

Semantic File Understanding v1 was reviewed (slice 145) and found **safe/stable** as a proposal/context layer: semantic file understanding is proposal/context, not proof; deterministic structural facts remain authoritative for imports and public exports; provider output is schema-validated and deterministically rechecked; source files are read, not modified; no command execution, embeddings, PreparedIntentPlan / WorkOrder / VerificationPlan / VerificationRun / VerificationResult, or Circe; intent:go, scan integration, and embeddings remain deferred. Next: a Semantic File Understanding Scan Integration Decision. See [Semantic File Understanding Safety Review](./semantic-file-understanding-safety-review.md).

## Semantic File Understanding Scan Integration Decision

How `SemanticFileUnderstandingReport` integrates with scan is decided (slice 146): scan remains deterministic by default; repo-scale understanding arrives first as an explicit batch command (`rekon semantic files understand --changed|--all`) before any `rekon scan --semantic-files` flag. Provider calls are never surprising defaults; source text is not sent to providers by default; reports are proposal/context, not proof; no command execution, source writes, or embeddings; embeddings remain a separate track; intent:go deferred. Next: Semantic Files Understand Batch Command v1. See [Semantic File Understanding Scan Integration Decision](./semantic-file-understanding-scan-integration-decision.md).

## Semantic File Understanding Scan Integration

Semantic file understanding is now an explicit opt-in scan layer (slice 147): `rekon scan --semantic-files auto|required` writes one `SemanticFileUnderstandingReport` per selected file, reusing the shipped single-file builder and router-bound adapter. Plain `rekon scan` (and `--semantic-files off`) stay deterministic and call no provider. Provider calls are never surprising defaults; source text is not sent to providers by default; reports are proposal/context, not proof; no command execution, source writes, or embeddings; embeddings remain a separate track; intent:go deferred. This reverses the slice-146 batch-command-first decision. See [Semantic File Understanding Scan Integration](./semantic-file-understanding-scan-integration.md).

## Semantic File Understanding Scan Integration Safety Review

The `rekon scan --semantic-files off|auto|required` integration was reviewed (slice 148) and found **safe/stable**: plain `rekon scan` remains deterministic; semantic file understanding during scan is explicit opt-in only; provider calls are never surprising defaults; source text is not sent to providers by default; `--semantic-files off` writes no report; auto falls back safely; required fails cleanly without partial report writes; deterministic imports/exports remain authoritative; source files are read, not modified; no command execution, embeddings, PreparedIntentPlan / WorkOrder / VerificationPlan / VerificationRun / VerificationResult, or Circe; intent:go deferred; reports are not yet consumed automatically by intent context. Next: Semantic File Understanding Intent Context Decision; embeddings remain a separate track. See [Semantic File Understanding Scan Integration Safety Review](./semantic-file-understanding-scan-integration-safety-review.md).

## Semantic File Understanding Intent Context Decision

How `IntentAssessmentReport` and `IntentPlanActionabilityReport` may consume `SemanticFileUnderstandingReport` is decided (slice 149): **Option B — explicit semantic context consumption with latest-by-path fallback** (`rekon intent assess --semantic-context latest|--semantic-context-ref <ref>`, `rekon intent plan review --semantic-context latest|--semantic-context-ref <ref>`). Semantic reports remain proposal/context, not proof; consumption is explicit, not automatic; semantic context never approves plans, satisfies proof gates by itself, replaces deterministic evidence, executes commands, writes source, creates WorkOrder/VerificationPlan, or runs Circe; stale reports are not consumed silently; embeddings and intent:go remain deferred. Next: Semantic File Understanding Intent Context Implementation. See [Semantic File Understanding Intent Context Decision](./semantic-file-understanding-intent-context-decision.md).

## Semantic File Understanding Intent Context Safety Review

The slice-150 semantic intent-context integration was ground-reviewed and declared safe/stable: `SemanticFileUnderstandingReport` consumption by `rekon intent assess` / `rekon intent plan review` is explicit, proposal/context-only, never weakens readiness/proof gates, and stale reports are never consumed silently. See [Semantic File Understanding Intent Context Safety Review](./semantic-file-understanding-intent-context-safety-review.md).

## Capability Evidence Graph / Semantic Intelligence

Rekon's next semantic-intelligence substrate is a `CapabilityEvidenceGraph`: deterministic facts, LLM interpretation, ontology labels, embedding similarity, runtime traces, and human overrides become evidence-backed claims. Embeddings are one evidence source, not the center — embedding similarity is proposal, not proof. See [Capability Evidence Graph / Semantic Intelligence Architecture Decision](./capability-evidence-graph-semantic-intelligence-decision.md).
