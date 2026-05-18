# Classic Guarantee Regression Plan

## Purpose

This plan turns the workflow guarantees identified in
[classic-guarantees-audit.md](classic-guarantees-audit.md) into
concrete regression tests. Each entry names the guarantee, points to
the classic source that originally provided it, names the current
Rekon coverage, identifies the missing coverage, and proposes a
regression test plus the implementation batch that should ship it.

The plan is priority-ordered:

- **P0** — must preserve before serious external users land. A gap
  here means the original problem the classic system solved is not
  yet adequately solved by Rekon.
- **P1** — should preserve before beta. Partial Rekon coverage with
  a real gap.
- **P2** — later maturity. Gap is acknowledged and intentionally
  deferred (often Phase C or Phase D).

Tests should live under `tests/contract/`, `tests/docs/`, or a new
`tests/guarantees/` directory at the contributor's discretion. Each
guarantee should have at least one named test that fails if the
guarantee regresses.

For each entry below:

```
Guarantee:
Classic source:
Current Rekon coverage:
Missing coverage:
Proposed regression test:
Implementation batch:
```

## P0 Guarantees

These are the must-preserve guarantees. A failure here means the
original problem the classic system solved is not yet solved by
Rekon.

### P0.1 One command can produce a coherent repo-intelligence state

Guarantee:
- A single command runs observe → project → snapshot → evaluate →
  findings lifecycle → coherency delta → publish architecture →
  artifacts validate → artifacts freshness in the correct order and
  leaves no `stale` artifacts and no `valid: false` issues.

Classic source:
- `services/FullScanHandler.ts` (574 lines), supporting handlers in
  `services/AnalysisService.ts`,
  `services/GraphBuildProvider.ts`,
  `services/RuleCompilationHandler.ts`.

Current Rekon coverage:
- **Closed.** `rekon refresh` orchestrates the full lifecycle in
  the documented order via `runRefresh(root, options)` in the CLI
  helper layer. See
  [../concepts/refresh.md](../concepts/refresh.md).
- Per-command readiness helpers (`ensureSnapshotReady`,
  `ensureCoherencyDeltaReady`, `ensurePreflight`) and per-phase CLI
  verbs remain available for incremental flows.
- `tests/contract/refresh-command.test.mjs` (11 tests) covers
  end-to-end orchestration, expected artifact families, step order,
  malformed-config failure, `--skip-publish`, `--skip-freshness`,
  the repeat-run / historical-stale scenario, the import-boundary
  fixture integration, and that existing commands still work.
- `tests/contract/artifact-freshness.test.mjs` continues to cover
  per-pair staleness.

Missing coverage:
- None for the current scope. Optional follow-ups (path/event
  freshness, watcher daemon) are listed in P1.4 and P2.2.

Proposed regression test:
- Already shipped — `tests/contract/refresh-command.test.mjs`
  exercises: clean fixture run produces every required artifact
  family; `artifacts validate` returns `{ valid: true, issues:
  [] }`; the latest major artifact of each type resolves to
  `fresh` after filtering historical `newer-input-exists` issues;
  a second back-to-back refresh still passes; malformed config
  fails before observe; `--skip-publish` and `--skip-freshness`
  are honored and recorded.

Implementation batch:
- "`rekon refresh` — coherent repo-intelligence state" (shipped).

### P0.2 Findings preserve lifecycle and status across runs

Guarantee:
- An operator decision (accepted / ignored / resolved) survives
  re-running `rekon evaluate` and `rekon findings lifecycle`.
  Findings are not lint noise that re-fires on every run.

Classic source:
- `services/IssueDetectionService.ts` (568 lines),
  `domain/issues/mergeIssues.ts`.

Current Rekon coverage:
- `@rekon/kernel-findings.FindingStatusLedger` and
  `FindingLifecycleReport` artifacts.
- `rekon findings status set` writes a ledger decision.
- `tests/contract/finding-lifecycle.test.mjs` and
  `tests/contract/coherency-delta.test.mjs` cover round-trip
  preservation.

Missing coverage:
- Cross-pack dedupe is partial; if two rule packs emit a finding
  with the same subject, both surface today.
- No explicit false-positive scoring beyond operator marking.

Proposed regression test:
- The existing tests cover the round-trip. A dedup test should be
  added with the issue-adjudication batch (P1.1).

Implementation batch:
- Already preserved at the per-pack level. Cross-pack dedupe is
  P1.1.

### P0.3 Resolver / preflight can explain ownership and next steps

Guarantee:
- Every `ResolverPacket` is explainable: a `resolutionTrace`
  records which source was checked, which source won, why fallback
  happened, and which next resolver is recommended. An operator
  who reads the packet can reconstruct the reasoning.

Classic source:
- `lib/context/resolver.ts`,
  `services/ContextHandler.ts`,
  `handlers/RealTimeContextHandler.ts`,
  `lib/issue-context.ts`.

Current Rekon coverage:
- All four resolvers (`resolve.route`, `resolve.seam`,
  `resolve.preflight`, `resolve.issue`) emit `resolutionTrace`.
- `tests/contract/route-seam-issue-resolvers.test.mjs` covers
  ownership-source precedence, risk rules, and trace shape.
- `tests/contract/verification-aware-issue-remediation.test.mjs`
  covers the new `issue.verification` trace step.

Missing coverage:
- No structural test that asserts "every registered resolver
  produces a packet with a non-empty `resolutionTrace`."

Proposed regression test:
- `tests/contract/resolver-trace-structural.test.mjs`: for every
  resolver returned by `rekon resolve list`, dispatch the
  resolver with minimal inputs and assert the resulting packet
  has `resolutionTrace.length > 0` and every entry has `step`,
  `sourceType`, `status`, and `message`.

Implementation batch:
- Optional small follow-up. Existing per-resolver tests cover the
  practical case.

### P0.4 Publications cite inputs and do not become canonical truth

Guarantee:
- Every published artifact (`Publication`) cites the artifacts it
  was generated from in `header.inputRefs`. The publication
  preface says publications are not canonical truth. Downstream
  consumers cite the underlying artifacts, not the publication.

Classic source:
- `services/ArchitectureDocsHandler.ts`,
  `lib/agent-docs.ts`,
  the assistant-doc projections.

Current Rekon coverage:
- `tests/contract/architecture-summary-publisher.test.mjs`,
  `tests/contract/architecture-summary-proof-loop.test.mjs`,
  `tests/contract/proof-report-publisher.test.mjs` all assert
  `header.inputRefs` content.
- Every publisher's preface text says "publications, not canonical
  truth."

Missing coverage:
- No structural test that walks every `Publication` artifact in a
  workspace and asserts `header.inputRefs.length > 0`.

Proposed regression test:
- `tests/contract/publication-inputrefs-structural.test.mjs`:
  after a clean fixture run that produces all three publications
  (`agents`, `architecture-summary`, `proof-report`), assert each
  one has a non-empty `header.inputRefs`.

Implementation batch:
- Optional small follow-up.

### P0.5 Work orders require proof and anti-gaming guardrails

Guarantee:
- Every `WorkOrder` (resolver-based and remediation-based) lists
  required checks and an anti-gaming guardrail. The paired
  `VerificationPlan` lists the same commands. The paired
  `VerificationResult` records outcomes; failed / partial /
  not-run are first-class. Passing verification does not
  auto-resolve findings.

Classic source:
- `services/IntentPreparationService.ts` (1823 lines),
  `lib/intent-preparation/**`,
  `packages/product-codebase-intel/src/intent/**`.

Current Rekon coverage:
- `tests/contract/remediation-work-order.test.mjs` and
  `tests/contract/verification-result.test.mjs` cover the
  artifact shapes and the status derivation logic.
- `tests/contract/verification-aware-issue-remediation.test.mjs`
  pins the "passing verification does not auto-resolve" invariant.

Missing coverage:
- No test asserts that modifying a `VerificationPlan` to drop a
  command (gaming the gate) is detected. The proof report shows
  the latest plan id; a regression test could assert that a plan
  with fewer commands than the prior plan triggers an
  identifiable signal (stale-plan callout, or a future "plan
  shrunk" warning).

Proposed regression test:
- `tests/contract/verification-plan-shrink-detection.test.mjs`:
  generate a `VerificationPlan` with 3 commands, record a passing
  result, generate a new `VerificationPlan` with 1 command, run
  `publish proof`, and assert the publication does not say
  `passed` for the new plan without a new `VerificationResult`.

Implementation batch:
- The current proof-report publisher already handles this case
  (status is `not-run` for the new plan if no new result exists).
  An explicit test would harden the behavior.

### P0.6 Reconciliation suggestions do not silently source-write

Guarantee:
- `rekon reconcile suggest` classifies every remediation item.
  `source-write-deferred` / `command-deferred` / `manual-review`
  operations are never applied. `--apply` only affects
  `artifact-only` operations. The legacy
  `rekon reconcile --operation <name>` path still denies non-
  artifact-only operations.

Classic source:
- `packages/product-codebase-intel/src/reconcile/PlanHandler.ts`,
  `packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`.

Current Rekon coverage:
- `tests/contract/reconciliation-suggestions.test.mjs` covers
  every operation class and the `--apply` interaction.

Missing coverage:
- None for the current scope. Source-write apply is Phase C and
  requires its own gate before it ships (P2.1).

Proposed regression test:
- Already covered.

Implementation batch:
- Already preserved. Source-write apply gate is P2.1.

### P0.7 Freshness distinguishes valid from current

Guarantee:
- `rekon artifacts validate` reports structural validity
  (`{ valid: true | false, issues }`). `rekon artifacts freshness`
  reports lineage currency (`fresh` / `stale` / `partial` /
  `unknown`). A `valid` artifact can be `stale`. The two checks
  are independent and both must run.

Classic source:
- `lib/context-freshness.ts`,
  `services/WatchHandler.ts`,
  artifact-store integrity helpers.

Current Rekon coverage:
- `tests/contract/artifact-freshness.test.mjs` covers status
  transitions; every batch that adds an artifact type adds a
  newer-input staleness test for it.

Missing coverage:
- No path/event-level freshness (P1.4) yet.

Proposed regression test:
- Already covered by the per-batch newer-input tests.
- Optional: a structural test asserts that every artifact type in
  the runtime's `ARTIFACT_CATEGORY_BY_TYPE` map has at least one
  freshness test. Hard to express without a registry; deferred.

Implementation batch:
- Already preserved.

## P1 Guarantees

These are real gaps with partial coverage. They should be closed
before a beta announcement.

### P1.1 Issue adjudication / dedupe / false-positive handling

Guarantee:
- Findings reach humans / agents only after adjudication: dedupe
  across rule packs, false-positive filtering, ownership
  hydration. Findings are signal, not lint noise.

Classic source:
- `services/IssueDetectionService.ts`,
  `domain/issues/mergeIssues.ts`.

Current Rekon coverage:
- v1 shipped: `IssueAdjudicationReport` groups duplicate /
  overlapping findings into canonical issue groups using
  deterministic key equality (type | ruleId | files | subjects |
  singleton fallback). Status / lifecycle context is preserved in
  per-group `statusBreakdown`. No finding is dropped (singletons
  emit singleton groups with `"singleton-no-grouping-key"`).
  Adjudication is a projection — raw `FindingReport`,
  `FindingStatusLedger`, and `FindingLifecycleReport` are never
  mutated. New CLI: `rekon issues adjudicate`, `rekon issues
  list`. See [../concepts/issue-adjudication.md](../concepts/issue-adjudication.md)
  and [../artifacts/issue-adjudication-report.md](../artifacts/issue-adjudication-report.md).
- Per-pack lifecycle and status preservation (existing).
- Coherency delta rollup excludes accepted/ignored/resolved
  (existing).

Missing coverage:
- Semantic / fuzzy / embedding matching (deliberately deferred —
  this batch is deterministic only).
- False-positive scoring beyond operator marking.
- Automatic ignore / accept (deliberately deferred — operator
  decisions remain in `FindingStatusLedger`).
- `CoherencyDelta` v2 that operates on adjudicated groups instead
  of raw lifecycle findings.
- `resolve.issue` v2 that searches adjudicated groups first.
- LLM-driven issue review / dedupe.

Regression test:
- `tests/contract/issue-adjudication.test.mjs` (15 tests):
  duplicate findings sharing type / rule / files / subjects
  produce one group; singleton-no-grouping-key fallback fires
  when files and subjects are empty; subject-only grouping when
  files are empty; no finding is dropped; highest severity wins;
  accepted / ignored / resolved statuses survive in
  `statusBreakdown`; mixed group with active + ignored is
  `active: true` and status `mixed`; `createIssueAdjudicationReport`
  produces a valid artifact; CLI `issues adjudicate` writes the
  report; CLI `issues list` returns groups and supports
  `--status`; CLI `issues list` builds a fresh report if none
  exists; adjudication does not mutate `FindingReport` /
  `FindingStatusLedger` / `FindingLifecycleReport` (bytes-on-disk
  check); freshness marks the report stale after a newer
  `FindingLifecycleReport`; artifacts validate stays clean;
  runtime helper carries lifecycle ref in `inputRefs`.

Implementation batches:
- "Issue adjudication / dedupe v1" (shipped) — deterministic
  grouping projection above `FindingLifecycleReport`.
- "CoherencyDelta v2 from IssueAdjudicationReport" (shipped) —
  `buildCoherencyDelta` consumes adjudicated groups when one
  exists; emits one delta item / one remediation step per group
  with `issueGroupId` / `memberFindingIds` / `groupingReasons`;
  legacy lifecycle path remains as fallback; `rekon refresh` runs
  `issues.adjudicate` between `findings.lifecycle` and
  `coherency.delta`. Pinned by
  `tests/contract/coherency-delta-adjudicated.test.mjs` (11 tests).
- "resolve.issue v2 from IssueAdjudicationReport" (shipped) —
  `resolve.issue` prefers adjudicated groups (matching exact
  `group.id`, `canonicalFindingId`, member `findingId`, or
  unique substring); a unique match populates
  `IssuePacket.issueGroup`, `matchSource:
  "IssueAdjudicationReport"`, and `verificationByFinding`
  aggregating per-member evidence with worst-status wins.
  Ambiguous fragments warn and refuse to silently choose.
  Missing report or no-match queries fall back to raw findings
  with an explicit fallback trace. Pinned by
  `tests/contract/issue-resolver-adjudicated.test.mjs` (17 tests).
- "Operator-assisted issue merge decision ledger" (shipped) —
  `IssueMergeDecisionLedger` records `accepted` / `rejected`
  decisions on merge candidates with required notes + optional
  reasons. `rekon issues merge decide` writes the ledger;
  `rekon issues list` annotates candidates with the latest
  decision. Decisions never mutate
  `IssueAdjudicationReport.groups`, `FindingReport`,
  `FindingStatusLedger`, or `FindingLifecycleReport`. Ledger is
  treated as canonical input by freshness. Pinned by
  `tests/contract/issue-merge-decision-ledger.test.mjs` (14
  tests).
- "CoherencyDelta v3 respects accepted merge decisions"
  (shipped) — `buildCoherencyDelta` reads the latest
  `IssueMergeDecisionLedger` and collapses accepted-merged
  groups into single merged rollup items (carrying
  `mergedIssueGroupIds` / `mergeDecisionIds` /
  `mergeCandidateIds` plus a union of member finding ids) with
  one merged remediation step per accepted set. The latest
  decision per `candidateId` wins (rejected supersedes earlier
  accepted, and vice versa). Rejected decisions and
  decision-less candidates keep groups separate.
  `IssueAdjudicationReport.groups` is **not** mutated; the
  rollup is a derived projection. New pure helper
  `rollupIssueGroupsByAcceptedMergeDecisions(input)`.
  `inputRefs` cite the ledger when used, so freshness marks the
  delta `stale` after a newer ledger. Pinned by
  `tests/contract/coherency-delta-merge-decisions.test.mjs` (12
  tests).
- "Issue adjudication v2: deterministic cross-rule merge hints"
  (shipped) — `IssueAdjudicationReport.mergeCandidates` emits
  advisory `IssueMergeCandidate` records for pairs of distinct
  groups sharing at least two deterministic signals
  (file / subject / severity / type-prefix /
  suggested-action / system). Confidence capped at 1.0;
  strength labels strong / medium / weak; both-inactive pairs
  skipped; mixed-activity pairs require strong. `CoherencyDelta`
  is unchanged. Pinned by
  `tests/contract/issue-adjudication-merge-candidates.test.mjs`
  (12 tests).
- "Publication and resolver awareness of accepted merge
  decisions" (shipped) — `@rekon/capability-docs.architecture-summary`
  and `@rekon/capability-docs.agent-contract` now render an
  `Accepted Issue Merge Roll-ups` section/subsection sourced
  from `CoherencyDelta` v3 merged rollup items; the agent
  contract `Do Not Do` adds a reminder that merged roll-ups are
  projections, not source mutations. `@rekon/capability-resolver.issueResolver`
  attaches an optional `mergeRollup: IssueMergeRollupSummary`
  on `IssuePacket` when the matched group is part of an
  accepted merged rollup in the latest `CoherencyDelta`, adds a
  sibling-group warning, an `issue.merge` /
  `sourceType: "CoherencyDelta"` / `status: "used"` trace entry,
  and cites `CoherencyDelta` in `header.inputRefs`. Rejected
  decisions never produce a `mergeRollup`. None of these
  surfaces read `IssueMergeDecisionLedger` directly; everything
  flows through `CoherencyDelta`. Pinned by
  `tests/contract/merge-decision-publication-resolver-awareness.test.mjs`
  (10 tests).
- "Issue governance ADR + false-positive filtering audit"
  (shipped) — explicit ADR
  ([issue-governance-architecture-decision.md](issue-governance-architecture-decision.md))
  formalizes the layered model
  (FindingReport → FindingFilterReport → FindingStatusLedger →
  FindingLifecycleReport → IssueAdjudicationReport →
  CoherencyDelta) and labels `IssueMergeCandidate` /
  `IssueMergeDecisionLedger` / accepted-merge rollups as Rekon
  product extensions, not classic parity. Two new artifact
  types: `FindingFilterReport` records system / policy
  suppression with `reason` / `evidence` / `filePath` /
  `confidence` / `filteredAt` / `source` for every filtered
  finding, while preserving the raw `FindingReport` and a
  `keptFindings` projection; `FindingFilterHealthReport`
  summarizes `filterRate` / `highConfidenceFiltered` /
  `lowConfidenceFiltered` / `byReason` and emits `high-filter-rate`
  + `low-confidence-filtered` alerts. Deterministic v1 filter
  rules (`generated-file` / `external-file` / `test-file` /
  `canary-file` / `content-filter` with priority order
  `generated > external > test > canary > content`); no LLM,
  semantic, fuzzy, or embedding matching. New CLI:
  `rekon findings filter` / `rekon findings filter-health`.
  `rekon refresh` adds `findings.filter` and
  `findings.filter-health` steps between `evaluate` and
  `findings.lifecycle`. Pinned by
  `tests/contract/finding-filters.test.mjs` (18 tests).
- "Filter-aware lifecycle / adjudication" (shipped) —
  `@rekon/runtime.buildFindingLifecycleReport` uses
  `FindingFilterReport.keptFindings` as the active latest set
  when the filter report cites the latest `FindingReport` in
  its `inputRefs` (current-enough check); the lifecycle cites
  the filter report (and the filter's upstream raw
  `FindingReport`) in its own `inputRefs`. The raw
  `FindingReport` is never mutated; filtered findings remain
  auditable in `FindingFilterReport.filteredFindings`.
  `IssueAdjudicationReport` and `CoherencyDelta` are filter-
  aware transitively — only kept findings become governed
  issue groups, coherency items, and remediation steps. When
  the latest filter is missing or stale, the lifecycle falls
  back to the raw `FindingReport` transparently and does not
  cite the stale filter. Pinned by
  `tests/contract/filter-aware-lifecycle-adjudication.test.mjs`
  (7 tests).
- "Filter policy / configured exclusions v1" (shipped) —
  `.rekon/config.json` accepts an optional `findingFilters`
  array; entries are deterministic policy rules with
  `id` / `reason` / `evidence` / optional `confidence` plus at
  least one of `pathPattern` / `type` / `ruleId` / `severity` /
  `titleIncludes` / `descriptionIncludes`. Policy rules run
  before built-in deterministic filters; first match wins.
  Filtered entries record `source: "policy"` + `policyId`.
  `FindingFilterReport.summary.byPolicy` reports per-policy
  counts; `FindingFilterHealthReport` adds
  `policy-over-filtering`, `low-confidence-policy-filter`, and
  `unused-policy-filter` alerts plus `summary.byPolicy` /
  `summary.policyFiltered` / `summary.unusedPolicies`.
  `rekon config validate` enforces the policy schema. The raw
  `FindingReport` is **not** mutated; filtered findings remain
  auditable. Pinned by
  `tests/contract/finding-filter-policy.test.mjs` (19 tests).
- "Filter health / issue adjudication surfaces in
  publications v1" (shipped) —
  `@rekon/capability-docs.architecture-summary` renders a
  `## Finding Filter Health` section sourced from
  `FindingFilterReport` + `FindingFilterHealthReport` with
  kept / filtered counts, filter rate, per-reason +
  per-policy tables, full alert list, and an audit pointer
  back to `FindingFilterReport.filteredFindings`.
  `@rekon/capability-docs.agent-contract` renders a
  `### Finding Filter Health` subsection that visibly warns
  when alerts exist and adds a `Do Not Do` reminder against
  treating a clean active-governance surface as proof that
  no raw findings exist. Both publications cite the filter
  artifacts in `header.inputRefs`, so freshness flags them
  stale on newer filter / health reports. Missing filter
  artifacts emit explicit command hints. Pinned by
  `tests/contract/publications-filter-health.test.mjs` (12
  tests).
- "Filter policy / exclusion persistence v2" (shipped) —
  `FindingFilterPolicySuggestionReport` records candidate
  `findingFilters` rules derived deterministically from
  the latest N (default 5) `FindingFilterReport` artifacts,
  with reason, confidence, rationale, affected finding ids
  / paths / types, and evidence refs back to the source
  filter reports. Four reasons:
  `repeated-filtered-policy-gap`, `repeated-filtered-path`,
  `repeated-filtered-type`, and
  `high-volume-filtered-pattern`. New CLI:
  `rekon findings filter-policy suggest` /
  `rekon findings filter-policy list` /
  `rekon findings filter-policy apply <id> [--force]`.
  `apply` is the only mutating command and refuses
  low-confidence + duplicate-id rules without `--force`.
  Existing `findingFilters` rules suppress duplicate
  suggestions. Pinned by
  `tests/contract/finding-filter-policy-suggestions.test.mjs`
  (15 tests).
- "Filter policy suggestions surfaced in publications v2"
  (shipped) — `@rekon/capability-docs.architecture-summary`
  renders a `## Finding Filter Policy Suggestions` section
  sourced from `FindingFilterPolicySuggestionReport` with
  total / high / medium / low counts, a per-suggestion
  table (id, confidence, reason, suggested-rule summary,
  affected finding count, evidence), explicit `--force`
  guidance for low-confidence suggestions, and a stale
  banner when the report doesn't cite the latest
  `FindingFilterReport`. `@rekon/capability-docs.agent-contract`
  renders a `### Finding Filter Policy Suggestions`
  subsection with the same counts, an advisory blockquote,
  up to five suggestion bullets, and two new `Do Not Do`
  reminders against applying suggestions without operator
  approval. Both publications cite the suggestion report
  in `header.inputRefs`. Manifest `consumes` adds
  `FindingFilterPolicySuggestionReport`; new
  `finding-filter-policy-suggestions.changed`
  invalidation rule. Pinned by
  `tests/contract/publications-filter-policy-suggestions.test.mjs`
  (13 tests).
- "Filter policy suggestion apply safety v2" (shipped) —
  `rekon findings filter-policy apply` now supports
  `--dry-run` / `--preview` for non-mutating plan + diff
  inspection. The structured plan reports the proposed rule,
  `addedFindingFilters` / `replacedFindingFilters` /
  `beforeCount` / `afterCount` diff, warnings, blockers
  (`low-confidence-suggestion`, `broad-path-pattern`,
  `duplicate-rule-id`, `config-missing`),
  `wouldRefuse`, and the result of running
  `validateFindingFilterPolicyRules` against the projected
  config. Broad `pathPattern` rules (`*`, `**`,
  `**/*`, `*/**`, `.`, `./**`, `src/**`, `packages/**`,
  `tests/**`, etc., or any single top-level `<segment>/**`)
  require `--force`; the deterministic
  `isBroadFindingFilterPolicyRule` predicate is exported
  from `@rekon/kernel-findings`. Duplicate rule ids are
  **replaced** under `--force`, not appended. Proposed
  configs are validated for both dry-run and actual apply;
  validation failures refuse the write even with `--force`.
  Malformed `.rekon/config.json` is never overwritten.
  Unrelated config fields are preserved. `suggest` and
  `list` remain non-mutating. Pinned by
  `tests/contract/finding-filter-policy-apply-safety.test.mjs`
  (21 tests).
- "Configured filter policy freshness / publication
  guardrails" (shipped) — `FindingFilterReport` carries an
  optional, order-sensitive
  `policyFingerprint: { digest, ruleCount, ruleIds }` of the
  `findingFilters` policy set the run used. New exports
  `fingerprintFindingFilterPolicies(policies)` (kernel) and
  `computeFilterPolicyStaleness({ currentFingerprint,
  filterReport })` + `loadCurrentFindingFilterPolicies(root)`
  (capability-docs). `buildFindingFilterReport` always stamps
  the fingerprint (including empty-policy runs). Architecture
  summary renders `## Finding Filter Policy Freshness` with
  status `fresh` / `stale` / `missing` / `unknown` plus
  current vs. report fingerprint; agent contract renders the
  matching subsection plus a third filter-related `Do Not Do`
  reminder. `rekon findings filter-policy apply` JSON output
  now includes `currentPolicyFingerprint`,
  `projectedPolicyFingerprint` (dry-run), and
  `policyFingerprint` (actual apply). `rekon refresh` after a
  config change clears the stale warning. Raw `FindingReport`
  is never mutated. Pinned by
  `tests/contract/filter-policy-freshness-guardrails.test.mjs`
  (19 tests).
- "Classic issue filtering parity v2 — content/result filter
  expansion" (shipped) — `FindingFilterReason` extended
  additively with 17 classic-inspired content reasons
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
  New `Finding.details?: Record<string, unknown>` additive
  optional field. New exports
  `applyFindingContentFilters({ finding })`,
  `applyFindingResultFilters(finding, options)`,
  `FindingResultFilterOptions`,
  `validateFindingResultFilterOptions`. Filter pipeline
  order: policy → classic content → built-in path →
  result; pipeline short-circuits on the first match.
  `.rekon/config.json` accepts a new optional
  `findingResultFilters` block (`minConfidence` /
  `severity` / `systems` / `pathExcludes`) validated by
  `rekon config validate`. Result-filtered findings are
  recorded with `source: "system"` and a result-filter
  reason — never silently deleted, never operator status
  decisions. Filter-health gains
  `content-filter-high-volume` and
  `result-filter-over-filtering` alerts plus
  `contentFiltered` / `resultFiltered` summary counts. Raw
  `FindingReport` is never mutated. Pinned by
  `tests/contract/finding-content-result-filters.test.mjs`
  (24 tests).
- "Publications use adjudicated issue groups" (shipped) —
  `@rekon/capability-docs.architecture-summary` and
  `@rekon/capability-docs.agent-contract` now consume
  `IssueAdjudicationReport`, cite it in `header.inputRefs`,
  render a Governed Issue Groups section showing group counts +
  member finding ids, and label coherency counts as
  group-aware vs. raw-finding. The agent contract adds a
  `rekon resolve issue --issue <group-id>` instruction and a
  Do Not Do entry against treating raw finding count as
  governed issue count. Manifest gains an
  `issue-adjudication.changed` invalidation rule. Pinned by
  `tests/contract/publications-adjudicated-issues.test.mjs`
  (11 tests).
- "Issue adjudication maturity" remains the future batch for
  cross-pack semantic dedupe, false-positive scoring, and
  freshness / stale-source guardrails.

### P1.2 Memory ranking / curation

Guarantee:
- Memory selection ranks entries by an explainable score that
  combines scope match, freshness, and operator-marked
  reliability. Curation can promote durable memory to rulebook
  entries through a permissioned actuator.

Classic source:
- `lib/operator-feedback.ts`,
  `lib/memory/**`,
  `schemas/memory-kind-taxonomy.schema.ts`.

Current Rekon coverage:
- **v1 closed.** `@rekon/capability-memory` v1 ships a
  deterministic ranking algorithm that scores entries on scope
  match (path / system / capability / tags), verification status,
  reliability, priority, freshness, and specificity. Selection
  output includes per-entry `score` / `reasons` /
  `match` plus a `rejected` array naming deprecated / superseded /
  disputed / scope-mismatched entries. `OperatorFeedbackEntry`
  gained `scope.systems` / `scope.capabilities` / `scope.layers` /
  `scope.tags`, `verification`, `reliability`, `priority`,
  `createdAt` / `updatedAt`, `source`, `status`. `rekon memory
  add` and `rekon memory select` expose the new flags. The
  resolver continues to read the legacy `selections[*]` array
  unchanged.
- See [../concepts/memory.md](../concepts/memory.md) for the full
  algorithm and CLI surface.

Missing coverage:
- Automatic promotion of consistently used + verified memory into
  `Rulebook` entries.
- Automatic deprecation / supersession chains (the v2 batch adds
  **recommendations** but never mutates memory automatically).
- Long-horizon context-usage analytics.
- Decay policies beyond simple freshness scoring.

Proposed regression test:
- v1 ranking pinned in
  `tests/contract/memory-ranking-curation.test.mjs` (10 tests).
- v2 usage / curation pinned in
  `tests/contract/memory-usage-curation.test.mjs` (13 tests):
  usage record writes `MemoryUsageLedger`; harmful / stale /
  ignored without a `--note` is rejected; usage list returns the
  recorded events; curation recommends `reinforce` for repeated
  helpful memory, `review` for a single harmful event, `deprecate`
  for repeated harmful, `supersede-candidate` for repeated stale;
  curation does not mutate `OperatorFeedbackEntry.status`;
  `memory select` does not auto-record usage; freshness invalidates
  the curation report when a newer `MemoryUsageLedger` lands; the
  agent-contract publication includes the Memory Curation Status
  line.

Implementation batches:
- "Memory ranking / curation v1" (shipped) — deterministic scoring.
- "Memory usage evidence / curation v1" (shipped) —
  `MemoryUsageLedger` + `MemoryCurationReport` + `rekon memory
  usage record` / `usage list` / `curation`. **Recommendations,
  not automatic mutation.**
- Promotion / supersession engine is the next batch and will
  remain explicit (no auto-mutation).

### P1.3 Agent-operating-contract publication

Guarantee:
- A publication exists that tells an agent the operating contract
  before it edits: required checks, anti-gaming guardrails, the
  expected next command, owner systems for the changed paths.

Classic source:
- `services/ArchitectureDocsHandler.ts`,
  `lib/agent-docs.ts`,
  `tools/agent-docs/generator.ts`,
  `services/ContextHandler.ts`.

Current Rekon coverage:
- **v1 closed.** `@rekon/capability-docs.agent-contract` is the
  fourth publisher inside `@rekon/capability-docs`. It reads the
  latest `IntelligenceSnapshot`, `ObservedRepo`, `OwnershipMap`,
  `CapabilityMap`, `CoherencyDelta`, `FindingLifecycleReport`,
  `WorkOrder` (remediation and resolver), `ReconciliationPlan`,
  `VerificationPlan`, `VerificationResult`, and `MemorySelection`
  and writes a `Publication` with `kind: "agent-contract"`. The
  rendered Markdown contains How To Use This Contract, Canonical
  Truth, Operating Rules, Resolver Workflow, Ownership And
  Capabilities, Active Governance State, Proof And Verification
  State, Memory Guidance, Required Checks, Do Not Do, Next
  Recommended Actions, and Input Artifacts sections. Memory
  Guidance shows score and reasons; failed/partial/not-run
  verification is visible; passing verification surfaces the
  "does not automatically resolve findings" callout. Root
  `AGENTS.md` is never overwritten — the publication writes only
  to `.rekon/artifacts/publications/agent-contract.md`.
- The existing `agents`, `repo-summary`, `architecture-summary`,
  and `proof-report` publications are unchanged and continue to
  cover their respective audiences.

Missing coverage:
- Optional export/install command (`rekon agent-contract export
  --output AGENTS.rekon.md`) is deferred.
- Future PR/check integration could consume the published
  artifact as a "what the agent saw" attestation.

Proposed regression test:
- Shipped in `tests/contract/agent-operating-contract-publisher.test.mjs`
  (16 tests): publish list includes the new publisher; the
  publication exists with `kind: "agent-contract"` and writes to
  the documented path; generic `publish run` dispatches the same
  handler; all 13 sections render; canonical-truth warning is
  present; operating rules cover resolve-before-edit and
  anti-gaming; Memory Guidance shows score+reasons when ranked
  memory exists; missing-MemorySelection recommends
  `rekon memory select`; partial / failed verification surface
  visibly; Required Checks come from `VerificationPlan` when
  present; `header.inputRefs` cite MemorySelection /
  VerificationResult / WorkOrder / VerificationPlan; the artifact
  writes to `.rekon/artifacts/publications/agent-contract.md`;
  publishing does not create a root `AGENTS.md`; existing
  publishers still work; freshness marks the publication stale
  after a newer MemorySelection.

Implementation batch:
- "Agent operating contract publication v1" (shipped).

### P1.4 Path / event freshness

Guarantee:
- When a tracked source file changes, every artifact whose lineage
  cites that file is marked `stale` without requiring a full
  re-observe.

Classic source:
- `services/WatchHandler.ts`,
  `lib/context-freshness.ts`,
  `lib/watcher-lifecycle.ts`.

Current Rekon coverage:
- Lineage-based freshness (newer indexed input).

Missing coverage:
- File-path / git-event freshness.

Proposed regression test:
- `tests/contract/path-freshness.test.mjs`: after a clean run,
  modify a tracked source file, run `rekon artifacts freshness`,
  assert that artifacts whose lineage cites that file are
  reported as `stale` or `partial`.

Implementation batch:
- "Path / event freshness" batch when file-system events are
  acceptable to track.

### P1.5 Richer graph slices when consumed

Guarantee:
- Every `GraphSlice` artifact cites its evidence inputs and is
  reproducible from those inputs alone. Slices that downstream
  consumers actually need (route, call) ship before the consumer.

Classic source:
- `services/GraphBuildProvider.ts`,
  `domain/graph/producers/**`.

Current Rekon coverage:
- Import / symbol / ownership slices.

Missing coverage:
- Route / call / runtime slices.

Proposed regression test:
- `tests/contract/graph-slice-citation.test.mjs`: assert every
  `GraphSlice` artifact's `header.inputRefs` resolves to an
  `EvidenceGraph` (and optionally an `ObservedRepo`).

Implementation batch:
- When the first consumer demands them.

### P1.6 Rulebook / compiled invariant migration

Guarantee:
- Every `Finding.ruleId` resolves to a rulebook entry whose
  severity, scope, and action template can be inspected. Rule
  packs publish both rules and the evaluator that interprets
  them; the rule definition is the contract.

Classic source:
- `services/RuleCompilationHandler.ts`,
  `services/InvariantsCompilationHandler.ts`,
  `lib/analysis/RuleCompilationRunner.ts`.

Current Rekon coverage:
- `@rekon/kernel-rulebook` shape; `@rekon/capability-policy`
  evaluator; first migrated external pack
  (`examples/import-boundary-rule-pack`).

Missing coverage:
- No YAML-compiled rulebook path; community rule packs ship
  hand-written evaluators.

Proposed regression test:
- `tests/contract/finding-ruleid-resolves.test.mjs`: after a
  fixture run, every `Finding` artifact has a non-empty `ruleId`
  AND the rulebook contains a matching entry.

Implementation batch:
- Compiled-rulebook capability when a second community pack
  needs the shared compilation path.

## P2 Guarantees

These are explicitly deferred. Document them so the original problem
isn't quietly lost when the deferred batch lands.

### P2.1 Deterministic source-write reconciliation

Guarantee:
- Source-write reconciliation requires explicit per-operation
  `write:source` permission, dry-run remains the default, and
  every applied operation requires a passing `VerificationResult`
  before promotion.

Classic source:
- `packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`.

Current Rekon coverage:
- Source-write operations are always deferred today.

Missing coverage:
- The apply path itself is deferred to Phase C.

Proposed regression test:
- Pre-conditional on the apply path landing: assert that
  promoting a deferred operation to `applied` requires a passing
  `VerificationResult` for the work order it belongs to.

Implementation batch:
- Phase C — explicit user demand and a permission policy.

### P2.2 Watcher daemon

Guarantee:
- A long-running `rekon watch` process keeps freshness live and
  invalidates dependent artifacts in response to file-system or
  git events.

Classic source:
- `services/WatchHandler.ts`,
  `lib/watcher-lifecycle.ts`.

Current Rekon coverage:
- Lineage-based freshness only.

Missing coverage:
- Daemon, events, live invalidation.

Proposed regression test:
- Pre-conditional on the daemon shipping.

Implementation batch:
- Phase C.

### P2.3 GitHub / CI surfaces

Guarantee:
- CI / check-run publishers consume `VerificationResult` directly
  and mark checks failing when status is `failed` / `partial` /
  `not-run`.

Classic source:
- `commands/saas.ts`,
  `packages/product-codebase-intel/src/saas/**`.

Current Rekon coverage:
- None (Phase D).

Missing coverage:
- The CI surface itself.

Proposed regression test:
- Pre-conditional on the first CI publisher.

Implementation batch:
- Phase D.

### P2.4 SaaS / dashboard

Guarantee:
- Hosted surfaces consume existing Rekon artifacts; they do not
  introduce new canonical artifact types.

Classic source:
- `commands/saas.ts`.

Current Rekon coverage:
- None (Phase D).

Missing coverage:
- The hosted surface itself.

Proposed regression test:
- Pre-conditional.

Implementation batch:
- Phase D.

### P2.5 Semantic augmentation / LLM review layers

Guarantee:
- Semantic providers run under explicit `network:outbound`
  permission; deterministic facts always run first; semantic facts
  carry `model` + `version` in provenance; semantic never silently
  overrides deterministic.

Classic source:
- `services/analysis/DeterministicHybridPipeline.ts`.

Current Rekon coverage:
- None (no semantic provider yet).

Missing coverage:
- The whole semantic provider path.

Proposed regression test:
- Pre-conditional on the first semantic provider.

Implementation batch:
- Phase C.

## How To Use This Plan

- Before adding a new test that asserts a workflow guarantee,
  check this plan to see if the guarantee is named and assign
  the test to its entry.
- When closing a P0 or P1 gap, the implementation batch should
  ship the proposed regression test (or a stronger one) and
  update this plan to mark the gap as covered.
- When deferring a guarantee, update the audit entry and this
  plan; do not silently drop coverage.
