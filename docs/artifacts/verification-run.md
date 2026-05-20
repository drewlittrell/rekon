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

- **(future) `@rekon/capability-verify`** — the
  in-progress runner. **Not implemented yet.** This
  slice ships the manifest + skeleton only; the
  runner handler throws when invoked.
- **External runners** — capability authors may
  emit `VerificationRun` artifacts following the
  shape above. Conformance tests on
  `@rekon/capability-verify`'s manifest define the
  permission boundary every runner must respect.

## Consumers

- **(future) Architecture summary, agent contract,
  proof report.** Step 7 of the runner v1
  implementation sequence surfaces runner lineage
  (timeout / killed counts, runner version,
  redaction count) when present.
- **`@rekon/capability-verify`** when the runner
  derives a `VerificationResult` — the result cites
  the run in `header.inputRefs`.

In this slice, no surface reads `VerificationRun`.
The artifact is shipped so producers and validators
can target the shape before consumers are added.

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
`validateVerificationRun`, and
`assertVerificationRun` so callers can construct +
validate `VerificationRun` artifacts without
depending on `@rekon/capability-intent` directly.

## Deriving VerificationResult

When the future runner is invoked with
`--write-result`, it derives a `VerificationResult`
from the `VerificationRun`:

- `VerificationResult.status` maps `timeout` and
  `killed` to `failed`; `passed` and `failed` stay
  as-is; `partial` / `not-run` carry through.
- `VerificationResult.commandResults` summarizes
  each `VerificationRunCommand` (without
  excerpts or environment detail).
- `VerificationResult.recordedBy` is set to the
  runner id+version.
- `VerificationResult.header.inputRefs` cites the
  `VerificationRun`, the `VerificationPlan`, and
  (when present) the `WorkOrder`.

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
