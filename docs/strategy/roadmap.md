# Roadmap

This roadmap sequences post-NorthStar work. It distinguishes:

- **Completed alpha spine.** Things that already ship under
  `0.1.0-alpha.x`.
- **Committed direction.** Hardening batches that come before the first
  publishable alpha release.
- **Future expansions.** Ideas under consideration. These may shift before
  they ship.

The NorthStar (see [north-star.md](north-star.md)) constrains what may
appear here. Anything that contradicts the NorthStar must come with an
explicit NorthStar update.

Implementation slices must preserve the workflow guarantees identified
in
[classic-guarantees-audit.md](classic-guarantees-audit.md) and the
P0/P1/P2 regression plan in
[classic-guarantee-regression-plan.md](classic-guarantee-regression-plan.md).
The quick-reference
[classic-subsystem-purpose-map.md](classic-subsystem-purpose-map.md)
is the first stop before proposing a new capability batch.

## Completed Alpha Spine

- Kernel packages:
  `@rekon/kernel-artifacts`, `@rekon/kernel-evidence`,
  `@rekon/kernel-snapshot`, `@rekon/kernel-graph`,
  `@rekon/kernel-repo-model`, `@rekon/kernel-rulebook`,
  `@rekon/kernel-findings`.
- Public SDK: `@rekon/sdk` capability definition, in-memory registry,
  validation helpers, conformance helpers (`validateCapability`,
  `assertCapabilityConforms`).
- Local runtime: `@rekon/runtime` artifact store, snapshot construction,
  lifecycle execution, permission enforcement, and artifact index
  validation (`validateArtifactIndex`).
- CLI: `@rekon/cli` exposing init, capabilities, observe, project,
  snapshot, evaluate, resolve preflight, publish, memory, intent,
  reconcile, and artifact inspection/validation commands.
- Built-in capabilities:
  `@rekon/capability-js-ts`, `@rekon/capability-model`,
  `@rekon/capability-graph`, `@rekon/capability-policy`,
  `@rekon/capability-resolver`, `@rekon/capability-docs`,
  `@rekon/capability-memory`, `@rekon/capability-intent`,
  `@rekon/capability-reconcile`.
- Explainable `resolve.preflight` `ResolverPacket` with
  `resolutionTrace` covering ownership precedence, fallbacks, finding and
  memory checks, and risk decisions.
- Onboarding docs, custom capability example, artifact integrity tests,
  conformance test suite, optional `REKON_DOGFOOD_CLASSIC_ROOT` dogfood
  regression harness.
- Generic per-handler CLI dispatch for evaluators, resolvers, and
  publishers (`rekon evaluate list/run`, `rekon resolve list/run`,
  `rekon publish list/run`). External capabilities operate through the same
  CLI surface as built-ins; friendly workflow shortcuts (`evaluate`,
  `resolve preflight`, `publish agents`) remain. Generic actuator and
  learner dispatch are intentionally deferred — actuators because of
  irreversibility risk, learners because explicit memory commands already
  cover the surface.
- First migrated external rule pack: `examples/import-boundary-rule-pack`
  ships an evaluator-only capability mapped to classic import-governance
  behavior. It produces `import_boundary.parent_relative_import` (medium)
  and `import_boundary.generated_output_import` (high) findings against
  the JS/TS `EvidenceGraph`.
- Resolver phase expansion: `@rekon/capability-resolver` registers
  `resolve.route`, `resolve.seam`, `resolve.preflight`, and
  `resolve.issue`. CLI friendly shortcuts and generic dispatch both
  cover all four. Each packet shares `resolverId`, `phase`,
  `resolutionTrace`, `warnings`, `nextSteps`, and a
  `nextRequiredResolver` recommendation so the route → seam →
  preflight → (issue) flow stays explicit.
- Finding lifecycle: `@rekon/kernel-findings` ships
  `FindingStatusDecision`, `FindingStatusLedger`, `EffectiveFinding`,
  and `FindingLifecycleReport`. `@rekon/runtime` adds
  `buildFindingLifecycleReport`. CLI commands `rekon findings list`,
  `rekon findings lifecycle`, `rekon findings status list`, and
  `rekon findings status set` preserve `accepted`/`ignored`/`resolved`
  state across runs. `resolve.issue` annotates matched findings with
  their effective status and warns on accepted/ignored/resolved
  matches.
- Coherency delta lite: `@rekon/kernel-findings` adds `CoherencyDelta`
  (items, severity/system/type summary, top paths, remediation
  queue). `@rekon/runtime.buildCoherencyDelta` derives a delta from
  the latest `FindingLifecycleReport`, assigning systems via
  `OwnershipMap` then `ObservedRepo` then an `unknown` fallback.
  `rekon coherency delta` writes the artifact. Active counts exclude
  accepted/ignored/resolved findings; remediation priority maps
  `critical`/`high` → `p0`, `medium` → `p1`, `low` → `p2`.
- Architecture summary publisher: `@rekon/capability-docs` registers a
  second publisher, `@rekon/capability-docs.architecture-summary`,
  that consumes the latest `IntelligenceSnapshot`, `ObservedRepo`,
  `OwnershipMap`, `CapabilityMap`, `CoherencyDelta`, and
  `FindingLifecycleReport` and emits a Markdown governance summary
  with repo overview, owner systems, capability map, coherency
  summary, top affected paths, remediation queue, agent guidance, and
  input refs. `rekon publish architecture` invokes it.
- Remediation work orders: `@rekon/capability-intent` registers a
  second actuator, `@rekon/capability-intent.remediation-work-order`,
  that consumes the latest `CoherencyDelta` (and optional
  `FindingLifecycleReport` / `ResolverPacket`) to produce
  `IntentMap`, `WorkOrder`, and `VerificationPlan` artifacts from the
  active `remediationQueue`. Accepted/ignored/resolved findings are
  excluded. The work order includes explicit anti-gaming guardrails;
  the verification plan adds `rekon artifacts validate` and `rekon
  artifacts freshness` to the standard typecheck/test/build commands.
  `rekon intent remediation` invokes it with optional `--finding`,
  `--priority`, and `--limit` flags. Existing
  `@rekon/capability-intent.work-order` (resolver-based) is
  unchanged.
- Reconciliation suggestion plans: `@rekon/capability-reconcile.actuator`
  now supports a suggestion mode that consumes the latest remediation
  `WorkOrder` (where `source === "coherency-delta"`) or
  `CoherencyDelta` and classifies each item into a
  `ReconciliationPlanOperation` with `class`
  (`artifact-only`/`source-write-deferred`/`command-deferred`/
  `manual-review`), `status`, and `requiresPermission`. Package-local
  `ReconciliationPlan` gained an optional `summary` (per-class
  counts) and a new `manual_review` operation for unclassified items.
  `rekon reconcile suggest` invokes it with optional `--finding`,
  `--priority`, `--limit`, and `--apply` flags; `--apply` applies
  only artifact-only operations. Source-write and command operations
  remain deferred regardless of `--apply`. Existing `rekon reconcile
  --operation <name>` behavior is unchanged.
- Verification result recording: `@rekon/capability-intent` adds the
  package-local `VerificationResult`, `VerificationCommandResult`,
  and `VerificationResultSummary` types plus a new exported helper
  `createVerificationResult(input)`. `rekon verify record` records
  operator-supplied outcomes against a `VerificationPlan` (latest
  by default, or selected via `--plan <id|type:id>`). The result
  cites the plan and any paired `WorkOrder` in `header.inputRefs`,
  derives an overall status (`passed`/`failed`/`partial`/`not-run`),
  fills missing plan commands as `not-run`, and stores digest/notes
  rather than raw stdout/stderr. Rekon does not execute commands;
  the helper is a recorder, not a runner. Closes the artifact loop
  `Finding -> Lifecycle -> CoherencyDelta -> WorkOrder ->
  ReconciliationPlan -> VerificationPlan -> VerificationResult`.
- Architecture summary v2 / proof-loop publication:
  `@rekon/capability-docs.architecture-summary` now reads the latest
  `WorkOrder` (remediation and resolver), `ReconciliationPlan`,
  `VerificationPlan`, and `VerificationResult` alongside the existing
  snapshot/ownership/coherency inputs. The publication adds four new
  sections — Work Orders, Reconciliation Plans, Verification Status,
  Proof Loop — between the existing Remediation Queue and Agent
  Guidance sections. The Verification Status section surfaces
  `passed`/`failed`/`partial`/`not-run` and warns when the latest
  `VerificationResult` references an older `VerificationPlan`. The
  Proof Loop section reports governance / planning / verification
  state and emits a single "Suggested next command:" line. Manifest
  `consumes` and a new `proof-loop.changed` invalidation rule keep
  freshness honest. The publication still does not execute commands
  or judge verification sufficiency.
- Verification-aware issue and remediation context:
  `@rekon/capability-intent` adds the
  `lookupVerificationEvidence(artifacts, findingId)` helper and the
  `VerificationEvidenceStatus` / `VerificationEvidenceSummary` types.
  The helper chains `findingId -> WorkOrder.remediationItems ->
  VerificationPlan.workOrderRef ->
  VerificationResult.verificationPlanRef` and returns a typed evidence
  summary. `@rekon/capability-resolver.resolve.issue` now imports the
  helper to attach `IssuePacket.verification`, add status-specific
  warnings, and append an `issue.verification` `resolutionTrace`
  step. `rekon intent remediation --skip-verified` (opt-in) excludes
  candidate remediation items whose chain resolves to `passed` via the
  new `RemediationActuatorInput.excludeFindingIds`. Passing
  verification never auto-resolves findings, mutates the
  `FindingStatusLedger`, or executes commands; failed / partial /
  not-run / missing remain selected so agents still see open work.
- Proof report publication: `@rekon/capability-docs` registers a
  third publisher `@rekon/capability-docs.proof-report` (alongside
  `.publisher` and `.architecture-summary`). The proof report is a
  focused Markdown readout of the latest `VerificationPlan` and
  `VerificationResult` plus surrounding work-order, remediation, and
  reconciliation context. Rendered sections: Proof Status, Work
  Order, Verification Plan, Verification Results, Failed / Missing
  Evidence, Remediation Context, Reconciliation Context, Next
  Recommended Action, Input Artifacts. Failed / partial / not-run
  states surface "Verification is not complete."; passed surfaces a
  no-auto-resolve callout. When no `VerificationPlan` exists, the
  publication is a stub recommending `rekon intent work-order` or
  `rekon intent remediation`. `PublicationArtifact.kind` widens to
  include `"proof-report"`. `rekon publish proof` invokes it; generic
  dispatch works too. The publisher does not execute commands or
  judge verification sufficiency.
- Agent operating contract publication v1 (P1.3 closure from the
  Classic Guarantees Audit): `@rekon/capability-docs` registers a
  fourth publisher `@rekon/capability-docs.agent-contract`
  alongside `.publisher` / `.architecture-summary` /
  `.proof-report`. The agent-contract publisher reads
  snapshot/observed/ownership/capability/coherency/lifecycle/work-
  order/reconciliation/verification-plan/verification-result/memory-
  selection and writes an opinionated Markdown operating contract
  with How To Use This Contract / Canonical Truth / Operating
  Rules / Resolver Workflow / Ownership And Capabilities / Active
  Governance State / Proof And Verification State / Memory
  Guidance / Required Checks / Do Not Do / Next Recommended
  Actions / Input Artifacts sections. Memory Guidance reads the
  v1 ranked `MemorySelection` and surfaces only ranked entries
  (with score, scope, and reasons). Failed / partial / not-run
  verification surfaces an explicit "Verification is not
  complete." callout; passing verification surfaces the "does not
  automatically resolve findings" callout. `PublicationArtifact.
  kind` widens to include `"agent-contract"`. `rekon publish
  agent-contract` invokes it; generic dispatch works too. Root
  `AGENTS.md` is never overwritten; the publication writes only
  to `.rekon/artifacts/publications/agent-contract.md`.
- Memory ranking / curation v1 (P1.2 closure from the Classic
  Guarantees Audit): `@rekon/capability-memory` now ranks
  `OperatorFeedbackEntry` recalls deterministically with reason
  attribution. The score blends scope match (path / system /
  capability / tags), verification status, reliability, priority,
  freshness, and specificity. `OperatorFeedbackEntry` gained
  optional scope dimensions, quality signals (`verification`,
  `reliability`, `priority`), provenance (`createdAt` /
  `updatedAt` / `source` / `status`), and a `rationale`.
  `MemorySelection` gained `query`, `selected` (with per-item
  `score` / `reasons` / `match`), and `rejected` (surfacing
  deprecated / superseded / disputed / scope-mismatch). The
  legacy `selections[*]` array is preserved so
  `resolve.preflight` consumes memory without changes. `rekon
  memory add` / `rekon memory select` expose the new flags
  (`--system`, `--capability`, `--tag`, `--layer`, `--priority`,
  `--reliability`, `--verified`, `--rationale`, `--limit`).
  Resolver invariant pinned: memory never mutates
  `ownerSystems`, `risk`, `findings`, `status`, or
  `nextRequiredResolver`. Promotion / curation engine and
  context-usage analytics remain Phase C.
- Issue adjudication / dedupe v1 (P1.1 first slice from the
  Classic Guarantees Audit): `IssueAdjudicationReport` groups
  duplicate / overlapping findings from
  `FindingLifecycleReport` into canonical issue groups via
  deterministic key equality
  (`type | ruleId | files | subjects | singleton`). Status /
  lifecycle context survives in per-group `statusBreakdown`; no
  finding is dropped (singletons emit singleton groups with
  `singleton-no-grouping-key`); raw `FindingReport`,
  `FindingStatusLedger`, and `FindingLifecycleReport` are never
  mutated. New CLI: `rekon issues adjudicate`,
  `rekon issues list [--status …]`. New runtime helper
  `buildIssueAdjudicationReport`. New pure helpers
  `deriveIssueAdjudication`, `createIssueAdjudicationReport`,
  `validateIssueAdjudicationReport`,
  `assertIssueAdjudicationReport`, and schema export. Freshness
  marks adjudication reports stale after newer
  `FindingLifecycleReport`. Semantic / fuzzy matching, LLM
  review, and `resolve.issue` v2 remain deferred.
- Operator-assisted issue merge decision ledger (P1.1
  merge-decisions slice): `IssueMergeDecisionLedger` records
  explicit `accepted` / `rejected` decisions on
  `IssueMergeCandidate` records with required notes and
  optional reasons. New runtime helper
  `recordIssueMergeDecision`. New CLI: `rekon issues merge
  candidates` / `rekon issues merge decide <id> --decision …
  --note … [--reason …] [--decided-by …]` / `rekon issues
  merge decisions`. `rekon issues list` and `rekon issues
  adjudicate` now annotate `mergeCandidates` with
  `decision` / `decisionId` / `decisionNote` /
  `decisionReason` / `decisionDecidedAt` / `decisionDecidedBy`
  fields when a ledger exists. Decisions never mutate
  `IssueAdjudicationReport.groups`; in v3, `CoherencyDelta`
  honors accepted decisions as a derived projection (see next
  bullet). Ledger is treated as canonical input by freshness.
- CoherencyDelta v3 respects accepted merge decisions (P1.1
  coherency-merge slice): `buildCoherencyDelta` now reads the
  latest `IssueMergeDecisionLedger`, resolves the latest
  decision per `candidateId`, and collapses
  accepted-merged `IssueAdjudicationGroup` records into a
  single merged `CoherencyDeltaItem`
  (`id: coherency:rollup:merged:<sorted-group-ids-joined-by-+>`)
  carrying `mergedIssueGroupIds`, `mergeDecisionIds`,
  `mergeCandidateIds`, a union of `memberFindingIds`, the worst
  severity, the canonical group's `issueGroupId` /
  `canonicalFindingId`, and a `groupingReasons` array that
  includes `operator-accepted-merge`. The active merged rollup
  emits exactly one remediation step keyed by
  `remediation:merged:<sorted-group-ids-joined-by-+>`. Rejected
  decisions (and candidates with no decision) keep groups as
  separate items, identical to v2. `IssueAdjudicationReport`
  is **not** mutated; the rollup is a derived projection in the
  delta only. New pure helper
  `rollupIssueGroupsByAcceptedMergeDecisions(input)`. `inputRefs`
  cite the ledger when used, so `rekon artifacts freshness`
  marks the delta `stale` on a newer
  `IssueMergeDecisionLedger`. Publication and resolver
  awareness shipped immediately after this slice (see next
  bullet).
- Publication and resolver awareness of accepted merge decisions
  (P1.1 merge-awareness slice):
  `@rekon/capability-docs.architecture-summary` renders an
  `## Accepted Issue Merge Roll-ups` section sourced from
  `CoherencyDelta` v3 merged rollup items
  (`mergedIssueGroupIds.length > 1`) with rollup id, member
  group ids, decision ids, member finding counts, severity,
  status, and active flag.
  `@rekon/capability-docs.agent-contract` renders an
  `### Accepted Issue Merge Roll-ups` subsection under
  `Active Governance State` plus a `Do Not Do` reminder against
  treating roll-ups as automatic mutation of raw issue groups.
  `@rekon/capability-resolver.issueResolver` adds a new
  optional `mergeRollup: IssueMergeRollupSummary` field on
  `IssuePacket` (rollup id, merged group ids,
  decision/candidate ids, unioned member finding ids, severity,
  status, active) and attaches it when the matched group is in
  an accepted merged rollup in the latest `CoherencyDelta`.
  The packet adds a sibling-group warning, an `issue.merge`
  `CoherencyDelta` `resolutionTrace` step, and cites the
  source `CoherencyDelta` in `header.inputRefs`. Rejected
  decisions never produce a rollup. All three surfaces read
  merged rollup metadata from `CoherencyDelta` only — none
  reads `IssueMergeDecisionLedger` directly. Manifest update:
  `@rekon/capability-resolver` adds `CoherencyDelta` to
  `consumes`. New `ResolutionTraceEntry.sourceType` enum value
  `"CoherencyDelta"`.
- Issue governance ADR + false-positive filtering audit (P1.1
  filtering v1 slice): the
  [issue-governance-architecture-decision ADR](issue-governance-architecture-decision.md)
  formalizes the layered model
  (FindingReport → FindingFilterReport →
  FindingStatusLedger → FindingLifecycleReport →
  IssueAdjudicationReport → CoherencyDelta) and explicitly
  labels `IssueMergeCandidate` / `IssueMergeDecisionLedger` /
  accepted-merge rollups as Rekon product extensions, not
  classic parity. Two new artifacts in
  `@rekon/kernel-findings`: `FindingFilterReport` records
  deterministic system / policy filtering (`generated-file` /
  `external-file` / `test-file` / `canary-file` /
  `content-filter`) over `FindingReport`, with `reason` /
  `evidence` / optional `filePath` / `confidence` /
  `filteredAt` / `source` per filtered entry and a
  `keptFindings` projection; raw `FindingReport` is never
  mutated. `FindingFilterHealthReport` summarizes
  `filterRate` and emits `high-filter-rate` /
  `low-confidence-filtered` alerts. New runtime helpers
  `buildFindingFilterReport` and
  `buildFindingFilterHealthReport`. New CLI:
  `rekon findings filter` / `rekon findings filter-health`.
  `rekon refresh` adds `findings.filter` and
  `findings.filter-health` steps between `evaluate` and
  `findings.lifecycle`. No LLM, semantic, fuzzy, or embedding
  matching; `GraphOntologyValidator` port deferred.
- Filter-aware lifecycle / adjudication (P1.1 filter-aware
  lifecycle v1 slice): `@rekon/runtime.buildFindingLifecycleReport`
  now lists the latest `FindingFilterReport` and uses its
  `keptFindings` as the active latest set when the filter
  report cites the latest `FindingReport` in its `inputRefs`
  (current-enough check). Lifecycle cites the filter report
  (and the filter's upstream raw `FindingReport`) in its own
  `inputRefs` so freshness propagates and lineage stays intact.
  Raw `FindingReport` is never mutated; filtered findings stay
  auditable in `FindingFilterReport.filteredFindings`.
  `IssueAdjudicationReport` and `CoherencyDelta` benefit
  transitively — only kept findings become governed issue
  groups, coherency items, and remediation steps. When the
  latest filter is missing or stale (does not cite the latest
  `FindingReport`), the lifecycle transparently falls back to
  the raw report and does not cite the stale filter. No new
  CLI surface; no SDK API removal; no schemaVersion bump.
- Filter policy / configured exclusions v1 (P1.1 filter policy
  v1 slice): `.rekon/config.json` accepts an optional
  `findingFilters` array of project-specific policy rules.
  Each entry has `id` / `reason` / `evidence` / optional
  `confidence` plus at least one deterministic matcher:
  `pathPattern` (simple glob), `type`, `ruleId`, `severity`,
  `titleIncludes`, `descriptionIncludes`. Policy rules run
  before built-in deterministic filters, in declared order;
  first match wins. Filtered entries record `source: "policy"`
  plus `policyId` so the audit trail names the rule.
  `FindingFilterReport.summary.byPolicy` reports per-policy
  counts; `FindingFilterHealthReport` adds `byPolicy` /
  `policyFiltered` / `unusedPolicies` plus three policy-aware
  alerts (`policy-over-filtering`,
  `low-confidence-policy-filter`, `unused-policy-filter`).
  `rekon config validate` enforces the policy schema (rejects
  duplicate ids, missing matchers, unknown reasons, absolute /
  traversal `pathPattern`). New exported helper
  `validateFindingFilterPolicyRules` and additive runtime /
  CLI options. The raw `FindingReport` is never mutated. No
  LLM, semantic, fuzzy, or embedding matching;
  `GraphOntologyValidator` port and persistent exclusion
  lists remain deferred.
- Filter health / issue adjudication surfaces in
  publications v1 (P1.1 filter-health-publications v1 slice):
  `@rekon/capability-docs.architecture-summary` renders a
  `## Finding Filter Health` section sourced from
  `FindingFilterReport` + `FindingFilterHealthReport` (kept /
  filtered counts, filter rate, per-reason / per-policy
  tables, alert list, audit pointer to `filteredFindings`).
  `@rekon/capability-docs.agent-contract` renders a
  `### Finding Filter Health` subsection that visibly warns
  when alerts exist and adds a clean-active-governance
  `Do Not Do` reminder. Both publications cite the filter
  artifacts in `header.inputRefs`, so freshness flags them
  stale on newer filter / health reports. Manifest update:
  `@rekon/capability-docs.consumes` adds `FindingFilterReport`
  and `FindingFilterHealthReport`; new `finding-filter.changed`
  invalidation rule.
- Filter policy / exclusion persistence v2 (P1.1
  filter-policy-suggestions v2 slice):
  `FindingFilterPolicySuggestionReport` records candidate
  `findingFilters` rules derived deterministically from the
  latest N `FindingFilterReport` artifacts (default 5). Four
  reasons: `repeated-filtered-policy-gap` (high; computed
  first so it wins for the same pathPattern over
  `repeated-filtered-path`), `repeated-filtered-path` (high
  ≥ 3 / medium = 2), `repeated-filtered-type` (medium),
  `high-volume-filtered-pattern` (low review prompt). Path
  prefix uses first-two-segments; existing `findingFilters`
  rules suppress duplicate suggestions. New CLI:
  `rekon findings filter-policy suggest` (read-only) /
  `rekon findings filter-policy list` (read-only) /
  `rekon findings filter-policy apply <id> [--force]`
  (only mutating command). `apply` appends the suggested
  rule to `.rekon/config.json findingFilters`, preserves
  every other top-level field, refuses low-confidence +
  duplicate-id rules without `--force`, and creates a
  default config when missing. New exports:
  `FindingFilterPolicySuggestionReport` + sibling types and
  helpers (`deriveFindingFilterPolicySuggestions`,
  `createFindingFilterPolicySuggestionReport`,
  `validateFindingFilterPolicySuggestionReport`,
  `assertFindingFilterPolicySuggestionReport`,
  `findingFilterPolicySuggestionReportSchema`). New
  runtime helper
  `buildFindingFilterPolicySuggestionReport`. Registered
  in `BUILT_IN_ARTIFACT_TYPES` and
  `ARTIFACT_CATEGORY_BY_TYPE: "findings"`. No LLM,
  semantic, fuzzy, or embedding matching;
  `GraphOntologyValidator` port and persistent exclusion
  lists beyond config-backed rules remain deferred.
- Filter policy suggestions surfaced in architecture summary /
  agent contract (P1.1 filter-policy-suggestions-publications
  v2 slice): `@rekon/capability-docs.architecture-summary`
  renders a `## Finding Filter Policy Suggestions` section
  sourced from the latest `FindingFilterPolicySuggestionReport`
  with total / by-reason / by-confidence counts, a
  per-suggestion table (suggestion id, confidence, reason,
  suggested rule preview, affected-finding count, evidence
  summary; capped at 20 rows), a `--force` warning for low /
  duplicate suggestions, and an audit-pointer line clarifying
  that suggestions never mutate `.rekon/config.json`.
  `@rekon/capability-docs.agent-contract` renders a
  `### Finding Filter Policy Suggestions` subsection with an
  advisory blockquote, top suggestions (capped at 5), and two
  new `Do Not Do` reminders: never apply suggestions without
  explicit operator approval, never treat suggestions as
  already-applied config. Both publications cite
  `FindingFilterPolicySuggestionReport` in `header.inputRefs`,
  so `rekon artifacts freshness` flags them stale when newer
  suggestion reports land; both publications additionally
  render an inline stale-suggestion banner when the cited
  suggestion report doesn't reference the latest
  `FindingFilterReport`. Manifest update:
  `@rekon/capability-docs.consumes` adds
  `FindingFilterPolicySuggestionReport`; new
  `finding-filter-policy-suggestions.changed` invalidation
  rule. New exported helper `computeFilterPolicySuggestionStale`
  / type `FilterPolicySuggestionStaleness`. No new CLI surface;
  `rekon findings filter-policy apply` remains the **only**
  command that mutates `.rekon/config.json`. No LLM, semantic,
  fuzzy, or embedding matching.
- Filter policy suggestion apply safety v2 (P1.1
  filter-policy-apply-safety v2 slice):
  `rekon findings filter-policy apply` now supports two new
  flags — `--dry-run` and its alias `--preview` — for a
  non-mutating preview of the exact proposed rule, a
  structured config diff
  (`addedFindingFilters: FindingFilterPolicyRule[]` +
  `replacedFindingFilters: { before, after }[]` +
  `beforeCount` + `afterCount`), every warning / blocker
  the actual apply would surface, and the validation result
  from running `validateFindingFilterPolicyRules` over the
  projected `findingFilters`. Three deterministic
  force-gated blockers: `low-confidence-suggestion`,
  `broad-path-pattern` (via the new
  `isBroadFindingFilterPolicyRule(rule)` predicate; flags
  `*`, `**`, `**/*`, `*/**`, `.`, `./**`, any single
  top-level `<segment>/**` like `src/**` / `packages/**` /
  `tests/**`, and any rule that lacks both a `pathPattern`
  and a narrow matcher), `duplicate-rule-id` (with `--force`
  the existing rule is **replaced** by the suggested rule,
  not appended). Both dry-run and apply validate the
  projected config and refuse to write on validation
  failure even under `--force`. Malformed
  `.rekon/config.json` is never overwritten. Unrelated
  top-level config fields are preserved. `suggest` /
  `list` remain non-mutating. New exports from
  `@rekon/kernel-findings`: `isBroadFindingFilterPolicyRule`,
  `planFindingFilterPolicyApply`, plus shape types
  `FindingFilterPolicyApplyPlan`,
  `FindingFilterPolicyApplyDiff`,
  `FindingFilterPolicyApplyWarning`,
  `FindingFilterPolicyApplyBlocker`,
  `FindingFilterPolicyApplyWarningCode`,
  `FindingFilterPolicyApplyBlockerCode`,
  `PlanFindingFilterPolicyApplyInput`. New file-local CLI
  helpers (`loadConfigForApply`,
  `parseFindingFiltersFromConfig`, `buildAppliedConfig`,
  `formatApplyRefusalMessage`). 21 new contract tests in
  `tests/contract/finding-filter-policy-apply-safety.test.mjs`.
  No new artifact type. No artifact `schemaVersion` bump.
  No publication shape change. No new capability role. No
  new CLI subcommand. No LLM, semantic, fuzzy, or embedding
  matching.
- Configured filter policy freshness / publication guardrails
  (P1.1 filter-policy-freshness v2 slice):
  `FindingFilterReport` now carries an additive optional
  `policyFingerprint: { digest, ruleCount, ruleIds }` — an
  order-sensitive fingerprint of the `findingFilters` policy
  set the filter run used. New exported helper
  `fingerprintFindingFilterPolicies(policies)` in
  `@rekon/kernel-findings`. `buildFindingFilterReport` always
  stamps the fingerprint (including the empty-policy
  fingerprint when no rules are configured). New exports
  from `@rekon/capability-docs`:
  `FilterPolicyStaleness` (type),
  `computeFilterPolicyStaleness({ currentFingerprint,
  filterReport })` (pure compute), and
  `loadCurrentFindingFilterPolicies(repoRoot)` (async loader
  that reads `.rekon/config.json findingFilters`, validates
  it, and returns the fingerprint of the *valid* subset).
  Architecture summary publication renders a new
  `## Finding Filter Policy Freshness` section (between
  `## Finding Filter Health` and `## Finding Filter Policy
  Suggestions`); agent contract renders the matching
  `### Finding Filter Policy Freshness` subsection. Status is
  `fresh` / `stale` / `missing` / `unknown`. On `stale`, both
  publications emit a "Run `rekon refresh`" warning; the
  agent contract adds a third filter-related `Do Not Do`
  reminder: "Do not rely on active issue / coherency counts
  after `.rekon/config.json` `findingFilters` changed until
  `rekon refresh` has rebuilt the filter chain with the
  current policy set." `rekon findings filter-policy apply`
  JSON output gains `currentPolicyFingerprint`,
  `projectedPolicyFingerprint` (dry-run), and
  `policyFingerprint` (apply). The publishers'
  `publish({ artifacts })` signatures changed to
  `publish({ artifacts, input })` so the runtime-injected
  `repo.root` flows through to the loader. Existing
  `finding-filter.changed` invalidation rule's description
  expanded to mention the new freshness section; no new
  invalidation rule (policyFingerprint drift is part of the
  filter report change). 19 new contract tests in
  `tests/contract/filter-policy-freshness-guardrails.test.mjs`.
  No `schemaVersion` bump (additive optional field). No new
  artifact type. No new capability role. No watcher /
  daemon. No new CLI subcommand. No LLM, semantic, fuzzy,
  or embedding matching.
- Classic issue filtering parity v2 — content/result filter
  expansion (P1.1 classic-content-result-filters v2 slice):
  `Finding` gains an additive optional
  `details?: Record<string, unknown>`.
  `FindingFilterReason` extended with 17 classic-inspired
  content reasons (stub/import family:
  `empty-constructor-stub`,
  `storage-retrieval-placeholder`, `client-safe-infra`,
  `same-directory-import`, `svg-namespace-url`,
  `client-env-node-env`; architecture family:
  `speculative-anti-pattern`, `archetype-inference-note`,
  `hardcoded-config-not-dde`,
  `ui-http-provider-abstraction`,
  `ui-hook-uses-http-not-db`; rule-id family:
  `module-gate-verified-caller`,
  `route-handler-with-service`,
  `route-http-middleware-only`,
  `external-api-comment-only`,
  `factory-file-creates-deps`,
  `nextjs-route-convention`) plus 4 result-filter reasons
  (`below-min-confidence`, `below-min-severity`,
  `outside-selected-system`, `configured-path-exclusion`).
  New exports from `@rekon/kernel-findings`:
  `applyFindingContentFilters({ finding })`,
  `applyFindingResultFilters(finding, options)`,
  `FindingContentFilterContext`,
  `FindingContentFilterDecision`,
  `FindingResultFilterOptions`,
  `validateFindingResultFilterOptions`.
  `applyFindingFilters` runs filters in priority order:
  policy → classic content → built-in path → result.
  `.rekon/config.json` accepts a new optional
  `findingResultFilters` block (`minConfidence` /
  `severity` / `systems` / `pathExcludes`) validated by
  `rekon config validate`. `rekon findings filter` /
  `rekon findings filter-health` / `rekon refresh` all
  load and pass result filters through.
  `FindingFilterHealthReport.summary` gains
  `contentFiltered` / `resultFiltered` counts; two new
  alerts `content-filter-high-volume` and
  `result-filter-over-filtering`. Result-filtered findings
  record `source: "system"` with full audit entry; raw
  `FindingReport` is never mutated; operator status
  decisions remain in `FindingStatusLedger`. 24 new
  contract tests in
  `tests/contract/finding-content-result-filters.test.mjs`.
  No artifact `schemaVersion` bump. No new artifact type.
  No new capability role. No new CLI subcommand or flag.
  No LLM, semantic, fuzzy, or embedding matching. No
  GraphOntologyValidator.
- Filter-health diagnostics v2 (P1.1
  filter-health-diagnostics v2 slice):
  `FindingFilterHealthReport.summary` gains six additive
  diagnostic fields:
  - `builtInPathFiltered: number` — findings suppressed by
    built-in path / content heuristics (sum of the four
    bucket counts equals `totalFiltered`).
  - `filterRateByReason: Record<string, number>` — per-reason
    rate rounded to four decimals.
  - `filterRateByPolicy?: Record<string, number>` —
    per-policy rate (present when `byPolicy` is non-empty).
  - `dominantReason?: { reason, count, rate }` /
    `dominantPolicy?: { policyId, count, rate }` — dominant
    reason / policy with alphabetic tiebreak.
  - `policyFingerprint?: FindingFilterPolicyFingerprint` —
    mirror of the upstream filter report's fingerprint.
  Six new deterministic alerts: `reason-over-filtering`,
  `policy-dominance`, `content-filter-dominance`,
  `result-filter-dominance`, `policy-fingerprint-missing`,
  `stale-policy-fingerprint`. Dominance alerts use a 50 %
  threshold with a 5-finding minimum corpus.
  New exported classifiers from `@rekon/kernel-findings`:
  `isPolicyFiltered`, `isResultFiltered`,
  `isClassicContentFiltered`, `isBuiltInPathFiltered`.
  Policy takes precedence; the other three buckets are
  mutually exclusive over the remainder.
  `buildFindingFilterHealth` /
  `createFindingFilterHealthReport` (kernel) and
  `buildFindingFilterHealthReport` (runtime) accept an
  optional
  `currentPolicyFingerprint: FindingFilterPolicyFingerprint`.
  `rekon findings filter-health` + `rekon refresh` fingerprint
  the current `.rekon/config.json findingFilters` and
  forward it; the filter-health CLI JSON also echoes
  `currentPolicyFingerprint`. Architecture summary + agent
  contract surface the new alert codes via their existing
  generic Filter Health tables — no publication shape
  change. Filtering decisions are not affected. Raw
  `FindingReport` / `FindingFilterReport` /
  `FindingFilterHealthReport` are not mutated. 17 new
  contract tests in
  `tests/contract/finding-filter-health-diagnostics-v2.test.mjs`.
  No artifact `schemaVersion` bump. No new artifact type.
  No new capability role. No new CLI subcommand or flag.
  No LLM, semantic, fuzzy, or embedding matching. No
  GraphOntologyValidator.
- Filter policy operator workflow polish (P1.1
  filter-policy-status v1 slice): new CLI surface
  `rekon findings filter-policy status [--policy <id>]
  [--warnings-only] [--unused-only]` combines the
  configured `findingFilters` policy set with the latest
  `FindingFilterReport` / `FindingFilterHealthReport` /
  `FindingFilterPolicySuggestionReport` into a single
  read-only JSON document — per-policy `usageCount` /
  `usageRate` / `filteredFindingIds`, deterministic
  warnings (`unused-policy`, `dominant-policy`,
  `low-confidence-policy`, `broad-policy`,
  `stale-policy-fingerprint`), and global warnings
  (`missing-filter-report`, `missing-filter-health`).
  Suggestions render as advisory `dryRunCommand` /
  `applyCommand` strings; low-confidence suggestions get
  `--force` appended. Freshness mirrors
  filter-policy-freshness v2
  (`fresh` / `stale` / `missing-report` / `unknown`).
  Optional flags narrow the rendered `policies` array;
  summary counts always reflect the full policy set.
  New pure helper `summarizeFindingFilterPolicyStatus`
  exported from `@rekon/kernel-findings` + shape types
  (`FindingFilterPolicyStatusResult` /
  `FindingFilterPolicyStatusEntry` /
  `FindingFilterPolicyStatusSuggestion` /
  `FindingFilterPolicyStatusSummary` /
  `FindingFilterPolicyStatusWarning` /
  `FindingFilterPolicyStatusFreshness` /
  `SummarizeFindingFilterPolicyStatusInput`). New
  file-local CLI helper `readLatestArtifactOrUndefined`.
  Command is strictly read-only;
  `.rekon/config.json` is never mutated;
  `rekon findings filter-policy apply` remains the only
  mutating command. Malformed config fails clearly with a
  "Failed to parse" error and leaves the file unchanged.
  18 new contract tests in
  `tests/contract/finding-filter-policy-status.test.mjs`.
  No artifact `schemaVersion` bump. No new artifact type.
  No new capability role. No LLM, semantic, fuzzy, or
  embedding matching. No GraphOntologyValidator.
- `GraphOntologyValidator`-lite parity audit (P1.1
  graph-ontology-validator-lite-audit slice): docs-only
  decision memo at
  [docs/strategy/graph-ontology-validator-lite-audit.md](graph-ontology-validator-lite-audit.md).
  Decides **not** to port `GraphOntologyValidator` as a
  monolithic service; recommends a future
  capability-level **graph-aware finding filter
  provider** that consumes existing artifacts
  (`EvidenceGraph` / `GraphSlice` / `ObservedRepo` /
  `OwnershipMap` / `CapabilityMap`) and emits
  `FilteredFinding` entries via `applyFindingFilters`'s
  new optional `graphContext` input. Five candidate
  checks queued (route handler with sibling, route HTTP
  middleware only, external-API comment only, factory
  file creates deps, module gate verified caller).
  Explicitly rejected / deferred: monolithic validator
  port, source-reading classifier, runtime truth graph,
  framework-specific catalog, LLM / semantic / fuzzy
  review. Required artifact projections (flat file
  index, optional `ObservedSystem.kind`) ship **first**
  before any filter logic. Audit covers classic
  behavior, per-check artifact inputs, future regression
  tests, and recommended implementation order. No
  runtime change. New docs test
  `tests/docs/graph-ontology-validator-lite-audit.test.mjs`
  pins structure + decisions. Aligned to
  `infra/validation/GraphOntologyValidator.ts`,
  `services/IssueDetectionService.ts`,
  `services/issues/content-filters.ts`,
  `services/issues/content-filter-ruleid.ts`,
  `services/issues/content-filter-architecture.ts`,
  `services/issues/filter-health.ts`,
  `domain/issues/evaluators/**`,
  `domain/issues/RulesResolver.ts`,
  `services/GraphBuildProvider.ts`,
  `domain/graph/producers/**`. No artifact
  `schemaVersion` bump. No new artifact type. No new
  capability role. No new CLI subcommand. No LLM,
  semantic, fuzzy, or embedding matching.
- Graph-aware finding filter provider v1 (P1.1
  graph-aware-finding-filter-provider v1 slice): ships
  the five port-soon candidates from the audit. New
  additive optional repo-model projections —
  `ObservedRepo.files?: string[]` (sorted, repo-relative,
  excludes `.rekon/` paths) and
  `ObservedSystem.kind?` — populated by
  `@rekon/capability-model.projector`. New pure helper
  `applyFindingGraphFilters({ finding, graphContext })`
  in `@rekon/kernel-findings` consumes
  `FindingGraphFilterContext` (structurally-typed
  access to `EvidenceGraph` / `ObservedRepo` /
  `OwnershipMap` / `CapabilityMap` / `GraphSlice`) and
  implements `route-handler-with-service`,
  `route-http-middleware-only`,
  `external-api-comment-only`,
  `factory-file-creates-deps`, and
  `module-gate-verified-caller` — no new reason codes,
  no source reads, no LLM. `applyFindingFilters` runs
  the graph stage between classic content and built-in
  path filters. Runtime `buildFindingFilterReport`
  loads graph artifacts from the store and threads
  them as `graphContext`; cites only the artifacts that
  actually contributed to a match in
  `header.inputRefs`. Missing graph artifacts →
  conservative no-op. Raw `FindingReport` is
  byte-identical before / after. 20 new contract tests
  in
  `tests/contract/graph-aware-finding-filters.test.mjs`.
  No artifact `schemaVersion` bump. No new artifact
  type. No new capability role. No new CLI subcommand
  or flag.
- Graph-aware filter surfacing in publications / filter
  health (P1.1 graph-aware-filter-health-publications
  slice): `FindingFilterHealthSummary` gains a
  mutually-exclusive `graphAwareFiltered` bucket (split
  out of `contentFiltered`; counts always sum to
  `totalFiltered`), plus `byGraphAwareReason`,
  `filterRateByGraphAwareReason`, and
  `dominantGraphAwareReason` (alphabetic tiebreak). Two
  new alerts fire when graph-aware filtering dominates:
  `graph-aware-filter-dominance`
  (`graphAwareFiltered / totalFindings >= 0.5`) and
  `graph-aware-reason-dominance`
  (`dominantGraphAwareReason.rate >= 0.5`), both gated on
  `totalFindings >= 5`. Architecture summary renders a
  `Graph-Aware Filter Reasons` table plus an audit
  pointer; agent contract renders the graph-aware count,
  a conditional audit instruction, and a new "Do Not Do"
  reminder warning agents not to treat graph-aware
  filtering as proof the underlying issue never existed.
  Policy precedence is preserved — `source: "policy"`
  entries with a graph-aware reason code stay in
  `policyFiltered`, never inflating `graphAwareFiltered`
  or `byGraphAwareReason`. 16 new contract tests at
  `tests/contract/graph-aware-filter-health-publications.test.mjs`
  pin classifier behavior, bucket math, alert thresholds,
  publication rendering, and `rekon artifacts validate`
  cleanliness. No artifact `schemaVersion` bump. No new
  artifact type. No new capability role. No new CLI
  subcommand or flag. No new reason codes. No source-file
  reads. No LLM, semantic, fuzzy, or embedding matching.
  No `GraphOntologyValidator`. No version bump. No npm
  publish.
- Issue adjudication v2: deterministic cross-rule merge hints
  (P1.1 merge-hints slice): `IssueAdjudicationReport` now
  exposes an optional `mergeCandidates: IssueMergeCandidate[]`
  field and a `summary.mergeCandidates` count. The adjudicator
  inspects every pair of distinct groups and emits advisory
  candidates when at least two deterministic signals fire
  (`same-file` / `overlapping-files` / `same-subject` /
  `overlapping-subjects` / `same-severity` /
  `related-type-prefix` / `same-suggested-action` /
  `shared-system`). Confidence is capped at 1.0; strengths are
  `strong` / `medium` / `weak`. Both-inactive pairs are skipped;
  mixed-activity pairs require `strong`. Candidates **never**
  merge groups — `CoherencyDelta` keeps one item per actual
  group, the remediation queue keeps one step per active group,
  and no artifact is mutated. CLI: `rekon issues adjudicate` /
  `rekon issues list` now expose a `mergeCandidates` array.
  Exported helper: `deriveMergeCandidates(groups)`. No
  semantic / fuzzy / embedding / LLM matching.
- Stale-source freshness guardrails for adjudication + coherency
  (P1.1 trust slice): the surfaces that consume
  `IssueAdjudicationReport` and `CoherencyDelta` now render
  inline freshness warnings, not just rely on `rekon artifacts
  freshness`. Architecture summary emits `## Input Freshness
  Warnings` when adjudication / coherency is stale (including
  the transitive case + the lifecycle-mode-delta-while-
  adjudication-exists case). The agent operating contract
  renders a `### Governance Freshness` subsection with
  `Issue adjudication: fresh / stale / missing` and
  `Coherency delta: fresh / stale / missing`; on stale it adds a
  blockquote callout instructing agents not to treat governed
  issue counts as current until `rekon refresh` (or
  `rekon issues adjudicate && rekon coherency delta`) has run.
  `resolve.issue` (group mode) emits an `issue.freshness`
  `resolutionTrace` entry (`status: "warning"` when stale,
  `"used"` when fresh) plus a `packet.warnings[]` entry
  recommending `rekon issues adjudicate` or `rekon refresh`. All
  guardrails are read-only. No artifact mutation. No
  auto-regeneration. No watcher / daemon. No Publication shape
  change.
- Publications use adjudicated issue groups (P1.1 publication
  consumption slice): both
  `@rekon/capability-docs.architecture-summary` and
  `@rekon/capability-docs.agent-contract` now read the latest
  `IssueAdjudicationReport`, cite it in `header.inputRefs`, and
  render a Governed Issue Groups section. The architecture
  summary shows a full group table (`Group | Status | Severity |
  Type | Members | Files`) where the Members column carries the
  count plus the first few member finding ids. The agent
  contract shows a short Governed Issue Groups subsection under
  Active Governance State with the top 5 active groups + the
  line `Use \`rekon resolve issue --issue <group-id>\``. Both
  publications label the Coherency Summary as group-aware vs.
  raw-finding when the `CoherencyDelta` was built from
  adjudicated groups. The agent contract's Do Not Do list adds
  "Do not treat raw finding count as governed issue count when
  an IssueAdjudicationReport exists". When no adjudication
  report is indexed, both publications emit a `rekon issues
  adjudicate` / `rekon refresh` hint. Manifest adds
  `IssueAdjudicationReport` to `consumes` and a new
  `issue-adjudication.changed` invalidation rule so publications
  go stale when adjudication advances. No artifact mutation. No
  Publication shape change.
- resolve.issue v2 from IssueAdjudicationReport (P1.1 resolver
  consumption slice): `resolve.issue` now prefers adjudicated
  groups over raw findings. Unique group matches populate
  `IssuePacket.issueGroup` (with `canonicalFindingId`,
  `memberFindingIds`, `groupingReasons`, `statusBreakdown`),
  `matchSource: "IssueAdjudicationReport"`, and
  `verificationByFinding` aggregating per-member evidence (the
  top-level `verification` is the worst-status summary across
  members). Ambiguous fragments warn and refuse to silently
  choose. Missing report or no-match queries fall back to raw
  `FindingReport` matching with an explicit fallback trace.
  Ownership combines `group.systems` with the existing
  `OwnershipMap` precedence; contradictions warn. Group-status
  warnings appear for accepted / ignored / resolved / mixed.
  Next-resolver decision: multi-owner → `resolve.seam`,
  single-owner → `resolve.preflight`, no files → `resolve.route`.
  No artifact mutation; passing aggregated verification does not
  auto-resolve any member finding.
- CoherencyDelta v2 from IssueAdjudicationReport (P1.1 coherency
  consumption slice): `buildCoherencyDelta` now consumes the
  latest `IssueAdjudicationReport` when one exists, emitting one
  delta item per group with `issueGroupId` /
  `canonicalFindingId` / `memberFindingIds` / `groupingReasons`,
  and one remediation step per active group (id
  `remediation:group:<group-id>`). The legacy lifecycle path
  remains as fallback when no adjudication report exists; no
  breaking change. `CoherencyDeltaInput` accepts optional
  `issueGroups` / `systemsForIssueGroup`; existing
  lifecycle-mode callers continue to pass `findings` /
  `resolvedFindings` / `systemsForFinding` unchanged. Group
  status maps to item status:
  `active → existing+active`; `mixed+active → existing+active`;
  `accepted / ignored / resolved → same+inactive`. `rekon
  refresh` runs `issues.adjudicate` between `findings.lifecycle`
  and `coherency.delta` so every refreshed delta is group-aware.
  Health scoring, trend, and remediation auto-apply remain
  deferred.
- Memory usage evidence / curation v1 (next slice of P1.2):
  `@rekon/capability-memory` now records explicit operator
  feedback about how selected memory was actually used.
  `MemoryUsageLedger` carries `MemoryUsageEvent` rows
  (`helpful` / `ignored` / `harmful` / `stale` / `unclear`) with
  required notes for harmful/stale/ignored. `MemoryCurationReport`
  derives deterministic recommendations (`keep` / `reinforce` /
  `review` / `deprecate` / `supersede-candidate`) without
  mutating `OperatorFeedbackEntry.status`. New CLI surface:
  `rekon memory usage record`, `rekon memory usage list`, `rekon
  memory curation`. The agent-contract publication surfaces a
  short Memory Curation Status line citing the latest report. No
  automatic promotion or deprecation; no LLM summarization.
- `rekon refresh` (P0.1 closure from the Classic Guarantees Audit):
  new CLI command that orchestrates the full Rekon lifecycle in the
  documented order — `init` → `config.validate` → `observe` →
  `project` → `snapshot` → `evaluate` → `findings.lifecycle` →
  `coherency.delta` → `publish.architecture` →
  `artifacts.validate` → `artifacts.freshness`. Stops on the first
  failure, records per-step status and artifact refs, and reports a
  final `passed` / `partial` / `failed` verdict. Flags
  `--skip-publish` and `--skip-freshness` are explicit opt-outs and
  always recorded in the step list; lifecycle steps are never
  silently skipped. Freshness is judged by **latest major
  artifact of each type** with historical `newer-input-exists`
  issues filtered, so the verdict reflects "is the current
  intelligence state coherent?" rather than "is every historical
  artifact still current?" Preserves the classic `FullScanHandler`
  workflow guarantee without porting the cache or per-phase
  checkpoint artifacts. See
  [../concepts/refresh.md](../concepts/refresh.md).

## Committed Direction: Hardening Batches

Each batch is a small, atomic step before the first publishable alpha
release.

### Alpha Release Readiness

Goal: lock down public surfaces and make a release verifiable without
publishing anything.

- Store the durable NorthStar plan in `docs/strategy/`.
- Add public API stability labels to package READMEs and key docs.
- Implement `scripts/audit-package-exports.mjs` to verify package shape
  and naming.
- Implement `scripts/publish-dry-run.mjs` to surface tarball contents and
  warnings without publishing.
- Implement `scripts/install-smoke.mjs` (or equivalent) to verify a
  consumer can install Rekon packages from packed local artifacts or
  workspace build output.
- Implement `scripts/audit-license.mjs` for root and per-package license
  consistency.
- Add `docs/release/alpha-release-checklist.md` for `0.1.0-alpha.1`.

### Publish Dry-Run

Goal: prove the published tarball would contain the right files and not
contain `.rekon/` outputs, `.codebase-intel`, or accidental local paths.

- `npm pack --dry-run` (or equivalent) per workspace package.
- Aggregate warnings into a single report.
- Block releases where required build outputs are missing.

### Package Export Audit

Goal: keep `@rekon/*` public surfaces consistent.

- Inspect every `packages/*/package.json` for name, version, type, exports,
  main/types, files, and license.
- Verify README presence and lack of forbidden tokens
  (`.codebase-intel`, `CODEBASE_INTEL`).
- Verify no imports from old codebase-intel.

### Install-From-Build / Install-From-Tarball Smoke

Goal: prove the CLI works for an outside consumer.

- Phase one: install or link from the local build output and run the
  golden CLI flow against `examples/simple-js-ts`.
- Phase two (next batch): install from `.tgz` tarballs created by
  `npm pack` and rerun the flow.

### Stability Labels

Goal: contributors know what is safe to depend on.

Labels:

- `stable`: changes follow semver. Public, supported.
- `experimental`: public, but subject to change before stable release.
- `internal`: package-private. Do not depend on it externally.
- `deprecated`: scheduled for removal; consumers should migrate.

For alpha:

- Kernel artifact contracts: `experimental, public`.
- SDK manifest/conformance helpers: `experimental, public`.
- Runtime local artifact store and lifecycle APIs: `experimental, public`.
- CLI commands: `experimental, public`.
- Built-in capability internals: `experimental, public where exported`.
- Package-private helpers: `internal`.

## Future Expansions

These are intentionally aspirational. They may change shape, be reordered,
or be deferred.

### Language And Framework Packs

- Python, Ruby, Go, Rust, Java, Swift, Kotlin evidence providers.
- Framework packs: Rails, Django, Next.js, Remix, NestJS, FastAPI, etc.
- Cross-language ownership and architecture graphs.

### Runtime Truth

- Trace ingestion for runtime call graphs and ownership.
- Telemetry-backed validation that observed architecture matches code.
- Optional integration with CI test results and coverage data.

### Watcher And Freshness Engine

- File-change watching that updates `.rekon/` incrementally.
- Real freshness tracking on the artifact index.
- Stale-detection driven by `invalidatedBy` rules.

### GitHub / CI Surface

- A GitHub-side surface that posts publications and findings on PRs.
- CI integrations for evidence, evaluation, and resolver preflight.
- Verification plans tied to checks.

### Publications Expansion

- Architecture diagrams as publications.
- Auto-generated onboarding tours.
- AI-friendly capability index documents.

### Memory Curation And Promotion

- Operator review of memory entries.
- Promotion paths from memory to rulebook entries with explicit gating.
- Conflict resolution between memory and findings.

### Intent And Work-Order Maturity

- Richer work-order schema covering acceptance criteria and rollout plans.
- Stronger ties between intent, verification plans, and reconciliation.

### Reconciliation Maturity

- Source-writing reconciliation with sandboxed dry-runs and human approval.
- Bidirectional reconciliation between source and architecture artifacts.

### Optional SaaS / Dashboard

- Hosted dashboard or organization-wide view as a publication surface.
- Strictly optional. The local-first substrate remains primary.

## Sequencing Notes

- Hardening batches come before publishing packages. Do not publish until
  the alpha release checklist clears.
- Capability and language packs come after the hardening batches.
- Source-writing reconciliation must follow watcher and freshness work,
  not precede it.
- Hosted surfaces come last.

## Classic Behavior Alignment

Most committed-direction and future-expansion items above trace back to
hard-won behavior in `codebase-intel-classic`. The dedicated distillation
docs explain which wins each item preserves and how:

- [classic-behavior-distillation.md](classic-behavior-distillation.md)
- [classic-wins.md](classic-wins.md)
- [classic-to-rekon-translation.md](classic-to-rekon-translation.md)
- [classic-refactor-principles.md](classic-refactor-principles.md)
- [classic-behavior-roadmap.md](classic-behavior-roadmap.md)
- [classic-alignment-map.md](classic-alignment-map.md)

## Cross-References

- [NorthStar](north-star.md)
- [Capability model](capability-model.md)
- [codebase-intel-classic migration](codebase-intel-classic-migration.md)
- [Classic behavior distillation](classic-behavior-distillation.md)
- [Classic wins](classic-wins.md)
- [Classic-to-Rekon translation](classic-to-rekon-translation.md)
- [Classic refactor principles](classic-refactor-principles.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)
- [Classic alignment map](classic-alignment-map.md)
- [Alpha release checklist](../release/alpha-release-checklist.md)
