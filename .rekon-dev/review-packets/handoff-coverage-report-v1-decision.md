# Review Packet — HandoffCoverageReport v1 Decision

Slice 67 on the capability-ontology track. Strategy / architecture
decision batch. Builds on the HandoffContract safety review at
`32fbbb4`.

## CHANGES MADE

- New strategy memo
  `docs/strategy/handoff-coverage-report-v1-decision.md` (13 headings +
  4 tables: option / input / status / boundary; Options A–E; event +
  artifact sketches; v1 coverage policy).
- New 17-assertion docs test
  `tests/docs/handoff-coverage-report-v1-decision.test.mjs`.
- Cross-reference updates to the HandoffContract safety review + v1
  decision, the architecture decision, the parity audit, the
  handoff-contract artifact + concept docs, the step-capability-graph
  artifact + concept docs, `work-order.md`, `verification-plan.md`,
  `agent-operating-contract.md`, `remediation-work-orders.md`, both
  roadmaps, README, and CHANGELOG.
- This review packet.

## PUBLIC API CHANGES

None. Docs-only batch. No `packages/` source, artifact type, CLI
command, validator, or schema changed.

## PURPOSE PRESERVATION CHECK

- **Original problem.** `HandoffContract` declares expected baton passes;
  classic codebase-intel compared declared handoff contracts against
  observed handoff events. Rekon needs a coverage layer comparing declared
  expected handoffs with observed handoff-event evidence — distinct from
  `VerificationRun` command success, `RuntimeGraphDriftReport`, and intent
  readiness.
- **Guarantee preserved.** `HandoffCoverageReport` is declared-vs-observed
  handoff coverage; it consumes `HandoffContract` and may consume raw
  handoff event logs in v1; it does not become
  `RuntimeGraphObservationReport`, performs no runtime graph drift
  detection, and creates no `WorkOrder` / `VerificationPlan`. The decision
  keeps each spine boundary intact and defers runtime observation, drift,
  and intent.

## CODEBASE-INTEL ALIGNMENT

References the parity audit's classic findings (declared `handoffs[]`
compared to evidence → intact/broken/added/removed) rather than
re-auditing classic source, and imports nothing from classic
codebase-intel. The v1 model re-homes classic coverage into Rekon's
artifact-first spine: a narrow handoff-event log compared to the declared
`HandoffContract`, with the generalized runtime-graph observation
explicitly deferred.

## OPTIONS CONSIDERED

A (defer until RuntimeGraphObservationReport) — rejected/deferred (narrow
coverage can ship first). B (HandoffContract + raw event log) —
**selected** (classic coverage without a full runtime graph). C
(HandoffContract only) — rejected (coverage requires observation). D
(VerificationRun as coverage) — rejected (command proof ≠ event
coverage). E (start with RuntimeGraphDriftReport) — rejected (drift needs
coverage/observation first).

## EVENT INPUT MODEL

`.rekon/handoff-events.jsonl` (optional; `logs/handoff-events.jsonl`
deferred). One JSON object per line (kind `handoff_event`, name, feature,
fromStepId, toStepId, timestamp, payloadType, source). Matching: event
name → feature → step pair; never by title/prose. Multiple matches →
`covered` with `observedCount > 1`. Invalid lines → `parseErrors`
(non-fatal). Missing log → `not-evaluated`; present log without match →
`uncovered`.

## ARTIFACT MODEL

`HandoffCoverageReport` { header, source(handoffContractRef, eventLogPath?,
eventLogHash?), summary(totalDeclared, covered, uncovered,
unresolvedContract, addedObserved, notEvaluated, parseErrors), rows[] }.
Each row: id, handoffId?, status, matchMethod, feature?, eventName?,
fromStepId?, toStepId?, observedCount, observedEventRefs? (line +
timestamp + source), messages?. `observedEventRefs` cite the log by line,
not by copying payloads.

## V1 COVERAGE POLICY

Read latest/pinned `HandoffContract` + optional event log. No log →
`not-evaluated`. With log: parse JSONL; match by name → feature → step
pair; declared+match → `covered`; declared+no-match → `uncovered`;
`unresolved-step` contract rows → `unresolved-contract`; observed event
without a declared match → `added-observed`; invalid lines → parseErrors.

## BOUNDARY MODEL

HandoffCoverageReport vs HandoffContract (observed coverage vs declared
policy); vs VerificationRun (event coverage vs command success); vs
RuntimeGraphObservationReport (narrow coverage vs full runtime graph); vs
RuntimeGraphDriftReport (no drift); vs WorkOrder / VerificationPlan (no
task/proof creation); vs intent (prerequisite only).

## FOLLOW-ON ARTIFACTS

`RuntimeGraphObservationReport` generalizes the observed handoff-event log
into a runtime graph; `RuntimeGraphDriftReport` compares declared/expected
vs observed; `intent:status` reports coverage; `intent:go` may gate on
uncovered / unresolved handoffs.

## INTENT IMPACT

Deferred. The v1 shape supports a future `intent:status` / `intent:go`
once runtime layers exist; `HandoffCoverageReport` v1 gates nothing.

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
factory, and CLI command; `HandoffContract` / `StepCapabilityGraph`;
`RuntimeGraphObservationReport` and later spine layers; the lifecycle /
`CoherencyDelta` line; intent implementation; all version numbers;
classic codebase-intel (not imported).

## RISKS / FOLLOW-UP

- The artifact + event shapes are sketched here and finalized at
  implementation time (e.g. id derivation; `added-observed` row ids;
  multi-match dedupe).
- The `not-evaluated` vs `uncovered` distinction (missing log vs present
  log without match) must be implemented precisely to avoid false
  coverage signals.
- The raw event log is a narrow input; generalizing to
  `RuntimeGraphObservationReport` is a later, separately-decided slice.

## NEXT STEP

HandoffCoverageReport v1 implementation (register the artifact type +
read-only generator from `HandoffContract` + optional
`.rekon/handoff-events.jsonl`).
