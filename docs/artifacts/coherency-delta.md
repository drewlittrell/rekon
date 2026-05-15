# CoherencyDelta

## Purpose

`CoherencyDelta` is a derived governance artifact that rolls
`FindingLifecycleReport` data into severity/system/path summaries and
a basic remediation queue.

This is the alpha "lite" form of the classic coherency-delta behavior.
It is intentionally smaller than the classic
[`packages/product-codebase-intel/src/replatform/replatform-delta.ts`](https://github.com/codebase-intel/codebase-intel-classic):
no weighted health score, no trend, no watch alerts, no assistant-doc
projection, no remediation auto-apply.

## Produced By

- `@rekon/runtime.coherency` via `buildCoherencyDelta(store, options?)`
  and the CLI command `rekon coherency delta`.

## Consumed By

- `@rekon/capability-docs.architecture-summary` (built-in) renders the
  [architecture summary publication](architecture-summary-publication.md)
  from the latest CoherencyDelta plus the snapshot, ownership/
  capability maps, and finding lifecycle.
- `@rekon/capability-intent.remediation-work-order` (built-in)
  generates prioritized [remediation work orders](../concepts/remediation-work-orders.md)
  from the active subset of `CoherencyDelta.remediationQueue`.
- `@rekon/capability-reconcile.actuator` (built-in) in suggestion mode
  classifies the remediation queue (or the upstream remediation work
  order's items) into a [reconciliation plan](reconciliation-plan.md)
  with per-operation class and permission requirements. Source-write
  and command operations remain deferred.
- Users and agents looking for a single artifact that summarizes
  current repository drift.

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`CoherencyDelta`. `inputRefs` cite the upstream source:

- **v2 (preferred) — adjudicated mode**: the latest
  `IssueAdjudicationReport` plus every ref that report itself
  carried (transitively the `FindingLifecycleReport`,
  `FindingReport`(s), `FindingStatusLedger`). Plus any
  `OwnershipMap` / `ObservedRepo` used for system assignment.
- **v1 — legacy lifecycle mode** (used when no
  `IssueAdjudicationReport` exists, or when the caller pins a
  specific `lifecycleReportId`): the `FindingLifecycleReport`, the
  `FindingReport`(s) it consumed, the `FindingStatusLedger` (if
  used), and any `OwnershipMap` / `ObservedRepo`.

## Shape

```ts
type CoherencyDeltaSeverity = "critical" | "high" | "medium" | "low";

type CoherencyDeltaItemStatus =
  | "new"
  | "existing"
  | "accepted"
  | "ignored"
  | "resolved";

type CoherencyDeltaItem = {
  id: string;
  findingId: string;
  type: string;
  severity: CoherencyDeltaSeverity;
  title: string;
  description: string;
  files: string[];
  systems: string[];
  suggestedAction?: string;
  status: CoherencyDeltaItemStatus;
  active: boolean;
  evidence?: ArtifactRef[];
  // v2 group-aware fields (present only when the item was derived
  // from an IssueAdjudicationGroup; absent for lifecycle-derived
  // items). `findingId` mirrors `canonicalFindingId` in group mode.
  issueGroupId?: string;
  canonicalFindingId?: string;
  memberFindingIds?: string[];
  groupingReasons?: string[];
};

type CoherencyRemediationStep = {
  id: string;
  priority: "p0" | "p1" | "p2";
  findingId: string;
  title: string;
  action: string;
  files: string[];
  systems: string[];
  severity: CoherencyDeltaSeverity;
};

type CoherencyDelta = {
  header: ArtifactHeader;
  summary: {
    total: number;
    active: number;
    resolved: number;
    accepted: number;
    ignored: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    bySystem: Record<string, number>;
    topPaths: Array<{ path: string; count: number }>;
  };
  items: CoherencyDeltaItem[];
  remediationQueue: CoherencyRemediationStep[];
};
```

## Active Versus Inactive

- `active === true` when `status` is `new` or `existing`.
- `accepted`, `ignored`, and `resolved` items are included in `items`
  and reflected in summary counts but are not active.
- `remediationQueue` includes active findings only.

The `summary.active` count excludes accepted / ignored / resolved
findings on purpose. The system answers "what work is left?", not
"what was ever flagged?".

## Priority Mapping

`CoherencyRemediationStep.priority` maps from finding severity:

| Severity | Priority |
| --- | --- |
| `critical` | `p0` |
| `high` | `p0` |
| `medium` | `p1` |
| `low` | `p2` |

`remediationQueue` is sorted by priority then `findingId`. Items with
the same priority appear in deterministic id order.

## System Assignment

The runtime helper assigns systems per finding via:

1. `OwnershipMap` longest-prefix match wins (highest confidence breaks
   ties).
2. `ObservedRepo` longest-prefix match next.
3. `"unknown"` fallback when neither matches.

Findings without any associated files are tagged with `"unknown"` as a
single-element system list so summaries always count them somewhere.

## Adjudicated Mode (v2)

When `buildCoherencyDelta` finds an `IssueAdjudicationReport` in
the store, it builds items from the report's `groups` instead of
raw lifecycle findings. The result:

- one item per adjudicated group, not one item per duplicate
  finding;
- one `remediationQueue` step per active group (id
  `remediation:group:<group-id>`), not one per member;
- each item carries `issueGroupId`, `canonicalFindingId`,
  `memberFindingIds`, and `groupingReasons` so raw findings remain
  traceable;
- `findingId` mirrors `canonicalFindingId` for backward
  compatibility with existing consumers that key on `findingId`.

Group status maps to item status as follows:

| Group status | Item status | Item active |
| --- | --- | --- |
| `active` | `existing` | `true` |
| `accepted` | `accepted` | `false` |
| `ignored` | `ignored` | `false` |
| `resolved` | `resolved` | `false` |
| `mixed` (with `group.active`) | `existing` | `true` |
| `mixed` (without `group.active`) | `accepted` | `false` |

Group-aware item ids are `coherency:group:<group-id>` so they do
not collide with lifecycle-derived items (`coherency:<finding-id>`).
Group-aware remediation step ids are `remediation:group:<group-id>`.

`rekon refresh` runs `issues.adjudicate` between
`findings.lifecycle` and `coherency.delta` so the delta picks up
the freshest adjudication report on every refresh.

## Legacy Lifecycle Mode (v1)

If no `IssueAdjudicationReport` exists yet, or the caller passes
`lifecycleReportId` to pin a specific lifecycle report,
`buildCoherencyDelta` falls back to the legacy lifecycle path:

- one item per `EffectiveFinding`,
- one remediation step per active finding (id
  `remediation:<finding-id>`),
- no group-aware fields on items.

This preserves backward compatibility for any caller that has not
yet adopted adjudication.

## Freshness And Provenance

`CoherencyDelta` lives under the `findings` category in the artifact
store. In v2 (adjudicated) mode, `inputRefs` carry the
`IssueAdjudicationReport` plus every ref it itself carried — so
lineage flows transitively to the `FindingLifecycleReport`,
`FindingReport`(s), `FindingStatusLedger`, and any `OwnershipMap`
/ `ObservedRepo`. In v1 (legacy) mode, `inputRefs` cite the
`FindingLifecycleReport` and its upstream refs directly.

`rekon artifacts freshness` will mark a `CoherencyDelta` `stale`
when any of those inputs has a newer indexed sibling — including a
newer `IssueAdjudicationReport`. Rebuild the delta with `rekon
coherency delta` to refresh (or rerun `rekon refresh` for the full
lifecycle).

Downstream surfaces also render stale-source warnings inline:
the architecture summary emits `## Input Freshness Warnings`, the
agent operating contract renders a `### Governance Freshness`
subsection, and `resolve.issue` (group mode) emits an
`issue.freshness` trace plus a `packet.warnings[]` entry when
the adjudication source is stale. See
[../concepts/freshness-and-invalidation.md](../concepts/freshness-and-invalidation.md).

## What This Is Not

- This is not a health score. Severity counts are explicit; weighting
  is deferred until there's a real consumer.
- This is not trend analysis. The delta is a snapshot; trend
  computation across deltas is future work.
- This is not assistant-doc projection. A future architecture-summary
  publisher will consume the delta.
- This is not remediation auto-apply. The queue lists work; it does
  not run it.
- This is not a watch alert pipeline.

## Cross-References

- [Concept overview](../concepts/coherency-delta.md)
- [Finding lifecycle concept](../concepts/finding-lifecycle.md)
- [FindingReport](finding-report.md)
- [FindingStatusLedger](finding-status-ledger.md)
- [FindingLifecycleReport](finding-lifecycle-report.md)
- [Classic behavior distillation](../strategy/classic-behavior-distillation.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
