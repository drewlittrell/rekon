# VerificationResult

## Purpose

`VerificationResult` records the operator-supplied outcomes of running
the commands listed in a `VerificationPlan`. It closes the artifact
loop from finding to proof:

```
Finding -> Lifecycle -> CoherencyDelta -> WorkOrder -> ReconciliationPlan
       -> VerificationPlan -> VerificationResult
```

Rekon does **not** execute verification commands in this alpha. The
result is operator-supplied evidence, validated and recorded as an
artifact with full provenance.

## Produced By

- `@rekon/capability-intent` via the helper
  `createVerificationResult(input)` and the CLI command
  `rekon verify record`.

## Consumed By

- humans and agents reviewing remediation proof
- `@rekon/capability-docs.architecture-summary` (built-in) surfaces
  the latest `VerificationResult` and overall proof-loop state in the
  [architecture summary publication](architecture-summary-publication.md).
  Failed and partial results are visible in the Verification Status
  and Proof Loop sections; the publisher does not execute commands.
  It now also renders a compact `## Verification Proof Status` block
  with `Source` (manual / runner-derived / unknown) and `Freshness`
  (fresh / stale / missing-plan / unknown).
- `@rekon/capability-docs.proof-report` (built-in) renders a focused
  proof readout in the
  [proof report publication](proof-report-publication.md) — proof
  status, per-command results (with stdout / stderr digest prefixes;
  never raw excerpts), failed / missing evidence, a `## Verification
  Proof Summary` section (source, status, freshness, recommended
  commands), and the next recommended action. The publisher does not
  execute commands.
- `@rekon/capability-docs.agent-contract` (built-in) surfaces
  `Proof source` and `Proof freshness` in `## Proof And Verification
  State` and adds Do Not Do entries against treating stale or failed
  proof as completion.
- `@rekon/capability-resolver`'s `resolve.issue` chains
  `findingId -> WorkOrder.remediationItems -> VerificationPlan
  -> VerificationResult` via `lookupVerificationEvidence` to attach
  `IssuePacket.verification` and add status-specific warnings. The
  evidence summary now carries `source` and `freshness` fields, and
  the verification trace message mentions the source + freshness in
  human-readable form.
- `rekon intent remediation --skip-verified` uses the same helper to
  exclude items whose chain resolves to `passed`.
- future verification-driven reconciliation or freshness gates

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`VerificationResult`. `inputRefs` must include the
`VerificationPlan` and the `WorkOrder` it covers (when available).

## Shape

```ts
type VerificationCommandStatus = "passed" | "failed" | "skipped" | "not-run";
type VerificationResultStatus = "passed" | "failed" | "partial" | "not-run";

type VerificationCommandResult = {
  command: string;
  status: VerificationCommandStatus;
  exitCode?: number;
  durationMs?: number;
  startedAt?: string;
  completedAt?: string;
  stdoutDigest?: string;
  stderrDigest?: string;
  notes?: string;
};

type VerificationResultSummary = {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  notRun: number;
};

type VerificationResult = {
  header: ArtifactHeader;
  verificationPlanRef: ArtifactRef;
  workOrderRef?: ArtifactRef;
  status: VerificationResultStatus;
  commandResults: VerificationCommandResult[];
  summary: VerificationResultSummary;
  evidenceNotes: string[];
  recordedBy?: string;
  recordedAt: string;
};
```

## Status Derivation

`createVerificationResult` derives the overall status:

- `passed` — every plan command has a `passed` submitted result, and
  no command result is `failed`.
- `failed` — any submitted result has status `failed`.
- `partial` — the plan has unrun commands or the submitted results
  contain `skipped`/`not-run` entries while none failed.
- `not-run` — no command results submitted, or every command result
  has status `not-run`.

Plan commands missing from the submitted results are recorded as
`not-run` entries (preserving the plan's command order). Submitted
commands not in the plan are appended after the plan-ordered list.

## Stdout / Stderr

Raw stdout / stderr is **not** stored by default. Operators can
supply `stdoutDigest` / `stderrDigest` (e.g., SHA-256 hex strings)
and `notes` for additional context. This keeps results small,
prevents accidental secret capture, and avoids unbounded artifacts.

## Example

```json
{
  "header": {
    "artifactType": "VerificationResult",
    "artifactId": "verification-result-...",
    "schemaVersion": "0.1.0",
    "generatedAt": "2026-05-14T13:00:00.000Z",
    "subject": { "repoId": "simple-js-ts" },
    "producer": { "id": "@rekon/capability-intent", "version": "0.1.0" },
    "inputRefs": [
      { "type": "VerificationPlan", "id": "verification-plan-...", "schemaVersion": "0.1.0" },
      { "type": "WorkOrder", "id": "work-order-...", "schemaVersion": "0.1.0" }
    ],
    "provenance": { "confidence": 0.9 }
  },
  "verificationPlanRef": { "type": "VerificationPlan", "id": "verification-plan-...", "schemaVersion": "0.1.0" },
  "workOrderRef": { "type": "WorkOrder", "id": "work-order-...", "schemaVersion": "0.1.0" },
  "status": "partial",
  "commandResults": [
    { "command": "npm run typecheck", "status": "passed", "exitCode": 0 },
    { "command": "npm run test", "status": "failed", "exitCode": 1, "notes": "regression in suite" },
    { "command": "npm run build", "status": "not-run" }
  ],
  "summary": { "total": 3, "passed": 1, "failed": 1, "skipped": 0, "notRun": 1 },
  "evidenceNotes": ["Captured locally after import refactor."],
  "recordedBy": "operator",
  "recordedAt": "2026-05-14T13:00:00.000Z"
}
```

(Note: the example shows `failed` for `npm run test`. With one
`failed` command, the overall `status` is `failed`. The example uses
`partial` to illustrate the shape — implementations will return
`failed` for this input.)

## Freshness And Provenance

`VerificationResult` lives under the `actions` category. Its
`inputRefs` cite the `VerificationPlan` and the `WorkOrder` (when
present). `rekon artifacts freshness` marks a result `stale` when a
newer `VerificationPlan` or `WorkOrder` is indexed. Re-record with
`rekon verify record` against the new plan.

## What This Is Not

- Not a command runner. The actuator does not execute the listed
  commands.
- Not a verification judge. Rekon stores the operator's claim; it
  does not score or grade the result.
- Not a CI integration. CI/GitHub check publishers are a separate
  phase.
- Not source modification. Recording a result does not change code.
- Not a place for raw stdout/stderr. Use digests and notes.

## Runner Direction

The
[verification runner v1 decision](../strategy/verification-runner-v1-decision.md)
preserves this artifact's shape and semantics.
`VerificationResult` continues to be the **proof
summary** consumed by publications and resolvers.

**Dry-run preview is shipped.**
`rekon verify run --plan <id> --dry-run`
(or `--preview`) writes a planned-but-not-run
`VerificationRun` artifact. It does **not** write
a `VerificationResult`.

**Opt-in execution is shipped.**
`rekon verify run --plan <id> --execute` runs
the plan with `spawn` + `shell: false` and
writes a `VerificationRun` with execution
detail. **It does not directly write a
`VerificationResult`** — the execute path
stops at the run.

**Derivation is shipped.**
`rekon verify result from-run --run
<id|type:id> [--allow-not-run]` converts a
completed `VerificationRun` into a concise
`VerificationResult` proof summary. The
derived result:

- Sets `recordedBy` to the runner identity
  (`"<run.runner.id>@<run.runner.version>"`,
  e.g. `"rekon.local.exec@0.1.0"`).
- Maps the run's command statuses to the
  result's four-value enum:
  `passed → passed`; `failed → failed`;
  **`timeout → failed`**; **`killed →
  failed`**; `skipped → skipped`;
  `not-run → not-run`. The run keeps
  `timeout` / `killed` first-class as
  evidence.
- Carries `stdoutDigest` / `stderrDigest` /
  `exitCode` / `durationMs` /
  `startedAt` / `completedAt` per command;
  **does NOT carry stdoutExcerpt /
  stderrExcerpt** (the run keeps those).
- Adds explanatory `notes` for
  `timeout` / `killed` / `skipped` /
  `not-run` cases plus a `Source: ...`
  pointer back at the source run.
- Cites the `VerificationPlan`, the
  `WorkOrder` (when present), and the
  `VerificationRun` in
  `header.inputRefs`.
- Sets `header.producer.id` to
  `"@rekon/capability-verify"` and
  `provenance.notes` flag it as
  runner-derived.

**Refusal:** the derivation refuses to
convert dry-run / not-run runs by default
("a dry-run is not proof"). The
`--allow-not-run` flag overrides.

**Auto-resolution / auto-apply:** derivation
does **not** touch `FindingStatusLedger`,
`FindingLifecycleReport`, `CoherencyDelta`,
or any reconciliation surface. A passing
derived result does not auto-resolve
findings. A contract test pins this.

A `VerificationResult` without a paired
`VerificationRun` means "manually recorded
via `rekon verify record`" — the existing
path is unchanged.

The new `timeout` / `killed` execution statuses
live on `VerificationRun`, not on
`VerificationCommandResult` — derivation maps
both to `failed` in the summary so the proof
result keeps its current four-value enum stable.

## Cross-References

- [VerificationPlan](verification-plan.md)
- [WorkOrder](work-order.md)
- [Remediation work orders concept](../concepts/remediation-work-orders.md)
- [Verification results concept](../concepts/verification-results.md)
- [Verification runner v1 decision](../strategy/verification-runner-v1-decision.md)
- [VerificationRun artifact](verification-run.md)
- [Verification runs concept](../concepts/verification-runs.md)
- [Capability model](../strategy/capability-model.md)

> See also: [Intent Capability Spine Integration Review](../strategy/intent-capability-spine-integration-review.md) — maps the classic intent surfaces (intent:assess / intent:prepare / intent:go / intent:status) onto the Rekon artifact spine: assess → IntentAssessmentReport, prepare → PreparedIntentPlan, status → IntentStatusReport, go deferred. Selects Option B (staged intent artifact spine); first target IntentAssessmentReport v1 decision. Classic intent did not consume the step/handoff/runtime-graph/drift spine; Rekon intent extends parity by wiring StepCapabilityGraph, HandoffContract, HandoffCoverageReport, RuntimeGraphObservationReport, and RuntimeGraphDriftReport into intent readiness. No intent implemented, no artifact registered, no CLI command, no source writes.

> See also: [IntentAssessmentReport v1 decision](../strategy/intent-assessment-report-v1-decision.md) — selects Option B: IntentAssessmentReport v1 as an artifact-backed readiness assessment generated from a user request plus existing Rekon context artifacts (CapabilityMap v2, StepCapabilityGraph, HandoffCoverageReport, RuntimeGraphDriftReport, PathFreshnessReport, VerificationResult when available). Readiness: ready-for-prepare / blocked / needs-review / insufficient-context / stale-context; blocker categories missing-artifact / stale-context / runtime-drift / handoff-coverage / finding-governance / proof-missing / scope-ambiguous / source-write-unavailable. IntentAssessmentReport is assessment, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred. RuntimeGraphDriftReport is an input to readiness, not the intent system itself. No artifact implemented or registered; no CLI; no source writes.

> See also: [IntentAssessmentReport artifact](intent-assessment-report.md) — the read-only readiness assessment of a user request against the Rekon context spine (CapabilityMap, StepCapabilityGraph, HandoffCoverageReport, RuntimeGraphDriftReport, PathFreshnessReport, VerificationResult), via `rekon intent assess`. Readiness: ready-for-prepare / blocked / needs-review / insufficient-context / stale-context. IntentAssessmentReport is assessment, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. RuntimeGraphDriftReport is an input to readiness, not the intent system itself. PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred.

> See also: [IntentAssessmentReport safety review](../strategy/intent-assessment-report-safety-review.md) — declares IntentAssessmentReport v1 safe / stable as read-only readiness assessment (no blocker): assessment, not WorkOrder; creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult; executes no commands; writes no source; RuntimeGraphDriftReport is an input to readiness, not the intent system itself; PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred. Recommended next slice: PreparedIntentPlan v1 decision.

> See also: [PreparedIntentPlan v1 decision](../strategy/prepared-intent-plan-v1-decision.md) — selects Option B: PreparedIntentPlan v1 as an artifact-backed phase/gate preparation artifact generated from IntentAssessmentReport plus existing Rekon context. Prepared status: prepared / blocked / needs-review / stale-assessment / insufficient-assessment; phases investigate / modify / refactor / verify / review; obligation categories capability-preservation / step-preservation / handoff-preservation / runtime-drift / finding-governance / freshness / verification / source-write-boundary. PreparedIntentPlan is phase/gate preparation, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. Verification requirements are not VerificationPlan. IntentStatusReport is the next layer; intent:go deferred; source-write behavior remains unavailable.

> See also: [PreparedIntentPlan artifact](prepared-intent-plan.md) — the read-only phase/gate preparation generated from an IntentAssessmentReport plus the Rekon context spine, via `rekon intent prepare`. Prepared status: prepared / blocked / needs-review / stale-assessment / insufficient-assessment; phases investigate / modify / refactor / verify / review; obligation categories capability-preservation / step-preservation / handoff-preservation / runtime-drift / finding-governance / freshness / verification / source-write-boundary. PreparedIntentPlan is phase/gate preparation, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. Verification requirements are not VerificationPlan. IntentStatusReport is the next layer; intent:go deferred; source-write behavior remains unavailable.
