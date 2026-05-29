# Review Packet — Classic Step-Capability / Handoff / Runtime Drift Parity Audit

Slice 59 on the capability-ontology track. Strategy / architecture audit
batch. Built on `93d87a4` (the operator's header said `c908857`, which
is slice 57; the `BridgeFindingLifecycleIntegrationReport` safety review
shipped at `93d87a4` as slice 58 — see RISKS / FOLLOW-UP).

## CHANGES MADE

- New strategy memo
  `docs/strategy/classic-step-capability-handoff-runtime-drift-parity-audit.md`
  (21 headings + 4 tables: classic source / gap matrix / proposed
  artifact / intent impact).
- New 20-assertion docs test
  `tests/docs/classic-step-capability-handoff-runtime-drift-parity-audit.test.mjs`.
- Cross-reference updates to the classic scanner/ontology parity audit,
  the capability-ontology architecture impact review, `evidence-graph.md`,
  `capability-map.md`, `capability-contract.md`,
  `bridge-finding-lifecycle-integration-report.md`, `work-order.md`,
  `verification-plan.md`, `agent-operating-contract.md`,
  `remediation-work-orders.md`, both roadmaps, README, and CHANGELOG.
- This review packet.

## PUBLIC API CHANGES

None. Docs-only batch. No `packages/` source, artifact type, CLI
command, validator, or schema changed.

## PURPOSE PRESERVATION CHECK

- **Original problem.** Classic codebase-intel solved a problem Rekon has
  been implicitly assuming away: it modeled *steps/workflows* as a graph
  of capabilities + handoffs, verified declared cross-system handoffs
  against observed runtime events, validated step handlers and derived
  state for determinism, and detected runtime/evidence drift — then fed
  all of that into an intent phase engine. Rekon's current spine
  (capability map/contract, findings, lifecycle preview, verification
  run, work order) is adjacent but does not reproduce the
  step/handoff/runtime-drift layer.
- **Guarantee preserved.** This audit does not change Rekon behavior; it
  preserves the *design intent* of the classic subsystem by recording it
  faithfully (with file-cited evidence), naming the gaps, and reserving
  the artifact names so future work can restore parity deliberately
  rather than reinventing it. No classic guarantee is silently dropped:
  each is mapped to a reserved/evaluated Rekon artifact.

## CODEBASE-INTEL ALIGNMENT

Grounded by reading classic source directly (read-only; nothing
imported), via four parallel read-only Explore surveys covering: the
step-capability map + graph producer + graph contract catalog; the
Baton SDK + capability-contract drift/coverage modules + runtime-truth
schema; the derive/step-handler/conductor validators; and the
watcher/memory/intent services. Two corrections to the work order's
premise were recorded honestly: (1) `tools/verify-handoff-coverage.mjs`
and the `tools/*-gates`/`*-flows` scripts do **not** exist at those
paths — the real logic lives in `product-capability-contracts`; (2)
classic "drift" is a base-vs-head `EvidenceGraph` diff layered over an
observed runtime-truth graph, not a single-point freshness check.

## CLASSIC SOURCE REVIEWED

`lib/step-capability-map.ts`,
`domain/graph/producers/step-capability-graph.ts`,
`lib/graph-contract-catalog.ts`; `packages/sdk-baton-node/src/index.ts`,
`packages/product-capability-contracts/src/{types,drift-artifacts,capability-scaffolds,capability-graph,registry-artifacts}.ts`,
`packages/kernel-runtime-truth/src/schema/runtime-truth.schema.ts`;
`services/{StepHandlerValidationHandler,DerivedStateValidationScanner}.ts`,
`commands/{validate-step-handlers,validate-derive}.ts`,
`infra/validation/{ConductorValidationHandler,DerivedStateValidationHandler}.ts`;
`schemas/runtime-graph.schema.ts`; `infra/providers/WatchProvider.ts`,
`commands/memory.ts`, `lib/turn-memory.ts`,
`services/IntentWorkflowService.ts`, `lib/intent*`,
`.codebase-intel/intent/migrations/*/phases/*`.

## STEP-CAPABILITY GRAPH

Two-layer bridge graph from a `step-capability-map.yaml`: nodes `step` /
`capability` / `file`; edges `step→capability` (`owns`, hard, acyclic)
and `step→file` (`implements`, soft, acyclic); runtime-grounded via
execution stats. Not a flat capability→subjects map.

## BATON / HANDOFF SYSTEM

`BatonNodeRuntimeEvent` runtime events → `RuntimeTruthGraph` DAG
(handoff nodes/edges carry `handoffContractId`). Capability contracts
declare `handoffs: string[]`. Coverage compares declared vs evidenced
handoffs → `intact` / `broken` / `added` / `removed` + `handoff_broken`
violations. Stronger than command exit codes.

## RUNTIME GRAPH DRIFT

Observed runtime-truth graph (Baton events, persisted + merged) plus a
base-vs-head `EvidenceGraph` capability/handoff/outcome change report
(`drift-artifacts.ts`). Distinct from `PathFreshnessReport` (single-point
source fingerprint/mtime staleness). Derive validation guarantees
derived outputs are pure/deterministic/replayable.

## REKON GAP MATRIX

step-capability graph → reserve `StepCapabilityGraph`; baton handoff
contracts → reserve `HandoffContract`; handoff coverage → reserve
`HandoffCoverageReport`; runtime graph observation → reserve
`RuntimeGraphObservationReport`; runtime graph drift → reserve
`RuntimeGraphDriftReport`; derive validation → evaluate
`DerivedGraphValidationReport`; step-handler validation → evaluate
`StepHandlerValidationReport`.

## PROPOSED ARTIFACT SPINE ADDITIONS

Five reserved (`StepCapabilityGraph`, `HandoffContract`,
`HandoffCoverageReport`, `RuntimeGraphObservationReport`,
`RuntimeGraphDriftReport`) + two evaluated (`DerivedGraphValidationReport`,
`StepHandlerValidationReport`). Names reserved only — no registration,
schema, or CLI in this batch.

## INTENT IMPACT

`intent:assess` needs context completeness + graph/handoff readiness;
`intent:prepare` needs the step/capability/handoff/gate model;
`intent:go` must not proceed under unresolved runtime graph drift;
`intent:status` should report handoff coverage + drift. Intent parity
depends on step-capability, handoff, and runtime drift surfaces.

## TESTS / VERIFICATION

- New docs test (20 assertions) over headings, boundary statements,
  reserved/evaluated artifact names, all four tables, CHANGELOG, and this
  packet.
- Full gate: `npm run typecheck`, `npm run test`, `npm run build`,
  `git diff --check`, `node scripts/audit-package-exports.mjs`,
  `node scripts/audit-license.mjs`, `node scripts/publish-dry-run.mjs`,
  `node scripts/install-smoke.mjs`,
  `node scripts/install-tarball-smoke.mjs`. No CLI smoke (strategy-only).

## INTENTIONALLY UNTOUCHED

All `packages/` source; every existing artifact type, schema, validator,
factory, and CLI command; `BridgeFindingLifecycleIntegrationReport`;
the lifecycle / `CoherencyDelta` line; intent implementation; all
version numbers; classic codebase-intel (read-only, not imported).

## RISKS / FOLLOW-UP

- **State-header correction.** The operator's header said HEAD/main =
  `c908857` (slice 57). Actual `origin/main` was `93d87a4` (slice 58,
  `BridgeFindingLifecycleIntegrationReport` safety review). This audit
  builds on `93d87a4`; the "Next Step After This Batch: safety review" is
  therefore already shipped.
- The referenced classic tool paths (`verify-handoff-coverage.mjs`,
  `validate-gates.mjs`, `build-gates.mjs`, `build-flows.mjs`) do not
  exist; real logic is in `product-capability-contracts`. Recorded, not
  invented.
- Reserved names are not yet designed; the architecture decision slice
  must define shapes, producers, and consumers.

## NEXT STEP

StepCapabilityGraph / HandoffContract architecture decision (or, per the
work order's chain, resume the lifecycle safety-review line — already
shipped — then the Intent Capability Spine Integration Review).
