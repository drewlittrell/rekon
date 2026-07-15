# RuntimeGraphObservationReport

`RuntimeGraphObservationReport` records runtime relationships observed from a
JSONL event log. It preserves evidence; it does not claim coverage or decide
whether a test assertion exercised the relevant behavior.

`rekon runtime graph observe` reads `.rekon/handoff-events.jsonl`. Existing
`handoff_event` rows produce workflow nodes and edges. Instrumentation may also
write:

```json
{"kind":"execution_observation","testPath":"tests/user.test.ts","sourcePaths":["src/user-service.ts"],"routePaths":["/api/users"],"timestamp":"2026-07-11T12:00:00Z","source":"vitest-instrumentation"}
```

`testPath` and source paths must be repository-relative. Routes must begin with
`/`. Unsafe or incomplete rows are ignored and counted in `summary.ignoredRows`.

The report contains `test`, `file`, and `route` nodes connected by
`observed-execution` edges. The graph projector translates those into
application `GraphSlice` `observed` edges. Evaluators may use that information
as impact context, but it cannot promote a risk into a finding by itself.

## Coverage Reports

Istanbul-compatible `coverage-final.json` or LCOV can supply observed source
files:

```sh
rekon runtime graph observe \
  --istanbul-coverage coverage/coverage-final.json \
  --test-path tests/user.test.ts

rekon runtime graph observe \
  --lcov-coverage coverage/lcov.info \
  --test-path tests/user.test.ts
```

Neither format contains per-test identity. `--test-path` is an
explicit attribution, so use this form only when the coverage file came from an
isolated run of that test. Suite-wide coverage must not be attributed to one
test. Rekon records the coverage path, SHA-256 digest, file counts, and test
path in `source.coverageSources`.

New coverage sources also retain per-file counter summaries and normalized
function ranges. Each function range records its name when available, source
lines, and execution count. `isolated: true` is set only when the coverage came
from a generated isolated-test plan.

For stronger provenance, bind the coverage to a completed `VerificationRun`:

```sh
rekon runtime graph observe \
  --istanbul-coverage coverage/coverage-final.json \
  --test-path tests/user.test.ts \
  --verification-run VerificationRun:<id>
```

The referenced run must contain a passed or failed command whose arguments
explicitly name the test path. Rekon records the run ref, command ID, and
command status in the coverage source and cites the run in `header.inputRefs`.
It rejects stale coverage that predates the run. Timed-out, killed, skipped,
and unexecuted commands cannot support the binding.

The same binding can be created immediately after execution:

```sh
rekon verify run \
  --plan VerificationPlan:<id> \
  --execute \
  --istanbul-coverage coverage/coverage-final.json \
  --test-path tests/user.test.ts
```

This uses the existing verification runner and its command-safety policy. It
does not introduce a separate test runner. Coverage observation is unavailable
in dry-run mode.

Vitest and Jest users can generate the plan instead of assembling flags:

```sh
rekon verify coverage plan \
  --framework vitest \
  --config tests/vitest.config.ts \
  --test-path tests/user.test.ts \
  --source-path src/user.ts
rekon verify run --plan <VerificationPlan-id> --execute
```

The planner uses an already-installed local binary and writes no files outside
`.rekon/`. It never downloads a runner or coverage provider. Vitest collection
is bounded to declared source targets and excludes nested repository
worktrees. `--config` selects an existing repository-local runner config when
the default config is insufficient.

Positive statement, function, or branch counters count as observed execution.
Zero-count files, files outside the repository, malformed entries, and the test
file itself do not produce observed source edges. Coverage does not infer route
execution and does not prove assertion coverage.

Policy may attach fresh isolated function coverage to an existing complexity
risk. A positive count proves that the named test executed the function. A zero
count is a scoped target gap only when the plan explicitly named that source
path and the passing run instrumented the function. Otherwise it means only
that the recorded test did not execute it; it is not a claim about the
repository's complete test suite.
