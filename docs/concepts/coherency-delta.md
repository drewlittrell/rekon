# Coherency Delta

A coherency delta is Rekon's compact, severity-aware view of repository
drift. It rolls the current `FindingLifecycleReport` into:

- a summary of active versus accepted/ignored/resolved findings;
- counts by severity, type, and owner system;
- the top affected paths;
- an ordered remediation queue.

This is one of the durable wins distilled from
`codebase-intel-classic`: issues should reach humans and agents as a
single governance artifact, not as scattered console output. See
[../strategy/classic-wins.md](../strategy/classic-wins.md) and the
"Issue Detection And Coherency Delta" card in
[../strategy/classic-behavior-distillation.md](../strategy/classic-behavior-distillation.md).

## Why It Exists

`FindingReport` is raw evaluator output. `FindingStatusLedger` records
operator decisions. `FindingLifecycleReport` is the effective per-
finding view. None of those answer the operational question:

> What's the current shape of repository drift, and what should we work
> on first?

`CoherencyDelta` answers it with one artifact.

## What's In It

- **Summary.** Counts of active/accepted/ignored/resolved findings,
  plus breakdowns by severity, type, owner system, and top file paths.
- **Items.** One entry per finding (active or otherwise) with severity,
  status, files, systems, and a normalized `active: boolean`.
- **Remediation queue.** Active findings only, ordered by priority
  (`p0` for critical/high, `p1` for medium, `p2` for low), each entry
  carrying the suggested action.

See [../artifacts/coherency-delta.md](../artifacts/coherency-delta.md)
for the full shape.

## How It Is Built

`rekon coherency delta` calls
`buildCoherencyDelta(store)` in `@rekon/runtime`:

1. Read the latest `FindingLifecycleReport` (or build one in-place if
   none exists yet).
2. Read the latest `OwnershipMap` and `ObservedRepo` if available.
3. Assign systems per finding by longest-prefix match against
   `OwnershipMap`, then `ObservedRepo`, then `"unknown"`.
4. Build `items` from active + resolved findings.
5. Build `remediationQueue` from the active subset, mapping severity to
   priority.
6. Summarize totals, severities, types, systems, and top paths.

The artifact carries `inputRefs` for every consumed report, ledger, and
projection so freshness stays honest.

## Active Versus Inactive

The vocabulary mirrors the finding lifecycle:

- `new` and `existing` findings are `active` and feed the remediation
  queue.
- `accepted` findings are tracked but not active. They are known debt
  or risk; the queue does not surface them.
- `ignored` findings are tracked but not active. They are false
  positives or not-actionable.
- `resolved` findings are tracked but not active. They disappeared
  between runs, or an operator marked them fixed.

This is deliberate. A team that has accepted a finding does not want
it to keep climbing the queue; an operator who ignored a false positive
should not see it again until they un-ignore it.

## Priority

| Severity | Priority |
| --- | --- |
| `critical` | `p0` |
| `high` | `p0` |
| `medium` | `p1` |
| `low` | `p2` |

`p0` items run together in remediation order; consumers can refine
within a priority class using whatever signal makes sense for them
(file owner, last-changed time, etc.). The delta does not enforce a
sub-ordering yet.

## Freshness

`CoherencyDelta` is derived. `rekon artifacts freshness` marks an
older delta `stale` when:

- a newer `FindingLifecycleReport` is indexed;
- a newer upstream `FindingReport` or `FindingStatusLedger` is indexed;
- a newer `OwnershipMap` or `ObservedRepo` is indexed.

Rebuild with `rekon coherency delta` to refresh.

## CLI Surface

```sh
rekon coherency delta --root <repo> --json
```

Output:

```json
{
  "artifact": {
    "type": "CoherencyDelta",
    "id": "coherency-delta-...",
    "path": ".rekon/artifacts/findings/CoherencyDelta-...json",
    "schemaVersion": "0.1.0"
  },
  "summary": {
    "total": 3,
    "active": 2,
    "resolved": 1,
    "accepted": 0,
    "ignored": 0,
    "bySeverity": { "high": 1, "medium": 1 },
    "byType": { "import_boundary.parent_relative_import": 1 },
    "bySystem": { "src": 2 },
    "topPaths": [{ "path": "src/feature/handler.ts", "count": 2 }]
  },
  "remediationQueue": [
    {
      "priority": "p0",
      "findingId": "import_boundary.generated_output_import:src/feature/handler.ts:../../dist/generated",
      "title": "Import from generated/build output",
      "action": "Replace generated-output import with a source import or package entrypoint import.",
      "files": ["src/feature/handler.ts"],
      "systems": ["src"],
      "severity": "high"
    }
  ]
}
```

## Consumed By

- The [architecture summary publication](architecture-summary-publication.md)
  pulls the delta's summary, top paths, and remediation queue into a
  single governance read for humans and agents.
- [Remediation work orders](remediation-work-orders.md) consume the
  active subset of `remediationQueue` to produce prioritized
  `WorkOrder` and `VerificationPlan` artifacts with explicit
  anti-gaming guardrails.
- [Reconciliation suggestion plans](reconciliation-plans.md) classify
  the remediation queue (or the upstream remediation work order's
  items) into per-operation `ReconciliationPlanOperation` records.
  Source-write and command operations are marked deferred; no source
  is modified.

## What This Is Not

- Not a health score. Counts are explicit; no weighting yet.
- Not trend analysis. Computing trend across deltas is future work.
- Not assistant-doc projection on its own. The architecture summary
  publication renders the assistant-facing view from the delta plus
  other artifacts.
- Not remediation auto-apply. The queue lists work; it does not run it.
- Not a watch alert pipeline.

These are intentionally deferred. See
[../strategy/classic-behavior-roadmap.md](../strategy/classic-behavior-roadmap.md).

> **Stale-source guardrails.** Downstream surfaces that consume
> `CoherencyDelta` (architecture summary, agent operating
> contract, `resolve.issue` group mode) now render explicit
> stale-source warnings when the delta was built from raw
> lifecycle but adjudication now exists, when its cited
> `IssueAdjudicationReport` is not the latest, or when the
> adjudication is transitively stale relative to the latest
> `FindingLifecycleReport`. See
> [freshness-and-invalidation.md](freshness-and-invalidation.md).

> **Merge decisions affect the projection, not the source.** v2
> adjudication emits advisory `IssueMergeCandidate` records, and
> operators record explicit `IssueMergeDecisionLedger` decisions
> via `rekon issues merge decide`. In v3, `CoherencyDelta` honors
> **accepted** decisions: linked groups collapse into a single
> merged rollup item and a single remediation step, with raw group
> ids/member finding ids still traceable on the item
> (`mergedIssueGroupIds`, `mergeDecisionIds`, `mergeCandidateIds`,
> `memberFindingIds`). **Rejected** decisions, or candidates with
> no decision, keep groups separate. `IssueAdjudicationReport` is
> not mutated — the rollup is a derived projection in the delta
> only. The `@rekon/capability-docs.architecture-summary` and
> `@rekon/capability-docs.agent-contract` publishers render an
> `Accepted Issue Merge Roll-ups` section/subsection sourced from
> these merged rollup items; `@rekon/capability-resolver` attaches
> an `IssueMergeRollupSummary` to `resolve.issue` packets when the
> matched group is part of an accepted rollup, warns to inspect
> sibling groups, and cites `CoherencyDelta` in
> `header.inputRefs`. Neither surface reads
> `IssueMergeDecisionLedger` directly — everything flows through
> `CoherencyDelta`. See
> [issue-adjudication.md](issue-adjudication.md) and
> [issue-merge-decisions.md](issue-merge-decisions.md).

> **Adjudicated input (v2).** When an `IssueAdjudicationReport`
> exists in the store, `buildCoherencyDelta` now consumes
> **adjudicated groups** instead of raw lifecycle findings. The
> remediation queue therefore counts **governed issues**, not
> duplicate lint rows. Each delta item carries `issueGroupId`,
> `canonicalFindingId`, `memberFindingIds`, and `groupingReasons`
> so raw findings remain traceable. When no adjudication report
> exists yet (legacy fixtures, deliberate pinning), the delta
> falls back to the v1 lifecycle path with no breaking change. See
> [issue-adjudication.md](issue-adjudication.md) and
> [../artifacts/issue-adjudication-report.md](../artifacts/issue-adjudication-report.md)
> for the grouping rules. `rekon refresh` now runs
> `issues.adjudicate` between `findings.lifecycle` and
> `coherency.delta` so every refreshed delta is group-aware.

> **Filter-aware via lifecycle / adjudication.** As of the
> filter-aware lifecycle slice, `FindingLifecycleReport`
> consumes `FindingFilterReport.keptFindings` when a current
> filter report exists. `IssueAdjudicationReport` therefore
> groups only kept findings, and `CoherencyDelta` items /
> remediation queue entries roll up only kept governed issues.
> Filtered findings remain auditable in
> `FindingFilterReport.filteredFindings` but never appear as
> active coherency items. When no current filter report exists,
> the lifecycle (and thus the delta) transparently falls back to
> the raw `FindingReport`. The delta itself does **not** read
> `FindingFilterReport` directly — the lifecycle is the filter
> boundary. See the
> [issue governance architecture decision](../strategy/issue-governance-architecture-decision.md).

## Cross-References

- [CoherencyDelta artifact](../artifacts/coherency-delta.md)
- [Finding lifecycle concept](finding-lifecycle.md)
- [Finding filters concept](finding-filters.md)
- [FindingReport](../artifacts/finding-report.md)
- [FindingFilterReport](../artifacts/finding-filter-report.md)
- [FindingFilterHealthReport](../artifacts/finding-filter-health-report.md)
- [FindingStatusLedger](../artifacts/finding-status-ledger.md)
- [FindingLifecycleReport](../artifacts/finding-lifecycle-report.md)
- [IssueAdjudicationReport](../artifacts/issue-adjudication-report.md)
- [Issue adjudication concept](issue-adjudication.md)
- [Issue governance architecture decision](../strategy/issue-governance-architecture-decision.md)
- [Issue merge decision freshness guardrails](../strategy/issue-merge-decision-freshness-guardrails.md)
- [Issue merge decision operator ergonomics](../strategy/issue-merge-decision-operator-ergonomics.md)
- [Issue merge decision publication / detail polish](../strategy/issue-merge-decision-publication-detail-polish.md)
- [Classic wins](../strategy/classic-wins.md)
- [Classic behavior distillation](../strategy/classic-behavior-distillation.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
- [Capability-Aware Architecture Linting Decision](../strategy/capability-aware-architecture-linting-decision.md)
  — thirty-seventh slice; commits Rekon to a future
  `CapabilityArchitectureLintReport` artifact for
  evaluating `CapabilityContract` placement rules.
  **`CapabilityArchitectureLintReport` does not
  mutate `CoherencyDelta`** — capability-policy
  violations stay in their own artifact unless and
  until an explicit future bridge decision promotes
  selected rows through the finding lifecycle.
  Until that bridge ships, `CoherencyDelta` does
  **not** read `CapabilityArchitectureLintReport`.
- [`CapabilityArchitectureLintReport` artifact](../artifacts/capability-architecture-lint-report.md)
  — thirty-eighth slice; v1 evaluation artifact
  shipped. **`CoherencyDelta` does NOT consume
  `CapabilityArchitectureLintReport` in v1.** The
  lint artifact carries `findingCandidate` previews
  on violation rows, but no `FindingReport` is
  written, no `FindingLifecycleReport` is updated,
  and no `CoherencyDelta` is mutated. A future
  explicit bridge slice would be required before
  any lint row could enter the remediation queue.
- [Capability-Aware Architecture Linting Safety Review](../strategy/capability-architecture-lint-report-safety-review.md)
  — thirty-ninth slice; read-only audit confirming
  `CapabilityArchitectureLintReport` does NOT mutate
  `CoherencyDelta` or enter the remediation queue.
  Declares v1 safe / stable; selects publication
  surfacing (not a finding bridge) as the next slice.
- [Capability-Aware Architecture Linting Publication Safety Review](../strategy/capability-architecture-lint-publication-safety-review.md)
  — forty-first slice; read-only audit confirming the
  publication surfacing of
  `CapabilityArchitectureLintReport` does NOT mutate
  `CoherencyDelta`. Declares the surfacing safe / stable
  as read-only visibility and selects the
  `CapabilityArchitectureLintReport` → `FindingReport`
  bridge decision as the next slice (where any
  `CoherencyDelta` integration would have to be designed
  explicitly).
- [CapabilityArchitectureLintReport → FindingReport bridge decision](../strategy/capability-lint-finding-bridge-decision.md)
  — forty-second slice; selects an intermediate
  `CapabilityLintFindingBridgeReport` **preview** artifact.
  The bridge report **does NOT mutate `CoherencyDelta`**;
  `CoherencyDelta` remains downstream of governed findings.
  Even after a future `FindingReport` writer ships,
  bridged candidates only reach `CoherencyDelta` through
  the normal finding → filter → lifecycle → adjudication
  pipeline.
- [CapabilityLintFindingBridgeReport artifact](../artifacts/capability-lint-finding-bridge-report.md)
  — forty-third slice; the preview bridge report shipped. It
  **does NOT mutate `CoherencyDelta`** (nor `FindingReport`,
  `FindingFilterReport`, `FindingLifecycleReport`, or
  `IssueAdjudicationReport`), and creates no `WorkOrder` /
  `VerificationPlan`. `CoherencyDelta` stays downstream of
  governed findings.
- [CapabilityLintFindingBridgeReport safety review](../strategy/capability-lint-finding-bridge-report-safety-review.md)
  — forty-fourth slice; read-only review confirming no
  `CoherencyDelta` mutation and declaring the preview bridge
  safe / stable.
- [CapabilityLintFindingBridgeReport → FindingReport writer decision](../strategy/capability-lint-finding-writer-decision.md)
  — forty-seventh slice; selects Option B (a future, opt-in
  `FindingReport` writer with dry-run preview + explicit
  confirmation; not implemented). **`CoherencyDelta` remains
  downstream and is not mutated by the writer** — bridged
  candidates only reach `CoherencyDelta` through the normal
  finding → filter → lifecycle → adjudication pipeline. The
  writer's **dry-run helper / CLI** has shipped (forty-eighth
  slice, preview only): it previews the proposed `FindingReport`
  body and mutates no `CoherencyDelta`; write mode is deferred. The
  dry-run **safety review** (forty-ninth slice) declared it **safe
  / stable as preview-only writer modeling**; `CoherencyDelta`
  stays downstream and unmutated. The **writer mode decision**
  (fiftieth slice) selected an opt-in write mode behind
  `--confirm-finding-write` (now **shipped** in the fifty-first
  slice as the writer implementation); the writer does not mutate
  `CoherencyDelta`. The **writer safety review** (fifty-second
  slice) confirmed the writer **safe / stable as a controlled,
  opt-in writer**; `CoherencyDelta` integration remains downstream.
- [Capability-Aware Architecture Linting concept](capability-aware-architecture-linting.md)
