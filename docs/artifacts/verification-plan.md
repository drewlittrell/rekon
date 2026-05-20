# VerificationPlan

## Purpose

`VerificationPlan` describes the verification commands that prove a
`WorkOrder` is correctly resolved. It is a *plan*, not a runner; the
intent capability writes the plan but does not execute the commands.

## Produced By

- `@rekon/capability-intent.work-order` — paired with a resolver-based
  work order.
- `@rekon/capability-intent.remediation-work-order` — paired with a
  remediation work order.

## Consumed By

- humans and agents executing work
- `@rekon/capability-intent` via `createVerificationResult` and the
  `rekon verify record` CLI to write
  [`VerificationResult`](verification-result.md) artifacts that
  record the outcome of each command in the plan.

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`VerificationPlan`. `inputRefs` cites the `WorkOrder` and any
governance inputs (`CoherencyDelta`, `FindingLifecycleReport`,
`ResolverPacket`).

## Common Fields

- `workOrderRef` — the work order this plan verifies.
- `commands` — a list of shell commands to run.
- `successCriteria` — concise success criteria mirrored from the work
  order.
- `source` — `"resolver"` or `"coherency-delta"` (optional).

## Resolver Plan Commands

For resolver-based work orders, `commands` defaults to the work order's
`requiredChecks` (driven by the `ResolverPacket`):

```text
npm run typecheck
npm run test
npm run build
```

## Remediation Plan Commands

For remediation work orders, `commands` adds Rekon-specific checks to
prove the governance state really changed:

```text
npm run typecheck
npm run test
npm run build
rekon artifacts validate --json
rekon artifacts freshness --json
```

The `rekon artifacts validate` and `rekon artifacts freshness`
commands force the operator to confirm the new evaluate -> lifecycle ->
coherency delta cycle no longer lists the addressed findings as
active.

## Anti-Gaming

Verification gates are not implementation targets. Commands listed in
the plan should prove real correctness; modifying tests, rules,
validators, or finding status purely to make the plan green is a
guardrail violation captured by the work order's
`antiGamingInstruction`.

## Example

```json
{
  "header": {
    "artifactType": "VerificationPlan",
    "artifactId": "verification-plan-...",
    "schemaVersion": "0.1.0",
    "generatedAt": "2026-05-14T11:00:00.000Z",
    "subject": { "repoId": "simple-js-ts" },
    "producer": { "id": "@rekon/capability-intent", "version": "0.1.0" },
    "inputRefs": [
      { "type": "WorkOrder", "id": "work-order-...", "schemaVersion": "0.1.0" },
      { "type": "CoherencyDelta", "id": "coherency-delta-...", "schemaVersion": "0.1.0" }
    ],
    "provenance": { "confidence": 0.7 }
  },
  "workOrderRef": { "type": "WorkOrder", "id": "work-order-...", "schemaVersion": "0.1.0" },
  "commands": [
    "npm run typecheck",
    "npm run test",
    "npm run build",
    "rekon artifacts validate --json",
    "rekon artifacts freshness --json"
  ],
  "successCriteria": [
    "Selected findings are addressed by real implementation changes.",
    "No checks are weakened, removed, or bypassed."
  ],
  "source": "coherency-delta"
}
```

## Freshness

`VerificationPlan` freshness follows its `WorkOrder`. When the work
order is invalidated (newer `CoherencyDelta` or `ResolverPacket`), the
plan is also marked `stale` and should be regenerated alongside the
new work order.

## Runner Direction

`VerificationPlan.commands` are today consumed by
operators running commands externally and feeding
outcomes back via `rekon verify record`. The
[verification runner v1 decision](../strategy/verification-runner-v1-decision.md)
memo pins the future direction: an opt-in
`rekon verify run --plan <id> --execute`
command will execute exactly the commands
listed in `VerificationPlan.commands` (no shell
interpolation from artifact-supplied strings),
emit a sibling `VerificationRun` artifact, and
optionally derive a `VerificationResult`. Plan
commands that require shell semantics must be
explicitly wrapped (`["sh", "-c", "<command>"]`)
in the plan itself — the runner uses
`spawn(argv[0], argv.slice(1))` with
`shell: false` for non-shell-wrapped entries.

## Cross-References

- [VerificationResult](verification-result.md)
- [WorkOrder](work-order.md)
- [Remediation work orders concept](../concepts/remediation-work-orders.md)
- [Verification results concept](../concepts/verification-results.md)
- [Verification runner v1 decision](../strategy/verification-runner-v1-decision.md)
- [VerificationRun artifact](verification-run.md)
- [Verification runs concept](../concepts/verification-runs.md)
- [CoherencyDelta](coherency-delta.md)
- [ResolverPacket](resolver-packet.md)
