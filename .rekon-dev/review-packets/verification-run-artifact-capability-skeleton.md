# Review Packet — VerificationRun Artifact + @rekon/capability-verify Skeleton

Steps **1–2** of the runner v1 implementation
sequence pinned by
[`docs/strategy/verification-runner-v1-decision.md`](../../docs/strategy/verification-runner-v1-decision.md).
**No command execution lands in this batch.** No
process spawn. No stdout / stderr capture. No log
redaction implementation. No
`VerificationResult` derivation. No
`rekon verify run` command. The runner handler is
intentionally a throw-stub.

## CHANGES MADE

**New artifact type (`@rekon/capability-intent`):**

- `packages/capability-intent/src/index.ts` —
  9 new public types (`VerificationRunStatus`,
  `VerificationCommandRunStatus`,
  `VerificationRunStreamExcerpt`,
  `VerificationRunCommand`,
  `VerificationRunEnvironment`,
  `VerificationRunRedaction`,
  `VerificationRunSummary`,
  `VerificationRunRunnerInfo`,
  `VerificationRun`),
  3 validation types
  (`CreateVerificationRunInput`,
  `VerificationRunValidationIssue`,
  `VerificationRunValidationResult`),
  2 status constants
  (`VERIFICATION_RUN_STATUSES`,
  `VERIFICATION_COMMAND_RUN_STATUSES`),
  and 5 helper functions
  (`createVerificationRun`,
  `summarizeVerificationRunCommands`,
  `validateVerificationRun`,
  `assertVerificationRun`,
  `validateVerificationRunStreamExcerpt`).

**New package (`@rekon/capability-verify`):**

- `packages/capability-verify/package.json` —
  declares dependencies on
  `@rekon/capability-intent`,
  `@rekon/kernel-artifacts`, and `@rekon/sdk`.
- `packages/capability-verify/tsconfig.json` —
  composite project references to
  `kernel-artifacts`, `sdk`,
  `capability-intent`.
- `packages/capability-verify/src/index.ts` —
  exports `VERIFY_CAPABILITY_ID =
  "@rekon/capability-verify"`,
  `VERIFY_CAPABILITY_VERSION = "0.1.0"`,
  re-exports VerificationRun types/helpers from
  `@rekon/capability-intent`, defines
  `verificationRunner: Runner` (throw-stub with
  id `"@rekon/capability-verify.runner"`), and
  default-exports `defineCapability(...)` with a
  manifest declaring `roles: ["runner"]`,
  `permissions: ["execute:verification",
  "read:artifacts", "write:artifacts"]`,
  `consumes: ["VerificationPlan", "WorkOrder"]`,
  `produces: ["VerificationRun",
  "VerificationResult"]`,
  `invalidatedBy:
  [{id: "verification-plan.changed", ...}]`.
- `packages/capability-verify/test/verify.test.mjs`
  — 9 package-local tests pinning the manifest,
  runner registration, throw-stub behavior, and
  exported identifiers.
- `packages/capability-verify/README.md` —
  authoring overview with `## Stability` section
  declaring the manifest + skeleton as
  `experimental` and internals as `internal`.

**SDK conformance updates (`@rekon/sdk`):**

- `packages/sdk/src/index.ts`
  - Added `"runner"` to `CapabilityRole` union
    + `VALID_ROLES` Set.
  - Added `"execute:verification"` to
    `CapabilityPermission` union +
    `VALID_PERMISSIONS` Set.
  - Added `"VerificationRun"` to
    `BUILT_IN_ARTIFACT_TYPES`.
  - New `Runner` type (id, produces, run).
  - New `registry.runner(runner)` method.
  - New `runners: Runner[]` field on
    `RegisteredCapability` and
    `CapabilityRegistrySnapshot`.
  - `ensureManifestRolesHaveHandlers`,
    `validateRegisteredCapability`, and
    `cloneRegisteredCapability` updated for the
    new role.

**Runtime update (`@rekon/runtime`):**

- `packages/runtime/src/index.ts` — added
  `VerificationRun: "actions"` to the artifact
  category map (between
  `VerificationResult: "actions"` and
  `ReconciliationPlan: "actions"`).

**Workspace integration:**

- `tsconfig.json` — added
  `{ "path": "./packages/capability-verify" }`
  to project references.
- `package-lock.json` — regenerated.

**Tests (contract suite):**

- `tests/contract/verification-run-artifact.test.mjs`
  — 9 tests.
- `tests/contract/verify-capability-skeleton.test.mjs`
  — 12 tests.

**Docs created:**

- `docs/artifacts/verification-run.md` — full
  artifact shape, validation rules, freshness
  semantics, cross-references.
- `docs/concepts/verification-runs.md` — concept
  doc with comparison table
  (`VerificationPlan` / `VerificationRun` /
  `VerificationResult`), invariants,
  cross-references.

**Docs updated:**

- `docs/concepts/verification-results.md`,
  `docs/artifacts/verification-result.md`,
  `docs/artifacts/verification-plan.md`,
  `docs/artifacts/proof-report-publication.md`,
  `docs/concepts/proof-report-publication.md` —
  added `VerificationRun` cross-references.
- `docs/extensions/authoring-capabilities.md` —
  added `runner` role description +
  `execute:verification` permission documentation
  (with the safety contract pin).
- `docs/release/public-package-boundaries.md` —
  added `@rekon/capability-verify` row;
  updated package count 19 → 20.
- `docs/strategy/verification-runner-v1-decision.md`
  — flipped steps 1–2 to ✅ Shipped.
- `docs/strategy/issue-governance-architecture-decision.md`
  — flipped step 36 to shipped with diagnostic;
  added step 37 for dry-run command;
  renumbered subsequent steps (38 =
  ObservedSystem, 39 = persistent exclusion
  lists).
- `docs/strategy/classic-behavior-roadmap.md` —
  added comprehensive new entry below the runner
  v1 decision memo entry.
- `docs/strategy/roadmap.md` — new completed-slice
  entry above the runner v1 decision memo entry.
- `CHANGELOG.md` — new top-of-`0.1.0-alpha.1`
  entry summarizing the batch.

## PUBLIC API CHANGES

**Additive only. No breaking changes.**

- **SDK:**
  - `CapabilityRole` gains `"runner"`.
  - `CapabilityPermission` gains
    `"execute:verification"`.
  - `BUILT_IN_ARTIFACT_TYPES` gains
    `"VerificationRun"`.
  - New `Runner` type:
    `{ id: string; produces: string[];
    run(input: { artifacts: ArtifactReader &
    ArtifactWriter; input?: Record<string,
    unknown> }): Promise<ArtifactRef[]> }`.
  - `CapabilityRegistry` gains
    `runner(runner: Runner): void`.
  - `RegisteredCapability` and
    `CapabilityRegistrySnapshot` gain
    `runners: Runner[]`.
- **@rekon/capability-intent:**
  - New exported types:
    `VerificationRunStatus`,
    `VerificationCommandRunStatus`,
    `VerificationRunStreamExcerpt`,
    `VerificationRunCommand`,
    `VerificationRunEnvironment`,
    `VerificationRunRedaction`,
    `VerificationRunSummary`,
    `VerificationRunRunnerInfo`,
    `VerificationRun`,
    `CreateVerificationRunInput`,
    `VerificationRunValidationIssue`,
    `VerificationRunValidationResult`.
  - New exported constants:
    `VERIFICATION_RUN_STATUSES`,
    `VERIFICATION_COMMAND_RUN_STATUSES`.
  - New exported helpers:
    `createVerificationRun`,
    `summarizeVerificationRunCommands`,
    `validateVerificationRun`,
    `assertVerificationRun`,
    `validateVerificationRunStreamExcerpt`.
- **@rekon/capability-verify** (new package):
  - Exported identifiers:
    `VERIFY_CAPABILITY_ID`,
    `VERIFY_CAPABILITY_VERSION`,
    `verificationRunner`.
  - Re-exports VerificationRun types/helpers
    from `@rekon/capability-intent` for
    convenience.
  - Default export: `defineCapability(...)`.

**No changes to:** `VerificationResult` shape,
`VerificationPlan` shape, `WorkOrder` shape,
`ReconciliationPlan` shape, `CoherencyDelta`
shape, `rekon verify record` behavior, existing
CLI commands, or any other capability manifest.

## PURPOSE PRESERVATION CHECK

Rekon's purpose is **artifact-backed codebase
intelligence with a deliberately narrow execution
surface**. This batch adds a new artifact type
and a new permission scope, but the runner that
would consume them is **not implemented**:

1. **No process spawn.** The runner handler
   throws `"@rekon/capability-verify: command
   execution is not implemented yet"` when
   invoked. No `child_process.spawn` import. No
   shell.
2. **No stdout / stderr capture.** The artifact
   type defines fields for excerpts and digests,
   but no code path reads them from a live
   process.
3. **No log redaction implementation.** Fields
   exist on the artifact; the redaction
   algorithm is deferred.
4. **No `VerificationResult` derivation.** The
   capability declares `VerificationResult` in
   `produces` (because the future runner will
   write it via `--write-result`), but no code
   path derives it.
5. **No `rekon verify run` command.** The CLI
   surface is unchanged. The manifest declares
   the role and permission so a future slice can
   wire the command without further schema
   churn.
6. **`rekon verify record` is unchanged.**
   Manual recording remains the only way to
   produce a `VerificationResult` in the alpha.
7. **Conformance does not invoke runners.** The
   SDK's `assertCapabilityConforms` deliberately
   does not iterate `runners`, preserving the
   contract that runners execute only via
   explicit operator commands.

The batch tightens the proof-loop story
(`VerificationPlan` → `VerificationRun` →
`VerificationResult`) without taking on
execution risk.

## CODEBASE-INTEL ALIGNMENT

- The artifact type lives in
  `@rekon/capability-intent`, the same package
  that owns `VerificationResult` and the
  intent-side helpers. This places the proof-loop
  artifacts together and avoids a circular
  dependency between
  `@rekon/capability-verify` and
  `@rekon/capability-intent`.
- The new permission `execute:verification` is
  **distinct from** `execute:commands` so manifest
  review sees a narrow scope. The local runtime's
  permission policy already denies high-risk
  permissions by default; the new permission
  inherits that deny-by-default posture.
- The new role `runner` is gated by manifest
  invariants (`ensureManifestRolesHaveHandlers`,
  `validateRegisteredCapability`) — a capability
  that declares the role without registering a
  handler fails conformance.
- The runtime's artifact category map routes the
  new type to `actions`, consistent with
  `VerificationResult` and
  `ReconciliationPlan`. Tests pin the routing.
- Cross-references between the new artifact /
  concept docs and the existing proof-loop docs
  preserve the "trust the artifacts" discipline
  surfaced in
  [`docs/strategy/classic-behavior-distillation.md`](../../docs/strategy/classic-behavior-distillation.md)
  and
  [`docs/strategy/classic-wins.md`](../../docs/strategy/classic-wins.md).

## VERIFICATIONRUN ARTIFACT MODEL

The artifact records **raw bounded execution
detail** so a future
`VerificationResult` derivation has citable
provenance:

```ts
type VerificationRun = {
  header: ArtifactHeader; // artifactType: "VerificationRun"
  verificationPlanRef: ArtifactRef;
  workOrderRef?: ArtifactRef;
  runner: VerificationRunRunnerInfo; // id, version
  environment: VerificationRunEnvironment;
  commands: VerificationRunCommand[]; // per-command
  summary: VerificationRunSummary; // counts
  redaction: VerificationRunRedaction; // audit
  startedAt: string;
  endedAt: string;
  durationMs: number;
};

type VerificationRunCommand = {
  commandId: string;
  argv: string[];
  status: VerificationCommandRunStatus;
  exitCode: number | null;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  stdoutDigest?: string;
  stderrDigest?: string;
  stdoutExcerpt?: VerificationRunStreamExcerpt;
  stderrExcerpt?: VerificationRunStreamExcerpt;
  timedOut: boolean;
  killed: boolean;
};

type VerificationCommandRunStatus =
  | "passed"
  | "failed"
  | "timeout"
  | "killed"
  | "skipped"
  | "not-run";
```

**Validation rules** enforced by
`validateVerificationRun`:

- `verificationPlanRef` is required.
- Each `command.status` must be a valid
  `VerificationCommandRunStatus`.
- `timeout` and `killed` are first-class statuses
  (not collapsed into `failed`).
- Stream excerpts must include `bytesIncluded` /
  `bytesTotal` / `truncated`.
- Redaction audit cites pattern matches but does
  not store the unredacted source.

**Summary semantics:** counts are bucketed by
status. `passed` does **not** subsume `failed` /
`timeout` / `killed` / `skipped` / `not-run`. The
helper `summarizeVerificationRunCommands`
returns the count of each bucket plus the total.

## CAPABILITY SKELETON

`@rekon/capability-verify` manifest:

```ts
{
  id: "@rekon/capability-verify",
  name: "Rekon Verification Runner",
  version: "0.1.0",
  roles: ["runner"],
  consumes: ["VerificationPlan", "WorkOrder"],
  produces: ["VerificationRun", "VerificationResult"],
  permissions: [
    "execute:verification",
    "read:artifacts",
    "write:artifacts",
  ],
  invalidatedBy: [
    { id: "verification-plan.changed", paths: [] },
  ],
  compatibility: { rekon: "^0.1.0" },
}
```

The `verificationRunner: Runner` is registered
during `register(registry)`:

```ts
register(registry) {
  registry.runner(verificationRunner);
}
```

Its `run()` method throws unconditionally:

```ts
async run() {
  throw new Error(
    "@rekon/capability-verify: command execution " +
      "is not implemented yet. See " +
      "docs/strategy/verification-runner-v1-decision.md " +
      "for the implementation sequence."
  );
}
```

This satisfies
`ensureManifestRolesHaveHandlers` without
spawning processes. Conformance passes; invoking
the runner raises.

## SAFETY BOUNDARY

The batch preserves every safety constraint
pinned in
[`docs/strategy/verification-runner-v1-decision.md`](../../docs/strategy/verification-runner-v1-decision.md):

- **Execution is opt-in.** Importing the
  capability does not enable execution. The
  CLI surface is unchanged (no `rekon verify run`
  command yet).
- **No execution during refresh / publish /
  resolve / intent / reconcile / artifacts.**
  None of those code paths reference the new
  capability or the new artifact type for
  execution. The runtime indexes the new artifact
  category for storage routing only.
- **No shell interpolation.** The capability's
  documented design uses
  `spawn(argv[0], argv.slice(1))` with
  `shell: false` (deferred to a later slice). The
  artifact shape carries `argv: string[]`, not a
  composed shell string.
- **No auto-resolution.** A future
  `VerificationResult` derived from a
  `VerificationRun` does not auto-resolve
  findings. The
  `FindingStatusLedger` /
  `FindingLifecycleReport` evaluator path remains
  the only resolution channel.
- **No auto-apply.** Passing verification does
  not promote `ReconciliationPlan` operations.
  The proof-report and architecture-summary
  publications already reinforce this.
- **No source writes.** The runtime permission
  policy denies `write:source` by default. The
  new permission `execute:verification` is
  narrower than `execute:commands` and applies
  only to commands listed in a named
  `VerificationPlan`.
- **Conformance does not invoke runners.** The
  SDK's conformance harness deliberately omits
  runner invocation, preserving the operator-
  explicit-command boundary.

## TESTS / VERIFICATION

**New tests (30 total):**

- `tests/contract/verification-run-artifact.test.mjs`
  (9 tests):
  1. `createVerificationRun` produces canonical
     artifact + summary.
  2. `validateVerificationRun` accepts canonical
     shape.
  3. Rejects missing `verificationPlanRef`.
  4. Rejects invalid command status.
  5. Accepts `timeout` and `killed` statuses.
  6. Registered as built-in artifact type.
  7. Runtime routes to `actions`.
  8. Artifacts validate clean.
  9. `summarizeVerificationRunCommands` counts
     each bucket.
- `tests/contract/verify-capability-skeleton.test.mjs`
  (12 tests): manifest conformance, role +
  permission boundary, README content, runner
  throw-stub behavior, SDK rejection of unknown
  roles + permissions, runner-role manifest
  acceptance and rejection (without handler).
- `packages/capability-verify/test/verify.test.mjs`
  (9 tests): package-local manifest, runner
  registration, throw-stub behavior, exported
  identifiers.

**Full suite results:** 1013 passed / 1 skipped
/ 0 failed (up from 984/1/0). The skipped test
remains the existing
classic-root dogfood regression skip.

**Build:** `tsc -b` composite build clean across
all workspace packages.

**Audits (to run before commit):**

- `audit-package-exports` — new
  `@rekon/capability-verify` row.
- `publish-dry-run` — new package in the
  publishable set.
- `audit-license` — MIT inherited from root.
- `install-smoke` /
  `install-tarball-smoke` — packed tarball
  installs and registers without execution.

**CLI smokes (to run, NO `verify run`):**

- `rekon refresh` — unchanged.
- `rekon verify record` — unchanged.
- `rekon artifacts validate` — clean against the
  new artifact type.
- `rekon artifacts freshness` — recognizes the
  new artifact type without crashing.

## INTENTIONALLY UNTOUCHED

- `VerificationResult` shape and producers.
- `VerificationPlan` shape and producers.
- `WorkOrder`, `ReconciliationPlan`,
  `CoherencyDelta` shapes and producers.
- `rekon verify record` CLI behavior.
- All existing CLI commands and their friendly
  shortcuts.
- The runtime's `refresh` / `publish` /
  `resolve` / `intent` / `reconcile` /
  `artifacts` lifecycle steps.
- The runtime's permission allow/deny policy.
- The runtime's snapshot freshness / staleness
  computation.
- Every existing capability manifest.
- Every existing publication.
- Every existing evaluator and resolver.
- The CI pipeline.

## RISKS / FOLLOW-UP

**Risks (low):**

- The new permission `execute:verification` is
  declared on a capability whose runner throws.
  Operators inspecting the manifest may be
  confused; the README and concept doc spell
  this out, and the throw error message points
  at the decision memo.
- The new artifact type's category routing
  ships ahead of any producer. The runtime
  treats it as a routable but unproduced type;
  this is consistent with the
  `IssueAdjudicationReport` introduction
  pattern.
- Build-info paths and tsconfig references can
  drift across workspace packages; the new
  `capability-verify` tsconfig mirrors
  `capability-intent`'s shape to minimize that
  risk.

**Follow-up (next slice):**

- **Verification runner dry-run command** —
  `rekon verify run --plan <id> --dry-run`. Step
  3 of the runner v1 sequence. Parses the plan,
  validates that each command's argv contains no
  shell-interpolation markers, emits a
  planned-but-not-executed `VerificationRun`,
  and prints the planned commands. **Still no
  process spawn.**
- After dry-run: opt-in execution (step 4),
  redaction / truncation tests (step 5),
  `VerificationResult` derivation via
  `--write-result` (step 6), runner-produced
  proof in publications (step 7), CI / GitHub
  adapter (step 8 — deferred, out of scope for
  local-runner v1).

## NEXT STEP

The recommended next slice is **verification
runner dry-run command** —
`rekon verify run --plan <id> --dry-run`. Step 3
of the runner v1 sequence pinned by
[`docs/strategy/verification-runner-v1-decision.md`](../../docs/strategy/verification-runner-v1-decision.md).

That slice adds:

- The `rekon verify run` CLI command with a
  `--dry-run` flag (no `--execute` flag yet).
- Plan-parsing logic that validates each
  command's argv (no shell-interpolation
  markers).
- Emission of a planned-but-not-executed
  `VerificationRun` artifact (every command
  carries `status: "not-run"`, no
  excerpts / digests).
- Tests pinning the no-execute invariant and the
  validation rules.

**Still no process spawn. Still no stdout /
stderr capture. Still no auto-resolution. Still
no auto-apply.**
