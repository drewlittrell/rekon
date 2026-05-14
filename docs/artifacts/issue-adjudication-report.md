# IssueAdjudicationReport

## Purpose

`IssueAdjudicationReport` is a deterministic projection over
`FindingLifecycleReport` that groups duplicate / overlapping
findings into canonical issue groups so downstream surfaces
(coherency, docs, memory, remediation) can operate on **governed
issues** instead of raw lint-style noise. Raw findings remain
untouched.

This artifact is the Rekon-native equivalent of the
`codebase-intel-classic` issue adjudication / merge / dedupe
pipeline. See the **Issue Detection / Adjudication** entry in
[../strategy/classic-guarantees-audit.md](../strategy/classic-guarantees-audit.md)
and [../concepts/issue-adjudication.md](../concepts/issue-adjudication.md).

## Produced By

- `@rekon/runtime.buildIssueAdjudicationReport`
- Surfaced via CLI: `rekon issues adjudicate`, `rekon issues list`

## Consumed By

- Future `CoherencyDelta` v2 will operate on adjudicated groups
  instead of raw lifecycle findings.
- Future `resolve.issue` v2 may search adjudicated groups first,
  then fall back to `FindingReport` / `FindingLifecycleReport`.
- For now, no other capability consumes the report yet — it is the
  first slice.

## Required Header Fields

All standard `ArtifactHeader` fields. `producer.id` =
`@rekon/runtime.issues`. `inputRefs` cite the latest
`FindingLifecycleReport`, plus everything that report itself cited
(transitively: `FindingReport`(s), `FindingStatusLedger`). When
ownership / repo model artifacts are read for system assignment,
those refs are cited too.

## Shape

```ts
type IssueAdjudicationStatus =
  | "active"
  | "accepted"
  | "ignored"
  | "resolved"
  | "mixed";

type IssueAdjudicationGroup = {
  id: string;
  canonicalFindingId: string;
  memberFindingIds: string[];
  type: string;
  ruleId?: string;
  severity: FindingSeverity;
  status: IssueAdjudicationStatus;
  active: boolean;
  title: string;
  description: string;
  files: string[];
  subjects: string[];
  systems?: string[];
  suggestedAction?: string;
  evidence?: ArtifactRef[];
  groupingKey: string;
  groupingReasons: string[];
  statusBreakdown: Record<string, number>;
};

type IssueAdjudicationReport = {
  header: ArtifactHeader;
  summary: {
    totalGroups: number;
    activeGroups: number;
    acceptedGroups: number;
    ignoredGroups: number;
    resolvedGroups: number;
    mixedGroups: number;
    totalFindings: number;
    groupedFindings: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  };
  groups: IssueAdjudicationGroup[];
};
```

## Grouping Rules

Deterministic only. No fuzzy/semantic/embedding matching.

Group key components, in fixed order:

1. `type`
2. `ruleId` (if present)
3. **One of**: `files=…` (sorted, comma-joined) **OR** `subjects=…`
   when files are empty **OR** `singleton=<finding-id>` when both
   files and subjects are empty.

The `groupingReasons` field on every group explains the key:

- `"same-type"` — always present.
- `"same-rule"` — present when `ruleId` is set.
- `"same-files"` — present when files dimension partitioned the
  group.
- `"same-subjects"` — present when subjects dimension partitioned
  the group (because files were empty).
- `"singleton-no-grouping-key"` — present when the singleton
  fallback key was used.

Singletons are still emitted as groups so no finding is dropped.

## Canonical Finding Selection

For each group, the **canonical** finding (used for `title`,
`description`, `severity`, `ruleId`, `suggestedAction`, and
`canonicalFindingId`) is chosen by:

1. Prefer active members (`effectiveStatus` is `new` or
   `existing`) over inactive.
2. Then highest severity (`critical > high > medium > low`).
3. Then earliest `id` lexicographically.

`severity` on the group is the highest severity across all
members, regardless of which member became canonical.

## Status Derivation

- All members `new` / `existing` → `active`.
- All members `accepted` → `accepted`.
- All members `ignored` → `ignored`.
- All members `resolved` → `resolved`.
- Otherwise → `mixed`.

`active: boolean` is `true` whenever any member is `new` or
`existing` (even when group status is `mixed`).

`statusBreakdown` carries per-`effectiveStatus` counts so
reviewers can see what made up the group without re-reading the
lifecycle report.

## CLI Surface

```sh
rekon issues adjudicate [--root <repo>] [--json]
rekon issues list [--status active|accepted|ignored|resolved|mixed] \
  [--root <repo>] [--json]
```

`issues adjudicate` always writes a fresh
`IssueAdjudicationReport`. `issues list` returns the latest report
if one exists; otherwise it builds and writes one. The optional
`--status` filter applies to the returned `groups` array without
re-deriving the underlying report.

## Freshness And Provenance

`rekon artifacts freshness --type IssueAdjudicationReport` marks
an older adjudication report `stale` once a newer
`FindingLifecycleReport` (or transitively-cited input) lands. The
freshness check uses the standard `header.inputRefs` walk.

## What This Is Not

- **Not a mutator.** Raw `FindingReport`, `FindingStatusLedger`,
  and `FindingLifecycleReport` are never written by adjudication.
- **Not a filter.** No finding is dropped. Singletons are emitted
  as singleton groups with explicit `groupingReasons`.
- **Not a fuzzy / semantic / LLM matcher.** Grouping is
  deterministic key equality.
- **Not a status writer.** `FindingStatusLedger` is the only place
  status changes live. Adjudication reads status, never decides
  it.
- **Not a health score.** No aggregate score is computed.
- **Not a remediation planner.** Adjudication groups are inputs to
  future remediation work, not work orders themselves.

## Cross-References

- [Issue adjudication concept](../concepts/issue-adjudication.md)
- [Finding report](finding-report.md)
- [Finding lifecycle report](finding-lifecycle-report.md)
- [Finding status ledger](finding-status-ledger.md)
- [Coherency delta](coherency-delta.md)
- [Classic guarantees audit](../strategy/classic-guarantees-audit.md)
- [Classic guarantee regression plan](../strategy/classic-guarantee-regression-plan.md)
