# MemoryUsageLedger

## Purpose

`MemoryUsageLedger` records explicit operator feedback about how a
piece of operator memory was actually used. It is the feedback loop
that lets curation distinguish helpful guidance from misleading or
stale guidance.

Selection is not usage. `rekon memory select` writes a
`MemorySelection` artifact ranking which memories were considered
applicable to a task. The ledger answers a different question:
**after** the selection landed in a resolver packet, a publication,
or an agent's working context, did it actually help?

See [../strategy/classic-guarantees-audit.md](../strategy/classic-guarantees-audit.md)
and [../concepts/memory-curation.md](../concepts/memory-curation.md)
for the wider classic-guarantee context.

## Produced By

- `@rekon/capability-memory` (learner, mode `usage-record`)

## Consumed By

- `@rekon/capability-memory` curation mode reads the latest ledger
  to derive `MemoryCurationReport`.
- Future capabilities may consume usage events to enrich rankings
  (deferred — this batch does not change ranking).

## Required Header Fields

All standard `ArtifactHeader` fields. `producer.id` =
`@rekon/capability-memory`. `inputRefs` cite the
`OperatorFeedbackEntry`s known at write time, the cited
`MemorySelection` (when `--selection` is supplied), and any
operator-provided evidence refs.

## Shape

```ts
type MemoryUsageOutcome =
  | "helpful"
  | "ignored"
  | "harmful"
  | "stale"
  | "unclear";

type MemoryUsageContext = {
  path?: string;
  goal?: string;
  resolverId?: string;
  publicationId?: string;
  workOrderId?: string;
};

type MemoryUsageEvent = {
  id: string;
  memoryEntryId: string;
  memorySelectionId?: string;
  outcome: MemoryUsageOutcome;
  note: string;
  usedAt: string;
  usedBy?: string;
  context?: MemoryUsageContext;
  evidence?: ArtifactRef[];
};

type MemoryUsageLedger = {
  header: ArtifactHeader;
  events: MemoryUsageEvent[];
};
```

## Validation Rules

- `events` must be an array.
- Every event must have `id`, `memoryEntryId`, `outcome`, `usedAt`.
- `outcome` must be one of the five enum values.
- `note` is required when `outcome` is `harmful`, `stale`, or
  `ignored`. The "why" is the load-bearing field for any future
  review.

## CLI Surface

```sh
rekon memory usage record <memory-entry-id> --outcome <outcome> --note <note> \
  [--selection <selection-id>] [--path <path>] [--goal <goal>] \
  [--used-by <name>] [--root <repo>] [--json]

rekon memory usage list [--root <repo>] [--json]
```

`memory usage record` appends an event to the latest
`MemoryUsageLedger` (or creates a new one if none exists) and
writes a new ledger artifact. `memory usage list` prints the events
from the latest ledger.

## What This Is Not

- Not a watcher. Events are recorded explicitly by the operator or
  by an agent acting as the operator.
- Not automatic curation. Curation recommendations are derived from
  the ledger but never mutate `OperatorFeedbackEntry.status`.
- Not a global feedback store. Each repo's workspace owns its own
  ledger.
- Not an LLM summarization surface.
- Not a memory ranking input in this batch (deferred).

## Cross-References

- [Operator memory entry](operator-memory-entry.md)
- [Memory selection](memory-selection.md)
- [Memory curation report](memory-curation-report.md)
- [Memory concept](../concepts/memory.md)
- [Memory curation concept](../concepts/memory-curation.md)
