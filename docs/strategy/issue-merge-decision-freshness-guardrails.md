# Issue Merge Decision Freshness Guardrails

> Combined strategy + implementation memo. Pins the
> freshness predicate for accepted issue-merge-decision
> lineage, then ships the helper + warning surfaces in
> architecture summary, agent contract, and
> `resolve.issue`. **No artifacts are mutated.**

## Decision Summary

**Accepted merge roll-up freshness is judged by
artifact lineage, not file-system mtime.**

A merged `CoherencyDelta` item is considered stale or
suspect when **any** of the following hold:

1. The `CoherencyDelta` cites an older
   `IssueMergeDecisionLedger` than the latest
   available ledger
   (`merge-ledger-stale`).
2. The `CoherencyDelta` contains `mergedIssueGroupIds`
   but cites **no** `IssueMergeDecisionLedger` in its
   `header.inputRefs`
   (`merge-ledger-missing`).
3. The `CoherencyDelta` cites an older
   `IssueAdjudicationReport` than the latest available
   report
   (`adjudication-stale`).
4. The cited `IssueAdjudicationReport` cites an older
   `FindingLifecycleReport` than the latest available
   lifecycle report
   (`lifecycle-stale`).
5. The latest `IssueMergeDecisionLedger`'s latest
   decision for any `mergeCandidateId` used by the
   roll-up differs from the decision ids used by the
   `CoherencyDelta` roll-up — or has a non-`accepted`
   decision status
   (`merge-decision-superseded`).

**Warnings do not invalidate artifacts structurally.
They mark the consumed merge-roll-up context as stale
for decision-making.**

Warning surfaces:

- **Architecture summary** — new `### Merge Roll-up
  Freshness` subsection right below
  `## Accepted Issue Merge Roll-ups`.
- **Agent contract** — new `### Merge Decision
  Freshness` subsection right below the
  agent-facing `### Accepted Issue Merge Roll-ups`
  section, plus a `Do Not Do` reminder.
- **`resolve.issue`** — warning string appended to
  `IssuePacket.warnings` and a new
  `issue.merge.freshness` step in
  `resolutionTrace`. When a stale-lineage check reads
  the latest ledger / adjudication / lifecycle
  artifacts, those refs are added to
  `IssuePacket.header.inputRefs`.

All warnings recommend `rekon refresh` as the single
deterministic command that rebuilds the
adjudication → coherency chain.

## Problem

Accepted operator merge decisions are an explicit
artifact (`IssueMergeDecisionLedger`) consumed by the
`CoherencyDelta` builder. The
`CoherencyDelta` then carries the merged roll-up on
each `CoherencyDeltaItem` (via `mergedIssueGroupIds`,
`mergeDecisionIds`, `mergeCandidateIds`) and is the
single source of truth for accepted merge
roll-ups in publications and the resolver packet.

The trust gap: a `CoherencyDelta` is **only as
current** as the artifacts in its lineage. Operators
record new merge decisions; new findings adjust
lifecycle / adjudication state; old roll-ups in an old
`CoherencyDelta` may no longer reflect the current
governed issue state.

Existing surfaces already warn on the broader
governance chain (`GovernanceFreshness` warns when
the latest adjudication is stale relative to the
latest lifecycle, and when the latest coherency is
stale relative to the latest adjudication). What's
missing is the **merge-decision-specific** check:
whether the cited ledger has been superseded, whether
the roll-up uses a decision that is no longer the
latest decision for its candidate.

The `GovernanceFreshness` chain already exists and
its rules overlap with rules C + D here. This memo
keeps them distinct: governance freshness is the
broad chain; merge-rollup freshness is **specifically
for accepted merge roll-ups** and emits per-rule
warning codes that surface in publications and
resolver packets. Architecture summary + agent
contract continue to render `GovernanceFreshness`
warnings (broad chain), and now additionally render
merge-rollup freshness warnings (specific to
accepted roll-ups).

## Accepted Merge Roll-Up Lineage

Every accepted merge roll-up is produced by this
chain:

```
FindingReport (raw detector output)
  └─ FindingFilterReport (graph-aware + classic filtering)
       └─ FindingLifecycleReport (status decisions applied)
            └─ IssueAdjudicationReport (groups + merge candidates)
                 └─ IssueMergeDecisionLedger (operator-accepted decisions)
                      └─ CoherencyDelta (roll-up items with
                          mergedIssueGroupIds / mergeDecisionIds /
                          mergeCandidateIds)
```

The roll-up is "fresh for decision-making" when:

- the `CoherencyDelta` cites the latest
  `IssueMergeDecisionLedger`;
- the `CoherencyDelta` cites the latest
  `IssueAdjudicationReport`;
- the cited `IssueAdjudicationReport` cites the
  latest `FindingLifecycleReport`;
- every `mergeCandidateId` on the roll-up's items
  maps to a decision in
  `IssueMergeDecisionLedger.decisions` whose latest
  entry is one of the roll-up's `mergeDecisionIds`
  AND whose `decision === "accepted"`.

Roll-ups that pass every check produce
`status: "fresh"` with no warnings.

## Freshness Predicate

The predicate lives in `@rekon/kernel-findings` as a
pure data-only helper (no fs access, no mutation):

```ts
detectIssueMergeRollupFreshness(input: {
  coherencyDelta?: CoherencyDelta;
  latestIssueMergeDecisionLedger?: IssueMergeDecisionLedger;
  latestIssueAdjudicationReport?: IssueAdjudicationReport;
  latestFindingLifecycleReport?: FindingLifecycleReport;
}): IssueMergeRollupFreshness
```

Return shape:

```ts
type IssueMergeRollupFreshnessStatus =
  | "fresh"
  | "stale"
  | "missing"
  | "unknown";

type IssueMergeRollupFreshnessWarning = {
  code:
    | "merge-ledger-stale"
    | "merge-ledger-missing"
    | "adjudication-stale"
    | "lifecycle-stale"
    | "merge-decision-superseded";
  message: string;
  recommendedCommand: "rekon refresh";
};

type IssueMergeRollupFreshness = {
  status: IssueMergeRollupFreshnessStatus;
  warnings: IssueMergeRollupFreshnessWarning[];
  recommendedCommand?: "rekon refresh";
};
```

Status semantics:

- `fresh` — no warnings and the `CoherencyDelta`
  contains at least one merged roll-up.
- `stale` — at least one rule warning fired.
- `missing` — `CoherencyDelta` is missing OR
  contains no merged roll-ups; nothing to warn about.
- `unknown` — extension point for future ambiguous
  cases; not currently emitted by the helper.

Detection rules (apply only when at least one
`CoherencyDelta.items[i]` has
`mergedIssueGroupIds.length > 1`):

### Rule A — `merge-ledger-missing`

Merged roll-ups exist but
`CoherencyDelta.header.inputRefs` does **not**
include an `IssueMergeDecisionLedger`. The roll-up
was built without citing its decision source.

```
status: "stale"
code: "merge-ledger-missing"
message: "CoherencyDelta contains accepted merge roll-ups but does not cite an IssueMergeDecisionLedger; rebuild via `rekon refresh`."
```

### Rule B — `merge-ledger-stale`

`CoherencyDelta.header.inputRefs` cites an
`IssueMergeDecisionLedger` whose id is not the
latest ledger id available.

```
status: "stale"
code: "merge-ledger-stale"
message: "CoherencyDelta accepted merge roll-ups were built from an older IssueMergeDecisionLedger (<cited>) than the latest (<latest>)."
```

### Rule C — `adjudication-stale`

`CoherencyDelta.header.inputRefs` cites an
`IssueAdjudicationReport` whose id is not the
latest adjudication report id available.

```
status: "stale"
code: "adjudication-stale"
message: "CoherencyDelta accepted merge roll-ups were built from an older IssueAdjudicationReport (<cited>) than the latest (<latest>)."
```

### Rule D — `lifecycle-stale`

The cited `IssueAdjudicationReport.header.inputRefs`
cites a `FindingLifecycleReport` whose id is not
the latest lifecycle report id available.

```
status: "stale"
code: "lifecycle-stale"
message: "IssueAdjudicationReport used for accepted merge roll-ups is stale relative to the latest FindingLifecycleReport."
```

### Rule E — `merge-decision-superseded`

For each merged `CoherencyDelta` item with
`mergedIssueGroupIds.length > 1`:

- Iterate its `mergeCandidateIds`.
- For each candidateId, find the latest decision in
  `IssueMergeDecisionLedger.decisions` matching that
  `candidateId` (latest by `decidedAt`; lexicographic
  fallback on `id` for stability).
- If the latest decision's `id` is not in the
  item's `mergeDecisionIds`, OR
  `latestDecision.decision !== "accepted"`, emit:

```
status: "stale"
code: "merge-decision-superseded"
message: "Accepted merge roll-up <rollupId> uses a merge decision that has been superseded by the latest IssueMergeDecisionLedger entry for candidate <candidateId>."
```

The check emits at most one warning per
`(rollupId, candidateId)` pair to keep the surface
quiet on repeated supersession.

### Determinism

All rules emit warnings in a stable order:
- Rule A before B before C before D before E.
- Within Rule E, items are processed in the order
  they appear on `CoherencyDelta.items`, candidates
  in their on-item order.

The predicate never mutates inputs.

## Warning Surfaces

### Architecture summary

New subsection right below `## Accepted Issue Merge
Roll-ups`:

```markdown
### Merge Roll-up Freshness

- Status: <fresh|stale|missing>

| Code | Message | Recommended Command |
| --- | --- | --- |
| <code> | <message> | `rekon refresh` |
```

When `status === "fresh"`:

```markdown
Accepted merge roll-up lineage is fresh.
```

When `status === "missing"`:

```markdown
No accepted issue merge roll-ups in latest CoherencyDelta.
```

(matches the existing "no roll-ups" message for the
section above; the freshness subsection adds no
table when there's nothing to warn about.)

### Agent contract

New subsection right below the agent-facing
`### Accepted Issue Merge Roll-ups`:

```markdown
### Merge Decision Freshness

- Merge decisions: <fresh|stale|missing>
- Adjudication: <fresh|stale|missing>
- Lifecycle: <fresh|stale|missing>
- Recommended command: `rekon refresh`
```

When any rule fires:

```markdown
> Do not rely on accepted merge roll-ups until `rekon refresh` rebuilds adjudication and coherency state.
```

Plus a new entry in the agent-contract `Do Not Do`
list:

```markdown
- Do not rely on accepted merge roll-ups after merge decisions, adjudication, or lifecycle artifacts change until `rekon refresh` has run.
```

### `resolve.issue`

When `IssuePacket.mergeRollup` is attached, the
resolver runs the freshness helper against the
latest ledger / adjudication / lifecycle artifacts.

If `status === "stale"`:

- Append warning string to `IssuePacket.warnings`:
  `"Accepted merge roll-up may be stale; run \`rekon refresh\` before relying on merged issue context."`
- Add a resolution trace entry:
  ```
  step: "issue.merge.freshness"
  sourceType: "CoherencyDelta" | "IssueMergeDecisionLedger"
  status: "warning"
  message: "<rule message>"
  details: { codes, warningCount, recommendedCommand }
  ```
- When the helper reads the latest ledger /
  adjudication / lifecycle refs for this check, add
  those refs to `IssuePacket.header.inputRefs`
  (deduped via the existing `appendInputRef`).

If `status === "fresh"`:

- Add a non-warning trace entry:
  ```
  step: "issue.merge.freshness"
  sourceType: "CoherencyDelta"
  status: "used"
  message: "Accepted merge roll-up lineage is fresh."
  ```

The resolver **never blocks resolution**; it only
warns.

## What This Does Not Do

- Does not mutate `IssueMergeDecisionLedger`,
  `IssueAdjudicationReport`, `CoherencyDelta`, or
  `FindingLifecycleReport`.
- Does not auto-refresh inside publishers or
  resolvers.
- Does not auto-accept or auto-reject merge
  decisions.
- Does not change merge decision semantics or
  `CoherencyDelta` roll-up behavior.
- Does not add file-system mtime / path
  invalidation. The predicate is artifact-lineage
  only.
- Does not add watcher / daemon behavior.
- Does not change artifact header shape, schemas,
  or `schemaVersion`.
- Does not add semantic / fuzzy / LLM / embedding
  matching.

## Tests Required

A single contract test
(`tests/contract/issue-merge-decision-freshness-guardrails.test.mjs`)
pins:

1. Clean accepted merge roll-up produces no
   architecture-summary warning.
2. Architecture summary warns when newer
   `IssueMergeDecisionLedger` exists
   (`merge-ledger-stale`).
3. Architecture summary warns when `CoherencyDelta`
   has `mergedIssueGroupIds` but no
   `IssueMergeDecisionLedger` inputRef
   (`merge-ledger-missing`).
4. Architecture summary warns when newer
   `IssueAdjudicationReport` exists
   (`adjudication-stale`).
5. Architecture summary warns when adjudication is
   stale relative to newer `FindingLifecycleReport`
   (`lifecycle-stale`).
6. Architecture summary warns when latest decision
   supersedes the roll-up decision
   (`merge-decision-superseded`).
7. Agent contract renders the stale merge decision
   callout.
8. Agent contract clean path renders a fresh status
   block with no callout.
9. `resolve.issue` `mergeRollup` includes freshness
   warning when ledger is stale.
10. `resolve.issue` `resolutionTrace` includes
    `issue.merge.freshness`.
11. `resolve.issue` clean path does not warn.
12. Freshness helper ignores `CoherencyDelta`
    without accepted merge roll-ups.
13. `rekon artifacts validate` remains clean.

Plus one end-to-end-ish scenario: accepted decision →
build CoherencyDelta → add newer rejected decision →
publish + resolve both surface
`merge-decision-superseded`.

## Follow-Up Work

- **Issue merge decision operator ergonomics** —
  recommended next slice. Make the
  human-in-the-loop merge workflow easier:
  `issues merge candidates --undecided`,
  `--decision accepted|rejected|none`, candidate
  detail rendering, clearer recommended commands in
  publications. Still no automatic merging or
  semantic / LLM review.
- Future merge-rollup health surfaces (alerts on
  fallback-dominance for merge-decision codes, etc.)
  could land later once we have real-repo data.

## Cross-References

- [Issue governance ADR](issue-governance-architecture-decision.md)
- [Classic guarantees audit](classic-guarantees-audit.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)
- [Roadmap](roadmap.md)
- [Freshness and invalidation concept](../concepts/freshness-and-invalidation.md)
- [Issue merge decisions concept](../concepts/issue-merge-decisions.md)
- [CoherencyDelta artifact](../artifacts/coherency-delta.md)
- [CoherencyDelta concept](../concepts/coherency-delta.md)
- [IssueMergeDecisionLedger artifact](../artifacts/issue-merge-decision-ledger.md)
- [Architecture summary publication artifact](../artifacts/architecture-summary-publication.md)
- [Architecture summary publication concept](../concepts/architecture-summary-publication.md)
- [Agent contract publication artifact](../artifacts/agent-contract-publication.md)
- [Agent operating contract concept](../concepts/agent-operating-contract.md)
- [ResolverPacket artifact](../artifacts/resolver-packet.md)
- [Resolvers concept](../concepts/resolvers.md)
