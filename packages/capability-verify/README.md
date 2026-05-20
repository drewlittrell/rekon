# `@rekon/capability-verify`

Built-in Rekon **verification runner capability skeleton.**

> **No command execution is implemented yet.** This v1
> skeleton declares the runner boundary — the
> `"runner"` role + `execute:verification` permission —
> so manifest review, conformance tests, and operator
> tooling can see the dangerous surface before any
> execution code lands. The actual runner is added in
> subsequent slices.

See
[`docs/strategy/verification-runner-v1-decision.md`](../../docs/strategy/verification-runner-v1-decision.md)
for the full decision memo (Option C — hybrid opt-in
runner), the safety contract, and the 8-step
implementation sequence. This package implements
**step 2** of that sequence; the next slice (step 3)
adds the dry-run command.

## Status

- **Manifest:** declared. The capability registers a
  `runner` handler so the SDK's
  "manifest-roles-have-handlers" invariant holds.
- **Runner handler:** always throws. Invoking it
  raises `"Verification execution is not implemented
  yet."`. No process is spawned. No stdout/stderr is
  read. No source files are read.
- **Permission:** `execute:verification` is declared
  on the manifest so manifest review can flag
  execution-capable installs.
- **CLI surface:** none. The future `rekon verify run`
  command does not exist yet. Use the existing
  `rekon verify record --result-json <json>` to
  record outcomes manually.

## What this capability will do (future)

When implementation lands:

1. **Step 3 — dry-run command.**
   `rekon verify run --plan <id> --dry-run` resolves
   the named `VerificationPlan`, applies the safety
   contract from the decision memo (timeouts,
   redaction patterns, max log bytes), and prints
   what would run. **Runs nothing. Writes no
   artifacts.**
2. **Step 4 — opt-in execution.**
   `rekon verify run --plan <id> --execute` opts in
   to local execution. Implements the full safety
   contract:
   - executes only commands listed in the named
     `VerificationPlan`;
   - no shell interpolation from artifact-supplied
     strings;
   - `spawn(argv[0], argv.slice(1))` with
     `shell: false` unless the plan explicitly
     wraps `["sh", "-c", "..."]`;
   - per-command default timeout 120s; per-plan
     default 600s; process-tree kill via
     `SIGTERM` → 3s grace → `SIGKILL`;
   - bounded logs (8 KB / stream / command
     default), full-stream digests always
     captured, redacted truncated excerpts only;
   - writes a `VerificationRun` artifact via the
     existing
     [`createVerificationRun`](../capability-intent/src/index.ts)
     helper.
3. **Step 5 — redaction / truncation tests.**
4. **Step 6 — `VerificationResult` derivation.**
   `--write-result` flag emits a derived
   `VerificationResult` that cites the
   `VerificationRun` in `header.inputRefs`.
5. **Step 7 — runner-produced proof in
   publications.**
6. **Step 8 — CI / GitHub adapter** (out of scope
   for the local-runner v1 arc).

## Safety contract (pinned, deferred to implementation)

These rules apply when the executor lands. They are
documented here so contributors don't lose the
contract:

1. No command execution during `rekon refresh`,
   `publish`, `resolve`, `intent`, `reconcile`, or
   `artifacts` commands.
2. Execution requires `rekon verify run --plan <id>
   --execute`.
3. Runner may execute only commands listed in the
   named `VerificationPlan`.
4. No shell interpolation from finding titles,
   work-order descriptions, model-generated notes,
   or evidence text.
5. `spawn(argv[0], argv.slice(1))` with
   `shell: false` by default.
6. Process-tree kill on timeout
   (`SIGTERM` → 3s grace → `SIGKILL`).
7. Bounded logs (8 KB / stream / command default,
   full-stream digests always captured, redacted
   truncated excerpts only).
8. No auto-resolution. No auto-apply. No source
   writes. No automatic retries.

The manifest explicitly does NOT declare
`write:source` so conformance tooling can flag
attempts to add it.

## Stability

Label: `experimental, public`.

The manifest + skeleton are `experimental` and stable
enough to publish at `0.1.0-alpha.1` so external
capability authors can see the runner /
`execute:verification` boundary. The runner handler
itself is intentionally a throw-stub until opt-in
execution lands. Internals (helper functions inside
this package) are `internal` and may change without
notice. Public surface (the manifest identity, role,
permissions, consumes/produces lists, and the
re-exported `VerificationRun` types) follows the
[stability concept](../../docs/concepts/stability.md).

## Cross-references

- [Verification runner v1 decision memo](../../docs/strategy/verification-runner-v1-decision.md)
- [VerificationRun artifact](../../docs/artifacts/verification-run.md)
- [VerificationResult artifact](../../docs/artifacts/verification-result.md)
- [Verification results concept](../../docs/concepts/verification-results.md)
- [Capability model](../../docs/strategy/capability-model.md)
