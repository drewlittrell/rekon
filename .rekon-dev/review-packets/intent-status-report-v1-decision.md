# Review Packet — IntentStatusReport v1 Decision

Eighty-fifth slice on the capability-ontology track. Strategy / architecture
decision batch pinning the IntentStatusReport v1 artifact shape, inputs, status
model, proof rollup, staleness model, and implementation sequence. Follows the
PreparedIntentPlan Safety Review at `31abba4`. No artifact is implemented.

## CHANGES MADE

- New `docs/strategy/intent-status-report-v1-decision.md` (14 sections +
  option / input / status / boundary tables): Decision Summary, Why This
  Decision Exists, Current Boundary, Options Considered, Recommendation, Input
  Model, Status Model, Proof Rollup Model, Blocker / Warning Model, Boundary
  Model, Follow-On Artifacts, What This Does Not Do, Implementation Sequence.
- New `tests/docs/intent-status-report-v1-decision.test.mjs` (17 assertions).
- This review packet.
- Cross-reference updates to the intent + work + proof + spine docs, roadmaps,
  README, and CHANGELOG.

## PUBLIC API CHANGES

None. No types, helpers, CLI commands, schemas, or artifacts changed. This is a
decision/documentation-only batch.

## PURPOSE PRESERVATION CHECK

IntentAssessmentReport answers whether intent can be prepared; PreparedIntentPlan
answers whether a proof-approved phase/gate plan exists. Rekon now needs a status
layer that reports the current intent state across assessment, preparation, work
guidance, verification, freshness, and runtime drift — without becoming
verification, execution, remediation, or source-write behavior. This decision
preserves that guarantee: IntentStatusReport is status reporting (not
VerificationResult), is not WorkOrder, consumes existing artifacts read-only,
reports assessed / prepared / blocked / stale / verified / failed / complete
states, creates no WorkOrder or VerificationPlan, executes no commands, writes no
source, and leaves intent:go deferred.

## CODEBASE-INTEL ALIGNMENT

Classic intent surfaces reported a rollup state derived from many inputs
(assessment readiness, plan/authorization, proof outcomes, freshness). Grounded
by the integration review's recorded classic findings, this decision re-homes
that rollup as a read-only Rekon artifact over the materialized spine rather than
a side effect of running work. No classic codebase-intel modules are imported.

## OPTIONS CONSIDERED

Selected Option B (artifact-backed status rollup). Rejected: Option A
(PreparedIntentPlan as status — preparation is one input), Option C
(VerificationResult as status — proof outcome is one input), Option D (WorkOrder
as status — work guidance is one input), Option E (intent:go first — execution
deferred).

## INPUT MODEL

IntentAssessmentReport, PreparedIntentPlan, WorkOrder, VerificationPlan,
VerificationRun, VerificationResult, PathFreshnessReport, and
RuntimeGraphDriftReport — each consumed when available; HandoffCoverageReport and
FindingReport / BridgeFindingLifecycleIntegrationReport as secondary warning
inputs. No input is required; absence is itself a status signal. All read by ref;
no raw source or event files; nothing mutated.

## STATUS MODEL

Overall status enum: not-assessed / assessed / assessment-blocked / prepared /
preparation-blocked / needs-review / stale / work-ready / work-in-progress /
verification-ready / verification-running / verification-passed /
verification-failed / complete / unknown, paired with a recommendedNextAction.
The 14-step v1 status policy derives the overall status from input presence +
each input's recorded state, with freshness stale overriding work/proof status
and high-severity runtime drift forcing needs-review / preparation-blocked. No
missing artifact is created.

## PROOF ROLLUP MODEL

`proof` mirrors each input's recorded state (assessment readiness + counts;
preparation status + approvalStatus + counts; work status; verification
plan/run/result presence + resultStatus; freshness present + stale; runtimeDrift
counts). It copies values, it does not re-derive proof. VerificationResult is an
input to status, not the status artifact itself; IntentStatusReport reports
PreparedIntentPlan approval state but does not approve plans.

## BLOCKER / WARNING MODEL

Shared `IntentStatusIssue` shape (id, category, severity, message, optional
sourceRefs). Categories: assessment-blocked, preparation-not-approved,
stale-context, runtime-drift, handoff-coverage, work-missing,
verification-plan-missing, verification-not-run, verification-failed,
missing-artifact, unknown-state. Blockers explain a non-advancing status;
warnings flag context to resolve. `staleInputs` / `missingInputs` record what was
absent.

## BOUNDARY MODEL

IntentStatusReport consumes assessment, reports preparation approval, reports
work without creating it, reports proof outcome, defers execution (intent:go),
and writes nothing. IntentStatusReport is status reporting, not
VerificationResult; it is not WorkOrder; it does not create WorkOrder or
VerificationPlan, execute commands, write source, or implement intent:go.

## TESTS / VERIFICATION

- `tests/docs/intent-status-report-v1-decision.test.mjs` — 17 assertions
  (headings, selected option, eight boundary statements, four tables, CHANGELOG,
  review packet).
- Full 9-command gate: typecheck, test, build, `git diff --check`,
  audit-package-exports, audit-license, publish-dry-run, install-smoke,
  install-tarball-smoke. No CLI smoke (strategy-only batch).

## INTENTIONALLY UNTOUCHED

No `IntentStatusReport` implementation, no artifact-type registration, no CLI
command, no `IntentGoDecision`, no WorkOrder / VerificationPlan / VerificationRun
/ VerificationResult creation, no command execution, no source writes, no
mutation of any input artifact, no classic codebase-intel imports, no version
bump, no npm publish, no branch.

## RISKS / FOLLOW-UP

- The status enum is broad (15 values); the implementation slice must keep the
  derivation deterministic and the precedence (stale > drift > proof > work >
  preparation > assessment) explicit and tested.
- Next: IntentStatusReport v1 implementation — register the artifact and
  implement the read-only status-rollup generator + `rekon intent status` CLI.

## NEXT STEP

Recommend **IntentStatusReport v1 implementation**: register `IntentStatusReport`
(category `actions`) and implement a read-only status-rollup generator from
IntentAssessmentReport, PreparedIntentPlan, WorkOrder, VerificationPlan,
VerificationRun, VerificationResult, PathFreshnessReport, and
RuntimeGraphDriftReport, plus a `rekon intent status` CLI. Still no WorkOrder /
VerificationPlan creation, no command execution, no source writes, no intent:go.
