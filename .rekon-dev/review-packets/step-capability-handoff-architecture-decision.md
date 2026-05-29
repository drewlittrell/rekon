# Review Packet — StepCapabilityGraph / HandoffContract Architecture Decision

Slice 60 on the capability-ontology track. Strategy / architecture
decision batch. Builds on the Classic Step-Capability / Handoff / Runtime
Drift Parity Audit at `b29004e`.

## CHANGES MADE

- New strategy memo
  `docs/strategy/step-capability-handoff-architecture-decision.md`
  (15 headings + 4 tables: option / artifact sequence / boundary /
  intent impact; Options A–E; five artifact models).
- New 15-assertion docs test
  `tests/docs/step-capability-handoff-architecture-decision.test.mjs`.
- Cross-reference updates to the parity audit, the classic scanner /
  ontology parity audit, `evidence-graph.md`, `capability-map.md`,
  `capability-contract.md`, `work-order.md`, `verification-plan.md`,
  `bridge-finding-lifecycle-integration-report.md`,
  `agent-operating-contract.md`, `remediation-work-orders.md`, both
  roadmaps, README, and CHANGELOG.
- This review packet.

## PUBLIC API CHANGES

None. Docs-only batch. No `packages/` source, artifact type, CLI
command, validator, or schema changed.

## PURPOSE PRESERVATION CHECK

- **Original problem.** Classic codebase-intel had a richer subsystem
  around step-capability graphs, baton / handoff contracts, handoff
  coverage, runtime truth, and drift. Rekon has capability projection +
  policy / lint / finding infrastructure but no step/workflow/handoff
  graph. Intent work would be incomplete without knowing a repo's steps,
  capabilities, handoffs, and runtime drift state.
- **Guarantee preserved.** This decision keeps `EvidenceGraph` /
  `CapabilityMap` / `CapabilityContract` boundaries intact. It positions
  `StepCapabilityGraph` as the step/workflow graph layer (not a
  replacement for `CapabilityMap`), `HandoffContract` as the declared
  baton layer (not a `WorkOrder`), `HandoffCoverageReport` as coverage
  evidence (not `VerificationRun` command success), and
  `RuntimeGraphDriftReport` as runtime drift evidence (not
  `PathFreshnessReport`). No existing guarantee is altered; the decision
  only reserves layered responsibilities and a build order.

## CODEBASE-INTEL ALIGNMENT

The decision references the parity audit's classic-source findings
(sdk-baton-node, product-capability-contracts drift/coverage,
kernel-runtime-truth, step-capability-graph producer, derive/step-handler
validators) rather than re-auditing classic code, and imports nothing
from classic codebase-intel. The proposed artifact responsibilities mirror
the classic split (expected topology → declared handoffs → coverage →
observed graph → drift) while re-homing each into Rekon's artifact-first
spine instead of a mutable working tree.

## OPTIONS CONSIDERED

A (CapabilityMap/Contract enough) — rejected (parity gap remains). B
(staged spine) — **selected** (preserves boundaries; drift built on
expected + observed). C (start at drift) — rejected (no expected graph).
D (fold handoffs into WorkOrder/VerificationPlan) — rejected (topology,
not instructions/proof). E (fold StepCapabilityGraph into CapabilityMap
v2) — rejected (projection ≠ topology).

## STEP CAPABILITY GRAPH MODEL

Expected workflow/step → capability / file / system topology with
expected handoff edge placeholders. Inputs: `EvidenceGraph`,
`CapabilityMap v2`, `CapabilityPhraseReport`, optional operator step-map
config. Boundary: workflow topology, not `CapabilityMap v2`.

## HANDOFF CONTRACT MODEL

Declares expected baton passes (from/to nodes, expected feature/capability
ids, event identity / payload-shape metadata). Inputs: operator config +
`StepCapabilityGraph`. Boundary: declared baton policy, not `WorkOrder`.

## HANDOFF COVERAGE MODEL

Compares declared `HandoffContract` entries to observed handoff events →
`intact` / `broken` / `added` / `removed` / `uncovered`. Inputs:
`HandoffContract` + `RuntimeGraphObservationReport` (or raw event log).
Boundary: handoff-event coverage, not `VerificationRun` command success.

## RUNTIME GRAPH MODEL

`RuntimeGraphObservationReport` records observed runtime nodes/edges +
event coverage + source refs from baton events / smoke traces.
`RuntimeGraphDriftReport` compares expected (`StepCapabilityGraph` +
`HandoffContract`) vs observed (and/or base/head) → missing / added /
removed edges, changed capability-to-step links, unresolved drift.
Boundary: runtime graph drift, not `PathFreshnessReport` or artifact
lineage freshness.

## INTENT IMPACT

`intent:assess` assesses missing step/handoff/drift context;
`intent:prepare` attaches steps/capabilities/handoffs/gates;
`intent:status` reports handoff coverage + runtime drift; `intent:go`
gates on unresolved runtime drift. Intent parity depends on all four
layers.

## TESTS / VERIFICATION

- New docs test (15 assertions): headings, the staged-spine selection,
  the four boundary statements + intent-dependency statement, the
  no-runtime-change statement, all four tables, CHANGELOG, and this
  packet.
- Full gate: `npm run typecheck`, `npm run test`, `npm run build`,
  `git diff --check`, `node scripts/audit-package-exports.mjs`,
  `node scripts/audit-license.mjs`, `node scripts/publish-dry-run.mjs`,
  `node scripts/install-smoke.mjs`,
  `node scripts/install-tarball-smoke.mjs`. No CLI smoke (strategy-only).

## INTENTIONALLY UNTOUCHED

All `packages/` source; every existing artifact type, schema, validator,
factory, and CLI command; `BridgeFindingLifecycleIntegrationReport`; the
lifecycle / `CoherencyDelta` line; intent implementation; all version
numbers; classic codebase-intel (read-only reference, not imported).

## RISKS / FOLLOW-UP

- The five artifacts are reserved with responsibilities + sequence but no
  shapes yet; each needs its own v1 decision (starting with
  `StepCapabilityGraph` v1).
- Runtime observation must stay opt-in (no always-on daemon), consistent
  with the watcher / path-freshness stance.
- `DerivedGraphValidationReport` / `StepHandlerValidationReport` remain
  evaluation-only until the topology + drift layers exist.

## NEXT STEP

StepCapabilityGraph v1 decision (artifact shape + inputs:
`EvidenceGraph`, `CapabilityMap v2`, `CapabilityPhraseReport`, optional
operator step-map config; still no handoff coverage, no drift, no intent
implementation).
