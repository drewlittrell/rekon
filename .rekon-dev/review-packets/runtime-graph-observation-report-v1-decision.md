# Review Packet — RuntimeGraphObservationReport v1 Decision

Slice 70 on the capability-ontology track. Strategy / architecture
decision batch. Builds on the HandoffCoverageReport safety review at
`e5db6d6`.

## CHANGES MADE

- New strategy memo
  `docs/strategy/runtime-graph-observation-report-v1-decision.md` (14
  headings + 4 tables: option / input / boundary / follow-on; Options A–E;
  event input model; artifact sketch with nodes/edges; v1 observation
  policy).
- New 17-assertion docs test
  `tests/docs/runtime-graph-observation-report-v1-decision.test.mjs`.
- Cross-reference updates to the HandoffCoverageReport safety review + v1
  decision, the HandoffContract safety review, the architecture decision,
  the parity audit, the handoff-coverage-report artifact + concept docs,
  the handoff-contract artifact + concept docs, the step-capability-graph
  artifact + concept docs, `work-order.md`, `verification-plan.md`,
  `agent-operating-contract.md`, `remediation-work-orders.md`, both
  roadmaps, README, and CHANGELOG.
- This review packet.

## PUBLIC API CHANGES

None. Docs-only batch. No `packages/` source, artifact type, CLI command,
validator, or schema changed.

## PURPOSE PRESERVATION CHECK

- **Original problem.** Rekon now has declared step topology, declared
  handoff policy, and narrow handoff-event coverage. Classic codebase-intel
  maintained an observed runtime truth graph built from baton / handoff
  events, and used it as the base for runtime drift. Rekon needs a
  generalized runtime observation artifact before it can perform runtime
  graph drift detection — and observation must not be confused with
  coverage or drift.
- **Guarantee preserved.** `RuntimeGraphObservationReport` records observed
  runtime graph facts; it consumes raw runtime event evidence (starting
  with `handoff_event` logs); it does not evaluate declared coverage, does
  not compare expected vs observed, does not mark drift, and does not
  create `WorkOrder` / `VerificationPlan`. The decision keeps each spine
  boundary intact and defers drift and intent.

## CODEBASE-INTEL ALIGNMENT

References the parity audit's classic findings (an observed runtime-truth
graph built from baton / handoff events, used as the base for drift) rather
than re-auditing classic source, and imports nothing from classic
codebase-intel. The v1 model re-homes classic runtime observation into
Rekon's artifact-first spine: a generalized observed graph derived from the
narrow `handoff_event` log already understood by `HandoffCoverageReport`,
with full tracing infrastructure explicitly deferred.

## OPTIONS CONSIDERED

A (defer until drift) — rejected (drift needs an observed graph). B (raw
`handoff_event` log → observed graph) — **selected** (narrow runtime graph
without full tracing). C (derive from `HandoffCoverageReport`) —
rejected/deferred (coverage is interpreted data). D (expected graph /
declared policy → observation) — rejected (expected graph is not
observation). E (full runtime tracing now) — rejected/deferred (too much
blast radius).

## EVENT INPUT MODEL

`.rekon/handoff-events.jsonl` (the same raw log `HandoffCoverageReport`
reads). One JSON object per line (kind `handoff_event`, name, feature,
fromStepId, toStepId, timestamp, payloadType, source). Only
`handoff_event` rows create observed edges; non-handoff rows are ignored
and counted (`ignoredRows`); invalid lines increment `parseErrors`
(non-fatal); missing log → zero nodes/edges (no error); the log is never
mutated.

## ARTIFACT MODEL

`RuntimeGraphObservationReport` { header, source(eventLogPath?,
eventLogHash?, handoffCoverageReportRef?, handoffContractRef?,
stepCapabilityGraphRef?), summary(observedNodes, observedEdges,
handoffEvents, ignoredRows, parseErrors), nodes[], edges[] }. Nodes carry
id, kind (`step`/`feature`/`event`/`source`), label, source, first/last
observed timestamps, observedCount, and line evidenceRefs. Edges carry id,
kind (`handoff`/`emitted-by`/`observed-from`), from/to node ids,
feature?/eventName?/payloadType?, first/last observed timestamps,
observedCount, and line evidenceRefs. Evidence cites the log by line, not
by copying payloads; citation refs in `source` are context-only.

## V1 OBSERVATION POLICY

Read optional `.rekon/handoff-events.jsonl`; parse JSONL; for
`handoff_event` rows create/update `step` nodes (from/to), a `feature`
node, an `event` node, and a `handoff` edge, recording observedCount and
first/last timestamps; ignore non-handoff rows (`ignoredRows`); invalid
lines → `parseErrors`; missing log → zero nodes/edges. No comparison to
`StepCapabilityGraph` or `HandoffContract`; no drift.

## BOUNDARY MODEL

RuntimeGraphObservationReport vs StepCapabilityGraph (observed graph vs
expected topology); vs HandoffContract (observed graph vs declared policy);
vs HandoffCoverageReport (observed graph vs coverage evaluation); vs
RuntimeGraphDriftReport (no drift); vs WorkOrder / VerificationPlan (no
task/proof creation); vs intent (prerequisite only).

## FOLLOW-ON ARTIFACTS

`RuntimeGraphDriftReport` compares expected vs observed graph;
`intent:assess` can inspect whether runtime observation exists;
`intent:prepare` can require handoff/drift gates; `intent:status` can
report observed runtime graph freshness.

## INTENT IMPACT

Deferred. The v1 shape supports future `intent:assess` / `intent:prepare` /
`intent:status` once runtime layers exist; `RuntimeGraphObservationReport`
v1 gates nothing.

## TESTS / VERIFICATION

- New docs test (17 assertions): headings, the Option-B selection, the
  event path, the seven boundary statements, all four tables, CHANGELOG
  mention, and this packet.
- Full gate: `npm run typecheck`, `npm run test`, `npm run build`,
  `git diff --check`, `node scripts/audit-package-exports.mjs`, `node
  scripts/audit-license.mjs`, `node scripts/publish-dry-run.mjs`, `node
  scripts/install-smoke.mjs`, `node scripts/install-tarball-smoke.mjs`.
  No CLI smoke (strategy-only).

## INTENTIONALLY UNTOUCHED

All `packages/` source; every existing artifact type, schema, validator,
factory, and CLI command; `HandoffCoverageReport` / `HandoffContract` /
`StepCapabilityGraph`; `RuntimeGraphDriftReport` and later spine layers;
the lifecycle / `CoherencyDelta` line; intent implementation; all version
numbers; classic codebase-intel (not imported); `pnpm-lock.yaml`.

## RISKS / FOLLOW-UP

- The artifact + node/edge shapes are sketched here and finalized at
  implementation time (e.g. node/edge id derivation; how `feature` /
  `event` / `source` nodes connect via `emitted-by` / `observed-from`
  edges; multi-observation dedupe).
- Reusing the `handoff_event` log keeps observation narrow; broadening to
  other runtime traces (or a `RuntimeGraphObservationReport` that ingests
  more event kinds) is a later, separately-decided slice.
- Observation must stay raw: the implementation must not quietly fold in
  declared-policy interpretation, or it would drift toward coverage.

## NEXT STEP

RuntimeGraphObservationReport v1 implementation — register the artifact
type + a read-only generator from optional `.rekon/handoff-events.jsonl`
(observed nodes/edges + ignoredRows + parseErrors). Still no
`RuntimeGraphDriftReport`, no `WorkOrder` / `VerificationPlan`, no intent
implementation.
