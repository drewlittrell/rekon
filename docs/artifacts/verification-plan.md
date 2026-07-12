# VerificationPlan

`VerificationPlan` lists checks that should prove a work order or intent.

## Produced By

- intent and remediation actuators

## Common Fields

- `header`
- `commands`
- `successCriteria`
- `workOrderRef`

Plans describe verification. They do not prove that commands have run.

## Isolated Coverage Plans

```sh
rekon verify coverage plan \
  --framework vitest \
  --test-path tests/user.test.ts \
  --source-path src/user.ts
```

This writes a plan for one installed test framework, one exact test file, and
one or more source files the test is intended to exercise. Repeat
`--source-path` for multiple targets. These plans add:

- `source: "isolated-coverage"`
- `coverage.format: "istanbul"`
- `coverage.framework` and `coverage.provider`
- `coverage.testPath`, `coverage.targetPaths`, and `coverage.coveragePath`
- `coverage.isolated: true`

The planner does not execute or install anything. `rekon verify run --execute`
reads this metadata, runs the named plan through the normal safety policy, and
binds the resulting coverage to the recorded command automatically.

Target paths express verification intent. If a passing isolated run includes a
target function in its coverage data with an execution count of zero, policy
can describe that as a scoped target gap. Plans written before target paths
were introduced remain readable, but zero counts from them are context only.
