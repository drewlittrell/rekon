# Review Packet — IntentAssessmentReport v1 Decision

Slice 77 on the capability-ontology track. Strategy / architecture-decision
batch. Fixes the v1 shape, inputs, readiness model, blocker model, and
request/scope model for `IntentAssessmentReport`, the first implementation
target of the staged Rekon intent spine selected by the Intent Capability
Spine Integration Review (`64213df`). No artifact is implemented or registered,
and no CLI command is added.

## CHANGES MADE

- New strategy memo `docs/strategy/intent-assessment-report-v1-decision.md`
  (15 headings; option / input / readiness / boundary tables; request /
  scope / input / readiness / blocker / matched-context / boundary models).
- New 17-assertion docs test
  `tests/docs/intent-assessment-report-v1-decision.test.mjs`.
- Cross-reference updates to the integration review, the RuntimeGraphDriftReport
  safety review, the runtime-graph-drift / runtime-graph-observation /
  handoff-coverage / handoff-contract / step-capability-graph artifacts, the
  work-order / verification-plan / verification-run / verification-result /
  path-freshness-report artifacts, the agent-operating-contract +
  remediation-work-orders concepts, both roadmaps, README, and CHANGELOG.
- This review packet.

## PUBLIC API CHANGES

None. Docs-only batch. No `packages/` source, artifact type, CLI command,
validator, factory, or schema changed.

## PURPOSE PRESERVATION CHECK

- **Original problem.** Rekon has the full codebase-intelligence spine needed
  to judge readiness (capability, step, handoff, coverage, observation, drift,
  finding, freshness, proof) but no first-class artifact that assesses a user
  request against it. Classic intent assessment checked actionability, gates,
  verification state, and staleness before preparation/execution; Rekon must do
  the equivalent — and additionally fold in the graph spine — before preparing
  work.
- **Guarantee preserved.** `IntentAssessmentReport` is an assessment artifact,
  not a `WorkOrder`. It captures request / scope / readiness / blockers /
  missing context; it consumes existing Rekon artifacts without mutating them;
  it recommends a next action without preparing phases or executing work; and
  it blocks or warns when critical context is stale, missing, drifted,
  uncovered, or unverified. This memo pins those guarantees before any code is
  written. No artifact is registered, no generator implemented, no CLI added,
  no source write introduced, and nothing from classic codebase-intel is
  imported.

## CODEBASE-INTEL ALIGNMENT

Uses the integration review's recorded classic-source finding rather than
re-auditing classic code: classic intent readiness was gate-based plus
hash/staleness-based and did **not** consume the step/handoff/runtime-drift
spine. The Rekon assessment preserves the gate/staleness behavior and extends
parity by wiring the graph spine into readiness — recorded honestly as a
Rekon-native extension, not literal classic behavior. Nothing from classic
codebase-intel is imported.

## OPTIONS CONSIDERED

- A — `WorkOrder` as assessment: rejected (guidance is not readiness
  assessment).
- B — artifact-backed readiness assessment: **selected** (preserves
  gate/staleness behavior, extends with the graph spine).
- C — `PreparedIntentPlan` first: rejected (assessment required first).
- D — `IntentStatusReport` first: rejected (status needs an assessment target).
- E — `IntentGoDecision` first: rejected (execution deferred).

## REQUEST / SCOPE MODEL

`request` is the only required input: `goal` (required), `kind` (bug / feature
/ refactor / investigation / migration / unknown), optional `scope` (paths /
systems / capabilities / steps hints), optional `constraints`, optional
`nonGoals`. Scope hints are advisory; unresolved scope becomes a
`scope-ambiguous` blocker rather than a guess.

## INPUT MODEL

User request / goal required; `StepCapabilityGraph` and `RuntimeGraphDriftReport`
expected (absence → `missing-artifact` blocker unless allowed); `CapabilityMap`
v2 / `HandoffCoverageReport` / `PathFreshnessReport` / `VerificationResult`
consumed when available; `WorkOrder` reference only, never produced. Optional
`IntelligenceSnapshot`, `CapabilityContract`, `HandoffContract`,
`RuntimeGraphObservationReport`, `FindingReport`,
`BridgeFindingLifecycleIntegrationReport`, and `VerificationRun` /
`VerificationPlan` consumed when present. All inputs read as materialized
artifacts cited by `ArtifactRef`; the generator reads values, never files, and
mutates nothing.

## READINESS MODEL

Statuses: `ready-for-prepare` / `blocked` / `needs-review` /
`insufficient-context` / `stale-context`, with an optional `score` and a
required `recommendedNextAction` (`prepare-intent` / `refresh-context` /
`resolve-blockers` / `ask-clarifying-question` / `run-verification` /
`human-review`). High-severity drift → `blocked`; stale freshness →
`stale-context`; empty match → `insufficient-context`; `prepare-intent`
recommended only when blockers are empty or low severity. Never creates
`WorkOrder` / `VerificationPlan`.

## BLOCKER MODEL

Uniform `IntentAssessmentBlocker` shape (id, category, severity, message,
optional `sourceRefs`) across `blockers` (gate readiness), `warnings` (inform),
and `missingContext` (absent inputs). Categories: `missing-artifact` /
`stale-context` / `runtime-drift` / `handoff-coverage` / `finding-governance`
/ `proof-missing` / `scope-ambiguous` / `source-write-unavailable`. Entries
cite `sourceRefs` and copy no raw payloads.

## MATCHED CONTEXT MODEL

`matchedContext` resolves the request into `systems` / `capabilities` / `steps`
/ `paths`. Empty match → `insufficient-context`. Descriptive evidence for the
recommended next action and `scope-ambiguous` blockers, not a plan.

## BOUNDARY MODEL

`IntentAssessmentReport` is assessment, not `WorkOrder`; it does not create
`WorkOrder` / `VerificationPlan`, execute commands, or write source.
`PreparedIntentPlan` remains the next layer after assessment;
`IntentStatusReport` and `intent:go` remain deferred. `RuntimeGraphDriftReport`
is an input to readiness, not the intent system itself.

## TESTS / VERIFICATION

- New docs test (17 assertions): memo exists, all 15 headings, selects the
  artifact-backed readiness assessment, eight boundary statements, option /
  input / readiness / boundary tables, CHANGELOG mention, and this packet's
  PURPOSE PRESERVATION CHECK.
- Full gate: `npm run typecheck`, `npm run test`, `npm run build`,
  `git diff --check`, `node scripts/audit-package-exports.mjs`, `node
  scripts/audit-license.mjs`, `node scripts/publish-dry-run.mjs`, `node
  scripts/install-smoke.mjs`, `node scripts/install-tarball-smoke.mjs`.
  No CLI smoke (strategy-only).

## INTENTIONALLY UNTOUCHED

All `packages/` source; every existing artifact type, schema, validator,
factory, and CLI command; the full graph spine (`StepCapabilityGraph` /
`HandoffContract` / `HandoffCoverageReport` / `RuntimeGraphObservationReport` /
`RuntimeGraphDriftReport`); `WorkOrder` / `VerificationPlan` /
`VerificationRun` / `VerificationResult` / `PathFreshnessReport`;
`IntentAssessmentReport` (not implemented or registered); `PreparedIntentPlan`
/ `IntentStatusReport` / `IntentGoDecision` (deferred); all version numbers;
classic codebase-intel (not imported); `pnpm-lock.yaml`.

## RISKS / FOLLOW-UP

- The artifact shape here is a sketch; the v1 implementation slice fixes the
  factory / validator / schema precisely (recompute summary buckets,
  deterministic sort, enum validation) before registration.
- The readiness policy (which drift severities / coverage statuses / freshness
  states block vs warn) is pinned at the decision level; implementation must
  encode it exactly and test each branch.
- `source-write-unavailable` semantics depend on the deferred source-write
  policy; v1 treats it as a blocker only when the request implies direct source
  writes, otherwise a warning.

## NEXT STEP

IntentAssessmentReport v1 implementation — register the artifact type and a
read-only assessment generator from the user request plus existing Rekon
artifacts (`RuntimeGraphDriftReport`, `PathFreshnessReport`,
`VerificationResult` when available). Still no `PreparedIntentPlan`, no
`WorkOrder` / `VerificationPlan` creation, no command execution, and no source
writes.
