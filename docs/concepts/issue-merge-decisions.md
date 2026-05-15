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
Decisions never mutate the upstream `IssueAdjudicationReport`;
they reshape derived projections (currently `CoherencyDelta` v3)
while raw groups and member finding ids remain traceable.

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
- `CoherencyDelta` v3 collapses accepted-merged groups into a
  single rollup item and remediation step, while raw group ids
  and member finding ids remain traceable on the item. Rejected
  decisions keep groups separate. `IssueAdjudicationReport` is
  not mutated.

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

## Decisions Do Not Mutate Source Artifacts

Accepted decisions never consolidate the upstream issue groups:

- `IssueAdjudicationReport.groups` is unchanged on disk.
- The rollup is a derived projection in `CoherencyDelta` only.
- `resolve.issue` continues to match against actual groups, not
  merged super-groups.

What changes in v3: `CoherencyDelta` honors the **latest**
accepted decision per `candidateId` and collapses the linked
groups into a single delta item + remediation step. The item
carries `mergedIssueGroupIds`, `mergeDecisionIds`, and
`mergeCandidateIds` so the rollup is fully traceable back to the
underlying raw groups. Rejected decisions (or candidates with no
decision) keep groups separate.

Future consumers (`resolve.issue`, publications, remediation
work orders) can opt in to the merged-issue view via the same
projection — those layers are intentionally untouched in this
batch.

## Anti-Gaming Reminders

- A decision **never** mutates `FindingReport`,
  `FindingStatusLedger`, `FindingLifecycleReport`, or
  `IssueAdjudicationReport`. `CoherencyDelta` is a derived
  projection that consumes the ledger; its prior outputs stay
  unchanged on disk and only newly-built deltas reflect the
  decision.
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

- **Not automatic merging of source artifacts.** Decisions reshape
  the `CoherencyDelta` projection; they never mutate
  `IssueAdjudicationReport.groups`.
- **Not a finding-status surface.** Status decisions remain in
  `FindingStatusLedger`.
- **Not an LLM / semantic classifier.** Decisions are
  deterministic operator inputs.
- **Not yet wired into publications or resolver behavior.** The
  next slice ("Publication and resolver awareness of accepted
  merge decisions") extends accepted decisions to the architecture
  summary, the agent operating contract, and `resolve.issue`.

## Cross-References

- [Issue merge decision ledger artifact](../artifacts/issue-merge-decision-ledger.md)
- [Issue adjudication concept](issue-adjudication.md)
- [Issue adjudication report](../artifacts/issue-adjudication-report.md)
- [Coherency delta concept](coherency-delta.md)
- [Freshness and invalidation](freshness-and-invalidation.md)
- [Classic guarantees audit](../strategy/classic-guarantees-audit.md)
