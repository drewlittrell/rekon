# VerificationRun

`VerificationRun` records detailed command execution for a `VerificationPlan`.

## Common Fields

- `header`
- `status`
- `commands`
- `runner`
- `startedAt`
- `completedAt`

Runs should cite the plan they executed. A run records execution detail; a
`VerificationResult` summarizes proof status for consumers.
