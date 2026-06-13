# `@rekon/capability-verify`

Verification capability boundary for Rekon.

This package declares the verification-runner capability shape without turning
verification plans into automatic execution. The public boundary is deliberate:
verification execution must remain opt-in, scoped to a named plan, and recorded
as artifacts.

## Current Behavior

- Registers the verification capability manifest.
- Exposes verification-related types through the package surface.
- Does not spawn processes.
- Does not read stdout or stderr.
- Does not write source files.
- Does not auto-resolve findings.

No command execution is implemented yet.

Use existing recording commands to capture externally run verification results.

## Safety Contract

Future execution support must:

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
