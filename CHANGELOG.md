# Changelog

All notable changes to Rekon will be documented in this file.

## 0.1.0-beta.0

- Shipped the **Intent Capability Spine Integration Review** — seventy-sixth
  slice on the codebase-intel-classic capability-ontology track. Strategy /
  architecture-review batch. Read-only mapping of the classic intent surfaces
  (`intent:assess` / `intent:prepare` / `intent:go` / `intent:status`)
  onto the Rekon artifact spine: assess → `IntentAssessmentReport`, prepare →
  `PreparedIntentPlan`, status → `IntentStatusReport`; `intent:go`
  remains deferred. **Recommendation: Option B (staged intent artifact spine);
  first target IntentAssessmentReport v1 decision.** Honest finding: classic
  intent did not consume the step/handoff/runtime-graph/drift spine — Rekon
  intent extends parity by wiring StepCapabilityGraph, HandoffContract,
  HandoffCoverageReport, RuntimeGraphObservationReport, and
  RuntimeGraphDriftReport into intent readiness. No intent implemented; no
  artifact type registered; no CLI command added; no source writes; no version
  bump; no npm publish. New
  `docs/strategy/intent-capability-spine-integration-review.md` (17 headings
  + 4 tables) + 18-assertion docs test + review packet. Recommended next
  slice: IntentAssessmentReport v1 decision.
- Shipped **RuntimeGraphDriftReport safety review** — seventy-fifth slice
  on the codebase-intel-classic capability-ontology track. Strategy /
  safety-review batch. Read-only end-to-end review of the
  `RuntimeGraphDriftReport` v1 implementation at `41be345`.
  **Recommendation: safe / stable as expected-vs-observed runtime graph drift
  (no blocker); the classic step/handoff/runtime-drift spine is now complete
  enough to unblock intent architecture work.** Pinned: RuntimeGraphDriftReport
  is expected-vs-observed runtime graph drift, not runtime observation; not
  HandoffCoverageReport; not PathFreshnessReport or artifact lineage
  freshness; reads no raw handoff event logs directly; re-evaluates no handoff
  coverage from events; creates no `WorkOrder` / `VerificationPlan`;
  implements no intent. New
  `docs/strategy/runtime-graph-drift-report-safety-review.md` (15 headings +
  4 tables) + 16-assertion docs test + review packet; no source changes; no
  version bump; no npm publish. Recommended next slice: Intent Capability
  Spine Integration Review.
- Shipped **RuntimeGraphDriftReport v1** — seventy-fourth slice on the
  codebase-intel-classic capability-ontology track. Product-capability
  batch. Registers the `RuntimeGraphDriftReport` artifact type (category
  `actions`) and a read-only generator comparing the four materialized
  graph artifacts (`StepCapabilityGraph`, `HandoffContract`,
  `HandoffCoverageReport`, `RuntimeGraphObservationReport`) for
  expected-vs-observed runtime graph drift. New `@rekon/capability-model`
  `buildRuntimeGraphDriftReport`, the `rekon runtime graph drift [--root]
  [--json] [--step-graph] [--handoff-contract] [--handoff-coverage-report]
  [--runtime-observation-report]` CLI, and `RuntimeGraphDriftReport` types
  + factory + validator + schema in `@rekon/kernel-repo-model`. Drift rows:
  `in-sync` / `missing-expected` / `added-observed` /
  `uncovered-handoff` / `unresolved-contract` / `observation-missing` /
  `not-evaluated` (severity-bucketed; observation absent or empty →
  observation-missing, never false drift). **Expected-vs-observed runtime
  graph drift, not runtime observation**; not HandoffCoverageReport; not
  PathFreshnessReport or artifact lineage freshness; reads no raw handoff
  event logs directly; re-evaluates no coverage; creates no `WorkOrder` /
  `VerificationPlan`; intent deferred; mutates nothing. The **final
  classic-parity drift layer** of the step/handoff/runtime-graph spine.
  21-assertion contract test + 10-assertion docs test + review packet. No
  version bump; no npm publish.
- Shipped **RuntimeGraphDriftReport v1 decision** — seventy-third slice on
  the codebase-intel-classic capability-ontology track. Strategy /
  architecture decision batch. Decides the v1 model for
  `RuntimeGraphDriftReport`, the fifth and final spine artifact: compares
  `StepCapabilityGraph` / `HandoffContract` / `HandoffCoverageReport` /
  `RuntimeGraphObservationReport` for expected-vs-observed runtime graph
  drift. **Recommendation: Option B — compare existing graph artifacts**
  (drift rows: `missing-expected` / `added-observed` /
  `uncovered-handoff` / `unresolved-contract` / `observation-missing` /
  `not-evaluated`, severity-bucketed; observation absent →
  observation-missing / not-evaluated, never false drift). Rejected: defer
  (A), read-raw-events-directly (C), coverage-alone (D), freshness-as-drift
  (E). Pinned: expected-vs-observed runtime graph drift, not runtime
  observation; not HandoffCoverageReport; not PathFreshnessReport or artifact
  lineage freshness; does not read raw handoff event logs directly; no
  `WorkOrder` / `VerificationPlan`; intent deferred. New
  `docs/strategy/runtime-graph-drift-report-v1-decision.md` (14 headings +
  4 tables) + 15-assertion docs test + review packet. No source changes; no
  artifact registration; no CLI; no version bump; no npm publish. Recommended
  next slice: RuntimeGraphDriftReport v1 implementation.
- Shipped **RuntimeGraphObservationReport safety review** — seventy-second
  slice on the codebase-intel-classic capability-ontology track. Strategy /
  safety-review batch. Read-only end-to-end review of the
  `RuntimeGraphObservationReport` v1 implementation at `2c4ee04`.
  **Recommendation: safe / stable as observed runtime graph (no blocker).**
  Pinned: RuntimeGraphObservationReport is observed runtime graph, not
  declared topology; not HandoffCoverageReport; evaluates no declared
  handoff coverage; detects no runtime graph drift; creates no `WorkOrder`
  / `VerificationPlan`; intent deferred; `RuntimeGraphDriftReport`
  remains the next layer. New
  `docs/strategy/runtime-graph-observation-report-safety-review.md` (15
  headings + 4 tables) + 15-assertion docs test + review packet; no source
  changes; no version bump; no npm publish. Recommended next slice:
  RuntimeGraphDriftReport architecture / v1 decision.
- Shipped **RuntimeGraphObservationReport v1** — seventy-first slice on
  the codebase-intel-classic capability-ontology track. Product-capability
  batch. Registers the `RuntimeGraphObservationReport` artifact type
  (category `graphs`) and a read-only generator producing an observed
  runtime graph from optional `.rekon/handoff-events.jsonl`. New
  `@rekon/capability-model` `buildRuntimeGraphObservationReport` +
  `parseRuntimeGraphObservationEventLog`, the `rekon runtime graph observe
  [--root] [--json] [--event-log] [--handoff-coverage-report]
  [--handoff-contract] [--step-graph]` CLI, and
  `RuntimeGraphObservationReport` types + factory + validator + schema in
  `@rekon/kernel-repo-model`. Observed `step` / `feature` / `event` /
  `source` nodes + `handoff` / `emitted-by` edges with observedCount +
  first/last timestamps + line evidence; non-handoff rows → ignoredRows;
  invalid JSONL lines → parseErrors (non-fatal); missing log → zero
  nodes/edges. **Observed runtime graph, not declared topology**; not
  HandoffCoverageReport; evaluates no declared coverage, compares against no
  declared artifact, detects no drift, creates no `RuntimeGraphDriftReport`
  / `WorkOrder` / `VerificationPlan`; intent deferred; optional upstream
  refs are citation/context only; mutates nothing. 25-assertion contract
  test + 11-assertion docs test + review packet. No version bump; no npm
  publish.
- Shipped **RuntimeGraphObservationReport v1 decision** — seventieth
  slice on the codebase-intel-classic capability-ontology track. Strategy /
  architecture decision batch. Decides the v1 model for
  `RuntimeGraphObservationReport`, the fourth spine artifact: an observed
  runtime graph generated from raw `handoff_event` logs at
  `.rekon/handoff-events.jsonl`. **Recommendation: Option B — raw
  handoff_event log → observed graph** (observed `step` / `feature` /
  `event` / `source` nodes + `handoff` edges with observedCount +
  first/last timestamps + line evidence; non-handoff rows → ignoredRows;
  invalid lines → parseErrors, non-fatal; missing log → zero nodes/edges).
  Rejected: defer-until-drift (A), derive-from-HandoffCoverageReport (C;
  coverage is interpreted data), expected-graph→observation (D),
  full-runtime-tracing-now (E). Pinned: observed runtime graph, not declared
  topology; not HandoffCoverageReport; no declared-coverage evaluation, no
  drift detection, no `WorkOrder` / `VerificationPlan`; intent deferred;
  `RuntimeGraphDriftReport` remains the next layer. New
  `docs/strategy/runtime-graph-observation-report-v1-decision.md` (14
  headings + 4 tables) + 17-assertion docs test + review packet. No source
  changes; no artifact registration; no CLI; no version bump; no npm
  publish. Recommended next slice: RuntimeGraphObservationReport v1
  implementation.
- Shipped **HandoffCoverageReport safety review** — sixty-ninth slice on
  the codebase-intel-classic capability-ontology track. Strategy /
  safety-review batch. Read-only end-to-end review of the
  `HandoffCoverageReport` v1 implementation at `8e0a617`.
  **Recommendation: safe / stable as narrow handoff-event coverage (no
  blocker).** Pinned: HandoffCoverageReport is handoff-event coverage, not
  VerificationRun command success; missing event log → not-evaluated (not
  uncovered); present log without a match → uncovered; unmatched observed
  `handoff_event` → added-observed; invalid event-log lines → parseErrors
  (non-fatal). Confirms HandoffCoverageReport v1 creates no
  `RuntimeGraphObservationReport` / `RuntimeGraphDriftReport` /
  `WorkOrder` / `VerificationPlan`, detects no drift, and implements no
  intent. New `docs/strategy/handoff-coverage-report-safety-review.md` (16
  headings + 4 tables) + 17-assertion docs test + review packet; no source
  changes; no version bump; no npm publish. Recommended next slice:
  RuntimeGraphObservationReport architecture / v1 decision.
- Shipped **HandoffCoverageReport v1** — sixty-eighth slice on the
  codebase-intel-classic capability-ontology track. Product-capability
  batch. Registers the `HandoffCoverageReport` artifact type (category
  `actions`) and a read-only generator comparing declared
  `HandoffContract` handoffs against an optional raw handoff event log at
  `.rekon/handoff-events.jsonl`. New `@rekon/capability-model`
  `buildHandoffCoverageReport` + `parseHandoffEventLog`, the
  `rekon handoff coverage report [--root] [--json] [--handoff-contract]
  [--event-log]` CLI, and `HandoffCoverageReport` types + factory +
  validator + schema in `@rekon/kernel-repo-model`. Statuses: `covered` /
  `uncovered` / `unresolved-contract` / `added-observed` /
  `not-evaluated` (matching by event name → feature → step pair, never
  title/prose; missing log → not-evaluated; present log without a match →
  uncovered; unmatched observed `handoff_event` → added-observed; invalid
  JSONL lines → parseErrors, non-fatal). **Handoff-event coverage, not
  VerificationRun command success**; creates no
  `RuntimeGraphObservationReport` / `RuntimeGraphDriftReport` /
  `WorkOrder` / `VerificationPlan`; detects no drift; implements no
  intent; mutates neither the contract nor the event log. 25-assertion
  contract test + 13-assertion docs test + review packet. No version bump;
  no npm publish.
- Shipped **HandoffCoverageReport v1 decision** — sixty-seventh slice on
  the codebase-intel-classic capability-ontology track. Strategy /
  architecture decision batch. Decides the v1 model for
  `HandoffCoverageReport`, the third spine artifact, which compares
  declared `HandoffContract` handoffs against observed handoff events.
  **Recommendation: Option B — an artifact comparing HandoffContract
  against an optional raw handoff event log** at
  `.rekon/handoff-events.jsonl` (matching by event name → feature → step
  pair; never by title/prose). v1 statuses: `covered` / `uncovered` /
  `unresolved-contract` / `added-observed` / `not-evaluated` (missing log
  → not-evaluated; present log without a match → uncovered; invalid lines
  → parseErrors, non-fatal). Rejected: defer-until-RuntimeGraphObservation
  (A), HandoffContract-only (C; coverage needs observation), VerificationRun-as-coverage
  (D; command proof is not event coverage), start-with-drift (E). Pinned:
  HandoffCoverageReport is handoff-event coverage, not VerificationRun
  command success; HandoffCoverageReport v1 does not create
  RuntimeGraphObservationReport; does not detect runtime graph drift; does
  not create WorkOrder or VerificationPlan; RuntimeGraphObservationReport
  remains the next runtime layer after coverage; RuntimeGraphDriftReport
  remains deferred; intent implementation remains deferred. New strategy
  memo `docs/strategy/handoff-coverage-report-v1-decision.md` (13 headings
  + 4 tables: option / input / status / boundary; event + artifact
  sketches; v1 coverage policy). New 17-assertion docs test. Review packet
  `.rekon-dev/review-packets/handoff-coverage-report-v1-decision.md`. No
  source under `packages/` modified. No new artifact type. No new CLI
  command. No runtime event files read. No npm publish. No version bump.
  Recommended next slice: HandoffCoverageReport v1 implementation.
- Shipped **HandoffContract safety review** — sixty-sixth slice on the
  codebase-intel-classic capability-ontology track. Strategy /
  safety-review batch. Read-only end-to-end review of the
  `HandoffContract` v1 implementation shipped at `0c2be5d`.
  **Recommendation: safe / stable as declared baton policy (no
  blocker).** Grounded by re-reading the kernel-repo-model type /
  factory / validator / schema, the `buildHandoffContract` +
  `parseHandoffContractConfig` helper, and the `rekon handoff contract
  build` CLI branch. Pinned: HandoffContract is declared baton policy,
  not StepCapabilityGraph topology; HandoffContract v1 does not evaluate
  handoff coverage; does not read runtime events; does not detect runtime
  graph drift; does not create WorkOrder or VerificationPlan; does not
  implement intent; HandoffCoverageReport remains the next layer after
  HandoffContract; RuntimeGraphObservationReport and
  RuntimeGraphDriftReport remain deferred. New strategy memo
  `docs/strategy/handoff-contract-safety-review.md` (12 headings + 4
  tables: surface / resolution / boundary / option). New 16-assertion
  docs test. Review packet
  `.rekon-dev/review-packets/handoff-contract-safety-review.md`. No
  runtime behavior changes. No source under `packages/` modified. No new
  artifact type. No new CLI command. No npm publish. No version bump.
  Recommended next slice: HandoffCoverageReport architecture / v1
  decision.
- Shipped **HandoffContract v1** — sixty-fifth slice on the
  codebase-intel-classic capability-ontology track. Product capability
  batch. Implements the second artifact in the staged step/handoff/runtime
  graph spine. Registers a new artifact type `HandoffContract`
  (kernel-repo-model factory / validator / schema, SDK known-types,
  runtime `actions` category), adds the
  `@rekon/capability-model.buildHandoffContract` resolution helper +
  `parseHandoffContractConfig`, and a `rekon handoff contract build` CLI
  command. v1 materializes declared baton policy from an optional
  `.rekon/handoff-contracts.json` over the current `StepCapabilityGraph`:
  each configured handoff resolves to `declared` (both `fromStepId` /
  `toStepId` exist in the graph) or `unresolved-step` (a step id missing,
  with a message); missing config emits zero handoffs; omitted ids derive
  a deterministic slug-safe id. Pinned: HandoffContract is declared baton
  policy; it is not StepCapabilityGraph topology; HandoffContract v1 does
  not evaluate coverage; does not read runtime events; does not detect
  runtime graph drift; does not create WorkOrder / VerificationPlan;
  config is optional and never mutated. No coverage / runtime / drift /
  intent. No mutation of StepCapabilityGraph or the config. New artifact
  reference `docs/artifacts/handoff-contract.md`, new concept
  `docs/concepts/handoff-contract.md`. New 27-assertion contract test +
  11-assertion docs test. Review packet
  `.rekon-dev/review-packets/handoff-contract-v1.md`. No npm publish. No
  version bump. Recommended next slice: HandoffContract safety review.
- Shipped **HandoffContract v1 decision** — sixty-fourth slice on the
  codebase-intel-classic capability-ontology track. Strategy /
  architecture decision batch. Decides the v1 model for `HandoffContract`,
  the second artifact in the staged spine, which declares expected baton
  passes over `StepCapabilityGraph` step ids. **Recommendation: Option B —
  HandoffContract v1 as a config + artifact effective contract**: an
  operator declares handoffs in an optional `.rekon/handoff-contracts.json`
  and Rekon materializes an effective `HandoffContract` artifact over the
  current `StepCapabilityGraph` (so downstream coverage/drift reports can
  cite a stable ref). Each handoff references `fromStepId` / `toStepId`;
  a handoff with a missing step ref is emitted as `unresolved-step`, not
  inferred. Rejected: config-only (A; downstream needs artifact refs),
  auto-derive handoffs (C; baton policy must be declared), fold into
  StepCapabilityGraph (D; topology is not policy), start with
  HandoffCoverageReport (E; coverage needs declared handoffs). Pinned:
  HandoffContract is declared baton policy, not StepCapabilityGraph
  topology; HandoffContract v1 does not evaluate handoff coverage; does
  not read runtime events; does not detect runtime graph drift;
  HandoffCoverageReport remains the next layer after HandoffContract;
  RuntimeGraphObservationReport and RuntimeGraphDriftReport remain
  deferred; HandoffContract does not create WorkOrder or VerificationPlan;
  intent implementation remains deferred. New strategy memo
  `docs/strategy/handoff-contract-v1-decision.md` (13 headings + 4 tables:
  option / input / boundary / follow-on; config + artifact sketches; v1
  resolution policy). New 18-assertion docs test. Review packet
  `.rekon-dev/review-packets/handoff-contract-v1-decision.md`. No source
  under `packages/` modified. No new artifact type. No new CLI command.
  No npm publish. No version bump. Recommended next slice: HandoffContract
  v1 implementation.
- Shipped **StepCapabilityGraph safety review** — sixty-third slice on
  the codebase-intel-classic capability-ontology track. Strategy /
  safety-review batch. Read-only end-to-end review of the
  `StepCapabilityGraph` v1 implementation shipped at `783b7df`.
  **Recommendation: safe / stable as expected workflow topology (no
  blocker).** Grounded by re-reading the kernel-repo-model type /
  factory / validator / schema, the `buildStepCapabilityGraph` +
  `parseStepCapabilityGraphConfig` helper, and the `rekon step graph
  build` CLI branch. Pinned: StepCapabilityGraph is expected workflow
  topology, not runtime truth; StepCapabilityGraph is workflow topology,
  not CapabilityMap v2; optional .rekon/step-capability-map.json config
  is grouping/labeling only; StepCapabilityGraph v1 does not create
  HandoffContract; does not model handoff coverage; does not detect
  runtime graph drift; does not create WorkOrder or VerificationPlan;
  intent implementation remains deferred. New strategy memo
  `docs/strategy/step-capability-graph-safety-review.md` (12 headings +
  4 tables: surface / matching / boundary / option). New 16-assertion
  docs test. Review packet
  `.rekon-dev/review-packets/step-capability-graph-safety-review.md`. No
  runtime behavior changes. No source under `packages/` modified. No new
  artifact type. No new CLI command. No npm publish. No version bump.
  Recommended next slice: HandoffContract architecture / v1 decision.
- Shipped **StepCapabilityGraph v1** — sixty-second slice on the
  codebase-intel-classic capability-ontology track. Product capability
  batch. Implements the first artifact in the staged step/handoff/runtime
  graph spine. Registers a new artifact type `StepCapabilityGraph`
  (kernel-repo-model factory / validator / schema, SDK known-types,
  runtime `graphs` category), adds the
  `@rekon/capability-model.buildStepCapabilityGraph` projection helper +
  `parseStepCapabilityGraphConfig`, and a `rekon step graph build` CLI
  command. v1 projects an expected workflow topology graph from
  `EvidenceGraph` + `CapabilityMap v2` + `CapabilityPhraseReport`, with
  an optional `.rekon/step-capability-map.json` for grouping/labeling
  only (projection works with no config). Steps link to capabilities
  (step→capability `realizes`), files (step→file `touches`), and systems;
  assignment is deterministic (capability > path > system > config order
  > id). Pinned: StepCapabilityGraph v1 is expected workflow topology; it
  is not CapabilityMap v2; it does not model runtime handoff coverage; it
  does not detect runtime graph drift; it does not create HandoffContract;
  it does not create WorkOrder / VerificationPlan; it does not implement
  intent; optional config is grouping/labeling only. `handoffPlaceholders`
  is reserved (empty in v1); runtime grounding is reserved. No mutation of
  EvidenceGraph / CapabilityMap / CapabilityPhraseReport or the config.
  New artifact reference `docs/artifacts/step-capability-graph.md`, new
  concept `docs/concepts/step-capability-graph.md`. New 28-assertion
  contract test + 12-assertion docs test. Review packet
  `.rekon-dev/review-packets/step-capability-graph-v1.md`. No npm publish.
  No version bump. Recommended next slice: StepCapabilityGraph safety
  review.
- Shipped **StepCapabilityGraph v1 decision** — sixty-first slice on the
  codebase-intel-classic capability-ontology track. Strategy /
  architecture decision batch (v1 shape + inputs only; no
  implementation). Fixes the v1 artifact shape and inputs for
  `StepCapabilityGraph`, the first artifact in the staged spine.
  **Decision: projection + optional config** — v1 is derived by
  projection from `EvidenceGraph` + `CapabilityMap v2` +
  `CapabilityPhraseReport`, with an optional `.rekon/step-capability-map.json`
  used only for grouping/labeling (projection works with no config).
  Pinned: StepCapabilityGraph v1 is an expected workflow topology graph;
  it does not model runtime truth, handoff coverage, or execution
  readiness; StepCapabilityGraph is workflow topology, not CapabilityMap
  v2; the optional config is optional grouping and labeling, not a
  manual-admin-heavy system; no runtime behavior changes ship in this
  decision. v1 nodes: step / capability / file / system; edges:
  step→capability (`realizes`), step→file/system (`touches`);
  expected-handoff edges and runtime grounding are reserved (not
  populated in v1). Rejected: projection-only, config-only
  (manual-admin-heavy), runtime-grounded v1 (implies runtime truth). New
  strategy memo `docs/strategy/step-capability-graph-v1-decision.md`
  (14 headings + 4 tables: options / inputs / node-edge shape /
  boundary). New 16-assertion docs test. Review packet
  `.rekon-dev/review-packets/step-capability-graph-v1-decision.md`. No
  source under `packages/` modified. No new artifact type. No new CLI
  command. No mutation of EvidenceGraph / CapabilityMap /
  CapabilityPhraseReport. No npm publish. No version bump. Recommended
  next slice: StepCapabilityGraph v1 implementation.
- Shipped **StepCapabilityGraph / HandoffContract architecture
  decision** — sixtieth slice on the codebase-intel-classic
  capability-ontology track. Strategy / architecture decision batch.
  Decides the Rekon-native architecture for the classic step-capability
  graph + baton / handoff system surfaced by the fifty-ninth-slice
  parity audit. **Recommendation: Option B — a staged step/handoff/
  runtime graph spine**, introducing five reserved artifacts in
  sequence: (1) `StepCapabilityGraph`, (2) `HandoffContract`,
  (3) `HandoffCoverageReport`, (4) `RuntimeGraphObservationReport`,
  (5) `RuntimeGraphDriftReport`. The spine does not start with runtime
  drift (drift needs an expected graph + observed events first). Pinned:
  StepCapabilityGraph is workflow topology, not CapabilityMap v2;
  HandoffContract is declared baton policy, not WorkOrder;
  HandoffCoverageReport is handoff-event coverage, not VerificationRun
  command success; RuntimeGraphDriftReport is runtime graph drift, not
  PathFreshnessReport or artifact lineage freshness; intent parity
  depends on StepCapabilityGraph, HandoffContract, HandoffCoverageReport,
  and RuntimeGraphDriftReport; no runtime behavior changes ship in this
  decision. Rejected: CapabilityMap/Contract-enough (A), start-at-drift
  (C), fold-into-WorkOrder/VerificationPlan (D), fold-into-CapabilityMap
  v2 (E). New strategy memo
  `docs/strategy/step-capability-handoff-architecture-decision.md`
  (15 headings + 4 tables: option / artifact sequence / boundary /
  intent impact). New 15-assertion docs test. Review packet
  `.rekon-dev/review-packets/step-capability-handoff-architecture-decision.md`.
  No source under `packages/` modified. No new artifact type. No new CLI
  command. No npm publish. No version bump. Recommended next slice:
  StepCapabilityGraph v1 decision.
- Shipped **classic step-capability / handoff / runtime drift parity
  audit** — fifty-ninth slice on the codebase-intel-classic
  capability-ontology track. Strategy / architecture audit batch.
  Paused the lifecycle-integration chain to deeply audit the legacy
  codebase-intel source (read-only, not imported) for the
  step-capability graph, baton / handoff system, handoff coverage,
  step-handler validation, derive validation, runtime graph drift, and
  watcher / continuity / memory surfaces that feed intent. **Finding:
  Rekon has adjacent foundations, but the classic step-capability /
  handoff / runtime drift system is not yet fully accounted for.**
  Grounded by direct source reads (sdk-baton-node, product-capability-
  contracts drift/coverage, kernel-runtime-truth, step-capability-graph
  producer, derive/step-handler/conductor validators, watcher + intent
  services). Two premise corrections recorded honestly: the referenced
  `tools/verify-handoff-coverage.mjs` (and `validate-gates` /
  `build-gates` / `build-flows`) do not exist — real logic lives in
  `product-capability-contracts`; and classic "drift" is a base-vs-head
  EvidenceGraph diff layered over an observed runtime-truth graph, not a
  single-point freshness check. Pinned: runtime graph drift is not the
  same as PathFreshnessReport or artifact lineage freshness; handoff
  coverage is not the same as VerificationRun command success;
  StepCapabilityGraph is not the same as CapabilityMap v2; intent parity
  depends on step-capability, handoff, and runtime drift surfaces; no
  runtime behavior changes ship in this audit. Reserves
  `StepCapabilityGraph`, `HandoffContract`, `HandoffCoverageReport`,
  `RuntimeGraphObservationReport`, and `RuntimeGraphDriftReport` as
  future Rekon concepts/artifacts; evaluates
  `DerivedGraphValidationReport` and `StepHandlerValidationReport`. New
  strategy memo
  `docs/strategy/classic-step-capability-handoff-runtime-drift-parity-audit.md`
  (21 headings + 4 tables: classic source / gap matrix / proposed
  artifact / intent impact). New 20-assertion docs test. Review packet
  `.rekon-dev/review-packets/classic-step-capability-handoff-runtime-drift-parity-audit.md`.
  State note: built on `93d87a4` (slice 58); the operator header's
  `c908857` was stale. No source under `packages/` modified. No new
  artifact type. No new CLI command. No npm publish. No version bump.
  Recommended next slice: StepCapabilityGraph / HandoffContract
  architecture decision.
- Shipped **BridgeFindingLifecycleIntegrationReport safety review** —
  fifty-eighth slice on the codebase-intel-classic capability-ontology
  track. Strategy / safety-review batch. Read-only end-to-end review of
  the `BridgeFindingLifecycleIntegrationReport` v1 preview artifact
  shipped at `c908857`. **Recommendation: the preview artifact is safe /
  stable (no blocker).** Grounded by re-reading the shipped type /
  factory / validator / schema, the
  `buildBridgeFindingLifecycleIntegrationReport` builder +
  `isBridgeDerivedFinding` classifier, and the
  `rekon capability lint lifecycle-preview` CLI branch. Pinned:
  BridgeFindingLifecycleIntegrationReport is preview, not
  FindingLifecycleReport; initialLifecycleStatus is modeled status only
  and does not mutate FindingLifecycleReport; it does not mutate
  FindingFilterReport / FindingLifecycleReport / IssueAdjudicationReport
  / CoherencyDelta; it does not create WorkOrder or VerificationPlan; it
  does not write source files; CoherencyDelta integration remains
  downstream of lifecycle and adjudication; WorkOrder and
  VerificationPlan creation remain downstream of CoherencyDelta; the next
  slice may surface BridgeFindingLifecycleIntegrationReport in
  publications but must not mutate lifecycle or CoherencyDelta. New
  strategy memo
  `docs/strategy/bridge-finding-lifecycle-integration-report-safety-review.md`
  (12 headings + 4 tables: surface / classification / boundary /
  option). New 16-assertion docs test. Review packet
  `.rekon-dev/review-packets/bridge-finding-lifecycle-integration-report-safety-review.md`.
  No runtime behavior changes. No source under `packages/` modified. No
  new artifact type. No new CLI command. No npm publish. No version
  bump. Recommended next slice: BridgeFindingLifecycleIntegrationReport
  publication surfacing.
- Shipped **BridgeFindingLifecycleIntegrationReport v1** — fifty-seventh
  slice on the codebase-intel-classic capability-ontology track. Product
  capability batch. Implements the read-only preview artifact chosen by
  the fifty-sixth slice (Option B). Registers a new artifact type
  `BridgeFindingLifecycleIntegrationReport` (kernel-repo-model
  factory / validator / schema, SDK known-types, runtime `actions`
  category), adds the
  `@rekon/capability-model.buildBridgeFindingLifecycleIntegrationReport`
  builder + `isBridgeDerivedFinding`, and adds a
  `rekon capability lint lifecycle-preview` CLI command. The preview
  reads a `FindingReport`, identifies bridge-derived findings
  structurally from their trace fields (never by title text), and
  classifies readiness: ready-for-lifecycle (modeled initial status
  `new`), needs-review, duplicate, ineligible (filtered reserved).
  Non-bridge findings are omitted. Pinned:
  BridgeFindingLifecycleIntegrationReport is preview, not
  FindingLifecycleReport; ready-for-lifecycle rows receive a proposed
  initial status `new`; duplicates / missing evidence / missing trace
  are not automatically promoted; no FindingFilterReport /
  FindingLifecycleReport / IssueAdjudicationReport / CoherencyDelta
  mutation; no WorkOrder / VerificationPlan creation; source writes
  remain unavailable. New artifact reference
  `docs/artifacts/bridge-finding-lifecycle-integration-report.md`, new
  concept `docs/concepts/bridge-finding-lifecycle-integration.md`. New
  23-assertion contract test + 11-assertion docs test. Review packet
  `.rekon-dev/review-packets/bridge-finding-lifecycle-integration-report-v1.md`.
  No FindingReport writer behavior change. No npm publish. No version
  bump. Recommended next slice: BridgeFindingLifecycleIntegrationReport
  safety review.
- Shipped **bridge-derived findings lifecycle / CoherencyDelta
  integration decision** — fifty-sixth slice on the
  codebase-intel-classic capability-ontology track. Strategy /
  architecture decision batch. Decides how bridge-derived
  `FindingReport` entries should enter `FindingLifecycleReport`,
  `IssueAdjudicationReport`, and `CoherencyDelta`. **Recommendation:
  Option B — a preview artifact first
  (`BridgeFindingLifecycleIntegrationReport`) that previews filter /
  lifecycle / adjudication / CoherencyDelta eligibility without
  mutating any of them.** No lifecycle, adjudication, `CoherencyDelta`,
  `WorkOrder`, `VerificationPlan`, or source behavior is implemented
  in this slice. Pinned: BridgeFindingLifecycleIntegrationReport is
  preview, not FindingLifecycleReport; no FindingFilterReport,
  FindingLifecycleReport, IssueAdjudicationReport, or CoherencyDelta
  mutation occurs in this decision slice; CoherencyDelta integration
  remains downstream of lifecycle and adjudication; WorkOrder and
  VerificationPlan creation remain downstream of CoherencyDelta;
  source writes remain unavailable. The preview-artifact shape sketch
  (decision / modeled initialLifecycleStatus `new` for ready, never
  `resolved` in v1 / bridge trace fields), the staged sequence
  (preview → safety review → optional lifecycle writer decision →
  lifecycle writer → CoherencyDelta integration), and the duplicate
  policy are pinned for the implementation slice. New strategy memo
  `docs/strategy/bridge-finding-lifecycle-integration-decision.md`
  (13 headings + 4 tables: option / sequence / boundary / lifecycle).
  New 14-assertion docs test. Review packet
  `.rekon-dev/review-packets/bridge-finding-lifecycle-integration-decision.md`.
  No runtime behavior changes. No source files under `packages/`
  modified. No new artifact type (the preview shape is a memo sketch,
  not registered). No new CLI command. No npm publish. No version
  bump. Recommended next slice: `BridgeFindingLifecycleIntegrationReport`
  v1 (preview only).
- Shipped **bridge-derived findings publication safety review** —
  fifty-fifth slice on the codebase-intel-classic
  capability-ontology track. Strategy / safety-review batch.
  Read-only end-to-end review of the bridge-derived findings
  publication surfacing shipped at `6ad2045`. **Recommendation: the
  surfacing is safe / stable as read-only visibility (no blocker).**
  Reviewed `buildBridgeDerivedFindingsPublicationSection`,
  `isBridgeDerivedFinding`, the architecture summary `##
  Bridge-Derived Findings` + agent contract `### Bridge-Derived
  Findings` sections, the agent `Do Not Do` reminder, the manifest
  (`FindingReport` consume + `bridge-derived-findings.changed`), the
  proof-report deferral, and the contract / docs tests. Pinned:
  bridge-derived findings publication surfacing is read-only
  visibility; bridge-derived findings are governed FindingReport
  entries, not FindingLifecycleReport status; publication surfacing
  does not mutate FindingReport / FindingFilterReport /
  FindingLifecycleReport / IssueAdjudicationReport / CoherencyDelta;
  publication surfacing does not create WorkOrder or VerificationPlan;
  publication surfacing does not imply resolver routing, verification
  planning, RefactorPreservationContract behavior, or source-write
  permission; proof report surfacing remains deferred because
  bridge-derived findings are governance context, not verification
  proof; lifecycle / CoherencyDelta integration decision work may
  begin after this safety review. New strategy memo
  `docs/strategy/bridge-derived-findings-publication-safety-review.md`
  (12 headings + 4 tables: surface / source-identification / boundary
  / option). New 15-assertion docs test. Review packet
  `.rekon-dev/review-packets/bridge-derived-findings-publication-safety-review.md`.
  No runtime behavior changes. No source files under `packages/`
  modified. No new artifact type. No new CLI command. No npm publish.
  No version bump. Recommended next slice: bridge-derived findings
  lifecycle / CoherencyDelta integration decision.
- Shipped **bridge-derived findings publication surfacing** —
  fifty-fourth slice on the codebase-intel-classic
  capability-ontology track. Product capability batch. The
  architecture summary and agent operating contract now surface
  the governed bridge-derived `FindingReport` entries the
  controlled `rekon capability lint write-findings
  --confirm-finding-write` writer wrote, as **read-only
  visibility with provenance**. New pure helper
  `@rekon/capability-docs.buildBridgeDerivedFindingsPublicationSection`
  (plus `isBridgeDerivedFinding`) reads the latest `FindingReport`
  and filters to bridge-derived findings — identified by
  `finding.type === "capability_architecture_policy"`, by
  `finding.details.source === "capability-lint-bridge"`, or by any
  `finding.details.source*` trace field (never title text alone).
  The architecture summary renders `## Bridge-Derived Findings`
  (FindingReport ref, count, severity distribution, bounded
  provenance table); the agent operating contract renders `###
  Bridge-Derived Findings` plus a `Do Not Do` reminder. The
  `@rekon/capability-docs` manifest gains `FindingReport` in
  `consumes` and a `bridge-derived-findings.changed` invalidation
  rule. **Publications are read-only: they read the latest
  FindingReport, do not run the bridge writer, do not mutate
  FindingReport / FindingFilterReport / FindingLifecycleReport /
  IssueAdjudicationReport / CoherencyDelta, and do not create
  WorkOrder / VerificationPlan. Bridge-derived findings are
  governed FindingReport entries, not lifecycle status; proof
  report surfacing remains deferred; lifecycle and CoherencyDelta
  integration remain downstream.** New 23-assertion contract test
  + 11-assertion docs test. Review packet
  `.rekon-dev/review-packets/bridge-derived-findings-publications.md`.
  No new artifact type. No new CLI command. No version bump. No npm
  publish. Recommended next slice: bridge-derived findings
  publication safety review.
- Shipped **bridge-derived findings publication decision** —
  fifty-third slice on the codebase-intel-classic
  capability-ontology track. Strategy / architecture
  decision batch. Decides how bridge-derived FindingReport
  entries (written by the controlled, opt-in
  `--confirm-finding-write` writer) should be surfaced after
  the writer passed safety review. **Recommendation: Option B
  — surface bridge-derived FindingReport entries in the
  architecture summary and the agent operating contract
  first; the proof report is deferred.** No publication
  behavior is implemented in this slice. Pinned verbatim:
  Bridge-derived findings are governed FindingReport entries,
  not lifecycle status; Publication surfacing does not mutate
  FindingReport; Publication surfacing does not mutate
  FindingLifecycleReport, IssueAdjudicationReport, or
  CoherencyDelta; Publication surfacing does not create
  WorkOrder or VerificationPlan; Proof report surfacing
  remains deferred; Lifecycle and CoherencyDelta integration
  remain downstream. The publication model sketch
  (`## Bridge-Derived Findings` / `### Bridge-Derived
  Findings`), the source-identification policy
  (`finding.type = capability_architecture_policy` plus the
  `details.source*` trace fields — never title text alone),
  and the citation policy are pinned for the implementation
  slice. New strategy memo
  `docs/strategy/bridge-derived-findings-publication-decision.md`
  (12 `##` headings + 4 tables: option / surface / boundary /
  source-identification). New 15-assertion docs test. Review
  packet
  `.rekon-dev/review-packets/bridge-derived-findings-publication-decision.md`.
  No runtime behavior changes. No source files under
  `packages/` modified. No new artifact type. No new CLI
  command. No npm publish. No version bump. Recommended next
  slice: bridge-derived findings publication surfacing.
- Shipped **CapabilityLintFindingBridgeReport → FindingReport
  writer safety review** — fifty-second slice on the
  codebase-intel-classic capability-ontology track. Strategy /
  safety-review batch. Read-only end-to-end review of the
  FindingReport writer mode shipped at `8bb6f82`.
  **Recommendation: the FindingReport writer mode is safe / stable
  as a controlled, opt-in writer** (no blocker). Reviewed the CLI
  write-findings branch, dry-run preservation, the
  `--confirm-finding-write` gate, mutual exclusion, write-ish alias
  rejection, the zero-findings guard, FindingReport construction /
  inputRefs, the before-write safety checks, and the contract /
  docs tests. Pinned verbatim: FindingReport writer mode is opt-in
  and requires `--confirm-finding-write`; dry-run behavior remains
  preview-only and writes nothing; writer mode writes exactly one
  new `FindingReport` artifact on success; writer mode does not
  mutate existing `FindingReport` artifacts in place; writer mode
  does not mutate `FindingFilterReport` / `FindingLifecycleReport`
  / `IssueAdjudicationReport` / `CoherencyDelta`; writer mode does
  not create `WorkOrder` / `VerificationPlan`; writer mode writes
  no source files; lifecycle and `CoherencyDelta` integration
  remain downstream. New strategy memo
  `docs/strategy/capability-lint-finding-writer-safety-review.md`
  (12 headings + 3 tables: surface / boundary / option). New
  15-assertion docs test. Review packet
  `.rekon-dev/review-packets/capability-lint-finding-writer-safety-review.md`.
  **No runtime behavior changes. No source files under
  `packages/` modified. No new artifact type. No new CLI command.
  No npm publish. No version bump.** Recommended next slice:
  FindingReport writer publication / operator-surface decision.
- Shipped **CapabilityLintFindingBridgeReport → FindingReport
  writer implementation** — fifty-first slice on the
  codebase-intel-classic capability-ontology track. Product
  capability batch (controlled writer). The
  `rekon capability lint write-findings` command gains an opt-in
  write mode (`--confirm-finding-write`) alongside the existing
  `--dry-run` preview. Write mode builds the dry-run preview via
  `buildFindingReportWritePreview`, runs before-write safety
  checks, and writes **exactly one new `FindingReport`** artifact
  under `.rekon/artifacts/findings/` (the proposed body), citing
  the `CapabilityLintFindingBridgeReport` plus the upstream lint /
  `CapabilityContract` / `CapabilityMap` refs and preserving
  proposed finding ids, severity, and `evidenceRefs` (bridge trace
  fields kept under finding `details`). **Write mode requires
  `--confirm-finding-write`; `--dry-run` and
  `--confirm-finding-write` are mutually exclusive; `--write` /
  `--send` / `--execute` are rejected; write mode exits non-zero
  and writes nothing when the preview produces 0 eligible
  findings; the existing `FindingReport` is not mutated in place;
  `FindingFilterReport` / `FindingLifecycleReport` /
  `IssueAdjudicationReport` / `CoherencyDelta` are not mutated;
  `WorkOrder` / `VerificationPlan` are not created; source writes
  remain unavailable.** New 25-assertion contract test + new
  11-assertion docs test. Review packet
  `.rekon-dev/review-packets/capability-lint-finding-writer.md`.
  **No new artifact type. No version bump. No npm publish.**
  Recommended next slice: FindingReport writer safety review.
- Shipped **CapabilityLintFindingBridgeReport → FindingReport
  writer mode decision** — fiftieth slice on the
  codebase-intel-classic capability-ontology track. Strategy /
  architecture decision batch. Decides whether and how to add an
  opt-in `FindingReport` write mode after the dry-run helper / CLI
  passed safety review. **Recommendation: Option B — a future,
  opt-in write mode gated behind `--confirm-finding-write`, reusing
  the dry-run preview and writing a new `FindingReport` artifact
  only; the write mode is not implemented in this slice.** Pinned
  verbatim: no `FindingReport` entries are written in this decision
  slice; future write mode must require `--confirm-finding-write`;
  `--write` / `--send` / `--execute` remain rejected; future write
  mode writes a new `FindingReport` artifact, not an existing
  `FindingReport` in place; future write mode does not mutate
  `FindingFilterReport` / `FindingLifecycleReport` /
  `IssueAdjudicationReport` / `CoherencyDelta`; future write mode
  does not create `WorkOrder` / `VerificationPlan`; source writes
  remain unavailable. The confirmation policy (sole
  `--confirm-finding-write` path; rejected aliases), the
  new-artifact write model, and the six before-write + two
  after-write safety checks are pinned for the implementation
  slice. New strategy memo
  `docs/strategy/capability-lint-finding-writer-mode-decision.md`
  (13 headings + 4 tables: option / confirmation / boundary /
  safety-check). New 16-assertion docs test. Review packet
  `.rekon-dev/review-packets/capability-lint-finding-writer-mode-decision.md`.
  **No runtime behavior changes. No source files under
  `packages/` modified. No new artifact type. No new CLI command.
  No npm publish. No version bump.** Recommended next slice:
  CapabilityLintFindingBridgeReport → FindingReport writer
  implementation.
- Shipped **CapabilityLintFindingBridgeReport → FindingReport
  writer dry-run safety review** — forty-ninth slice on the
  codebase-intel-classic capability-ontology track. Strategy /
  safety-review batch. Read-only end-to-end review of the
  FindingReport writer dry-run helper / CLI shipped at `cf87e59`.
  **Recommendation: the FindingReport writer dry-run helper / CLI
  is safe / stable as preview-only writer modeling** (no blocker).
  Reviewed `buildFindingReportWritePreview`, the
  `FindingReportWritePreview` shape, eligibility / skip /
  duplicate-finding-id logic, the proposed `FindingReport` body,
  the `rekon capability lint write-findings` command, and the
  write-ish flag rejection. Pinned verbatim: FindingReport writer
  dry-run is preview-only; `--dry-run` is required;
  `--confirm-finding-write` / `--write` / `--send` / `--execute`
  are rejected; dry-run writes no `FindingReport` and mutates no
  existing `FindingReport`; dry-run mutates no `FindingFilterReport`
  / `FindingLifecycleReport` / `IssueAdjudicationReport` /
  `CoherencyDelta`; dry-run creates no `WorkOrder` /
  `VerificationPlan`; dry-run does not mutate the artifact index;
  write mode remains deferred to a later explicit decision. New
  strategy memo
  `docs/strategy/capability-lint-finding-writer-dry-run-safety-review.md`
  (12 headings + 4 tables: surface / flag / boundary / option).
  New 16-assertion docs test. Review packet
  `.rekon-dev/review-packets/capability-lint-finding-writer-dry-run-safety-review.md`.
  **No runtime behavior changes. No source files under
  `packages/` modified. No new artifact type. No new CLI command.
  No npm publish. No version bump.** Recommended next slice:
  CapabilityLintFindingBridgeReport → FindingReport writer mode
  decision.
- Shipped **CapabilityLintFindingBridgeReport → FindingReport
  writer dry-run helper / CLI** — forty-eighth slice on the
  codebase-intel-classic capability-ontology track. Product
  capability batch (**dry-run preview only**; implements step 2 of
  the writer decision). New pure helper
  `@rekon/capability-model.buildFindingReportWritePreview` reads a
  `CapabilityLintFindingBridgeReport`, selects eligible candidates,
  and returns a `FindingReportWritePreview` (`dryRun: true`,
  `wouldWrite: false`) modeling the `FindingReport` body a future
  writer would emit (`source: "capability-lint-bridge"`, category
  `capability_architecture_policy`, `inputRefs` citing bridge /
  lint / contract / map, and per-finding trace fields
  `sourceBridgeCandidateId` / `sourceLintRowId` / `sourceContractId`
  / `sourcePhraseCapabilityId`). New CLI command `rekon capability
  lint write-findings --bridge-report <id|type:id> --dry-run
  [--root <path>] [--json]`. **The FindingReport writer dry-run
  writes no `FindingReport`. Write mode is deferred. `--dry-run`
  is required, and `--confirm-finding-write` / `--write` /
  `--send` / `--execute` are rejected with a non-zero exit.** The
  command reads only the `CapabilityLintFindingBridgeReport`,
  writes no artifact, does not mutate the artifact index, does not
  mutate `FindingReport` / `FindingFilterReport` /
  `FindingLifecycleReport` / `IssueAdjudicationReport` /
  `CoherencyDelta`, and creates no `WorkOrder` / `VerificationPlan`.
  Eligibility re-validates every structural prerequisite
  (eligible decision + `proposedFinding` + non-empty
  `evidenceRefs` + `sourceLintRowRef` + high/medium severity +
  high/medium confidence) and deterministically skips later
  duplicate finding ids. New 27-assertion contract test + new
  9-assertion docs test. Review packet
  `.rekon-dev/review-packets/capability-lint-finding-writer-dry-run.md`.
  **No new artifact type. No write mode. No version bump. No npm
  publish.** Recommended next slice: FindingReport writer dry-run
  safety review.
- Shipped **CapabilityLintFindingBridgeReport → FindingReport
  writer decision** — forty-seventh slice on the
  codebase-intel-classic capability-ontology track. Strategy /
  architecture decision batch. Decides whether and how eligible
  `CapabilityLintFindingBridgeReport` candidates may become
  governed `FindingReport` entries. **Recommendation: Option B —
  a future, separate, opt-in `FindingReport` writer that requires
  a dry-run preview and an explicit confirmation flag; the writer
  is not implemented in this slice.** Pinned verbatim: no
  `FindingReport` entries are written in this decision slice; a
  future writer must support dry-run preview before write mode; a
  future writer must require explicit confirmation before writing
  `FindingReport`; the writer must write a new `FindingReport`
  artifact, not mutate an existing `FindingReport` in place;
  `FindingFilterReport`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, and `CoherencyDelta` remain
  downstream and are not mutated by the writer; `WorkOrder` and
  `VerificationPlan` creation remain downstream and are not part
  of the writer; source writes remain unavailable. Eligibility
  (eligible decision + `proposedFinding` + non-empty
  `evidenceRefs` + `sourceLintRowRef` + high/medium severity +
  high/medium confidence), the deterministic timestamp-free
  finding id, and the new-artifact write model are pinned for the
  implementation slice. New strategy memo
  `docs/strategy/capability-lint-finding-writer-decision.md` (13
  headings + 4 tables: option / eligibility / boundary /
  future-sequence). New 16-assertion docs test. Review packet
  `.rekon-dev/review-packets/capability-lint-finding-writer-decision.md`.
  **No runtime behavior changes. No source files under
  `packages/` modified. No new artifact type. No new CLI command.
  No npm publish. No version bump.** Recommended next slice:
  CapabilityLintFindingBridgeReport → FindingReport writer
  dry-run helper / CLI (preview only).
- Shipped **CapabilityLintFindingBridgeReport publication safety
  review** — forty-sixth slice on the codebase-intel-classic
  capability-ontology track. Strategy / safety-review batch.
  Read-only end-to-end review of the
  `CapabilityLintFindingBridgeReport` publication surfacing
  shipped at `41e0f32`. **Recommendation:
  `CapabilityLintFindingBridgeReport` publication surfacing is
  safe / stable as read-only visibility.** Reviewed the
  `buildCapabilityLintFindingBridgePublicationSection` helper,
  the architecture summary + agent contract `Capability Lint
  Finding Bridge` sections, the agent-contract Do Not Do
  reminder, the proof-report deferral, and the contract / docs
  tests. Pinned verbatim: publication surfacing is read-only
  visibility; `CapabilityLintFindingBridgeReport` is preview,
  not `FindingReport`; `proposedFinding` is preview-only and
  writes no `FindingReport`; surfacing does not imply
  `FindingReport` / `FindingLifecycleReport` /
  `IssueAdjudicationReport` / `CoherencyDelta` mutation,
  `WorkOrder` / `VerificationPlan` creation, resolver routing,
  verification planning, `RefactorPreservationContract`, or
  source-write permission; publications read the latest bridge
  report and never run `rekon capability lint bridge-findings`;
  proof-report surfacing remains deferred; FindingReport writer
  decision work may begin after this safety review. New strategy
  memo
  `docs/strategy/capability-lint-finding-bridge-publication-safety-review.md`
  (11 headings + 3 tables: surface / boundary / option). New
  14-assertion docs test. Review packet
  `.rekon-dev/review-packets/capability-lint-finding-bridge-publication-safety-review.md`.
  **No runtime behavior changes. No source files under
  `packages/` modified. No new artifact type. No new CLI
  command. No npm publish. No version bump.** Recommended next
  slice: CapabilityLintFindingBridgeReport → FindingReport
  writer decision.
- Shipped **CapabilityLintFindingBridgeReport publication
  surfacing** — forty-fifth slice on the codebase-intel-classic
  capability-ontology track. Product capability batch. The
  architecture summary and agent contract publications now
  surface the latest `CapabilityLintFindingBridgeReport` as
  read-only visibility into which capability-architecture lint
  rows are eligible / ineligible / needs-review to become
  governed findings later.
  - New `@rekon/capability-docs` helper
    `buildCapabilityLintFindingBridgePublicationSection` (pure,
    structural-typed) renders a `Capability Lint Finding Bridge`
    section: report ref, source `CapabilityArchitectureLintReport`
    ref, optional `CapabilityContract` / `CapabilityMap` refs,
    summary counts (totalRows / eligible / ineligible /
    needsReview), optional byReason / bySeverity, eligible /
    ineligible / needs-review guidance, and a bounded candidate
    table (cap 20).
  - Architecture summary publisher (heading level 2) and agent
    contract publisher (heading level 3) read the latest bridge
    report, render the section, and cite it in
    `header.inputRefs`. Both render no-report guidance when
    absent.
  - New agent-contract "Do Not Do" reminder covering FindingReport
    writing, lifecycle mutation, CoherencyDelta remediation,
    WorkOrder creation, VerificationPlan generation, resolver
    routing, verification planning, RefactorPreservationContract,
    and source-write permission.
  - `@rekon/capability-docs` manifest `consumes` gains
    `CapabilityLintFindingBridgeReport`; new invalidation rule
    `capability-lint-finding-bridge.changed`.
  Pinned verbatim: publications read the latest
  `CapabilityLintFindingBridgeReport` and **never run bridge
  generation**; they **do not write `FindingReport`**, mutate
  `FindingFilterReport` / `FindingLifecycleReport` /
  `IssueAdjudicationReport` / `CoherencyDelta`, or create
  `WorkOrder` / `VerificationPlan`; `proposedFinding` stays
  preview-only; surfacing does not imply source writes;
  proof-report surfacing is deferred. New contract test (23
  assertions) + docs test (11 assertions). Review packet
  `.rekon-dev/review-packets/capability-lint-finding-bridge-publications.md`.
  No new artifact type. No new CLI command. No version bump. No
  npm publish. Recommended next slice:
  CapabilityLintFindingBridgeReport publication safety review.
- Shipped **CapabilityLintFindingBridgeReport safety review** —
  forty-fourth slice on the codebase-intel-classic
  capability-ontology track. Strategy / safety-review batch.
  Read-only end-to-end review of `CapabilityLintFindingBridgeReport`
  v1 (shipped at `166e07a`). **Recommendation:
  `CapabilityLintFindingBridgeReport` v1 is safe / stable as a
  preview bridge artifact.** Reviewed the artifact type shape,
  factory, validator / assert / schema,
  `buildCapabilityLintFindingBridgeReport` helper, the
  `rekon capability lint bridge-findings` CLI, the eligibility
  rules, duplicate handling, and the deterministic proposed
  finding id policy. Pinned verbatim:
  `CapabilityLintFindingBridgeReport` is preview, not
  `FindingReport`; no `FindingReport` entries are written in v1;
  it does not mutate `FindingFilterReport`,
  `FindingLifecycleReport`, `IssueAdjudicationReport`, or
  `CoherencyDelta`; it does not create `WorkOrder` or
  `VerificationPlan`; only a later explicit writer decision may
  allow eligible bridge candidates to become governed findings;
  the next slice may surface `CapabilityLintFindingBridgeReport`
  in publications, but must not write findings. New strategy memo
  `docs/strategy/capability-lint-finding-bridge-report-safety-review.md`
  (13 headings + 4 tables: surface / eligibility / boundary /
  option). New 14-assertion docs test. Review packet
  `.rekon-dev/review-packets/capability-lint-finding-bridge-report-safety-review.md`.
  **No runtime behavior changes. No source files under
  `packages/` modified. No new artifact type. No new CLI command.
  No FindingReport / FindingFilterReport / FindingLifecycleReport
  / IssueAdjudicationReport / CoherencyDelta mutation. No
  WorkOrder / VerificationPlan creation. No npm publish. No
  version bump.** Recommended next slice:
  CapabilityLintFindingBridgeReport publication surfacing.
- Shipped **CapabilityLintFindingBridgeReport v1** —
  forty-third slice on the codebase-intel-classic
  capability-ontology track. Implements **Option B** of the
  `CapabilityArchitectureLintReport` → `FindingReport` bridge
  decision: a **preview** bridge artifact that classifies each
  `CapabilityArchitectureLintReport` row as `eligible` /
  `ineligible` / `needs-review` for a future `FindingReport`
  writer and attaches a deterministic, slug-safe proposed
  finding id
  (`capability-architecture-policy:<rule>:<contractId>:<phraseCapabilityId>`)
  to eligible rows. New artifact type
  `CapabilityLintFindingBridgeReport` (schemaVersion 0.1.0,
  stability experimental), registered in `@rekon/sdk` and the
  `@rekon/runtime` artifact category map (under `actions`). New
  helper `buildCapabilityLintFindingBridgeReport` in
  `@rekon/capability-model`. New CLI command
  `rekon capability lint bridge-findings [--lint-report <ref>]
  [--root <path>] [--json]`. **CapabilityLintFindingBridgeReport
  is preview, not FindingReport.** The bridge **does not write
  FindingReport**, does not mutate `FindingFilterReport`,
  `FindingLifecycleReport`, `IssueAdjudicationReport`, or
  `CoherencyDelta`, and creates no `WorkOrder` and no
  `VerificationPlan`. **Only a later explicit writer decision
  may allow eligible bridge candidates to become governed
  findings.** No source writes, no LLM inference, no version
  bump.
- Shipped **CapabilityArchitectureLintReport →
  FindingReport bridge decision** — forty-second slice on
  the codebase-intel-classic capability-ontology track.
  Strategy / architecture decision memo only. First
  bridge decision between the capability-policy
  evaluation layer and the existing finding / governance
  pipeline. **Recommendation: Option B — introduce an
  intermediate `CapabilityLintFindingBridgeReport`
  first** (a preview artifact), rather than writing
  `FindingReport` directly.

  The bridge report classifies eligible
  `CapabilityArchitectureLintReport` violation rows into
  eligible / ineligible / needs-review and attaches a
  `proposedFinding` preview payload — without writing
  `FindingReport` or mutating any governance artifact.

  V1 eligibility policy (for the bridge-report
  implementation slice): a lint row is eligible only when
  status is `violation`, it carries a `findingCandidate`,
  confidence is high/medium, severity is high/medium, and
  it has `evidenceRefs`. Pass / not-evaluated /
  missing-candidate / low-confidence / low-severity rows
  are ineligible. Duplicate id conflicts, missing
  evidence chains, and uncertain category mappings are
  needs-review. Deterministic finding id sketch:
  `capability-architecture-policy:<rule>:<contractId>:<phraseCapabilityId>`
  (no timestamp; duplicates collapse).

  Pinned verbatim:

  - `CapabilityLintFindingBridgeReport` is preview, not
    `FindingReport`.
  - No `FindingReport` entries are written in v1.
  - No `FindingFilterReport`, `FindingLifecycleReport`,
    `IssueAdjudicationReport`, or `CoherencyDelta`
    mutation occurs in v1.
  - Only a later explicit writer decision may allow
    bridge candidates to become governed findings.
  - Finding lifecycle and `CoherencyDelta` remain
    downstream of governed findings.

  Five options evaluated; Option B selected; direct
  `FindingReport` writer rejected for v1; direct
  lifecycle mutation and direct `CoherencyDelta`
  remediation rejected. Implementation sequence: (1)
  decision memo (this slice); (2)
  `CapabilityLintFindingBridgeReport` v1 (preview only);
  (3) bridge safety review; (4) `FindingReport` writer
  decision; (5) writer implementation only if explicitly
  approved. New strategy memo
  `docs/strategy/capability-lint-finding-bridge-decision.md`
  with 12 required headings + 4 required tables (option /
  eligibility / governance boundary / future sequence).
  New 15-assertion docs test. Review packet
  `.rekon-dev/review-packets/capability-lint-finding-bridge-decision.md`.
  **No implementation. No new artifact type registered.
  No runtime behavior changes. No FindingReport /
  FindingFilterReport / FindingLifecycleReport /
  IssueAdjudicationReport / CoherencyDelta mutation. No
  WorkOrder / VerificationPlan creation. No npm publish.
  No version bump.** Recommended next slice:
  **CapabilityLintFindingBridgeReport v1**.

- Shipped **CapabilityArchitectureLintReport publication
  safety review** — forty-first slice on the
  codebase-intel-classic capability-ontology track.
  Strategy / safety-review batch. Read-only end-to-end
  audit of the `CapabilityArchitectureLintReport`
  publication surfacing shipped at `d01fe23`.
  **Recommendation: publication surfacing is safe /
  stable as read-only visibility.**

  Reviewed the
  `buildCapabilityArchitectureLintPublicationSection`
  helper, the architecture summary + agent contract
  `Capability Architecture Linting` sections, the agent
  contract `Do Not Do` reminder, the proof-report
  deferral, and the contract / docs tests.

  Pinned verbatim:

  - `CapabilityArchitectureLintReport` publication
    surfacing is read-only visibility.
  - `CapabilityArchitectureLintReport` is evaluation,
    not enforcement.
  - `findingCandidate` is preview-only and writes no
    `FindingReport`.
  - `CapabilityArchitectureLintReport` publication
    surfacing does not imply `FindingReport` mutation,
    `FindingLifecycleReport` mutation, `CoherencyDelta`
    mutation, resolver routing, verification planning,
    `RefactorPreservationContract` behavior, or
    source-write permission.
  - Publications read the latest
    `CapabilityArchitectureLintReport`; they never run
    `rekon capability lint architecture`.
  - Proof report surfacing remains deferred because
    `CapabilityArchitectureLintReport` is evaluation
    context, not verification proof.
  - Finding-bridge decision work may begin after this
    safety review.

  Five options evaluated; declare surfacing safe / stable
  + finding-bridge decision next selected; more
  publication polish deferred (no blocker); resolver
  routing and verification planning rejected (wait for the
  governed finding bridge). New strategy memo
  `docs/strategy/capability-architecture-lint-publication-safety-review.md`
  with 11 required headings + 3 required tables (surface /
  boundary / option). New 14-assertion docs test. Review
  packet
  `.rekon-dev/review-packets/capability-architecture-lint-publication-safety-review.md`.
  **No runtime behavior changes. No publication behavior
  changes. No source files under `packages/` modified.
  No new artifact type. No new CLI command. No
  FindingReport / FindingFilterReport /
  FindingLifecycleReport / CoherencyDelta mutation. No
  CapabilityContract / CapabilityMap mutation. No npm
  publish. No version bump.** Recommended next slice:
  **CapabilityArchitectureLintReport → FindingReport
  bridge decision**.

- Shipped **CapabilityArchitectureLintReport publication
  surfacing** — fortieth slice on the
  codebase-intel-classic capability-ontology track.
  Product capability batch. The architecture summary and
  agent contract publications now surface the latest
  `CapabilityArchitectureLintReport` as **read-only
  visibility** into capability-aware placement-policy
  evaluation.

  - New `@rekon/capability-docs` helper
    `buildCapabilityArchitectureLintPublicationSection`
    (pure, structural-typed) renders a `Capability
    Architecture Linting` section: report ref, source
    `CapabilityContract` + `CapabilityMap` refs, summary
    counts (total / violations / passes / not-evaluated),
    optional byRule / bySeverity, and a bounded lint-row
    table (cap 20).
  - Architecture summary publisher (heading level 2) and
    agent contract publisher (heading level 3) read the
    latest lint report, render the section, and cite the
    report in `header.inputRefs`. Both render no-report
    guidance when absent.
  - New agent-contract "Do Not Do" reminder covering
    FindingReport mutation, lifecycle mutation,
    CoherencyDelta remediation, resolver routing,
    verification planning, RefactorPreservationContract,
    and source-write permission.
  - `@rekon/capability-docs` manifest `consumes` gains
    `CapabilityArchitectureLintReport`; new invalidation
    rule `capability-architecture-lint.changed`.

  Pinned verbatim:

  - `CapabilityArchitectureLintReport` is evaluation
    visibility only; this publication does not write
    findings, mutate lifecycle state, route resolvers,
    generate verification plans, or write source files.
  - `findingCandidate` is preview-only and writes no
    `FindingReport`.
  - Publications read the latest
    `CapabilityArchitectureLintReport`; they never run
    `rekon capability lint architecture`.
  - Publications never mutate `FindingReport`,
    `FindingFilterReport`, `FindingLifecycleReport`,
    `CoherencyDelta`, `CapabilityContract`, or
    `CapabilityMap`.
  - Surfacing does not imply resolver routing,
    verification planning, `RefactorPreservationContract`,
    or source writes.
  - Proof-report surfacing of
    `CapabilityArchitectureLintReport` is **deferred** —
    it is policy-evaluation context, not verification
    proof.

  New contract test
  `tests/contract/capability-architecture-lint-publications.test.mjs`
  (20 assertions). New docs test
  `tests/docs/capability-architecture-lint-publications.test.mjs`
  (10 assertions). Review packet
  `.rekon-dev/review-packets/capability-architecture-lint-publications.md`.
  **No new artifact type. No new CLI command. No version
  bump. No npm publish.** Recommended next slice:
  **CapabilityArchitectureLintReport publication safety
  review**.

- Shipped **CapabilityArchitectureLintReport safety
  review** — thirty-ninth slice on the
  codebase-intel-classic capability-ontology track.
  Strategy / safety-review batch. Read-only end-to-end
  audit of the `CapabilityArchitectureLintReport` v1
  implementation shipped at `0bd7af0`. **Recommendation:
  `CapabilityArchitectureLintReport` v1 is safe / stable
  as a separate evaluation artifact.**

  Reviewed the artifact type shape, factory, validator /
  assert / schema, `buildCapabilityArchitectureLintReport`
  helper, `rekon capability lint architecture` CLI, rule
  evaluation (configured rows only; allowed/forbidden
  layer + system; system rules `not-evaluated` when no
  deterministic system field exists), the
  `findingCandidate` preview payload, and the contract /
  docs tests.

  Pinned verbatim:

  - `CapabilityArchitectureLintReport` is evaluation, not
    enforcement.
  - `findingCandidate` is preview-only and does not write
    `FindingReport`.
  - `CapabilityArchitectureLintReport` does not mutate
    `FindingFilterReport`, `FindingLifecycleReport`, or
    `CoherencyDelta`.
  - `CapabilityArchitectureLintReport` does not implement
    resolver routing, verification planning,
    `RefactorPreservationContract`, or source writes.
  - The next slice may surface
    `CapabilityArchitectureLintReport` in publications,
    but must not bridge to findings yet.

  Four options evaluated; declare v1 safe / stable +
  publication surfacing next selected; finding bridge and
  resolver routing rejected/deferred. New strategy memo
  `docs/strategy/capability-architecture-lint-report-safety-review.md`
  with 12 required headings + 4 required tables (surface /
  rule / boundary / option). New 13-assertion docs test.
  Review packet
  `.rekon-dev/review-packets/capability-architecture-lint-report-safety-review.md`.
  **No runtime behavior changes. No source files under
  `packages/` modified. No new artifact type. No new CLI
  command. No FindingReport / FindingFilterReport /
  FindingLifecycleReport / CoherencyDelta mutation. No
  CapabilityContract / CapabilityMap mutation. No npm
  publish. No version bump.** Recommended next slice:
  **CapabilityArchitectureLintReport publication
  surfacing**.

- Shipped **CapabilityArchitectureLintReport v1** —
  thirty-eighth slice on the codebase-intel-classic
  capability-ontology track. New evaluation artifact
  + producer + CLI implementing the Capability-Aware
  Architecture Linting Decision.

  - New artifact type:
    `CapabilityArchitectureLintReport` (schemaVersion
    `0.1.0`, stability `experimental`). Registered in
    `@rekon/sdk` artifact type list and
    `@rekon/runtime` artifact category map (under
    `findings` for directory layout; **does not**
    mutate governed-findings pipeline artifacts).
  - New types and validator in
    `@rekon/kernel-repo-model`:
    `CapabilityArchitectureLintStatus`,
    `CapabilityArchitectureLintRule`,
    `CapabilityArchitectureLintSeverity`,
    `CapabilityArchitectureLintConfidence`,
    `CapabilityArchitectureLintRow`,
    `CapabilityArchitectureLintReport`,
    `createCapabilityArchitectureLintReport`,
    `validateCapabilityArchitectureLintReport`,
    `assertCapabilityArchitectureLintReport`,
    `capabilityArchitectureLintReportSchema`.
  - New helper
    `buildCapabilityArchitectureLintReport` in
    `@rekon/capability-model`. Evaluates configured
    `CapabilityContract` rows against the matched
    phrase-backed `CapabilityMap` v2 capability.
  - New CLI command
    `rekon capability lint architecture
    [--capability-contract <id|type:id>]
    [--capability-map <id|type:id>] [--root <path>]
    [--json]`.

  V1 evaluation scope:

  - `allowed-layer` / `forbidden-layer`: emit
    `pass` / `violation` / `not-evaluated`.
  - `allowed-system` / `forbidden-system`: emit
    `not-evaluated` (no deterministic system field
    on phrase-backed capabilities yet).

  Deferred to later slices:
  `requiredNeighbors`, `forbiddenNeighbors`,
  `preservationRules`. `requiredChecks` is reserved
  as a row kind but not evaluated.

  Pinned verbatim boundary invariants:

  - `CapabilityArchitectureLintReport` is
    **evaluation**, not enforcement.
  - V1 does **not** write `FindingReport`.
  - V1 does **not** mutate
    `FindingFilterReport`,
    `FindingLifecycleReport`, or `CoherencyDelta`.
  - V1 does **not** mutate `CapabilityContract` or
    `CapabilityMap`.
  - V1 does **not** add resolver routing by
    capability.
  - V1 does **not** add verification planning by
    capability.
  - V1 does **not** add
    `RefactorPreservationContract`.
  - V1 does **not** add source writes.
  - `findingCandidate` on `violation` rows is a
    **preview** payload only; a future explicit
    bridge slice would promote selected rows through
    the finding lifecycle.

  New docs:
  `docs/artifacts/capability-architecture-lint-report.md`
  and
  `docs/concepts/capability-aware-architecture-linting.md`.
  Supporting docs cross-referenced (capability-
  contract artifact + concept, capability-map
  artifact, capability-phrase-report artifact,
  capability-aware architecture linting decision,
  finding-report artifact, finding-lifecycle
  concept, graph-aware finding filters concept,
  coherency-delta concept, capability-ontology
  concept, roadmap, classic-behavior-roadmap).

  New review packet
  `.rekon-dev/review-packets/capability-architecture-lint-report-v1.md`.
  Recommended next slice:
  **CapabilityArchitectureLintReport safety review**.

- Shipped **Capability-Aware Architecture Linting
  Decision** — thirty-seventh slice on the
  capability-ontology track. Strategy / architecture
  decision memo only. **Recommendation: select
  Option B — emit a separate
  `CapabilityArchitectureLintReport` artifact from
  `CapabilityContract` + `CapabilityMap` v2.** v1
  scope (when the next slice ships): evaluate
  `allowedLayers` / `forbiddenLayers` /
  `allowedSystems` / `forbiddenSystems` over the
  **configured** rows of the latest
  `CapabilityContract`. `requiredChecks` may
  optionally surface as `not-evaluated` /
  `unverified` rows. `requiredNeighbors`,
  `forbiddenNeighbors`, and `preservationRules`
  evaluation is deferred. Five options evaluated;
  Option B selected because it crosses into
  evaluation without crossing into finding
  emission, lifecycle mutation, remediation,
  routing, verification, or source writes — each of
  which deserves its own decision + safety review
  pair.

  Pinned verbatim:
    - Capability-aware architecture linting is
      evaluation, not source mutation.
    - `CapabilityArchitectureLintReport` is not
      `FindingReport` in v1.
    - `CapabilityArchitectureLintReport` does not
      mutate `FindingLifecycleReport` or
      `CoherencyDelta`.
    - `CapabilityArchitectureLintReport` does not
      implement resolver routing or verification
      planning.
    - Only a later explicit bridge may promote lint
      rows into governed findings.

  Implementation sequence: (2)
  `CapabilityArchitectureLintReport` v1 — register
  artifact + helper + CLI; no `FindingReport`
  mutation. (3) v1 safety review. (4) publication
  surfacing. (5) publication safety review. (6)
  lint row → `FindingReport` bridge decision memo.
  (7) bridge implementation. (8) downstream
  consumer decisions (`WorkOrder`,
  `VerificationPlan`, resolver routing). (9)
  `RefactorPreservationContract`.

  New strategy memo
  `docs/strategy/capability-aware-architecture-linting-decision.md`
  with 12 required headings + 4 required tables
  (option / scope / boundary / future bridge). New
  15-assertion docs test
  `tests/docs/capability-aware-architecture-linting-decision.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-aware-architecture-linting-decision.md`.
  **No runtime behavior changes. No source files
  under `packages/` modified. No artifact
  validator, helper, or CLI command modified. No
  publication surface modified. No FindingReport,
  FindingLifecycleReport, or CoherencyDelta
  mutation. No CapabilityMap mutation. No
  CapabilityPhraseReport mutation. No
  CapabilityContract mutation. No
  `.rekon/capability-contracts.json` mutation. No
  npm publish. No version bump.**

- Shipped **CapabilityContract publication safety
  review** — thirty-sixth slice on the
  capability-ontology track. Strategy /
  safety-review batch. Read-only end-to-end audit
  of the `CapabilityContract` publication
  surfacing shipped at `ebf8b56`. **Recommendation:
  declare publication surfacing safe / stable as
  read-only visibility.** All six required boundary
  statements asserted (publication surfacing is
  read-only visibility; `CapabilityContract` is
  policy, not projection or enforcement; surfacing
  does not imply architecture linting, resolver
  routing, verification planning, finding
  resolution, `RefactorPreservationContract`
  behavior, or source-write permission;
  publications read the latest `CapabilityContract`
  and never generate it; proof report surfacing
  remains deferred because `CapabilityContract` is
  policy context, not verification proof;
  architecture linting decision work may begin
  after this safety review). Five options
  evaluated; capability-aware architecture linting
  decision selected as next slice (strategy /
  decision memo only; no implementation).
  Enforcement consumers (architecture linting,
  resolver routing, verification planning, finding
  resolution, `RefactorPreservationContract`,
  source writes) remain deferred and gated on their
  own decision + safety review pairs. New strategy
  memo
  `docs/strategy/capability-contract-publication-safety-review.md`
  with 11 required headings + 3 required tables
  (surface / boundary / option). New 13-assertion
  docs test
  `tests/docs/capability-contract-publication-safety-review.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-contract-publication-safety-review.md`.
  **No runtime behavior changes. No source files
  under `packages/` modified. No artifact
  validator, helper, or CLI command modified. No
  publication surface modified. No CapabilityMap
  mutation. No CapabilityPhraseReport mutation. No
  `.rekon/capability-contracts.json` mutation. No
  npm publish. No version bump.**

- Shipped **CapabilityContract publication surfacing**
  — thirty-fifth slice on the capability-ontology
  track. The architecture-summary and
  agent-operating-contract publishers now surface
  the latest `CapabilityContract` as a read-only
  **Capability Contracts** section. New pure helper
  `buildCapabilityContractPublicationSection` in
  `@rekon/capability-docs`. New `consumes:
  CapabilityContract` declaration and
  `capability-contract.changed` invalidation rule in
  the publisher manifest. The agent contract carries
  a new `Do Not Do` reminder: *"Do not treat
  CapabilityContract publication surfacing as
  architecture linting, resolver routing,
  verification planning, finding resolution,
  RefactorPreservationContract, or source-write
  permission."* **Read-only:** publications never
  run `rekon capability contract generate`, never
  mutate `CapabilityContract`, never mutate
  `.rekon/capability-contracts.json`, never mutate
  `CapabilityMap`, `CapabilityPhraseReport`, or
  `EvidenceGraph`, and never enforce policy. Proof
  report surfacing remains explicitly deferred —
  `CapabilityContract` is policy context, not
  verification proof. New 19-assertion contract test
  `tests/contract/capability-contract-publications.test.mjs`
  + 11-assertion docs test
  `tests/docs/capability-contract-publications.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-contract-publications.md`.
  **No new permission. No new artifact type. No
  CapabilityContract mutation. No config mutation.
  No npm publish. No version bump.**

- Shipped **CapabilityContract v1 safety review** —
  thirty-fourth slice on the capability-ontology
  track. Strategy / safety-review batch. Read-only
  end-to-end audit of the `CapabilityContract` v1
  artifact, helper, validator, config model, and
  CLI shipped at `63e7b71`. **Recommendation:
  declare v1 safe / stable as an artifact-backed
  policy layer.** All seven required boundary
  statements asserted (CapabilityContract is policy,
  not projection; CapabilityMap v2 remains
  projection; configured + unmatched rows only;
  suggested remains reserved; no architecture
  linting, resolver routing, verification planning,
  source writes, or RefactorPreservationContract
  behavior; next slice may surface
  CapabilityContract in publications but must not
  create policy enforcement). Four options evaluated;
  publication surfacing selected as next slice
  (read-only visibility in architecture summary +
  agent contract on the same model used by the
  CapabilityMap v2 publication safety review).
  Enforcement consumers (architecture linting,
  resolver routing, verification planning, source
  writes, `RefactorPreservationContract`) remain
  deferred and gated on their own decision + safety
  review pairs. New strategy memo
  `docs/strategy/capability-contract-v1-safety-review.md`
  with 11 required headings + 4 required tables
  (surface / matching / boundary / option). New
  13-assertion docs test
  `tests/docs/capability-contract-v1-safety-review.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-contract-v1-safety-review.md`.
  **No runtime behavior changes. No source files
  under `packages/` modified. No artifact validator,
  helper, or CLI command modified. No publication
  surface modified. No CapabilityMap mutation. No
  CapabilityPhraseReport mutation. No
  `.rekon/capability-contracts.json` mutation. No
  npm publish. No version bump.**

- Shipped **CapabilityContract v1 implementation**
  — thirty-third slice on the capability-ontology
  track. Registers `CapabilityContract` as a typed
  artifact in `@rekon/kernel-repo-model` (types +
  `createCapabilityContract` +
  `validateCapabilityContract` +
  `assertCapabilityContract` +
  `capabilityContractSchema`), in the SDK
  `BUILT_IN_ARTIFACT_TYPES`, and in the runtime
  `ARTIFACT_CATEGORY_BY_TYPE` map (category
  `actions`). Ships `buildCapabilityContract` in
  `@rekon/capability-model` plus the
  `rekon capability contract generate
  [--root <path>] [--json]
  [--capability-map <id|type:id>]` CLI. Reads the
  latest (or specified) `CapabilityMap` v2 +
  optional `.rekon/capability-contracts.json` and
  emits the effective contract artifact. V1 emits
  **`configured`** + **`unmatched`** rows only;
  `suggested` reserved for future. Match is
  conjunctive (`verb` + `noun` required;
  `domain` / `pattern` / `layer` checked when
  populated); most-specific match wins; ties
  break by phrase-backed id asc. Citation chain
  (`CapabilityContract` → `CapabilityMap` →
  `CapabilityPhrase` → `EvidenceGraph`)
  preserved on every configured row. **Diagnostic
  only — no architecture linting, no resolver
  routing by capability, no verification planning
  by capability, no source mutation, no config
  mutation.** No publication surfacing yet. New
  artifact reference
  `docs/artifacts/capability-contract.md` +
  concept doc
  `docs/concepts/capability-contracts.md`.
  20-assertion contract test
  `tests/contract/capability-contract.test.mjs` +
  21-assertion docs test
  `tests/docs/capability-contract.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-contract-v1.md`.
  **No CapabilityMap mutation. No
  CapabilityPhraseReport mutation. No source
  mutation. No config mutation. No npm publish.
  No version bump.**

- Shipped **CapabilityContract Architecture
  Decision** — strategy / architecture decision
  memo. Thirty-second slice on the
  capability-ontology track. Commits Rekon to
  **Option B**: `CapabilityContract` is an
  artifact-backed policy layer generated from
  operator config + the latest `CapabilityMap` v2.
  Decision memo only — **no implementation, no
  artifact registration, no producer or helper
  shipped**.

  Pinned verbatim:

    - `CapabilityContract` is policy, not
      projection.
    - `CapabilityMap` v2 remains projection and
      must not grow policy fields.
    - `CapabilityContract` does not implement
      architecture linting by itself.
    - `CapabilityContract` does not implement
      resolver routing by capability.
    - `CapabilityContract` does not implement
      verification planning by capability.
    - `CapabilityContract` does not implement
      source writes.
    - `RefactorPreservationContract` remains
      phase-specific and comes later.

  Decision details:

    - Five options evaluated; **Option B**
      (config + artifact effective contract)
      selected. Operator config at
      `.rekon/capability-contracts.json`
      expresses policy; Rekon emits a
      `CapabilityContract` artifact citing the
      latest `CapabilityMap` v2 (and, when
      present, `CapabilityPhraseReport`).
    - Config sketch: `match { verb, noun,
      domain?, pattern?, layer? }`,
      `allowedLayers[]`, `forbiddenLayers[]`,
      `allowedSystems[]`,
      `forbiddenSystems[]`, `requiredChecks[]`,
      `requiredNeighbors[]`,
      `forbiddenNeighbors[]`,
      `preservationRules[]`. Missing config
      allowed. No inferred contract is binding
      without explicit operator authorisation.
    - Artifact sketch: `header` + `source` +
      `summary` + `contracts[]` with
      `capabilityRef.capabilityMapRef` +
      `capabilityRef.phraseCapabilityId` +
      `status` (`configured` / `suggested` /
      `unmatched`). V1 emits only
      `configured` + `unmatched`; `suggested` is
      deferred until a suggestion / review
      workflow ships.
    - Citation chain runs back through
      `CapabilityMap.phraseBackedCapabilities[i].phraseRef`
      → `CapabilityPhrase` →
      `CapabilityNormalizationReportCandidate` →
      `EvidenceGraph` fact, fully walkable.
    - Manifest invalidation rules planned:
      `capability-contracts.changed` (config) +
      `capability-map.changed` (artifact). Both
      ship with the v1 implementation slice.
    - No new permission. No `write:source`. No
      `write:rules`. The future producer holds
      `read:artifacts` + `write:artifacts`
      only.
    - All future consumers — architecture
      linting, resolver routing by capability,
      verification planning by capability,
      semantic impact, refactor preservation,
      agent contract / architecture summary
      publications — are **deferred** until the
      contract artifact exists and passes safety
      review. Each consumer ships its own
      decision memo.

  Boundary preserved:

    - `CapabilityMap` v2 stays as projection
      (the `CapabilityMap` v2 safety review
      pinned this).
    - `CapabilityPhraseReport` stays as
      semantic purpose projection.
    - `CapabilityNormalizationReport` stays as
      translation audit.
    - `RefactorPreservationContract` is
      phase-specific and inherits
      `preservationRules` from
      `CapabilityContract`.

  No implementation in this batch. No
  `CapabilityContract` artifact / type / helper
  shipped. No `CapabilityMap` mutation. No
  `CapabilityPhraseReport` /
  `CapabilityNormalizationReport` /
  `EvidenceGraph` mutation. No architecture
  linting. No resolver routing. No verification
  planning. No source writes. No LLM-only
  inference. No new artifact type. No new
  invalidation rule. No npm publish. No version
  bump. No git tag. No GitHub Release. No new
  branch.

  New strategy memo
  `docs/strategy/capability-contract-architecture-decision.md`.
  New 16-assertion docs test
  `tests/docs/capability-contract-architecture-decision.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-contract-architecture-decision.md`.

  Recommended next slice: **`CapabilityContract`
  v1 implementation** — register the artifact
  type in `@rekon/kernel-repo-model` + SDK +
  runtime; ship a producer that reads
  `.rekon/capability-contracts.json` (when
  present) and the latest `CapabilityMap` v2 and
  emits the effective contract artifact. Emits
  `configured` + `unmatched` rows only. No
  publication surfacing yet. No linting /
  routing / verification / writes.

- Shipped **CapabilityMap v2 publication safety
  review** — read-only audit of the publication
  surfacing committed by the thirtieth slice.
  Thirty-first slice on the capability-ontology
  track. Strategy / safety review / docs / tests-
  only batch.

  Pinned verbatim:

    - `CapabilityMap` v2 publication surfacing is
      read-only visibility.
    - `CapabilityMap` v2 phrase-backed capabilities
      are projection context, not
      `CapabilityContract` policy.
    - `CapabilityMap` v2 phrase-backed capabilities
      do not imply resolver routing, architecture
      linting, verification planning,
      source-write permission, or finding
      resolution.
    - Proof report surfacing remains deferred
      because `CapabilityMap` v2 is semantic
      projection, not verification proof.
    - `CapabilityContract` decision work may begin
      after this safety review if no blockers are
      found.

  Review findings:

    - **Recommendation: publication surfacing is
      safe / stable as read-only visibility. No
      blockers.**
    - Helper is pure (no `fs.write*`,
      `artifacts.write`, `spawn*`, LLM, or
      network call); both publishers are
      strictly read-only over `CapabilityMap` and
      every upstream artifact.
    - Boundary statement rendered in every
      shipped surface (architecture summary at
      level 2; agent contract at level 3) and
      emitted even when v2 fields are absent.
    - Agent contract `Do Not Do` reminder covers
      `CapabilityContract` policy, resolver
      routing authority, architecture lint
      findings, verification requirements, and
      source-write permission. Finding resolution
      noted as a low-priority follow-up (no
      current surface links v2 to findings).
    - Proof report deferral remains correct;
      enforced by the existing contract test +
      proof-report concept + artifact reference.
    - Four options evaluated: declare surfacing
      safe / stable (selected);
      `CapabilityContract` decision next
      (selected); more publication polish first
      (deferred — no blocker); resolver routing
      next (rejected — needs
      `CapabilityContract` first).

  New strategy memo
  `docs/strategy/capability-map-v2-publication-safety-review.md`.
  New 13-assertion docs test
  `tests/docs/capability-map-v2-publication-safety-review.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-map-v2-publication-safety-review.md`.

  No runtime changes. No publisher mutation. No
  `CapabilityMap` mutation. No
  `CapabilityPhraseReport` /
  `CapabilityNormalizationReport` /
  `EvidenceGraph` mutation. No
  `CapabilityContract` artifact / type / helper
  introduced. No architecture linting. No
  resolver routing. No verification planning. No
  source writes. No LLM-only inference. No npm
  publish. No version bump. No git tag. No
  GitHub Release. No new branch.

  Recommended next slice: **`CapabilityContract`
  architecture decision** — strategy / decision
  memo only. Pins policy / placement /
  preservation semantics (allowed layers, allowed
  systems, forbidden layers, required checks,
  required / forbidden neighbouring capabilities,
  preservation rules). No implementation, no
  linting, no routing, no verification planning,
  no source writes.

- Shipped **CapabilityMap v2 publication surfacing**
  — architecture summary and agent contract
  publications now render the additive
  `phraseBackedCapabilities` /
  `phraseBackedSummary` / `phraseSourceRef`
  projection as operator + agent context.
  Thirtieth slice on the capability-ontology
  track. Product / capability batch.

  Pinned verbatim:

    - Architecture summary and agent contract
      surface `CapabilityMap` v2.
    - Proof report surfacing is deferred.
    - Publications read `CapabilityMap` v2 fields.
    - Publications do not mutate `CapabilityMap`.
    - Phrase-backed capabilities are projection
      context, not `CapabilityContract` policy.
    - Phrase-backed capabilities do not imply
      resolver routing, architecture linting,
      verification planning, or source writes.

  Implementation details:

    - New helper
      `buildCapabilityMapV2PublicationSection` in
      `@rekon/capability-docs`. Structurally typed
      input (`CapabilityMapV2Like`); pure function
      (no I/O). Emits a section header
      (`## CapabilityMap v2 Phrase-Backed
      Capabilities` for level 2,
      `### CapabilityMap v2 Phrase-Backed
      Capabilities` for level 3), the
      `CapabilityMap` ref, the
      `CapabilityPhraseReport` ref
      (`phraseSourceRef`), summary counts
      (`total`, `withDomain`, `withPattern`,
      `withLayer`), optional top-verb / top-noun
      lines, an explicit boundary statement
      (*"These entries are projection context,
      not CapabilityContract placement policy.
      CapabilityMap v2 does not imply placement
      policy, ownership policy, resolver routing,
      architecture linting, verification
      planning, or source writes."*), a
      proof-report-deferral line, and a bounded
      table (`| Verb | Noun | Domain | Pattern |
      Layer | Evidence |`, capped at 20 rows).
    - Wired into the architecture summary
      publisher and agent contract publisher,
      sitting after the existing Capability
      Phrases section. Both publishers continue
      to cite `CapabilityMap` in
      `header.inputRefs` (already a v1
      requirement).
    - Agent contract `## Do Not Do` list extended
      with: *"Do not treat CapabilityMap v2
      phrase-backed capabilities as
      CapabilityContract policy, resolver routing
      authority, architecture lint findings,
      verification requirements, or source-write
      permission. CapabilityMap v2 phrase-backed
      capabilities are stable capability
      projection; they are not placement policy,
      ownership policy, or source-write
      authority."* The existing
      CapabilityPhraseReport Do-Not-Do entry now
      acknowledges v2 has shipped.
    - Manifest `consumes` already included
      `CapabilityMap`; the `coherency.changed`
      invalidation rule description was tightened
      to mention v2 surfacing.
    - **Proof report surfacing is explicitly
      deferred** (documented in both the proof
      report concept and artifact reference
      docs).
    - New contract test
      `tests/contract/capability-map-v2-publications.test.mjs`
      (16 assertions: helper renders, summary
      counts, bounded table, projection-context
      boundary, no duplication of phrase table,
      agent contract section, stable capability
      projection language, placement-policy
      negation, Do-Not-Do reminder, no
      `CapabilityMap` / `CapabilityPhraseReport`
      / `CapabilityNormalizationReport` /
      `EvidenceGraph` mutation, proof-report
      deferral, artifacts validate clean).
    - New 9-assertion docs test
      `tests/docs/capability-map-v2-publications.test.mjs`.
    - Updated 9 supporting docs (capability-map,
      capability-phrase-report, capability-ontology
      concept, architecture-summary publication
      artifact + concept, agent-contract
      publication + agent-operating-contract
      concept, proof-report publication + concept,
      decision memo, safety review, roadmaps).
    - Review packet
      `.rekon-dev/review-packets/capability-map-v2-publications.md`.

  No runtime changes outside the new publication
  helper. No `CapabilityMap` mutation. No
  `CapabilityPhraseReport` /
  `CapabilityNormalizationReport` / `EvidenceGraph`
  mutation. No `CapabilityContract`. No resolver
  routing by capability. No architecture linting.
  No verification planning by capability. No source
  writes. No LLM-only inference. No new artifact
  type. No new invalidation rule (the existing
  `coherency.changed` rule already covers
  `CapabilityMap` changes). No npm publish. No
  version bump. No git tag. No GitHub Release. No
  new branch.

  Recommended next slice: **`CapabilityMap` v2
  publication safety review** — read-only audit of
  the publication surfacing (boundary statements,
  read-only guarantee, proof-report deferral).

- Shipped **CapabilityMap v2 safety review** —
  read-only audit of the additive
  `phraseBackedCapabilities` /
  `phraseBackedSummary` / `phraseSourceRef`
  projection committed by the previous slice.
  Twenty-ninth slice on the capability-ontology
  track. Strategy / safety review / docs / tests-
  only batch.

  Pinned verbatim:

    - `CapabilityMap` v2 is additive; existing
      `entries[]` remain valid.
    - `CapabilityMap` v2 consumes
      `CapabilityPhraseReport`, not raw
      `CapabilityNormalizationReport` rows.
    - Partial phrases are excluded from
      `phraseBackedCapabilities`.
    - `CapabilityMap` v2 is not `CapabilityContract`.
    - `CapabilityMap` v2 does not imply placement
      policy, ownership policy, resolver routing,
      architecture linting, verification planning,
      or source writes.

  Review findings:

    - **Recommendation: safe / stable as additive
      high-confidence projection. No blockers.**
    - Projection path reviewed end-to-end:
      `CapabilityPhraseReport` →
      `buildPhraseBackedCapabilityMapAdditions`
      helper → `CapabilityMap`. Each step's
      boundary holds.
    - Eligibility filter enforced at three layers
      (helper guard, validator guard, TypeScript
      literal types). Raw normalization rows
      cannot leak into v2.
    - Citation chain is complete and walkable
      (entry → phrase → candidate → fact).
    - Freshness model sufficient
      (`capability-phrases.changed` invalidation
      rule + digest tracking on `inputRefs`).
    - Boundary preservation: v1 `entries[]`
      compatibility, projection vs policy, no
      source writes — all hold.
    - Five options evaluated: declare v2 safe /
      stable selected; publication surfacing
      selected as next slice; `CapabilityContract`
      deferred; resolver routing deferred; more
      dogfood before surfacing deferred (the
      implementation smoke + tests are sufficient
      gate for visibility-only surfacing).

  New strategy memo
  `docs/strategy/capability-map-v2-safety-review.md`.
  New 14-assertion docs test
  `tests/docs/capability-map-v2-safety-review.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-map-v2-safety-review.md`.

  No runtime changes. No `CapabilityMap` mutation.
  No `EvidenceGraph` / `CapabilityNormalizationReport`
  / `CapabilityPhraseReport` mutation. No
  `CapabilityContract`. No architecture linting.
  No resolver routing. No verification planning.
  No source writes. No LLM-only inference. No npm
  publish. No version bump. No git tag. No GitHub
  Release. No new branch.

  Recommended next slice: **`CapabilityMap` v2
  publication surfacing** — extend
  `@rekon/capability-docs` with a
  `buildCapabilityMapV2PublicationSection` (or
  equivalent) helper, wire it into the
  architecture summary + agent contract
  publishers, contract + docs tests, cite this
  safety review as the gate.

- Shipped **CapabilityMap v2 high-confidence-only
  implementation** — additive projection wired into
  the `@rekon/capability-model` producer. Twenty-eighth
  slice on the capability-ontology track. Implements
  the v2 shape committed to by the previous slice's
  decision memo.

  Pinned verbatim:

    - `CapabilityMap` v2 consumes
      `CapabilityPhraseReport`, not raw
      `CapabilityNormalizationReport` rows.
    - Only stable high-confidence
      `CapabilityPhrase` claims are eligible for
      `CapabilityMap` v2.
    - Partial phrases remain semantic context and
      are not `CapabilityMap`-ready ownership or
      placement policy.
    - `CapabilityMap` v2 is not `CapabilityContract`.
    - `CapabilityMap` v2 is additive and existing
      `CapabilityMap` fields remain valid.
    - `CapabilityMap` should be stale when the
      consumed `CapabilityPhraseReport` changes.

  Implementation details:

    - `CapabilityMap` gains three optional fields:
      `phraseBackedCapabilities?`,
      `phraseBackedSummary?`, `phraseSourceRef?`.
      v1 `entries[]` is unchanged and continues to
      validate.
    - `@rekon/capability-model` projector now reads
      the latest `CapabilityPhraseReport` (when
      present), filters phrases conjunctively
      (`status === "stable"` and
      `confidence === "high"` and non-empty
      `verb` / `noun` / `evidenceRefs` /
      `sourceCandidateIds`), and emits the
      additive v2 fields.
    - Deterministic ordering: verb asc, noun asc,
      id asc. Summary record keys
      (`byVerb` / `byNoun`) sorted alphabetically.
    - Entries carry deterministic IDs
      `capability-phrase:<phraseId>`. Each entry
      cites its source phrase via
      `phraseRef.report` + `phraseRef.phraseId`.
      The top-level `phraseSourceRef` mirrors the
      consumed report ref. `CapabilityMap.header.inputRefs`
      includes the consumed phrase report.
    - Manifest invalidation rule
      `capability-phrases.changed` consumes
      `CapabilityPhraseReport`. Absence of a
      `CapabilityPhraseReport` is benign — the
      projector emits a clean v1-shape
      `CapabilityMap`.
    - New artifact reference doc
      `docs/artifacts/capability-map.md`.
    - Validator: optional v2 fields are validated
      when present (non-empty `evidenceRefs`,
      non-empty `sourceCandidateIds`, literal
      `confidence: "high"` and `status: "stable"`).
    - `@rekon/capability-model` does **not** depend
      on `@rekon/capability-ontology`. The
      phrase-backed helper uses structural typing
      (`PhraseReportLike`) against the documented
      phrase-report JSON shape.

  No `EvidenceGraph` mutation. No
  `CapabilityNormalizationReport` mutation. No
  `CapabilityPhraseReport` mutation. No existing
  v1 `entries[]` field removed, renamed, or
  changed in behaviour. No partial-phrase
  consumption. No low-confidence-phrase
  consumption. No raw normalization row
  consumption. No `CapabilityContract`. No
  `RefactorPreservationContract`. No architecture
  linting. No resolver routing. No verification
  planning. No source writes. No LLM-only
  inference. No npm publish. No version bump. No
  git tag. No GitHub Release. No new branch.

- Shipped **CapabilityMap v2 high-confidence-only
  decision** — strategy / architecture decision memo.
  Twenty-seventh slice on the capability-ontology
  track. Commits Rekon to an **additive**
  `CapabilityMap` v2 projection consuming **only
  stable high-confidence** `CapabilityPhraseReport`
  claims. Implements the recommendation from the
  Post-AST Cohort Re-Run.

  Pinned verbatim:

    - `CapabilityMap` v2 consumes
      `CapabilityPhraseReport`, not raw
      `CapabilityNormalizationReport` rows.
    - Only stable high-confidence
      `CapabilityPhrase` claims are eligible for
      `CapabilityMap` v2.
    - Partial phrases remain semantic context and
      are not `CapabilityMap`-ready ownership or
      placement policy.
    - `CapabilityMap` v2 is not `CapabilityContract`.
    - `CapabilityMap` v2 is additive and existing
      `CapabilityMap` fields remain valid.
    - `CapabilityMap` should be stale when the
      consumed `CapabilityPhraseReport` changes.

  Decision details:

    - Five options evaluated; **Option B (additive
      stable-phrase-backed v2)** selected.
    - Section name: **`phraseBackedCapabilities`**
      (not `normalizedCapabilities` — the map
      projects phrases, not normalization rows).
    - Eligibility (conjunctive): phrase
      `status === "stable"`, `confidence === "high"`,
      `evidenceRefs` non-empty, `sourceCandidateIds`
      non-empty, verb + noun present,
      canonical-vocabulary lookup succeeds.
    - Additive shape sketched but **not
      implemented** in this batch: optional
      `phraseBackedCapabilities?` /
      `phraseBackedSummary?` / `phraseSourceRef?`
      on `CapabilityMap`. v1 `entries[]` stays
      untouched.
    - Freshness: new `capability-phrases.changed`
      invalidation rule (implementation manifest)
      so `CapabilityMap` is stale when the upstream
      phrase report changes. Stale phrase report
      treated as missing for v2 emission.
    - Citation chain: `CapabilityMap` v2 entry →
      `CapabilityPhrase` →
      `CapabilityNormalizationReport` candidate →
      `EvidenceGraph` fact is fully walkable.

  `CapabilityContract` boundary explicitly pinned:
  v2 surfaces capabilities (read-only projection);
  `CapabilityContract` (future) sets policy
  (required checks, allowed layers, allowed
  neighbours, preservation rules). The two are
  distinct surfaces; this decision does **not**
  create or mutate `CapabilityContract`.

  No `CapabilityMap` implementation in this batch.
  No `CapabilityMap` mutation. No `EvidenceGraph`
  mutation. No `CapabilityNormalizationReport`
  mutation. No `CapabilityPhraseReport` mutation.
  No partial-phrase consumption. No
  `CapabilityContract`. No `RefactorPreservationContract`.
  No architecture linting. No resolver routing. No
  source writes. No LLM-only inference. No
  typechecker dependency. No npm publish. No
  version bump. No git tag. No GitHub Release. No
  new branch.

  Documentation gap noted: `docs/artifacts/capability-map.md`
  does not exist; the implementation slice creates
  it (the artifact reference must reflect the v2
  shape the implementation finalises).

  New strategy memo:
  [`docs/strategy/capability-map-v2-high-confidence-decision.md`](docs/strategy/capability-map-v2-high-confidence-decision.md)
  with 11 required headings + 4 required tables
  (evidence / option / eligibility / boundary).
  New 16-assertion docs test
  `tests/docs/capability-map-v2-high-confidence-decision.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-map-v2-high-confidence-decision.md`.

  Recommended next slice: **`CapabilityMap` v2
  high-confidence-only implementation** — extends
  the `CapabilityMap` type in
  `@rekon/kernel-repo-model`, updates
  `@rekon/capability-model` to read the latest
  `CapabilityPhraseReport` and emit the additive
  section, adds the `capability-phrases.changed`
  invalidation rule, ships contract tests, and
  creates `docs/artifacts/capability-map.md`.

- Shipped **Post-AST Cohort Re-Run** — strategy /
  dogfood-analysis batch. Twenty-sixth slice on the
  capability-ontology track. Fifth coverage review
  on the phrase track. Completes the cohort intake
  request that the twenty-fifth slice deferred:
  measured AST extraction's impact on
  `CapabilityNormalizationReport` candidate quality
  and `CapabilityPhraseReport` stable phrase
  density on the two real-repo cohort targets
  (`target-1`, `target-2`) using anonymized labels
  only.

  Pinned verbatim:

    - Real cohort targets were re-run.
    - AST improved stable phrase density on a real
      repo.
    - `CapabilityMap` v2 is evidence-gated.
    - Partial phrases alone do not justify
      `CapabilityMap` v2.

  Headline numbers (post-AST, real repos):

    - **target-1** (Next.js TS scale): 10,331 facts
      (9,653 AST = 93.4%, 0 regex-fallback), 9,327
      candidates, 299 normalized, **37 stable
      phrases**, 260 partial, 0 low-confidence.
      Stable pairs include `get:response` (14),
      `build:plan` (13), `get:schema` (12),
      `get:session` (10), `save:response` (8),
      `build:report` (8) — textbook capability
      phrases.
    - **target-2** (small TS + workflows): 587
      facts (404 AST = 68.8%, 0 regex-fallback),
      406 candidates, 12 normalized, 2 stable
      (unchanged from pre-AST baseline), 10
      partial. Stable pair: `test:session` (2).

  Pre/post lift (real repos):

    - target-1 stable phrases: 16 → 37
      (**+131.3%, 2.3× lift**).
    - target-1 normalized: 241 → 299 (+24.1%).
    - target-1 total phrases: 239 → 297 (+24.3%).
    - target-2: candidates / normalized / stable /
      total all neutral (no lift, no regression).

  CapabilityMap readiness:

    - Seven gates evaluated. Six pass. The
      "consistent across more than one real repo"
      gate is partial (one strong positive, one
      neutral, no regression).
    - The memo explicitly invokes the readiness
      gate's narrower-evidence escape clause.
    - **`CapabilityMap` v2 design is ready to
      begin.**

  Options considered:

    - `CapabilityMap` v2 high-confidence-only
      decision memo → **selected as primary next
      slice.**
    - `CapabilityNormalizationReport` AST-metadata
      candidate integration → selected as parallel
      polish lane (consume `symbolKind` /
      `exportKind` in the candidate extractor /
      splitter to reduce unknown-verb /
      unknown-noun counts).
    - JS/TS AST Provider v2 construct coverage →
      deferred.
    - More dogfood (third real repo) → deferred.
    - Canon-pack expansion v2 → deferred.

  Privacy: deliverables use anonymized `target-1`
  / `target-2` labels only. No private repo names
  appear in any artifact.

  No runtime change. No AST extraction change. No
  normalizer change. No phrase projection change.
  No canon-pack change. No `CapabilityMap`
  mutation. No `EvidenceGraph` mutation. No
  `CapabilityNormalizationReport` mutation. No
  `CapabilityPhraseReport` mutation. No new
  artifact registration. No new CLI command. No
  source writes. No LLM-only inference. No
  typechecker dependency. No npm publish. No
  version bump. No git tag. No GitHub Release. No
  new branch.

  New strategy memo:
  [`docs/strategy/post-ast-cohort-rerun.md`](docs/strategy/post-ast-cohort-rerun.md)
  with 15 required headings + 7 required tables
  (target / EvidenceGraph / normalization / phrase
  / pre-post comparison / readiness / option). New
  15-assertion docs test
  `tests/docs/post-ast-cohort-rerun.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/post-ast-cohort-rerun.md`.

  Recommended next slice: **`CapabilityMap` v2
  high-confidence-only decision memo** — strategy
  memo that pins `status === "stable"` +
  `confidence === "high"` as the only eligibility
  criterion for `CapabilityMap` v2 projection,
  selects the v2 shape additively over the
  existing v1 projection, and pins no source
  writes / no LLM-only inference / no
  `EvidenceGraph` mutation.

- Shipped **Post-AST CapabilityPhraseReport Coverage
  Review** — strategy / dogfood-analysis batch.
  Twenty-fifth slice on the capability-ontology
  track. Fourth coverage review on the phrase track.
  Measures AST extraction impact on
  `CapabilityNormalizationReport` candidate quality
  and `CapabilityPhraseReport` stable phrase density
  on available targets. Explicitly accepts narrower
  evidence; issues an intake request for the cohort
  re-run.

  Pinned verbatim:

    - AST extraction was measured.
    - Stable phrase density materially improved on
      the AST fixture.
    - `CapabilityMap` v2 is evidence-gated.
    - Partial phrases alone do not justify
      `CapabilityMap` v2.

  Headline numbers (post-AST):

    - `tests/fixtures/js-ts-ast-evidence`: 80 facts
      (56 AST, 0 regex-fallback), 66 candidates,
      8 normalized, **6 stable phrases**, 2 partial,
      0 low-confidence. Stable pairs: `create:user`,
      `fetch:user`, `handle:request`. Publications
      surface every phrase with verb/noun/status/
      confidence/evidence.
    - `examples/simple-js-ts`: 5 facts (2 AST), 4
      candidates, 0 normalized, 0 stable. Unchanged
      from pre-AST baseline; the fixture is too
      small (1 file, 1 export) to exercise AST
      richness; the AST-vs-regex agreement is the
      expected signal.
    - `target-1` and `target-2`: **unavailable in
      this session.** Pre-AST baseline (`target-1`:
      9,110 candidates / 241 normalized / 16
      stable; `target-2`: 408 candidates / 12
      normalized / 2 stable) recorded for context;
      no post-AST comparison possible without
      re-running. Intake request issued inside the
      memo.

  CapabilityMap readiness:

    - Seven gates evaluated; six pass; the
      "consistent across more than one real repo"
      gate fails because target-1 / target-2 were
      not measurable this session.
    - `CapabilityMap` v2 design remains deferred.
      Cohort re-run is the primary next slice.

  Options considered:

    - `CapabilityMap` v2 high-confidence-only →
      deferred (real-repo evidence missing).
    - Normalization consumes AST metadata (extend
      candidate extractor to use `symbolKind` /
      `exportKind`) → selected as parallel polish
      lane.
    - Phrase projection consumes AST metadata →
      deferred.
    - JS/TS AST Provider v2 construct coverage →
      deferred (wait for real-repo evidence).
    - More dogfood (post-AST cohort re-run) →
      selected as primary next slice.

  No runtime change. No AST extraction change. No
  normalizer change. No phrase projection change.
  No canon-pack change. No `CapabilityMap` mutation.
  No `EvidenceGraph` mutation. No
  `CapabilityNormalizationReport` mutation. No
  `CapabilityPhraseReport` mutation. No new artifact
  registration. No new CLI command. No source
  writes. No LLM-only inference. No typechecker
  dependency. No npm publish. No version bump. No
  git tag. No GitHub Release. No new branch.

  New strategy memo:
  [`docs/strategy/post-ast-capability-phrase-coverage-review.md`](docs/strategy/post-ast-capability-phrase-coverage-review.md)
  with 11 required headings + 7 required tables
  (target / EvidenceGraph / normalization / phrase /
  pre-post comparison / readiness / option). New
  15-assertion docs test
  `tests/docs/post-ast-capability-phrase-coverage-review.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/post-ast-capability-phrase-coverage-review.md`.

  Recommended next slice: **Post-AST cohort re-run**
  — re-execute the `refresh + normalize + phrase
  project + publish + validate` matrix against
  `target-1` and `target-2` once those targets are
  available. Gates `CapabilityMap` v2 design.

- Shipped **JS/TS AST EvidenceGraph Provider v1** —
  runtime implementation slice. Twenty-fourth slice on
  the capability-ontology track. Upgrades
  `@rekon/capability-js-ts` so JS/TS evidence
  extraction uses the **TypeScript compiler parser
  API** as the primary extraction path. Regex
  extraction is preserved as **fallback only**.
  Implements the JS/TS AST Evidence Adapter Decision.

  Pinned verbatim:

    - JS/TS AST extraction is primary where available.
    - Regex extraction is fallback only.
    - The selected parser is the TypeScript compiler
      parser API.
    - V1 is parser-only; typechecker semantics are
      deferred.
    - AST facts use `extractionMethod: "ast"`.
    - Fallback facts use `extractionMethod:
      "regex-fallback"`.
    - Call graph is deferred.
    - `EvidenceGraph` remains the repo-agnostic
      protocol.
    - AST v1 should improve
      `CapabilityNormalizationReport` candidate
      quality.
    - AST v1 may improve `CapabilityPhraseReport`
      stable phrase density.
    - AST v1 does not mutate `CapabilityMap`.

  Implementation details:

    - New `packages/capability-js-ts/src/ast-extractor.ts`
      module. Parses with `ts.createSourceFile` +
      `ts.forEachChild`. No Program, no typechecker,
      no `tsconfig` resolution. Emits typed records
      (`AstSymbolRecord`, `AstExportRecord`,
      `AstImportRecord`).
    - `packages/capability-js-ts/src/index.ts`
      rewires the per-file pipeline: AST-first,
      regex-fallback on parser failure. AST facts
      include `extractionMethod`, `language`,
      `syntaxKind`, `symbolKind` / `exportKind` /
      `importKind`, `confidence`. Regex-fallback
      facts include `extractionMethod`, `language`,
      `confidence` and stay marked as fallback.
    - `typescript: ^5.4.5` added to
      `@rekon/capability-js-ts` `dependencies`.
    - Existing fact kinds (`file`, `import`,
      `export`, `symbol`, `ownership_hint`,
      `capability_hint`) unchanged. AST v1 enriches
      `value` payloads with additive optional fields.
    - Dedupe semantics preserved: `export` /
      `symbol` value omits `location` (matches
      legacy regex behaviour); `import` value
      retains `location` + legacy `line`.
    - `__extractRegexFallbackFactsForTesting`
      exported as `@internal` for contract tests.

  Construct coverage in v1: function declarations,
  class declarations, class methods, arrow-function
  assignments, function-expression assignments,
  interface declarations, type aliases, enum
  declarations, named exports, default exports,
  re-exports (`export { x }` + `export * from` +
  `export * as alias from`), type-only imports +
  exports, namespace imports, side-effect imports,
  `import equals` (CommonJS-style). Call graph, type
  resolution, symbol references, inferred return
  types, side-effect analysis, JSX component tree,
  test-to-source map, schema inference all deferred.

  New test fixture
  `tests/fixtures/js-ts-ast-evidence/` (7 source
  files + `package.json`). New 25-assertion contract
  test
  `tests/contract/js-ts-ast-evidence-provider.test.mjs`.
  New 9-assertion docs test
  `tests/docs/js-ts-ast-evidence-provider.test.mjs`.
  Existing
  `tests/contract/evidence-export-symbol-facts.test.mjs`
  updated to assert legacy contract fields without
  rejecting additive AST enrichment.

  No `EvidenceGraph` schema mutation. No
  `CapabilityNormalizationReport` mutation. No
  `CapabilityPhraseReport` mutation. No
  `CapabilityMap` mutation. No new fact kinds. No
  new artifact registration. No new CLI command. No
  source writes. No LLM-only inference. No
  typechecker dependency. No npm publish. No version
  bump. No git tag. No GitHub Release. No new
  branch.

  Public API additions (all additive):

    - `@rekon/capability-js-ts` now re-exports
      `AstConfidence`, `AstExportKind`,
      `AstImportKind`, `AstLanguage`, `AstSymbolKind`
      type aliases.
    - `@rekon/capability-js-ts` now declares
      `typescript: ^5.4.5` in `dependencies`.
    - `EvidenceGraph` `import` / `export` / `symbol`
      `value` payloads carry optional
      `extractionMethod`, `language`, `syntaxKind`,
      `symbolKind` / `exportKind` / `importKind`,
      `location`, `confidence` fields. Older
      artifacts validate unchanged.

  Review packet
  `.rekon-dev/review-packets/js-ts-ast-evidence-provider-v1.md`.

  Recommended next slice: **Post-AST
  `CapabilityPhraseReport` Coverage Review** —
  strategy + dogfood-analysis review that measures
  `CapabilityNormalizationReport` candidate quality
  and `CapabilityPhraseReport` stable phrase density
  before / after AST extraction on fixture +
  `target-1` + `target-2`. Decides whether
  `CapabilityMap` v2 design can begin.

- Shipped **JS/TS AST Evidence Adapter Decision** —
  strategy / architecture decision memo. Twenty-third
  slice on the capability-ontology track. Follows the
  Classic Scanner/Ontology Parity Audit and commits
  Rekon to upgrading JS/TS evidence extraction from
  regex-only to AST-backed, using the **TypeScript
  compiler parser API**, **parser-only in v1** (no
  typechecker semantics). Regex remains in place as
  **fallback only**.

  Pinned verbatim:

    - JS/TS AST extraction should be primary where
      available.
    - Regex extraction is fallback only.
    - The selected parser is the TypeScript compiler
      parser API.
    - V1 is parser-only; typechecker semantics are
      deferred.
    - AST facts use `extractionMethod: "ast"`.
    - Fallback facts use `extractionMethod:
      "regex-fallback"`.
    - Call graph is deferred.
    - `EvidenceGraph` remains the repo-agnostic
      protocol.
    - AST v1 should improve
      `CapabilityNormalizationReport` candidate
      quality.
    - AST v1 should improve `CapabilityPhraseReport`
      stable phrase density.
    - AST v1 does not mutate `CapabilityMap`.

  Decision summary:

    - Parser choice: TypeScript compiler parser API
      (`ts.createSourceFile`, `ts.forEachChild`).
      First-party, parses TS / TSX / JS / JSX with
      one API surface, no native compilation step,
      no `tsconfig` resolution required for v1.
    - Parser-only v1 boundary: AST node kinds are
      captured; no typechecker semantics, no cross-
      file type resolution, no call graph.
    - `EvidenceGraph` fact model: existing fact
      kinds (`file`, `import`, `export`, `symbol`,
      `ownership_hint`, `capability_hint`) remain
      unchanged. AST v1 enriches the `value`
      payloads of `symbol` / `export` / `import`
      with proposed additive optional fields:
      `extractionMethod`, `language`, `syntaxKind`,
      `symbolKind`, `exportKind`, `importKind`,
      `location`, `confidence`. Additive only; old
      facts validate; no new fact kind.
    - Construct coverage: function / class / method
      / arrow-function assignment / function-
      expression assignment / interface / type alias
      / enum / named export / default export /
      re-export / type-only import / type-only
      export / namespace import / side-effect
      import are included in v1. Call graph, type
      resolution, symbol references, inferred return
      types, side-effect analysis, JSX component
      tree, test-to-source map, schema inference are
      deferred.
    - Regex fallback policy: regex fires only on AST
      parse failure or unsupported file extension.
      AST facts carry `confidence: "high"`; fallback
      facts carry `confidence: "low"` or `"medium"`.

  Implementation sequence after this decision:

    1. JS/TS AST EvidenceGraph Provider v1 (runtime
       implementation in
       `@rekon/capability-js-ts`).
    2. Post-AST coverage review (fourth coverage
       review on the phrase track).
    3. `CapabilityMap` v2 high-confidence-only
       design decision (gated on post-AST
       coverage).

  No runtime change. No `@rekon/capability-js-ts`
  runtime behavior change. No `EvidenceGraph` schema
  mutation beyond documenting proposed additive
  fields. No `CapabilityNormalizationReport`
  mutation. No `CapabilityPhraseReport` mutation. No
  `CapabilityMap` mutation. No new artifact
  registration. No new CLI command. No source
  writes. No LLM-only inference. No typechecker
  dependency. No npm publish. No version bump. No
  git tag. No GitHub Release. No new branch.

  New strategy memo:
  [`docs/strategy/js-ts-ast-evidence-adapter-decision.md`](docs/strategy/js-ts-ast-evidence-adapter-decision.md)
  with 14 required headings + 3 required tables
  (option / construct coverage / fallback). New
  18-assertion docs test
  `tests/docs/js-ts-ast-evidence-adapter-decision.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/js-ts-ast-evidence-adapter-decision.md`.

  Recommended next slice: **JS/TS AST EvidenceGraph
  Provider v1** — runtime implementation in
  `@rekon/capability-js-ts`. Emits AST symbol /
  import / export facts with `extractionMethod`
  metadata. Retains regex extraction as fallback for
  parser failures and unsupported environments. No
  typechecker semantics. No `CapabilityMap`
  mutation. No `CapabilityPhraseReport` shape
  change. No `CapabilityNormalizationReport`
  semantics change.

- Shipped **classic scanner/ontology parity audit** —
  strategy / architecture audit batch that maps
  `codebase-intel-classic`'s scanner, taxonomy,
  ontology, and `GraphOntologyValidator` design
  against Rekon's current `EvidenceGraph` /
  `CapabilityNormalizationReport` /
  `CapabilityPhraseReport` track. Course-corrects the
  capability-ontology track: classic is design prior
  art, not history.

  Pinned verbatim:

    - codebase-intel is design prior art.
    - JS/TS AST extraction should be primary where
      available.
    - Regex extraction is fallback, not primary, for
      JS/TS.
    - `EvidenceGraph` remains the repo-agnostic
      protocol.
    - `GraphOntologyValidator` should not be ported
      wholesale.
    - Classic taxonomy extraction / split / discovery
      / normalization should be adapted.
    - `CapabilityMap` v2 should wait until post-AST
      coverage is measured.

  Audit finding (verbatim):

  > Three coverage reviews + two runtime slices on
  > the phrase track confirm canon-pack tuning and
  > splitter sharpening cannot move the stable
  > foundation. The bottleneck is `@rekon/capability-js-ts`'s
  > **regex-only** evidence extractor. Classic
  > used AST-backed scanning for the same job.

  Parity matrix decisions:

    - Verb / noun aliases + categories → **repeat**
      (shipped via canon packs).
    - Base + workspace ontology merge → **repeat**
      (shipped).
    - `ExtractedName` / `SplitName` shape → **adapt**
      (needs AST to strengthen).
    - Taxonomy discovery as artifact → **adapt**
      (deferred until AST lands).
    - `synonymsApplied` aggregate surface → **adapt**
      (per-candidate already shipped).
    - AST-backed scanner → **adapt** (the next
      product slice).
    - `GraphOntologyValidator` monolith → **reject
      wholesale** (per the lite audit).
    - `TaxonomyRepository` standalone persistence
      → **reject** (artifact store covers it).
    - LLM-augmented extraction → **rejected** (per
      architecture decision).

  Implementation sequence selected:

    1. **JS/TS AST Evidence Adapter Decision**
       (next slice; strategy memo).
    2. JS/TS AST `EvidenceGraph` Provider v1
       (runtime slice; conditioned on the decision).
    3. Post-AST coverage review (fourth coverage
       review on the phrase track).
    4. `CapabilityMap` v2 high-confidence-only
       design decision (gated on post-AST coverage).

  No runtime change. No `CapabilityMap` mutation. No
  `CapabilityPhraseReport` shape change. No
  `CapabilityNormalizationReport` semantics change.
  No `EvidenceGraph` mutation. No phrase projection
  rule change. No canon-pack change. No splitter
  change. No new artifact registration. No new CLI
  command. No source writes. No LLM-only inference.
  No npm publish. No version bump. No git tag. No
  GitHub Release. No new branch.

  New strategy memo:
  [`docs/strategy/classic-scanner-ontology-parity-audit.md`](docs/strategy/classic-scanner-ontology-parity-audit.md)
  with 15 required headings + 3 required tables
  (classic method / scanner parity / next-step
  decision). New 13-assertion docs test
  `tests/docs/classic-scanner-ontology-parity-audit.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/classic-scanner-ontology-parity-audit.md`.

  Recommended next slice: **JS/TS AST Evidence
  Adapter Decision** — strategy memo. Picks parser,
  defines `EvidenceGraph` fact shapes, pins fallback
  behaviour, confidence metadata, test fixtures. AST
  is primary where available; regex stays as
  fallback.

- Shipped **CapabilityPhraseReport post-quality coverage
  review** — dogfood-analysis batch measuring phrase
  output **after** Candidate-Quality v1 across a
  fixture (`examples/simple-js-ts`) + **two** real
  cohort targets (`target-1` Next.js TS, `target-2`
  small TS + workflows). Compares against pre-
  enrichment baseline and post-enrichment v1 results.

  Three-stage `target-1` comparison:

  | Metric | Pre-Enrichment | Post-Enrichment | Post-Quality |
  | --- | ---: | ---: | ---: |
  | stable phrases | 16 | 16 | **16 (unchanged)** |
  | total phrases | 16 | 239 | 239 |
  | `unknown` | 4,088 | 4,088 | 3,865 |
  | `ignored` | 226 | 226 | 449 |
  | `normalized` | 241 | 241 | 241 |

  `target-2` (new in this review): 408 candidates, 12
  normalized (2.9%), 2 stable + 10 partial = 12 total
  phrases. Same shape as `target-1` at smaller scale.

  Verdict: **Candidate-quality improvements reduced
  unknown noise** as designed, but **stable phrase
  count remained unchanged across both real repos**.
  Stable density is consistently sparse: 0.18% on
  `target-1`, 0.49% on `target-2`. Three coverage
  reviews + two runtime slices (enrichment v1 +
  candidate-quality v1) now confirm the stable
  foundation **does not respond to vocabulary or
  splitter tweaks** — the bottleneck is the evidence
  model itself.

  Pinned verbatim:

    - Candidate-quality improvements reduced unknown
      noise.
    - Stable phrase count remained unchanged.
    - `CapabilityMap` v2 is evidence-gated.
    - Partial phrases alone do not justify
      `CapabilityMap` v2.

  Seven readiness gates evaluated; six pass; the
  seventh — *stable density sufficient for canonical
  projection* — has not moved through three coverage
  reviews and two runtime slices.

  Options considered:

    - `CapabilityMap` v2 high-confidence-only → still
      deferred (stable count unchanged).
    - Phrase enrichment v2 → deferred (parallel; does
      not move stable count).
    - Candidate extraction improvements → deferred
      (parallel; secondary to architecture review).
    - Canon-pack expansion v2 → deferred (parallel).
    - **Repo-agnostic purpose understanding architecture
      review → SELECTED** as next slice.
    - More dogfood → deferred (parallel).

  No runtime change. No `CapabilityMap` mutation. No
  `CapabilityPhraseReport` shape change. No phrase
  projection rule change. No canon-pack change. No
  splitter change. No new artifact registration. No
  new CLI command. No source writes. No LLM-only
  inference. No npm publish. No version bump. No git
  tag. No GitHub Release. No new branch.

  New strategy memo:
  [`docs/strategy/capability-phrase-post-quality-coverage-review.md`](docs/strategy/capability-phrase-post-quality-coverage-review.md)
  with 15 required headings + 7 required tables
  (target / pack / normalization / phrase / before-
  after / readiness / option). New 15-assertion docs
  test
  `tests/docs/capability-phrase-post-quality-coverage-review.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-phrase-post-quality-coverage-review.md`.

  Recommended next slice: **Repo-agnostic purpose
  understanding architecture review** — strategy memo
  surveying deterministic evidence sources beyond
  symbol/export names. Output drives the next product
  slice (phrase enrichment v2, candidate extraction,
  or canon-pack expansion v2) and pins the gates
  `CapabilityMap` v2 must hit on a fourth coverage
  review.

- Shipped **capability ontology candidate-quality
  improvements v1** — product capability batch. Two
  deterministic improvements to reduce upstream
  normalization noise without weakening the
  `CapabilityPhraseReport` stable threshold:

    1. **Canon-pack confirmation** — the four observed
       high-frequency partial-only nouns (`schema`,
       `request`, `response`, `plan`) and three
       observed verbs (`save`, `get`, `build`) are
       confirmed already canonical in the base pack.
       No new canonical entries added; no duplicates
       introduced. Contract test pins both invariants.
    2. **Lexical splitter sharpening** — the splitter
       now emits a structural `kind` hint
       (`"name" | "path"`). Path-shaped names
       (containing `/` or bare file extensions like
       `.tsx`) are flagged `"path"`; the normalizer
       classifies them as `ignored` rather than
       `unknown`. Single-token names whose token is a
       known canonical noun receive a precise
       `low-confidence` message (`Known noun "X"
       without a verb; insufficient for a capability
       phrase.`) instead of the generic split failure
       message, and `normalized.noun` is populated with
       the canonical noun — but **no canonical verb is
       invented**.

  Pinned verbatim:

    - Candidate-quality improvements are deterministic.
    - Canon-pack additions are evidence-backed.
    - Lexical splitter sharpening reduces noise.
    - Noun-only candidates do not become phrases.
    - Stable phrase threshold remains unchanged.
    - `CapabilityMap` integration remains deferred.

  Measured impact on `target-1` (real anonymized
  Next.js TS):

    - `unknown` 4,088 → 3,865 (−223 path-shaped
      candidates correctly reclassified).
    - `ignored` 226 → 449 (+223).
    - `normalized` 241 → 241 (unchanged).
    - `lowConfidence` 2,054 → 2,054 (unchanged).
    - Stable phrases 16 → 16 (**unchanged**).
    - Total phrases 239 → 239 (**unchanged**).

  Public API additions (all additive):

    - `CapabilityNameSplitKind = "name" | "path"`
      (new exported type alias).
    - `CapabilityNameSplit.kind` (new required field on
      the split result).
    - `CapabilityCandidate.raw.splitKind` (new optional
      field; older artifacts continue to validate).

  No `CapabilityMap` mutation. No `CapabilityPhraseReport`
  shape change. No phrase projection rule change. No
  `CapabilityNormalizationReport` semantics change. No
  `EvidenceGraph` mutation. No new artifact
  registration. No new CLI command. No source reads.
  No AST / typechecker / LLM evidence. No source
  writes. No npm publish. No version bump. No git tag.
  No GitHub Release. No new branch.

  New strategy memo:
  [`docs/strategy/capability-ontology-candidate-quality-v1.md`](docs/strategy/capability-ontology-candidate-quality-v1.md).
  New 16-assertion contract test
  `tests/contract/capability-ontology-candidate-quality.test.mjs`.
  New 9-assertion docs test
  `tests/docs/capability-ontology-candidate-quality.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-ontology-candidate-quality-v1.md`.

  Recommended next slice: **CapabilityPhraseReport
  post-quality coverage review** — re-run fixture +
  `target-1` + at least one additional cohort target
  to measure stable phrase count delta and decide
  whether `CapabilityMap` v2 design can begin.

- Shipped **CapabilityPhraseReport enrichment coverage
  review** — dogfood-analysis batch measuring phrase
  output **after** Phrase Enrichment v1 on a fixture
  (`examples/simple-js-ts`) and one real, anonymized
  Next.js TypeScript target (`target-1`). Compares
  against the pre-enrichment coverage review.

  Measurements on `target-1` (post-enrichment vs.
  pre-enrichment baseline):

    - **Total phrases**: 16 → **239** (+1394%).
    - **Stable phrases**: 16 → **16** (unchanged).
    - **Partial phrases**: 0 → **223** (new).
    - **withDomain**: 0 → **239** (100% of phrases).
    - **withPattern**: 0 → **0** (upstream
      `ObservedRepo` projector does not populate
      `systems[].kind` on this target).
    - **withLayer**: 0 → **95** (40% of phrases).

  Verdict: **Phrase enrichment v1 materially improved
  coverage for publication and agent-context use, but
  the stable phrase count is unchanged at 16.** The
  stable threshold remains strict, as designed.
  **`CapabilityMap` v2 stays deferred.** The
  bottleneck is upstream: 97.4% of candidates are not
  normalized at all (241 of 9,110). Enrichment v1
  cannot move that — it only consumes normalized
  candidates.

  Pinned verbatim:

    - Phrase enrichment materially improved coverage.
    - The stable threshold remains unchanged.
    - Partial phrases alone do not justify
      `CapabilityMap` v2.
    - `CapabilityMap` v2 is evidence-gated.

  Seven readiness gates evaluated; six pass; the
  seventh — *stable coverage sufficient for canonical
  projection* — has not moved since the pre-enrichment
  review.

  Options considered:

    - `CapabilityMap` v2 high-confidence-only → still
      deferred (stable count unchanged).
    - Phrase enrichment v2 (framework / architecture-
      profile enrichment) → deferred (parallel;
      primarily raises `pattern` coverage, secondary to
      candidate-quality).
    - **Candidate-quality improvements → selected** as
      next slice (canon-pack expansion +
      lexical-splitter sharpening to raise the
      *normalized* count).
    - More dogfood → deferred (parallel).
    - Projection-rule hardening → rejected (partial
      output is meaningful; no rule-hardening needed).

  No runtime change. No `CapabilityMap` mutation. No
  `CapabilityPhraseReport` shape change. No phrase
  projection rule change. No canon-pack change (canon-
  pack expansion is the *next* slice; this review only
  recommends it). No new artifact registration. No new
  CLI command. No source writes. No LLM-only inference.
  No npm publish. No version bump. No git tag. No
  GitHub Release. No new branch.

  New strategy memo:
  [`docs/strategy/capability-phrase-enrichment-coverage-review.md`](docs/strategy/capability-phrase-enrichment-coverage-review.md)
  with 14 required headings + 6 required tables
  (target / normalization / phrase / enrichment /
  readiness / option). New 14-assertion docs test
  `tests/docs/capability-phrase-enrichment-coverage-review.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-phrase-enrichment-coverage-review.md`.

  Recommended next slice: **Candidate-quality
  improvements** — canon-pack expansion of frequently-
  appearing partial-only verb/noun pairs (`save:schema`
  (24), `save:request` (16), `get:response` (14),
  `build:plan` (13), etc.) + lexical-splitter
  sharpening for unknown-verb / unknown-noun
  candidates. A third coverage review measures the
  delta.

- Shipped **CapabilityPhraseReport phrase enrichment v1** —
  product capability batch. `buildCapabilityPhraseReport`
  in `@rekon/capability-ontology` now consumes optional
  `ObservedRepo` + `OwnershipMap` artifacts and populates
  `domain` / `pattern` / `layer` enrichment fields when
  deterministic context is available. `rekon capability
  phrase project` reads the latest enrichment artifacts
  automatically; missing context is not a failure.

  Verdict: phrase coverage on `target-1` rose from 16
  stable phrases (the safety-review baseline) to **239
  total** (16 stable + 223 partial; 0 low-confidence) on
  the same input — a 15× yield increase with **the stable
  threshold unchanged**.

  Pinned verbatim:

    - Phrase enrichment v1 uses deterministic artifact
      context.
    - The stable threshold is unchanged.
    - Partial phrases are semantic context, not
      CapabilityMap-ready placement or ownership policy.
    - `domain` / `pattern` / `layer` can be enriched
      deterministically from `ObservedRepo` +
      `OwnershipMap`.
    - `sideEffects` / `inputs` / `outputs` remain
      deferred.
    - `CapabilityMap` integration remains deferred.

  Enrichment sources (deterministic only):

    - `OwnershipMap.entries[]` path-prefix match →
      `ownerSystem` becomes `phrase.domain`; `layer`
      becomes `phrase.layer`.
    - `ObservedRepo.systems[]` longest path-prefix match
      → `id` becomes fallback `domain`; `kind`
      (`route` / `service` / `ui` / `module` / `infra`)
      maps to `phrase.pattern`; single-layer systems
      contribute fallback `layer`.
    - Empty / `"unknown"` / `"none"` values are treated
      as non-enriching at the source.

  Status model:

    - `stable` — strictest, eligible for future
      `CapabilityMap` v2. Threshold **unchanged**.
    - `partial` — semantic context only. Emits only when
      at least one deterministic enrichment field is
      present. Not `CapabilityMap`-ready.
    - `low-confidence` — reserved; not emitted in v1.

  New exports from `@rekon/capability-ontology`:
  `buildCapabilityPhraseReport` accepts optional
  `observedRepo` / `observedRepoRef` / `ownershipMap` /
  `ownershipMapRef`. CLI JSON output gains an additive
  `contextRefs` field. CLI human output adds
  `Enrichment: withDomain N, withPattern N, withLayer N`.
  No schema change. No new artifact registration. No new
  CLI command. No source reads. No AST / typechecker /
  LLM evidence. No source writes. No `CapabilityMap`
  mutation. No `CapabilityNormalizationReport` mutation.
  No `EvidenceGraph` mutation. No version bump. No npm
  publish. No git tag. No GitHub Release. No new branch.

  New strategy memo:
  [`docs/strategy/capability-phrase-enrichment-v1.md`](docs/strategy/capability-phrase-enrichment-v1.md).
  New 22-assertion contract test
  `tests/contract/capability-phrase-enrichment.test.mjs`.
  New 10-assertion docs test
  `tests/docs/capability-phrase-enrichment.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-phrase-enrichment-v1.md`.

  Recommended next slice: **CapabilityPhraseReport
  enrichment coverage review** — re-measure stable +
  partial yield, `withDomain` / `withPattern` /
  `withLayer` ratios, and publication usefulness on the
  fixture + at least one real cohort target. Output
  drives the `CapabilityMap` v2 high-confidence-only
  decision.

- Shipped **CapabilityPhraseReport real-repo coverage
  review** — dogfood-analysis batch measuring phrase
  output on a fixture (`examples/simple-js-ts`) and one
  real, anonymized Next.js TypeScript target
  (`target-1`). Strategy / docs / tests-only.

  Verdict: **`CapabilityPhraseReport` is structurally safe
  and produces meaningful, high-confidence phrases on a
  real repo. Phrase quality is high; phrase coverage is
  sparse.** 16 stable phrases on 9,110 candidates =
  **0.18%**; 16 / 241 normalized = **6.6%**. All 16 phrases
  carry `EvidenceGraph` refs; none look like noise.

  Pinned verbatim:

    - `CapabilityMap` v2 is evidence-gated.
    - Stable high-confidence phrases were measured on a
      real repo.
    - Unknown / low-confidence rows remain excluded from
      phrases and from any future `CapabilityMap` v2.

  Six readiness gates evaluated:

    - real-repo non-trivial stable phrases — **pass
      (sparse)**.
    - evidence refs present — **pass** (16/16).
    - unknown / low-confidence excluded — **pass**
      (4,088 unknown + 1,670 unknown-verb + 831
      unknown-noun + 2,054 low-confidence stay in the
      normalization report).
    - publications understandable — **pass** (both
      architecture summary and agent contract render
      the phrase section with the deferred-`CapabilityMap`
      callout).
    - artifacts validate clean — **pass** on both
      targets.
    - phrase coverage sufficient for a useful canonical
      projection — **fail** (0.18% is too sparse).

  Options considered:
    - `CapabilityMap` v2 high-confidence-only → deferred
      (needs richer phrase yield).
    - **Phrase enrichment v1 → selected** as next slice
      (deterministic `domain` / `pattern` / `layer`
      enrichment from `ObservedRepo` + `OwnershipMap`;
      allows `partial` phrases to emit; keeps `stable`
      reserved for the strictest case).
    - Candidate-quality improvements → deferred
      (parallel, lower priority).
    - Canon-pack expansion → deferred (parallel).
    - More dogfood → deferred (parallel).

  No runtime change. No `CapabilityMap` mutation. No
  `CapabilityPhraseReport` shape change. No phrase
  projection rule change. No canon-pack change. No new
  artifact registration. No new CLI command. No source
  writes. No LLM-only inference. No npm publish. No
  version bump. No git tag. No GitHub Release. No new
  branch.

  New strategy memo:
  [`docs/strategy/capability-phrase-report-coverage-review.md`](docs/strategy/capability-phrase-report-coverage-review.md)
  with 13 required headings + 5 required tables
  (target / normalization / phrase / readiness /
  option). New 12-assertion docs test
  `tests/docs/capability-phrase-report-coverage-review.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-phrase-report-coverage-review.md`.

  Recommended next slice: **Phrase enrichment v1** —
  add deterministic enrichment from `ObservedRepo` +
  `OwnershipMap`; allow `partial` phrases; keep
  `stable` reserved for `CapabilityMap` v2-eligible
  rows.

- Shipped **CapabilityPhraseReport safety review** —
  end-to-end review of the
  `CapabilityNormalizationReport → CapabilityPhraseReport
  → architecture summary / agent contract publication
  surfacing` path. Strategy / docs / tests-only batch.

  Verdict: **`CapabilityPhraseReport` is safe and stable
  as the semantic purpose projection layer.**
  `CapabilityMap` v2 stays deferred until one real-repo
  phrase coverage review measures stable-phrase quality
  across the canon-pack archetypes.

  Pinned verbatim:

    - `CapabilityPhraseReport` is semantic purpose
      projection, not ownership or placement policy.
    - `CapabilityNormalizationReport` remains the
      translation audit.
    - `CapabilityMap` integration remains deferred
      until phrase coverage is measured on real repos.
    - Proof report surfacing remains deferred because
      phrase projection is semantic context, not
      verification proof.
    - Only stable high-confidence phrases are eligible
      for future `CapabilityMap` v2.

  The review walks every layer of the projection path
  (`CapabilityNormalizationReport` → projection rules
  → `CapabilityPhraseReport` → architecture summary /
  agent contract surfacing) and confirms the boundaries
  established by the architecture + carrier decisions
  are preserved end-to-end. The no-mutation guarantee
  table enumerates every reader / writer in the path;
  contract tests on the phrase-report v1 + publication
  surfacing slices enforce the guarantee mechanically.

  Options considered:
  - Proceed directly to `CapabilityMap` v2 → deferred
    (needs measured coverage).
  - Phrase coverage review (selected).
  - Add phrase enrichment first → deferred (needs
    coverage data).
  - Add `CapabilityContract` now → rejected (policy
    layer too early).

  **No runtime change. No `CapabilityMap` mutation. No
  `CapabilityPhraseReport` mutation. No
  `CapabilityNormalizationReport` mutation. No
  `EvidenceGraph` mutation. No phrase-projection rule
  change. No `CapabilityContract`. No
  `RefactorPreservationContract`. No architecture
  linting. No resolver routing by capability. No
  verification planning by capability. No AST /
  typechecker evidence. No LLM-only inference. No
  source-write apply. No new CLI command. No new
  artifact registration. No version bump. No npm
  publish. No git tag. No GitHub Release. No new
  branch.**

  New strategy memo
  `docs/strategy/capability-phrase-report-safety-review.md`
  with all 14 required headings + 3 required diagnostic
  tables (projection path, option, boundary). New
  12-assertion docs test
  `tests/docs/capability-phrase-report-safety-review.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-phrase-report-safety-review.md`.

  Recommended next slice: **CapabilityPhraseReport
  real-repo coverage review** — run `refresh →
  normalize → phrase project` against the fixture and
  at least one real cohort target. Measure phrase
  count by archetype, stable-phrase ratio, evidence-ref
  distribution, and publication usefulness. Output
  drives the `CapabilityMap` v2 high-confidence-only
  decision.

- Shipped **CapabilityPhraseReport publication
  surfacing** — the architecture summary and agent
  contract publishers now surface the latest
  `CapabilityPhraseReport` inline so operators and
  agents see semantic purpose projection where they
  already inspect repo state. **Read-only**: neither
  publisher mutates the phrase report, the source
  `CapabilityNormalizationReport`, `CapabilityMap`,
  or `EvidenceGraph`.

  Behaviour:

    - Architecture summary renders a `## Capability
      Phrases` section with the report ref, source
      `CapabilityNormalizationReport` ref, summary counts
      (`totalPhrases`, `stable`, `partial`,
      `lowConfidence`, `withDomain`, `withPattern`,
      `withLayer`), and a bounded phrase table. When no
      report exists, emits no-report guidance pointing at
      `rekon capability phrase project`.
    - Agent contract renders `### Capability Phrases`
      under the operating-state group with the same
      metadata, plus a new `Do Not Do` reminder:
      *Do not treat CapabilityPhraseReport entries as
      CapabilityMap ownership or placement policy.*
    - Both publications cite the report in
      `header.inputRefs` when present; freshness
      propagates via the new `capability-phrases.changed`
      invalidation rule.
    - **Proof report surfacing is deferred** —
      CapabilityPhraseReport is semantic context, not
      verification proof, so mixing it into the proof
      surface would dilute proof status.

  Pinned verbatim:

    - `CapabilityNormalizationReport` remains the
      translation audit.
    - `CapabilityPhraseReport` is the semantic purpose
      projection.
    - `CapabilityMap` integration remains deferred — v2
      will consume `CapabilityPhraseReport`, not raw
      normalization rows.
    - AST / typechecker evidence is optional enrichment,
      not foundational truth.
    - No LLM-only inference.
    - Source writes remain unavailable.

  New export from `@rekon/capability-docs`:
  `buildCapabilityPhrasePublicationSection`
  (pure renderer; accepts `report`, `reportRef`,
  `headingLevel`, `tableLimit`; returns
  `{ lines, inputRef? }`).

  `@rekon/capability-docs.consumes` gains
  `CapabilityPhraseReport`. New manifest invalidation
  rule `capability-phrases.changed`.

  **No new artifact registration. No
  `CapabilityNormalizationReport` shape mutation. No
  `CapabilityMap` mutation. No `EvidenceGraph` mutation.
  No phrase report mutation. No source-write apply. No
  LLM-only inference. No new CLI command. No version
  bump. No npm publish. No git tag. No GitHub Release.
  No new branch.**

  New 18-assertion contract test
  `tests/contract/capability-phrase-publications.test.mjs`.
  New 10-assertion docs test
  `tests/docs/capability-phrase-publications.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-phrase-publications.md`.

  Recommended next slice: **CapabilityPhraseReport
  safety review** — review the
  `CapabilityNormalizationReport → CapabilityPhraseReport
  → publication surfacing` path end-to-end and decide
  whether phrase claims are stable enough to gate
  `CapabilityMap` v2, whether enrichment evidence
  sources need to ship first, or whether more dogfood is
  required.

- Shipped **CapabilityPhraseReport v1** — first runtime
  slice on the semantic-purpose-projection layer (Layer
  5b) the architecture + carrier decisions reserved.
  Registers `CapabilityPhraseReport` as a new artifact
  type, adds the `buildCapabilityPhraseReport` helper to
  `@rekon/capability-ontology`, and ships
  `rekon capability phrase project --report <ref>`.

  Behaviour:

    - Consumes the latest
      `CapabilityNormalizationReport` and projects
      high-confidence normalized candidates into stable
      `CapabilityPhrase` entries.
    - Emits a phrase **only when** the source candidate
      is `status === "normalized"` + `confidence === "high"`
      + lexical split is high-confidence. Unknown /
      ignored / low-confidence rows remain in the audit
      artifact and never project.
    - Every emitted phrase has `status === "stable"` in
      v1. `partial` and `low-confidence` statuses are
      reserved for future deterministic enrichment slices.
    - Deterministic IDs: `phrase-<candidate-id>-<verb>-<noun>`.
    - Deterministic ordering: path → verb → noun →
      candidate id.
    - Each phrase cites `sourceCandidateIds` and
      `evidenceRefs`; the report cites
      `CapabilityNormalizationReport` (and `EvidenceGraph`
      when the upstream report cites it) in
      `header.inputRefs`.
    - **Read-only with respect to upstream artifacts.**
      The normalization report, `EvidenceGraph`, review
      ledger, suggestion report, and `CapabilityMap` are
      never mutated.

  Pinned verbatim:

    - `CapabilityNormalizationReport` remains the
      **translation audit**.
    - `CapabilityPhraseReport` is the **semantic purpose
      projection**.
    - `CapabilityMap` integration **remains deferred** —
      v2 will consume `CapabilityPhraseReport`, not raw
      normalization rows.
    - AST / typechecker evidence is **optional
      enrichment, not foundational truth**.
    - **No LLM-only inference** in v1.
    - `CapabilityContract` and
      `RefactorPreservationContract` remain future
      layers.
    - Source writes remain unavailable.

  New exports from `@rekon/capability-ontology`:
  `CapabilityPhrase`, `CapabilityPhraseConfidence`,
  `CapabilityPhraseStatus`,
  `CapabilityPhraseReportSummary`,
  `CapabilityPhraseReport`,
  `BuildCapabilityPhraseReportInput`,
  `buildCapabilityPhraseReport`,
  `validateCapabilityPhraseReport`.

  `@rekon/sdk.BUILT_IN_ARTIFACT_TYPES` gains
  `CapabilityPhraseReport` (`schemaVersion: "0.1.0"`,
  `stability: "experimental"`).
  `@rekon/runtime.ARTIFACT_CATEGORY_BY_TYPE` maps
  `CapabilityPhraseReport: "projections"` (sits next to
  `CapabilityNormalizationReport` and `CapabilityMap`).

  **No `CapabilityNormalizationReport` shape mutation.
  No `CapabilityMap` mutation. No `EvidenceGraph`
  mutation. No source-write apply. No LLM-only
  inference. No version bump. No npm publish. No git
  tag. No GitHub Release. No new branch.**

  New 20-assertion contract test
  `tests/contract/capability-phrase-report.test.mjs`.
  New 11-assertion docs test
  `tests/docs/capability-phrase-report.test.mjs`. New
  artifact doc `docs/artifacts/capability-phrase-report.md`.
  Review packet
  `.rekon-dev/review-packets/capability-phrase-report-v1.md`.

  Recommended next slice: **CapabilityPhraseReport
  publication surfacing** — render the phrase summary in
  the architecture summary and agent contract
  publications. Read-only. No `CapabilityMap` mutation.

- Shipped **CapabilityPhraseReport Decision** — strategy /
  architecture / docs / tests-only batch that commits to
  the carrier the previous architecture decision deferred.
  Selects **Option B**: emit `CapabilityPhrase` v1 as a
  separate `CapabilityPhraseReport` artifact, not
  enrichment of `CapabilityNormalizationReport`. Rejects
  Option A (enrich the normalization report) and Option C
  (wait / defer).

  Pinned verbatim:

    - `CapabilityNormalizationReport` is a **translation
      audit**.
    - `CapabilityPhraseReport` is a **semantic purpose
      projection**.
    - `CapabilityMap` v2 should consume
      `CapabilityPhraseReport` (not raw normalization
      rows).
    - **Only high-confidence / stable `CapabilityPhrase`
      claims are eligible for `CapabilityMap` v2.**
    - `CapabilityContract` is the **future policy /
      preservation layer** (not implemented in
      `CapabilityPhraseReport` v1).
    - AST / typechecker evidence is **optional
      enrichment, not foundational truth**.
    - `CapabilityPhrase` v1 must remain **repo /
      language / architecture agnostic**.
    - Source writes remain unavailable.

  V1 field policy:

    - Required: `id`, `verb`, `noun`, `confidence`,
      `evidenceRefs`, `sourceCandidateIds`, `status`.
    - Partial (v1): `qualifier`, `domain`, `pattern`,
      `layer`, `message`.
    - Reserved (future): `sideEffects`, `inputs`,
      `outputs`.
    - Future fields appear only when deterministic
      evidence exists. No vibes-driven inference.

  **No runtime change. No new artifact registration. No
  `CapabilityNormalizationReport` shape mutation. No
  `CapabilityMap` mutation. No `EvidenceGraph` mutation.
  No `CapabilityContract`. No `RefactorPreservationContract`.
  No source writes. No LLM-only inference. No new CLI
  command. No new permission. No workflow YAML change. No
  version bump. No npm publish. No git tag. No GitHub
  Release. No new branch.**

  New strategy memo
  `docs/strategy/capability-phrase-report-decision.md`
  with all 12 required headings + 3 required diagnostic
  tables (option / field policy / boundary). New
  15-assertion docs test
  `tests/docs/capability-phrase-report-decision.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-phrase-report-decision.md`.

  Recommended next slice: **CapabilityPhraseReport v1** —
  register the artifact, implement deterministic
  projection from high-confidence
  `CapabilityNormalizationReport` candidates, cite the
  source normalization report and `EvidenceGraph` in
  `header.inputRefs`. Populate v1 required fields only.
  No `CapabilityMap` mutation. No `CapabilityContract`.

- Shipped **CapabilityPhrase + CapabilityContract
  Architecture Decision** — strategy / architecture /
  docs / tests-only batch. Reserves the semantic primitive
  the capability-ontology track needs before
  `CapabilityMap` v2, source-write apply, or any
  architecture-aware feature can ship.

  Pinned verbatim:

    - **`CapabilityPhrase`** is the intermediate semantic
      unit between `CapabilityNormalizationReport` and
      `CapabilityMap` v2.
    - **`CapabilityPhrase` is different from a normalized
      verb/noun.** It enriches the canonical pair with
      `qualifier` / `domain` / `pattern` / `layer` /
      future `sideEffects` / `inputs` / `outputs` plus
      required `confidence` + `evidenceRefs`.
    - **`CapabilityContract` is the future policy /
      preservation layer.** It binds a phrase to allowed
      layers / required checks / required + forbidden
      neighbours / preservation rules. **Not the same as**
      `RefactorPreservationContract`, which is a
      phase-specific projection of contract policy onto a
      refactor.
    - **`CapabilityMap` v2 should consume only stable,
      confidence-scored `CapabilityPhrase` claims.**
    - **AST / typechecker evidence is optional
      enrichment, not foundational truth.** Lexical,
      path, ownership, framework, and operator-decision
      evidence remain the baseline.
    - **Repo / language / architecture agnostic evidence
      is required** — the phrase model must work on Ruby,
      Python, Go, Rust, shell, and config-only repos as
      well as TypeScript / JavaScript.
    - **Source writes remain unavailable.**

  Use cases unlocked once phrases ship: architecture
  linting, naming honesty, overloaded-file detection,
  resolver routing, verification planning, semantic
  impact analysis, memory anchoring, refactor
  preservation, docs / publication clustering, and
  `CapabilityMap` v2.

  **No runtime change. No new artifact registration. No
  `CapabilityMap` mutation. No `CapabilityNormalizationReport`
  mutation. No `EvidenceGraph` mutation. No source
  writes. No AST-first assumption. No LLM-only semantic
  inference. No new CLI command. No new permission. No
  workflow YAML change. No version bump. No npm publish.
  No git tag. No GitHub Release. No new branch.**

  New strategy memo
  `docs/strategy/capability-phrase-contract-architecture-decision.md`
  with all 16 required headings + 3 required diagnostic
  tables (evidence-source, use-case, layer / boundary).
  New 18-assertion docs test. Review packet
  `.rekon-dev/review-packets/capability-phrase-contract-architecture-decision.md`.

  Recommended next slice: *CapabilityPhrase v1 artifact /
  report decision* — pick Option A (enrich
  `CapabilityNormalizationReport`), Option B (new
  `CapabilityPhraseReport`), or Option C (wait).
  Preferred: **Option B**, preserving the boundary
  *normalization audit ≠ semantic purpose projection*.

- Shipped **Capability Ontology Canon Packs v1** —
  implementation slice that lands the canon + override
  model decision shipped at `d9716f9`. Rekon now compiles
  every `EffectiveCapabilityOntology` from built-in
  canonical ontology packs + optional repo-local
  overrides:

    - **Four built-in canon packs:** `base` (always
      included), plus three archetype overlays —
      `nextjs-app`, `library-package`, `monorepo`. Each
      pack defines canonical verbs / nouns / aliases /
      categories / noise terms. Packs live in
      `packages/capability-ontology/src/packs/`.
    - **Canonical override path:**
      `.rekon/capability-ontology.overrides.json`. When
      present, overrides extend canonical entries and
      supersede pack aliases on key collision. Noise
      terms suppress suggestion noise (not raw evidence).
    - **Legacy compatibility:** the v1 path
      `.rekon/capability-ontology.json` is still loaded
      when the canonical overrides file is absent. When
      both exist, the canonical file wins and the report
      surfaces `legacyOverrideIgnored: true` so operators
      can clean up. **No automatic migration.**
    - **`extends` field:** overrides may declare
      `extends: ["base", "nextjs-app"]` to explicitly
      select packs. When omitted, Rekon falls back to
      conservative auto-detection from `package.json` +
      repo paths (`next` dep / `app|pages` → `nextjs-app`;
      `workspaces` / `pnpm-workspace.yaml` /
      `packages/*` → `monorepo`; library-style exports
      without app pattern → `library-package`).
    - **`EffectiveCapabilityOntology.source`** now
      records `basePack` / `overlayPacks` /
      `overridePath` / `overrideHash` / `overrideKind` /
      `legacyOverrideIgnored` / `systemSeedCount`.
      `configPath` / `configHash` are preserved as
      back-compat aliases.
    - **`CapabilityNormalizationReport.ontology`**
      surfaces the same metadata so operators see which
      packs and override the run consumed.
    - **`CapabilityOntologySuggestionReport.preview`** now
      targets `.rekon/capability-ontology.overrides.json`
      (not the legacy `.rekon/capability-ontology.json`).
      Suggestions propose override-file changes, not
      canon edits.
    - **Unknown pack id fails clearly.** Override config
      shipping an unknown `extends` entry surfaces a
      readable error listing known packs.
    - New exports from `@rekon/capability-ontology`:
      `BASE_PACK_ID`, `BUILTIN_CANON_PACKS`, `basePack`,
      `nextjsAppPack`, `libraryPackagePack`,
      `monorepoPack`, `CANON_PACK_VERSION`,
      `CapabilityOntologyPack`, `resolvePacks`,
      `getBuiltinCanonPack`, `listBuiltinCanonPackIds`,
      `detectOverlayPacks`,
      `CAPABILITY_ONTOLOGY_OVERRIDES_PATH`,
      `CAPABILITY_ONTOLOGY_LEGACY_PATH`,
      `EffectiveCapabilityOntologySource`.

  **No npm publish. No version bump. No git tag. No
  GitHub Release. No new branch. No `CapabilityMap`
  mutation. No `EvidenceGraph` mutation. No source-write
  apply. No LLM normalization. No override-file mutation.
  No new permission. No workflow YAML.**

  23-assertion contract test
  `tests/contract/capability-ontology-canon-packs.test.mjs`.
  13-assertion docs test
  `tests/docs/capability-ontology-canon-packs.test.mjs`.
  Review packet
  `.rekon-dev/review-packets/capability-ontology-canon-packs-v1.md`.
  Recommended next slice: capability ontology canon-pack
  coverage review — re-run normalization against fixtures
  + real repos and compare unknown / low-confidence rates
  before / after canon packs.

- Shipped **Capability Ontology Canon + Override Model
  Decision** — strategy / decision / docs / tests-only
  batch on the capability-ontology track. **Revises** the
  prior direction (the *Capability Ontology Suggestion
  Safety Review* selected manual editing as the
  operator-control boundary). New product posture:

    - *"`CapabilityOntology` is not user-authored from
      scratch. `CapabilityOntology` is Rekon-provided
      canon + repo-local overrides."*
    - Rekon will ship a built-in canonical ontology
      baseline (`base` pack always loaded) plus a small
      set of repo-archetype overlays (v1 ship set:
      `base`, `nextjs-app`, `library-package`,
      `monorepo`).
    - Repo-local overrides **supersede or extend** the
      canonical set. The override file is renamed
      `.rekon/capability-ontology.overrides.json` to make
      the operator's responsibility unambiguous.
    - `EffectiveCapabilityOntology` is compiled from
      `built-in canon → archetype overlays → repo
      overrides → system seeds`, deterministically, with
      later layers superseding earlier.
    - `CapabilityOntologySuggestionReport` v2 will
      propose patches against the overrides file, not
      against the entire config.
    - The previous authoring guide + review-loop
      quickstart remain in `docs/beta/` as **fallback /
      emergency manual** references, not the steady-state
      product model.

  Options considered: manual config authoring (rejected),
  one global built-in ontology (rejected), canon packs +
  repo overrides (selected), auto-apply suggestions
  (deferred), LLM-generated ontology (rejected).

  **No runtime change. No canonical pack content shipped
  yet. No override loader change. No file rename yet.
  No CLI change. No artifact shape change. No new
  artifact registration. No `.rekon/capability-ontology.json`
  mutation. No `CapabilityMap` mutation. No
  `EvidenceGraph` mutation. No source-write apply. No
  new permission. No workflow YAML. No version bump. No
  npm publish. No git tag. No GitHub Release.**

  New strategy memo
  [`docs/strategy/capability-ontology-canon-override-model-decision.md`](docs/strategy/capability-ontology-canon-override-model-decision.md)
  with the option / canon pack / override tables and the
  `EffectiveCapabilityOntology` type sketch. New
  14-assertion docs test. Review packet
  [`.rekon-dev/review-packets/capability-ontology-canon-override-model-decision.md`](.rekon-dev/review-packets/capability-ontology-canon-override-model-decision.md).
  Recommended next slice: *capability ontology canon
  packs v1* — implement the canon pack registry, ship
  the v1 archetype set, rename the loader target to
  `.rekon/capability-ontology.overrides.json` with a
  back-compat alias, and update
  `EffectiveCapabilityOntology.source` to record
  `basePack` + `overlayPacks`.

- Shipped **Capability ontology config authoring guide +
  review-loop quickstart** — docs / support / tests-only
  batch on the capability-ontology track. Follows the
  suggestion safety review's selection of manual config
  editing as the operator-control boundary.

  Two new operator-facing docs under `docs/beta/`:

    - [`capability-ontology-config-authoring-guide.md`](docs/beta/capability-ontology-config-authoring-guide.md)
      — full reference for editing
      `.rekon/capability-ontology.json` by hand. Includes
      the canonical JSON shape, every supported field
      (`verbs.{canonical,aliases,categories,includeSystemVerbs}`,
      `nouns.{canonical,aliases,categories,thresholds.autoMap,includeSystemNouns}`),
      the manual editing workflow, the validation loop,
      what each suggestion kind means, and a
      decision-meaning table.
    - [`capability-ontology-review-loop-quickstart.md`](docs/beta/capability-ontology-review-loop-quickstart.md)
      — seven-step operator quickstart from
      `rekon refresh` through `rekon capability ontology
      normalize` → `review suggestions` → `review decide` →
      `capability ontology suggestions` → inspect
      publications → manually edit
      `.rekon/capability-ontology.json` → rerun normalize.

  Verbatim pins repeated in both docs and asserted by the
  docs test:

    - *"The file is optional. If absent, Rekon uses the
      built-in baseline ontology."*
    - *"Rekon never creates or mutates this file
      automatically."*
    - *"JSON only in v1. YAML is not supported."*
    - *"`CapabilityOntologySuggestionReport` is
      preview-only and not applied vocabulary."*
    - *"`CapabilityMap` integration remains deferred."*
    - *"Suggestions do not mutate
      `.rekon/capability-ontology.json`."*
    - *"Suggestions do not mutate `CapabilityMap`."*

  **No runtime change. No CLI change. No artifact shape
  change. No new artifact registration. No
  `.rekon/capability-ontology.json` mutation. No
  `CapabilityMap` mutation. No `EvidenceGraph` mutation. No
  source-write apply. No new permission. No workflow YAML.
  No version bump. No npm publish. No git tag. No GitHub
  Release.** New 22-assertion docs test. Review packet
  [`.rekon-dev/review-packets/capability-ontology-config-authoring-guide.md`](.rekon-dev/review-packets/capability-ontology-config-authoring-guide.md).
  Recommended next slice: *manual ontology config dogfood*
  — exercise the guide end-to-end on one real repo and
  measure operator friction before any apply-command
  decision memo lands.

- Shipped **Capability ontology suggestion safety review** —
  strategy / docs / tests-only batch on the
  capability-ontology track. Reviews the full
  `normalize → review ledger → suggestion report →
  publication surfacing` loop end-to-end. Pins verbatim:

    - *"`CapabilityOntologySuggestionReport` entries are
      preview-only and not applied vocabulary."*
    - *"No current ontology suggestion path mutates
      `.rekon/capability-ontology.json`."*
    - *"No current ontology suggestion path mutates
      `CapabilityMap`."*
    - *"Proof report surfacing remains deferred because
      ontology suggestions are vocabulary/config proposals,
      not verification proof."*
    - *"CapabilityMap integration remains deferred until
      reviewed terms produce stable high-confidence
      normalized claims."*

  **Decision: the suggestion workflow is safe and stable as
  a preview-only loop. Manual editing of
  `.rekon/capability-ontology.json` remains the
  operator-control boundary. No config apply command in
  this batch.** Recommended next slice: *capability ontology
  config authoring guide + review-loop quickstart*
  (docs-only) that documents the full manual path. Any
  future apply command must ship behind its own decision
  memo + explicit confirmation token + pre / post config
  diff artifact + dedicated safety review.

  New strategy memo
  [`docs/strategy/capability-ontology-suggestion-safety-review.md`](docs/strategy/capability-ontology-suggestion-safety-review.md)
  with the three required diagnostic tables (workflow /
  option / risk). New 14-assertion docs test. Review packet
  [`.rekon-dev/review-packets/capability-ontology-suggestion-safety-review.md`](.rekon-dev/review-packets/capability-ontology-suggestion-safety-review.md).
  **No runtime change. No ontology vocabulary change. No
  CLI change. No artifact shape change. No new artifact
  registration. No `EvidenceGraph` mutation. No
  `CapabilityMap` mutation. No source-write apply. No new
  permission. No workflow YAML. No version bump. No npm
  publish. No git tag. No GitHub Release.**

- Shipped **Capability ontology suggestion publication
  surfacing** — step 4c of the capability-ontology
  translation-layer implementation sequence. The
  architecture summary and agent contract publishers now
  surface the latest `CapabilityOntologySuggestionReport`:

    - The architecture summary renders a `## Capability
      Ontology Suggestions` section with the report ref,
      summary counts by suggestion kind, an explicit
      `Preview-only.` callout pinning that
      `.rekon/capability-ontology.json` remains unchanged,
      and a bounded suggestion table.
    - The agent contract renders a `### Capability
      Ontology Suggestions` subsection in the
      operating-state group and adds a new `Do Not Do`
      reminder: *"Do not treat
      `CapabilityOntologySuggestionReport` entries as
      applied ontology config."*
    - Both publishers cite the source report in
      `header.inputRefs`. Manifest `consumes` adds
      `CapabilityOntologySuggestionReport` and a new
      `capability-ontology-suggestions.changed`
      invalidation rule regenerates publications when a
      new report lands.

  **Read-only.** Publications never run `rekon capability
  ontology suggestions`, never mutate
  `.rekon/capability-ontology.json`, never mutate the
  `CapabilityNormalizationReviewLedger`, never write a new
  `CapabilityOntologySuggestionReport`, and never mutate
  `CapabilityMap`. Proof report surfacing is deliberately
  deferred (suggestions are vocabulary / config
  proposals, not verification proof). No LLM
  normalization. No source-write apply. No new
  permission. No new role. No workflow YAML. No new
  package. No version bump. No npm publish. No git tag.
  No GitHub Release. New public helper
  `buildCapabilityOntologySuggestionPublicationSection`
  in `@rekon/capability-docs`. New 13-assertion contract
  test + 9-assertion docs test. Review packet
  [`.rekon-dev/review-packets/capability-ontology-suggestion-publications.md`](.rekon-dev/review-packets/capability-ontology-suggestion-publications.md).
  Recommended next slice: *capability ontology suggestion
  safety review* — review the full normalize → review →
  suggest → publish loop end-to-end before deciding
  whether to add an operator-approved config apply step.

- Shipped **Capability ontology vocabulary expansion v1** —
  step 4b of the capability-ontology translation-layer
  implementation sequence. New artifact
  `CapabilityOntologySuggestionReport` (registered in
  `@rekon/sdk` + `@rekon/runtime`, category `actions`). New
  CLI command:

    - `rekon capability ontology suggestions
      [--ledger <CapabilityNormalizationReviewLedger-id|type:id>]
      [--root <path>] [--json]`

  The report is **preview-only**: it transforms
  `extend-ontology` decisions in the latest
  `CapabilityNormalizationReviewLedger` into a proposed
  `.rekon/capability-ontology.json` patch rendered as
  `before` / `after` JSON strings under `preview.patch`. It
  **does not** mutate the config file, the ledger,
  `CapabilityNormalizationReport`, `CapabilityMap`, or
  `EvidenceGraph`. No LLM normalization. No source-write
  apply. Suggestion kinds: `add-canonical-verb`,
  `add-canonical-noun`, `add-verb-alias`, `add-noun-alias`.
  `termKind: candidate` decisions are skipped in v1 with
  the reason *"candidate-level decisions require manual
  ontology editing."*. `rename-symbol`, `noise-filter`,
  `defer` decisions are ignored. Duplicates are deduped
  deterministically.

  No version bump. No npm publish. No git tag. No GitHub
  Release. No new permission. No workflow YAML. No new
  package. New 17-assertion contract test + 9-assertion
  docs test. New docs at
  [`docs/artifacts/capability-ontology-suggestion-report.md`](docs/artifacts/capability-ontology-suggestion-report.md).
  Review packet
  [`.rekon-dev/review-packets/capability-ontology-suggestions.md`](.rekon-dev/review-packets/capability-ontology-suggestions.md).
  Recommended next slice: *capability ontology suggestion
  publication surfacing* — surface the latest suggestion
  report inside `architecture-summary` /
  `agent-contract` publications.

- Shipped **Capability ontology unknown-term operator review
  surface** — Option C from the built-in baseline coverage
  review, and step 4a of the capability-ontology
  translation-layer implementation sequence. New artifact
  `CapabilityNormalizationReviewLedger` (registered in
  `@rekon/sdk` + `@rekon/runtime`, category `actions`).
  Three new CLI subcommands:

    - `rekon capability ontology review suggestions
      --report <CapabilityNormalizationReport-id|type:id>
      [--limit <n>] [--include-decided] [--json]`
    - `rekon capability ontology review decide --term <text>
      --term-kind verb|noun|candidate --decision
      extend-ontology|rename-symbol|noise-filter|defer
      --reason <text> [--suggested-canonical <text>]
      [--report <CapabilityNormalizationReport-id|type:id>]
      [--candidate <candidate-id>] [--json]`
    - `rekon capability ontology review decisions [--json]`

  The ledger is **append-only**. Decisions are operator-
  supplied; recording `extend-ontology` does **not**
  automatically mutate `.rekon/capability-ontology.json`.
  The surface does **not** mutate
  `CapabilityNormalizationReport`, `CapabilityMap`, or
  `EvidenceGraph`. No LLM normalization. No source-write
  apply. No new permission. No workflow YAML. No version
  bump. No npm publish. No git tag. No GitHub Release. New
  18-assertion contract test + 12-assertion docs test. New
  docs at
  [`docs/artifacts/capability-normalization-review-ledger.md`](docs/artifacts/capability-normalization-review-ledger.md).
  Review packet
  [`.rekon-dev/review-packets/capability-normalization-review-ledger.md`](.rekon-dev/review-packets/capability-normalization-review-ledger.md).
  Recommended next slice: *capability ontology vocabulary
  expansion v1* — read `extend-ontology` entries and produce
  a `.rekon/capability-ontology.json` preview without
  applying it.

- Shipped **Built-In Baseline Ontology Coverage Review** —
  strategy / dogfood-analysis batch (step 4 of the
  capability-ontology track implementation sequence). Ran
  `rekon capability ontology normalize` against the in-repo
  fixture `examples/simple-js-ts` (4 candidates) and against a
  real-world Next.js TypeScript repo anonymized as `target-1`
  (9,110 candidates: 100 normalized, 5,558 unknown, 2,054
  low-confidence, 226 ignored, 561 alias-applied). The review
  pins:
    - **Baseline is sufficient** for audit-only v1.
    - **Baseline is not yet sufficient** for `CapabilityMap`
      v2 — the unknown set is dominated by symbol noise plus
      lexical-split limitations on proper-noun-prefixed
      identifiers and path-shaped capability hints, not by a
      pure vocabulary gap.
    - **Next implementation slice: Option C** — capability
      ontology unknown-term operator review surface. Option A
      (vocabulary expansion) follows, gated on Option C.
      Option B (`CapabilityMap` v2) remains deferred.

  New strategy memo
  [`docs/strategy/builtin-ontology-coverage-review.md`](docs/strategy/builtin-ontology-coverage-review.md)
  with the three required diagnostic tables (target / summary
  / cause), the options-considered table, and the
  baseline-sufficiency + `CapabilityMap` readiness decisions.
  New 11-assertion docs test. Review packet
  [`.rekon-dev/review-packets/builtin-ontology-coverage-review.md`](.rekon-dev/review-packets/builtin-ontology-coverage-review.md).
  **No runtime change. No ontology vocabulary change. No CLI
  change. No artifact shape change. No version bump. No npm
  publish. No git tag. No GitHub Release. No source-write
  apply. No `EvidenceGraph` mutation. No `CapabilityMap`
  mutation.**

- Shipped **CapabilityNormalizationReport v1**
  — first runtime implementation slice on
  the capability-ontology track. Ships
  `@rekon/capability-ontology` (new package,
  `projector` role) + registers
  `CapabilityNormalizationReport` in the
  SDK + runtime (`projections` category).
  The package compiles an in-memory
  `EffectiveCapabilityOntology` from a
  built-in baseline vocabulary + optional
  `.rekon/capability-ontology.json`,
  extracts candidates from `EvidenceGraph`
  `symbol` / `export` / `capability_hint` /
  `ownership_hint` facts, deterministically
  splits camelCase / snake_case /
  kebab-case names into verb + noun tokens,
  and emits a
  `CapabilityNormalizationReport` audit
  artifact. New CLI command
  `rekon capability ontology normalize
  [--root <path>] [--json]`. **No
  `EvidenceGraph` mutation. No
  `CapabilityMap` mutation. No finding
  mutation. No LLM normalization. No
  source-write apply. No new permission.
  No workflow YAML. No version bump. No
  npm publish. No git tag. No GitHub
  Release.** New 19-assertion contract
  test + 10-assertion docs test. New docs
  at
  [`docs/artifacts/capability-normalization-report.md`](docs/artifacts/capability-normalization-report.md)
  and
  [`docs/concepts/capability-ontology.md`](docs/concepts/capability-ontology.md).
  Review packet
  [`.rekon-dev/review-packets/capability-normalization-report-v1.md`](.rekon-dev/review-packets/capability-normalization-report-v1.md).
  Layer 6 (`CapabilityMap` integration) is
  still deferred to v2. Layer 7
  (`RefactorPreservationContract`) is
  far-future. Recommended next slice:
  built-in baseline ontology coverage
  review against operator dogfood output
  (step 4 of the translation-layer
  decision implementation sequence) —
  gated on one or more operator runs of
  the normalize CLI.

- Shipped **Capability Ontology Translation
  Layer Decision** — second slice on the
  capability-ontology track. Strategy /
  decision / docs / tests-only batch. Pins
  **Option C — layered config-first
  ontology + artifact-backed normalization
  report**.

  **No `@rekon/capability-ontology` package
  implementation. No
  `CapabilityNormalizationReport`
  registration. No
  `RefactorPreservationContract`
  registration. No `EvidenceGraph` /
  `CapabilityMap` / `FindingReport` /
  `FindingFilterReport` /
  `IssueAdjudicationReport` /
  `CoherencyDelta` / `ReconciliationPlan`
  / `ReconciliationPreview` /
  `VerificationRun` / `VerificationResult`
  / memory / publication behaviour
  change. No new capability package
  shipped. No new CLI command. No new
  validator. No new writer. No new
  permission. No new role. No workflow
  YAML. No `package.json` /
  `package-lock.json` mutation. No
  source-file mutation. No source-write
  apply. No LLM-only normalization. No
  port of the classic
  `GraphOntologyValidator` monolith. No
  npm publish. No version bump. No git
  tag. No GitHub Release. No new branch.
  No network I/O.**

  **What landed:**
  - New strategy memo
    `docs/strategy/capability-ontology-translation-layer-decision.md`
    with all 18 required headings + 3
    required diagnostic tables (option /
    layer / unknown term).
  - Review packet
    `.rekon-dev/review-packets/capability-ontology-translation-layer-decision.md`
    with PURPOSE PRESERVATION CHECK + all
    13 required sections.
  - New 16-assertion docs test
    `tests/docs/capability-ontology-translation-layer-decision.test.mjs`.
  - Cross-link updates: architecture
    impact review (Follow-Up section
    pointed at this decision),
    graph-ontology-validator-lite-audit
    (forward pointer extended),
    graph-aware-finding-filters concept
    (cross-link to layered model),
    evidence-graph artifact reference
    (boundary pin extended into
    eight-layer model),
    reconciliation-preview concept
    (phase-5 RefactorPreservationContract
    forward link extended), both
    roadmaps, README.

  **Eight-layer internal model
  (refines the macro five-layer
  boundary):**
  - Layer 0 `EvidenceGraph` — raw
    observed facts (input)
  - Layer 1 `CapabilityCandidateSet`
    — extracted candidates
    (conceptual / helper)
  - Layer 2 `CapabilityLexicalSplit`
    — verb / noun split (helper)
  - Layer 3 `CapabilityOntology` —
    vocabulary / aliases (**config**)
  - Layer 4
    `EffectiveCapabilityOntology` —
    compiled vocabulary (**internal**)
  - Layer 5
    `CapabilityNormalizationReport` —
    translation audit (**first
    artifact**)
  - Layer 6 `CapabilityMap` —
    normalized projection (**deferred
    to v2**)
  - Layer 7
    `RefactorPreservationContract` —
    preservation obligations (future)

  **Pinned verbatim (asserted by the
  docs test):**
  - `CapabilityOntology` starts as
    config / source vocabulary.
  - `EffectiveCapabilityOntology` is
    internal in v1.
  - `CapabilityNormalizationReport`
    is the first registered artifact.
  - `CapabilityMap` integration is
    deferred to v2.
  - `EvidenceGraph` raw facts are
    unchanged.
  - Unknown verbs / nouns must surface
    to operators.
  - LLM suggestions are not truth in
    v1.
  - Do not flatten the ontology into a
    single config / report layer.

  **Selected:** `@rekon/capability-ontology`
  (new package, not created in this
  slice) as the owning package.
  `.rekon/capability-ontology.json`
  selected as the v1 config source
  (optional; built-in baseline
  vocabulary is the default).

  **Recommended next slice:**
  *`CapabilityNormalizationReport` v1*
  — register the artifact, implement
  first-pass normalization from
  `EvidenceGraph` symbol / export /
  capability-hint facts using the
  built-in baseline vocabulary +
  optional
  `.rekon/capability-ontology.json`,
  surface unknown verbs / nouns as
  first-class entries. No
  `CapabilityMap` mutation. No
  LLM-only normalization. No source
  writes.

- Shipped **Capability Ontology Architecture
  Impact Review** — first slice on the
  capability-ontology track. Strategy /
  architecture / docs / tests-only batch.
  Maps the blast radius of a future
  capability-ontology / translation layer
  across every Rekon surface
  (`EvidenceGraph`, `ObservedRepo`,
  `OwnershipMap`, `CapabilityMap`,
  `FindingReport`, `FindingFilterReport`,
  `IssueAdjudicationReport`,
  `CoherencyDelta`, `ReconciliationPlan`,
  `ReconciliationPreview`,
  `VerificationRun` / `VerificationResult`,
  memory, architecture summary, agent
  contract, GitHub review surfaces, future
  `RefactorPreservationContract`).

  **No `CapabilityOntology` implementation.
  No `CapabilityNormalizationReport`
  registration. No
  `RefactorPreservationContract`
  registration. No `EvidenceGraph` /
  `CapabilityMap` / `FindingReport` /
  `FindingFilterReport` /
  `IssueAdjudicationReport` /
  `CoherencyDelta` / `ReconciliationPlan` /
  `ReconciliationPreview` /
  `VerificationRun` / `VerificationResult`
  / memory / publication behaviour change.
  No new capability package. No new CLI
  command. No new validator. No new
  writer. No new permission. No new role.
  No workflow YAML. No `package.json`
  mutation. No source-file mutation. No
  source-write apply. No LLM-only
  normalization. No port of the classic
  `GraphOntologyValidator` monolith. No
  npm publish. No version bump. No git
  tag. No GitHub Release. No new branch.
  No network I/O.**

  **What landed:**
  - New strategy memo
    `docs/strategy/capability-ontology-architecture-impact-review.md`
    with 13 required headings + 3 required
    diagnostic tables (architecture impact
    / boundary / risk).
  - Review packet
    `.rekon-dev/review-packets/capability-ontology-architecture-impact-review.md`
    with PURPOSE PRESERVATION CHECK + all
    11 required sections.
  - New 15-assertion docs test
    `tests/docs/capability-ontology-architecture-impact-review.test.mjs`.
  - Cross-link updates:
    `docs/strategy/graph-ontology-validator-lite-audit.md`
    forward-pointer; `docs/concepts/graph-aware-finding-filters.md`
    notes the future phase-3 consumer;
    `docs/artifacts/evidence-graph.md`
    pins the raw-evidence-immutable
    boundary; `docs/concepts/reconciliation-preview.md`
    forward-links the phase-5
    `RefactorPreservationContract`
    future; both roadmaps and README
    updated.

  **Eight architectural decisions pinned
  (asserted by the docs test):**
  1. Rekon still needs the ontology
     function.
  2. The ontology function should not be
     a monolithic validator.
  3. Raw evidence must remain separate
     from normalized purpose.
  4. Normalization decisions need an
     audit artifact.
  5. `CapabilityMap` should eventually
     consume normalized capability
     claims.
  6. `RefactorPreservationContract`
     depends on normalized capability
     language.
  7. LLM-only normalization is not
     acceptable as truth.
  8. Unknown verbs / nouns must surface
     to operators.

  **Five-layer boundary established:**
  - `EvidenceGraph` — raw observed facts
  - `CapabilityOntology` — canonical
    vocabulary / aliases (name reserved;
    config-vs-artifact deferred to the
    next slice)
  - `CapabilityNormalizationReport` —
    translation audit (name reserved;
    registration deferred)
  - `CapabilityMap` — normalized
    capability projection (consumer)
  - `RefactorPreservationContract` —
    preservation obligations (name
    reserved; registration deferred to a
    much later slice)

  **Recommended next slice:** *Capability
  Ontology Translation Layer Decision*
  memo. That memo will decide whether
  `CapabilityOntology` is config /
  artifact / both, name the owning
  capability package, define the
  phase-1 audit artifact shape, and pin
  the unknown-term review path.

- Shipped **Reconciliation Exact-Diff
  Operation v1** — first reconciliation
  implementation slice following the
  Plan-Generator Diff Data Discovery memo's
  recommended next step. Adds the new
  `exact_text_replacement` operation kind
  plus optional additive `beforeText` /
  `afterText` / `diffKind` fields on
  `CoherencyRemediationStep`,
  `RemediationItemLike`, and
  `ReconciliationPlanOperation`.
  Reconciliation Preview v1 now renders a
  real unified diff against a real
  generator.

  **No source-write apply. No `rekon
  reconcile apply` CLI. No `source:write`
  permission registration. No
  `ReconciliationApplyReport`
  registration. No `ReconciliationPreviewReport`
  registration. No durable preview
  artifact. No schema-version bump (all
  changes are additive + optional). No
  auto-resolve of findings. No
  auto-apply. No auto-verification. No
  workflow YAML. No GitHub API call. No
  `package.json` / `package-lock.json`
  mutation. No source-file mutation in
  any `packages/*/src/*` outside the
  edits described below. No npm publish.
  No version bump. No git tag. No GitHub
  Release. No new branch. No network
  I/O. No mutation of any operator
  repo.**

  **What landed:**
  - `@rekon/kernel-findings`:
    `CoherencyRemediationStep` gains
    optional `beforeText`, `afterText`,
    `diffKind` fields; the
    `CoherencyDelta` validator
    typechecks them when present.
  - `@rekon/capability-reconcile`:
    `RemediationItemLike` +
    `ReconciliationPlanOperation` gain
    the same three fields;
    `ReconciliationOperation` union
    gains the `exact_text_replacement`
    variant; the new
    `tryClassifyExactTextReplacement`
    helper enforces an eight-precondition
    safety gate; the suggestion-mode
    actuator + `classifyRemediationItem`
    + `suggestReconciliationOperations`
    + `ReconciliationSuggestionInput`
    learn to honor an optional
    `repoRoot`.
  - `packages/cli`: the `rekon
    reconcile suggest` command passes
    `repoRoot: root` through the
    actuator input so the safety
    gate's file-read check runs
    against the real working tree.
  - New deterministic fixture at
    `tests/fixtures/reconciliation-preview/exact-diff-v1/`
    with `target.ts` whose content
    matches the seeded
    `CoherencyDelta`'s `beforeText`
    byte-for-byte.
  - New 13-assertion contract test
    `tests/contract/reconciliation-exact-diff-operation.test.mjs`
    exercising the validator, the
    classifier's happy path + all four
    failing-precondition paths, the
    preview's previewable + diff
    render, the preview's drift
    rejection, the read-only
    guarantee on source files +
    artifacts, and `artifacts
    validate` cleanliness.
  - New strategy memo
    `docs/strategy/reconciliation-exact-diff-operation-v1.md`.
  - Review packet
    `.rekon-dev/review-packets/reconciliation-exact-diff-operation-v1.md`
    with PURPOSE PRESERVATION CHECK +
    all 11 required sections.
  - New 7-assertion docs test
    `tests/docs/reconciliation-exact-diff-operation.test.mjs`.
  - Cross-link updates: reconciliation
    preview concept, reconciliation
    plans concept, ReconciliationPlan
    artifact reference, plan-generator
    diff data discovery (Follow-Up
    resolves to this slice), preview
    report artifact decision (gating
    condition #1 now satisfied),
    source-write reconciliation policy
    decision, both roadmaps, README.

  **Pinned posture statements
  (asserted by the docs test):**
  - *Source-write apply remains
    unavailable.*
  - *Exact diff is generated only when
    deterministic.*
  - *Previewable diff does not resolve
    findings.*

  **Eight-precondition safety gate
  (asserted by the contract test):**
  1. Patch triple present + non-empty
  2. `diffKind === "exact-text-replacement"`
  3. `repoRoot` supplied
  4. Exactly one file path
  5. Path is repo-relative (no `/`
     prefix, no `..` escapes)
  6. Current file exists + readable
  7. Current content equals
     `beforeText` byte-for-byte
  8. `afterText` differs from
     `beforeText`

  **Recommended next slice:**
  *Exact-diff operation safety
  review.* Reviews whether the
  eight-precondition shape is right
  for additional operation classes,
  ReconciliationPreviewReport
  registration, and apply permission
  design.

- Shipped **Plan-Generator Diff Data
  Discovery** — first reconciliation slice
  after the deliberate pause point pinned by
  the ReconciliationPreviewReport artifact
  decision. Strategy / product-discovery /
  docs / tests-only batch.

  **Finding:** **no current plan generator
  emits exact `beforeText` / `afterText`
  data.** Two generation paths exist today
  (`runLegacyMode` + `runSuggestionMode` in
  `packages/capability-reconcile/src/index.ts`);
  both produce `ReconciliationPlan` operations
  carrying only structural metadata sourced
  from a `CoherencyRemediationStep` —
  `operation`, `class`, `status`, `reason`,
  `findingId`, `priority`, `files` (paths
  only), `systems`, `suggestedAction`, source,
  optional `requiresPermission`. **No
  `beforeText`, no `afterText`, no
  `replacementText`, no diff body, no
  `expectedBeforeDigest`.** `resolve.issue`
  produces `ResolverPacket` and is **not** a
  plan-generation path.

  No `ReconciliationPreviewReport`
  registration. No `source:write` permission
  registration. No `ReconciliationApplyReport`
  registration. No source-write apply. No new
  CLI command. No helper change. No
  `ReconciliationPlan` schema change in this
  slice. No `buildReconciliationPreview`
  change. No `rekon reconcile preview`
  change. No runtime behaviour change. No
  GitHub API call. No workflow YAML. No
  `package.json` / `package-lock.json`
  mutation. No source-file mutation in any
  `packages/*/src/*`. No npm publish. No
  version bump. No git tag. No GitHub
  Release. No new branch.

  **What landed:**
  - New strategy memo
    `docs/strategy/plan-generator-diff-data-discovery.md`
    with Decision Summary, Why This
    Discovery Exists, Current Plan
    Generation Paths, Current Operation
    Shapes, Diff-Ready Operation Classes,
    Gaps, Options Considered (A/B/C),
    Recommendation, What This Does Not Do,
    Follow-Up Work.
  - Review packet
    `.rekon-dev/review-packets/plan-generator-diff-data-discovery.md`
    with PURPOSE PRESERVATION CHECK + all
    11 required sections.
  - New 10-assertion docs test
    `tests/docs/plan-generator-diff-data-discovery.test.mjs`.
  - Cross-link updates: reconciliation
    preview report artifact decision
    (Follow-Up section now references this
    discovery), reconciliation preview v1
    memo (next-slice scoped to "narrow
    `ReconciliationPlan` exact-diff
    operation v1"), reconciliation preview
    concept doc, roadmap,
    classic-behavior-roadmap, README.

  **Pinned posture statements (asserted by
  the docs test):**
  - *Source-write apply remains
    unavailable.*
  - *ReconciliationPreviewReport remains
    unregistered.*

  **Recommendation:** do **NOT** register
  `ReconciliationPreviewReport` yet.
  Schedule the next reconciliation slice as
  **narrow `ReconciliationPlan` exact-diff
  operation v1**: pick one deterministic
  operation class, teach the generator to
  read the current file + compute the
  canonical post-apply content, attach
  `beforeText` + `afterText` as additive
  optional fields to
  `ReconciliationPlanOperation`. Source-write
  apply stays unavailable through that
  slice. Fallback if the operation-class
  pick is blocked: *ReconciliationPlan
  operation-shape strengthening decision*
  memo.

- Shipped **ReconciliationPreviewReport artifact
  decision** — first decision slice after the
  Reconciliation Preview v1 shipment. Records
  **Option A — reserve the
  `ReconciliationPreviewReport` artifact name;
  defer registration.**

  **Strategy / docs / tests-only batch.** No
  artifact type registered. No validator
  added. No writer added. No artifact category
  map change. No new CLI command. No
  modification of `buildReconciliationPreview`.
  No modification of `rekon reconcile preview`.
  No modification of `ReconciliationPlan`
  shape. No source-write apply. No
  `source:write` permission registration. No
  `ReconciliationApplyReport` registration.
  No GitHub API call. No workflow YAML. No
  `package.json` / `package-lock.json`
  mutation. No source-file mutation in any
  `packages/*/src/*`. No npm publish. No
  version bump. No git tag. No GitHub
  Release. No new branch. No network I/O.

  **What landed:**
  - New strategy memo
    `docs/strategy/reconciliation-preview-report-artifact-decision.md`
    with Decision Summary, Why This Decision
    Exists, Current State, Options
    Considered (A/B/C), Recommendation,
    Conditions For Future Registration,
    Reserved Vocabulary, What This Decision
    Does Not Do, Cross-References, Status,
    Follow-Up.
  - Review packet
    `.rekon-dev/review-packets/reconciliation-preview-report-artifact-decision.md`
    with PURPOSE PRESERVATION CHECK + all
    11 required sections.
  - New 17-assertion docs test
    `tests/docs/reconciliation-preview-report-artifact-decision.test.mjs`.
  - Cross-link updates: reconciliation
    preview v1 memo (Follow-Up section
    now resolves to this decision),
    reconciliation preview concept doc,
    source-write reconciliation policy
    decision (step 5a row), reconciliation
    plans concept, ReconciliationPlan
    artifact reference, roadmap,
    classic-behavior-roadmap, README.

  **Pinned posture statements (asserted by
  the docs test):**
  - *ReconciliationPreviewReport is not
    registered as a Rekon artifact in this
    slice.*
  - *The artifact name
    `ReconciliationPreviewReport` is
    reserved.*
  - *No `ReconciliationPreviewReport`
    validator, writer, or category is
    added.*
  - *Reconciliation Preview v1 remains a
    read-only, in-memory projection of
    `ReconciliationPlan`.*
  - *Source-write apply remains
    unavailable.*

  **Future registration gated on at least
  two of:**
  1. A plan generator emitting forward-compat
     `beforeText` + `afterText` for at
     least one real operation class.
  2. A source-write apply slice being
     queued or shipped.
  3. A publication or GitHub review
     surface that needs preview content
     inline.
  4. Operator cohort feedback explicitly
     asking for durable previews.

  **Reconciliation track is now at a
  deliberate pause point.** The next
  useful slice will be one of:
  *plan-generator diff data*, *apply
  permission + rollback design memo*,
  *publication that consumes preview
  content*, or *operator cohort
  onboarding* — whichever product signal
  arrives first.

- Shipped **Reconciliation Preview v1** — the
  first product capability batch after the
  private-beta operator-support track. Adds a
  read-only preview surface that classifies a
  `ReconciliationPlan` into operator-facing
  rows without crossing into source-write
  apply.

  **No source-write apply. No
  `source:write` permission registration.
  No `ReconciliationApplyReport` artifact
  (still reserved). No `ReconciliationPreviewReport`
  artifact in v1 (decision deferred to the
  next slice). No mutation of
  `ReconciliationPlan` shape. No
  auto-resolve of findings. No auto-apply
  of reconciliation. No auto-verification.
  No workflow YAML. No GitHub API call. No
  `package.json` mutation outside additive
  helper exports. No npm publish. No
  version bump. No git tag. No GitHub
  Release. No new branch.**

  **What landed:**
  - New pure helper
    `buildReconciliationPreview` in
    `@rekon/capability-reconcile` plus the
    public types `ReconciliationPreview`,
    `ReconciliationPreviewOperation`,
    `ReconciliationPreviewOperationKind`
    (`artifact-only` / `source-patch` /
    `generated-file` / `manual` /
    `not-previewable`),
    `ReconciliationPreviewRisk` (`low` /
    `medium` / `high` / `unknown`),
    `ReconciliationPreviewSummary`,
    `ReconciliationPreviewRecommendation`,
    `ReconciliationPreviewStatus`, and
    `ReconciliationPreviewInput`.
  - New CLI subcommand
    `rekon reconcile preview --plan
    <id|type:id> [--root <path>] [--json]`.
    Reads the plan via the existing
    artifact store, builds the preview,
    writes NO artifacts, prints JSON or a
    short human table with the
    *"Source-write apply is not available."*
    recommendation line.
  - Forward-compatible unified-diff path
    in the helper: when an operation
    carries `beforeText` + `afterText` AND
    `repoRoot` is supplied AND the named
    file's content matches `beforeText`,
    the helper emits a deterministic
    one-hunk unified diff. v1 plans carry
    no diff fields, so v1 emits no diffs
    through normal flow.
  - New concept doc
    `docs/concepts/reconciliation-preview.md`
    + strategy memo
    `docs/strategy/reconciliation-preview-v1.md`.
  - Contract test
    `tests/contract/reconciliation-preview.test.mjs`
    (13 assertions) + docs test
    `tests/docs/reconciliation-preview.test.mjs`
    (8 assertions).
  - Review packet
    `.rekon-dev/review-packets/reconciliation-preview-v1.md`
    with PURPOSE PRESERVATION CHECK + all
    11 required sections.
  - Cross-link updates: source-write
    reconciliation policy decision (now
    lists this slice as step 5; the
    earlier patch-preview-artefact entry
    moved to step 5a), reconciliation
    plans concept, ReconciliationPlan
    artifact reference, proof report
    publication concept, roadmap,
    classic-behavior-roadmap, README.

  **Pinned posture statements (asserted by
  the docs test):**
  - *Source-write apply is not available.*
  - *Exact diff preview is mandatory
    before any apply implementation.*
  - *The preview does not resolve
    findings.*
  - Non-previewable operations are
    explicit (every non-previewable
    operation carries a `reason` string).

  **Recommended next slice:**
  *ReconciliationPreviewReport artifact
  decision* — decide whether previews
  should become durable artifacts before
  any source-write apply path exists.

- Shipped **Private Beta Onboarding Quickstart
  Refinements v2** (fourth post-track
  operator-support slice following the
  onboarding validation report). Closes the
  two documentation gaps surfaced by the
  validation run.

  **Docs / support / tests-only batch.** No
  npm publish. No version bump. No git tag.
  No GitHub Release. No runtime behaviour
  change. No new CLI command. No new helper.
  No schema change. No new artifact type. No
  new permission. No new role. No workflow
  YAML. No validator profile change. No
  package-manager detection added. No
  GitHub API call. No `package.json` /
  `package-lock.json` mutation. No
  source-file mutation. No mutation of any
  operator repo. No network I/O. No new
  branch. No change to VerificationPlan
  generation. No change to artifacts
  freshness behaviour. No change to path
  freshness behaviour. No change to
  missing-script tolerance.

  **What landed:**
  - `docs/beta/private-beta-onboarding-quickstart.md`
    gains *Three Freshness Surfaces
    Operators Confuse* subsection inside
    *Run Path Freshness* (diagnostic table
    + three rules of thumb covering
    `artifacts validate` / `artifacts
    freshness` / `paths freshness`).
  - Same file gains *Inspect The Plan
    Before Executing* subsection inside
    *Optional Verification Flow* (covers
    npm / pnpm / yarn / bun / turbo / nx /
    make; pins the dry-run-first flow;
    routes package-manager mismatch as a
    planning / ergonomics report).
  - `docs/beta/private-beta-support-playbook.md`
    *Acceptable First-Class Outcomes*
    section extended with three new
    bullets: package-manager mismatch /
    missing scripts acceptable when
    `VerificationRun` records them
    honestly; aggregate `artifacts
    freshness` historical stale entries
    not automatically blockers;
    `artifacts validate: invalid` remains
    a blocker.
  - `docs/beta/private-beta-bug-report-template.md`
    gains *Package Manager Used By Target
    Repo* + *Relevant Scripts From
    `package.json`* subsections under
    *Target Repository Shape*, a new
    *Artifacts Freshness Result* section
    after *Path Freshness Result*, and a
    new *VerificationPlan ↔ Package
    Manager Match* section after
    *Verification Result*.
  - `docs/beta/private-beta-onboarding-validation-report.md`
    *Follow-Up Work* updated to record
    that the two documentation gaps were
    addressed by this v2 batch.
  - New review packet
    `.rekon-dev/review-packets/private-beta-onboarding-quickstart-refinements-v2.md`
    with PURPOSE PRESERVATION CHECK + all
    11 required sections.
  - New 18-assertion docs test
    `tests/docs/private-beta-onboarding-quickstart-refinements-v2.test.mjs`.
  - Cross-link updates: roadmap,
    classic-behavior-roadmap, README.

  **Pinned posture statements (asserted
  by the docs test):**
  - *`artifacts validate` is the
    structural artifact validity gate.*
  - *`artifacts freshness` can report
    historical `newer-input-exists`
    entries after re-publication; inspect
    whether the latest major publication /
    refresh step passed before treating
    aggregate stale output as a blocker.*
  - *`paths freshness` is working-tree
    freshness and is separate from
    artifact lineage freshness.*

  **Recommended next slice:** *Private
  beta cohort onboarding plan* — define
  how to invite + support the first
  private beta users / repos using the
  source-checkout distribution + playbook
  + quickstart (with v2 refinements) +
  validation report + bug-report
  template + redaction policy. Still no
  daemon, no background refresh, no npm
  publish, no version bump.

- Shipped **Private Beta Onboarding Validation
  Run — post-intake completion**. The operator
  authorised a target in a subsequent prompt;
  the prior intake-blocked posture was
  resolved and the full validation ran
  end-to-end against a temp copy of one
  non-Rekon Next.js target (anonymized as
  `target-1`). **Outcome:
  `pass-with-known-limitations`.**

  **Strategy / docs / tests-only batch.** No
  npm publish. No version bump. No git tag.
  No GitHub Release. No runtime behaviour
  change. No new CLI command. No new helper.
  No schema change. No new artifact type. No
  new permission. No new role. No workflow
  YAML. No validator profile change. No
  GitHub API call. No `package.json` /
  `package-lock.json` mutation. No
  source-file mutation. No mutation of the
  operator's original target repo (only the
  `mktemp -d` temp copy was used and the
  temp copy was deleted after the run). No
  network I/O. No new branch.

  **What landed:**
  - New `docs/beta/private-beta-onboarding-validation-report.md`
    — canonical post-intake validation report
    with all 15 required headings, four
    required tables (Command Matrix / Output
    Summary / Quickstart Gap / Blocker), and
    all six required verbatim statements. The
    quickstart was followed verbatim with no
    silent adjustments; 22 of 25 commands
    returned `pass`; 3 verification commands
    recorded `failed` honestly (target uses
    `pnpm-workspace`, install was deliberately
    not run in the temp copy — first-class
    acceptable outcome); both GitHub dry-runs
    made zero HTTP calls; `artifacts validate`
    returned `valid: true` at both
    checkpoints; path freshness went `unknown`
    → `fresh` (295 / 295 paths) on the first
    → second run as documented.
  - Re-written review packet
    `.rekon-dev/review-packets/private-beta-onboarding-validation-run.md`
    with PURPOSE PRESERVATION CHECK + all 14
    required sections — re-framed from the
    prior intake-blocked posture to reflect
    the actual post-intake validation run.
  - Updated 17-assertion docs test
    `tests/docs/private-beta-onboarding-validation-run.test.mjs`
    — 16 work-order-required assertions on
    the canonical validation **report** plus
    a 17th assertion that the prior
    intake-request memo is preserved as a
    historical record.
  - Closing pointer added to
    `docs/beta/private-beta-onboarding-validation-intake-request.md`
    noting that the operator authorised the
    target in a subsequent prompt and the
    full validation has shipped (the intake
    memo itself is preserved verbatim).
  - Cross-link updates to the onboarding
    quickstart, support playbook, no-NPM
    beta distribution policy, both
    roadmaps, README.

  **Pinned posture statements (all
  verbatim + asserted by the docs test):**
  - *This batch does not publish to npm.*
  - *This batch does not change package
    versions.*
  - *This batch does not create a git
    tag.*
  - *This batch does not create a GitHub
    Release.*
  - *The validation run used a temp copy
    of a non-Rekon repository.*
  - *Rekon artifacts remain canonical;
    GitHub dry-runs are downstream
    previews.*

  **Quickstart gaps recorded (both minor,
  documentation-only):**
  - *Optional Verification Flow* doesn't
    surface non-npm package managers
    (pnpm / yarn / bun).
  - *Inspect The Main Outputs* doesn't
    surface historical
    `newer-input-exists` warnings after
    re-publication.

  **Zero blockers.**

  **Recommended next slice:** *Private
  beta onboarding quickstart refinements
  v2* — apply the two documentation
  refinements as a focused docs batch.
  **Slice after that:** *Private beta
  cohort onboarding plan.* Still no
  daemon, no background refresh, no npm
  publish, no version bump.

- Shipped **Private Beta Onboarding Validation
  Run** (third post-track operator-support
  slice following the onboarding quickstart) —
  **intake-blocked**. The work order requires
  one operator-supplied non-Rekon target
  repository path plus four other intake
  fields (representative path inside target,
  target description, expected install / build
  hint, sensitive paths or artifacts that must
  be anonymized). None were supplied in the
  batch's prompt, so per the work order's
  explicit stop condition this batch ships a
  short intake request memo instead of the
  full validation report.

  **Strategy / docs / tests-only batch.** No
  npm publish. No version bump. No git tag.
  No GitHub Release. No runtime behaviour
  change. No new CLI command. No new helper.
  No schema change. No new artifact type. No
  new permission. No new role. No workflow
  YAML. No validator profile change. No
  GitHub API call. No `package.json` /
  `package-lock.json` mutation. No
  source-file mutation in any
  `packages/*/src/*`. No mutation of any
  operator repo (none was supplied). No
  network I/O. No new branch.

  **What landed:**
  - New `docs/beta/private-beta-onboarding-validation-intake-request.md`
    — short intake request memo with the
    work order's five required intake
    fields (Target repo path /
    Representative path inside target /
    Target repo description / Any expected
    install/build command / Any sensitive
    paths or artifacts that must be
    anonymized), operator selection
    guidance, anonymization posture,
    what-happens-next, outcome
    classification (`intake-blocked`), and
    the pre-validation gate results on
    commit `8771cf5` (all 9 commands
    pass).
  - New review packet
    `.rekon-dev/review-packets/private-beta-onboarding-validation-run.md`
    with PURPOSE PRESERVATION CHECK + all
    14 required sections (CHANGES MADE /
    PUBLIC API CHANGES / PURPOSE
    PRESERVATION CHECK / CODEBASE-INTEL
    ALIGNMENT / TARGET REPOSITORY /
    COMMAND MATRIX / OUTPUT SUMMARY /
    QUICKSTART GAPS / SUPPORT TEMPLATE
    GAPS / OUTCOME CLASSIFICATION / TESTS
    / VERIFICATION / INTENTIONALLY
    UNTOUCHED / RISKS / FOLLOW-UP / NEXT
    STEP).
  - New 16-assertion docs test
    `tests/docs/private-beta-onboarding-validation-run.test.mjs`.
  - Cross-link updates to the onboarding
    quickstart, support playbook,
    bug-report template, no-NPM beta
    distribution policy, both roadmaps,
    README, CHANGELOG.

  **Pinned posture statements (all
  verbatim + asserted by the docs test):**
  - *This batch does not publish to npm.*
  - *This batch does not change package
    versions.*
  - *This batch does not create a git
    tag.*
  - *This batch does not create a GitHub
    Release.*
  - *The validation run, when executed,
    used a temp copy of a non-Rekon
    repository.*
  - *Rekon artifacts remain canonical;
    GitHub dry-runs are downstream
    previews.*

  **Next slice (blocking on operator
  answer):** the post-intake validation
  run itself, which will produce the
  canonical
  `docs/beta/private-beta-onboarding-validation-report.md`
  with the full structure the work order
  requires + the canonical outcome
  classification (`pass` /
  `pass-with-known-limitations` /
  `blocked`). Still no daemon, no
  background refresh, no npm publish, no
  version bump.

- Shipped **Private Beta Onboarding Quickstart**
  (second post-track operator-support slice
  following the private beta support playbook).
  Distills the playbook into a concise "start
  here" path for new operators: install from
  source checkout, build, pick a target repo,
  run the first scan, inspect canonical
  outputs, run path freshness, optional
  verification chain + optional GitHub review
  dry-runs, recognise first-class outcomes
  vs. blockers, redact before sharing, plan
  the next step.

  **Strategy / docs / tests-only batch.** No
  npm publish. No version bump. No git tag.
  No GitHub Release. No runtime behaviour
  change. No new CLI command. No new helper.
  No schema change. No new artifact type. No
  new permission. No new role. No workflow
  YAML. No validator profile change. No
  GitHub API call. No `package.json` /
  `package-lock.json` mutation. No
  source-file mutation in any
  `packages/*/src/*`. No mutation of any
  operator repo. No network I/O. No new
  branch.

  **What landed:**
  - New `docs/beta/private-beta-onboarding-quickstart.md`
    — operator-facing onboarding quickstart
    with 15 required content headings + three
    required diagnostic tables (First-Run
    Command / Output / Blocker) + closing
    Status section. Includes the full
    `git clone` + `npm ci` + `npm run build`
    install snippet, `mktemp -d` + `git clone
    --local --no-hardlinks` temp-copy pattern
    (with `rsync` fallback for non-git
    sources), the first-scan matrix using
    `CLI="$(pwd)/packages/cli/dist/index.js"`,
    the findings + governance chain, the
    publication outputs, the path-freshness
    first-run guidance, the optional
    verification chain with trailing `|| true`,
    and the dry-run GitHub review surfaces.
  - New review packet
    `.rekon-dev/review-packets/private-beta-onboarding-quickstart.md`
    with PURPOSE PRESERVATION CHECK + all 11
    required sections.
  - New 24-assertion docs test
    `tests/docs/private-beta-onboarding-quickstart.test.mjs`.
  - Cross-link updates to the private beta
    support playbook, the private beta
    bug-report template, the no-NPM beta
    distribution policy, the additional
    real-repo dogfood cohort plan, the
    post-beta dogfood evidence triage memo,
    the path-freshness safety review, both
    roadmaps, README.

  **Pinned posture statements (all verbatim
  + asserted by the docs test):**
  - *Private beta users should not install
    Rekon from npm.*
  - *Private beta is source-checkout based.*
  - *Rekon artifacts are canonical; GitHub
    Checks and PR comments are downstream
    review surfaces.*
  - *Run first scans against a temp copy so
    Rekon artifacts and any target-side build
    / test artifacts do not pollute the
    committed repo.*
  - *Artifact lineage freshness is not
    working-tree freshness.*
  - *Dry-run commands make no network calls.*
  - *GitHub status and comments are not
    canonical truth; Rekon artifacts remain
    canonical.*

  **Recommended next slice:** private beta
  onboarding validation run — operator
  follows the quickstart end-to-end against
  a non-Rekon repo and captures any gaps
  (confusing commands, missing docs, unclear
  outputs, support-template gaps,
  artifact-sharing risks) as a short
  retrospective memo. Still no daemon, no
  background refresh, no npm publish, no
  version bump.

- Shipped **Private Beta Support Playbook**
  (first post-track operator-support slice
  after the path-freshness safety review).
  Converts the now-stable no-NPM private-beta
  posture into a repeatable operator support
  process.

  **Strategy / docs / tests-only batch.** No
  npm publish. No version bump. No git tag.
  No GitHub Release. No runtime behaviour
  change. No new CLI command. No new helper.
  No schema change. No new artifact type. No
  new permission. No new role. No workflow
  YAML. No validator profile change. No
  GitHub API call. No `package.json` /
  `package-lock.json` mutation. No
  source-file mutation in any
  `packages/*/src/*`. No mutation of any
  operator repo. No network I/O.

  **What landed:**
  - New `docs/beta/private-beta-support-playbook.md`
    — operator-facing support playbook with
    14 required sections + the three required
    diagnostic tables (Support Classification
    / Artifact Attachment / Command Matrix).
    `docs/beta/` directory created.
  - New `docs/beta/private-beta-bug-report-template.md`
    — bug-report template with 14 required
    section headings.
  - New review packet
    `.rekon-dev/review-packets/private-beta-support-playbook.md`
    with PURPOSE PRESERVATION CHECK + all 12
    required sections.
  - New 22-assertion docs test
    `tests/docs/private-beta-support-playbook.test.mjs`.
  - Cross-link updates to the no-NPM beta
    distribution policy, real-repo dogfood
    report, additional dogfood cohort plan,
    post-beta dogfood evidence triage memo,
    path-freshness safety review, both
    roadmaps, README.

  **Pinned posture statements (all verbatim
  + asserted by the docs test):**
  - *Private beta support is source-checkout
    based.*
  - *Bug reports must include Rekon artifacts
    or explicit redacted substitutes.*
  - *Private beta users should not install
    from npm.*
  - *Path freshness should be rerun after
    source edits before trusting existing
    artifacts.*
  - *Findings, failed verification, stale
    aggregate freshness, and GitHub
    readiness gaps are not automatically
    blockers.*
  - *Artifact validation failure is a
    blocker.*
  - *CLI crashes, malformed artifacts,
    token/log leaks, source mutation outside
    temp copies, or dry-run network calls
    are blockers.*

  **Recommended next slice:** private beta
  onboarding quickstart — a concise
  operator/user quickstart built from the
  playbook (install from source checkout,
  run the first scan, inspect outputs,
  report issues, refresh after edits). Still
  no daemon, no background refresh, no npm
  publish, no version bump.

- Shipped **Path Freshness Safety Review**
  (final slice in the post-beta watcher /
  path-freshness track). Reviews every component
  end-to-end and pins the decision: **the path
  freshness track is beta-private stable.** No
  additional hardening is required before
  moving on.

  **Strategy / docs / tests-only batch.** No
  runtime behaviour change. No watcher
  behaviour. No daemon parity claim. No claim
  that path freshness is artifact lineage
  freshness. No claim that stale path freshness
  changes Check conclusion. No new package, no
  new CLI command, no new helper, no schema
  change, no new permission, no new artifact
  type, no workflow YAML, no GitHub API call, no
  `npm publish`, no version bump, no release
  tag, no GitHub Release, no `package.json` /
  `package-lock.json` mutation, no source-file
  mutation in any `packages/*/src/*`, no
  network I/O.

  **Components reviewed (all preserved
  end-to-end):**
  - `PathFreshnessReport` artifact — explicit
    + operator-triggered; schema unchanged
    across the three implementation slices.
  - `buildSourceStateFingerprint` — sha256
    canonical; bounded reads; conservative
    default ignore set; `mtimeAdvisory`
    opt-in only.
  - `rekon paths freshness` CLI — read-only
    with respect to source; never recurses;
    never invokes `rekon refresh`.
  - Publication surfacing (architecture
    summary / agent contract / proof report)
    — bounded change table; never invokes
    `rekon paths freshness` or `rekon
    refresh`.
  - GitHub Check + PR comment surfacing —
    trust-warning only; never changes Check
    conclusion; never changes readiness
    gates; never alters GitHub API
    transport.
  - No-daemon / no-background-refresh policy
    — preserved end-to-end.

  **Required statements pinned verbatim:**
  - *"Artifact lineage freshness is not
    working-tree freshness."*
  - *"PathFreshnessReport is explicit and
    operator-triggered."*
  - *"No daemon or background refresh
    exists."*
  - *"Stale path freshness is a warning, not
    a GitHub Check conclusion override."*

  **Tests:** new
  `tests/docs/path-freshness-safety-review.test.mjs`
  (19 assertions). All other pre-existing
  tests still pass.

  **Docs:** new strategy memo
  `docs/strategy/path-freshness-safety-review.md`
  with three required diagnostic tables
  (component / risk / decision); review packet
  `.rekon-dev/review-packets/path-freshness-safety-review.md`
  with PURPOSE PRESERVATION CHECK + all 11
  required sections; cross-link updates to
  watcher memo, triage memo, both roadmaps,
  path-freshness concept + artifact docs,
  freshness-and-invalidation concept doc, agent
  operating contract concept doc, GitHub Actions
  operator guide, README.

  **Recommended next slice:** private beta
  support playbook — define how private beta
  users report issues, attach Rekon artifacts,
  classify blockers vs acceptable findings,
  rerun path freshness after source edits, and
  follow no-npm / source-checkout install
  instructions.

- Shipped **Path Freshness GitHub Review
  Surfacing** (third watcher / path-freshness
  slice, following the publication-surfacing
  slice). Surfaces the latest
  `PathFreshnessReport` in the two GitHub review
  surfaces — Check payload + PR comment body —
  so reviewers see the same working-tree drift
  warning operators already see locally.

  **Builder wiring + helpers + tests + docs
  batch.** No daemon. No background refresh. No
  automatic `rekon refresh` invocation. No
  automatic `rekon paths freshness` invocation.
  No source mutation. No new artifact type. No
  new permission. No new role. No
  `ArtifactHeader` change. No
  `PathFreshnessReport` schema change. No GitHub
  API transport change. **No change to existing
  GitHub Check / PR comment readiness gates.**
  No workflow YAML. No version bump. No `npm
  publish`. No GitHub Release.

  **What landed:**
  - New pure helper
    `buildPathFreshnessGitHubSummary` in
    `@rekon/capability-docs`. Renders the
    compact lines + warning paragraph that both
    surfaces consume.
  - `BuildGitHubCheckPayloadInput` +
    `PrCommentBodyInput` gain optional
    `pathFreshnessReport` + `pathFreshnessRef`
    fields.
  - Check `output.summary` renders a `Working
    tree path freshness:` block (fresh, stale,
    unknown, or no-baseline guidance). The
    `PathFreshnessReport` ref is appended to
    `citedRefs`.
  - PR comment body adds `Working-tree
    freshness` + `PathFreshnessReport` summary
    rows; stale or unknown warning enters the
    existing `### Warnings` section. JSON output
    adds `citedRefs.pathFreshness` (additive
    only).
  - Both CLI publish flows (`publish
    github-check --dry-run`/`--send` and
    `publish pr-comment --dry-run`/`--send`)
    read the latest `PathFreshnessReport` from
    the local store and pass it through. Missing
    report is a no-op.

  **CONCLUSION POLICY (pinned this slice):**
  stale `PathFreshnessReport` is a **visible
  trust warning** in the Check output and PR
  comment body but **does not by itself flip the
  GitHub Check conclusion**. Conclusion
  continues to reflect proof / validation state
  via the existing `pickConclusion` logic. A
  separate decision memo can revisit if beta
  evidence supports hard-gating.

  **Read-only guarantee:** both CLI flows call
  only `pickLatestArtifactEntry` +
  `store.read(...)` against the local store.
  **They never invoke `rekon paths freshness`,
  never invoke `rekon refresh`, never spawn any
  subprocess, never compute a fingerprint, and
  never write a new `PathFreshnessReport`.**
  Contract tests pin this by counting artifacts
  before/after publish and by re-checking
  conclusion across fresh + stale runs.

  **GitHub status / comments remain
  non-canonical;** both surfaces retain their
  existing canonical-truth reminders.

  **Tests:** new
  `tests/contract/path-freshness-github-review.test.mjs`
  (14 cases including conclusion-unchanged +
  fake-API send paths for both surfaces) + new
  `tests/docs/path-freshness-github-review.test.mjs`
  (9 assertions). All other pre-existing tests
  still pass.

  **Docs:** updated
  `docs/concepts/path-freshness.md`,
  `docs/artifacts/path-freshness-report.md`,
  `docs/concepts/proof-report-publication.md`,
  `docs/artifacts/proof-report-publication.md`,
  `docs/examples/github-actions-verification-runner.md`,
  watcher / path freshness policy memo,
  post-beta dogfood evidence triage memo, both
  roadmaps, README. Review packet at
  `.rekon-dev/review-packets/path-freshness-github-review-surfacing.md`
  with PURPOSE PRESERVATION CHECK + CONCLUSION
  POLICY sections.

  **Recommended next slice:** path freshness
  safety review — review the full path-freshness
  track and decide whether to declare it
  beta-private stable or do another hardening
  pass.

- Shipped **Path Freshness Publication Surfacing**
  (second watcher / path-freshness slice,
  following the PathFreshnessReport artefact
  slice). Renders the latest
  `PathFreshnessReport` in the user-facing
  publications operators and agents already
  consume so working-tree drift surfaces where
  decisions are made.

  **Publisher wiring + helpers + tests + docs
  batch.** No daemon. No background refresh. No
  automatic `rekon refresh` invocation. No
  automatic `rekon paths freshness` invocation.
  No source mutation. No new artifact type. No
  new permission. No new role. No
  `ArtifactHeader` change. No
  `PathFreshnessReport` schema change. No
  GitHub send-semantics change. No workflow
  YAML. No version bump. No `npm publish`. No
  GitHub Release. No network I/O.

  **What landed:**
  - New pure helper
    `buildPathFreshnessPublicationSection` in
    `@rekon/capability-docs` (parameterized
    heading level; bounded change-table at 20
    non-fresh entries via
    `PATH_FRESHNESS_PUBLICATION_TABLE_CAP`).
  - Architecture summary publisher renders
    `## Working Tree Path Freshness` between
    `## Verification Proof Status` and `## Proof
    Loop`.
  - Agent contract publisher renders
    `### Working Tree Path Freshness` between
    the Verification Proof Status block and
    Memory Guidance, plus a new
    `## Do Not Do` entry: *"Do not treat
    artifact lineage freshness as proof that the
    working tree has not changed; check the
    latest PathFreshnessReport via `rekon paths
    freshness --json` and run `rekon refresh` if
    the report is stale."*
  - Proof report publisher renders
    `## Working Tree Path Freshness` before
    `## Input Artifacts` (in both the
    normal-flow path and the no-VerificationPlan
    early-bailout path).
  - All three publishers cite the latest
    `PathFreshnessReport` in `header.inputRefs`
    when present.
  - `@rekon/capability-docs` capability manifest
    `consumes` adds `PathFreshnessReport`; new
    `invalidatedBy` rule
    `path-freshness.changed` regenerates
    publications when a new report lands.

  **Read-only guarantee:** publishers call only
  `latestRef` + `artifacts.read` against the
  store. They **never** invoke `rekon paths
  freshness`, **never** invoke `rekon refresh`,
  and **never** write a new `PathFreshnessReport`
  themselves. Contract tests pin both claims by
  count and by id citation.

  **Artifact lineage freshness is distinct from
  working-tree freshness.** The new section
  title, body text, and every recommendation
  message explicitly preserve the distinction.

  **Tests:** new
  `tests/contract/path-freshness-publications.test.mjs`
  (13 cases) + new
  `tests/docs/path-freshness-publications.test.mjs`
  (9 assertions). All other pre-existing tests
  still pass.

  **Docs:** updated
  `docs/concepts/path-freshness.md`,
  `docs/artifacts/path-freshness-report.md`,
  `docs/concepts/architecture-summary-publication.md`,
  `docs/artifacts/architecture-summary-publication.md`,
  `docs/concepts/agent-operating-contract.md`,
  `docs/artifacts/agent-contract-publication.md`,
  `docs/concepts/proof-report-publication.md`,
  `docs/artifacts/proof-report-publication.md`,
  watcher / path freshness policy memo,
  post-beta dogfood evidence triage memo, both
  roadmaps, README. Review packet at
  `.rekon-dev/review-packets/path-freshness-publication-surfacing.md`
  with PURPOSE PRESERVATION CHECK.

  **Deferred (next slice):** GitHub Check
  dry-run / send payload + PR comment
  dry-run / send body surfacing. The
  `buildGitHubCheckPayload` helper computes
  `conclusion` from proof state today; whether
  stale path freshness should ever flip
  conclusion deserves a separate design pass.
  The work order explicitly authorises deferral.

- Shipped **PathFreshnessReport Artifact +
  Source-State Fingerprint Skeleton** (first
  watcher / path-freshness implementation slice
  selected by the post-beta dogfood evidence
  triage decision; Option C). Introduces a new
  artifact type, a deterministic source-state
  fingerprint helper, and a read-only CLI
  surface — without a daemon, without background
  refresh, without source mutation.

  **Runtime + helpers + CLI + tests + docs
  batch.** No watcher daemon. No background
  refresh. No automatic `rekon refresh`
  invocation. No source mutation. No
  `ArtifactHeader` change. No new permission.
  No new role. No workflow YAML. No version
  bump. No `npm publish`. No GitHub Release.
  No GitHub API call. No network I/O.

  **What landed:**
  - New artifact type `PathFreshnessReport`
    registered in `@rekon/sdk` conformance and
    the `@rekon/runtime` category map
    (`"actions"`).
  - New pure helpers
    `createPathFreshnessReport(...)` and
    `comparePathFreshness(current, baseline?)`
    in `@rekon/capability-intent`.
  - New pure helper
    `buildSourceStateFingerprint(input)` in
    `@rekon/kernel-repo-model`. Sha256 content
    hashes, deterministic ordering, default
    ignore set (`.git`, `.rekon`,
    `node_modules`, `dist`, `coverage`,
    `.next`, `.turbo`, `.cache`), bounded
    reads (32 MiB safety cap), `mtimeAdvisory`
    opt-in only — **mtimes are never canonical
    freshness evidence**.
  - New CLI command `rekon paths freshness
    [--path <path>] [--root <path>] [--json]`.
    Read-only with respect to source files.
    First run records `status: "unknown"` with
    a "No baseline" recommendation;
    subsequent runs compare against the most
    recent prior `PathFreshnessReport` and
    record `fresh` / `stale` with a per-path
    entry list and a `rekon refresh`
    recommendation when stale.
  - The new artifact is the working-tree
    counterpart to the existing artifact
    lineage freshness surface. **Artifact
    lineage freshness is not working-tree
    freshness.** The two coexist; neither
    replaces the other.

  **Tests:** new
  `tests/contract/path-freshness-report.test.mjs`
  (15 cases covering deterministic
  fingerprint, ignore-set correctness,
  content-change detection, first-run unknown
  / second-run fresh / changed / missing / new
  flows, `--path` narrowing, recommendation,
  artifact validation, `artifacts validate`
  clean, no-refresh, no source mutation,
  mtime advisory). New
  `tests/docs/path-freshness-report.test.mjs`
  (9 assertions). All other pre-existing
  tests still pass.

  **Docs:** new
  `docs/artifacts/path-freshness-report.md`,
  new `docs/concepts/path-freshness.md`,
  review packet
  `.rekon-dev/review-packets/path-freshness-report.md`
  (with PURPOSE PRESERVATION CHECK).
  Cross-link updates to the watcher / path
  freshness policy memo, the post-beta
  dogfood evidence triage memo, both
  roadmaps, the refresh concept doc, the
  freshness-and-invalidation concept doc, the
  agent operating contract concept doc, the
  architecture summary + agent contract
  publication docs (deferred surfacing note),
  and the README.

  **Out of scope (next slice):** publication
  surfacing — the latest `PathFreshnessReport`
  is not yet rendered in the architecture
  summary, agent contract, or proof report.
  That work is the next slice ("path
  freshness publication surfacing"). Still no
  daemon. Still no background refresh.

- Shipped **Post-Beta Dogfood Evidence Triage
  Decision** (strategy / docs / tests-only
  batch). Reviewed the real-repo cohort
  findings plus the first post-beta polish
  slice (VerificationPlan missing-script
  tolerance) and selected the **next post-beta
  track: Option C — watcher / path freshness
  implementation, starting with the
  `PathFreshnessReport` artifact +
  source-state fingerprint skeleton slice.**

  **Strategy / docs / tests-only batch.** No
  runtime behaviour change. No new package,
  no new CLI command, no new helper, no
  schema change, no new artifact type, no new
  permission, no new role, no workflow
  template change, no validator profile
  change, no GitHub API call, no `npm
  publish`, no version bump, no release tag,
  no GitHub Release, no active workflow YAML,
  no `package.json` / `package-lock.json`
  mutation, no source-file mutation in any
  `packages/*/src/*`, no mutation of any
  operator repo, no network I/O.

  Evidence classification:
  - `npm | pnpm | yarn run <missing-script>`
    classification observation — addressed by
    the missing-script tolerance slice
    already shipped on `cee7af4`.
  - figma-ds typecheck failures in operator
    source — honest failure detection; not a
    Rekon defect; no action.
  - source-write apply unavailable, watcher
    daemon unavailable, hosted GitHub App
    unavailable, Windows process-tree
    direct-child kill, `pr-comment --dry-run`
    readiness false without env — all
    deferred post-beta tracks governed by
    existing policy memos.
  - 0 Rekon-detected findings on three
    cohort targets — no false positives is
    itself a valuable signal; **future
    cohort expansion**, not a polish slice.

  Options reviewed: Option A (continue
  dogfood-surfaced verification polish —
  rejected, no further evidence), Option B
  (source-write apply roadmap — rejected,
  needs path-freshness signals first +
  highest risk surface), Option C (watcher /
  path freshness implementation —
  **selected**, foundational, policy
  already pinned), Option D (rule breadth /
  graph-aware filters — rejected, freshness
  precedes breadth), Option E (memory
  maturity — rejected, fixing derived layer
  before source layer compounds stale
  signal).

  New strategy memo
  `docs/strategy/post-beta-dogfood-evidence-triage.md`;
  new docs test
  `tests/docs/post-beta-dogfood-evidence-triage.test.mjs`
  (12 assertions); review packet
  `.rekon-dev/review-packets/post-beta-dogfood-evidence-triage.md`
  with PURPOSE PRESERVATION CHECK; cross-link
  updates to cohort plan, cohort summary,
  missing-script tolerance memo, watcher /
  path freshness policy memo, roadmap,
  classic-behaviour roadmap, and README.

- Shipped **VerificationPlan Missing-Script
  Tolerance** (post-beta polish slice surfaced by
  the first real-repo cohort). The
  `@rekon/capability-verify` runner now performs a
  pre-flight check on each `npm | pnpm | yarn run
  <script>` command in the plan: when the
  operator's `<cwd>/package.json` proves the
  script is absent, the command is recorded
  `skipped` (not `failed`) with a
  `missing-script: <name>` note and **no process
  is spawned**. The aggregate run status follows
  the existing rules — `partial` for mixed pass +
  skip, `not-run` for all-skipped, `failed` only
  on true failure.

  **Runtime polish + tests + docs batch.** No
  schema change, no new permission, no new
  artifact type, no new CLI command, no
  workflow-template change, no validator profile
  change, no GitHub API call, no `npm publish`,
  no version bump, no release tag, no GitHub
  Release, no active workflow YAML, no
  `package.json` / `package-lock.json` mutation,
  no source mutation in any target repo, no
  network I/O.

  Why: the cohort's two non-`pass` rows
  (`structured-evals` missing `build`; `figma-ds`
  missing `test`) both stemmed from absent
  package.json scripts. Recording those as
  `failed` was technically honest but
  operationally misleading. The fix lives at the
  runner: one pure helper
  (`detectMissingScriptCommands`) plus a
  one-statement wire-in in
  `executeVerificationRun`. `skipped` was
  already wired end-to-end in the schema and
  aggregator — the runner just wasn't emitting
  it for this case.

  Tests: new
  `tests/contract/verification-missing-script-tolerance.test.mjs`
  (15 cases: 7 helper unit + 7 integration + 1
  derivation). Existing 25 cases in
  `verification-run-execution.test.mjs` still
  pass.

  Docs: new strategy memo
  `docs/strategy/verification-missing-script-tolerance.md`;
  new docs test
  `tests/docs/verification-missing-script-tolerance.test.mjs`;
  Missing-Script Tolerance subsection added to
  `docs/concepts/verification-runs.md`; review
  packet
  `.rekon-dev/review-packets/verification-missing-script-tolerance.md`;
  README link to the memo.

- Shipped **Additional Real-Repo Dogfood
  Execution** (P1.1
  additional-real-repo-dogfood-execution slice).
  **Step 7b of the post-blocker release
  sequence** — the cohort execution itself,
  following the operator's approved intake
  table. **Cohort decision:
  `pass-with-known-limitations`. No release
  blockers found.**

  **Release-validation (cohort execution) +
  docs batch.** No runtime behaviour change.
  No new package, no new CLI command, no new
  helper, no workflow-template change, no
  validator profile change, no GitHub API
  call, no `npm publish`, no version bump, no
  release tag, no GitHub Release, no active
  workflow YAML, no `package.json` /
  `package-lock.json` mutation, no source-file
  mutation, no mutation of any cohort target
  repo's actual source tree outside `mktemp -d`
  copies.

  **Three distinct operator-approved real
  repositories** dogfooded against the
  local-built Rekon CLI at version
  `0.1.0-beta.0`, covering all five archetypes
  via two documented consolidations:
  - `boundary-contracts` →
    `<small-ts-package>` +
    `<github-workflows-repo>` (consolidated).
    Outcome: **`pass`**. All 3 verify commands
    (typecheck/test/build) passed; conclusion
    `success`; 34 artefacts; validate clean.
  - `structured-evals` → `<medium-monorepo>`.
    Outcome:
    **`pass-with-known-limitations`**. 6-
    workspace monorepo; typecheck + test
    passed; `npm run build` failed with
    "Missing script: build" — first-class
    behaviour per the cohort plan; validate
    clean.
  - `figma-ds` → `<nextjs-app>` +
    `<mixed-js-ts-repo>` (consolidated).
    Outcome:
    **`pass-with-known-limitations`**. Next.js
    App Router + 251 TS/TSX + 353 JS/JSX/MJS/CJS
    (genuine mix); typecheck failed with real TS
    errors in operator source; test script
    missing; build passed; validate clean.

  **Aggregate cohort metrics:** 102 artefacts
  across 19 types (34 per target × 3 targets);
  every artefact validated clean; no
  corruption; no unreadable publication; no
  token leak; no source mutation outside any
  temp copy; no CLI crash. The verify → result
  → proof → Check dry-run pipeline propagated
  state correctly in both directions
  (`conclusion: success` for boundary-contracts;
  `conclusion: failure` for the two failed
  verifications).

  **Pinned reminders carried forward verbatim:**
  - This batch does not publish to npm.
  - This batch does not change package
    versions.
  - This batch does not create a git tag.
  - This batch does not create a GitHub
    Release.
  - Every target ran from a temp `mktemp -d`
    copy.
  - The next publish step still requires
    explicit operator authorization.
  - Successful cohort does not automatically
    trigger npm publish; revisiting the no-NPM
    posture requires a separate explicit
    operator decision.

  **No release blockers found.** Two targets'
  honest verification failures (structured-
  evals: monorepo missing root `build` script;
  figma-ds: real TS errors + missing `test`
  script) are acceptable outcomes per the
  cohort plan's success criteria.

  **Three observations surfaced by the cohort
  (post-beta polish; not release blockers):**
  1. The verify → result → proof → Check
     dry-run pipeline propagates state
     correctly in both directions
     (`success` ↔ `failure`).
  2. The auto-generated VerificationPlan's
     three-command default
     (typecheck/test/build) is reasonable but
     not universal. Future enhancement could
     detect missing scripts and mark
     `not-applicable` instead of `failed`.
  3. Rekon's import-boundary / structural
     rule packs surface 0 findings on these
     three targets. Could mean clean targets
     or rule-pack-pattern gaps. Broader future
     cohorts would strengthen confidence.

  **Implementation Sequence updated:**
  1. Beta release readiness checklist memo
     (shipped).
  2. Beta release candidate execution plan
     (shipped — against SHA `54d1dfd`).
  3. Beta version bump execution report
     (shipped — `0.1.0-beta.0` applied).
  4. Real-repo beta dogfood report (shipped —
     `pass-with-known-limitations`).
  5. No-NPM beta distribution policy (shipped).
  6. Additional real-repo dogfood cohort plan
     (shipped).
  7a. Real-repo dogfood cohort intake request
      (shipped).
  7b. **Additional real-repo dogfood execution
      (this batch, shipped)** —
      `pass-with-known-limitations` across 3
      distinct real repos covering all 5
      archetypes.
  8. Post-beta source-write apply roadmap (4
     slices). Independent of cohort.
  9. Post-beta path freshness + watcher
     roadmap (4 slices). Independent.
  10. Post-beta breadth / maturity / polish
      work. One item (VerificationPlan
      missing-script tolerance) surfaced by
      this cohort. Independent.
  11. (Optional, deferred) Post-beta npm
      publish authorization work order — only
      after an explicit later operator
      decision reverses the no-NPM policy.

  **New strategy artefacts:**
  - [`docs/strategy/real-repo-cohort-summary.md`](docs/strategy/real-repo-cohort-summary.md)
    cohort summary with all 11 required
    headings + 4 required tables + Dogfood
    Decision recorded.
  - [`docs/strategy/real-repo-cohort/boundary-contracts.md`](docs/strategy/real-repo-cohort/boundary-contracts.md)
    per-target report (outcome: `pass`).
  - [`docs/strategy/real-repo-cohort/structured-evals.md`](docs/strategy/real-repo-cohort/structured-evals.md)
    per-target report
    (`pass-with-known-limitations`).
  - [`docs/strategy/real-repo-cohort/figma-ds.md`](docs/strategy/real-repo-cohort/figma-ds.md)
    per-target report
    (`pass-with-known-limitations`).

  **Tests:** new docs suite
  `tests/docs/additional-real-repo-dogfood-execution.test.mjs`
  with 15 assertions (cohort summary
  existence; all 11 required `##` headings;
  five pinned-statement assertions verbatim;
  cohort target + per-target summary tables;
  blocker table or "No release blockers
  found"; Dogfood Decision recorded; at least
  3 per-target reports exist; each per-target
  report contains all 11 required headings +
  the metrics table; CHANGELOG mention;
  review-packet PURPOSE PRESERVATION CHECK).
  Full suite expected ≥ 1753 passed / 1
  skipped.

  **Docs:** 6 supporting strategy docs updated
  (cohort plan + intake request + no-NPM
  policy + first dogfood report + master
  roadmap + classic-behavior-roadmap
  implementation sequences advanced to mark
  step 7b shipped). README + CHANGELOG
  updated. New review packet at
  `.rekon-dev/review-packets/additional-real-repo-dogfood-execution.md`.

  **Recommended next slice:** operator
  decision. The no-NPM beta posture defers
  this explicitly:
  - Continue beta with the no-NPM posture
    indefinitely.
  - Author additional cohort batches (more
    repos / different archetypes).
  - Pivot to post-beta tracks (source-write
    apply roadmap; path freshness + watcher
    roadmap; breadth / maturity / polish).
  - Open a no-NPM-policy-revision work order
    (requires a new explicit operator
    decision; this batch does not
    pre-authorise one).

  **Out-of-scope and explicitly not shipped:**
  - No `npm publish` invocation.
  - No `package.json` / `package-lock.json`
    mutation (still `0.1.0-beta.0`).
  - No `v0.1.0-beta.0` git tag.
  - No GitHub Release.
  - No active `.github/workflows/*.yml`.
  - No new runtime behaviour.
  - No new CLI command.
  - No new validator profile.
  - No new workflow template.
  - No new artifact type.
  - No new permission.
  - No mutation of any `packages/*/src/*.ts`
    file.
  - No mutation of any cohort target repo's
    source tree outside `mktemp -d` copies.
  - No commit of any `.rekon/**` artefact
    produced by the cohort runs (cohort
    artefacts live in temp directories;
    intentionally ephemeral).
  - No change to the beta-ready decision or
    the no-NPM beta posture.

  **Stop conditions honoured:** every target
  ran from a temp copy; no source mutation
  outside temp copies; no GitHub API call; no
  npm publish; no version bump; no git tag;
  no GitHub Release; no release blocker
  discovered; honest verification failures
  recorded per the cohort plan's
  first-class-failure contract.

- Shipped **Real-Repo Dogfood Cohort Intake
  Request** (P1.1 real-repo-cohort-intake-request
  slice). **Step 7a of the post-blocker release
  sequence** — the cohort execution batch's
  intake substep, triggered when the operator
  did not supply concrete cohort repos in the
  work-order prompt. Per the work-order stop
  condition ("If the operator has not supplied
  repos yet: Stop after writing a short intake
  request. Do not invent repo names. Do not run
  the cohort."), this batch wrote the intake
  request and stopped. **The cohort itself was
  not run; the cohort execution (step 7b)
  remains blocked on operator intake.**

  **Strategy / docs / tests-only batch.** No
  runtime behaviour change. No new package, no
  new CLI command, no new helper, no
  workflow-template change, no validator profile
  change, no GitHub API call, no `npm publish`,
  no version bump, no release tag, no GitHub
  Release, no active workflow YAML, no
  `package.json` / `package-lock.json` mutation,
  no source-file mutation, **no invented repo
  names**.

  **New strategy memo:**
  [`docs/strategy/real-repo-cohort-intake-request.md`](docs/strategy/real-repo-cohort-intake-request.md)
  records:
  - The pre-cohort verification gate result (all
    9 mandatory commands passed on the primary
    tree at SHA `b80be3e`; 1728 / 1 skipped).
  - The intake table the operator needs to fill
    in (5-row table with placeholders for the
    cohort plan's 5 archetypes; at least 3
    distinct concrete repos required;
    representative path per row;
    anonymisation-preference column).
  - Operator selection guidance carried forward
    from the cohort plan.
  - Anonymisation posture: default to anonymise
    private repo names in cohort reports unless
    the operator explicitly approves naming.
  - Updated implementation sequence with step
    7a (this memo, shipped) + step 7b (cohort
    execution, blocked on operator intake).

  **Pinned reminders carried forward verbatim:**
  - No npm publish during beta.
  - Beta is private / local / repo-based.
  - At least three distinct real repositories
    must be exercised before any post-beta
    publish reconsideration.
  - No cohort target may be Rekon itself.
  - Do not invent repo names.
  - This batch does not run the cohort.

  **Pre-cohort verification (run on this
  commit):** all 9 mandatory verification
  commands passed (typecheck; test 1728 / 1
  skipped; build; git diff --check;
  audit-package-exports; audit-license;
  publish-dry-run; install-smoke;
  install-tarball-smoke). The Rekon CLI is
  ready; only the cohort execution is blocked.

  **Implementation Sequence updated:**
  1. Beta release readiness checklist memo
     (shipped).
  2. Beta release candidate execution plan
     (shipped — against SHA `54d1dfd`).
  3. Beta version bump execution report
     (shipped — `0.1.0-beta.0` applied).
  4. Real-repo beta dogfood report (shipped —
     `pass-with-known-limitations`).
  5. No-NPM beta distribution policy (shipped
     — replaces the previously-planned publish
     authorization work order).
  6. Additional real-repo dogfood cohort plan
     (shipped — 5 archetypes; ≥ 3 distinct
     real repositories required).
  7a. **Real-repo dogfood cohort intake
      request (this memo, shipped)** —
      awaiting operator-supplied intake table.
  7b. Additional real-repo dogfood execution
      — **blocked on operator intake.**
      Resumes once the operator answers the
      intake table.
  8. Post-beta source-write apply roadmap (4
     slices). Independent of cohort.
  9. Post-beta path freshness + watcher
     roadmap (4 slices). Independent.
  10. Post-beta breadth / maturity / polish
      work. Independent.
  11. (Optional, deferred) Post-beta npm
      publish authorization work order — only
      after broader real-repo dogfood + an
      explicit later operator decision
      reverses the no-NPM policy.

  **Tests:** new docs suite
  `tests/docs/real-repo-cohort-intake-request.test.mjs`
  with 10 assertions (memo existence; all 10
  required `##` headings; all 5 archetype
  placeholders; "do not invent repo names" +
  "no cohort target may be Rekon itself" +
  "this batch does not run the cohort" +
  "cohort execution blocked on operator
  intake" verbatim; pre-cohort verification
  recorded; CHANGELOG mention; review-packet
  PURPOSE PRESERVATION CHECK). Full suite
  expected ≥ 1738 passed / 1 skipped.

  **Docs:** 4 supporting strategy docs updated
  (cohort plan + no-NPM policy + master
  roadmap + classic-behavior-roadmap
  implementation sequences advanced to mark
  step 7a shipped + step 7b blocked).
  README + CHANGELOG updated. New review
  packet at
  `.rekon-dev/review-packets/real-repo-cohort-intake-request.md`.

  **Recommended next slice:** wait for
  operator intake response. Once the operator
  supplies the intake table, the **additional
  real-repo dogfood execution** batch can run:
  substitutes the operator's concrete repos
  for each archetype placeholder; runs the
  per-target matrix; writes per-target
  reports + cohort summary + cohort execution
  review packet + cohort execution docs test.
  Still no npm publish; still no version
  bump; still no git tag.

  **Out-of-scope and explicitly not shipped:**
  - No cohort execution. The cohort is
    blocked on operator intake.
  - No invented repo names. Placeholders stay
    placeholders.
  - No `docs/strategy/real-repo-cohort/`
    per-target report files (written by the
    cohort execution batch).
  - No `docs/strategy/real-repo-cohort-summary.md`
    (written by the cohort execution batch).
  - No `npm publish` invocation.
  - No `package.json` / `package-lock.json`
    mutation (still `0.1.0-beta.0`).
  - No `v0.1.0-beta.0` git tag.
  - No GitHub Release.
  - No active `.github/workflows/*.yml`.
  - No new runtime behaviour.
  - No new CLI command.
  - No new validator profile.
  - No new workflow template.
  - No new artifact type.
  - No new permission.
  - No mutation of any `packages/*/src/*.ts`
    file.
  - No mutation of the committed
    `examples/simple-js-ts` fixture.
  - No change to the beta-ready decision or
    the no-NPM beta posture.

  **Stop conditions honoured:** stopped after
  writing the intake request; did not invent
  repo names; did not run the cohort; did not
  substitute Rekon itself as a target; did
  not publish; did not bump versions; did not
  tag.

- Shipped **Additional Real-Repo Dogfood Cohort
  Plan** (P1.1
  additional-real-repo-dogfood-cohort-plan slice).
  **Step 6 of the post-blocker release sequence**
  pinned by the No-NPM Beta Distribution Policy.
  **Strategy / docs / tests-only batch.** Does not
  run the cohort. No runtime behaviour change. No
  new package, no new CLI command, no new helper,
  no workflow-template change, no validator
  profile change, no GitHub API call, no `npm
  publish`, no version bump, no release tag, no
  GitHub Release, no active workflow YAML, no
  `package.json` / `package-lock.json` mutation,
  no source-file mutation.

  **New strategy memo:**
  [`docs/strategy/additional-real-repo-dogfood-cohort-plan.md`](docs/strategy/additional-real-repo-dogfood-cohort-plan.md)
  defines the 5-archetype cohort plan for the
  next dogfood batches. Contains all 11 required
  headings; three diagnostic tables (cohort
  archetype: 5 rows; success / blocker: 7-row
  success + 6-row acceptable + 9-row blocker;
  metrics: 27-row required-metric list).

  **Five cohort archetypes pinned** (placeholders
  for operator-supplied repos at cohort-execution
  time):
  - `<small-ts-package>` — package-scale local
    loop.
  - `<medium-monorepo>` — workspace / package
    breadth without Rekon-itself bias.
  - `<nextjs-app>` — route / app / front-end
    patterns.
  - `<mixed-js-ts-repo>` — language-mix
    behaviour.
  - `<github-workflows-repo>` — workflow-adjacent
    review surfaces.

  **Cohort constraint:** must include **at least
  three distinct real repositories**. Single-repo
  consolidation is allowed when a repo
  legitimately covers multiple archetypes
  (documented explicitly). No cohort target may
  be Rekon itself.

  **Pinned reminders carried forward from the
  No-NPM Beta Distribution Policy:**
  - No npm publish during beta.
  - Beta is private / local / repo-based.
  - At least three distinct real repositories
    must be exercised before any post-beta
    publish reconsideration.
  - Findings are acceptable outcomes when
    recorded honestly.
  - Failed verification is acceptable when the
    `VerificationRun` + `VerificationResult`
    accurately record the failed proof and
    `artifacts validate` remains clean.
  - `artifacts validate: invalid` is a release
    blocker.

  **Command matrix pinned** (mirrors the first
  dogfood matrix for cross-target comparability):
  core matrix per target (init, refresh,
  validate, freshness, findings filter +
  filter-health + list, issues adjudicate +
  list, coherency delta, publish proof +
  architecture + agent-contract);
  representative-path matrix per target (resolve
  preflight, intent work-order, verify run
  dry-run + execute, verify result from-run,
  republish all three, publish github-check +
  pr-comment dry-runs, final validate +
  freshness); workflow validator matrix (once
  from the Rekon repo, plus the
  `<github-workflows-repo>` archetype validates
  operator-supplied YAML).

  **No `--send` flow anywhere in the matrix.**
  No GitHub API call. No npm publish. No version
  bump. No source mutation outside the temp copy.

  **Metrics-to-record list:** 27 required metrics
  per target covering repo archetype + size +
  refresh outcome + artifact validation +
  EvidenceGraph / FindingReport /
  FindingFilterReport / FindingFilterHealthReport
  / IssueAdjudicationReport / CoherencyDelta /
  Publication / ResolverPacket / VerificationPlan
  / VerificationRun / VerificationResult details
  + GitHub dry-run results + workflow validator
  results + unexpected errors + wall-clock time.

  **Success criteria + acceptable outcomes:**
  cohort is successful if every target completes
  refresh, validates clean, renders all three
  publications, renders both GitHub dry-runs
  without network, no CLI crash, no artefact
  corruption, no token leak, no source mutation
  outside the temp copy. Findings exist (Rekon's
  job to surface), failed `verify run --execute`
  recorded honestly, aggregate freshness stale
  (latest-major pattern), PR comment readiness
  gaps without GitHub env — all acceptable.

  **Release blocker taxonomy (9 categories):**
  refresh crash; artifacts validate invalid;
  malformed artefact; publication render failure;
  CLI crash; token / log leak; source mutation
  outside temp copy; workflow validator invalid
  for a Rekon-supplied template; `--dry-run` mode
  actually executes / makes a network call.

  **Reporting format pinned:** per-target
  dogfood reports under
  `docs/strategy/real-repo-cohort/`; cohort
  summary report at
  `docs/strategy/real-repo-cohort-summary.md`;
  cohort execution review packet at
  `.rekon-dev/review-packets/additional-real-repo-dogfood-cohort-execution.md`;
  cohort execution docs test at
  `tests/docs/real-repo-cohort-summary.test.mjs`.
  The cohort execution work order writes all
  four; this plan batch does not.

  **Implementation Sequence updated to 11
  steps:**
  1. Beta release readiness checklist memo
     (shipped).
  2. Beta release candidate execution plan
     (shipped — against SHA `54d1dfd`).
  3. Beta version bump execution report
     (shipped — `0.1.0-beta.0` applied).
  4. Real-repo beta dogfood report (shipped —
     `pass-with-known-limitations`).
  5. No-NPM beta distribution policy (shipped
     — replaces the previously-planned publish
     authorization work order).
  6. **Additional real-repo dogfood cohort plan
     (this plan, shipped)**.
  7. Additional real-repo dogfood execution
     (next slice — substitutes operator-selected
     repos for each archetype; runs the matrix;
     writes per-target + cohort reports).
  8. Post-beta source-write apply roadmap (4
     slices).
  9. Post-beta path freshness + watcher roadmap
     (4 slices).
  10. Post-beta breadth / maturity / polish
      work.
  11. (Optional, deferred) Post-beta npm publish
      authorization work order — only after
      broader real-repo dogfood + an explicit
      later operator decision reverses the
      no-NPM policy.

  **Tests:** new docs suite
  `tests/docs/additional-real-repo-dogfood-cohort-plan.test.mjs`
  with 18 assertions (memo existence; all 11
  required `##` headings; no-NPM-during-beta +
  private-local-repo-based + at-least-three-
  distinct-repositories + command-matrix +
  metrics-to-record + success-criteria + release-
  blocker-taxonomy + findings-acceptable +
  failed-verification-acceptable + validate-
  invalid-is-blocker statements; three diagnostic
  tables; CHANGELOG mention; review-packet
  PURPOSE PRESERVATION CHECK). Full suite
  expected ≥ 1728 passed / 1 skipped.

  **Docs:** 6 supporting strategy docs updated
  (no-NPM policy + dogfood report + checklist +
  parity review + master roadmap +
  classic-behavior-roadmap implementation
  sequences advanced). README + CHANGELOG
  updated. New review packet at
  `.rekon-dev/review-packets/additional-real-repo-dogfood-cohort-plan.md`.

  **Recommended next slice:** **Additional
  real-repo dogfood execution** — substitutes
  operator-selected concrete repositories for
  each archetype placeholder, runs the command
  matrix defined in this plan against every
  target, records the metrics, classifies
  outcomes using the success / blocker taxonomy,
  and writes the per-target dogfood reports +
  the cohort summary report + the cohort
  execution review packet + the cohort execution
  docs test. Still does not publish to npm, bump
  versions, create a git tag, or create a GitHub
  Release.

  **Out-of-scope and explicitly not shipped:**
  - No cohort execution. The plan defines the
    cohort; the next slice runs it.
  - No hard-coded private repository names.
    Placeholders are intentional; the operator
    substitutes concrete repos at
    cohort-execution time.
  - No `docs/strategy/real-repo-cohort/`
    per-target report files (written by the
    cohort execution work order).
  - No cohort summary report (written by the
    cohort execution work order).
  - No `npm publish` invocation.
  - No `package.json` / `package-lock.json`
    mutation (still `0.1.0-beta.0`).
  - No `v0.1.0-beta.0` git tag.
  - No GitHub Release.
  - No active `.github/workflows/*.yml`.
  - No new runtime behaviour.
  - No new CLI command.
  - No new validator profile.
  - No new workflow template.
  - No new artifact type.
  - No new permission.
  - No mutation of any `packages/*/src/*.ts`
    file.
  - No mutation of the committed
    `examples/simple-js-ts` fixture.
  - No change to the beta-ready decision or the
    no-NPM beta posture.

  **Stop conditions honoured:** the plan does
  not run the cohort; does not publish; does not
  bump versions; does not tag; does not hard-code
  private repo names; does not pre-authorise a
  publish reconsideration.

- Shipped **No-NPM Beta Distribution Policy**
  (P1.1 no-npm-beta-distribution-policy slice).
  **Step 5 of the post-blocker release sequence**
  — **replaces** the previously-planned publish
  authorization work order. Strategy / docs /
  tests-only batch. No runtime behaviour change.
  No new package, no new CLI command, no new
  helper, no workflow-template change, no
  validator profile change, no GitHub API call,
  no `npm publish`, no version bump, no release
  tag, no GitHub Release, no active workflow
  YAML, no `package.json` / `package-lock.json`
  mutation.

  **Decision: Rekon beta will not be published to
  npm.** Beta is a validated product / checklist
  state, not an npm-published package state.
  Distribution during beta is source-controlled,
  local-build, and tarball-smoke based; the npm
  registry path is **deferred** until after beta
  or until a new explicit operator decision
  reverses this policy.

  **New strategy memo:**
  [`docs/strategy/no-npm-beta-distribution-policy.md`](docs/strategy/no-npm-beta-distribution-policy.md)
  pins the no-NPM posture and the
  source-checkout install model. Contains all 11
  required headings (Decision Summary, Why This
  Decision Exists, Dogfood Status, Beta
  Distribution Model, NPM Publish Policy,
  Version Policy, Install / Run Model During
  Beta, Known Limitations, What This Does Not
  Do, Implementation Sequence, Follow-Up Work);
  four pinned reminder statements; three
  required statements verbatim; three diagnostic
  tables (distribution / policy / dogfood); and
  the updated 11-step implementation sequence.

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
  - Real-repo dogfood passed and should
    continue across more repos before public
    package release.

  **Why this revision:** the
  [Real-Repo Beta Dogfood Report](docs/strategy/real-repo-beta-dogfood-report.md)
  recorded the first dogfood as
  `pass-with-known-limitations` — but a sample
  size of one repo (Rekon itself) is not enough
  to commit a public npm version. Three forces
  shaped the operator's decision to defer:
  successful first dogfood ≠ broad-repo
  confidence; beta should be validation, not
  distribution; operators can adopt Rekon from
  source today (no functional gap between
  "beta from source" and "beta from npm" that
  publishing is uniquely required to close).

  **Beta distribution model:** source checkout
  (allowed; primary); local build (allowed);
  local tarball smoke (allowed; validation
  only); GitHub workflow templates (allowed;
  copied manually); npm registry (deferred);
  GitHub Release (deferred). Operator install
  path during beta: `git clone` → `npm ci` →
  `npm run build` → invoke `node
  packages/cli/dist/index.js …` against their
  own repo.

  **NPM publish policy explicit forbids during
  beta:** no `npm publish`; no `npm publish
  --provenance`; no GitHub Actions workflow
  under `.github/workflows/` allowed to invoke
  publish; `publish-dry-run.mjs` continues to
  compose tarballs without publishing (no
  script change). A future post-beta publish
  would require a new explicit operator work
  order with re-run mandatory verification +
  CLI smoke + the additional real-repo dogfood
  cohort on the publish SHA + explicit
  authorization before `npm publish`.

  **Implementation Sequence updated to 11
  steps:**
  1. Beta release readiness checklist memo
     (shipped).
  2. Beta release candidate execution plan
     (shipped — against SHA `54d1dfd`).
  3. Beta version bump execution report
     (shipped — `0.1.0-beta.0` applied).
  4. Real-repo beta dogfood report (shipped —
     `pass-with-known-limitations`).
  5. **No-NPM beta distribution policy (this
     memo, shipped)** — replaces the
     previously-planned publish authorization
     work order.
  6. Additional real-repo dogfood cohort plan
     (next slice — defines 3–5 more real
     repositories / repo archetypes to
     dogfood).
  7. Additional real-repo dogfood execution.
  8. Post-beta source-write apply roadmap (4
     slices).
  9. Post-beta path freshness + watcher
     roadmap (4 slices).
  10. Post-beta breadth / maturity / polish
      work.
  11. (Optional, deferred) Post-beta npm
      publish authorization work order — only
      after broader real-repo dogfood + an
      explicit later operator decision
      reverses the no-NPM policy.

  **Tests:** new docs suite
  `tests/docs/no-npm-beta-distribution-policy.test.mjs`
  with 15 assertions (memo existence; all 11
  required `##` headings; four pinned reminder
  statements verbatim; three required
  statements verbatim; three diagnostic
  tables; README mention; CHANGELOG mention;
  review-packet PURPOSE PRESERVATION CHECK).
  Full suite expected ≥ 1710 passed / 1
  skipped.

  **Docs:** 6 supporting strategy docs updated
  (real-repo-beta-dogfood-report Follow-Up
  Work + implementation sequence; beta-release-
  readiness-checklist implementation sequence;
  beta-release-candidate-execution-plan
  implementation sequence; beta-version-bump-
  execution-report implementation sequence;
  beta-readiness-classic-parity-review release-
  checklist resolution row; master roadmap +
  classic-behavior-roadmap entries). README +
  CHANGELOG updated. New review packet at
  `.rekon-dev/review-packets/no-npm-beta-distribution-policy.md`.

  **Recommended next slice:** **Additional
  real-repo dogfood cohort plan** — defines 3–5
  more real repositories / repo archetypes (small
  TS package; medium monorepo; Next.js app;
  mixed JS/TS repo; repo with existing GitHub
  workflows) to dogfood before any post-beta
  publish reconsideration. After the cohort
  completes, the operator can revisit the
  no-NPM posture (which a later explicit
  operator decision could reverse).

  **Out-of-scope and explicitly not shipped:**
  - No `npm publish` invocation.
  - No `npm publish --provenance`.
  - No `package.json` `version` field mutation
    (still `0.1.0-beta.0`).
  - No `package-lock.json` mutation.
  - No `v0.1.0-beta.0` git tag.
  - No GitHub Release.
  - No active `.github/workflows/*.yml`.
  - No new runtime behaviour.
  - No new CLI command.
  - No new validator profile.
  - No new workflow template.
  - No new artifact type.
  - No new permission.
  - No mutation of any `packages/*/src/*.ts`
    file.
  - No mutation of the committed
    `examples/simple-js-ts` fixture.
  - No change to the beta-ready decision; only
    the distribution posture has changed.

  **Stop conditions honoured:** the memo does
  not publish; does not bump versions; does not
  tag; does not create a GitHub Release; does
  not imply `npm install` is supported during
  beta; does not remove the beta-ready
  decision; the dogfood result is unchanged
  (still `pass-with-known-limitations`).

- Shipped **Real-Repo Beta Dogfood Report** (P1.1
  real-repo-beta-dogfood slice). **Step 4 of the
  post-blocker release sequence** pinned by the
  Beta Release Readiness Checklist + advanced by
  the Beta Release Candidate Execution Plan + the
  Beta Version Bump Execution Report.
  **Release-validation (real-repo dogfood)
  batch.** No runtime behaviour change. No new
  package, no new CLI command, no new helper, no
  workflow-template change, no validator profile
  change, no GitHub API call, no `npm publish`,
  no version bump, no release tag, no GitHub
  Release, no active workflow YAML, no mutation
  of committed examples.

  **Dogfood Decision:**
  **`pass-with-known-limitations`.**

  **New strategy memo:**
  [`docs/strategy/real-repo-beta-dogfood-report.md`](docs/strategy/real-repo-beta-dogfood-report.md)
  records the full dogfood run against a temp
  copy of the Rekon repository itself (489 files
  / 7.8 MB rsync copy at SHA `83ba723`; `node_modules`,
  `dist`, `*.tsbuildinfo`, `.rekon` excluded;
  `npm ci` + `npm run build` succeeded inside the
  copy). The local CLI at `0.1.0-beta.0`
  exercised every documented surface against the
  dogfood root.

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

  **Two genuine dogfood wins** (vs. the smaller
  example fixture used by Batches 30 + 31):
  - **`verify run --execute` actually ran real
    commands and all passed.** Against the
    dogfood Rekon copy, the auto-generated
    VerificationPlan ran `npm run typecheck`
    (exit 0 / 280ms) + `npm run test` (exit 0 /
    37 246ms) + `npm run build` (exit 0 /
    2 214ms). VerificationRun written with
    `status: passed`. **First evidence that the
    verify-runner works end-to-end on a real
    monorepo.**
  - **`publish github-check --dry-run`
    propagated success end-to-end.** The Check
    payload reports `conclusion: success` +
    `output.title: "Verification: passed
    (fresh)"`. The fixture smokes had recorded
    `conclusion: failure` because the fixture
    has no real test commands; the dogfood
    proves the conclusion correctly flips when
    verification passes.

  **Dogfood command matrix (24 entries):**
  init, refresh (14 lifecycle steps, status
  passed, freshness fresh), artifacts validate
  (clean), artifacts freshness (fresh post-
  refresh; aggregate stale with 20 historical
  issues post-matrix — documented latest-major
  pattern), findings filter (134 filtered all
  test-file / 1 kept / filterRate 0.9926 / 0
  alerts), findings filter-health, findings
  list, issues adjudicate (1 group, 1 active),
  issues list (0; surface lists merge candidates
  of which 0 exist), coherency delta (1 active
  item — the intentional `import-boundary-rule-pack`
  demo fixture), publish proof/architecture/
  agent-contract, resolve preflight, intent
  work-order (IntentMap + WorkOrder +
  VerificationPlan), verify run --dry-run
  (not-run), verify run --execute (passed
  end-to-end), verify result from-run (passed),
  republish all three, publish github-check
  --dry-run (success), publish pr-comment
  --dry-run (5 expected readiness gaps), 4
  workflow validators (all valid:true, 0
  issues), final validate (clean), final
  freshness (aggregate stale with 20 historical
  issues — documented).

  **Artifact summary:** 36 artefacts across 19
  types written to the dogfood's `.rekon/artifacts/**`
  tree. Every artefact validated clean; no
  corruption; no unreadable publication.

  **Finding signal:** the 134 raw findings (all
  `import` type in Rekon's own test files) are
  correctly filtered by the `test-file` filter
  reason; the 1 surviving finding is in
  `examples/import-boundary-rule-pack/fixtures/bad-imports/src/feature/handler.ts`
  — the intentional "bad imports" demo fixture.
  **No false positive in the production source
  tree.**

  **Known limitations observed (all previously
  disclosed):** source-write apply unavailable;
  watcher daemon unavailable; hosted GitHub App
  unavailable; active workflows not installed
  automatically; GitHub writes opt-in only;
  aggregate freshness historical stale entries;
  host Node engine 25.9.0 vs. declared
  `^20.12 || ^22 || ^24` (`EBADENGINE` warning;
  non-blocking); `pr-comment --dry-run`
  readiness gaps without GitHub env. None is a
  new defect.

  **Implementation Sequence updated:**
  1. Beta release readiness checklist memo
     (shipped).
  2. Beta release candidate execution plan
     (shipped — against SHA `54d1dfd`).
  3. Beta version bump execution report
     (shipped — `0.1.0-beta.0` applied).
  4. Real-repo beta dogfood report (this
     report, shipped — `pass-with-known-
     limitations` against the Rekon repo
     itself).
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
  with 15 assertions (memo existence; all 13
  required `##` headings; six pinned required
  statements verbatim; four diagnostic-table
  assertions; Dogfood Decision recorded;
  CHANGELOG mention; review-packet PURPOSE
  PRESERVATION CHECK). Full suite expected ≥
  1695 passed / 1 skipped.

  **Docs:** 5 strategy docs updated (execution
  plan + bump report + checklist implementation
  sequences advanced; master roadmap +
  classic-behavior-roadmap entries). README +
  CHANGELOG updated. New review packet at
  `.rekon-dev/review-packets/real-repo-beta-dogfood.md`.

  **Recommended next slice:** **Beta npm publish
  authorization work order** — the first slice
  in the entire Rekon sequence allowed to invoke
  `npm publish`, and only with explicit operator
  authorization.

  **Out-of-scope and explicitly not shipped:**
  - No `npm publish` invocation.
  - No `npm publish --provenance`.
  - No `package.json` `version` field mutation
    (still `0.1.0-beta.0`).
  - No `v0.1.0-beta.0` git tag.
  - No GitHub Release.
  - No active `.github/workflows/*.yml`.
  - No new runtime behaviour.
  - No new CLI command.
  - No new validator profile.
  - No new workflow template.
  - No new artifact type.
  - No new permission.
  - No mutation of any `packages/*/src/*.ts`
    file.
  - No mutation of the committed
    `examples/simple-js-ts` fixture (the dogfood
    targeted the Rekon repo itself, not the
    example fixture).
  - No commit of any `.rekon/**` artefact
    produced by the dogfood run (the dogfood
    root lives under `mktemp -d`).

  **Stop conditions honoured:** the report does
  not publish; does not bump versions; does not
  tag; does not create a GitHub Release; does
  not hide any smoke result; no release-blocking
  defect was discovered; the dogfood matrix
  passed end-to-end.

- Shipped **Beta Version Bump Execution Report**
  (P1.1 beta-version-bump slice). **Step 3 of the
  post-blocker release sequence** pinned by the
  Beta Release Readiness Checklist + advanced by
  the Beta Release Candidate Execution Plan.
  **Release-prep (version-coherence) batch.** No
  runtime behaviour change. No new package, no
  new CLI command, no new helper, no
  workflow-template change, no validator profile
  change, no GitHub API call, no `npm publish`,
  no release tag, no GitHub Release, no active
  workflow YAML. **Does mutate `package.json`
  `version` fields + `package-lock.json` —
  intentionally, exactly per the version bump
  scope.**

  **Applied version `0.1.0-beta.0`** to:
  - `package.json` (root).
  - `packages/*/package.json` (20 workspace
    packages).
  - `package-lock.json` (root version + 21
    workspace version entries + 70 `@rekon/*`
    dependency pins).
  - 70 `@rekon/*` dependency pins inside
    workspace `package.json` files.

  **Method:** deterministic Node JSON rewrite
  (not `npm version`; not `npm install
  --package-lock-only` — the lockfile was
  rewritten directly to avoid registry lookups
  for unpublished `@rekon/*` packages).

  **Coherence verified:** `grep -c
  "0.1.0-alpha.1"` returns **0** across every
  `package.json` and `package-lock.json`; every
  workspace + lockfile entry matches root
  `0.1.0-beta.0`.

  **New strategy memo:**
  [`docs/strategy/beta-version-bump-execution-report.md`](docs/strategy/beta-version-bump-execution-report.md)
  records the bump + the re-verification
  results. **Decision: Version `0.1.0-beta.0`
  has been applied coherently across the root
  package and all 20 workspace packages.** This
  batch does not publish to npm, does not create
  a git tag, and does not create a GitHub
  Release. The next publish step requires
  explicit operator authorization.

  **All 9 mandatory verification commands
  passed on the bumped tree:** `npm run
  typecheck` (reports `rekon@0.1.0-beta.0`),
  `npm run test` (1662 passed / 1 skipped —
  matches the pre-bump count), `npm run build`
  (reports `@rekon/sdk@0.1.0-beta.0`),
  `git diff --check`, all 5 audit/smoke scripts
  (package-exports, license, publish-dry-run
  reporting per-package `0.1.0-beta.0`, install-
  smoke, install-tarball-smoke with 20 tarballs
  + 13 artifact families).

  **15-entry CLI smoke matrix re-run against a
  temporary fixture root** (`mktemp -d` copy of
  `examples/simple-js-ts`). Results identical in
  shape to Batch 30's pre-bump run — confirming
  the version bump introduces no behavioural
  change. The two recorded first-class
  behaviours (failed `verify run --execute`
  against a fixture with no real test command;
  `pr-comment --dry-run` readiness reporting
  expected gaps with no GitHub env set) are
  documented; neither triggered a release stop
  condition.

  **One existing test updated:**
  `tests/docs/release-readiness.test.mjs`
  `EXPECTED_VERSION` constant bumped from
  `0.1.0-alpha.1` to `0.1.0-beta.0`; one test
  description updated to match. The alpha-
  release-document existence assertions remain
  intact because those documents are historical
  artefacts of the alpha release prep and
  continue to be useful as references.

  **Publish posture pinned:**
  - No `npm publish` invocation in this batch.
  - No release tag created in this batch.
  - No GitHub Release created in this batch.
  - The next publish step requires explicit
    operator authorization.

  **Release Work Order Preview advanced one
  step:** steps 1 (pre-flight), 4 (operator
  authorization gate), 5 (`npm publish
  --provenance`), 6 (push tag), 7 (GitHub
  Release), 8 (post-publish smoke) remain
  pending; steps 2 (version bump) + 3 (re-run
  audits + smokes on bumped SHA) are complete.
  Step 4 is the point of operator authorization;
  steps 5–8 are operator-authorized actions and
  cannot be invoked autonomously by any future
  agent or workflow.

  **Implementation Sequence updated:**
  1. Beta release readiness checklist memo
     (shipped).
  2. Beta release candidate execution plan
     (shipped — executed against SHA `54d1dfd`).
  3. Beta version bump execution report (this
     report, shipped — `0.1.0-beta.0` applied
     coherently; mandatory verification + CLI
     smoke matrix re-run on the bumped tree).
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
  with 18 assertions (memo existence; all 10
  required `##` headings; four pinned required
  statements verbatim;
  `0.1.0-beta.0`-coherence claims; diagnostic
  tables; mandatory verification commands;
  CHANGELOG mention; review-packet PURPOSE
  PRESERVATION CHECK). Full suite expected ≥
  1680 passed / 1 skipped.

  **Docs:** 5 strategy docs updated (execution
  plan + checklist implementation sequences
  advanced; parity review pointer; master
  roadmap + classic-behavior-roadmap entries).
  README + CHANGELOG updated (CHANGELOG header
  also advanced to `0.1.0-beta.0`). New review
  packet at
  `.rekon-dev/review-packets/beta-version-bump.md`.

  **Recommended next slice:** **Beta npm publish
  authorization work order** — the first slice
  in the entire Rekon sequence allowed to invoke
  `npm publish`, and only with explicit operator
  authorization. The work order re-runs the
  mandatory verification commands + the CLI
  smoke matrix on the publish SHA, requires
  explicit operator confirmation immediately
  before `npm publish --provenance`, publishes
  each workspace package in dependency order,
  pushes the `v0.1.0-beta.0` git tag only after
  publish succeeds, creates the GitHub Release,
  and confirms a post-publish install smoke.

  **Out-of-scope and explicitly not shipped:**
  - No `npm publish` invocation.
  - No `npm publish --provenance`.
  - No `v0.1.0-beta.0` git tag.
  - No GitHub Release.
  - No active `.github/workflows/*.yml`.
  - No new runtime behaviour.
  - No new CLI command.
  - No new validator profile.
  - No new workflow template.
  - No new artifact type.
  - No new permission.
  - No mutation of any `packages/*/src/*.ts`
    file.
  - No mutation of the committed
    `examples/simple-js-ts` fixture (smokes ran
    against a `mktemp -d` copy).

  **Stop conditions honoured:** the report does
  not publish; does not bump beyond
  `0.1.0-beta.0`; does not tag; does not create
  a GitHub Release; does not hide any smoke
  result; all 5 listed supporting strategy docs
  in the work order exist and were updated (no
  skips needed).

## 0.1.0-alpha.1

- Shipped **Beta Release Candidate Execution
  Plan** (P1.1
  beta-release-candidate-execution-plan slice).
  **Step 2 of the post-blocker release sequence**
  pinned by the Beta Release Readiness Checklist.
  **Release-candidate execution + docs batch.**
  No runtime behaviour change. No new package, no
  new CLI command, no new helper, no
  workflow-template change, no validator profile
  change, no GitHub API call, no `npm publish`,
  no version bump, no release tag, no active
  workflow YAML.

  **New strategy memo:**
  [`docs/strategy/beta-release-candidate-execution-plan.md`](docs/strategy/beta-release-candidate-execution-plan.md)
  executes the pinned checklist against `main`
  and records the results. **Decision: the
  current `main` SHA qualifies as a beta release
  candidate under the pinned checklist.** This
  batch does not publish to npm, does not bump
  versions, and does not tag a release.
  **Recommended beta version: `0.1.0-beta.0`.**

  **Release candidate SHA recorded:**
  `54d1dfd2cd360434a82738d3963ec9cbb5b709f2`
  (HEAD = main = origin/main; detached-HEAD
  worktree; working tree clean before final
  commit).

  **Package / version state recorded:** root
  `0.1.0-alpha.1`; all 20 workspace packages
  match.

  **All 9 mandatory verification commands
  passed:** `npm run typecheck`, `npm run test`
  (1644 passed / 1 skipped), `npm run build`,
  `git diff --check`,
  `node scripts/audit-package-exports.mjs` (20
  packages; 0 issues),
  `node scripts/audit-license.mjs` (20 packages;
  Apache-2.0),
  `node scripts/publish-dry-run.mjs` (20
  packages; no publish attempted),
  `node scripts/install-smoke.mjs`,
  `node scripts/install-tarball-smoke.mjs` (20
  tarballs; 13 artifact families emit).

  **15-entry CLI smoke matrix executed against a
  temporary fixture root** (`mktemp -d` copy of
  `examples/simple-js-ts`): `refresh`,
  `artifacts validate`, `artifacts freshness`,
  `intent work-order`, `verify run --dry-run`,
  `verify run --execute`, `verify result
  from-run`, `publish proof`, `publish
  architecture`, `publish agent-contract`,
  `publish github-check --dry-run`, `publish
  pr-comment --dry-run`, three `verify
  github-workflow validate` profiles (read-only
  for `rekon-verification.yml` +
  `rekon-verification-dry-run.yml`,
  github-check-send for
  `rekon-verification-check-send.yml`,
  github-pr-comment-send for
  `rekon-pr-comment-send.yml`), final
  `artifacts validate`, final `artifacts
  freshness`. Two recorded first-class
  behaviours (failed `verify run --execute`
  against a fixture with no real test command;
  `pr-comment --dry-run` readiness reporting
  expected gaps with no GitHub env set) are
  documented in the memo's CLI Smoke Matrix
  Results table — neither is a regression and
  neither triggered a release stop condition.

  **Known beta limitations re-confirmed** (15
  total carried forward from the checklist: no
  source-write apply; no watcher daemon; no
  hosted GitHub App; active workflows not
  installed automatically; GitHub writes opt-in
  only; Windows process-tree kill
  direct-child-only; full classic parity not
  claimed; plus 8 additional reserved-but-not-
  implemented / post-beta-polish items).

  **No release stop condition was triggered.**
  No required audit failed; no required smoke
  failed unexpectedly; version coherence holds
  across all 20 packages; export audit clean;
  license audit clean; no accidental publish;
  no hidden source-write; no hidden background
  refresh; no hidden artifact mutation.

  **Release work order preview pinned** (8-step
  sequence gated by operator authorisation
  before publish): pre-flight on release SHA →
  version bump → re-run audits + smokes on
  bumped SHA → operator authorisation gate →
  `npm publish --provenance` → push tag →
  GitHub Release → post-publish smoke from
  npm. Reversible up to step 5; once any
  publish runs, the prerelease semver is
  consumed.

  **Implementation Sequence updated:**
  1. Beta release readiness checklist memo
     (shipped).
  2. Beta release candidate execution plan
     (this memo, shipped).
  3. Beta version bump work order (next slice).
  4. Beta release work order (explicit operator
     authorisation; `npm publish --provenance`;
     git tag; GitHub Release).
  5. Post-beta source-write apply roadmap (4
     post-beta slices).
  6. Post-beta path freshness + watcher roadmap
     (4 post-beta slices).
  7. Post-beta breadth / maturity / polish
     work.

  **Tests:** new docs suite
  `tests/docs/beta-release-candidate-execution-plan.test.mjs`
  with 18 assertions (memo existence; all 11
  required `##` headings; release-candidate-
  qualifies statement; no-publish + no-version-
  bump + no-release-tag verbatim statements;
  beta version recommendation; git state table;
  mandatory verification table; CLI smoke
  matrix table; known limitations table;
  mandatory verification commands; CHANGELOG
  mention; review-packet PURPOSE PRESERVATION
  CHECK). Full suite expected ≥ 1662 passed / 1
  skipped.

  **Docs:** 4 strategy docs updated (checklist
  memo + parity review + classic-behavior
  roadmap + master roadmap). README + CHANGELOG
  updated. New review packet at
  `.rekon-dev/review-packets/beta-release-candidate-execution-plan.md`.

  **Recommended next slice:** **Beta version
  bump work order.** Apply `0.1.0-beta.0` (or
  the operator-approved successor) to root +
  every workspace package; re-run the audit /
  smoke matrix on the bumped SHA; prepare the
  explicit `npm publish` step for operator
  authorisation. Still avoids `npm publish`
  unless the operator explicitly authorises it
  in that work order.

  **Out-of-scope and explicitly not shipped:**
  - No `npm publish` invocation.
  - No `package.json` `version` field mutation
    (root or workspace).
  - No release tag creation.
  - No GitHub Release creation.
  - No active `.github/workflows/*.yml`.
  - No new runtime behaviour.
  - No new CLI command.
  - No new validator profile.
  - No new workflow template.
  - No new artifact type.
  - No new permission.
  - No mutation of the committed
    `examples/simple-js-ts` fixture (smokes ran
    against a `mktemp -d` copy).

  **Stop conditions honoured:** the memo does
  not publish; does not bump versions; does not
  tag a release; does not hide any smoke
  failure; all 4 listed supporting strategy
  docs in the work order exist and were updated
  (no skips needed).

- Shipped **Beta Release Readiness Checklist
  Memo** (P1.1
  beta-release-readiness-checklist slice).
  **Third (and final) of three beta blockers**
  identified by the Beta Readiness / Remaining
  Classic-Parity Review. **Strategy / docs /
  tests-only batch.** No runtime behaviour
  change. No new package, no new CLI command, no
  new helper, no workflow-template change, no
  validator profile change, no GitHub API call,
  no version bump, no npm publish, no release
  tag, no active workflow YAML.

  **New strategy memo:**
  [`docs/strategy/beta-release-readiness-checklist.md`](docs/strategy/beta-release-readiness-checklist.md)
  pins the final beta release readiness contract.
  **Decision: with this checklist pinned + the
  mandatory verification commands passing on
  main, Rekon is beta-ready. Beta-ready is a
  checklist state, not an npm publish event. The
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

  **All three beta blockers resolved:**
  1. Source-write reconciliation policy
     (resolved by source-write policy memo).
  2. Watcher / path freshness policy (resolved
     by watcher / path freshness policy memo).
  3. Release readiness checklist (resolved by
     this memo).

  **Four diagnostic tables in the memo:**
  - Beta blocker table (3 rows; all marked
    resolved with evidence pointer).
  - Verification command table (9 rows; every
    command marked required-before-beta).
  - Known limitations table (7 rows: source-
    write apply / watcher daemon / hosted
    GitHub App / active workflows / GitHub
    writes / Windows process-tree kill / full
    classic parity).
  - Release stop-condition table (5 rows: any
    required audit fails / any required smoke
    fails / version bump missing / known
    limitations not documented / accidental npm
    publish).

  **Mandatory verification commands pinned**
  (9 commands the release slice must re-run on
  the release SHA): `npm run typecheck`,
  `npm run test`, `npm run build`, `git diff
  --check`,
  `node scripts/audit-package-exports.mjs`,
  `node scripts/audit-license.mjs`,
  `node scripts/publish-dry-run.mjs`,
  `node scripts/install-smoke.mjs`,
  `node scripts/install-tarball-smoke.mjs`.

  **CLI smoke matrix pinned** (14 commands for
  the release slice to execute on fixture
  inputs): `rekon refresh`, `rekon verify run
  --dry-run`, `rekon verify run --execute`,
  `rekon verify result from-run`, `rekon
  publish proof`, `rekon publish architecture`,
  `rekon publish agent-contract`, `rekon
  publish github-check --dry-run`, `rekon
  publish pr-comment --dry-run`, `rekon verify
  github-workflow validate` (three profiles:
  read-only, github-check-send,
  github-pr-comment-send), `rekon artifacts
  validate`, `rekon artifacts freshness`. No
  `--send` paths in the smoke matrix —
  operator-supplied tokens required.

  **Versioning policy pinned:** current root
  version `0.1.0-alpha.1`; beta target naming
  `0.1.0-beta.<n>` (specific `<n>` decided in
  release slice); workspace version coherence
  required (every `@rekon/*` package matches
  root). **No version bump in this batch.**

  **NPM publish policy pinned:** no `npm
  publish` in this batch; publish requires its
  own work order; publish-dry-run mandatory
  before publish; no automated publish
  triggers.

  **Known limitations disclosed** (15 total:
  7 primary table rows + 8 carried forward from
  the upstream policy memos including
  `PathFreshnessReport` reserved-not-implemented,
  `ReconciliationApplyReport` reserved-not-
  implemented, `source:write` reserved-not-
  registered, `paths` / `events` invalidation
  rules as public intent only, PR comment
  bounded-retry as post-beta polish, same-repo
  `pull_request` guard as post-beta polish,
  memory promotion/supersession as post-beta
  maturity, deeper rule catalog expansion as
  post-beta breadth).

  **Implementation Sequence pinned:**
  1. Beta release readiness checklist memo
     (this memo, shipped).
  2. Beta release candidate execution plan
     (next slice).
  3. Beta release (explicit operator work order
     — applies version bump + invokes publish).
  4. Source-write apply roadmap (4 post-beta
     slices).
  5. Path freshness + watcher roadmap (4
     post-beta slices).
  6. Post-beta breadth / maturity / polish work.

  **Tests:** new docs suite
  `tests/docs/beta-release-readiness-checklist.test.mjs`
  with 22 assertions (memo existence; all 13
  required `##` headings; four pinned reminder
  statements; three resolved-blocker rows;
  mandatory verification commands; CLI smoke
  matrix; six known-limitation pinned
  statements; four diagnostic tables; CHANGELOG
  mention; review-packet PURPOSE PRESERVATION
  CHECK). Full suite expected ≥ 1644 passed / 1
  skipped.

  **Docs:** 14 updated (beta-readiness review
  marks the release checklist blocker resolved;
  source-write + watcher / path freshness memos
  updated implementation sequences;
  github-review-surfaces-parity-review +
  verification-github-trust-boundary-safety-review
  checklist pointers; governance memo step 64
  added; classic-behavior roadmap + master
  roadmap entries; classic-guarantees-audit +
  classic-alignment-map pointers;
  verification-runs + proof-report-publication +
  agent-operating-contract +
  freshness-and-invalidation concept pointers).
  README + CHANGELOG updated. New review packet
  at
  `.rekon-dev/review-packets/beta-release-readiness-checklist.md`.

  **Recommended next slice:** **Beta release
  candidate execution plan.** Execute the pinned
  checklist against main on the release SHA;
  run all mandatory verification commands + the
  CLI smoke matrix; confirm package / version
  state; decide the exact beta version; prepare
  an explicit version-bump + npm-publish work
  order if approved. Still avoid `npm publish`
  unless the operator explicitly authorises it.

  **Out-of-scope and explicitly not shipped:**
  - No `npm publish` invocation.
  - No `package.json` `version` field mutation
    (root or workspace).
  - No release tag creation.
  - No GitHub Release creation.
  - No active `.github/workflows/*.yml`.
  - No new runtime behaviour.
  - No new CLI command.
  - No new validator profile.
  - No new workflow template.
  - No new artifact type registration.
  - No new permission registration.

  **Stop conditions honoured:** the memo does
  not publish; does not bump versions; does not
  tag releases; does not claim full classic
  parity; does not claim beta-ready beyond the
  conditional "with this checklist pinned + the
  mandatory verification commands passing on
  main" framing; all 14 listed supporting docs
  in the work order exist and were updated (no
  skips needed).

- Shipped **Watcher / Path Freshness Policy
  Decision Memo** (P1.1
  watcher-path-freshness-policy-decision slice).
  **Second of three beta blockers** identified by
  the Beta Readiness / Remaining Classic-Parity
  Review. **Strategy / docs / tests-only batch.**
  No runtime behaviour change. No new package, no
  new CLI command, no new helper, no
  workflow-template change, no validator profile
  change, no GitHub API call, no file-system
  event subscription, no daemon, no background
  refresh, no path mtime tracking, no
  artifact-type registration, no `ArtifactHeader`
  change.

  **New strategy memo:**
  [`docs/strategy/watcher-path-freshness-policy-decision.md`](docs/strategy/watcher-path-freshness-policy-decision.md)
  pins the watcher / path freshness boundary for
  beta: **Option C — watcher-lite / path
  freshness policy for beta. No daemon by
  default; explicit `rekon refresh` remains the
  canonical operator action; future
  `PathFreshnessReport` artifact reserved by
  name; agent contract instructs agents to
  refresh after source edits.**

  **Pinned reminders carried forward by the memo
  + the docs test:**
  - Watcher daemon is not required for beta.
  - Path/source freshness policy is required for
    beta.
  - Rekon must not silently mutate artifacts in
    the background.
  - Agents should treat artifacts as stale after
    source edits until `rekon refresh` has run.
  - Artifact lineage freshness is not the same
    as working-tree freshness.

  **Four options analysed:** A (manual refresh
  only), B (full watcher daemon), **C
  (watcher-lite / path freshness policy —
  recommended)**, D (opt-in experimental
  watcher). C wins because it resolves the beta
  policy blocker without shipping a daemon and
  preserves the no-background-mutation
  invariant.

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

  **Reserved by name (docs-only reservation; no
  SDK / runtime registration):**
  `PathFreshnessReport` artifact type. Registers
  in the post-beta path-freshness implementation
  slice, not this memo.

  **Implementation Sequence pinned:**
  1. Watcher / path freshness policy decision
     memo (this memo, shipped).
  2. Beta release readiness checklist memo (next
     slice — third beta blocker).
  3. Beta release execution (final pre-beta
     slice).
  4. Path freshness artefact slice (post-beta) —
     adds `PathFreshnessReport` registration +
     `rekon paths freshness` (or equivalent) CLI.
  5. Watcher daemon design memo (post-beta).
  6. Watcher daemon implementation slice
     (post-beta).
  7. Watcher / path freshness safety review
     slice (post-beta).

  **Tests:** new docs suite
  `tests/docs/watcher-path-freshness-policy-decision.test.mjs`
  with 17 assertions (memo existence; all 13
  required `##` headings; Option C
  recommendation; five pinned reminder
  statements; policy / option / risk tables;
  reserved `PathFreshnessReport` artifact name;
  CHANGELOG mention; review-packet PURPOSE
  PRESERVATION CHECK). Full suite expected ≥
  1622 passed / 1 skipped.

  **Docs:** 12 updated (beta-readiness review
  marks the watcher blocker resolved;
  source-write decision adds next-slice pointer;
  governance memo step 63 added; classic-behavior
  roadmap + master roadmap entries;
  classic-guarantees-audit + classic-alignment-map
  pointers; refresh concept +
  freshness-and-invalidation concept +
  agent-operating-contract concept pointers;
  architecture-summary-publication +
  agent-contract-publication artifact pointers).
  README + CHANGELOG updated. New review packet
  at
  `.rekon-dev/review-packets/watcher-path-freshness-policy-decision.md`.

  **Recommended next slice:** **Beta release
  readiness checklist memo.** Pin the final beta
  release contract: versioning / npm publish
  decision; package audit commands; install
  smoke requirements; docs completeness; beta
  known limitations; release blockers; no hidden
  runtime changes. Third (and final) of three
  beta blockers.

  **Out-of-scope and explicitly not shipped:**
  - No watcher implementation.
  - No daemon.
  - No file-system event subscriptions.
  - No background refresh.
  - No change to `rekon refresh` behaviour.
  - No change to `rekon artifacts freshness`
    behaviour.
  - No path mtime tracking.
  - No `ArtifactHeader` change.
  - No `IntelligenceSnapshot` / `EvidenceGraph`
    / `ObservedRepo` / `FindingReport` /
    `VerificationRun` schema change.
  - No `PathFreshnessReport` artifact-type
    registration.
  - No GitHub API calls.
  - No active `.github/workflows/*.yml` files.
  - No version bump. No npm publish.

  **Stop conditions honoured:** the memo does
  not implement watcher behaviour; does not add
  the artifact type; does not add background
  refresh; does not claim full classic watcher
  parity; does not claim beta-ready (release
  checklist blocker remains); all 12 listed
  supporting docs in the work order exist and
  were updated (no skips needed).

- Shipped **Source-Write Reconciliation Policy
  Decision Memo** (P1.1
  source-write-reconciliation-policy-decision slice).
  **First of three beta blockers** identified by the
  Beta Readiness / Remaining Classic-Parity Review.
  **Strategy / docs / tests-only batch.** No runtime
  behaviour change. No new package, no new CLI
  command, no new helper, no workflow-template
  change, no validator profile change, no GitHub API
  call, no source-file mutation, no artifact-type
  registration, no permission registration.

  **New strategy memo:**
  [`docs/strategy/source-write-reconciliation-policy-decision.md`](docs/strategy/source-write-reconciliation-policy-decision.md)
  pins the source-write boundary for beta:
  **Option C — beta pins the policy + preview
  requirements; the actual apply implementation
  remains deferred post-beta.**

  **Pinned reminders carried forward by the memo +
  the docs test:**
  - Source-write apply is not required for beta,
    but the policy boundary is required for beta.
  - No agent-autonomous source writes.
  - Every future source-write apply must be
    preceded by exact diff preview and explicit
    operator confirmation.
  - A successful apply must not automatically
    resolve findings; lifecycle / status updates
    remain explicit artifacts.

  **Four options analysed:** A (no apply in beta),
  B (deterministic narrow apply), **C (preview-first
  beta, apply post-beta — recommended)**, D (full
  apply with verification gates). C wins because it
  resolves the beta policy blocker without shipping
  any source-write implementation.

  **Three diagnostic tables in the memo:**
  - Policy table (8 rows: beta source-write apply
    deferred / preview required / confirmation
    required / verification mandatory / rollback
    required / `ReconciliationApplyReport`
    reserved / `source:write` reserved / no agent
    autonomy).
  - Operation-class table (5 rows: artifact-only
    allowed / deterministic source patch
    preview-only / generated file creation
    preview-only / command execution via
    verification runner / ambiguous remediation
    manual-only).
  - Risk table (5 rows: corrupting source / hidden
    agent writes / failed verification / false
    resolution / irreversible patch — each with
    its guardrail).

  **Reserved by name (docs-only reservation; no SDK
  / runtime registration):** `ReconciliationApplyReport`
  artifact type, `source:write` permission. Both are
  registered by follow-on slices, not this memo.

  **Implementation Sequence pinned:**
  1. Source-write reconciliation policy decision
     memo (this memo, shipped).
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
     adds `reconcile apply` + `ReconciliationApplyReport`
     registration.
  8. Source-write safety review slice (post-beta).

  **Tests:** new docs suite
  `tests/docs/source-write-reconciliation-policy-decision.test.mjs`
  with 18 assertions (memo existence; all 15
  required `##` headings; four pinned reminder
  statements; Option C recommendation; policy /
  operation-class / risk tables; reserved
  `ReconciliationApplyReport` artifact name;
  reserved `source:write` permission name;
  implementation sequence ordering; next slice is
  watcher / path freshness; What This Does Not Do
  exclusions; classic remediation goal preserved;
  CHANGELOG mention; review-packet PURPOSE
  PRESERVATION CHECK). Full suite expected ≥ 1605
  passed / 1 skipped.

  **Docs:** 11 updated (beta-readiness review marks
  the source-write blocker resolved; governance
  memo step 62 added; classic-behavior roadmap +
  master roadmap entries; classic-guarantees-audit
  + classic-alignment-map pointers;
  reconciliation-plans concept +
  reconciliation-plan artifact + proof-report-
  publication + verification-runs concept pointers).
  README + CHANGELOG updated. New review packet at
  `.rekon-dev/review-packets/source-write-reconciliation-policy-decision.md`.

  **Recommended next slice:** **Watcher / path
  freshness policy decision memo.** Pin the
  operator-facing freshness contract for beta:
  freshness visible everywhere it matters; stale
  artifacts never present as fresh; explicit
  refresh / refusal commands; no silent
  re-derivation. Second of three beta blockers.

  **Out-of-scope and explicitly not shipped:**
  - No source writes.
  - No `reconcile apply` CLI.
  - No `source:write` permission registration.
  - No `ReconciliationApplyReport` artifact-type
    registration.
  - No `ReconciliationPlan` schema or concept-doc
    runtime contract change.
  - No rollback implementation.
  - No patch generation implementation.
  - No GitHub API calls.
  - No active `.github/workflows/*.yml` files.
  - No version bump. No npm publish.

  **Stop conditions honoured:** the memo does not
  implement source writes; does not add the
  permission; does not register the artifact type;
  does not claim beta-ready (two blockers remain);
  all 10 listed supporting docs in the work order
  exist and were updated (no skips needed).

- Shipped **Beta Readiness / Remaining
  Classic-Parity Review** (P1.1
  beta-readiness-classic-parity-review slice).
  **First beta-readiness review** following the
  completed CI / GitHub adapter sequence.
  **Strategy / docs / tests-only batch.** No
  runtime behaviour change. No new package, no
  new CLI command, no new helper, no workflow-
  template change, no validator profile change,
  no GitHub API call.

  **New strategy memo:**
  [`docs/strategy/beta-readiness-classic-parity-review.md`](docs/strategy/beta-readiness-classic-parity-review.md)
  steps back from the verification + GitHub
  review-surface arc and assesses Rekon's
  remaining delta to beta. Reviews 15
  subsystems against codebase-intel's classic
  goals (understand, govern, fix, verify,
  communicate):
  1. Observe / project / snapshot refresh loop.
  2. Finding detection / rule-pack coverage.
  3. Finding filters / filter-health / policies.
  4. Graph-aware filtering.
  5. Issue lifecycle / adjudication / merge.
  6. CoherencyDelta / remediation queue.
  7. WorkOrder / ReconciliationPlan /
     VerificationPlan.
  8. Verification runner / VerificationRun /
     VerificationResult.
  9. Proof surfaces / architecture summary /
     agent contract.
  10. GitHub review surfaces.
  11. Memory selection / curation.
  12. Resolver packets / resolve.issue.
  13. Source-write / reconciliation apply path.
  14. Watcher / path freshness / live
      invalidation.
  15. Packaging / install / publish readiness.

  **Decision: Rekon is beta-close but not
  beta-ready.** Three policy blockers remain —
  each a decision rather than a missing
  implementation:
  1. **Source-write reconciliation policy.**
     `ReconciliationPlan` is preview-only; the
     apply path is undecided.
  2. **Watcher / path freshness policy.**
     Artifacts go stale between `rekon refresh`
     calls; the operator-facing freshness
     contract is not pinned.
  3. **Beta release readiness checklist.** The
     audit / smoke scripts exist; the
     consolidated release checklist memo does
     not.

  **Beta-ready subsystems:** verification
  runner + proof surfaces (per the step-10
  trust-boundary safety review); GitHub review
  surfaces (beta-complete per step 8, beta-
  stable per step 10); finding filters; graph-
  aware filtering; issue governance core loop;
  resolver packets; publications / agent
  contract; memory selection / curation;
  snapshot refresh.

  **Post-beta:** hosted GitHub App; deeper rule
  catalog expansion; richer memory promotion /
  supersession; Windows process-tree kill (Job
  Objects); PR comment refinements (bounded
  retry, same-repo `pull_request` guard);
  source-write automation beyond the policy
  gate.

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
  - Subsystem readiness matrix (15 rows; each
    classified `strong` / `incomplete` +
    `beta-ready` / `beta blocker` + notes).
  - Beta blocker table (3 rows; each with
    why-it-blocks + recommended next slice).
  - Post-beta table (6 rows; each with
    why-post-beta reason).

  **Tests:** new docs suite
  `tests/docs/beta-readiness-classic-parity-review.test.mjs`
  with 19 assertions (memo existence; all 15
  required headings; beta-close-but-not-beta-
  ready language; beta-readiness-is-not-full-
  classic-parity statement; no-more-GitHub-
  surfaces statement; policy / guardrail-
  oriented statement; three identified
  blockers; five subsystems explicitly marked
  beta-ready; subsystem matrix; beta blocker
  table; post-beta table; CHANGELOG mention;
  review-packet PURPOSE PRESERVATION CHECK).
  Full suite expected ≥ 1587 passed / 1
  skipped.

  **Docs:** 14 updated (parity review +
  trust-boundary safety review beta-readiness
  pointers; governance memo step 61 added;
  classic-behavior roadmap + master roadmap
  entries; classic-guarantees-audit +
  classic-alignment-map pointers; 6 concept
  docs added beta-readiness pointer in
  Cross-References). README + CHANGELOG
  updated. New review packet at
  `.rekon-dev/review-packets/beta-readiness-classic-parity-review.md`.

  **Recommended next slice:** **Source-write
  reconciliation policy decision memo.** Pin
  whether beta supports source-write apply at
  all; if yes, pin preview / diff first,
  explicit operator confirmation, verification
  before AND after, rollback strategy, no
  agent-autonomous source writes, artifact
  trail (`ReconciliationLog` or equivalent).
  After that: watcher / path freshness policy
  decision memo, then beta release readiness
  checklist, then beta release execution.

  **Out-of-scope and explicitly not shipped:**
  - No new features.
  - No runtime behaviour change.
  - No CLI behaviour change.
  - No GitHub API calls.
  - No active `.github/workflows/*.yml` files.
  - No VerificationRun / VerificationResult
    schema change.
  - No issue governance / filtering / memory /
    publications / reconciliation behaviour
    change.
  - No version bump. No npm publish.

  **Stop conditions honoured:** the review
  does not claim beta-ready (three blockers
  identified); does not claim full classic
  parity; does not add runtime behaviour;
  does not introduce new implementation work
  in this batch; all 14 listed docs in the
  work order exist and were updated (no skips
  needed).

- Shipped **Verification / GitHub Trust-Boundary
  Safety Review** (P1.1
  verification-github-trust-boundary-safety-review
  slice). **Step 10** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md).
  **Strategy / docs / tests-only batch.** No
  runtime behaviour change. No new package, no
  new CLI command, no new helper, no workflow-
  template change, no validator profile change,
  no GitHub API call.

  **New strategy memo:**
  [`docs/strategy/verification-github-trust-boundary-safety-review.md`](docs/strategy/verification-github-trust-boundary-safety-review.md)
  walks every step-9 hardening fix in isolation
  (proof-chain coherence, bounded streaming
  capture, POSIX process-tree timeout, NODE_OPTIONS
  removal, bounded GitHub API error reads, PR head
  SHA safety) + the affected surfaces (runner,
  both publishers' dry-run + send modes,
  VerificationRun / VerificationResult semantics,
  GitHub Check payloads, PR comment body / update
  path, workflow templates + validator profiles).

  **Decision: the verification / GitHub trust
  boundary is beta-stable.** No additional GitHub
  review surfaces should be added before beta;
  remaining work is operational polish +
  documented platform caveats.

  **Required statements pinned by the memo + the
  docs test:**
  - GitHub status and comments are not canonical
    truth; Rekon artifacts remain canonical.
  - A successful GitHub Check or PR comment
    publish does not imply findings are resolved
    or reconciliation has been applied.
  - VerificationResult and VerificationRun must
    remain chain-coherent in every review surface.
  - Windows timeout behaviour is direct-child-only
    unless a future platform-specific process-tree
    strategy is implemented.

  **Three diagnostic tables in the memo:**
  - Hardening table: six fixes (proof-chain
    coherence, bounded output capture, timeout
    semantics, environment policy, GitHub error
    bounds, PR head SHA policy) — each with
    status, evidence, and remaining follow-up.
  - Risk table: mixed proof chain / memory
    exhaustion via output / orphan child process
    / env-based Node injection / huge GitHub
    error body / wrong PR SHA — each with current
    guardrail and remaining follow-up.
  - Beta decision table: coherent proof chain /
    bounded execution logs / token-log safety /
    timeout semantics documented / PR SHA policy
    safe / canonical artifact boundary preserved
    / no auto-resolution — **every criterion
    passes**.

  **Tests:** new docs suite
  `tests/docs/verification-github-trust-boundary-safety-review.test.mjs`
  with 18 assertions (memo existence; all 13
  required headings; beta-stable language;
  canonical-truth + Rekon-artifacts-canonical
  phrases; chain-coherent statement; bounded
  streaming + POSIX process-tree kill + Windows
  direct-child-only references; NODE_OPTIONS
  removal reference; bounded GitHub API error-
  body reference; explicit PR head SHA reference;
  no-auto-resolve language; hardening / risk /
  beta-decision tables; CHANGELOG mention;
  review-packet PURPOSE PRESERVATION CHECK).
  Full suite expected ≥ 1568 passed / 1 skipped.

  **Docs:** 12 updated (parity review +
  hardening review packet cross-links; v1
  decision memo + Check publisher decision memo
  + Check publisher safety review + PR comment
  publisher safety review trust-boundary
  pointers; verification-runs concept +
  verification-run artifact + operator guide
  Cross-References; governance memo steps 59 +
  60 added; classic-behavior roadmap + master
  roadmap entries). README + CHANGELOG updated.
  New review packet at
  `.rekon-dev/review-packets/verification-github-trust-boundary-safety-review.md`.

  **Recommended next slice:** **Beta readiness /
  remaining classic-parity review.** Step back
  from GitHub-specific work and assess the
  remaining delta to beta — verification runner
  gaps, issue governance, filtering, memory,
  publications, source-write / reconciliation
  gaps, watcher / path freshness gaps. Decide
  which gaps must close before beta and which
  are post-beta.

  **Out-of-scope and explicitly not shipped:**
  - No change to verification execution
    behaviour.
  - No change to GitHub Check behaviour.
  - No change to PR comment behaviour.
  - No new GitHub API calls.
  - No active `.github/workflows/*.yml` files.
  - No change to workflow templates.
  - No change to validator profiles.
  - No VerificationRun / VerificationResult
    schema change.
  - No version bump. No npm publish.

  **Stop conditions honoured:** the review
  preserves the canonical artifact boundary;
  does not overstate Windows process-tree
  behaviour (direct-child-only documented
  honestly); does not claim beta stability on
  any hardening fix that cannot be verified
  from existing contract tests + docs; does
  not change runtime behaviour.

- Shipped **Verification / GitHub Trust-Boundary
  Hardening** (P1.1
  verification-github-trust-boundary-hardening slice).
  **Step 9** of the CI / GitHub adapter implementation
  sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md).
  Hardening batch — runtime code changes in
  `@rekon/capability-docs`,
  `@rekon/capability-verify`, and the CLI; no new
  surfaces, no new workflow templates, no new GitHub
  API calls.

  Six trust-boundary fixes (one per row of the bug
  register paged by the
  [GitHub Review Surfaces Parity Review](docs/strategy/github-review-surfaces-parity-review.md)):

  1. **Coherent GitHub Check proof-chain selection.**
     `rekon publish github-check` now picks the
     VerificationRun cited by
     `VerificationResult.header.inputRefs` instead of
     the unrelated latest VerificationRun. A missing
     cited run surfaces a `proofChainWarnings` entry
     on the output instead of silently substituting.
  2. **Bounded stdout/stderr streaming capture.** The
     runner's spawn path now uses an incremental
     sha256 hash + a bounded excerpt buffer; large
     streams cannot exhaust memory before truncation.
     `originalBytes` still reflects the full stream;
     the digest covers every byte.
  3. **POSIX process-tree timeout kill semantics.**
     On POSIX, the runner spawns commands `detached`
     and kills the process group via
     `process.kill(-pid, signal)` on timeout, so
     grandchildren no longer outlive the runner.
     Windows direct-child-only kill is documented
     honestly.
  4. **`NODE_OPTIONS` removed from runner env
     allowlist.** `VERIFICATION_RUN_ENV_ALLOWLIST`
     no longer includes `NODE_OPTIONS` — preloading
     modules into plan-command children would
     compromise proof repeatability.
     `NPM_CONFIG_USERCONFIG` is kept as a deliberate
     trade-off (npm semantics depend on it; the
     secret-key scrub still applies).
  5. **Bounded GitHub API error-body reads.** Both
     `publishGitHubCheckRun` and `publishPrCommentRun`
     now use a new shared `readBoundedResponseBody`
     that streams via `response.body.getReader()`,
     aborts at 64 KiB, and cancels the reader so the
     connection releases promptly.
  6. **PR head SHA safety on `pull_request` events.**
     New readiness issue code `missing-pr-head-sha`.
     `pull_request` / `pull_request_target` events
     require an explicit head SHA (via
     `--head-sha <sha>` flag or `GITHUB_HEAD_SHA`
     env). `push` / `workflow_dispatch` continue
     using `GITHUB_SHA`. `pull_request_target`
     remains unconditionally denied.

  **Public API changes** (all additive or explicit
  scope reductions):
  - `@rekon/capability-docs`: new readiness issue
    code `missing-pr-head-sha`; the bounded body
    reader is internal but is reused by both
    publishers.
  - `@rekon/capability-verify`:
    `VERIFICATION_RUN_ENV_ALLOWLIST` no longer
    contains `NODE_OPTIONS` (subtractive).
  - CLI: new optional `--head-sha <sha>` flag on
    `publish github-check --send`; new optional
    `proofChainWarnings` field on `publish
    github-check` dry-run + send JSON output.
  - No validator-profile changes. No workflow-template
    changes. No artifact-shape change.

  **Tests:** new contract suite
  `tests/contract/verification-github-trust-boundary-hardening.test.mjs`
  with 17 tests across 5 groups (proof-chain
  coherence, execution bounds, timeout semantics,
  GitHub API error bounds, PR head SHA). Two
  existing readiness tests updated to pass explicit
  `headShaOverride`; one new readiness rejection
  test added. Full suite **1550 passed / 1
  skipped**.

  **Docs:** updated decision memos
  (verification-runner-v1-decision, Check publisher
  decision, Check publisher safety review, PR
  comment publisher safety review, GitHub review
  surfaces parity review), the
  VerificationRun artifact + verification-runs
  concept (POSIX vs. Windows kill semantics +
  bounded streaming + `NODE_OPTIONS` policy), the
  operator guide (PR head SHA section), the
  governance memo (step 59), classic-behavior
  roadmap + master roadmap. New review packet at
  `.rekon-dev/review-packets/verification-github-trust-boundary-hardening.md`.

  **Recommended next slice:** Verification / GitHub
  trust-boundary safety review — strategy review
  over the hardening results.

  **Out-of-scope and explicitly not shipped:**
  - No new GitHub surfaces.
  - No PR comment refinements (the safety review
    already declared the surface beta-ready).
  - No GitHub Check refinements beyond hardening.
  - No VerificationRun / VerificationResult schema
    change.
  - No automatic finding resolution / reconciliation
    apply.
  - No active `.github/workflows/*.yml` files.
  - No version bump. No npm publish.

  **Stop conditions honoured:** no schema change
  (only behavioural fixes to existing fields);
  bounded streaming preserves digests; process-tree
  kill is implemented safely on POSIX + documented
  honestly on Windows; `NODE_OPTIONS` removal
  doesn't break existing tests; token never appears
  in error output (sentinel-token tests still
  green); `pull_request --send` cannot silently use
  `GITHUB_SHA`.

- Shipped **GitHub review surfaces parity review**
  (P1.1 github-review-surfaces-parity-review slice).
  **Step 8** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md).
  **Strategy / docs / tests-only batch.** No
  runtime behaviour change. No new package, no
  new CLI command, no new helper, no workflow-
  template change, no validator profile change,
  no GitHub API call.

  **New strategy memo:**
  [`docs/strategy/github-review-surfaces-parity-review.md`](docs/strategy/github-review-surfaces-parity-review.md)
  reviews the combined GitHub review surface
  end-to-end. Surfaces reviewed:
  - read-only dry-run workflow template;
  - read-only execute workflow template;
  - opt-in GitHub Check send workflow template;
  - opt-in PR comment workflow template;
  - three workflow validator profiles (`read-only`,
    `github-check-send`,
    `github-pr-comment-send`);
  - GitHub Check publisher dry-run + send CLI;
  - PR comment publisher dry-run + send CLI;
  - proof-report / architecture-summary /
    agent-contract publications;
  - uploaded `.rekon/artifacts` (canonical
    record);
  - job summary markdown (downstream surface);
  - `rekon artifacts latest` helper;
  - canonical artifact boundary;
  - fork / token / write-permission safety;
  - operator ergonomics gaps.

  **Decision: beta-complete as an opt-in
  surface.** Read-only templates remain the
  alpha default. GitHub Checks remain the
  primary status surface. PR comments remain
  the narrative companion surface. Uploaded
  Rekon artifacts remain canonical truth. **No
  additional GitHub API surface is needed
  before beta.**

  **Required statements pinned by the memo + the
  docs test:**
  - GitHub status and comments are not canonical
    truth; Rekon artifacts remain canonical.
  - A successful GitHub Check or PR comment
    publish does not imply findings are resolved
    or reconciliation has been applied.
  - Forked PRs and `pull_request_target` remain
    blocked by default.
  - Read-only workflows remain the recommended
    starting point for adoption.

  **Three diagnostic tables in the memo:**
  - Surface table: read-only dry-run / execute /
    Check workflow / PR comment workflow / Check
    publisher / PR comment publisher / uploaded
    artifacts / job summary — each with role +
    status + notes.
  - Risk table: GitHub status treated as truth /
    comment noise / fork token misuse / stale
    proof / raw log leakage — each with current
    guardrail and remaining follow-up.
  - Beta decision table: canonical artifacts
    preserved / Check status surface exists /
    narrative PR surface exists / read-only
    adoption path exists / workflow safety
    validation exists / fork-default-deny posture
    preserved / automatic resolution avoided —
    **every criterion passes**.

  **Tests:** new docs suite
  `tests/docs/github-review-surfaces-parity-review.test.mjs`
  with 20 assertions (memo existence; all 13
  required headings; beta-complete language;
  read-only alpha default; Checks primary
  surface; PR comments narrative companion;
  canonical-truth + Rekon-artifacts-canonical
  phrases; no auto-resolve language; forked PRs
  blocked; references to read-only workflow
  templates / Check workflow / PR comment
  workflow / validator profiles /
  `.rekon/artifacts`; surface table; risk table;
  beta decision table; CHANGELOG mention;
  review-packet PURPOSE PRESERVATION CHECK).
  Full suite expected ≥ 1532 passed / 1
  skipped.

  **Docs:** 14 updated (GitHub Check publisher
  safety review adds parity-review pointer; PR
  comment publisher safety review adds parity-
  review pointer; CI / GitHub adapter decision
  memo adds step 8 + step 9 (next: hardening) +
  step 10 (cross-CI later); GitHub Check
  publisher decision memo adds parity-review
  update block; PR comment publisher decision
  memo adds parity-review update block;
  operator guide Cross-references; three concept
  docs + proof-report artifact doc Cross-
  References; governance memo step 58 added;
  classic-behavior roadmap entry; master
  roadmap entry). README + CHANGELOG updated.
  New review packet
  `.rekon-dev/review-packets/github-review-surfaces-parity-review.md`.

  **Recommended next slice:** **Verification /
  GitHub Trust-Boundary Hardening.** Return to
  foundational hardening before adding any new
  review surfaces: coherent VerificationResult
  → VerificationRun proof-chain selection for
  GitHub Check payloads; bounded stdout/stderr
  streaming memory; process-tree timeout
  semantics; `NODE_OPTIONS` removal from runner
  env; bounded GitHub API error-body reads (re-
  confirm); PR head-SHA policy.

  **Out-of-scope and explicitly not shipped:**
  - No change to GitHub Check behaviour.
  - No change to PR comment behaviour.
  - No new GitHub API calls.
  - No active `.github/workflows/*.yml` files
    added to the Rekon repo.
  - No change to workflow templates or
    validator behaviour.
  - No new hosted / GitHub App behaviour.
  - No artifact-shape change.
  - No version bump. No npm publish.

  **Stop conditions honoured:** the review
  preserves the canonical artifact boundary; it
  does not change Check / PR comment behaviour;
  it does not claim beta-completeness on any
  required surface that cannot be verified from
  shipped docs / tests; every surface in the
  work order's "required review scope" list is
  reviewed explicitly with cross-references to
  the existing per-surface decision memos and
  safety reviews.

- Shipped **PR comment publisher safety review**
  (P1.1 pr-comment-publisher-safety-review slice).
  **Step 7g** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md).
  **Strategy / docs / tests-only batch.** No
  runtime behaviour change. No new package, no
  new CLI command, no new helper, no workflow-
  template change, no validator profile change,
  no GitHub API call, no token read.

  **New strategy memo:**
  [`docs/strategy/pr-comment-publisher-safety-review.md`](docs/strategy/pr-comment-publisher-safety-review.md)
  walks the full PR comment publishing path
  end-to-end. Components reviewed:
  `buildPrCommentBody`,
  `assessPrCommentPublisherReadiness`,
  `publishPrCommentRun`,
  `rekon publish pr-comment --dry-run`,
  `rekon publish pr-comment --send`,
  [`docs/examples/workflows/rekon-pr-comment-send.yml`](docs/examples/workflows/rekon-pr-comment-send.yml),
  the `github-pr-comment-send` validator profile,
  the idempotency marker, pagination + update-in-
  place behaviour, token + error sanitization,
  fork + event safety, and the canonical-artifact
  boundary.

  **Decision: beta-ready as an opt-in,
  trusted-context-only, update-in-place review
  surface.** Read-only templates remain the alpha
  default. GitHub Checks remain the primary
  status surface; PR comments are a narrative
  companion surface.

  **Required statements pinned by the memo + the
  docs test:**
  - PR comments are not canonical truth; Rekon
    artifacts remain canonical.
  - The idempotency marker is not proof; it is
    only an update-in-place handle.
  - Forked PRs and `pull_request_target` remain
    blocked by default.
  - No automatic finding resolution or
    reconciliation apply is implied by a
    successful PR comment publish.

  **Three diagnostic tables in the memo:**
  - Component status table: body helper /
    readiness helper / dry-run CLI / send CLI /
    API writer / workflow template / validator
    profile — all shipped + beta-ready.
  - Pinned-safety-facts table: cross-references
    every test that pins the safety contract
    (helper PATCH/POST, pagination, no-token-
    leak, dry-run no-network, readiness gates,
    workflow triggers, validator rejections,
    artifact-index byte-identical).
  - Risk table: duplicate comments / stale
    comments / fork token misuse / token
    leakage / comment treated as proof — each
    with current guardrail and remaining
    follow-up.

  **Tests:** new docs suite
  `tests/docs/pr-comment-publisher-safety-review.test.mjs`
  with 18 assertions (memo existence; all 15
  required headings; beta-ready language;
  GitHub Checks primary / PR comments companion
  language; canonical-truth + Rekon-artifacts-
  canonical phrases; marker-not-proof phrase;
  forked PRs blocked; `pull_request_target`
  blocked; no auto-resolve language;
  `publishPrCommentRun` reference; `--send`
  reference; `github-pr-comment-send` reference;
  component table; risk table; CHANGELOG
  mention; review-packet PURPOSE PRESERVATION
  CHECK). Full suite expected ≥ 1512 passed /
  1 skipped.

  **Docs:** 12 updated (writer go/no-go review
  memo flips 7g to ✅; API decision gate
  Implementation Sequence; PR comment publisher
  decision memo step 7g flipped to ✅; CI /
  GitHub adapter decision memo step 7g flipped
  to ✅; operator guide adds safety-review
  pointer; three concept docs +
  proof-report artifact doc Cross-References
  lists; governance memo step 57 added;
  classic-behavior roadmap entry; master
  roadmap entry). README + CHANGELOG updated.
  New review packet
  `.rekon-dev/review-packets/pr-comment-publisher-safety-review.md`.

  **Recommended next slice:** GitHub review
  surfaces parity review — walk the combined
  GitHub surface (Checks, PR comments, workflow
  templates, validators, proof publications,
  uploaded artifacts) and decide whether the
  GitHub review surface is beta-complete or
  whether Check / PR comment refinements
  remain.

  **Out-of-scope and explicitly not shipped:**
  - No change to PR comment send behaviour.
  - No new GitHub API calls.
  - No active `.github/workflows/*.yml` files
    added to the Rekon repo.
  - No change to workflow templates or
    validator behaviour.
  - No change to GitHub Check behaviour.
  - No artifact-shape change.
  - No version bump. No npm publish.

  **Stop conditions honoured:** the review
  preserves the canonical artifact boundary; it
  does not change send behaviour; it does not
  claim beta readiness on any safety fact that
  is not already test-pinned; every safety fact
  in the work order's "required facts" list is
  cross-referenced to an existing test.

- Shipped **PR comment API writer** (P1.1
  pr-comment-send-cli slice). **Step 7f** of
  the CI / GitHub adapter implementation
  sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md)
  and the
  [PR Comment API Writer Go/No-Go Review](docs/strategy/pr-comment-api-writer-go-no-go-review.md).
  Adds Rekon's first GitHub PR-comment write
  surface.

  **New helper:**
  `publishPrCommentRun(input)` in
  `@rekon/capability-docs` (parallel to
  `publishGitHubCheckRun`). Uses Node's
  built-in `fetch`; no third-party network
  client. Lists existing PR timeline comments
  via
  `GET /repos/{owner}/{repo}/issues/{n}/comments`
  paginated (`per_page=100`, bounded at 20
  pages), filters by the marker
  `<!-- rekon:pr-comment:v1 -->`, PATCHes the
  first marker-bearing comment in place via
  `PATCH /repos/{owner}/{repo}/issues/comments/{id}`
  on match, or POSTs a new comment via
  `POST /repos/{owner}/{repo}/issues/{n}/comments`
  on miss. Never deletes reviewer-touched
  comments. Bounded response-body reads (≤ 64
  KiB). Sanitized error class
  `PrCommentPublishError` carries
  `{ status, message, documentationUrl }` —
  the token never appears.

  **New CLI mode:**
  `rekon publish pr-comment --send
  [--root <path>] [--pr-number <n>]
  [--confirm-pr-comment-write]
  [--api-base-url <url>] [--json]`.
  Mutually exclusive with `--dry-run`. Reads
  `process.env` (`GITHUB_TOKEN`,
  `GITHUB_REPOSITORY`,
  `GITHUB_PR_NUMBER` / `PR_NUMBER`,
  `REKON_PR_COMMENTS`,
  `REKON_PR_COMMENTS_WRITE_CONFIRMED`,
  event context) only in the `--send`
  branch. Exit 0 on API success regardless
  of underlying proof status; exit 1 on
  readiness failure or API error.

  **Workflow template update:**
  [`docs/examples/workflows/rekon-pr-comment-send.yml`](docs/examples/workflows/rekon-pr-comment-send.yml)
  now declares a required `workflow_dispatch`
  input `pr-number` and runs both
  `publish pr-comment --dry-run` (preview) and
  `publish pr-comment --send
  --confirm-pr-comment-write` (actual write).

  **Validator profile update:** the
  `github-pr-comment-send` profile now
  REQUIRES the `--send` step + the
  `--confirm-pr-comment-write` flag. New issue
  codes: `missing-publish-pr-comment-send`,
  `missing-confirm-pr-comment-write-flag`. The
  previously emitted
  `forbidden-publish-pr-comment-send` code has
  been retired. New mode value:
  `pr-comment-send`. New summary field:
  `hasConfirmPrCommentWriteFlag`.

  **Required statements pinned by the docs +
  the docs test:**
  - PR comments are not canonical truth; Rekon
    artifacts remain canonical.
  - The idempotency marker is not proof; it is
    only an update-in-place handle.
  - Forked PRs remain denied by default.
  - `pull_request_target` remains denied
    unconditionally.

  **Tests:** new contract suite
  `tests/contract/pr-comment-send-cli.test.mjs`
  with 19 tests using a local `node:http`
  fake server + `--api-base-url`. Covers
  readiness gates, pagination walks,
  PATCH-on-marker / POST-on-miss, sanitized
  errors, sentinel-token leak prevention,
  dry-run still no-token / no-network,
  artifact index byte-identical before / after
  `--send`, exit 0 on proof failed / stale.
  Validator contract suite extended (now 57
  tests). New docs suite
  `tests/docs/pr-comment-send-cli.test.mjs`
  with 9 assertions. Full suite expected
  ≥ 1492 passed / 1 skipped.

  **Docs:** 13 updated (go/no-go review
  memo flips 7f to ✅; API decision gate
  Implementation Sequence updated; PR comment
  publisher decision memo step 7f flipped to
  ✅; CI / GitHub adapter decision memo step
  7f flipped to ✅; operator guide rewritten
  for the new send wiring; workflow template
  + validator profile; classic-behavior
  roadmap + roadmap entries; governance memo
  step 56 added). README + CHANGELOG updated.
  New review packet
  `.rekon-dev/review-packets/pr-comment-send-cli.md`.

  **Out-of-scope and explicitly not shipped:**
  - No bounded retry / rate-limit backoff
    (deferred to step 7g).
  - No same-repo `pull_request` guard.
  - No hosted publisher (Option D from the
    API decision gate, rejected).
  - No PR-review endpoints (Option C from
    the writer go/no-go review, rejected).
  - No artifact-shape change.
  - No `schemaVersion` bump. No version bump.
    No npm publish.

  **Stop conditions honoured:** the writer
  uses `pull-requests: write` (not
  `issues: write`); the token never appears
  in stdout / stderr or errors (sentinel-token
  contract test); send cannot create duplicate
  comments when the marker is present (PATCH-
  first / never delete reviewer-touched);
  forked PR + `pull_request_target` cannot
  send (three-layer denial); dry-run still
  reads no token + calls no network; no test
  requires a real GitHub token (fake
  `node:http` server only).

- Shipped **PR comment API writer go/no-go
  review** (P1.1
  pr-comment-api-writer-go-no-go-review slice).
  **Step 7e** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md)
  and the
  [PR Comment Publisher API Decision Gate](docs/strategy/pr-comment-publisher-api-decision-gate.md).
  **Strategy / docs / tests-only batch.** No
  runtime behaviour change. No new package, no
  new CLI command, no new helper, no workflow-
  template change, no validator profile change,
  no GitHub API call, no token read.

  **New strategy memo:**
  [`docs/strategy/pr-comment-api-writer-go-no-go-review.md`](docs/strategy/pr-comment-api-writer-go-no-go-review.md)
  reviews the full pre-API PR comment publishing
  path (dry-run body helper `buildPrCommentBody`;
  readiness helper
  `assessPrCommentPublisherReadiness`; dry-run
  CLI `rekon publish pr-comment --dry-run`;
  workflow template
  [`docs/examples/workflows/rekon-pr-comment-send.yml`](docs/examples/workflows/rekon-pr-comment-send.yml);
  `github-pr-comment-send` validator profile;
  idempotency marker
  `<!-- rekon:pr-comment:v1 -->`; permission
  model; endpoint model; fork / event safety;
  canonical-artifact boundary).

  **Decision: Go — adopt Option B.** Proceed to
  `rekon publish pr-comment --send` using GitHub
  issue comments
  (`POST/PATCH/GET /repos/{owner}/{repo}/issues/{n}/comments`),
  update-in-place by
  `<!-- rekon:pr-comment:v1 -->`,
  `pull-requests: write` permission (already
  declared by the bundled template), gated by
  `REKON_PR_COMMENTS=1` +
  `REKON_PR_COMMENTS_WRITE_CONFIRMED=1` + trusted
  event context + explicit write confirmation.

  **Required statements pinned by the memo + the
  docs test:**
  - PR comments are not canonical truth; Rekon
    artifacts remain canonical.
  - The idempotency marker is not proof; it is
    only an update-in-place handle.
  - Forked PRs remain denied by default.
  - `pull_request_target` remains denied
    unconditionally.

  **Permission boundary** (informational; no
  permission added in this batch): the future
  writer slice (step 7f) will use only the
  shipped `pull-requests: write` scope. The
  validator's permission scan continues to refuse
  every other write scope under the
  `github-pr-comment-send` profile.

  **Diagnostic tables in the memo:**
  - Component status table: 7a / 7b / 7c / 7d /
    7e Shipped; 7f (writer) flagged Next; 7g
    (safety review) flagged Future.
  - Permission table: GitHub Check
    (`checks: write`) / PR comment
    (`pull-requests: write` or `issues: write`) /
    read-only (`contents: read`).
  - Risk table: comment spam / stale comment /
    fork token misuse / endpoint permission
    mismatch — each with current guardrail and
    remaining follow-up.

  **Tests:** new docs suite
  `tests/docs/pr-comment-api-writer-go-no-go-review.test.mjs`
  (18 assertions: memo existence; all 13 required
  headings; Go / Option B recommendation;
  endpoint pinned to issue-comment endpoints;
  permission pinned to `pull-requests: write`;
  marker pinned to
  `<!-- rekon:pr-comment:v1 -->`; canonical-truth
  + Rekon-artifacts-canonical language; marker-
  not-proof language; forked-PR denied-by-
  default; `pull_request_target` denied
  unconditionally; no `--send` implementation
  in this batch; no GitHub API call in this
  batch; references the prior PR comment slices
  (`buildPrCommentBody`,
  `assessPrCommentPublisherReadiness`, `publish
  pr-comment --dry-run`, workflow template,
  validator profile); component status table;
  permission table; risk table; CHANGELOG
  mention; review-packet PURPOSE PRESERVATION
  CHECK).

  **Docs:** 11 updated (new memo; PR Comment
  Publisher API Decision Gate Status block + 7e
  Implementation Sequence row; PR comment
  publisher decision memo Implementation
  Sequence updated with steps 7e / 7f / 7g; CI /
  GitHub adapter decision memo step 7e flipped
  to ✅ + numbering refactored to 7f / 7g for
  remaining future slices; operator guide +
  three concept docs + the proof-report artifact
  doc Cross-References lists; issue-governance
  memo step 55 added; classic-behavior roadmap +
  roadmap entries). README + CHANGELOG updated.
  New review packet
  `.rekon-dev/review-packets/pr-comment-api-writer-go-no-go-review.md`.

  **Recommended next slice:** **PR comment API
  writer** (step 7f). Ship the
  `publishPrCommentRun(input)` helper in
  `@rekon/capability-docs` (parallel to
  `publishGitHubCheckRun`), the `rekon publish
  pr-comment --send` CLI mode, the workflow
  template `--send` step, a validator-profile
  lift (or a separate
  `github-pr-comment-send-active` profile —
  decided inside 7f), contract tests at
  `tests/contract/pr-comment-send-cli.test.mjs`
  using a local `node:http` fake server +
  `--api-base-url` flag, and a sentinel-token
  contract test. Then step 7g (safety review)
  walks the full publishing path end-to-end,
  parallel to the GitHub Check publisher safety
  review.

  **Out-of-scope and explicitly not shipped:**
  - No PR comment posting.
  - No `rekon publish pr-comment --send` CLI
    mode.
  - No new validator profile.
  - No new workflow template.
  - No modification to existing workflow
    templates.
  - No new GitHub API calls.
  - No new GitHub write permissions in any
    workflow template.
  - No artifact-shape change.
  - No `schemaVersion` bump. No version bump.
    No npm publish.

  **Stop conditions honoured:** the memo does
  not implement PR comment posting; no GitHub
  API calls added; no workflow templates added
  or modified; no validator behaviour change;
  no new permissions in existing templates; no
  GitHub Check behaviour change; PR comments
  are not implied to be canonical truth; the
  idempotency marker is not implied to be
  proof; forked PRs remain denied by default
  at three layers; `pull_request_target`
  remains denied unconditionally.

- Shipped **PR comment workflow / validator
  profile** (P1.1
  pr-comment-workflow-validator-profile slice).
  **Step 7d** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md)
  and the
  [PR Comment Publisher API Decision Gate](docs/strategy/pr-comment-publisher-api-decision-gate.md).
  **Workflow template + validator profile + tests
  + docs batch.** No PR comment posted. No GitHub
  API call. No token read. No active workflow
  added to the Rekon repo.

  **New workflow template:**
  [`docs/examples/workflows/rekon-pr-comment-send.yml`](docs/examples/workflows/rekon-pr-comment-send.yml).
  `workflow_dispatch` trigger only (no
  `pull_request`, no `pull_request_target`).
  Permissions: `contents: read` +
  `pull-requests: write` only — no other write
  scopes; `checks: write` deliberately absent
  (that scope belongs to the separate GitHub
  Check opt-in template). Workflow-level env
  declares `REKON_PR_COMMENTS: "1"` and
  `REKON_PR_COMMENTS_WRITE_CONFIRMED: "1"`. Runs
  the full execute proof loop + the publication
  chain (proof / architecture / agent-contract)
  + `artifacts validate` (read-only) +
  `rekon publish pr-comment --dry-run`
  (preview-only). **Does not include
  `publish pr-comment --send`** — the API writer
  is not implemented yet. Uploads
  `.rekon/artifacts/**` excluding `.log`. Job
  summary carries `Mode: pr-comment-dry-run`,
  every refresh-loop ref, the canonical-truth
  reminder
  (`GitHub comments are not canonical truth;
  Rekon artifacts remain canonical.`), and the
  marker-not-proof reminder (`The PR comment
  marker is an idempotency handle, not proof.`).

  **New validator profile:**
  `github-pr-comment-send` extends `rekon verify
  github-workflow validate --profile`. Permits
  `pull-requests: write` only (and baseline
  `contents: read`); rejects every other write
  scope including `checks: write`,
  `contents: write`, `id-token: write`,
  `actions: write`, `deployments: write`,
  `statuses: write`, `packages: write`; rejects
  `pull_request_target` + the `pull_request`
  trigger; requires the Rekon opt-in env
  (`REKON_PR_COMMENTS=1` +
  `REKON_PR_COMMENTS_WRITE_CONFIRMED=1`) + the
  `publish pr-comment --dry-run` step; refuses
  `publish pr-comment --send`.

  **New mode value:** `pr-comment-dry-run`.

  **New issue codes** (additive):
  `missing-pull-requests-write`,
  `missing-rekon-pr-comments-opt-in`,
  `missing-pr-comments-write-confirmation`,
  `missing-publish-pr-comment-dry-run`,
  `forbidden-publish-pr-comment-send`,
  `missing-pr-comment-marker-reminder`. Reuses the
  existing `pull-request-trigger-disallowed` code
  (now applied to both `github-check-send` and
  `github-pr-comment-send`).

  **Operator-guide update:** new "Optional:
  preview a PR comment workflow" section in
  [`docs/examples/github-actions-verification-runner.md`](docs/examples/github-actions-verification-runner.md)
  points at the new template, lists the validator
  command (`--profile github-pr-comment-send`),
  and reiterates the canonical-truth + marker-not-
  proof reminders.

  **Tests:** 14 new validator helper tests + 1
  new CLI test in
  `tests/contract/github-workflow-safety-validator.test.mjs`
  (now 56 total). 22 new docs assertions in
  `tests/docs/pr-comment-workflow-validator-profile.test.mjs`.
  Full suite expected ≥ 1448 passed / 1 skipped.

  **Validator smokes** (all bundled templates
  validate against their own profile;
  cross-profile validation correctly fails):
  - `rekon-verification.yml` with `--profile
    read-only` → exit 0.
  - `rekon-verification-dry-run.yml` with
    `--profile read-only` → exit 0.
  - `rekon-verification-check-send.yml` with
    `--profile github-check-send` → exit 0.
  - `rekon-pr-comment-send.yml` with `--profile
    github-pr-comment-send` → exit 0.
  - `rekon-pr-comment-send.yml` with `--profile
    read-only` → exit 1.
  - `rekon-verification-check-send.yml` with
    `--profile github-pr-comment-send` → exit 1.

  **Out-of-scope and explicitly not shipped:**
  - No PR comment posting.
  - No new GitHub API calls.
  - No `rekon publish pr-comment --send` CLI
    mode.
  - No change to existing read-only / GitHub
    Check workflow templates or their validator
    profiles.
  - No change to the PR comment dry-run helpers
    (`buildPrCommentBody`,
    `assessPrCommentPublisherReadiness`).
  - No `issues: write` validator-scope addition
    (the bundled template does not request
    `issues: write`; a future slice may extend
    the validator if the API writer selects
    that endpoint).
  - No artifact-shape change. No version bump.
    No npm publish.

  **Stop conditions honoured:** no PR comment
  posting; no GitHub API call; no token read; no
  active `.github/workflows/*.yml` added; existing
  read-only / check-send templates unchanged;
  validator profiles cleanly separated; the
  template carries the marker-not-proof reminder
  so operators don't mistake the marker for
  canonical truth.

- Shipped **PR Comment Publisher API Decision
  Gate** (P1.1
  pr-comment-publisher-api-decision-gate slice).
  **Step 7c** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md)
  and the
  [PR comment publisher decision memo](docs/strategy/pr-comment-publisher-decision.md).
  **Strategy / docs / tests-only batch.** No
  runtime behaviour change. No new package, no new
  CLI command, no new helper, no workflow-template
  modification, no validator profile change, no
  GitHub API call.

  **New strategy memo:**
  [`docs/strategy/pr-comment-publisher-api-decision-gate.md`](docs/strategy/pr-comment-publisher-api-decision-gate.md)
  reviews the shipped PR comment dry-run components
  (`buildPrCommentBody`,
  `assessPrCommentPublisherReadiness`,
  `rekon publish pr-comment --dry-run`), the
  GitHub permission boundary, the
  fork-default-deny posture, the comment-body
  model, the idempotency + noise strategy, and
  four implementation options.

  **Decision: Option C — add a workflow /
  validator profile gate first; do not implement
  the API writer in the next slice.** Re-evaluate
  the API writer after the gate exists and
  operators have inspected the concrete permission
  boundary.

  **Required statements pinned by the memo + the
  docs test:**
  - Actual PR comment posting remains deferred
    until a PR comment workflow / validator
    profile exists.
  - PR comments are not canonical truth; Rekon
    artifacts remain canonical.
  - The idempotency marker is not proof; it is
    only an update-in-place handle.
  - Forked PRs must not receive secret-bearing
    comment publishing by default.

  **Permission boundary** (informational; no
  permission added in this batch): creating or
  updating PR timeline comments requires
  `issues: write` or `pull-requests: write` —
  broader than the `checks: write` the GitHub
  Check publisher uses today. A future
  `github-pr-comment-send` validator profile (step
  7d) will permit the broader scope and reject
  every other write scope. GitHub Actions itself
  denies write tokens to forked-PR workflows by
  default.

  **Diagnostic tables in the memo:**
  - Component table: `buildPrCommentBody` /
    `assessPrCommentPublisherReadiness` / `publish
    pr-comment --dry-run` / idempotency marker
    shipped; API writer + workflow/validator
    profile not shipped.
  - Risk table: comment spam / stale comment /
    fork token misuse / comment treated as proof —
    each with a current guardrail and a remaining
    follow-up.

  **Tests:** new docs suite
  `tests/docs/pr-comment-publisher-api-decision-gate.test.mjs`
  (18 assertions: memo existence; all 13 required
  headings; Option C recommendation;
  defer-posting language; profile-before-API-
  writer language; canonical-truth and
  artifacts-canonical phrases; marker-not-proof
  phrase; helper references
  (`buildPrCommentBody`,
  `assessPrCommentPublisherReadiness`); CLI
  reference (`publish pr-comment --dry-run`);
  permission scopes (`issues: write`,
  `pull-requests: write`); fork-default-deny;
  both diagnostic tables; CHANGELOG mention;
  review-packet PURPOSE PRESERVATION CHECK). Full
  suite expected ≥ 1410 passed / 1 skipped.

  **Docs:** 11 updated (new memo; PR comment
  publisher decision memo Implementation Sequence
  updated to thread step 7c into the staged path;
  CI / GitHub adapter decision memo step 7c
  flipped to ✅; GitHub Check publisher decision
  memo step 9 cross-reference; GitHub Check
  publisher safety review Follow-Up Work updated;
  operator guide + four concept / artifact docs
  Cross-References lists; classic-behavior
  roadmap + roadmap + issue-governance memo —
  step 53 added). README + CHANGELOG updated. New
  review packet
  `.rekon-dev/review-packets/pr-comment-publisher-api-decision-gate.md`.

  **Out-of-scope and explicitly not shipped:**
  - No PR comment publisher API writer.
  - No `rekon publish pr-comment --send` CLI mode.
  - No `github-pr-comment-send` validator profile
    (next slice, if Option C approved).
  - No new workflow template (next slice, if
    Option C approved).
  - No new GitHub API calls.
  - No new GitHub write permissions in any
    workflow template.
  - No artifact-shape change.
  - No version bump. No npm publish.

  **Stop conditions honoured:** the memo does
  not implement PR comment posting; no GitHub API
  calls added; no workflow templates added or
  permissions changed; the memo does not claim
  PR comments are required for beta; fork / secret
  safety is preserved; comments are not implied
  to be canonical truth.

- Shipped **PR comment body dry-run helper + CLI**
  (P1.1 pr-comment-dry-run-cli slice). **Step 7b**
  of the CI / GitHub adapter implementation
  sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md)
  and the
  [PR comment publisher decision memo](docs/strategy/pr-comment-publisher-decision.md).
  **Helper + CLI + tests + docs batch.** No
  GitHub API call. No `GITHUB_TOKEN` read. No
  network-client import. No workflow-template
  modification.

  **New `@rekon/capability-docs` exports:**
  - `buildPrCommentBody(input)` — pure helper that
    renders the Rekon-owned PR comment markdown
    body from artifact-like inputs. Always emits
    the idempotency marker
    `<!-- rekon:pr-comment:v1 -->` at the top, the
    canonical-truth reminder
    (`GitHub comments are not canonical truth;
    Rekon artifacts remain canonical.`), a
    citation table for every supplied artifact
    ref, optional Warnings + Next-steps blocks
    based on the detected proof state, and the
    `summary` object surfacing
    `verificationStatus` / `proofFreshness` /
    `artifactsValid` / `hasWarnings` for callers.
  - `assessPrCommentPublisherReadiness(input)` —
    pure helper that returns
    `{ ready, issues[] }` after evaluating
    `REKON_PR_COMMENTS=1`, `GITHUB_REPOSITORY`, a
    PR-number gate (`GITHUB_PR_NUMBER` /
    `PR_NUMBER`), `GITHUB_TOKEN`, event-trust
    classification (`workflow_dispatch` / `push` /
    same-repo `pull_request` trusted; forked
    `pull_request` untrusted by default;
    `pull_request_target` refused unconditionally),
    and explicit
    `writePermissionConfirmed`.
  - Constants:
    `PR_COMMENT_PUBLISHER_MARKER` =
    `<!-- rekon:pr-comment:v1 -->`,
    `PR_COMMENT_PUBLISHER_CANONICAL_TRUTH_REMINDER`
    = `"GitHub comments are not canonical truth;
    Rekon artifacts remain canonical."`
  - 10 new type aliases:
    `PrCommentBodyInput`,
    `PrCommentBodySummary`, `PrCommentBody`,
    `PrCommentFreshness`,
    `PrCommentPublisherReadinessIssueCode`,
    `PrCommentPublisherReadinessIssue`,
    `PrCommentPublisherReadiness`,
    `PrCommentEventTrust`,
    `PrCommentPublisherReadinessEvent`,
    `PrCommentPublisherReadinessInput`.

  **New CLI command:** `rekon publish pr-comment
  --dry-run [--root <path>] [--json]`. Registered
  alongside the existing `publish github-check`
  dispatch. **`--dry-run` is required;** `--send`
  / `--publish` / `--execute` are refused with
  exit 1. The CLI reads the latest local
  `VerificationResult` / `VerificationRun` /
  `VerificationPlan` and the latest `Publication`
  of each kind (`proof-report`,
  `architecture-summary`, `agent-contract`),
  runs `validateArtifactIndex(store)` read-only,
  calls the shared helpers, and prints
  `{ kind: "rekon.pr-comment.dry-run", dryRun:
  true, wouldPublish: false, readiness, comment,
  citedRefs, canonicalTruthReminder }` as JSON.
  In dry-run mode the readiness assessor receives
  an explicitly empty env map; the CLI never reads
  `process.env.GITHUB_TOKEN`.

  **Safety contract:**
  - **No GitHub API call.** A source-scan test on
    the pr-comment branch of the CLI fails the
    build if `fetch(`, `https.request(`,
    `http.request(`, `new Request(`, or
    `publishGitHubCheckRun(` appears in the
    branch body.
  - **No token reads in dry-run.** A behavioural
    test passes a sentinel `GITHUB_TOKEN` and
    asserts it never appears in stdout / stderr.
  - **No raw stdout / stderr leak.** A contract
    test threads a sentinel through
    `evidenceNotes` / `notes` / `recordedBy` on
    the input and asserts the sentinel does not
    appear in the rendered body.
  - **No comment posting.** The CLI never opens a
    socket, never lists / patches / posts a PR
    comment; `wouldPublish: false` is the only
    value the dry-run can emit.

  **Tests:** new contract suite
  `tests/contract/pr-comment-dry-run-cli.test.mjs`
  (18 tests). New docs suite
  `tests/docs/pr-comment-dry-run-cli.test.mjs`
  (9 assertions). Full suite expected ≥ 1392
  passed / 1 skipped.

  **Docs:** 10 updated (PR comment publisher
  decision memo step 2 flipped to ✅; CI / GitHub
  adapter decision memo step 7b flipped to ✅;
  operator guide gains an "Optional: preview a PR
  comment (dry-run only)" section; concept /
  artifact docs Cross-References lists;
  classic-behavior roadmap + roadmap +
  issue-governance memo — step 52 added).
  README + CHANGELOG updated. New review packet
  `.rekon-dev/review-packets/pr-comment-dry-run-cli.md`.

  **Out-of-scope and explicitly not shipped:**
  - No actual PR comment posting (deferred to a
    future decision-gate slice).
  - No new GitHub API calls.
  - No new GitHub write permissions in any
    workflow template.
  - No new validator profile.
  - No new workflow template.
  - No artifact-shape change.
  - No version bump. No npm publish.

  **Stop conditions honoured:** the dry-run CLI
  never calls GitHub; the dry-run CLI never
  reads `GITHUB_TOKEN`; the comment body never
  includes raw stdout / stderr or token-looking
  inputs; the body never implies GitHub
  comments are canonical truth; the idempotency
  marker is documented as not-proof.

- Shipped **PR Comment Publisher Decision Memo**
  (P1.1 pr-comment-publisher-decision slice).
  **Step 7a** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md).
  **Strategy / docs / tests-only batch.** No
  runtime behaviour change. No new package, no
  new CLI command, no new helper, no
  workflow-template modification, no GitHub API
  call.

  **New strategy memo:**
  [`docs/strategy/pr-comment-publisher-decision.md`](docs/strategy/pr-comment-publisher-decision.md)
  decides whether Rekon adds a PR comment surface
  after the GitHub Check publisher path. Reviews
  all four options (A: no PR comments for beta;
  B: PR comment dry-run / preview only; C: opt-in
  idempotent PR comment publisher; D: hosted /
  GitHub App publisher).

  **Decision: Option B — design a PR comment
  dry-run renderer; defer actual PR comment
  posting.** PR comments are not required for
  beta if GitHub Checks + Rekon artifacts are
  sufficient for review (the safety review
  already pinned that they are).

  **Pinned constraints for any future PR comment
  publisher:**
  - Must be opt-in. Disabled by default at the
    CLI, the workflow template, and any future
    validator profile.
  - Must be same-repo / trusted-context only.
    Forked PRs and `pull_request_target` denied
    by default at three layers (template,
    validator, runtime readiness assessor).
  - Must update in place via the
    `<!-- rekon:pr-comment:v1 -->` marker. The
    marker is not proof; it's an identity handle
    for update-in-place behaviour.
  - Must scope the token. PR comment token reads
    confined to the future `--send` branch.
    Sanitized errors. Sentinel-token contract
    test.
  - Comment body must include
    `VerificationResult` status, `VerificationRun`
    ref, proof-report / architecture-summary /
    agent-contract `Publication` refs,
    `artifacts validate` outcome, stale-proof
    warnings, the canonical-truth phrase, and a
    link to the uploaded `.rekon/artifacts`.
  - Comment body must **not** include raw
    stdout/stderr, full artifact bodies, secrets,
    tokens, or the Rekon-minted `GITHUB_TOKEN`.

  **GitHub permission context** (informational;
  no permission added in this batch):
  - Creating or updating PR timeline comments
    requires Issues or Pull requests write
    permission.
  - `issues: write` or `pull-requests: write` —
    either grants the scope; `pull-requests:
    write` is the more conventional choice for
    PR-conversation surfaces.
  - Forked-PR workflows do not receive write
    tokens by default; GitHub's repository-
    setting toggle is off by default.

  **Implementation Sequence** (informational; this
  batch ships only the decision memo):
  1. Decision memo (this batch).
  2. PR comment body dry-run helper + `rekon
     publish pr-comment --dry-run --json` CLI.
     Mirrors the step-6a / 6b shape exactly. No
     GitHub API call.
  3. Validator / docs for the broader permission
     scope (e.g. a `github-pr-comment-send`
     profile).
  4. Actual PR comment API write behind the
     readiness gate. Update-in-place.

  **Tests:** new docs suite
  `tests/docs/pr-comment-publisher-decision.test.mjs`
  (18 assertions: memo existence; all 13
  required headings; Option B recommendation;
  defer-posting language; beta-not-required
  language; permission context; fork-default-
  deny; opt-in / same-repo-only / update-in-place
  language; marker present + marker-is-not-proof;
  canonical-truth language; no raw logs /
  secrets / full stdout/stderr; implementation
  sequence; CHANGELOG mention; review-packet
  PURPOSE PRESERVATION CHECK). Full suite
  expected ≥ 1365 passed / 1 skipped.

  **Docs:** 11 updated (new memo; CI / GitHub
  adapter decision memo step 7 amended; GitHub
  Check publisher decision memo step 9 added;
  GitHub Check publisher safety review
  Follow-Up Work updated; operator guide +
  four concept / artifact docs Cross-References;
  classic-behavior roadmap + roadmap +
  issue-governance memo — step 51 added).
  README + CHANGELOG updated. New review packet
  `.rekon-dev/review-packets/pr-comment-publisher-decision.md`.

  **Out-of-scope and explicitly not shipped:**
  - No PR comment publisher implementation.
  - No new GitHub API calls.
  - No new GitHub write permissions in any
    workflow template.
  - No workflow-template modification.
  - No validator profile change.
  - No new package, no new CLI command, no new
    helper.
  - No version bump. No npm publish.

  **Stop conditions honoured:** the memo does
  not implement PR comment publishing; no
  GitHub API calls added; no workflow
  permissions changed; PR comments are not
  claimed to be required for beta; fork /
  secret safety is preserved; comments are
  not implied to be canonical truth.

- Shipped **GitHub Check publisher send workflow
  safety review** (P1.1
  github-check-publisher-send-workflow-safety-review
  slice). **Step 6e** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md).
  **Strategy / docs / tests-only batch.** No runtime
  behaviour change. No new package, no new CLI
  command, no new helper, no workflow-template
  modification.

  **New strategy memo:**
  [`docs/strategy/github-check-publisher-send-workflow-safety-review.md`](docs/strategy/github-check-publisher-send-workflow-safety-review.md)
  reviews the full GitHub Check publishing path:
  - the `buildGitHubCheckPayload` +
    `assessGitHubCheckPublisherReadiness` helpers,
  - the `publishGitHubCheckRun` API client,
  - the `rekon publish github-check --dry-run` and
    `--send` CLI modes,
  - the read-only execute + dry-run workflow
    templates,
  - the opt-in checks-write workflow template,
  - the workflow validator's `read-only` and
    `github-check-send` profiles,
  - token / permission behaviour,
  - fork / event safety at three layers (template,
    validator, runtime),
  - the canonical-artifact boundary,
  - test coverage,
  - remaining risks.

  **Decision: beta-ready as an opt-in surface.**
  Read-only templates remain the recommended alpha
  default. PR comments remain deferred until the
  next slice (the PR Comment Publisher Decision
  Memo) decides whether they add review-time value
  worth their broader scope.

  **Reinforced invariants** (no new mechanism;
  invariant statements appear in the new memo + the
  diagnostic tables):
  - GitHub status is not canonical truth; Rekon
    artifacts remain canonical.
  - Forked PRs and `pull_request_target` remain
    blocked by default at three layers (template
    trigger list, validator profile, runtime
    readiness assessor).
  - No automatic finding resolution or
    reconciliation apply is implied by a successful
    GitHub Check.
  - Tokens are read only inside the `--send` CLI
    branch and never echoed in error output.
  - The Rekon artifact index is byte-identical
    before / after a `--send` run.

  **Tests:** new docs suite at
  `tests/docs/github-check-publisher-send-workflow-safety-review.test.mjs`
  (16 assertions: memo existence; all 13 required
  headings; beta-ready language; read-only alpha
  default language; canonical-truth language;
  fork / `pull_request_target` blocked-by-default
  language; PR comments deferred; dry-run / send /
  validator-profile / opt-in-template references;
  no-auto-resolution language; CHANGELOG mention;
  review-packet PURPOSE PRESERVATION CHECK). Full
  suite expected ≥ 1347 passed / 1 skipped.

  **Docs:** 11 updated (new memo; CI / GitHub
  adapter decision memo step 6 amended; GitHub
  Check publisher decision memo step 7 / 8 added;
  operator guide + four concept / artifact docs
  Cross-References lists; classic-behavior roadmap
  + roadmap + issue-governance memo — step 50
  flipped to ✅). README + CHANGELOG updated. New
  review packet
  `.rekon-dev/review-packets/github-check-publisher-send-workflow-safety-review.md`.

  **Out-of-scope and explicitly not shipped:**
  - No runtime behaviour change. The payload
    helper, readiness helper, send helper, CLI
    surface, and all three workflow templates are
    unchanged.
  - No PR comments. The PR Comment Publisher
    Decision Memo is the next slice.
  - No GitHub API calls added. No new GitHub write
    surface.
  - No version bump. No npm publish.

  **Stop conditions honoured:** no safety fact is
  claimed without a test pin; the memo does not
  claim beta readiness for any surface that lacks
  test coverage; GitHub status is described as a
  downstream surface, not canonical truth.

- Shipped verification runner **GitHub Check
  publisher opt-in workflow template** (P1.1
  github-check-publisher-opt-in-workflow-template
  slice). **Step 6d** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md)
  and the
  [GitHub Check publisher decision memo](docs/strategy/verification-runner-github-check-publisher-decision.md).
  **Workflow template + validator profile + tests +
  docs batch.** No active workflow added to the
  Rekon repo. No change to the
  `publishGitHubCheckRun` helper or the
  `rekon publish github-check --dry-run|--send` CLI.

  **New workflow template:**
  - [`docs/examples/workflows/rekon-verification-check-send.yml`](docs/examples/workflows/rekon-verification-check-send.yml).
    The first Rekon workflow template that opts into
    a GitHub write surface. Triggers on
    `workflow_dispatch` + `push` to `main` only (no
    `pull_request` by default; no
    `pull_request_target` ever). Permissions:
    `contents: read` + `checks: write` only. Sets
    `REKON_GITHUB_CHECKS: "1"` and
    `REKON_GITHUB_CHECKS_WRITE_CONFIRMED: "1"` at the
    workflow level. Runs the full execute proof loop,
    a `publish github-check --dry-run` preview, then
    `publish github-check --send --confirm-checks-write`.
    Uploads `.rekon/artifacts/**` excluding `.log`,
    `retention-days: 7`. Job summary includes
    `Mode: check-send`, every refresh-loop ref, the
    GitHub Check send outcome, and the
    canonical-truth reminder.

  **Validator profile support:**
  - New flag: `rekon verify github-workflow validate
    --path <workflow.yml> --profile read-only |
    github-check-send [--root <path>] [--json]`.
    Default profile is `read-only` (backward
    compatible).
  - The `read-only` profile preserves the existing
    contract: any GitHub write scope (including
    `checks: write`) is rejected. The bundled
    read-only templates still validate clean under
    `--profile read-only`.
  - The `github-check-send` profile permits `checks:
    write`, requires `permissions: contents: read +
    checks: write`,
    `REKON_GITHUB_CHECKS: "1"`,
    `REKON_GITHUB_CHECKS_WRITE_CONFIRMED: "1"`, a
    `publish github-check --dry-run` step, a
    `publish github-check --send` step, and the
    `--confirm-checks-write` flag. Rejects every
    other write scope (`pull-requests: write`,
    `contents: write`, `id-token: write`,
    `actions: write`, `deployments: write`,
    `statuses: write`, `packages: write`),
    `pull_request_target`, and the `pull_request`
    trigger.
  - New issue codes (additive):
    `missing-checks-write`,
    `missing-rekon-github-checks-opt-in`,
    `missing-write-confirmation`,
    `missing-publish-github-check-dry-run`,
    `missing-publish-github-check-send`,
    `missing-confirm-checks-write-flag`,
    `pull-request-trigger-disallowed`.
  - New `mode` value: `check-send`.
  - `summary` gains: `profile`, `hasChecksWrite`,
    `hasPullRequestTrigger`,
    `hasRekonGitHubChecksOptIn`,
    `hasWriteConfirmation`,
    `hasPublishGitHubCheckDryRun`,
    `hasPublishGitHubCheckSend`,
    `hasConfirmChecksWriteFlag`.

  **Operator guide:**
  [`docs/examples/github-actions-verification-runner.md`](docs/examples/github-actions-verification-runner.md)
  gains a new "Optional: publish a GitHub Check"
  section that instructs operators to adopt one of
  the read-only templates first, then copy the opt-in
  template and run the validator with
  `--profile github-check-send`. The section
  enumerates the required env, the `--confirm-checks-write`
  flag, and reiterates that GitHub status remains a
  downstream surface.

  **Tests:**
  - 16 new helper tests + 3 new CLI tests in
    `tests/contract/github-workflow-safety-validator.test.mjs`
    (42 total). Cover the read-only / send profile
    happy paths, every new issue code, and the
    `--profile` flag.
  - 21 new docs assertions in
    `tests/docs/github-check-publisher-opt-in-workflow-template.test.mjs`.
  - Full suite expected ≥ 1330 passed / 1 skipped.

  **Out-of-scope and explicitly not shipped:**
  - No active `.github/workflows/*.yml` in the Rekon
    repo. A docs assertion enforces the absence.
  - No change to the
    `publishGitHubCheckRun` helper or the
    `rekon publish github-check --dry-run|--send`
    CLI behaviour.
  - No PR comment publisher. Step 7.
  - No `pull_request` same-repo guard (a future
    slice may add `REKON_GITHUB_CHECKS_PR_IS_FORK`
    wiring at the workflow level).
  - No artifact-shape change. No new capability
    package. No version bump. No npm publish.

  **Stop conditions honoured:** the opt-in template
  never uses `pull_request_target`; `checks: write`
  never leaks into the read-only templates; the
  validator distinguishes `read-only` vs
  `github-check-send` profiles cleanly; GitHub
  status is described as a downstream surface, not
  canonical truth.

- Shipped verification runner **GitHub Check
  publisher send mode** (P1.1
  github-check-publisher-send slice).
  **Step 6c** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md)
  and the API implementation pin in
  [`docs/strategy/verification-runner-github-check-publisher-decision.md`](docs/strategy/verification-runner-github-check-publisher-decision.md).
  **CLI + helper + tests + docs batch.**
  Adds the first GitHub-write surface in
  Rekon, default-deny gated. No active
  workflow in the Rekon repo. No GitHub
  write permissions added to any bundled
  template.

  **New helper in `@rekon/capability-docs`:**
  - `publishGitHubCheckRun(input)` —
    POSTs to `/repos/{owner}/{repo}/check-runs`
    via Node's built-in `fetch` (no
    third-party network client). Sets
    `Authorization: Bearer <token>`,
    `Accept: application/vnd.github+json`,
    `X-GitHub-Api-Version: 2022-11-28`,
    `User-Agent: rekon-verification-runner`,
    and `Connection: close`. Maps the
    camelCase payload to GitHub's
    snake_case body
    (`headSha`→`head_sha`,
    `externalId`→`external_id`,
    `output.text` preserved). Returns
    `{ id, url, htmlUrl, status,
    conclusion }`. Throws
    `GitHubCheckPublishError` (with
    `status`, `message`, `documentationUrl`)
    on non-2xx; **never** echoes the token
    in any error message.
  - New exports:
    `GITHUB_CHECK_PUBLISHER_DEFAULT_API_BASE_URL`,
    `GITHUB_CHECK_PUBLISHER_DEFAULT_API_VERSION`,
    `GITHUB_CHECK_PUBLISHER_USER_AGENT`,
    `GitHubCheckPublishInput`,
    `GitHubCheckPublishResult`,
    `GitHubCheckPublishError`.

  **New CLI mode:**
  - `rekon publish github-check --send
    [--root <path>] [--confirm-checks-write]
    [--api-base-url <url>] [--json]`. The
    only CLI branch that reads
    `process.env.GITHUB_TOKEN`. Mutually
    exclusive with `--dry-run`; passing
    both is exit 1; passing neither is
    exit 1.
  - Reads env: `GITHUB_TOKEN`,
    `GITHUB_REPOSITORY`, `GITHUB_SHA`,
    `REKON_GITHUB_CHECKS`,
    `REKON_GITHUB_CHECKS_WRITE_CONFIRMED`,
    `GITHUB_EVENT_NAME`,
    `GITHUB_HEAD_SHA`,
    `GITHUB_SERVER_URL`, `GITHUB_RUN_ID`,
    `GITHUB_RUN_ATTEMPT`,
    `REKON_GITHUB_CHECKS_PR_IS_FORK`.
  - Write-permission confirmation via
    `--confirm-checks-write` OR
    `REKON_GITHUB_CHECKS_WRITE_CONFIRMED=1`.
  - Refuses unless
    `assessGitHubCheckPublisherReadiness`
    returns `ready: true`. Forked PRs are
    denied by default
    (`REKON_GITHUB_CHECKS_PR_IS_FORK` must
    be set to `0` to declare a same-repo
    PR); `pull_request_target` is denied
    unconditionally.
  - On readiness false: exit 1, prints
    `{ kind: "rekon.github-check.send",
    sent: false, reason: "readiness-failed",
    payload, readiness, github: undefined,
    canonicalTruthReminder }`.
  - On API success: exit 0, prints
    `{ kind: "rekon.github-check.send",
    sent: true, payload, readiness, github,
    canonicalTruthReminder }`. Exit code is
    decoupled from the Check
    conclusion — a `failure` /
    `timed_out` / `action_required`
    conclusion still exits 0 because the
    CLI operation succeeded.
  - On API error: exit 1, prints
    `{ sent: false, reason: "api-error",
    error: { status, message,
    documentationUrl? } }`. Token never
    appears in stdout/stderr.

  **Safety contract:**
  - Token reads are confined to the
    `--send` branch. Behavioural tests
    confirm that running `--dry-run` with
    `GITHUB_TOKEN=<sentinel>` set in env
    does not surface the sentinel
    anywhere in output.
  - Network calls happen only in
    `publishGitHubCheckRun`, only when
    readiness is green. Behavioural tests
    confirm that `--dry-run` makes no
    network call even with a reachable
    transport.
  - Forked PRs are denied by default;
    `pull_request_target` is denied
    unconditionally. The CLI does not
    expose the `forkOverride` escape on
    the readiness assessor.
  - Default bundled workflow templates are
    unchanged: they still declare only
    `permissions: contents: read` and do
    not call `publish github-check
    --send`.

  **Tests:**
  - New contract suite
    `tests/contract/github-check-publisher-send-cli.test.mjs`
    (19 tests). Uses a local `node:http`
    fake server + `--api-base-url` to
    redirect the CLI's request without
    contacting real GitHub. Tests use
    async `spawn` (not `spawnSync`) so the
    fake server's event loop keeps
    ticking while the CLI runs.
  - Updated
    `tests/contract/github-check-publisher-dry-run-cli.test.mjs`
    — the previous source-scan for
    `GITHUB_TOKEN` and network-client
    imports in the CLI is replaced with
    behavioural tests proving dry-run
    reads no token and makes no network
    call.
  - New docs suite
    `tests/docs/github-check-publisher-send.test.mjs`
    (10 assertions). Pins memo / operator
    guide language, env var requirements,
    fork-safety / pull-request-target
    rejection, canonical-truth language,
    CHANGELOG mention, review-packet
    PURPOSE PRESERVATION CHECK.

  **Out-of-scope and explicitly not
  shipped:**
  - No `.github/workflows/*.yml` added to
    the Rekon repo.
  - No PR comment publisher. Step 7.
  - No `forkOverride` exposure on the
    CLI.
  - No retry / backoff logic on API
    errors.
  - No Rekon-artifact write (the
    `VerificationResult` / `VerificationRun`
    / Publications are not modified).
  - No version bump. No npm publish.

  **Stop conditions honoured:** the CLI
  never sends without explicit opt-in
  (env + confirm flag both required); the
  token never appears in error output;
  the dry-run branch reads no token and
  calls no network; GitHub status is
  described as a downstream surface, not
  canonical truth.

- Shipped verification runner **GitHub Check
  publisher dry-run CLI** (P1.1
  github-check-publisher-dry-run-cli slice).
  **Step 6b** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md).
  **CLI + tests + docs batch.** No GitHub
  API calls. No active workflow in
  `.github/workflows`. No new GitHub write
  permissions in any bundled template. No
  artifact-shape change. No new capability
  package.

  **New CLI command:**
  - `rekon publish github-check --dry-run
    [--root <path>] [--json]`. Registered
    alongside the existing
    `publish architecture` / `publish proof`
    / `publish agent-contract` commands in
    `packages/cli/src/index.ts`. Reads the
    latest local `VerificationResult`,
    `VerificationRun`, `VerificationPlan`,
    and the latest `Publication` of each
    kind (`proof-report`,
    `architecture-summary`,
    `agent-contract`) by walking entries
    newest-first and matching `body.kind`.
    Runs `artifacts validate` (read-only)
    so the payload reflects current local
    index state. Calls the shared helpers
    `buildGitHubCheckPayload` +
    `assessGitHubCheckPublisherReadiness`
    from `@rekon/capability-docs` — the CLI
    does **not** duplicate the conclusion-
    mapping precedence ladder. Prints
    `{ kind: "rekon.github-check.dry-run",
    dryRun: true, payload, readiness,
    canonicalTruthReminder }` as JSON when
    `--json` is supplied.

  **Safety contract:**
  - **`--dry-run` is required.** The CLI
    refuses to run without it (exit 1).
    The actual GitHub API write lives in
    step 6c.
  - **No GitHub API call.** The CLI imports
    no HTTP client and no GitHub SDK. A
    contract test scans the CLI source for
    forbidden imports (`@octokit/*`,
    `@actions/github`, `octokit`,
    `node-fetch`, `axios`, `undici`, `got`)
    and call-sites (`fetch(`,
    `https.request`, `http.request`,
    `new Request(`) and fails the build if
    any are present.
  - **No token reads.** The CLI does not
    read `GITHUB_TOKEN` / `GH_TOKEN` from
    `process.env`. The readiness assessor
    receives an explicitly empty env map,
    so readiness `ready: false` is the
    expected default until operators wire
    the step-6c CLI with explicit env.
  - **The CLI delegates conclusion
    mapping.** A contract test scans the
    CLI source for `pickConclusion` and
    counts GitHub Check conclusion string
    literals (`"success"`, `"failure"`,
    `"neutral"`, `"timed_out"`,
    `"action_required"`); finding four or
    more would imply a duplicate mapping
    and fails the test.
  - **Readiness `ready: false` is exit 0.**
    A render success doesn't imply a
    publish-ready environment; the payload
    + issue list lets operators see which
    gates remain.
  - **Missing / malformed local artifacts
    is exit 1.** The CLI surfaces an
    explicit error message including the
    artifact id when read fails.

  **Tests:** new contract suite
  `tests/contract/github-check-publisher-dry-run-cli.test.mjs`
  (9 tests covering `--dry-run` requirement,
  JSON shape, readiness-false-is-exit-0,
  payload cites publications produced by
  `refresh` + explicit publish, CLI
  delegates conclusion mapping, no token
  reads, no network-client imports,
  read-only / index unchanged, usage line
  registered). Full suite expected ≥ 1265
  passed / 1 skipped.

  **Out-of-scope and explicitly not
  shipped:**
  - No GitHub API call. Step 6c.
  - No PR comment publisher. Step 7.
  - No `.github/workflows/*.yml` added to
    the Rekon repo.
  - No mutation of `verify run` /
    `artifacts latest` / `VerificationRun` /
    `VerificationResult` / any artifact.
  - No new capability package.
  - No version bump. No npm publish.

  **Stop conditions honoured:** the CLI
  never calls GitHub APIs; the CLI never
  imports a network client; the CLI never
  reads `GITHUB_TOKEN` or `GH_TOKEN`; the
  CLI never duplicates conclusion mapping;
  readiness false is not a CLI failure.

- Shipped verification runner **GitHub Check
  publisher — decision + gated skeleton**
  (P1.1 github-check-publisher-decision slice).
  **Step 6a** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md).
  **Decision memo + skeleton + tests + docs
  batch.** No GitHub API calls. No active
  workflow in `.github/workflows`. No new
  GitHub write permissions in any bundled
  template. No artifact-shape change. No new
  capability package.

  **Decision memo:** new at
  [`docs/strategy/verification-runner-github-check-publisher-decision.md`](docs/strategy/verification-runner-github-check-publisher-decision.md).
  Recommends **Option B** (split shipment:
  decision + skeleton now, dry-run CLI next,
  API call later). Eleven required headings:
  Decision Summary, Problem, Current GitHub
  Workflow State, Options Considered,
  Recommendation, Canonical Artifact Boundary,
  Permission Model, Fork And Secret Safety,
  Check Payload Model, What This Does Not Do,
  Implementation Sequence, Tests Required For
  Implementation.

  **New exports from `@rekon/capability-docs`:**
  - `buildGitHubCheckPayload(input)` — pure
    helper that builds the GitHub Check payload
    (`name`, `status: "completed"`,
    `conclusion`, `output.title`,
    `output.summary`, `externalId`,
    `citedRefs`) from artifact-like inputs.
    The summary always cites the underlying
    `VerificationResult`, `VerificationRun`,
    `VerificationPlan`, proof-report
    `Publication`, architecture-summary
    `Publication`, and agent-contract
    `Publication` ids (when each is present)
    and always includes the phrase
    `GitHub status is not canonical truth;
    Rekon artifacts remain canonical.`
  - `assessGitHubCheckPublisherReadiness(input)` —
    pure helper that returns
    `{ ready, issues[] }` after evaluating
    opt-in env vars (`REKON_GITHUB_CHECKS`,
    `GITHUB_TOKEN`, `GITHUB_REPOSITORY`, head
    SHA), event trust, and an explicit
    `writePermissionConfirmed` flag.
  - `GITHUB_CHECK_PUBLISHER_CANONICAL_TRUTH_REMINDER`
    + `GITHUB_CHECK_PUBLISHER_DEFAULT_NAME`
    constants.
  - Type aliases:
    `GitHubCheckPublisherConfig`,
    `GitHubCheckConclusion`,
    `GitHubCheckPayload`,
    `GitHubCheckPublisherReadinessIssueCode`,
    `GitHubCheckPublisherReadinessIssue`,
    `GitHubCheckPublisherReadiness`,
    `GitHubCheckEventTrust`,
    `GitHubCheckPublisherReadinessEvent`,
    `GitHubCheckPublisherReadinessInput`,
    `GitHubCheckPublisherFreshness`,
    `GitHubCheckPublisherProofStatus`,
    `GitHubCheckPublisherRunStatus`,
    `BuildGitHubCheckPayloadInput`.

  **Safety contract enforced:**
  - **No GitHub API call.** The skeleton
    imports no HTTP client, no GitHub SDK
    (`@octokit/*`, `node-fetch`, `got`,
    `axios`, `undici`), and does not call
    `fetch(`, `https.request`, or
    `http.request`. A contract test scans the
    capability-docs source for those tokens
    and fails the build if any are present.
  - **Default-deny readiness gate.** Returns
    `ready: false` unless every gate
    condition passes:
    `REKON_GITHUB_CHECKS=1` (or `true`),
    non-empty `GITHUB_TOKEN`, non-empty
    `GITHUB_REPOSITORY`, head SHA present,
    trusted event, explicit
    `writePermissionConfirmed: true`.
  - **Forked pull-request events untrusted
    by default.** `pull_request` events with
    `pullRequestIsFork: true` fail the gate;
    the `forkOverride: true` escape hatch
    exists but is not used in alpha / beta.
  - **`pull_request_target` refused
    unconditionally** — even with
    `forkOverride: true`. Matches the alpha
    workflow validator.
  - **Payload always cites canonical
    artifacts** and always carries the
    canonical-truth reminder.

  **Conclusion mapping** (precedence
  high-to-low):
  - `artifactsValid === false` → `failure`.
  - Run killed → `failure`.
  - Run timeout → `timed_out`.
  - Result failed → `failure`.
  - Result partial → `action_required`.
  - Result missing → `action_required`.
  - Stale / missing-plan freshness →
    `action_required`.
  - Result not-run → `neutral`.
  - Result passed + fresh → `success`.

  **Tests:** new contract suite
  `tests/contract/github-check-publisher-skeleton.test.mjs`
  (25 tests covering every conclusion case,
  summary content, every readiness issue
  code, and the read-only / network-free
  invariant). New docs suite
  `tests/docs/verification-runner-github-check-publisher-decision.test.mjs`
  (13 assertions covering memo existence,
  required headings, gate language, env var
  names, conclusion mapping mention,
  CHANGELOG mention, review-packet
  `PURPOSE PRESERVATION CHECK`).

  **Out-of-scope and explicitly not
  shipped:**
  - No GitHub API call. The skeleton is
    pure payload-building + readiness
    assessment.
  - No new CLI command. The dry-run CLI
    (`rekon publish github-check --dry-run
    --json`) ships in the next slice (step
    6b).
  - No `.github/workflows/*.yml` added to
    the Rekon repo.
  - No PR comment publisher. Step 7 of the
    sequence, still future.
  - No mutation of `verify run` /
    `artifacts latest` / `VerificationRun` /
    `VerificationResult` / any artifact.
  - No version bump. No npm publish.

  **Stop conditions honoured:** the skeleton
  never calls GitHub APIs; the skeleton never
  imports a network client; forked PRs are
  default-denied; the payload model treats
  GitHub status as a downstream surface, not
  canonical truth.

- Shipped verification runner **GitHub
  workflow validation helper** (P1.1
  github-workflow-safety-validator slice).
  **Step 5** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md).
  **CLI + docs + tests batch.** No
  artifact-shape change. No new capability
  package. No active workflow in
  `.github/workflows`. No GitHub API writes.

  **New CLI surface:**
  - `rekon verify github-workflow validate
    --path <workflow.yml> [--root <path>]
    [--json]`. Pure static text validator
    (no YAML parser dependency, no GitHub
    API calls, no spawn / exec, no
    filesystem writes). Helper
    `validateGitHubWorkflowSafety` is
    co-located in
    `packages/cli/src/index.ts`. Exits 0
    when the workflow is valid (warnings
    only); exits 1 when any error is
    reported. Human output renders a
    `GitHub workflow safety: valid|invalid`
    verdict, the resolved
    `Mode: <execute|dry-run|unknown>`, a
    Checks list with ✓/✗ marks, and (when
    invalid) an Issues list with severity,
    stable code, message, and recommended
    fix per issue. `--json` emits
    `{ valid, path, mode, issues[],
    summary }`.

  **Safety contract enforced (errors):**
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
  - Excludes `.log` files from upload.
  - Appends to `$GITHUB_STEP_SUMMARY`.
  - Mode resolvable to `execute` (`verify
    run --execute`) or `dry-run`
    (`--dry-run`); `unknown` is an error.

  **Soft checks (warnings only):**
  - Canonical-truth reminder present in
    the summary block ("GitHub status is
    not canonical truth").
  - `retention-days` declared on the
    upload step.

  **Read-only invariant:** the validator
  never spawns / executes / calls GitHub
  APIs and never mutates the workflow
  file. A contract test asserts the
  file's stat / mtime are unchanged
  after a run.

  **Quote-aware comment stripper:** the
  static parser tracks `'`, `"`, and
  `` ` `` modes so workflow templates that
  echo `#`-prefixed strings (e.g.
  `# Rekon Verification Summary`) into
  `$GITHUB_STEP_SUMMARY` validate
  cleanly. Without this, the naive
  `#`-strip would remove the
  `$GITHUB_STEP_SUMMARY` reference and
  spuriously flag the summary as
  missing.

  **Template comments:** both bundled
  templates
  ([`docs/examples/workflows/rekon-verification.yml`](docs/examples/workflows/rekon-verification.yml),
  [`docs/examples/workflows/rekon-verification-dry-run.yml`](docs/examples/workflows/rekon-verification-dry-run.yml))
  gain a top-of-file block instructing
  operators to run the validator after
  copying. Both pass with zero errors /
  zero warnings (`rekon-verification.yml`
  detects mode `execute`,
  `rekon-verification-dry-run.yml`
  detects mode `dry-run`).

  **Operator guide:**
  [`docs/examples/github-actions-verification-runner.md`](docs/examples/github-actions-verification-runner.md)
  gained a new "Validate a copied
  workflow" section before Adoption
  explaining the validator is static
  text analysis (no YAML parser, no
  GitHub API, no spawn / exec), what
  it checks, exit-code semantics, and
  what it does **not** check (semantic
  correctness, whether the workflow
  will pass in CI, whether secrets
  exist).

  **Tests:** new contract suite
  `tests/contract/github-workflow-safety-validator.test.mjs`
  (25 tests: both bundled templates;
  every error code; warning behaviour;
  read-only invariant; CLI exit codes
  for valid / invalid / missing path;
  human + JSON outputs). The
  hardening-v2 docs test
  `tests/docs/verification-runner-github-actions-hardening.test.mjs`
  gained 3 new assertions (operator
  guide mentions the validator command,
  both templates include the
  validate-command comment, CHANGELOG
  mentions the helper). Full suite:
  **1218 passed / 1 skipped**.

  **Out-of-scope and explicitly not
  shipped:**
  - No `.github/workflows/*.yml` in
    the Rekon repo (the validator
    targets copied templates in
    operator repos, not active Rekon
    CI).
  - No GitHub API calls. No GitHub
    Checks. No PR comments.
  - No GitHub write permissions
    requested.
  - No mutation of `verify run`, no
    mutation of `artifacts latest`, no
    mutation of `VerificationRun`, no
    mutation of `VerificationResult`,
    no mutation of any artifact.
  - No version bump. No npm publish.

  **Stop conditions honoured:** the
  helper never executes verification
  commands; the helper never calls
  GitHub APIs; both bundled templates
  pass without needing write
  permissions.

- Shipped verification runner **GitHub Actions
  workflow hardening v2** (P1.1
  verification-runner-github-actions-hardening-v2
  slice). **Step 4** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md).
  **Docs / examples / docs-test batch.** No code
  changes. No active workflow in
  `.github/workflows`. No GitHub API writes.

  **New artifacts:**
  - Dry-run workflow template at
    [`docs/examples/workflows/rekon-verification-dry-run.yml`](docs/examples/workflows/rekon-verification-dry-run.yml).
    Same safety contract as the execute variant
    (`permissions: contents: read`, no
    secrets, no `pull_request_target`, no
    GitHub API writes,
    `actions/upload-artifact` of
    `.rekon/artifacts/**` excluding `.log`,
    `retention-days: 7`) but runs
    `rekon verify run --dry-run` instead of
    `--execute`. Spawns **zero** plan commands.
    Intentionally omits
    `verify result from-run` because a
    dry-run is not proof.

  **Execute workflow hardened**
  ([`docs/examples/workflows/rekon-verification.yml`](docs/examples/workflows/rekon-verification.yml)):
  - Header comments now call out the
    EXECUTE variant relationship to the
    dry-run variant and recommend trial
    adoption via the dry-run template
    first.
  - Extended `rekon artifacts latest`
    lookups for `VerificationResult`,
    `Publication --kind
    architecture-summary`, and
    `Publication --kind agent-contract`
    so every refresh-loop publication
    ref is available to the job summary.
  - New `rekon artifacts validate` step
    captures the JSON `valid` field into
    a step output so the summary can
    render `Artifacts valid: true|false`.

  **Job summary** (both workflows):
  - Explicit `Mode: execute|dry-run`
    line.
  - Rows for `VerificationPlan`,
    `VerificationRun`,
    `VerificationResult`,
    proof report, architecture summary,
    and agent contract refs (or
    `missing` / `not produced` when
    absent).
  - `Artifacts valid: true|false` line.
  - Canonical-truth reminder.
  - Embedded `proof-report.md` body
    after a `---` divider.

  **Operator guide updates**
  ([`docs/examples/github-actions-verification-runner.md`](docs/examples/github-actions-verification-runner.md)):
  - New "Adoption — copy the dry-run
    template first" section near the
    top with a 6-step adoption path.
  - Troubleshooting section expanded
    to **10 items**, each carrying
    **Likely cause** /
    **Safe next step** / **Do not**:
    no `VerificationPlan` found,
    Verification command failed,
    Dry-run produced VerificationRun
    but no VerificationResult,
    `verify result from-run` refuses
    the run, Artifacts validate
    failed, Artifacts upload
    missing, Forked PR needs
    secrets, Workflow summary says
    proof is stale,
    `verify run --execute` fails
    immediately on every command,
    Job summary doesn't render the
    proof report, A reviewer reads
    the green badge and treats it as
    completion.
  - Cross-references updated to list
    both workflow templates.

  **Anchor statements pinned by
  tests:**
  - GitHub status is not canonical
    truth.
  - Rekon artifacts remain canonical.
  - Forked PRs must not receive
    secret-bearing execution by
    default.
  - Passing verification does not
    automatically resolve findings.

  **Tests:** **23 docs-only
  assertions** in
  `tests/docs/verification-runner-github-actions-hardening.test.mjs`
  pin: dry-run YAML existence; both
  workflows'
  `permissions: contents: read`; the
  `pull_request_target` prohibition
  in both; the absence of every
  write permission in both; the
  `--dry-run` / `--execute` split;
  both workflows' adoption of
  `rekon artifacts latest`; both
  workflows uploading
  `.rekon/artifacts` with `.log`
  excluded and `retention-days: 7`;
  both workflows writing to
  `$GITHUB_STEP_SUMMARY`; the
  adoption-first language in the
  operator guide; the three anchor
  statements; three troubleshooting
  items (no plan, failed command,
  forked-PR secrets); the
  CHANGELOG mention; and the
  review-packet `PURPOSE
  PRESERVATION CHECK`. Full suite:
  **1189 passed / 1 skipped**.

  **Docs:** 11 updated
  ([`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md)
  (step 4 flipped to ✅ Shipped),
  [`docs/concepts/verification-runs.md`](docs/concepts/verification-runs.md)
  — CI / GitHub Direction now
  mentions the dry-run variant,
  [`docs/examples/github-actions-verification-runner.md`](docs/examples/github-actions-verification-runner.md)
  — Adoption + Troubleshooting +
  cross-references,
  [`docs/examples/workflows/rekon-verification.yml`](docs/examples/workflows/rekon-verification.yml)
  — hardening + helper expansion,
  [`docs/examples/workflows/rekon-verification-dry-run.yml`](docs/examples/workflows/rekon-verification-dry-run.yml)
  — new,
  [`docs/strategy/classic-behavior-roadmap.md`](docs/strategy/classic-behavior-roadmap.md)
  — new shipped entry,
  [`docs/strategy/roadmap.md`](docs/strategy/roadmap.md)
  — new completed-slice entry,
  [`docs/strategy/issue-governance-architecture-decision.md`](docs/strategy/issue-governance-architecture-decision.md)
  — step 44 added (shipped), step 45
  added (workflow validation helper),
  subsequent steps renumbered).
  `README.md` updated with pointers
  to both templates. New review
  packet
  [`.rekon-dev/review-packets/verification-runner-github-actions-hardening-v2.md`](.rekon-dev/review-packets/verification-runner-github-actions-hardening-v2.md).

  **Next slice:** verification
  runner **GitHub workflow
  validation helper** — a read-only
  command or script that validates
  copied workflow templates against
  the required safety contract
  (no `pull_request_target`, no
  write permissions, no raw log
  upload, uses
  `rekon artifacts latest`,
  uploads `.rekon/artifacts`).
  Still no GitHub API writes.

  No code changes in this slice. No
  active workflow installed in
  `.github/workflows/`. No
  artifact-shape change. No new
  capability. No new CLI command.
  No `schemaVersion` bump. No
  `FindingStatusLedger` /
  `FindingLifecycleReport` /
  `CoherencyDelta` /
  `ReconciliationPlan` mutation. No
  version bump. No npm publish.
- Shipped verification runner **latest-artifact
  CLI helper** (P1.1
  artifacts-latest-cli-helper slice). **Step 3**
  of the CI / GitHub adapter implementation
  sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md).
  Adds a read-only CLI helper and updates the
  GitHub Actions workflow template to use it
  instead of inline Node snippets.

  **CLI:** new
  `rekon artifacts latest --type
  <ArtifactType> [--kind <kind>] [--id-only]
  [--allow-missing] [--root <path>] [--json]`.
  Walks the local artifact index sorted by
  `writtenAt` desc (the canonical "latest"
  ordering used by the existing
  `resolveVerificationPlanEntry` helper).
  Read-only — never refreshes, executes,
  publishes, or validates by itself.

  **Flags:**
  - `--type <ArtifactType>` (required).
  - `--kind <kind>` — Publication-only;
    walks entries newest-first and reads
    Publication bodies until a match on
    `body.kind` is found. Fails clearly if
    used with a non-Publication type.
  - `--id-only` — emits a typed
    `<type>:<id>` ref to stdout (no JSON),
    shell-friendly for `$GITHUB_OUTPUT`
    capture.
  - `--allow-missing` — returns
    `artifact: null` with exit 0 instead of
    exit 1.

  **Output shape (JSON):**
  - Found:
    `{ "artifact": { "type", "id", "path",
    "schemaVersion" } [, "kind"] }`.
  - Missing (with `--allow-missing`):
    `{ "artifact": null, "message" [,
    "kind"] }` and exit 0.
  - Missing (default): same payload with
    exit 1.
  - Missing with `--id-only`: error message
    on stderr, empty stdout, exit 1 unless
    `--allow-missing`.

  **GitHub Actions workflow template updated**
  ([`docs/examples/workflows/rekon-verification.yml`](docs/examples/workflows/rekon-verification.yml)):
  - Inline `node - <<'NODE'` snippets for
    resolving the latest `VerificationPlan`,
    `VerificationRun`, and proof-report
    `Publication` ids are replaced with
    one-line `rekon artifacts latest
    --id-only --allow-missing` calls.
  - Job summary now also cites the
    proof-report `Publication` ref
    alongside the run and plan refs.
  - Workflow contract unchanged:
    `permissions: contents: read`, no
    secrets, no `pull_request_target`, no
    GitHub API writes,
    `actions/upload-artifact` upload of
    `.rekon/artifacts/**` (excluding
    `*.log`) with `retention-days: 7`.

  **Tests:** **12 contract tests** in
  `tests/contract/artifacts-latest-cli.test.mjs`
  pin: latest-by-type, missing → null +
  exit 1, `--allow-missing` exit 0,
  `--id-only` typed ref + no JSON,
  Publication `--kind` filter,
  non-Publication `--kind` rejection,
  body-kind reading (not id prefix),
  older-artifact ignored, **read-only
  invariant** (artifact index unchanged
  before/after), `artifacts validate`
  clean, missing-`--type` rejection,
  `--id-only` missing case. **9 docs-only
  assertions** in
  `tests/docs/verification-runner-github-actions-template-latest-helper.test.mjs`
  pin the workflow template's adoption of
  the helper, the absence of inline
  `node - <<'NODE'` snippets, the
  operator-guide mention + read-only
  description, the CHANGELOG mention, and
  the review-packet `PURPOSE PRESERVATION
  CHECK`. Full suite: **1166 passed / 1
  skipped**.

  **Docs:** 11 updated
  ([`docs/examples/github-actions-verification-runner.md`](docs/examples/github-actions-verification-runner.md)
  — Customizing the VerificationPlan lookup
  section rewritten around the helper,
  [`docs/examples/workflows/rekon-verification.yml`](docs/examples/workflows/rekon-verification.yml)
  — inline Node snippets replaced with
  helper calls,
  [`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md)
  — step 3 flipped to ✅ Shipped,
  [`docs/concepts/verification-runs.md`](docs/concepts/verification-runs.md)
  — CI / GitHub Direction subsection
  mentions the helper,
  [`docs/strategy/classic-behavior-roadmap.md`](docs/strategy/classic-behavior-roadmap.md)
  — new shipped entry,
  [`docs/strategy/roadmap.md`](docs/strategy/roadmap.md)
  — new completed-slice entry,
  [`docs/strategy/issue-governance-architecture-decision.md`](docs/strategy/issue-governance-architecture-decision.md)
  — step 43 flipped to ✅ Shipped).
  `README.md` updated with the new CLI
  example. New review packet
  [`.rekon-dev/review-packets/artifacts-latest-cli-helper.md`](.rekon-dev/review-packets/artifacts-latest-cli-helper.md).

  **Next slice:** **verification runner
  GitHub Actions workflow hardening v2**
  — optional dry-run workflow variant,
  troubleshooting section, and
  proof-summary job-summary improvements
  using the latest-artifact helper. Still
  no GitHub API writes.

  No execution change. No artifact-shape
  change. No new artifact type. No new
  capability. No `schemaVersion` bump. No
  `FindingStatusLedger` /
  `FindingLifecycleReport` /
  `CoherencyDelta` / `ReconciliationPlan`
  mutation. No `.github/workflows/`
  installation in this repo. No version
  bump. No npm publish.
- Shipped verification runner **GitHub Actions
  workflow template** (P1.1
  verification-runner-github-actions-template
  slice). **Step 2** of the CI / GitHub adapter
  implementation sequence pinned by
  [`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md).
  **Docs-only batch. No code changes. No active
  workflow in `.github/workflows`** — the
  template lives at
  [`docs/examples/workflows/rekon-verification.yml`](docs/examples/workflows/rekon-verification.yml)
  and is copied into operator repos to enable.

  **Shipped artifacts:**
  - Copyable workflow YAML at
    [`docs/examples/workflows/rekon-verification.yml`](docs/examples/workflows/rekon-verification.yml).
  - 10-section operator guide at
    [`docs/examples/github-actions-verification-runner.md`](docs/examples/github-actions-verification-runner.md)
    covering what the template does / does
    not do, the permission model, fork /
    secret safety, artifact upload policy,
    job summary behavior, plan-lookup
    customization, execute-vs-dry-run swap,
    why GitHub status is not canonical
    truth, and troubleshooting.

  **Template contract (pinned by 23
  docs-only assertions):**
  - `permissions: contents: read` only. No
    `pull-requests: write`,
    `checks: write`, `contents: write`, or
    `id-token: write`.
  - Triggers: `pull_request` and
    `workflow_dispatch`. **No
    `pull_request_target`.**
  - No secrets declared.
  - Steps: checkout → setup-node@v4 (Node
    20 + npm cache) → `npm ci` →
    `npm run build` → `rekon refresh` →
    resolve latest `VerificationPlan` id
    via inline Node helper (template
    helper; future CLI helper may
    replace) → `rekon verify run
    --execute` → resolve `VerificationRun`
    id from the execute JSON output →
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

  **Anchor statements pinned by tests:**
  - `GitHub status is not canonical
    truth.`
  - `Rekon artifacts remain canonical.`
  - `Forked PRs must not receive
    secret-bearing execution by default.`
  - `Passing verification does not
    automatically resolve findings.`

  **Tests:** **23 docs-only assertions** in
  `tests/docs/verification-runner-github-actions-template.test.mjs`
  pin both files' existence; the permission
  contract; the `pull_request_target`
  prohibition; the absence of every write
  permission (`pull-requests`, `checks`,
  `contents`, `id-token`); every CLI step
  the template runs (`refresh`,
  `verify run`, `verify result from-run`,
  `publish proof`, `artifacts validate`);
  the upload path inclusion / `.log`
  exclusion / `retention-days: 7`; the
  four anchor statements; the CHANGELOG
  mention; and the review-packet
  `PURPOSE PRESERVATION CHECK`. Full
  suite: **1145 passed / 1 skipped**.

  **Docs:** 9 updated
  ([`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md)
  (step 2 flipped to ✅ Shipped),
  [`docs/concepts/verification-runs.md`](docs/concepts/verification-runs.md)
  (CI / GitHub direction now points at the
  shipped template),
  [`docs/concepts/verification-results.md`](docs/concepts/verification-results.md),
  [`docs/concepts/proof-report-publication.md`](docs/concepts/proof-report-publication.md),
  [`docs/artifacts/proof-report-publication.md`](docs/artifacts/proof-report-publication.md),
  [`docs/strategy/classic-behavior-roadmap.md`](docs/strategy/classic-behavior-roadmap.md)
  (new shipped entry),
  [`docs/strategy/roadmap.md`](docs/strategy/roadmap.md)
  (new completed-slice entry),
  [`docs/strategy/issue-governance-architecture-decision.md`](docs/strategy/issue-governance-architecture-decision.md)
  (step 42 flipped to ✅ Shipped; step 43
  added for latest-artifact CLI helpers;
  subsequent steps renumbered)).
  `README.md` updated with pointers to the
  shipped files. New review packet
  [`.rekon-dev/review-packets/verification-runner-github-actions-template.md`](.rekon-dev/review-packets/verification-runner-github-actions-template.md).

  **Next slice:** **verification runner
  latest-artifact CLI helpers** —
  `rekon artifacts latest --type <type>
  --json` read-only helpers that replace
  the workflow template's inline Node
  snippets with one-line CLI calls. No
  execution change.

  No code changes in this slice. No active
  workflow installed in this repo. No
  artifact-shape change. No new capability.
  No new CLI command. No `schemaVersion`
  bump. No `FindingStatusLedger` /
  `FindingLifecycleReport` /
  `CoherencyDelta` / `ReconciliationPlan`
  mutation. No version bump. No npm
  publish.
- Shipped verification runner CI / GitHub
  adapter **decision memo** (P1.1
  verification-runner-ci-github-decision
  slice). **Step 8** of the runner v1
  implementation sequence pinned by
  [`docs/strategy/verification-runner-v1-decision.md`](docs/strategy/verification-runner-v1-decision.md).
  **Strategy-only batch — no runtime
  change.** The memo
  ([`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md))
  decides whether Rekon's verification
  runner should remain local-only for alpha
  or gain a GitHub Actions / PR-check
  surface, and pins the safety contract any
  future CI surface must respect.

  **Decision: Option D — local-first runner
  plus a documented GitHub Actions workflow
  template for alpha; first-party GitHub
  Check / PR comment publisher deferred to
  beta.**

  **Anchor invariants** (apply regardless of
  which slice ships next):
  - **GitHub status is not canonical
    truth.** Rekon's `VerificationRun`,
    `VerificationResult`, and `Publication`
    artifacts remain canonical; any future
    Check / PR / dashboard output is a
    downstream projection, never an
    independent source of truth.
  - **Forked PRs must not receive
    secret-bearing execution by default.**
    The alpha workflow template uses
    `permissions: contents: read`, no
    secrets, and the standard
    `pull_request` trigger.
    `pull_request_target` is forbidden.

  **Alpha workflow contract** (memo
  pins the shape; YAML lands in the next
  slice):
  - `permissions: contents: read` at the
    workflow level. No
    `pull-requests: write` /
    `checks: write` / `contents: write` /
    `id-token`. No secrets. No
    `pull_request_target`.
  - Steps: `refresh` → resolve latest plan
    id → `verify run --execute` →
    `verify result from-run` →
    `publish proof` / `architecture` /
    `agent-contract` →
    `artifacts validate` → upload
    `.rekon/artifacts` (excluding `.log`
    files) with `retention-days: 7`
    default → append proof-report markdown
    to `$GITHUB_STEP_SUMMARY`.
  - No GitHub API writes anywhere in the
    template.

  **Artifact upload contract:** upload
  `.rekon/artifacts` (canonical proof
  record); exclude `.log` files
  explicitly; recommended
  `retention-days: 7` (operators may raise
  to GitHub's max of 90).

  **Job summary contract:** GitHub's
  built-in `$GITHUB_STEP_SUMMARY` file
  carries the existing proof-report
  publication markdown. No API permissions
  required.

  **Implementation sequence:**
  1. **(this slice)** Decision memo +
     supporting doc updates.
  2. **GitHub Actions workflow template**
     (alpha, docs-only).
  3. **CLI ergonomics for CI (optional).**
     `rekon artifacts latest --type <type>`.
  4. **Job-summary publisher (optional).**
  5. **GitHub Check publisher (beta).**
     Requires `checks: write`, per-repo
     opt-in, and a separate fork-safety
     decision memo.
  6. **PR comment publisher (beta+).**
     Requires `pull-requests: write`.
  7. **Cross-CI documentation (beta+).**
     GitLab CI / Jenkins / CircleCI /
     etc.

  **Tests:** **16 docs-only assertions** in
  `tests/docs/verification-runner-ci-github-decision.test.mjs`
  pin the memo's required headings,
  recommendation, anchor invariants,
  workflow contract
  (`permissions: contents: read`;
  `.rekon/artifacts` upload; no raw logs;
  job summary), implementation sequence
  presence, CHANGELOG mention, and
  review-packet `PURPOSE PRESERVATION
  CHECK`. Full suite: **1122 passed / 1
  skipped**.

  **Docs:** 9 updated
  ([`docs/concepts/verification-runs.md`](docs/concepts/verification-runs.md),
  [`docs/concepts/verification-results.md`](docs/concepts/verification-results.md),
  [`docs/concepts/proof-report-publication.md`](docs/concepts/proof-report-publication.md),
  [`docs/artifacts/proof-report-publication.md`](docs/artifacts/proof-report-publication.md),
  [`docs/strategy/verification-runner-v1-decision.md`](docs/strategy/verification-runner-v1-decision.md)
  (step 8 flipped to ✅ Shipped),
  [`docs/strategy/classic-behavior-roadmap.md`](docs/strategy/classic-behavior-roadmap.md)
  (new shipped entry),
  [`docs/strategy/roadmap.md`](docs/strategy/roadmap.md)
  (new completed-slice entry),
  [`docs/strategy/issue-governance-architecture-decision.md`](docs/strategy/issue-governance-architecture-decision.md)
  (step 41 flipped to shipped; step 42
  added for workflow-template
  implementation slice; subsequent steps
  renumbered)). New strategy doc
  [`docs/strategy/verification-runner-ci-github-decision.md`](docs/strategy/verification-runner-ci-github-decision.md).
  New review packet
  [`.rekon-dev/review-packets/verification-runner-ci-github-decision.md`](.rekon-dev/review-packets/verification-runner-ci-github-decision.md).
  `README.md` updated.

  **Next slice:** **verification runner
  GitHub Actions workflow template**
  (alpha implementation, docs-only).
  Adds the copyable workflow YAML +
  operator documentation under
  `examples/` or `docs/examples/`. Still
  no GitHub API writes; still no new
  capability or CLI command.

  No code changes in this slice. No
  artifact-shape change. No new
  capability. No new CLI command. No
  `schemaVersion` bump. No
  `FindingStatusLedger` /
  `FindingLifecycleReport` /
  `CoherencyDelta` /
  `ReconciliationPlan` mutation. No
  version bump. No npm publish.
- Shipped verification proof surfaces v2 (P1.1
  verification-proof-surfaces-v2 slice).
  **Step 7** of the runner v1 implementation
  sequence pinned by
  [`docs/strategy/verification-runner-v1-decision.md`](docs/strategy/verification-runner-v1-decision.md).
  **Publication-only batch. No command
  execution. No artifact-shape changes** (only
  additive optional fields on
  `VerificationEvidenceSummary`).

  **Shared helper:** new
  `summarizeVerificationProofSurface(input)`
  pure function in `@rekon/capability-intent`.
  Classifies a `VerificationResult` as:
  - **Source:** `manual` /
    `runner-derived` / `unknown`. Detection
    looks for a `VerificationRun` ref in
    `header.inputRefs` first, then a known
    runner identity pattern in `recordedBy`
    (`rekon.local.exec@<version>`).
  - **Freshness:** `fresh` /
    `stale` / `missing-plan` / `unknown`
    against the latest indexed
    `VerificationPlan`.
  - **Warnings:** machine-readable codes
    `proof-failed`, `proof-partial`,
    `proof-not-run`, `proof-stale`,
    `proof-missing-plan`,
    `proof-source-unknown`,
    `runner-run-missing` with messages and
    recommended commands.

  **Proof report:**
  - New `## Verification Proof Summary`
    section after Proof Status. Table of
    `VerificationResult` / `VerificationPlan` /
    `VerificationRun` / `WorkOrder` refs +
    `Source` / `Status` / `Freshness` /
    `Recorded by`. Failure callout for
    `failed` results. Stale callout with
    recommended
    `rekon verify run --plan <latest>
    --execute`. Passed-fresh callout
    reminding the reader that passing proof
    does not auto-resolve findings.
  - Per-command **Verification Results**
    table now includes stdout / stderr
    **digest prefixes** (first 12 hex chars)
    in a new `Digests` column. **Raw
    stdout / stderr excerpts are never
    rendered**.

  **Architecture summary:** new compact
  `## Verification Proof Status` block right
  after Verification Status. Shows
  `Status` / `Source` / `Freshness` and the
  result + run refs. Surfaces
  `> Verification is not complete or current.
  Do not mark governed issues resolved from
  this proof alone.` when the proof is
  incomplete or stale; surfaces
  `Verification passed. Passing proof does
  not automatically resolve findings.` when
  the proof is passed and fresh.

  **Agent contract:**
  - `## Proof And Verification State`
    surfaces `Proof source` and `Proof
    freshness` lines.
  - For incomplete proof
    (`failed` / `partial` / `not-run`),
    appends agent instructions:
    `Treat proof as incomplete. Do not claim
    completion. Re-run verification or ask
    the operator for proof.`
  - For stale / missing-plan proof, appends:
    `Do not rely on stale proof. Run or
    request verification for the latest
    plan.`
  - Renders
    `Runner-derived proof cites
    VerificationRun:<id>.` when applicable.
  - `## Do Not Do` adds two new entries:
    - `Do not treat passed verification as
      automatic finding resolution; status
      changes require explicit
      lifecycle/status artifacts.`
    - `Do not treat stale, partial, failed,
      timeout, killed, or not-run
      verification as proof of completion.`

  **`resolve.issue`:**
  `VerificationEvidenceSummary` gains
  optional `source`, `freshness`, and
  `verificationRunRef` fields.
  `lookupVerificationEvidence` populates
  them via the shared classifier.
  Verification trace message includes the
  proof source (e.g. `(source:
  runner-derived)`) and a freshness suffix
  (`; proof is stale relative to the latest
  VerificationPlan`) when applicable. No
  `IssuePacket` shape change.

  **What this batch does NOT do:**
  - No `VerificationResult` /
    `VerificationRun` shape change.
  - No mutation of `FindingStatusLedger`,
    `FindingLifecycleReport`,
    `CoherencyDelta`, or any reconciliation
    surface.
  - No rerun of commands.
  - No CI / GitHub adapter (next slice).
  - No `schemaVersion` bump.

  **Tests:** **22 new tests** in
  `tests/contract/verification-proof-surfaces-v2.test.mjs`
  cover helper classification (manual /
  runner-derived via inputRef / recordedBy,
  freshness mapping, all warning codes,
  missing-result defaults, runner identity
  pattern), publication rendering (proof
  report shows source + freshness + digest
  prefixes and never leaks raw stdout,
  failed callout, stale callout when a newer
  plan is generated, architecture summary
  renders the new block + warning callout,
  agent contract surfaces source + freshness
  + agent instructions + new Do Not Do
  entries), and no-mutation invariants
  (passing runner-derived proof does not
  mutate `FindingStatusLedger`,
  `FindingLifecycleReport`, or
  `ReconciliationPlan`; existing
  `verify record` / `--dry-run` /
  `--execute` paths still work;
  `artifacts validate` clean after the v2
  publication chain). Full suite: **1106
  passed / 1 skipped**.

  **Docs:** updated
  [`docs/concepts/verification-runs.md`](docs/concepts/verification-runs.md),
  [`docs/artifacts/verification-run.md`](docs/artifacts/verification-run.md),
  [`docs/concepts/verification-results.md`](docs/concepts/verification-results.md),
  [`docs/artifacts/verification-result.md`](docs/artifacts/verification-result.md),
  [`docs/concepts/proof-report-publication.md`](docs/concepts/proof-report-publication.md),
  [`docs/artifacts/proof-report-publication.md`](docs/artifacts/proof-report-publication.md),
  [`docs/concepts/architecture-summary-publication.md`](docs/concepts/architecture-summary-publication.md),
  [`docs/concepts/agent-operating-contract.md`](docs/concepts/agent-operating-contract.md),
  [`docs/artifacts/agent-contract-publication.md`](docs/artifacts/agent-contract-publication.md),
  [`docs/artifacts/resolver-packet.md`](docs/artifacts/resolver-packet.md),
  [`docs/concepts/resolvers.md`](docs/concepts/resolvers.md),
  [`docs/strategy/verification-runner-v1-decision.md`](docs/strategy/verification-runner-v1-decision.md)
  (step 7 flipped to ✅ Shipped),
  [`docs/strategy/classic-behavior-roadmap.md`](docs/strategy/classic-behavior-roadmap.md)
  (new shipped entry),
  [`docs/strategy/roadmap.md`](docs/strategy/roadmap.md)
  (new completed-slice entry),
  [`docs/strategy/issue-governance-architecture-decision.md`](docs/strategy/issue-governance-architecture-decision.md)
  (step 40 flipped to shipped; step 41 added
  for CI / GitHub adapter; subsequent steps
  renumbered). `README.md` updated. New
  review packet
  [`.rekon-dev/review-packets/verification-proof-surfaces-v2.md`](.rekon-dev/review-packets/verification-proof-surfaces-v2.md).

  **Next slice:** **verification runner CI /
  GitHub adapter decision memo** (step 8).
  Strategy-only batch.

  No `schemaVersion` bump on
  `VerificationRun` or `VerificationResult`.
  No retries. No sandboxing. No CI / GitHub
  integration in this slice. No source
  writes by the runner. No
  `FindingStatusLedger` /
  `FindingLifecycleReport` /
  `CoherencyDelta` / `ReconciliationPlan`
  mutation. No version bump. No npm
  publish.
- Shipped VerificationRun → VerificationResult
  derivation (P1.1
  verification-result-from-run slice). **Step
  6** of the runner v1 implementation
  sequence pinned by
  [`docs/strategy/verification-runner-v1-decision.md`](docs/strategy/verification-runner-v1-decision.md).
  **Derivation is pure** — no spawn, no
  source reads, no rerun of commands, no
  mutation of governance surfaces.

  **CLI:** new
  `rekon verify result from-run --run
  <id|type:id> [--allow-not-run] [--root
  <path>] [--json]`. Resolves a completed
  `VerificationRun`, refuses dry-run /
  not-run runs by default (a dry-run is not
  proof), and writes a concise
  `VerificationResult` proof-summary
  artifact citing the run, plan, and
  work-order. The implementation slice
  deliberately chose a dedicated command
  over a `--record-result` flag on
  `verify run` so the operator's intent
  (execute vs. derive) is visible in the
  command line.

  **Helper:** new
  `deriveVerificationResultFromRun(input,
  options)` in `@rekon/capability-verify`.
  Pure; never spawns a process. Command-
  status mapping:
  `passed → passed`;
  `failed → failed`;
  **`timeout → failed`**;
  **`killed → failed`**;
  `skipped → skipped`;
  `not-run → not-run`. The run keeps
  `timeout` / `killed` first-class as
  evidence; the result rolls them up into
  `failed`.

  **`VerificationResult` body carries:**
  per-command `stdoutDigest` /
  `stderrDigest` / `exitCode` /
  `durationMs` / `startedAt` /
  `completedAt`; explanatory `notes` for
  `timeout` / `killed` / `skipped` /
  `not-run` cases plus a `Source: ...`
  pointer back at the source run.

  **`VerificationResult` body does NOT
  carry:** `stdoutExcerpt` /
  `stderrExcerpt`. The result stays concise
  and grep-friendly; the run remains the
  place to inspect bounded log evidence.
  A contract test pins this with a
  sentinel marker ("zyxwv") that appears
  only in the spawned stdout, not in the
  command literal.

  **`header` shape:** `header.inputRefs`
  cites the `VerificationPlan` (always),
  the `WorkOrder` (when present), and the
  `VerificationRun` (always).
  `header.producer.id` =
  `"@rekon/capability-verify"`.
  `header.provenance.notes` flag the
  result as runner-derived.
  `recordedBy` =
  `"<run.runner.id>@<run.runner.version>"`
  (e.g. `"rekon.local.exec@0.1.0"`).

  **Refusal:** the helper throws
  `"VerificationRun status is not-run..."`
  when invoked on a dry-run; the CLI
  forwards this as a non-zero exit + a
  clear error message. `--allow-not-run`
  overrides for rare cases.

  **What derivation does NOT do:**
  - No spawn / no rerun of commands.
  - No mutation of
    `FindingStatusLedger`,
    `FindingLifecycleReport`,
    `CoherencyDelta`, or any
    reconciliation surface. A passing
    derived result does not auto-resolve
    findings (contract test pins this).
  - No `--record-result` flag on
    `verify run --execute` (deliberate;
    keeps the operator's intent
    explicit).
  - No `schemaVersion` bump on
    `VerificationResult`.

  **Tests:** **24 new tests** in
  `tests/contract/verification-result-from-run.test.mjs`
  cover helper status mapping
  (`passed` / `failed` / `timeout` /
  `killed` / mixed → `partial` / all
  `not-run` with `allowNotRun` →
  `not-run`), helper refusal of dry-run,
  input-ref citations, excerpt-omission +
  digest-preservation, `recordedBy`
  identity, and CLI behavior (writes for
  passed and failed runs, refuses
  dry-run runs, refuses without `--run`,
  cites plan + run, body never carries
  raw stdout, digests preserved, no
  `FindingStatusLedger` /
  `FindingLifecycleReport` /
  `ReconciliationPlan` mutation, proof
  report consumes derived result,
  existing `verify record` /
  `--dry-run` / `--execute` paths
  unchanged, `artifacts validate`
  clean). Full suite: **1084 passed / 1
  skipped**.

  **Docs:** updated
  [`docs/concepts/verification-runs.md`](docs/concepts/verification-runs.md)
  (new Derivation (Step 6, Shipped)
  section),
  [`docs/artifacts/verification-run.md`](docs/artifacts/verification-run.md)
  (rewrote Deriving VerificationResult),
  [`docs/strategy/verification-runner-v1-decision.md`](docs/strategy/verification-runner-v1-decision.md)
  (step 6 flipped to ✅ Shipped),
  [`docs/concepts/verification-results.md`](docs/concepts/verification-results.md),
  [`docs/artifacts/verification-result.md`](docs/artifacts/verification-result.md),
  [`docs/artifacts/verification-plan.md`](docs/artifacts/verification-plan.md),
  [`docs/concepts/proof-report-publication.md`](docs/concepts/proof-report-publication.md),
  [`docs/artifacts/proof-report-publication.md`](docs/artifacts/proof-report-publication.md),
  [`docs/strategy/classic-behavior-roadmap.md`](docs/strategy/classic-behavior-roadmap.md)
  (new shipped entry),
  [`docs/strategy/roadmap.md`](docs/strategy/roadmap.md)
  (new completed-slice entry),
  [`docs/strategy/issue-governance-architecture-decision.md`](docs/strategy/issue-governance-architecture-decision.md)
  (step 39 flipped to shipped; step 40
  added for proof surfaces v2; subsequent
  steps renumbered). `README.md` updated
  with the new CLI line. New review
  packet
  [`.rekon-dev/review-packets/verification-result-from-run.md`](.rekon-dev/review-packets/verification-result-from-run.md).

  **Next slice:** **verification proof
  surfaces v2** — make publications
  (architecture summary, agent contract,
  proof report) distinguish manual vs.
  runner-derived `VerificationResult`,
  call out `failed` / `timeout` /
  `killed` proof, and flag stale proof
  relative to the latest
  `VerificationPlan`. Still no
  auto-resolution or auto-apply.

  No `schemaVersion` bump. No retries. No
  sandboxing. No CI / GitHub integration.
  No source writes by the runner. No
  `FindingStatusLedger` /
  `FindingLifecycleReport` /
  `CoherencyDelta` /
  `ReconciliationPlan` mutation. No
  version bump. No npm publish.
- Shipped verification runner execution v1
  (P1.1 verification-run-execution-v1 slice).
  **Step 4** of the runner v1 implementation
  sequence pinned by
  [`docs/strategy/verification-runner-v1-decision.md`](docs/strategy/verification-runner-v1-decision.md).
  **First slice that actually spawns
  processes.**

  **CLI:**
  `rekon verify run --plan <id|type:id>
  --execute [--command-timeout-ms <n>]
  [--timeout-ms <n>] [--max-log-bytes <n>]
  [--root <path>] [--json]`. Resolves the
  named plan, reuses the dry-run validator,
  and (only if every command validates)
  spawns each command in plan order. Writes
  a `VerificationRun` artifact with
  execution detail. CLI exits non-zero when
  the overall status is `failed` /
  `timeout` / `killed`; the artifact is
  still written.

  **Safety boundary (every constraint also
  has a contract test):**
  - `spawn(argv[0], argv.slice(1))` with
    `shell: false`. Never a shell. The
    `--dry-run` and `--execute` flags are
    mutually exclusive.
  - Scrubbed env: only an allowlist
    (`PATH`, `HOME`, `USER`, `SHELL`,
    `TMPDIR`/`TEMP`/`TMP`, `NODE_ENV`,
    `NODE_OPTIONS`,
    `NPM_CONFIG_USERCONFIG`, `CI`, `LANG`,
    `LC_*`, Windows-critical
    `SystemRoot` / `ComSpec` / `PATHEXT` /
    `windir` / `USERPROFILE` / `APPDATA` /
    `LOCALAPPDATA`) is forwarded.
    Allowlist entries whose names match the
    secret guard
    (`TOKEN|SECRET|PASSWORD|KEY|AUTH|
    CREDENTIAL|COOKIE|SESSION|BEARER|PAT`,
    with word-component boundaries so
    `PATH` is NOT treated as containing
    `PAT`) are dropped.
  - Per-command timeout default **120 s**
    (override `--command-timeout-ms`);
    `SIGTERM` → **3 s grace** → `SIGKILL`.
  - Per-plan timeout default **600 s**
    (override `--timeout-ms`); caps each
    command's effective timeout to the
    remaining budget and marks unspawned
    commands `not-run`.
  - `stdoutDigest` / `stderrDigest` are
    sha256 over the **full pre-redaction
    streams**.
  - `stdoutExcerpt` / `stderrExcerpt` are
    **redacted then truncated** to
    `--max-log-bytes` (default 8 KB) with
    `redacted` / `truncated` /
    `originalBytes` / `storedBytes` flags.
  - Redaction patterns:
    `env-assignment-token-like`,
    `json-secret`, `bearer-token`,
    `basic-auth`. Pattern ids and match
    counts are recorded on the artifact's
    `redaction` block.
  - Status derivation:
    `failed > killed > timeout > partial >
    passed > not-run`.
  - Commands continue past failures (the
    full plan runs; every command's
    individual status is recorded).
  - **No `VerificationResult`
    derivation.** Deferred to the next
    slice (step 6).
  - **No `FindingStatusLedger` /
    `FindingLifecycleReport` /
    `CoherencyDelta` /
    `ReconciliationPlan` mutation.** A
    passing run does not auto-resolve
    findings or apply work-order
    reconciliation.
  - No retries; no sandboxing; no network
    policy enforcement; no CI / GitHub
    adapter; no source writes by the
    runner itself.

  **New helper exports
  (`@rekon/capability-verify`):**
  - `executeVerificationRun(input, options)`.
  - `redactVerificationRunStreamText(text)`.
  - `buildScrubbedEnvironment(env?)`.
  - Constants:
    `VERIFICATION_RUN_DEFAULT_COMMAND_TIMEOUT_MS`,
    `VERIFICATION_RUN_DEFAULT_PLAN_TIMEOUT_MS`,
    `VERIFICATION_RUN_DEFAULT_KILL_GRACE_MS`,
    `VERIFICATION_RUN_DEFAULT_MAX_LOG_BYTES`.
  - `VERIFICATION_RUN_ENV_ALLOWLIST`,
    `VERIFICATION_RUN_SECRET_KEY_PATTERN`.
  - `VERIFICATION_RUN_EXECUTION_RUNNER_ID =
    "rekon.local.exec"`.

  **Validator fix:** the command-string
  validator is now quote-aware. Previously
  the `>` / `<` shell-operator checks would
  reject an `=>` arrow inside a quoted
  argument like
  `node -e "setTimeout(() => {}, 60000)"`.
  The validator now walks the string with
  a quote-state machine and only flags
  shell metacharacters that appear outside
  any quoted region. Backwards-compatible
  for every command shape the dry-run slice
  already accepted.

  **Tests:** **25 new tests** in
  `tests/contract/verification-run-execution.test.mjs`
  cover helper behavior (passed / failed /
  timeout / plan-timeout / refusal-before-
  spawn / redaction / scrubbed env), CLI
  paths (writes artifact, exits non-zero
  on failed status with artifact still
  written, refuses `--dry-run + --execute`
  together, refuses unsafe commands before
  spawning, refuses env-assignment prefix,
  **sentinel-file** no-shell-leak
  assertion, legitimate node command CAN
  write files), and the no-side-effect
  invariants (dry-run still silent after
  execute ships, `verify record` unchanged,
  `FindingStatusLedger` and
  `FindingLifecycleReport` unmutated,
  `VerificationResult` not written,
  `artifacts validate` clean after passed
  / failed runs). The obsolete dry-run
  test asserting the not-implemented
  `--execute` message was retired. Full
  suite: **1060 passed / 1 skipped**.

  **Docs:** updated
  [`docs/concepts/verification-runs.md`](docs/concepts/verification-runs.md),
  [`docs/artifacts/verification-run.md`](docs/artifacts/verification-run.md)
  (new Execute Behavior section),
  [`docs/strategy/verification-runner-v1-decision.md`](docs/strategy/verification-runner-v1-decision.md)
  (step 4 flipped to ✅ Shipped),
  [`docs/concepts/verification-results.md`](docs/concepts/verification-results.md),
  [`docs/artifacts/verification-result.md`](docs/artifacts/verification-result.md),
  [`docs/artifacts/verification-plan.md`](docs/artifacts/verification-plan.md),
  [`docs/concepts/proof-report-publication.md`](docs/concepts/proof-report-publication.md),
  [`docs/artifacts/proof-report-publication.md`](docs/artifacts/proof-report-publication.md),
  [`docs/strategy/classic-behavior-roadmap.md`](docs/strategy/classic-behavior-roadmap.md)
  (new shipped entry),
  [`docs/strategy/roadmap.md`](docs/strategy/roadmap.md)
  (new completed-slice entry),
  [`docs/strategy/issue-governance-architecture-decision.md`](docs/strategy/issue-governance-architecture-decision.md)
  (step 38 flipped to shipped; step 39
  added for `VerificationResult`
  derivation). `README.md` updated with the
  new CLI line. New review packet
  [`.rekon-dev/review-packets/verification-run-execution-v1.md`](.rekon-dev/review-packets/verification-run-execution-v1.md).

  **Next slice:**
  **`VerificationRun` →
  `VerificationResult` derivation** (step
  6). Add either a `--record-result` flag
  on `rekon verify run --execute` or a
  dedicated
  `rekon verify result from-run --run <id>`
  command. Map `timeout` / `killed` to
  `failed` in the derived result.

  No `schemaVersion` bump. No retries. No
  sandboxing. No CI / GitHub integration.
  No source writes by the runner. No
  `VerificationResult` write. No
  `FindingStatusLedger` mutation. No
  reconciliation auto-apply. No version
  bump. No npm publish.
- Shipped verification runner dry-run command
  (P1.1 verification-run-dry-run slice). **Step
  3** of the runner v1 implementation sequence
  pinned by
  [`docs/strategy/verification-runner-v1-decision.md`](docs/strategy/verification-runner-v1-decision.md).
  **No command execution.**

  **CLI:** new
  `rekon verify run --plan <id|type:id>
  --dry-run|--preview [--root <path>] [--json]`
  command. Resolves the named `VerificationPlan`
  (and paired `WorkOrder` when present), parses
  each command into argv, validates each
  command against the safety contract, and
  writes a planned-but-not-run `VerificationRun`
  artifact when every command validates.
  Refuses `--execute` with a not-implemented
  message; refuses without `--dry-run` /
  `--preview`; refuses without `--plan`;
  refuses to write when any command is invalid.
  `rekon verify record` behavior is unchanged.

  **Helper:** new
  `createVerificationRunDryRun` +
  `validateVerificationRunCommandString` in
  `@rekon/capability-verify`. The
  command-string validator tokenizes
  whitespace-separated commands (with
  double-quoted and single-quoted string
  support) and rejects: shell-control operators
  (`;` `&&` `||` `|` `<` `>` `<<` `>>` `&`),
  command substitution (`$(…)` `` `…` ``),
  env-assignment prefixes (`NAME=value cmd`),
  newlines, empty commands, and unterminated
  quotes. Reason codes are stable and
  machine-readable
  (`shell-control-operator`,
  `command-substitution`,
  `env-assignment-prefix`, `newline`,
  `empty-command`, `unsupported-syntax`).

  **Dry-run artifact shape:** `status:
  "not-run"`, every command `status:
  "not-run"`, `runner.id` defaults to
  `"rekon.local.dry-run"`,
  `runner.capabilityId` is
  `"@rekon/capability-verify"`,
  `redaction.applied` is `false` (patterns
  list declared for audit only),
  `environment.envPolicy` defaults to
  `"scrubbed"`, `header.inputRefs` cites the
  `VerificationPlan` (and `WorkOrder` when
  present). Dry-run artifacts validate clean
  via `rekon artifacts validate`.

  **Output:** JSON mode returns
  `{ dryRun: true, executed: false, artifact,
  verificationRun, planRef, workOrderRef,
  safety, validationIssues, warnings, message }`.
  Human-readable mode renders a plan / work
  order / artifact summary, a command table
  (`| # | Command | Status | Argv |`), and a
  "No commands were executed." line followed
  by a pointer at the safety contract memo.

  **Tests:** **23 new tests** in
  `tests/contract/verification-run-dry-run.test.mjs`
  (helper parsing + accepted / rejected
  patterns + safety summary; CLI `--dry-run` /
  `--preview` / refusal-of-`--execute` /
  refusal-without-`--plan` / refusal-of-invalid-
  commands / human-readable-output; a
  **sentinel-file** assertion that proves no
  process is spawned: a plan containing
  `node -e "writeFileSync('SHOULD_NOT_EXIST',…)"`
  never creates the file when run through
  `--dry-run`; `artifacts validate` stays
  clean). Full suite: **1036 passed / 1
  skipped**.

  **Docs:** updated
  [`docs/concepts/verification-runs.md`](docs/concepts/verification-runs.md),
  [`docs/artifacts/verification-run.md`](docs/artifacts/verification-run.md),
  [`docs/strategy/verification-runner-v1-decision.md`](docs/strategy/verification-runner-v1-decision.md)
  (step 3 flipped to ✅ Shipped),
  [`docs/concepts/verification-results.md`](docs/concepts/verification-results.md),
  [`docs/artifacts/verification-result.md`](docs/artifacts/verification-result.md),
  [`docs/artifacts/verification-plan.md`](docs/artifacts/verification-plan.md),
  [`docs/concepts/proof-report-publication.md`](docs/concepts/proof-report-publication.md),
  [`docs/artifacts/proof-report-publication.md`](docs/artifacts/proof-report-publication.md),
  [`docs/strategy/classic-behavior-roadmap.md`](docs/strategy/classic-behavior-roadmap.md),
  [`docs/strategy/roadmap.md`](docs/strategy/roadmap.md),
  [`docs/strategy/issue-governance-architecture-decision.md`](docs/strategy/issue-governance-architecture-decision.md)
  (step 37 flipped to shipped; step 38 added
  for execution v1; subsequent steps
  renumbered), `README.md`. New review packet:
  [`.rekon-dev/review-packets/verification-run-dry-run.md`](.rekon-dev/review-packets/verification-run-dry-run.md).

  **Next slice:** **verification runner
  execution v1** —
  `rekon verify run --plan <id> --execute`.
  Step 4 of the runner v1 sequence; the first
  slice that actually spawns processes.

  No `schemaVersion` bump. No
  `VerificationResult` derivation. No process
  spawn. No stdout / stderr capture. No log
  redaction implementation (patterns declared
  only). No `rekon verify record` behavior
  change. No `WorkOrder` / `VerificationPlan` /
  `VerificationResult` / `ReconciliationPlan` /
  `CoherencyDelta` behavior change. No CI /
  GitHub integration. No sandboxing
  implementation. No watcher / daemon. No
  version bump. No npm publish.
- Shipped VerificationRun artifact +
  `@rekon/capability-verify` skeleton
  (P1.1
  verification-run-artifact-capability-skeleton
  slice). Steps 1–2 of the runner v1
  implementation sequence pinned by
  [`docs/strategy/verification-runner-v1-decision.md`](docs/strategy/verification-runner-v1-decision.md).
  **No command execution in this batch.**

  **Artifact:** new sibling **`VerificationRun`**
  artifact type added to
  `@rekon/capability-intent` (next to
  `VerificationResult`). Records per-command
  `start` / `end` / `durationMs` / `exitCode` /
  `status` (`passed` / `failed` / `timeout` /
  `killed` / `skipped` / `not-run`) + stdout /
  stderr digests + truncated excerpts + runner
  version + environment summary + redaction
  audit. Helpers: `createVerificationRun`,
  `summarizeVerificationRunCommands`,
  `validateVerificationRun`,
  `assertVerificationRun`,
  `validateVerificationRunStreamExcerpt`.
  **`VerificationResult` shape unchanged.**

  **Capability:** new package
  **`@rekon/capability-verify`** with manifest
  declaring the new `"runner"` role and the new
  **`execute:verification`** permission. Consumes
  `VerificationPlan` and `WorkOrder`; produces
  `VerificationRun` and `VerificationResult`. The
  runner handler
  (`@rekon/capability-verify.runner`) is a
  **throw-stub** that raises
  `"@rekon/capability-verify: command execution
  is not implemented yet"` when invoked.
  Importing the capability does **not** enable
  execution.

  **SDK conformance updates:** added `"runner"`
  to `CapabilityRole`, `"execute:verification"`
  to `CapabilityPermission`, and
  `"VerificationRun"` to
  `BUILT_IN_ARTIFACT_TYPES`. New `Runner` type +
  `registry.runner()` registration method. New
  fields on `RegisteredCapability` and
  `CapabilityRegistrySnapshot`
  (`runners: Runner[]`). Manifest invariants
  (`ensureManifestRolesHaveHandlers`,
  `validateRegisteredCapability`,
  `cloneRegisteredCapability`) updated for the
  new role. **Conformance does not invoke runner
  handlers** — preserving the safety contract
  that runners only execute via explicit operator
  commands.

  **Runtime:** routes `VerificationRun` to the
  `actions` artifact category (next to
  `VerificationResult` and `ReconciliationPlan`).

  **Tests:** 30 new tests pin the boundary —
  9 `verification-run-artifact.test.mjs` +
  12 `verify-capability-skeleton.test.mjs` +
  9 package-local. Full suite: **1013 passed / 1
  skipped**.

  **Docs:** 2 new
  ([`docs/artifacts/verification-run.md`](docs/artifacts/verification-run.md),
  [`docs/concepts/verification-runs.md`](docs/concepts/verification-runs.md)).
  Cross-references added in
  [`docs/artifacts/verification-result.md`](docs/artifacts/verification-result.md),
  [`docs/artifacts/verification-plan.md`](docs/artifacts/verification-plan.md),
  [`docs/artifacts/proof-report-publication.md`](docs/artifacts/proof-report-publication.md),
  [`docs/concepts/verification-results.md`](docs/concepts/verification-results.md),
  [`docs/concepts/proof-report-publication.md`](docs/concepts/proof-report-publication.md),
  [`docs/extensions/authoring-capabilities.md`](docs/extensions/authoring-capabilities.md),
  [`docs/release/public-package-boundaries.md`](docs/release/public-package-boundaries.md)
  (capability-verify row added; package count
  19 → 20). Strategy memos updated:
  [`docs/strategy/verification-runner-v1-decision.md`](docs/strategy/verification-runner-v1-decision.md)
  (steps 1–2 flipped to ✅ Shipped),
  [`docs/strategy/issue-governance-architecture-decision.md`](docs/strategy/issue-governance-architecture-decision.md)
  (step 36 flipped to shipped; step 37 added for
  dry-run command; subsequent steps renumbered),
  [`docs/strategy/classic-behavior-roadmap.md`](docs/strategy/classic-behavior-roadmap.md)
  (new entry),
  [`docs/strategy/roadmap.md`](docs/strategy/roadmap.md)
  (new completed-slice entry).

  **Next slice:** **verification runner dry-run
  command** —
  `rekon verify run --plan <id> --dry-run`. Step
  3 of the runner v1 sequence. **Still no
  command execution.**

  No CLI behavior change (no `rekon verify run`
  yet). No `schemaVersion` bump. No new reason
  codes. No producer change. No graph-aware
  filter change. No source-file reads. No process
  spawn. No stdout / stderr capture. No log
  redaction implementation. No
  `VerificationResult` derivation. No
  `rekon verify record` behavior change. No
  `WorkOrder` / `VerificationPlan` /
  `VerificationResult` / `ReconciliationPlan` /
  `CoherencyDelta` behavior change. No CI /
  GitHub integration. No sandboxing
  implementation. No watcher / daemon. No version
  bump. No npm publish.
- Shipped verification runner v1 decision memo
  (P1.1 verification-runner-v1-decision slice).
  Strategy-only batch — no runtime change. The memo
  ([`docs/strategy/verification-runner-v1-decision.md`](docs/strategy/verification-runner-v1-decision.md))
  decides whether Rekon should execute
  verification commands locally and pins the
  safety contract, artifact model, permission
  boundary, log / secret policy, timeout policy,
  retry policy, and implementation sequence.

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
  derive one from a run when `--write-result` is
  supplied.

  **Capability + permission boundary:** new
  package **`@rekon/capability-verify`** with a
  new `"runner"` role and a new
  **`execute:verification`** permission — kept
  distinct from `execute:commands` so the narrow
  scope is visible to manifest review and
  conformance tests.

  **Safety contract** (pinned for the
  implementation slice): no execution during
  `rekon refresh` / `publish` / `resolve` /
  `intent` / `reconcile` / `artifacts`; no shell
  interpolation from artifact-supplied strings;
  `spawn(argv[0], argv.slice(1))` with
  `shell: false` (the `["sh", "-c", "…"]` path
  is reserved for explicit operator-authored
  plan entries); per-command timeout default
  **120 s**, per-plan timeout default
  **600 s**; process-tree kill on timeout
  (`SIGTERM` → 3 s grace → `SIGKILL`); bounded
  logs (**8 KB / stream / command** default,
  full-stream digests always); redaction patterns
  v1 cover env vars matching `TOKEN` /
  `SECRET` / `KEY` / `PASSWORD` / `PAT` /
  `BEARER` plus `Bearer …` / `Basic …` HTTP
  auth headers (high-entropy detection
  deferred); **no auto-resolution**, **no
  auto-apply**, **no source writes**, **no
  automatic retries in v1**.

  **Implementation sequence (deferred to
  subsequent slices):** (1) `VerificationRun`
  artifact type + docs; (2)
  `@rekon/capability-verify` skeleton +
  conformance tests pinning the new role +
  permission; (3) dry-run command
  (`rekon verify run --plan <id> --dry-run`);
  (4) opt-in execution
  (`rekon verify run --plan <id> --execute`);
  (5) redaction / truncation tests; (6)
  `VerificationResult` derivation via
  `--write-result`; (7) runner-produced proof
  in publications; (8) CI / GitHub adapter (out
  of scope for local-runner v1).

  Pinned by
  `tests/docs/verification-runner-v1-decision.test.mjs`
  (18 assertions).

  No runtime behavior changes. No artifact
  mutation. No CLI behavior change. No new
  artifact type yet (lands in the next slice).
  No new capability yet. No new CLI command yet.
  No `schemaVersion` bump. No new reason codes.
  No producer change. No graph-aware filter
  change. No source-file reads. No version bump.
  No npm publish.
- Shipped issue merge decision publication / detail
  polish v2 (P1.1
  issue-merge-decision-publication-detail-polish
  slice). Combined CLI + publication + docs + test
  polish batch on top of operator-ergonomics v1. The
  memo
  ([`docs/strategy/issue-merge-decision-publication-detail-polish.md`](docs/strategy/issue-merge-decision-publication-detail-polish.md))
  adds four polish surfaces:
  - **Human-readable `rekon issues merge candidate
    <candidate-id>`** when `--json` is absent —
    renders candidate id, decision state,
    strength / confidence / reasons, member groups
    (with status / severity / type / files /
    members), unioned member finding ids + files,
    latest decision + decision-history summary,
    current `CoherencyDelta` roll-up, freshness
    status, warnings + `rekon refresh`
    recommendation when stale, and the recommended
    decide-commands list. JSON output is
    unchanged.
  - **Human-readable `rekon issues merge candidates`**
    — non-JSON renders a summary line
    (`Merge candidates: N total, N undecided, N
    accepted, N rejected`), an optional `Filters:` /
    `Lineage:` / `Merge-rollup freshness:` line, a
    Markdown table, and an empty-state line when
    filters return zero matches.
  - **Enhanced `rekon issues merge decisions`** —
    JSON gains a `summary` block (`total`,
    `current`, `superseded`, `accepted`,
    `rejected`) plus a per-decision `current`
    boolean; `accepted` / `rejected` counts are
    over current decisions only. A decision is
    `current` when it is the latest decision (by
    `decidedAt` descending) for its `candidateId`.
    Non-JSON renders the summary plus a Markdown
    table. **The ledger contents are unchanged —
    `current` is computed at read time.**
  - **Proof report `## Issue Merge Decision
    Context` section** — `@rekon/capability-docs.proof-report`
    now reads `IssueAdjudicationReport` and
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
    `--superseded` / `--stale` commands when those
    counts are non-zero. Publisher manifest
    `consumes` adds `IssueMergeDecisionLedger`;
    manifest `invalidatedBy` adds an
    `issue-merge-decision.changed` rule.

  **Architecture summary + agent contract command
  guidance tightened:** both now also recommend
  `rekon issues merge candidates --decision
  accepted --json` when accepted candidates exist
  (audit path). The architecture summary's
  closing paragraph points operators at the
  human-readable detail mode explicitly.

  **Public API changes (additive only):** no new
  kernel exports. CLI gains non-JSON output paths
  for the three merge commands; JSON output for
  `decisions` gains a `summary` block plus a
  `current` boolean per entry; existing JSON
  output fields on `candidates` and `candidate
  <id>` are unchanged.

  **Contract test:**
  `tests/contract/issue-merge-publication-detail-polish.test.mjs`
  (17 cases) covers all four polish surfaces,
  publication renderers, `decisions` summary
  current vs. superseded annotation, and
  `rekon artifacts validate` cleanliness.

  Merge candidates remain advisory. Only `decide`
  mutates the `IssueMergeDecisionLedger`. No
  automatic merging. No semantic / fuzzy / LLM /
  embedding review. No artifact mutation outside
  the ledger append. No `schemaVersion` bump. No
  new artifact type. No new capability role. No
  new CLI subcommand outside the merge workflow.
  No producer change. No graph-aware filter
  change. No source-file reads. No version bump.
  No npm publish.
- Shipped issue merge decision operator ergonomics v1
  (P1.1 issue-merge-decision-operator-ergonomics
  slice). Combined CLI + publication + docs + test
  batch built on top of the freshness guardrails. The
  memo
  ([`docs/strategy/issue-merge-decision-operator-ergonomics.md`](docs/strategy/issue-merge-decision-operator-ergonomics.md))
  adds four operator-facing surfaces:
  - **Filters on `rekon issues merge candidates`**:
    `--undecided` / `--decision accepted|rejected|none`
    to find candidates by decision state;
    `--stale` / `--superseded` to find candidates
    whose decision no longer matches the current
    `CoherencyDelta` roll-up; plus `--reason`,
    `--strength`, and `--limit` for narrowing. The
    command response now carries a `summary` block
    (`total`, `accepted`, `rejected`, `undecided`,
    `stale`, `superseded`) plus a structured
    `mergeCandidateViews` array carrying decision
    state, decision history, member groups, member
    finding ids, files, the current
    `CoherencyDelta` roll-up item, and per-candidate
    warnings.
  - **`rekon issues merge candidate <candidate-id>`** —
    new detail command returning the same shape as a
    single `mergeCandidateViews[i]` plus a
    `recommendedCommands` array (the accepted /
    rejected decide commands pre-filled with the
    candidate id) and the merge-rollup freshness
    result. Use this before recording a decision to
    inspect context without opening raw artifacts.
  - **Enhanced `decide` output** with
    `previousDecision` (or `null` on first decide),
    `changedDecision` (true only when the new
    decision's status differs from the prior status),
    and `recommendedNextCommands` (`rekon coherency
    delta`, `rekon publish architecture`,
    `rekon publish agent-contract`).
  - **Publication decision counts**: architecture
    summary renders a new `## Merge Candidate
    Decisions` section with `Total / Accepted /
    Rejected / Undecided` counts and recommended
    filter commands. Agent contract renders
    `### Merge Candidate Decisions` with compact
    counts plus an explicit "Ask the operator to
    review undecided candidates" directive. A new
    `Do Not Do` reminder warns agents against
    assuming advisory merge candidates are accepted.

  **Public API changes (additive only):** new exports
  from `@rekon/kernel-findings` —
  `IssueMergeCandidateDecisionState`,
  `IssueMergeCandidateView`,
  `IssueMergeCandidateViewsInput`, and
  `buildIssueMergeCandidateViews()`. No removed
  fields or types. No `schemaVersion` bump.

  **Contract test:**
  `tests/contract/issue-merge-operator-ergonomics.test.mjs`
  (16 cases) covers every filter combination,
  candidate detail (groups + memberFindingIds +
  files + decisionHistory newest-first + rollup
  + warnings), decide output enhancements,
  publication renderers, the read-only invariant
  (only `decide` writes), and `rekon artifacts
  validate` cleanliness.

  Merge candidates remain advisory. Only `decide`
  mutates the `IssueMergeDecisionLedger`. No
  automatic merging. No semantic / fuzzy / LLM /
  embedding review. No artifact mutation outside
  the ledger append. No `schemaVersion` bump. No
  new artifact type. No new capability role. No
  new CLI subcommand outside the merge workflow.
  No producer change. No graph-aware filter change.
  No source-file reads. No version bump. No npm
  publish.
- Shipped issue merge decision freshness guardrails v1
  (P1.1 issue-merge-decision-freshness-guardrails
  slice). Combined strategy + implementation batch.
  The memo
  ([`docs/strategy/issue-merge-decision-freshness-guardrails.md`](docs/strategy/issue-merge-decision-freshness-guardrails.md))
  pins the freshness predicate as **artifact-lineage
  only** — no file-system mtime, no watcher, no
  daemon. A `CoherencyDelta` is **stale for
  decision-making** when any of five rules fire:
  `merge-ledger-missing` (mergedIssueGroupIds exist
  but no `IssueMergeDecisionLedger` cited);
  `merge-ledger-stale` (cites an older ledger than
  the latest); `adjudication-stale` (cites an older
  `IssueAdjudicationReport` than the latest);
  `lifecycle-stale` (the cited adjudication cites an
  older `FindingLifecycleReport` than the latest);
  `merge-decision-superseded` (the latest ledger
  decision for some `mergeCandidateId` used by the
  roll-up has a different id or
  `decision !== "accepted"`).

  **Helper:** pure data-only
  `detectIssueMergeRollupFreshness` in
  `@rekon/kernel-findings` emits warnings in stable
  A → B → C → D → E order; no fs reads, no
  mutation. Threaded through:
  - **architecture summary** — new `### Merge
    Roll-up Freshness` subsection below
    `## Accepted Issue Merge Roll-ups` with
    `Status:` line, warnings table, and stale
    callout;
  - **agent contract** — new `### Merge Decision
    Freshness` subsection with per-input
    fresh/stale lines, recommended `rekon refresh`
    command, and (when stale) a "Do not rely on
    accepted merge roll-ups …" callout plus a new
    `Do Not Do` reminder;
  - **`resolve.issue`** — when `IssuePacket.mergeRollup`
    is attached, the resolver runs the predicate
    against the latest ledger / adjudication /
    lifecycle, adds an `issue.merge.freshness`
    `resolutionTrace` step (`status: "warning"`
    with `details.codes` array when stale,
    `status: "used"` when fresh), appends a
    `rekon refresh` warning string when stale, and
    cites the ledger / adjudication / lifecycle
    refs in `IssuePacket.header.inputRefs`
    (deduped).

  **Warnings do NOT invalidate artifacts
  structurally.** They mark the consumed
  merge-roll-up context as stale for
  decision-making and recommend `rekon refresh`.

  **Contract test:**
  `tests/contract/issue-merge-decision-freshness-guardrails.test.mjs`
  (16 cases) covers every rule end-to-end across
  architecture summary, agent contract, and
  `resolve.issue`, plus the helper's `missing`,
  `fresh`, and Rule-A `stale` unit branches. Also
  pins an end-to-end-ish scenario: accepted
  decision → newer rejected decision → both
  publications and the resolver surface
  `merge-decision-superseded`. `rekon artifacts
  validate` stays clean across all scenarios.

  No artifact mutation. No auto-refresh inside
  publishers or resolvers. No watcher / daemon. No
  file-system mtime / path invalidation. No
  artifact header shape change. No `schemaVersion`
  bump. No new artifact type. No new capability
  role. No new CLI subcommand or flag. No new
  reason codes. No producer change. No graph-aware
  filter change. No source-file reads. No LLM /
  semantic / fuzzy / embedding matching. No
  `GraphOntologyValidator` port. No version bump.
  No npm publish.
- Shipped graph-aware fixture coverage operator
  review v3 (P1.1
  graph-aware-fixture-coverage-operator-review-v3
  slice). Strategy / docs / test batch only — no
  runtime change. The memo
  ([`docs/strategy/graph-aware-fixture-coverage-operator-review-v3.md`](docs/strategy/graph-aware-fixture-coverage-operator-review-v3.md))
  re-runs the operator-review protocol against the
  post-strengthening attribution profile after
  `a2a2d25` shipped factory / module-gate evidence
  strengthening. **Measured aggregate diagnostics
  across the six filtered cases: `EvidenceGraph` 6,
  `DetectorDetails` 0, `ObservedRepo` 0; no
  fallback-dominance alert fires.** All four
  import-fact-producer migration triggers
  re-evaluated against the new data — none met.
  **Option C remains the alpha decision** (helper
  compatibility now; producer migration deferred).
  The memo records the **graph-aware v1 / v2 / v3
  arc as alpha-complete** — every shipped
  graph-aware reason has deterministic fixture
  coverage, every fixture positive is
  artifact-backed, fallback branches remain in the
  implementation and are pinned by contract tests,
  the publication-facing diagnostic surface
  distinguishes evidence sources, the negative
  case is pinned, import producer migration is not
  required, and no remaining reason needs further
  strengthening before alpha. The memo explicitly
  states **factory / module-gate artifact evidence
  strengthening closes the last known
  fixture-attribution gap** and recommends the
  next implementation slice return to the deferred
  **issue merge decision freshness guardrails**
  (previously deferred until filtering /
  graph-aware parity was stronger; that condition
  is now satisfied). Pinned by
  `tests/docs/graph-aware-fixture-coverage-operator-review-v3.test.mjs`.
  No filter behavior change. No producer change.
  No helper change. No artifact `schemaVersion`
  bump. No new artifact type. No new capability
  role. No new CLI subcommand or flag. No new
  reason codes. No source-file reads. No LLM /
  semantic / fuzzy / embedding matching. No
  `GraphOntologyValidator` port. No version bump.
  No npm publish.
- Shipped factory / module-gate artifact evidence
  strengthening v1 (P1.1
  factory-module-gate-evidence-strengthening slice).
  Combined strategy + implementation batch — the
  graph-aware fixture coverage operator review v2's
  recommended next slice. The memo
  ([`docs/strategy/factory-module-gate-evidence-strengthening.md`](docs/strategy/factory-module-gate-evidence-strengthening.md))
  selects **EvidenceGraph symbol/export facts** as
  the smallest viable projection target (fixtures
  already emit the right facts via
  `@rekon/capability-js-ts`); projector-side
  `ObservedSystem.kind` population is deferred (the
  capability-model projector currently emits
  first-segment-only owner systems; per-module
  system synthesis is broad enough churn to defer).

  **Filter changes:**
  `graphFilterFactoryFileCreatesDeps` and
  `graphFilterModuleGateVerifiedCaller` each gain a
  new top-priority EvidenceGraph branch that
  consumes `listSymbolsForFile` +
  `listExportsForFile`. Factory branch: high
  confidence when any symbol/export name includes
  `"Factory"`; medium when name starts with
  `"create"` AND file path includes
  `"Factory"` / `"factory"`. Module-gate branch:
  high confidence when any name includes
  `"GateEvaluator"`; medium when name matches
  `/^evaluate.*Gate/`. Both branches set
  `usedArtifacts: ["EvidenceGraph"]` →
  `evidenceSource: "EvidenceGraph"`. Existing path /
  CapabilityMap / `ObservedSystem.kind === "module"`
  branches survive as fallback so repos without
  artifact coverage continue to filter the same set
  of findings with `DetectorDetails` /
  `ObservedRepo` attribution (depending on which
  fallback fires).

  **Aggregate fixture attribution shifts from
  `EvidenceGraph: 4 / DetectorDetails: 2` to
  `EvidenceGraph: 6 / DetectorDetails: 0`** against
  the committed fixtures
  (`tests/fixtures/graph-aware-filters/`). The two
  reasons that the v2 review identified as
  candidates for evidence strengthening
  (`factory-file-creates-deps`,
  `module-gate-verified-caller`) now attribute as
  `EvidenceGraph` end-to-end. Path fallback still
  fires for repos with non-canonical symbol/export
  names — confirmed by the v3 contract test's
  path-fallback scenarios.

  **Contract test:**
  `tests/contract/factory-module-gate-artifact-evidence.test.mjs`
  (14 cases) pins the EvidenceGraph + ObservedRepo +
  path-fallback scenarios end-to-end with full
  `inputRefs` precision (EvidenceGraph cited only
  when used; ObservedRepo cited when the
  `kind: "module"` branch fires; path-fallback
  decisions cite neither), evidence-string
  symbol-name citation, raw `FindingReport`
  byte-preservation across filter runs, lifecycle /
  adjudication / coherency exclusion of
  artifact-backed filtered findings,
  `FindingFilterHealthSummary.graphAwareByEvidenceSource`
  count correctness per scenario, and `rekon
  artifacts validate` cleanliness. The v2 fixture
  contract test
  (`tests/contract/graph-aware-filter-fixtures-v2.test.mjs`)
  is updated in the same diff to assert the new
  EvidenceGraph attribution for the factory and
  module-gate fixtures.

  **Deferred:** per-module `ObservedSystem` projection
  (so branch B of `graphFilterModuleGateVerifiedCaller`
  fires from real fixtures instead of just synthetic
  test contexts); CapabilityMap `role` field;
  `CapabilityMap` precedence in
  `evidenceSourceFromGraphArtifacts`.
  **Recommended next slice:** graph-aware fixture
  coverage operator review v3.

  No source reads. No AST. No typechecker. No LLM /
  semantic / fuzzy / embedding matching. No
  `GraphOntologyValidator` port. No producer
  migration for import facts. No artifact
  `schemaVersion` bump. No new artifact type. No
  new capability role. No new CLI subcommand or
  flag. No new reason codes. No version bump. No
  npm publish.
- Shipped graph-aware fixture coverage operator
  review v2 (P1.1
  graph-aware-fixture-coverage-operator-review-v2
  slice). Strategy / docs / test batch only — no
  runtime change. The memo
  ([`docs/strategy/graph-aware-fixture-coverage-operator-review-v2.md`](docs/strategy/graph-aware-fixture-coverage-operator-review-v2.md))
  re-runs the operator review's data-gathering
  protocol against the now-six deterministic
  fixtures (`route-handler`, `external-comment`,
  `nextjs-route`, `route-http-middleware-only`
  positive + negative, `factory-file`,
  `module-gate`). **Measured aggregate diagnostics
  across the six filtered cases: `EvidenceGraph`
  attribution 4 (the four artifact-backed reasons);
  `DetectorDetails` attribution 2
  (`factory-file-creates-deps` and
  `module-gate-verified-caller`, both currently
  path-evidence-only); `ObservedRepo` 0; no
  fallback-dominance alert fires.** All four
  migration triggers from the import-fact
  subject-shape decision memo re-evaluated against
  the new data — none met. **Option C remains the
  alpha decision** (helper compatibility now;
  producer migration deferred). The memo extends the
  refresh memo with an explicit per-reason
  artifact-strength review and identifies
  `factory-file-creates-deps` and
  `module-gate-verified-caller` as the next
  evidence-strengthening candidates (not import
  producer migration) — likely via a role / kind /
  ownership projection at the EvidenceGraph /
  CapabilityMap / ObservedSystem substrate.
  Pinned by
  `tests/docs/graph-aware-fixture-coverage-operator-review-v2.test.mjs`.
  No filter behavior change. No producer change. No
  helper change. No artifact `schemaVersion` bump.
  No new artifact type. No new capability role. No
  new CLI subcommand or flag. No new reason codes.
  No source-file reads. No LLM / semantic / fuzzy /
  embedding matching. No `GraphOntologyValidator`
  port. No version bump. No npm publish.
- Shipped graph-aware filter fixture coverage v2 (P1.1
  graph-aware-filter-fixtures-v2 slice). Three
  additional deterministic regression fixtures under
  `tests/fixtures/graph-aware-filters/` close the
  remaining graph-aware coverage gap. Every
  graph-aware reason now has end-to-end fixture
  coverage.

  **Fixtures added:**

  - `route-http-middleware-only/` —
    `src/api/session/route.ts` imports only allowed
    `/infra/http/auth` + `/infra/Identity/session`
    modules (positive case fires
    `route-http-middleware-only` via the
    EvidenceGraph branch);
    `src/api/bad/route.ts` imports
    `/infra/Database/client` (negative case KEEPS
    the finding, proving the graph-aware filter
    correctly does NOT over-suppress).
  - `factory-file/` —
    `src/core/services/widgets/WidgetFactory.ts`
    exercises the path-evidence branch of
    `factory-file-creates-deps`. Current
    attribution: `DetectorDetails` (path-only
    matches set `usedArtifacts: []`, which the
    evidence-source classifier maps to
    `DetectorDetails`).
  - `module-gate/` —
    `src/modules/payments/PaymentGateEvaluator.ts`
    exercises the GateEvaluator path signal of
    `module-gate-verified-caller`. Same
    `DetectorDetails` attribution rationale.

  **Contract test** at
  `tests/contract/graph-aware-filter-fixtures-v2.test.mjs`
  (6 cases) copies each fixture to a tmpdir
  (committed fixtures stay untouched), runs
  `rekon refresh`, asserts the produced
  `EvidenceGraph` contains the expected import /
  file facts, seeds a synthetic `FindingReport`
  whose `header.inputRefs` cites the latest
  EvidenceGraph, runs `findings filter` +
  `findings filter-health`, and pins per-fixture:
  - The expected graph-aware reason fires (or, for
    the negative case, the finding is KEPT and no
    `route-http-middleware-only` entry exists).
  - `FilteredFinding.evidenceSource` matches the
    current implementation's attribution
    (`EvidenceGraph` for route-http positive;
    `DetectorDetails` for factory + module-gate).
  - `FindingFilterReport.header.inputRefs` includes
    `EvidenceGraph` ONLY when the EvidenceGraph
    branch fired (precise inputRefs from the v2
    graph-aware filter provider).
  - Raw `FindingReport` still contains the finding
    (artifact-first invariant).
  - `FindingFilterHealthSummary.graphAwareByEvidenceSource[<source>]`
    >= 1; per-reason map also `>= 1`.
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
  current behavior — future capability-role work
  could shift the attribution naturally.

  Regression fixtures only — NOT user-facing
  examples. They live under `tests/fixtures/`, not
  `examples/`.

  Implements step 27 of the issue governance ADR
  (flipped from `(future)` to `(shipped)`); step
  28 reserved for the graph-aware fixture coverage
  operator review v2.

  Strategy docs updated:
  `docs/strategy/graph-aware-import-evidence-operator-review-refresh.md`
  (Follow-Up Work updated to mark fixture coverage
  v2 as shipped + summarize attribution
  measurements);
  `docs/concepts/graph-aware-finding-filters.md`
  (Regression fixtures paragraph names all six
  fixtures);
  `docs/concepts/finding-filters.md` (graph-aware
  bullet annotated with the full six-fixture
  coverage);
  `docs/strategy/issue-governance-architecture-decision.md`
  (step 27 flipped to shipped; step 28 reserved for
  operator review v2);
  `docs/strategy/classic-behavior-roadmap.md` and
  `docs/strategy/roadmap.md` (new fixture-coverage
  v2 entries).

  Aligned to `infra/validation/GraphOntologyValidator.ts`,
  `services/IssueDetectionService.ts`,
  `services/issues/content-filter-ruleid.ts`,
  `services/issues/filter-health.ts`,
  `services/GraphBuildProvider.ts`,
  `domain/graph/producers/**`. Full suite: 861
  passed / 1 skipped / 0 failed. No filter behavior
  change. No producer change. No helper change. No
  artifact `schemaVersion` bump. No new artifact
  type. No new capability role. No new CLI
  subcommand or flag. No new reason codes. No
  source-file reads at filter time. No AST, no type
  checker. No LLM, semantic, fuzzy, or embedding
  matching. No `GraphOntologyValidator` port. No
  version bump. No npm publish.

  Graph-aware fixture coverage operator review v2
  is the recommended next slice.

- Shipped graph-aware import evidence operator review
  refresh (P1.1
  graph-aware-import-evidence-operator-review-refresh
  slice). Strategy-only batch — no runtime behavior
  changes ship.

  The memo
  ([`docs/strategy/graph-aware-import-evidence-operator-review-refresh.md`](docs/strategy/graph-aware-import-evidence-operator-review-refresh.md))
  re-runs the prior operator review's data-gathering
  protocol against the three deterministic regression
  fixtures shipped at `702afbf` and re-confirms
  **Option C** against measured data (the prior memo
  had relied on architectural reasoning because no
  available fixture exercised the EvidenceGraph
  branches).

  **Per-fixture measured diagnostics** (each fixture
  run via temp-copy flow; committed fixtures
  untouched):

  | Fixture | Expected Reason | Evidence Source | graphAwareFiltered | EvidenceGraph InputRef | Publication Surfaced |
  | --- | --- | --- | ---: | --- | --- |
  | route-handler | route-handler-with-service | EvidenceGraph | 1 | yes | yes |
  | external-comment | external-api-comment-only | EvidenceGraph | 1 | yes | yes |
  | nextjs-route | nextjs-route-convention | EvidenceGraph | 1 | yes | yes |

  **Aggregate evidence-source counts:** EvidenceGraph
  3; DetectorDetails 0; ObservedRepo 0. No
  fallback-dominance alert fires
  (`graph-aware-details-fallback-dominance`,
  `graph-aware-observedrepo-fallback-dominance`,
  `graph-aware-evidencegraph-low-usage`).

  **Four migration triggers re-evaluated** (from the
  [import-fact subject-shape decision memo](docs/strategy/import-fact-subject-shape-decision.md)),
  none met:
  - Helper compatibility callsites > ~3 — Not met
    (one `matchesFileSubject` implementation, two
    consumers).
  - `EvidenceGraph` `schemaVersion` bump planned —
    Not met.
  - External capability author confusion — Unknown
    (pre-publish).
  - Import facts become publication-facing — Not met
    (publications aggregate counts only).

  **Supporting non-trigger diagnostic:** the three
  fixtures prove EvidenceGraph-backed graph-aware
  filtering works through helper compatibility
  end-to-end. The helpers are doing their job;
  producer migration is not required for filter
  correctness today.

  **Decision: Option C remains the alpha decision.**
  The memo explicitly states:
  *"The deterministic fixtures prove
  EvidenceGraph-backed graph-aware filtering works
  through helper compatibility."* and *"No import
  fact producer migration in alpha unless a trigger
  is met."*

  **Recommended next slice:** graph-aware filter
  fixture coverage v2 — add deterministic fixtures
  for `route-http-middleware-only`,
  `factory-file-creates-deps`, and
  `module-gate-verified-caller` so the remaining
  three graph-aware checks gain the same
  regression-grade coverage.

  Strategy docs updated:
  `docs/strategy/graph-aware-import-evidence-operator-review.md`
  (Follow-Up Work paragraph adds "Refresh shipped"
  pointer);
  `docs/strategy/import-fact-subject-shape-decision.md`
  (top blockquote adds the refresh blockquote);
  `docs/strategy/graph-ontology-validator-lite-audit.md`
  (top blockquote adds the refresh blockquote);
  `docs/strategy/issue-governance-architecture-decision.md`
  (step 26 flipped to shipped; step 27 reserved for
  fixture coverage v2);
  `docs/strategy/classic-behavior-roadmap.md` and
  `docs/strategy/roadmap.md` (new refresh entries);
  `docs/concepts/graph-aware-finding-filters.md`
  (operator-review paragraph extended);
  `docs/artifacts/evidence-graph.md` (legacy-subject
  paragraph extended).

  Implements step 26 of the issue governance ADR
  Implementation Order. Pinned by
  `tests/docs/graph-aware-import-evidence-operator-review-refresh.test.mjs`
  (16 tests). Aligned to `lib/import-graph.ts`,
  `services/GraphBuildProvider.ts`,
  `domain/graph/producers/**`,
  `services/issues/filter-health.ts`,
  `services/IssueDetectionService.ts`. No artifact
  `schemaVersion` bump. No new artifact type. No new
  capability role. No new CLI subcommand or flag. No
  new reason codes. No producer change. No helper
  change. No graph-aware filter change. No source-file
  reads at filter time. No AST, no type checker. No
  LLM, semantic, fuzzy, or embedding matching. No
  `GraphOntologyValidator` port. No version bump. No
  npm publish.

- Shipped graph-aware filtering fixture expansion (P1.1
  graph-aware-filter-fixtures slice). Adds three
  deterministic regression fixtures under
  `tests/fixtures/graph-aware-filters/` and a contract
  test that proves the EvidenceGraph-backed graph-aware
  filter branches fire end-to-end against real source
  files (not synthetic graph data).

  **Fixtures added:**
  - `route-handler/` — `src/api/widgets/route.ts`
    imports `./handler` plus a sibling
    `handler.ts`. Drives the EvidenceGraph import
    branch of `route-handler-with-service` (legacy
    `subject = "<file>:<target>"` shape; works because
    the compatibility-aware `listImportTargetsForFile`
    handles both shapes).
  - `external-comment/` — `src/api/util.ts` imports
    `leftpad` only (no openai / openrouter / @openai/*
    SDK). Drives the EvidenceGraph branch of
    `external-api-comment-only`. The comment-only
    "openai" docstring proves the rule fires on
    description-mentions and is correctly suppressed
    when graph evidence shows no SDK import.
  - `nextjs-route/` — `src/app/api/route.ts` exports
    `GET` handler plus segment-config exports
    `runtime` and `dynamic`. Drives the EvidenceGraph
    export-facts branch of `nextjs-route-convention`
    (the v3 substrate-backed check).

  **Contract test:**
  `tests/contract/graph-aware-filter-fixtures.test.mjs`
  copies each fixture to a `mkdtemp` tmpdir
  (committed fixtures are never mutated), runs
  `rekon refresh`, asserts the produced
  `EvidenceGraph` contains the expected import or
  export facts, seeds a synthetic `FindingReport`
  whose `header.inputRefs` cites the latest
  EvidenceGraph, runs `rekon findings filter` +
  `rekon findings filter-health`, and asserts:
  - The expected graph-aware reason fires.
  - `FilteredFinding.evidenceSource === "EvidenceGraph"`.
  - Evidence string mentions `EvidenceGraph`.
  - `FindingFilterReport.header.inputRefs` includes
    `EvidenceGraph`.
  - Raw `FindingReport` still contains the finding
    (artifact-first invariant: filters never mutate
    the raw report).
  - `FindingFilterHealthSummary.graphAwareByEvidenceSource.EvidenceGraph >= 1`.
  - `FindingFilterHealthSummary.graphAwareReasonEvidenceSources[reason].EvidenceGraph >= 1`.
  - Lifecycle / adjudication / coherency exclude the
    graph-filtered finding.
  - `rekon artifacts validate` returns
    `{ valid: true, issues: [] }`.

  A separate publications test runs the route-handler
  fixture through `publish architecture` +
  `publish agent-contract` and asserts both surfaces
  render EvidenceGraph attribution (the architecture
  summary's `### Graph-Aware Evidence Sources` section
  with an `EvidenceGraph` row; the agent contract's
  compact `Graph-aware evidence sources:` list). This
  proves the fixture-driven evidence reaches the
  user-facing publication surfaces end-to-end.

  An `artifacts validate` smoke test runs against all
  three fixtures to verify each refresh produces a
  clean artifact set.

  **Regression fixtures only — NOT user-facing
  examples.** The fixtures live under
  `tests/fixtures/`, not `examples/`. They are sized
  to be small, deterministic, regeneration-friendly
  via `rekon refresh`, and useful for catching
  regressions in the producer (`@rekon/capability-js-ts`),
  the helper layer
  (`@rekon/kernel-findings.listImportTargetsForFile`,
  `listExportsForFile`), or the graph-aware filter
  checks themselves. They do not demonstrate
  Rekon's capabilities to end users.

  **Operator-review followthrough.** The
  [graph-aware import evidence operator review](docs/strategy/graph-aware-import-evidence-operator-review.md)
  (shipped at `2d6dc50`) recorded that no available
  local fixture exercised the EvidenceGraph branches
  of any graph-aware filter, leaving the
  evidence-source diagnostic surface untested
  end-to-end at the publication layer. This slice
  closes that gap. A future operator-review refresh
  can consume real source-driven distributions from
  these fixtures rather than concluding "data sparse"
  on architectural reasoning alone.

  Implements step 25 of the issue governance ADR
  (flipped from `(future)` to `(shipped)`); step 26
  reserved for the operator-review refresh.

  Strategy docs updated:
  `docs/strategy/graph-aware-import-evidence-operator-review.md`
  (Follow-Up Work section adds a "Fixture expansion
  status: shipped" paragraph);
  `docs/concepts/graph-aware-finding-filters.md` (new
  "Regression fixtures" paragraph naming the three
  fixtures and the contract test);
  `docs/concepts/finding-filters.md` (graph-aware
  bullet annotated with the fixtures);
  `docs/strategy/issue-governance-architecture-decision.md`
  (step 25 flipped to shipped; step 26 reserved for
  operator-review refresh);
  `docs/strategy/classic-behavior-roadmap.md` and
  `docs/strategy/roadmap.md` (new entries).

  Aligned to `infra/validation/GraphOntologyValidator.ts`,
  `services/IssueDetectionService.ts`,
  `services/issues/content-filter-ruleid.ts`,
  `services/issues/filter-health.ts`,
  `services/GraphBuildProvider.ts`,
  `domain/graph/producers/**`. Full suite: 839
  passed / 1 skipped / 0 failed. No filter behavior
  change. No producer change. No helper change. No
  artifact `schemaVersion` bump. No new artifact
  type. No new capability role. No new CLI subcommand
  or flag. No new reason codes. No source-file reads
  at filter time. No AST, no type checker. No LLM,
  semantic, fuzzy, or embedding matching. No
  `GraphOntologyValidator` port. No version bump. No
  npm publish.

  Graph-aware import evidence operator review refresh
  is the recommended next slice.

- Shipped graph-aware import evidence operator review
  (P1.1 graph-aware-import-evidence-operator-review
  slice). Strategy-only batch — no runtime behavior
  changes ship.

  The memo
  ([`docs/strategy/graph-aware-import-evidence-operator-review.md`](docs/strategy/graph-aware-import-evidence-operator-review.md))
  consumes the new diagnostic surface shipped at
  `499d096`
  (`byEvidenceSource`,
  `graphAwareByEvidenceSource`,
  `graphAwareReasonEvidenceSources`, three
  fallback-dominance alerts) against available
  fixtures (`examples/simple-js-ts`,
  `examples/import-boundary-rule-pack/fixtures/bad-imports`,
  `examples/custom-capability`) and decides whether the
  Option A producer migration from the import-fact
  subject-shape decision memo is worth taking now.

  **Decision: Option C (Hybrid — defer producer
  migration) for alpha.** The memo explicitly states:
  *"No import fact producer migration in alpha unless
  a trigger is met."*

  **Data summary:**
  - `examples/simple-js-ts` — 0 findings, 0
    graph-aware filtered.
  - `examples/import-boundary-rule-pack/fixtures/bad-imports`
    — 1 finding, 0 filtered (graph-aware doesn't
    catch it).
  - `examples/custom-capability` — 1 finding, 1
    filtered as `test-file` via `BuiltIn` path
    heuristic (`byEvidenceSource: { BuiltIn: 1 }`).
  - **Zero graph-aware filter decisions fire in any
    available fixture.** `graphAwareByEvidenceSource`
    is empty across the board.
  - **`byEvidenceSource` IS populated correctly when
    non-graph-aware filters fire** — confirming the
    attribution machinery works end-to-end.

  **Four migration triggers evaluated:**
  - Helper compatibility callsites > ~3: **Not met.**
    One `matchesFileSubject` implementation, two
    consumers via delegation.
  - `EvidenceGraph` `schemaVersion` bump planned:
    **Not met.**
  - External capability author confusion: **Unknown.**
    Pre-publish; no external authors exist yet.
  - Import facts become publication-facing: **Not
    met.** Publications aggregate counts only.

  **Recommended next slice:** graph-aware filtering
  fixture expansion. Add deterministic fixtures
  (route + handler sibling pair, external-API
  finding with no SDK import, Next.js route file with
  segment-config exports) that produce real
  EvidenceGraph-backed graph-aware filter matches so
  the diagnostic surface has non-empty data during
  development.

  Strategy docs updated:
  `docs/strategy/import-fact-subject-shape-decision.md`
  (top blockquote adds Operator review block);
  `docs/strategy/graph-ontology-validator-lite-audit.md`
  (top blockquote adds operator review status);
  `docs/strategy/issue-governance-architecture-decision.md`
  (step 24 flipped to shipped; step 25 reserved for
  fixture expansion);
  `docs/strategy/classic-behavior-roadmap.md` and
  `docs/strategy/roadmap.md` (new operator review
  entries);
  `docs/concepts/graph-aware-finding-filters.md` (new
  "Operator review" paragraph);
  `docs/artifacts/evidence-graph.md` (import-fact
  paragraph references the operator review).

  Implements step 24 of the issue governance ADR
  Implementation Order. Pinned by
  `tests/docs/graph-aware-import-evidence-operator-review.test.mjs`
  (15 tests). No artifact `schemaVersion` bump. No
  new artifact type. No new capability role. No new
  CLI subcommand or flag. No new reason codes. No
  producer change. No helper change. No graph-aware
  filter change. No source-file reads. No LLM,
  semantic, fuzzy, or embedding matching. No
  `GraphOntologyValidator` port. No version bump. No
  npm publish.

  Graph-aware filtering fixture expansion is the
  recommended next slice.

- Shipped graph-aware import evidence publication
  diagnostics (P1.1
  graph-aware-import-evidence-publication-diagnostics
  slice). Surfaces per-decision evidence-source
  attribution across `FindingFilterReport`,
  `FindingFilterHealthReport`, the architecture summary
  publication, and the agent contract publication.

  **`@rekon/kernel-findings` API additions:**
  - New type `FindingFilterEvidenceSource`
    (`"EvidenceGraph"` | `"ObservedRepo"` |
    `"DetectorDetails"` | `"Policy"` | `"BuiltIn"` |
    `"ResultFilter"` | `"Unknown"`).
  - New additive optional field
    `FilteredFinding.evidenceSource`. Older
    `FindingFilterReport` artifacts continue to validate
    with the field absent.
  - New validator branch accepting the new field.

  **`applyFindingFilters` attribution:** every pipeline
  stage sets the field at the FilteredFinding push site:
  - Policy stage → `Policy`.
  - Graph-aware stage → `EvidenceGraph` /
    `ObservedRepo` / `DetectorDetails` based on the
    decision's `usedArtifacts` list (precedence:
    EvidenceGraph > ObservedRepo > DetectorDetails).
  - Classic content stage → `DetectorDetails` for the
    six shared graph-aware reason codes, `BuiltIn`
    otherwise.
  - Built-in path stage → `BuiltIn`.
  - Result-filter stage → `ResultFilter`.

  **`FindingFilterHealthSummary` extensions:**
  - `byEvidenceSource?: Record<string, number>` —
    counts across all pipeline stages.
  - `graphAwareByEvidenceSource?: Record<string, number>`
    — counts restricted to `isGraphAwareFiltered`
    entries.
  - `graphAwareReasonEvidenceSources?: Record<string,
    Record<string, number>>` — per-reason × per-source
    matrix.
  - `dominantGraphAwareEvidenceSource?: { source,
    count, rate }` — alphabetic tiebreak; rate over
    `graphAwareFiltered`.

  **Three new advisory alerts (all gated on
  `graphAwareFiltered >= 5`):**
  - `graph-aware-details-fallback-dominance` —
    DetectorDetails >= 50% of graph-aware. Advisory:
    artifact-backed EvidenceGraph evidence is stronger
    than detector fallback.
  - `graph-aware-observedrepo-fallback-dominance` —
    ObservedRepo >= 50% of graph-aware. Advisory:
    sibling-file evidence is structurally strong, but
    EvidenceGraph carries more detail when available.
  - `graph-aware-evidencegraph-low-usage` —
    EvidenceGraph < 25% of graph-aware. Signals that
    the import-fact producer migration (Option A in
    the import-fact subject-shape decision memo) might
    be worth taking based on operator data.

  **Architecture summary publication:** new
  `### Graph-Aware Evidence Sources` section renders a
  per-source counts table sourced from
  `graphAwareByEvidenceSource`, followed by a
  per-reason × per-source breakdown table from
  `graphAwareReasonEvidenceSources`, with an audit
  pointer noting that EvidenceGraph entries are
  artifact-backed and DetectorDetails fallback should
  be treated as weaker.

  **Agent contract publication:** under the existing
  Finding Filter Health subsection, when graph-aware
  filtering exists the contract now renders:
  ```
  Graph-aware evidence sources:
  - EvidenceGraph: N
  - DetectorDetails: N
  - ObservedRepo: N
  ```
  New `Do Not Do` entry: "Do not treat detector-detail
  fallback filtering as equivalent to EvidenceGraph-
  backed structural evidence. When `Graph-aware
  evidence sources` shows `DetectorDetails` entries,
  review them more critically than `EvidenceGraph`
  entries — the detector's claim was not corroborated
  by artifact evidence."

  **What is UNCHANGED:**
  - Filter pipeline behavior. Decision logic,
    precedence, evidence strings, `usedArtifacts`,
    `inputRefs`, `graphArtifactsUsed` — all from the v4
    work — remain unchanged. This slice is diagnostic
    surface only.
  - `@rekon/capability-js-ts` import-fact producer.
  - `EvidenceGraph` artifact `schemaVersion`. No bump.
  - All graph-aware filter checks. All six remain
    unchanged.
  - All CLI commands. No new subcommands, no new flags.

  **Tests.** 19 new contract tests at
  `tests/contract/graph-aware-import-evidence-diagnostics.test.mjs`
  cover: per-source attribution for each of the five
  pipeline stages (EvidenceGraph / ObservedRepo /
  DetectorDetails for graph-aware; Policy; ResultFilter;
  BuiltIn), summary-level aggregations (byEvidenceSource,
  graphAwareByEvidenceSource,
  graphAwareReasonEvidenceSources, dominant tiebreak),
  all three new alerts, end-to-end architecture summary
  + agent contract rendering against a seeded fixture
  (Graph-Aware Evidence Sources table, per-reason
  breakdown table, agent contract evidence-source
  list, agent contract Do Not Do entry), raw
  `FindingReport` byte-identity, and `rekon artifacts
  validate` cleanliness. Full suite: 819 passed / 1
  skipped / 0 failed.

  Implements step 23 of the issue governance ADR
  (flipped from `(future)` to `(shipped)`); step 24
  reserved for the graph-aware import evidence
  operator-review decision memo that consumes the new
  diagnostic data from real operator runs to decide
  whether the Option A producer migration is worth
  taking.

  Strategy docs updated:
  `docs/artifacts/finding-filter-report.md` (new
  "Evidence Source Attribution" section);
  `docs/artifacts/finding-filter-health-report.md`
  (new summary fields documented + three new alerts in
  the alerts table);
  `docs/concepts/finding-filters.md` (graph-aware
  section names the publication diagnostics surface);
  `docs/concepts/graph-aware-finding-filters.md` (new
  `evidenceSource` attribution paragraph under
  Import-Fact Consumers v4);
  `docs/concepts/architecture-summary-publication.md`
  (rendering description names the new tables and
  alerts);
  `docs/concepts/agent-operating-contract.md` (Finding
  Filter Health section names the compact list + new
  Do Not Do entry);
  `docs/strategy/import-fact-subject-shape-decision.md`
  (top blockquote adds "Publication diagnostics"
  status);
  `docs/strategy/graph-ontology-validator-lite-audit.md`
  (top blockquote updated);
  `docs/strategy/issue-governance-architecture-decision.md`
  (step 23 flipped to shipped; step 24 reserved for
  the operator-review memo);
  `docs/strategy/classic-behavior-roadmap.md` and
  `docs/strategy/roadmap.md` (new diagnostics entries).

  Aligned to `infra/validation/GraphOntologyValidator.ts`,
  `services/issues/filter-health.ts`,
  `services/IssueDetectionService.ts`,
  `services/GraphBuildProvider.ts`. No new reason
  codes. No source-file reads at filter time. No AST,
  no type checker. No LLM, semantic, fuzzy, or
  embedding matching. No `GraphOntologyValidator`
  port. No new capability role. No new CLI subcommand
  or flag. No artifact `schemaVersion` bump. No new
  artifact type. No producer change. No version bump.
  No npm publish.

  Graph-aware import evidence operator review (a
  decision memo consuming real diagnostic data) is the
  recommended next slice.

- Shipped graph-aware import-fact consumers v4 (P1.1
  graph-aware-import-fact-consumers-v4 slice). Updates
  the three import-consuming graph-aware filters
  (`graphFilterRouteHandlerWithService`,
  `graphFilterRouteHttpMiddlewareOnly`,
  `graphFilterExternalApiCommentOnly`) to deliberately
  prefer `EvidenceGraph` import facts (via the
  compatibility-aware
  `@rekon/kernel-findings.listImportTargetsForFile`)
  over `Finding.details.imports`.

  **`route-handler-with-service` precedence swap.**
  Previously, the detector-supplied `details.imports`
  branch ran *before* the EvidenceGraph branch — even
  after v2 introduced the EvidenceGraph fallback. v4
  swaps that so the order is now:
  1. EvidenceGraph import facts (via
     `listImportTargetsForFile`).
  2. `Finding.details.imports` (fallback when no
     EvidenceGraph imports exist for the file).
  3. `ObservedRepo.files` sibling
     `handler.ts` / `handler.tsx` (fallback when neither
     import source yields evidence).

  This mirrors the `nextjs-route-convention` v3
  invariant: artifact-backed graph evidence beats
  detector details. The other two import-consuming
  filters (`route-http-middleware-only` and
  `external-api-comment-only`) already preferred
  EvidenceGraph from the v2 strengthening; v4 only
  tightens their evidence strings.

  **Evidence-string source labels.** All three filters
  now emit evidence strings that name the source
  explicitly. Audit consumers (filter-health, agent
  contract, operator review) can tell at a glance which
  branch fired:

  - `EvidenceGraph import facts show route delegates to
    handler: '<target>'.`
  - `Detector import details show route delegates to
    handler: '<target>'.`
  - `ObservedRepo file index shows route has sibling
    handler file: '<path>'.`
  - `EvidenceGraph import facts show route imports only
    HTTP / Identity middleware infra: <imports>.`
  - `Detector import details show route imports only
    HTTP / Identity middleware infra: <imports>.`
  - `EvidenceGraph import facts contain no external API
    package imports (openai / openrouter / @openai/*)
    for '<file>': <targets>.`
  - `Detector import details contain no external API
    package imports …`
  - `Detector import details (explicitly empty imports
    list) contain no external API package imports …`

  **`usedArtifacts` precision unchanged.** Decisions
  consulted via EvidenceGraph return
  `usedArtifacts: ["EvidenceGraph"]`; decisions
  consulted via `details.imports` return
  `usedArtifacts: []`; route-handler sibling-file
  matches return `usedArtifacts: ["ObservedRepo"]`. The
  runtime cites `EvidenceGraph` in
  `FindingFilterReport.header.inputRefs` exactly when at
  least one decision in the run consulted EvidenceGraph
  — and does NOT cite it when only `details.imports`
  fallback fired.

  **Tests.** 15 new contract tests at
  `tests/contract/graph-aware-import-fact-consumers.test.mjs`
  cover: production-shaped legacy EvidenceGraph imports
  for all three filters, EvidenceGraph-overrides-details
  semantics for `route-handler-with-service`,
  `details.imports` fallback paths, middleware-only
  conservative no-op (non-allowed infra import),
  external-api openai/openrouter rejection, explicit
  empty `details.imports` medium-confidence fallback,
  `FindingFilterReport.header.inputRefs` precision
  (cites `EvidenceGraph` when used; does NOT cite when
  only `details.imports` fallback fired), raw
  `FindingReport` byte-identity, lifecycle /
  adjudication / coherency exclusion, and `rekon
  artifacts validate` cleanliness against
  `examples/simple-js-ts`. Full suite: 800 passed / 1
  skipped / 0 failed.

  **Strategy docs updated:**
  `docs/concepts/graph-aware-finding-filters.md` (new
  "Import-Fact Consumers (v4)" section + table updated
  to show EvidenceGraph-first precedence for
  `route-handler-with-service`);
  `docs/concepts/finding-filters.md` (graph-aware
  section names v4);
  `docs/artifacts/finding-filter-report.md`
  ("Graph-Aware Filters" lists v4 precedence and
  evidence-source labels);
  `docs/artifacts/evidence-graph.md` (import-fact
  paragraph names the v4 consumers);
  `docs/strategy/import-fact-subject-shape-decision.md`
  (top blockquote adds "Consumer follow-through"
  status);
  `docs/strategy/graph-ontology-validator-lite-audit.md`
  (top blockquote updated with v4-shipped status);
  `docs/strategy/issue-governance-architecture-decision.md`
  (step 22 flipped to shipped; step 23 reserved for
  graph-aware import evidence publication
  diagnostics);
  `docs/strategy/classic-behavior-roadmap.md` and
  `docs/strategy/roadmap.md` (new v4 entries).

  Implements step 22 of the issue governance ADR
  Implementation Order. Aligned to
  `lib/import-graph.ts`,
  `services/GraphBuildProvider.ts`, and
  `domain/graph/producers/**`. No new reason codes. No
  new graph-aware filter categories. No producer
  change. No source-file reads at filter time. No AST,
  no type checker. No LLM, semantic, fuzzy, or
  embedding matching. No `GraphOntologyValidator`
  port. No new capability role. No new CLI subcommand
  or flag. No artifact `schemaVersion` bump. No new
  artifact type. No version bump. No npm publish.

  Graph-aware import evidence publication diagnostics
  (expose whether graph-aware filters consulted
  EvidenceGraph import facts versus fell back to
  `details.imports` — e.g. an `evidenceSource` count in
  filter-health or a row in the architecture summary's
  Graph-Aware Filter Reasons table) is the recommended
  next slice. Informs whether the future Option A
  producer migration is worth taking.

- Shipped import helper compatibility implementation
  (P1.1 import-helper-compatibility slice). Implements
  Option B of the
  [import-fact subject-shape decision memo](docs/strategy/import-fact-subject-shape-decision.md).

  **`@rekon/kernel-findings` helpers extended:**
  - `listImportTargetsForFile(context, filePath)` is now
    compatibility-aware. A new private predicate
    `matchesFileSubject(fact, normalizedFilePath)`
    consults, in order:
    1. `normalizeRepoPath(fact.subject) === normalizedFilePath`
       (future file-subject shape);
    2. `normalizeRepoPath(fact.value.source) === normalizedFilePath`
       (legacy producer's authoritative file field);
    3. legacy `subject` prefix before the first `":"`
       normalizing to `normalizedFilePath` (anchored on
       the full normalized file path — no `startsWith`
       traps).
  - New private `extractImportTarget(fact)` prefers
    `value.target` but falls back to the suffix after
    the first `":"` in legacy-shape subjects so older
    producers without `value.target` stay readable.
  - Targets are now deduped via a `Set` and returned
    sorted via `localeCompare`. A fact matching under
    multiple compatibility branches contributes its
    target once.
  - `fileImportsTargetMatching(context, filePath,
    predicate)` delegates to `listImportTargetsForFile`
    and therefore inherits the same compatibility
    behavior. External rule packs see identical
    file-scoped lookup across both helpers.

  **What is UNCHANGED (per the decision memo + work
  order):**
  - `@rekon/capability-js-ts` import-fact producer.
    Production import facts still use
    `subject = "<file>:<target>"`,
    `value: { source, target, line }`. No producer
    migration. No artifact migration.
  - `listExportsForFile` / `listSymbolsForFile`. The
    compatibility branch is import-specific; export /
    symbol facts already use the
    `subject = file path` convention natively.
  - `EvidenceGraph` artifact `schemaVersion`. No bump.
  - All graph-aware filter behavior. The pipeline,
    decision shapes, `usedArtifacts`, `inputRefs`
    precision, and bucket reclassification from prior
    slices remain unchanged. The change is
    consumer-only at the helper layer.

  **Observable behavioral consequence:** the
  EvidenceGraph branches of
  `graphFilterRouteHandlerWithService`,
  `graphFilterRouteHttpMiddlewareOnly`, and
  `graphFilterExternalApiCommentOnly` now fire against
  `@rekon/capability-js-ts` production-shaped import
  facts. Previously the helper returned the empty
  array against production data (legacy
  `"<file>:<target>"` subject didn't match
  `subject === filePath`), so those filters always fell
  back to `Finding.details.imports` or
  `ObservedRepo.files` siblings. Operators may now see
  graph-aware suppressions that were previously
  invisible — none are new false positives (the
  underlying logic is unchanged); they were merely
  unreachable. Filter-health
  `byGraphAwareReason` / `dominantGraphAwareReason`
  surfaces are correspondingly more accurate, and
  `FindingFilterReport.header.inputRefs` cites
  `EvidenceGraph` for these matches as designed.

  **Tests.** 15 new contract tests at
  `tests/contract/import-helper-compatibility.test.mjs`
  cover: legacy subject shape returns target, future
  file-subject shape returns target, `value.source`
  authoritative-field behavior, mixed-shape dedupe,
  sorted output, `./src/foo.ts` ↔ `src/foo.ts`
  normalization, backslash normalization, anchored
  prefix matching (no `src/foo.tsx` ↔ `src/foo.ts`
  confusion), missing-target rejection,
  `listExportsForFile` non-regression,
  `listSymbolsForFile` non-regression,
  `fileImportsTargetMatching` parity, production JS/TS
  provider shape preservation,
  `rekon artifacts validate` cleanliness, and an
  end-to-end graph-aware filter case proving the
  EvidenceGraph branch now fires against
  production-shaped data. Full suite: 785 passed / 1
  skipped / 0 failed.

  Implements step 21 of the issue governance ADR
  Implementation Order. Strategy docs updated:
  `docs/strategy/import-fact-subject-shape-decision.md`
  (top blockquote marks Option B shipped);
  `docs/concepts/graph-aware-finding-filters.md`
  (helpers section documents the new
  `matchesFileSubject` precedence and dedupe);
  `docs/artifacts/evidence-graph.md` (Built-in Fact
  Kinds section notes Option B shipped);
  `docs/strategy/issue-governance-architecture-decision.md`
  (step 21 flipped to shipped; step 22 reserved for
  graph-aware import-fact consumers v4);
  `docs/strategy/classic-behavior-roadmap.md` and
  `docs/strategy/roadmap.md` (new implementation
  entry).

  Aligned to `lib/import-graph.ts`,
  `services/GraphBuildProvider.ts`, and
  `domain/graph/producers/**`. No new reason codes. No
  source-file reads at filter time. No AST, no type
  checker. No LLM, semantic, fuzzy, or embedding
  matching. No `GraphOntologyValidator` port. No new
  capability role. No new CLI subcommand or flag. No
  artifact `schemaVersion` bump. No new artifact type.
  No producer change. No version bump. No npm publish.

  Graph-aware import-fact consumers v4 (audit the three
  v1 / v2 graph-aware filter checks that prefer
  EvidenceGraph imports and confirm their EvidenceGraph
  branches now fire against production data) is the
  recommended next slice.

- Shipped import-fact subject-shape cleanup decision memo
  (P1.1 import-fact-subject-shape-decision slice).
  Strategy-only batch — no runtime behavior changes ship.

  The memo
  ([`docs/strategy/import-fact-subject-shape-decision.md`](docs/strategy/import-fact-subject-shape-decision.md))
  evaluates how Rekon should handle the inconsistency
  between the new `EvidenceGraph` export / symbol facts
  (`subject = file path`, shipped at `a776c58`) and the
  legacy import facts (`subject = "<file>:<target>"`).
  Five of six built-in fact kinds use the new
  file-subject convention; only `import` carries the
  legacy shape, and the legacy shape doesn't match what
  `@rekon/kernel-findings.listImportTargetsForFile`
  expects — so graph-aware filters that rely on
  EvidenceGraph import facts have been falling back to
  `Finding.details.imports` or `ObservedRepo.files`
  siblings unnoticed against production data.

  **Decision separation:**
  - **Option A** (migrate producer to
    `subject = file path` for import facts): clean end
    state but regenerates every existing `EvidenceGraph`
    artifact and risks breaking external consumers.
    **Preserved as a future trigger**, not chosen today.
  - **Option B** (compatibility-aware import helpers):
    update `listImportTargetsForFile` to recognize both
    legacy and file-subject shapes via a small
    `matchesFileSubject` predicate. No producer churn.
    No `schemaVersion` bump. Existing artifacts stay
    valid. **Recommended.**
  - **Option C** (leave as-is permanently): rejected.
    The surface promises file-scoped lookup; leaving it
    silently broken accumulates cost as more
    graph-aware checks land.

  **Future migration triggers for Option A** (any one
  sufficient): (1) helper compatibility logic exceeds
  ~3 callsites; (2) `EvidenceGraph` `schemaVersion`
  bump planned for unrelated reasons; (3) external
  capability authors report confusion; (4) import
  facts become a publication-facing artifact projection.

  **Compatibility contract.** Graph-aware consumers
  must use helper APIs for file-scoped fact lookups:
  `listImportTargetsForFile`, `listExportsForFile`,
  `listSymbolsForFile`. Raw `fact.subject` matching is
  permitted only by the fact's owning producer or by
  tests that own the exact shape they construct.

  Strategy docs updated:
  `docs/concepts/graph-aware-finding-filters.md`
  (helpers section references the new decision);
  `docs/artifacts/evidence-graph.md` (Built-in Fact
  Kinds table now points at the decision memo);
  `docs/strategy/graph-ontology-validator-lite-audit.md`
  (top blockquote updated with decision-shipped
  status);
  `docs/strategy/issue-governance-architecture-decision.md`
  (step 20 flipped to shipped; step 21 reserved for
  the helper compatibility implementation);
  `docs/strategy/classic-behavior-roadmap.md` and
  `docs/strategy/roadmap.md` (new decision memo
  entries).

  Implements step 20 of the issue governance ADR
  Implementation Order. Pinned by
  `tests/docs/import-fact-subject-shape-decision.test.mjs`
  (15 tests). No artifact `schemaVersion` bump. No new
  artifact type. No new capability role. No new CLI
  subcommand or flag. No new reason codes. No
  producer change. No helper change. No graph-aware
  filter change. No source-file reads. No LLM,
  semantic, fuzzy, or embedding matching. No
  `GraphOntologyValidator` port. No version bump. No
  npm publish.

  **Import helper compatibility implementation**
  (the follow-up slice that lands the actual
  `listImportTargetsForFile` compatibility branch +
  contract tests + the end-to-end CLI fixture) is the
  recommended next slice.

- Shipped graph-aware Next.js route export convention
  filter (P1.1 graph-aware-nextjs-route-export-filter v3
  slice) — the first v3 candidate check that consumes the
  new `EvidenceGraph` export facts substrate.

  **`@rekon/kernel-findings` new check
  `graphFilterNextjsRouteConvention`:**
  - Triggered by `type === "architecture"` + `ruleId ===
    "routes.single_http_handler_export"` + file ending in
    `route.ts`.
  - Reads `listExportsForFile(graphContext, file)`. When
    facts exist, computes the "extras" set by excluding
    default exports and HTTP method names (`GET` / `POST`
    / `PUT` / `PATCH` / `DELETE` / `HEAD` / `OPTIONS`).
  - When `extras` is non-empty AND every entry is in the
    Next.js segment-config set (`runtime` / `dynamic` /
    `revalidate` / `fetchCache` / `preferredRegion`),
    suppresses the finding with reason
    `nextjs-route-convention`, evidence naming the
    segment-config exports inspected,
    `confidence: "high"`, and
    `usedArtifacts: ["EvidenceGraph"]`.
  - When `extras` includes any non-segment-config name,
    the finding stays active (the route IS exporting an
    unexpected symbol).
  - Conservative no-op when no export facts exist for the
    file.

  **Graph evidence is authoritative.** New
  `isNextjsRouteConventionSupersededByGraph` helper gates
  the classic content fallback inside
  `applyFindingFilters`: when EvidenceGraph carries
  export facts for a route file's
  `routes.single_http_handler_export` finding, the
  classic content fallback
  (`details.otherExports`-based) is skipped — even when
  the detector-supplied `otherExports` would have looked
  clean. The graph-aware decision (filter or decline)
  stands.

  **`nextjs-route-convention` reclassified.** Moved from
  `CLASSIC_CONTENT_FILTER_REASONS` to
  `GRAPH_AWARE_FILTER_REASONS`. Filter-health now buckets
  matches as `graphAwareFiltered` whether the graph-aware
  stage or the classic content fallback fired. The
  shared-reason discipline established in
  graph-aware-filter-health-publications v1 holds: the
  reason code identifies the *kind of evidence*, not the
  layer that fired.

  **Tests.** 11 new contract tests at
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

  **Strategy docs updated:**
  - `docs/concepts/graph-aware-finding-filters.md` (table
    now lists six v1+v2+v3 checks; bucket-classifier
    description updated to six graph-aware reason codes).
  - `docs/concepts/finding-filters.md` (graph-aware
    section names the v3 check and its
    graph-authoritative behavior).
  - `docs/artifacts/finding-filter-report.md`
    ("Graph-Aware Filters" lists the new check).
  - `docs/strategy/graph-ontology-validator-lite-audit.md`
    (top blockquote updated with v3-check-shipped status).
  - `docs/strategy/issue-governance-architecture-decision.md`
    (step 19 flipped from `(future)` to `(shipped)`; step
    20 reserved for the import-fact subject-shape
    cleanup decision memo).
  - `docs/strategy/classic-behavior-roadmap.md` and
    `docs/strategy/roadmap.md` (new v3 check entries).

  Implements step 19 of the issue governance ADR
  Implementation Order. Aligned to
  `services/issues/content-filter-ruleid.ts` and
  `services/IssueDetectionService.ts`. No new reason
  codes. No source-file reads at filter time. No AST, no
  type checker. No LLM / semantic / fuzzy / embedding
  inference. No framework-wide Next.js catalog. No
  `GraphOntologyValidator` port. No new capability role.
  No new CLI subcommand or flag. No artifact
  `schemaVersion` bump. No new artifact type. No version
  bump. No npm publish. Full suite: 755 passed / 1
  skipped / 0 failed.

  Import-fact subject-shape cleanup decision memo (per
  the v1 substrate review packet's documented follow-up)
  is the recommended next slice.

- Shipped `EvidenceGraph` export / symbol facts projection
  v1 (P1.1 evidence-export-symbol-facts-v1 slice) — the
  substrate the graph-aware filter provider v3 decision
  memo recommended.

  **`@rekon/capability-js-ts` evidence provider extensions:**
  - New `kind: "export"` facts. `subject` = repo-relative
    file path; `value: { name, kind, default? }`. `kind`
    is one of `"function" | "class" | "const" | "let" |
    "var" | "type" | "interface" | "namespace" |
    "default" | "unknown"`. `default: true` only for
    `export default …` forms.
  - New `kind: "symbol"` facts. `subject` = repo-relative
    file path; `value: { name, kind, exported? }`.
    `exported` is `true` when the declaration itself
    begins with `export` (conservative: symbols
    re-exported via separate `export { ... }` clauses are
    NOT marked exported; the corresponding export fact
    captures the re-export side).
  - Extraction covers: named declaration exports
    (function / class / const / let / var / type /
    interface / namespace / enum), default exports
    (`export default function|class|<expression>`),
    `export { a, b as c }` named lists (renamed alias is
    the exported identifier; source is excluded),
    `export * from "..."` (`name: "*", kind:
    "namespace"`), `export * as alias from "..."`, and
    local declarations of every supported keyword.
  - Both kinds dedupe by `kind + subject + value` (line
    is intentionally NOT included in provenance so
    duplicate declarations on different lines collapse to
    one fact).
  - **No source-file reads at filter time** — extraction
    happens at evidence-extraction time (the provider's
    existing file scan). No AST, no type checker, no
    LLM, no semantic role inference.

  **`@rekon/kernel-findings` new exports:**
  - `listExportsForFile(context, filePath):
    FileExportSummary[]` — reads
    `EvidenceGraph` export facts and returns the
    sorted-by-name-then-kind summary list. Path matching
    uses `normalizeRepoPath`.
  - `listSymbolsForFile(context, filePath):
    FileSymbolSummary[]` — reads `EvidenceGraph` symbol
    facts the same way.
  - Both return the empty array when the graph is absent
    or has no facts for the file.

  **No graph-aware filter consumes the new facts yet.**
  The substrate ships alone, per the v3 memo's
  substrate-first discipline. Existing v1 + v2
  graph-aware filter behavior is unchanged (pinned by the
  new substrate test's "graph-aware filter behavior is
  unchanged in this substrate batch" case). Older
  `EvidenceGraph` artifacts continue to validate (no new
  artifact type, no `schemaVersion` bump).

  Strategy docs updated:
  `docs/artifacts/evidence-graph.md` (new "Built-in Fact
  Kinds" table + dedicated "Export / symbol facts
  (substrate v1)" section);
  `docs/concepts/graph-aware-finding-filters.md`
  (new helpers documented in the "v2 Helpers" section);
  `docs/strategy/graph-aware-filter-provider-v3-decision.md`
  (top blockquote updated with substrate-shipped status);
  `docs/strategy/graph-ontology-validator-lite-audit.md`
  (top blockquote updated with substrate-shipped status);
  `docs/strategy/issue-governance-architecture-decision.md`
  (step 18 flipped to shipped; step 19 reserved for the
  first v3 candidate check);
  `docs/strategy/classic-behavior-roadmap.md` and
  `docs/strategy/roadmap.md` (new substrate slice
  entries).

  Pinned by
  `tests/contract/evidence-export-symbol-facts.test.mjs`
  (13 tests). Full suite: 744 passed / 1 skipped / 0
  failed.

  Implements step 18 of the issue governance ADR
  Implementation Order (flipped from `(future)` to
  `(shipped)`). No artifact `schemaVersion` bump. No new
  artifact type. No new capability role. No new CLI
  subcommand or flag. No new reason codes. No source-file
  reads at filter time. No LLM, semantic, fuzzy, or
  embedding matching. No `GraphOntologyValidator` port.
  No version bump. No npm publish.

  The first v3 candidate check that consumes the new
  facts (strongest candidate per the v3 memo:
  strengthening `nextjs-route-convention` to confirm
  route file exports structurally) is the recommended
  next slice.

- Shipped graph-aware filter provider v3 decision memo —
  remaining classic checks (P1.1
  graph-aware-filter-provider-v3-decision slice).
  Strategy-only batch — no runtime behavior changes ship.
  The memo
  ([`docs/strategy/graph-aware-filter-provider-v3-decision.md`](docs/strategy/graph-aware-filter-provider-v3-decision.md))
  evaluates the ten most prominent remaining classic
  graph / ontology checks (UI HTTP provider abstraction,
  UI hook uses HTTP not DB, hardcoded config not DDE,
  module gate verified caller beyond current
  kind/path, framework-specific route segment config
  conventions, factory-by-capability beyond path,
  provider boundary / external API provider proof,
  runtime truth graph checks, full policy-owner parser,
  test / generated / external graph-ontology checks
  beyond paths) and concludes that **no broad v3 catalog
  ships next**.

  **Decision separation:**
  - **Port now:** zero checks. Every candidate either
    needs missing projections, is project-specific, or
    is permanently rejected.
  - **Needs missing projections first:** UI HTTP
    provider abstraction (deeper), UI hook uses HTTP
    not DB, framework-specific route segment config
    conventions, factory by capability beyond path,
    provider boundary / external API provider proof.
  - **Defer:** module gate verified caller beyond
    current kind/path (needs call-graph evidence),
    factory by capability (needs capability role
    taxonomy), runtime truth graph checks (needs
    runtime substrate — likely deferred indefinitely).
  - **Reject:** monolithic `GraphOntologyValidator`
    port, source-reading filters, LLM / semantic /
    fuzzy / embedding matching, project-specific
    hardcoded exception catalogs in core
    (`hardcoded-config-not-dde` belongs in an external
    rule pack), full policy-owner parser.

  **Required artifact projections identified
  (in priority order):**
  1. **`EvidenceGraph` export / symbol facts** —
     unblocks UI hook role, UI hook uses HTTP not DB,
     framework-specific route segment config beyond
     v2, capability-confirmed factory. Additive
     optional `kind: "export"` and `kind: "symbol"`
     facts on the existing `EvidenceGraph` (no new
     artifact type, no `schemaVersion` bump).
     **Recommended first.**
  2. **`CapabilityMap.entries[].role?: string`** —
     unblocks provider boundary / external API provider
     proof and a stronger capability-confirmed factory.
  3. **Call-graph / referrer evidence** — unblocks
     deeper module-gate caller confirmation and
     reverse-import test / generated / external
     confirmation.

  **Recommended next implementation:**
  `EvidenceGraph` export / symbol facts projection v1
  ships alone as the substrate. No graph-aware filter
  ports in the same slice — the substrate ships first,
  v3 candidate checks consume it in a follow-up.

  Strategy docs updated:
  `docs/strategy/graph-ontology-validator-lite-audit.md`
  (new "v3 Decision Follow-up" section + v2/v3 update
  blockquotes); `docs/strategy/issue-governance-architecture-decision.md`
  (step 17 flipped to shipped; step 18 reserved for the
  substrate); `docs/strategy/classic-guarantee-regression-plan.md`
  (v3 decision memo entry with pin to docs test);
  `docs/strategy/classic-subsystem-purpose-map.md` (row 6
  references v3 memo and substrate);
  `docs/strategy/classic-behavior-roadmap.md` and
  `docs/strategy/roadmap.md` (v3 decision memo entries).

  Pinned by
  `tests/docs/graph-aware-filter-provider-v3-decision.test.mjs`.
  No artifact `schemaVersion` bump. No new artifact
  type. No new capability role. No new CLI subcommand
  or flag. No new reason codes. No source-file reads.
  No LLM, semantic, fuzzy, or embedding matching. No
  `GraphOntologyValidator` port. No version bump. No
  npm publish.

  `EvidenceGraph` export / symbol facts projection v1 is
  the recommended next slice.

- Shipped graph-aware finding filter provider v2 — file-
  existence / import-evidence strengthening (P1.1
  graph-aware-finding-filter-provider-v2 slice).
  Strengthens the five v1 graph-aware checks with deeper
  artifact-backed evidence while preserving every prior
  invariant: no source-file reads, no LLM / semantic /
  fuzzy / embedding matching, no `GraphOntologyValidator`
  port, no new reason codes, raw `FindingReport` remains
  byte-identical, lifecycle / adjudication / coherency
  continue to exclude graph-filtered findings.

  **New pure helpers in `@rekon/kernel-findings`
  (exported):**
  - `normalizeRepoPath(path)` — strips leading `./` and
    backslashes; rejects absolute paths and `.rekon/`
    artifact paths (returns the empty string so consumers
    cannot accidentally match against them).
  - `sameRepoPath(a, b)` — comparison over normalized
    paths.
  - `siblingPath(filePath, siblingName)` — computes the
    sibling path in the same directory.
  - `listObservedRepoFiles(ctx)` — sorted, deduped,
    normalized `ObservedRepo.files`.
  - `observedRepoHasFile(ctx, path)` — membership test
    against `ObservedRepo.files`.
  - `findSiblingFile(ctx, filePath, siblingName)` —
    returns the sibling path when present in
    `ObservedRepo.files`, `undefined` otherwise.
  - `listImportTargetsForFile(ctx, filePath)` — reads
    `EvidenceGraph` import facts
    (`kind === "import"`, `subject === filePath`).
  - `fileImportsTargetMatching(ctx, filePath, predicate)`
    — filters the import targets through a predicate.

  **Strengthened checks:**
  - `route-handler-with-service` — strongest:
    `Finding.details.imports` handler entry; fallback:
    `EvidenceGraph` import fact pointing at a handler
    (`usedArtifacts: ["EvidenceGraph"]`); fallback:
    `ObservedRepo.files` sibling `handler.ts` /
    `handler.tsx` (`usedArtifacts: ["ObservedRepo"]`).
  - `route-http-middleware-only` — prefers
    `EvidenceGraph` import facts over
    `Finding.details.imports`. Filters only when at
    least one infra import exists AND every infra import
    lives under `/infra/http/` or `/infra/Identity`.
    No-op when no import evidence is available from
    either source.
  - `external-api-comment-only` — prefers
    `EvidenceGraph` import facts over
    `Finding.details.imports`. An explicit empty
    `details.imports: []` array still proves absence at
    medium confidence. No-op when no import evidence is
    available.
  - `factory-file-creates-deps` — path-only matches now
    return `usedArtifacts: []`; `CapabilityMap` matches
    return `usedArtifacts: ["CapabilityMap"]`. Evidence
    string distinguishes the two sources.
  - `module-gate-verified-caller` — prefers
    `OwnershipMap` + `ObservedSystem.kind === "module"`
    (medium, `usedArtifacts: ["OwnershipMap",
    "ObservedRepo"]`) over the bare `/modules/` path
    heuristic (medium, fallback only). The
    `GateEvaluator` path remains the strongest signal
    (high, `usedArtifacts: []`).

  **`FindingGraphFilterDecision.usedArtifacts`** — each
  graph-aware decision now returns a deduped list of
  artifacts that contributed evidence
  (`"ObservedRepo"` / `"EvidenceGraph"` /
  `"OwnershipMap"` / `"CapabilityMap"` /
  `"GraphSlice"`). Pure path / detector-import matches
  return an empty array.

  **`ApplyFindingFiltersResult.graphArtifactsUsed`** —
  `applyFindingFilters` collects per-decision
  `usedArtifacts` across the run into a sorted deduped
  array. Always present (possibly empty).

  **Pipeline reorder.** Graph-aware now runs *before*
  classic content (previously: after). When both layers
  can match the same finding, the graph-aware version
  takes credit so the audit trail names the strongest
  artifact-backed source. Classic content remains the
  fallback when graph-aware is no-op (missing artifacts).
  The five shared reason codes still bucket as
  `graphAwareFiltered` in filter-health regardless of
  which stage fired — bucket math is unchanged.

  **Runtime inputRefs precision.** `buildFindingFilterReport`
  now filters its loaded graph-input refs by
  `result.graphArtifactsUsed`, so
  `FindingFilterReport.header.inputRefs` cites only the
  artifacts that actually contributed to a match in this
  run. An artifact loaded into the graph context but
  never matched against is no longer cited.

  **Tests.** 17 new contract tests at
  `tests/contract/graph-aware-finding-filters-v2.test.mjs`
  cover: helper behavior (normalization, sibling lookup,
  import-target listing, predicate filtering), each
  strengthened check (sibling-file routing, EvidenceGraph
  routing, conservative no-op when evidence missing,
  non-allowed infra import rejection, openai-import
  rejection, GateEvaluator high-confidence,
  ObservedSystem.kind preferred over `/modules/`),
  conservative no-op across all checks, precise
  `graphArtifactsUsed` reporting (sorted + deduped),
  end-to-end CLI inputRefs citing (ObservedRepo only when
  sibling-file used, EvidenceGraph when import evidence
  used), raw `FindingReport` byte-identity, lifecycle /
  adjudication / coherency exclusion, and
  `rekon artifacts validate` cleanliness. Full suite:
  715 passed / 1 skipped / 0 failed.

  No artifact `schemaVersion` bump. No new artifact type.
  No new capability role. No new CLI subcommand or flag.
  No new reason codes. No source-file reads. No LLM,
  semantic, fuzzy, or embedding matching. No
  `GraphOntologyValidator` port. No version bump. No npm
  publish.

  Graph-aware filter provider v3 decision memo (review
  what remaining classic checks still warrant porting)
  is the recommended next slice.

- Shipped graph-aware filter surfacing in publications /
  filter health (P1.1
  graph-aware-filter-health-publications slice). The
  graph-aware finding filter provider v1 already suppressed
  structural false positives; this slice makes that work
  visible in operator-facing surfaces and adds two new
  dominance alerts.

  **`FindingFilterHealthSummary` extensions
  (`@rekon/kernel-findings`):**
  - New `graphAwareFiltered: number` bucket — split out of
    `contentFiltered`. The five graph-aware reason codes
    (`route-handler-with-service`,
    `route-http-middleware-only`,
    `external-api-comment-only`,
    `factory-file-creates-deps`,
    `module-gate-verified-caller`) are now classified as
    graph-aware whenever their entry is not policy-sourced.
    Buckets remain mutually exclusive; `policyFiltered +
    contentFiltered + graphAwareFiltered + resultFiltered +
    builtInPathFiltered` always equals `totalFiltered`.
  - New `byGraphAwareReason: Record<string, number>` — raw
    counts computed only over entries that pass
    `isGraphAwareFiltered`, so a policy entry sharing a
    graph-aware reason code does not inflate the table.
    Always present (empty when no graph-aware filter fired).
  - New
    `filterRateByGraphAwareReason: Record<string, number>` —
    rates rounded to four decimals.
  - New
    `dominantGraphAwareReason?: { reason; count; rate }` —
    alphabetic tiebreak; present when at least one
    graph-aware filter fired.
  - New helper `isGraphAwareFiltered(entry)` is exported.
    Policy entries take precedence — an entry with
    `source: "policy"` (or a `policyId`) is classified as
    policy, never graph-aware, even if its reason code is
    graph-aware.

  **Two new alerts (both gated on `totalFindings >= 5`):**
  - `graph-aware-filter-dominance` — fires when
    `graphAwareFiltered / totalFindings >= 0.5`. Message:
    "Graph-aware filter is dominant — review
    `FindingFilterReport.filteredFindings`."
  - `graph-aware-reason-dominance` — fires when
    `dominantGraphAwareReason.rate >= 0.5`. Message names
    the dominant reason.
  Alerts remain sorted by `code` for deterministic output.

  **Architecture summary publication
  (`@rekon/capability-docs.architecture-summary`):**
  - The `Finding Filter Health` section renders an extra
    `- Graph-aware filtered findings: <n>` bullet alongside
    the existing kept / filtered / built-in-path counts.
  - When `graphAwareFiltered > 0` (or the count map is
    populated), the section also renders a dedicated
    `### Graph-Aware Filter Reasons` table sourced from
    `byGraphAwareReason` (alphabetic) plus an audit pointer
    paragraph: "Inspect `FindingFilterReport.filteredFindings`
    for the structural evidence behind each graph-aware
    match (sibling-file existence, import-graph facts,
    capability ownership, module-kind routing)."
  - The new alert codes surface in the existing alerts
    table when their thresholds fire.

  **Agent contract publication
  (`@rekon/capability-docs.agent-contract`):**
  - The `Finding Filter Health` subsection adds the
    graph-aware count bullet.
  - When `graphAwareFiltered > 0`, the subsection adds an
    explicit audit instruction: "If graph-aware filtering
    is high, inspect `FindingFilterReport.filteredFindings`
    for the structural evidence (sibling-file existence,
    import-graph facts, capability ownership, module-kind
    routing) before drawing conclusions."
  - New "Do Not Do" entry: "Do not treat graph-aware
    filtering as proof that the underlying issue never
    existed; inspect `FindingFilterReport.filteredFindings`
    for the structural evidence (sibling-file existence,
    import-graph facts, capability ownership, module-kind
    routing) before drawing conclusions."

  **Tests.** 16 new contract tests at
  `tests/contract/graph-aware-filter-health-publications.test.mjs`
  pin: classifier behavior (the five graph-aware reasons,
  policy precedence, content-bucket exclusion), bucket
  math (counts sum to `totalFiltered`,
  `byGraphAwareReason` is not inflated by policy entries),
  rate / dominant-reason calculations with alphabetic
  tiebreak, both alerts' thresholds (50 % rate + 5-finding
  minimum corpus), publication rendering (architecture
  summary table + audit pointer, agent contract count +
  audit instruction + Do Not Do reminder), alert codes
  appearing in publication alert tables when present, and
  `rekon artifacts validate` cleanliness after publishing
  both surfaces with seeded graph-aware fixtures. Full
  suite holds at 698 passed / 1 skipped / 0 failed.

  No artifact `schemaVersion` bump. No new artifact type.
  No new capability role. No new CLI subcommand or flag.
  No new reason codes. No source-file reads. No LLM,
  semantic, fuzzy, or embedding matching. No
  `GraphOntologyValidator` port. No version bump. No npm
  publish.

  Graph-aware filter provider v2 (file-existence /
  import-evidence strengthening) is the recommended next
  slice.

- Shipped graph-aware finding filter provider v1 (P1.1
  graph-aware-finding-filter-provider v1 slice). Implements
  the five port-soon candidate checks from the
  [GraphOntologyValidator-lite audit](docs/strategy/graph-ontology-validator-lite-audit.md)
  while preserving every audit invariant: no source-file
  reads, no LLM / semantic / fuzzy / embedding matching,
  no monolithic validator, filtered findings remain
  auditable in `FindingFilterReport.filteredFindings`, raw
  `FindingReport` is never mutated.

  **Repo-model projections (shipped first):**
  - `ObservedRepo.files?: string[]` — flat, sorted,
    repo-relative file index. Absolute paths and `.rekon/`
    artifact paths are dropped at the kernel boundary.
    Populated by `@rekon/capability-model.projector` from
    `kind: "file"` evidence facts.
  - `ObservedSystem.kind?: string` — optional structural
    kind (`module` / `service` / `route` / `ui` /
    `infra` / `unknown` / custom). Survives normalization
    across system merges.
  Both fields are additive optional; older artifacts
  continue to validate and serialize unchanged. No
  `schemaVersion` bump.

  **New exports from `@rekon/kernel-findings`:**
  - `FindingGraphFilterContext` (type).
  - `FindingGraphFilterDecision` (type).
  - `EvidenceGraphLike`, `ObservedRepoLike`,
    `OwnershipMapLike`, `CapabilityMapLike`,
    `GraphSliceLike`, `EvidenceFactLike` (structural
    sub-shapes — the kernel stays free of
    `kernel-repo-model` / `kernel-evidence` /
    `kernel-graph` runtime deps; real artifacts are
    structurally compatible).
  - `applyFindingGraphFilters({ finding, graphContext })`
    — pure deterministic helper. Iterates five private
    case functions in fixed order; returns the first
    matching decision or `null`.

  **Five checks (all reuse existing v2 reason codes — no
  new codes were introduced):**
  - `route-handler-with-service` —
    `Finding.details.imports` includes a `*/handler`
    import OR `ObservedRepo.files` lists a sibling
    `<dir>handler.ts` / `<dir>handler.tsx`.
  - `route-http-middleware-only` — every `/infra/`
    import under `details.imports` lives under
    `/infra/http/` or `/infra/Identity`.
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

  **Pipeline integration.** `applyFindingFilters` now runs
  filters in fixed priority order:
  `policy → classic content → graph-aware →
  built-in path → result`. The pipeline short-circuits
  on the first match. Graph-aware filters land at priority
  level `15` between the content layer and the broad path
  heuristics so a structural match always wins over a
  generic path heuristic but never over an
  operator-supplied policy.

  **Runtime integration.** `buildFindingFilterReport`
  reads the latest `ObservedRepo` / `OwnershipMap` /
  `CapabilityMap` / `EvidenceGraph` from the store and
  threads them as `graphContext`. New
  `BuildFindingFilterReportOptions.useGraphContext?` lets
  callers opt out (defaults `true`).
  `FindingFilterReport.header.inputRefs` cites a graph
  artifact only when at least one graph-aware match
  actually used the data — so the audit lists exactly the
  evidence the report depended on. Missing graph artifacts
  → conservative no-op (the relevant check does not fire).

  **Tests:** new
  `tests/contract/graph-aware-finding-filters.test.mjs`
  (20 assertions; all passing): 4 repo-model projection
  tests, 11 graph-helper / pipeline tests, 5 end-to-end
  CLI tests covering refresh-populates-files,
  sibling-handler match through CLI with `ObservedRepo`
  `inputRef` citation, lifecycle / adjudication /
  coherency exclusion, raw `FindingReport` byte-identity,
  and `rekon artifacts validate` cleanliness. Full suite:
  **682 passed / 1 skipped / 0 failed**.

  Docs:
  - New
    [`docs/concepts/graph-aware-finding-filters.md`](docs/concepts/graph-aware-finding-filters.md).
  - `docs/concepts/finding-filters.md` — new
    "Graph-aware filters (v1)" entry in the Reasons list.
  - `docs/artifacts/finding-filter-report.md` — new
    "Graph-Aware Filters (v1)" section.
  - `docs/concepts/refresh.md` — `findings.filter` step
    description expanded to mention graph-aware filters.
  - `docs/strategy/graph-ontology-validator-lite-audit.md`
    — status note updated to reflect v1 shipped.
  - ADR Implementation Order step 14 flipped to shipped;
    new step 15 "Graph-aware filter provider v1 surfaces
    in publications / filter health"; old step 15
    renumbered to 16.
  - Four strategy docs (subsystem-purpose-map,
    behavior-roadmap, guarantee-regression-plan, roadmap).
  - CHANGELOG. Review packet:
    `.rekon-dev/review-packets/graph-aware-finding-filter-provider-v1.md`.

  Aligned to `infra/validation/GraphOntologyValidator.ts`,
  `services/IssueDetectionService.ts`,
  `services/issues/content-filters.ts`,
  `services/issues/content-filter-ruleid.ts`,
  `services/issues/content-filter-architecture.ts`,
  `services/issues/filter-health.ts`,
  `domain/issues/evaluators/**`,
  `services/GraphBuildProvider.ts`,
  `domain/graph/producers/**`. No new artifact type. No
  artifact `schemaVersion` bump (additive optional fields
  only). No new capability role. No new CLI subcommand
  or flag. No new reason codes. No LLM / semantic /
  fuzzy / embedding matching. No `GraphOntologyValidator`.
  No source-file reads from filter logic. No version
  bump. No npm publish.
- Shipped `GraphOntologyValidator`-lite parity audit (P1.1
  graph-ontology-validator-lite-audit slice). Docs-only
  decision memo — no runtime behavior changes, no new
  public API, no `schemaVersion` bump, no version bump,
  no npm publish.

  New strategy doc:
  [`docs/strategy/graph-ontology-validator-lite-audit.md`](docs/strategy/graph-ontology-validator-lite-audit.md).

  Decision: **do not** port classic
  `GraphOntologyValidator` as a monolithic service.
  Reproduce the *outcome* (filtered findings with
  structural evidence preserved in
  `FindingFilterReport.filteredFindings`), not the
  architecture (one service that scrapes source, builds
  graph, resolves rules, applies exceptions). The
  Rekon-native shape is a future capability-level
  **graph-aware finding filter provider** that consumes
  the existing `EvidenceGraph`, `GraphSlice`,
  `ObservedRepo`, `OwnershipMap`, and `CapabilityMap`
  artifacts and contributes decisions to
  `applyFindingFilters` via a new optional
  `graphContext` input. The provider emits
  `FilteredFinding` entries with `source: "system"`
  reusing existing v2 reasons — no new artifact type, no
  new reason codes.

  Audit classifies every classic check as
  **covered** (already shipped by content/result filters
  v2), **port-soon**, **defer**, or **rejected**:
  - **Port-soon (5):** route handler with sibling
    (`route-handler-with-service`), route HTTP middleware
    only (`route-http-middleware-only`), external-API
    comment only (`external-api-comment-only`), factory
    file creates deps (`factory-file-creates-deps`),
    module gate verified caller
    (`module-gate-verified-caller`). All five already
    have v2 structural filters; the graph provider adds
    artifact-backed confirmation when the upstream
    detector did not emit the right `details` payload.
  - **Defer:** full graph ontology validation suite,
    framework-specific exception catalog
    (DDE / Next.js / provider semantics), runtime truth
    graph (no runtime substrate yet), source-reading
    classifier (violates artifact-first invariant),
    factory-by-capability signal until `CapabilityMap`
    strength is proven, persistent
    `filtered-issues.json` merge semantics
    (`FindingFilterReport` artifact history is enough).
  - **Rejected:** monolithic validator port,
    source-file reads from filter logic, LLM / semantic /
    fuzzy / embedding review, filter logic that mutates
    `FindingReport` or `FindingFilterReport`.

  Required artifact projections (ship **first**, before
  any filter logic): a flat file index — likely
  `ObservedRepo.files?: string[]` —, and an optional
  `ObservedSystem.kind?: "module" | "package" | ...`
  field. Building filter logic that quietly returns no
  matches because the upstream artifact is empty would
  defeat the audit.

  Audit also includes:
  - per-check input table (`Check`, `Required inputs`,
    `Currently available?`, `Missing artifact/data`,
    `Suggested producer`),
  - 12 future regression test scenarios for the next
    implementation slice,
  - recommended implementation order
    (artifact projections → capability skeleton → five
    checks one at a time → docs → ADR / strategy
    updates),
  - capability shape sketch with the
    `GraphAwareFindingFilterProvider` interface.

  New docs test
  `tests/docs/graph-ontology-validator-lite-audit.test.mjs`
  asserts the audit's structure, decisions, and
  cross-references (audit doc exists, decision summary
  rejects monolithic port, references each required
  artifact + future provider, port-soon + defer
  classifications present, artifact-inputs + regression
  tests sections present, ADR + CHANGELOG entries
  present). Full suite passes.

  Strategy docs updated:
  - ADR Implementation Order step 13 flipped from
    `(future)` to `(shipped)`; new step 14 "Graph-aware
    finding filter provider v1"; old step 14 renumbered
    to 15.
  - Subsystem-purpose-map: subsystem 6 row appended with
    the audit; next-slice column changed to "Graph-aware
    finding filter provider v1"; status string updated
    with `+ graph-ontology-validator-lite-audit`.
  - Behavior-roadmap: new detailed entry for the audit
    slice with classic-source alignment, classified
    checks, rejected approaches, and the next
    recommended slice.
  - Classic-guarantee-regression-plan: new shipped entry
    "`GraphOntologyValidator`-lite parity audit" pinned
    by the new docs test.
  - Roadmap: new bullet for the audit slice.
  - CHANGELOG: this entry.

  Review packet:
  `.rekon-dev/review-packets/graph-ontology-validator-lite-audit.md`.

  Aligned to
  `infra/validation/GraphOntologyValidator.ts`,
  `services/IssueDetectionService.ts`,
  `services/issues/content-filters.ts`,
  `services/issues/content-filter-ruleid.ts`,
  `services/issues/content-filter-architecture.ts`,
  `services/issues/filter-health.ts`,
  `domain/issues/evaluators/**`,
  `domain/issues/RulesResolver.ts`,
  `services/GraphBuildProvider.ts`,
  `domain/graph/producers/**`. No runtime change; no
  new artifact type; no `schemaVersion` bump; no new
  capability role; no new CLI subcommand; no version
  bump; no npm publish.
- Shipped filter policy operator workflow polish (P1.1
  filter-policy-status v1 slice). New CLI surface
  `rekon findings filter-policy status [--policy <id>]
  [--warnings-only] [--unused-only]` is a read-only operator
  workflow that combines the configured `findingFilters`
  policy set with the latest `FindingFilterReport`,
  `FindingFilterHealthReport`, and
  `FindingFilterPolicySuggestionReport` into a single
  structured JSON document so operators can audit
  policy health without manually combining several
  artifacts. The command is **strictly read-only**.
  `.rekon/config.json` is never mutated;
  `rekon findings filter-policy apply` remains the only
  command that writes config. Malformed config fails
  clearly with a "Failed to parse" error and leaves the
  file unchanged.

  Per-policy entries report:
  - `id`, `reason`, optional `confidence`, full `matchers`
    block.
  - `usageCount` (from
    `FindingFilterReport.summary.byPolicy`).
  - `usageRate` (from
    `FindingFilterHealthReport.summary.filterRateByPolicy`
    or recomputed from `usageCount / totalFindings`).
  - `filteredFindingIds` — sorted list of finding ids the
    policy suppressed in the latest filter run.
  - `warnings[]` and `recommendedActions[]` derived
    deterministically.
  - Convenience flags `isUnused`, `isDominant`,
    `isLowConfidence`, `isBroadPattern`.

  Per-policy warning codes:
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
    policy when the current vs. report fingerprint
    digests diverge.

  Global warnings:
  - **`missing-filter-report`** — no
    `FindingFilterReport` indexed yet.
  - **`missing-filter-health`** — `FindingFilterReport`
    exists but `FindingFilterHealthReport` does not.

  Freshness mirrors filter-policy-freshness v2 with four
  states: `fresh` / `stale` / `missing-report` / `unknown`.
  On stale / missing / unknown, the response includes a
  `recommendedCommand` (typically `rekon refresh`).

  Suggestions are rendered as advisory records with
  `dryRunCommand` + `applyCommand` strings. Low-confidence
  suggestions append `--force` to both. The status command
  **never** applies suggestions on its own initiative.

  Optional flags filter the rendered `policies` array
  without touching `summary` counts (always computed over
  the full policy set). The CLI emits a
  `renderedPolicyCount` field at the top level so callers
  can see how many entries the filter left.

  New exports from `@rekon/kernel-findings`:
  - `summarizeFindingFilterPolicyStatus(input)` — pure
    deterministic helper.
  - `FindingFilterPolicyStatusResult` (type).
  - `FindingFilterPolicyStatusEntry` (type).
  - `FindingFilterPolicyStatusSuggestion` (type).
  - `FindingFilterPolicyStatusSummary` (type).
  - `FindingFilterPolicyStatusWarning` (type).
  - `FindingFilterPolicyStatusFreshness` (union type).
  - `SummarizeFindingFilterPolicyStatusInput` (type).

  New file-local CLI helper
  `readLatestArtifactOrUndefined<T>(store, artifactType)`
  factors out the read-the-latest pattern shared by this
  command and future read-only surfaces.

  18 new contract tests in
  `tests/contract/finding-filter-policy-status.test.mjs`
  cover: 11 pure-helper tests (total / used / unused
  counts; current + report fingerprints; freshness fresh /
  stale + recommended `rekon refresh`; every per-policy
  warning; missing filter / health global warnings;
  suggestions with `--force` appended for low-confidence)
  plus 7 CLI behavior tests (no-mutation guarantee on
  fresh + populated workspaces, malformed-config failure
  without write, `--policy` / `--warnings-only` /
  `--unused-only` narrowing, existing
  `suggest` / `list` behavior unchanged, and
  `rekon artifacts validate` cleanliness). Full suite:
  **647 passed / 1 skipped / 0 failed**.

  Docs:
  - New
    `docs/concepts/finding-filter-policy-status.md`.
  - `docs/concepts/finding-filter-policy-suggestions.md`
    — CLI surface lists the new command; new bullet in
    the pipeline list.
  - `docs/concepts/finding-filters.md` — new "Auditable
    via `rekon findings filter-policy status`" bullet.
  - `docs/artifacts/finding-filter-health-report.md` —
    Consumed By entry naming the new command.
  - `docs/strategy/issue-governance-architecture-decision.md`
    — Implementation Order step 11 flipped to shipped;
    new step 12 "Filter policy explicit disable / remove
    workflow" and step 13 "`GraphOntologyValidator`-lite
    parity audit".
  - Four strategy docs (subsystem-purpose-map,
    behavior-roadmap, guarantee-regression-plan, roadmap).
  - README adds an example invocation.
  - CHANGELOG. Review packet:
    `.rekon-dev/review-packets/finding-filter-policy-status-v1.md`.

  No artifact `schemaVersion` bump. No new artifact type.
  No new capability role. No new write permission. No
  LLM, semantic, fuzzy, or embedding matching. No
  `GraphOntologyValidator`. No watcher / daemon. No
  version bump. No npm publish.
- Shipped filter-health diagnostics v2 (P1.1
  filter-health-diagnostics v2 slice).
  `FindingFilterHealthReport.summary` gains six additive
  diagnostic fields and `buildFindingFilterHealth` emits six
  new deterministic alerts so operators can see whether
  filtering is healthy, over-broad, stale, policy-heavy,
  low-confidence, or dominated by a single filter class.
  Filtering decisions are not affected; raw
  `FindingReport` / `FindingFilterReport` /
  `FindingFilterHealthReport` are not mutated.

  New `FindingFilterHealthSummary` fields:
  - **`builtInPathFiltered`** — count of findings suppressed
    by built-in path / content heuristics
    (`generated-file` / `external-file` / `test-file` /
    `canary-file` / `content-filter` /
    `explicit-exclusion` / `policy-exception` / `other`).
    Combined with `policyFiltered` / `contentFiltered` /
    `resultFiltered`, all four buckets sum to
    `totalFiltered`.
  - **`filterRateByReason`** —
    `byReason[reason] / totalFindings` rounded to four
    decimals.
  - **`filterRateByPolicy?`** — per-policy rate; present
    when `byPolicy` is non-empty.
  - **`dominantReason?`** — `{ reason, count, rate }` for
    the reason that suppressed the most findings (alphabetic
    tiebreak).
  - **`dominantPolicy?`** — `{ policyId, count, rate }` for
    the configured policy that suppressed the most findings
    (alphabetic tiebreak).
  - **`policyFingerprint?`** — mirror of the upstream
    `FindingFilterReport.policyFingerprint` so health
    consumers don't have to re-read the filter report.

  Six new deterministic alerts (sorted by code; existing
  alerts unchanged):
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

  Dominance thresholds (50 % rate + 5-finding minimum
  corpus) are deliberately lower than the over-filtering
  thresholds above (80 %). They surface a different failure
  mode: one rule / category dominating even when the
  overall filter rate is moderate.

  New exported classifiers from `@rekon/kernel-findings`:
  - **`isPolicyFiltered(entry)`** — `source === "policy"` or
    `policyId` set.
  - **`isResultFiltered(entry)`** — non-policy entry whose
    reason is in the 4-case result-filter set.
  - **`isClassicContentFiltered(entry)`** — non-policy entry
    whose reason is in the 17-case classic content set.
  - **`isBuiltInPathFiltered(entry)`** — non-policy entry
    whose reason is in the 8-case built-in path /
    content set.
  Policy takes precedence; the other three buckets are
  mutually exclusive over the remainder.

  Plumbing: `buildFindingFilterHealth` /
  `createFindingFilterHealthReport` (kernel) and
  `buildFindingFilterHealthReport` (runtime) accept an
  optional
  `currentPolicyFingerprint: FindingFilterPolicyFingerprint`
  (additive). `rekon findings filter-health` and
  `rekon refresh` fingerprint the current
  `.rekon/config.json findingFilters` via the existing
  `loadFindingFilterPolicies` +
  `fingerprintFindingFilterPolicies` and forward it so the
  report can emit `stale-policy-fingerprint` /
  `policy-fingerprint-missing` alerts locally — mirroring
  the freshness warnings the architecture summary / agent
  contract publishers already render. The CLI JSON output
  for `rekon findings filter-health` echoes
  `currentPolicyFingerprint` so operators can confirm what
  was loaded.

  Publication impact: no shape change. The architecture
  summary and agent contract render
  `FindingFilterHealthReport.alerts` generically (code +
  message), so the six new alert codes surface
  automatically in the existing Filter Health table /
  subsection.

  17 new contract tests in
  `tests/contract/finding-filter-health-diagnostics-v2.test.mjs`
  cover: 13 pure-helper tests for the classifiers, every
  new alert (including `policy-fingerprint-missing` /
  `stale-policy-fingerprint` and the negative "no
  stale-policy-fingerprint when fingerprints match" case),
  the four bucket-sum invariant, dominant-reason /
  dominant-policy tiebreak, and the
  `low-confidence-filtered` count refinement; plus 4
  end-to-end CLI tests covering `rekon findings filter-health`
  echoing the fingerprint, `rekon refresh` producing a
  fresh-fingerprint report, publications surfacing the new
  alert codes via existing generic tables, and
  `rekon artifacts validate` cleanliness. Full suite: 629
  passed / 1 skipped / 0 failed.

  Docs updated:
  - `docs/artifacts/finding-filter-health-report.md` — Shape
    gains six new diagnostic fields; alerts table includes
    the six new diagnostics v2 alert codes (13 total).
  - `docs/concepts/finding-filters.md` — Health Alerts
    section expanded to list all 13 alerts; new
    "Classification helpers" subsection documenting the
    four classifiers + policy-takes-precedence rule.
  - `docs/strategy/issue-governance-architecture-decision.md`
    — Implementation Order step 10 flipped to shipped + new
    step 11 "Filter policy operator workflow polish".
  - Four strategy docs (subsystem-purpose-map,
    behavior-roadmap, guarantee-regression-plan, roadmap).
  - CHANGELOG. Review packet:
    `.rekon-dev/review-packets/finding-filter-health-diagnostics-v2.md`.

  No artifact `schemaVersion` bump (additive optional
  fields). No new artifact type. No new capability role. No
  new CLI subcommand or flag. No LLM, semantic, fuzzy, or
  embedding matching. No `GraphOntologyValidator`. No
  watcher / daemon. No version bump. No npm publish.
- Shipped classic issue filtering parity v2 — content/result
  filter expansion (P1.1 classic-content-result-filters v2
  slice). `FindingFilterReason` extended additively with 17
  classic-inspired content reasons that mirror
  codebase-intel-classic's content-filtering pipeline plus 4
  result-filter reasons for the operator-configured surface
  filter (`minConfidence` / `severity` / `systems` /
  `pathExcludes`). Every filtered finding remains auditable
  via `FindingFilterReport.filteredFindings`; raw
  `FindingReport` is never mutated; operator status decisions
  (`accepted` / `ignored` / `resolved`) remain in
  `FindingStatusLedger` and are not used as a substitute.

  Content filter reasons (17 cases, all `source: "system"`):
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

  Result filter reasons (4 cases):
  - `below-min-confidence` — finding's
    `details.minCapabilityConfidence` is below the
    configured floor.
  - `below-min-severity` — finding's severity is below the
    configured floor (critical > high > medium > low).
  - `outside-selected-system` — finding's `details.system` /
    `details.ownerSystems` don't overlap the allowed list.
  - `configured-path-exclusion` — finding's files match an
    operator-configured glob pattern.

  `Finding` gains an additive optional
  `details?: Record<string, unknown>` field for detectors to
  surface structured detail (`stubName`, `stubReason`,
  `imports`, `envVars`, `evidence`, `decisionConcerns`,
  `decisionCapabilities`, `concernTag`, `owner.kind`,
  `otherExports`, `minCapabilityConfidence`, `system`,
  `ownerSystems`). The field is treated as opaque by
  downstream consumers that don't specifically know how to
  interpret it. No schemaVersion bump.

  New exports from `@rekon/kernel-findings`:
  - `FindingContentFilterContext` (type).
  - `FindingContentFilterDecision` (type).
  - `FindingResultFilterOptions` (type).
  - `applyFindingContentFilters({ finding })` — pure
    deterministic function returning the first matching
    decision or `null`. Synchronous, side-effect-free.
  - `applyFindingResultFilters(finding, options)` — pure
    deterministic function over
    `FindingResultFilterOptions`.
  - `validateFindingResultFilterOptions(value)` — structural
    validator returning `{ options, issues }` (issue codes:
    `finding-result-filters-not-object`,
    `finding-result-filters-min-confidence-invalid`,
    `finding-result-filters-severity-invalid`,
    `finding-result-filters-systems-invalid`,
    `finding-result-filters-systems-entry-invalid`,
    `finding-result-filters-path-excludes-invalid`,
    `finding-result-filters-path-excludes-entry-invalid`,
    `finding-result-filters-path-excludes-absolute`,
    `finding-result-filters-path-excludes-traversal`).

  `applyFindingFilters` now runs filters in fixed priority
  order: **policy → classic content → built-in path →
  result**. The pipeline short-circuits on the first match.
  Classic content filters land at priority `10`-`12`;
  result filters at `20`; broad path heuristics at `0`-`5`.

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
  number in `[0, 1]`; `severity` is one of
  `critical` / `high` / `medium` / `low`; `systems` is an
  array of non-empty strings; `pathExcludes` is an array of
  project-relative glob patterns (absolute paths and `..`
  traversal are rejected). The CLI loader is best-effort:
  invalid entries are dropped at the loader boundary so a
  malformed config doesn't blow up refresh —
  `rekon config validate` is the full diagnostic.
  `rekon findings filter` / `rekon findings filter-health` /
  `rekon refresh` all load and pass result filters through.
  `BuildFindingFilterReportOptions` and
  `BuildFindingFilterHealthReportOptions` gain optional
  `resultFilters?: FindingResultFilterOptions` (additive).

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

  24 new contract tests in
  `tests/contract/finding-content-result-filters.test.mjs`
  cover: 10 content-filter helper tests (cases A, D, E, F,
  G, I, M, O, Q + normal-finding kept), 7 result-filter
  helper tests (`minConfidence` / `severity` / `systems` /
  `pathExcludes` + non-silent-drop +
  `validateFindingResultFilterOptions` accept + reject),
  and 7 end-to-end CLI tests covering `rekon config validate`
  acceptance + rejection, `rekon findings filter` loading
  result filters and writing audit entries, lifecycle /
  adjudication / coherency excluding result-filtered
  findings, raw `FindingReport` integrity,
  `rekon artifacts validate` cleanliness, and the new
  `content-filter-high-volume` /
  `result-filter-over-filtering` alerts. Full suite: 612
  passed / 1 skipped / 0 failed.

  Docs updated:
  - `docs/concepts/finding-filters.md` — "Classic Content
    Filters" table (17 cases) + "Classic Result Filters"
    section; "Health Alerts" expanded to 7 alerts.
  - `docs/artifacts/finding-filter-report.md` — new
    "Classic-Inspired Content / Result Filters (v2)"
    section documenting pipeline order, `Finding.details`,
    and configured `findingResultFilters`.
  - `docs/artifacts/finding-filter-health-report.md` —
    shape gains `contentFiltered` / `resultFiltered`
    counts; alerts table includes the two new v2 alerts.
  - `docs/strategy/issue-governance-architecture-decision.md`
    — Implementation Order step 9 flipped to shipped + new
    step 10 "Filter-health diagnostics v2".
  - Four strategy docs (subsystem-purpose-map,
    behavior-roadmap, guarantee-regression-plan, roadmap).
  - CHANGELOG. Review packet:
    `.rekon-dev/review-packets/finding-content-result-filters-v2.md`.

  No artifact `schemaVersion` bump (additive optional
  field). No new artifact type. No new capability role. No
  new CLI subcommand or flag. No LLM, semantic, fuzzy, or
  embedding matching. No `GraphOntologyValidator`. No
  watcher / daemon. No version bump. No npm publish.
- Shipped configured filter policy freshness / publication
  guardrails (P1.1 filter-policy-freshness v2 slice).
  `FindingFilterReport` now carries an additive optional
  `policyFingerprint: { digest, ruleCount, ruleIds }` — an
  order-sensitive fingerprint of the `findingFilters` policy
  set the filter run used. Order matters because
  `applyFindingFilters` runs policies in declared order and the
  first match wins. Two policy sets with the same rules in a
  different order produce different fingerprints. New exported
  helper `fingerprintFindingFilterPolicies(policies)` in
  `@rekon/kernel-findings` canonicalizes each rule (drops
  undefined matchers, preserves array order) and digests with
  the existing `digestJson` SHA-256 helper.
  `buildFindingFilterReport` always stamps the fingerprint —
  including the empty-policy fingerprint when no rules are
  configured — so future comparisons can distinguish "no
  fingerprint recorded" (older reports → `unknown`) from "ran
  with zero policies" (`ruleCount: 0`).

  `@rekon/capability-docs.architecture-summary` and
  `@rekon/capability-docs.agent-contract` now read the current
  `.rekon/config.json` `findingFilters` via the new
  `loadCurrentFindingFilterPolicies(repoRoot)` helper,
  fingerprint the result, and compare against the latest
  `FindingFilterReport.policyFingerprint` via the new pure
  `computeFilterPolicyStaleness({ currentFingerprint,
  filterReport })` helper. Status is one of:
  - **`fresh`** — fingerprints match.
  - **`stale`** — fingerprints diverge; the operator changed
    `findingFilters` after the latest filter run. Active
    governance (lifecycle / adjudication / coherency /
    publications) may be stale until `rekon refresh`.
  - **`missing`** — no `FindingFilterReport` indexed.
  - **`unknown`** — latest `FindingFilterReport` predates
    filter-policy-freshness v2 and has no fingerprint.

  Architecture summary renders `## Finding Filter Policy
  Freshness` between `## Finding Filter Health` and
  `## Finding Filter Policy Suggestions`. The section lists
  the status, the current config fingerprint, and the report
  fingerprint (12-char short-digest + rule count). On `stale`
  it emits a blockquote: "`.rekon/config.json` `findingFilters`
  changed after the latest FindingFilterReport was produced.
  Active governance may be stale. Run `rekon refresh` to
  rebuild the filter chain with the current policy set."
  `missing` / `unknown` emit the same recommendation.

  Agent contract renders the matching `### Finding Filter
  Policy Freshness` subsection under `Active Governance State`
  and on `stale` emits a louder blockquote: "Do not rely on
  active governance until `rekon refresh` rebuilds findings
  with the current `findingFilters` config." The agent
  contract's `Do Not Do` list gains a third filter-related
  reminder: "Do not rely on active issue / coherency counts
  after `.rekon/config.json` `findingFilters` changed until
  `rekon refresh` has rebuilt the filter chain with the
  current policy set."

  `rekon findings filter-policy apply` JSON output gains three
  new fingerprint fields:
  - `currentPolicyFingerprint` — state before apply (always
    emitted).
  - `projectedPolicyFingerprint` — dry-run only; the
    fingerprint the apply would land.
  - `policyFingerprint` — actual apply only; the fingerprint
    the next `rekon refresh` will stamp onto the new
    `FindingFilterReport`.

  Validator accepts the additive optional field (digest is a
  non-empty string; `ruleCount` is a non-negative integer;
  `ruleIds.length === ruleCount`). The existing
  `finding-filter.changed` capability-docs invalidation rule's
  description expanded to mention the freshness section; no
  new invalidation rule (policyFingerprint drift is part of
  the filter report change). The architecture summary +
  agent contract publishers' `publish({ artifacts })`
  signatures changed to `publish({ artifacts, input })` so the
  runtime-injected `repo.root` flows through to the loader.

  New exports from `@rekon/kernel-findings`:
  - `FindingFilterPolicyFingerprint` (type).
  - `fingerprintFindingFilterPolicies` (helper).

  New exports from `@rekon/capability-docs`:
  - `FilterPolicyStaleness` (type).
  - `computeFilterPolicyStaleness` (pure compute).
  - `loadCurrentFindingFilterPolicies` (async loader).

  19 new contract tests in
  `tests/contract/filter-policy-freshness-guardrails.test.mjs`
  cover: 4 pure-helper tests for
  `fingerprintFindingFilterPolicies` (deterministic,
  order-sensitive, empty-array stable,
  undefined-matcher-insensitive), 4 pure-helper tests for
  `computeFilterPolicyStaleness` (missing / unknown / fresh /
  stale), 3 loader / refresh integration tests (refresh
  stamps fingerprint; loader returns empty-policy fingerprint;
  loader fingerprints actual rules), 2 apply-CLI fingerprint
  tests (dry-run + apply both report the correct fingerprints
  and dry-run leaves config byte-identical), 4 end-to-end
  publication tests (architecture fresh after refresh,
  architecture stale after config change, agent contract
  stale + Do Not Do reminder, refresh-clears-stale), and 2
  integrity tests (raw `FindingReport` byte-identical,
  `rekon artifacts validate` clean). Full suite: 588 passed /
  1 skipped / 0 failed.

  Docs updated:
  `docs/artifacts/finding-filter-report.md` (Shape includes
  `FindingFilterPolicyFingerprint` and the new
  `policyFingerprint` field; new "Policy Fingerprint" section
  documenting downstream surfaces);
  `docs/concepts/finding-filters.md` (new "Policy Fingerprint
  and Freshness" section after "Audit Guarantee");
  `docs/concepts/finding-filter-policy-suggestions.md`
  ("Surfaced In Publications" expanded to cross-reference the
  freshness section);
  `docs/artifacts/architecture-summary-publication.md` (new
  numbered section 8 "Finding Filter Policy Freshness";
  previous 8-17 shifted to 9-18);
  `docs/concepts/architecture-summary-publication.md`
  (publisher description extended);
  `docs/artifacts/agent-contract-publication.md` (new
  subsection description + new Do Not Do reminder);
  `docs/concepts/agent-operating-contract.md` (section table
  updated; new "Finding Filter Policy Freshness" prose
  section);
  `docs/concepts/refresh.md` (added a new "When To Use It"
  bullet for after `.rekon/config.json` changes);
  `docs/strategy/issue-governance-architecture-decision.md`
  (Implementation Order step 8 flipped from `(future)` to
  `(shipped)`); four strategy docs (subsystem-purpose-map,
  behavior-roadmap, guarantee-regression-plan, roadmap);
  CHANGELOG. Review packet:
  `.rekon-dev/review-packets/filter-policy-freshness-guardrails.md`.

  No new artifact type. No artifact `schemaVersion` bump
  (additive optional field). No new capability role. No
  watcher / daemon / file-system event loop. No new CLI
  subcommand. No LLM, semantic, fuzzy, or embedding
  matching. No version bump. No npm publish.
- Shipped filter policy suggestion apply safety v2 (P1.1
  filter-policy-apply-safety v2 slice).
  `rekon findings filter-policy apply` is now safer and more
  transparent. Two new flags: `--dry-run` and `--preview`
  (aliases). Dry-run runs the full apply plan (suggestion
  lookup, config load, projected `findingFilters`,
  validation) and prints a structured JSON plan **without
  writing**:
  - `applied: false`, `dryRun: true`.
  - `rule` — the exact rule that would land in
    `findingFilters`.
  - `diff.addedFindingFilters: FindingFilterPolicyRule[]` —
    rules appended when the id is new.
  - `diff.replacedFindingFilters: { before, after }[]` —
    populated when the suggestion id collides with an
    existing rule (with `--force`, the existing rule is
    **replaced**, not duplicated).
  - `diff.beforeCount` / `diff.afterCount`.
  - `warnings[]` — `{ code, message }` records for
    `low-confidence-suggestion`, `broad-path-pattern`,
    `duplicate-rule-id`, and `config-missing`.
  - `blockers[]` — subset of warnings that would refuse the
    actual apply without `--force`.
  - `requiresForce` / `wouldRefuse` /
    `isLowConfidence` / `isDuplicateRuleId` /
    `isBroadPattern` — convenience flags.
  - `validation.valid` / `validation.issues` — the result of
    running `validateFindingFilterPolicyRules` against the
    projected config.
  Three deterministic force-gated blockers:
  - **`low-confidence-suggestion`** — fires when the
    suggestion has `confidence: "low"`. Preserves the
    existing low-confidence gate.
  - **`broad-path-pattern`** — fires when
    `isBroadFindingFilterPolicyRule(rule)` returns `true`.
    The new deterministic predicate flags `pathPattern`
    values of `*`, `**`, `**/*`, `*/**`, `.`, `./**`, or any
    single top-level `<segment>/**` (`src/**`,
    `packages/**`, `apps/**`, `lib/**`, `tests/**`,
    `test/**`, etc.). A rule that lacks both a `pathPattern`
    and any narrow matcher (`type`, `ruleId`, `severity`,
    `titleIncludes`, `descriptionIncludes`) is also broad.
    Two-segment patterns (`src/generated/**`) are not
    broad. A `pathPattern: "src/**"` paired with a narrow
    matcher (e.g. `type: "myrule"`) is not broad either —
    the extra matcher narrows it.
  - **`duplicate-rule-id`** — fires when `findingFilters`
    already contains a rule with the suggestion id. With
    `--force`, the apply path **replaces** the existing
    rule (recorded in `diff.replacedFindingFilters`),
    not appends a duplicate. Without `--force`, apply
    refuses with a clear error.
  Both dry-run and apply now validate the projected
  `findingFilters` using
  `validateFindingFilterPolicyRules`. Validation failures
  refuse the write even with `--force`; the
  high-volume-filtered-pattern suggestion deliberately lacks
  a matcher and therefore cannot be applied directly under
  `--force` (operators must augment the rule). Malformed
  `.rekon/config.json` (file exists but isn't valid JSON
  / isn't a JSON object) is never overwritten — both
  dry-run and apply fail with an explicit "Failed to parse"
  message. Unrelated top-level config fields are preserved
  on write. The actual apply path emits `applied: true` plus
  the same plan + diff + warnings + validation shape; the
  legacy `appliedRule` alias is retained for back-compat.
  Apply now also surfaces `config-missing` in warnings when
  `.rekon/config.json` was absent before the invocation —
  dry-run never creates the file (the runtime store still
  bootstraps a default for subsequent rekon commands, but
  no rule is written), and the actual apply creates a
  default config before writing the appended rule.
  New exports from `@rekon/kernel-findings`:
  `isBroadFindingFilterPolicyRule`,
  `planFindingFilterPolicyApply`, plus shape types
  `FindingFilterPolicyApplyPlan`,
  `FindingFilterPolicyApplyDiff`,
  `FindingFilterPolicyApplyWarning`,
  `FindingFilterPolicyApplyBlocker`,
  `FindingFilterPolicyApplyWarningCode`,
  `FindingFilterPolicyApplyBlockerCode`,
  `PlanFindingFilterPolicyApplyInput`. New file-local CLI
  helpers in `packages/cli/src/index.ts`
  (`loadConfigForApply`, `parseFindingFiltersFromConfig`,
  `buildAppliedConfig`, `formatApplyRefusalMessage`).
  21 new contract tests in
  `tests/contract/finding-filter-policy-apply-safety.test.mjs`
  cover: 5 pure-helper tests for
  `isBroadFindingFilterPolicyRule` + `planFindingFilterPolicyApply`
  (repository-wide patterns, single top-level patterns,
  two-segment narrow patterns, extra-matcher narrowing,
  no-matcher implicit broad), and 16 CLI behavior tests
  (`--dry-run` returns plan + diff and does not mutate
  config; `--preview` is an alias; actual apply appends a
  new non-broad high-confidence rule; dry-run reports
  config-missing when the file is absent and does not add
  findingFilters; apply writes the rule when config was
  missing and the workspace was just bootstrapped;
  malformed config causes dry-run / apply to fail without
  writing; broad pattern dry-run succeeds with warning;
  broad pattern apply fails without `--force`; broad
  pattern apply succeeds with `--force` and surfaces
  warning; low-confidence dry-run succeeds with warning;
  low-confidence apply fails without `--force`;
  low-confidence apply succeeds with `--force` on a narrow
  rule; duplicate id dry-run reports duplicate +
  `replacedFindingFilters`; duplicate id apply fails
  without `--force`; duplicate id apply with `--force`
  replaces the existing rule; unrelated config fields are
  preserved; `rekon config validate` passes after apply;
  `suggest` / `list` still do not mutate config). The
  pre-existing
  `tests/contract/finding-filter-policy-suggestions.test.mjs`
  was updated to match the new error shape and to document
  that `--force` on a high-volume-filtered-pattern rule
  still fails validation (since the rule has no matcher).
  Full suite: 569 passed / 1 skipped / 0 failed. Docs
  updated:
  `docs/concepts/finding-filter-policy-suggestions.md`
  (Apply Safety section now lists all 10 safety rules + a
  table documenting the dry-run JSON shape +
  recommended operator workflow),
  `docs/artifacts/finding-filter-policy-suggestion-report.md`
  (CLI Surface + Apply Safety Rules expanded),
  `docs/concepts/finding-filters.md` (Promotable bullet
  expanded with broad-pattern + dry-run guidance),
  `docs/strategy/issue-governance-architecture-decision.md`
  (Implementation Order step 7 flipped to shipped + new
  step 8 "Configured filter policy freshness /
  publication guardrails"), four strategy docs
  (subsystem-purpose-map, behavior-roadmap,
  guarantee-regression-plan, roadmap), README, and
  CHANGELOG. Review packet:
  `.rekon-dev/review-packets/finding-filter-policy-apply-safety-v2.md`.
  No new artifact type. No artifact `schemaVersion` bump.
  No publication shape change. No new capability role. No
  new CLI subcommand (only new flags). No LLM, semantic,
  fuzzy, or embedding matching. No version bump. No npm
  publish.
- Shipped filter policy suggestions surfaced in architecture
  summary / agent contract (P1.1
  filter-policy-suggestions-publications v2 slice).
  `@rekon/capability-docs.architecture-summary` now reads the
  latest `FindingFilterPolicySuggestionReport`, cites it in
  `header.inputRefs`, and renders a
  `## Finding Filter Policy Suggestions` section after
  `## Finding Filter Health`. The section lists total /
  by-reason / by-confidence counts, a per-suggestion table
  with columns `Suggestion | Confidence | Reason |
  Suggested Rule | Affected Findings | Evidence` (capped at
  20 rows), a `--force` warning when any suggestion is
  low-confidence or duplicates an existing `findingFilters`
  rule id, and an audit-pointer footer clarifying that
  suggestions are advisory and that
  `rekon findings filter-policy apply <suggestion-id>` is the
  only command that mutates `.rekon/config.json`. Missing
  suggestion reports emit explicit
  `rekon findings filter-policy suggest` /
  `rekon refresh` hints.
  `@rekon/capability-docs.agent-contract` adds a matching
  `### Finding Filter Policy Suggestions` subsection under
  `Active Governance State` with an advisory blockquote,
  top suggestions (capped at 5; each rendered as
  `<id> — <reason> (<confidence>) → <suggested rule preview>
  (<affected count> finding(s))`), and two new `Do Not Do`
  reminders:
  - "Do not apply filter policy suggestions without explicit
    operator approval; run
    `rekon findings filter-policy apply <id>` only when the
    operator instructs it."
  - "Do not treat filter policy suggestions as already-applied
    config; they are advisory until
    `rekon findings filter-policy apply` writes them to
    `.rekon/config.json`."
  Both publications additionally render an inline
  **Stale Suggestions** banner when the cited suggestion
  report's `header.inputRefs` does not reference the latest
  `FindingFilterReport` artifact id (so an operator can see at
  a glance that the suggestions were derived from older filter
  data and that `rekon findings filter-policy suggest` should
  be rerun). New exports from `@rekon/capability-docs`:
  - `FilterPolicySuggestionStaleness` (type) —
    `{ stale, latestFilterReportId?, citedFilterReportIds }`.
  - `computeFilterPolicySuggestionStale(suggestion, filterReport?)`
    — file-local stale-detection helper (deterministic, no
    network, no LLM).
  Manifest update: `@rekon/capability-docs.consumes` adds
  `FindingFilterPolicySuggestionReport`; new
  `finding-filter-policy-suggestions.changed` invalidation rule
  invalidates both publications when the suggestion report
  changes. Stale-suggestion detection is a targeted local
  check; it does **not** extend the global
  `detectGovernanceFreshness` helper. The `Do Not Do` block on
  the agent contract grows from one to three filter-related
  reminders (one from filter-health v1 + two new
  policy-suggestion reminders). Docs updated:
  `agent-contract-publication` artifact + concept,
  `architecture-summary-publication` artifact + concept,
  `finding-filter-policy-suggestion-report` artifact (new
  "Consumed By" entries), `finding-filter-policy-suggestions`
  concept (new "Surfaced In Publications" section),
  `finding-filters` concept (new "Visible in publications"
  bullet), `issue-governance-architecture-decision` ADR
  (Implementation Order step 6 flipped to shipped + new
  step 7), four strategy docs (subsystem-purpose-map,
  behavior-roadmap, guarantee-regression-plan, roadmap), and
  CHANGELOG. 13 new contract tests in
  `tests/contract/publications-filter-policy-suggestions.test.mjs`
  cover: architecture-summary inputRefs / counts / row rendering
  / `--force` warning / missing-report branch / stale banner;
  agent-contract inputRefs / subsection / advisory blockquote /
  Do Not Do reminders / missing-report branch / stale banner;
  regression coverage for the unrelated agents and proof
  publishers, plus a hardened `rekon artifacts validate`
  invariant. Full suite: 542 passed / 1 skipped / 0 failed. No
  LLM, semantic, fuzzy, or embedding matching; no new CLI
  surface; no artifact schemaVersion bump; no new capability
  role; no version bump; no npm publish.
- Shipped filter policy / exclusion persistence v2 (P1.1
  filter-policy-suggestions v2 slice). New
  `FindingFilterPolicySuggestionReport` artifact records
  candidate `findingFilters` rules derived deterministically
  from the latest N `FindingFilterReport` artifacts (default
  5, configurable via `--recent-limit`). The artifact lists
  each suggestion's `id`, `reason`, `suggestedRule`,
  `confidence`, `rationale`, affected finding ids / paths /
  types, the source `FindingFilterReport` ids, and evidence
  refs back to those reports. Four deterministic suggestion
  reasons:
  - **`repeated-filtered-policy-gap`** (high confidence;
    computed first so it wins over `repeated-filtered-path`
    at the same pathPattern) — ≥ 3 built-in-filtered
    findings share a path prefix and no existing
    `findingFilters` rule covers it.
  - **`repeated-filtered-path`** (high ≥ 3 / medium = 2) —
    ≥ 2 filtered findings share a path prefix.
  - **`repeated-filtered-type`** (medium) — ≥ 3 filtered
    findings share `finding.type`.
  - **`high-volume-filtered-pattern`** (low review prompt
    with no `pathPattern`) — one filter reason accounts for
    > 80 % of filtered findings and the bucket has ≥ 5
    findings.
  Path-prefix heuristic uses the first two segments
  (`src/generated/foo.ts`, `src/generated/bar.ts` →
  `src/generated/**`). Coverage check drops any suggestion
  whose `pathPattern` / `type` is already covered by an
  existing `findingFilters` rule. Suggestion + rule ids are
  deterministic (`policy-suggestion:<reason>:<hash>` /
  `suggested-<hash>`) so reruns over the same inputs stay
  stable. New exports from `@rekon/kernel-findings`:
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
  `findingFilterPolicySuggestionReportSchema`. New runtime
  helper
  `buildFindingFilterPolicySuggestionReport(store, options?)`
  reads the latest N filter reports (or a pinned set), runs
  the derivation, and writes the report to the `findings`
  category with `inputRefs` citing every consumed
  `FindingFilterReport`. Registered as an experimental
  built-in artifact type in `@rekon/sdk`.
  New CLI commands:
  `rekon findings filter-policy suggest` (read-only) /
  `rekon findings filter-policy list` (read-only) /
  `rekon findings filter-policy apply <suggestion-id>
  [--force]` (the only mutating command). `apply` reads
  `.rekon/config.json`, appends the suggested rule to
  `findingFilters`, preserves every other top-level field
  (including project extensions), writes
  `<JSON>\n` in one `writeFile`, and creates a default
  config when one doesn't exist. `apply` refuses
  low-confidence suggestions and duplicate rule ids without
  `--force`; `suggest` / `list` never mutate the config.
  Docs added: new artifact spec
  (`docs/artifacts/finding-filter-policy-suggestion-report.md`)
  + new concept doc
  (`docs/concepts/finding-filter-policy-suggestions.md`).
  Docs updated:
  `finding-filter-report` / `finding-filter-health-report`
  artifacts, `finding-filters` concept,
  `issue-governance-architecture-decision` ADR
  (Implementation Order step 5 flipped to shipped + new
  step 6), four strategy docs (subsystem-purpose-map,
  behavior-roadmap, guarantee-regression-plan, roadmap),
  and CHANGELOG. 15 new contract tests in
  `tests/contract/finding-filter-policy-suggestions.test.mjs`.
  Full suite: 529 passed / 1 skipped / 0 failed. No LLM,
  semantic, fuzzy, or embedding matching;
  `GraphOntologyValidator` port and persistent exclusion
  lists beyond config-backed rules remain deferred. No SDK
  API removal; no artifact schemaVersion bump; no new
  capability role; no version bump; no npm publish.
- Shipped filter health / issue adjudication surfaces in
  publications v1 (P1.1 filter-health-publications v1 slice).
  `@rekon/capability-docs.architecture-summary` and
  `@rekon/capability-docs.agent-contract` now read the latest
  `FindingFilterReport` and `FindingFilterHealthReport`, cite
  them in `header.inputRefs`, and surface filter behavior to
  the surfaces operators and agents actually read.
  Architecture summary adds a `## Finding Filter Health`
  section after `## Accepted Issue Merge Roll-ups`. The
  section lists total / kept / filtered counts, filter rate,
  policy-filtered total, a **Filter Reasons** table (per
  reason, sorted by descending count), a **Policy Filters**
  table (per `findingFilters` policy id, with any unused
  policy ids listed below the table), and a **Filter Health
  Alerts** table (severity / code / message per alert).
  Always closes with "Filtered findings are not deleted.
  Inspect `FindingFilterReport.filteredFindings` for the
  full audit." Missing filter artifacts emit explicit
  `rekon findings filter` / `rekon findings filter-health` /
  `rekon refresh` hints.
  Agent contract adds a `### Finding Filter Health`
  subsection under `Active Governance State` listing
  kept / filtered counts, filter rate, active policy count,
  and warning count. When any alerts exist, the subsection
  emits a blockquote ("Filter-health warnings exist. Do not
  assume active governance is complete until filtered
  findings are reviewed.") followed by up to five
  `<code> — <message>` bullets. Always closes with the
  inspect-`FindingFilterReport.filteredFindings` hint. The
  agent contract `Do Not Do` list gains: "Do not treat a
  clean active-governance surface as proof that no raw
  findings exist; inspect FindingFilterReport when
  filter-health warnings exist or the filter rate is high."
  Manifest update: `@rekon/capability-docs.consumes` adds
  `FindingFilterReport` and `FindingFilterHealthReport`; new
  `finding-filter.changed` invalidation rule (inputs:
  `FindingFilterReport`, `FindingFilterHealthReport`). Two
  new file-local helpers in `packages/capability-docs`:
  `appendArchitectureFindingFilterHealth(sections, filter,
  health)` and `appendAgentContractFindingFilterHealth(...)`,
  plus a small `sortedCountEntries(counts, limit)` utility
  that returns up to 10 entries sorted descending by count
  then by id. `ArchitectureSummaryInputs` and
  `AgentContractInputs` gain optional
  `findingFilterReport?` and `findingFilterHealthReport?`.
  12 new contract tests in
  `tests/contract/publications-filter-health.test.mjs`
  covering: section/subsection rendering, on-disk
  inputRefs, alert visibility (including the agent-contract
  warnings blockquote), missing-artifact command guidance
  for both publications, freshness goes stale on a newer
  `FindingFilterHealthReport`, `publish agents` /
  `publish proof` still work, and `artifacts validate`
  cleanliness. Full suite: 514 passed / 1 skipped. Docs
  updated across architecture-summary-publication
  (artifact + concept), agent-contract-publication
  (artifact + concept), finding-filter-report,
  finding-filter-health-report, finding-filters concept,
  issue-governance-architecture-decision ADR
  (Implementation Order), four strategy docs, and CHANGELOG.
  No SDK API change; no artifact schemaVersion bump; no new
  capability role; no CLI subcommand change; no version
  bump; no npm publish.
- Shipped filter policy / configured exclusions v1 (P1.1
  filter policy v1 slice). `.rekon/config.json` now accepts
  an optional `findingFilters` array of project-specific
  policy rules. Each entry requires `id`, `reason`, and
  `evidence`, plus at least one deterministic matcher among
  `pathPattern` (simple glob — `*` per segment, `**` across
  segments, `?` per character), `type`, `ruleId`, `severity`,
  `titleIncludes`, `descriptionIncludes`. Path patterns are
  project-relative; absolute paths and `..` traversal are
  rejected at validation time. Optional `confidence` defaults
  to `medium`. Policy rules run **before** built-in
  deterministic filters, in declared order — the first
  matching rule wins. Filtered entries record
  `source: "policy"` plus a `policyId` so the audit trail
  names the rule that suppressed each finding. The raw
  `FindingReport` is **not** mutated; filtered findings stay
  auditable in `FindingFilterReport.filteredFindings`. Two
  new exported helpers in `@rekon/kernel-findings`:
  `validateFindingFilterPolicyRules(value)` (used by
  `rekon config validate`; returns sanitized rules + a sorted
  issue list) and an updated `applyFindingFilters(...)` that
  accepts an optional `policies: FindingFilterPolicyRule[]`.
  New exported types: `FindingFilterPolicyRule`,
  `FindingFilterPolicyValidationIssue`,
  `ApplyFindingFiltersOptions`.
  `FindingFilterReport.summary.byPolicy` reports per-policy
  filtered counts (including zero for unused policies).
  `FindingFilterHealthReport.summary` gains `byPolicy`,
  `policyFiltered`, and `unusedPolicies`; three new
  policy-aware alerts: `policy-over-filtering` (configured
  policies suppress > 80 % of findings),
  `low-confidence-policy-filter` (any policy hit at
  `confidence: "low"`), and `unused-policy-filter` (any
  configured policy matched zero findings). New runtime
  helper options: `BuildFindingFilterReportOptions.policies`
  and `BuildFindingFilterHealthReportOptions.policies`. The
  CLI loads `.rekon/config.json` `findingFilters` once per
  invocation (and once per `rekon refresh`) and forwards the
  rules to both runtime helpers; output includes
  `policyFilters: <count>`. `rekon config validate` now
  validates `findingFilters` and rejects duplicate ids,
  missing matchers, unknown reasons, and absolute /
  traversal `pathPattern` values. Docs updated across
  `finding-filter-report` artifact, `finding-filter-health-report`
  artifact, `finding-filters` concept, `refresh` concept,
  `issue-governance-architecture-decision` ADR
  (Implementation Order + Open Questions), four strategy
  docs (subsystem-purpose-map, behavior-roadmap,
  guarantee-regression-plan, roadmap), and CHANGELOG. 19 new
  contract tests in
  `tests/contract/finding-filter-policy.test.mjs`. Full
  suite: 502 passed / 1 skipped. No LLM, semantic, fuzzy, or
  embedding matching; `GraphOntologyValidator` port and
  persistent exclusion lists remain deferred. No SDK API
  removal; no artifact schemaVersion bump; no new capability
  role; no version bump; no npm publish.
- Shipped filter-aware lifecycle / adjudication (P1.1
  filter-aware lifecycle v1 slice).
  `@rekon/runtime.buildFindingLifecycleReport` now lists the
  latest `FindingFilterReport` and uses its `keptFindings` as
  the active latest set whenever the filter report cites the
  latest `FindingReport` in its `header.inputRefs`
  (current-enough check). The lifecycle synthesizes a
  `FindingReport`-shaped object that reuses the raw report's
  header (so previous-report lifecycle comparison stays stable)
  but swaps in `keptFindings` as the active surface; the raw
  `FindingReport` on disk is **not** mutated. The lifecycle's
  own `header.inputRefs` cite the `FindingFilterReport` plus
  the filter report's transitive raw `FindingReport` lineage,
  so `rekon artifacts freshness` marks lifecycle stale when a
  newer filter arrives, and lineage to the raw report stays
  intact. When the latest filter report is missing or stale —
  i.e., does not cite the latest `FindingReport` — the
  lifecycle falls back to the raw `FindingReport` transparently
  and does **not** cite the stale filter. `IssueAdjudicationReport`
  and `CoherencyDelta` are filter-aware **transitively**: only
  kept findings become governed issue groups, coherency items,
  and remediation queue entries. Filtered findings stay
  auditable in `FindingFilterReport.filteredFindings`. No new
  CLI surface; no SDK API removal; no artifact schemaVersion
  bump; no new capability role; no version bump; no npm
  publish. 7 new contract tests in
  `tests/contract/filter-aware-lifecycle-adjudication.test.mjs`
  covering keptFindings preference, raw-fallback when no filter
  exists, stale-filter rejection, transitive adjudication +
  coherency exclusion of filtered findings, end-to-end CLI
  rebuild path, `rekon refresh` on a clean fixture still
  produces a filter-aware lifecycle, and `artifacts validate`
  cleanliness. Full suite: 483 passed / 1 skipped. Docs
  updated across `finding-filter-report` artifact,
  `finding-lifecycle-report` artifact, `issue-adjudication-report`
  artifact, `coherency-delta` artifact, `finding-filters`
  concept, `finding-lifecycle` concept, `issue-adjudication`
  concept, `coherency-delta` concept, `refresh` concept,
  `issue-governance-architecture-decision` ADR (implementation
  order + lifecycle layer), four strategy docs (subsystem-
  purpose-map, behavior-roadmap, guarantee-regression-plan,
  roadmap), and this CHANGELOG.
- Shipped the issue-governance architecture decision +
  false-positive filtering audit (P1.1 filtering v1 slice).
  Added the
  [issue-governance-architecture-decision ADR](docs/strategy/issue-governance-architecture-decision.md)
  that formalizes Rekon's layered issue-governance model
  (FindingReport → FindingFilterReport → FindingStatusLedger →
  FindingLifecycleReport → IssueAdjudicationReport →
  CoherencyDelta) and explicitly labels `IssueMergeCandidate`,
  `IssueMergeDecisionLedger`, accepted-merge rollups in
  `CoherencyDelta`, and publication / resolver awareness of
  those rollups as **Rekon product extensions** — useful and
  supported, but not classic codebase-intel parity. Future work
  must label batches as classic-guarantee preservation, Rekon
  reinterpretation, or Rekon product extension. AGENTS.md +
  CONTRIBUTING.md updated with the same instruction. Two new
  artifact types ship in `@rekon/kernel-findings` and
  `@rekon/sdk`: `FindingFilterReport` records system / policy
  false-positive suppression over `FindingReport` with `reason`,
  `evidence`, optional `filePath`, `confidence`
  (`high` / `medium` / `low`), `filteredAt`, and `source`
  (`system` / `operator` / `policy`) per filtered finding, plus
  a `keptFindings` projection alongside the filtered list. The
  raw `FindingReport` is **not** mutated. Deterministic v1
  filter rules with priority
  `generated > external > test > canary > content`:
  `generated-file` (path segment `dist` / `build` / `generated`,
  or `__generated__` / `.generated.` substring; confidence
  high), `external-file` (path segment `node_modules` /
  `vendor` / `third_party`; high), `test-file` (path segment
  `test` / `tests` / `__tests__` / `__test__`, or filename
  ending with `.test.{ts,tsx,js,jsx,mjs,cjs}` /
  `.spec.{ts,tsx,js,jsx,mjs,cjs}`; high), `canary-file` (path
  contains `canary`; high), `content-filter` (finding text
  mentions "generated output" plus generated path; medium).
  `explicit-exclusion` and `policy-exception` reasons reserved
  for future config-driven exclusions. No LLM, semantic, fuzzy,
  or embedding matching; `GraphOntologyValidator` port deferred.
  `FindingFilterHealthReport` summarizes the latest filter
  report (`totalFindings`, `totalFiltered`, `filterRate`,
  `highConfidenceFiltered`, `lowConfidenceFiltered`, `byReason`)
  and emits deterministic alerts `high-filter-rate` (when
  `filterRate > 0.8`) and `low-confidence-filtered` (when any
  low-confidence entry exists). New `@rekon/kernel-findings`
  helpers: `applyFindingFilters`,
  `summarizeFindingFilterReport`,
  `createFindingFilterReport`, `validateFindingFilterReport`,
  `assertFindingFilterReport`, `findingFilterReportSchema`,
  `buildFindingFilterHealth`,
  `createFindingFilterHealthReport`,
  `validateFindingFilterHealthReport`,
  `assertFindingFilterHealthReport`,
  `findingFilterHealthReportSchema`. New `@rekon/runtime`
  helpers: `buildFindingFilterReport(store, options?)` and
  `buildFindingFilterHealthReport(store, options?)`. New CLI:
  `rekon findings filter` and `rekon findings filter-health`.
  `rekon refresh` adds `findings.filter` and
  `findings.filter-health` steps between `evaluate` and
  `findings.lifecycle`; `REQUIRED_REFRESH_ARTIFACT_TYPES`
  extended with `FindingFilterReport` and
  `FindingFilterHealthReport`. `FindingFilterReport` /
  `FindingFilterHealthReport` registered as
  experimental in `@rekon/sdk` and categorized under
  `findings` in `@rekon/runtime`. `rekon artifacts freshness`
  marks each artifact `stale` when its upstream input is
  superseded. Lifecycle / adjudication / coherency still
  consume `FindingReport` directly — filter-aware lifecycle /
  adjudication is the recommended next slice. Docs added:
  `docs/strategy/issue-governance-architecture-decision.md`,
  `docs/artifacts/finding-filter-report.md`,
  `docs/artifacts/finding-filter-health-report.md`,
  `docs/concepts/finding-filters.md`. Docs updated across
  finding-report / finding-lifecycle-report /
  issue-adjudication-report artifact docs;
  finding-lifecycle / issue-adjudication / coherency-delta /
  refresh concept docs; four strategy docs
  (subsystem-purpose-map, behavior-roadmap,
  guarantee-regression-plan, roadmap), classic-alignment-map;
  README, AGENTS.md, CONTRIBUTING.md. 18 new contract tests in
  `tests/contract/finding-filters.test.mjs`. Existing
  `refresh-command` and `coherency-delta-adjudicated` tests
  updated for the new refresh step order. Full suite: 476
  passed / 1 skipped. No version bump. No npm publish.
- Shipped publication and resolver awareness of accepted merge
  decisions (P1.1 merge-awareness slice). The architecture
  summary, agent operating contract, and `resolve.issue` now
  surface `CoherencyDelta` v3 merged rollup items in the places
  humans and agents actually read:
  `@rekon/capability-docs.architecture-summary` adds an
  `## Accepted Issue Merge Roll-ups` section with one row per
  merged rollup item (rollup id, member group ids, decision ids,
  member finding count, severity, status, active flag).
  `@rekon/capability-docs.agent-contract` adds an
  `### Accepted Issue Merge Roll-ups` subsection under
  `Active Governance State` with the same metadata in bullet
  form plus an instruction to inspect every member group and
  finding id before editing, and adds a new `Do Not Do`
  reminder against treating accepted merge roll-ups as automatic
  mutation of raw issue groups.
  `@rekon/capability-resolver.issueResolver` adds a new optional
  `mergeRollup: IssueMergeRollupSummary` field on `IssuePacket`
  (rollup id, merged group ids, decision/candidate ids, unioned
  member finding ids, severity, status, active) and attaches it
  when the matched group is part of an accepted merged rollup in
  the latest `CoherencyDelta`. The packet also gains a
  sibling-group warning ("Matched issue group is part of an
  operator-accepted merged roll-up; inspect sibling group(s) …
  before acting."), a new `issue.merge` /
  `sourceType: "CoherencyDelta"` / `status: "used"`
  `resolutionTrace` entry, and `header.inputRefs` cites the
  source `CoherencyDelta`. Rejected decisions never produce a
  `mergeRollup` (they don't reach `CoherencyDelta` as merged), so
  the resolver naturally keeps groups separate. None of the three
  surfaces reads `IssueMergeDecisionLedger` directly — all rollup
  metadata flows through `CoherencyDelta` only, keeping the
  display consistent with the latest delta projection.
  `IssueAdjudicationReport.groups` is **not** mutated; raw groups
  remain inspectable. Manifest:
  `@rekon/capability-resolver.consumes` gains `CoherencyDelta`.
  Public API additions: new exported type
  `IssueMergeRollupSummary` from `@rekon/capability-resolver`;
  `IssuePacket.mergeRollup` is additive optional;
  `ResolutionTraceEntry.sourceType` gains literal
  `"CoherencyDelta"`. Internal helpers
  (`findMergeRollupForGroup`, `toMergeRollupSummary`,
  `collectMergedRollups`) are local to their packages. Docs
  updated across architecture-summary-publication artifact +
  concept, agent-contract-publication artifact + concept,
  resolver-packet artifact, resolvers concept,
  coherency-delta artifact + concept,
  `issue-merge-decisions.md` concept (new
  `Downstream Surfaces` section), and four strategy docs
  (classic-subsystem-purpose-map, classic-behavior-roadmap,
  classic-guarantee-regression-plan, roadmap). 10 new contract
  tests in
  `tests/contract/merge-decision-publication-resolver-awareness.test.mjs`.
  Full suite: 458 passed / 1 skipped. No artifact mutation, no
  LLM, no fuzzy / embedding / semantic matching, no new
  capability role, no SDK API break beyond the additive optional
  field, no schemaVersion bump, no version bump, no npm publish.
- Shipped CoherencyDelta v3 respects accepted merge decisions (P1.1
  coherency-merge slice). `@rekon/runtime.buildCoherencyDelta` now
  reads the latest `IssueMergeDecisionLedger` (when it carries any
  decisions), resolves the latest decision per `candidateId`, and
  collapses accepted-merged `IssueAdjudicationGroup` records into
  a single merged `CoherencyDeltaItem`
  (`id: coherency:rollup:merged:<sorted-group-ids-joined-by-+>`)
  with one merged remediation step
  (`id: remediation:merged:<sorted-group-ids-joined-by-+>`).
  Merged items carry additive optional fields
  `mergedIssueGroupIds`, `mergeDecisionIds`, `mergeCandidateIds`,
  a union of `memberFindingIds`, the worst severity in the bucket,
  the canonical group's `issueGroupId` / `canonicalFindingId`, and
  a `groupingReasons` array that includes
  `"operator-accepted-merge"`. Rejected decisions (and candidates
  with no decision) keep groups separate, identical to v2 behavior.
  Latest decision per `candidateId` wins: a later `rejected`
  supersedes an earlier `accepted` and vice versa. The
  `IssueAdjudicationReport.groups` artifact is **not** mutated —
  the rollup is a derived projection in `CoherencyDelta` only.
  Added pure helper
  `rollupIssueGroupsByAcceptedMergeDecisions(input)` in
  `@rekon/kernel-findings`, and three new optional fields on
  `CoherencyDeltaItem` (`mergedIssueGroupIds`,
  `mergeDecisionIds`, `mergeCandidateIds`). `inputRefs` cite the
  ledger when used, so `rekon artifacts freshness` marks the
  delta `stale` after a newer `IssueMergeDecisionLedger`. Docs
  updated across the CoherencyDelta artifact + concept,
  IssueMergeDecisionLedger artifact + concept, IssueAdjudicationReport
  artifact + concept, and four strategy docs
  (`classic-subsystem-purpose-map.md`,
  `classic-behavior-roadmap.md`,
  `classic-guarantee-regression-plan.md`, `roadmap.md`). 12 new
  contract tests in
  `tests/contract/coherency-delta-merge-decisions.test.mjs`. One
  existing test in `issue-merge-decision-ledger.test.mjs` was
  updated to reflect the v3 invariants (accepted decisions still
  do not mutate `IssueAdjudicationReport.groups`, but
  `CoherencyDelta` now merges the linked groups in its
  projection). No artifact mutation of upstream sources, no LLM,
  no fuzzy / embedding / semantic matching, no new capability
  role, no version bump, no npm publish.
- Bumped the workspace and every `@rekon/*` package to `0.1.0-alpha.1` (root, all 19 packages, all `@rekon/*` internal dependency ranges).
- Recorded the public package boundary decision: all 19 packages are scheduled to publish under the `experimental, public` stability label. See `docs/release/public-package-boundaries.md`.
- Excluded `.tsbuildinfo` from publish tarballs by relocating the TypeScript build info file out of `dist/` in every package tsconfig. `npm pack --dry-run` now reports six entries per package (README, package.json, four dist files).
- Strengthened `scripts/publish-dry-run.mjs` to fail on `.tsbuildinfo` inclusion and to print a concise per-package summary. Existing guards against `.rekon/`, `.rekon-dev/`, dogfood fixtures, forbidden tokens, missing READMEs/licenses/dist outputs, and absolute paths remain.
- Added `scripts/install-tarball-smoke.mjs`: packs all 19 workspace packages, installs them into a temp consumer project via `file:` dependencies, copies `examples/simple-js-ts` into the project, runs the golden CLI flow, and validates the artifact index. Tarballs and the consumer project are cleaned up at the end.
- Added `docs/release/npm-publish-plan.md` with auth prerequisites, dependency-safe publish order, dry-run and publish command templates, post-publish smoke, and rollback/deprecate guidance. Explicit instruction: do not publish until manual approval.
- Added `docs/release/0.1.0-alpha.1.md` release notes draft describing what Rekon is, what is included, install/use instructions, CLI flows, capability authoring, known limitations, verification commands, dogfood note, and publish status.
- Updated `docs/release/alpha-release-checklist.md` to check off the items completed by this batch and to point at the new public package boundaries doc, npm publish plan, and release notes.
- Fixed the `@rekon/cli` entry-point detection so the installed binary runs correctly when `process.argv[1]` points through a symlinked path (e.g., npm's `node_modules/.bin/rekon` symlink, macOS `/tmp` → `/private/tmp` resolution, or any global install location). The CLI now compares the realpath of `process.argv[1]` to the module's own file URL.
- Added `tests/docs/release-readiness.test.mjs` covering: every workspace package at `0.1.0-alpha.1`, internal `@rekon/*` dependency ranges pinned to the same version, release readiness docs present, every workspace package listed (publish or deferred) in the public boundaries doc, npm publish plan requiring manual approval, release notes drafted, and the publish dry-run script guarding against `.tsbuildinfo`.
- Updated `tests/docs/package-stability.test.mjs` to require `scripts/install-tarball-smoke.mjs` exists.
- No artifact shape, kernel contract, SDK API, or capability behavior changes were made.
- Documentation-only correction to the publish posture: `docs/release/npm-publish-plan.md` now defaults to `--tag alpha` for the first public alpha, with `--tag latest` documented as the explicit opt-in if alpha should become the default install target. `docs/release/0.1.0-alpha.1.md` updates the install command to `npm install --no-save @rekon/cli@alpha` and notes that bare `npm install @rekon/cli` will not pull the alpha while the `alpha` dist-tag is in use. `docs/release/alpha-release-checklist.md` adds explicit checklist items for the scope/dist-tag decision, `npm login`, and the dist-tag-specific post-publish smoke. The decision rationale and exact commands live in `.rekon-dev/review-packets/dist-tag-decision.md`.
- Added generic capability execution CLI commands so external (and built-in) capabilities can be operated without bespoke runtime scripts:
  - `rekon capabilities list --verbose` — adds per-capability handler summary including handler ids.
  - `rekon capabilities inspect <capability-id>` — prints manifest, registered handlers, and artifact types.
  - `rekon config validate` — lightweight validation of `.rekon/config.json` (shape, capabilities array, known permissions, risky-permission warnings). Returns `{ valid, configPath, configExists, issues }`.
  - `rekon publish list` — lists all registered publishers as `{ id, capabilityId, produces }`.
  - `rekon publish run <publisher-id> [--input-json <json>]` — executes the named publisher (built-in or external) after ensuring snapshot inputs are ready.
- Kept `rekon publish agents` as the built-in docs publisher shortcut.
- Updated `examples/custom-capability/README.md` to drop the runtime-script workaround for the external TODO publisher; the example now walks through the CLI flow end-to-end (`config validate`, `capabilities list`, `capabilities inspect`, `publish list`, `publish run todo.report`).
- Bumped `examples/custom-capability/package.json` internal `@rekon/*` dependency ranges from `0.1.0-alpha.0` to `0.1.0-alpha.1` so the documented `npm install ./examples/custom-capability --no-save` flow resolves under the post-bump workspace.
- Updated `docs/extensions/authoring-capabilities.md` and `docs/extensions/capability-manifest.md` with sections covering the new CLI surface.
- Updated the root `README.md` CLI command list to include `config validate`, `capabilities inspect`, `publish list`, and `publish run`.
- Added `tests/contract/generic-capability-execution.test.mjs` covering all new commands plus the `publish agents` shortcut, unknown-publisher / unknown-capability errors, and config-validate error paths.
- Added `tests/integration/external-capability-cli.test.mjs` that exercises the full external capability flow through the CLI against a temp copy of `examples/simple-js-ts` (self-skips when `rekon-capability-todo-example` is not installed).
- No kernel, SDK, runtime, or capability behavior changes. The runtime already supported `publisherId` filtering through `runPublish`; this batch exposes it via CLI.
- Extended generic capability execution to evaluators and resolvers:
  - `rekon evaluate list` — lists every registered evaluator with `id`, `capabilityId`, and `produces`.
  - `rekon evaluate run <evaluator-id> [--input-json <json>]` — runs a single evaluator, including external rule packs, and writes the produced `FindingReport`(s) through the normal artifact store.
  - `rekon resolve list` — lists every registered resolver.
  - `rekon resolve run <resolver-id> [--input-json <json>]` — runs a single resolver, injecting the latest `IntelligenceSnapshot` ref when `--input-json` omits `snapshotRef`. Returns the resulting `ResolverPacket` (with `resolutionTrace`) inline alongside the artifact refs.
- `rekon evaluate` (no subcommand) still runs every registered evaluator; `rekon resolve preflight --path … --goal …` remains the friendly workflow shortcut.
- Generic actuator and learner CLI dispatch are intentionally deferred: actuators may write source or run commands, learners already have explicit `rekon memory …` commands. The docs say so out loud in `docs/extensions/authoring-capabilities.md` and `docs/strategy/capability-model.md`.
- Added `tests/contract/generic-evaluator-resolver-execution.test.mjs` with 9 tests: evaluator list, evaluator run, unknown evaluator, bare `evaluate` still works, resolver list, resolver run with auto-injected snapshot, resolver run with explicit snapshotRef, unknown resolver, and `resolve preflight` shortcut still works.
- Extended `tests/integration/external-capability-cli.test.mjs` to assert `evaluate list` includes the external `todo.findings` evaluator and to run it via `evaluate run` before `publish run todo.report`.
- Updated `docs/extensions/authoring-capabilities.md`, `docs/extensions/capability-manifest.md`, `docs/strategy/capability-model.md`, `docs/strategy/roadmap.md`, `examples/custom-capability/README.md`, and the root `README.md` to document the new commands and the explicit actuator/learner deferral.
- Added classic behavior distillation strategy docs to anchor future work in `codebase-intel-classic`'s hard-won lessons without copying its file structure:
  - `docs/strategy/classic-behavior-distillation.md` — 12 behavior cards covering evidence/observation, deterministic+LLM analysis, graph intelligence, rule governance, issue detection, resolver/preflight, publications, memory, intent/work orders, reconciliation, watcher/freshness, and GitHub/SaaS surfaces. Each card states classic source areas, what is good, what is accidental, Rekon reinterpretation, and migration path.
  - `docs/strategy/classic-wins.md` — the 13 durable principles distilled from classic (evidence before opinion, deterministic before semantic, provenance on every claim, generated docs as publications, executable rules, governance-grade issues, relational graphs, self-explaining resolvers, scoped/verified/fresh memory, agent proof gates, deterministic-first reconciliation, explicit freshness, declared capability contracts).
  - `docs/strategy/classic-to-rekon-translation.md` — translation patterns and concrete examples for evaluator, graph projector, resolver+publisher, memory learner, and reconciliation actuator.
  - `docs/strategy/classic-refactor-principles.md` — ten rules for porting (preserve goal not file structure, artifact contract not cache location, evaluator semantics not registry sprawl, etc.).
  - `docs/strategy/classic-behavior-roadmap.md` — phased migration plan (Phase A already represented, Phase B next distillations, Phase C later maturity, Phase D deferred surfaces).
  - `docs/strategy/classic-alignment-map.md` — quick-lookup table mapping classic source areas to Rekon roles, artifacts, packages, and phases.
- Updated `AGENTS.md` to require a `CODEBASE-INTEL ALIGNMENT` section in major capability work and to state that new capabilities should distill, generalize, or prepare migration for a proven classic behavior unless explicitly marked as experimental exploration.
- Updated `CONTRIBUTING.md` to require contributors to read the classic behavior docs before proposing migrated capabilities, and to require proposals to identify what is good, what is accidental, and how Rekon will preserve the win.
- Updated `docs/strategy/north-star.md` and `docs/strategy/roadmap.md` to cross-link the new classic behavior docs.
- Added `tests/docs/classic-behavior-distillation.test.mjs` covering: all six new strategy docs exist, every behavior family appears in the distillation, every principle appears in the wins doc, every required example appears in the translation doc, every refactor principle appears in the refactor doc, the roadmap defines phases A–D, the alignment map covers every behavior family row, `AGENTS.md` requires `CODEBASE-INTEL ALIGNMENT`, and `CONTRIBUTING.md` links the classic docs.
- No kernel, SDK, runtime, CLI, capability, or artifact behavior changes. Docs/strategy/test pass only.
- Added `examples/import-boundary-rule-pack/`: the first migrated external rule pack capability. Maps to `codebase-intel-classic` import governance (`domain/issues/evaluators/imports/*`, `domain/issues/RulesResolver.ts`, `services/issues/detection-phases.ts`). The package registers an evaluator with id `import-boundaries.evaluate` that consumes the latest `EvidenceGraph` and produces a `FindingReport` containing:
  - `import_boundary.parent_relative_import` (severity: medium) — imports starting with `../`.
  - `import_boundary.generated_output_import` (severity: high) — imports referencing `dist/` or `build/`.
- The rule pack ships its own README, conformance test (`assertCapabilityConforms()` + synthetic-graph evaluator harness), and fixture under `fixtures/bad-imports/`. Package-level test command: `npm --prefix examples/import-boundary-rule-pack run test`.
- Added `tests/integration/import-boundary-rule-pack-cli.test.mjs` that runs the full external rule-pack flow through the CLI (`config validate`, `capabilities list`, `capabilities inspect`, `observe`, `evaluate list`, `evaluate run import-boundaries.evaluate`, `artifacts validate`) and asserts that both finding types are emitted with the right severities. The test self-skips when `node_modules/rekon-capability-import-boundaries-example` is absent.
- Updated `README.md`, `docs/extensions/authoring-capabilities.md`, `docs/strategy/capability-model.md`, `docs/strategy/roadmap.md`, `docs/strategy/classic-alignment-map.md`, and `docs/strategy/classic-behavior-roadmap.md` to reference the new external rule pack and mark Phase B's "first external rule-pack example" as shipped.
- No SDK, runtime, kernel, CLI, or built-in capability behavior changes. No version bump. The example evaluator is an external capability and is not registered as a built-in.
- Added artifact freshness validation and a CLI surface for it.
- Added `validateArtifactFreshness(store, options?)` to `@rekon/runtime`. The helper inspects every indexed artifact's `header.inputRefs`, compares to the latest indexed artifact of the same input type, and reports `fresh` / `stale` / `partial` / `unknown` per artifact and in aggregate. Issue codes are `newer-input-exists`, `input.missing`, `lineage.unknown`, and `artifact.unreadable`. Results include `status`, `checkedAt`, `issues`, and `artifacts: { type, id, status, issues }[]`.
- Added new runtime exports: `ArtifactFreshnessStatus`, `ArtifactFreshnessIssue`, `ArtifactFreshnessEntry`, `ArtifactFreshnessResult`, `ArtifactFreshnessOptions`.
- Added `rekon artifacts freshness [--type <type>] [--id <id>] [--json]` CLI command backed by `validateArtifactFreshness`. `rekon artifacts validate` remains integrity-only.
- Tightened CLI helpers `ensureSnapshotReady` and `ensurePreflight` to only run a new `runSnapshot()` when there is no existing snapshot or the latest known inputs are newer than the latest snapshot. Prior behavior unconditionally re-ran snapshot, which made artifacts written before publish/preflight legitimately stale even on a clean golden flow. The new behavior keeps the latest artifact of every major type `fresh` after the golden flow without changing artifact/SDK contracts.
- Added `tests/contract/artifact-freshness.test.mjs` (6 tests) covering: golden-flow freshness of the latest artifact of every major type; FindingReport stale after a newer EvidenceGraph; ResolverPacket stale after newer model/finding/snapshot inputs; Publication stale after newer resolver/snapshot inputs; missing `inputRef` produces `partial`; CLI JSON shape contract.
- Documented the freshness model in `docs/concepts/freshness-and-invalidation.md` (statuses, integrity-vs-freshness, check rules, CLI surface, invalidation rule shape, snapshot-vs-validator distinction). Updated `docs/artifacts/artifact-header.md`, `docs/artifacts/intelligence-snapshot.md`, `docs/extensions/capability-manifest.md`, and `docs/strategy/capability-model.md` to reference the new surface and clarify how today's freshness validator evaluates `invalidatedBy.inputs` while `paths`/`events` remain future intent.
- Added a Freshness section to both external capability READMEs (`examples/custom-capability/README.md`, `examples/import-boundary-rule-pack/README.md`) showing the `rekon artifacts freshness --type <type>` flow.
- Updated `docs/strategy/classic-behavior-roadmap.md` to mark the lineage-based freshness portion of the Phase B "freshness/invalidation engine" item as shipped; path/event-driven invalidation remains future watcher work.
- No watcher or daemon added. No file-system mtime/inotify integration. No artifact header shape changes. No SDK changes. No new capability roles. No version bump. No npm publish.
- Extended `@rekon/capability-resolver` with three new resolver handlers alongside the existing `resolve.preflight`:
  - `resolve.route` — given paths + goal, decide single-owner / cross-owner / unresolved routing. Sets `nextRequiredResolver` to `resolve.preflight` or `resolve.seam`. Records routing decision in `resolutionTrace`.
  - `resolve.seam` — given paths spanning owners, designate primary + secondary owners or escalate when a primary cannot be chosen. Honors an explicit `primaryOwner` input when it matches one of the resolved systems.
  - `resolve.issue` — given an issue id or fragment, find the matching `Finding` (exact id first, unique-fragment fallback). Surfaces ambiguous-match and missing-match warnings without silently choosing. Resolves ownership for the matched finding's files and recommends `resolve.preflight` / `resolve.seam` / `resolve.route` accordingly.
- Added a shared `ResolverPacketBase` shape (`resolverId`, `phase`, `summary`, `warnings`, `nextSteps`, `resolutionTrace`) plus per-phase packet types (`RoutePacket`, `SeamPacket`, `IssuePacket`). The existing `PreflightPacket` is unchanged.
- Friendly CLI shortcuts added: `rekon resolve route`, `rekon resolve seam`, `rekon resolve issue`. Generic dispatch (`rekon resolve list` / `rekon resolve run <id>`) works for every resolver. New CLI helper `ensureSnapshotForResolver` shares snapshot readiness across the three new commands and only writes a new snapshot when one is missing or inputs are newer than the latest snapshot.
- Updated `docs/concepts/resolvers.md`, `docs/artifacts/resolver-packet.md`, `docs/strategy/capability-model.md`, `docs/strategy/roadmap.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, and the root `README.md` to describe the resolver phase flow, the new packet fields per phase, and the `route → seam → preflight` / `issue → …` flow.
- Added `tests/contract/route-seam-issue-resolvers.test.mjs` covering 12 direct-evaluator scenarios (single-owner / cross-owner / unresolved routing, seam resolved / needs-primary / unresolved, issue exact / fragment / ambiguous / cross-owner / missing) plus 7 CLI tests (`resolve list` reports all four resolvers, each friendly shortcut writes a phase-tagged packet, `resolve run resolve.route` dispatches the same handler, existing preflight still works, and `artifacts freshness` stays clean after writing route/seam/issue packets).
- No artifact header shape changes. No SDK changes. No new capability roles. No version bump. No npm publish.
- Added finding lifecycle and status preservation.
- `@rekon/kernel-findings` exports `FindingStatusDecision`, `FindingStatusDecisionStatus`, `FindingStatusDecisionReason`, `FindingStatusLedger`, `EffectiveFinding`, `EffectiveFindingLifecycle`, `FindingLifecycleReport`, and `FindingLifecycleInput` types plus `createFindingStatusLedger`, `validateFindingStatusLedger`, `assertFindingStatusLedger`, `findingStatusLedgerSchema`, `createFindingLifecycleReport`, `validateFindingLifecycleReport`, `assertFindingLifecycleReport`, `findingLifecycleReportSchema`, `applyFindingStatusDecisions`, `deriveFindingLifecycle`, and `findLatestDecisionForFinding` helpers. Raw `Finding` and `FindingReport` shapes are unchanged.
- `@rekon/runtime` exports `BuildFindingLifecycleOptions` and `buildFindingLifecycleReport(store, options?)` which reads every indexed `FindingReport` (latest = active, earlier = previous), the latest `FindingStatusLedger`, and computes a `FindingLifecycleReport` projection.
- `FindingStatusLedger` is now treated as a canonical input artifact for freshness purposes (alongside `EvidenceGraph`, `Rulebook`, and `OperatorFeedbackEntry`); ledger artifacts with no `inputRefs` do not raise `lineage.unknown`.
- New CLI commands:
  - `rekon findings list [--status <status>]` — prints effective findings (id, type, severity, files, `effectiveStatus`, `statusSource`, `statusReason`, `statusNote`).
  - `rekon findings lifecycle` — writes a `FindingLifecycleReport` artifact via the runtime store.
  - `rekon findings status list` — prints the decisions in the latest `FindingStatusLedger`.
  - `rekon findings status set <finding-id> --status accepted|ignored|resolved --note <note> [--reason <reason>]` — appends or replaces a decision for the finding id and writes a new `FindingStatusLedger`. `ignored` and `resolved` require `--note`; `--reason` accepts `accepted-risk`, `false-positive`, `fixed`, `not-actionable`, or `other`.
- Updated `resolve.issue` to read the latest `FindingStatusLedger` (when one is indexed) and annotate the matched `issue` with `status`, `statusSource`, `statusNote`, and `statusReason`. Adds a warning when the matched finding is `accepted` ("verify policy before changing"), `ignored` ("verify before acting"), or `resolved` ("confirm whether action is still needed"). The resolver does not silently treat ignored/accepted findings as no-ops.
- Added `tests/contract/finding-lifecycle.test.mjs` (13 tests) covering: ledger validation rejects ignored decisions without notes; `deriveFindingLifecycle` marks first-seen findings as new, repeated findings as existing, ledger decisions override derived status, absent prior findings become resolved; CLI `findings lifecycle`, `findings list`, and `findings status set` end-to-end; CLI rejection of `findings status set --status ignored` without `--note`; `resolve.issue` annotates accepted/ignored matches with status and warnings; `rekon artifacts freshness` keeps `FindingStatusLedger` and `FindingLifecycleReport` in the output and stays away from `unknown`.
- Documented the lifecycle model: `docs/concepts/finding-lifecycle.md`, `docs/artifacts/finding-status-ledger.md`, `docs/artifacts/finding-lifecycle-report.md`. Updated `docs/artifacts/finding-report.md`, `docs/artifacts/resolver-packet.md`, `docs/concepts/resolvers.md`, `docs/strategy/roadmap.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, and the root `README.md` to point at the new surface.
- No artifact header shape changes. No SDK changes. No new capability roles. `Finding.status` enum is unchanged. `FindingReport` shape is unchanged; lifecycle data lives in separate `FindingStatusLedger` and `FindingLifecycleReport` artifacts. No version bump. No npm publish.
- Added Coherency Delta Lite — a derived governance artifact rolled up from `FindingLifecycleReport`.
- `@rekon/kernel-findings` exports `CoherencyDelta`, `CoherencyDeltaItem`, `CoherencyDeltaItemStatus`, `CoherencyDeltaSeverity`, `CoherencyDeltaSummary`, `CoherencyDeltaInput`, `CoherencyRemediationStep`, `CoherencyRemediationPriority`, `severityToPriority`, and the helpers `createCoherencyDelta`, `validateCoherencyDelta`, `assertCoherencyDelta`, `coherencyDeltaSchema`.
- `@rekon/runtime` exports `BuildCoherencyDeltaOptions` and `buildCoherencyDelta(store, options?)`. The helper reads the latest `FindingLifecycleReport` (or builds one in place), the latest `OwnershipMap` and `ObservedRepo`, assigns systems per finding by longest-prefix match (`OwnershipMap` → `ObservedRepo` → `"unknown"`), and emits a `CoherencyDelta` with full `header.inputRefs`. `FindingStatusLedger`, `FindingLifecycleReport`, and `CoherencyDelta` are now in the artifact category map under `findings`.
- New CLI command `rekon coherency delta [--root <path>] [--json]` writes a `CoherencyDelta` artifact and prints `{ artifact, summary, remediationQueue }`.
- Coherency delta semantics:
  - `active === true` when finding status is `new` or `existing`. `accepted`, `ignored`, and `resolved` items are included for visibility but excluded from `summary.active` and from `remediationQueue`.
  - Priority mapping: `critical` and `high` → `p0`; `medium` → `p1`; `low` → `p2`.
  - Items and remediation queue are sorted deterministically (active first, then severity rank, then status rank, then `findingId`; queue by priority then `findingId`).
  - Summary includes `total`, `active`, `resolved`, `accepted`, `ignored`, `bySeverity`, `byType`, `bySystem`, and `topPaths` (up to 10 paths by occurrence count).
- Added `tests/contract/coherency-delta.test.mjs` (10 tests) covering: kernel-level summary by severity/type/system, accepted/ignored exclusion from active, resolved findings included but not active, remediation queue priority mapping and ordering, `severityToPriority` per-severity, `OwnershipMap`-based system assignment, `"unknown"` fallback, CLI writing a `CoherencyDelta`, freshness marking older deltas stale after a newer `FindingLifecycleReport`, and `artifacts validate` staying clean with `CoherencyDelta` indexed.
- Added `docs/artifacts/coherency-delta.md` and `docs/concepts/coherency-delta.md`. Updated `docs/artifacts/finding-lifecycle-report.md`, `docs/concepts/finding-lifecycle.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, the root `README.md`, and `CHANGELOG.md`.
- No artifact header shape changes. No SDK changes. No new capability roles. `Finding`, `FindingReport`, `FindingStatusLedger`, and `FindingLifecycleReport` shapes are unchanged. No version bump. No npm publish.
- Added architecture summary publisher and `rekon publish architecture` CLI shortcut.
- `@rekon/capability-docs` registers a second publisher `@rekon/capability-docs.architecture-summary` (alongside the existing `@rekon/capability-docs.publisher`). The publisher consumes the latest `IntelligenceSnapshot` (required), plus `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `CoherencyDelta`, and `FindingLifecycleReport` (each optional) and emits one `Publication` artifact.
- Extended the package-local `PublicationArtifact.kind` enum to include `"architecture-summary"` and added an optional `title` field. The artifact `kind` is package-internal metadata; the `Publication` artifact type itself is unchanged at the kernel level.
- Added `@rekon/kernel-findings` and `@rekon/kernel-repo-model` as dependencies of `@rekon/capability-docs` (used internally for type imports). The capability manifest now declares `consumes` of `IntelligenceSnapshot`, `ResolverPacket`, `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `CoherencyDelta`, and `FindingLifecycleReport`, and adds a `coherency.changed` invalidation rule alongside the existing `snapshot.changed` rule.
- New CLI command `rekon publish architecture [--root <path>] [--json]` invokes the new publisher via `runPublish({ publisherId })` after `ensureSnapshotReady`. Generic `rekon publish run @rekon/capability-docs.architecture-summary` is equivalent.
- The publication content is a Markdown document with the following sections: Repository Overview, Owner Systems (table, capped at 20 rows), Capability Map (bullets, capped at 20), Coherency Summary (active/accepted/ignored/resolved counts plus severity breakdown — surfaces a "run `rekon coherency delta`" hint when missing), Top Affected Paths, Remediation Queue (priority/finding/severity/systems/action — capped at 20 rows), Agent Guidance, Freshness, Input Artifacts (header refs). When inputs are missing, the section text explains what to run next instead of pretending data exists.
- Added `tests/contract/architecture-summary-publisher.test.mjs` (8 tests) covering: publisher appears in `publish list`; CLI shortcut writes a `Publication` containing every documented section; generic `publish run` dispatches the same handler; `inputRefs` cite `IntelligenceSnapshot`/`ObservedRepo`/`OwnershipMap`/`CapabilityMap`/`CoherencyDelta` when present; the publication flags missing `CoherencyDelta`; `artifacts freshness` marks older summaries `stale` after a newer `CoherencyDelta`; existing `publish agents` still works; running the publisher against the import-boundary rule pack fixture surfaces active findings + a P0/P1 remediation row (test self-skips if the rule pack is not installed).
- Updated `packages/capability-docs/test/docs.test.mjs` to invoke `runPublish` with `publisherId: "@rekon/capability-docs.publisher"` so the existing docs-publisher test stays scoped, and added a new test exercising the architecture-summary publisher directly through the runtime.
- Added new docs: `docs/artifacts/architecture-summary-publication.md`, `docs/concepts/architecture-summary-publication.md`. Updated `docs/extensions/authoring-capabilities.md`, `docs/artifacts/coherency-delta.md`, `docs/concepts/coherency-delta.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, the root `README.md`, and this `CHANGELOG.md` to describe the new publisher and surface.
- No artifact header shape changes. No SDK changes. No new capability roles. No kernel contract changes (`Publication` shape at the kernel level is unchanged; the new `kind` value lives in the package-local artifact type). No version bump. No npm publish. The publisher reads existing artifacts and does not synthesize a `CoherencyDelta` or `FindingLifecycleReport` if missing — it surfaces the gap in the markdown instead.
- Added remediation work orders generated from `CoherencyDelta`.
- `@rekon/capability-intent` registers a second actuator `@rekon/capability-intent.remediation-work-order` (alongside the existing `@rekon/capability-intent.work-order`). The new actuator consumes the latest `CoherencyDelta` (required), plus the latest `FindingLifecycleReport` and `ResolverPacket` (each optional), and writes one `IntentMap`, one `WorkOrder`, and one `VerificationPlan` per invocation. Accepted/ignored/resolved findings are excluded because they never enter `CoherencyDelta.remediationQueue`. When no active items remain, the actuator writes no artifacts and the CLI returns `{ artifacts: [], selectedItems: [], message }`.
- Extended the package-local `WorkOrder` type with optional `source: "resolver" | "coherency-delta"` and `remediationItems: RemediationWorkOrderItem[]` fields. Existing resolver-based work orders set `source: "resolver"` and omit `remediationItems`. The `WorkOrder` artifact type at the kernel level is unchanged.
- Added `@rekon/kernel-findings` as a dependency of `@rekon/capability-intent` (used for `CoherencyDelta`, `CoherencyRemediationStep`, `CoherencyRemediationPriority`, and `FindingLifecycleReport` type imports). The capability manifest now declares `consumes` of `ResolverPacket`, `CoherencyDelta`, and `FindingLifecycleReport`, and adds `coherency.changed` and `lifecycle.changed` invalidation rules alongside the existing `preflight.changed` rule.
- New CLI command `rekon intent remediation [--finding <finding-id>] [--priority p0|p1|p2] [--limit <n>] [--root <path>] [--json]`. Optional filters select a subset of `CoherencyDelta.remediationQueue`; default limit is 5. The command auto-runs `ensureCoherencyDeltaReady` (which auto-runs observe/project/evaluate/snapshot/lifecycle/delta if missing) before dispatching `@rekon/capability-intent.remediation-work-order`.
- The remediation work-order markdown body contains, in order: Source (CoherencyDelta id, + FindingLifecycleReport id when available), Objective, Selected Remediation Items table (priority/finding/severity/systems/files/action), Scope (paths + owner systems), Required Checks (`npm run typecheck`, `npm run test`, `npm run build`, `rekon artifacts validate --json`, `rekon artifacts freshness --json`), Success Criteria, Guardrails (strengthened anti-gaming instruction + optional Risk Notes), Follow-up Evidence (re-run evaluate/findings lifecycle/coherency delta/publish architecture).
- The anti-gaming instruction was strengthened to: *"Do not modify tests, artifact validators, rules, findings, status ledgers, or verification scripts merely to make this work order appear complete. Verification gates exist to prove real implementation correctness; if a gate is wrong, record that as a finding or follow-up instead of gaming it."*
- The `VerificationPlan` for remediation work orders includes the same five commands the work order requires, plus `successCriteria` mirrored from the work order. The actuator never executes the commands.
- Added `tests/contract/remediation-work-order.test.mjs` (12 tests) covering: `intent remediation` writes IntentMap/WorkOrder/VerificationPlan from active findings; active CoherencyDelta items are selected and accepted/ignored findings are excluded; `--priority` and `--finding` filters narrow the selection; no-active-items returns no artifacts with a clear message; the work order markdown includes Selected Remediation Items and the strengthened anti-gaming guardrail; the verification plan includes validate/freshness commands; the work order cites `CoherencyDelta` in `header.inputRefs`; `artifacts freshness` marks older remediation work orders stale after a newer CoherencyDelta; the existing `intent work-order` (resolver-based) command still works; the import-boundary rule pack fixture surfaces a `p0` remediation row (test self-skips if the rule pack is not installed).
- Added new docs: `docs/artifacts/verification-plan.md`, `docs/concepts/remediation-work-orders.md`. Updated `docs/artifacts/work-order.md` to describe both work-order flavors, `docs/artifacts/coherency-delta.md` and `docs/concepts/coherency-delta.md` to list the remediation work-order actuator as a consumer, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, the root `README.md`, and this `CHANGELOG.md`.
- No artifact header shape changes. No SDK changes. No new capability roles. No kernel contract changes (`WorkOrder`, `VerificationPlan`, and `IntentMap` at the kernel level are unchanged; the new `source` and `remediationItems` fields live on the package-local `WorkOrder` type). No source-writing reconciliation. No auto-apply. No version bump. No npm publish.
- Added reconciliation suggestion plans generated from `WorkOrder` / `CoherencyDelta`.
- `@rekon/capability-reconcile.actuator` now supports two modes: manual (operator-driven, artifact-only, existing behavior unchanged) and suggestion (governance-driven, classifies each remediation item into a `ReconciliationPlanOperation`). Suggestion mode reads the latest `WorkOrder` with `source === "coherency-delta"` if available, otherwise falls back to the latest `CoherencyDelta`. Source-write and command operations are never applied.
- New exported helper `suggestReconciliationOperations(input)` is a pure function that classifies remediation items by inspecting `title` + `action` text (case-insensitive). Mapping: docs/documentation/README/AGENTS -> `docs_regeneration` artifact-only; baseline/accept/ignore/false positive/status ledger -> `finding_baseline_write` artifact-only; import/generated output/dist/build/boundary -> `safe_import_rewrite` source-write-deferred (requires `write:source`); scaffold/generate file/create file -> `generated_scaffold_write` source-write-deferred (requires `write:source`); test/verify/command/run -> `verification_command_run` command-deferred (requires `execute:commands`); unmatched -> `manual_review` manual-review.
- Extended package-local `ReconciliationPlan` shape with optional `summary` (per-class and per-status counts) and richer per-operation fields: `class` (`artifact-only`/`deterministic-deferred`/`source-write-deferred`/`command-deferred`/`manual-review`), `source` (`manual`/`work-order`/`coherency-delta`), `findingId`, `priority`, `files`, `systems`, `suggestedAction`, `requiresPermission`. Existing single-operation legacy plans now also include `class: "artifact-only"` and `source: "manual"` so the summary stays meaningful. The `ReconciliationPlan` artifact type at the kernel level is unchanged.
- Added a new `manual_review` value to the package-local `ReconciliationOperation` union so unclassified remediation items have a first-class home instead of being misclassified or denied.
- Extended `ReconciliationLog` (additive only) with optional `planned` and `denied` arrays of full `ReconciliationPlanOperation` records. Existing `applied` / `deferred` string-arrays are unchanged.
- Added `@rekon/kernel-findings` as a dependency of `@rekon/capability-reconcile` (used internally for `CoherencyDelta`, `CoherencyRemediationStep`, and `CoherencyRemediationPriority` type imports). The capability manifest now declares `consumes` of `IntelligenceSnapshot`, `Publication`, `FindingReport`, `CoherencyDelta`, and `WorkOrder`, and adds `coherency.changed` and `work-order.changed` invalidation rules alongside the existing `snapshot.changed` rule.
- New CLI command `rekon reconcile suggest [--finding <finding-id>] [--priority p0|p1|p2] [--limit <n>] [--apply] [--root <path>] [--json]`. Reads the latest remediation work order or coherency delta, classifies operations, and writes one `ReconciliationPlan`, one `ReconciliationLog`, and one `ActionLog`. `--apply` only applies `artifact-only` operations; source-write and command operations stay `deferred`. CLI auto-runs `ensureCoherencyDeltaReady` (observe/project/evaluate/snapshot/lifecycle/delta as needed) before dispatching.
- Existing CLI command `rekon reconcile [--operation <name>] [--apply]` is unchanged. The legacy path still denies any non-artifact-only operation passed via `--operation`.
- Added `tests/contract/reconciliation-suggestions.test.mjs` (17 tests): 7 unit tests over the pure classification helper (import / docs / test / unknown / baseline / WorkOrder-preferred / filters + limit) and 10 CLI integration tests covering writes/summary/priority/finding filters, `--apply` artifact-only behavior, the legacy `rekon reconcile --operation` path still working and still denying source ops, freshness staleness after a newer CoherencyDelta, and a self-skipping import-boundary rule pack integration test that confirms all import remediation lands as deferred `safe_import_rewrite` with `write:source` permission.
- Added new docs: `docs/artifacts/reconciliation-plan.md`, `docs/concepts/reconciliation-plans.md`. Rewrote `docs/artifacts/reconciliation-log.md` to describe the optional `planned`/`denied` fields and the manual vs suggestion modes. Updated `docs/artifacts/work-order.md`, `docs/artifacts/coherency-delta.md`, `docs/concepts/coherency-delta.md`, `docs/concepts/remediation-work-orders.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, root `README.md`, and this `CHANGELOG.md`.
- No artifact header shape changes. No SDK changes. No new capability roles. The `ReconciliationPlan`, `ReconciliationLog`, and `ActionLog` artifact types at the kernel level are unchanged; the new fields live on package-local types. No source writes. No command execution. No auto-apply for deferred classes. No version bump. No npm publish.
- Added verification result recording.
- `@rekon/capability-intent` now exports `createVerificationResult(input)` plus the package-local `VerificationResult`, `VerificationCommandResult`, `VerificationResultSummary`, `VerificationCommandStatus`, `VerificationResultStatus`, `VerificationPlanLike`, and `CreateVerificationResultInput` types. The helper takes a `VerificationPlan`, a list of operator-supplied `VerificationCommandResult` entries, and writes a single `VerificationResult` artifact with deterministic overall-status derivation.
- The helper fills missing plan commands with `not-run` entries (preserving the plan's command order), appends submitted commands not in the plan after the plan-ordered list, and derives the overall status: `passed` (all plan commands passed, none failed), `failed` (any command failed), `partial` (some commands `skipped`/`not-run` and none failed), `not-run` (empty submission or every entry is `not-run`).
- Raw stdout/stderr is not stored by default. Operators can attach `stdoutDigest` / `stderrDigest` (e.g. SHA-256 hex) and `notes` for additional context. This keeps artifacts small and prevents accidental secret capture.
- The `VerificationResult.header.inputRefs` always include the consumed `VerificationPlan`. When the plan exposes a `workOrderRef`, the work order is also cited. Extra evidence artifact refs can be supplied via `createVerificationResult({ extraInputRefs })`.
- New CLI command `rekon verify record [--plan <id|type:id>] --result-json <json> [--root <path>] [--json]`. The CLI parses operator-supplied JSON of shape `{ recordedBy?, evidenceNotes?, commands: [{ command, status, exitCode?, durationMs?, startedAt?, completedAt?, stdoutDigest?, stderrDigest?, notes? }] }`, resolves the requested plan (defaulting to the latest with a warning), invokes the helper, and writes the artifact under the `actions` category. Unknown plans return a clear error listing known plan ids.
- The artifact freshness validator already tracks `VerificationPlan` and `WorkOrder` in `header.inputRefs`, so `rekon artifacts freshness --type VerificationResult` marks an older result `stale` automatically once a newer plan or work order lands.
- Added `tests/contract/verification-result.test.mjs` (18 tests): 7 helper unit tests covering all-passed/any-failed/missing-as-not-run/empty-as-not-run/extra-command preservation/inputRefs/digest+notes preservation, plus 11 CLI/runtime integration tests covering default-plan-with-warning, explicit `--plan <id>`, `--plan type:id`, unknown-plan rejection, no-plan-exists rejection, missing-`--result-json` rejection, malformed-JSON rejection, `artifacts validate` clean, freshness staleness after a newer plan, the existing `intent work-order` and `intent remediation` flows still working, and failed-command status preservation end-to-end.
- Added new docs: `docs/artifacts/verification-result.md`, `docs/concepts/verification-results.md`. Updated `docs/artifacts/verification-plan.md`, `docs/artifacts/work-order.md`, `docs/concepts/remediation-work-orders.md`, `docs/extensions/authoring-capabilities.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, the root `README.md`, and this `CHANGELOG.md`.
- No artifact header shape changes. No SDK changes. No new capability roles. The `VerificationResult` artifact type is package-local (kernel runtime already mapped its category). No command execution. No source writes. No auto-apply or auto-publish based on results. No version bump. No npm publish.
- Added architecture summary v2 — proof-loop publication sections.
- `@rekon/capability-docs.architecture-summary` now reads the latest available `WorkOrder` (one remediation work order where `source === "coherency-delta"`, plus one resolver work order), `ReconciliationPlan`, `VerificationPlan`, and `VerificationResult` alongside the existing `IntelligenceSnapshot`, `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `CoherencyDelta`, and `FindingLifecycleReport` inputs. Every artifact actually read is cited in `header.inputRefs`. The publisher does not import from `@rekon/capability-intent` or `@rekon/capability-reconcile`; it defines minimal local "Like" types and reads each artifact through the standard reader to avoid a package cycle.
- Extended `renderArchitectureSummary` to emit four new sections between the existing Remediation Queue and Agent Guidance sections:
  - **Work Orders**: table with one row per available work-order flavor (`coherency-delta` and `resolver`) showing source, goal, paths, owner systems, and selected item count. Missing work orders are called out with a `rekon intent remediation` / `rekon intent work-order` hint.
  - **Reconciliation Plans**: summary row (total / artifact-only / source-write deferred / command deferred / manual review / applied / planned / deferred / denied) plus up to 5 top operations with class, status, permission, and finding id. Missing plans recommend `rekon reconcile suggest`.
  - **Verification Status**: status row (status / passed / failed / skipped / not-run / recorded by / recorded at). Explicit "Verification is not complete." line when status is `failed`/`partial`/`not-run`. Explicit "VerificationResult may be stale; latest VerificationPlan differs." line when the result references an older plan. Missing results recommend `rekon verify record`.
  - **Proof Loop**: governance / planning / verification state bullets plus a single "Suggested next command:" line that walks `coherency delta -> intent remediation -> reconcile suggest -> intent remediation or intent work-order -> verify record -> address failures -> rerun evaluate/lifecycle/coherency-delta/publish architecture` in priority order.
- Updated the capability manifest: `consumes` now lists `WorkOrder`, `ReconciliationPlan`, `VerificationPlan`, and `VerificationResult`. Added a new `proof-loop.changed` invalidation rule citing those four input types alongside the existing `snapshot.changed` and `coherency.changed` rules. `rekon artifacts freshness` now marks an older architecture summary `stale` once any newer proof-loop input is indexed.
- Added `tests/contract/architecture-summary-proof-loop.test.mjs` (11 tests): all four new sections always present; recommend `rekon verify record` when no result exists; recommend `rekon coherency delta` when missing; partial verification surfaces the not-run count and triggers the "address failures" suggestion; failed verification surfaces the failed table row and the "not complete" callout; `header.inputRefs` cite the new artifacts when present; Work Orders table distinguishes `coherency-delta` and `resolver` rows; stale-plan callout fires when the latest result references an older plan; freshness marks the publication stale after a newer `VerificationResult`; existing `publish agents` still works; import-boundary fixture (self-skipping) confirms reconciliation classification rows include `safe_import_rewrite`, `source-write-deferred`, and `write:source`.
- Updated `docs/artifacts/architecture-summary-publication.md` and `docs/concepts/architecture-summary-publication.md` to describe the new sections, inputs, and freshness behavior. Added "Surfaced In Publications" notes to `docs/concepts/verification-results.md`, `docs/concepts/reconciliation-plans.md`, and `docs/concepts/remediation-work-orders.md`, plus a new "Consumed By" entry on `docs/artifacts/verification-result.md`. Updated `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, the root `README.md`, and this `CHANGELOG.md`.
- No artifact header shape changes. No SDK changes. No new capability roles. No new actuator/handler — only the existing publisher learned to read more artifacts. No kernel changes. No command execution. No source writes. No auto-apply based on verification results. No verification judgment. No GitHub/CI/dashboard surfaces. No version bump. No npm publish.
- Added verification-aware issue and remediation context.
- New exports from `@rekon/capability-intent`:
  - `lookupVerificationEvidence(artifacts, findingId)`: a pure async helper that chains `findingId -> WorkOrder.remediationItems -> VerificationPlan.workOrderRef -> VerificationResult.verificationPlanRef` and returns a typed `VerificationEvidenceSummary` with status (`passed` / `failed` / `partial` / `not-run` / `missing`), the underlying artifact refs, the result's summary counts, recorded-by/recorded-at, and any non-fatal lookup warnings. Matching is by `findingId` and artifact refs; no semantic or text-based heuristics.
  - `VerificationEvidenceStatus` and `VerificationEvidenceSummary` types.
- Extended `RemediationActuatorInput` with optional `excludeFindingIds: string[]`. The actuator filter now drops any remediation step whose `findingId` is in the exclusion set. Existing `--finding` / `--priority` / `--limit` filters are unchanged.
- `@rekon/capability-resolver` now depends on `@rekon/capability-intent` (no cycle — `capability-intent` does not depend on `capability-resolver`). Added matching tsconfig project reference. `@rekon/capability-resolver` re-exports `VerificationEvidenceStatus` and `VerificationEvidenceSummary` for convenience.
- `IssuePacket` gained an optional `verification: VerificationEvidenceSummary` field. The `resolve.issue` resolver now invokes `lookupVerificationEvidence` for every matched finding, attaches the summary, adds a status-specific warning (`failed` / `partial` / `not-run` / `missing` each have a distinct warning; `passed` does not warn), and emits an `issue.verification` `resolutionTrace` entry with `sourceType` set to the deepest matched artifact (`VerificationResult` / `VerificationPlan` / `WorkOrder` / `Fallback`). `issueNextSteps` was extended to include a verification-aware recommended action (e.g. "Run `rekon verify record` against the existing VerificationPlan to capture proof.").
- Extended `ResolutionTraceEntry.sourceType` enum with three additive values: `"WorkOrder"`, `"VerificationPlan"`, `"VerificationResult"`. Existing consumers reading `sourceType` already use string-typed switches.
- Updated the `@rekon/capability-resolver` manifest: `consumes` now lists `WorkOrder`, `VerificationPlan`, and `VerificationResult` alongside the existing inputs. Added a new `verification.changed` invalidation rule citing those three types so older `resolve.issue` packets are correctly marked `stale` when verification evidence moves.
- Important invariant preserved: passing verification **never** auto-resolves the finding, mutates `FindingStatusLedger`, or removes the issue from `relatedFindings`. It only changes the recommended next step and adds informational context. The trace records the decision.
- New CLI flag `rekon intent remediation --skip-verified`. When set, the CLI reads the latest `CoherencyDelta`, calls `lookupVerificationEvidence` for each candidate `findingId` (respecting any `--finding` / `--priority` filters), and builds an `excludeFindingIds` list of items whose chain resolves to `passed`. The list is passed to the actuator via the new `excludeFindingIds` input. Excluded findings are reported back to the operator in a new top-level `skippedVerified: Array<{ findingId, status: "passed", verificationResultRef }>` field. `failed`, `partial`, `not-run`, and `missing` findings are never skipped. The flag is opt-in; default behavior is unchanged.
- When `--skip-verified` removes every candidate, the CLI writes no new artifacts and returns `{ artifacts: [], selectedItems: [], skippedVerified: [...], message: "No active remediation items remain after skipping verified items." }`. Existing "no active remediation items" message is preserved for the unfiltered path.
- Added `tests/contract/verification-aware-issue-remediation.test.mjs` (12 tests): 6 cover `resolve.issue` integration (missing / not-run / partial / failed / passed without auto-resolve / `issue.verification` trace presence). 5 cover `intent remediation --skip-verified` (passes skipped, failed retained, not-run/partial retained, all-skipped path writes no new work order, default flow ignores verification). 1 self-skipping import-boundary fixture integration test confirms the passed-verification path skips every finding under that WorkOrder.
- Added new docs / sections: updated `docs/concepts/resolvers.md` with the verification lookup behavior; `docs/artifacts/resolver-packet.md` documents the new `verification` field, the warning matrix, and the `issue.verification` trace step; `docs/concepts/remediation-work-orders.md` documents `--skip-verified`, `skippedVerified` output shape, and the all-skipped path; `docs/concepts/verification-results.md` adds a "Surfaced In Resolvers And Remediation" section; `docs/artifacts/work-order.md` adds `resolve.issue` and `intent remediation --skip-verified` to its Consumed By list; `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, the root `README.md`, and this `CHANGELOG.md` are updated.
- No artifact header shape changes. No SDK changes. No new capability roles. The `VerificationResult` artifact type and the `WorkOrder` shape at the kernel level are unchanged. No command execution. No source writes. No auto-apply. No automatic mutation of `FindingStatusLedger` or finding lifecycle. No CI/GitHub integration. No semantic verification judgment. No version bump. No npm publish.
- Added proof report publication.
- `@rekon/capability-docs` registers a third publisher `@rekon/capability-docs.proof-report` (alongside the existing `.publisher` and `.architecture-summary`). The new publisher reads the latest available `IntelligenceSnapshot` (optional; used for the header subject when present), up to two `WorkOrder` artifacts (one remediation order where `source === "coherency-delta"` and one resolver order), the latest `VerificationPlan` (the minimum useful input), the latest `VerificationResult`, plus optional `CoherencyDelta`, `ReconciliationPlan`, and `FindingLifecycleReport` for context. Every artifact actually read is cited in `header.inputRefs`; missing artifacts are not cited.
- Extended package-local `PublicationArtifact.kind` to include `"proof-report"` alongside `"agents"`, `"repo-summary"`, and `"architecture-summary"`. The `Publication` artifact type at the kernel level is unchanged.
- The proof report content is a Markdown document with these sections when a `VerificationPlan` exists: **Proof Status** (status / passed / failed / skipped / not-run row plus a `> Verification is not complete.` callout for failed/partial/not-run or a `> Verification recorded as passed. This does not automatically resolve findings.` callout for passed); **Work Order** (source / goal / paths / systems for the latest remediation or resolver work order); **Verification Plan** (table of plan commands plus the plan id); **Verification Results** (per-command status / exit code / notes table); **Failed / Missing Evidence** (bullet list naming every failed / skipped / not-run command, including plan commands missing from the recorded results); **Remediation Context** (up to 10 remediation items from `WorkOrder.remediationItems` or `CoherencyDelta.remediationQueue`); **Reconciliation Context** (up to 10 operations with class / status / permission from the latest `ReconciliationPlan`); **Next Recommended Action** (status-derived bullets); **Input Artifacts** (cited refs).
- When no `VerificationPlan` exists, the publication is intentionally short: it says "No VerificationPlan found. Run `rekon intent work-order` or `rekon intent remediation` first." plus the Input Artifacts list. The publisher does not synthesize missing artifacts and does not throw on missing snapshot.
- New CLI command `rekon publish proof [--root <path>] [--json]` invokes the new publisher via `runPublish({ publisherId: "@rekon/capability-docs.proof-report" })` after `ensureSnapshotReady`. Generic `rekon publish run @rekon/capability-docs.proof-report` is equivalent. The publisher appears in `rekon publish list`.
- Anti-gaming discipline preserved: failed commands are listed in both the per-command table and the Failed / Missing Evidence bullets; skipped / not-run statuses are reported separately and never collapse into passed; passing verification explicitly does not auto-resolve findings (the callout says so); every section is sourced from a cited artifact (no synthesis).
- Added `tests/contract/proof-report-publisher.test.mjs` (13 tests): publisher appears in `publish list`; CLI shortcut writes a Publication with `kind: "proof-report"`; generic `publish run` dispatches the same handler; the publication includes Proof Status / Work Order / Verification Plan / Verification Results / Failed-Missing Evidence / Remediation Context / Reconciliation Context / Next Recommended Action / Input Artifacts sections; failed status surfaces the failed table row, the "not complete" callout, the Failed bullet, and the "Fix the failing checks" next action; partial / not-run surfaces the partial row, the callout, the Not-run bullet, and the "Complete the missing checks" next action; passed surfaces the no-auto-resolve callout and the "Re-run `rekon evaluate`" next action; `header.inputRefs` cite VerificationPlan / VerificationResult / WorkOrder when present; the no-result path recommends `rekon verify record`; the no-plan path recommends `rekon intent work-order` / `rekon intent remediation`; existing `publish agents` and `publish architecture` still work; freshness marks older proof reports `stale` after a newer VerificationResult; a self-skipping import-boundary fixture test confirms remediation context surfaces import findings and reconciliation context surfaces `safe_import_rewrite` / `source-write-deferred` / `write:source`.
- Added new docs: `docs/artifacts/proof-report-publication.md`, `docs/concepts/proof-report-publication.md`. Updated `docs/artifacts/verification-result.md`, `docs/concepts/verification-results.md`, `docs/artifacts/architecture-summary-publication.md`, `docs/concepts/architecture-summary-publication.md`, `docs/extensions/authoring-capabilities.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, the root `README.md`, and this `CHANGELOG.md`.
- No artifact header shape changes. No SDK changes. No new capability roles. The `Publication` artifact type at the kernel level is unchanged (the new `kind` widens the package-local type only). No new actuator/handler — only a third publisher inside the same capability. No command execution. No source writes. No auto-resolve. No CI/GitHub/dashboard surfaces. No verification judgment. No version bump. No npm publish.
- Added classic guarantees audit (docs / tests only — no runtime behavior changes).
- New strategy docs:
  - `docs/strategy/classic-guarantees-audit.md` — per-subsystem audit covering 15 major classic subsystems (full scan / refresh orchestration, evidence + repo observation, deterministic + semantic analysis, graph intelligence, rule engine / compiled invariants, issue detection / adjudication, coherency delta / remediation roll-up, resolver / context / preflight, generated docs / agent docs, operator feedback / memory, intent preparation / proof gates, reconciliation / deterministic operations, watcher / freshness / live context trust, GitHub / CI / PR surfaces, SaaS / dashboard). Each entry lists original problem, classic workflow guarantee, classic shape that provided the guarantee, what Rekon already preserves, what Rekon may be discounting, current gap, Rekon equivalent guarantee, regression test, priority, and next implementation slice.
  - `docs/strategy/classic-guarantee-regression-plan.md` — P0/P1/P2 regression plan with 7 P0 guarantees (one-command coherent state, finding lifecycle preserved, resolver/preflight explainable, publications cite inputs, work orders + anti-gaming, reconciliation does not silently source-write, freshness distinguishes valid vs current), 6 P1 guarantees (issue adjudication / dedupe, memory ranking, agent-operating-contract publication, path/event freshness, richer graph slices, rulebook compilation), and 5 P2 guarantees (source-write apply, watcher daemon, CI surfaces, SaaS dashboard, semantic augmentation). Each entry pairs a proposed regression test with the implementation batch that should ship it.
  - `docs/strategy/classic-subsystem-purpose-map.md` — quick-reference table to read first before proposing capability work. Columns: classic subsystem, original problem, classic guarantee, Rekon equivalent today, gap, priority, next slice.
- Updated `AGENTS.md`: completion summary now requires a `PURPOSE PRESERVATION CHECK` section for any major capability / resolver / publisher / actuator / memory / freshness / issue / orchestration work, with explicit fields (original problem, classic workflow guarantee, classic shape, Rekon equivalent guarantee, what would mean we failed, regression test). The `CODEBASE-INTEL ALIGNMENT` requirement is preserved and rewired alongside the new check. Adds the explicit rule "Do not call classic orchestration 'weight' unless the work order identifies which guarantee is preserved elsewhere."
- Updated `CONTRIBUTING.md`: new "Preserving Classic Workflow Guarantees" section requires contributors who migrate or reinterpret a classic subsystem to identify the original problem and workflow guarantee. Names the audit / regression plan / purpose map as the anchor.
- Updated `docs/strategy/north-star.md`, `docs/strategy/classic-behavior-distillation.md`, `docs/strategy/classic-wins.md`, `docs/strategy/classic-refactor-principles.md` (added the "Preserve The Workflow Guarantee, Not Just The Feature" rule), `docs/strategy/classic-behavior-roadmap.md` (audit entry in Phase B), and `docs/strategy/roadmap.md` to cross-reference the new audit / regression plan / purpose map.
- Added `tests/docs/classic-guarantees-audit.test.mjs` asserting: all three new strategy docs exist; the audit doc contains all 15 subsystem headings, the "Classic workflow guarantee" phrase, and the "What Rekon may be discounting" phrase; the regression plan contains P0/P1/P2 sections and every required P0/P1 guarantee title; `AGENTS.md` contains the `PURPOSE PRESERVATION CHECK` requirement, the orchestration-weight rule, and the audit cross-references; `CONTRIBUTING.md` contains the migrated-subsystem guarantee requirement.
- No runtime behavior changes. No SDK changes. No kernel changes. No capability changes. No CLI changes. No artifact shape changes. No new tests beyond the docs assertions above. No version bump. No npm publish.
- Added `rekon refresh` (closes P0.1 from the Classic Guarantees Audit).
- New CLI command `rekon refresh [--root <path>] [--skip-publish] [--skip-freshness] [--changed-file <path>] [--json]` orchestrates the full Rekon lifecycle in the documented order: `init` (heals only a missing config; leaves a malformed config for `config.validate` to report) → `config.validate` → `observe` → `project` → `snapshot` → `evaluate` → `findings.lifecycle` → `coherency.delta` → `publish.architecture` → `artifacts.validate` → `artifacts.freshness`. Stops on the first failure, records every step in the result, and exits non-zero on `status: "failed"`.
- Return shape (also written to stdout when `--json` is set): `{ root, startedAt, completedAt, status, steps: RefreshStep[], validation, freshness, artifacts, missing }`. Each `RefreshStep` carries `id`, `status` (`passed` / `failed` / `skipped`), optional `artifacts`, optional `summary`, optional `issues`, and optional `message`. The `missing` array names required artifact types (`EvidenceGraph`, `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `IntelligenceSnapshot`, `FindingReport`, `FindingLifecycleReport`, `CoherencyDelta`, and `Publication(architecture-summary)` unless `--skip-publish`) that the run did not produce.
- Latest-major freshness interpretation: the artifact freshness validator is run as-is, but the refresh's verdict is computed against the **latest artifact of each major type** (`EvidenceGraph`, `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `IntelligenceSnapshot`, `FindingReport`, `FindingLifecycleReport`, `CoherencyDelta`, `Publication`). For each latest-major entry, `newer-input-exists` issues are filtered out — those are about historical sibling references (e.g. `buildFindingLifecycleReport` deliberately cites every prior `FindingReport` to derive resolved-finding state). A second back-to-back refresh therefore still reports `passed` even though the artifact store keeps prior artifacts on disk. When `--skip-publish` is set, `Publication` is excluded from the latest-major check so an intentionally unrefreshed publication does not flip the verdict.
- Failure semantics: any failed step stops the run, records the failed step's `message`, and returns `status: "failed"`. Lifecycle steps are never silently skipped — `--skip-publish` and `--skip-freshness` are opt-in and always appear as `status: "skipped"` entries in `steps` with the reason in `message`. Required-artifact-family checks that find missing types after a successful run produce `status: "partial"`.
- Implementation lives entirely in the CLI layer as a package-local `runRefresh(root, options)` helper plus the new command handler. No new runtime exports, no new artifact types, no kernel changes. The helper reuses existing helpers: `runtime.runObserve` / `runProject` / `runSnapshot` / `runEvaluate` / `runPublish`, plus `buildFindingLifecycleReport`, `buildCoherencyDelta`, `validateArtifactIndex`, and `validateArtifactFreshness`.
- Added `tests/contract/refresh-command.test.mjs` (11 tests) covering: clean-fixture orchestration produces every required artifact family; steps run in documented order; an architecture-summary Publication is written; status is `passed` when latest-major is fresh; malformed `.rekon/config.json` fails before observe; `--skip-publish` records a skipped step, writes no Publication, and excludes Publication from latest-major; `--skip-freshness` records a skipped step and still validates; a second back-to-back refresh still passes despite historical artifacts; producing steps (`observe`/`project`/`snapshot`/`evaluate`/`findings.lifecycle`/`coherency.delta`/`publish.architecture`) all record artifact refs; existing `publish agents` and `artifacts validate` still work after a refresh; a self-skipping import-boundary fixture integration test confirms the resulting architecture summary surfaces active findings.
- Added `@rekon/kernel-artifacts` as a direct dep of `@rekon/cli` (already a transitive dep) so the new helper can import the `ArtifactRef` type; tsconfig project reference added to match.
- New docs: `docs/concepts/refresh.md` describes why the command exists, the section-by-section semantics, the latest-major freshness rule, failure behavior, and when to use it. Updated `docs/strategy/classic-guarantees-audit.md` (subsystem 1 entry now marks the guarantee preserved and points to the new tests), `docs/strategy/classic-guarantee-regression-plan.md` (P0.1 now marked closed with the shipped regression test), `docs/strategy/classic-subsystem-purpose-map.md` (priority column for row 1 now reads "P0 preserved"), `docs/strategy/classic-behavior-roadmap.md` (P0.1 closure entry added), `docs/strategy/roadmap.md`, the root `README.md` (First 10 Minutes now uses `rekon refresh`), `AGENTS.md` (recommends `rekon refresh` for agents that need a coherent state), and this `CHANGELOG.md`.
- No artifact header shape changes. No SDK changes. No new capability roles. No new artifact types (the result is plain JSON, not an artifact). No source writes. No verification command execution. No watcher or daemon. No version bump. No npm publish.
- Added memory ranking / curation v1 (closes P1.2 from the Classic Guarantees Audit).
- `@rekon/capability-memory` now applies a deterministic, reason-attached ranking when selecting `OperatorFeedbackEntry` artifacts. The score starts at 0.1 and combines: exact path match (+0.45), path prefix match (+0.35), system match (+0.25), capability match (+0.2), tag match (+0.1 each, capped +0.2), verified (+0.2), reliability × 0.15 (default 0.5), priority (`high` +0.1, `low` −0.05), freshness (within 30 days +0.1, within 180 days +0.05, older than 365 days −0.1), and specificity (`scoped-specific` +0.1 when exactly one scope dimension matches; `broad-scope-penalty` −0.05 when the entry has no scope at all). Score is clamped to `[0, 1]`. Entries with `status: "deprecated"`, `status: "superseded"`, or `verification.status: "disputed"` are rejected outright; entries whose scope is non-empty but does not match the query are rejected with `scope-mismatch`. Ties break by specificity desc, then `updatedAt` desc, then artifact id asc.
- Extended the package-local `OperatorFeedbackEntry` shape (additive only): optional `scope.systems` / `scope.capabilities` / `scope.layers` / `scope.tags` alongside existing `scope.paths` / `scope.goal`; optional `rationale`; optional `evidence: ArtifactRef[]`; optional `verification: { status, verifiedAt, verificationResultRef }`; optional `reliability: number` (0..1); optional `priority: "low" | "normal" | "high"`; optional `createdAt` / `updatedAt`; optional `source: "operator" | "system"`; optional `status: "active" | "deprecated" | "superseded"`. The existing `instruction`, `scope.paths`, `scope.goal`, and `confidence` fields are unchanged; entries written before this batch continue to rank correctly via the default reliability (0.5), priority (`normal`), and status (`active`) fallbacks.
- Extended the package-local `MemorySelection` shape (additive only): new `query: { path, paths, goal, system, capability, tags }`; new `selected: MemorySelectionItem[]` with per-item `id` / `score` / `reasons` / `match: { paths, systems, capabilities, tags }` / `priority` / `verification` plus the legacy `instruction` / `scope` / `confidence` / `reason` fields; new `rejected: Array<{ id, reasons }>`. The legacy `selections[*]` array continues to exist and equals `selected` so the existing resolver memory reader (which iterates `selection.selections[*].instruction`) keeps working without changes.
- Extended `rekon memory add` with new flags: `--system <system>`, `--capability <capability>`, `--tag <tag>` (repeatable), `--layer <layer>` (repeatable), `--priority low|normal|high`, `--reliability <0..1>`, `--verified`, `--rationale <text>`. Existing `--instruction` / `--path` / `--goal` flags are unchanged. Invalid `--priority` or out-of-range `--reliability` values are rejected with clear errors.
- Extended `rekon memory select` with new filters: `--system <system>`, `--capability <capability>`, `--tag <tag>` (repeatable), `--limit <n>`. Existing `--path` / `--goal` flags are unchanged. `--limit` defaults to 5 when omitted.
- Resolver invariant preserved (and pinned by test): `resolve.preflight` includes selected memory in `applicableMemory` but does **not** mutate `ownerSystems`, `risk`, `findings`, `status`, or `nextRequiredResolver`. Memory enriches resolver output; it does not become repo truth. The contract test `preflight resolver includes selected memory but does not mutate ownerSystems or finding status` exercises a deliberately mis-scoped memory entry (`--system memory-system`) against a real OwnershipMap-derived `src` system and asserts the imaginary memory system never appears in `ownerSystems`.
- Curation surface in v1: rejected entries are visible (`selection.rejected[*]` with reasons), stale entries surface `stale-over-365-days` in their reasons (still selected so curators can act on them), low-reliability entries (≤0.25) surface `low-reliability-<value>`. Promotion to `Rulebook`, supersession chains, and context-usage analytics are explicit future work (the new "Curation Surface" section in `docs/concepts/memory.md` says so).
- Added `tests/contract/memory-ranking-curation.test.mjs` (10 tests): path-specific verified memory outranks broad stale memory; deprecated and superseded entries are rejected; disputed entries are rejected; high priority does not let a non-matching entry beat an exact verified path match; stale memory receives the freshness penalty but stays selected; `memory select` output includes scores / reasons / a `MemorySelection` artifact whose legacy `selections[*]` array is preserved; `memory add` supports the new flags and the produced entry carries them; `resolve preflight` includes selected memory but does not mutate `ownerSystems` or finding status; `memory list` reports the new metadata; verified memory with `verificationResultRef` carries the `verified` reason and the `verification` summary field on the selection item.
- Updated docs: new `docs/concepts/memory.md` (ranking algorithm, CLI surface, output shape, resolver invariant, curation principles, what-this-is-not); new `docs/artifacts/operator-memory-entry.md` and `docs/artifacts/memory-selection.md` (full shapes, field notes, examples); updated `docs/artifacts/memory-artifacts.md` (points at the new docs); updated `docs/strategy/classic-guarantees-audit.md` (subsystem 10 marks the guarantee preserved at v1 and lists the remaining gaps), `docs/strategy/classic-guarantee-regression-plan.md` (P1.2 marked closed with the shipped regression test), `docs/strategy/classic-subsystem-purpose-map.md` (row 10 priority now reads "P1 preserved (v1)"; next slice = promotion engine), `docs/strategy/classic-behavior-roadmap.md` (P1.2 closure entry added), `docs/strategy/roadmap.md` (memory ranking entry added before the refresh entry), the root `README.md` (memory add example shows the new flags), and this `CHANGELOG.md`.
- No new exports beyond the extended package-local types from `@rekon/capability-memory`. No kernel changes. No SDK changes. No new capability roles. No new artifact types. No CLI commands added (only new flags on existing commands). No LLM. No automatic promotion engine. No source writes. No context-usage logging beyond what existed before. No version bump. No npm publish.
- Added agent operating contract publication v1 (closes P1.3 from the Classic Guarantees Audit).
- `@rekon/capability-docs` now registers a fourth publisher `@rekon/capability-docs.agent-contract` alongside the existing `.publisher`, `.architecture-summary`, and `.proof-report` publishers. The new publisher reads the latest available `IntelligenceSnapshot` (required; throws with a "Run `rekon refresh` first" message when missing) plus optional `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `CoherencyDelta`, `FindingLifecycleReport`, `WorkOrder` (remediation and resolver), `ReconciliationPlan`, `VerificationPlan`, `VerificationResult`, and `MemorySelection`. Every artifact actually read is cited in `header.inputRefs`.
- Extended package-local `PublicationArtifact.kind` to include `"agent-contract"` alongside `"agents"`, `"repo-summary"`, `"architecture-summary"`, and `"proof-report"`. The `Publication` artifact type at the kernel level is unchanged.
- Added a local `MemorySelectionLike` shape inside `@rekon/capability-docs` so the publisher can read ranked `selected[*]` items without importing `@rekon/capability-memory` (avoids a new package edge). Items without `reasons` are intentionally excluded from the Memory Guidance section — the publication only carries memory it can explain.
- The agent contract Markdown contains, in fixed order: title + metadata; **How To Use This Contract**; **Canonical Truth** (`.rekon/artifacts` is the source of truth; this publication may be stale); **Operating Rules** (resolve before edit, no cross-owner without seam, no completion without proof, anti-gaming on tests/validators/ledgers/scripts, no mutation to hide unresolved work, publications are guidance); **Resolver Workflow** (`route → seam (if cross-owner) → preflight`, `issue → seam/preflight`); **Ownership And Capabilities** (systems table from `ObservedRepo`, capability bullets from `CapabilityMap`, ownership entry count); **Active Governance State** (active/accepted/ignored/resolved counts, severity breakdown, top affected paths, remediation queue P0/P1/P2 counts, lifecycle summary); **Proof And Verification State** (presence/missing for each proof-loop artifact, explicit "Verification is not complete." for failed/partial/not-run, "passed does not auto-resolve findings" for passed, stale-plan callout); **Memory Guidance** (score/instruction/scope/reasons table, capped at 10); **Required Checks** (from latest `VerificationPlan.commands` or the default typecheck/test/build + `rekon artifacts validate` + `rekon artifacts freshness`); **Do Not Do** (anti-gaming reminders); **Next Recommended Actions** (derived from current state); **Input Artifacts**.
- New CLI command `rekon publish agent-contract [--root <path>] [--json]` invokes the new publisher via `runPublish({ publisherId })` after `ensureSnapshotReady`. Generic `rekon publish run @rekon/capability-docs.agent-contract` is equivalent. The publisher appears in `rekon publish list`.
- Updated the capability manifest: `consumes` now includes `MemorySelection` (alongside the existing snapshot/ownership/capability/coherency/finding-lifecycle/work-order/reconciliation/verification-plan/verification-result inputs). Added a new `memory.changed` invalidation rule so an older agent contract goes stale when ranked memory changes.
- Important invariant preserved (and pinned by test): the publisher writes only to `.rekon/artifacts/publications/agent-contract.md`. It does **not** overwrite the repository's root `AGENTS.md`, does not inject into `CLAUDE.md`, and does not write any file outside `.rekon/`. The contract test `publish agent-contract does not overwrite a root AGENTS.md` asserts the publisher never created a root `AGENTS.md` in a fixture that shipped without one.
- Added `tests/contract/agent-operating-contract-publisher.test.mjs` (16 tests): publisher appears in `publish list`; CLI shortcut writes a Publication with `kind: "agent-contract"` to the documented path; generic `publish run` dispatches the same handler; all 13 sections render; canonical-truth warning is present; operating rules cover resolve-before-edit and anti-gaming; Memory Guidance shows score+reasons when ranked memory exists; missing MemorySelection recommends `rekon memory select`; partial / failed verification surfaces visibly; Required Checks come from `VerificationPlan` when present; `header.inputRefs` cite MemorySelection / VerificationResult / WorkOrder / VerificationPlan; the artifact writes to `.rekon/artifacts/publications/agent-contract.md`; publishing does not create a root `AGENTS.md`; existing `publish agents` / `publish architecture` / `publish proof` still work; freshness marks the publication stale after a newer MemorySelection.
- Added new docs: `docs/artifacts/agent-contract-publication.md`, `docs/concepts/agent-operating-contract.md`. Updated `docs/artifacts/architecture-summary-publication.md`, `docs/artifacts/proof-report-publication.md`, `docs/artifacts/memory-selection.md`, `docs/concepts/memory.md`, `docs/extensions/authoring-capabilities.md`, `docs/strategy/classic-guarantees-audit.md` (subsystem 9 entry marks the guarantee preserved at v1; lists the remaining gaps), `docs/strategy/classic-guarantee-regression-plan.md` (P1.3 marked closed with the shipped regression test), `docs/strategy/classic-subsystem-purpose-map.md` (row 9 priority reads "P1 preserved (v1)"; next slice = optional export/install command), `docs/strategy/classic-behavior-roadmap.md` (P1.3 closure entry added), `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, the root `README.md` (`publish agent-contract` added to the CLI example list), `AGENTS.md` (recommends running the contract for agents that need a current operating contract), and this `CHANGELOG.md`.
- No artifact header shape changes. No SDK changes. No new capability roles. The `Publication` artifact type at the kernel level is unchanged (the new `kind` widens the package-local type only). No new actuator/handler — only a fourth publisher inside the same capability. No command execution. No source writes. No root `AGENTS.md` / `CLAUDE.md` overwrite. No CI/GitHub/dashboard surfaces. No version bump. No npm publish.
- Added operator-assisted issue merge decision ledger (closes the merge-decisions slice of P1.1 in the Classic Guarantees Audit). Operators can now record explicit `accepted` / `rejected` decisions on `IssueMergeCandidate` records as durable artifacts. **Decisions never merge groups.** `CoherencyDelta`, `resolve.issue`, and the publications continue to operate on actual `IssueAdjudicationGroup` records. A future `CoherencyDelta` v3 may opt in to consuming accepted decisions; that is deferred.
- `@rekon/kernel-findings` gained `IssueMergeDecisionStatus`, `IssueMergeDecisionReason`, `IssueMergeDecision`, and `IssueMergeDecisionLedger` types. New exported pure helpers: `createIssueMergeDecisionLedger`, `validateIssueMergeDecisionLedger`, `assertIssueMergeDecisionLedger`, `issueMergeDecisionLedgerSchema`, `findLatestIssueMergeDecision`, and `applyIssueMergeDecisionsToCandidates`. `IssueMergeCandidate` gained six optional decision-annotation fields: `decision`, `decisionId`, `decisionNote`, `decisionReason`, `decisionDecidedAt`, `decisionDecidedBy` (all populated by `applyIssueMergeDecisionsToCandidates` from the latest ledger; absent when no ledger exists). Candidate generation is unchanged — decisions are applied on read, not stored on the report.
- `@rekon/runtime` gained the `recordIssueMergeDecision(store, options)` helper plus the `RecordIssueMergeDecisionOptions` type. It validates the candidate id against the latest `IssueAdjudicationReport`, refuses unknown ids with an error listing every available candidate id, validates the required `note`, appends the new decision to the latest ledger's history (or starts a fresh one), and writes a new `IssueMergeDecisionLedger` artifact whose `header.inputRefs` cite the adjudication report and the prior ledger. `IssueMergeDecisionLedger` is registered as a built-in artifact type in `@rekon/sdk`, routed under the `findings` category in `@rekon/runtime`'s artifact category map, and added to `CANONICAL_INPUT_TYPES` so its own freshness check does not require upstream lineage.
- Decision rules: `decision` is `"accepted"` or `"rejected"`. `note` is required and non-empty. `reason` is optional and must be one of `same-root-cause` / `separate-issues` / `false-positive-candidate` / `other`. `source` is `"operator"` for CLI-recorded decisions. Decision history is preserved: each call appends to the latest ledger's `decisions` array, and `findLatestIssueMergeDecision` picks the highest `decidedAt` for the current effective annotation. A new decision for the same candidate id **does not** remove prior decisions from history.
- New CLI commands: `rekon issues merge candidates [--root <path>] [--json]` returns candidates annotated with the latest ledger decisions; `rekon issues merge decide <candidate-id> --decision accepted|rejected --note <note> [--reason <reason>] [--decided-by <name>] [--root <path>] [--json]` records a new decision and returns the ledger ref plus the new decision; `rekon issues merge decisions [--root <path>] [--json]` returns the latest ledger's decisions in order. Existing `rekon issues list` and `rekon issues adjudicate` now also include annotated `mergeCandidates` when a ledger exists. The CLI's `ISSUE_MERGE_DECISION_REASONS` constant and the `PROTECTED_AGENT_DOC_*` constants are now declared at the top of `packages/cli/src/index.ts` to avoid temporal-dead-zone errors when `parseIssueMergeDecisionReason` is called during `main()`'s synchronous prefix on the `issues merge decide` branch (the same TDZ-safety pattern used by the earlier `agent-contract export` batch).
- Invariants pinned by tests: ledger rejects empty notes; `findLatestIssueMergeDecision` returns the most-recent decision for a candidate (by `decidedAt`) and ignores decisions for other candidates; `applyIssueMergeDecisionsToCandidates` annotates without mutating the input array; `recordIssueMergeDecision` refuses unknown candidate ids with a listing of available ids; CLI `issues merge decide` requires `--note`; accepted decisions do not merge groups (`CoherencyDelta` keeps 2 items + 2 remediation steps for 2 cross-rule findings); rejected decisions keep the candidate visible with `decision: "rejected"`; `IssueMergeDecisionLedger` does not raise `lineage.unknown` because it is in `CANONICAL_INPUT_TYPES`; `rekon artifacts validate` stays clean after a decision is recorded; raw artifact families (`FindingReport`, `FindingStatusLedger`, `FindingLifecycleReport`, `IssueAdjudicationReport`, `CoherencyDelta`) are never mutated.
- Added `tests/contract/issue-merge-decision-ledger.test.mjs` (14 tests covering pure-helper validation, latest-decision lookup, annotation purity, CLI `merge candidates`, CLI `merge decide` happy path, unknown-candidate error with listing, missing-note error, CLI `merge decisions` empty / populated, annotated `issues list`, accepted-decision-does-not-merge-CoherencyDelta, rejected-decision-keeps-candidate-visible, freshness without `lineage.unknown`, and `artifacts validate` cleanliness).
- Updated docs: new `docs/artifacts/issue-merge-decision-ledger.md` and `docs/concepts/issue-merge-decisions.md`. Updated `docs/artifacts/issue-adjudication-report.md` (Merge Candidates section adds the Operator Decisions subsection; cross-references add the new artifact + concept). Updated `docs/concepts/issue-adjudication.md` (anti-gaming reminders now reference the shipped operator-decision surface). Updated `docs/concepts/coherency-delta.md` (the "Merge candidates are advisory only" callout now also explicitly notes that accepted decisions do not affect counts). Updated four strategy docs: `classic-subsystem-purpose-map.md` (subsystem 6 now reads "P1 preserved (v1 + coherency v2 + resolver v2 + publication v2 + freshness v2 + merge-hints v2 + merge-decisions v2)" with next slice CoherencyDelta v3), `classic-behavior-roadmap.md` (new Phase B entry), `classic-guarantee-regression-plan.md` (P1.1 records the new 14-test contract suite), `roadmap.md` (new bullet under completed alpha spine). `CHANGELOG.md` records this entry.
- No `ArtifactHeader` shape changes. No `Publication` / `CoherencyDelta` / `IssueAdjudicationReport` shape changes (the new optional fields on `IssueMergeCandidate` are populated on read by `applyIssueMergeDecisionsToCandidates`, not stored on the report). No SDK API changes beyond the built-in artifact type registration. No new capability roles, permissions, or actuators. No mutation of upstream artifacts. No semantic / fuzzy / embedding / LLM matching. No automatic merge. No version bump. No npm publish.
- Added issue adjudication v2: deterministic cross-rule merge hints (closes the merge-hints slice of P1.1 in the Classic Guarantees Audit). After deterministic exact grouping runs, the adjudicator now emits advisory `IssueMergeCandidate` records for pairs of distinct groups sharing at least two deterministic signals. **Candidates are never merged groups.** `CoherencyDelta`, `resolve.issue`, and publications still count and route the underlying groups separately. No artifact mutation. No LLM. No embeddings. No fuzzy matching.
- `@rekon/kernel-findings` gained `IssueMergeCandidate`, `IssueMergeCandidateStrength`, and `IssueMergeCandidateReason` types, plus a new exported pure helper `deriveMergeCandidates(groups)`. `IssueAdjudicationReport` now optionally carries `mergeCandidates?: IssueMergeCandidate[]`; `IssueAdjudicationSummary` carries `mergeCandidates?: number`. The validator accepts the new shapes; both fields are absent when no candidates qualify.
- Detection signals (weights additive, confidence capped at `1.0`): `same-file` / `overlapping-files` (`+0.35`), `same-subject` / `overlapping-subjects` (`+0.30`), `same-severity` (`+0.10`), `related-type-prefix` (`+0.15`, only when both types contain `.` and differ), `same-suggested-action` (`+0.15`, via a fixed deterministic keyword bucket — `import` / `generated-output` / `verification` / `documentation` / `ownership-boundary`), `shared-system` (`+0.15`). A pair must score at least **two** signals AND confidence `>= 0.45` to qualify.
- Strength is derived from capped confidence: `strong` (`>= 0.70`), `medium` (`>= 0.45`), `weak` (below the emit floor, not surfaced by default).
- Activity filter (noise reduction): pairs where **both groups are inactive** are skipped entirely; pairs where **exactly one group is inactive** require `strong` confidence to emit and the candidate's `note` calls out the inactive context. Active/active pairs emit at the standard `>= 0.45` floor.
- Candidate id: `merge-candidate:<sorted-group-id-1>:<sorted-group-id-2>`. `memberFindingIds` is the sorted union across both groups, so raw findings remain traceable. The report sorts `mergeCandidates` by `strength` (strong→medium→weak), then `confidence` desc, then `id` asc, and caps the array at **50** entries.
- Invariants pinned by tests: cross-rule findings same file/subject/severity → 2 groups + 1 merge candidate; exact duplicates still group normally with no candidate between members; unrelated findings produce no candidate; two inactive groups produce no candidate; mixed-activity below `strong` threshold produces no candidate; deterministic / repeatable confidence + strength + id; `deriveMergeCandidates` exported helper produces identical output on the same input; `rekon issues adjudicate` JSON includes `mergeCandidates`; `rekon issues list` JSON exposes `mergeCandidates` from the latest report; `rekon coherency delta` counts groups not candidates (2 cross-rule findings → 2 delta items, 2 remediation steps); `rekon artifacts validate` stays clean with merge candidates in the report.
- Added `tests/contract/issue-adjudication-merge-candidates.test.mjs` (12 tests covering pure-helper output, deterministic confidence/strength, unrelated-findings exclusion, duplicate-member exclusion, inactive-pair exclusion, mixed-activity strong-only emission, exported helper parity, CLI `issues adjudicate` JSON, CLI `issues list` JSON, CoherencyDelta non-counting of candidates, and `artifacts validate` cleanliness).
- Updated docs: `docs/artifacts/issue-adjudication-report.md` adds the `IssueMergeCandidate` shape to the Shape section and a new "Merge Candidates (v2)" section documenting detection signals, weights, strength labels, activity filter, ordering, and the suggested-action keyword buckets. `docs/concepts/issue-adjudication.md` adds a "Merge Candidates (v2)" concept section. `docs/concepts/coherency-delta.md` adds an explicit "Merge candidates are advisory only" callout. `docs/strategy/classic-subsystem-purpose-map.md` subsystem 6 now reads "P1 preserved (v1 + coherency v2 + resolver v2 + publication v2 + freshness v2 + merge-hints v2)". `docs/strategy/classic-behavior-roadmap.md` adds the new Phase B entry. `docs/strategy/classic-guarantee-regression-plan.md` P1.1 records the shipped merge-hints slice and the new 12-test contract suite. `docs/strategy/roadmap.md` adds a new bullet under completed alpha spine. `CHANGELOG.md` records this entry.
- No `ArtifactHeader` shape changes. No `Publication` shape changes. No `CoherencyDelta` shape changes. No SDK API changes. No new capability roles, permissions, or actuators. No CLI signature changes (the existing `rekon issues adjudicate` / `rekon issues list` JSON output is extended additively with a `mergeCandidates` field). No mutation of any upstream artifact. No semantic / fuzzy / embedding / LLM matching. No version bump. No npm publish.
- Added stale-source freshness guardrails for adjudication + coherency in publications and `resolve.issue` (closes the trust slice of P1.1 in the Classic Guarantees Audit). The surfaces that consume `IssueAdjudicationReport` and `CoherencyDelta` now render their own inline freshness warnings instead of relying solely on `rekon artifacts freshness`. No artifact mutation. No auto-regeneration. No watcher/daemon.
- `@rekon/capability-docs`: new package-local `detectGovernanceFreshness(artifacts)` helper plus `GovernanceFreshness` type. The helper reads the latest `IssueAdjudicationReport`, `FindingLifecycleReport`, and `CoherencyDelta` and reports `{ adjudication, coherency, warnings, recommendedCommand }` with per-artifact status `fresh | stale | missing`. Detection rules: `IssueAdjudicationReport` is stale when its `header.inputRefs` cite a `FindingLifecycleReport` whose id is not the latest indexed, or when no lifecycle is cited but a lifecycle exists; `CoherencyDelta` is stale when it cites an older `IssueAdjudicationReport`, when it was built from raw lifecycle (no adjudication cited, no `issueGroupId` on any item) while adjudication now exists, or when its cited adjudication is transitively stale. Recommended command defaults to `rekon refresh`; `rekon issues adjudicate` is recommended when adjudication is missing but lifecycle exists.
- Architecture summary: a new `## Input Freshness Warnings` section renders only when warnings exist (silence is the success signal). When emitted, it lists each warning, links the canonical inputs by id, and closes with a `Recommended command:` line. The section appears between `## Governed Issue Groups` and `## Top Affected Paths`.
- Agent operating contract: a new `### Governance Freshness` subsection always renders inside Active Governance State. It prints `- Issue adjudication: fresh | stale | missing` and `- Coherency delta: fresh | stale | missing`. When stale, a blockquote callout lists every warning and adds "Do not treat governed issue counts as current until `rekon refresh` (or `rekon issues adjudicate && rekon coherency delta`) has run." Recommended command line follows.
- `@rekon/capability-resolver`: new package-local `detectAdjudicationStaleness(artifacts, reportRef)` helper called inside `buildGroupIssuePacket`. When the matched `IssueAdjudicationReport`'s cited `FindingLifecycleReport` is not the latest, the resolver appends "IssueAdjudicationReport may be stale; run `rekon issues adjudicate` or `rekon refresh` before relying on group counts." to `packet.warnings` and writes an `issue.freshness` `resolutionTrace` entry with `status: "warning"`. When fresh, a `status: "used"` `issue.freshness` entry is still written so the trace explicitly records the freshness check ran.
- Invariants pinned by tests: stale adjudication chain → architecture summary contains `## Input Freshness Warnings` with `Recommended command: \`rekon refresh\``; agent contract contains `### Governance Freshness` showing `stale` for both adjudication and coherency plus the blockquote callout; `resolve.issue` group mode includes the stale-adjudication warning + `issue.freshness` trace entry with `status: "warning"`. Clean chain → architecture summary omits the freshness section; agent contract shows `- Issue adjudication: fresh` / `- Coherency delta: fresh` without the callout; `resolve.issue` emits an `issue.freshness` trace with `status: "used"` and no extra warning. Lifecycle-mode-delta-while-adjudication-exists → agent contract shows the "was built from raw FindingLifecycleReport but an IssueAdjudicationReport now exists" warning. Recommendation strings consistently point to `rekon refresh` (or `rekon issues adjudicate` in the resolver warning).
- Added `tests/contract/adjudication-coherency-freshness-guardrails.test.mjs` (10 tests covering: architecture-summary warns on stale adjudication; architecture-summary warns on transitively-stale coherency; agent-contract Governance Freshness shows both stale; `resolve.issue` warning + trace; consistent `rekon refresh` recommendation across all surfaces; clean-chain has no false stale warnings in either publication; clean-chain resolver emits fresh `issue.freshness` trace; agent-contract warns on lifecycle-mode-delta + adjudication-exists mode mismatch; `artifacts validate` stays clean after stale-chain publications; all four existing publishers still work).
- No artifact-header shape changes. No `Publication` shape changes. No SDK API changes. No new capability roles, permissions, or actuators. No watcher / daemon / file-system mtime / path-event invalidation introduced. No auto-regeneration of missing or stale inputs. No mutation of `FindingReport` / `FindingStatusLedger` / `FindingLifecycleReport` / `IssueAdjudicationReport` / `CoherencyDelta`. No semantic / fuzzy / embedding / LLM matching. No version bump. No npm publish.
- Updated docs: `docs/concepts/freshness-and-invalidation.md` (new "Surface-Level Freshness Guardrails" section listing each consumer surface, detection rules, and the read-only invariant), `docs/concepts/architecture-summary-publication.md` (How It Is Built describes the freshness section), `docs/concepts/agent-operating-contract.md` (section map references the Governance Freshness subsection), `docs/concepts/resolvers.md` (new paragraph on `issue.freshness` trace + warning), `docs/concepts/issue-adjudication.md` and `docs/artifacts/issue-adjudication-report.md` (Failure Visibility section adds the surface guardrails list), `docs/concepts/coherency-delta.md` and `docs/artifacts/coherency-delta.md` (stale-source guardrails callout + freshness paragraph), `docs/strategy/classic-subsystem-purpose-map.md` (subsystem 13 records consumer-surface guardrails), `docs/strategy/classic-behavior-roadmap.md` (new Phase B entry), `docs/strategy/classic-alignment-map.md` (Watcher / freshness row updated), `docs/strategy/roadmap.md` (new bullet under completed alpha spine), `CHANGELOG.md` (this entry).
- Added publications use adjudicated issue groups (closes the publication-consumption slice of P1.1 in the Classic Guarantees Audit). Both `@rekon/capability-docs.architecture-summary` and `@rekon/capability-docs.agent-contract` now read the latest `IssueAdjudicationReport`, cite it in `header.inputRefs`, and surface a "Governed Issue Groups" section. Raw findings remain traceable via `memberFindingIds` rendered alongside each group.
- `@rekon/capability-docs` manifest: `consumes` adds `IssueAdjudicationReport`. New invalidation rule `issue-adjudication.changed` (inputs: `["IssueAdjudicationReport"]`) so older publications go stale once a newer adjudication report lands. `Publication` artifact shape is unchanged.
- Architecture summary content additions: a new top-level `## Governed Issue Groups` section follows `## Coherency Summary`. When an `IssueAdjudicationReport` is indexed, the section prints `Total groups / Active groups / Accepted groups / Ignored groups / Resolved groups / Mixed groups` counts, a member-finding total, and a table of up to 20 groups (`Group | Status | Severity | Type | Members | Files`). The `Members` column carries the member count plus the first few member finding ids (`2: f1, f2` style) so raw findings stay visible. When no adjudication report is indexed, the section emits a "Run `rekon issues adjudicate` or `rekon refresh`" hint and warns that raw lifecycle counts above may overstate drift. The existing `## Coherency Summary` section now labels its unit as `governed issue groups` when the CoherencyDelta was built from adjudicated groups (every delta item carries an `issueGroupId`), otherwise as `findings`, with a one-line preface stating the mode.
- Agent operating contract content additions: a new `### Governed Issue Groups` subsection follows the existing Active Governance State counts. It prints `Active governed groups`, per-status breakdown, total groups + member finding totals, and the top 5 active groups (one bullet per group with `id`, severity, truncated title, and member count). It always includes the line `Use `rekon resolve issue --issue <group-id>` for adjudicated issue context.`. When no adjudication report is indexed, the subsection emits a "Run `rekon refresh`" hint and warns that raw lifecycle totals may overstate drift. The Active Governance State preface also labels counts as `governed issue groups` vs. `findings` depending on whether `CoherencyDelta` was built from adjudicated groups. The Do Not Do list adds: "Do not treat raw finding count as governed issue count when an IssueAdjudicationReport exists; use governed issue groups (memberFindingIds preserves raw traceability)."
- Invariants pinned by tests: publications cite `IssueAdjudicationReport` in `header.inputRefs` when one exists; publications never invent groups or invoke adjudication themselves (they only read the artifact); raw `FindingReport` / `FindingStatusLedger` / `FindingLifecycleReport` / `IssueAdjudicationReport` are not mutated; `rekon publish agents` and `rekon publish proof` continue to work; `rekon artifacts freshness` marks an older architecture summary or agent contract `stale` when a newer `IssueAdjudicationReport` lands.
- Added `tests/contract/publications-adjudicated-issues.test.mjs` (11 tests covering: architecture summary cites `IssueAdjudicationReport`; architecture summary renders Governed Issue Groups with counts + member ids; architecture Coherency Summary distinguishes governed-groups vs. raw-finding mode; agent contract cites `IssueAdjudicationReport`; agent contract Governed Issue Groups subsection lists active groups + member counts; agent contract surfaces the `rekon resolve issue --issue <group-id>` instruction; agent contract Do Not Do warns about raw-vs-governed counts; both publications fall back to a "run `rekon issues adjudicate`" hint when no report is indexed; freshness marks an older architecture summary stale after a newer adjudication report; `publish agents` and `publish proof` still work).
- Updated docs: `docs/artifacts/architecture-summary-publication.md` (new Governed Issue Groups section in Content Structure; renumbered subsequent sections; Inputs Consumed adds `IssueAdjudicationReport`; Freshness And Provenance lists newer-adjudication-report as a stale trigger), `docs/concepts/architecture-summary-publication.md` (How It Is Built mentions the new group-aware behavior), `docs/artifacts/agent-contract-publication.md` (Active Governance State entry expanded with the Governed Issue Groups subsection), `docs/concepts/agent-operating-contract.md` (section map row updated), `docs/artifacts/issue-adjudication-report.md` and `docs/concepts/issue-adjudication.md` (mark publication consumption as shipped; "future" → "shipped"), `docs/strategy/classic-subsystem-purpose-map.md` (subsystems 6 and 9 updated), `docs/strategy/classic-behavior-roadmap.md` (new Phase B entry "Publications use adjudicated issue groups"), `docs/strategy/classic-alignment-map.md` (Generated docs / publications row), `docs/strategy/classic-guarantee-regression-plan.md` (P1.1 records the shipped publication slice + the new 11-test suite), `docs/strategy/roadmap.md` (new bullet under completed alpha spine), `CHANGELOG.md` (this entry).
- No `ArtifactHeader` shape changes. No `Publication` shape changes. No SDK API changes. No new capability roles, permissions, or actuators. No source writes. No mutation of upstream artifacts. No semantic / fuzzy / embedding / LLM matching. No version bump. No npm publish.
- Added `resolve.issue` v2 from `IssueAdjudicationReport` (closes the resolver-consumption slice of P1.1 in the Classic Guarantees Audit, after v1 adjudication and v2 CoherencyDelta consumption shipped earlier in the same `0.1.0-alpha.1` cycle).
- `@rekon/capability-resolver`: `IssuePacket` gained four optional fields — `issueGroup: IssueGroupSummary`, `matchSource: "IssueAdjudicationReport" | "FindingReport"`, `verificationByFinding: IssueVerificationByFinding[]` — populated only in v2 group mode. New exported types `IssueGroupSummary` and `IssueVerificationByFinding`. The existing `issue`, `relatedFindings`, `ownerSystems`, `matchedScopes`, `verification`, `nextRequiredResolver`, `resolutionTrace`, `warnings`, `nextSteps` fields are unchanged. `ResolutionTraceEntry.sourceType` adds `"IssueAdjudicationReport"`.
- `issueResolver.resolve` (`resolve.issue`) now prefers the latest `IssueAdjudicationReport` group when one exists. Matching order against the report's `groups`: exact `group.id`, exact `canonicalFindingId`, exact member `findingId`, unique substring across `group.id` / `canonicalFindingId` / any member id / `type` / `title` / `description` / `ruleId`. A unique match returns a group-aware packet (`matchSource: "IssueAdjudicationReport"`); ambiguous fragments emit a warning and refuse to silently choose; missing report or no-match queries fall back to the raw `FindingReport` path with an explicit `issue.match` trace entry citing the adjudication report (or `Fallback` when no report exists at all). The existing raw-mode behavior is unchanged.
- Group-mode ownership combines `group.systems` (when declared) with the existing `OwnershipMap` → `ObservedRepo` → ownership `GraphSlice` → `EvidenceGraph` precedence. When the declared and resolved systems differ in either direction, the packet emits the warning "Issue group systems differ from ownership resolution; inspect IssueAdjudicationReport and OwnershipMap." Group-status warnings appear for `accepted` / `ignored` / `resolved` / `mixed`. Next-resolver decision: multi-owner → `resolve.seam`, single-owner → `resolve.preflight`, no files → `resolve.route`.
- Group-mode verification is aggregated across every `memberFindingId`. The resolver calls `lookupVerificationEvidence` for each member, picks the worst status (`failed > partial > not-run > missing > passed`) for the packet's top-level `verification`, and exposes the per-finding breakdown in `verificationByFinding`. Passing aggregated verification does **not** auto-resolve any member finding or the group as a whole.
- `@rekon/capability-resolver` manifest `consumes` adds `FindingStatusLedger` (consumed via `readLatestLedgerFromArtifacts` already, now declared) and `IssueAdjudicationReport`.
- Trace entries added in group mode: `step: "issue.match", sourceType: "IssueAdjudicationReport"` with status `used` (unique match), `warning` (ambiguous), or `fallback` (no match → raw path will follow); `step: "issue.ownership", sourceType: "IssueAdjudicationReport"` when the resolver combined `group.systems` with the resolved precedence; `step: "issue.verification"` always includes a `details.perFinding` array in group mode. The raw-mode trace shape is unchanged.
- Invariants pinned by tests: raw-mode behavior is unchanged when no `IssueAdjudicationReport` exists (existing 31 tests in `route-seam-issue-resolvers.test.mjs` + `verification-aware-issue-remediation.test.mjs` continue to pass without modification); duplicate findings collapsed into one adjudicated group return a single group-mode packet with `memberFindingIds` for full traceability; ambiguous group fragments do not silently choose; missing report and no-group-match queries both fall back to the raw path with an explicit fallback trace; aggregated verification surfaces the worst status while exposing per-member detail; no mutation of `FindingReport` / `FindingStatusLedger` / `FindingLifecycleReport` / `IssueAdjudicationReport`.
- Added `tests/contract/issue-resolver-adjudicated.test.mjs` (17 tests covering pure-resolver group-mode against a synthetic harness: exact group id / canonical / member id matching, ambiguous fragment warning, raw fallback when no report, raw fallback when report has no match, ownership from group files, multi-owner → resolve.seam, accepted/ignored/resolved status warnings, group.systems vs OwnershipMap contradiction warning, `issue.match` trace with `sourceType: "IssueAdjudicationReport"`, `verificationByFinding` per-member aggregation; plus CLI tests for `rekon resolve issue`, `rekon resolve run resolve.issue`, and the raw-fallback fallback-trace path).
- Updated docs: `docs/artifacts/resolver-packet.md` (Issue phase section adds `issueGroup`, `matchSource`, `verificationByFinding`; new "v2 group mode" matching order; new aggregated-verification paragraph), `docs/concepts/resolvers.md` (issue resolver intro now describes group-preferred matching + raw fallback; verification paragraph adds aggregation across members), `docs/artifacts/issue-adjudication-report.md` and `docs/concepts/issue-adjudication.md` (mark `resolve.issue` v2 consumption as shipped), `docs/concepts/verification-results.md` (new paragraph on group-mode aggregation), `docs/strategy/classic-guarantee-regression-plan.md` (P1.1 records the shipped resolver consumption slice and the new test plan), `docs/strategy/classic-subsystem-purpose-map.md` (subsystem 6 reads "P1 preserved (v1 + coherency v2 + resolver v2)"; subsystem 8 records the group-aware resolver), `docs/strategy/classic-behavior-roadmap.md` (new Phase B entry), `docs/strategy/classic-alignment-map.md` (Resolver / preflight context row now records v2 group mode), `docs/strategy/roadmap.md` (new bullet under completed alpha spine), `CHANGELOG.md` (this entry).
- No artifact-header shape changes. No SDK API changes. No new capability roles, permissions, or actuators. No source writes. No mutation of upstream artifacts. No semantic / fuzzy / embedding / LLM matching. No version bump. No npm publish.
- Added CoherencyDelta v2 from `IssueAdjudicationReport` (closes the coherency-consumption slice of P1.1 in the Classic Guarantees Audit, after v1 adjudication shipped earlier in the same `0.1.0-alpha.1` cycle).
- `@rekon/kernel-findings`: `CoherencyDeltaItem` gained four optional group-aware fields — `issueGroupId`, `canonicalFindingId`, `memberFindingIds`, `groupingReasons` — populated when the item was derived from an `IssueAdjudicationGroup`. The fields are absent for lifecycle-finding-derived items so existing lifecycle-mode consumers see no change. `CoherencyDeltaInput` was widened additively: it now accepts an optional `issueGroups: IssueAdjudicationGroup[]` plus optional `systemsForIssueGroup` callback. The existing `findings` / `resolvedFindings` / `systemsForFinding` fields became optional so callers can use either mode; lifecycle-mode callers pass the same three fields unchanged.
- `createCoherencyDelta` dispatches on input shape: when `issueGroups` is non-empty, it builds items from groups; otherwise it preserves the v1 lifecycle path. Group-mode item id is `coherency:group:<group-id>` (so it cannot collide with the lifecycle-mode `coherency:<finding-id>`). Group status maps to item status as: `active → existing+active`; `accepted → accepted+inactive`; `ignored → ignored+inactive`; `resolved → resolved+inactive`; `mixed → existing+active` when `group.active` is true, else `accepted+inactive`. Severity uses `group.severity`; files / subjects / evidence are taken from the group; systems combine the group's declared `systems` with the optional callback's output (deduplicated, sorted; falls back to `["unknown"]`). `remediationQueue` step id is `remediation:group:<group-id>` in group mode (vs. `remediation:<finding-id>` in legacy mode), so adjudicated rollups produce **one step per active group, not one per duplicate member**.
- `@rekon/runtime.buildCoherencyDelta` now prefers the latest `IssueAdjudicationReport` when one exists and no explicit `lifecycleReportId` is requested. It cites the report in `header.inputRefs` along with every ref the report itself carried (transitively the `FindingLifecycleReport`, `FindingReport`(s), `FindingStatusLedger`). When no adjudication report exists or the caller pins a `lifecycleReportId`, the legacy lifecycle path runs unchanged.
- `rekon refresh` now runs `issues.adjudicate` between `findings.lifecycle` and `coherency.delta`. The new step writes an `IssueAdjudicationReport` and records it in the refresh result. `RefreshStepId` adds `"issues.adjudicate"` (between `"findings.lifecycle"` and `"coherency.delta"`). `REQUIRED_REFRESH_ARTIFACT_TYPES` and `MAJOR_FRESHNESS_TYPES` both add `"IssueAdjudicationReport"` so the freshness gate verifies the latest adjudication report is current.
- Invariants pinned by tests: lifecycle-mode `CoherencyDelta` still works when no `IssueAdjudicationReport` exists (legacy fallback); duplicate findings grouped into one adjudicated group produce exactly one delta item and one remediation step; `issueGroupId` / `canonicalFindingId` / `memberFindingIds` / `groupingReasons` survive end-to-end through the runtime helper and the CLI; accepted / ignored / resolved groups are inactive and absent from the remediation queue; mixed groups with at least one active member remain active; `rekon refresh` step order is `init → config.validate → observe → project → snapshot → evaluate → findings.lifecycle → issues.adjudicate → coherency.delta → publish.architecture → artifacts.validate → artifacts.freshness`; `IssueAdjudicationReport` appears in `freshness.latestMajor`; `CoherencyDelta` becomes stale after a newer `IssueAdjudicationReport`; `rekon artifacts validate` stays clean with adjudicated CoherencyDelta in the store.
- Added `tests/contract/coherency-delta-adjudicated.test.mjs` (11 tests covering pure-helper group mode, remediation-queue collapse, status preservation, mixed-with-active, legacy fallback, runtime helper preference, runtime helper fallback, CLI group-aware coherency, refresh step ordering and `IssueAdjudicationReport` in `latestMajor`, freshness invalidation by newer adjudication report, and artifacts validate cleanliness).
- Updated `tests/contract/refresh-command.test.mjs` to require `"issues.adjudicate"` in the step order, `"IssueAdjudicationReport"` in the required artifact types, and to include `"issues.adjudicate"` in the list of producing steps whose `artifacts` array must be non-empty. The existing 10 coherency-delta v1 tests in `tests/contract/coherency-delta.test.mjs` continue to pass without modification because the test seeds do not include an `IssueAdjudicationReport`, exercising the legacy fallback.
- Updated docs: `docs/artifacts/coherency-delta.md` (new Adjudicated Mode section, Legacy Lifecycle Mode section, group-aware fields on the item type, updated inputRefs + freshness narrative), `docs/concepts/coherency-delta.md` (replaced the "Future input" callout with a current "Adjudicated input (v2)" callout), `docs/artifacts/issue-adjudication-report.md` and `docs/concepts/issue-adjudication.md` (mark `CoherencyDelta` v2 consumption as shipped; `resolve.issue` v2 remains deferred), `docs/concepts/refresh.md` (lifecycle list adds step 8 `issues.adjudicate`, step numbering shifted; latest-major list adds `IssueAdjudicationReport`; sample JSON output includes the new step), `docs/strategy/classic-guarantee-regression-plan.md` (P1.1 records the shipped v2 slice and the new 11-test suite), `docs/strategy/classic-subsystem-purpose-map.md` (subsystem 6 now reads "P1 preserved (v1 + coherency v2)"; subsystem 7 records the v2 shape), `docs/strategy/classic-behavior-roadmap.md` (new Phase B entry), `docs/strategy/roadmap.md` (new bullet under completed alpha spine), `README.md` (the refresh lifecycle string now includes `issues adjudicate`), and this `CHANGELOG.md`.
- No artifact-header shape changes. No SDK API changes. No new capability roles, permissions, or actuators. No source writes. No LLM. No fuzzy / semantic matching. No mutation of `FindingReport`, `FindingStatusLedger`, `FindingLifecycleReport`, or `IssueAdjudicationReport`. No version bump. No npm publish.
- Added issue adjudication / dedupe v1 (closes the first slice of P1.1 — Issue Adjudication / Dedupe / False-positive handling — in the Classic Guarantees Audit).
- `@rekon/kernel-findings` gained `IssueAdjudicationStatus`, `IssueAdjudicationGroup`, `IssueAdjudicationSummary`, `IssueAdjudicationReport`, and `IssueAdjudicationInput` types. Exported pure helpers: `deriveIssueAdjudication`, `createIssueAdjudicationReport`, `validateIssueAdjudicationReport`, `assertIssueAdjudicationReport`, and `issueAdjudicationReportSchema`. The artifact carries a `summary` (counts per status / severity / type) and a `groups` array with `canonicalFindingId`, `memberFindingIds`, `groupingKey`, `groupingReasons`, and per-status `statusBreakdown`.
- Grouping is **deterministic only**. The group key is `type | ruleId | files(sorted) | subjects(sorted)`; when files are empty the subjects dimension is used; when both are empty the finding id becomes a singleton key. Reasons (`"same-type"`, `"same-rule"`, `"same-files"`, `"same-subjects"`, `"singleton-no-grouping-key"`) record which dimensions formed the key. No fuzzy / semantic / embedding / LLM matching.
- Canonical finding selection per group: prefer active members (`new` / `existing`), then highest severity (`critical > high > medium > low`), then earliest id lexicographically. Group severity is the highest severity across all members.
- Group status derivation: all members `new`/`existing` → `active`; all `accepted` → `accepted`; all `ignored` → `ignored`; all `resolved` → `resolved`; otherwise → `mixed`. `active: boolean` is true whenever any member is `new` or `existing` (so `mixed` groups can still be flagged for action). Per-status counts survive in `statusBreakdown`.
- `@rekon/runtime` exports a new `buildIssueAdjudicationReport(store, options?)` helper. It reads the latest `FindingLifecycleReport` (or builds one from latest `FindingReport` + `FindingStatusLedger` if no lifecycle report exists), reads `OwnershipMap` / `ObservedRepo` if available for optional per-group `systems` assignment, and writes an `IssueAdjudicationReport` whose `header.inputRefs` cite the lifecycle report plus everything that report itself cited. `BuildIssueAdjudicationOptions` accepts `lifecycleReportId`.
- New CLI commands: `rekon issues adjudicate [--root <path>] [--json]` always builds and writes a fresh report; `rekon issues list [--status active|accepted|ignored|resolved|mixed] [--root <path>] [--json]` returns the latest report's groups (building one if none exists) and optionally filters the returned groups by status without re-deriving the underlying report.
- Registered `IssueAdjudicationReport` as a built-in artifact type in `@rekon/sdk` (schemaVersion `0.1.0`, stability `experimental`). Routed it under the `findings` category in `@rekon/runtime`'s artifact category map.
- Invariants pinned by tests: raw `FindingReport`, `FindingStatusLedger`, and `FindingLifecycleReport` are **never** mutated by adjudication (bytes-on-disk check); no finding is dropped (singletons emit singleton groups); the report's `inputRefs` carry the lifecycle ref; `rekon artifacts freshness` marks the report stale after a newer `FindingLifecycleReport`; `rekon artifacts validate` stays clean after writing the new artifact.
- Added `tests/contract/issue-adjudication.test.mjs` (15 tests): grouping by type/rule/files/subjects; singleton-no-grouping-key fallback when files and subjects are empty; subject-only grouping when files are empty; no finding is dropped; highest severity wins per group; accepted/ignored/resolved statuses survive in `statusBreakdown`; mixed group with active+ignored is `active: true` and status `mixed`; `createIssueAdjudicationReport` produces a valid artifact; CLI `issues adjudicate` writes the report; CLI `issues list` returns groups and supports `--status`; CLI `issues list` builds a fresh report if none exists; adjudication does not mutate any of the three upstream artifacts; freshness invalidation cites newer `FindingLifecycleReport`; `artifacts validate` stays clean; runtime helper carries lifecycle ref in `inputRefs`.
- `CoherencyDelta` is **not** changed in this batch. Documentation notes (`docs/concepts/coherency-delta.md`) explicitly call out that a future `CoherencyDelta` v2 will consume adjudicated groups instead of raw lifecycle findings. The current `CoherencyDelta` continues to operate on `FindingLifecycleReport` exactly as before. `resolve.issue` is similarly unchanged in this batch; future v2 may search adjudicated groups first.
- Added new docs: `docs/artifacts/issue-adjudication-report.md`, `docs/concepts/issue-adjudication.md`. Updated `docs/artifacts/finding-lifecycle-report.md` (cross-links the new adjudication artifact + concept), `docs/concepts/finding-lifecycle.md` (clarifies that adjudication is a separate projection — the lifecycle still matches by id, not by dedupe), `docs/concepts/coherency-delta.md` (adds a "Future input" note about v2 consuming adjudicated groups), `docs/strategy/classic-guarantee-regression-plan.md` (P1.1 entry now records the shipped slice and the new contract tests), `docs/strategy/classic-subsystem-purpose-map.md` (subsystem 6 reads "P1 preserved (v1)"; next slice = CoherencyDelta v2), `docs/strategy/classic-behavior-roadmap.md` (new Phase B entry), `docs/strategy/roadmap.md` (new bullet under completed alpha spine), `README.md` (new commands), and this `CHANGELOG.md`.
- No artifact-header shape changes. No SDK API changes beyond the new built-in artifact type registration. No new capability roles, permissions, or actuators. No source writes. No mutation of upstream artifacts. No LLM. No version bump. No npm publish.
- Added memory usage evidence / curation v1 (closes the next slice of the operator-feedback / memory-curation guarantee under P1.2 in the Classic Guarantees Audit).
- `@rekon/capability-memory` gained two new artifact types: `MemoryUsageLedger` and `MemoryCurationReport`. Both are registered as built-in artifact types in `@rekon/sdk` and routed through `@rekon/runtime`'s artifact category map (`MemoryUsageLedger` → `actions`, `MemoryCurationReport` → `publications`). The capability's manifest now produces `MemoryUsageLedger` and `MemoryCurationReport` and consumes `MemoryUsageLedger`. A new invalidation rule (`memory.usage.changed`) marks curation reports stale when newer ledgers land.
- `MemoryUsageEvent` records explicit operator feedback about how a selected memory was used: `outcome` is one of `helpful` / `ignored` / `harmful` / `stale` / `unclear`. A `note` is required when `outcome` is `harmful` / `stale` / `ignored`. Events carry optional `memorySelectionId`, `usedBy`, `context` (`path`, `goal`, `resolverId`, `publicationId`, `workOrderId`), and `evidence` refs. `MemoryUsageLedger` appends events from the latest ledger on each write so history is preserved.
- `MemoryCurationItem` summarizes per-memory outcome counts and emits a deterministic `recommendation` from the rules: `harmfulCount >= 2 → deprecate`; `harmfulCount >= 1 → review`; `staleCount >= 2 → supersede-candidate`; `helpfulCount >= 2 → reinforce`; `helpfulCount >= 1 && ignoredCount == 0 → keep`; `ignoredCount >= 2 && helpfulCount == 0 → review`; otherwise `review`. Each item carries `reasons` (deterministic, human-readable explanation tokens) and a stable `score` for sort ordering. `MemoryCurationReport.summary` reports `totalMemories` / `totalUsageEvents` / per-recommendation counts.
- Pure helpers exported from `@rekon/capability-memory`: `createMemoryUsageLedger`, `validateMemoryUsageLedger`, `createMemoryCurationReport`, `deriveMemoryCuration`. The learner gained two new modes: `"usage-record"` and `"curation"`. The existing `"add"` and `"select"` modes are unchanged.
- New CLI commands: `rekon memory usage record <memory-entry-id> --outcome <outcome> [--note <note>] [--selection <selection-id>] [--path <path>] [--goal <goal>] [--used-by <name>] [--root <path>] [--json]`, `rekon memory usage list [--root <path>] [--json]`, and `rekon memory curation [--root <path>] [--json]`. Curation against an empty repo returns `{ artifact: null, summary: { totalMemories: 0 }, message: "No memory entries found." }` without writing an artifact. `memory usage list` returns `{ artifact: null, events: [] }` when no ledger exists yet.
- Invariants pinned by tests: `memory select` does **not** automatically record a usage event (selection is not usage); curation **never** mutates `OperatorFeedbackEntry.status` or any other field on a feedback entry; harmful/stale/ignored outcomes without a note are rejected at the CLI and learner boundary; the `MemoryCurationReport` becomes stale via `rekon artifacts freshness` when a newer `MemoryUsageLedger` lands.
- Agent operating contract publication integration: `@rekon/capability-docs.agent-contract` now reads the latest `MemoryCurationReport` (added to manifest `consumes`, with a new `memory.curation.changed` invalidation rule) and renders a short "Memory Curation Status" sub-section inside Memory Guidance with `memories needing review`, `reinforce candidates`, plus optional deprecate / supersede counts. The report ref is cited in `header.inputRefs` when present. No other section of the agent contract changed. The `MemorySelection` reading path is unchanged.
- Added `tests/contract/memory-usage-curation.test.mjs` (13 tests): usage record writes `MemoryUsageLedger`; harmful/stale/ignored without note is rejected (three separate tests); usage list returns recorded events; curation recommends `reinforce` for repeated helpful, `review` for a single harmful, `deprecate` for repeated harmful, `supersede-candidate` for repeated stale; curation does not mutate `OperatorFeedbackEntry`; memory select does not automatically record usage; `MemoryCurationReport` freshness goes stale after a newer `MemoryUsageLedger`; agent-contract publication includes the "Memory Curation Status" line with the correct counts and cites `MemoryCurationReport` in `inputRefs`.
- Added new docs: `docs/artifacts/memory-usage-ledger.md`, `docs/artifacts/memory-curation-report.md`, `docs/concepts/memory-curation.md`. Updated `docs/concepts/memory.md` (explicit "selection is not usage" + new CLI smoke), `docs/artifacts/memory-selection.md` (links the new ledger / curation docs; replaces the "Future `MemoryUsageEvent` could record …" deferral language), `docs/artifacts/operator-memory-entry.md` (cross-links the new docs), `docs/strategy/classic-guarantees-audit.md` / `classic-guarantee-regression-plan.md` / `classic-subsystem-purpose-map.md` / `classic-behavior-roadmap.md` / `roadmap.md` (record the new shipped slice and the explicit no-automatic-promotion / no-LLM-summarization deferral list), `README.md` (CLI command list), and this `CHANGELOG.md`.
- No artifact-header shape changes. No SDK API changes beyond the two new built-in artifact type registrations. No new capability roles. No new permissions. No source writes. No automatic memory mutation. No LLM. No version bump. No npm publish.
- Added `rekon agent-contract export --output <path> [--force] [--root <path>] [--json]` so operators can materialize the latest `agent-contract` Publication under a chosen repo-local path. Safe by default: the output must resolve inside the repo root; existing files require `--force`; protected agent-instruction paths (`AGENTS.md`, `CLAUDE.md` case-insensitive, `.cursor/rules/*.md`, `.github/copilot-instructions.md`) require `--force` and the JSON output reports `protectedPath: true`. The written file starts with a generated preamble citing the source `Publication:<id>`, declaring the file is not canonical truth, pointing to `.rekon/artifacts`, and stating the regenerate command. If no `agent-contract` Publication exists yet, the command auto-publishes one (requires a current snapshot) before exporting. JSON output: `{ outputPath, absolutePath, publicationRef: { type, id, schemaVersion }, forced, protectedPath, wrote, message? }`. `rekon publish agent-contract` still never writes a root `AGENTS.md`.
- Added `tests/contract/agent-contract-export.test.mjs` (15 tests): happy-path export writes `AGENTS.rekon.md` and reports the Publication ref; preamble cites the source Publication; original content is preserved; refuses existing without `--force`; force overwrites with the `Overwrote existing file because --force was provided.` message; refuses `AGENTS.md` without `--force`; allows `AGENTS.md` with `--force` and reports `protectedPath: true` with the protected-file message; refuses `CLAUDE.md`; refuses `.cursor/rules/*.md`; refuses `.github/copilot-instructions.md`; refuses absolute paths outside root and `../` relative escapes; auto-publishes when no Publication exists; `publish agent-contract` alone does not create a root `AGENTS.md`; JSON output carries `publicationRef`, `outputPath`, `absolutePath`, `forced`, `protectedPath`, and `wrote`; missing `--output` errors with the documented message.
- Updated `docs/concepts/agent-operating-contract.md` and `docs/artifacts/agent-contract-publication.md` to document the export command, the safe-by-default rules, the protected-path list, the JSON shape, and the recommended `AGENTS.rekon.md` target. Updated `AGENTS.md` and `README.md` to surface the new command. The CLI usage line for `agent-contract export` now appears in `rekon` help output.
- Implementation note: the protected agent-doc path detection (`PROTECTED_AGENT_DOC_BASENAMES`, `PROTECTED_AGENT_DOC_RELATIVE_PATTERNS`) is declared at the top of `packages/cli/src/index.ts`. The CLI invokes `main()` at module load and async function bodies run synchronously until the first `await`, so the consts must be initialized before any handler reaches `isProtectedAgentDocPath`.
- No artifact shape, kernel, SDK, or capability behavior changes. No new publisher. No source writes. No automatic AGENTS.md / CLAUDE.md mutation. No version bump. No npm publish.

## 0.1.0-alpha.0

- Initialized Rekon as an open-source monorepo.
- Added public package boundaries for kernels, SDK, runtime, CLI, and initial built-in capabilities.
- Added governance, security, contributing, and architecture decision scaffolding.
- Added the initial `@rekon/kernel-artifacts` public API for artifact refs, headers, JSON artifact validation, and deterministic JSON digests.
- Added the initial `@rekon/kernel-evidence` public API for evidence facts, evidence graphs, provider context, provider contracts, and dedupe helpers.
- Added the initial `@rekon/sdk` capability definition and in-memory registry API.
- Added the initial local `@rekon/runtime` artifact store, observe, snapshot, and resolver execution APIs.
- Added the built-in `@rekon/capability-js-ts` evidence provider.
- Added the initial `@rekon/cli` commands for init, capability listing, observe, snapshot, artifact inspection, and preflight resolution.
- Added the built-in `@rekon/capability-resolver` preflight resolver.
- Added GitHub Actions CI for typecheck, test, build, and whitespace checks.
- Added `@rekon/kernel-snapshot` as the public IntelligenceSnapshot contract used by runtime and resolver.
- Added `@rekon/kernel-repo-model` for ObservedRepo, OwnershipMap, and CapabilityMap contracts.
- Added `@rekon/capability-model` as a deterministic EvidenceGraph-to-model projector.
- Added `rekon project` and updated preflight resolution to prefer OwnershipMap and ObservedRepo before raw evidence fallback.
- Added `@rekon/kernel-rulebook` and `@rekon/kernel-findings` public contracts.
- Added `@rekon/kernel-graph` graph node, edge, slice, validation, and composition helpers.
- Added `@rekon/capability-graph` for import, symbol, and ownership graph slices.
- Added `@rekon/capability-policy` for initial rule evaluation and finding reports.
- Added runtime publish, learn, and act execution APIs.
- Added `@rekon/capability-docs` publication artifacts and `rekon publish agents`.
- Added `@rekon/capability-memory` feedback and selection artifacts plus `rekon memory` commands.
- Added `@rekon/capability-intent` work-order and verification-plan artifacts.
- Added `@rekon/capability-reconcile` artifact-only reconciliation plans and logs.
- Added local installed external capability loading from `.rekon/config.json`.
- Added a complete `examples/custom-capability` TODO detector.
- Added migration backlog and dogfood fixture documentation.
- Updated CI to Node 24 with Node 24-compatible GitHub Actions.
- Tightened the documented Node engine lanes to Node 20.12, 22, and 24.
- Added repository-wide artifact contract tests for the CLI smoke flow, artifact headers, index paths, digests, and generated artifact public-safety checks.
- Added SDK capability conformance helpers and contract tests for built-in and example capabilities.
- Added `resolve.preflight` `resolutionTrace` entries for ownership resolution, fallback behavior, finding/memory checks, and risk decisions.
- Updated preflight ownership resolution to prefer `OwnershipMap`, then `ObservedRepo`, then ownership `GraphSlice`, then raw `EvidenceGraph` ownership hints.
- Reworked the root README as the alpha onboarding entry point with a 10-minute CLI walkthrough, lifecycle overview, artifact/provenance explanation, capability overview, and alpha limitations.
- Added `docs/getting-started/first-10-minutes.md` and expanded artifact, resolver trace, extension authoring, manifest, security, package README, and contributing documentation.
- Polished `examples/custom-capability` as the canonical TODO capability example, including conformance testing, runtime execution instructions, expected outputs, and troubleshooting.
- Added lightweight docs contract tests for onboarding, extension authoring, artifact traceability, and contributor guidance.
- No runtime behavior, artifact shape, or SDK public API changes were made in the alpha onboarding docs pass.
- Updated process docs for solo alpha development to push directly to `main` after checks pass.
- Added runtime artifact index validation for index shape, required fields, duplicate refs, path containment, header/index matching, and digest verification.
- Added `rekon artifacts validate` for local artifact integrity checks.
- Hardened snapshot status so missing evidence reports `unknown`, malformed indexes or incomplete projection families report `partial`, and clean evidence-backed snapshots report `fresh`.
- Expanded full CLI smoke contract coverage to memory, intent, reconciliation, header freshness, index validation, and digest checks.
- Added an optional `REKON_DOGFOOD_CLASSIC_ROOT` dogfood regression harness that skips cleanly when no classic checkout is configured.
- Added durable NorthStar strategy docs in `docs/strategy/`: `north-star.md`, `capability-model.md`, `roadmap.md`, and `codebase-intel-classic-migration.md`.
- Added `docs/release/alpha-release-checklist.md` for the `0.1.0-alpha.1` go/no-go criteria.
- Added `docs/concepts/stability.md` describing the four stability labels (`stable`, `experimental`, `internal`, `deprecated`) and the alpha defaults for each package.
- Added stability labels to every `packages/*/README.md`.
- Linked strategy docs and the release checklist from `README.md`, and pointed `AGENTS.md` and `CONTRIBUTING.md` to the NorthStar.
- Added `scripts/audit-package-exports.mjs` to inspect every workspace package for required fields, `@rekon/*` scope, license, forbidden tokens, and source imports from `codebase-intel`.
- Added `scripts/publish-dry-run.mjs` to run `npm pack --dry-run --json` per workspace package, report tarball contents, and fail on missing READMEs, missing licenses, missing build output, accidental `.rekon/` or dogfood fixture inclusion, or other forbidden tokens. No package is ever published.
- Added `scripts/install-smoke.mjs` to copy `examples/simple-js-ts` into a temp workspace, run the full golden CLI flow against the built CLI, and validate the resulting artifact index. Install-from-tarball smoke remains a deferred follow-up.
- Added `scripts/audit-license.mjs` to verify the root LICENSE, the root `package.json` license, and every package license declare Apache-2.0.
- Added docs tests for the new strategy docs, the alpha release checklist, the stability concept doc, and per-package stability labels.
- No runtime behavior, artifact shape, or SDK public API changes were made in the alpha release readiness pass.
