# Review Packet — VerificationRun → VerificationResult Derivation

**Step 6** of the runner v1 implementation
sequence pinned by
[`docs/strategy/verification-runner-v1-decision.md`](../../docs/strategy/verification-runner-v1-decision.md).
**Derivation is pure** — no spawn, no source
reads, no rerun of commands, no mutation of
governance surfaces. The new CLI command
`rekon verify result from-run --run <id>`
converts a completed `VerificationRun` into a
concise `VerificationResult` proof summary
consumed by the proof report, architecture
summary, and resolvers.

What this batch does **not** do:

- No spawn / no rerun of commands.
- No mutation of `FindingStatusLedger`,
  `FindingLifecycleReport`,
  `CoherencyDelta`, or any reconciliation
  surface.
- No `--record-result` flag on
  `verify run --execute` (the implementation
  slice deliberately chose a dedicated
  command to keep operator intent visible).
- No copy of raw stdout / stderr excerpts
  into the `VerificationResult` body.
- No `schemaVersion` bump on
  `VerificationResult` or `VerificationRun`.
- No `verify record` behavior change.
- No `verify run --dry-run` / `--execute`
  behavior change.

## CHANGES MADE

**`@rekon/capability-verify`
(`packages/capability-verify/src/index.ts`):**

- Imported `VerificationCommandResult`,
  `VerificationResult`,
  `VerificationResultStatus`, and
  `createVerificationResult` from
  `@rekon/capability-intent`.
- New public exports:
  - `deriveVerificationResultFromRun(input,
    options)`.
  - Types:
    `DeriveVerificationResultFromRunInput`,
    `DeriveVerificationResultFromRunResult`,
    `DeriveVerificationResultFromRunOptions`.
  - Re-exports of
    `VerificationCommandResult`,
    `VerificationResult`,
    `VerificationResultStatus`, and
    `createVerificationResult` from
    `@rekon/capability-intent`.
- Updated the package-doc comment to
  describe the four public surfaces
  (dry-run, execute, derive, runner stub).

**`@rekon/cli`
(`packages/cli/src/index.ts`):**

- Added `deriveVerificationResultFromRun`
  import + `VerificationRunArtifact` type
  alias from `@rekon/capability-verify`.
- Added the
  `command === "verify" && subcommand ===
  "result" && positional === "from-run"`
  branch. Resolves the source
  `VerificationRun` via the new helper
  `resolveVerificationRunEntry`, reads the
  paired `VerificationPlan` (when present),
  calls
  `deriveVerificationResultFromRun`,
  writes the artifact to the `actions`
  category, and emits JSON or
  human-readable output.
- Added flag parsing for `--run` and
  `--allow-not-run`.
- New helper `resolveVerificationRunEntry`
  to look up the named run by id (or
  `type:id`).
- New formatter `renderVerifyResultFromRunHuman`.
- Added the new command to the usage list.

**Tests:**

- `tests/contract/verification-result-from-run.test.mjs`
  (24 new tests).

**Docs (9 updated + CHANGELOG + README +
review packet):**

- `docs/concepts/verification-runs.md` —
  new "Derivation (Step 6, Shipped)"
  section + Future Slices update; new
  operator-paths list.
- `docs/artifacts/verification-run.md` —
  rewrote the "Deriving VerificationResult"
  section to describe the shipped CLI.
- `docs/strategy/verification-runner-v1-decision.md`
  — step 6 flipped to ✅ Shipped with the
  recorded implementation choices.
- `docs/concepts/verification-results.md`
  — added the derivation paragraph.
- `docs/artifacts/verification-result.md`
  — expanded Runner Direction with the
  derivation contract.
- `docs/artifacts/verification-plan.md`
  — replaced the "next slice" note with
  the shipped derivation note.
- `docs/concepts/proof-report-publication.md`
  — updated the Next Recommended Action
  to mention the derivation command.
- `docs/artifacts/proof-report-publication.md`
  — same update.
- `docs/strategy/classic-behavior-roadmap.md`
  — flipped pointer + new shipped entry.
- `docs/strategy/roadmap.md` — new
  completed-slice entry.
- `docs/strategy/issue-governance-architecture-decision.md`
  — step 39 flipped to shipped; step 40
  added for proof surfaces v2;
  subsequent steps renumbered.
- `README.md` — added the new CLI line.
- `CHANGELOG.md` — new top-of-
  `0.1.0-alpha.1` entry.

## PUBLIC API CHANGES

**Additive only. No breaking changes.**

- `@rekon/capability-verify`:
  - New function
    `deriveVerificationResultFromRun(input,
    options)`.
  - New exported types
    (`DeriveVerificationResultFromRunInput`,
    `DeriveVerificationResultFromRunResult`,
    `DeriveVerificationResultFromRunOptions`).
  - Additional re-exports from
    `@rekon/capability-intent` for caller
    convenience.
- `@rekon/cli`:
  - New subcommand
    `rekon verify result from-run`.
    Required flag: `--run <id|type:id>`.
    Optional flags: `--allow-not-run`,
    `--root`, `--json`.

**No changes to:**
`VerificationResult` shape,
`VerificationRun` shape, the runtime,
the SDK, or any other capability.

## PURPOSE PRESERVATION CHECK

Rekon's purpose is **artifact-backed
codebase intelligence with a deliberately
narrow execution surface**. This batch adds
a pure derivation step; every guarantee
from the decision memo holds:

1. **No execution.** The helper does not
   import `node:child_process` and does not
   call any spawn-related API. A contract
   test pins that re-running the existing
   `--execute` path is not triggered.
2. **No rerun.** The helper reads the
   source `VerificationRun` and copies
   already-recorded command status,
   digests, and timing data. Commands are
   not re-executed.
3. **No `VerificationResult` for a
   dry-run.** The helper throws by default
   when the source run has
   `status: "not-run"`. The CLI returns a
   non-zero exit and an explicit error
   message. `--allow-not-run` overrides for
   the rare case where shaping a not-run
   result is useful.
4. **No leak of raw stdout / stderr.** The
   helper does not copy
   `stdoutExcerpt` / `stderrExcerpt` into
   `VerificationResult.commandResults`. A
   contract test seeds a unique marker
   ("zyxwv") in the spawned stdout and
   asserts it never appears in the
   serialized `VerificationResult` body.
5. **No mutation of governance surfaces.**
   The CLI writes only the new
   `VerificationResult`. Contract tests
   pin that `FindingStatusLedger`,
   `FindingLifecycleReport`, and
   `ReconciliationPlan` counts are
   unchanged.
6. **Failures stay failures.** `timeout`
   and `killed` map to `failed` in the
   derived result — they are NOT collapsed
   into `partial` or `not-run`. The source
   run keeps them first-class as evidence.
7. **Citation discipline.** The derived
   result cites the `VerificationRun`
   (always), the `VerificationPlan`
   (always), and the `WorkOrder` (when
   present) in `header.inputRefs`.

## CODEBASE-INTEL ALIGNMENT

- The derivation reuses
  `createVerificationResult` from
  `@rekon/capability-intent` (which already
  produces operator-recorded results), so
  the proof-summary shape is identical
  whether the result came from
  `verify record` or `verify result
  from-run`.
- The implementation slice chose a
  dedicated command over a flag on
  `verify run` so the operator's intent
  (execute vs. derive) shows up
  unambiguously in shell history and CI
  logs. Two commands run in sequence are
  easier to read than a long flag
  combination.
- The `recordedBy` field carries the
  runner identity
  (`"rekon.local.exec@0.1.0"` for the
  in-tree runner) so downstream surfaces
  can distinguish manual vs. runner-derived
  results without a schema change. Future
  proof surfaces v2 will surface this
  distinction in the architecture
  summary and proof report.
- The result's
  `header.provenance.notes` flag the
  derivation as runner-derived, preserving
  the "Failures are evidence / Trust the
  artifacts" discipline of the classic
  proof loop.

## DERIVATION MODEL

```ts
const { verificationResult, warnings } =
  deriveVerificationResultFromRun(
    {
      verificationRun,         // required
      verificationRunRef,      // required
      verificationPlan,        // optional; falls back to run.header
      verificationPlanRef,     // optional; falls back to run.verificationPlanRef
      workOrderRef,            // optional; falls back to run.workOrderRef
    },
    {
      generatedAt,             // optional (mainly for tests)
      allowNotRun,             // optional; default false
      evidenceNotes,           // optional extra notes
    },
  );
```

The helper is **pure**:

- Reads no files (the caller passes the
  run + plan in).
- Spawns no processes.
- Mutates no external state.
- Returns a `VerificationResult` value;
  the CLI writes it to disk.

## STATUS MAPPING

| `VerificationRun` command status | `VerificationResult` command status |
| --- | --- |
| `passed` | `passed` |
| `failed` | `failed` |
| `timeout` | `failed` (note: "Command timed out (mapped to failed).") |
| `killed` | `failed` (note: "Command was killed (mapped to failed).") |
| `skipped` | `skipped` (note: "Command was skipped by the runner.") |
| `not-run` | `not-run` (note explains plan-timeout or generic not-run) |

Overall result status uses the existing
`createVerificationResult` rule:

| Condition | Result status |
| --- | --- |
| Any command `failed` (or mapped to it) | `failed` |
| All commands `passed` (total > 0) | `passed` |
| Mix of `passed` + `skipped` / `not-run` (no failures) | `partial` |
| All `not-run` or total = 0 | `not-run` |

Run-level status is **not** used directly
in the result status — the per-command
mapping plus the existing summary helper
do the work, which guarantees a `timeout`
or `killed` command always yields a
`failed` result.

## CLI BEHAVIOR

```sh
rekon verify result from-run \
  --run <id|type:id> \
  [--allow-not-run] \
  [--root <path>] \
  [--json]
```

- Requires `--run`. Refuses without it.
- Reads the named `VerificationRun` from
  the local artifact store.
- Reads the run's `verificationPlanRef`
  (and the linked plan's `workOrderRef`)
  to cite them in
  `header.inputRefs`.
- Refuses dry-run / not-run runs by
  default — error message:
  `"rekon verify result from-run refused:
  VerificationRun status is not-run; dry-
  run artifacts cannot be converted to
  VerificationResult. Pass `allowNotRun:
  true` to override."`. Non-zero exit; no
  artifact written.
- On success, writes a
  `VerificationResult` artifact to the
  `actions` category.
- JSON output:
  `{ derivedFromRun: true, artifact,
  verificationResult, runRef, planRef,
  workOrderRef, warnings, message }`.
- Human-readable output (no `--json`)
  renders a header, a per-command status
  table, and the "No findings were
  auto-resolved." line.

## PROOF SURFACE

The proof report and architecture summary
already consume `VerificationResult`. A
contract test confirms that after running
`rekon verify run --execute` followed by
`rekon verify result from-run`, the
proof-report publication cites
`VerificationResult` in `header.inputRefs`.

The next slice (verification proof surfaces
v2) will:

- Distinguish manual vs. runner-derived
  results in the proof report.
- Surface `timeout` / `killed` evidence
  from the linked `VerificationRun`.
- Flag stale proof when the source
  `VerificationPlan` has been
  superseded.

## TESTS / VERIFICATION

**New tests
(`tests/contract/verification-result-from-run.test.mjs`,
24 total):**

Helper:

1. Passed run maps to passed result.
2. Failed command maps to failed result.
3. Timeout command maps to failed result.
4. Killed command maps to failed result.
5. Skipped / not-run mixed with passed
   map to `partial`.
6. All not-run commands map to `not-run`
   when `allowNotRun: true` is set.
7. Refuses dry-run / not-run runs by
   default (throws).
8. `inputRefs` include
   `VerificationRun`,
   `VerificationPlan`, and
   `WorkOrder`.
9. Omits excerpts but keeps stdout /
   stderr digests.
10. `recordedBy` uses the runner id +
    version.

CLI:

11. `verify result from-run` writes a
    `VerificationResult` for a completed
    passed run.
12. Same for a completed failed run.
13. Refuses a dry-run `VerificationRun`
    by default.
14. Requires `--run`.
15. Derived `VerificationResult` cites
    the run + plan in `inputRefs`.
16. Derived `VerificationResult` body
    does NOT include stdout / stderr
    excerpts (sentinel marker
    `"zyxwv"` never appears in the
    serialized body).
17. Derived `VerificationResult`
    includes stdout / stderr digests.
18. Deriving result does NOT mutate
    `FindingStatusLedger` or
    `FindingLifecycleReport`.
19. Deriving result does NOT auto-apply
    reconciliation (no new
    `ReconciliationPlan`).
20. Proof report can consume the
    derived `VerificationResult`.
21. Existing `verify record` behavior
    unchanged.
22. Existing `verify run --dry-run`
    behavior unchanged.
23. Existing `verify run --execute`
    behavior unchanged (still writes
    `VerificationRun` only).
24. `artifacts validate` stays clean
    after deriving a result.

**Full suite results:** 1084 passed / 1
skipped / 0 failed (up from 1060/1/0).

**Build:** `tsc -b` composite build clean.

**Audits / smokes (to run before commit):**

- `audit-package-exports` (still 20
  packages).
- `audit-license`.
- `publish-dry-run`.
- `install-smoke` /
  `install-tarball-smoke`.

**CLI smokes:**

- `rekon refresh` — unchanged.
- `rekon verify record` — unchanged.
- `rekon verify run --dry-run` — unchanged.
- `rekon verify run --execute` — unchanged.
- `rekon verify result from-run` (new) —
  derives result, writes it, no side
  effects on findings.
- `rekon publish proof` — consumes derived
  result.
- `rekon artifacts validate` — clean.

## INTENTIONALLY UNTOUCHED

- `VerificationRun` artifact shape.
- `VerificationResult` artifact shape.
- `VerificationPlan` shape and producers.
- `WorkOrder`, `ReconciliationPlan`,
  `CoherencyDelta`, `FindingStatusLedger`,
  `FindingLifecycleReport` shapes and
  producers.
- `rekon verify record` CLI behavior.
- `rekon verify run --dry-run` /
  `--execute` CLI behavior (no
  `--record-result` flag added).
- The SDK's `runner` role, the
  `execute:verification` permission, and
  the `Runner` type.
- The runtime's artifact category routing,
  permission policy, snapshot freshness.
- Every existing capability manifest.
- Every existing publication.
- The CI pipeline.

## RISKS / FOLLOW-UP

**Risks (low):**

- **Multiple derivations from the same
  run** are not prevented. An operator can
  re-run `verify result from-run` and get
  a new `VerificationResult` artifact each
  time. The artifact ids are timestamped
  so they don't collide, but downstream
  surfaces should pick the newest by
  default. (The proof-report publisher
  already does this for
  `VerificationResult`.)
- **`allowNotRun` is documented but not
  exposed in the proof report**. Operators
  who use it should know that the result
  will say `not-run` and the proof
  surfaces will treat it as "verification
  is not complete." No mitigation needed.
- **Plan / run mismatch is possible** —
  if the operator manually rewrites a
  plan's commands between `--execute` and
  `from-run`, the derived result will
  align command results against the
  current plan's command list. The
  default behavior (using
  `createVerificationResult`'s alignment
  logic) treats unrecognized commands as
  trailing entries. This matches the
  `verify record` path.

**Follow-up (next slice):**

- **Verification proof surfaces v2** —
  make the architecture summary, agent
  contract, and proof report distinguish
  manual vs. runner-derived
  `VerificationResult` (via `recordedBy`
  or a new derived-from-run check), call
  out `failed` / `timeout` / `killed`
  proof, and flag stale proof when the
  linked `VerificationPlan` has been
  superseded. Still no auto-resolution
  or auto-apply.

## NEXT STEP

Recommended next slice: **verification
proof surfaces v2**. Update publications to
distinguish manual vs. runner-derived
`VerificationResult`, surface
`failed` / `timeout` / `killed` proof
prominently, and flag stale proof. Step
7 of the runner v1 sequence pinned by
[`docs/strategy/verification-runner-v1-decision.md`](../../docs/strategy/verification-runner-v1-decision.md).

Auto-resolution remains out of scope.
