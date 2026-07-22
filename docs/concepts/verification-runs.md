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

For an executed CLI run, Rekon also captures the `VerificationPlan` source paths
before and after execution against one resolved Git commit. Stable bindings
prove that the recorded commands observed the same bounded bytes later carried
by the result. If a command changes those paths, the run records both states,
returns a nonzero CLI outcome, and cannot be converted into proof. Rekon detects
the mutation; it does not perform or revert it.

## Safety Boundary

Execution must be explicit and scoped to a named plan. Verification artifacts do
not auto-resolve findings, apply reconciliation, or write source files.

Non-Git or legacy runs can remain unbound and inspectable, but an unavailable
binding cannot prove current source state. Dry runs never capture source-state
proof.

An executed run may support isolated coverage attribution when its passed or
failed command explicitly names the test file. The resulting
`RuntimeGraphObservationReport` cites the run and command. This makes the
attribution auditable without treating execution as assertion proof.

Linked isolated coverage may later help change validation select the smallest
known test set for changed source. Selection requires a schema-valid
`RuntimeGraphObservationReport`, an indexed passed `VerificationRun`, the exact
recorded command ID, and positive observed coverage for the changed path. This
is routing evidence only. The selected command must run again against the
current source-state digest.

For a failed result, change validation reads the linked run through the
hardened artifact store, reapplies secret redaction, and caps the selected
stderr, stdout, or note excerpt before returning it as corrective context.

Framework coverage plans carry the test, intended source targets, and output
path on the `VerificationPlan`. The runner consumes that metadata only during
explicit `--execute`; preview remains non-executing. Target declarations allow
policy to distinguish a scoped missed target from an unrelated zero counter.

## Related Artifacts

- [VerificationRun](../artifacts/verification-run.md)
- [VerificationResult](../artifacts/verification-result.md)
- [VerificationPlan](../artifacts/verification-plan.md)
