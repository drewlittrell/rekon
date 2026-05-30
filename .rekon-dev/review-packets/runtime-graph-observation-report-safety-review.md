# Review Packet — RuntimeGraphObservationReport Safety Review

Slice 72 on the capability-ontology track. Strategy / safety-review batch.
Read-only review of the `RuntimeGraphObservationReport` v1 implementation
shipped at `2c4ee04`.

## CHANGES MADE

- New strategy memo
  `docs/strategy/runtime-graph-observation-report-safety-review.md` (15
  headings + 4 tables: surface / observation / boundary / option).
- New 15-assertion docs test
  `tests/docs/runtime-graph-observation-report-safety-review.test.mjs`.
- Cross-reference updates to the RuntimeGraphObservationReport v1 decision,
  the HandoffCoverageReport safety review + v1 decision, the architecture
  decision, the parity audit, the runtime-graph-observation artifact +
  concept docs, the handoff-coverage-report artifact + concept docs, the
  handoff-contract artifact + concept docs, the step-capability-graph
  artifact + concept docs, `work-order.md`, `verification-plan.md`,
  `agent-operating-contract.md`, `remediation-work-orders.md`, both
  roadmaps, README, and CHANGELOG.
- This review packet.

## PUBLIC API CHANGES

None. Docs-only batch. No `packages/` source, artifact type, CLI command,
validator, factory, parser, or schema changed.

## PURPOSE PRESERVATION CHECK

- **Original problem.** `RuntimeGraphObservationReport` is Rekon's first
  observed runtime graph artifact; it records runtime graph facts from
  `handoff_event` logs and sits between narrow handoff coverage and future
  runtime drift. Before designing `RuntimeGraphDriftReport`, Rekon must
  confirm that observation remains *raw observation* and does not silently
  become coverage, drift, remediation, or intent.
- **Guarantee preserved.** `RuntimeGraphObservationReport` is observed
  runtime graph; it is not declared topology, not `HandoffCoverageReport`;
  it evaluates no coverage, detects no drift, creates no `WorkOrder` /
  `VerificationPlan`; intent remains deferred. The review confirms each
  boundary is intact in the shipped code.

## CODEBASE-INTEL ALIGNMENT

References the parity audit's classic findings (a runtime truth graph built
from baton / handoff observations) rather than re-auditing classic source,
and imports nothing from classic codebase-intel. The v1 implementation
re-homes classic runtime observation into Rekon's artifact-first spine as a
narrow observed graph derived from the `handoff_event` log; full runtime
tracing and drift remain the next, separately-decided layers.

## ARTIFACT / CLI REVIEWED

`RuntimeGraphObservationReport` { header, source(eventLogPath?,
eventLogHash?, handoffCoverageReportRef?, handoffContractRef?,
stepCapabilityGraphRef?), summary(observedNodes, observedEdges,
handoffEvents, ignoredRows, parseErrors), nodes[], edges[] }. Factory
recomputes observedNodes/observedEdges, dedupes by id, sorts nodes by
(kind, id) and edges by (kind, from, to, id), and asserts; validator
enforces positive observedCount on every node/edge, unique ids, enum kinds,
`source === "handoff-event-log"`, and re-derives the counts (trusting only
handoffEvents/ignoredRows/parseErrors). Helper reads no files; parser is
pure over a string. CLI `rekon runtime graph observe [--root] [--json]
[--event-log] [--handoff-coverage-report] [--handoff-contract]
[--step-graph]` reads optional event log + optional citation refs, writes
one report under `graphs/`, prints the boundary statement.

## EVENT INPUT REVIEW

`.rekon/handoff-events.jsonl` is optional, raw, never mutated (read + sha256
only). Only `kind === "handoff_event"` lines create graph elements; other
valid JSON rows increment `ignoredRows`; invalid lines increment
`parseErrors` (non-fatal); missing log → zero nodes/edges. The builder reads
no files (CLI injects content + hash); evidenceRefs cite lines, not
payloads. Optional upstream refs are citation/context only.

## OBSERVATION MODEL REVIEW

Per `handoff_event` row: `step` nodes (from/to) + `handoff` edge; `feature`
node; `event` node; `source` node + `emitted-by` edge. Ids are slug-safe and
derived only from observed fields. Deterministic: identical inputs →
identical graph (factory + validator enforced). `observed-from` is reserved
in the type but not emitted in v1 — honest, no overclaim.

## AGGREGATION REVIEW

Repeated observations increment `observedCount`, append a line evidenceRef,
and extend first/last observed timestamps (min/max ISO-8601). No observation
is discarded; the positive-observedCount invariant guarantees every
persisted node/edge was observed at least once. Aggregation infers nothing
absent from the log.

## BOUNDARY FROM COVERAGE REVIEW

Observation preserves raw observed facts; coverage interpretation lives in
`HandoffCoverageReport`. The builder reads no `HandoffContract` /
`StepCapabilityGraph` / `HandoffCoverageReport` content — those refs are
citation/context only. No declared coverage evaluation.

## RUNTIME DRIFT BOUNDARY REVIEW

A single observed graph; no expected-vs-observed comparison; no
`RuntimeGraphDriftReport` built. `RuntimeGraphDriftReport` is the next
layer.

## WORKORDER / VERIFICATIONPLAN BOUNDARY

The CLI writes exactly one `RuntimeGraphObservationReport` under `graphs/`
and creates no `WorkOrder` / `VerificationPlan`. `VerificationRun` is not an
observation input.

## INTENT BOUNDARY

Deferred. v1 runs no intent phase and gates nothing; the shape supports a
future `intent:assess` / `intent:status` once runtime layers exist.

## RECOMMENDATION

`RuntimeGraphObservationReport` v1 is safe/stable as observed runtime graph
(no blocker). Proceed to the **RuntimeGraphDriftReport architecture / v1
decision**. Alternative if caution is preferred: a
`RuntimeGraphObservationReport` publication surfacing decision — but the
default is the drift-layer decision because the observed graph is now
implemented and safety-reviewed.

## TESTS / VERIFICATION

- New docs test (15 assertions): headings, the seven boundary statements,
  all four tables, CHANGELOG mention, and this packet.
- Full gate: `npm run typecheck`, `npm run test`, `npm run build`,
  `git diff --check`, `node scripts/audit-package-exports.mjs`, `node
  scripts/audit-license.mjs`, `node scripts/publish-dry-run.mjs`, `node
  scripts/install-smoke.mjs`, `node scripts/install-tarball-smoke.mjs`.
  No CLI smoke (strategy-only).

## INTENTIONALLY UNTOUCHED

All `packages/` source; every existing artifact type, schema, validator,
factory, parser, and CLI command; `RuntimeGraphObservationReport` /
`HandoffCoverageReport` / `HandoffContract` / `StepCapabilityGraph`;
`RuntimeGraphDriftReport` and later spine layers; the lifecycle /
`CoherencyDelta` line; intent implementation; all version numbers; classic
codebase-intel (not imported); `pnpm-lock.yaml`.

## RISKS / FOLLOW-UP

- Slug-based node/edge ids can merge distinct raw ids that slug to the same
  value (operator-controlled; acceptable for v1).
- `handoffEvents` / `ignoredRows` / `parseErrors` are trusted by the
  validator (observed during parsing, not recomputable from nodes/edges).
- The reserved `observed-from` edge kind is unused in v1; emitting it is a
  later, separately-decided refinement.
- Observation must stay raw: a future change must not fold declared-policy
  interpretation into the graph, or it would drift toward coverage.

## NEXT STEP

RuntimeGraphDriftReport architecture / v1 decision — decide how expected
topology, declared contracts, handoff coverage, and the observed runtime
graph are compared for drift. Still no `RuntimeGraphDriftReport`
implementation, no `WorkOrder` / `VerificationPlan`, no intent
implementation.
