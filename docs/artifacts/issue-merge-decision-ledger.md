# IssueMergeDecisionLedger

## Purpose

`IssueMergeDecisionLedger` records explicit operator decisions
about advisory `IssueMergeCandidate` records produced by v2
adjudication. Operators can accept or reject candidates, leaving
durable, auditable artifacts that downstream surfaces can
annotate or (eventually, in a future batch) consume to influence
governance rollups.

A decision **never** merges groups. `CoherencyDelta`,
`resolve.issue`, and the publications continue to count and
route the underlying groups separately. Decisions are advisory
metadata about candidates, not adjudication mutation.

See [../concepts/issue-merge-decisions.md](../concepts/issue-merge-decisions.md)
for the wider concept and lifecycle, and the **Issue Detection /
Adjudication** entry in
[../strategy/classic-guarantees-audit.md](../strategy/classic-guarantees-audit.md)
for the classic guarantee this artifact preserves.

## Produced By

- `@rekon/runtime.recordIssueMergeDecision`, surfaced via the
  CLI command `rekon issues merge decide`.

## Consumed By

- `@rekon/capability-resolver.issueResolver` and the
  `@rekon/capability-docs` publishers read no decisions in this
  batch — they continue to operate on raw adjudication groups.
- The CLI commands `rekon issues list`, `rekon issues merge
  candidates`, and `rekon issues adjudicate` annotate the
  `mergeCandidates` array with `decision` / `decisionId` /
  `decisionNote` / `decisionReason` / `decisionDecidedAt` /
  `decisionDecidedBy` fields when a ledger exists.
- A future `CoherencyDelta` v3 may consume accepted decisions to
  influence rollup counts. That work is deferred.

## Required Header Fields

All standard `ArtifactHeader` fields. `producer.id` =
`@rekon/runtime.issues`. `inputRefs` cite the latest
`IssueAdjudicationReport` plus the prior `IssueMergeDecisionLedger`
when one exists. `IssueMergeDecisionLedger` is treated as a
**canonical input** by `validateArtifactFreshness` (alongside
`OperatorFeedbackEntry`, `FindingStatusLedger`, `EvidenceGraph`,
and `Rulebook`), so ledgers that don't cite upstream artifacts
do not raise `lineage.unknown`. Ledgers written by
`recordIssueMergeDecision` still cite the adjudication report
and prior ledger so transitive freshness works.

## Shape

```ts
type IssueMergeDecisionStatus = "accepted" | "rejected";

type IssueMergeDecisionReason =
  | "same-root-cause"
  | "separate-issues"
  | "false-positive-candidate"
  | "other";

type IssueMergeDecision = {
  id: string;
  candidateId: string;
  decision: IssueMergeDecisionStatus;
  note: string;          // required, non-empty
  reason?: IssueMergeDecisionReason;
  groupIds: string[];    // copied from the candidate at decision time
  memberFindingIds: string[]; // copied; may be empty
  decidedAt: string;     // ISO-8601
  decidedBy?: string;
  source: "operator" | "system";
  evidence?: ArtifactRef[];
};

type IssueMergeDecisionLedger = {
  header: ArtifactHeader;
  decisions: IssueMergeDecision[];
};
```

## Validation Rules

- `decisions` must be an array (may be empty).
- Every decision must have `id`, `candidateId`, `decidedAt`.
- `decision` must be `"accepted"` or `"rejected"`.
- `note` is required and non-empty (the operator's "why").
- `groupIds` must be a non-empty array of strings.
- `memberFindingIds` must be an array of strings (may be
  empty).
- `reason`, when present, must be one of the four enum values.
- `source` must be `"operator"` or `"system"`. CLI-recorded
  decisions are always `"operator"`.

`recordIssueMergeDecision` returns a clear error when:

- the candidate id does not exist in the latest
  `IssueAdjudicationReport` (the error lists available
  candidate ids);
- `note` is empty;
- `decision` is not one of the two enum values;
- no `IssueAdjudicationReport` exists in the store at all.

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

- `issues merge candidates` reads the latest
  `IssueAdjudicationReport` and the latest ledger (if any),
  returns the candidates annotated with decision metadata, and
  surfaces the ledger ref.
- `issues merge decide` records a new decision in a fresh
  `IssueMergeDecisionLedger` artifact. The newest decision for a
  candidate wins (the latest ledger contains the prior decisions
  plus the new one; `findLatestIssueMergeDecision` picks the
  most-recent by `decidedAt`).
- `issues merge decisions` returns the latest ledger's
  decisions in order.

`rekon issues list` and `rekon issues adjudicate` now also
include the annotated `mergeCandidates` array when a ledger
exists.

## Decision Override Semantics

A new decision for the same `candidateId` does **not** remove
the prior decision from history. Each `rekon issues merge
decide` call appends a new `IssueMergeDecision` to the latest
ledger's `decisions` array, writes a fresh ledger artifact, and
relies on `findLatestIssueMergeDecision` (which picks the
highest `decidedAt`) to expose the current effective decision in
`issues list` / `issues merge candidates`. Older decisions
remain in the previous ledgers and in the latest ledger's
history.

## Freshness And Provenance

`IssueMergeDecisionLedger` lives under the `findings` category
in the artifact store. `rekon artifacts freshness --type
IssueMergeDecisionLedger` marks an older ledger `stale` when a
newer ledger or `IssueAdjudicationReport` lands.
`IssueMergeDecisionLedger` is treated as canonical input, so its
own freshness check does not require upstream lineage — but
ledgers written by `recordIssueMergeDecision` cite the
adjudication report anyway, so transitive lineage holds.

## What This Is Not

- **Not a mutator.** Decisions never modify
  `IssueAdjudicationReport.groups`, `CoherencyDelta.items`,
  `CoherencyDelta.remediationQueue`, `FindingReport`,
  `FindingStatusLedger`, or `FindingLifecycleReport`.
- **Not an automatic merge.** Accepted decisions annotate
  candidates but do not consolidate the underlying groups in
  this batch.
- **Not a finding-status surface.** Status decisions remain in
  `FindingStatusLedger`. The merge ledger is strictly about
  candidate-pair relationships.
- **Not an LLM / semantic / fuzzy classifier.** Decisions are
  explicit operator inputs.
- **Not a remediation planner.** Candidates and decisions are
  inputs to a future coherency / remediation rollup, not work
  orders themselves.

## Cross-References

- [Issue merge decisions concept](../concepts/issue-merge-decisions.md)
- [Issue adjudication concept](../concepts/issue-adjudication.md)
- [Issue adjudication report](issue-adjudication-report.md)
- [Coherency delta](coherency-delta.md)
- [Freshness and invalidation](../concepts/freshness-and-invalidation.md)
- [Classic guarantees audit](../strategy/classic-guarantees-audit.md)
