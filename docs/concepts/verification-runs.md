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

An executed run may support isolated coverage attribution when its passed or
failed command explicitly names the test file. The resulting
`RuntimeGraphObservationReport` cites the run and command. This makes the
attribution auditable without treating execution as assertion proof.

Framework coverage plans carry the test, intended source targets, and output
path on the `VerificationPlan`. The runner consumes that metadata only during
explicit `--execute`; preview remains non-executing. Target declarations allow
policy to distinguish a scoped missed target from an unrelated zero counter.

## Related Artifacts

- [VerificationRun](../artifacts/verification-run.md)
- [VerificationResult](../artifacts/verification-result.md)
- [VerificationPlan](../artifacts/verification-plan.md)
