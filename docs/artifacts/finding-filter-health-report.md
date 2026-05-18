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

- `@rekon/capability-docs.architecture-summary` renders the
  `## Finding Filter Health` section (filter-rate, per-reason
  / per-policy tables, alerts list) using this artifact +
  [`FindingFilterReport`](finding-filter-report.md).
- `@rekon/capability-docs.agent-contract` renders the
  `### Finding Filter Health` subsection under
  `Active Governance State`, visibly warning when any alerts
  exist.
- Operators / agents who want a one-shot view of filter health
  without reading the full filter audit. When recurring
  filtered findings warrant durable policy, run
  `rekon findings filter-policy suggest` to materialize a
  [`FindingFilterPolicySuggestionReport`](finding-filter-policy-suggestion-report.md).

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
    /**
     * Mirror of FindingFilterReport.summary.byPolicy when the
     * upstream filter run loaded any configured policies.
     */
    byPolicy?: Record<string, number>;
    /**
     * Count of findings filtered by configured policies (i.e.
     * source === "policy"). 0 when no policies fired.
     */
    policyFiltered: number;
    /**
     * Sorted policy ids that matched zero findings. Used to
     * emit the `unused-policy-filter` alert.
     */
    unusedPolicies: string[];
    /**
     * Count of findings suppressed by a classic-inspired
     * content filter (see "Classic Content Filters" in
     * `docs/concepts/finding-filters.md`). Always present;
     * `0` when no content filter fired. (v2)
     */
    contentFiltered: number;
    /**
     * Count of findings suppressed by an operator-configured
     * result filter (`findingResultFilters`). Always present;
     * `0` when no result filter fired. (v2)
     */
    resultFiltered: number;
    /**
     * Count of findings suppressed by a built-in path / content
     * heuristic (`generated-file`, `external-file`, `test-file`,
     * `canary-file`, `content-filter`, `explicit-exclusion`,
     * `policy-exception`, `other`). Always present; `0` when no
     * built-in path filter fired. Result + content + policy +
     * built-in counts sum to `totalFiltered`. (diagnostics v2)
     */
    builtInPathFiltered: number;
    /**
     * Per-reason filter rate
     * (`byReason[reason] / totalFindings`), rounded to four
     * decimals. Always present; empty when no findings were
     * filtered. (diagnostics v2)
     */
    filterRateByReason: Record<string, number>;
    /**
     * Per-policy filter rate
     * (`byPolicy[id] / totalFindings`), rounded to four
     * decimals. Present when `byPolicy` is non-empty.
     * (diagnostics v2)
     */
    filterRateByPolicy?: Record<string, number>;
    /**
     * Reason that suppressed the most findings (alphabetic
     * tiebreak). Present when at least one finding was filtered.
     * (diagnostics v2)
     */
    dominantReason?: { reason: string; count: number; rate: number };
    /**
     * Policy id that suppressed the most findings (alphabetic
     * tiebreak). Present when at least one policy filter fired.
     * (diagnostics v2)
     */
    dominantPolicy?: { policyId: string; count: number; rate: number };
    /**
     * Mirror of `FindingFilterReport.policyFingerprint` when the
     * upstream filter report carries one. Lets downstream
     * surfaces inspect filter-policy health without re-reading
     * the filter report directly. (diagnostics v2)
     */
    policyFingerprint?: FindingFilterPolicyFingerprint;
  };
  alerts: FindingFilterHealthAlert[];
};
```

## Alerts

| Code | Trigger | Severity |
| --- | --- | --- |
| `high-filter-rate` | `filterRate > 0.8` (configurable via `highFilterRateThreshold`) | warning |
| `low-confidence-filtered` | any `FilteredFinding.confidence === "low"` | warning |
| `policy-over-filtering` | configured policies suppressed more than 80 % of findings | warning |
| `low-confidence-policy-filter` | a configured policy hit at `confidence: "low"` | warning |
| `unused-policy-filter` | a configured policy matched zero findings | warning |
| `content-filter-high-volume` *(v2)* | one classic-inspired content reason accounts for `>= 5` findings AND `> 50 %` of total findings | warning |
| `result-filter-over-filtering` *(v2)* | configured `findingResultFilters` suppressed more than 80 % of total findings | warning |
| `reason-over-filtering` *(diagnostics v2)* | `totalFindings >= 5` AND `dominantReason.rate >= 0.5` — one reason is doing more than half the suppression | warning |
| `policy-dominance` *(diagnostics v2)* | `totalFindings >= 5` AND `dominantPolicy.rate >= 0.5` — one configured policy is doing more than half the suppression | warning |
| `content-filter-dominance` *(diagnostics v2)* | `totalFindings >= 5` AND `contentFiltered / totalFindings >= 0.5` — classic content filters are dominating | warning |
| `result-filter-dominance` *(diagnostics v2)* | `totalFindings >= 5` AND `resultFiltered / totalFindings >= 0.5` — operator-configured result filters are dominating | warning |
| `policy-fingerprint-missing` *(diagnostics v2)* | `policyFiltered > 0` AND the upstream `FindingFilterReport` has no `policyFingerprint` (filter report predates filter-policy-freshness v2) | warning |
| `stale-policy-fingerprint` *(diagnostics v2)* | caller supplied `currentPolicyFingerprint` that does not match `report.policyFingerprint` — operator changed config after the filter run | warning |

The two new policy-fingerprint alerts mirror the freshness
guardrails that the architecture summary / agent contract
publishers already render. They surface here too so any
non-publication consumer of `FindingFilterHealthReport` sees the
same diagnostic.

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
- **Not configurable beyond `highFilterRateThreshold`.** Custom
  per-reason thresholds and severity escalation remain
  deferred. Configured exclusion policies live in
  `.rekon/config.json` `findingFilters`, not in this artifact.

## Freshness

Goes `stale` when a newer `FindingFilterReport` exists. Rebuild
via `rekon findings filter-health` or
`rekon refresh`.

## Cross-References

- [Issue governance architecture decision](../strategy/issue-governance-architecture-decision.md)
- [Finding filters concept](../concepts/finding-filters.md)
- [FindingFilterReport](finding-filter-report.md)
- [FindingReport](finding-report.md)
