# Review Packet — HandoffCoverageReport v1 Implementation

Slice 68 on the capability-ontology track. Product-capability batch.
Implements the artifact selected by the HandoffCoverageReport v1 Decision
at `fc503eb`.

## CHANGES MADE

- **`@rekon/kernel-repo-model`**: `HandoffCoverageReport` type family
  (`HandoffCoverageStatus`, `HandoffCoverageMatchMethod`,
  `HandoffCoverageObservedEventRef`, `HandoffCoverageRow`,
  `HandoffCoverageReportSource`, `HandoffCoverageReportSummary`,
  `HandoffCoverageReport`) + `createHandoffCoverageReport` factory +
  `validateHandoffCoverageReport` / `assertHandoffCoverageReport` +
  `handoffCoverageReportSchema`.
- **`@rekon/sdk`**: registered `HandoffCoverageReport` in
  `KNOWN_ARTIFACT_TYPES`.
- **`@rekon/runtime`**: mapped `HandoffCoverageReport` → `actions` in
  `ARTIFACT_CATEGORY_BY_TYPE`.
- **`@rekon/capability-model`**: `parseHandoffEventLog` +
  `buildHandoffCoverageReport` helper (`handoff-coverage-report.ts`) +
  exports.
- **`@rekon/cli`**: `rekon handoff coverage report [--root] [--json]
  [--handoff-contract <ref>] [--event-log <path>]`.
- Docs: 2 new (`docs/artifacts/handoff-coverage-report.md`,
  `docs/concepts/handoff-coverage.md`) + 15 cross-ref updates + CHANGELOG +
  README.
- Tests: `tests/contract/handoff-coverage-report.test.mjs` (25) +
  `tests/docs/handoff-coverage-report.test.mjs` (13). This review packet.

## PUBLIC API CHANGES

- New artifact type `HandoffCoverageReport` (category `actions`, schema
  `0.1.0`, stability `experimental`).
- New `@rekon/kernel-repo-model` exports (types + factory + validator +
  assert + schema, listed above).
- New `@rekon/capability-model` exports: `buildHandoffCoverageReport`,
  `parseHandoffEventLog`, `HANDOFF_COVERAGE_REPORT_ARTIFACT_ID_PREFIX`,
  `HANDOFF_EVENT_LOG_PATH`, `HANDOFF_EVENT_KIND`, and supporting types.
- New CLI command `rekon handoff coverage report`. All additive; no
  existing surface changed; no version bump.

## PURPOSE PRESERVATION CHECK

- **Original problem.** `HandoffContract` declares expected baton policy;
  classic codebase-intel compared declared handoffs against observed
  `handoff_event` logs to produce coverage. Rekon needs that same narrow
  event-coverage layer before generalized runtime observation and drift,
  without overclaiming a full runtime graph.
- **Guarantee preserved.** `HandoffCoverageReport` v1 is handoff-event
  coverage only: it compares declared contract rows to observed raw
  handoff events. A **missing** log means `not-evaluated` (not
  `uncovered`); a **present** log with no match means `uncovered`;
  unmatched observed events become `added-observed`; invalid lines are
  counted as `parseErrors`, never fatal. It is not `VerificationRun`
  command success, creates no `RuntimeGraphObservationReport` /
  `RuntimeGraphDriftReport` / `WorkOrder` / `VerificationPlan`, detects no
  drift, implements no intent, and mutates nothing.

## CODEBASE-INTEL ALIGNMENT

Re-homes classic handoff coverage (declared `handoffs[]` compared to
observed `handoff_event` evidence → intact/broken/added) into Rekon's
artifact-first spine as a narrow event-log comparison over the declared
`HandoffContract`. Imports nothing from classic codebase-intel; the
generalized runtime-graph observation/drift remains explicitly deferred.

## ARTIFACT MODEL

`HandoffCoverageReport` { header, source(handoffContractRef, eventLogPath?,
eventLogHash?), summary(totalDeclared, covered, uncovered,
unresolvedContract, addedObserved, notEvaluated, parseErrors), rows[] }.
Each row: id, handoffId?, status, matchMethod, feature?, eventName?,
fromStepId?, toStepId?, observedCount, observedEventRefs? (line +
timestamp? + source?), messages?. The factory recomputes the six status
counts + `totalDeclared` and trusts (type-checks) `parseErrors`; the
validator enforces per-status `observedCount` invariants (covered /
added-observed `> 0`; uncovered / unresolved-contract / not-evaluated
`=== 0`) and deterministic ordering (contract rows by id, then
added-observed by line/id).

## EVENT INPUT MODEL

Optional `.rekon/handoff-events.jsonl`; one JSON object per line. Only
lines with `kind === "handoff_event"` are observed events (name, feature,
fromStepId, toStepId, timestamp, source); other valid JSON rows are
ignored. Invalid JSON lines increment `parseErrors` and never abort.
Missing log → `not-evaluated`. The builder reads no files; the CLI reads
the optional log and passes content + sha256 hash into the builder, which
mutates nothing.

## MATCHING POLICY

Per declared handoff: `unresolved-step` contract rows → `unresolved-contract`;
otherwise match observed events by `event.name` (when present), else by
`feature` (when present), else by `fromStepId` + `toStepId` — never by
title/prose. A match → `covered` (`observedCount` = match count,
`observedEventRefs` cite log lines); no match (present log) → `uncovered`.
Observed events consumed by a declared match are never also
`added-observed`; unmatched observed events become `added-observed`.

## CLI SURFACE

`rekon handoff coverage report [--root <path>] [--json]
[--handoff-contract <HandoffContract:id|type:id>] [--event-log <path>]`.
Reads the latest (or pinned) `HandoffContract` + optional event log
(default `.rekon/handoff-events.jsonl`, or explicit `--event-log`), writes
one `HandoffCoverageReport` under `actions/`, and prints the summary plus:
"No RuntimeGraphObservationReport, RuntimeGraphDriftReport, WorkOrder, or
VerificationPlan artifacts were created."

## BOUNDARY MODEL

HandoffCoverageReport vs HandoffContract (observed coverage over declared
policy); vs VerificationRun (event coverage, not command success); vs
RuntimeGraphObservationReport (narrow raw-log coverage, not a full runtime
graph); vs RuntimeGraphDriftReport (no drift); vs WorkOrder /
VerificationPlan (no task/proof creation); vs intent (prerequisite only).

## TESTS / VERIFICATION

- Contract test (25): validation; missing-log `not-evaluated` (and not
  `uncovered`); match by name / feature / step-pair; multi-match
  `observedCount`; present-no-match `uncovered`; `unresolved-contract`;
  `added-observed`; non-`handoff_event` ignored; invalid-line
  `parseErrors` (non-fatal); consumed-not-re-added; summary counts;
  deterministic ordering; CLI write + pinned contract + explicit
  `--event-log` + no-mutation + no observation/drift/WorkOrder/
  VerificationPlan + `artifacts validate` clean.
- Docs test (13): both docs exist; nine boundary statements; CHANGELOG
  mention; this packet.
- Full gate: `npm run typecheck`, `npm run test`, `npm run build`,
  `git diff --check`, `node scripts/audit-package-exports.mjs`,
  `node scripts/audit-license.mjs`, `node scripts/publish-dry-run.mjs`,
  `node scripts/install-smoke.mjs`, `node scripts/install-tarball-smoke.mjs`.
- CLI smoke: full chain ending in `handoff coverage report` →
  covered 1 / uncovered 1 / unresolvedContract 1 / addedObserved 1 /
  parseErrors 1; event log unchanged; `artifacts validate` clean.

## INTENTIONALLY UNTOUCHED

`HandoffContract` / `StepCapabilityGraph` and their builders/CLI; every
other existing artifact type/schema/validator/CLI; the lifecycle /
`CoherencyDelta` line; `RuntimeGraphObservationReport` /
`RuntimeGraphDriftReport` (not implemented); `WorkOrder` /
`VerificationPlan` (not created); intent implementation; all version
numbers; classic codebase-intel (not imported); `pnpm-lock.yaml`.

## RISKS / FOLLOW-UP

- `added-observed` row ids encode the event log line (`added-observed:<line>`);
  a contract handoff id colliding with that prefix is astronomically
  unlikely but operator-controlled.
- `parseErrors` is observed during parsing and type-checked but not
  recomputable from rows, so it is trusted by the validator.
- The raw event log is a narrow input; generalizing to
  `RuntimeGraphObservationReport` is a later, separately-decided slice.

## NEXT STEP

HandoffCoverageReport safety review — review the coverage artifact before
the `RuntimeGraphObservationReport` v1 decision. Still no
`RuntimeGraphObservationReport`, no `RuntimeGraphDriftReport`, no
`WorkOrder` / `VerificationPlan`, no intent implementation.
