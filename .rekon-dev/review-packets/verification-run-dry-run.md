# Review Packet — Verification Runner Dry-Run Command

**Step 3** of the runner v1 implementation sequence
pinned by
[`docs/strategy/verification-runner-v1-decision.md`](../../docs/strategy/verification-runner-v1-decision.md).
**No command execution lands in this batch.** No
process spawn. No stdout / stderr capture. No log
redaction implementation. No `VerificationResult`
derivation. `--execute` is refused with a
not-implemented message. `rekon verify record`
behavior is unchanged.

## CHANGES MADE

**Helper (`@rekon/capability-verify`):**

- `packages/capability-verify/src/index.ts` —
  added:
  - `createVerificationRunDryRun(input)`: builds
    a planned-but-not-run `VerificationRun` from a
    `VerificationPlan` and validation summary.
  - `validateVerificationRunCommandString(command)`:
    tokenizes a command string into argv (with
    quoted-string support) and validates it
    against the safety contract.
  - `tokenizeCommandString(command)`: private
    helper used by the validator.
  - Reason codes:
    `VerificationRunCommandValidationReason` =
    `"empty-command" | "shell-control-operator" |
    "command-substitution" | "env-assignment-prefix"
    | "newline" | "unsupported-syntax"`.
  - Types:
    `VerificationRunCommandValidationIssue`,
    `VerificationRunSafetySummary`,
    `VerificationRunDryRunRunnerInfo`,
    `VerificationRunDryRunInput`,
    `VerificationRunDryRunResult`.
  - Constants:
    `VERIFICATION_RUN_DRY_RUN_REDACTION_PATTERNS`
    (default redaction pattern list declared on
    the artifact even though dry-run captures
    no streams),
    `VERIFICATION_RUN_DRY_RUN_RUNNER_ID =
    "rekon.local.dry-run"`.
  - Re-exports added:
    `VerificationRunCommand`,
    `VerificationRunEnvironment`,
    `VerificationRunRedaction`,
    `VerificationRunRunnerInfo`,
    `VerificationRunSummary`,
    `VerificationPlanLike`,
    `summarizeVerificationRunCommands`.

**CLI (`@rekon/cli`):**

- `packages/cli/src/index.ts` — added the
  `command === "verify" && subcommand === "run"`
  branch. Resolves the `VerificationPlan` via
  the existing `resolveVerificationPlanEntry`,
  reads the plan, derives the `WorkOrder` ref
  from `plan.workOrderRef`, calls
  `createVerificationRunDryRun`, refuses to
  write when validation fails, otherwise writes
  the artifact to the `actions` category and
  emits either JSON or a human-readable preview.
- Added imports:
  `type ArtifactHeader`,
  `type VerificationRun`,
  `type VerificationRunCommand`,
  `createVerificationRunDryRun`,
  `type VerificationRunCommandValidationIssue`,
  `type VerificationRunDryRunResult`,
  `type VerificationRunSafetySummary`,
  `VERIFY_CAPABILITY_ID`,
  `VERIFY_CAPABILITY_VERSION`.
- Added the `renderVerifyRunDryRunHuman` helper
  for non-JSON output.
- Added the new command to the usage list.
- `packages/cli/package.json` — added
  `"@rekon/capability-verify": "0.1.0-alpha.1"`
  dependency.
- `packages/cli/tsconfig.json` — added the
  `{ "path": "../capability-verify" }` project
  reference.

**Tests:**

- `tests/contract/verification-run-dry-run.test.mjs`
  — 23 new tests.

**Docs (8 updated + CHANGELOG + README + review
packet):**

- `docs/concepts/verification-runs.md` — expanded
  Status Of The Runner with a "Dry-Run Preview"
  section.
- `docs/artifacts/verification-run.md` — added a
  "Dry-Run Behavior" section; updated Producers
  + Helpers.
- `docs/strategy/verification-runner-v1-decision.md`
  — flipped step 3 to ✅ Shipped with full
  implementation note + the deliberate
  deviation from "writes no artifacts" to
  "writes a not-run VerificationRun" with
  rationale.
- `docs/concepts/verification-results.md` —
  added a dry-run paragraph in the Runner
  Direction section.
- `docs/artifacts/verification-result.md` —
  added a dry-run paragraph in the Runner
  Direction section noting dry-run does not
  write a `VerificationResult`.
- `docs/artifacts/verification-plan.md` —
  added a dry-run paragraph in the Runner
  Direction section.
- `docs/concepts/proof-report-publication.md` —
  the "no result" Next-Action recommendation
  now mentions `rekon verify run --dry-run`.
- `docs/artifacts/proof-report-publication.md`
  — the Next Recommended Action note mentions
  dry-run as a preview command before
  recording.
- `docs/strategy/classic-behavior-roadmap.md`
  — flipped the "Recommended next slice"
  pointer and added a comprehensive new
  entry.
- `docs/strategy/roadmap.md` — added a new
  completed-slice entry above the prior
  shipped slice.
- `docs/strategy/issue-governance-architecture-decision.md`
  — flipped step 37 to shipped; added step 38
  for execution v1; renumbered subsequent
  steps (40 = ObservedSystem, 41 = exclusion
  lists).
- `README.md` — added the dry-run command to
  the CLI smokes block + comment pointing at
  the safety memo.
- `CHANGELOG.md` — new top-of-`0.1.0-alpha.1`
  entry.

## PUBLIC API CHANGES

**Additive only. No breaking changes.**

- **`@rekon/capability-verify`**:
  - New exported function:
    `createVerificationRunDryRun(input):
    VerificationRunDryRunResult`.
  - New exported function:
    `validateVerificationRunCommandString(command):
    VerificationRunCommandValidation`.
  - New exported types:
    `VerificationRunCommandValidationReason`,
    `VerificationRunCommandValidationIssue`,
    `VerificationRunSafetySummary`,
    `VerificationRunDryRunRunnerInfo`,
    `VerificationRunDryRunInput`,
    `VerificationRunDryRunResult`.
  - New exported constants:
    `VERIFICATION_RUN_DRY_RUN_REDACTION_PATTERNS`,
    `VERIFICATION_RUN_DRY_RUN_RUNNER_ID`.
  - Additional re-exports from
    `@rekon/capability-intent` for caller
    convenience.
- **`@rekon/cli`**:
  - New subcommand `rekon verify run`. Required
    flags: `--plan <id|type:id>` and `--dry-run`
    (or its alias `--preview`). Optional flags:
    `--root`, `--json`. `--execute` is
    explicitly refused.

**No changes to:** `VerificationRun` artifact
shape, `VerificationResult` shape,
`VerificationPlan` shape, `WorkOrder` shape,
`ReconciliationPlan` shape, `CoherencyDelta`
shape, `rekon verify record` behavior, SDK,
runtime, or any other capability.

## PURPOSE PRESERVATION CHECK

Rekon's purpose is **artifact-backed codebase
intelligence with a deliberately narrow execution
surface**. This batch adds the first CLI surface
for the future runner, but the surface executes
**nothing**:

1. **No process spawn.** The helper does not
   import `node:child_process`. A sentinel-file
   contract test confirms this:
   `node -e "writeFileSync('SHOULD_NOT_EXIST',…)"`
   in a plan never creates the file when run
   through `--dry-run`.
2. **No stdout / stderr capture.** The artifact
   fields exist but the dry-run path never
   populates them.
3. **No `VerificationResult` derivation.** The
   dry-run writes only a `VerificationRun`. The
   only path to a `VerificationResult` remains
   `rekon verify record`.
4. **`--execute` is refused.** The CLI returns
   a non-zero exit and a "not implemented yet"
   message pointing at the decision memo.
5. **Refusal on invalid commands.** If any
   command in the plan fails validation, the
   CLI writes nothing — the artifact only
   exists when the entire plan is safe.
6. **Conservative tokenizer.** The
   command-string parser handles the small
   subset of patterns that real plans use
   (`npm run …`, `node scripts/…`,
   `node --experimental-foo …`). Anything more
   complex is rejected; the future runner never
   has to parse shell.
7. **`rekon verify record` is unchanged.**
   Manual recording remains the only way to
   produce a `VerificationResult` today.
8. **No CLI behavior change anywhere else.**
   `refresh`, `publish`, `resolve`, `intent`,
   `reconcile`, `artifacts`, `findings`,
   `issues`, `coherency`, `memory` are all
   unchanged.

## CODEBASE-INTEL ALIGNMENT

- The CLI command names mirror the manual path
  (`rekon verify record`) so operators can
  pivot between recording-only and preview-only
  workflows without learning a new namespace.
- The dry-run artifact is the **same artifact
  type** the future execute path will write,
  just with `status: "not-run"`. This keeps the
  artifact the citable surface across both
  paths.
- The safety contract is **declared on the
  artifact** (`redaction.patterns`, the
  `runner.capabilityId` pointer) even though
  dry-run never applies redaction. The future
  runner inherits the same fields.
- The command validator rejects exactly the
  patterns the decision memo's safety contract
  forbids — the contract test pins each
  pattern with its own assertion so
  regressions are obvious.
- The CLI refuses to write when validation
  fails, matching the "Failures are evidence"
  / "Trust the artifacts" discipline in
  [`classic-behavior-distillation.md`](../../docs/strategy/classic-behavior-distillation.md):
  the artifact only exists when proof of
  safety exists.

## DRY-RUN SAFETY MODEL

| Concern | Behavior |
| --- | --- |
| Process execution | Never. No `spawn` / `exec` / `execSync` / `fork`. |
| Stdout / stderr capture | Never. Excerpt and digest fields are absent on dry-run commands. |
| Source file writes | Never. The capability does not declare `write:source`. |
| `VerificationResult` derivation | Never. Dry-run writes only `VerificationRun`. |
| Auto-resolution | Never. `FindingStatusLedger` unchanged. |
| Auto-apply | Never. `ReconciliationPlan` unchanged. |
| Refusal of `--execute` | Always. Non-zero exit + not-implemented message. |
| Refusal without `--dry-run` / `--preview` | Always. Non-zero exit. |
| Refusal without `--plan` | Always. Non-zero exit. |
| Refusal on invalid commands | Always. Non-zero exit + full issue list; no artifact written. |
| Refusal preserves prior artifacts | Yes. No partial writes; no orphaned state. |

## COMMAND VALIDATION

The validator runs **before** tokenization for
the patterns that can be detected reliably from
the raw string (command substitution, newlines,
shell-control operators), then tokenizes the
remainder. Tokenization is intentionally
simple: whitespace-separated, with `"…"` and
`'…'` preserved as single tokens. Unterminated
quotes raise `unsupported-syntax`.

**Accepted** (representative examples):

- `npm run test`
- `npm run build`
- `node scripts/audit-license.mjs`
- `node --experimental-fetch scripts/check.mjs`
- `pnpm test`
- `"path with spaces/script.sh" --flag value`

**Rejected** (one reason per rejection, stable
codes):

| Command | Reason |
| --- | --- |
| `""` (empty) | `empty-command` |
| `npm test && rm -rf dist` | `shell-control-operator` |
| `npm test; npm run build` | `shell-control-operator` |
| `npm test | tee out.log` | `shell-control-operator` |
| `npm test > out.log` | `shell-control-operator` |
| `$(echo npm) test` | `command-substitution` |
| `` `pwd` npm test `` | `command-substitution` |
| `TOKEN=x npm test` | `env-assignment-prefix` |
| `npm test\nnpm run build` | `newline` |
| `echo "hello` | `unsupported-syntax` |

## ARTIFACT BEHAVIOR

**When all commands validate, dry-run writes:**

- `artifactType` = `"VerificationRun"`.
- `status` = `"not-run"`.
- Every command's `status` = `"not-run"`.
- `summary.total` = command count.
- `summary.notRun` = command count.
- `summary.passed` / `failed` / `skipped` /
  `timeout` / `killed` = `0`.
- `runner.id` = `"rekon.local.dry-run"`.
- `runner.capabilityId` =
  `"@rekon/capability-verify"`.
- `runner.version` = the package's version
  (`"0.1.0"` today).
- `redaction.applied` = `false`.
- `redaction.patterns` = the full
  `VERIFICATION_RUN_DRY_RUN_REDACTION_PATTERNS`
  list (declared so the artifact carries the
  safety contract).
- `redaction.redactedMatches` = `0`.
- `environment.platform` / `arch` /
  `nodeVersion` are sourced from the CLI's
  `process` globals.
- `environment.envPolicy` = `"scrubbed"`.
- `header.inputRefs` cites the
  `VerificationPlan` (always) and the
  `WorkOrder` (when `plan.workOrderRef` is
  set).
- `header.producer.id` =
  `"@rekon/capability-verify"`.
- `startedAt` / `endedAt` / `durationMs` are
  absent (no run started).

**When validation fails, dry-run writes
nothing.** Non-zero exit; full issue list in
the error message.

`artifacts validate` stays clean for dry-run
artifacts — a contract test pins this.

## TESTS / VERIFICATION

**New tests (23 total in
`tests/contract/verification-run-dry-run.test.mjs`):**

Helper:

1. `createVerificationRunDryRun produces a
   not-run VerificationRun`.
2. `createVerificationRunDryRun sets every
   command status to not-run`.
3. `createVerificationRunDryRun parses simple
   commands into argv`.
4. `createVerificationRunDryRun rejects shell
   control operators`.
5. `createVerificationRunDryRun rejects env
   assignment prefix`.
6. `createVerificationRunDryRun rejects command
   substitution`.
7. `createVerificationRunDryRun rejects pipes
   and redirects`.
8. `createVerificationRunDryRun rejects
   newlines`.
9. `createVerificationRunDryRun rejects empty
   commands`.
10. `createVerificationRunDryRun reports safety
    summary with executeRequired`.
11. `validateVerificationRunCommandString
    accepts safe commands`.
12. `validateVerificationRunCommandString
    rejects unsupported syntax`.

CLI:

13. `CLI: verify run --dry-run writes
    VerificationRun and reports
    executed:false`.
14. `CLI: verify run --preview is an alias for
    --dry-run`.
15. `CLI: verify run --dry-run cites
    VerificationPlan and WorkOrder in
    inputRefs`.
16. `CLI: verify run --dry-run with invalid
    plan command refuses to write
    VerificationRun`.
17. `CLI: verify run without --dry-run /
    --preview fails`.
18. `CLI: verify run --execute is refused with
    not-implemented message`.
19. `CLI: verify run without --plan fails`.
20. `CLI: verify run --dry-run human output
    includes command table and no-execution
    message`.
21. `CLI: verify record still works and
    produces a VerificationResult`.
22. `CLI: verify run --dry-run does not spawn
    processes (sentinel file is never
    created)`.
23. `CLI: artifacts validate stays clean after
    a dry-run VerificationRun`.

**Full suite results:** 1036 passed / 1 skipped
/ 0 failed (up from 1013/1/0). The single
skipped test remains the existing classic-root
dogfood regression skip.

**Build:** `tsc -b` composite build clean.

**Audits / smokes (to run before commit):**

- `audit-package-exports` (still 20 packages).
- `audit-license` (Apache-2.0 inherited).
- `publish-dry-run`.
- `install-smoke` / `install-tarball-smoke`.

**CLI smokes:**

- `rekon refresh` — unchanged.
- `rekon verify record` — unchanged.
- `rekon verify run --dry-run` (new) — writes
  `VerificationRun`, prints preview, no
  execution.
- `rekon artifacts validate` — clean.
- `rekon artifacts freshness` — recognizes
  `VerificationRun`.

## INTENTIONALLY UNTOUCHED

- `VerificationRun` artifact shape (was added
  in the previous slice).
- `VerificationResult` shape, producers, and
  CLI behavior.
- `VerificationPlan` shape and producers.
- `WorkOrder`, `ReconciliationPlan`,
  `CoherencyDelta` shapes and producers.
- The `@rekon/capability-verify` runner
  handler (still a throw-stub).
- The SDK's `runner` role, the
  `execute:verification` permission, and the
  `Runner` type (all from the previous slice).
- All existing CLI commands and their friendly
  shortcuts.
- `refresh` / `publish` / `resolve` /
  `intent` / `reconcile` / `artifacts`
  lifecycle steps.
- Permission policy.
- Snapshot freshness / staleness computation.
- Every existing capability manifest.
- Every existing publication.
- The CI pipeline.

## RISKS / FOLLOW-UP

**Risks (low):**

- The conservative tokenizer is intentionally
  simple. A real plan that uses unusual
  shell-style quoting (e.g. ANSI-C `$'...'`
  strings) will be rejected as
  `unsupported-syntax`. This is the safe
  default; if a real plan needs it, we'll add
  a wrapper convention rather than expand the
  tokenizer.
- Dry-run artifacts are written under
  `.rekon/artifacts/actions/` next to the
  future execute-path artifacts. A
  caller-visible distinction (`runner.id =
  "rekon.local.dry-run"`) is the only signal
  that the run was a preview. If we ever want
  to filter dry-runs out of publications,
  we'll add a `runMode` field to the artifact.
- The example fixture's existing
  VerificationPlan was emitted via
  `rekon intent work-order`; the same plan
  shape (`commands: string[]`) is the input
  to the dry-run validator. Future plan-shape
  changes need to update both the dry-run
  validator and the execute path.

**Follow-up (next slice):**

- **Verification runner execution v1** —
  `rekon verify run --plan <id> --execute`.
  Step 4 of the runner v1 sequence. The first
  slice that actually spawns processes; gated
  by the full safety contract (`shell: false`,
  per-command + per-plan timeouts, process-
  tree kill, bounded redacted logs, stdout /
  stderr digests, no retries, no
  auto-resolution, no source writes).
- After execution: redaction / truncation
  tests (step 5), `VerificationResult`
  derivation via `--write-result` (step 6),
  runner-produced proof in publications
  (step 7), CI / GitHub adapter (step 8,
  deferred).

## NEXT STEP

The recommended next slice is **verification
runner execution v1** —
`rekon verify run --plan <id> --execute`. Step
4 of the runner v1 sequence pinned by
[`docs/strategy/verification-runner-v1-decision.md`](../../docs/strategy/verification-runner-v1-decision.md).

That slice adds:

- The `--execute` flag (currently refused).
- Actual `child_process.spawn(argv[0],
  argv.slice(1), { shell: false, … })`
  invocations gated by the dry-run
  validation pass (so any invalid command
  still refuses execution).
- Per-command + per-plan timeout enforcement
  with `SIGTERM` → 3 s grace → `SIGKILL`
  process-tree kill.
- Bounded stdout / stderr capture with the
  redaction pattern set from
  `VERIFICATION_RUN_DRY_RUN_REDACTION_PATTERNS`.
- Full pre-redaction `stdoutDigest` /
  `stderrDigest` (SHA-256 of the entire
  stream, computed before truncation /
  redaction).
- A `VerificationRun` artifact with
  `status` = aggregate of per-command
  statuses; `commands[*].status` includes
  `passed` / `failed` / `timeout` /
  `killed` / `skipped` / `not-run`.

**`--write-result` derivation, source writes,
auto-resolution, auto-apply, and CI /
GitHub adapter remain deferred to later
slices.**
