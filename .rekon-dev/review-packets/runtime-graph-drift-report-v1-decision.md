# Review Packet — RuntimeGraphDriftReport v1 Decision

Slice 73 on the capability-ontology track. Strategy / architecture
decision batch. Builds on the RuntimeGraphObservationReport safety review at
`c0c19c7`. This is the final classic-parity drift layer of the spine.

## CHANGES MADE

- New strategy memo
  `docs/strategy/runtime-graph-drift-report-v1-decision.md` (14 headings +
  4 tables: option / input / status / boundary; Options A–E; input / drift
  / severity models; status / kind / row / artifact sketches; v1 drift
  policy).
- New 15-assertion docs test
  `tests/docs/runtime-graph-drift-report-v1-decision.test.mjs`.
- Cross-reference updates to the RuntimeGraphObservationReport safety review
  + v1 decision, the HandoffCoverageReport safety review, the architecture
  decision, the parity audit, the runtime-graph-observation artifact +
  concept docs, the handoff-coverage-report artifact + concept docs, the
  handoff-contract artifact + concept docs, the step-capability-graph
  artifact + concept docs, the path-freshness-report artifact + concept
  docs, `work-order.md`, `verification-plan.md`,
  `agent-operating-contract.md`, `remediation-work-orders.md`, both
  roadmaps, README, and CHANGELOG.
- This review packet.

## PUBLIC API CHANGES

None. Docs-only batch. No `packages/` source, artifact type, CLI command,
validator, or schema changed.

## PURPOSE PRESERVATION CHECK

- **Original problem.** Rekon now has expected workflow topology, declared
  baton policy, narrow handoff coverage, and an observed runtime graph.
  Classic codebase-intel performed runtime graph drift detection over
  observed runtime truth. Rekon needs a drift layer comparing the
  expected / declared graph surfaces against the observed runtime graph —
  distinct from path freshness, artifact lineage freshness, handoff coverage
  alone, and `VerificationRun` command success.
- **Guarantee preserved.** `RuntimeGraphDriftReport` is expected-vs-observed
  runtime graph drift; it consumes already-materialized Rekon artifacts;
  it does not read raw runtime event logs directly in v1; it mutates no
  upstream artifact; it creates no `WorkOrder` / `VerificationPlan`; intent
  remains deferred. The decision keeps each spine boundary intact.

## CODEBASE-INTEL ALIGNMENT

References the parity audit's classic findings (runtime graph drift over an
observed runtime-truth graph) rather than re-auditing classic source, and
imports nothing from classic codebase-intel. The v1 model re-homes classic
drift into Rekon's artifact-first spine: a comparison over the four
already-materialized graph artifacts, without re-parsing raw events or
re-evaluating coverage.

## OPTIONS CONSIDERED

A (defer drift) — rejected/deferred (parity gap remains). B (compare
existing graph artifacts) — **selected** (preserves layer boundaries; no
raw re-parse). C (read raw event logs directly) — rejected (observation owns
parsing). D (HandoffCoverageReport alone) — rejected (coverage is one input,
not full drift). E (freshness as drift) — rejected (freshness ≠ runtime
topology divergence).

## INPUT MODEL

`StepCapabilityGraph` (expected topology), `HandoffContract` (declared baton
policy), `HandoffCoverageReport` (declared-vs-observed coverage rows),
`RuntimeGraphObservationReport` (observed runtime graph) — resolved as
latest/pinned artifacts and cited by `ArtifactRef`; the builder reads
materialized content, never raw files. `.rekon/handoff-events.jsonl` is not
read directly; `PathFreshnessReport` and artifact lineage freshness are not
drift inputs. v1 may rely primarily on `HandoffCoverageReport` statuses for
declared-vs-observed handoff drift and use `RuntimeGraphObservationReport`
for observed runtime graph context.

## DRIFT MODEL

`RuntimeGraphDriftReport` { header, source(stepCapabilityGraphRef?,
handoffContractRef?, handoffCoverageReportRef?,
runtimeGraphObservationReportRef?), summary(total, inSync, missingExpected,
addedObserved, uncoveredHandoff, unresolvedContract, observationMissing,
notEvaluated, bySeverity), rows[] }. Each row: id, kind
(`step-edge`/`handoff`/`coverage`/`observation`/`contract`), status (the
seven statuses), severity (`low`/`medium`/`high`), message, optional
stepId / from/to / handoffId / coverageRowId / observedEdgeId, expectedRef?,
observedRef?, evidenceRefs[]. Statuses: `in-sync`, `missing-expected`,
`added-observed`, `uncovered-handoff`, `unresolved-contract`,
`observation-missing`, `not-evaluated`.

## V1 DRIFT POLICY

Read latest/pinned StepCapabilityGraph + HandoffContract +
HandoffCoverageReport + RuntimeGraphObservationReport. Observation absent or
empty → `observation-missing` / `not-evaluated` (no false drift). Coverage
`uncovered` → `uncovered-handoff`; coverage `added-observed` →
`added-observed`; coverage `unresolved-contract` → `unresolved-contract`.
Observed handoff edges not in `HandoffContract` → `added-observed` (unless
already covered). Declared rows with no observed counterpart →
`missing-expected` / `uncovered-handoff` (depending on the coverage row). No
`WorkOrder` / `VerificationPlan`; no execution-readiness marking.

## SEVERITY POLICY

Sketch (finalized at implementation): missing-expected = high;
uncovered-handoff = high; unresolved-contract = medium; added-observed =
medium; observation-missing = low; not-evaluated = low; in-sync = low.

## BOUNDARY MODEL

RuntimeGraphDriftReport vs RuntimeGraphObservationReport (drift vs
observation); vs HandoffCoverageReport (drift over coverage/context, not
coverage itself); vs PathFreshnessReport (runtime topology divergence vs
working-tree freshness); vs artifact freshness (vs lineage freshness); vs
WorkOrder / VerificationPlan (no task/proof creation); vs intent
(prerequisite only).

## INTENT IMPACT

Deferred. The v1 shape supports a future `intent:assess` / `intent:prepare`
/ `intent:status` once runtime layers exist; `RuntimeGraphDriftReport` v1
gates nothing.

## TESTS / VERIFICATION

- New docs test (15 assertions): headings, the Option-B selection, the six
  boundary statements, all four tables, CHANGELOG mention, and this packet.
- Full gate: `npm run typecheck`, `npm run test`, `npm run build`,
  `git diff --check`, `node scripts/audit-package-exports.mjs`, `node
  scripts/audit-license.mjs`, `node scripts/publish-dry-run.mjs`, `node
  scripts/install-smoke.mjs`, `node scripts/install-tarball-smoke.mjs`.
  No CLI smoke (strategy-only).

## INTENTIONALLY UNTOUCHED

All `packages/` source; every existing artifact type, schema, validator,
factory, and CLI command; `StepCapabilityGraph` / `HandoffContract` /
`HandoffCoverageReport` / `RuntimeGraphObservationReport`;
`PathFreshnessReport`; the lifecycle / `CoherencyDelta` line; intent
implementation; all version numbers; classic codebase-intel (not imported);
`pnpm-lock.yaml`.

## RISKS / FOLLOW-UP

- The drift / severity shapes are sketched here and finalized at
  implementation time (row id derivation; how observed-vs-expected edges are
  matched; dedupe between coverage-derived and observation-derived
  `added-observed` rows).
- v1 leans on `HandoffCoverageReport` statuses for the declared-vs-observed
  handoff axis; richer step-edge topology drift (using
  `StepCapabilityGraph` expected edges directly) can deepen later without
  changing the artifact type.
- The `observation-missing` vs `not-evaluated` distinction must be
  implemented precisely to avoid claiming drift when inputs are simply
  absent.

## NEXT STEP

RuntimeGraphDriftReport v1 implementation — register the artifact type + a
read-only generator from `StepCapabilityGraph`, `HandoffContract`,
`HandoffCoverageReport`, and `RuntimeGraphObservationReport`. Still no
`WorkOrder` / `VerificationPlan`, no intent implementation.
