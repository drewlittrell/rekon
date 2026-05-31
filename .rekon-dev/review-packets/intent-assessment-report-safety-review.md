# Review Packet — IntentAssessmentReport Safety Review

Slice 79 on the capability-ontology track. Strategy / safety-review batch.
Read-only end-to-end review of the `IntentAssessmentReport` v1 implementation
shipped at `f385b4e`. This review gates whether the assessment layer is
safe/stable before `PreparedIntentPlan` work begins. No runtime behavior
changes.

## CHANGES MADE

- New strategy memo
  `docs/strategy/intent-assessment-report-safety-review.md` (16 headings +
  surface / readiness / boundary / option tables).
- New 17-assertion docs test
  `tests/docs/intent-assessment-report-safety-review.test.mjs`.
- Cross-reference updates to the IntentAssessmentReport v1 decision, the
  integration review, the RuntimeGraphDriftReport safety review, the
  intent-assessment-report + intent-assessment + runtime-graph-drift-report +
  path-freshness-report + work-order + verification-plan + verification-run +
  verification-result docs, the agent-operating-contract +
  remediation-work-orders concepts, both roadmaps, README, and CHANGELOG.
- This review packet.

## PUBLIC API CHANGES

None. Docs-only batch. No `packages/` source, artifact type, CLI command,
validator, factory, or schema changed.

## PURPOSE PRESERVATION CHECK

- **Original problem.** `IntentAssessmentReport` is Rekon's first intent
  artifact; it assesses readiness before preparation and sits close to
  WorkOrder / VerificationPlan / execution language. Because of that
  proximity, Rekon must verify v1 stays a bounded read-only assessment before
  building `PreparedIntentPlan`.
- **Guarantee preserved.** `IntentAssessmentReport` is assessment only — not
  WorkOrder, not PreparedIntentPlan, not IntentStatusReport, not
  VerificationResult, not intent:go. It consumes `RuntimeGraphDriftReport` (and
  the rest of the spine) as readiness context without becoming the graph spine
  itself, and it recommends a next action without creating tasks, proof plans,
  command runs, or source writes. The review confirms each boundary is intact
  in the shipped code and clears the assessment layer.

## CODEBASE-INTEL ALIGNMENT

Uses the integration review's recorded classic-source finding: classic intent
readiness was gate-based plus hash/staleness-based and did not consume the
step/handoff/runtime-drift spine. Rekon extends parity by wiring graph-spine
readiness into `IntentAssessmentReport` — recorded honestly as a Rekon-native
extension, not literal classic behavior. Nothing from classic codebase-intel is
imported.

## ARTIFACT / CLI REVIEWED

`IntentAssessmentReport` { header, request, source(14 optional refs),
readiness(status, score?, recommendedNextAction), matchedContext(systems,
capabilities, steps, paths), blockers[], warnings[], missingContext[] },
category `actions`. Factory normalizes the request, dedupes + sorts each entry
list by (severity, category, id), sorts matched-context arrays, asserts;
validator enforces enums, unique ids per list, non-empty fields, ref validity.
Helper `buildIntentAssessmentReport` consumes structural `Like` views + refs,
reads no files, runs nothing, writes nothing. CLI `rekon intent assess` writes
one report under `actions/` and prints the boundary statement.

## REQUEST / SCOPE REVIEW

`--goal` required (missing → non-zero exit); `--kind` defaults to / falls back
to `unknown`; scope + constraint + non-goal flags accept repeats and
comma-separated values, trimmed, advisory only. No execution / source-write
directive in the request. Safe.

## READINESS MODEL REVIEW

Precedence stale-context > blocked > insufficient-context > needs-review >
ready-for-prepare is safe: stale or high-severity blockers always dominate, an
unmappable request degrades to insufficient-context, and `recommendedNextAction`
is a strict 1:1 map so the report never recommends preparing work it judged
unsafe. `run-verification` reserved/unemitted.

## BLOCKER MODEL REVIEW

Eight categories sufficient for v1. Missing required spine / high drift /
unresolved-contract / failed proof / scope-relevant staleness → blockers;
uncovered / parse-errors / missing optional / partial proof → warnings;
`source-write-unavailable` reserved/unemitted until a source-write policy
exists. Deterministic ordering factory-enforced.

## MATCHED CONTEXT REVIEW

Built from request scope, augmented deterministically by StepCapabilityGraph
(systems + paths for matched steps) and CapabilityMap (systems for matched
capabilities), deduped + sorted. Empty match → insufficient-context +
scope-ambiguous. No LLM; deterministic enough for v1.

## RUNTIME DRIFT DEPENDENCY REVIEW

`RuntimeGraphDriftReport` is consumed strictly as a readiness input: rows →
blockers/warnings, no re-evaluation, no raw event parsing, no mutation of the
drift report or `PathFreshnessReport`. It does not become the graph spine
itself.

## WORKORDER / VERIFICATIONPLAN BOUNDARY

The CLI writes exactly one `IntentAssessmentReport` under `actions/`; the
implementation-batch smoke confirmed `WorkOrder` / `VerificationPlan` /
`VerificationRun` all absent after `intent assess`. `WorkOrder` is prior
context only; `VerificationResult` / `VerificationRun` / `VerificationPlan` are
proof refs only.

## COMMAND / SOURCE-WRITE BOUNDARY

The helper has no `child_process` / `spawnSync` / `execSync` / filesystem-write
call; the CLI's only write is the report artifact. The smoke confirmed a source
file unchanged byte-for-byte after `intent assess` and `artifacts validate`
clean. No `VerificationRun` / `VerificationResult` created.

## INTENT BOUNDARY

PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go
remain deferred. v1 prepares no phases, reports no lifecycle status, and gates
no execution.

## RECOMMENDATION

`IntentAssessmentReport` v1 is safe/stable as read-only readiness assessment
(no blocker). Proceed to the **PreparedIntentPlan v1 decision**. Operator /
publication surfacing of the assessment is deferred (the CLI already exposes
assessment state).

## TESTS / VERIFICATION

- New docs test (17 assertions): headings, the nine boundary statements, all
  four tables, CHANGELOG mention, and this packet.
- Full gate: `npm run typecheck`, `npm run test`, `npm run build`,
  `git diff --check`, `node scripts/audit-package-exports.mjs`, `node
  scripts/audit-license.mjs`, `node scripts/publish-dry-run.mjs`, `node
  scripts/install-smoke.mjs`, `node scripts/install-tarball-smoke.mjs`. No CLI
  smoke (strategy-only).

## INTENTIONALLY UNTOUCHED

All `packages/` source; the `IntentAssessmentReport` artifact type, schema,
validator, factory, helper, and CLI command; the graph spine
(`StepCapabilityGraph` / `HandoffContract` / `HandoffCoverageReport` /
`RuntimeGraphObservationReport` / `RuntimeGraphDriftReport`); `WorkOrder` /
`VerificationPlan` / `VerificationRun` / `VerificationResult` /
`PathFreshnessReport`; `PreparedIntentPlan` / `IntentStatusReport` /
`IntentGoDecision` (deferred); all version numbers; classic codebase-intel (not
imported); `pnpm-lock.yaml`.

## RISKS / FOLLOW-UP

- `source-write-unavailable` blocker category and the `run-verification`
  next-action are reserved (unemitted in v1); they activate when a source-write
  / execution policy is decided.
- The PathFreshnessReport scope-relevance heuristic is path-prefix based
  (conservative); richer relevance scoring can follow.
- Matched-context augmentation is deterministic and light (no LLM); deeper
  scope resolution can deepen without changing the artifact type.

## NEXT STEP

PreparedIntentPlan v1 decision — decide how an assessed intent becomes prepared
phases, constraints, gates, touched paths, and capability / step / handoff
obligations plus verification requirements. Still no `PreparedIntentPlan`
implementation, no `WorkOrder` / `VerificationPlan` creation, no command
execution, and no source writes.
