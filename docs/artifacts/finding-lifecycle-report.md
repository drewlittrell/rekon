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

`FindingLifecycleReport` currently reads `FindingReport`
directly, alongside the latest `FindingStatusLedger`. The
[issue governance architecture decision](../strategy/issue-governance-architecture-decision.md)
introduces a `FindingFilterReport` layer between
`FindingReport` and this artifact: deterministic system /
policy filters suppress false positives with auditable reason /
evidence / confidence. In the current shipped slice, the filter
report is produced but the lifecycle still consumes the raw
`FindingReport`. The next slice
("filter-aware lifecycle / adjudication") will let
`FindingLifecycleReport` prefer
`FindingFilterReport.keptFindings` when present. Until then,
filtered findings remain visible in the lifecycle counts; their
audit trail is in `FindingFilterReport`.

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
