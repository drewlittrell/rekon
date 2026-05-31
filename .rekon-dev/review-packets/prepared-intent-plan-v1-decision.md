# Review Packet — PreparedIntentPlan v1 Decision

Slice 80 on the capability-ontology track. Strategy / architecture-decision
batch. Fixes the v1 shape, inputs, prepared-status model, phase model,
obligation model, and verification requirement model for `PreparedIntentPlan`,
the layer after `IntentAssessmentReport` selected by the IntentAssessmentReport
Safety Review (`2b29e46`). No artifact is implemented or registered, and no CLI
command is added.

## CHANGES MADE

- New strategy memo `docs/strategy/prepared-intent-plan-v1-decision.md` (15
  headings; option / input / status / boundary tables; status / phase /
  obligation / verification-requirement models).
- New 17-assertion docs test
  `tests/docs/prepared-intent-plan-v1-decision.test.mjs`.
- Cross-reference updates to the IntentAssessmentReport safety review + v1
  decision, the integration review, the intent-assessment-report +
  intent-assessment + work-order + verification-plan + verification-run +
  verification-result + runtime-graph-drift-report + handoff-coverage-report +
  path-freshness-report docs, the agent-operating-contract +
  remediation-work-orders concepts, both roadmaps, README, and CHANGELOG.
- This review packet.

## PUBLIC API CHANGES

None. Docs-only batch. No `packages/` source, artifact type, CLI command,
validator, factory, or schema changed.

## PURPOSE PRESERVATION CHECK

- **Original problem.** `IntentAssessmentReport` can assess readiness,
  blockers, missing context, matched scope, drift, freshness, and proof state,
  but Rekon has no layer that turns a *safe* assessment into planned
  implementation phases, constraints, gates, obligations, and verification
  requirements — without becoming a `WorkOrder` or `VerificationPlan` and
  without crossing into execution or source writes.
- **Guarantee preserved.** `PreparedIntentPlan` is phase/gate preparation, not
  source-write execution. It consumes `IntentAssessmentReport` and existing
  Rekon artifacts; it emits phases, touched paths, capability / step / handoff
  / drift obligations, preservation constraints, and proposed verification
  requirements; it does not create `WorkOrder` or `VerificationPlan`, execute
  commands, or write source. This memo pins those guarantees before any code is
  written.

## CODEBASE-INTEL ALIGNMENT

Uses the integration review's recorded classic-source finding: classic
`intent:prepare` produced `PreparedPhaseArtifact`s (objective, deliverables,
acceptance criteria, actionability, touched paths, gates, outcomes,
implementation constraints, codebase baseline) and wrote phase JSON/MD + a
manifest, but executed nothing. Rekon's `PreparedIntentPlan` re-homes that
preparation into the artifact-first spine and additionally consumes the
step/handoff/runtime-drift graph spine as obligations — recorded honestly as a
Rekon-native extension, not literal classic behavior. Nothing from classic
codebase-intel is imported.

## OPTIONS CONSIDERED

- A — assessment as the plan: rejected (assessment is not phase preparation).
- B — artifact-backed `PreparedIntentPlan`: **selected** (preserves the
  assess → prepare boundary).
- C — `WorkOrder` as plan: rejected (implementation guidance is downstream).
- D — `VerificationPlan` as plan: rejected (proof command plan is downstream).
- E — `intent:go` first: rejected (execution deferred).

## INPUT MODEL

`IntentAssessmentReport` required; `CapabilityMap` v2 / `HandoffCoverageReport`
/ `RuntimeGraphDriftReport` / `PathFreshnessReport` / `VerificationResult`
consumed when available; `StepCapabilityGraph` consumed through
assessment/source refs; `CapabilityContract`, `HandoffContract`,
`RuntimeGraphObservationReport`, `FindingReport`, `VerificationRun` /
`VerificationPlan` as citation/context when present. `WorkOrder` is not an input
to v1 (preparation precedes work guidance). All inputs read as materialized
artifacts cited by `ArtifactRef`; the generator reads values, never files, and
mutates nothing.

## PREPARED STATUS MODEL

Statuses `prepared` / `blocked` / `needs-review` / `stale-assessment` /
`insufficient-assessment`, with a `recommendedNextAction` (`create-work-order`
/ `resolve-blockers` / `refresh-context` / `human-review` / `run-assessment` /
`defer`). Keyed off the source assessment readiness: stale → stale-assessment;
blocked → blocked; insufficient-context → insufficient-assessment; needs-review
→ needs-review (review phase only); ready-for-prepare → prepared (planned
phases). `create-work-order` recommended only when `prepared`.

## PHASE MODEL

`PreparedIntentPhase` (id, title, kind ∈ investigate / modify / refactor /
verify / review, status ∈ planned / blocked / needs-review, goal, paths,
systems, capabilities, steps, constraints, obligations, verificationRequirements,
sourceRefs). v1 may emit one coarse phase when detailed decomposition is not
deterministic; non-prepared plans emit at most a `review` phase, never
modify/refactor.

## OBLIGATION MODEL

`PreparedIntentObligation` (id, category, severity, message, optional
sourceRefs). Categories: capability-preservation / step-preservation /
handoff-preservation / runtime-drift / finding-governance / freshness /
verification / source-write-boundary. `blockedReasons` reuse the shape; a
`source-write-boundary` obligation always records that preparation authorizes no
source writes.

## VERIFICATION REQUIREMENT MODEL

`verificationRequirements` express what would need to be proven if the work were
carried out — requirements, not a proof artifact. Each carries id, optional
suggested `command`, `reason`, optional sourceRefs. Verification requirements
are not VerificationPlan; the generator materializes no `VerificationPlan`,
executes no command, and creates no `VerificationRun` / `VerificationResult`.

## BOUNDARY MODEL

PreparedIntentPlan is phase/gate preparation, not WorkOrder; it does not create
WorkOrder / VerificationPlan, execute commands, or write source. Verification
requirements are not VerificationPlan. IntentStatusReport remains the next layer
after preparation; intent:go remains deferred; source-write behavior remains
unavailable.

## TESTS / VERIFICATION

- New docs test (17 assertions): memo exists, all 15 headings, selects the
  artifact-backed PreparedIntentPlan, eight boundary statements, option / input
  / status / boundary tables, CHANGELOG mention, and this packet's PURPOSE
  PRESERVATION CHECK.
- Full gate: `npm run typecheck`, `npm run test`, `npm run build`,
  `git diff --check`, `node scripts/audit-package-exports.mjs`, `node
  scripts/audit-license.mjs`, `node scripts/publish-dry-run.mjs`, `node
  scripts/install-smoke.mjs`, `node scripts/install-tarball-smoke.mjs`. No CLI
  smoke (strategy-only).

## INTENTIONALLY UNTOUCHED

All `packages/` source; every existing artifact type, schema, validator,
factory, and CLI command; `IntentAssessmentReport`; the graph spine; `WorkOrder`
/ `VerificationPlan` / `VerificationRun` / `VerificationResult` /
`PathFreshnessReport`; `PreparedIntentPlan` (not implemented or registered);
`IntentStatusReport` / `IntentGoDecision` (deferred); all version numbers;
classic codebase-intel (not imported); `pnpm-lock.yaml`.

## RISKS / FOLLOW-UP

- The artifact shape here is a sketch; the v1 implementation slice fixes the
  factory / validator / schema precisely (recompute summary buckets where
  applicable, deterministic sort, enum validation) before registration.
- Phase decomposition is deterministic-or-coarse in v1; richer decomposition
  can deepen without changing the artifact type.
- `verificationRequirements` carry an optional suggested `command` string but
  never run it; the boundary to `VerificationPlan` must stay explicit in the
  implementation.

## NEXT STEP

PreparedIntentPlan v1 implementation — register the artifact type and a
read-only preparation generator from `IntentAssessmentReport` plus existing
Rekon artifacts. Still no `WorkOrder` / `VerificationPlan` creation, no command
execution, and no source writes.
