# IssueMergeDecisionLedger

## Purpose

`IssueMergeDecisionLedger` records explicit operator decisions
about advisory `IssueMergeCandidate` records produced by v2
adjudication. Operators can accept or reject candidates, leaving
durable, auditable artifacts. Accepted decisions reshape the
`CoherencyDelta` projection (v3) into merged rollup items;
rejected decisions keep groups separate.

A decision **never** mutates `IssueAdjudicationReport.groups`.
`resolve.issue` and the publications continue to operate on the
raw groups; only `CoherencyDelta` consumes the ledger in this
batch. Accepted-merge rollups are a derived view, not an
artifact rewrite — raw group ids and member finding ids remain
traceable on every delta item.

See [../concepts/issue-merge-decisions.md](../concepts/issue-merge-decisions.md)
for the wider concept and lifecycle, and the **Issue Detection /
Adjudication** entry in
[../strategy/classic-guarantees-audit.md](../strategy/classic-guarantees-audit.md)
for the classic guarantee this artifact preserves.

## Produced By

- `@rekon/runtime.recordIssueMergeDecision`, surfaced via the
  CLI command `rekon issues merge decide`.

## Consumed By

- `@rekon/runtime.buildCoherencyDelta` reads the latest ledger
  and uses accepted decisions to collapse linked
  `IssueAdjudicationGroup` records into merged
  `CoherencyDelta.items[]` (and a single merged
  `remediationQueue` step per accepted set). See
  [coherency-delta.md](coherency-delta.md).
- `@rekon/capability-resolver.issueResolver` and the
  `@rekon/capability-docs` publishers continue to operate on raw
  adjudication groups in this batch.
- The CLI commands `rekon issues list`, `rekon issues merge
  candidates`, and `rekon issues adjudicate` annotate the
  `mergeCandidates` array with `decision` / `decisionId` /
  `decisionNote` / `decisionReason` / `decisionDecidedAt` /
  `decisionDecidedBy` fields when a ledger exists.

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

- **Not a source mutator.** Decisions never modify
  `IssueAdjudicationReport.groups`, `FindingReport`,
  `FindingStatusLedger`, or `FindingLifecycleReport`. Already-written
  `CoherencyDelta` artifacts also stay untouched on disk; only
  newly-built deltas reflect the latest accepted decisions.
- **Not an automatic merge of source artifacts.** Accepted
  decisions reshape the `CoherencyDelta` projection (v3) and
  surface as annotations on candidates; they do not collapse the
  underlying `IssueAdjudicationGroup` records.
- **Not a finding-status surface.** Status decisions remain in
  `FindingStatusLedger`. The merge ledger is strictly about
  candidate-pair relationships.
- **Not an LLM / semantic / fuzzy classifier.** Decisions are
  explicit operator inputs.
- **Not yet wired into publications or resolver behavior.** The
  next slice extends accepted decisions to the architecture
  summary, the agent operating contract, and `resolve.issue`.

## Freshness Guardrails

The
[issue merge decision freshness guardrails](../strategy/issue-merge-decision-freshness-guardrails.md)
predicate checks whether the latest ledger entry for
each `mergeCandidateId` used by an accepted
`CoherencyDelta` roll-up matches the decision ids the
delta cites — and whether that latest decision is still
`accepted`. When the latest decision differs from the
cited one (or is no longer `accepted`), architecture
summary, agent contract, and `resolve.issue` all emit a
`merge-decision-superseded` warning and recommend
`rekon refresh`. Warnings do **not** mutate the ledger;
they mark the consumed merge-roll-up context as stale.

## Cross-References

- [Issue merge decisions concept](../concepts/issue-merge-decisions.md)
- [Issue adjudication concept](../concepts/issue-adjudication.md)
- [Issue adjudication report](issue-adjudication-report.md)
- [Coherency delta](coherency-delta.md)
- [Freshness and invalidation](../concepts/freshness-and-invalidation.md)
- [Issue merge decision freshness guardrails](../strategy/issue-merge-decision-freshness-guardrails.md)
- [Classic guarantees audit](../strategy/classic-guarantees-audit.md)
