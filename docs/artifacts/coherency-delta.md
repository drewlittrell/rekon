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
  capability maps, and finding lifecycle. v3 adds an
  `Accepted Issue Merge Roll-ups` section derived from merged
  rollup items (`mergedIssueGroupIds.length > 1`).
- `@rekon/capability-docs.agent-contract` (built-in) renders the
  [agent operating contract](agent-contract-publication.md). v3 adds
  an `Accepted Issue Merge Roll-ups` subsection under
  `Active Governance State` plus a `Do Not Do` reminder that merged
  roll-ups are projections, not source mutations.
- `@rekon/capability-resolver.issueResolver` (built-in) attaches an
  `IssueMergeRollupSummary` to `resolve.issue` packets when the
  matched group is part of an accepted merged rollup; the packet
  warns operators to inspect sibling group(s) before acting and
  cites the source `CoherencyDelta` in `header.inputRefs`. Rejected
  decisions never produce a `mergeRollup`.
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

- **v3 (preferred when present) — adjudicated mode + operator merge
  decisions**: the latest `IssueAdjudicationReport`, every ref that
  report itself carried (transitively the `FindingLifecycleReport`,
  `FindingReport`(s), `FindingStatusLedger`), the latest
  `IssueMergeDecisionLedger` (only when it carries any decisions),
  and any `OwnershipMap` / `ObservedRepo` used for system assignment.
- **v2 — adjudicated mode (no decisions yet)**: same as v3 but with
  no `IssueMergeDecisionLedger` in `inputRefs`. Items are one-per-group.
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
  // v3 merge-aware fields (present only when accepted decisions in
  // the IssueMergeDecisionLedger collapsed two or more groups into
  // a single rollup item). Raw group ids and member finding ids are
  // still traceable on every item.
  mergedIssueGroupIds?: string[];
  mergeDecisionIds?: string[];
  mergeCandidateIds?: string[];
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

## Merge-Decision Aware Mode (v3)

When an `IssueMergeDecisionLedger` exists with at least one decision,
`buildCoherencyDelta` honors **accepted** decisions when forming the
delta projection. Concretely:

- The latest decision per `candidateId` wins; a later `rejected`
  decision supersedes an earlier `accepted` decision (and vice versa).
- Each accepted decision connects the issue groups it references in
  `groupIds` (taken from the `IssueMergeCandidate` when present, or
  the decision's own `groupIds`).
- Connected components of accepted decisions become a single
  **merged rollup item**. Three groups linked by two accepted
  decisions collapse into one item.
- Groups not linked by any accepted decision become singleton items
  (identical to v2 behavior).

Merged rollup items carry:

- `id` of the form `coherency:rollup:merged:<sorted-group-ids-joined-by-+>`
  for multi-group rollups, or the regular `coherency:group:<group-id>`
  shape for singletons.
- `mergedIssueGroupIds` — all group ids included in the merged rollup,
  sorted.
- `mergeDecisionIds` — sorted ids of every accepted decision used.
- `mergeCandidateIds` — sorted ids of every merge candidate used.
- `memberFindingIds` — the union of member finding ids across the
  bucket.
- `issueGroupId` and `canonicalFindingId` — the canonical group's id
  (highest-severity-active group; deterministic tiebreaker by id).
- `groupingReasons` — `"operator-accepted-merge"` plus the union of
  the underlying groups' grouping reasons.
- Worst severity across the bucket; status `existing` (if any group
  is active) or the strongest inactive status otherwise.

Merged remediation steps use the id form
`remediation:merged:<sorted-group-ids-joined-by-+>` so the queue
collapses to one step per accepted merged set.

**Rejected decisions are respected.** A rejected decision (or the
absence of any accepted decision for a candidate) keeps the
referenced groups separate, exactly as in v2.

**No artifact mutation.** `IssueAdjudicationReport.groups` is
untouched on disk. The rollup is a derived projection in
`CoherencyDelta` only.

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

## Filter Awareness (Transitive)

`CoherencyDelta` is filter-aware **transitively** through the
`IssueAdjudicationReport → FindingLifecycleReport → FindingFilterReport`
chain. The lifecycle helper consumes
`FindingFilterReport.keptFindings` when a current filter report
exists, so only kept findings flow into governed issue groups and
therefore into delta items / remediation queue entries. Filtered
findings stay auditable in
`FindingFilterReport.filteredFindings` but never become active
coherency items. The delta itself does **not** read
`FindingFilterReport` directly. See
[../concepts/finding-filters.md](../concepts/finding-filters.md)
and
[../strategy/issue-governance-architecture-decision.md](../strategy/issue-governance-architecture-decision.md).

## Freshness And Provenance

`CoherencyDelta` lives under the `findings` category in the artifact
store. In v2 (adjudicated) mode, `inputRefs` carry the
`IssueAdjudicationReport` plus every ref it itself carried — so
lineage flows transitively to the `FindingLifecycleReport`,
`FindingFilterReport` (when the lifecycle used kept findings),
`FindingReport`(s), `FindingStatusLedger`, and any `OwnershipMap`
/ `ObservedRepo`. In v1 (legacy) mode, `inputRefs` cite the
`FindingLifecycleReport` and its upstream refs directly.

`rekon artifacts freshness` will mark a `CoherencyDelta` `stale`
when any of those inputs has a newer indexed sibling — including a
newer `IssueAdjudicationReport` or a newer `IssueMergeDecisionLedger`
(once any decisions have been recorded). Rebuild the delta with
`rekon coherency delta` to refresh (or rerun `rekon refresh` for the
full lifecycle).

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

## Accepted Merge Roll-up Freshness

Accepted merge roll-ups are recorded on
`items[].mergedIssueGroupIds`, `mergeDecisionIds`, and
`mergeCandidateIds` and consumed by architecture
summary, agent contract, and `resolve.issue`. The
[issue merge decision freshness guardrails](../strategy/issue-merge-decision-freshness-guardrails.md)
predicate flags the consumed roll-up context as
**stale for decision-making** when the
`CoherencyDelta` cites an older
`IssueMergeDecisionLedger` / `IssueAdjudicationReport`
than the latest, when the cited adjudication is stale
relative to the latest `FindingLifecycleReport`, when
`mergedIssueGroupIds` exist with no
`IssueMergeDecisionLedger` ref, or when the latest
decision for any `mergeCandidateId` has been
superseded. Warnings recommend `rekon refresh`; they
do **not** invalidate this artifact.

## Cross-References

- [Concept overview](../concepts/coherency-delta.md)
- [Finding lifecycle concept](../concepts/finding-lifecycle.md)
- [FindingReport](finding-report.md)
- [FindingStatusLedger](finding-status-ledger.md)
- [FindingLifecycleReport](finding-lifecycle-report.md)
- [IssueAdjudicationReport](issue-adjudication-report.md)
- [IssueMergeDecisionLedger](issue-merge-decision-ledger.md)
- [Issue merge decisions concept](../concepts/issue-merge-decisions.md)
- [Issue merge decision freshness guardrails](../strategy/issue-merge-decision-freshness-guardrails.md)
- [Classic behavior distillation](../strategy/classic-behavior-distillation.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
