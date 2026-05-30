# Review Packet — RuntimeGraphDriftReport v1 Implementation

Slice 74 on the capability-ontology track. Product-capability batch. The
**final classic-parity drift layer** of the spine. Implements the artifact
selected by the RuntimeGraphDriftReport v1 Decision at `eebf19c`.

## CHANGES MADE

- **`@rekon/kernel-repo-model`**: `RuntimeGraphDriftReport` type family
  (`RuntimeGraphDriftStatus`, `RuntimeGraphDriftKind`,
  `RuntimeGraphDriftSeverity`, `RuntimeGraphDriftRow`,
  `RuntimeGraphDriftReportSource`, `RuntimeGraphDriftReportSummary`,
  `RuntimeGraphDriftReport`) + `createRuntimeGraphDriftReport` factory +
  `validateRuntimeGraphDriftReport` / `assertRuntimeGraphDriftReport` +
  `runtimeGraphDriftReportSchema`.
- **`@rekon/sdk`**: registered `RuntimeGraphDriftReport` in
  `KNOWN_ARTIFACT_TYPES`.
- **`@rekon/runtime`**: mapped `RuntimeGraphDriftReport` → `actions` in
  `ARTIFACT_CATEGORY_BY_TYPE`.
- **`@rekon/capability-model`**: `buildRuntimeGraphDriftReport` helper
  (`runtime-graph-drift-report.ts`) + four `Like` input types + exports.
- **`@rekon/cli`**: `rekon runtime graph drift [--root] [--json]
  [--step-graph] [--handoff-contract] [--handoff-coverage-report]
  [--runtime-observation-report]`.
- Docs: 2 new (`docs/artifacts/runtime-graph-drift-report.md`,
  `docs/concepts/runtime-graph-drift.md`) + 21 cross-ref updates + CHANGELOG
  + README.
- Tests: `tests/contract/runtime-graph-drift-report.test.mjs` (21) +
  `tests/docs/runtime-graph-drift-report.test.mjs` (10). This review packet.

## PUBLIC API CHANGES

- New artifact type `RuntimeGraphDriftReport` (category `actions`, schema
  `0.1.0`, stability `experimental`).
- New `@rekon/kernel-repo-model` exports (types + factory + validator +
  assert + schema).
- New `@rekon/capability-model` exports: `buildRuntimeGraphDriftReport`,
  `RUNTIME_GRAPH_DRIFT_REPORT_ARTIFACT_ID_PREFIX`, and four `Like` input
  types.
- New CLI command `rekon runtime graph drift`. All additive; no existing
  surface changed; no version bump.
- **Category choice.** `actions` (per the decision's recommendation): the
  drift report is an evaluation/report over graph artifacts, not raw
  evidence, not a graph source of truth, not a FindingReport, and not a
  publication. (`HandoffCoverageReport` is also `actions`;
  `RuntimeGraphObservationReport` — a graph source — is `graphs`.)

## PURPOSE PRESERVATION CHECK

- **Original problem.** Rekon has expected topology, declared baton policy,
  handoff coverage, and an observed runtime graph. Classic codebase-intel
  performed runtime graph drift detection over observed runtime truth. Rekon
  needs the final classic-parity drift layer comparing
  expected/declared/coverage artifacts against the observed runtime graph.
- **Guarantee preserved.** `RuntimeGraphDriftReport` compares
  already-materialized artifacts; it duplicates no event parsing, duplicates
  no coverage evaluation, conflates runtime drift with neither
  `PathFreshnessReport` nor artifact freshness, creates no `WorkOrder` /
  `VerificationPlan`, and defers intent. The builder reads no files.

## CODEBASE-INTEL ALIGNMENT

Re-homes classic runtime graph drift (over observed runtime truth) into
Rekon's artifact-first spine as a comparison over the four
already-materialized graph artifacts. Imports nothing from classic
codebase-intel; remediation (`WorkOrder` / `VerificationPlan`) and intent
remain downstream, separately-decided layers.

## ARTIFACT MODEL

`RuntimeGraphDriftReport` { header, source(stepCapabilityGraphRef?,
handoffContractRef?, handoffCoverageReportRef?,
runtimeGraphObservationReportRef?), summary(total, inSync, missingExpected,
addedObserved, uncoveredHandoff, unresolvedContract, observationMissing,
notEvaluated, bySeverity), rows[] }. Each row: id, kind, status, severity,
message, optional stepId/from/to/handoffId/coverageRowId/observedEdgeId,
expectedRef?, observedRef?, evidenceRefs[]. The factory dedupes by id, sorts
by (kind, status, id), and recomputes the status buckets + bySeverity; the
validator enforces enums, unique ids, non-empty fields, ref validity, and
re-derives the full summary. The `source` type carries **no** raw
event-log path.

## INPUT MODEL

Four materialized artifacts: `StepCapabilityGraph`, `HandoffContract`,
`HandoffCoverageReport`, `RuntimeGraphObservationReport` — read as latest or
pinned, cited by `ArtifactRef`. `.rekon/handoff-events.jsonl` is not read;
`PathFreshnessReport` and artifact lineage freshness are not inputs. The
builder consumes only values (structural `Like` types) and reads no files.

## DRIFT MODEL

Statuses `in-sync` / `missing-expected` / `added-observed` /
`uncovered-handoff` / `unresolved-contract` / `observation-missing` /
`not-evaluated`. Coverage rows map: covered→in-sync, uncovered→uncovered-handoff,
unresolved-contract→unresolved-contract, added-observed→added-observed,
not-evaluated→not-evaluated. Observed handoff edges absent from the contract
and not already covered → added-observed. Declared handoffs with no coverage
row (observation present) → missing-expected. Observation absent/empty →
observation-missing (never false drift).

## STATUS / SEVERITY POLICY

Severity: missing-expected = high; uncovered-handoff = high;
unresolved-contract = medium; added-observed = medium; observation-missing =
low; not-evaluated = low; in-sync = low. Severity is a hint; the report
infers no user-facing remediation priority beyond it.

## CLI SURFACE

`rekon runtime graph drift [--root <path>] [--json] [--step-graph]
[--handoff-contract] [--handoff-coverage-report] [--runtime-observation-report]`.
Reads latest/pinned inputs, writes one `RuntimeGraphDriftReport` under
`actions/`, prints the summary plus: "No WorkOrder or VerificationPlan
artifacts were created."

## BOUNDARY MODEL

RuntimeGraphDriftReport vs RuntimeGraphObservationReport (drift vs
observation); vs HandoffCoverageReport (drift over coverage/context, not
coverage itself); vs PathFreshnessReport (topology divergence vs working-tree
freshness); vs artifact freshness (vs lineage freshness); vs WorkOrder /
VerificationPlan (no task/proof creation); vs intent (prerequisite only).

## TESTS / VERIFICATION

- Contract test (21): validation; covered→in-sync; uncovered→uncovered-handoff;
  unresolved-contract→unresolved-contract; added-observed→added-observed;
  not-evaluated→not-evaluated; observation absent/empty → observation-missing
  (no false drift); observation-only added-observed; severity mapping;
  summary counts + bySeverity; deterministic ordering; source refs preserved;
  helper reads no raw logs; CLI write + pinned refs + no-mutation + no
  WorkOrder/VerificationPlan + no raw-log read + `artifacts validate` clean.
- Docs test (10): both docs exist; six boundary statements; CHANGELOG
  mention; this packet.
- Full gate: `npm run typecheck`, `npm run test`, `npm run build`,
  `git diff --check`, `node scripts/audit-package-exports.mjs`,
  `node scripts/audit-license.mjs`, `node scripts/publish-dry-run.mjs`,
  `node scripts/install-smoke.mjs`, `node scripts/install-tarball-smoke.mjs`.
- CLI smoke: full chain ending in `runtime graph drift` → inSync 1 /
  uncoveredHandoff 1 / unresolvedContract 1 / addedObserved 1; event log
  unchanged; `artifacts validate` clean.

## INTENTIONALLY UNTOUCHED

`StepCapabilityGraph` / `HandoffContract` / `HandoffCoverageReport` /
`RuntimeGraphObservationReport` and their builders/CLI; `PathFreshnessReport`;
every other existing artifact type/schema/CLI; the lifecycle /
`CoherencyDelta` line; `WorkOrder` / `VerificationPlan` (not created); intent
implementation; all version numbers; classic codebase-intel (not imported);
`pnpm-lock.yaml`.

## RISKS / FOLLOW-UP

- v1 leans on `HandoffCoverageReport` statuses for the declared-vs-observed
  handoff axis; richer step-edge topology drift (using `StepCapabilityGraph`
  expected edges directly) can deepen later without changing the artifact
  type. The `step-edge` kind is reserved but rarely emitted in v1.
- Observed-vs-coverage `added-observed` dedupe is by slugged `handoff:from:to`
  edge id; distinct raw ids slugging identically would merge (operator
  context only).
- The `observation-missing` vs `not-evaluated` distinction is implemented
  precisely so absent inputs never read as confirmed drift.

## NEXT STEP

RuntimeGraphDriftReport safety review — review the drift artifact, then
decide whether the classic step/handoff/runtime-drift spine is complete
enough to unblock intent work. Still no `WorkOrder` / `VerificationPlan`, no
intent implementation.
