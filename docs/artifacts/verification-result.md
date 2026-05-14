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
- future architecture-summary publishers that surface verification
  status alongside coherency and remediation state
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

## Cross-References

- [VerificationPlan](verification-plan.md)
- [WorkOrder](work-order.md)
- [Remediation work orders concept](../concepts/remediation-work-orders.md)
- [Verification results concept](../concepts/verification-results.md)
- [Capability model](../strategy/capability-model.md)
