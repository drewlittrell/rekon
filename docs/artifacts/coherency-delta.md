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
- Future reconciliation actuators that act on prioritized findings.
- Users and agents looking for a single artifact that summarizes
  current repository drift.

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`CoherencyDelta`. `inputRefs` should cite the
`FindingLifecycleReport`, the `FindingReport`(s) it consumed, the
`FindingStatusLedger` (if used), and any `OwnershipMap` /
`ObservedRepo` used for system assignment.

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

## Freshness And Provenance

`CoherencyDelta` lives under the `findings` category in the artifact
store. Its `inputRefs` include the consumed `FindingLifecycleReport`,
its upstream `FindingReport`(s) and `FindingStatusLedger`, plus
`OwnershipMap` / `ObservedRepo` if they participated.

`rekon artifacts freshness` will mark a `CoherencyDelta` `stale` when
any of those inputs has a newer indexed sibling. Rebuild the delta with
`rekon coherency delta` to refresh.

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
