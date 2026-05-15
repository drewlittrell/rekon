# Issue Merge Decisions

v2 adjudication can emit advisory `IssueMergeCandidate` records
linking two issue groups that share enough deterministic
signals to be worth a human's attention. Until this batch, those
candidates lived only in `IssueAdjudicationReport.mergeCandidates`
— operators had no artifact-backed way to record "yes, treat
these as the same root cause" or "no, these are distinct issues."

`IssueMergeDecisionLedger` closes that gap. It records explicit
operator decisions (`accepted` / `rejected`) as durable
artifacts with required notes, optional reasons, and provenance.
Decisions are advisory; they **never** merge groups
automatically.

## Why It Exists

`codebase-intel-classic`'s issue adjudication relied on
operator/human judgment to keep issue output trustworthy.
Without a durable decision surface, that judgment lives only in
chat logs, memory, or someone's head — and the next adjudication
run forgets it.

This batch preserves the operator-judgment guarantee while
keeping the substrate's "no automatic merging" invariant intact:

- Operators see the candidates surfaced by v2 adjudication.
- They explicitly accept or reject with a note (and optional
  reason).
- The decision is persisted as an `IssueMergeDecisionLedger`
  artifact.
- `rekon issues list` annotates the candidate with the latest
  decision so future review starts from the same place.
- `CoherencyDelta` does **not** change behavior. Counts and
  remediation steps still reflect actual `IssueAdjudicationGroup`
  records. Future work (CoherencyDelta v3) can choose to consume
  accepted decisions.

## Decision Lifecycle

Recommended order:

1. `rekon refresh` (or `rekon issues adjudicate`) builds the
   `IssueAdjudicationReport` with `mergeCandidates`.
2. `rekon issues merge candidates` lists the candidates plus any
   prior decisions for each.
3. `rekon issues merge decide <candidate-id> --decision
   accepted|rejected --note <note>` records the operator's
   judgment.
4. `rekon issues list` surfaces the annotated candidate for
   downstream review.

A decision can be **overridden** later by recording a new
decision for the same candidate id; the latest by `decidedAt`
wins. Prior decisions remain in the ledger history.

## Reasons

The decision reason is optional but recommended. The four
allowed values are deterministic strings:

- `same-root-cause` — both rules surface the same underlying
  issue; consolidating remediation makes sense.
- `separate-issues` — the rules happen to overlap on file or
  severity but address distinct problems.
- `false-positive-candidate` — one or both candidate groups are
  false positives in this context.
- `other` — for cases the four categories don't fit; the `note`
  carries the rationale.

There is no LLM, semantic similarity, or fuzzy matching. Reasons
are operator input.

## Decisions Do Not Merge Groups

This batch intentionally does not let accepted decisions
consolidate the underlying groups:

- `IssueAdjudicationReport.groups` is unchanged.
- `CoherencyDelta` continues to emit one delta item per active
  group and one `remediationQueue` step per active group.
- `resolve.issue` continues to match against actual groups, not
  merged super-groups.

The downstream effect of accepted decisions is intentionally
deferred to a future `CoherencyDelta` v3 batch (or to other
consumers) that can opt in to the merged-issue view. This
preserves the "advisory, never automatic merge" invariant from
v2 adjudication.

## Anti-Gaming Reminders

- A decision **never** mutates `FindingReport`,
  `FindingStatusLedger`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, or `CoherencyDelta`.
- A `rejected` decision **does not** remove the candidate. The
  candidate remains visible in `rekon issues list` with
  `decision: "rejected"`, so a future operator can re-review.
- A new decision for the same `candidateId` appends to history
  rather than overwriting it. Audit trail intact.
- The required `note` field forces the operator to record the
  "why," not just the answer.
- `recordIssueMergeDecision` refuses unknown candidate ids
  with a listing of available candidates — there is no silent
  acceptance of a phantom id.

## CLI Surface

```sh
rekon issues merge candidates --root <repo> --json
rekon issues merge decide <candidate-id> \
  --decision accepted|rejected --note <note> \
  [--reason same-root-cause|separate-issues|false-positive-candidate|other] \
  [--decided-by <name>] \
  --root <repo> --json
rekon issues merge decisions --root <repo> --json
```

`rekon issues list` and `rekon issues adjudicate` also include
the annotated `mergeCandidates` array when a ledger exists. The
annotation adds optional `decision`, `decisionId`,
`decisionNote`, `decisionReason`, `decisionDecidedAt`, and
`decisionDecidedBy` fields to each candidate; the underlying
candidate fields are unchanged.

## Freshness

`rekon artifacts freshness --type IssueMergeDecisionLedger`
marks an older ledger `stale` when a newer one lands. Because
the ledger is treated as a canonical input (alongside
`FindingStatusLedger`, `OperatorFeedbackEntry`, `EvidenceGraph`,
and `Rulebook`), it does not trigger `lineage.unknown` on its
own.

## What This Is Not

- **Not automatic merging.** Decisions annotate; they never
  consolidate groups.
- **Not a finding-status surface.** Status decisions remain in
  `FindingStatusLedger`.
- **Not an LLM / semantic classifier.** Decisions are
  deterministic operator inputs.
- **Not a CoherencyDelta v3.** That batch is deferred.

## Cross-References

- [Issue merge decision ledger artifact](../artifacts/issue-merge-decision-ledger.md)
- [Issue adjudication concept](issue-adjudication.md)
- [Issue adjudication report](../artifacts/issue-adjudication-report.md)
- [Coherency delta concept](coherency-delta.md)
- [Freshness and invalidation](freshness-and-invalidation.md)
- [Classic guarantees audit](../strategy/classic-guarantees-audit.md)
