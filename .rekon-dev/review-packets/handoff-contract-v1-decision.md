# Review Packet — HandoffContract v1 Decision

Slice 64 on the capability-ontology track. Strategy / architecture
decision batch. Builds on the StepCapabilityGraph safety review at
`be09f5c`.

## CHANGES MADE

- New strategy memo `docs/strategy/handoff-contract-v1-decision.md`
  (13 headings + 4 tables: option / input / boundary / follow-on;
  Options A–E; config + artifact sketches; v1 resolution policy).
- New 18-assertion docs test
  `tests/docs/handoff-contract-v1-decision.test.mjs`.
- Cross-reference updates to the safety review, the v1 decision, the
  architecture decision, the parity audit, the StepCapabilityGraph
  artifact + concept docs, `work-order.md`, `verification-plan.md`,
  `agent-operating-contract.md`, `remediation-work-orders.md`, both
  roadmaps, README, and CHANGELOG.
- This review packet.

## PUBLIC API CHANGES

None. Docs-only batch. No `packages/` source, artifact type, CLI
command, validator, or schema changed.

## PURPOSE PRESERVATION CHECK

- **Original problem.** `StepCapabilityGraph` now provides expected
  workflow topology, but Rekon has no declared baton policy layer.
  Classic codebase-intel declared handoff contracts over workflow
  features and compared them against observed runtime handoff events;
  Rekon needs the declared layer before any coverage, runtime
  observation, or drift work.
- **Guarantee preserved.** `HandoffContract` declares expected baton
  passes, references `StepCapabilityGraph` step ids, is policy/config-
  backed (not runtime observation), claims no coverage, creates no
  runtime events, and creates no `WorkOrder` / `VerificationPlan`. This
  decision keeps each spine boundary intact and defers coverage / runtime
  / drift / intent to later slices.

## CODEBASE-INTEL ALIGNMENT

References the parity audit's classic findings (declared `handoffs[]`,
handoff events, `handoffContractId`, intact/broken coverage) rather than
re-auditing classic source, and imports nothing from classic
codebase-intel. The v1 model re-homes the classic declared-handoff idea
into Rekon's artifact-first spine: an operator config plus an effective
artifact over the current `StepCapabilityGraph`, with observed events
explicitly deferred to the coverage / runtime layers.

## OPTIONS CONSIDERED

A (config-only) — rejected/deferred (downstream needs artifact refs). B
(config + artifact effective contract) — **selected** (operator policy +
artifact provenance). C (auto-derive handoffs) — rejected (baton policy
must be declared). D (fold into StepCapabilityGraph) — rejected (topology
≠ baton policy). E (start with HandoffCoverageReport) — rejected
(coverage needs declared handoffs).

## CONFIG MODEL

`.rekon/handoff-contracts.json` (version 0.1.0; `handoffs[]` with id,
fromStepId, toStepId, feature?, capability{verb,noun,domain?}?,
event{name,kind}?, payload{schemaHint}?, notes?). Missing valid; invalid
fails clearly; never mutated. Declares expected baton policy only; cannot
claim coverage / mark drift / create runtime events.

## ARTIFACT MODEL

`HandoffContract` { header, source(stepCapabilityGraphRef, configPath?,
configHash?), summary(total, declared, unresolvedStep, needsReview),
handoffs[] } where each entry has id, status
(declared/unresolved-step/needs-review), fromStepId, toStepId, feature?,
capability?, event?, payload?, evidenceRefs, messages?. No coverage
field; event/payload are expected-identity metadata only.

## V1 RESOLUTION POLICY

Read latest/pinned `StepCapabilityGraph` + optional config; for each
configured handoff, verify `fromStepId` / `toStepId` exist in
`StepCapabilityGraph.steps` → `declared`, else `unresolved-step`; no
config → valid contract with zero handoffs. Do not infer handoffs, do not
evaluate coverage, do not read runtime event logs.

## BOUNDARY MODEL

HandoffContract vs StepCapabilityGraph (policy vs topology); vs
HandoffCoverageReport (no coverage in v1); vs
RuntimeGraphObservationReport (no runtime events in v1); vs
RuntimeGraphDriftReport (no drift in v1); vs WorkOrder / VerificationPlan
(no task/proof creation); vs intent (prerequisite only).

## FOLLOW-ON ARTIFACTS

`HandoffCoverageReport` compares declared handoffs to observed events;
`RuntimeGraphObservationReport` provides the observed event graph;
`RuntimeGraphDriftReport` compares declared/expected vs observed;
`intent:prepare` attaches declared handoffs + gates; `intent:status`
reports coverage / drift state.

## INTENT IMPACT

Deferred. v1 shape supports a future `intent:prepare` / `intent:status`
once coverage and runtime layers exist; `HandoffContract` v1 gates
nothing.

## TESTS / VERIFICATION

- New docs test (18 assertions): headings, the config+artifact selection,
  the config path, the eight boundary statements, all four tables,
  CHANGELOG mention, and this packet.
- Full gate: `npm run typecheck`, `npm run test`, `npm run build`,
  `git diff --check`, `node scripts/audit-package-exports.mjs`, `node
  scripts/audit-license.mjs`, `node scripts/publish-dry-run.mjs`, `node
  scripts/install-smoke.mjs`, `node scripts/install-tarball-smoke.mjs`.
  No CLI smoke (strategy-only).

## INTENTIONALLY UNTOUCHED

All `packages/` source; every existing artifact type, schema, validator,
factory, and CLI command; `StepCapabilityGraph` and its config;
`HandoffCoverageReport` and later spine layers; the lifecycle /
`CoherencyDelta` line; intent implementation; all version numbers;
classic codebase-intel (not imported).

## RISKS / FOLLOW-UP

- The artifact + config shapes are sketched here and finalized at
  implementation time (e.g. id-derivation when omitted; needs-review
  triggers).
- `event` / `payload` metadata is expected-identity only; the coverage
  slice must not mistake it for observed events.
- Step-id references are validated against `StepCapabilityGraph.steps`;
  cross-graph staleness handling is a coverage/drift-slice concern.

## NEXT STEP

HandoffContract v1 implementation (register the artifact type + read-only
generator from `StepCapabilityGraph` + optional
`.rekon/handoff-contracts.json`; declared / unresolved-step only).
