# FindingFilterReport

## Purpose

`FindingFilterReport` records the **system / policy filtering**
audit over a `FindingReport`. It is the audit layer between raw
evaluator output and the governed lifecycle / adjudication chain.

A filtered finding is a finding that a deterministic rule
suppressed from active governance because it is almost
certainly a false positive — for example, the finding was raised
against a path under `dist/`, `node_modules/`, or `tests/`. The
filter never mutates the upstream `FindingReport`; it produces a
new artifact that:

- Lists every filtered finding, including the full original
  payload, reason, evidence string, optional file path, and
  confidence label.
- Lists every kept finding so downstream consumers can opt in to
  the filtered projection without re-deriving it.

This artifact preserves classic codebase-intel's false-positive
filtering and audit guarantee. See
[../strategy/issue-governance-architecture-decision.md](../strategy/issue-governance-architecture-decision.md)
for the layered governance model that situates it.

## Produced By

- `@rekon/runtime.buildFindingFilterReport(store, options?)` —
  reads the latest `FindingReport` (or a pinned `findingReportId`)
  and emits a `FindingFilterReport`. Exposed via
  `rekon findings filter` and run automatically by
  `rekon refresh` between `evaluate` and `findings.lifecycle`.

## Consumed By

- `@rekon/runtime.buildFindingFilterHealthReport` reads the
  latest `FindingFilterReport` to derive
  `FindingFilterHealthReport`.
- Future "filter-aware lifecycle / adjudication" slice will let
  `FindingLifecycleReport` and `IssueAdjudicationReport` prefer
  `keptFindings` from the latest filter report (when present)
  before falling back to `FindingReport`. That slice is
  intentionally deferred.
- Operators / agents inspecting why a particular finding
  disappeared from the active governance surface.

## Required Header Fields

All standard `ArtifactHeader` fields. `producer.id` =
`@rekon/runtime.findings`. `inputRefs` cite the `FindingReport`
the run filtered. `freshness` is `fresh` at write time;
`rekon artifacts freshness` marks the artifact `stale` when a
newer `FindingReport` exists.

## Shape

```ts
type FindingFilterReason =
  | "test-file"
  | "generated-file"
  | "external-file"
  | "canary-file"
  | "explicit-exclusion"
  | "content-filter"
  | "policy-exception"
  | "other";

type FindingFilterConfidence = "high" | "medium" | "low";

type FilteredFinding = {
  findingId: string;
  finding: Finding;
  reason: FindingFilterReason;
  evidence: string;
  filePath?: string;
  confidence: FindingFilterConfidence;
  filteredAt: string;
  source: "system" | "operator" | "policy";
};

type FindingFilterReport = {
  header: ArtifactHeader;
  summary: {
    totalFiltered: number;
    kept: number;
    byReason: Record<string, number>;
    byConfidence: Record<string, number>;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  keptFindings: Finding[];
  filteredFindings: FilteredFinding[];
};
```

## Deterministic v1 Filter Rules

`applyFindingFilters` walks every file on every finding and
returns the highest-priority match. Priority order (strongest
first):

| Reason | Trigger | Confidence |
| --- | --- | --- |
| `generated-file` | path segment is `dist`, `build`, or `generated`, or path contains `__generated__` or `.generated.` | high |
| `external-file` | path segment is `node_modules`, `vendor`, or `third_party` | high |
| `test-file` | path segment is `test`, `tests`, `__tests__`, or `__test__`, or filename ends with `.test.{ts,tsx,js,jsx,mjs,cjs}` or `.spec.{ts,tsx,js,jsx,mjs,cjs}` | high |
| `canary-file` | path contains `canary` | high |
| `explicit-exclusion` | reserved for future config-driven exclusions | n/a in v1 |
| `content-filter` | finding text mentions "generated output" **and** file is in a generated path | medium |
| `policy-exception` | reserved | n/a in v1 |
| `other` | reserved | low when used |

If a finding has no `files`, no rule matches and it is **kept**.

## CLI Surface

```sh
rekon findings filter --root <repo> --json
rekon findings filter-health --root <repo> --json
```

`rekon refresh` also runs the filter and filter-health steps
between `evaluate` and `findings.lifecycle`.

## What This Is Not

- **Not a status decision.** Operator decisions
  (`accepted` / `ignored` / `resolved`) remain in
  `FindingStatusLedger`; filtering is system / policy
  suppression with audit evidence.
- **Not a mutation.** Filtered findings stay in
  `filteredFindings`. `FindingReport` is unchanged on disk.
- **Not a graph / ontology validator.** The classic
  `GraphOntologyValidator` port is deferred.
- **Not configurable yet.** v1 ships built-in deterministic
  rules. Configurable filters via `.rekon/config.json` are an
  open question.
- **Not consumed by lifecycle / adjudication / coherency yet.**
  Filter artifacts are produced and auditable today; downstream
  consumption is the next slice
  ([filter-aware lifecycle / adjudication](../strategy/issue-governance-architecture-decision.md)).

## Cross-References

- [Issue governance architecture decision](../strategy/issue-governance-architecture-decision.md)
- [Finding filters concept](../concepts/finding-filters.md)
- [FindingReport](finding-report.md)
- [FindingFilterHealthReport](finding-filter-health-report.md)
- [FindingLifecycleReport](finding-lifecycle-report.md)
- [FindingStatusLedger](finding-status-ledger.md)
- [IssueAdjudicationReport](issue-adjudication-report.md)
