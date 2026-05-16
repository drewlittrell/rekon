# FindingFilterHealthReport

## Purpose

`FindingFilterHealthReport` summarizes the most recent
`FindingFilterReport` and emits actionable alerts when filtering
behavior looks suspicious. It exists so operators do not need
to read the full filter audit to know whether the filter layer
is healthy.

## Produced By

- `@rekon/runtime.buildFindingFilterHealthReport(store,
  options?)` — reads the latest `FindingFilterReport` (or builds
  one if missing, controllable via `buildIfMissing: false`).
  Exposed via `rekon findings filter-health` and run
  automatically by `rekon refresh` after
  `findings.filter`.

## Consumed By

- Operators / agents who want a one-shot view of filter health
  without reading the full filter audit.
- Future surfaces (e.g. agent contract, architecture summary)
  may opt in to rendering filter-health alerts — out of scope
  for this slice.

## Required Header Fields

All standard `ArtifactHeader` fields. `producer.id` =
`@rekon/runtime.findings`. `inputRefs` cite the
`FindingFilterReport` the run summarized plus that report's own
`inputRefs` (transitively the `FindingReport`).

## Shape

```ts
type FindingFilterHealthAlert = {
  code: string;
  severity: "warning" | "error";
  message: string;
};

type FindingFilterHealthReport = {
  header: ArtifactHeader;
  summary: {
    totalFindings: number;
    totalFiltered: number;
    filterRate: number;
    highConfidenceFiltered: number;
    lowConfidenceFiltered: number;
    byReason: Record<string, number>;
  };
  alerts: FindingFilterHealthAlert[];
};
```

## v1 Alerts

| Code | Trigger | Severity |
| --- | --- | --- |
| `high-filter-rate` | `filterRate > 0.8` (configurable via `highFilterRateThreshold`) | warning |
| `low-confidence-filtered` | any `FilteredFinding.confidence === "low"` | warning |

Alerts are sorted by `code` for stable output. The list is empty
when filtering looks healthy.

## CLI Surface

```sh
rekon findings filter-health --root <repo> --json
```

Output:

```json
{
  "artifact": { "type": "FindingFilterHealthReport", "id": "...", "path": "..." },
  "summary": {
    "totalFindings": 12,
    "totalFiltered": 3,
    "filterRate": 0.25,
    "highConfidenceFiltered": 3,
    "lowConfidenceFiltered": 0,
    "byReason": { "generated-file": 2, "test-file": 1 }
  },
  "alerts": []
}
```

## What This Is Not

- **Not a health score.** It is a small, explicit alert list —
  no weighted score, no trend.
- **Not a watcher.** It does not poll; it reports the latest
  filter report at call time.
- **Not configurable in v1.** Custom alert thresholds beyond
  `highFilterRateThreshold` are deferred.

## Freshness

Goes `stale` when a newer `FindingFilterReport` exists. Rebuild
via `rekon findings filter-health` or
`rekon refresh`.

## Cross-References

- [Issue governance architecture decision](../strategy/issue-governance-architecture-decision.md)
- [Finding filters concept](../concepts/finding-filters.md)
- [FindingFilterReport](finding-filter-report.md)
- [FindingReport](finding-report.md)
