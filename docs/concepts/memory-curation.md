# Memory Curation

Ranking memory is not enough. Operators and agents need to know
whether a piece of guidance actually helped, was misleading, was
ignored, or has gone stale. Without that feedback loop memory
becomes prompt sludge: it keeps resurfacing, it never gets better,
and there is no way to surface candidates for deprecation or
supersession.

`rekon` closes that loop with two artifact types and one new CLI
command path:

- `MemoryUsageLedger` records explicit operator feedback about
  outcomes after a memory was used.
- `MemoryCurationReport` summarizes those outcomes per memory and
  recommends an action.
- `rekon memory curation` derives and writes the report on demand.

This is the Rekon-native equivalent of the `codebase-intel-classic`
operator-feedback / memory-curation guarantee — see the **Operator
Feedback / Memory Curation** entry in
[../strategy/classic-guarantees-audit.md](../strategy/classic-guarantees-audit.md).

## Why It Exists

The previous batch (Memory Ranking / Curation v1) shipped
deterministic scoring with reasons. It did not record outcomes. So
even highly-ranked memory could keep resurfacing for a task it had
proven unhelpful for. Curation closes that gap deterministically
and without LLM summarization.

## Selection Is Not Usage

`rekon memory select` writes a `MemorySelection` artifact. That
artifact lists which memories the ranker thought were applicable.
It says **nothing** about whether the memory actually helped after
it landed in the agent's working context.

Recording usage is a separate, explicit step. After a memory helps
or hurts, the operator (or the agent acting as the operator)
records:

```sh
rekon memory usage record <memory-entry-id> --outcome helpful \
  --note "Helped scope the change."
```

For harmful / stale / ignored outcomes, the `--note` is required.
The "why" is the load-bearing data point for any future review:
without it the system cannot tell the difference between a memory
that should be deprecated and one that simply did not match the
current task.

## Outcomes

The five outcomes are:

- **helpful** — the memory shaped the right decision or saved an
  iteration.
- **ignored** — the memory was surfaced but did not affect the
  decision (it was beside the point).
- **harmful** — the memory led toward the wrong decision and had
  to be corrected.
- **stale** — the memory is no longer accurate for current
  architecture / goals.
- **unclear** — outcome cannot be attributed cleanly.

`helpful` is intentionally cheap to record. Harmful / stale /
ignored require a note because they imply a curation action might
be needed.

## Recommendation Rules

`rekon memory curation` derives a recommendation per memory using
deterministic, ordered rules. First match wins:

1. `harmful >= 2` → **deprecate**
2. `harmful >= 1` → **review**
3. `stale >= 2` → **supersede-candidate**
4. `helpful >= 2` → **reinforce**
5. `helpful >= 1` and `ignored == 0` → **keep**
6. `ignored >= 2` and `helpful == 0` → **review**
7. otherwise → **review**

Recommendations are suggestions. Curation **never** mutates
`OperatorFeedbackEntry.status`. To act on a recommendation, the
operator must explicitly run the corresponding command (a future
batch will add helpers for deprecate / supersede flows; this batch
intentionally does not).

## Anti-Gaming Reminders

- Curation does not extend ranking. A `deprecate` recommendation
  does not exclude a memory from `memory select` output. The
  operator must explicitly deprecate the entry to suppress it.
- Curation is not a substitute for editing memory. If guidance is
  wrong, fix the guidance — do not just record `harmful` events
  forever.
- Curation does not learn from itself. Recommendations are derived
  fresh from the latest `MemoryUsageLedger` every time.
- Curation never reads source files. It is an artifact-only
  derivation.

## Lifecycle

Recommended order:

1. `rekon memory add` — register operator guidance.
2. `rekon memory select` — rank scoped memory for a task.
3. *(perform the task)*
4. `rekon memory usage record` — record what happened.
5. `rekon memory curation` — refresh the curation report when
   reviewing memory quality.

The agent operating contract publication includes a short "Memory
Curation Status" line citing the latest report's summary counts.

## Freshness

`MemoryCurationReport` is invalidated by newer `MemoryUsageLedger`
artifacts (via the `memory.usage.changed` rule on
`@rekon/capability-memory`). The agent-contract publication is
invalidated by newer curation reports (via
`memory.curation.changed` on `@rekon/capability-docs`). Both
follow the normal `rekon artifacts freshness` flow.

## What This Is Not

- **Not an LLM curation surface.** All rules are deterministic.
- **Not an automatic promotion engine.** No memory is auto-flagged
  to higher priority or auto-deprecated.
- **Not a global memory cloud.** Workspace-local only.
- **Not a finding-status mutator.** Memory and findings remain
  separate artifact families.
- **Not a watcher.** Events are recorded explicitly.

## Cross-References

- [Memory concept](memory.md)
- [Memory usage ledger](../artifacts/memory-usage-ledger.md)
- [Memory curation report](../artifacts/memory-curation-report.md)
- [Operator memory entry](../artifacts/operator-memory-entry.md)
- [Agent operating contract](agent-operating-contract.md)
- [Classic guarantees audit](../strategy/classic-guarantees-audit.md)
- [Classic guarantee regression plan](../strategy/classic-guarantee-regression-plan.md)
