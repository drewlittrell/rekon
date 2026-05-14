# MemoryCurationReport

## Purpose

`MemoryCurationReport` summarizes recorded `MemoryUsageLedger`
events per `OperatorFeedbackEntry` and recommends an action:
**keep**, **reinforce**, **review**, **deprecate**, or
**supersede-candidate**. The report is a **suggestion artifact**.
It never mutates memory.

See [../concepts/memory-curation.md](../concepts/memory-curation.md)
for the wider concept, and the **Operator Feedback / Memory
Curation** entry in
[../strategy/classic-guarantees-audit.md](../strategy/classic-guarantees-audit.md)
for the classic guarantee this artifact preserves.

## Produced By

- `@rekon/capability-memory` (learner, mode `curation`)

## Consumed By

- `@rekon/capability-docs.agent-contract` publisher renders a short
  "Memory Curation Status" line citing the report's summary counts.
- Future capabilities may consume the report to gate other
  workflows (deferred).

## Required Header Fields

All standard `ArtifactHeader` fields. `producer.id` =
`@rekon/capability-memory`. `inputRefs` cite every
`OperatorFeedbackEntry` read at derivation time plus the latest
`MemoryUsageLedger` when present.

## Shape

```ts
type MemoryCurationRecommendation =
  | "keep"
  | "reinforce"
  | "review"
  | "deprecate"
  | "supersede-candidate";

type MemoryCurationItem = {
  memoryEntryId: string;
  instruction: string;
  recommendation: MemoryCurationRecommendation;
  helpfulCount: number;
  ignoredCount: number;
  harmfulCount: number;
  staleCount: number;
  unclearCount: number;
  score: number;
  reasons: string[];
};

type MemoryCurationReport = {
  header: ArtifactHeader;
  summary: {
    totalMemories: number;
    totalUsageEvents: number;
    keep: number;
    reinforce: number;
    review: number;
    deprecate: number;
    supersedeCandidate: number;
  };
  items: MemoryCurationItem[];
};
```

## Recommendation Rules

Applied in order; first match wins:

1. `harmfulCount >= 2` → **deprecate**
2. `harmfulCount >= 1` → **review**
3. `staleCount >= 2` → **supersede-candidate**
4. `helpfulCount >= 2` → **reinforce**
5. `helpfulCount >= 1 && ignoredCount == 0` → **keep**
6. `ignoredCount >= 2 && helpfulCount == 0` → **review**
7. otherwise → **review**

`reasons` is a short, deterministic list of the counts that drove
the recommendation (for example
`["harmful-count: 2"]` or `["no-usage-events"]`). The list is
designed to be human-readable in a CLI table and stable enough to
test against.

`score` is a deterministic float in `[-N, +N]` that summarizes the
mix of outcomes. It is used only for stable sort ordering inside
the report and is not a substitute for the recommendation.

## CLI Surface

```sh
rekon memory curation [--root <repo>] [--json]
```

Reads the latest `OperatorFeedbackEntry` artifacts plus the latest
`MemoryUsageLedger` and writes a new `MemoryCurationReport`. If no
`OperatorFeedbackEntry` exists, returns
`{ artifact: null, summary: { totalMemories: 0 }, message: "No memory entries found." }`
and does **not** write an artifact.

## Freshness And Provenance

`rekon artifacts freshness --type MemoryCurationReport` marks an
older report `stale` when a newer `MemoryUsageLedger` lands, via
the `memory.usage.changed` invalidation rule on
`@rekon/capability-memory`. Rebuild with `rekon memory curation`.

## What This Is Not

- **Not a mutator.** Curation never changes
  `OperatorFeedbackEntry.status`, never deletes entries, never
  rewrites instructions. Operators apply curation decisions
  explicitly.
- **Not an analytics dashboard.** The report is a typed artifact,
  not a multi-day rollup.
- **Not LLM-summarized.** Recommendations are deterministic from
  the recorded counts.
- **Not a supersession graph.** Supersession candidates are
  flagged; actual supersession remains operator-driven.
- **Not a promotion engine.** No memory is auto-promoted to a
  higher priority based on the report.

## Cross-References

- [Operator memory entry](operator-memory-entry.md)
- [Memory usage ledger](memory-usage-ledger.md)
- [Memory selection](memory-selection.md)
- [Memory concept](../concepts/memory.md)
- [Memory curation concept](../concepts/memory-curation.md)
- [Agent operating contract](../concepts/agent-operating-contract.md)
