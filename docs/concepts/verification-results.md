# Verification Results

A `VerificationResult` is the artifact that closes the loop between a
remediation plan and recorded proof. It says: *"this is the
operator-supplied evidence that the work in this `WorkOrder` was (or
was not) verified by running the commands in this `VerificationPlan`."*

This is the alpha "lite" form of classic intent proof-gate
discipline: agents must prove work with objective evidence; failures
are evidence too; verification gates must not be gamed. See
[../strategy/classic-behavior-distillation.md](../strategy/classic-behavior-distillation.md)
("Intent Preparation And Anti-Gaming") and
[../strategy/classic-wins.md](../strategy/classic-wins.md) ("Agent
Proof Gates Beat Confidence Narratives").

## Why It Exists

Before this batch, Rekon could *plan* verification but had no way to
*record* its outcome. Operators ran `npm run typecheck`/`test`/`build`
manually and reported success in chat. Chat is not an artifact: it
disappears, it can be retroactively edited, and it cannot be cited
by future tools.

`VerificationResult` makes the outcome durable, citable, and
inspectable:

- the result cites the `VerificationPlan` it evaluated;
- failures are first-class status, not buried in prose;
- missing commands are recorded as `not-run`;
- stdout/stderr digests preserve provenance without storing raw
  output;
- evidence notes capture context the operator wants to keep.

## How It Is Built

`rekon verify record` calls `createVerificationResult(input)` inside
`@rekon/capability-intent`. The helper:

1. Reads the plan's `commands` to derive the canonical command list.
2. Matches each submitted result to a plan command by exact string.
3. Adds `not-run` entries for any plan command without a submitted
   result.
4. Appends submitted commands that are not in the plan (so extra
   evidence is preserved, not silently dropped).
5. Derives the overall status (`passed` / `failed` / `partial` /
   `not-run`).
6. Builds an `ArtifactHeader` whose `inputRefs` include the
   `VerificationPlan` and (when available) the `WorkOrder`.

The artifact is written under `.rekon/artifacts/actions/` through
the artifact store with category `actions`.

## CLI Surface

```sh
rekon verify record --root <repo> --result-json '<json>'
rekon verify record --root <repo> --plan <id> --result-json '<json>' --json
rekon verify record --root <repo> --plan VerificationPlan:<id> --result-json '<json>' --json
```

Minimum JSON shape:

```json
{
  "recordedBy": "operator",
  "evidenceNotes": ["Captured locally after remediation."],
  "commands": [
    { "command": "npm run typecheck", "status": "passed", "exitCode": 0 },
    { "command": "npm run test", "status": "failed", "exitCode": 1, "notes": "regression" }
  ]
}
```

Command result fields:

| Field | Required | Notes |
| --- | --- | --- |
| `command` | yes | Exact string from the plan, or any string for extra evidence. |
| `status` | yes | `passed` / `failed` / `skipped` / `not-run`. |
| `exitCode` | no | Integer; truncated to nearest int. |
| `durationMs` | no | Non-negative number. |
| `startedAt`, `completedAt` | no | ISO timestamps. |
| `stdoutDigest`, `stderrDigest` | no | Operator-supplied digest strings (e.g. SHA-256 hex). |
| `notes` | no | Short free-form text. |

If `--plan` is omitted, the CLI defaults to the latest indexed
`VerificationPlan` and returns a `warnings` array explaining the
default. Explicit `--plan` is recommended for any non-interactive
use.

## Output Shape

```json
{
  "artifact": {
    "type": "VerificationResult",
    "id": "verification-result-...",
    "schemaVersion": "0.1.0",
    "path": ".rekon/artifacts/actions/VerificationResult-...json",
    "digest": "..."
  },
  "status": "partial",
  "summary": {
    "total": 3,
    "passed": 1,
    "failed": 0,
    "skipped": 0,
    "notRun": 2
  },
  "commandResults": [
    { "command": "npm run typecheck", "status": "passed", "exitCode": 0 },
    { "command": "npm run test", "status": "not-run" },
    { "command": "npm run build", "status": "not-run" }
  ],
  "warnings": []
}
```

## Anti-Gaming / Proof Discipline

Verification gates exist to prove real implementation correctness.
Recording a `VerificationResult` reinforces that:

- **Failures are evidence.** A `failed` command is recorded and
  surfaces in `summary.failed`. It is not silently discarded.
- **Skipped is not passed.** `skipped` and `not-run` are distinct
  statuses; the overall result will be `partial` or `not-run`, never
  `passed`, when commands are missing.
- **Digests over raw output.** Operators record stdout/stderr digests
  rather than raw output, keeping artifacts small and avoiding
  accidental secret capture. The digest is the artifact-style
  fingerprint operators agree to attach.
- **Re-run after re-plan.** Freshness marks the result `stale` when a
  newer plan lands. Re-record explicitly.

## Status

| Submitted state | Overall status |
| --- | --- |
| All plan commands have a `passed` result, none failed. | `passed` |
| Any submitted result is `failed`. | `failed` |
| Some commands are `skipped`/`not-run` and none failed. | `partial` |
| No results submitted, or all results are `not-run`. | `not-run` |

## What This Is Not

- Not a command runner. The actuator does not execute commands.
- Not a CI integration. GitHub/CI check publishers remain deferred.
- Not auto-apply. Recording a passing result does not promote
  remediation operations from `deferred` to `applied`.
- Not a semantic judge. Rekon does not evaluate whether the
  operator's evidence is sufficient — it records the operator's
  claim and the plan it covers.
- Not a real-time stream. The actuator records a single submission.

## Surfaced In Publications

- The [architecture summary publication](../artifacts/architecture-summary-publication.md)
  reads the latest `VerificationResult` and renders its status,
  summary counts, and recorded-by/recorded-at in the Verification
  Status section. Failed and partial results surface "Verification is
  not complete." The Proof Loop section's "Suggested next command"
  walks the loop and recommends `rekon verify record` when no result
  exists, or "address failures and re-run `rekon verify record`" when
  a result is failed/partial/not-run.
- The [proof report publication](proof-report-publication.md) is a
  focused readout of the same evidence. It renders the per-command
  results table, an explicit Failed / Missing Evidence bullet list,
  and a single Next Recommended Action line. Use it when the
  architecture summary is too broad for the audience and you need a
  small artifact dedicated to proof state.

## Surfaced In Resolvers And Remediation

- `resolve.issue` chains `findingId -> WorkOrder.remediationItems ->
  VerificationPlan.workOrderRef -> VerificationResult.verificationPlanRef`
  via the exported `lookupVerificationEvidence(artifacts, findingId)`
  helper from `@rekon/capability-intent`. The matching `VerificationResult`
  populates `IssuePacket.verification`, adds a status-specific warning
  (except for `passed`), and writes an `issue.verification`
  `resolutionTrace` entry. Passing verification never auto-resolves
  the finding or mutates `FindingStatusLedger`; it only changes the
  recommended next action.
- In v2 group mode, when `resolve.issue` matches an
  `IssueAdjudicationReport` group, it calls
  `lookupVerificationEvidence` for **every** `memberFindingId` and
  picks the worst status
  (`failed > partial > not-run > missing > passed`) as the
  packet's top-level `verification`. The per-member breakdown is
  exposed as `IssuePacket.verificationByFinding`, so reviewers
  can see which finding contributed the worst signal. Aggregated
  group verification still does not auto-resolve any member
  finding or the group as a whole.
- `rekon intent remediation --skip-verified` calls the same helper
  for every candidate remediation item. Items whose chain resolves to
  `passed` are excluded from the new work order and reported via the
  CLI's `skippedVerified` array. `failed`, `partial`, `not-run`, and
  `missing` items remain selected. The flag is opt-in.

## Freshness

`rekon artifacts freshness --type VerificationResult --json` marks a
result `stale` when a newer `VerificationPlan` is indexed. Rebuild
with `rekon verify record` against the new plan.

## Runner Direction

Verification results today are **manually
recorded** via `rekon verify record
--result-json <json>`. The
[verification runner v1 decision](../strategy/verification-runner-v1-decision.md)
memo pins the future direction: keep manual
recording as the default path, and add a future
opt-in `rekon verify run --plan <id> --execute`
command (gated by a new
`@rekon/capability-verify` package + a new
`execute:verification` permission). The runner
will write a sibling **`VerificationRun`**
artifact carrying raw execution detail
(per-command start / end / duration / exit code /
status with `timeout` and `killed` additions +
stdout / stderr digests + redacted truncated
excerpts + runner version + environment summary).
`VerificationResult` remains the proof summary
consumed by publications and resolvers; the
runner can optionally derive one from a run
when `--write-result` is supplied.

The memo also pins the safety contract (no
execution during `rekon refresh` / `publish` /
`resolve` / `intent` / `reconcile` / `artifacts`;
no shell interpolation from artifact-supplied
strings; per-command + per-plan timeouts with
process-tree kill; bounded redacted logs;
no auto-resolution, no auto-apply, no automatic
retries in v1).

## Cross-References

- [VerificationResult artifact](../artifacts/verification-result.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [WorkOrder artifact](../artifacts/work-order.md)
- [Remediation work orders concept](remediation-work-orders.md)
- [Reconciliation plans concept](reconciliation-plans.md)
- [Verification runner v1 decision](../strategy/verification-runner-v1-decision.md)
- [Capability model](../strategy/capability-model.md)
- [Classic behavior distillation](../strategy/classic-behavior-distillation.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
