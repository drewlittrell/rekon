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
- Graph-aware finding filter provider v2 — file-existence
  / import-evidence strengthening (P1.1
  graph-aware-finding-filter-provider-v2 slice):
  strengthens the five v1 checks with deeper
  artifact-backed evidence while preserving every prior
  invariant. New pure helpers
  (`normalizeRepoPath`, `sameRepoPath`, `siblingPath`,
  `listObservedRepoFiles`, `observedRepoHasFile`,
  `findSiblingFile`, `listImportTargetsForFile`,
  `fileImportsTargetMatching`) exported from
  `@rekon/kernel-findings`. Route handler /
  sibling-handler check now prefers
  `Finding.details.imports` (high) → `EvidenceGraph`
  import facts containing `*/handler` (high) →
  `ObservedRepo.files` sibling lookup (high). Route HTTP
  middleware-only and external API comment-only checks
  prefer `EvidenceGraph` import facts over
  `Finding.details.imports`; explicit empty
  `details.imports: []` still proves absence at medium
  confidence. Module-gate check prefers
  `OwnershipMap` + `ObservedSystem.kind === "module"`
  over the bare `/modules/` path heuristic.
  `FindingGraphFilterDecision.usedArtifacts` and
  `ApplyFindingFiltersResult.graphArtifactsUsed` thread
  precise per-decision artifact attribution through to
  the runtime, which filters its loaded graph-input refs
  by that set so
  `FindingFilterReport.header.inputRefs` cites only the
  artifacts that actually contributed to a match.
  Pipeline reordered to run graph-aware *before* classic
  content so the audit credits the strongest source. 17
  new contract tests at
  `tests/contract/graph-aware-finding-filters-v2.test.mjs`
  cover helpers, strengthened checks, conservative no-op,
  precise inputRefs, raw `FindingReport` byte-identity,
  lifecycle exclusion, and `rekon artifacts validate`
  cleanliness. No artifact `schemaVersion` bump. No new
  artifact type. No new capability role. No new CLI
  subcommand or flag. No new reason codes. No source-file
  reads. No LLM, semantic, fuzzy, or embedding matching.
  No `GraphOntologyValidator` port. No version bump. No
  npm publish.
- Graph-aware filter provider v3 decision memo —
  remaining classic checks (P1.1
  graph-aware-filter-provider-v3-decision slice):
  strategy-only batch; no runtime behavior change. The
  memo
  ([docs/strategy/graph-aware-filter-provider-v3-decision.md](graph-aware-filter-provider-v3-decision.md))
  evaluates the ten most prominent remaining classic
  graph / ontology checks and concludes that **no broad
  v3 catalog ships next**. Every remaining candidate
  either needs a missing artifact projection first
  (`EvidenceGraph` export / symbol facts,
  `CapabilityMap.entries[].role` taxonomy, call-graph /
  referrer evidence), is project-specific (belongs in
  an external rule pack), or is permanently rejected
  (monolithic `GraphOntologyValidator` port,
  source-reading filters, LLM / semantic / fuzzy /
  embedding matching). The memo recommends the
  `EvidenceGraph` export / symbol facts projection v1
  as the substrate that unblocks 3–4 v3 candidate checks
  at once. Docs-only slice; no artifact `schemaVersion`
  bump, no new artifact type, no new capability role, no
  new CLI subcommand or flag, no new reason codes, no
  source reads, no LLM / semantic / fuzzy / embedding
  matching, no `GraphOntologyValidator` port, no version
  bump, no npm publish. Pinned by
  `tests/docs/graph-aware-filter-provider-v3-decision.test.mjs`.
- EvidenceGraph export / symbol facts projection v1
  (P1.1 evidence-export-symbol-facts-v1 slice): the
  substrate the v3 decision memo recommended.
  `@rekon/capability-js-ts` now emits `kind: "export"`
  and `kind: "symbol"` facts with rich
  `value: { name, kind, default? }` (exports) and
  `value: { name, kind, exported? }` (symbols) shape;
  subject = repo-relative file path. Extraction covers
  every form named in the work order (named declaration
  exports, default function / class / expression
  exports, named-list-with-alias exports,
  `export *` namespace re-exports, local declarations).
  Symbols carry an `exported` flag based on whether the
  declaration itself begins with `export`. New exports
  from `@rekon/kernel-findings`:
  `listExportsForFile(context, filePath)` and
  `listSymbolsForFile(context, filePath)`. Older
  `EvidenceGraph` artifacts continue to validate (no new
  artifact type, no `schemaVersion` bump). **No
  graph-aware filter consumes the new facts yet** — the
  substrate ships alone, per the v3 memo's
  substrate-first discipline. 13 new contract tests at
  `tests/contract/evidence-export-symbol-facts.test.mjs`.
  Deterministic regex extraction only — no AST, no type
  checker, no LLM / semantic / fuzzy / embedding
  inference, no source-file reads at filter time. No
  new reason codes. No new capability role. No new CLI
  subcommand or flag. No version bump. No npm publish.
- Graph-aware Next.js route export convention filter
  (P1.1 graph-aware-nextjs-route-export-filter v3
  slice): first v3 candidate check that consumes the new
  `EvidenceGraph` export facts substrate. New
  `graphFilterNextjsRouteConvention` in
  `@rekon/kernel-findings` reads `listExportsForFile`
  for `routes.single_http_handler_export` findings
  pointed at `route.ts` files. When export facts exist,
  the finding is suppressed if every non-handler named
  export is in the Next.js segment-config set
  (`runtime` / `dynamic` / `revalidate` / `fetchCache` /
  `preferredRegion`). Default exports are ignored; HTTP
  method names are recognized as handlers. Graph
  evidence is authoritative: a new
  `isNextjsRouteConventionSupersededByGraph` helper
  gates the classic content fallback inside
  `applyFindingFilters` so a clean-looking
  `details.otherExports` cannot override graph reality.
  `nextjs-route-convention` moved from
  `CLASSIC_CONTENT_FILTER_REASONS` to
  `GRAPH_AWARE_FILTER_REASONS`; filter-health buckets
  matches as `graphAwareFiltered`. Decisions carry
  `usedArtifacts: ["EvidenceGraph"]` so the runtime
  cites EvidenceGraph in
  `FindingFilterReport.header.inputRefs` only when the
  check consulted it. 11 new contract tests at
  `tests/contract/graph-aware-nextjs-route-export-filter.test.mjs`.
  No new reason codes. No source-file reads at filter
  time. No AST, no type checker. No LLM / semantic /
  fuzzy / embedding inference. No framework-wide
  Next.js catalog. No new capability role. No new CLI
  subcommand or flag. No artifact `schemaVersion` bump.
  No new artifact type. No version bump. No npm publish.
- Import-fact subject-shape decision memo (P1.1
  import-fact-subject-shape-decision slice):
  strategy-only batch; no runtime behavior change. The
  memo
  ([docs/strategy/import-fact-subject-shape-decision.md](import-fact-subject-shape-decision.md))
  evaluates how Rekon should handle the inconsistency
  between the new `EvidenceGraph` export / symbol facts
  (`subject = file path`) and the legacy import facts
  (`subject = "<file>:<target>"`). Recommends
  **Option B**: compatibility-aware import helpers
  (update `listImportTargetsForFile` to recognize both
  shapes via `subject === filePath`,
  `value.source === filePath`, and the legacy `subject`
  prefix). Preserves **Option A** (full producer
  migration) as a future trigger gated on helper
  compatibility growing beyond ~3 callsites, a planned
  `EvidenceGraph` `schemaVersion` bump, external author
  confusion, or import facts becoming a
  publication-facing artifact. Rejects **Option C**
  (leave as-is). Documents the helper-based
  compatibility contract: consumers must use
  `listImportTargetsForFile`,
  `listExportsForFile`, and `listSymbolsForFile` for
  file-scoped fact lookups rather than matching
  `fact.subject` raw. Docs-only slice; no artifact
  `schemaVersion` bump, no new artifact type, no new
  capability role, no new CLI subcommand or flag, no
  new reason codes, no producer change, no helper
  change, no graph-aware filter change, no version
  bump, no npm publish. Pinned by
  `tests/docs/import-fact-subject-shape-decision.test.mjs`.
- Import helper compatibility implementation (P1.1
  import-helper-compatibility slice): implements
  Option B of the import-fact subject-shape decision
  memo. `@rekon/kernel-findings.listImportTargetsForFile`
  and `fileImportsTargetMatching` now recognize BOTH
  the legacy producer shape
  (`subject = "<file>:<target>"`,
  `value: { source, target }`) AND the future
  file-subject shape (`subject = filePath`,
  `value: { target, ... }`) via a shared
  `matchesFileSubject` predicate. Match precedence:
  `subject === filePath` → `value.source === filePath`
  → legacy `subject` prefix-before-first-`:`
  (anchored on the full normalized file path; no
  `startsWith` traps). New `extractImportTarget`
  helper prefers `value.target` but falls back to the
  legacy subject suffix so older producers without
  `value.target` stay readable. Targets are deduped via
  a `Set` and returned sorted. `listExportsForFile` /
  `listSymbolsForFile` unchanged.
  `@rekon/capability-js-ts` import-fact producer
  unchanged — no artifact migration, no
  `EvidenceGraph` `schemaVersion` bump. 15 new contract
  tests at
  `tests/contract/import-helper-compatibility.test.mjs`
  cover both shapes, mixed-shape dedupe, anchored
  prefix matching, path normalization, missing-target
  rejection, export / symbol helper non-regression,
  `fileImportsTargetMatching` parity, production
  shape preservation, and an end-to-end graph-aware
  filter case proving the EvidenceGraph branch now
  fires against production-shaped data. No new reason
  codes. No source-file reads at filter time. No AST,
  no type checker. No LLM / semantic / fuzzy /
  embedding matching. No `GraphOntologyValidator`
  port. No new capability role. No new CLI subcommand
  or flag. No version bump. No npm publish.
- Graph-aware import-fact consumers v4 (P1.1
  graph-aware-import-fact-consumers-v4 slice): updates
  the three import-consuming graph-aware filters
  (`graphFilterRouteHandlerWithService`,
  `graphFilterRouteHttpMiddlewareOnly`,
  `graphFilterExternalApiCommentOnly`) to deliberately
  prefer `EvidenceGraph` import facts (via the
  compatibility-aware `listImportTargetsForFile`) over
  `Finding.details.imports`. `route-handler-with-service`
  precedence swapped — EvidenceGraph now runs before
  `details.imports`, then `ObservedRepo.files` sibling.
  All three filters now emit evidence strings that
  name the source: "EvidenceGraph import facts …" /
  "Detector import details …" / "ObservedRepo file
  index …". `usedArtifacts: ["EvidenceGraph"]` set
  exactly when the EvidenceGraph branch produced the
  decision; the runtime cites `EvidenceGraph` in
  `FindingFilterReport.header.inputRefs` precisely.
  15 new contract tests at
  `tests/contract/graph-aware-import-fact-consumers.test.mjs`.
  No new reason codes. No new graph-aware filter
  categories. No producer change. No source-file
  reads at filter time. No AST, no type checker. No
  LLM / semantic / fuzzy / embedding matching. No
  `GraphOntologyValidator` port. No new capability
  role. No new CLI subcommand or flag. No artifact
  `schemaVersion` bump. No new artifact type. No
  version bump. No npm publish.
- Graph-aware import evidence publication diagnostics
  (P1.1
  graph-aware-import-evidence-publication-diagnostics
  slice): adds per-`FilteredFinding`
  `evidenceSource: FindingFilterEvidenceSource` field
  (`EvidenceGraph` / `ObservedRepo` /
  `DetectorDetails` / `Policy` / `BuiltIn` /
  `ResultFilter` / `Unknown`). Extends
  `FindingFilterHealthSummary` with
  `byEvidenceSource`, `graphAwareByEvidenceSource`,
  `graphAwareReasonEvidenceSources`, and
  `dominantGraphAwareEvidenceSource`. Adds three
  advisory alerts
  (`graph-aware-details-fallback-dominance`,
  `graph-aware-observedrepo-fallback-dominance`,
  `graph-aware-evidencegraph-low-usage`, all gated on
  `graphAwareFiltered >= 5`). Architecture summary
  renders a `Graph-Aware Evidence Sources` table + a
  per-reason × per-source breakdown + audit pointer;
  agent contract renders a compact
  `Graph-aware evidence sources:` list under Finding
  Filter Health plus a new "Do Not Do" reminder
  against treating DetectorDetails fallback as
  equivalent to EvidenceGraph-backed evidence.
  Pipeline behavior unchanged — diagnostic surface
  only. Older `FindingFilterReport` artifacts continue
  to validate (additive optional). Producer
  unchanged. 19 new contract tests at
  `tests/contract/graph-aware-import-evidence-diagnostics.test.mjs`.
  No new reason codes. No source-file reads at filter
  time. No AST, no type checker. No LLM / semantic /
  fuzzy / embedding matching. No `GraphOntologyValidator`
  port. No new capability role. No new CLI subcommand
  or flag. No artifact `schemaVersion` bump. No new
  artifact type. No version bump. No npm publish.
- Graph-aware import evidence operator review (P1.1
  graph-aware-import-evidence-operator-review slice):
  strategy-only batch; no runtime behavior change. The
  memo
  ([docs/strategy/graph-aware-import-evidence-operator-review.md](graph-aware-import-evidence-operator-review.md))
  consumes the new diagnostic surface shipped at
  `499d096` against available fixtures and concludes
  **Option C (defer producer migration) for alpha**.
  Zero graph-aware filter decisions fire in any
  available local fixture; none of the four migration
  triggers documented in the import-fact subject-shape
  decision memo is met. The decision is durable for
  the entire alpha window. Recommended next slice:
  graph-aware filtering fixture expansion (add
  deterministic fixtures producing real
  EvidenceGraph-backed graph-aware matches so the next
  operator review consumes measured distributions
  rather than synthetic test data). Pinned by
  `tests/docs/graph-aware-import-evidence-operator-review.test.mjs`.
  No artifact `schemaVersion` bump. No new artifact
  type. No new capability role. No new CLI subcommand
  or flag. No new reason codes. No producer change.
  No helper change. No graph-aware filter change. No
  source-file reads. No LLM / semantic / fuzzy /
  embedding matching. No `GraphOntologyValidator`
  port. No version bump. No npm publish.
- Graph-aware filtering fixture expansion (P1.1
  graph-aware-filter-fixtures slice): three
  deterministic regression fixtures under
  `tests/fixtures/graph-aware-filters/`
  (`route-handler` / `external-comment` /
  `nextjs-route`) exercise the EvidenceGraph
  branches of `route-handler-with-service`,
  `external-api-comment-only`, and
  `nextjs-route-convention` end-to-end. Each fixture
  is a small JS/TS source tree that `rekon refresh`
  projects into an `EvidenceGraph` carrying the
  expected import / export facts. The contract test
  `tests/contract/graph-aware-filter-fixtures.test.mjs`
  copies each fixture to a tmpdir (committed
  fixtures stay untouched), seeds a synthetic
  `FindingReport` whose `header.inputRefs` cites
  the latest EvidenceGraph, runs the filter
  pipeline, and pins
  `FilteredFinding.evidenceSource === "EvidenceGraph"`,
  EvidenceGraph citation in
  `FindingFilterReport.header.inputRefs`,
  `graphAwareByEvidenceSource.EvidenceGraph >= 1`,
  `graphAwareReasonEvidenceSources[reason].EvidenceGraph >= 1`,
  lifecycle exclusion, and `rekon artifacts validate`
  cleanliness. A separate publications test asserts
  both the architecture summary and the agent
  contract surface EvidenceGraph attribution from
  the fixture flow. Regression fixtures only — NOT
  user-facing examples; they live under
  `tests/fixtures/`, not `examples/`. No filter
  behavior change. No producer change. No helper
  change. No artifact `schemaVersion` bump. No new
  artifact type. No new capability role. No new CLI
  subcommand or flag. No new reason codes. No
  source-file reads. No LLM / semantic / fuzzy /
  embedding matching. No `GraphOntologyValidator`
  port. No version bump. No npm publish.
- Graph-aware import evidence operator review refresh
  (P1.1
  graph-aware-import-evidence-operator-review-refresh
  slice): strategy-only batch; no runtime behavior
  change. The memo
  ([docs/strategy/graph-aware-import-evidence-operator-review-refresh.md](graph-aware-import-evidence-operator-review-refresh.md))
  re-runs the prior operator review's data-gathering
  protocol against the three deterministic regression
  fixtures shipped at `702afbf`
  (`tests/fixtures/graph-aware-filters/route-handler/`,
  `external-comment/`, `nextjs-route/`) via temp-copy
  flow. Measured aggregate: EvidenceGraph
  attribution 3 (one per fixture); DetectorDetails
  0; ObservedRepo 0; no fallback-dominance alert
  fires. All four migration triggers from the
  import-fact subject-shape decision memo
  re-evaluated against measured data — none met.
  **Decision: Option C remains the alpha decision.**
  Recommended next slice: graph-aware filter fixture
  coverage v2 (add deterministic fixtures for
  `route-http-middleware-only`,
  `factory-file-creates-deps`,
  `module-gate-verified-caller`). Pinned by
  `tests/docs/graph-aware-import-evidence-operator-review-refresh.test.mjs`.
  No artifact `schemaVersion` bump. No new artifact
  type. No new capability role. No new CLI subcommand
  or flag. No new reason codes. No producer change.
  No helper change. No graph-aware filter change.
  No source-file reads. No LLM / semantic / fuzzy /
  embedding matching. No `GraphOntologyValidator`
  port. No version bump. No npm publish.
- Reconciliation preview v1 (P1.1
  reconciliation-preview-v1 slice):
  **first product capability batch after
  the private-beta operator-support
  track.** Helper + CLI + docs + tests
  batch. **No source-write apply. No
  `source:write` permission registration.
  No `ReconciliationApplyReport` artifact
  (still reserved). No
  `ReconciliationPreviewReport` artifact
  in v1 (decision deferred to the next
  slice). No mutation of
  `ReconciliationPlan` shape. No
  auto-resolve of findings. No
  auto-apply of reconciliation. No
  auto-verification. No workflow YAML.
  No GitHub API call. No
  `package.json` / `package-lock.json`
  mutation outside additive helper
  exports. No npm publish. No version
  bump. No git tag. No GitHub Release.
  No new branch.** Adds the read-only
  preview surface that classifies a
  `ReconciliationPlan` into
  operator-facing rows. New pure helper
  `buildReconciliationPreview` in
  [`@rekon/capability-reconcile`](../../packages/capability-reconcile)
  with five preview kinds
  (`artifact-only`, `source-patch`,
  `generated-file`, `manual`,
  `not-previewable`) and four risk
  bands (`low` / `medium` / `high` /
  `unknown`). New CLI command
  `rekon reconcile preview --plan
  <id|type:id> [--root <path>]
  [--json]`. Forward-compatible
  unified-diff path emits a diff only
  when an operation carries
  `beforeText` + `afterText` AND the
  current file under `repoRoot`
  matches the expected before text;
  v1 plans carry no diff fields, so v1
  emits no diffs through normal flow.
  Required verbatim pins (asserted by
  docs test): *"Source-write apply is
  not available."*, *"Exact diff
  preview is mandatory before any
  apply implementation."*, *"The
  preview does not resolve findings."*
  New concept doc
  [`docs/concepts/reconciliation-preview.md`](../concepts/reconciliation-preview.md)
  + strategy memo
  [`docs/strategy/reconciliation-preview-v1.md`](reconciliation-preview-v1.md).
  Review packet
  `.rekon-dev/review-packets/reconciliation-preview-v1.md`
  with PURPOSE PRESERVATION CHECK +
  all 11 required sections. Contract
  test `tests/contract/reconciliation-preview.test.mjs`
  (13 assertions) + docs test
  `tests/docs/reconciliation-preview.test.mjs`
  (8 assertions). Full suite expected
  ≥ 1983 passed / 1 skipped (1962 + 21
  new). **Recommended next slice:**
  *ReconciliationPreviewReport
  artifact decision* — decide whether
  previews should become durable
  artifacts before any source-write
  apply path exists.
- Private beta onboarding quickstart
  refinements v2 (P1.1
  private-beta-onboarding-quickstart-refinements-v2
  slice): **fourth post-track
  operator-support slice** following the
  onboarding validation report. Docs /
  support / tests-only batch. **No npm
  publish. No version bump. No git tag.
  No GitHub Release. No runtime behaviour
  change. No new CLI command. No new
  helper. No schema change. No new
  artifact type. No new permission. No
  new role. No workflow YAML. No
  validator profile change. No GitHub
  API call. No package-manager
  detection added to plan generation.
  No `package.json` mutation. No
  source-file mutation. No mutation of
  any operator repo. No network I/O. No
  new branch. No change to
  VerificationPlan generation. No
  change to artifacts freshness
  behaviour. No change to path freshness
  behaviour. No change to missing-script
  tolerance.** Applies the two
  documentation refinements surfaced by
  the validation run: (1) new
  *Three Freshness Surfaces Operators
  Confuse* subsection inside *Run Path
  Freshness* with a diagnostic table
  covering `artifacts validate` vs
  `artifacts freshness` (historical
  `newer-input-exists` after
  re-publication is acceptable) vs
  `paths freshness` (working-tree
  freshness), plus three rules of
  thumb; (2) new *Inspect The Plan
  Before Executing* subsection inside
  *Optional Verification Flow* with a
  package-manager / runner table
  covering npm / pnpm / yarn / bun /
  turbo / nx / make, an inspect-then-
  execute flow, and routing of
  package-manager mismatch as a
  planning / ergonomics report. Playbook
  *Acceptable First-Class Outcomes*
  extended with three new bullets
  (package-manager mismatch acceptable
  when `VerificationRun` records
  honestly, aggregate `artifacts
  freshness` historical entries not
  automatically blockers, `artifacts
  validate: invalid` remains a
  blocker). Bug-report template gains
  *Package Manager Used By Target Repo*
  + *Relevant Scripts From package.json*
  subsections under *Target Repository
  Shape*, a new *Artifacts Freshness
  Result* section, and a new
  *VerificationPlan ↔ Package Manager
  Match* section. Validation report's
  *Follow-Up Work* updated to record
  the gaps were closed by this v2
  batch. Required verbatim pins
  (asserted by docs test):
  *"`artifacts validate` is the
  structural artifact validity gate."*,
  *"`artifacts freshness` can report
  historical `newer-input-exists`
  entries after re-publication;
  inspect whether the latest major
  publication / refresh step passed
  before treating aggregate stale
  output as a blocker."*, *"`paths
  freshness` is working-tree freshness
  and is separate from artifact lineage
  freshness."* Review packet
  `.rekon-dev/review-packets/private-beta-onboarding-quickstart-refinements-v2.md`
  with PURPOSE PRESERVATION CHECK + all
  11 required sections. New
  `tests/docs/private-beta-onboarding-quickstart-refinements-v2.test.mjs`
  (18 assertions). Full suite expected
  ≥ 1962 passed / 1 skipped (1944 + 18
  new). **Recommended next slice:**
  private beta cohort onboarding plan
  — define how to invite + support the
  first private beta users using the
  source-checkout distribution +
  playbook + quickstart (with v2
  refinements) + validation report +
  bug-report template + redaction
  policy. Still no daemon, no
  background refresh, no npm publish,
  no version bump.
- Private beta onboarding validation run
  (P1.1
  private-beta-onboarding-validation-run
  slice — **post-intake completion**):
  the operator authorised a target in a
  subsequent prompt, so the prior
  intake-blocked posture was resolved and
  the full validation ran end-to-end
  against a temp copy of one non-Rekon
  Next.js target (anonymized as
  `target-1`). **Outcome:
  `pass-with-known-limitations`.** New
  canonical
  [`docs/beta/private-beta-onboarding-validation-report.md`](../beta/private-beta-onboarding-validation-report.md)
  with all 15 required headings, four
  required tables (Command Matrix /
  Output Summary / Gap / Blocker), and
  all six required verbatim statements.
  The quickstart was followed verbatim
  (no silent adjustments); 22 of 25
  commands returned `pass`, 3 verification
  commands recorded `failed` honestly
  (target uses `pnpm-workspace`, install
  was deliberately not run in the temp
  copy — first-class acceptable outcome),
  both GitHub dry-runs made zero HTTP
  calls, `artifacts validate` returned
  `valid: true` at both checkpoints, and
  path freshness produced `unknown` →
  `fresh` (295 / 295 paths) on the
  first → second run as the quickstart
  documents. **Two minor documentation
  refinements** surfaced (recommended for
  the v2 quickstart batch): a one-line
  note about non-npm package managers in
  *Optional Verification Flow*, and a
  one-line note about historical
  `newer-input-exists` warnings after
  re-publication in *Inspect The Main
  Outputs*. **Zero blockers.** Review
  packet
  `.rekon-dev/review-packets/private-beta-onboarding-validation-run.md`
  re-written with PURPOSE PRESERVATION
  CHECK + all 14 required sections.
  Updated docs test
  `tests/docs/private-beta-onboarding-validation-run.test.mjs`
  (17 assertions: 16 work-order-required
  + 1 historical-record preservation).
  Full suite expected ≥ 1944 passed / 1
  skipped (1943 + 1 net new). **Strict
  no-go list still observed:** no npm
  publish, no version bump, no git tag,
  no GitHub Release, no runtime
  behaviour change, no new CLI command,
  no new helper, no schema change, no
  new artifact type, no new permission,
  no new role, no workflow YAML, no
  validator profile change, no GitHub
  API call, no `package.json` /
  `package-lock.json` mutation, no
  source-file mutation, no mutation of
  the operator's original target repo
  (only the `mktemp -d` temp copy was
  used and it was deleted after the
  run), no network I/O, no new branch.
  **Recommended next slice:** *Private
  beta onboarding quickstart refinements
  v2.* Apply the two documentation
  refinements as a focused docs batch.
  **Slice after that:** *Private beta
  cohort onboarding plan.*
- Private beta onboarding validation run
  (P1.1
  private-beta-onboarding-validation-run
  slice): **third post-track operator-support
  slice after the private beta onboarding
  quickstart.** Strategy / docs / tests-only
  batch. **No npm publish. No version bump.
  No git tag. No GitHub Release. No runtime
  behaviour change. No new CLI command. No
  new helper. No schema change. No new
  artifact type. No new permission. No new
  role. No workflow YAML. No validator
  profile change. No GitHub API call. No
  `package.json` / `package-lock.json`
  mutation. No source-file mutation. No
  mutation of any operator repo (none was
  supplied). No network I/O. No new branch.**
  **Outcome: `intake-blocked`.** The work
  order requires the operator to supply one
  non-Rekon target repository path plus four
  other intake fields (representative path,
  description, install / build hint, sensitive
  paths). None were supplied in the batch's
  prompt, so per the work order's explicit
  stop condition this batch ships a short
  intake request memo at
  [`docs/beta/private-beta-onboarding-validation-intake-request.md`](../beta/private-beta-onboarding-validation-intake-request.md)
  instead of the full validation report. The
  intake memo carries the work order's five
  required intake fields, the operator
  selection guidance, the anonymization
  posture, what-happens-next, and the
  pre-validation gate results on commit
  `8771cf5`. All 9 pre-validation commands
  passed (typecheck, test 1927 / 1 skipped,
  build, `git diff --check`,
  `audit-package-exports`, `audit-license`,
  `publish-dry-run`, `install-smoke`,
  `install-tarball-smoke`). Required verbatim
  statements pinned in the memo + asserted by
  the docs test: *"This batch does not
  publish to npm."*, *"This batch does not
  change package versions."*, *"This batch
  does not create a git tag."*, *"This batch
  does not create a GitHub Release."*, *"The
  validation run, when executed, used a temp
  copy of a non-Rekon repository."*, *"Rekon
  artifacts remain canonical; GitHub dry-runs
  are downstream previews."* Review packet
  `.rekon-dev/review-packets/private-beta-onboarding-validation-run.md`
  with PURPOSE PRESERVATION CHECK + all 14
  required sections (CHANGES MADE / PUBLIC API
  CHANGES / PURPOSE PRESERVATION CHECK /
  CODEBASE-INTEL ALIGNMENT / TARGET REPOSITORY
  / COMMAND MATRIX / OUTPUT SUMMARY /
  QUICKSTART GAPS / SUPPORT TEMPLATE GAPS /
  OUTCOME CLASSIFICATION / TESTS /
  VERIFICATION / INTENTIONALLY UNTOUCHED /
  RISKS / FOLLOW-UP / NEXT STEP). New
  `tests/docs/private-beta-onboarding-validation-run.test.mjs`
  (16 assertions). Full suite expected ≥
  1943 passed / 1 skipped (1927 + 16 new).
  **Next slice (blocking on operator
  answer):** the post-intake validation run
  itself, which will produce the canonical
  `docs/beta/private-beta-onboarding-validation-report.md`
  with the full structure the work order
  requires (Decision Summary, Target
  Repository, Commands Run, Output Summary,
  Artifact Results, Path Freshness Results,
  Verification Results, GitHub Dry-Run
  Results, Quickstart Gaps, Support Template
  Gaps, Blockers, Outcome Classification,
  What This Does Not Do, Follow-Up Work),
  plus the required command matrix / output
  summary / gap / blocker tables and the
  same six required verbatim statements.
  **Post-validation (if pass):** private
  beta cohort onboarding plan. **Post-
  validation (if blocked):** private beta
  onboarding blocker fix. Still no daemon,
  no background refresh, no npm publish, no
  version bump.
- Private beta onboarding quickstart (P1.1
  private-beta-onboarding-quickstart slice):
  **second post-track operator-support slice
  after the private beta support playbook.**
  Strategy / docs / tests-only batch. **No npm
  publish. No version bump. No git tag. No
  GitHub Release. No runtime behaviour change.
  No new CLI command. No new helper. No schema
  change. No new artifact type. No new
  permission. No new role. No workflow YAML.
  No validator profile change. No GitHub API
  call. No `package.json` /
  `package-lock.json` mutation. No source-file
  mutation. No mutation of any operator repo.
  No network I/O. No new branch.** Distills
  the now-shipped support playbook into a
  concise "start here" path for new operators
  (install from source checkout, build, pick a
  temp-copy target, run the first scan,
  inspect canonical outputs, run path
  freshness, optional verification + GitHub
  review dry-runs, recognise first-class
  outcomes vs. blockers, redact before
  sharing, know what is out of scope, plan
  the next step). New
  [`docs/beta/private-beta-onboarding-quickstart.md`](../beta/private-beta-onboarding-quickstart.md)
  with 15 required content headings + three
  required diagnostic tables (First-Run
  Command / Output / Blocker). Review packet
  `.rekon-dev/review-packets/private-beta-onboarding-quickstart.md`
  with PURPOSE PRESERVATION CHECK + all 11
  required sections. New
  `tests/docs/private-beta-onboarding-quickstart.test.mjs`
  (24 assertions). Pinned posture statements
  (all verbatim + asserted): *"Private beta
  users should not install Rekon from npm."*,
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
  The quickstart opens with a blockquote
  pinning *"playbook wins"* on any conflict
  with the
  [Private Beta Support Playbook](../beta/private-beta-support-playbook.md).
  Full suite expected ≥ 1927 passed / 1
  skipped (1903 + 24 new). **Recommended next
  slice:** private beta onboarding validation
  run — an operator follows the quickstart
  end-to-end against a non-Rekon repo and
  captures any gaps (confusing commands,
  missing docs, unclear outputs,
  support-template gaps, artifact-sharing
  risks) as a short retrospective memo. Still
  no daemon, no background refresh, no npm
  publish, no version bump.
- Private beta support playbook (P1.1
  private-beta-support-playbook slice):
  **first post-track operator-support slice
  after the path-freshness safety review.**
  Strategy / docs / tests-only batch. **No npm
  publish. No version bump. No git tag. No
  GitHub Release. No runtime behaviour change.
  No new CLI command. No new helper. No schema
  change. No new artifact type. No new
  permission. No new role. No workflow YAML.
  No validator profile change. No GitHub API
  call. No `package.json` /
  `package-lock.json` mutation. No source-file
  mutation. No network I/O.** Converts the
  now-stable no-NPM private-beta posture
  (verification + GitHub review surfaces +
  path freshness) into a repeatable operator
  support process. New
  [`docs/beta/private-beta-support-playbook.md`](../beta/private-beta-support-playbook.md)
  with 14 required sections + three required
  diagnostic tables (Support Classification /
  Artifact Attachment / Command Matrix). New
  [`docs/beta/private-beta-bug-report-template.md`](../beta/private-beta-bug-report-template.md)
  with 14 required section headings. Review
  packet
  `.rekon-dev/review-packets/private-beta-support-playbook.md`
  with PURPOSE PRESERVATION CHECK + all 12
  required sections. New
  `tests/docs/private-beta-support-playbook.test.mjs`
  (22 assertions). Pinned posture statements
  (all verbatim + asserted): private beta
  support is source-checkout based; bug
  reports must include Rekon artifacts or
  explicit redacted substitutes; private beta
  users should not install from npm; path
  freshness should be rerun after source
  edits before trusting existing artifacts;
  findings / failed verification / stale
  aggregate freshness / GitHub readiness gaps
  are not automatically blockers; artifact
  validation failure is a blocker; CLI
  crashes / malformed artifacts / token-log
  leaks / source mutation outside temp copies
  / dry-run network calls are blockers. Full
  suite expected ≥ 1903 passed / 1 skipped
  (1881 + 22 new). **Recommended next slice:**
  private beta onboarding quickstart — a
  concise operator/user quickstart built from
  the playbook (install from source checkout,
  run the first scan, inspect outputs, report
  issues, refresh after edits). Still no
  daemon, no background refresh, no npm
  publish, no version bump.
- Path freshness safety review (P1.1
  path-freshness-safety-review slice): **final
  slice in the post-beta watcher /
  path-freshness track.** Strategy / docs /
  tests-only batch. **No runtime behaviour
  change. No watcher behaviour. No daemon
  parity claim. No claim that path freshness
  is artifact lineage freshness. No claim that
  stale path freshness changes Check
  conclusion. No new package, no new CLI
  command, no new helper, no schema change, no
  new permission, no new artifact type, no
  workflow YAML, no GitHub API call, no `npm
  publish`, no version bump, no release tag,
  no GitHub Release, no `package.json` /
  `package-lock.json` mutation, no source-file
  mutation, no network I/O.** Reviews every
  component on the track end-to-end
  (`PathFreshnessReport` artifact +
  source-state fingerprint helper +
  `rekon paths freshness` CLI + publication
  surfacing + GitHub review surfacing +
  read-only guarantees + no-daemon policy +
  mtime/hash policy + Check conclusion
  policy). New strategy memo at
  [`docs/strategy/path-freshness-safety-review.md`](path-freshness-safety-review.md)
  with three required diagnostic tables
  (component / risk / decision). Required
  statements pinned verbatim: *"Artifact
  lineage freshness is not working-tree
  freshness." / "PathFreshnessReport is
  explicit and operator-triggered." / "No
  daemon or background refresh exists." /
  "Stale path freshness is a warning, not a
  GitHub Check conclusion override."*
  **Decision: the path freshness track is
  beta-private stable.** Review packet
  `.rekon-dev/review-packets/path-freshness-safety-review.md`
  with PURPOSE PRESERVATION CHECK; new docs
  test
  `tests/docs/path-freshness-safety-review.test.mjs`
  (19 assertions). Full suite expected ≥
  1881 passed / 1 skipped (1862 + 19 new).
  **Recommended next slice:** private beta
  support playbook — define how private beta
  users report issues, attach Rekon
  artifacts, classify blockers vs acceptable
  findings, rerun path freshness after source
  edits, follow no-npm / source-checkout
  install instructions.
- Path freshness GitHub review surfacing (P1.1
  path-freshness-github-review-surfacing slice):
  **third watcher / path-freshness
  implementation slice**, following the
  publication-surfacing slice. Builder wiring +
  helpers + tests + docs batch. **No daemon. No
  background refresh. No automatic refresh. No
  automatic `rekon paths freshness`. No source
  mutation. No new artifact type. No
  `ArtifactHeader` change. No
  `PathFreshnessReport` schema change. No
  GitHub API transport change. No change to
  existing Check / PR-comment readiness gates.
  No workflow YAML. No version bump. No `npm
  publish`. No GitHub Release.** New pure helper
  `buildPathFreshnessGitHubSummary` in
  `@rekon/capability-docs` renders the compact
  `Working tree path freshness:` block that
  both surfaces (Check `output.summary` + PR
  comment body) consume. `BuildGitHubCheckPayloadInput`
  + `PrCommentBodyInput` gain optional
  `pathFreshnessReport` + `pathFreshnessRef`
  fields. Both CLI flows (`publish github-check
  --dry-run`/`--send` and `publish pr-comment
  --dry-run`/`--send`) read the latest
  `PathFreshnessReport` and pass it into the
  builders; missing report is a no-op
  (no-baseline guidance renders). Both surfaces
  cite the report in `citedRefs`; PR-comment
  JSON output adds `citedRefs.pathFreshness`
  (additive only). **CONCLUSION POLICY (pinned
  this slice): stale `PathFreshnessReport` is a
  visible trust warning but does not by itself
  flip the GitHub Check conclusion.** Conclusion
  continues to be derived from proof /
  validation state via the existing
  `pickConclusion` logic. Both flows are
  read-only with respect to the report. GitHub
  status / comments remain non-canonical; both
  surfaces retain their existing
  canonical-truth reminders. Review packet at
  `.rekon-dev/review-packets/path-freshness-github-review-surfacing.md`
  with PURPOSE PRESERVATION CHECK + CONCLUSION
  POLICY sections; new contract test
  `tests/contract/path-freshness-github-review.test.mjs`
  (14 cases including conclusion-unchanged +
  fake-API send paths); new docs test
  `tests/docs/path-freshness-github-review.test.mjs`
  (9 assertions). Full suite expected ≥ 1862
  passed / 1 skipped (1839 + 23 new).
  **Recommended next slice:** path freshness
  safety review — review the full path-freshness
  track (artifact + CLI + publication surfacing
  + GitHub review surfacing + no-daemon
  guarantee) and decide whether to declare it
  beta-private stable or do another hardening
  pass.
- Path freshness publication surfacing (P1.1
  path-freshness-publication-surfacing slice):
  **second watcher / path-freshness
  implementation slice**, following the
  PathFreshnessReport artefact slice. Publisher
  wiring + helpers + tests + docs batch. **No
  daemon. No background refresh. No automatic
  `rekon refresh` invocation. No automatic `rekon
  paths freshness` invocation. No source mutation.
  No new artifact type. No new permission. No new
  role. No `ArtifactHeader` change. No
  `PathFreshnessReport` schema change. No GitHub
  send-semantics change. No workflow YAML. No
  version bump. No `npm publish`. No GitHub
  Release. No network I/O.** New pure helper
  `buildPathFreshnessPublicationSection` in
  `@rekon/capability-docs` renders a consistent
  `Working Tree Path Freshness` markdown block
  (parameterized heading level; bounded
  change-table at 20 non-fresh entries via
  `PATH_FRESHNESS_PUBLICATION_TABLE_CAP`). Wired
  into all three publishers: architecture summary
  renders the section between `## Verification
  Proof Status` and `## Proof Loop`; agent
  contract renders it between Verification Proof
  Status and Memory Guidance at `###` level; proof
  report renders it before `## Input Artifacts`
  in both the normal-flow path and the
  no-VerificationPlan early-bailout path. Each
  publisher cites the latest `PathFreshnessReport`
  in `header.inputRefs` when present. **All three
  publishers are read-only with respect to the
  report.** Agent contract gains a new
  `Do Not Do` reminder: *"Do not treat artifact
  lineage freshness as proof that the working
  tree has not changed; check the latest
  PathFreshnessReport via `rekon paths freshness
  --json` and run `rekon refresh` if the report is
  stale."* Capability manifest `consumes` adds
  `PathFreshnessReport`; new `invalidatedBy` rule
  `path-freshness.changed`. GitHub Check / PR
  comment dry-run + send payload surfacing
  **deferred** to the next slice
  ("path freshness GitHub review surfacing")
  because (a) the existing Check helper computes
  `conclusion` from proof state and deserves a
  separate design pass on whether stale path
  freshness should ever flip conclusion, (b) the
  CLI dry-run flows have their own
  input-gathering paths to wire through, and (c)
  the work order explicitly authorises deferral.
  New contract test
  `tests/contract/path-freshness-publications.test.mjs`
  (13 cases) + new docs test
  `tests/docs/path-freshness-publications.test.mjs`
  (9 assertions). Review packet at
  `.rekon-dev/review-packets/path-freshness-publication-surfacing.md`
  with PURPOSE PRESERVATION CHECK. Full suite
  expected ≥ 1839 passed / 1 skipped (1817 + 22
  new). **Recommended next slice:** path
  freshness GitHub review surfacing.
- PathFreshnessReport artifact + source-state
  fingerprint skeleton (P1.1
  path-freshness-report slice): **first watcher /
  path-freshness implementation slice** selected
  by the post-beta dogfood evidence triage
  decision (Option C). Runtime + helpers + CLI +
  tests + docs batch. **No daemon. No background
  refresh. No automatic `rekon refresh`
  invocation. No source mutation. No
  `ArtifactHeader` change. No new permission. No
  new role. No workflow YAML. No version bump.
  No `npm publish`. No GitHub Release. No
  network I/O.** New artifact type
  `PathFreshnessReport` registered in
  `@rekon/sdk` + `@rekon/runtime` (category
  `"actions"`). New pure helpers
  `createPathFreshnessReport(...)` +
  `comparePathFreshness(current, baseline?)` in
  `@rekon/capability-intent`. New pure helper
  `buildSourceStateFingerprint(input)` in
  `@rekon/kernel-repo-model` (sha256 content
  hashes, deterministic ordering, default
  ignore set, bounded reads, `mtimeAdvisory`
  opt-in). New CLI `rekon paths freshness
  [--path <path>] [--root <path>] [--json]`
  — read-only with respect to source files;
  writes exactly one new diagnostic
  `PathFreshnessReport` per invocation;
  compares to the most recent prior
  `PathFreshnessReport` baseline; recommends
  `rekon refresh` when stale but **never spawns
  refresh itself**. Mtimes are **advisory only
  — never canonical freshness evidence**.
  Artifact lineage freshness is **not**
  working-tree freshness; both surfaces
  coexist. New artifact doc at
  [`docs/artifacts/path-freshness-report.md`](../artifacts/path-freshness-report.md);
  new concept doc at
  [`docs/concepts/path-freshness.md`](../concepts/path-freshness.md);
  review packet
  `.rekon-dev/review-packets/path-freshness-report.md`
  with PURPOSE PRESERVATION CHECK; 15 new
  contract assertions + 9 new docs assertions.
  Full suite expected ≥ 1817 passed / 1
  skipped (1793 + 24 new). **Recommended next
  slice:** path freshness publication
  surfacing — render the latest
  `PathFreshnessReport` in the architecture
  summary, agent contract, and (if useful)
  proof report + GitHub review dry-run
  payloads. Still no daemon. Still no
  background refresh.
- Post-beta dogfood evidence triage decision
  (P1.1 post-beta-dogfood-evidence-triage slice):
  **strategy / docs / tests-only batch**
  following the first post-beta polish slice.
  No runtime behaviour change. No new package,
  no new CLI command, no new helper, no schema
  change, no new artifact type, no new
  permission, no new role, no workflow template
  change, no validator profile change, no
  GitHub API call, no `npm publish`, no version
  bump, no release tag, no GitHub Release, no
  active workflow YAML, no `package.json` /
  `package-lock.json` mutation, no source-file
  mutation in any `packages/*/src/*`, no
  mutation of any operator repo, no network
  I/O. Reviewed the real-repo cohort findings
  plus the first post-beta polish slice
  (VerificationPlan missing-script tolerance)
  and selected the **next post-beta track:
  Option C — watcher / path freshness
  implementation, starting with the
  `PathFreshnessReport` artifact +
  source-state fingerprint skeleton.** Evidence
  classification confirmed no further
  dogfood-surfaced verification polish slice
  is warranted: the only verification-class
  observation from the cohort
  (`npm | pnpm | yarn run <absent-script>`) is
  shipped; figma-ds typecheck failures are
  honest detection of real operator-source
  defects, not a Rekon defect; the remaining
  cohort limitations are deferred post-beta
  tracks governed by existing policy memos
  (source-write reconciliation, watcher / path
  freshness, hosted GitHub App). Options A
  (continue verification polish) rejected
  (no further evidence); Option B (source-write
  apply) rejected (highest risk surface;
  needs path-freshness signals first); Option
  C selected (foundational, policy already
  pinned, `PathFreshnessReport` name
  reserved); Option D (rule breadth) rejected
  (freshness precedes breadth); Option E
  (memory maturity) rejected (fixing derived
  layer before source layer compounds stale
  signal). New strategy memo at
  [`docs/strategy/post-beta-dogfood-evidence-triage.md`](post-beta-dogfood-evidence-triage.md);
  review packet
  `.rekon-dev/review-packets/post-beta-dogfood-evidence-triage.md`
  with PURPOSE PRESERVATION CHECK; new docs
  test
  `tests/docs/post-beta-dogfood-evidence-triage.test.mjs`
  (12 assertions); cross-link updates to
  cohort plan, cohort summary, missing-script
  tolerance memo, watcher / path freshness
  policy memo, classic-behaviour roadmap, and
  README. Full suite expected ≥ 1793 passed /
  1 skipped (1781 + 12 new docs assertions).
  **Recommended next slice:** the
  `PathFreshnessReport` artifact registration
  + source-state fingerprint helper +
  `rekon paths freshness` CLI (final naming
  deferred). Still no daemon. Still no
  background refresh. Still no source writes.
  Still no npm publish. Still no version
  bump.
- VerificationPlan missing-script tolerance (P1.1
  verification-missing-script-tolerance slice):
  **first post-beta polish slice** surfaced by the
  real-repo cohort. Runtime polish + tests + docs
  batch — no schema change, no new permission, no
  new artifact type, no new CLI command, no
  workflow-template change, no validator profile
  change, no GitHub API call, no `npm publish`, no
  version bump, no release tag, no GitHub Release,
  no active workflow YAML, no `package.json` /
  `package-lock.json` mutation, no source-file
  mutation, no mutation of any target repo, no
  network I/O. New helper `detectMissingScriptCommands`
  in `@rekon/capability-verify` + one-statement
  wire-in in `executeVerificationRun`. Pre-flight
  inspects each `npm | pnpm | yarn run <script>`
  command against the runner's `<cwd>/package.json`;
  commands whose script is provably absent are
  recorded `skipped` (not `failed`) with a
  `missing-script: <name>` note and **no process
  is spawned**. Conservative by construction:
  only the `pkgmgr run <name>` argv shape is
  inspected; only the cwd's `package.json` is
  read (no directory walk, no monorepo workspace
  resolution); missing / unreadable / malformed
  `package.json` falls through to the normal
  spawn path. Aggregate run status follows the
  existing rules — `partial` for mixed pass +
  skip, `not-run` for all-skipped, `failed` only
  on true failure.
  `deriveVerificationResultFromRun` maps
  `skipped → skipped` and carries the note
  through to `VerificationResult.commandResults`.
  Real-world impact on the cohort: structured-evals
  (missing `build`) and figma-ds (missing `test`)
  rows move from `failed` to `partial`. New
  strategy memo at
  [`docs/strategy/verification-missing-script-tolerance.md`](verification-missing-script-tolerance.md);
  Missing-Script Tolerance subsection added to
  [`docs/concepts/verification-runs.md`](../concepts/verification-runs.md);
  review packet
  `.rekon-dev/review-packets/verification-missing-script-tolerance.md`;
  README link to the memo. **Tests:** new
  `tests/contract/verification-missing-script-tolerance.test.mjs`
  (15 cases: 7 helper unit + 7 integration + 1
  derivation); pre-existing 25 cases in
  `verification-run-execution.test.mjs` still
  pass; ~12 new docs assertions. Full suite
  expected ≥ 1780 passed / 1 skipped.
  **Recommended next slice:** operator decision
  about whether to continue post-beta polish
  (additional dogfood-surfaced enhancements as
  they arise), pivot to post-beta tracks (source
  write / watcher / breadth), or open a no-NPM
  policy revision (still requires explicit
  operator decision). No `schemaVersion` bump.
  No npm publish. No release tag. No GitHub
  Release.
- Additional real-repo dogfood execution (P1.1
  additional-real-repo-dogfood-execution slice):
  **step 7b of the post-blocker release
  sequence** — the cohort execution itself,
  following the operator's approved intake table.
  Release-validation (cohort execution) + docs
  batch — **no runtime behaviour change**, **no
  npm publish**, no version bump, no release
  tag, no GitHub Release, no active workflow
  YAML, no `package.json` / `package-lock.json`
  mutation, no source-file mutation, no mutation
  of any cohort target repo's source tree
  outside `mktemp -d` copies. Three distinct
  operator-approved real repositories dogfooded
  against the local-built Rekon CLI at version
  `0.1.0-beta.0`, covering all 5 archetypes via
  2 documented consolidations: `boundary-contracts`
  → `<small-ts-package>` + `<github-workflows-repo>`
  (pass — all 3 verify commands passed;
  conclusion success); `structured-evals` →
  `<medium-monorepo>` (pass-with-known-limitations
  — typecheck + test passed; missing root
  `build` script propagated as honest failure;
  conclusion failure honestly propagated);
  `figma-ds` → `<nextjs-app>` + `<mixed-js-ts-repo>`
  (pass-with-known-limitations — typecheck
  failed with real TS errors in operator
  source; test script missing; build passed;
  conclusion failure honestly propagated).
  **Cohort decision: `pass-with-known-limitations`;
  no release blockers found.** Aggregate
  metrics: 102 artefacts across 19 types (34
  per target × 3); every artefact validated
  clean; no corruption; no token leak; no
  source mutation outside temp copies. New
  cohort summary at
  [`docs/strategy/real-repo-cohort-summary.md`](real-repo-cohort-summary.md);
  per-target reports under
  `docs/strategy/real-repo-cohort/`. Three
  observations surfaced (all post-beta polish,
  none release blockers): verify-pipeline
  propagates state correctly in both directions;
  VerificationPlan three-command default isn't
  universal (post-beta `not-applicable` for
  missing scripts would improve signal-to-noise);
  0 Rekon-detected findings on these targets
  (broader future cohorts would strengthen
  confidence). 15 new docs assertions. Full
  suite expected ≥ 1753 passed / 1 skipped.
  **Recommended next slice:** operator decision
  about whether to continue beta as-is, add more
  cohort targets, pivot to post-beta tracks
  (source-write / watcher / breadth / polish),
  or open a no-NPM-policy-revision work order
  (requires explicit operator decision; this
  cohort does not pre-authorise one). No
  `schemaVersion` bump. No npm publish. No
  release tag. No GitHub Release.
- Real-repo dogfood cohort intake request (P1.1
  real-repo-cohort-intake-request slice): **step
  7a of the post-blocker release sequence** —
  the cohort execution batch's intake substep,
  triggered when the operator did not supply
  concrete cohort repos in the work-order
  prompt. Strategy / docs / tests-only batch —
  **no runtime behaviour change. No invented
  repo names. The cohort was not run.** No new
  package, no new CLI command, no new helper,
  no workflow-template change, no validator
  profile change, no GitHub API call, no `npm
  publish`, no version bump, no release tag,
  no GitHub Release, no active workflow YAML,
  no `package.json` / `package-lock.json`
  mutation, no source-file mutation. New
  strategy memo at
  [`docs/strategy/real-repo-cohort-intake-request.md`](real-repo-cohort-intake-request.md)
  records the pre-cohort verification gate
  (all 9 mandatory commands passed on the
  primary tree at SHA `b80be3e`; 1728 / 1
  skipped) + the intake table the operator
  needs to fill in (5-row table with all 5
  archetype placeholders; at least 3 distinct
  concrete repos required; representative path
  per row; anonymisation-preference column).
  Pinned reminders carried forward: no npm
  publish during beta; beta is private /
  local / repo-based; at least three distinct
  real repositories required before any
  post-beta publish reconsideration; no cohort
  target may be Rekon itself; do not invent
  repo names; this batch does not run the
  cohort. **Cohort execution (step 7b)
  remains blocked on operator intake.** 10
  new docs assertions. Full suite expected ≥
  1738 passed / 1 skipped. **Recommended next
  slice:** wait for operator intake response;
  then the additional real-repo dogfood
  execution batch substitutes the operator's
  concrete repos for each archetype
  placeholder, runs the matrix, and writes
  per-target + cohort reports. Still no npm
  publish; still no version bump; still no
  git tag. No `schemaVersion` bump. No GitHub
  Release.
- Additional real-repo dogfood cohort plan (P1.1
  additional-real-repo-dogfood-cohort-plan
  slice): **step 6 of the post-blocker release
  sequence** pinned by the No-NPM Beta
  Distribution Policy. Strategy / docs /
  tests-only batch — **no runtime behaviour
  change. Does not run the cohort.** No new
  package, no new CLI command, no new helper, no
  workflow-template change, no validator profile
  change, no GitHub API call, no `npm publish`,
  no version bump, no release tag, no GitHub
  Release, no active workflow YAML, no
  `package.json` / `package-lock.json` mutation,
  no source-file mutation. New strategy memo at
  [`docs/strategy/additional-real-repo-dogfood-cohort-plan.md`](additional-real-repo-dogfood-cohort-plan.md)
  defines the 5-archetype cohort plan. Five
  archetypes pinned (placeholders): small TS
  package; medium monorepo; Next.js / React
  app; mixed JS/TS repo; existing GitHub
  workflows repo. Cohort must include at least
  3 distinct real repositories; single-repo
  consolidation allowed when a repo legitimately
  covers multiple archetypes; no cohort target
  may be Rekon itself. Command matrix mirrors
  the first dogfood matrix (core + representative
  -path + workflow validator) for cross-target
  comparability. Metrics-to-record list: 27
  required metrics per target. Success criteria
  + acceptable outcomes + release blocker
  taxonomy (9 categories: refresh crash;
  artifacts validate invalid; malformed
  artefact; publication render failure; CLI
  crash; token / log leak; source mutation
  outside temp copy; workflow validator invalid
  for Rekon-supplied template; --dry-run mode
  actually executes / makes network call).
  Reporting format pinned (per-target dogfood
  reports under
  `docs/strategy/real-repo-cohort/`; cohort
  summary report; cohort execution review
  packet; cohort execution docs test — all
  written by the next slice). 18 new docs
  assertions. Full suite expected ≥ 1728
  passed / 1 skipped. **Recommended next
  slice:** additional real-repo dogfood
  execution (substitutes operator-selected
  concrete repositories for each archetype
  placeholder; runs the matrix; writes
  per-target + cohort reports). Still no npm
  publish; still no version bump; still no
  git tag. No `schemaVersion` bump. No GitHub
  Release.
- No-NPM beta distribution policy (P1.1
  no-npm-beta-distribution-policy slice): **step
  5 of the post-blocker release sequence** —
  **replaces** the previously-planned publish
  authorization work order. Strategy / docs /
  tests-only batch — **no runtime behaviour
  change.** No new package, no new CLI command,
  no new helper, no workflow-template change, no
  validator profile change, no GitHub API call,
  no `npm publish`, no version bump, no release
  tag, no GitHub Release, no active workflow
  YAML, no `package.json` / `package-lock.json`
  mutation. New strategy memo at
  [`docs/strategy/no-npm-beta-distribution-policy.md`](no-npm-beta-distribution-policy.md)
  pins the post-dogfood release posture.
  **Decision: Rekon beta will not be published
  to npm.** Beta is a validated product /
  checklist state, not an npm-published package
  state. Distribution during beta is
  source-controlled, local-build, and
  tarball-smoke based; the npm registry path is
  deferred until after beta or until a new
  explicit operator decision reverses the
  policy. Pinned reminders: Rekon beta will not
  be published to npm; npm publish is deferred
  until after beta; `0.1.0-beta.0` remains the
  internal / repo version for beta validation;
  beta distribution is source-controlled /
  local-build / tarball-smoke based. Required
  statements: beta readiness is a product /
  checklist state, not an npm-published state;
  no npm publish should be attempted during
  beta; real-repo dogfood passed and should
  continue across more repos before public
  package release. Three diagnostic tables:
  distribution (6 rows), policy (6 rows),
  dogfood (1 row). 11-step implementation
  sequence pinned (this memo is step 5; the
  additional real-repo dogfood cohort plan is
  step 6; publish authorization is deferred to
  step 11 "Optional, deferred"). 15 new docs
  assertions. Full suite expected ≥ 1710 passed
  / 1 skipped. **Recommended next slice:**
  additional real-repo dogfood cohort plan
  (defines 3–5 more real repositories / repo
  archetypes — small TS package, medium
  monorepo, Next.js app, mixed JS/TS repo, repo
  with existing GitHub workflows — to dogfood
  before any post-beta publish reconsideration).
  No `schemaVersion` bump. No npm publish. No
  release tag. No GitHub Release.
- Real-repo beta dogfood report (P1.1
  real-repo-beta-dogfood slice): **step 4 of the
  post-blocker release sequence** pinned by the
  Beta Release Readiness Checklist + advanced by
  the Beta Release Candidate Execution Plan + the
  Beta Version Bump Execution Report.
  Release-validation (real-repo dogfood) batch
  — **no runtime behaviour change.** No new
  package, no new CLI command, no new helper, no
  workflow-template change, no validator profile
  change, no GitHub API call, no `npm publish`,
  no version bump, no release tag, no GitHub
  Release, no active workflow YAML, no mutation
  of committed examples. New strategy memo at
  [`docs/strategy/real-repo-beta-dogfood-report.md`](real-repo-beta-dogfood-report.md)
  records the full dogfood run against a temp
  copy of the Rekon repository itself (489 files
  / 7.8 MB rsync copy at SHA `83ba723`; `npm ci`
  + `npm run build` inside the copy succeeded).
  **Dogfood Decision: `pass-with-known-
  limitations`.** Two genuine dogfood wins vs.
  the smaller example fixture used by Batches
  30 + 31: `verify run --execute` actually ran
  `npm run typecheck` + `npm run test` + `npm
  run build` and all 3 **passed** (first
  end-to-end pass against real commands; exit 0
  / 280ms + exit 0 / 37 246ms + exit 0 /
  2 214ms); `publish github-check --dry-run`
  propagated `conclusion: success` +
  `output.title: "Verification: passed (fresh)"`
  end-to-end. Pinned reminders: this batch does
  not publish to npm; this batch does not change
  package versions; this batch does not create a
  git tag; this batch does not create a GitHub
  Release; the dogfood run used a temp copy of a
  real repository and did not mutate committed
  examples; the next publish step still requires
  explicit operator authorization. 24-entry
  dogfood command matrix exercised end-to-end:
  init / refresh (14 lifecycle steps, freshness
  fresh) / artifacts validate (clean) / findings
  filter (134 filtered all test-file / 1 kept,
  filterRate 0.9926) / issues adjudicate (1
  group, 1 active) / coherency delta (1 active
  item — the intentional `import-boundary-rule-pack`
  demo fixture) / publish proof+architecture+
  agent-contract / resolve preflight / intent
  work-order / verify run dry-run+execute /
  verify result from-run / republish / publish
  github-check+pr-comment dry-runs / 4 workflow
  validators (all valid:true, 0 issues) / final
  validate (clean) / final freshness (aggregate
  stale with 20 historical issues, documented).
  36 artefacts written across 19 types; every
  artefact validated clean. 15 new docs
  assertions. Full suite expected ≥ 1695 passed
  / 1 skipped. **Recommended next slice:** beta
  npm publish authorization work order (the
  first slice in the entire Rekon sequence
  allowed to invoke `npm publish`, and only
  with explicit operator authorization). No
  `schemaVersion` bump. No npm publish. No
  release tag. No GitHub Release.
- Beta version bump execution report (P1.1
  beta-version-bump slice): **step 3 of the
  post-blocker release sequence** pinned by the
  Beta Release Readiness Checklist + advanced by
  the Beta Release Candidate Execution Plan.
  Release-prep (version-coherence) batch — **no
  runtime behaviour change.** No new package, no
  new CLI command, no new helper, no
  workflow-template change, no validator profile
  change, no GitHub API call, no `npm publish`,
  no release tag, no GitHub Release, no active
  workflow YAML. **Does mutate `package.json`
  `version` fields + `package-lock.json` —
  intentionally, exactly per the version bump
  scope.** Version `0.1.0-beta.0` applied to root
  `package.json` + 20 workspace `package.json`
  files + `package-lock.json` (root version + 21
  workspace version entries + 70 `@rekon/*`
  dependency pins) + 70 `@rekon/*` dependency
  pins inside workspace `package.json` files.
  Method: deterministic Node JSON rewrite (not
  `npm version`; not `npm install
  --package-lock-only` — the lockfile was
  rewritten directly to avoid registry lookups
  for unpublished `@rekon/*` packages). Coherence
  verified: 0 `0.1.0-alpha.1` references remain.
  New strategy memo at
  [`docs/strategy/beta-version-bump-execution-report.md`](beta-version-bump-execution-report.md)
  records the bump + the re-verification
  results. **Decision: Version `0.1.0-beta.0`
  has been applied coherently across the root
  package and all 20 workspace packages.** This
  batch does not publish to npm, does not create
  a git tag, and does not create a GitHub
  Release. The next publish step requires
  explicit operator authorization. All 9
  mandatory verification commands passed on the
  bumped tree (test count 1662 passed / 1
  skipped, matching pre-bump count; no
  regressions). 15-entry CLI smoke matrix
  re-run against a temporary fixture root with
  results identical in shape to the pre-bump run
  — confirming the bump introduces no
  behavioural change. One existing test updated
  (`release-readiness.test.mjs` `EXPECTED_VERSION`
  constant bumped from `0.1.0-alpha.1` to
  `0.1.0-beta.0`; alpha-release-document
  existence assertions remain intact as
  historical artefacts). 18 new docs assertions.
  Full suite expected ≥ 1680 passed / 1
  skipped. **Recommended next slice:** beta npm
  publish authorization work order — the first
  slice in the entire Rekon sequence allowed to
  invoke `npm publish`, and only with explicit
  operator authorization. No `schemaVersion`
  bump. No npm publish. No release tag. No
  GitHub Release.
- Beta release candidate execution plan (P1.1
  beta-release-candidate-execution-plan slice):
  **step 2 of the post-blocker release sequence**
  pinned by the Beta Release Readiness Checklist.
  Release-candidate execution + docs batch — **no
  runtime behaviour change.** No new package, no new
  CLI command, no new helper, no workflow-template
  change, no validator profile change, no GitHub API
  call, no `npm publish`, no version bump, no release
  tag, no active workflow YAML. New strategy memo at
  [`docs/strategy/beta-release-candidate-execution-plan.md`](beta-release-candidate-execution-plan.md)
  executes the pinned checklist against `main` SHA
  `54d1dfd2cd360434a82738d3963ec9cbb5b709f2`.
  **Decision: the current `main` SHA qualifies as a
  beta release candidate.** All 9 mandatory
  verification commands passed (typecheck, test
  1644/1, build, git diff --check, package-exports
  audit, license audit, publish-dry-run, install-
  smoke, install-tarball-smoke). 15-entry CLI smoke
  matrix ran against a temporary fixture root
  (`mktemp -d` copy of `examples/simple-js-ts`); two
  documented first-class behaviours recorded
  honestly (failed `verify run --execute` against a
  fixture with no real test command; `pr-comment
  --dry-run` readiness reporting expected gaps with
  no GitHub env set). Package / version state
  recorded (root `0.1.0-alpha.1`; all 20 workspace
  packages coherent). **Recommended beta version:
  `0.1.0-beta.0`** (deferred to the version bump
  work order). 8-step release work order preview
  pinned (gated by operator authorisation before
  publish). 18 new docs assertions. Full suite
  expected ≥ 1662 passed / 1 skipped. **Recommended
  next slice:** beta version bump work order
  (applies `0.1.0-beta.0`; re-runs audits + smokes
  on the bumped SHA; still avoids `npm publish`
  unless operator explicitly authorises). No
  `schemaVersion` bump. No version bump. No npm
  publish. No release tag.
- Beta release readiness checklist memo (P1.1
  beta-release-readiness-checklist slice): **third (and
  final) of three beta blockers** identified by the
  Beta Readiness / Remaining Classic-Parity Review.
  Strategy / docs / tests-only batch — **no runtime
  behaviour change.** No new package, no new CLI
  command, no new helper, no workflow-template change,
  no validator profile change, no GitHub API call, no
  version bump, no npm publish, no release tag, no
  active workflow YAML. New strategy memo at
  [`docs/strategy/beta-release-readiness-checklist.md`](beta-release-readiness-checklist.md)
  pins the final beta release readiness contract.
  **Decision: with this checklist pinned + the
  mandatory verification commands passing on main,
  Rekon is beta-ready. Beta-ready is a checklist
  state, not an npm publish event; the actual publish
  is a separate explicit operator work order.** Pinned
  reminders: beta readiness is a checklist state, not
  an npm publish event; npm publish requires a
  separate explicit release work order; no version
  bump occurs in this checklist batch; known beta
  limitations must be documented before beta is
  announced. All three beta blockers resolved
  (source-write reconciliation policy; watcher / path
  freshness policy; release readiness checklist).
  Four diagnostic tables: beta blocker (3 rows; all
  resolved), verification command (9 rows; all
  required-before-beta), known limitations (7 primary
  rows + 8 carried forward), release stop-condition
  (5 rows). Nine mandatory verification commands
  pinned (typecheck, test, build, git diff --check,
  package-exports audit, license audit, publish
  dry-run, install smoke, install tarball smoke).
  14-command CLI smoke matrix pinned for the release
  slice. Versioning policy pinned (current
  `0.1.0-alpha.1`; beta target `0.1.0-beta.<n>`; no
  version bump in this batch). NPM publish policy
  pinned (no publish in this batch; separate work
  order required). 6-step implementation sequence
  pinned (checklist memo → execution plan → release →
  post-beta source-write apply roadmap → post-beta
  path-freshness + watcher roadmap → post-beta
  breadth / maturity / polish work). 22 new docs
  assertions. Full suite expected ≥ 1644 passed / 1
  skipped. **Recommended next slice:** beta release
  candidate execution plan (executes checklist on
  release SHA; still avoids `npm publish` unless
  operator explicitly authorises). No `schemaVersion`
  bump. No version bump. No npm publish.
- Watcher / path freshness policy decision memo (P1.1
  watcher-path-freshness-policy-decision slice):
  **second of three beta blockers** identified by the
  Beta Readiness / Remaining Classic-Parity Review.
  Strategy / docs / tests-only batch — **no runtime
  behaviour change.** No new package, no new CLI command,
  no new helper, no workflow-template change, no
  validator profile change, no GitHub API call, no
  file-system event subscription, no daemon, no
  background refresh, no path mtime tracking, no
  artifact-type registration, no `ArtifactHeader` change.
  New strategy memo at
  [`docs/strategy/watcher-path-freshness-policy-decision.md`](watcher-path-freshness-policy-decision.md)
  pins the watcher / path freshness boundary for beta.
  **Decision: Option C — watcher-lite / path freshness
  policy for beta. No daemon by default; explicit `rekon
  refresh` remains the canonical operator action; future
  `PathFreshnessReport` artifact reserved by name; agent
  contract instructs agents to refresh after source
  edits.** Four options analysed (manual refresh only /
  full daemon / watcher-lite + path policy / opt-in
  daemon). Pinned reminders carried forward: watcher
  daemon is not required for beta; path/source freshness
  policy is required for beta; Rekon must not silently
  mutate artifacts in the background; agents should treat
  artifacts as stale after source edits until `rekon
  refresh` has run; artifact lineage freshness is not the
  same as working-tree freshness. The memo reserves the
  `PathFreshnessReport` artifact name (docs-only
  reservation; SDK / runtime registration belongs to a
  later slice) and pins that file mtimes alone are not
  sufficient as canonical freshness evidence — content
  hashes / git working-tree state preferred. Three
  diagnostic tables: policy (8 rows), option (4 rows),
  risk (5 rows). 7-step implementation sequence pinned
  (step 2 is the remaining beta blocker; step 3 is the
  beta release execution; steps 4-7 are the post-beta
  path-freshness + watcher roadmap). 17 new docs
  assertions. Full suite expected ≥ 1622 passed / 1
  skipped. **Recommended next slice:** beta release
  readiness checklist memo (third and final of three
  beta blockers). No `schemaVersion` bump. No version
  bump. No npm publish.
- Source-write reconciliation policy decision memo (P1.1
  source-write-reconciliation-policy-decision slice):
  **first of three beta blockers** identified by the
  Beta Readiness / Remaining Classic-Parity Review.
  Strategy / docs / tests-only batch — **no runtime
  behaviour change.** No new package, no new CLI command,
  no new helper, no workflow-template change, no
  validator profile change, no GitHub API call, no
  source-file mutation, no artifact-type registration, no
  permission registration. New strategy memo at
  [`docs/strategy/source-write-reconciliation-policy-decision.md`](source-write-reconciliation-policy-decision.md)
  pins the source-write boundary for beta. **Decision:
  Option C — beta pins the source-write policy + preview
  requirements; the actual apply implementation remains
  deferred post-beta.** Four options analysed (no apply /
  deterministic narrow apply / preview-first / full
  apply). Pinned reminders carried forward: source-write
  apply is not required for beta but the policy boundary
  is required for beta; no agent-autonomous source
  writes; every future source-write apply must be
  preceded by exact diff preview and explicit operator
  confirmation; a successful apply must not automatically
  resolve findings — lifecycle / status updates remain
  explicit artifacts. The memo reserves the
  `ReconciliationApplyReport` artifact name and the
  `source:write` permission name (docs-only reservation;
  SDK / runtime registration belongs to a later slice).
  Three diagnostic tables: policy (8 rows), operation-
  class (5 rows), risk (5 rows). 8-step implementation
  sequence pinned (steps 2-4 are the remaining beta
  blockers; steps 5-8 are the post-beta apply roadmap).
  18 new docs assertions. Full suite expected ≥ 1605
  passed / 1 skipped. **Recommended next slice:** watcher
  / path freshness policy decision memo (second of three
  beta blockers). No `schemaVersion` bump. No version
  bump. No npm publish.
- Beta readiness / remaining classic-parity review (P1.1
  beta-readiness-classic-parity-review slice): **first
  beta-readiness review** following the completed CI /
  GitHub adapter sequence. Strategy / docs / tests-only
  batch — **no runtime behaviour change.** No new
  package, no new CLI command, no new helper, no
  workflow-template change, no validator profile change,
  no GitHub API call. New strategy memo at
  [`docs/strategy/beta-readiness-classic-parity-review.md`](beta-readiness-classic-parity-review.md)
  steps back from the verification + GitHub review-surface
  arc and assesses Rekon's remaining delta to beta. Reviews
  15 subsystems against codebase-intel's classic goals
  (understand, govern, fix, verify, communicate).
  **Decision: Rekon is beta-close but not beta-ready.**
  Three policy blockers remain (source-write reconciliation
  policy, watcher / path freshness policy, beta release
  readiness checklist) — each a decision rather than a
  missing implementation. Beta-ready subsystems:
  verification runner + proof surfaces; GitHub review
  surfaces; finding filters; graph-aware filtering; issue
  governance; resolver packets; publications; memory;
  snapshot refresh. Post-beta: hosted GitHub App, deeper
  rule catalog, memory promotion / supersession, Windows
  process-tree kill, PR comment refinements, source-write
  automation beyond the policy gate. Required statements
  pinned by the memo + the docs test: beta readiness is
  not the same as full classic parity; Rekon should not
  add more GitHub review surfaces before beta; the
  remaining pre-beta work is policy / guardrail oriented.
  Three diagnostic tables: subsystem readiness matrix
  (15 rows), beta blocker table (3 rows), post-beta table
  (6 rows). 19 new docs assertions. Full suite expected
  ≥ 1587 passed / 1 skipped. **Recommended next slice:**
  source-write reconciliation policy decision memo. No
  `schemaVersion` bump. No version bump. No npm publish.
- Verification / GitHub trust-boundary safety review (P1.1
  verification-github-trust-boundary-safety-review slice):
  **step 10** of the CI / GitHub adapter implementation
  sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  Strategy / docs / tests-only batch — **no runtime
  behaviour change.** No new package, no new CLI command,
  no new helper, no workflow-template change, no validator
  profile change, no GitHub API call. New strategy memo at
  [`docs/strategy/verification-github-trust-boundary-safety-review.md`](verification-github-trust-boundary-safety-review.md)
  walks every step-9 hardening fix in isolation (proof-
  chain coherence, bounded streaming capture, POSIX
  process-tree timeout, NODE_OPTIONS removal, bounded
  GitHub API error reads, PR head SHA safety) + the
  affected surfaces (runner, both publishers, payloads,
  templates, validator profiles) and declares the
  verification / GitHub trust boundary **beta-stable**. No
  additional GitHub review surfaces before beta; remaining
  work is operational polish + documented platform caveats.
  Required statements pinned by the memo + the docs test:
  GitHub status and comments are not canonical truth;
  Rekon artifacts remain canonical; VerificationResult and
  VerificationRun must remain chain-coherent in every
  review surface; Windows timeout behaviour is direct-
  child-only unless a future platform-specific process-
  tree strategy is implemented; a successful Check / PR
  comment publish does not imply findings are resolved.
  Three diagnostic tables: hardening (six fixes shipped),
  risk (mixed proof chain / memory exhaustion / orphan
  child / env injection / huge error body / wrong PR SHA),
  beta decision (every criterion passes). 18 new docs
  assertions. Full suite expected ≥ 1568 passed / 1
  skipped. **Recommended next slice:** beta readiness /
  remaining classic-parity review — step back from
  GitHub-specific work and assess the remaining delta to
  beta. No `schemaVersion` bump. No version bump. No npm
  publish.
- Verification / GitHub trust-boundary hardening (P1.1
  verification-github-trust-boundary-hardening slice):
  **step 9** of the CI / GitHub adapter implementation
  sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  Hardening batch — runtime fixes in
  `@rekon/capability-docs`, `@rekon/capability-verify`,
  and the CLI. No new surfaces, no new workflow
  templates, no new GitHub API calls. Six fixes paged by
  the step-8 parity review:
  1. Coherent GitHub Check proof-chain selection (CLI
     uses `VerificationResult.header.inputRefs` to pick
     the run; missing cited run surfaces
     `proofChainWarnings`).
  2. Bounded stdout/stderr streaming capture (incremental
     sha256 + bounded excerpt buffer).
  3. POSIX process-tree timeout kill (`detached: true` +
     `process.kill(-pid, signal)`; Windows direct-child-
     only documented).
  4. `NODE_OPTIONS` removed from
     `VERIFICATION_RUN_ENV_ALLOWLIST`.
  5. Bounded GitHub API error-body reads in both
     publishers (shared `readBoundedResponseBody`,
     64 KiB cap via streaming reader).
  6. PR head SHA safety: new `missing-pr-head-sha`
     readiness issue; `pull_request*` events require
     explicit `--head-sha` or `GITHUB_HEAD_SHA`.

  Public API changes (additive + subtractive):
  `missing-pr-head-sha` issue code (additive);
  `VERIFICATION_RUN_ENV_ALLOWLIST` no longer contains
  `NODE_OPTIONS` (subtractive); new `--head-sha <sha>`
  CLI flag; new `proofChainWarnings` JSON output field.
  Full suite 1550 passed / 1 skipped (17 new contract
  tests across 5 groups; 1 new readiness rejection test;
  2 updated readiness tests). New review packet at
  `.rekon-dev/review-packets/verification-github-trust-boundary-hardening.md`.
  **Recommended next slice:** Verification / GitHub
  trust-boundary safety review. No `schemaVersion` bump.
  No version bump. No npm publish.
- GitHub review surfaces parity review (P1.1
  github-review-surfaces-parity-review slice): **step 8**
  of the CI / GitHub adapter implementation sequence
  pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  Strategy / docs / tests-only batch — **no runtime
  behaviour change.** No new package, no new CLI
  command, no new helper, no workflow-template change,
  no validator profile change, no GitHub API call. New
  strategy memo at
  [`docs/strategy/github-review-surfaces-parity-review.md`](github-review-surfaces-parity-review.md)
  reviews the combined GitHub review surface end-to-
  end (read-only workflow templates, opt-in Check + PR
  comment workflow templates, three validator
  profiles, both publishers' dry-run + send CLIs,
  proof / architecture-summary / agent-contract
  publications, uploaded `.rekon/artifacts`, job
  summary markdown, `rekon artifacts latest` helper,
  canonical artifact boundary, fork / token /
  permission safety, operator ergonomics gaps) and
  pins **beta-complete as an opt-in surface**.
  Read-only templates remain the alpha default;
  GitHub Checks remain the primary status surface; PR
  comments are the narrative companion surface;
  uploaded Rekon artifacts remain canonical truth;
  **no additional GitHub API surface is needed
  before beta**. Required statements pinned by the
  memo + the docs test: GitHub status and comments
  are not canonical truth; Rekon artifacts remain
  canonical; a successful GitHub Check or PR comment
  publish does not imply findings are resolved or
  reconciliation has been applied; forked PRs and
  `pull_request_target` remain blocked by default;
  read-only workflows remain the recommended
  starting point. Three diagnostic tables: surface
  (read-only / Check / PR comment / publishers /
  uploaded artifacts / job summary), risk (status-
  as-truth / comment noise / fork token misuse /
  stale proof / raw log leakage), beta decision
  (every criterion passes). 20 new docs assertions.
  Full suite expected ≥ 1532 passed / 1 skipped.
  **Recommended next slice:** Verification / GitHub
  Trust-Boundary Hardening — return to foundational
  hardening before adding any new review surfaces:
  coherent VerificationResult → VerificationRun
  proof-chain selection; bounded stdout/stderr
  streaming memory; process-tree timeout semantics;
  `NODE_OPTIONS` removal from runner env; bounded
  GitHub API error-body reads (re-confirm); PR
  head-SHA policy. No `schemaVersion` bump. No
  version bump. No npm publish.
- PR comment publisher safety review (P1.1
  pr-comment-publisher-safety-review slice): **step 7g**
  of the CI / GitHub adapter implementation sequence
  pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  Strategy / docs / tests-only batch — **no runtime
  behaviour change.** No new package, no new CLI
  command, no new helper, no workflow-template change,
  no validator profile change, no GitHub API call. New
  strategy memo at
  [`docs/strategy/pr-comment-publisher-safety-review.md`](pr-comment-publisher-safety-review.md)
  walks the full PR comment publishing path end-to-end
  (body helper, readiness helper, dry-run CLI, send
  CLI, API writer, workflow template, validator
  profile, idempotency marker, pagination + update-in-
  place, token + error sanitization, fork + event
  safety, canonical-artifact boundary, test coverage)
  and pins **beta-ready as an opt-in, trusted-context-
  only, update-in-place review surface**. Read-only
  templates remain the alpha default; GitHub Checks
  remain the primary status surface; PR comments are
  a narrative companion surface. Required statements
  pinned by the memo + the docs test: PR comments are
  not canonical truth; Rekon artifacts remain
  canonical; the idempotency marker is not proof;
  forked PRs and `pull_request_target` remain blocked
  by default; no automatic finding resolution or
  reconciliation apply is implied by a successful PR
  comment publish. Three diagnostic tables: component
  status (every shipped surface beta-ready), risk
  (duplicate comments / stale comments / fork token
  misuse / token leakage / comment-as-proof), pinned-
  safety-facts (cross-references every test pinning
  the safety contract). 18 new docs assertions. Full
  suite expected ≥ 1512 passed / 1 skipped.
  **Recommended next slice:** GitHub review surfaces
  parity review — walk the combined GitHub surface
  (Checks, PR comments, workflow templates,
  validators, proof publications, uploaded artifacts)
  and decide whether the GitHub review surface is
  beta-complete or whether Check / PR comment
  refinements remain. No `schemaVersion` bump. No
  version bump. No npm publish.
- PR comment API writer (P1.1 pr-comment-send-cli
  slice): **step 7f** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md)
  and the
  [PR Comment API Writer Go/No-Go Review](pr-comment-api-writer-go-no-go-review.md).
  Adds Rekon's first GitHub PR-comment write
  surface. New `publishPrCommentRun(input)` helper
  in `@rekon/capability-docs` (parallel to
  `publishGitHubCheckRun`) using GitHub's
  issue-comments REST endpoints
  (`GET/POST /repos/{owner}/{repo}/issues/{n}/comments`,
  `PATCH /repos/{owner}/{repo}/issues/comments/{id}`).
  New CLI mode `rekon publish pr-comment --send
  [--root <path>] [--pr-number <n>]
  [--confirm-pr-comment-write]
  [--api-base-url <url>] [--json]` behind the
  readiness gate. Update-in-place via the
  `<!-- rekon:pr-comment:v1 -->` marker (PATCH on
  match; POST on miss; never delete reviewer-
  touched comments). Paginates with a bounded
  20-page cap. Built-in `fetch`; no third-party
  network client. Sanitized error class
  `PrCommentPublishError`
  (`{ status, message, documentationUrl }` only;
  token never echoed). Sentinel-token contract
  test pins no-token-leak. The bundled workflow
  template adds a required `workflow_dispatch`
  input `pr-number` and runs both the dry-run
  preview AND the `--send` step. The
  `github-pr-comment-send` validator profile now
  requires the `--send` step + the
  `--confirm-pr-comment-write` flag; new issue
  codes `missing-publish-pr-comment-send` and
  `missing-confirm-pr-comment-write-flag`; new
  mode value `pr-comment-send`. Required
  statements: PR comments are not canonical truth;
  Rekon artifacts remain canonical; the
  idempotency marker is not proof; forked PRs
  remain denied by default;
  `pull_request_target` remains denied
  unconditionally. 19 new contract tests + 9 new
  docs assertions. Artifact index byte-identical
  before / after `--send`. Exit 0 on API success
  regardless of proof status; exit 1 on readiness
  fail or API error. Out-of-scope (deferred to
  step 7g): bounded retry, same-repo
  `pull_request` guard, hosted publisher,
  PR-review endpoints. No `schemaVersion` bump.
  No version bump. No npm publish.
- PR comment API writer go/no-go review (P1.1
  pr-comment-api-writer-go-no-go-review slice):
  **step 7e** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md)
  and the
  [PR Comment Publisher API Decision Gate](pr-comment-publisher-api-decision-gate.md).
  Strategy / docs / tests-only batch — **no
  runtime behaviour change.** No new package, no
  new CLI command, no new helper, no workflow-
  template change, no validator profile change, no
  GitHub API call. New strategy memo at
  [`docs/strategy/pr-comment-api-writer-go-no-go-review.md`](pr-comment-api-writer-go-no-go-review.md)
  reviews the full pre-API PR comment publishing
  path (dry-run body helper, readiness helper,
  dry-run CLI, workflow template, validator
  profile, idempotency marker, permission model,
  endpoint model, fork / event safety, canonical-
  artifact boundary). **Decision: Go — adopt
  Option B.** Proceed to `rekon publish pr-comment
  --send` using GitHub issue comments
  (`POST/PATCH/GET /repos/{owner}/{repo}/issues/{n}/comments`),
  update-in-place by
  `<!-- rekon:pr-comment:v1 -->`,
  `pull-requests: write` permission (already
  declared by the bundled template), gated by
  `REKON_PR_COMMENTS=1` +
  `REKON_PR_COMMENTS_WRITE_CONFIRMED=1` + trusted
  event context + explicit write confirmation.
  Required statements pinned by the memo + the
  docs test: PR comments are not canonical truth;
  Rekon artifacts remain canonical; the
  idempotency marker is not proof; forked PRs
  remain denied by default; `pull_request_target`
  remains denied unconditionally. Three diagnostic
  tables in the memo: component status (every
  pre-API slice 7a / 7b / 7c / 7d / 7e Shipped;
  7f / 7g flagged next / future); permission
  (GitHub Check `checks: write` vs PR comment
  `pull-requests: write` vs read-only
  `contents: read`); risk (comment spam, stale
  comment, fork token misuse, endpoint permission
  mismatch). 18 new docs assertions pin the
  memo's contract. **Recommended next slice:** PR
  comment API writer (step 7f) — add the
  `publishPrCommentRun` helper, the `rekon
  publish pr-comment --send` CLI mode, workflow
  template update, validator-profile lift,
  contract tests with a fake `node:http` server,
  sentinel-token contract test. Then step 7g
  (PR comment safety review) walks the full
  publishing path end-to-end, parallel to the
  GitHub Check publisher safety review. No
  `schemaVersion` bump. No version bump. No npm
  publish.
- PR comment workflow / validator profile (P1.1
  pr-comment-workflow-validator-profile slice):
  **step 7d** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md)
  and the
  [PR Comment Publisher API Decision Gate](pr-comment-publisher-api-decision-gate.md).
  Workflow template + validator profile + tests +
  docs batch. **No PR comment posted. No GitHub
  API call. No token read.** No active workflow
  added to the Rekon repo. New template at
  [`docs/examples/workflows/rekon-pr-comment-send.yml`](../examples/workflows/rekon-pr-comment-send.yml)
  ships `workflow_dispatch` only; `permissions:
  contents: read + pull-requests: write` only;
  workflow-level env declares
  `REKON_PR_COMMENTS: "1"` and
  `REKON_PR_COMMENTS_WRITE_CONFIRMED: "1"`; runs
  the full execute proof loop + `publish pr-comment
  --dry-run` (no `--send`). New validator profile
  `github-pr-comment-send` permits
  `pull-requests: write` only and rejects every
  other write scope (including `checks: write`),
  the `pull_request_target` + `pull_request`
  triggers, and `publish pr-comment --send`.
  Requires the Rekon opt-in env vars + the
  `publish pr-comment --dry-run` step. New mode
  value `pr-comment-dry-run`. New issue codes:
  `missing-pull-requests-write`,
  `missing-rekon-pr-comments-opt-in`,
  `missing-pr-comments-write-confirmation`,
  `missing-publish-pr-comment-dry-run`,
  `forbidden-publish-pr-comment-send`,
  `missing-pr-comment-marker-reminder`. 14 new
  validator helper tests + 1 CLI test (now 56
  total) + 22 new docs assertions; full suite
  expected ≥ 1448 passed / 1 skipped.
  **Recommended next slice:** PR comment API
  writer go/no-go review (step 7e) — review the
  dry-run helpers + workflow profile + permission
  model + idempotency marker + fork safety, then
  decide whether to ship `rekon publish pr-comment
  --send` or stop at dry-run for beta.
  No `schemaVersion` bump. No version bump. No
  npm publish.
- PR Comment Publisher API Decision Gate (P1.1
  pr-comment-publisher-api-decision-gate slice):
  **step 7c** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md)
  and the PR comment publisher decision memo.
  Strategy / docs / tests-only batch — **no
  runtime behaviour change.** No new package, no
  new CLI command, no new helper, no workflow-
  template modification, no validator profile
  change, no GitHub API call. New strategy memo at
  [`docs/strategy/pr-comment-publisher-api-decision-gate.md`](pr-comment-publisher-api-decision-gate.md)
  reviews the shipped PR comment dry-run components
  (`buildPrCommentBody`,
  `assessPrCommentPublisherReadiness`,
  `rekon publish pr-comment --dry-run`), the
  GitHub permission boundary (`issues: write` /
  `pull-requests: write` required; broader than
  `checks: write`), the fork-default-deny posture,
  the comment-body model, the idempotency + noise
  strategy, and four implementation options.
  **Decision: Option C — add a workflow / validator
  profile gate first; do not implement the API
  writer in the next slice.** Required statements
  pinned: actual PR comment posting remains
  deferred until a PR comment workflow / validator
  profile exists; PR comments are not canonical
  truth; the idempotency marker is not proof;
  forked PRs must not receive secret-bearing
  comment publishing by default. 18 new docs
  assertions in
  `tests/docs/pr-comment-publisher-api-decision-gate.test.mjs`
  pin the memo's contract (including the component
  status table and the risk table). Full suite
  expected ≥ 1410 passed / 1 skipped.
  **Recommended next slice (if Option C approved):**
  PR comment workflow / validator profile (step
  7d). **Shipped next; see the entry above.**
  No `schemaVersion` bump. No version bump. No
  npm publish.
- PR comment body dry-run helper + CLI (P1.1
  pr-comment-dry-run-cli slice): **step 7b** of the
  CI / GitHub adapter implementation sequence pinned
  by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md)
  and the PR comment publisher decision memo. Helper
  + CLI + tests + docs batch. **No GitHub API call.
  No `GITHUB_TOKEN` read. No network-client import.
  No workflow-template modification.** New
  `@rekon/capability-docs` exports
  `buildPrCommentBody(input)` and
  `assessPrCommentPublisherReadiness(input)` (both
  pure functions), plus the constants
  `PR_COMMENT_PUBLISHER_MARKER` and
  `PR_COMMENT_PUBLISHER_CANONICAL_TRUTH_REMINDER`.
  Every rendered body carries the marker
  `<!-- rekon:pr-comment:v1 -->` + the canonical-truth
  reminder + a citation table for every supplied ref;
  bodies exclude raw stdout / stderr, full artifact
  bodies, secrets, tokens, and arbitrary user-supplied
  fields. New CLI command `rekon publish pr-comment
  --dry-run [--root <path>] [--json]` (mutually
  exclusive with `--send` / `--publish` / `--execute`;
  refuses missing `--dry-run`) reads local artifacts,
  runs `artifacts validate` read-only, calls the
  helpers, and prints `{ kind:
  "rekon.pr-comment.dry-run", dryRun: true,
  wouldPublish: false, readiness, comment, citedRefs,
  canonicalTruthReminder }` as JSON. 18 contract
  tests + 9 docs assertions; full suite expected ≥
  1392 passed / 1 skipped.
  **Recommended next slice:** PR comment publisher
  API implementation decision gate. **Shipped next;
  see the entry above.** Decision: Option C — add a
  workflow / validator profile gate first; defer the
  API writer until the boundary is pinned.
  No `schemaVersion` bump. No version bump. No npm
  publish.
- PR Comment Publisher Decision Memo (P1.1
  pr-comment-publisher-decision slice): **step 7a** of
  the CI / GitHub adapter implementation sequence
  pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  Strategy / docs / tests-only batch — **no runtime
  behaviour change.** No new package, no new CLI
  command, no new helper, no workflow-template
  modification, no GitHub API call. New strategy memo
  at
  [`docs/strategy/pr-comment-publisher-decision.md`](pr-comment-publisher-decision.md)
  decides whether Rekon adds a PR comment surface
  after GitHub Checks or whether Check Runs +
  artifacts are sufficient for beta. Reviews all four
  options: A (no PR comments for beta), B (PR comment
  dry-run / preview only), C (opt-in idempotent PR
  comment publisher), D (hosted / GitHub App
  publisher). **Decision: Option B — design a PR
  comment dry-run renderer; defer actual PR comment
  posting.** Pins the GitHub permission context
  (creating / updating PR timeline comments requires
  `issues: write` or `pull-requests: write`; forked
  PRs do not receive write tokens by default), the
  comment content model (artifact refs + status +
  `artifacts validate` outcome + stale warnings +
  canonical-truth phrase + link to uploaded artifacts;
  no raw logs / secrets / full stdout/stderr), the
  idempotency strategy (update-in-place via the
  `<!-- rekon:pr-comment:v1 -->` marker; the marker
  is not proof), the fork-safety contract (three-
  layer defence + GitHub's own default-deny on
  forked-PR write tokens), and the implementation
  sequence (decision → dry-run renderer + CLI →
  validator / docs → API write). 18 new docs
  assertions in
  `tests/docs/pr-comment-publisher-decision.test.mjs`
  pin the memo's contract. Full suite expected ≥
  1365 passed / 1 skipped.
  **Recommended next slice (if Option B is
  approved):** PR comment body dry-run helper +
  `rekon publish pr-comment --dry-run --json` CLI.
  **Shipped next; see the entry above.** Mirrors
  the step-6a / 6b shape. No GitHub API call. No
  token reads.
  No `schemaVersion` bump. No version bump. No npm
  publish.
- GitHub Check publisher send workflow safety review
  (P1.1
  github-check-publisher-send-workflow-safety-review
  slice): **step 6e** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  Strategy / docs / tests-only batch — **no runtime
  behaviour change.** No new package, no new CLI
  command, no new helper, no workflow-template
  modification. New strategy memo at
  [`docs/strategy/github-check-publisher-send-workflow-safety-review.md`](github-check-publisher-send-workflow-safety-review.md)
  reviews the full GitHub Check publishing path:
  payload helper, readiness helper, dry-run CLI, send
  CLI, read-only execute + dry-run workflow templates,
  opt-in checks-write workflow template, validator
  profiles (read-only + github-check-send), token /
  permission behaviour, fork / event safety,
  canonical-artifact boundary, test coverage, and
  remaining risks. **Decision: beta-ready as an
  opt-in surface; read-only templates remain alpha
  default; PR comments remain deferred until the PR
  Comment Publisher Decision Memo (next slice).**
  Reinforces the canonical-truth invariant ("GitHub
  status is not canonical truth; Rekon artifacts
  remain canonical"), the three-layer fork-safety
  contract (template, validator, runtime readiness),
  and the no-auto-resolution invariant (a successful
  GitHub Check implies no finding resolution or
  reconciliation apply). 16 new docs assertions in
  `tests/docs/github-check-publisher-send-workflow-safety-review.test.mjs`
  pin the memo's contract. Full suite expected ≥
  1347 passed / 1 skipped.
  **Recommended next slice:** PR Comment Publisher
  Decision Memo. **Shipped next; see the entry
  above.** Decision: Option B — design a PR comment
  dry-run renderer; defer actual PR comment posting.
  No `schemaVersion` bump. No version bump. No npm
  publish.
- Verification runner GitHub Check publisher opt-in
  workflow template (P1.1
  github-check-publisher-opt-in-workflow-template
  slice): **step 6d** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md)
  and the
  [GitHub Check publisher decision memo](verification-runner-github-check-publisher-decision.md).
  Workflow template + validator profile + tests + docs
  batch. No active workflow added to the Rekon repo. No
  change to the `publishGitHubCheckRun` helper or the
  `rekon publish github-check --dry-run|--send` CLI
  behaviour. New template at
  [`docs/examples/workflows/rekon-verification-check-send.yml`](../examples/workflows/rekon-verification-check-send.yml)
  is the first Rekon workflow template to request
  `checks: write`; triggers on `workflow_dispatch` +
  `push` to `main` only (no `pull_request` by default;
  no `pull_request_target` ever); declares
  `REKON_GITHUB_CHECKS: "1"` and
  `REKON_GITHUB_CHECKS_WRITE_CONFIRMED: "1"` at the
  workflow level; runs `publish github-check --dry-run`
  before `publish github-check --send
  --confirm-checks-write`. New validator flag
  `--profile read-only | github-check-send` defaults
  to `read-only` (backward compatible). The
  `github-check-send` profile permits `checks: write`,
  requires the Rekon opt-in env + both publish
  commands + the `--confirm-checks-write` flag, and
  rejects every other write scope + the
  `pull_request` trigger. New issue codes (additive)
  cover every gate. 16 new validator helper tests + 3
  CLI tests + 21 docs assertions; full suite expected
  ≥ 1330 passed / 1 skipped. Operator guide gains a new
  "Optional: publish a GitHub Check" section
  instructing operators to adopt the read-only / dry-run
  templates first.
  **Recommended next slice:** GitHub Check publisher
  send workflow safety review — a strategy review over
  the completed Check path. **Shipped next; see the
  entry above.** Decision: beta-ready as an opt-in
  surface; read-only templates remain alpha default;
  PR comments remain deferred. Then **PR Comment
  Publisher Decision Memo** as the next slice.
  No `schemaVersion` bump. No version bump. No npm
  publish.
- Verification runner GitHub Check publisher send mode
  (P1.1 github-check-publisher-send slice): **step 6c** of
  the CI / GitHub adapter implementation sequence pinned
  by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md)
  and the API implementation pin in
  [`docs/strategy/verification-runner-github-check-publisher-decision.md`](verification-runner-github-check-publisher-decision.md).
  CLI + helper + tests + docs batch. **First
  GitHub-write surface in Rekon.** Default-deny gated.
  No active workflow in the Rekon repo. No GitHub write
  permissions added to any bundled template. No
  artifact-shape change. New helper
  `publishGitHubCheckRun(input)` in
  `@rekon/capability-docs` POSTs to
  `/repos/{owner}/{repo}/check-runs` via Node's
  built-in `fetch` (no third-party network client).
  Sets `Connection: close` so CLI invocations exit
  promptly; maps camelCase payload to snake_case body
  (`headSha`→`head_sha`, `externalId`→`external_id`);
  returns `{ id, url, htmlUrl, status, conclusion }`;
  throws `GitHubCheckPublishError` on non-2xx with
  `status`/`message`/`documentationUrl` — **never**
  echoes the token. New CLI mode `rekon publish
  github-check --send [--root <path>]
  [--confirm-checks-write] [--api-base-url <url>]
  [--json]`. Mutually exclusive with `--dry-run`;
  passing both or neither is exit 1. The **only** CLI
  branch that reads `process.env.GITHUB_TOKEN`. Refuses
  unless readiness passes: `REKON_GITHUB_CHECKS=1`,
  `GITHUB_TOKEN`, `GITHUB_REPOSITORY`, head SHA,
  trusted event (`workflow_dispatch`/`push`/same-repo
  `pull_request` only; forked `pull_request` denied by
  default; `pull_request_target` denied unconditionally),
  and explicit write-permission confirmation
  (`--confirm-checks-write` flag OR
  `REKON_GITHUB_CHECKS_WRITE_CONFIRMED=1` env). Exit 0
  on API success even when the Check conclusion is
  `failure` / `timed_out` / `action_required`; exit 1
  on readiness failure or API error with sanitized
  `{ status, message, documentationUrl? }` — token
  never appears in stdout/stderr. Existing step-6b
  source-scan tests reshaped into behavioural tests
  proving the dry-run branch reads no token and makes
  no network call. **19 contract tests** (use a local
  `node:http` fake server + `--api-base-url`; async
  `spawn` so the fake server's event loop keeps
  ticking) + **10 docs assertions**. Full suite
  expected ≥ 1294 passed / 1 skipped.
  **Recommended next slice:** opt-in workflow template
  variant under `docs/examples/workflows/` that
  documents the safe wiring for `--send`. **Shipped
  next; see the entry above.** Then a strategy review
  over the completed Check path, then **step 7** (PR
  comment publisher, beta+). No `schemaVersion` bump.
  No version bump. No npm publish.
- Verification runner GitHub Check publisher dry-run
  CLI (P1.1 github-check-publisher-dry-run-cli slice):
  **step 6b** of the CI / GitHub adapter implementation
  sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  CLI + tests + docs batch. No GitHub API calls. No
  active workflow in `.github/workflows`. No new GitHub
  write permissions in any bundled template. No
  artifact-shape change. No new capability package.
  Adds `rekon publish github-check --dry-run [--root
  <path>] [--json]` in `@rekon/cli`, registered
  alongside the existing `publish architecture` /
  `publish proof` / `publish agent-contract` commands.
  The CLI reads the latest local `VerificationResult`,
  `VerificationRun`, `VerificationPlan`, and the latest
  `Publication` of each kind (`proof-report`,
  `architecture-summary`, `agent-contract`); runs
  `artifacts validate` (read-only); calls the shared
  helpers `buildGitHubCheckPayload` +
  `assessGitHubCheckPublisherReadiness` from
  `@rekon/capability-docs`; and prints
  `{ kind: "rekon.github-check.dry-run", dryRun: true,
  payload, readiness, canonicalTruthReminder }` as
  JSON. **`--dry-run` is required.** The CLI **does
  not read `GITHUB_TOKEN` or `GH_TOKEN`** from
  `process.env` (the readiness assessor receives an
  explicitly empty env map); the CLI **imports no
  network client** (a contract test scans the CLI
  source for `@octokit/*`, `@actions/github`,
  `octokit`, `node-fetch`, `axios`, `undici`, `got`,
  `fetch(`, `https.request`, `http.request`, and
  `new Request(` and fails the build if any are
  present); the CLI **does not duplicate conclusion
  mapping** (a contract test scans for
  `pickConclusion` and counts the conclusion string
  literals to confirm the precedence ladder lives only
  in `buildGitHubCheckPayload`). Readiness `ready:
  false` is exit 0 (not a CLI failure); missing /
  malformed local artifacts is exit 1. **9 contract
  tests** pin every guardrail and the JSON shape.
  Full suite expected ≥ 1265 passed / 1 skipped.
  **Recommended next slice:** verification runner
  GitHub Check publisher API write (step 6c) — the
  actual GitHub Checks API call. **Shipped next; see
  the entry above.** Adds the first network-client
  dependency in Rekon; ships with its own contract
  tests using a local node:http fake server and a
  default-deny readiness gate.
  No `schemaVersion` bump. No version bump. No npm
  publish.
- Verification runner GitHub Check publisher —
  decision + gated skeleton (P1.1
  github-check-publisher-decision slice):
  **step 6a** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  Decision memo + skeleton + tests + docs batch.
  No GitHub API calls. No active workflow in
  `.github/workflows`. No new GitHub write
  permissions in any bundled template. No
  artifact-shape change. No new capability
  package. New decision memo at
  [`docs/strategy/verification-runner-github-check-publisher-decision.md`](verification-runner-github-check-publisher-decision.md)
  recommends **Option B** (split shipment:
  decision + skeleton now, dry-run CLI next, API
  call later). Adds two pure helpers to
  `@rekon/capability-docs`:
  `buildGitHubCheckPayload(input)` builds the
  Check payload (name, conclusion,
  output.title / summary, externalId,
  citedRefs) from artifact-like inputs;
  `assessGitHubCheckPublisherReadiness(input)`
  returns `{ ready, issues[] }` after evaluating
  opt-in env vars (`REKON_GITHUB_CHECKS`,
  `GITHUB_TOKEN`, `GITHUB_REPOSITORY`, head
  SHA), event trust (`workflow_dispatch`,
  `push`, same-repo `pull_request` trusted;
  forked `pull_request` untrusted by default;
  `pull_request_target` refused
  unconditionally), and an explicit
  `writePermissionConfirmed` flag. **The
  skeleton calls no GitHub API and imports no
  network client** — a contract test scans the
  capability-docs source for forbidden tokens
  (`@octokit/`, `octokit`, `node-fetch`, `got`,
  `axios`, `undici`, `https.request`,
  `http.request`, `fetch(`, `new Request(`)
  and fails the build if any are present. The
  payload always cites the underlying
  `VerificationResult` / `VerificationRun` /
  proof-report / architecture-summary /
  agent-contract ids and always includes the
  phrase `GitHub status is not canonical truth;
  Rekon artifacts remain canonical.`
  Conclusion mapping precedence:
  `artifactsValid === false` →
  `failure`; run killed → `failure`; run
  timeout → `timed_out`; result failed →
  `failure`; result partial → `action_required`;
  result missing → `action_required`; stale /
  missing-plan freshness → `action_required`;
  result not-run → `neutral`; result passed +
  fresh → `success`. **25 contract tests** pin
  every conclusion case, summary content
  (canonical-truth reminder + cited refs +
  artifacts-valid status), every readiness
  issue code (`not-enabled`, `missing-token`,
  `missing-repository`, `missing-sha`,
  `untrusted-event`,
  `write-permission-not-confirmed`), and the
  read-only / network-free invariant. **13
  docs assertions** pin the decision memo's
  required headings, gate language, env var
  names, conclusion-mapping mention, CHANGELOG
  mention, and review-packet `PURPOSE
  PRESERVATION CHECK`. Full suite expected ≥
  1256 passed / 1 skipped.
  **Recommended next slice:** verification
  runner GitHub Check publisher dry-run CLI
  (step 6b) — `rekon publish github-check
  --dry-run --json` reads local artifacts +
  prints the payload + readiness report.
  **Shipped next; see the entry above.** Still
  no API call. Step 6c (the actual GitHub API
  write) follows behind the readiness gate
  with its own decision memo + review packet.
  No `schemaVersion` bump. No version bump.
  No npm publish.
- Verification runner GitHub workflow validation
  helper (P1.1 github-workflow-safety-validator
  slice): **step 5** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  CLI + docs + tests batch — no active workflow in
  `.github/workflows`, no GitHub API writes, no
  artifact-shape change, no new capability
  package. Adds the read-only command
  `rekon verify github-workflow validate --path
  <workflow.yml> [--json]` whose helper
  `validateGitHubWorkflowSafety` is co-located in
  `packages/cli/src/index.ts`. The validator is
  **pure static text analysis** — no YAML parser
  dependency, no GitHub API calls, no spawn /
  exec, no filesystem writes. A quote-aware
  comment-stripping helper preserves `#`-prefixed
  strings inside `'`, `"`, and `` ` `` quotes so
  workflow templates that echo
  `# Rekon Verification Summary` headings into
  `$GITHUB_STEP_SUMMARY` validate cleanly.
  **Errors:** no `pull_request_target`; no GitHub
  write permissions (`pull-requests`, `checks`,
  `contents`, `id-token`, `actions`,
  `deployments`, `statuses`, `packages` set to
  `write`); `permissions: contents: read`
  declared; no GitHub API calls (`gh api`,
  `curl api.github.com`,
  `actions/github-script`); uses
  `rekon artifacts latest`; uploads
  `.rekon/artifacts/**`; excludes `.log`; appends
  to `$GITHUB_STEP_SUMMARY`; mode resolvable to
  `execute` or `dry-run` (`unknown` is an error).
  **Warnings only:** canonical-truth reminder
  presence, `retention-days` declared. Both
  bundled templates
  ([`docs/examples/workflows/rekon-verification.yml`](../examples/workflows/rekon-verification.yml),
  [`docs/examples/workflows/rekon-verification-dry-run.yml`](../examples/workflows/rekon-verification-dry-run.yml))
  gain a top-of-file comment instructing
  operators to run the validator after copying;
  both pass with zero errors / zero warnings.
  Operator guide
  [`docs/examples/github-actions-verification-runner.md`](../examples/github-actions-verification-runner.md)
  gains a new "Validate a copied workflow"
  section before Adoption. **25 contract tests**
  pin the helper (both templates, every error
  code, the warning behaviour, the read-only
  invariant, CLI exit codes and JSON shape). The
  hardening-v2 docs test gains **3 new
  assertions** (operator guide mentions the
  command, both templates carry the
  validate-command comment, CHANGELOG mentions
  the helper). Full suite: 1218 passed / 1
  skipped. **Recommended next slice:** the
  beta-tier verification runner GitHub Check
  publisher (step 6 of the CI / GitHub adapter
  implementation sequence; requires
  `checks: write` and per-installation setup, so
  sits behind a config flag with Rekon artifacts
  remaining canonical truth). **Shipped next as
  step 6a (decision + gated skeleton); see the
  entry above.** No artifact-shape change. No
  new capability. No `schemaVersion`
  bump. No version bump. No npm publish.
- Verification runner GitHub Actions workflow
  hardening v2 (P1.1
  verification-runner-github-actions-hardening-v2
  slice): **step 4** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  Docs / examples / docs-test batch — no code
  changes, no active workflow in
  `.github/workflows`, no GitHub API writes. Adds
  a copyable **dry-run workflow template** at
  [`docs/examples/workflows/rekon-verification-dry-run.yml`](../examples/workflows/rekon-verification-dry-run.yml)
  that runs `rekon verify run --dry-run` (spawns
  zero plan commands) and intentionally omits
  `verify result from-run` because a dry-run is
  not proof. Same safety contract as the execute
  variant: `permissions: contents: read`, no
  secrets, no `pull_request_target`, no GitHub
  API writes, `actions/upload-artifact` of
  `.rekon/artifacts/**` excluding `.log`,
  `retention-days: 7`. Execute workflow at
  [`docs/examples/workflows/rekon-verification.yml`](../examples/workflows/rekon-verification.yml)
  hardened with extended `rekon artifacts
  latest` lookups for `VerificationResult`,
  `Publication --kind architecture-summary`, and
  `Publication --kind agent-contract`; both job
  summaries now include a `Mode: execute|dry-run`
  line, an `Artifacts valid: true|false` line,
  and refs for every refresh-loop publication.
  Operator guide
  [`docs/examples/github-actions-verification-runner.md`](../examples/github-actions-verification-runner.md)
  gains a new **Adoption — copy the dry-run
  template first** section near the top and an
  expanded Troubleshooting section with **10
  items** (cause / safe next / do-not triples).
  **23 docs-only assertions** pin both workflow
  YAMLs' safety contracts, the
  `--dry-run` / `--execute` split, both
  workflows' adoption of the latest-artifact
  helper, the upload + retention + summary
  surface, the adoption-first language, the
  three anchor statements (canonical truth,
  artifacts canonical, fork secrets), three
  troubleshooting items, CHANGELOG mention, and
  the review-packet `PURPOSE PRESERVATION
  CHECK`. Full suite: 1189 passed / 1 skipped.
  **Recommended next slice:** verification runner
  GitHub workflow validation helper (read-only
  command that validates copied workflow
  templates against the required safety
  contract). **Shipped next; see the entry
  above.** Still no GitHub API writes. No
  artifact-shape change. No new capability. No
  `schemaVersion` bump. No version bump. No npm
  publish.
- Verification runner latest-artifact CLI helper
  (P1.1 artifacts-latest-cli-helper slice):
  **step 3** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  Adds a read-only CLI helper that walks the
  local artifact index and updates the GitHub
  Actions workflow template to use it. New
  CLI command
  `rekon artifacts latest --type
  <ArtifactType> [--kind <kind>] [--id-only]
  [--allow-missing] [--root <path>] [--json]`.
  `--id-only` emits a typed `<type>:<id>` ref;
  `--allow-missing` returns
  `artifact: null` with exit 0;
  `--kind` is Publication-only and walks
  entries newest-first reading `body.kind`.
  Workflow template at
  [`docs/examples/workflows/rekon-verification.yml`](../examples/workflows/rekon-verification.yml)
  now uses helper calls instead of inline
  `node - <<'NODE'` snippets for resolving
  the latest `VerificationPlan`,
  `VerificationRun`, and proof-report
  `Publication`. **12 contract tests** pin the
  helper (latest-by-type, missing → exit 1,
  `--allow-missing` exit 0, `--id-only` typed
  ref, Publication `--kind` filter,
  non-Publication `--kind` rejection,
  body-kind reading, older-artifact ignored,
  read-only invariant, `artifacts validate`
  clean, missing `--type`, `--id-only`
  missing case). **9 docs-only assertions**
  pin the workflow template's adoption. Full
  suite: 1166 passed / 1 skipped.
  **Recommended next slice:** verification
  runner GitHub Actions workflow hardening
  v2 (optional dry-run variant,
  troubleshooting, proof-summary improvements
  using the helper). Still no GitHub API
  writes. No artifact-shape change. No new
  capability. No `schemaVersion` bump. No
  version bump. No npm publish.
- Verification runner GitHub Actions workflow
  template (P1.1
  verification-runner-github-actions-template
  slice): **step 2** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
  Docs-only batch — no code changes, no active
  workflow in `.github/workflows`. Ships a
  copyable workflow YAML at
  [`docs/examples/workflows/rekon-verification.yml`](../examples/workflows/rekon-verification.yml)
  plus a 10-section operator guide at
  [`docs/examples/github-actions-verification-runner.md`](../examples/github-actions-verification-runner.md).
  Template contract: `permissions: contents:
  read` only (no `pull-requests: write`,
  `checks: write`, `contents: write`, or
  `id-token`); triggers `pull_request` +
  `workflow_dispatch` (no
  `pull_request_target`); no secrets declared;
  no GitHub API writes. Steps: checkout →
  setup-node@v4 → `npm ci` → `npm run build` →
  `rekon refresh` → resolve latest
  `VerificationPlan` id via inline Node helper
  → `rekon verify run --execute` → resolve
  `VerificationRun` id → `rekon verify result
  from-run` → `rekon publish proof` /
  `publish architecture` / `publish
  agent-contract` → `rekon artifacts validate`
  → append `# Rekon Verification Summary` plus
  the proof-report markdown to
  `$GITHUB_STEP_SUMMARY` → upload
  `.rekon/artifacts/**` (excluding
  `.rekon/artifacts/**/*.log`) as
  `rekon-artifacts` with `retention-days: 7`.
  **23 docs-only assertions** pin both files'
  existence, the permission contract, the
  `pull_request_target` prohibition, every CLI
  step, the upload-path + `.log`-exclusion +
  `retention-days: 7`, the four anchor
  statements (`GitHub status is not canonical
  truth`; `Rekon artifacts remain canonical`;
  `Forked PRs must not receive secret-bearing
  execution by default`; `Passing verification
  does not automatically resolve findings`),
  CHANGELOG mention, and review-packet
  `PURPOSE PRESERVATION CHECK`. Full suite:
  1145 passed / 1 skipped. **Recommended next
  slice:** **verification runner
  latest-artifact CLI helpers**
  (`rekon artifacts latest --type <type>
  --json`). Read-only helpers replace the
  workflow template's inline Node snippets
  with one-line CLI calls. No code changes
  beyond CLI additions; no execution change.
  No artifact-shape change. No new
  capability. No `schemaVersion` bump. No
  version bump. No npm publish.
- Verification runner CI / GitHub adapter decision
  memo (P1.1
  verification-runner-ci-github-decision slice):
  **step 8** of the runner v1 implementation
  sequence pinned by
  [`docs/strategy/verification-runner-v1-decision.md`](verification-runner-v1-decision.md).
  Strategy-only batch — no runtime change. The
  memo
  ([`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md))
  decides whether Rekon's verification runner
  should remain local-only for alpha or gain a
  GitHub Actions / PR-check surface, and pins the
  safety contract any future CI surface must
  respect. **Decision: Option D — local-first
  runner plus a documented GitHub Actions workflow
  template for alpha; first-party GitHub Check / PR
  comment publisher deferred to beta.** Anchor
  invariants: GitHub status is not canonical truth
  (Rekon artifacts remain canonical); forked PRs
  must not receive secret-bearing execution by
  default. Alpha workflow template contract:
  `permissions: contents: read`, no secrets, no
  `pull_request_target`, no `checks: write`, no
  `pull-requests: write`. Uses GitHub's built-in
  `$GITHUB_STEP_SUMMARY` (no API writes) for
  human-readable proof output and
  `actions/upload-artifact` for the canonical
  `.rekon/artifacts` directory (`.log` files
  excluded; `retention-days: 7` default).
  Implementation sequence: decision memo (this
  slice) → workflow template → optional CLI
  ergonomics (`rekon artifacts latest`) → optional
  job-summary publisher → beta: GitHub Check
  publisher → beta+: PR comment publisher → beta+:
  cross-CI docs. **16 docs-only assertions** in
  `tests/docs/verification-runner-ci-github-decision.test.mjs`
  pin the memo's required headings,
  recommendation, anchor invariants, workflow
  contract, and implementation sequence. **9 docs
  updated.** New review packet. No artifact-shape
  change. No new capability. No new CLI command.
  No `schemaVersion` bump. No version bump. No
  npm publish. **Recommended next slice:**
  **verification runner GitHub Actions workflow
  template** (alpha implementation, docs-only).
- Verification proof surfaces v2 (P1.1
  verification-proof-surfaces-v2 slice): **step 7**
  of the runner v1 implementation sequence pinned by
  [`docs/strategy/verification-runner-v1-decision.md`](verification-runner-v1-decision.md).
  Publication-only batch — no command execution, no
  artifact-shape changes. Makes proof state legible
  across the proof report, architecture summary,
  agent contract, and `resolve.issue` verification
  trace. New helper
  `summarizeVerificationProofSurface` in
  `@rekon/capability-intent` classifies a
  `VerificationResult` as `manual` /
  `runner-derived` / `unknown` (via
  `VerificationRun` inputRef or known runner
  identity in `recordedBy`), computes freshness
  (`fresh` / `stale` / `missing-plan` / `unknown`)
  against the latest `VerificationPlan`, and emits
  machine-readable warnings (`proof-failed`,
  `proof-partial`, `proof-not-run`, `proof-stale`,
  `proof-missing-plan`, `proof-source-unknown`,
  `runner-run-missing`). The proof report adds a
  `## Verification Proof Summary` section with
  classifier output + recommended commands; the
  per-command **Verification Results** table adds
  stdout / stderr **digest prefixes** (first 12
  hex chars) — **raw excerpts are never
  rendered**. The architecture summary adds a
  compact `## Verification Proof Status` block.
  The agent contract surfaces `Proof source` /
  `Proof freshness` and adds two Do Not Do entries
  against treating passed / stale / failed proof
  as completion. `VerificationEvidenceSummary`
  gains optional `source`, `freshness`, and
  `verificationRunRef` fields; the resolver trace
  message mentions source + freshness. **22 new
  tests** pin every surface (helper
  classification + warnings, proof-report
  rendering + no-stdout-leak + failed/stale
  callouts, architecture summary block, agent
  contract source/freshness/instructions + Do Not
  Do, no-mutation of `FindingStatusLedger`,
  existing `verify record` / `--dry-run` /
  `--execute` paths unchanged, `artifacts
  validate` clean). Full suite: 1106 passed / 1
  skipped. **Recommended next slice:**
  verification runner CI / GitHub adapter
  decision memo (step 8). Strategy-only batch.
  No `schemaVersion` bump. No CI / GitHub
  integration in this slice. No auto-resolution.
  No auto-apply. No source writes. No version
  bump. No npm publish.
- VerificationRun → VerificationResult derivation
  (P1.1 verification-result-from-run slice): **step
  6** of the runner v1 implementation sequence
  pinned by
  [`docs/strategy/verification-runner-v1-decision.md`](verification-runner-v1-decision.md).
  Adds a safe derivation path so completed
  `VerificationRun` artifacts can feed the existing
  `VerificationResult` proof-summary surface
  consumed by the proof report, architecture
  summary, and resolvers. The new CLI command
  `rekon verify result from-run --run <id|type:id>
  [--allow-not-run] [--root <path>] [--json]`
  reads the source run, refuses dry-run / not-run
  runs by default, and writes a
  `VerificationResult` artifact citing the run +
  plan + work-order in `header.inputRefs`. The new
  helper `deriveVerificationResultFromRun` in
  `@rekon/capability-verify` is pure — no spawn, no
  rerun. Command-status mapping: `passed →
  passed`; `failed → failed`; **`timeout →
  failed`**; **`killed → failed`**;
  `skipped → skipped`; `not-run → not-run`.
  `recordedBy` is `"<runner.id>@<runner.version>"`
  (e.g. `"rekon.local.exec@0.1.0"`). The result
  body carries per-command `stdoutDigest` /
  `stderrDigest` / `exitCode` /
  `durationMs` / `startedAt` / `completedAt` but
  **does NOT copy `stdoutExcerpt` /
  `stderrExcerpt`** — the result stays concise;
  the run remains the place to inspect bounded log
  evidence. **24 new tests** pin the contract
  (helper status mapping + refusal + allowNotRun;
  CLI passed / failed paths + refusal of dry-run +
  refusal without `--run` + plan + run citations +
  body-never-leaks-stdout + digest preservation +
  no `FindingStatusLedger` /
  `FindingLifecycleReport` /
  `ReconciliationPlan` mutation + proof report
  consumes derived result + existing
  `verify record` / `--dry-run` / `--execute`
  paths unchanged + `artifacts validate` clean).
  Full suite: 1084 passed / 1 skipped.
  **Recommended next slice:** verification proof
  surfaces v2 — make publications distinguish
  manual vs. runner-derived results, call out
  failed / timeout / killed proof, and flag stale
  proof. Still no auto-resolution or auto-apply.
  No `schemaVersion` bump. No version bump. No npm
  publish.
- Verification runner execution v1 (P1.1
  verification-run-execution-v1 slice): **step 4** of
  the runner v1 implementation sequence pinned by
  [`docs/strategy/verification-runner-v1-decision.md`](verification-runner-v1-decision.md).
  **First slice that actually spawns processes.** The
  command
  `rekon verify run --plan <id|type:id> --execute
  [--command-timeout-ms <n>] [--timeout-ms <n>]
  [--max-log-bytes <n>] [--root <path>] [--json]`
  runs the named plan locally and writes a
  `VerificationRun` artifact with recorded execution
  detail.
  - **Safety:** `spawn(argv[0], argv.slice(1))` with
    `shell: false`; scrubbed env (allowlist + secret-
    name guard; `PATH` survives, secret-named vars
    are dropped); per-command timeout (default
    120 s) with `SIGTERM` → 3 s grace → `SIGKILL`;
    per-plan timeout (default 600 s) marks unspawned
    commands `not-run`.
  - **Capture:** sha256 of full pre-redaction
    streams; redacted-then-truncated excerpts
    (default 8 KB / stream); pattern ids and match
    counts on the artifact.
  - **Status priority:**
    `failed > killed > timeout > partial > passed >
    not-run`. Commands continue past failures.
  - **CLI exits non-zero** on `failed` / `timeout` /
    `killed` overall; artifact still written.
  - **NOT done:** no `VerificationResult` derivation
    (next slice); no `FindingStatusLedger` /
    `FindingLifecycleReport` mutation; no
    reconciliation auto-apply; no source writes by
    the runner; no retries; no sandboxing; no CI /
    GitHub integration.
  - New helper exports in `@rekon/capability-verify`:
    `executeVerificationRun`,
    `redactVerificationRunStreamText`,
    `buildScrubbedEnvironment`,
    `VERIFICATION_RUN_DEFAULT_*` constants,
    `VERIFICATION_RUN_ENV_ALLOWLIST`,
    `VERIFICATION_RUN_SECRET_KEY_PATTERN`,
    `VERIFICATION_RUN_EXECUTION_RUNNER_ID`.
  - **25 new tests** pin every safety constraint
    (passed / failed / timeout / plan-timeout /
    refusal-before-spawn / redaction / scrubbed
    env / sentinel-no-shell-leak /
    legitimate-node-can-write / dry-run still
    silent after execute ships /
    verify-record-unchanged /
    findings-status-unmutated /
    no-VerificationResult-written /
    artifacts-validate-clean). Full suite: 1060
    passed / 1 skipped. **Recommended next slice:**
    **VerificationRun → VerificationResult
    derivation** (step 6). Add either a
    `--record-result` flag on
    `rekon verify run --execute` or a dedicated
    `rekon verify result from-run --run <id>`
    command. Map `timeout` / `killed` to `failed`
    in the derived result; cite the run + plan +
    work-order in `header.inputRefs`. No
    `schemaVersion` bump. No version bump. No npm
    publish.
- Verification runner dry-run command (P1.1
  verification-run-dry-run slice): **step 3** of the
  runner v1 implementation sequence pinned by
  [`docs/strategy/verification-runner-v1-decision.md`](verification-runner-v1-decision.md).
  Adds the first CLI surface for the future
  verification runner without executing any commands.
  The command
  `rekon verify run --plan <id|type:id>
  --dry-run|--preview [--root <path>] [--json]`
  resolves the named plan, validates each command
  against the safety contract, and writes a
  planned-but-not-run `VerificationRun` artifact
  (`status: "not-run"`, every command
  `status: "not-run"`, runner id
  `"rekon.local.dry-run"`) when every command
  validates. New helper
  `createVerificationRunDryRun` in
  `@rekon/capability-verify` tokenizes each plan
  command into argv and validates it; rejected
  patterns include shell-control operators
  (`;` `&&` `||` `|` `<` `>` `<<` `>>` `&`),
  command substitution (`$(…)` `` `…` ``),
  env-assignment prefixes (`NAME=value cmd`),
  newlines, and empty commands. **23 new tests**
  pin the contract (helper parsing + rejection +
  safety summary, CLI dry-run + preview + refusals,
  human-readable output, a sentinel-file assertion
  that proves no process is spawned, and
  `artifacts validate` remains clean). The CLI
  refuses `--execute` with a not-implemented
  message; `rekon verify record` behavior is
  unchanged. Full suite: 1036 passed / 1 skipped.
  **Recommended next slice:** **verification
  runner execution v1** —
  `rekon verify run --plan <id> --execute`.
  Step 4 of the runner v1 sequence. The first
  slice that actually spawns processes; gated by
  the full safety contract (`shell: false`,
  per-command + per-plan timeouts, process-tree
  kill, bounded redacted logs, stdout / stderr
  digests, no retries, no auto-resolution, no
  source writes). No `schemaVersion` bump. No
  `VerificationResult` derivation. No process
  spawn in this slice. No stdout / stderr capture.
  No log redaction implementation (patterns
  declared only). No `rekon verify record`
  behavior change. No graph-aware filter change.
  No source-file reads. No CI / GitHub
  integration. No version bump. No npm publish.
- VerificationRun artifact + `@rekon/capability-verify`
  skeleton (P1.1
  verification-run-artifact-capability-skeleton slice):
  steps 1–2 of the runner v1 implementation sequence
  pinned by
  [`docs/strategy/verification-runner-v1-decision.md`](verification-runner-v1-decision.md).
  Adds the new sibling **`VerificationRun`** artifact
  type to `@rekon/capability-intent` (next to
  `VerificationResult`), the new
  **`@rekon/capability-verify`** package with manifest
  declaring the new `"runner"` role + new
  `execute:verification` permission, and the SDK
  conformance updates that accept the new role,
  permission, and artifact type. **No command
  execution in this batch.** The capability's runner
  handler is a throw-stub that raises
  `"@rekon/capability-verify: command execution is not
  implemented yet"` when invoked; importing the
  capability does not enable execution. The runtime
  routes the new artifact type to the `actions`
  category; `VerificationResult` and `VerificationPlan`
  shapes are unchanged. **30 new tests** (9
  `verification-run-artifact.test.mjs` +
  12 `verify-capability-skeleton.test.mjs` + 9
  package-local) pin the contract: canonical artifact
  shape and summary derivation, validation rejects
  missing `verificationPlanRef` and invalid command
  status, `timeout` and `killed` statuses accepted,
  built-in artifact type registration, runtime
  category routing, manifest conformance, role and
  permission boundary, runner-role manifest
  acceptance, SDK rejection of unknown roles and
  permissions, and runner throw-stub behavior. Full
  suite: 1013 passed / 1 skipped. **Recommended next
  slice:** **verification runner dry-run command**
  — `rekon verify run --plan <id> --dry-run`. Step 3
  of the runner v1 sequence: parse the plan, validate
  shell-interpolation-free args, emit a planned-but-
  not-executed `VerificationRun`. **Still no command
  execution.** No CLI behavior change in this slice
  (no `rekon verify run` yet). No `schemaVersion`
  bump. No new reason codes. No producer change. No
  graph-aware filter change. No source-file reads.
  No process spawn. No stdout / stderr capture. No
  log redaction implementation. No
  `VerificationResult` derivation. No
  `rekon verify record` behavior change. No
  `WorkOrder` / `VerificationPlan` /
  `VerificationResult` / `ReconciliationPlan` /
  `CoherencyDelta` behavior change. No CI / GitHub
  integration. No sandboxing implementation. No
  watcher / daemon. No version bump. No npm publish.
- Verification runner v1 decision memo (P1.1
  verification-runner-v1-decision slice):
  strategy-only batch — no runtime change. Memo
  (`docs/strategy/verification-runner-v1-decision.md`)
  decides whether Rekon should execute
  verification commands locally and pins the
  contract that governs any future runner.
  **Recommendation: Option C — hybrid opt-in
  runner.** Manual `rekon verify record` remains
  the default path; a future
  `rekon verify run --plan <id> --execute`
  command (deferred to a later slice) opts in
  to local execution. New sibling
  **`VerificationRun`** artifact records raw
  bounded execution detail; **`VerificationResult`
  remains the proof summary** consumed by
  publications and resolvers. New capability
  **`@rekon/capability-verify`** + new
  **`execute:verification`** permission. Safety
  contract: no execution during refresh /
  publish / resolve / intent / reconcile /
  artifacts; no shell interpolation from
  artifact-supplied strings;
  `spawn(argv[0], argv.slice(1))` with
  `shell: false`; per-command (120 s) +
  per-plan (600 s) timeouts with `SIGTERM` →
  3 s → `SIGKILL` process-tree kill; bounded
  redacted logs (8 KB / stream / command
  default, full-stream digests always);
  redaction patterns v1 cover
  `TOKEN` / `SECRET` / `KEY` / `PASSWORD` /
  `PAT` / `BEARER` env vars + `Bearer …` /
  `Basic …` HTTP auth headers; no
  auto-resolution, no auto-apply, no source
  writes, no automatic retries in v1.
  Implementation sequence (8 steps, deferred):
  VerificationRun type + docs → capability
  skeleton + conformance → dry-run command →
  opt-in execution → redaction / truncation
  tests → VerificationResult derivation →
  runner-produced proof in publications →
  CI / GitHub adapter (out of scope for v1).
  Pinned by
  `tests/docs/verification-runner-v1-decision.test.mjs`
  (18 assertions). No artifact mutation. No
  CLI behavior change. No new artifact type
  yet (lands in the next slice). No new
  capability yet. No `schemaVersion` bump. No
  new reason codes. No producer change. No
  graph-aware filter change. No source-file
  reads. No version bump. No npm publish.
- Issue merge decision publication / detail polish
  v2 (P1.1
  issue-merge-decision-publication-detail-polish
  slice): combined CLI + publication + docs + test
  polish batch on top of operator-ergonomics v1.
  Memo
  (`docs/strategy/issue-merge-decision-publication-detail-polish.md`)
  adds four surfaces: (1) human-readable
  `rekon issues merge candidate <id>` output when
  `--json` is absent (candidate id, decision state,
  member groups + members + files, latest decision
  + history, roll-up block, freshness, warnings,
  recommended commands); (2) human-readable
  `rekon issues merge candidates` (summary line,
  filters line, table, empty-state); (3) enhanced
  `rekon issues merge decisions` with a `summary`
  block (`total / current / superseded / accepted /
  rejected`), per-decision `current` boolean, and
  non-JSON table — ledger contents unchanged,
  `current` computed at read time; (4) proof-report
  `## Issue Merge Decision Context` section right
  after the opening paragraph showing
  accepted / rejected / undecided counts + accepted
  roll-up table when present + recommended
  `--undecided` / `--superseded` / `--stale`
  filter commands. The proof-report publisher's
  manifest adds `IssueMergeDecisionLedger` to
  `consumes` and a new
  `issue-merge-decision.changed` invalidation
  rule. Architecture summary + agent contract
  also recommend `rekon issues merge candidates
  --decision accepted --json` when accepted
  candidates exist (audit path). Pinned by
  `tests/contract/issue-merge-publication-detail-polish.test.mjs`
  (17 cases). Merge candidates remain advisory.
  Only `decide` mutates the ledger. No automatic
  merging. No semantic / LLM / fuzzy review. No
  artifact mutation outside the existing ledger
  append. No `schemaVersion` bump. No new artifact
  type. No new capability role. No new CLI
  subcommand outside the merge workflow. No
  producer change. No graph-aware filter change.
  No source-file reads. No version bump. No npm
  publish.
- Issue merge decision operator ergonomics v1 (P1.1
  issue-merge-decision-operator-ergonomics slice):
  combined CLI + publication + docs + test batch
  built on top of the freshness guardrails. Memo
  (`docs/strategy/issue-merge-decision-operator-ergonomics.md`)
  adds four operator-facing surfaces: (1) filters on
  `rekon issues merge candidates`
  (`--undecided` / `--decision accepted|rejected|none`
  / `--stale` / `--superseded` / `--reason`
  / `--strength` / `--limit`) plus a `summary`
  block + structured `mergeCandidateViews` array;
  (2) new `rekon issues merge candidate <id>` detail
  command returning the candidate plus member groups,
  member finding ids, files, latest decision, full
  decisionHistory, current `CoherencyDelta` roll-up,
  merge-rollup freshness, and recommendedCommands;
  (3) enhanced `decide` output with
  `previousDecision`, `changedDecision`, and
  `recommendedNextCommands`; (4) publication
  decision-count guidance — architecture summary
  renders `## Merge Candidate Decisions`, agent
  contract renders `### Merge Candidate Decisions`
  + new Do Not Do reminder. New kernel exports
  `buildIssueMergeCandidateViews`,
  `IssueMergeCandidateView`,
  `IssueMergeCandidateDecisionState`. Pinned by
  `tests/contract/issue-merge-operator-ergonomics.test.mjs`
  (16 cases). Merge candidates remain advisory; only
  `decide` mutates the ledger. No automatic merging.
  No semantic / LLM / fuzzy review. No artifact
  mutation outside the ledger append. No
  `schemaVersion` bump. No new artifact type. No
  new capability role. No new CLI subcommand outside
  the merge workflow. No producer change. No
  graph-aware filter change. No source-file reads.
  No version bump. No npm publish.
- Issue merge decision freshness guardrails v1 (P1.1
  issue-merge-decision-freshness-guardrails slice):
  combined strategy + implementation batch. Memo
  (`docs/strategy/issue-merge-decision-freshness-guardrails.md`)
  pins the freshness predicate as **artifact-lineage
  only** (no file-system mtime, no watcher). A
  `CoherencyDelta` is **stale for decision-making**
  when any of five rules fire:
  `merge-ledger-missing`, `merge-ledger-stale`,
  `adjudication-stale`, `lifecycle-stale`,
  `merge-decision-superseded`. Implementation adds a
  pure data-only helper
  `detectIssueMergeRollupFreshness` in
  `@rekon/kernel-findings`, threaded through
  architecture summary (`### Merge Roll-up Freshness`
  subsection with status + warnings table + stale
  callout), agent contract (`### Merge Decision
  Freshness` with per-input fresh/stale lines + Do
  Not Do reminder), and `resolve.issue` (new
  `issue.merge.freshness` `resolutionTrace` step
  + warning string when stale + ledger /
  adjudication / lifecycle refs cited in packet
  `inputRefs`). All warnings recommend `rekon
  refresh`; none invalidate artifacts structurally.
  Pinned by
  `tests/contract/issue-merge-decision-freshness-guardrails.test.mjs`
  (16 cases) covering every rule end-to-end across
  publications + resolver plus helper unit branches.
  No artifact mutation. No auto-refresh inside
  publishers / resolvers. No watcher / daemon. No
  file-system mtime invalidation. No artifact
  header shape change. No `schemaVersion` bump. No
  new artifact type. No new capability role. No new
  CLI subcommand or flag. No new reason codes. No
  producer change. No graph-aware filter change. No
  source-file reads. No LLM / semantic / fuzzy /
  embedding matching. No `GraphOntologyValidator`
  port. No version bump. No npm publish.
- Graph-aware fixture coverage operator review v3
  (P1.1 graph-aware-fixture-coverage-operator-review-v3
  slice): strategy / docs / test batch only — no
  runtime change. Memo
  (`docs/strategy/graph-aware-fixture-coverage-operator-review-v3.md`)
  re-runs the operator-review protocol against the
  post-strengthening attribution profile after
  `a2a2d25` shipped factory / module-gate evidence
  strengthening. **Measured aggregate diagnostics
  across the six filtered cases: `EvidenceGraph` 6,
  `DetectorDetails` 0, `ObservedRepo` 0; no
  fallback-dominance alert fires.** All four
  import-fact-producer migration triggers
  re-evaluated — none met. **Option C remains the
  alpha decision.** Memo records the **graph-aware
  v1 / v2 / v3 arc as alpha-complete** (every
  shipped reason fixture-covered; every fixture
  positive artifact-backed; fallback branches
  pinned by contract tests; publication diagnostic
  surface distinguishes sources; negative case
  pinned; producer migration not required; no
  remaining reason needs further strengthening).
  Memo explicitly states **factory / module-gate
  artifact evidence strengthening closes the last
  known fixture-attribution gap** and recommends
  the next implementation slice return to the
  deferred **issue merge decision freshness
  guardrails** (previously deferred until
  filtering / graph-aware parity was stronger;
  that condition is now satisfied). Pinned by
  `tests/docs/graph-aware-fixture-coverage-operator-review-v3.test.mjs`
  (21 assertions). No artifact `schemaVersion`
  bump. No new artifact type. No new capability
  role. No new CLI subcommand or flag. No new
  reason codes. No producer change. No helper
  change. No graph-aware filter change. No
  source-file reads. No LLM / semantic / fuzzy /
  embedding matching. No `GraphOntologyValidator`
  port. No version bump. No npm publish.
- Factory / module-gate artifact evidence
  strengthening v1 (P1.1
  factory-module-gate-evidence-strengthening slice):
  combined strategy + implementation batch. Memo
  (`docs/strategy/factory-module-gate-evidence-strengthening.md`)
  selects EvidenceGraph symbol/export facts as the
  smallest viable projection target; projector-side
  `ObservedSystem.kind` population is deferred.
  Filter-side: `graphFilterFactoryFileCreatesDeps`
  and `graphFilterModuleGateVerifiedCaller` each
  gain a new top-priority EvidenceGraph branch that
  consumes `listSymbolsForFile` + `listExportsForFile`.
  Factory branch: high confidence when any
  symbol/export name includes `"Factory"`; medium
  when name starts with `"create"` AND file path
  includes `"Factory"` / `"factory"`. Module-gate
  branch: high confidence when any name includes
  `"GateEvaluator"`; medium when name matches
  `/^evaluate.*Gate/`. Both branches set
  `usedArtifacts: ["EvidenceGraph"]` →
  `evidenceSource: "EvidenceGraph"`. Existing path /
  CapabilityMap / `ObservedSystem.kind="module"`
  branches survive as fallback. Aggregate fixture
  attribution shifts from
  `EvidenceGraph: 4 / DetectorDetails: 2` to
  `EvidenceGraph: 6 / DetectorDetails: 0` against
  the committed fixtures (path fallback still fires
  for repos with non-canonical symbol/export names).
  Pinned by
  `tests/contract/factory-module-gate-artifact-evidence.test.mjs`
  (14 cases) covering EvidenceGraph + ObservedRepo +
  path-fallback scenarios end-to-end with full
  `inputRefs` precision and raw-FindingReport
  preservation. v2 fixture contract test updated to
  assert the new EvidenceGraph attribution. No
  source reads. No AST. No typechecker. No LLM /
  semantic / fuzzy / embedding matching. No
  `GraphOntologyValidator` port. No producer
  migration. No artifact `schemaVersion` bump. No
  new artifact type. No new capability role. No new
  CLI subcommand or flag. No new reason codes. No
  version bump. No npm publish.
- Graph-aware fixture coverage operator review v2
  (P1.1 graph-aware-fixture-coverage-operator-review-v2
  slice): strategy / docs / test batch only — no
  runtime change. Memo
  (`docs/strategy/graph-aware-fixture-coverage-operator-review-v2.md`)
  re-runs the operator review's data-gathering protocol
  against the now-six deterministic fixtures
  (`route-handler`, `external-comment`, `nextjs-route`,
  `route-http-middleware-only` positive + negative,
  `factory-file`, `module-gate`). Measured aggregate
  diagnostics across the six filtered cases:
  `EvidenceGraph` attribution 4 (the four
  artifact-backed reasons); `DetectorDetails`
  attribution 2 (`factory-file-creates-deps` and
  `module-gate-verified-caller`, both currently
  path-evidence-only); `ObservedRepo` 0. All four
  import-fact-producer migration triggers
  re-evaluated against the new data — none met.
  **Option C remains the alpha decision** (helper
  compatibility now; producer migration deferred).
  The memo extends the refresh memo with an explicit
  per-reason artifact-strength review and identifies
  `factory-file-creates-deps` and
  `module-gate-verified-caller` as the next
  evidence-strengthening candidates (not import
  producer migration) — likely via a role / kind /
  ownership projection at the EvidenceGraph /
  CapabilityMap / ObservedSystem substrate. Pinned by
  `tests/docs/graph-aware-fixture-coverage-operator-review-v2.test.mjs`.
  No artifact `schemaVersion` bump. No new artifact
  type. No new capability role. No new CLI subcommand
  or flag. No new reason codes. No producer change.
  No helper change. No graph-aware filter change. No
  source-file reads. No LLM / semantic / fuzzy /
  embedding matching. No `GraphOntologyValidator`
  port. No version bump. No npm publish.
- Graph-aware filter fixture coverage v2 (P1.1
  graph-aware-filter-fixtures-v2 slice): three more
  deterministic regression fixtures under
  `tests/fixtures/graph-aware-filters/`
  (`route-http-middleware-only/` with positive +
  negative cases, `factory-file/`, `module-gate/`)
  complete the graph-aware coverage. Every
  graph-aware reason now has end-to-end fixture
  coverage. Contract test
  (`tests/contract/graph-aware-filter-fixtures-v2.test.mjs`,
  6 cases) copies each fixture to a tmpdir, runs
  the filter flow, and pins per-fixture: expected
  reason fires (or, for the negative case, the
  finding is KEPT); `FilteredFinding.evidenceSource`
  matches current attribution (`EvidenceGraph` for
  route-http positive; `DetectorDetails` for
  factory + module-gate path-evidence branches);
  precise `inputRefs` (EvidenceGraph cited only
  when the branch fired); raw `FindingReport`
  byte-preserving the finding; lifecycle
  exclusion; `artifacts validate` cleanliness. A
  publication-rendering test confirms the
  EvidenceGraph case surfaces in architecture
  summary + agent contract. **Important design
  choice:** the test does NOT force EvidenceGraph
  attribution where the current filter design uses
  path evidence (factory + module-gate attribute
  as DetectorDetails by design); future
  capability-role work could shift this
  naturally. Regression fixtures only — NOT
  user-facing examples. No filter behavior change.
  No producer change. No helper change. No artifact
  `schemaVersion` bump. No new artifact type. No
  new capability role. No new CLI subcommand or
  flag. No new reason codes. No source-file reads
  at filter time. No LLM / semantic / fuzzy /
  embedding matching. No `GraphOntologyValidator`
  port. No version bump. No npm publish.
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
