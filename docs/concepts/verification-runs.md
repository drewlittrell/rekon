# Verification Runs

A `VerificationRun` records command execution detail for a named
`VerificationPlan`. A `VerificationResult` summarizes whether the run satisfied
the plan.

Rekon separates these artifacts so detailed execution logs do not become the
only proof surface a resolver or publication has to consume.

## Current Model

- `VerificationPlan` describes required checks.
- `VerificationRun` records what was actually run.
- `VerificationResult` summarizes the outcome and cites the run.

Runs may include command status, duration, exit code, signal, bounded output
excerpts, and stdout/stderr digests.

## Safety Boundary

Execution must be explicit and scoped to a named plan. Verification artifacts do
not auto-resolve findings, apply reconciliation, or write source files.

## Related Artifacts

- [VerificationRun](../artifacts/verification-run.md)
- [VerificationResult](../artifacts/verification-result.md)
- [VerificationPlan](../artifacts/verification-plan.md)
