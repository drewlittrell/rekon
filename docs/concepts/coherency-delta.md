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

## Cross-References

- [CoherencyDelta artifact](../artifacts/coherency-delta.md)
- [Finding lifecycle concept](finding-lifecycle.md)
- [FindingReport](../artifacts/finding-report.md)
- [FindingStatusLedger](../artifacts/finding-status-ledger.md)
- [FindingLifecycleReport](../artifacts/finding-lifecycle-report.md)
- [Classic wins](../strategy/classic-wins.md)
- [Classic behavior distillation](../strategy/classic-behavior-distillation.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
