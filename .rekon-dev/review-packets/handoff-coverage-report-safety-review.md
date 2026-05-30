# Review Packet — HandoffCoverageReport Safety Review

Slice 69 on the capability-ontology track. Strategy / safety-review batch.
Read-only review of the `HandoffCoverageReport` v1 implementation shipped
at `8e0a617`.

## CHANGES MADE

- New strategy memo
  `docs/strategy/handoff-coverage-report-safety-review.md` (16 headings +
  4 tables: surface / matching / boundary / option).
- New 17-assertion docs test
  `tests/docs/handoff-coverage-report-safety-review.test.mjs`.
- Cross-reference updates to the HandoffCoverageReport v1 decision, the
  HandoffContract safety review + v1 decision, the architecture decision,
  the parity audit, the handoff-coverage-report artifact + concept docs,
  the handoff-contract artifact + concept docs, the step-capability-graph
  artifact + concept docs, `work-order.md`, `verification-plan.md`,
  `agent-operating-contract.md`, `remediation-work-orders.md`, both
  roadmaps, README, and CHANGELOG.
- This review packet.

## PUBLIC API CHANGES

None. Docs-only batch. No `packages/` source, artifact type, CLI command,
validator, factory, parser, or schema changed.

## PURPOSE PRESERVATION CHECK

- **Original problem.** `HandoffContract` declares expected baton policy;
  `HandoffCoverageReport` is the first narrow observed-event comparison
  layer. It must prove declared handoffs were observed through
  `handoff_event` rows without pretending to be a full runtime graph, a
  runtime drift system, a `VerificationRun` proof, a `WorkOrder`
  generator, or an intent gate.
- **Guarantee preserved.** `HandoffCoverageReport` is handoff-event
  coverage only: missing observation stays `not-evaluated` (not a false
  failure); present observation without a match becomes `uncovered`;
  unmatched observed events become `added-observed`; parse errors are
  visible but non-fatal. Runtime graph observation and drift remain
  deferred. The review confirms each boundary is intact in the shipped
  code.

## CODEBASE-INTEL ALIGNMENT

References the parity audit's classic findings (declared `handoffs[]`
compared to observed `handoff_event` evidence → intact / broken / added)
rather than re-auditing classic source, and imports nothing from classic
codebase-intel. The v1 implementation re-homes classic coverage into
Rekon's artifact-first spine as a narrow event-log comparison; the
generalized runtime-graph observation explicitly remains the next layer.

## ARTIFACT / CLI REVIEWED

`HandoffCoverageReport` { header, source(handoffContractRef, eventLogPath?,
eventLogHash?), summary(totalDeclared, covered, uncovered,
unresolvedContract, addedObserved, notEvaluated, parseErrors), rows[] }.
Factory recomputes the six status counts + `totalDeclared`, sorts contract
rows before `added-observed`, and asserts; validator enforces per-status
`observedCount` invariants and re-derives the summary (trusting only
`parseErrors`). Helper `buildHandoffCoverageReport` reads no files; parser
`parseHandoffEventLog` is pure over a string. CLI `rekon handoff coverage
report [--root] [--json] [--handoff-contract] [--event-log]` reads
latest/pinned contract + optional log, writes one report under `actions/`,
prints the boundary statement.

## EVENT INPUT REVIEW

`.rekon/handoff-events.jsonl` is optional, raw, never mutated (read +
sha256 only). Only `kind === "handoff_event"` lines become observed
events; other valid JSON rows are ignored. The builder reads no files (CLI
injects content + hash); `observedEventRefs` cite lines, not payloads.

## MATCHING POLICY REVIEW

Single method per handoff by priority — event name → feature → step pair;
never title/prose. Multiple matches → `covered` with `observedCount > 1`.
Consumed events never re-emitted as `added-observed`. Deterministic:
identical inputs → identical report (factory + validator enforced).

## MISSING LOG / UNCOVERED BOUNDARY REVIEW

Missing log → `not-evaluated` (no `eventLogPath` / hash recorded); present
log without a match → `uncovered`. Absence of observation is never
reported as observed absence — no false coverage failure. Implemented
correctly.

## PARSE ERROR REVIEW

Invalid JSONL lines increment `parseErrors` and continue; one bad line
never discards the rest of the signal. `parseErrors` is surfaced in the
summary, type-checked but trusted (not recomputable from rows). Corrupt or
partial logs degrade gracefully to a valid report with a visible count.

## ADDED OBSERVED REVIEW

Unmatched observed `handoff_event` → `added-observed` (`observedCount > 0`,
cites the log line). Honest precursor to drift without inferring a runtime
graph. Row ids `added-observed:<line>` are unique per line; contract-id
collision is astronomically unlikely and operator-controlled.

## RUNTIME GRAPH BOUNDARY REVIEW

No `RuntimeGraphObservationReport` built or written; no expected-vs-observed
graph drift. Reads a raw single-shape event log, not a generalized runtime
graph. `RuntimeGraphObservationReport` is the next layer;
`RuntimeGraphDriftReport` is deferred.

## WORKORDER / VERIFICATIONPLAN BOUNDARY

The CLI writes exactly one `HandoffCoverageReport` under `actions/` and
creates no `WorkOrder` / `VerificationPlan`. Coverage is not
`VerificationRun` command success.

## INTENT BOUNDARY

Deferred. v1 runs no intent phase and gates nothing; the shape supports a
future `intent:status` / `intent:go` once runtime layers exist.

## RECOMMENDATION

`HandoffCoverageReport` v1 is safe/stable as narrow handoff-event coverage
(no blocker). Proceed to the **RuntimeGraphObservationReport architecture /
v1 decision**. Alternative if caution is preferred: a
`HandoffCoverageReport` publication surfacing decision — but the default is
the observation-layer decision because the narrow coverage layer is now
implemented.

## TESTS / VERIFICATION

- New docs test (17 assertions): headings, the nine boundary statements,
  all four tables, CHANGELOG mention, and this packet.
- Full gate: `npm run typecheck`, `npm run test`, `npm run build`,
  `git diff --check`, `node scripts/audit-package-exports.mjs`, `node
  scripts/audit-license.mjs`, `node scripts/publish-dry-run.mjs`, `node
  scripts/install-smoke.mjs`, `node scripts/install-tarball-smoke.mjs`.
  No CLI smoke (strategy-only).

## INTENTIONALLY UNTOUCHED

All `packages/` source; every existing artifact type, schema, validator,
factory, parser, and CLI command; `HandoffCoverageReport` /
`HandoffContract` / `StepCapabilityGraph`; `RuntimeGraphObservationReport`
and later spine layers; the lifecycle / `CoherencyDelta` line; intent
implementation; all version numbers; classic codebase-intel (not
imported); `pnpm-lock.yaml`.

## RISKS / FOLLOW-UP

- `added-observed` row id collision with a contract id is theoretically
  possible (operator-controlled) but astronomically unlikely.
- `parseErrors` is trusted by the validator (not recomputable from rows);
  acceptable since it is observed during parsing.
- The raw event log is a narrow input; generalizing to
  `RuntimeGraphObservationReport` is a later, separately-decided slice.

## NEXT STEP

RuntimeGraphObservationReport architecture / v1 decision — decide how raw
`handoff_event` logs (and possibly other future runtime traces) become a
generalized runtime graph observation artifact. Still no
`RuntimeGraphObservationReport` implementation, no `RuntimeGraphDriftReport`,
no `WorkOrder` / `VerificationPlan`, no intent implementation.
