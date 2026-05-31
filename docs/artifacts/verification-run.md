# VerificationRun

## Purpose

`VerificationRun` records the **raw bounded execution
detail** of a verification command list. It is the
sibling artifact to `VerificationResult`: `VerificationRun`
carries per-command argv, status (including `timeout` and
`killed`), digests, redacted truncated excerpts, runner
identity, environment summary, and redaction audit, while
`VerificationResult` remains the concise proof summary
consumed by publications and resolvers.

The shape is pinned by the
[verification runner v1 decision memo](../strategy/verification-runner-v1-decision.md).
The type lives in `@rekon/capability-intent` (next to
`VerificationResult`); the future
`@rekon/capability-verify` runner writes the artifact
when opt-in execution lands. **In this slice no command
execution exists yet** — the artifact + validators ship
so the boundary is durable before any executor code is
written.

## Shape

```ts
export type VerificationRunStatus =
  | "passed"
  | "failed"
  | "partial"
  | "timeout"
  | "killed"
  | "not-run";

export type VerificationCommandRunStatus =
  | "passed"
  | "failed"
  | "skipped"
  | "not-run"
  | "timeout"
  | "killed";

export type VerificationRun = {
  header: ArtifactHeader;
  status: VerificationRunStatus;
  verificationPlanRef: ArtifactRef;
  workOrderRef?: ArtifactRef;
  verificationResultRef?: ArtifactRef;
  commands: VerificationRunCommand[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    notRun: number;
    timeout: number;
    killed: number;
  };
  runner: {
    id: string;
    version?: string;
    capabilityId?: string;
  };
  environment?: {
    platform?: string;
    arch?: string;
    nodeVersion?: string;
    shell?: string;
    network?: "unknown" | "disabled" | "enabled";
    envPolicy?: "scrubbed" | "inherited" | "custom";
  };
  redaction?: {
    applied: boolean;
    patterns: string[];     // pattern ids, not the patterns themselves
    redactedMatches?: number;
    maxBytesPerStream?: number;
  };
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
};

export type VerificationRunCommand = {
  id: string;
  command: string;
  argv: string[];
  cwd?: string;
  status: VerificationCommandRunStatus;
  exitCode?: number | null;
  signal?: string | null;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  timedOut?: boolean;
  killed?: boolean;
  stdoutDigest?: string;            // SHA-256 of pre-redaction stream
  stderrDigest?: string;            // SHA-256 of pre-redaction stream
  stdoutExcerpt?: VerificationRunStreamExcerpt;
  stderrExcerpt?: VerificationRunStreamExcerpt;
  notes?: string;
};

export type VerificationRunStreamExcerpt = {
  text: string;
  redacted: boolean;
  truncated: boolean;
  originalBytes?: number;
  storedBytes?: number;
};
```

The summary block adds two counters
(`timeout`, `killed`) that the `VerificationResult`
summary deliberately does not carry — runs preserve the
precise status while results map both to `failed` in the
derived proof summary (see "Deriving VerificationResult"
below).

## Required Header Fields

`header.artifactType` is `"VerificationRun"`.
`header.inputRefs` MUST cite the originating
`VerificationPlan`. It MUST also cite the associated
`WorkOrder` when present. When the runner derives a
`VerificationResult` from the run, the result's
`header.inputRefs` cites the run; conversely, a run
that points back to a derived result populates
`verificationResultRef`.

## Producers

- **`@rekon/capability-verify` (dry-run + execute,
  today).** Two helpers:
  - `createVerificationRunDryRun` builds a
    planned-but-not-run `VerificationRun`.
    Triggered by
    `rekon verify run --plan <id> --dry-run`.
    Never spawns a process.
  - `executeVerificationRun` actually runs the
    plan with `spawn` + `shell: false` + scrubbed
    env + per-command and per-plan timeouts +
    bounded redacted excerpts + sha256 digests.
    Triggered by
    `rekon verify run --plan <id> --execute`.
    Refuses to spawn if any command fails
    validation; no `VerificationResult`
    derivation (deferred).
  - The runner handler exported by the package
    default (registered as
    `@rekon/capability-verify.runner`) still
    throws when invoked through generic
    dispatch. The CLI is the only public execute
    path.
- **External runners** — capability authors may
  emit `VerificationRun` artifacts following the
  shape above. Conformance tests on
  `@rekon/capability-verify`'s manifest define the
  permission boundary every runner must respect.

## Consumers

- **Proof report, architecture summary, agent
  contract publications.** All three publications
  detect a runner-derived `VerificationResult` by
  finding a `VerificationRun` reference in
  `header.inputRefs`. The shared classifier
  `summarizeVerificationProofSurface` in
  `@rekon/capability-intent` produces a
  consistent
  `{ source, status, freshness, warnings,
  verificationRunRef }` summary that each
  publication renders into its own section. The
  proof report's `## Verification Proof Summary`
  block, the architecture summary's `##
  Verification Proof Status` block, and the
  agent contract's `## Proof And Verification
  State` section all use this helper.
- **`@rekon/capability-verify`** when the runner
  derives a `VerificationResult` via
  `rekon verify result from-run --run <id>` —
  the result cites the run in
  `header.inputRefs`.
- **`resolve.issue`** verification trace messages
  mention the proof source and freshness when a
  `VerificationResult` matches a finding, so
  resolver consumers see the same context.

The artifact body's `stdoutExcerpt` /
`stderrExcerpt` fields are **not** rendered in
any publication. Publications surface
`stdoutDigest` / `stderrDigest` prefixes
instead, so secret-bearing log content never
crosses the publication boundary.

## Helpers

`@rekon/capability-intent` exports the canonical
factories and validators:

```ts
createVerificationRun(input)               // builds the artifact + auto-derives summary if omitted
summarizeVerificationRunCommands(commands) // pure summary helper
validateVerificationRun(value)             // structured issues; never throws
assertVerificationRun(value)               // throws TypeError on issue
```

`@rekon/capability-verify` re-exports
`createVerificationRun`,
`validateVerificationRun`,
`summarizeVerificationRunCommands`, and
`assertVerificationRun` so callers can construct +
validate `VerificationRun` artifacts without
depending on `@rekon/capability-intent` directly.

It also exports the dry-run helper:

```ts
createVerificationRunDryRun({                  // build a planned-but-not-run VerificationRun
  verificationPlan,                            //   from a VerificationPlan
  verificationPlanRef,                         //   no execution; no process spawn
  workOrderRef?,
  header,
  runner?,
  environment?,
});
validateVerificationRunCommandString(command); // tokenize + validate a single command string
```

The dry-run helper returns
`{ verificationRun, safety, validationIssues, ok }`.
When `ok === true`, the CLI writes the
`VerificationRun`. When `ok === false`, the CLI
refuses to write and reports the issues.

## Execute Behavior

When written via `rekon verify run --plan <id>
--execute`, the artifact carries actual execution
detail:

- `status` ∈ `passed` / `failed` / `timeout` /
  `killed` / `partial` / `not-run`, derived with
  the priority
  `failed > killed > timeout > partial > passed >
  not-run`.
- Per command:
  - `argv` — the tokenized argv that was
    actually spawned (`shell: false`).
  - `status` — `passed` (exit 0), `failed`
    (non-zero exit or spawn error), `timeout`
    (SIGTERM sent after per-command timeout),
    `killed` (SIGKILL sent after the kill
    grace), or `not-run` (plan timeout exceeded
    before the command started).
  - `exitCode` — process exit code, or `null`
    when the process died on signal or did not
    start.
  - `signal` — `SIGTERM` / `SIGKILL` / etc.,
    when the process died on signal.
  - `startedAt` / `endedAt` / `durationMs`.
  - `timedOut` / `killed` booleans.
  - `stdoutDigest` / `stderrDigest` — sha256 of
    the full pre-redaction stream.
  - `stdoutExcerpt` / `stderrExcerpt` — redacted
    first, then truncated to `maxLogBytes`
    (default 8 KB), with `redacted` /
    `truncated` / `originalBytes` / `storedBytes`
    flags.
- `runner.id` defaults to `"rekon.local.exec"`;
  `runner.capabilityId` is
  `"@rekon/capability-verify"`;
  `runner.version` is the package version.
- `redaction.applied` is `true` when at least
  one stream redacted a match;
  `redaction.patterns` lists the pattern ids
  that matched (`env-assignment-token-like`,
  `json-secret`, `bearer-token`, `basic-auth`).
  `redaction.maxBytesPerStream` carries the
  truncation cap.
- `environment.platform` / `arch` /
  `nodeVersion` come from `process`.
  `environment.envPolicy` is `"scrubbed"`;
  `environment.network` is `"unknown"`.
- `startedAt` / `endedAt` / `durationMs` on the
  artifact body cover the full plan run.
- `header.inputRefs` cites the
  `VerificationPlan` and the paired
  `WorkOrder` when present.

**Execution does not derive a
`VerificationResult`.** A `VerificationResult`
exists only when `rekon verify record` was used
or, in a future slice, when `verify run` is
invoked with `--record-result`.

## Dry-Run Behavior

When written via `rekon verify run --plan <id>
--dry-run`, the artifact carries a specific
"planned-but-not-run" shape:

- `status` = `"not-run"`.
- `commands[*].status` = `"not-run"` for every
  command.
- `commands[*].argv` is the tokenized argv that
  the future runner will spawn (proven safe by
  the command-validation pass).
- `commands[*].exitCode`, `signal`,
  `stdoutDigest`, `stderrDigest`,
  `stdoutExcerpt`, `stderrExcerpt`,
  `startedAt`, `endedAt`, and `durationMs` are
  absent (no command ran).
- `runner.id` defaults to
  `"rekon.local.dry-run"`; `runner.capabilityId`
  is `"@rekon/capability-verify"`.
- `redaction.applied` is `false` and
  `redaction.redactedMatches` is `0`. The
  declared `patterns` list still mirrors the
  decision memo so the artifact carries the
  safety contract.
- `environment.envPolicy` defaults to
  `"scrubbed"`.
- `header.inputRefs` cites the
  `VerificationPlan` and (when present) the
  paired `WorkOrder`.

Dry-run artifacts are valid `VerificationRun`
artifacts (`artifacts validate` stays clean).
They are the alpha's preview-only proof
artifact — a future runner will produce the
same shape with execution detail filled in.

## Deriving VerificationResult

`rekon verify result from-run --run
<id|type:id>` derives a `VerificationResult`
from a completed `VerificationRun`:

- `VerificationResult.status` maps `timeout` and
  `killed` to `failed`; `passed` and `failed`
  stay as-is; `partial` / `not-run` carry
  through.
- `VerificationResult.commandResults`
  summarizes each `VerificationRunCommand`:
  - keeps `stdoutDigest` / `stderrDigest`
  - keeps `exitCode`, `durationMs`,
    `startedAt`, `completedAt`
  - **does NOT copy `stdoutExcerpt` /
    `stderrExcerpt`** — the redacted bodies
    stay on the run; the result remains
    concise.
  - adds an explanatory `notes` line for
    `timeout` / `killed` / `skipped` /
    `not-run` cases plus a `Source: ...`
    pointer back at the run.
- `VerificationResult.recordedBy` is set to the
  runner id+version
  (e.g. `"rekon.local.exec@0.1.0"`).
- `VerificationResult.header.inputRefs` cites
  the `VerificationPlan` (always), the
  `WorkOrder` (when present on the run or the
  plan), and the `VerificationRun` (always).
- `VerificationResult.header.producer.id` is
  set to `"@rekon/capability-verify"` and
  `provenance.notes` flag the result as
  runner-derived.

**Refusal:** by default the helper / CLI
**refuse** to derive a result from a not-run
(dry-run) `VerificationRun`. A dry-run is not
proof. The `--allow-not-run` flag overrides
when the operator explicitly wants a
shaped-but-not-attested result.

**Auto-resolution / auto-apply:** derivation
does **not** touch `FindingStatusLedger`,
`FindingLifecycleReport`, `CoherencyDelta`, or
any reconciliation surface. A contract test
pins this.

A `VerificationResult` without a paired
`VerificationRun` means "manually recorded via
`rekon verify record`" — the existing path is
unchanged.

## What This Is Not

- Not the proof summary. `VerificationResult` is.
- Not an auto-resolution trigger. A passing
  `VerificationRun` never resolves findings.
- Not an auto-apply trigger. A passing
  `VerificationRun` never applies reconciliation
  operations.
- Not a place for raw stdout / stderr. The full
  pre-redaction streams are summarized via
  `stdoutDigest` / `stderrDigest`; only redacted
  truncated excerpts (default 8 KB per stream per
  command) live in the artifact body. Sidecar log
  storage is future work and out of scope for v1.
- Not a command-injection surface. The runner
  will execute only commands listed in the named
  `VerificationPlan`; no shell interpolation from
  artifact-supplied strings.

## Cross-References

- [Verification runner v1 decision](../strategy/verification-runner-v1-decision.md)
- [VerificationResult artifact](verification-result.md)
- [VerificationPlan artifact](verification-plan.md)
- [Verification runs concept](../concepts/verification-runs.md)
- [Verification results concept](../concepts/verification-results.md)
- [WorkOrder artifact](work-order.md)
- [Remediation work orders concept](../concepts/remediation-work-orders.md)
- [Capability model](../strategy/capability-model.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
- [Roadmap](../strategy/roadmap.md)
- [Verification / GitHub trust-boundary safety review](../strategy/verification-github-trust-boundary-safety-review.md)

> See also: [Intent Capability Spine Integration Review](../strategy/intent-capability-spine-integration-review.md) — maps the classic intent surfaces (intent:assess / intent:prepare / intent:go / intent:status) onto the Rekon artifact spine: assess → IntentAssessmentReport, prepare → PreparedIntentPlan, status → IntentStatusReport, go deferred. Selects Option B (staged intent artifact spine); first target IntentAssessmentReport v1 decision. Classic intent did not consume the step/handoff/runtime-graph/drift spine; Rekon intent extends parity by wiring StepCapabilityGraph, HandoffContract, HandoffCoverageReport, RuntimeGraphObservationReport, and RuntimeGraphDriftReport into intent readiness. No intent implemented, no artifact registered, no CLI command, no source writes.

> See also: [IntentAssessmentReport v1 decision](../strategy/intent-assessment-report-v1-decision.md) — selects Option B: IntentAssessmentReport v1 as an artifact-backed readiness assessment generated from a user request plus existing Rekon context artifacts (CapabilityMap v2, StepCapabilityGraph, HandoffCoverageReport, RuntimeGraphDriftReport, PathFreshnessReport, VerificationResult when available). Readiness: ready-for-prepare / blocked / needs-review / insufficient-context / stale-context; blocker categories missing-artifact / stale-context / runtime-drift / handoff-coverage / finding-governance / proof-missing / scope-ambiguous / source-write-unavailable. IntentAssessmentReport is assessment, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred. RuntimeGraphDriftReport is an input to readiness, not the intent system itself. No artifact implemented or registered; no CLI; no source writes.

> See also: [IntentAssessmentReport artifact](intent-assessment-report.md) — the read-only readiness assessment of a user request against the Rekon context spine (CapabilityMap, StepCapabilityGraph, HandoffCoverageReport, RuntimeGraphDriftReport, PathFreshnessReport, VerificationResult), via `rekon intent assess`. Readiness: ready-for-prepare / blocked / needs-review / insufficient-context / stale-context. IntentAssessmentReport is assessment, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. RuntimeGraphDriftReport is an input to readiness, not the intent system itself. PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred.

> See also: [IntentAssessmentReport safety review](../strategy/intent-assessment-report-safety-review.md) — declares IntentAssessmentReport v1 safe / stable as read-only readiness assessment (no blocker): assessment, not WorkOrder; creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult; executes no commands; writes no source; RuntimeGraphDriftReport is an input to readiness, not the intent system itself; PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred. Recommended next slice: PreparedIntentPlan v1 decision.
