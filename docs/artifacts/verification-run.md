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

`rekon verify run --execute` can attach isolated Istanbul coverage when given
both `--istanbul-coverage` and `--test-path`. The executed command must name the
test path explicitly. Rekon then writes a `RuntimeGraphObservationReport` that
cites this run and command; the `VerificationRun` itself remains unchanged.

Coverage records observed execution context, not assertion coverage. Dry runs,
timed-out commands, killed commands, and commands that do not name the test
cannot support a coverage binding.

Plans created by `rekon verify coverage plan` mark the resulting source as
isolated. Policy can then match fresh function ranges to an existing complexity
risk while preserving the run and command as provenance. Generated plans also
declare source targets. A passing run that instruments a declared hotspot with
zero execution supports a scoped target-gap statement, not a global coverage
claim.
