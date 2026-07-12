# `@rekon/capability-verify`

Verification capability boundary for Rekon.

This package implements Rekon's opt-in verification runner. Execution remains
scoped to a named plan and is recorded as artifacts.

## Current Behavior

- Registers the verification capability manifest.
- Exposes verification-related types through the package surface.
- Previews commands without execution through `rekon verify run --dry-run`.
- Executes validated commands only through `rekon verify run --execute`.
- Uses `spawn` without a shell, a scrubbed environment, timeouts, bounded
  redacted excerpts, and full-stream digests.
- Writes `VerificationRun` and derives `VerificationResult` artifacts.
- Can bind isolated Istanbul coverage to the exact passed or failed command
  that named the test, producing a linked `RuntimeGraphObservationReport`.
- Exposes `createIsolatedCoverageVerificationPlan()` for deterministic Vitest
  and Jest plan construction. Plans can declare intended source targets. The
  helper does not resolve packages or execute.
- Does not write source files.
- Does not auto-resolve findings.

## Safety Contract

Execution must:

- run only commands listed in a named `VerificationPlan`;
- avoid shell interpolation by default;
- enforce timeouts and bounded logs;
- redact captured output where configured;
- write `VerificationRun` / `VerificationResult` artifacts;
- avoid source writes, auto-apply, auto-resolution, and automatic retries.

## Stability

Label: `experimental, public`.

The manifest identity and declared boundary are public. Internal helpers may
change.
