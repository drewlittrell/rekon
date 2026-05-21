# Review Packet — Verification Proof Surfaces v2

**Step 7** of the runner v1 implementation
sequence pinned by
[`docs/strategy/verification-runner-v1-decision.md`](../../docs/strategy/verification-runner-v1-decision.md).
**Publication-only batch. No command execution.
No artifact-shape changes** (only additive
optional fields on
`VerificationEvidenceSummary`). Makes proof
state legible across the proof report,
architecture summary, agent contract, and the
`resolve.issue` verification trace.

What this batch does **not** do:

- No `VerificationResult` / `VerificationRun`
  shape change.
- No mutation of `FindingStatusLedger`,
  `FindingLifecycleReport`,
  `CoherencyDelta`, or any reconciliation
  surface.
- No rerun of commands.
- No copy of raw stdout / stderr excerpts
  into publications.
- No CI / GitHub adapter.
- No `schemaVersion` bump.

## CHANGES MADE

**`@rekon/capability-intent`
(`packages/capability-intent/src/index.ts`):**

- Added optional fields `source`,
  `freshness`, `verificationRunRef` to
  `VerificationEvidenceSummary`.
- Added types
  `VerificationProofSource`,
  `VerificationProofFreshnessStatus`,
  `VerificationProofWarningCode`,
  `VerificationProofWarning`,
  `VerificationProofSurfaceSummary`,
  `SummarizeVerificationProofSurfaceInput`.
- Added pure function
  `summarizeVerificationProofSurface(input)`.
- Updated `lookupVerificationEvidence` to
  call the new helper and attach
  `source` / `freshness` /
  `verificationRunRef` to the returned
  `VerificationEvidenceSummary`; classifier
  warnings are appended to the existing
  `warnings` array.

**`@rekon/capability-docs`
(`packages/capability-docs/src/index.ts`):**

- Added dependency on
  `@rekon/capability-intent` (package.json +
  tsconfig).
- Imported `summarizeVerificationProofSurface`
  and the new types.
- Added `stdoutDigest` / `stderrDigest`
  optional fields to
  `VerificationCommandResultLike`.
- Added helper `extractVerificationRunRef`.
- Added helper
  `renderVerificationProofSummarySection`
  that renders the new proof-summary table +
  warning callouts.
- Added helper
  `renderVerificationProofStatusBlock` that
  renders the architecture summary's compact
  proof block.
- Added helper `checkVerificationRunExists`
  shared by the publishers to detect
  missing-run cases.
- `ProofReportInputs` gains
  `verificationResultRef`,
  `latestVerificationPlanRef`, and
  `verificationRunArtifactExists`.
- `ArchitectureSummaryInputs` gains
  `verificationResultRef` and
  `verificationRunArtifactExists`.
- `AgentContractInputs` gains
  `verificationResultRef` and
  `verificationRunArtifactExists`.
- The proof report publisher reads the
  `VerificationResult` ref directly, calls
  `checkVerificationRunExists`, and passes
  the new inputs to `renderProofReport`.
- The architecture summary publisher does
  the same.
- The agent contract publisher does the
  same.
- The proof report's
  `## Verification Results` table includes a
  `Digests` column showing the first 12
  hex chars of stdout / stderr digests.
- `AGENT_CONTRACT_DO_NOT_DO` adds two new
  rules.

**`@rekon/capability-resolver`
(`packages/capability-resolver/src/index.ts`):**

- Updated `verificationTraceMessage` to
  include proof source and freshness
  suffixes in human-readable form.

**Tests:**

- `tests/contract/verification-proof-surfaces-v2.test.mjs`
  (22 new tests).

**Docs (12 updated + CHANGELOG + README +
review packet):**

- `docs/concepts/verification-runs.md` — new
  "Proof Surfaces V2" section.
- `docs/artifacts/verification-run.md` —
  rewrote Consumers section.
- `docs/concepts/verification-results.md`
  — expanded Surfaced In Publications
  section with the shared classifier.
- `docs/artifacts/verification-result.md` —
  expanded Consumed By section.
- `docs/concepts/proof-report-publication.md`
  — added new section row and explanation.
- `docs/artifacts/proof-report-publication.md`
  — renumbered Content Structure to include
  the new Verification Proof Summary
  section; renamed Verification Results
  columns.
- `docs/concepts/architecture-summary-publication.md`
  — new Verification Proof Status Block
  section.
- `docs/concepts/agent-operating-contract.md`
  — expanded Failure Visibility with
  source / freshness lines, agent
  instructions, and new Do Not Do entries.
- `docs/artifacts/agent-contract-publication.md`
  — rewrote item 8 to describe the new
  fields and callouts.
- `docs/artifacts/resolver-packet.md` —
  noted the additive
  `VerificationEvidenceSummary` fields.
- `docs/concepts/resolvers.md` — expanded
  the verification paragraph.
- `docs/strategy/verification-runner-v1-decision.md`
  — step 7 flipped to ✅ Shipped.
- `docs/strategy/classic-behavior-roadmap.md`
  — flipped pointer + new shipped entry.
- `docs/strategy/roadmap.md` — new
  completed-slice entry.
- `docs/strategy/issue-governance-architecture-decision.md`
  — step 40 flipped to shipped; step 41
  added for CI / GitHub adapter.
- `README.md` — added a comment block
  pointing at the new proof-surfaces docs.
- `CHANGELOG.md` — new
  top-of-`0.1.0-alpha.1` entry.

## PUBLIC API CHANGES

**Additive only. No breaking changes.**

- `@rekon/capability-intent`:
  - New exported function
    `summarizeVerificationProofSurface(input)`.
  - New exported types
    (`VerificationProofSource`,
    `VerificationProofFreshnessStatus`,
    `VerificationProofWarningCode`,
    `VerificationProofWarning`,
    `VerificationProofSurfaceSummary`,
    `SummarizeVerificationProofSurfaceInput`).
  - `VerificationEvidenceSummary` gains
    three optional fields:
    `source`, `freshness`,
    `verificationRunRef`.

- `@rekon/capability-docs`:
  - New dependency on
    `@rekon/capability-intent`.
  - Publishers now read the
    `VerificationResult` ref directly and
    pass classifier-related context to the
    render functions.

- `@rekon/capability-resolver`:
  - Verification trace message wording
    expanded to include source + freshness.

No CLI command was added or changed. No
`schemaVersion` bump. No package version bump.

## PURPOSE PRESERVATION CHECK

1. **No execution.** Publications do not
   spawn processes. The proof-source helper
   is pure.
2. **No mutation of governance surfaces.**
   `FindingStatusLedger`,
   `FindingLifecycleReport`,
   `CoherencyDelta`, and
   `ReconciliationPlan` are unchanged.
   Contract tests pin this.
3. **No leak of raw stdout / stderr.** The
   per-command table renders only digest
   prefixes (12 hex chars). A sentinel-
   marker test ("zyxwv" emitted only via
   `String.fromCharCode`) confirms the
   marker never appears in the proof
   report body.
4. **Failures are first-class.** Failed /
   timeout / killed proof is now even more
   prominent: the Verification Proof
   Summary section calls it out, the
   architecture summary block calls it out,
   and the agent contract surfaces explicit
   agent instructions to treat proof as
   incomplete.
5. **Stale proof is visible.** Stale and
   missing-plan freshness states are
   surfaced in all three publications with
   recommended commands.
6. **Source clarity.** Manual vs runner-
   derived proof is now visible everywhere
   the proof appears. The classifier uses
   `header.inputRefs` first (finding a
   `VerificationRun`) and falls back to the
   runner identity pattern in `recordedBy`.
7. **No auto-resolution.** Every passing-
   proof callout reinforces "passing proof
   does not automatically resolve
   findings."

## CODEBASE-INTEL ALIGNMENT

- The shared classifier centralizes the
  source / freshness rules so all three
  publications agree.
- The Do Not Do entries reinforce the
  classic "don't bypass failing checks" /
  "don't trust stale proof" discipline.
- The `resolve.issue` verification trace
  uses the same classifier, so a resolver
  consumer sees the same source / freshness
  context that a human reading the proof
  report would see.

## PROOF SOURCE MODEL

```ts
type VerificationProofSource =
  | "manual"
  | "runner-derived"
  | "unknown";

type VerificationProofFreshnessStatus =
  | "fresh"
  | "stale"
  | "missing-plan"
  | "unknown";

type VerificationProofWarningCode =
  | "proof-failed"
  | "proof-partial"
  | "proof-not-run"
  | "proof-stale"
  | "proof-missing-plan"
  | "proof-source-unknown"
  | "runner-run-missing";
```

**Classification rules:**

1. `runner-derived` if
   `VerificationResult.header.inputRefs`
   contains a `VerificationRun` ref, OR
   `VerificationResult.recordedBy` matches
   `/^rekon\.local\.(exec|dry-run)/i`.
2. `manual` otherwise, when `recordedBy`
   is non-empty.
3. `unknown` when the result is malformed
   (no `status`, no `recordedBy`, no run
   ref).

**Freshness rules:**

1. `fresh` when
   `result.verificationPlanRef.id` equals
   the latest indexed
   `VerificationPlan.id`.
2. `stale` when they differ.
3. `missing-plan` when the result has no
   plan ref and a plan exists.
4. `unknown` when no plan context is
   available.

## PUBLICATION SURFACES

### Proof report

New section (after Proof Status):

```markdown
## Verification Proof Summary

| Field | Value |
| --- | --- |
| VerificationResult | VerificationResult:... |
| VerificationPlan | VerificationPlan:... |
| VerificationRun | VerificationRun:... |
| WorkOrder | WorkOrder:... |
| Source | runner-derived |
| Status | passed |
| Freshness | fresh |
| Recorded by | rekon.local.exec@0.1.0 at 2026-... |

> Verification passed. Passing proof does not automatically resolve findings.
```

The per-command **Verification Results**
table now carries a `Digests` column
showing stdout / stderr digest prefixes
(12 hex chars). Raw excerpts are never
rendered.

### Architecture summary

New compact block (after Verification
Status):

```markdown
## Verification Proof Status

- Status: failed
- Source: runner-derived
- Freshness: fresh
- VerificationResult: VerificationResult:...
- VerificationRun: VerificationRun:...

> Verification is not complete or current. Do not mark governed issues resolved from this proof alone.
```

### Agent contract

`## Proof And Verification State` adds:

```markdown
- Proof source: runner-derived
- Proof freshness: fresh
```

Plus agent instructions when proof is
incomplete:

```markdown
> Verification is not complete.

Agent instruction:
- Treat proof as incomplete.
- Do not claim completion.
- Re-run verification (`rekon verify run --plan <id> --execute`) or ask the operator for proof.
```

Two new `## Do Not Do` rules:

```text
- Do not treat passed verification as automatic finding resolution; status changes require explicit lifecycle/status artifacts.
- Do not treat stale, partial, failed, timeout, killed, or not-run verification as proof of completion.
```

## RESOLVER SURFACE

`VerificationEvidenceSummary` carries
optional `source`, `freshness`,
`verificationRunRef`.
`lookupVerificationEvidence` populates them
via the shared helper.
`verificationTraceMessage` includes
source / freshness in human-readable form:

```text
VerificationResult linked to remediation work is `failed` (source: runner-derived); proof is stale relative to the latest VerificationPlan. Do not treat as proven complete.
```

No `IssuePacket` shape change. The CLI
`resolve issue` JSON output picks up the
new fields automatically because they live
on `VerificationEvidenceSummary`.

## TESTS / VERIFICATION

**New tests
(`tests/contract/verification-proof-surfaces-v2.test.mjs`,
22 total):**

Helper:

1. Classifies manual result as `manual`.
2. Classifies derived result as
   `runner-derived` via `VerificationRun`
   inputRef.
3. Marks stale when newer plan exists.
4. Warns on `failed`.
5. Warns on `partial`.
6. Emits `runner-run-missing` when
   `knownRunnerRunMissing` is set.
7. Defaults sensibly when result is
   missing.
8. Classifies runner via `recordedBy`
   pattern when no run inputRef.

CLI / publications:

9. Proof report renders new section with
   `Source | runner-derived`.
10. Proof report does NOT render raw
    stdout (sentinel marker check).
11. Proof report shows stdout / stderr
    digest prefixes.
12. Proof report emits failed callout.
13. Proof report emits stale callout when
    a newer plan is generated.
14. Architecture summary renders the new
    block with source + freshness.
15. Architecture summary warns on failed
    proof.
16. Agent contract surfaces source,
    freshness, status.
17. Agent contract Do Not Do includes the
    new stale/failed entries.
18. Agent contract instructs agents to
    treat failed proof as incomplete.
19. Passing runner-derived proof does NOT
    mutate `FindingStatusLedger`.
20. Existing `verify record` path
    unchanged.
21. Existing `verify run --dry-run` and
    `--execute` paths unchanged.
22. `artifacts validate` clean after full
    v2 publication chain.

**Full suite results:** 1106 passed / 1
skipped / 0 failed (up from 1084/1/0).

**Build:** `tsc -b` composite build clean.

**Audits / smokes (to run before commit):**

- `audit-package-exports`.
- `audit-license`.
- `publish-dry-run`.
- `install-smoke` /
  `install-tarball-smoke`.

**CLI smokes:**

- `rekon refresh` — unchanged.
- `rekon verify record` — unchanged.
- `rekon verify run --dry-run` — unchanged.
- `rekon verify run --execute` — unchanged.
- `rekon verify result from-run` —
  unchanged.
- `rekon publish proof` — renders new
  section.
- `rekon publish architecture` — renders
  new block.
- `rekon publish agent-contract` — renders
  source / freshness + new Do Not Do
  entries.
- `rekon artifacts validate` — clean.

## INTENTIONALLY UNTOUCHED

- Every artifact's shape (other than the
  additive optional fields on
  `VerificationEvidenceSummary`).
- The runtime, SDK, and every other
  capability.
- All existing CLI commands (no new
  commands, no flag changes).
- `refresh` / `publish` / `resolve` /
  `intent` / `reconcile` / `artifacts`
  lifecycle steps.
- `FindingStatusLedger`,
  `FindingLifecycleReport`,
  `CoherencyDelta`, `ReconciliationPlan`.
- The CI pipeline.

## RISKS / FOLLOW-UP

**Risks (low):**

- **`recordedBy` heuristic.** External
  capabilities that happen to set
  `recordedBy` to a string starting with
  `rekon.local.` will be classified as
  runner-derived even if they wrote the
  result manually. Mitigation: the
  in-tree runner is the only producer
  that uses this prefix, and the
  `VerificationRun` inputRef check runs
  first.
- **Multiple latest plans.** If two
  `VerificationPlan` artifacts are
  written within the same millisecond,
  `id.localeCompare` decides which is
  "latest". This is consistent with
  existing publication behavior.
- **Digest prefix collisions.** 12 hex
  chars give 48 bits of entropy. Across
  thousands of digests this is fine; if
  a future surface needs proof identity
  comparison, use the full digest.

**Follow-up (next slice):**

- **Verification runner CI / GitHub
  adapter decision memo** (step 8 of the
  runner v1 sequence). Strategy-only
  batch. Decide whether proof execution
  remains local-only for alpha or gains
  a GitHub Actions / PR-check surface,
  including artifact upload, log
  retention, and permission boundaries.

## NEXT STEP

The recommended next slice is the
**verification runner CI / GitHub adapter
decision memo** — step 8 of the runner v1
sequence pinned by
[`docs/strategy/verification-runner-v1-decision.md`](../../docs/strategy/verification-runner-v1-decision.md).
Strategy-only batch. No code or artifact
changes. Decides direction for CI
integration with the runner.

Auto-resolution remains out of scope.
