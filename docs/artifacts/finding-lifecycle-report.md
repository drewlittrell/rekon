# FindingLifecycleReport

## Purpose

`FindingLifecycleReport` is a projection artifact that combines the
latest `FindingReport`, any previous `FindingReport` artifacts, and the
latest `FindingStatusLedger` to compute effective per-finding status
plus an aggregate summary.

It is the durable answer to questions like "which findings are new",
"which findings are ignored and why", and "which findings disappeared
between runs".

## Produced By

- `@rekon/runtime.findings` (via
  `buildFindingLifecycleReport(store, options?)` and the CLI command
  `rekon findings lifecycle`).

## Consumed By

- Users and agents inspecting the current finding view via
  `rekon findings list`.
- Future publishers (e.g., a future "findings summary" publisher).
- Future projectors that derive `CoherencyDelta`, `HealthProjection`,
  or `RemediationPlan` artifacts.

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`FindingLifecycleReport`. `inputRefs` should cite the FindingReport(s)
and FindingStatusLedger used.

## Shape

```ts
type EffectiveFinding = Finding & {
  effectiveStatus: "new" | "existing" | "resolved" | "accepted" | "ignored";
  statusSource: "report" | "ledger" | "derived";
  statusDecisionId?: string;
  statusNote?: string;
  statusReason?: "accepted-risk" | "false-positive" | "fixed" | "not-actionable" | "other";
  lifecycle?: {
    firstSeenReportId?: string;
    lastSeenReportId?: string;
    presentInLatestReport: boolean;
  };
};

type FindingLifecycleReport = {
  header: ArtifactHeader;
  summary: {
    total: number;
    active: number;
    new: number;
    existing: number;
    accepted: number;
    ignored: number;
    resolved: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  };
  findings: EffectiveFinding[];        // present in latest report
  resolvedFindings: EffectiveFinding[]; // in previous report(s), absent from latest
  decisions: FindingStatusDecision[];   // from the latest ledger
};
```

`active` counts `new` + `existing` findings. `accepted` and `ignored`
counts include ledger-overridden findings regardless of whether they
appeared in the latest report.

## Derivation Rules

See [finding-lifecycle.md](../concepts/finding-lifecycle.md). The
runtime helper exposes the same logic:

```ts
import { buildFindingLifecycleReport } from "@rekon/runtime";

const lifecycle = await buildFindingLifecycleReport(store);
```

Options:

- `reportId` — pin to a specific `FindingReport`.
- `ledgerId` — pin to a specific `FindingStatusLedger`.

If `reportId` is omitted, the latest `FindingReport` by `writtenAt`
wins.

## Freshness And Provenance

`FindingLifecycleReport` is a derived projection; lineage flows through
the `FindingReport` and `FindingStatusLedger` artifacts in its
`inputRefs`. `rekon artifacts freshness` will mark the report stale
when a newer `FindingReport` or `FindingStatusLedger` exists.

## Relationship To Filtering

`FindingLifecycleReport` reads
[`FindingFilterReport.keptFindings`](finding-filter-report.md)
as the active surface when a **current** filter report exists.
"Current" means the filter report cites the latest
`FindingReport` in its `header.inputRefs`. This is the filter-
aware lifecycle slice of the
[issue governance architecture decision](../strategy/issue-governance-architecture-decision.md).

Filter-aware lifecycle behavior:

- The latest set comes from `FindingFilterReport.keptFindings`;
  filtered findings stay auditable in
  `FindingFilterReport.filteredFindings` and do **not** appear
  as active lifecycle findings.
- `inputRefs` cite the `FindingFilterReport` plus the transitive
  raw `FindingReport` from the filter report's own
  `inputRefs`, so lineage to the raw report stays intact.
- Previous-report comparison (for the `new` vs. `existing` vs.
  `resolved` lifecycle states) still walks prior `FindingReport`
  entries as before — the filter projection only swaps the
  **latest** set, not the historical sequence.
- When the latest filter report is missing or stale (does not
  cite the latest `FindingReport`), the lifecycle falls back to
  the raw `FindingReport` transparently and does **not** cite
  the stale filter. Staleness is also visible via
  `rekon artifacts freshness` because the filter report itself
  is flagged stale relative to the newer `FindingReport`.
- The lifecycle continues to apply the latest
  `FindingStatusLedger` for operator status decisions; status
  decisions remain a separate concern from system / policy
  filtering.

Raw `FindingReport` is never mutated; the kept-vs-filtered
projection is layered above it.

## Cross-References

- [Finding lifecycle concept](../concepts/finding-lifecycle.md)
- [FindingReport](finding-report.md)
- [FindingFilterReport](finding-filter-report.md)
- [FindingFilterHealthReport](finding-filter-health-report.md)
- [Finding filters concept](../concepts/finding-filters.md)
- [Issue governance architecture decision](../strategy/issue-governance-architecture-decision.md)
- [FindingStatusLedger](finding-status-ledger.md)
- [IssueAdjudicationReport](issue-adjudication-report.md)
- [Issue adjudication concept](../concepts/issue-adjudication.md)
- [CoherencyDelta](coherency-delta.md)
- [ResolverPacket](resolver-packet.md)

## Downstream Projections

A `CoherencyDelta` projection consumes this report to produce
severity/system summaries and a remediation queue. See
[coherency-delta.md](coherency-delta.md) and
[../concepts/coherency-delta.md](../concepts/coherency-delta.md).

An `IssueAdjudicationReport` projection consumes this report to
group duplicate findings into canonical issue groups with
explicit grouping reasons, without mutating the lifecycle data.
See [issue-adjudication-report.md](issue-adjudication-report.md)
and [../concepts/issue-adjudication.md](../concepts/issue-adjudication.md).
