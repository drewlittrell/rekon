# Verification Runs

A `VerificationRun` is the execution-detail companion to
`VerificationResult`. It says: *"this is what the
verification runner actually executed, what the
process exit codes and signals were, how long each
command took, what (redacted, bounded) output came back,
and what runner / environment produced it."*

`VerificationResult` answers "did proof pass for this
plan?" `VerificationRun` answers "what actually
happened when the plan ran?" The two are intentionally
sibling artifacts — runs carry execution noise so the
proof summary can stay small and stable for
publications and resolvers.

See:

- [VerificationRun artifact](../artifacts/verification-run.md)
  — the shape.
- [Verification runner v1 decision memo](../strategy/verification-runner-v1-decision.md)
  — why two artifacts, the safety contract, and the
  implementation sequence.

## Status Of The Runner

**`@rekon/capability-verify` ships the manifest +
skeleton + a dry-run preview today.** The package
declares the runner boundary (the new `"runner"`
role + the new `execute:verification` permission)
and exposes a runner handler stub that throws when
invoked. Command execution is still not
implemented; the dry-run preview never spawns a
process.

The artifact ships ahead of the executor so:

- Future runners (in-tree and external) target a
  stable shape.
- Conformance tests can pin "no source writes" and
  "no `apply:*` permission" on
  `@rekon/capability-verify` before any execute
  code lands.
- Operators reading manifest review or capability
  conformance output can see the dangerous
  permission ahead of time.

### Dry-Run Preview (Step 3, Shipped)

`rekon verify run --plan <id|type:id> --dry-run`
(also `--preview`) is the first CLI surface for
the runner. It:

- Resolves the named `VerificationPlan` (and the
  linked `WorkOrder` when `plan.workOrderRef` is
  set).
- Parses each plan command into a safe argv
  representation.
- Validates each command against the safety
  contract: rejects shell-control operators
  (`;`, `&&`, `||`, `|`, `<`, `>`, `<<`, `>>`,
  `&`), command substitution (`$(...)` / `` `...` ``),
  env-assignment prefixes (`NAME=value cmd`),
  newlines, and empty commands.
- Writes a `VerificationRun` artifact with
  `status: "not-run"`, every command
  `status: "not-run"`, runner id
  `"rekon.local.dry-run"`, and the plan + work
  order cited in `header.inputRefs`.
- Refuses to write the artifact when any command
  is invalid and reports the validation issues.
- Refuses `--execute` with a not-implemented
  message.

**No process is spawned.** A sentinel-file
contract test pins this: a plan containing
`node -e "writeFileSync(...)"` never creates the
file when run through `--dry-run`.

### Execution (Step 4, Shipped)

`rekon verify run --plan <id|type:id> --execute
[--command-timeout-ms <n>] [--timeout-ms <n>]
[--max-log-bytes <n>] [--root <path>] [--json]`
is now the opt-in execution surface. It:

- Reuses the dry-run command-string validator
  before spawning anything; an unsafe command in
  the plan refuses execution and writes no
  artifact.
- Spawns each command via
  `spawn(argv[0], argv.slice(1))` with
  `shell: false` and a scrubbed environment.
- Applies the per-command timeout (default 120 s)
  with SIGTERM → 3 s grace → SIGKILL. The
  per-plan timeout (default 600 s) caps each
  command's effective timeout to the remaining
  budget and marks unspawned commands `not-run`.
- Captures `stdoutDigest` / `stderrDigest`
  (sha256 of the full pre-redaction stream) plus
  bounded redacted excerpts (default 8 KB per
  stream).
- Records each command's status — including the
  new first-class `timeout` / `killed` statuses
  — and derives the run's overall status using
  the priority `failed > killed > timeout >
  partial > passed > not-run`.
- Continues running every command in plan
  order; a failure does not stop the rest.
- Does **not** write a `VerificationResult`.
  Derivation is step 6 (deferred).
- Does **not** mutate `FindingStatusLedger`,
  `FindingLifecycleReport`, `CoherencyDelta`, or
  any reconciliation surface. A passing run does
  not auto-resolve findings or apply work-order
  reconciliation.
- Exits the CLI with a non-zero status when the
  run's overall status is `failed` / `timeout` /
  `killed`; the artifact is still written.

### Derivation (Step 6, Shipped)

`rekon verify result from-run --run <id|type:id>
[--allow-not-run] [--root <path>] [--json]`
turns a completed `VerificationRun` into a
concise `VerificationResult` proof summary. It:

- Reads the source `VerificationRun` from the
  local artifact store.
- Maps each command's status (`passed → passed`;
  `failed → failed`; **`timeout → failed`**;
  **`killed → failed`**; `skipped → skipped`;
  `not-run → not-run`) and carries the
  per-command `stdoutDigest` / `stderrDigest`
  through.
- **Refuses dry-run / not-run runs by default**
  ("a dry-run is not proof"). The
  `--allow-not-run` flag overrides for rare
  cases.
- Writes a `VerificationResult` artifact citing
  the run, the plan, and the work-order in
  `header.inputRefs`. `recordedBy` is set to
  the runner identity
  (`"rekon.local.exec@0.1.0"` for the in-tree
  runner).
- **Does NOT copy redacted excerpts into the
  result.** The run remains the place to
  inspect bounded log evidence; the result
  stays concise and grep-friendly.
- **Never re-runs commands.** Never mutates
  `FindingStatusLedger`,
  `FindingLifecycleReport`, `CoherencyDelta`,
  or any reconciliation surface.

### Future Slices

Steps 7–8 surface runner-produced proof in
publications (architecture summary, agent
contract, proof report distinguishing manual
vs. runner-derived `VerificationResult`) and
add a CI / GitHub adapter (out of scope for
the local-runner v1 arc).

For now the four operator paths are:

- `rekon verify run --plan <id> --dry-run` —
  preview only, no execution.
- `rekon verify run --plan <id> --execute` —
  run the plan, capture detail (writes
  `VerificationRun` only).
- `rekon verify result from-run --run <id>` —
  derive a `VerificationResult` from a
  completed `VerificationRun`.
- `rekon verify record --plan <id>
  --result-json <json>` — manual recording
  of a `VerificationResult` (unchanged).

## How A Run Differs From A Result

| Aspect | `VerificationRun` | `VerificationResult` |
| --- | --- | --- |
| Purpose | Execution detail (what actually ran) | Proof summary (did it pass?) |
| Status enum | adds `timeout` + `killed` | stays `passed` / `failed` / `partial` / `not-run` |
| Per-command shape | argv, exitCode, signal, digests, excerpts, durations, killed/timedOut flags | command, status, exitCode?, durationMs?, digests?, notes? |
| Environment data | platform, arch, node version, shell, network policy, env policy | none |
| Redaction audit | pattern ids + match count + max bytes per stream | none |
| Runner identity | runner id + version + capability id | optional `recordedBy` string |
| Producer surface | future `@rekon/capability-verify` runner | existing `@rekon/capability-intent` factory + `rekon verify record` |
| Consumer surface (future) | architecture summary lineage panel, agent contract diagnostics, proof report run table | architecture summary, agent contract, proof report (today) |

The two artifacts can coexist on the same plan: a
runner-produced `VerificationResult` cites the
originating `VerificationRun` in `header.inputRefs`;
a manually-recorded `VerificationResult` has no
paired run. The presence or absence of the back-link
is itself the audit signal — operators can tell at a
glance whether a passing proof was runner-attested
or manually recorded.

## Proof Surfaces V2

Publications that surface verification state — the
proof report, architecture summary, and agent
contract — now classify the underlying
`VerificationResult` using a shared helper
(`summarizeVerificationProofSurface` in
`@rekon/capability-intent`) so all three surfaces
agree on:

- **Source.** `manual` (operator-recorded via
  `rekon verify record`), `runner-derived`
  (produced by `rekon verify result from-run`),
  or `unknown`. Classification looks for a
  `VerificationRun` in `header.inputRefs` first,
  then falls back to a known runner identity
  pattern in `recordedBy`
  (`rekon.local.exec@<version>`).
- **Freshness.** `fresh` when the result cites
  the latest `VerificationPlan`; `stale` when it
  cites a different plan; `missing-plan` when
  the result has no plan ref and a plan exists;
  `unknown` when no plan context is available.
- **Warnings.** `proof-failed`,
  `proof-partial`, `proof-not-run`,
  `proof-stale`, `proof-missing-plan`,
  `proof-source-unknown`, and
  `runner-run-missing` are emitted with
  machine-readable codes and human-readable
  messages.

The proof report renders a `## Verification
Proof Summary` section with the full classifier
output and per-command digest excerpts (still no
raw stdout / stderr). The architecture summary
renders a compact `## Verification Proof Status`
block. The agent contract surfaces `Proof
source` and `Proof freshness` and adds new "Do
Not Do" entries against treating stale or failed
proof as completion.

The `resolve.issue` verification trace message
now mentions the proof source and freshness too,
so resolver consumers see the same context.

**Passing proof still does not auto-resolve
findings or apply reconciliation.** The
publications are projections; the surfaces
behind them
(`FindingStatusLedger`,
`FindingLifecycleReport`,
`ReconciliationPlan`) remain unchanged.

## Boundary Reminders

Even though the runner is not implemented yet, the
boundary the artifact + capability declare is real:

- **No command execution on `rekon refresh`** —
  the runner is invoked only by an explicit operator
  command.
- **No shell interpolation from artifact-supplied
  strings** — finding titles, work-order
  descriptions, and model-generated notes never
  reach the command line. The runner will use
  `spawn(argv[0], argv.slice(1))` with
  `shell: false`.
- **No auto-resolution, no auto-apply** — a passing
  run never writes to `FindingStatusLedger`,
  `IssueMergeDecisionLedger`, `CoherencyDelta`, or
  reconciliation surfaces.
- **No source writes** — `@rekon/capability-verify`
  does not declare `write:source`; conformance
  tests pin this.

## CI / GitHub Direction

The runner remains **local-first** in alpha.
The
[verification runner CI / GitHub adapter
decision memo](../strategy/verification-runner-ci-github-decision.md)
pins the staged direction: alpha will ship a
documented **GitHub Actions workflow
template** (no GitHub API writes;
`permissions: contents: read`; no secrets;
no `pull_request_target`); a first-party
**GitHub Check / PR comment publisher** is
deferred to beta. Two invariants apply
regardless of which slice ships next:

- **GitHub status is not canonical truth.**
  Rekon artifacts remain canonical.
- **Forked PRs must not receive
  secret-bearing execution by default.**

No CI / GitHub code ships in alpha. The
workflow-template slice has shipped: see
[`docs/examples/workflows/rekon-verification.yml`](../examples/workflows/rekon-verification.yml)
and the operator guide at
[`docs/examples/github-actions-verification-runner.md`](../examples/github-actions-verification-runner.md).
The template is copyable, **not** installed
under `.github/workflows/` of the Rekon repo
itself. It requests only
`permissions: contents: read`, declares no
secrets, refuses `pull_request_target`, runs
the existing CLI proof loop end-to-end, and
uploads `.rekon/artifacts` (with `.log`
files excluded) as a workflow artifact with
`retention-days: 7`. No GitHub API writes.

The template uses the read-only
`rekon artifacts latest --type <type>
[--kind <kind>] [--id-only]
[--allow-missing]` helper to resolve the
latest `VerificationPlan` /
`VerificationRun` / proof-report
`Publication` ids without inline scripting.
The helper is pure: it reads the local
artifact index and (for Publication kind
lookups) artifact bodies, and writes
nothing.

A **dry-run variant** lives at
[`docs/examples/workflows/rekon-verification-dry-run.yml`](../examples/workflows/rekon-verification-dry-run.yml).
It runs `rekon verify run --dry-run`
instead of `--execute`, so the runner
spawns **zero** plan commands. The operator
guide recommends copying the dry-run
template first to validate the
artifact-upload + job-summary plumbing
before the execute variant runs real
commands. See
[`docs/examples/github-actions-verification-runner.md`](../examples/github-actions-verification-runner.md).

A **read-only workflow validator** lives at
`rekon verify github-workflow validate
--path <workflow.yml> [--json]`. It is
pure static text analysis: no YAML parser
dependency, no GitHub API calls, no
spawn / exec, no filesystem writes. It
checks copied workflow templates against
the alpha safety contract (no
`pull_request_target`; no GitHub write
permissions; `permissions: contents: read`;
no GitHub API calls; uses
`rekon artifacts latest`; uploads
`.rekon/artifacts/**` excluding `.log`;
appends to `$GITHUB_STEP_SUMMARY`; mode
resolvable to `execute` or `dry-run`) and
emits warnings for soft checks
(canonical-truth reminder presence,
`retention-days` declared). Both bundled
templates pass with zero errors / zero
warnings. See the "Validate a copied
workflow" section in
[`docs/examples/github-actions-verification-runner.md`](../examples/github-actions-verification-runner.md).

A **gated GitHub Check publisher skeleton**
lives in `@rekon/capability-docs`:
`buildGitHubCheckPayload(...)` builds the
GitHub Check payload (name, conclusion,
output.title / summary, externalId,
citedRefs) from artifact-like inputs, and
`assessGitHubCheckPublisherReadiness(...)`
returns `{ ready, issues[] }` after
evaluating opt-in env vars
(`REKON_GITHUB_CHECKS`, `GITHUB_TOKEN`,
`GITHUB_REPOSITORY`, head SHA), event
trust (`workflow_dispatch` / `push` /
same-repo `pull_request` trusted; forked
`pull_request` untrusted by default;
`pull_request_target` refused
unconditionally), and an explicit
`writePermissionConfirmed` flag. **The
skeleton never calls the GitHub API and
imports no network client.** The payload
always cites the underlying artifact ids
(VerificationResult, VerificationRun,
proof report, architecture summary,
agent contract) and always includes the
phrase
`GitHub status is not canonical truth;
Rekon artifacts remain canonical.` See
[`docs/strategy/verification-runner-github-check-publisher-decision.md`](../strategy/verification-runner-github-check-publisher-decision.md).

A separate **opt-in workflow template**
lives at
[`docs/examples/workflows/rekon-verification-check-send.yml`](../examples/workflows/rekon-verification-check-send.yml).
It is the first Rekon workflow template
that opts into a GitHub write surface
(`checks: write`) and wires
`rekon publish github-check --send`. The
read-only execute and dry-run templates
remain unchanged. The workflow validator
gained a `--profile read-only |
github-check-send` flag; the
`github-check-send` profile permits
`checks: write` and enforces the
opt-in template's full safety contract
(no `pull_request_target`, no
`pull_request` trigger, explicit Rekon
opt-in env, `--confirm-checks-write`
flag, ...). The bundled read-only
templates still validate clean under
`--profile read-only`.

## Cross-References

- [VerificationRun artifact](../artifacts/verification-run.md)
- [VerificationResult artifact](../artifacts/verification-result.md)
- [Verification results concept](verification-results.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [Verification runner v1 decision](../strategy/verification-runner-v1-decision.md)
- [Verification runner CI / GitHub adapter decision](../strategy/verification-runner-ci-github-decision.md)
- [Verification runner GitHub Check publisher decision](../strategy/verification-runner-github-check-publisher-decision.md)
- [GitHub Check publisher send workflow safety review](../strategy/github-check-publisher-send-workflow-safety-review.md)
- [PR comment publisher decision](../strategy/pr-comment-publisher-decision.md)
- [GitHub Actions workflow template guide](../examples/github-actions-verification-runner.md)
- [Opt-in GitHub Check send workflow template](../examples/workflows/rekon-verification-check-send.yml)
- [Capability model](../strategy/capability-model.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
