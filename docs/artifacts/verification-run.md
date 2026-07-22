# VerificationRun

`VerificationRun` records detailed command execution for a `VerificationPlan`.

## Common Fields

- `header`
- `status`
- `commands`
- `runner`
- `startedAt`
- `completedAt`
- `sourceState`

Runs should cite the plan they executed. A run records execution detail; a
`VerificationResult` summarizes proof status for consumers.

An executed CLI run captures the plan's declared source paths before and after
the command sequence. `sourceState.status` is `stable` only when both bindings
have the same deterministic digest. It is `changed` when a command altered the
bounded source and `unavailable` when Rekon cannot establish the binding. A
changed run cannot produce a proof-bearing `VerificationResult`, even when all
commands exited zero.

The binding covers a resolved Git base commit plus normalized path status and
before/after SHA-256 values. It does not claim that unrelated repository paths
were unchanged.

The policy evaluator also consumes completed runs as execution evidence for
repository-native lint, test, typecheck, and build diagnostics. A run does not
become a finding by itself. Promotion requires reproducible evidence coherent
with the current evidence graph; operational and environment failures remain
assessments.

Known lint, compiler, test, and build output formats are parsed into
location-specific diagnostic identities. The original bounded excerpts and
digests remain the evidence source; parsing is a deterministic policy
projection over the run artifact.

## Coverage Binding

`rekon verify run --execute` can attach isolated coverage from plan metadata.
Node plans produce LCOV; Vitest and Jest plans produce Istanbul JSON. Manual
Istanbul binding remains available with both `--istanbul-coverage` and
`--test-path`. The executed command must name the test path explicitly. Rekon
then writes a `RuntimeGraphObservationReport` that cites this run and command;
the `VerificationRun` itself remains unchanged.

Coverage records observed execution context, not assertion coverage. Dry runs,
timed-out commands, killed commands, and commands that do not name the test
cannot support a coverage binding.

A linked passed isolated run can later nominate its exact command when a
changed source path has no declared test. Rekon never synthesizes a command
from coverage paths and never accepts the historical run as proof of current
bytes; the selected command must execute again.

Plans created by `rekon verify coverage plan` mark the resulting source as
isolated. Policy can then match fresh function ranges to an existing complexity
risk while preserving the run and command as provenance. Generated plans also
declare source targets. A passing run that instruments a declared hotspot with
zero execution supports a scoped target-gap statement, not a global coverage
claim.
