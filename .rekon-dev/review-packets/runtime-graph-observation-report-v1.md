# Review Packet — RuntimeGraphObservationReport v1 Implementation

Slice 71 on the capability-ontology track. Product-capability batch.
Implements the artifact selected by the RuntimeGraphObservationReport v1
Decision at `8e71215`.

## CHANGES MADE

- **`@rekon/kernel-repo-model`**: `RuntimeGraphObservationReport` type
  family (`RuntimeGraphObservationNodeKind`,
  `RuntimeGraphObservationEdgeKind`, `RuntimeGraphObservationEvidenceRef`,
  `RuntimeGraphObservationNode`, `RuntimeGraphObservationEdge`,
  `RuntimeGraphObservationReportSource`,
  `RuntimeGraphObservationReportSummary`,
  `RuntimeGraphObservationReport`) + `createRuntimeGraphObservationReport`
  factory + `validateRuntimeGraphObservationReport` /
  `assertRuntimeGraphObservationReport` +
  `runtimeGraphObservationReportSchema`.
- **`@rekon/sdk`**: registered `RuntimeGraphObservationReport` in
  `KNOWN_ARTIFACT_TYPES`.
- **`@rekon/runtime`**: mapped `RuntimeGraphObservationReport` → `graphs`
  in `ARTIFACT_CATEGORY_BY_TYPE`.
- **`@rekon/capability-model`**: `parseRuntimeGraphObservationEventLog` +
  `buildRuntimeGraphObservationReport` helper
  (`runtime-graph-observation-report.ts`) + exports.
- **`@rekon/cli`**: `rekon runtime graph observe [--root] [--json]
  [--event-log <path>] [--handoff-coverage-report <ref>]
  [--handoff-contract <ref>] [--step-graph <ref>]`.
- Docs: 2 new (`docs/artifacts/runtime-graph-observation-report.md`,
  `docs/concepts/runtime-graph-observation.md`) + 17 cross-ref updates +
  CHANGELOG + README.
- Tests: `tests/contract/runtime-graph-observation-report.test.mjs` (25) +
  `tests/docs/runtime-graph-observation-report.test.mjs` (11). This review
  packet.

## PUBLIC API CHANGES

- New artifact type `RuntimeGraphObservationReport` (category `graphs`,
  schema `0.1.0`, stability `experimental`).
- New `@rekon/kernel-repo-model` exports (types + factory + validator +
  assert + schema, listed above).
- New `@rekon/capability-model` exports:
  `buildRuntimeGraphObservationReport`,
  `parseRuntimeGraphObservationEventLog`,
  `RUNTIME_GRAPH_OBSERVATION_ARTIFACT_ID_PREFIX`,
  `RUNTIME_GRAPH_OBSERVATION_EVENT_LOG_PATH`,
  `RUNTIME_GRAPH_OBSERVATION_EVENT_KIND`, and supporting types.
- New CLI command `rekon runtime graph observe`. All additive; no existing
  surface changed; no version bump.

## PURPOSE PRESERVATION CHECK

- **Original problem.** Rekon has expected topology, declared baton policy,
  and handoff-event coverage, but still lacks a generalized observed
  runtime graph artifact. Classic codebase-intel maintained a runtime truth
  graph built from baton / handoff observations; Rekon needs
  `RuntimeGraphObservationReport` before `RuntimeGraphDriftReport` can
  compare expected vs observed graph.
- **Guarantee preserved.** v1 records observed runtime graph facts only,
  starting from the narrow `.rekon/handoff-events.jsonl` source. It does
  not interpret coverage against `HandoffContract`, does not compare
  against `StepCapabilityGraph`, detects no drift, and creates no
  `WorkOrder` / `VerificationPlan`. Optional upstream refs are
  citation/context only. The builder reads no files and reads no upstream
  artifact contents.

## CODEBASE-INTEL ALIGNMENT

Re-homes classic runtime truth-graph concepts (an observed graph built from
baton / handoff observations) into Rekon's artifact-first spine as a narrow
observed graph derived from the `handoff_event` log already understood by
`HandoffCoverageReport`. Imports nothing from classic codebase-intel; full
runtime-tracing infrastructure and drift remain explicitly deferred.

## ARTIFACT MODEL

`RuntimeGraphObservationReport` { header, source(eventLogPath?,
eventLogHash?, handoffCoverageReportRef?, handoffContractRef?,
stepCapabilityGraphRef?), summary(observedNodes, observedEdges,
handoffEvents, ignoredRows, parseErrors), nodes[], edges[] }. The factory
recomputes `observedNodes`/`observedEdges` (trusting
handoffEvents/ignoredRows/parseErrors), dedupes by id, and sorts nodes by
(kind, id) and edges by (kind, fromNodeId, toNodeId, id). The validator
enforces positive `observedCount` on every node and edge, unique ids, enum
kinds, `source === "handoff-event-log"` on nodes, and re-derives
`observedNodes`/`observedEdges`.

## EVENT INPUT MODEL

Optional `.rekon/handoff-events.jsonl`; one JSON object per line. Only
`kind === "handoff_event"` rows create observed graph elements; other valid
JSON rows increment `ignoredRows`; invalid JSON lines increment
`parseErrors` and never abort; missing log → zero nodes/edges. The builder
reads no files; the CLI reads the optional log and passes content + sha256
hash in. The log is never mutated.

## OBSERVATION MODEL

Per `handoff_event` row: `step` nodes for from/to; `feature` node when
feature exists; `event` node when name exists; `source` node when source
exists; `handoff` edge from→to (when both exist); `emitted-by` edge
event→source (when both name and source exist). Repeated observations
aggregate `observedCount`, extend first/last timestamps, and append line
evidence. Ids: `step:<id>` / `feature:<f>` / `event:<n>` / `source:<s>` /
`handoff:<from>:<to>` / `emitted-by:<n>:<s>` (slug-safe). `observed-from` is
reserved in the type but not emitted in v1.

## CLI SURFACE

`rekon runtime graph observe [--root <path>] [--json] [--event-log <path>]
[--handoff-coverage-report <ref>] [--handoff-contract <ref>] [--step-graph
<ref>]`. Reads the optional event log (default `.rekon/handoff-events.jsonl`
or explicit `--event-log`), optionally cites upstream refs (context only),
writes one `RuntimeGraphObservationReport` under `graphs/`, and prints the
summary plus: "No RuntimeGraphDriftReport, WorkOrder, or VerificationPlan
artifacts were created."

## BOUNDARY MODEL

RuntimeGraphObservationReport vs StepCapabilityGraph (observed graph vs
expected topology); vs HandoffContract (observed graph vs declared policy);
vs HandoffCoverageReport (observed graph vs coverage evaluation); vs
RuntimeGraphDriftReport (no drift); vs WorkOrder / VerificationPlan (no
task/proof creation); vs intent (prerequisite only).

## TESTS / VERIFICATION

- Contract test (25): validation; missing-log zero nodes/edges; step /
  feature / event / source node creation; handoff edge creation;
  observedCount aggregation (nodes + edges); first/last timestamp
  derivation; ignoredRows; parseErrors (non-fatal); event log hash/path
  recorded; optional refs recorded; summary counts; deterministic node +
  edge ordering; CLI write + explicit `--event-log` + optional refs +
  no-mutation + no drift/WorkOrder/VerificationPlan + `artifacts validate`
  clean.
- Docs test (11): both docs exist; seven boundary statements; CHANGELOG
  mention; this packet.
- Full gate: `npm run typecheck`, `npm run test`, `npm run build`,
  `git diff --check`, `node scripts/audit-package-exports.mjs`,
  `node scripts/audit-license.mjs`, `node scripts/publish-dry-run.mjs`,
  `node scripts/install-smoke.mjs`, `node scripts/install-tarball-smoke.mjs`.
- CLI smoke: `runtime graph observe` over a 4-line event log →
  observedNodes 5 / observedEdges 2 / handoffEvents 2 / ignoredRows 1 /
  parseErrors 1; event log unchanged; `artifacts validate` clean.

## INTENTIONALLY UNTOUCHED

`HandoffCoverageReport` / `HandoffContract` / `StepCapabilityGraph` and
their builders/CLI; every other existing artifact type/schema/validator/CLI;
the lifecycle / `CoherencyDelta` line; `RuntimeGraphDriftReport` (not
implemented); `WorkOrder` / `VerificationPlan` (not created); intent
implementation; all version numbers; classic codebase-intel (not imported);
`pnpm-lock.yaml`.

## RISKS / FOLLOW-UP

- Node/edge id derivation is slug-based; distinct raw ids that slug to the
  same value would merge (operator-controlled; acceptable for v1).
- `handoffEvents` / `ignoredRows` / `parseErrors` are observed during
  parsing and type-checked but trusted (not recomputable from nodes/edges).
- The `observed-from` edge kind is reserved but unused in v1; emitting it is
  a later, separately-decided refinement.
- Observation must stay raw: a future change must not fold declared-policy
  interpretation into the graph, or it would drift toward coverage.

## NEXT STEP

RuntimeGraphObservationReport safety review — review the observed runtime
graph artifact before the `RuntimeGraphDriftReport` v1 decision. Still no
`RuntimeGraphDriftReport`, no `WorkOrder` / `VerificationPlan`, no intent
implementation.
