# Verification Runner v1 Decision

> Strategy memo only. **No implementation ships in
> this slice.** Decides whether Rekon should
> execute verification commands locally, the safety
> contract that governs execution, the artifact
> shape that records runs, the permission boundary,
> and the implementation sequence. The memo is a
> pre-implementation decision — no command
> execution code lands until the next slice picks
> this up.

## Decision Summary

**Recommendation: Option C — hybrid opt-in runner.**

> **Manual `rekon verify record` remains the default
> path for alpha+.** Operators continue to run
> commands outside Rekon and record results
> manually whenever they want zero-execution-risk
> proof capture.
>
> **A new `rekon verify run --plan <id> --execute`
> command (deferred to a later implementation slice)
> will opt in to local execution.** Execution is
> permissioned, bounded by the safety contract
> below, and never invoked by `rekon refresh`,
> publishers, resolvers, intent / reconcile flows,
> or `artifacts` commands.
>
> **A new `VerificationRun` artifact records raw
> bounded execution detail** (per-command
> start / end / duration / exitCode / status +
> timeout / killed flags + stdout / stderr digests
> + redacted truncated excerpts + runner version +
> environment summary + log-budget metadata).
> **`VerificationResult` remains the proof
> summary** consumed by publications and resolvers;
> it can be derived from a `VerificationRun` or
> recorded manually via `rekon verify record`.
>
> **No auto-resolution. No auto-apply. No automatic
> retries in v1.** Passing verification never
> resolves findings; failing verification never
> applies reconciliation operations; runner never
> writes source files.
>
> **Capability boundary:** a new
> `@rekon/capability-verify` package owns the
> runner. It declares a new
> **`execute:verification`** permission so
> manifest review and conformance tests can flag
> the danger explicitly. The existing
> `@rekon/capability-intent` package keeps its
> current planning / recording surface.

## Problem

Rekon today can plan, observe, project, evaluate,
filter, adjudicate, govern, publish, resolve, and
**record** verification results — but it does not
**execute** verification commands. Operators run
`npm run test` / `npm run build` / project-specific
verifiers outside Rekon and feed the outcome back
via `rekon verify record --result-json <json>`.

That manual loop preserves safety (no command
execution risk), but it weakens four
classic-parity guarantees:

1. **Proof repeatability.** Manual records can
   describe outcomes that don't match what
   actually ran. Two operators recording the
   same plan can disagree.
2. **Attribution detail.** `VerificationResult`
   carries `recordedBy` but no run-level
   environment / runner-version / timing
   metadata. A reviewer can't tell whether a
   command was run on a clean shell, against a
   pre-cached `node_modules`, with secrets
   present, or with operator-modified arguments.
3. **CI / PR-surface readiness.** Future PR
   checks or hosted-execution paths need a
   shared run-artifact shape. Re-inventing the
   shape at the CI boundary forces every
   integrator to re-redact / re-truncate /
   re-emit on its own.
4. **Anti-gaming pressure.** Today the only
   pressure against recording fake results is
   the `Do Not Do` reminders in the agent
   contract. A runner-produced artifact would
   carry artifact-grade evidence that an agent
   cannot easily forge.

The product decision is: **do we want a local
runner?** And if so: **what is the safety contract,
artifact model, and implementation order?**

## Current Rekon Proof Loop

Today, the proof loop looks like:

```
WorkOrder (planned action + remediation items)
  └─ VerificationPlan
       commands: ["npm run typecheck", "npm run test", …]
       successCriteria: ["…"]
       └─ (operator runs commands outside Rekon)
            └─ rekon verify record --result-json '{…}'
                 └─ VerificationResult
                      status: "passed" | "failed" | "partial" | "not-run"
                      commandResults: [
                        { command, status, exitCode?, durationMs?,
                          stdoutDigest?, stderrDigest?, notes? },
                      ]
                      summary: { total, passed, failed, skipped, notRun }
```

Key shape observations (from
[`packages/capability-intent/src/index.ts`](../../packages/capability-intent/src/index.ts)):

- `VerificationCommandStatus = "passed" | "failed" |
  "skipped" | "not-run"` — does not include
  `"timeout"` or `"killed"`.
- `VerificationResultStatus = "passed" | "failed" |
  "partial" | "not-run"` — same gap.
- `VerificationCommandResult.stdoutDigest` /
  `stderrDigest` exist but redacted excerpts and
  log-budget metadata do not.
- No `runnerVersion`, `runnerId`, `environment`
  summary, or `redactionPatterns` field.

These shapes are intentionally summary-grade.
They were designed for operator-supplied records.
Adding execution-time fields (timeout, killed,
env, log excerpts, runner identity, redaction
audit) to `VerificationResult` would bloat the
proof-summary artifact and force every
publication / resolver that currently reads it to
filter execution noise.

This is the central artifact-modeling decision:
**extend `VerificationResult` or add a sibling
`VerificationRun`?**

The recommendation below picks the sibling.

## Classic Workflow Guarantee

`codebase-intel-classic`'s execution / proof
workflows
(`services/IntentPreparationService.ts`,
`packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`,
`packages/product-codebase-intel/src/intent/**`,
`services/ContextHandler.ts`,
`packages/product-codebase-intel/src/replatform/replatform-delta.ts`)
connected planned work to verification evidence
with command outcomes and proof state as part of
the governance loop.

The useful guarantee is **not** "run arbitrary
shell commands." It is "**proof is repeatable,
attributable, and hard to fake.**"

What Rekon should preserve from that guarantee:

- Proof evidence is explicit and cited.
- Failures are first-class (no silent skips).
- Missing / skipped commands are not treated as
  success.
- Command execution never implies
  auto-resolution.
- Anti-gaming guardrails remain visible.
- Operators must opt in to execution; nothing
  runs by default.

What Rekon should simplify versus the classic
shape:

- Local runner first; no hosted execution in v1.
- No CI / GitHub integration in v1.
- No semantic proof judge.
- No source-write apply coupling.
- No automatic retries unless explicitly
  configured.

## Options Considered

### Option A — Manual recording only

Rekon does not execute commands. Operators
continue to run commands outside Rekon and use
`rekon verify record` to capture outcomes.

**Pros:**

- Safest. No command-injection risk.
- No log / secret handling burden.
- Existing `VerificationResult` path is enough.
- No new permission, no new capability, no new
  artifact type.

**Cons:**

- Weaker proof repeatability — two operators
  recording the same plan can disagree.
- Future CI / PR-surface integration requires
  external glue.
- More operator friction. Copy-pasting JSON into
  `--result-json` is awkward.
- Harder to prove what was actually run.

### Option B — Full local runner

Rekon executes `VerificationPlan.commands`
locally by default. The runner writes
`VerificationResult` (and / or a new artifact)
without operator opt-in.

**Pros:**

- Repeatable proof loop out of the box.
- Better local product experience.
- Closer to classic execution / proof loop.

**Cons:**

- Safety risk. Any command in any plan executes
  on `rekon refresh` or similar broad commands.
- Command-injection risk via plan-supplied
  strings (work-order titles, finding details,
  model-generated commands).
- Secret / log handling required immediately;
  any unredacted output lands on disk.
- Harder to make deterministic across local
  environments.
- May overfit a specific local environment
  (node version, OS, pre-cached deps).
- Operator surprise: side effects from a tool
  many users treat as "just an analyzer."

### Option C — Hybrid opt-in runner

Rekon keeps manual recording as the default. A
new explicit command runs plan commands only with
`--execute` (or an equivalent confirmation flag)
and a permission-gated capability. The new
runner writes a `VerificationRun` artifact and
can optionally derive a `VerificationResult`.

**Pros:**

- Preserves safety by default.
- Gives operators local proof automation when
  they want it.
- Avoids silent execution. Every run is
  attributable to an explicit operator command.
- Can start narrow (local, opt-in, plan-only
  commands) and expand to CI / PR later without
  re-deciding the safety contract.
- The `execute:verification` permission +
  separate `@rekon/capability-verify` package
  make the dangerous surface visible to
  manifest review and conformance tests.

**Cons:**

- More implementation complexity than
  manual-only.
- Still needs log redaction, timeouts, and
  process control.
- Operators must understand the difference
  between manual results and runner-produced
  results. (The artifact-model recommendation
  below addresses this by keeping
  `VerificationResult` summary-shaped and
  introducing `VerificationRun` as the
  execution record.)

## Recommendation

**Choose Option C for alpha+.**

1. **Keep `rekon verify record` as the default
   manual path** — unchanged shape, unchanged
   semantics, unchanged docs. Operators who
   prefer external execution get exactly today's
   behavior.
2. **Add a future `rekon verify run --plan <id>
   --execute` command** (deferred to the next
   implementation slice). The command:
   - reads the named `VerificationPlan`,
   - applies the safety contract below,
   - executes only `VerificationPlan.commands`
     (no shell-interpolated strings from
     findings, work orders, or model outputs),
   - writes a `VerificationRun` artifact, and
   - optionally derives a `VerificationResult`
     when invoked with `--write-result` (or
     equivalent).
3. **The runner lives in
   `@rekon/capability-verify`**, a new capability
   package. It declares the
   `execute:verification` permission so
   manifest / conformance tooling can flag
   execution-capable installs.
4. **No auto-resolution. No auto-apply. No
   automatic retries in v1.** Passing
   verification never resolves findings; failing
   verification never applies reconciliation
   operations; the runner never writes source
   files.

This recommendation is durable for the entire
alpha window. The next slice that picks up
implementation should treat this memo's safety
contract, artifact model, permission boundary,
log policy, and timeout policy as fixed. Changes
require a new strategy memo.

## Artifact Model

**Recommendation: add `VerificationRun` as a
sibling artifact. Leave `VerificationResult`
unchanged.**

### `VerificationRun` (new — execution detail)

```
VerificationRun {
  header: ArtifactHeader
  verificationPlanRef: ArtifactRef
  workOrderRef?: ArtifactRef
  runnerId: string                          // e.g. "@rekon/capability-verify"
  runnerVersion: string                     // package version of the runner
  startedAt: string
  completedAt: string
  durationMs: number
  status:
    | "passed" | "failed" | "partial"
    | "not-run" | "timeout" | "killed"
  environment: {
    platform: string                        // e.g. "darwin" / "linux"
    nodeVersion?: string
    cwd: string
    envKeySummary: ReadonlyArray<{
      name: string
      redacted: boolean                     // true when redaction matched
    }>
  }
  commandRuns: Array<VerificationCommandRun>
  redaction: {
    patternsApplied: ReadonlyArray<string>  // pattern ids, not the patterns themselves
    redactionCount: number                  // total occurrences redacted across logs
    maxBytesPerStream: number               // log budget
    truncated: boolean                      // true if any stream hit the budget
  }
  summary: {
    total: number
    passed: number
    failed: number
    skipped: number
    notRun: number
    timeout: number
    killed: number
  }
  verificationResultRef?: ArtifactRef       // when a derived VerificationResult was written
}

VerificationCommandRun {
  command: string
  argv: ReadonlyArray<string>               // resolved argv after parsing
  status:
    | "passed" | "failed" | "skipped"
    | "not-run" | "timeout" | "killed"
  exitCode?: number
  signal?: string                           // e.g. "SIGTERM" / "SIGKILL"
  startedAt: string
  completedAt: string
  durationMs: number
  stdoutDigest: string
  stderrDigest: string
  stdoutExcerpt?: string                    // redacted + truncated; default 8 KB max
  stderrExcerpt?: string                    // redacted + truncated; default 8 KB max
  stdoutBytes: number
  stderrBytes: number
  truncated: boolean
  notes?: string
}
```

### `VerificationResult` (unchanged — proof summary)

`VerificationResult` keeps its current shape from
[`packages/capability-intent/src/index.ts`](../../packages/capability-intent/src/index.ts):
`status`, `commandResults`, `summary`,
`evidenceNotes`, `recordedBy`, `recordedAt`,
plus the existing `verificationPlanRef` and
optional `workOrderRef`. Publications and
resolvers continue to read it.

When the runner writes a derived
`VerificationResult`, the result's
`header.inputRefs` cites the originating
`VerificationRun`, the `VerificationPlan`, and
the `WorkOrder` (when present). The `recordedBy`
field is set to `runnerId` (e.g.
`@rekon/capability-verify@0.1.0`).
`evidenceNotes` is set to a runner-emitted line
indicating the source (e.g. `"Derived from
VerificationRun:<id> by @rekon/capability-verify
@0.1.0"`).

### Why a sibling artifact

- **Keeps proof summary small.** Publications
  and resolvers read `VerificationResult` today;
  bloating it with logs / env / redaction
  metadata would force every consumer to filter
  noise.
- **Preserves the manual path.** Today's
  `rekon verify record` writes
  `VerificationResult` directly. That continues
  to work. A `VerificationResult` without a
  paired `VerificationRun` simply means "manual
  record."
- **Lets future runners share a shape.** A CI
  adapter or hosted-execution runner can emit
  the same `VerificationRun` artifact without
  changing publication consumers.
- **Status enum gap fits cleanly.** The
  `VerificationCommandStatus` enum doesn't
  include `"timeout"` / `"killed"` — fitting
  them into the proof summary would require an
  enum change; putting them in
  `VerificationRun` keeps the summary stable.

Tradeoff: two artifacts are slightly more work
than one. Mitigated by the existing
`VerificationCommandResult.stdoutDigest` /
`stderrDigest` pattern — the runner just emits a
richer per-command record on the run side and
projects the summary fields into the result on
the summary side.

## Safety Contract

The runner MUST satisfy every rule below. This is
the cross-cut contract that conformance tests for
`@rekon/capability-verify` will pin.

1. **No command execution during `rekon refresh`.**
   The refresh pipeline never invokes the runner.
   Confirmed by a conformance test that asserts
   `refresh`'s side effects do not include any
   `VerificationRun` artifact write.
2. **No command execution during `publish`,
   `resolve`, `intent`, `reconcile`, or
   `artifacts` commands.** Same conformance-test
   pattern.
3. **Execution requires a dedicated command and
   explicit operator opt-in:**
   `rekon verify run --plan <id> --execute`.
   Omitting `--execute` runs the dry-run path
   only (described in CLI Shape below).
4. **Runner may execute only commands listed in
   the selected `VerificationPlan`.** Any
   operator override flag (`--allow <command>` /
   `--add-command <command>` / etc.) is **not in
   v1**. If a future slice adds command override,
   it requires a new strategy memo.
5. **No shell interpolation from artifact-supplied
   strings.** Findings titles, work-order
   descriptions, model-generated notes, and
   evidence text are never interpolated into the
   command line. The runner parses
   `VerificationPlan.commands` once into argv
   tokens and uses `spawn(argv[0], argv.slice(1))`
   without shell wrapping. If the plan command
   requires shell semantics (`&&` / `||` /
   pipes), that command must be explicitly
   wrapped in `["sh", "-c", "<command>"]` in the
   plan, and a conformance test asserts that
   *operator-authored* shell strings are the
   only shell entry path.
6. **Prefer `spawn(argv[0], argv.slice(1))`** with
   `shell: false`. The `shell: true` path is
   reserved for explicit `["sh", "-c", "…"]`
   plan entries and surfaces a runner-side warning
   when used.
7. **Default per-command timeout: 120 seconds.**
   Default per-plan timeout: 600 seconds (10
   minutes). Both configurable via flags or
   `.rekon/config.json`. Timeout kills the
   process tree (not just the child) via
   platform-appropriate kill semantics
   (`SIGTERM` then `SIGKILL` after a 3-second
   grace).
8. **Logs are bounded, redacted, and digested.**
   - Default max excerpt per stream per command:
     8 KB.
   - Streams larger than the budget are
     truncated; `truncated: true` on the command
     run.
   - Both `stdoutDigest` and `stderrDigest` are
     computed over the full pre-truncation
     stream so consumers can detect tampering.
9. **Secrets are redacted before artifact write.**
   - Pattern set v1: env vars whose names end in
     `TOKEN`, `SECRET`, `KEY`, `PASSWORD`, `PAT`,
     `BEARER`; values appearing in
     `process.env` whose key matches the same
     pattern; the literal strings
     `Bearer <token>`, `Basic <b64>`.
   - High-entropy detection is **future work** —
     marked deferred in the implementation
     sequence below because it has too many
     false positives without tuning.
   - Redaction count + pattern ids are recorded
     on the `VerificationRun.redaction` block so
     reviewers can audit how aggressive the
     redaction was.
10. **Passing verification does not auto-resolve
    findings.** The runner never writes to
    `FindingStatusLedger`,
    `IssueMergeDecisionLedger`,
    `CoherencyDelta`, or any other governance
    artifact. The `derived VerificationResult`
    is the only write side effect beyond
    `VerificationRun`.
11. **Runner never applies reconciliation
    operations or writes source.** The
    `@rekon/capability-verify` manifest does
    **not** declare `write:source` or
    `apply:reconcile` permissions; conformance
    tests pin this.

## Permission Boundary

**New capability package: `@rekon/capability-verify`.**

```ts
defineCapability({
  manifest: {
    id: "@rekon/capability-verify",
    name: "Verification Runner",
    version: "0.1.0",
    roles: ["runner"],                       // new role label; see below
    consumes: ["VerificationPlan", "WorkOrder"],
    produces: ["VerificationRun", "VerificationResult"],
    permissions: [
      "execute:verification",                // new permission
      "artifact:read",
      "artifact:write",
    ],
    invalidatedBy: [
      {
        id: "verification-plan.changed",
        description:
          "Re-run on demand when the verification plan changes. Runner is opt-in; no automatic regeneration on refresh.",
        inputs: ["VerificationPlan"],
      },
    ],
    compatibility: { rekon: "^0.1.0" },
  },
  register(registry) {
    registry.runner(verificationRunner);     // new runner registration surface
  },
});
```

**New permission: `execute:verification`.** This
is distinct from `execute:commands` to make the
narrow scope visible:

- `execute:verification` means "this capability
  may spawn processes from `VerificationPlan`
  command lists, subject to the safety
  contract above."
- A future broader `execute:commands` would
  cover arbitrary command execution and is
  explicitly out of scope for v1.

**New capability role: `"runner"`.** Distinct
from `publisher` / `resolver` / `projector` /
`detector` so role-aware tooling surfaces the
runner as the dangerous component it is.

**Rationale for a separate capability package:**

- Separates command execution from intent
  planning. `@rekon/capability-intent` keeps its
  current planning / recording surface; the
  runner cannot import intent's writes and
  intent cannot accidentally invoke the runner.
- Lets conformance tests assert that the
  manifest permissions list flags execution
  clearly.
- Avoids bloating `@rekon/capability-intent`
  with a runner skeleton.
- Operators who don't want execution can simply
  not install the capability.

## CLI Shape

**Proposed (not implemented in this batch):**

```bash
rekon verify run --plan <id|type:id> [--execute] [--root <path>] [--json] [--write-result]
```

Optional future flags (memo lists them; the v1
implementation slice picks a minimal subset):

```bash
--timeout-ms <n>                # per-plan timeout
--command-timeout-ms <n>        # per-command timeout
--max-log-bytes <n>             # excerpt budget per stream per command
--redact <pattern>              # extend the redaction pattern set
--dry-run                       # show what would run, run nothing (default when --execute is absent)
--write-result                  # also write a derived VerificationResult
```

**Dry-run is the default when `--execute` is
absent.** It shows the resolved commands, the
policy checks the runner would apply (timeouts,
redaction patterns, max log bytes), and the
artifacts that would be written. **It runs
nothing.**

`--execute` is the explicit "run commands now"
gate. Reviewers and conformance tests can grep
for `--execute` to find every execution call
site.

`--write-result` (or equivalent) opts the runner
into emitting a derived `VerificationResult`.
When absent, only `VerificationRun` is written;
operators who want to keep manual recording for
the proof summary can still do so.

`rekon verify record` is unchanged.

## Log And Secret Handling

Memo decisions (pinned for the implementation
slice):

- **Store `stdoutDigest` and `stderrDigest`
  always.** SHA-256 of the full pre-truncation
  stream, hex-encoded.
- **Store only truncated, redacted excerpts by
  default.** Default max excerpt bytes: 8 KB per
  stream per command. Tunable via
  `--max-log-bytes`.
- **Redaction runs before writing to the
  artifact body.** No raw log bytes hit disk
  inside `.rekon/artifacts/**`.
- **Raw logs are not stored in artifact bodies
  by default.** A future slice may add a sidecar
  log option (`.rekon/logs/<runId>/<cmd>.{stdout,stderr}.log`)
  with explicit retention rules; out of scope
  for v1.

Redaction pattern set v1:

- Env vars whose names match
  `/(?:^|_)(?:TOKEN|SECRET|KEY|PASSWORD|PAT|BEARER)(?:$|_)/i`.
- The exact string values of those env vars (so
  logs that interpolated them get redacted).
- The pattern literals `Bearer <…>` and
  `Basic <base64>` in HTTP auth headers.
- The literal value of any env var listed in a
  future `.rekon/config.json`
  `verifyRunner.redactEnvVars` array
  (deferred to the implementation slice).

High-entropy / Shannon-entropy detection is
**deferred**. Pros: catches secrets not in
predictable env-var names. Cons: too many false
positives without per-project tuning; risks
clobbering legitimate hex / base64 fixtures.
Future slice can revisit if real-repo data
justifies it.

Every redaction emits an entry in
`VerificationRun.redaction.patternsApplied` (the
pattern id, not the pattern body) plus a
`redactionCount` total. Reviewers can audit
aggressiveness.

## Timeout And Process Model

- **Per-command timeout default: 120 seconds.**
  Configurable via `--command-timeout-ms`.
- **Per-plan timeout default: 600 seconds
  (10 minutes).** Configurable via
  `--timeout-ms`.
- **Kill semantics on timeout:** send `SIGTERM`
  to the process group, wait 3 seconds, then
  send `SIGKILL`. Kill the process tree (not
  just the child) via platform-appropriate
  semantics (`process.kill(-pgid, signal)` on
  POSIX; `taskkill /T /F /PID <pid>` on Windows
  if Windows support is in scope; out of scope
  for v1 unless a Windows operator opens an
  issue).
- **Command result statuses** (additions over
  the current `VerificationCommandStatus`):
  - `passed` — exit code 0 within timeout.
  - `failed` — non-zero exit within timeout.
  - `skipped` — operator-supplied skip / plan
    marker.
  - `not-run` — command never started (prior
    failure killed the run).
  - `timeout` — process was still running when
    the per-command or per-plan timeout fired.
  - `killed` — process was killed by signal not
    initiated by the runner's timeout (e.g.,
    operator `Ctrl+C` propagated; OOM kill).

The new `timeout` and `killed` statuses are part
of why `VerificationRun` is a sibling artifact
rather than an extension of `VerificationResult`
— extending the summary status enum is a
schema change with publication / resolver
fan-out. Keeping the new statuses on the run
artifact lets the summary keep its current four-
value enum stable.

When deriving a `VerificationResult` from a run
that contains `timeout` / `killed` commands, the
derivation maps:

- any `timeout` / `killed` command → `failed`
  in the summary,
- the run-level status preserved on
  `VerificationRun`.

A reviewer who wants to know whether a `failed`
result was a `timeout` or a real test failure
reads the cited `VerificationRun`.

## Retry Policy

**No automatic retries in v1.**

The runner executes each command exactly once
per `rekon verify run --execute` invocation. If
a command fails or times out, the operator
re-runs the verify command. The reason: retries
are easy to add, hard to remove cleanly, and
they hide flake. The first runner version
should give operators an honest single-pass
view of test behavior.

Future work — when a `VerificationPlan` gains a
`retryable: true` field per command, the runner
can apply a small retry budget (e.g., max 1
retry per command, max 3 retries per plan).
Adding retry support is its own strategy memo.

## Implementation Sequence

**Steps 1–2 shipped at the
`VerificationRun artifact + @rekon/capability-verify
skeleton` slice.** See
[`docs/artifacts/verification-run.md`](../artifacts/verification-run.md),
[`docs/concepts/verification-runs.md`](../concepts/verification-runs.md),
and `packages/capability-verify/`. The
`createVerificationRun`, `validateVerificationRun`,
and `assertVerificationRun` helpers live in
`@rekon/capability-intent`. The
`@rekon/capability-verify` package declares the
`"runner"` role + `execute:verification`
permission; its runner handler is a throw-stub
until step 4 lands. The SDK gained the new role +
permission + `Runner` handler type +
`registry.runner(...)` registration surface;
conformance tooling rejects unknown roles /
permissions and rejects runner-role manifests
that register no runner handler. The runtime
artifact category map routes `VerificationRun` to
`actions`. Steps 3–8 remain deferred to subsequent
slices.

Proposed sequence for downstream slices (this
memo ships none of step 3+):

1. **Add `VerificationRun` artifact type and
   docs.** ✅ Shipped.
   - Type definitions in
     `@rekon/capability-intent` (next to the
     existing `VerificationResult`) OR a new
     shared types module — implementation slice
     picks the boundary.
   - JSON schema validation / `assert*` helpers.
   - Documentation:
     `docs/artifacts/verification-run.md` and
     `docs/concepts/verification-runs.md`.
2. **Add `@rekon/capability-verify` skeleton
   with conformance tests.** ✅ Shipped.
   - Manifest with `roles: ["runner"]`,
     `permissions: ["execute:verification",
     "artifact:read", "artifact:write"]`,
     `produces: ["VerificationRun",
     "VerificationResult"]`.
   - No execution code yet — just the package,
     the manifest, and conformance tests pinning
     the new permission + role names.
3. **Add the dry-run verify command:**
   `rekon verify run --plan <id> --dry-run`.
   ✅ Shipped.
   - CLI command `rekon verify run --plan <id|type:id>
     --dry-run|--preview [--root <path>] [--json]`.
   - `createVerificationRunDryRun` helper in
     `@rekon/capability-verify` parses each plan
     command into argv and validates it against the
     safety contract (rejects shell-control
     operators, command substitution, env-assignment
     prefixes, newlines, and empty commands).
   - When every command validates, the CLI writes a
     planned-but-not-run `VerificationRun` artifact
     (`status: "not-run"`, every command
     `status: "not-run"`, runner id
     `"rekon.local.dry-run"`) and cites the
     `VerificationPlan` (and `WorkOrder` if present)
     in `header.inputRefs`.
   - When any command is invalid, the CLI refuses
     to write the artifact and reports the
     validation issues. The decision memo's
     stop-conditions hold.
   - `--execute` remains refused with a
     "not implemented yet" message.
   - `rekon verify record` behavior is unchanged.
   - **No process is spawned.** The helper does not
     import `node:child_process`. A sentinel-file
     contract test confirms dry-run never creates
     the file even when the plan contains an
     `node -e "writeFileSync(…)"` command.
   - **Writing the artifact on dry-run is
     deliberate.** The decision memo's earlier
     description said "writes no artifacts"; the
     implementation slice settled on writing a
     `not-run` `VerificationRun` because it is the
     same artifact the execute path will write
     (just with `status: "not-run"` instead of
     execution detail), keeping the artifact the
     citable preview surface and the existing
     freshness / cross-reference flow intact.
     Refusal still applies when any command is
     unsafe.
4. **Add opt-in execution:**
   `rekon verify run --plan <id> --execute`.
   Implements the safety contract above:
   `spawn`-based execution, per-command +
   per-plan timeouts, kill-tree on timeout,
   `stdoutDigest` + `stderrDigest`, truncated
   redacted excerpts, `VerificationRun`
   artifact write.
5. **Add log redaction / truncation tests.** A
   contract test seeds env vars matching the
   redaction patterns, runs a plan that echoes
   them, and asserts they are absent from the
   artifact body. Tests assert the digest is
   computed over the **pre-redaction** stream
   so digest tampering is detectable.
6. **Derive `VerificationResult` from
   `VerificationRun`.** `--write-result` flag
   on `verify run`. The derived result cites
   the run in `header.inputRefs` and sets
   `recordedBy` to the runner id+version.
7. **Surface runner-produced proof in the
   existing publications.** Architecture
   summary, agent contract, and proof report
   continue to read `VerificationResult` but
   also surface `VerificationRun` lineage
   (timeout / killed counts, runner version,
   redaction count) when present.
8. **CI / GitHub adapter.** Out of scope for
   the local-runner v1 arc; revisit only after
   steps 1–7 land and we have real-repo data
   on runner behavior.

Each step is its own commit (or small batch).
Steps 1–2 are docs / scaffolding only. Step 3
is a CLI-only dry-run. Step 4 is the first
batch that actually executes anything; the
safety contract conformance tests gate it.

## What This Does Not Do

- **Does not implement command execution.** No
  runner code lands in this batch. No
  `spawn` / `exec` / `execSync` calls. No
  new CLI surface beyond docs.
- **Does not execute commands from tests, CLI,
  artifacts, or work orders.**
- **Does not add a new CLI command.** The
  proposed `rekon verify run` is described in
  the memo; the next slice adds it.
- **Does not add a new capability.** The
  proposed `@rekon/capability-verify` is
  described; the next slice adds the package
  skeleton.
- **Does not change `VerificationResult` shape.**
- **Does not add `VerificationRun` artifact
  yet.** The next slice adds the type +
  validation.
- **Does not change `WorkOrder`,
  `VerificationPlan`, `VerificationResult`,
  `ReconciliationPlan`, or `CoherencyDelta`
  behavior.**
- **Does not add CI / GitHub integration.**
- **Does not add sandboxing implementation.**
- **Does not add source writes.**
- **Does not add watcher / daemon behavior.**

## Tests Required For Implementation

When the implementation slices land, they must
pin (across the steps in the sequence above):

1. **No-execution-on-refresh.** Conformance test
   asserts `rekon refresh` produces zero
   `VerificationRun` artifacts.
2. **No-execution-on-publish / resolve / intent
   / reconcile / artifacts.** Same pattern.
3. **`--execute` required for execution.**
   `rekon verify run --plan <id>` without
   `--execute` runs nothing and writes nothing.
4. **Plan-command-only execution.** A
   `VerificationPlan` whose commands include
   `echo foo` runs only `echo foo`; the
   runner does not interpolate any
   finding / work-order / model-generated
   strings.
5. **`spawn(argv[0], argv.slice(1))` with
   `shell: false`** for non-shell-wrapped plan
   commands. A plan that wraps in
   `["sh", "-c", "…"]` runs the shell wrapper;
   any other plan command does not.
6. **Per-command timeout fires** on a plan that
   sleeps longer than the timeout.
   `VerificationCommandRun.status === "timeout"`.
7. **Per-plan timeout fires** on a plan whose
   total runtime exceeds the plan timeout, even
   if no single command hits the per-command
   timeout.
8. **Kill-tree** — a plan that spawns a child
   process which spawns another child has the
   whole tree killed on timeout.
9. **`stdoutDigest` / `stderrDigest` computed
   over the pre-redaction stream.** A test
   seeds a known secret in the output, asserts
   the secret is redacted in the excerpt, and
   asserts the digest matches the
   non-redacted stream.
10. **Excerpt truncation** at the configured
    budget. A test produces a stream larger
    than the budget and asserts
    `truncated: true` + excerpt length ≤
    budget.
11. **Redaction patterns match the documented
    set.** A test for each pattern category
    (`TOKEN` / `SECRET` / `KEY` / `PASSWORD` /
    `PAT` / `BEARER` env vars, `Bearer …` /
    `Basic …` HTTP auth strings).
12. **No auto-resolution** — a passing
    `VerificationRun` does not mutate
    `FindingStatusLedger`,
    `IssueMergeDecisionLedger`,
    `CoherencyDelta`, or any other governance
    artifact.
13. **No auto-apply** — a passing
    `VerificationRun` does not invoke
    reconciliation operations.
14. **No source writes** — manifest conformance
    test asserts `@rekon/capability-verify`
    does not declare `write:source`.
15. **`execute:verification` permission required
    to register a runner.** Conformance test
    asserts a capability without the permission
    cannot register a runner.
16. **No automatic retries.** A failing command
    runs exactly once unless `--retry` (or
    equivalent future flag) is supplied.
17. **`VerificationResult` derivation
    correctness** — when `--write-result` is
    set, the derived result's `commandResults`
    summarizes the run; `timeout` / `killed`
    commands map to `failed`; `header.inputRefs`
    cites the run + plan + work-order (when
    present).
18. **`rekon artifacts validate` stays clean**
    across all runner scenarios.

The next-slice review packet should re-state
these requirements and tick them off as the
implementation lands.

## Cross-References

- [WorkOrder concept](../concepts/work-orders.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [VerificationResult artifact](../artifacts/verification-result.md)
- [Verification results concept](../concepts/verification-results.md)
- [Proof report publication artifact](../artifacts/proof-report-publication.md)
- [Proof report publication concept](../concepts/proof-report-publication.md)
- [Architecture summary publication artifact](../artifacts/architecture-summary-publication.md)
- [Issue governance architecture decision](issue-governance-architecture-decision.md)
- [Classic guarantees audit](classic-guarantees-audit.md)
- [Classic wins](classic-wins.md)
- [Classic alignment map](classic-alignment-map.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)
- [Roadmap](roadmap.md)
