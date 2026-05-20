# Review Packet — Verification Runner Execution v1

**Step 4** of the runner v1 implementation
sequence pinned by
[`docs/strategy/verification-runner-v1-decision.md`](../../docs/strategy/verification-runner-v1-decision.md).
**First slice that actually spawns processes.**
`rekon verify run --plan <id> --execute` now
runs validated plan commands locally and writes
a `VerificationRun` artifact with execution
detail.

What this batch does **not** do:

- No `VerificationResult` derivation
  (deferred to step 6).
- No mutation of `FindingStatusLedger`,
  `FindingLifecycleReport`, `CoherencyDelta`, or
  any reconciliation surface.
- No retries.
- No sandboxing beyond process / env / log
  controls.
- No CI / GitHub integration.
- No source writes by the runner itself.
- No `rekon verify record` behavior change.
- No `schemaVersion` bump.

## CHANGES MADE

**`@rekon/capability-verify`
(`packages/capability-verify/src/index.ts`):**

- Imported `spawn` from `node:child_process` and
  `createHash` from `node:crypto`.
- Imported `VerificationRunStatus` and
  `VerificationRunStreamExcerpt` types from
  `@rekon/capability-intent`.
- New public exports:
  - Constants
    `VERIFICATION_RUN_DEFAULT_COMMAND_TIMEOUT_MS`
    (120 000),
    `VERIFICATION_RUN_DEFAULT_PLAN_TIMEOUT_MS`
    (600 000),
    `VERIFICATION_RUN_DEFAULT_KILL_GRACE_MS`
    (3 000),
    `VERIFICATION_RUN_DEFAULT_MAX_LOG_BYTES`
    (8 192),
    `VERIFICATION_RUN_EXECUTION_RUNNER_ID =
    "rekon.local.exec"`.
  - `VERIFICATION_RUN_ENV_ALLOWLIST` (frozen
    array of permitted env-var names including
    Windows-essentials).
  - `VERIFICATION_RUN_SECRET_KEY_PATTERN`
    (regex with word-component boundaries so
    `PATH` is not matched as containing
    `PAT`).
  - `redactVerificationRunStreamText(text)`
    pure helper.
  - `buildScrubbedEnvironment(env?)`.
  - `executeVerificationRun(input, options)`
    async helper.
  - Types:
    `VerificationRunRedactionTextResult`,
    `VerificationRunExecutionOptions`,
    `VerificationRunExecutionResult`.
- Refactored
  `validateVerificationRunCommandString` to use
  a quote-aware walk
  (`checkUnquotedShellMetacharacters`) so the
  validator only flags shell metacharacters
  outside quoted regions. Backwards-compatible
  for every command shape the dry-run slice
  already accepted; fixes the `=>` false
  positive in `node -e "() => {}"`.
- Updated the package-doc comment to describe
  both dry-run and execution surfaces.

**`@rekon/cli`
(`packages/cli/src/index.ts`):**

- Added `executeVerificationRun` import.
- Restructured the
  `command === "verify" && subcommand === "run"`
  branch to handle both `--dry-run` and
  `--execute` paths. Refuses simultaneous
  `--dry-run` and `--execute`. Refuses without
  `--plan`. Refuses without `--dry-run` /
  `--preview` / `--execute`. On execute, builds
  the artifact header, calls
  `executeVerificationRun`, refuses to write
  when validation fails, writes the artifact,
  emits JSON or human-readable output, and sets
  `process.exitCode = 1` when status is
  `failed` / `timeout` / `killed`.
- Added new flag parsing for
  `--command-timeout-ms`, `--timeout-ms`,
  `--max-log-bytes`.
- Added the
  `renderVerifyRunExecuteHuman` formatter.
- Added the execute command to the usage list.

**Tests:**

- `tests/contract/verification-run-execution.test.mjs`
  (25 new tests).
- `tests/contract/verification-run-dry-run.test.mjs`
  — retired the obsolete
  "`--execute is refused with not-implemented`"
  test now that `--execute` is implemented.

**Docs (10 updated + CHANGELOG + README + review
packet):**

- `docs/concepts/verification-runs.md` —
  new "Execution (Step 4, Shipped)" subsection
  + Future Slices update.
- `docs/artifacts/verification-run.md` — new
  "Execute Behavior" section; updated
  Producers.
- `docs/strategy/verification-runner-v1-decision.md`
  — step 4 flipped to ✅ Shipped with the
  recorded implementation choices.
- `docs/concepts/verification-results.md` —
  added the dry-run + execute paragraph.
- `docs/artifacts/verification-result.md` —
  dry-run + execute paragraph; noted that
  execute does **not** write a
  `VerificationResult`.
- `docs/artifacts/verification-plan.md` —
  dry-run + execute paragraph.
- `docs/concepts/proof-report-publication.md` —
  Next Recommended Action now mentions
  `--dry-run` and `--execute`.
- `docs/artifacts/proof-report-publication.md`
  — same update.
- `docs/strategy/classic-behavior-roadmap.md`
  — flipped pointer + new shipped entry.
- `docs/strategy/roadmap.md` — new
  completed-slice entry.
- `docs/strategy/issue-governance-architecture-decision.md`
  — step 38 flipped to shipped; step 39 added
  for `VerificationResult` derivation;
  subsequent steps already renumbered in the
  previous slice.
- `README.md` — added the execute CLI line.
- `CHANGELOG.md` — new top-of-`0.1.0-alpha.1`
  entry.

## PUBLIC API CHANGES

**Additive only. No breaking changes.**

- `@rekon/capability-verify`:
  - New function `executeVerificationRun`.
  - New function `redactVerificationRunStreamText`.
  - New function `buildScrubbedEnvironment`.
  - New constants
    (`VERIFICATION_RUN_DEFAULT_*`,
    `VERIFICATION_RUN_ENV_ALLOWLIST`,
    `VERIFICATION_RUN_SECRET_KEY_PATTERN`,
    `VERIFICATION_RUN_EXECUTION_RUNNER_ID`).
  - New types
    (`VerificationRunExecutionOptions`,
    `VerificationRunExecutionResult`,
    `VerificationRunRedactionTextResult`).
  - Internal change: the dry-run command-string
    validator is now quote-aware. Every input
    accepted by the previous validator is still
    accepted; some inputs that were previously
    rejected (e.g., arrow functions inside
    double quotes) are now accepted. No
    regressions for the dry-run contract test.
- `@rekon/cli`:
  - New flags on `rekon verify run`:
    `--execute`, `--command-timeout-ms <n>`,
    `--timeout-ms <n>`, `--max-log-bytes <n>`.
  - `--dry-run` and `--preview` continue to
    work unchanged.

**No changes to:** any artifact shape, runtime,
SDK, or other capability manifest.

## PURPOSE PRESERVATION CHECK

Rekon's purpose is **artifact-backed codebase
intelligence with a deliberately narrow
execution surface**. This batch adds the first
real spawn path; every guarantee from the
decision memo holds:

1. **Execution is opt-in.** `--execute` is
   required; `--dry-run` and `--execute` are
   mutually exclusive; no other CLI command
   spawns processes.
2. **No shell.** `spawn` is called with
   `shell: false`. The argv comes from the
   dry-run validator's tokenizer; shell
   metacharacters outside quoted regions are
   rejected before any spawn.
3. **No secret leakage by name.** The env
   allowlist is small; entries matching the
   secret guard are dropped. `PATH` survives;
   `GITHUB_TOKEN`, `NPM_TOKEN`, `DATABASE_PASSWORD`,
   `MY_API_KEY`, `OAUTH_BEARER`, etc. do not.
4. **No secret leakage by value.** stdout /
   stderr are redacted first (env-assignment
   token-like, JSON secret keys, Bearer / Basic
   auth) then truncated, so a long secret near
   the truncation boundary cannot survive as
   "the second half I never saw."
5. **No unbounded logs.** Excerpts cap at
   `--max-log-bytes` (default 8 KB). Full
   pre-redaction streams are summarized via
   sha256 digests; the digest IS the
   tamper-evidence.
6. **Process lifecycle is bounded.** Per-command
   timeout sends `SIGTERM`, waits the kill
   grace, then `SIGKILL`. Per-plan timeout caps
   each command's effective timeout and marks
   unspawned commands `not-run`.
7. **No auto-resolution.** A passing run does
   **not** write to `FindingStatusLedger` or
   `FindingLifecycleReport`. A contract test
   pins this.
8. **No auto-apply.** A passing run does
   **not** write a `ReconciliationPlan` or
   apply any operation.
9. **No `VerificationResult` write.** Execute
   writes only `VerificationRun`. Derivation
   is a separate, deferred slice. A contract
   test pins this.
10. **Failures are first-class.** `timeout` and
    `killed` are first-class statuses on the
    `VerificationRun`. Failed commands keep
    running siblings (continue past failures).
    CLI exits non-zero so operator scripts see
    the failure, **and** the artifact is still
    written so the failure is citable.

## CODEBASE-INTEL ALIGNMENT

- The execute path **reuses the dry-run
  validator**, so the same set of shell-unsafe
  command strings is rejected by both paths.
  Operators can rely on the dry-run preview to
  be predictive of what `--execute` will accept.
- The runtime's existing artifact category
  routing (`VerificationRun` → `actions`) is
  unchanged; the execute path writes through
  the standard local artifact store.
- The runner identity `"rekon.local.exec"`
  distinguishes executed runs from dry-runs
  (`"rekon.local.dry-run"`) on the
  `VerificationRun.runner.id` field. Future
  publications can filter accordingly.
- The decision memo's "Failures are evidence /
  Skipped is not passed / Trust the artifacts"
  discipline is preserved: every command's
  individual status is recorded; the run
  doesn't collapse heterogeneous outcomes;
  `failed > killed > timeout > partial >
  passed > not-run` is the deterministic
  priority.

## EXECUTION SAFETY MODEL

| Concern | Behavior |
| --- | --- |
| Shell | Never. `spawn` with `shell: false`. |
| argv source | Only the dry-run tokenizer; unsafe commands refused before spawn. |
| stdin | Always `"ignore"`. |
| Working directory | The CLI's `--root` (or `process.cwd()`). |
| Environment | Scrubbed allowlist; secret-named entries dropped. |
| Network | Not policy-enforced in v1; `environment.network = "unknown"` on the artifact. |
| Per-command timeout | Default 120 s; SIGTERM → 3 s grace → SIGKILL. |
| Per-plan timeout | Default 600 s; caps each command's effective timeout; unspawned commands marked `not-run`. |
| Retries | None. |
| Continue past failures | Yes (every command runs; status recorded individually). |
| `VerificationResult` write | Never (deferred to next slice). |
| `FindingStatusLedger` mutation | Never. |
| `FindingLifecycleReport` mutation | Never. |
| `ReconciliationPlan` write | Never. |
| Source writes by the runner | Never. (Commands listed in the plan may write files; that's their job.) |
| Refusal of `--dry-run` + `--execute` | Always. |
| Refusal of `--execute` without `--plan` | Always. |
| Refusal of invalid commands | Always; no spawn happens; no artifact written. |
| CLI exit code on failure | Non-zero; artifact still written. |

## LOG / SECRET HANDLING

**Order:** `digest(full stream)` → `redact` →
`truncate to maxLogBytes`.

The digest is computed before redaction so
operators can verify integrity downstream
without trusting Rekon's redaction (the digest
covers the source bytes exactly as the spawned
process emitted them).

**Redaction patterns:**

- `env-assignment-token-like`: matches
  `\b\w*?(TOKEN|SECRET|PASSWORD|API_KEY|APIKEY|
  CREDENTIAL|COOKIE|SESSION|BEARER|PAT)=\S+`
  (case-insensitive); replaces value with
  `[REDACTED]` and preserves the key.
- `json-secret`: matches
  `"(token|secret|password|apiKey|api_key|
  authorization|auth|cookie|session)" : "…"`;
  replaces the value with `"[REDACTED]"`.
- `bearer-token`: matches
  `Bearer <token>`; replaces with
  `Bearer [REDACTED]`.
- `basic-auth`: matches `Basic <b64>`;
  replaces with `Basic [REDACTED]`.

**Truncation:** UTF-8-boundary-aware; the
helper backs off to the nearest valid
UTF-8 byte boundary so a multi-byte character
is never sliced. `stdoutExcerpt.storedBytes` /
`originalBytes` / `truncated` carry the
audit detail.

**Env-name scrubbing** is independent and runs
before spawn: `VERIFICATION_RUN_SECRET_KEY_PATTERN`
strips token-like env vars from the spawned
process's environment even if they're on the
allowlist. The pattern uses word-component
boundaries so `PATH` is not treated as
containing `PAT`.

## TIMEOUT MODEL

**Per-command:**

- Default 120 000 ms (override via
  `--command-timeout-ms` or
  `options.commandTimeoutMs`).
- At T_cmd: `child.kill("SIGTERM")`,
  `timedOut = true`.
- At T_cmd + killGraceMs (default 3 000): if
  the child is still alive,
  `child.kill("SIGKILL")`, `killed = true`.
- Status derivation:
  - `killed` if the SIGKILL fired.
  - `timeout` if SIGTERM fired but SIGKILL did
    not.
  - `failed` if `startError` was set (spawn
    failure).
  - `passed` if exitCode === 0.
  - `failed` otherwise.

**Per-plan:**

- Default 600 000 ms (override via
  `--timeout-ms` or `options.planTimeoutMs`).
- planDeadline = planStart + planTimeoutMs.
- Each command's effective timeout =
  `Math.max(1, Math.min(commandTimeoutMs,
  planDeadline - Date.now()))`.
- If `Date.now() >= planDeadline` at the start
  of an iteration, the remaining commands are
  pushed with `status: "not-run"` and
  `notes: "plan-timeout-before-start"`.

**Process-tree kill:** v1 ships single-child
kill. Process-tree kill (killing grandchildren
spawned by a plan command) is documented as
follow-up; the safety contract memo notes the
trade-off.

## ARTIFACT BEHAVIOR

**Always:**

- `artifactType` = `"VerificationRun"`.
- `runner.id` = `"rekon.local.exec"` (default;
  callers may override).
- `runner.capabilityId` =
  `"@rekon/capability-verify"`.
- `runner.version` = the package version.
- `environment.platform` / `arch` /
  `nodeVersion` come from `process`.
- `environment.envPolicy` = `"scrubbed"`.
- `environment.network` = `"unknown"`.
- `environment.shell` is absent (we never
  spawn through a shell).
- `redaction.applied` = `true`.
- `redaction.patterns` lists pattern ids that
  matched (or the full default list if no
  matches).
- `redaction.maxBytesPerStream` =
  `maxLogBytes`.
- `startedAt` / `endedAt` / `durationMs` cover
  the full plan run.
- `header.inputRefs` cites the
  `VerificationPlan` (always) and the
  `WorkOrder` (when `plan.workOrderRef` is
  set).

**Per command (when spawn happened):**

- `argv`, `status`, `exitCode`, `signal`,
  `startedAt`, `endedAt`, `durationMs`,
  `timedOut`, `killed`, `stdoutDigest`,
  `stderrDigest`, `stdoutExcerpt`,
  `stderrExcerpt`.

**Per command (when plan timeout exceeded
before start):**

- `status` = `"not-run"`, `notes` =
  `"plan-timeout-before-start"`. No digests,
  no excerpts.

**When validation refuses:** no artifact is
written.

`artifacts validate` stays clean for both
passed and failed runs.

## TESTS / VERIFICATION

**New tests
(`tests/contract/verification-run-execution.test.mjs`,
25 total):**

Helper:

1. Runs a simple node argv command; records
   `passed`.
2. Captures stdout digest, byte counts, and
   excerpt text.
3. Bounds excerpt to `maxLogBytes`;
   `truncated: true`.
4. Redacts secret-like stdout text.
5. Records `failed` for non-zero exit.
6. Records `timeout` (or `killed`) for a
   command exceeding `commandTimeoutMs`.
7. Marks commands after `planTimeoutMs` as
   `not-run`.
8. Refuses unsafe commands before spawning;
   `verificationRun.status` = `"not-run"`.
9. Refuses env-assignment prefix before
   spawning.
10. `redactVerificationRunStreamText` redacts
    known patterns.
11. `buildScrubbedEnvironment` keeps `PATH`
    and `PATHEXT`; drops `GITHUB_TOKEN`,
    `DATABASE_PASSWORD`, `NPM_TOKEN`,
    `NOT_ALLOWED`.
12. Default max log bytes matches the safety
    contract (8 192).

CLI:

13. `verify run --execute` writes
    `VerificationRun` with `executed: true`.
14. `verify run --execute` writes the artifact
    even when status is `failed` and exits
    non-zero.
15. Refuses `--dry-run` + `--execute`
    together.
16. Refuses invalid shell-control command
    before spawning.
17. Refuses env-assignment prefix before
    spawning.
18. Sentinel file from `cmd && touch
    sentinel` is never created (shell-leak
    guard).
19. Legitimate node command CAN write a
    sentinel file when listed as a single
    argv command and `--execute` is passed.
20. `verify run --dry-run` still does NOT
    spawn after `--execute` lands.
21. `verify record` behavior is unchanged.
22. Passing `--execute` does NOT mutate
    `FindingStatusLedger` or
    `FindingLifecycleReport`.
23. Passing `--execute` does NOT write a
    `VerificationResult`.
24. `artifacts validate` stays clean after
    passed `--execute` run.
25. `artifacts validate` stays clean after
    failed `--execute` run.

**Retired:** the obsolete dry-run
"`--execute is refused with not-implemented`"
assertion (the execute path is now real).

**Full suite results:** 1060 passed / 1 skipped
/ 0 failed (up from 1036/1/0).

**Build:** `tsc -b` composite build clean.

**Audits / smokes (to run before commit):**

- `audit-package-exports` (still 20
  packages).
- `audit-license`.
- `publish-dry-run`.
- `install-smoke` / `install-tarball-smoke`.

**CLI smokes:**

- `rekon refresh` — unchanged.
- `rekon verify record` — unchanged.
- `rekon verify run --dry-run` — unchanged.
- `rekon verify run --execute` (new) — runs
  the plan, writes `VerificationRun`, no
  side effects on findings.
- `rekon artifacts validate` — clean.

## INTENTIONALLY UNTOUCHED

- `VerificationRun` artifact shape (already
  shipped).
- `VerificationResult` shape and producers.
- `VerificationPlan` shape and producers.
- `WorkOrder`, `ReconciliationPlan`,
  `CoherencyDelta`, `FindingStatusLedger`,
  `FindingLifecycleReport` shapes and
  producers.
- `rekon verify record` CLI behavior.
- The SDK's `runner` role, the
  `execute:verification` permission, and the
  `Runner` type.
- All existing CLI commands and their
  friendly shortcuts.
- `refresh` / `publish` / `resolve` /
  `intent` / `reconcile` / `artifacts`
  lifecycle steps.
- Permission policy.
- Snapshot freshness / staleness computation.
- Every existing capability manifest other
  than the `@rekon/capability-verify` package
  comment.
- Every existing publication.
- The CI pipeline.

## RISKS / FOLLOW-UP

**Risks (low to medium):**

- **Process-tree kill** is not implemented in
  v1: if a plan command spawns a grandchild
  that ignores SIGTERM, the grandchild may
  outlive the SIGKILL. Documented as
  follow-up. Mitigation: `--max-log-bytes`
  caps per-stream growth from any descendant
  process; per-plan timeout still fires.
- **Network isolation** is not enforced. v1
  records `environment.network = "unknown"`
  on the artifact; the trust boundary
  remains the operator's machine. A future
  slice may add `--no-network` enforcement.
- **Redaction patterns** are deliberately
  small and deterministic. High-entropy
  detection (e.g., GitHub PAT prefixes,
  Slack tokens) is follow-up; the digest +
  the truncate-after-redact ordering
  guarantee the artifact body never carries
  unredacted matched secrets.
- **Validator drift.** The execute path
  reuses the dry-run validator, but a
  future expansion of the accepted command
  set has to be reflected in both. Tests
  pin the contract on both paths.
- **Stdout encoding.** Streams are decoded
  as UTF-8; non-UTF-8 output (e.g., a
  process emitting raw bytes) will be
  read as best-effort UTF-8. The digest
  is still over the raw bytes via
  `createHash("sha256").update(text,
  "utf8")` — a minor inconsistency. A
  follow-up can switch to digesting raw
  Buffers.

**Follow-up (next slice):**

- **`VerificationRun` →
  `VerificationResult` derivation** (step
  6). Add either a `--record-result` flag on
  `rekon verify run --execute` or a
  dedicated `rekon verify result from-run
  --run <id>` command. Map `timeout` /
  `killed` to `failed` in the derived
  result; cite the run + plan + work-order
  in `header.inputRefs`; set `recordedBy` to
  the runner id+version. Auto-resolution
  remains out of scope.
- After derivation: surface runner-produced
  proof in the architecture-summary, agent
  contract, and proof-report publications
  (step 7). CI / GitHub adapter (step 8)
  remains out of scope for local-runner v1.

## NEXT STEP

Recommended next slice: **`VerificationRun` →
`VerificationResult` derivation** (step 6 of
the runner v1 sequence pinned by
[`docs/strategy/verification-runner-v1-decision.md`](../../docs/strategy/verification-runner-v1-decision.md)).

That slice adds:

- A flag (`--record-result`) on
  `rekon verify run --execute`, or a
  dedicated `rekon verify result from-run
  --run <id>` command — operator choice.
- A derivation helper in
  `@rekon/capability-verify` that takes a
  `VerificationRun` and returns a
  `VerificationResult` with:
  - `status` ∈ `passed` / `failed` /
    `partial` / `not-run` (mapping `timeout`
    and `killed` to `failed`).
  - `commandResults[*]` summarizing each
    `VerificationRunCommand` without
    excerpts or environment detail.
  - `recordedBy` = runner id+version.
  - `header.inputRefs` citing
    `VerificationRun`, `VerificationPlan`,
    and (when present) `WorkOrder`.
- **Auto-resolution remains out of scope.**
  Findings, status ledgers, and
  reconciliation surfaces remain
  unmutated.
