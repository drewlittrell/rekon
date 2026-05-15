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
  PR / GitHub / dashboard surfaces remain deferred. Issue merge
  decision freshness guardrails is the recommended next slice.
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
