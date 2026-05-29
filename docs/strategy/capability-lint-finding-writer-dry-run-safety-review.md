# CapabilityLintFindingBridgeReport → FindingReport Writer Dry-Run Safety Review

**Slice:** forty-ninth on the codebase-intel-classic
capability-ontology track. Strategy / safety-review batch.
Follows the FindingReport writer **dry-run helper / CLI** (shipped
at `cf87e59`).

## Decision Summary

The FindingReport writer **dry-run helper / CLI** is **safe /
stable as preview-only writer modeling.** The end-to-end review
confirms the helper and command produce only a preview of the
`FindingReport` body a future writer *would* emit, write nothing,
mutate no governance artifact, create no `WorkOrder` /
`VerificationPlan`, leave the artifact index untouched, require
`--dry-run`, and reject every write-ish flag.

- **FindingReport writer dry-run is preview-only.**
- **`--dry-run` is required.**
- **`--confirm-finding-write`, `--write`, `--send`, and
  `--execute` are rejected.**
- **Dry-run writes no FindingReport and mutates no existing
  FindingReport.**
- **Dry-run mutates no FindingFilterReport,
  FindingLifecycleReport, IssueAdjudicationReport, or
  CoherencyDelta.**
- **Dry-run creates no WorkOrder or VerificationPlan.**
- **Dry-run does not mutate the artifact index.**
- **Write mode remains deferred to a later explicit decision.**

No blocker was found. Recommended next slice:
**CapabilityLintFindingBridgeReport → FindingReport writer mode
decision.**

> **Update (fiftieth slice):** the
> [`CapabilityLintFindingBridgeReport` → `FindingReport` writer
> mode decision](capability-lint-finding-writer-mode-decision.md)
> has **shipped**. It selects **Option B** — a future, opt-in
> write mode gated behind `--confirm-finding-write` that reuses
> the dry-run preview and writes a **new** `FindingReport`
> artifact only. The write mode is **not implemented**;
> `--write` / `--send` / `--execute` stay rejected, no existing
> `FindingReport` is mutated, no governance artifact /
> `WorkOrder` / `VerificationPlan` is touched, and source writes
> remain unavailable. The next slice is the **FindingReport
> writer implementation**.

> **Update (fifty-first slice):** the **FindingReport writer
> implementation** has **shipped** (opt-in
> `--confirm-finding-write`; writes a new `FindingReport` only;
> no existing-`FindingReport` mutation; no governance mutation; no
> `WorkOrder` / `VerificationPlan`; no source writes). The next
> slice is the **FindingReport writer safety review**.

## Why This Review Exists

The dry-run helper / CLI is the **first concrete model** of the
future `FindingReport` writer: eligible bridge candidates are now
transformed into a proposed `FindingReport` body and rendered
through a CLI command. Because the next boundary to cross is an
actual writer that emits governed findings, Rekon must
safety-review the dry-run surface **before** any write-mode
decision and confirm it cannot — by construction — mutate a
governed finding or remediation artifact, nor be coaxed into write
mode by a stray flag. This memo is that gate.

## Helper And CLI Reviewed

Reviewed surfaces, all shipped at `cf87e59`:

| Surface | Status | Boundary |
| --- | --- | --- |
| buildFindingReportWritePreview | shipped | pure preview helper |
| write-findings --dry-run | shipped | CLI preview only |
| write-ish flags | rejected | no write mode |
| FindingReport output | proposed body only | no artifact write |

- **`buildFindingReportWritePreview`** (`@rekon/capability-model`):
  a pure function. Given a `CapabilityLintFindingBridgeReport` and
  its resolved ref it returns a `FindingReportWritePreview` with
  `dryRun: true` and `wouldWrite: false`. It reads only the bridge
  report, builds no artifact, performs no I/O, and returns a plain
  value. Its imports are limited to `@rekon/kernel-artifacts` and
  `@rekon/kernel-repo-model` types.
- **`FindingReportWritePreview` shape**: `dryRun` (literal `true`),
  `wouldWrite` (literal `false`), `source` (bridge / lint /
  contract / map refs), `summary` (`totalCandidates` / `eligible`
  / `proposedFindings` / `skipped` / `duplicateIds`),
  `proposedFindingReport` (the modeled body), and
  `skippedCandidates`.
- **Eligibility / skip logic**: a candidate becomes a proposed
  finding only when `decision === "eligible"`, a `proposedFinding`
  exists, its `evidenceRefs` is non-empty, its `sourceLintRowRef`
  exists, severity is high/medium, and confidence is high/medium.
  The writer **re-validates** every prerequisite rather than
  trusting the bridge's `decision` field alone; checks run in a
  fixed priority order so each skipped candidate carries exactly
  one reason (`candidate-ineligible`, `candidate-needs-review`,
  `missing-proposed-finding`, `low-severity`, `low-confidence`,
  `missing-evidence-refs`, `missing-source-lint-row-ref`,
  `duplicate-finding-id`).
- **Duplicate-finding-id skip**: the helper tracks claimed finding
  ids in candidate order; the first candidate to claim an id keeps
  it, later candidates with the same id are skipped
  (`duplicate-finding-id`) and counted in `summary.duplicateIds`.
- **CLI** (`rekon capability lint write-findings`): reads the
  pinned `--bridge-report`, calls the helper, and prints the
  preview (human or `--json`). It performs no `store.write`.
- **Contract test** (27 assertions) and **docs test** (9
  assertions) cover the helper eligibility / skip / dedup / id
  preservation / inputRefs / trace fields, the CLI `--dry-run`
  requirement and write-ish flag rejection, and — via before/after
  snapshots — that publishing the dry-run mutates no `FindingReport`,
  `FindingFilterReport`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, or `CoherencyDelta`, creates no
  `WorkOrder` / `VerificationPlan`, and leaves the artifact index
  byte-identical, with `artifacts validate` clean.
- **CLI smoke** (implementation batch): on the `js-ts-ast-evidence`
  fixture the command reports `dryRun: true` / `wouldWrite: false`,
  writes no `FindingReport`, and `artifacts validate` is clean.

## Dry-Run Requirement Review

**`--dry-run` is required.** The command computes
`dryRun = parsed.flags["dry-run"] === true` and throws (exit 1) when
it is absent, with a message stating write mode is deferred and no
`FindingReport` writer exists yet. There is no implicit or default
write path: the only supported mode is dry-run. **Finding: the
dry-run requirement holds.**

## Write-Ish Flag Rejection Review

| Flag | V1 Behavior |
| --- | --- |
| --dry-run | required |
| --confirm-finding-write | rejected |
| --write | rejected |
| --send | rejected |
| --execute | rejected |

**`--confirm-finding-write`, `--write`, `--send`, and `--execute`
are rejected.** Before any work is done, the command collects any
of these flags that are present and throws (exit 1) with "write
mode is deferred … not accepted. Only --dry-run is supported in
this slice. No FindingReport is written." The rejection runs
*ahead* of bridge resolution, so a write-ish flag can never reach
helper or store code. **Finding: write-ish flag rejection holds.**

## Proposed FindingReport Body Review

The `proposedFindingReport` models a future write faithfully:
`artifactType: "FindingReport"`, `source: "capability-lint-bridge"`,
`inputRefs` citing the bridge report plus the lint /
`CapabilityContract` / `CapabilityMap` refs when the bridge source
provides them, and `findings[]` preserving each candidate's
deterministic `proposedFinding` id and carrying the trace fields
`sourceBridgeCandidateId` / `sourceLintRowId` / `sourceContractId`
/ `sourcePhraseCapabilityId` plus `title` / `category`
(`capability_architecture_policy`) / `severity` / `evidenceRefs`.
This is enough for a future writer to be designed against: the
body, its provenance refs, and its per-finding trace are all
present. It remains a **preview value, not an artifact** — no
header is stamped and nothing is indexed. **Finding: the proposed
body is complete enough for future writer design.**

## Governance Mutation Boundary

| Boundary | Decision |
| --- | --- |
| dry-run vs FindingReport | no write / no mutation |
| dry-run vs FindingFilterReport | no mutation |
| dry-run vs FindingLifecycleReport | no mutation |
| dry-run vs IssueAdjudicationReport | no mutation |
| dry-run vs CoherencyDelta | no mutation |
| dry-run vs WorkOrder | no creation |
| dry-run vs VerificationPlan | no creation |
| dry-run vs artifact index | no mutation |
| dry-run vs source files | no writes |

The boundary is enforced structurally: the helper is pure and the
CLI never calls `store.write`. **Dry-run writes no FindingReport
and mutates no existing FindingReport. Dry-run mutates no
FindingFilterReport, FindingLifecycleReport,
IssueAdjudicationReport, or CoherencyDelta. Dry-run creates no
WorkOrder or VerificationPlan.** The contract test asserts each of
these via before/after snapshots. **Finding: the governance
mutation boundary holds.**

## Artifact Index Boundary

**Dry-run does not mutate the artifact index.** The command calls
`store.init()` (read-only) to resolve and read the bridge report,
but never writes an artifact, so the registry index
(`.rekon/artifacts/.../artifacts.index.json`) is unchanged. The
contract test snapshots the index file content before and after the
dry-run and asserts equality. **Finding: the artifact-index
boundary holds.**

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare dry-run safe/stable | selected | write boundary proven |
| writer-mode decision next | selected | dry-run body shape is proven |
| dry-run publication surfacing next | deferred | CLI visibility sufficient for now |
| more dogfood first | deferred | tests + smoke cover safety boundary |

## Recommendation

The FindingReport writer **dry-run helper / CLI** is **safe /
stable as preview-only writer modeling.** No blocker was found.
Proceed to the **CapabilityLintFindingBridgeReport → FindingReport
writer mode decision**: the dry-run helper / CLI now proves the
writer body shape and the no-mutation boundary, so the next
decision should decide whether to add an **opt-in writer mode
requiring explicit confirmation** — its own decision and its own
safety review. **Write mode remains deferred to a later explicit
decision.**

If the writer-mode decision (or its review) finds caution
warranted, the documented alternative is **FindingReport writer
dry-run publication surfacing**; it is deferred here because the
dry-run is already CLI-visible and fully tested.

## What This Does Not Do

This review changes no runtime behavior. It implements no writer,
adds no write mode, adds no `--confirm-finding-write` support,
writes no `FindingReport`, mutates no governance artifact, creates
no `WorkOrder` / `VerificationPlan`, and writes no source files.
Restating the invariants:

- **FindingReport writer dry-run is preview-only.**
- **`--dry-run` is required.**
- **`--confirm-finding-write`, `--write`, `--send`, and
  `--execute` are rejected.**
- **Dry-run writes no FindingReport and mutates no existing
  FindingReport.**
- **Dry-run mutates no FindingFilterReport,
  FindingLifecycleReport, IssueAdjudicationReport, or
  CoherencyDelta.**
- **Dry-run creates no WorkOrder or VerificationPlan.**
- **Dry-run does not mutate the artifact index.**
- **Write mode remains deferred to a later explicit decision.**

## Follow-Up Work

Deferred, each gated behind its own decision and (where it mutates
governance) its own safety review:

- writer mode decision (opt-in, explicit confirmation).
- writer implementation.
- `FindingReport` mutation.
- `FindingFilterReport` / `FindingLifecycleReport` /
  `IssueAdjudicationReport` mutation.
- `CoherencyDelta` integration.
- `WorkOrder` / `VerificationPlan` creation.
- resolver routing by capability.
- verification planning by capability.
- source writes.

Immediate next slice:
**CapabilityLintFindingBridgeReport → FindingReport writer mode
decision** (strategy / decision memo only; still no writer
implementation, no lifecycle mutation, no `CoherencyDelta`
mutation, no `WorkOrder` / `VerificationPlan` creation, no resolver
routing, no verification planning, no source writes).

## Cross-References

- [CapabilityLintFindingBridgeReport → FindingReport writer decision](capability-lint-finding-writer-decision.md)
  — forty-seventh slice (decision) + forty-eighth slice (dry-run
  helper / CLI). This review covers the shipped dry-run surface.
- [CapabilityLintFindingBridgeReport artifact](../artifacts/capability-lint-finding-bridge-report.md)
- [Capability lint finding bridge concept](../concepts/capability-lint-finding-bridge.md)
- [FindingReport artifact](../artifacts/finding-report.md)
- [Finding lifecycle concept](../concepts/finding-lifecycle.md)
- [Graph-aware finding filters concept](../concepts/graph-aware-finding-filters.md)
- [Coherency delta concept](../concepts/coherency-delta.md)
- [Remediation work orders concept](../concepts/remediation-work-orders.md)
- [WorkOrder artifact](../artifacts/work-order.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)
