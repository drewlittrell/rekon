# Review Packet — Verification Runner v1 Decision Memo

Strategy-only batch. **No implementation lands.**
No runtime behavior changes. No CLI behavior
change. No new artifact type yet. No new capability
yet. No new CLI command yet. No `schemaVersion`
bump. No version bump. No npm publish. The memo
pins direction; the next slice implements steps
1–2 (artifact type + capability skeleton).

## CHANGES MADE

**New decision memo:**

- `docs/strategy/verification-runner-v1-decision.md`
  — full memo with the required 15 sections
  (Decision Summary, Problem, Current Rekon Proof
  Loop, Classic Workflow Guarantee, Options
  Considered, Recommendation, Artifact Model,
  Safety Contract, Permission Boundary, CLI
  Shape, Log And Secret Handling, Timeout And
  Process Model, Retry Policy, Implementation
  Sequence, What This Does Not Do, Tests
  Required For Implementation).

**Supporting docs updated:**

- `docs/concepts/verification-results.md` — new
  "Runner Direction" section + cross-reference.
- `docs/artifacts/verification-result.md` — new
  "Runner Direction" section explaining how
  derived results would cite `VerificationRun` +
  cross-reference.
- `docs/artifacts/verification-plan.md` — new
  "Runner Direction" section explaining
  `spawn` semantics + cross-reference.
- `docs/artifacts/proof-report-publication.md` —
  cross-reference added.
- `docs/concepts/proof-report-publication.md` —
  cross-reference added.
- `docs/strategy/issue-governance-architecture-decision.md`
  — new step 35 `(shipped)` documenting the
  decision in full; new step 36 reserves the
  next implementation slice (`VerificationRun`
  artifact + `@rekon/capability-verify`
  skeleton); steps 37+ shifted down.
- `docs/strategy/classic-behavior-roadmap.md` —
  new verification-runner-v1-decision entry
  below the polish-v2 entry; next-slice pointer
  updated.
- `docs/strategy/roadmap.md` — new entry.
- `README.md` — comment line under
  `verify record` pointing at the memo.
- `CHANGELOG.md` — new top-of-`0.1.0-alpha.1`
  entry.

**New docs test:**

- `tests/docs/verification-runner-v1-decision.test.mjs`
  (18 assertions) pinning the memo's structure
  and key recommendations.

**New review packet:**

- `.rekon-dev/review-packets/verification-runner-v1-decision.md`
  (this file).

## PUBLIC API CHANGES

**None.** No code changes. No type changes. No
fact-shape changes. No exported helper changes. No
`schemaVersion` bumps. No CLI flag changes. No
publication renderer changes.

## PURPOSE PRESERVATION CHECK

- **Original problem:** Rekon can plan
  verification (`VerificationPlan`), surface
  remediation context (`WorkOrder`,
  `CoherencyDelta` remediation queue), publish
  proof state (architecture summary, agent
  contract, proof report), and **record**
  outcomes via `rekon verify record` — but it
  does not execute commands. Manual recording
  preserves safety; it weakens proof
  repeatability, attribution detail, future CI /
  PR-surface readiness, and anti-gaming
  pressure.
- **Classic guarantee preserved:** classic
  codebase-intel-classic's execution / proof
  workflows connected planned work to
  verification evidence with command outcomes
  and proof state as part of the governance
  loop. The useful guarantee is **not** "run
  arbitrary shell commands" — it is **"proof is
  repeatable, attributable, and hard to fake."**
- **Rekon equivalent preserved:**
  - Proof evidence remains explicit and cited
    (`VerificationResult.commandResults` +
    `header.inputRefs`).
  - Failures remain first-class (no silent
    skips).
  - Missing / skipped commands are not treated
    as success.
  - Command execution never implies
    auto-resolution.
  - Anti-gaming guardrails remain visible.
  - Operators must opt in to execution; nothing
    runs by default. The new
    `rekon verify run --plan <id> --execute`
    surface (when implemented) is the **only**
    execution entry point.
- **Failure modes avoided:**
  - Rekon does NOT execute arbitrary
    artifact-supplied shell without an explicit
    operator action — the safety contract's
    rule 5 forbids interpolation.
  - Logs do NOT capture secrets — redaction +
    bounded excerpts + digests-over-pre-
    redaction-streams is the contract.
  - Passing command execution does NOT
    auto-resolve findings or auto-apply plans —
    safety contract rules 10 + 11.
  - Runner behavior is the same local /
    (future) CI / (future) hosted mode —
    `VerificationRun` is a shared shape.
  - Artifact shape DOES distinguish manual
    results from runner-produced results — a
    `VerificationResult` without a paired
    `VerificationRun` means "manual record"; a
    derived result cites the run in
    `header.inputRefs`.

## CODEBASE-INTEL ALIGNMENT

Aligned to:

- `services/IntentPreparationService.ts` (classic
  proof preparation surface).
- `packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`
  (classic plan execution surface — the runner
  is the future Rekon equivalent, restricted to
  verification commands only and never to
  reconciliation operations).
- `packages/product-codebase-intel/src/intent/**`
  (classic intent → plan → execution chain).
- `services/ContextHandler.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`
  (classic context / delta surfaces).

What Rekon preserves:
- proof evidence is explicit and cited;
- failures are first-class;
- missing / skipped commands are not treated as
  success;
- command execution never implies
  auto-resolution;
- anti-gaming guardrails remain visible;
- operators must opt in to execution.

What Rekon simplifies:
- local runner first; no hosted execution in v1;
- no CI / GitHub integration in v1;
- no semantic proof judge;
- no source-write apply coupling;
- no automatic retries unless explicitly
  configured.

## OPTIONS CONSIDERED

**Option A — Manual recording only.** Rekon does
not execute commands. Operators continue to run
commands outside Rekon and use
`rekon verify record`.
- Pros: safest; no command-injection risk; no
  log / secret handling burden;
  `VerificationResult` is enough.
- Cons: weaker proof repeatability; weaker CI /
  PR readiness; more operator friction; harder
  to prove what was actually run.

**Option B — Full local runner.** Rekon executes
`VerificationPlan.commands` locally by default.
- Pros: repeatable; better local product
  experience; closer to classic.
- Cons: command-injection risk; secret / log
  handling burden; environmental nondeterminism;
  operator surprise from side-effects on
  commands many users treat as analyzer-only.

**Option C — Hybrid opt-in runner.** Manual
recording stays as default; new explicit
`rekon verify run --plan <id> --execute` command
+ `@rekon/capability-verify` + `execute:
verification` permission opt in to execution.
- Pros: preserves safety by default; gives
  operators local automation when wanted;
  avoids silent execution; can expand to CI /
  PR later without re-deciding the safety
  contract.
- Cons: more implementation complexity than
  manual-only; still needs redaction +
  timeouts + process control; operators must
  understand manual vs. runner-produced
  results (the sibling-artifact model
  addresses this).

## RECOMMENDATION

**Choose Option C for alpha+.**

1. **Keep `rekon verify record` as the default
   manual path** — unchanged.
2. **Add a future
   `rekon verify run --plan <id> --execute`**
   command (deferred to the next implementation
   slice). Reads the named `VerificationPlan`,
   applies the safety contract, executes only
   `VerificationPlan.commands`, writes a
   `VerificationRun` artifact, and optionally
   derives a `VerificationResult` when invoked
   with `--write-result`.
3. **Runner lives in `@rekon/capability-verify`**,
   a new capability package declaring the new
   `execute:verification` permission.
4. **No auto-resolution. No auto-apply. No
   automatic retries in v1.**

## SAFETY CONTRACT

The 11 rules pinned in the memo:

1. No command execution during `rekon refresh`.
2. No command execution during `publish`,
   `resolve`, `intent`, `reconcile`, or
   `artifacts` commands.
3. Execution requires
   `rekon verify run --plan <id> --execute`.
4. Runner may execute only commands in the
   selected `VerificationPlan` (no
   `--allow <command>` / `--add-command` in
   v1).
5. No shell interpolation from artifact-supplied
   strings (findings, work-order titles,
   model-generated notes never reach the
   command line).
6. Prefer `spawn(argv[0], argv.slice(1))` with
   `shell: false`. The `["sh", "-c", "…"]`
   path is reserved for explicit
   operator-authored plan entries; runner emits
   a warning when used.
7. Default per-command timeout **120 s**;
   per-plan timeout **600 s**. Kill process
   tree on timeout (`SIGTERM` → 3 s grace →
   `SIGKILL`).
8. Logs are bounded (**8 KB / stream /
   command** default), redacted, and digested
   (full pre-redaction stream
   SHA-256 → `stdoutDigest` / `stderrDigest`).
9. Secrets are redacted before artifact write.
   Pattern set v1 covers env vars matching
   `TOKEN` / `SECRET` / `KEY` / `PASSWORD` /
   `PAT` / `BEARER` plus
   `Bearer …` / `Basic …` HTTP auth headers.
   High-entropy detection is deferred.
10. Passing verification does not auto-resolve
    findings.
11. Runner never applies reconciliation
    operations or writes source.

## ARTIFACT MODEL

**Recommendation: add `VerificationRun` as a
sibling artifact. Leave `VerificationResult`
unchanged.**

- `VerificationRun` = execution-focused. Per-
  command start / end / duration / argv /
  exitCode / signal / status (with new
  `timeout` / `killed` values) +
  `stdoutDigest` / `stderrDigest` + redacted
  truncated excerpts + runner id + runner
  version + environment summary + redaction
  audit + log-budget metadata.
- `VerificationResult` = proof summary
  consumed by publications and resolvers.
  Continues to use the current four-value
  status enum
  (`passed` / `failed` / `partial` / `not-run`).
  `timeout` / `killed` commands map to
  `failed` in the derived result; the run
  preserves the precise status.
- A `VerificationResult` without a paired
  `VerificationRun` means "manually recorded
  via `rekon verify record`."
- A derived `VerificationResult` cites the
  originating run + plan + work-order (when
  present) in `header.inputRefs` and sets
  `recordedBy` to the runner id+version.

Why a sibling: keeps the proof summary small,
preserves the manual path, lets future CI /
hosted runners share the same shape, fits the
`timeout` / `killed` status gap without
breaking the summary enum.

## TESTS / VERIFICATION

**Docs test added:**
`tests/docs/verification-runner-v1-decision.test.mjs`
— 18 assertions covering memo existence,
required headings, Option C recommendation,
manual-record preservation, sibling-artifact
recommendation, `VerificationResult` summary
preservation, no-execution-on-refresh,
`--execute` gating, no auto-resolution /
auto-apply, `@rekon/capability-verify`
mention, `execute:verification` permission,
log redaction, stdout/stderr digests, timeout
/ killed / process tree, no-automatic-retries-
in-v1, implementation sequence presence,
CHANGELOG mention, and review-packet
existence + `PURPOSE PRESERVATION CHECK`
section.

**Verification commands:**
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `git diff --check`
- `node scripts/audit-package-exports.mjs`
- `node scripts/publish-dry-run.mjs`
- `node scripts/audit-license.mjs`
- `node scripts/install-smoke.mjs`
- `node scripts/install-tarball-smoke.mjs`

No CLI smoke required for this docs-only batch.

## INTENTIONALLY UNTOUCHED

- `VerificationResult`,
  `VerificationCommandResult`,
  `VerificationCommandStatus`,
  `VerificationResultStatus`,
  `VerificationPlanLike`,
  `VerificationEvidenceStatus`,
  `VerificationEvidenceSummary` — no field
  changes, no enum additions. The new
  `timeout` / `killed` statuses live on the
  future `VerificationRun` artifact, not on
  the summary types.
- `recordIssueMergeDecision` and the entire
  merge-decision workflow — unchanged.
- `@rekon/capability-intent` — keeps its
  current planning / recording surface. The
  runner is a separate package.
- All graph-aware filter checks and freshness
  guardrails surfaces.
- All publication renderers (architecture
  summary, agent contract, proof report) —
  surface tweaks for runner-produced proof
  land in step 7 of the implementation
  sequence.
- All CLI subcommands and exit codes —
  unchanged.
- Existing `rekon verify record` shape and
  semantics — unchanged.
- Capability roles and templates — unchanged.
  The new `"runner"` role lands when
  `@rekon/capability-verify` ships in the
  next slice.
- `examples/**` — no example changes.

## RISKS / FOLLOW-UP

**Risks:**

- The memo defers high-entropy / Shannon-
  entropy detection. Real-repo logs may
  contain secrets in patterns the v1
  redaction set misses (UUIDs that look like
  api keys, base64 blobs, hex tokens not in
  `TOKEN`-named env vars). Mitigation: the
  next slice can extend the pattern set if
  real-repo data justifies it; the
  redaction audit field on `VerificationRun`
  surfaces how aggressive the redaction was
  so operators can spot under-redaction.
- The runner adds a new dangerous surface to
  the alpha capability set. Mitigation: the
  `execute:verification` permission is
  distinct from any other permission so
  manifest review can flag execution-capable
  installs; the `"runner"` role is distinct
  from the existing `publisher` / `resolver`
  / `projector` / `detector` roles so
  role-aware tooling can surface it.
- The two-artifact model (`VerificationRun` +
  `VerificationResult`) requires consumers
  who care about execution detail to read
  both. Mitigation: the derived
  `VerificationResult` cites the run in
  `header.inputRefs`, so a single lookup
  chain surfaces the run. Publications can
  surface the run lineage in step 7 of the
  sequence.
- Windows execution semantics
  (`taskkill /T /F`) are noted as out of
  scope for v1 unless a Windows operator
  opens an issue. POSIX-first.

**Follow-up:**

- **Next slice: `VerificationRun` artifact +
  `@rekon/capability-verify` skeleton.**
  Implements steps 1–2 of the sequence —
  type + validation + capability skeleton +
  conformance tests pinning the role +
  permission. **No execution code in that
  slice.**
- Subsequent slices: dry-run command →
  opt-in execution → redaction /
  truncation tests → `VerificationResult`
  derivation → runner-produced proof in
  publications.
- Out of scope for v1: CI / GitHub adapter,
  hosted execution, semantic proof judge,
  high-entropy detection, Windows process-
  tree kill.

## NEXT STEP

**VerificationRun artifact +
`@rekon/capability-verify` skeleton.**

Implements steps 1–2 of the implementation
sequence:

1. Define the `VerificationRun` type (next to
   the existing `VerificationResult` in
   `@rekon/capability-intent` or a new shared
   types module — implementation slice picks
   the boundary). Add JSON-schema validation
   and `assert*` helpers. Document the type
   in `docs/artifacts/verification-run.md`
   and the concept in
   `docs/concepts/verification-runs.md`.
2. Add `@rekon/capability-verify` package
   skeleton. Manifest declares
   `roles: ["runner"]`,
   `permissions: ["execute:verification",
   "artifact:read", "artifact:write"]`,
   `consumes: ["VerificationPlan",
   "WorkOrder"]`, `produces:
   ["VerificationRun",
   "VerificationResult"]`. **No execution
   code in this slice** — just the package,
   the manifest, and conformance tests
   pinning the new permission + role.

Step 3 (dry-run command) is the slice after
that. Step 4 (opt-in execution) is the
first slice that actually spawns processes
and ships the safety contract behavior.
