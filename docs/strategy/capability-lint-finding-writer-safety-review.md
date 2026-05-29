# CapabilityLintFindingBridgeReport → FindingReport Writer Safety Review

**Slice:** fifty-second on the codebase-intel-classic
capability-ontology track. Strategy / safety-review batch.
Follows the FindingReport writer **implementation** (shipped at
`8bb6f82`).

## Decision Summary

The FindingReport writer mode is **safe / stable as a controlled,
opt-in writer.** The end-to-end review confirms
`rekon capability lint write-findings --confirm-finding-write`
crosses exactly one boundary — preview bridge candidate → a single
new `FindingReport` artifact — and preserves every downstream
governance stage.

- **FindingReport writer mode is opt-in and requires
  `--confirm-finding-write`.**
- **Dry-run behavior remains preview-only and writes nothing.**
- **Writer mode writes exactly one new FindingReport artifact on
  success.**
- **Writer mode does not mutate existing FindingReport artifacts in
  place.**
- **Writer mode does not mutate FindingFilterReport,
  FindingLifecycleReport, IssueAdjudicationReport, or
  CoherencyDelta.**
- **Writer mode does not create WorkOrder or VerificationPlan.**
- **Writer mode writes no source files.**
- **Lifecycle and CoherencyDelta integration remain downstream.**

No blocker was found. Recommended next slice: **FindingReport
writer publication / operator-surface decision.**

## Why This Review Exists

The writer is the **first controlled mutation** in the
capability-lint finding pipeline: it converts eligible preview
bridge candidates into a governed `FindingReport` artifact on disk,
indexed and visible to the finding-governance chain. Because the
next boundary to design is downstream lifecycle / `CoherencyDelta`
integration, Rekon must verify — *before* any of that — that the
writer is bounded (one new artifact only), explicit (opt-in,
confirmation-gated), and leaves every downstream stage untouched.
This memo is that gate.

## Writer Mode Reviewed

Reviewed surfaces, all shipped at `8bb6f82`:

| Surface | Status | Boundary |
| --- | --- | --- |
| write-findings --dry-run | shipped | preview only |
| write-findings --confirm-finding-write | shipped | writes one new FindingReport |
| --write / --send / --execute | rejected | no ambiguous aliases |
| lifecycle / CoherencyDelta integration | deferred | downstream only |

- **CLI write-findings branch** (`packages/cli`): one command with
  two modes. It resolves `--bridge-report`, reads the
  `CapabilityLintFindingBridgeReport`, and builds the dry-run
  preview via `buildFindingReportWritePreview` in **both** modes;
  write mode is "preview + persist".
- **Flag handling**: `dryRun = flags["dry-run"] === true`,
  `confirmWrite = flags["confirm-finding-write"] === true`. The
  ambiguous `--write` / `--send` / `--execute` aliases are
  collected and rejected (exit non-zero) *before* any work. The two
  modes are mutually exclusive, and at least one is required.
- **FindingReport construction**: write mode maps
  `preview.proposedFindingReport.findings` to the governed
  `Finding` shape (category → `type`, trace fields →
  `details`, preserving id / severity / `evidenceRefs`),
  constructs a `FindingReport` header citing the preview
  `inputRefs`, calls `createFindingReport`, and writes one artifact
  under `.rekon/artifacts/findings/`. It performs exactly one
  `store.write` (category `findings`).
- **Contract test**
  (`tests/contract/capability-lint-finding-writer.test.mjs`, 25
  assertions) and **docs test** (11 assertions) cover dry-run
  preservation, the write happy-path with field/id/evidence
  preservation and bridge + upstream citations, the 0-findings
  guard, mutual exclusion, alias rejection, missing-`--bridge-report`,
  a snapshotted pre-existing `FindingReport` proven *not* mutated in
  place, and before/after counts confirming no
  `FindingFilterReport` / `FindingLifecycleReport` /
  `IssueAdjudicationReport` / `CoherencyDelta` / `WorkOrder` /
  `VerificationPlan` change, with `artifacts validate` clean.
- **CLI smoke** (implementation batch): on the fixture the dry-run
  wrote nothing; a seeded eligible bridge drove write mode to write
  exactly one new `FindingReport` (count 2 → 3), `artifacts
  validate` clean, no governance mutation.

## Dry-Run Preservation Review

**Dry-run behavior remains preview-only and writes nothing.** When
`--confirm-finding-write` is absent, the command prints the
preview (`dryRun: true`, `wouldWrite: false`) and returns before
any `store.write`. The dry-run path is byte-for-byte preserved from
the forty-eighth slice; its own safety review (forty-ninth slice)
still holds. **Finding: dry-run is preserved.**

## Confirmation Gate Review

**FindingReport writer mode is opt-in and requires
`--confirm-finding-write`.** Write mode runs only when that flag is
present; running with neither `--dry-run` nor
`--confirm-finding-write` errors, and passing both errors
(mutually exclusive). The generic `--write` / `--send` /
`--execute` aliases are rejected ahead of bridge resolution, so a
habitual write-ish flag cannot trigger a write. The single
purpose-named confirmation flag is the *only* path across the
boundary. **Finding: the confirmation gate is strong enough.**

## FindingReport Write Model Review

**Writer mode writes exactly one new FindingReport artifact on
success**, and **does not mutate existing FindingReport artifacts
in place.** The writer always constructs a fresh `FindingReport`
(new `artifactId`) and writes it under `findings/`; Rekon
artifacts are immutable records, and the contract test snapshots a
pre-existing `FindingReport` and asserts it is byte-identical after
a write. The new report's `header.inputRefs` cite the
`CapabilityLintFindingBridgeReport` plus the upstream lint /
`CapabilityContract` / `CapabilityMap` refs from the preview; each
finding preserves its deterministic proposed id, severity, and
`evidenceRefs`, and carries the bridge trace fields
(`sourceBridgeCandidateId` / `sourceLintRowId` / `sourceContractId`
/ `sourcePhraseCapabilityId`) under `details`. The before-write
checks (proposed findings > 0, unique ids, non-empty
`evidenceRefs`) refuse to write an empty, ambiguous, or
evidence-less report. **Finding: the new-artifact write model and
its inputRefs / trace fields are sufficient.** The zero-findings
guard is sufficient: it exits non-zero and writes nothing.

## Governance Mutation Boundary

| Boundary | Decision |
| --- | --- |
| writer vs existing FindingReport | no in-place mutation |
| writer vs new FindingReport | one new artifact on success |
| writer vs FindingFilterReport | no mutation |
| writer vs FindingLifecycleReport | no mutation |
| writer vs IssueAdjudicationReport | no mutation |
| writer vs CoherencyDelta | no mutation |
| writer vs WorkOrder | no creation |
| writer vs VerificationPlan | no creation |
| writer vs source files | no writes |

The boundary is enforced structurally: the command's only write is
the single new `FindingReport`. **Writer mode does not mutate
FindingFilterReport, FindingLifecycleReport,
IssueAdjudicationReport, or CoherencyDelta.** The contract test
asserts each of those (and the bridge report) unchanged via
before/after counts and snapshots. **Finding: the governance
mutation boundary holds.**

## WorkOrder / VerificationPlan Boundary

**Writer mode does not create WorkOrder or VerificationPlan.** Work
orders and verification plans remain downstream of governed
findings and `CoherencyDelta`, never of the writer. The contract
test confirms no `WorkOrder` or `VerificationPlan` appears after a
write. A `FindingReport` written by this writer becomes ordinary
evaluator output: the graph-aware finding filters may suppress it,
the status ledger may accept/ignore it, the lifecycle projection
tracks it, adjudication groups it, and only then does
`CoherencyDelta` (and any remediation `WorkOrder` /
`VerificationPlan`) consider it. **Lifecycle and CoherencyDelta
integration remain downstream.** **Finding: the WorkOrder /
VerificationPlan boundary holds.**

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare writer safe/stable | selected | controlled opt-in writer |
| publication / operator-surface decision next | selected | visibility before downstream mutation |
| lifecycle / CoherencyDelta integration next | deferred | needs operator-surface decision first |
| more dogfood before next decision | deferred | tests + smoke cover safety boundary |

## Recommendation

The FindingReport writer mode is **safe / stable as a controlled,
opt-in writer.** No blocker was found. Proceed to the
**FindingReport writer publication / operator-surface decision**:
after the first controlled writer, operators should be able to see
bridge-derived findings and writer provenance clearly — in the
architecture summary, agent contract, proof report, or a dedicated
publication — *before* any lifecycle / `CoherencyDelta` mutation is
designed. If the team prefers to move faster, the documented
alternative is the **FindingReport writer lifecycle-integration
decision**, but the default is the operator-surface decision first.

## What This Does Not Do

This review changes no runtime behavior. It modifies no writer
code, adds no lifecycle / filter / adjudication / `CoherencyDelta`
integration, creates no `WorkOrder` / `VerificationPlan`, and
writes no source files. Restating the invariants:

- **FindingReport writer mode is opt-in and requires
  `--confirm-finding-write`.**
- **Dry-run behavior remains preview-only and writes nothing.**
- **Writer mode writes exactly one new FindingReport artifact on
  success.**
- **Writer mode does not mutate existing FindingReport artifacts in
  place.**
- **Writer mode does not mutate FindingFilterReport,
  FindingLifecycleReport, IssueAdjudicationReport, or
  CoherencyDelta.**
- **Writer mode does not create WorkOrder or VerificationPlan.**
- **Writer mode writes no source files.**
- **Lifecycle and CoherencyDelta integration remain downstream.**

## Follow-Up Work

Deferred, each gated behind its own decision and (where it mutates
governance) its own safety review:

- publication / operator-surface decision (recommended next).
- `FindingLifecycleReport` mutation.
- `IssueAdjudicationReport` mutation.
- `CoherencyDelta` integration.
- `WorkOrder` / `VerificationPlan` creation.
- resolver routing by capability.
- verification planning by capability.
- `RefactorPreservationContract`.
- source writes.

Immediate next slice: **FindingReport writer publication /
operator-surface decision** (strategy / decision memo only; still
no `FindingLifecycleReport` mutation, no `CoherencyDelta`
mutation, no `WorkOrder` / `VerificationPlan` creation, no source
writes).

## Cross-References

- [FindingReport writer mode decision](capability-lint-finding-writer-mode-decision.md)
  — fiftieth slice (decision) + fifty-first slice (implementation).
  This review covers the shipped write mode.
- [FindingReport writer dry-run safety review](capability-lint-finding-writer-dry-run-safety-review.md)
  — forty-ninth slice; declared the dry-run preview safe / stable.
- [CapabilityLintFindingBridgeReport → FindingReport writer decision](capability-lint-finding-writer-decision.md)
- [CapabilityLintFindingBridgeReport artifact](../artifacts/capability-lint-finding-bridge-report.md)
- [Capability lint finding bridge concept](../concepts/capability-lint-finding-bridge.md)
- [FindingReport artifact](../artifacts/finding-report.md)
- [Finding lifecycle concept](../concepts/finding-lifecycle.md)
- [Graph-aware finding filters concept](../concepts/graph-aware-finding-filters.md)
- [Coherency delta concept](../concepts/coherency-delta.md)
- [Remediation work orders concept](../concepts/remediation-work-orders.md)
- [WorkOrder artifact](../artifacts/work-order.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [Bridge-derived findings publication decision](bridge-derived-findings-publication-decision.md)
  — fifty-third slice; the publication / operator-surface decision
  this review recommended. Selects **Option B** (surface
  bridge-derived `FindingReport` entries in the architecture summary
  and the agent operating contract first); defers the proof report.
  Publication surfacing mutates nothing; lifecycle / `CoherencyDelta`
  integration remain downstream.
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)
