# VerificationPlan

`VerificationPlan` lists checks that should prove a work order or intent.

## Produced By

- intent and remediation actuators

## Common Fields

- `header`
- `commands`
- `successCriteria`
- `workOrderRef`
- optional `checkSelection`

Plans describe verification. They do not prove that commands have run.

Plans produced by `rekon context validate-change --prepare-verification`
include changed-scope selection lineage. Each selected check records its kind,
whether it came from declared repository law or prior execution evidence, the
paths and reasons it covers, its evidence refs, and the exact proof obligations
it may satisfy. Historical coverage can nominate an exact command, but only a
new digest-bound run can satisfy the plan.
When a flow handoff declares `verification.requiredChecks`, the plan maps each
command only to that handoff's edge. It does not generalize the result to other
edges in the same flow.

Intent handoff generation preserves supported commands verbatim and in plan
order, including npm argument separators and flags such as
`npm run cli -- --help`. A command that is unsafe or outside the supported
command policy blocks generation with a typed issue naming the command and the
reason. It is never silently omitted.

Generated intent plans also record `intentHandoff.requestKind`, including the
`documentation` kind, so downstream bundles retain the request classification.

## Isolated Coverage Plans

```sh
rekon verify coverage plan \
  --framework node \
  --test-path tests/user.test.mjs \
  --source-path src/user.mjs

rekon verify coverage plan \
  --framework vitest \
  --config tests/vitest.config.ts \
  --test-path tests/user.test.ts \
  --source-path src/user.ts
```

This writes a plan for one test framework, one exact test file, and one or more
source files the test is intended to exercise. Node uses the current runtime;
Vitest and Jest use installed repository packages. Repeat `--source-path` for
multiple targets. These plans add:

- `source: "isolated-coverage"`
- `coverage.format: "lcov"` for Node or `"istanbul"` for Vitest and Jest
- `coverage.framework` and `coverage.provider`
- `coverage.testPath`, optional `coverage.configPath`,
  `coverage.targetPaths`, and `coverage.coveragePath`
- `coverage.isolated: true`

The planner does not execute or install anything. `rekon verify run --execute`
reads this metadata, runs the named plan through the normal safety policy, and
binds the resulting coverage to the recorded command automatically.

Node plans use native V8 coverage and do not accept `configPath`. Vitest plans
limit collection to the declared targets and exclude nested repository
worktrees. Vitest and Jest `configPath` values are repository-relative and
validated before use.

Target paths express verification intent. If a passing isolated run includes a
target function in its coverage data with an execution count of zero, policy
can describe that as a scoped target gap. Plans written before target paths
were introduced remain readable, but zero counts from them are context only.

A later change-validation pass may reuse the exact command from a linked,
passed isolated run when its coverage observed a changed source path and no
declared test already covers that path. Rekon chooses a deterministic minimal
set of these candidates. It does not infer commands from graph paths or treat
the old run as current proof.
