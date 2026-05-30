# Review Packet — RuntimeGraphDriftReport Safety Review

Slice 75 on the capability-ontology track. Strategy / safety-review batch.
Read-only review of the `RuntimeGraphDriftReport` v1 implementation shipped
at `41be345`. This review gates whether the classic
step/handoff/runtime-drift spine is complete enough to unblock intent
architecture work.

## CHANGES MADE

- New strategy memo
  `docs/strategy/runtime-graph-drift-report-safety-review.md` (15 headings +
  4 tables: surface / status-mapping / boundary / option).
- New 16-assertion docs test
  `tests/docs/runtime-graph-drift-report-safety-review.test.mjs`.
- Cross-reference updates to the RuntimeGraphDriftReport v1 decision, the
  RuntimeGraphObservationReport safety review + v1 decision, the
  HandoffCoverageReport safety review, the architecture decision, the parity
  audit, the runtime-graph-drift + runtime-graph-observation +
  handoff-coverage + handoff-contract + step-capability-graph +
  path-freshness artifact + concept docs, `work-order.md`,
  `verification-plan.md`, `agent-operating-contract.md`,
  `remediation-work-orders.md`, both roadmaps, README, and CHANGELOG.
- This review packet.

## PUBLIC API CHANGES

None. Docs-only batch. No `packages/` source, artifact type, CLI command,
validator, factory, or schema changed.

## PURPOSE PRESERVATION CHECK

- **Original problem.** `RuntimeGraphDriftReport` is the final layer of the
  classic step/handoff/runtime-drift spine, comparing expected topology,
  declared baton policy, handoff coverage, and observed runtime graph.
  Because drift is close to actionability, intent gates, and remediation,
  Rekon must verify v1 remains read-only evaluation and does not imply
  `WorkOrder`, `VerificationPlan`, intent, or source-write behavior.
- **Guarantee preserved.** `RuntimeGraphDriftReport` is expected-vs-observed
  runtime graph drift; it consumes already-materialized artifacts; it
  duplicates no raw event parsing; it duplicates no coverage evaluation; it
  conflates drift with neither `PathFreshnessReport` nor artifact freshness;
  it creates no task/proof artifacts; intent remains deferred. The review
  confirms each boundary is intact in the shipped code and clears the spine
  to unblock intent architecture work.

## CODEBASE-INTEL ALIGNMENT

References the parity audit's classic findings (runtime graph drift over an
observed runtime-truth graph) rather than re-auditing classic source, and
imports nothing from classic codebase-intel. The v1 implementation re-homes
classic drift into Rekon's artifact-first spine as a comparison over the
four already-materialized graph artifacts; remediation and intent remain
downstream, separately-decided layers.

## ARTIFACT / CLI REVIEWED

`RuntimeGraphDriftReport` { header, source(stepCapabilityGraphRef?,
handoffContractRef?, handoffCoverageReportRef?,
runtimeGraphObservationReportRef? — no raw event-log path), summary(total,
inSync, missingExpected, addedObserved, uncoveredHandoff, unresolvedContract,
observationMissing, notEvaluated, bySeverity), rows[] }. Factory dedupes by
id, sorts by (kind, status, id), recomputes status buckets + total +
bySeverity, asserts; validator enforces enums, unique ids, non-empty fields,
ref validity, and re-derives the full summary. Helper consumes only values
(structural Like types) and reads no files. CLI `rekon runtime graph drift
[--root] [--json] [--step-graph] [--handoff-contract]
[--handoff-coverage-report] [--runtime-observation-report]` writes one report
under `actions/`, prints the boundary statement.

## INPUT BOUNDARY REVIEW

Four materialized artifacts, cited by ref; the builder reads values, never
files. `.rekon/handoff-events.jsonl` is never read; `PathFreshnessReport` and
artifact lineage freshness are not inputs; no coverage/observation generation
is triggered.

## DRIFT MODEL REVIEW

Coverage statuses map one-to-one (covered→in-sync, uncovered→uncovered-handoff,
unresolved-contract→unresolved-contract, added-observed→added-observed,
not-evaluated→not-evaluated). Observed handoff edges absent from contract +
not already covered → added-observed; declared no-coverage (observation
present) → missing-expected; observation absent/empty → observation-missing.
Added-observed dedupe by slugged edge id prevents double-reporting.
Deterministic (factory + validator enforced).

## OBSERVATION BOUNDARY REVIEW

Drift vs observation: observation absent/empty → observation-missing, never
false drift. The observation-missing vs not-evaluated distinction is precise.

## COVERAGE BOUNDARY REVIEW

Not HandoffCoverageReport; no re-parse of events, no re-run of coverage
matching, no override of a coverage verdict — one-to-one status mapping only.

## FRESHNESS BOUNDARY REVIEW

Not PathFreshnessReport or artifact lineage freshness; neither is read or
treated as drift input. Topology divergence and source/lineage currency stay
distinct axes.

## WORKORDER / VERIFICATIONPLAN BOUNDARY

The CLI writes exactly one `RuntimeGraphDriftReport` under `actions/` and
creates no `WorkOrder` / `VerificationPlan`. Severity buckets are an advisory
hint, not a remediation priority or execution-readiness gate.

## INTENT BOUNDARY

Deferred. v1 runs no intent phase and gates nothing; the shape supports a
future `intent:assess` / `intent:status` once those surfaces exist. This
review unblocks the intent *architecture* work.

## RECOMMENDATION

`RuntimeGraphDriftReport` v1 is safe/stable as expected-vs-observed runtime
graph drift (no blocker). The classic step/handoff/runtime-drift spine is
complete enough to unblock intent architecture work. Proceed to the **Intent
Capability Spine Integration Review**.

## TESTS / VERIFICATION

- New docs test (16 assertions): headings, the eight boundary/spine
  statements, all four tables, CHANGELOG mention, and this packet.
- Full gate: `npm run typecheck`, `npm run test`, `npm run build`,
  `git diff --check`, `node scripts/audit-package-exports.mjs`, `node
  scripts/audit-license.mjs`, `node scripts/publish-dry-run.mjs`, `node
  scripts/install-smoke.mjs`, `node scripts/install-tarball-smoke.mjs`.
  No CLI smoke (strategy-only).

## INTENTIONALLY UNTOUCHED

All `packages/` source; every existing artifact type, schema, validator,
factory, and CLI command; `RuntimeGraphDriftReport` /
`RuntimeGraphObservationReport` / `HandoffCoverageReport` / `HandoffContract`
/ `StepCapabilityGraph` / `PathFreshnessReport`; the lifecycle /
`CoherencyDelta` line; `WorkOrder` / `VerificationPlan` (not created); intent
implementation; all version numbers; classic codebase-intel (not imported);
`pnpm-lock.yaml`.

## RISKS / FOLLOW-UP

- v1 leans on `HandoffCoverageReport` statuses for the declared-vs-observed
  handoff axis; richer step-edge topology drift (using `StepCapabilityGraph`
  expected edges directly) can deepen later without changing the artifact
  type.
- Severity is advisory only; it must not be interpreted as remediation
  priority or an execution-readiness gate downstream.
- The added-observed dedupe is by slugged edge id; distinct raw ids slugging
  identically would merge (operator context only).

## NEXT STEP

Intent Capability Spine Integration Review — map the classic intent surfaces
onto Rekon now that the capability, policy, finding, step, handoff, coverage,
observation, and drift layers all exist, before rebuilding `intent:assess` /
`intent:prepare` / `intent:status`. Still no intent implementation, no
`WorkOrder` / `VerificationPlan` creation from drift, no source writes.
