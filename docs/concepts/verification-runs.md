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

### Future Slices

Step 4 adds opt-in execution
(`rekon verify run --plan <id> --execute`) that
implements the full safety contract and updates
the same `VerificationRun` artifact with
execution detail. Until that slice lands, use
either `rekon verify run --plan <id> --dry-run`
(preview) or the existing
`rekon verify record --result-json <json>`
(manual recording).

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

## Cross-References

- [VerificationRun artifact](../artifacts/verification-run.md)
- [VerificationResult artifact](../artifacts/verification-result.md)
- [Verification results concept](verification-results.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [Verification runner v1 decision](../strategy/verification-runner-v1-decision.md)
- [Capability model](../strategy/capability-model.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
