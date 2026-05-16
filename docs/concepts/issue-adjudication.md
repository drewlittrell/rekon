# Issue Adjudication

Raw findings are lint noise until something **groups** them into
durable governance issues. Without adjudication, two evaluator
runs over the same file can each emit "same finding"; an operator
who accepted the issue last week sees it resurface; a publication
double-counts it; a resolver routes the same problem twice.

Adjudication is a deterministic, status-aware grouping step on top
of `FindingLifecycleReport`. It is the first slice of the
Rekon-native equivalent of the `codebase-intel-classic`
`IssueDetectionService` pipeline. See the **Issue Detection /
Adjudication** entry in
[../strategy/classic-guarantees-audit.md](../strategy/classic-guarantees-audit.md).

## Why It Exists

Without adjudication:

- Duplicate findings remain indistinguishable in the governance
  layer.
- Accepted / ignored / resolved status gets fragmented across
  members of the same logical issue.
- Coherency, docs, memory, and remediation surfaces operate on raw
  noise instead of governed issues.

With adjudication v1:

- A single `IssueAdjudicationReport` aggregates duplicates into
  canonical issue groups with explicit grouping reasons.
- Status / lifecycle context survives grouping (every member's
  `effectiveStatus` is preserved in `statusBreakdown`).
- No finding is dropped (singletons are emitted as singleton
  groups with `"singleton-no-grouping-key"` reason).
- Raw findings, status ledgers, and lifecycle reports are never
  mutated.

## What Adjudication Is

Adjudication is a **projection**, not mutation. It reads:

- the latest `FindingLifecycleReport` (or builds one from the
  latest `FindingReport` + `FindingStatusLedger` when no
  lifecycle report exists),
- ownership / repo-model artifacts when available, for optional
  per-group `systems` assignment.

And it writes a single `IssueAdjudicationReport`. The raw inputs
are unchanged.

## Grouping Rules

Deterministic only. **No fuzzy / semantic / embedding / LLM
matching in this batch.** Future v2 work may extend grouping with
opt-in semantic providers; that is explicitly deferred.

Group key components:

1. `type`
2. `ruleId` if present
3. `files=…` (sorted) — primary location partition
4. `subjects=…` (sorted) — fallback when `files` is empty
5. `singleton=<id>` — final fallback when both `files` and
   `subjects` are empty

`groupingReasons` on every group explains which dimensions were
used (`"same-type"` / `"same-rule"` / `"same-files"` /
`"same-subjects"` / `"singleton-no-grouping-key"`).

## Merge Candidates (v2)

Exact grouping alone leaves real overlap on the table: two
different rules can fire on the same file/subject/severity and
the deterministic key splits them. v2 adjudication adds **merge
candidates**: advisory `IssueMergeCandidate` records that link
two groups via deterministic signals, without merging them.

Signals (in priority order):

- `same-file` / `overlapping-files`
- `same-subject` / `overlapping-subjects`
- `same-severity`
- `related-type-prefix` (e.g., both groups under
  `import_boundary.*`)
- `same-suggested-action` (deterministic keyword bucket:
  `import` / `generated-output` / `verification` /
  `documentation` / `ownership-boundary`)
- `shared-system`

A pair needs at least two signals and a confidence
`>= 0.45` to qualify. Confidence is capped at `1.0`. Strength
labels:

- `strong` (`>= 0.70`)
- `medium` (`>= 0.45`)
- `weak` (below the emit floor; not surfaced by default)

Activity filter:

- Both groups inactive → skip (noise reduction).
- Mixed activity → emit only at `strong` (`>= 0.70`).
- Both active → emit at `>= 0.45`.

Anti-gaming:

- Merge candidates alone **never** become merged groups
  automatically. Only an operator-accepted
  `IssueMergeDecisionLedger` decision causes downstream rollups to
  collapse the linked groups, and even then only as a projection
  in `CoherencyDelta` v3.
- `IssueAdjudicationReport.groups` stays untouched on disk —
  raw groups are always inspectable.
- No LLM, embeddings, or fuzzy matching.

### Operator decisions on candidates

Operators can accept or reject merge candidates explicitly via
`rekon issues merge decide`. Decisions persist in an
`IssueMergeDecisionLedger` artifact and surface inline on each
candidate when `rekon issues list` / `rekon issues adjudicate`
/ `rekon issues merge candidates` are read. The annotation adds
optional `decision`, `decisionId`, `decisionNote`,
`decisionReason`, `decisionDecidedAt`, and `decisionDecidedBy`
fields to the candidate; the underlying candidate scoring is
unchanged.

Decisions never mutate `IssueAdjudicationReport.groups`. In
`CoherencyDelta` v3, the latest accepted decision per
`candidateId` collapses the linked groups into a single merged
rollup item with one remediation step (`mergedIssueGroupIds`,
`mergeDecisionIds`, `mergeCandidateIds`, and `memberFindingIds`
make the rollup traceable). Rejected decisions keep groups
separate. `resolve.issue` and the publications still operate on
the raw groups in this batch; wiring them up to merged rollups
is the next slice.

See [issue-merge-decisions.md](issue-merge-decisions.md),
[../artifacts/issue-merge-decision-ledger.md](../artifacts/issue-merge-decision-ledger.md),
and [coherency-delta.md](coherency-delta.md).

The report exposes a sorted, capped `mergeCandidates` array (max
50 by default) and a `summary.mergeCandidates` count. Both are
optional fields — when no candidates qualify, they are omitted.

## Status Derivation

Group status is derived from members' `effectiveStatus`:

- all members `new` / `existing` → `active`
- all `accepted` → `accepted`
- all `ignored` → `ignored`
- all `resolved` → `resolved`
- otherwise → `mixed`

`active: boolean` is true whenever any member is `new` or
`existing` (so `mixed` groups can still be flagged for action).

Status is **never written back** to the underlying findings or
ledger. The ledger remains the only place status decisions live.

## Canonical Finding

Each group elects one canonical finding for display purposes
(`title`, `description`, `severity`, `ruleId`, `suggestedAction`):

1. Prefer an active member over an inactive one.
2. Then highest severity.
3. Then earliest id lexicographically.

`memberFindingIds` always lists every member so the group can be
audited.

## When To Run It

- After `rekon refresh` or after an explicit
  `rekon findings lifecycle` run, when you want to see how many
  distinct governance issues actually exist in the repo (versus
  raw finding rows).
- Before reviewing finding noise, to deduplicate the queue you
  reason about.
- As input to `CoherencyDelta` v2: `buildCoherencyDelta` now
  consumes the latest `IssueAdjudicationReport` when one exists and
  emits one delta item per group with `memberFindingIds` /
  `groupingReasons` traceability, plus one remediation step per
  active group. `rekon refresh` runs `issues.adjudicate` between
  `findings.lifecycle` and `coherency.delta`. See
  [coherency-delta.md](coherency-delta.md).
- As input to `resolve.issue` v2: when the latest
  `IssueAdjudicationReport` exists, `resolve.issue` matches queries
  against `group.id`, `canonicalFindingId`, member finding ids, and
  unique substrings of the group's text. A unique match returns a
  packet with `matchSource: "IssueAdjudicationReport"`,
  `issueGroup` carrying member ids, grouping reasons, status
  breakdown, and `verificationByFinding` aggregating per-member
  verification (worst status wins). Ambiguous fragments warn
  without silently choosing. Missing report or no-match queries
  fall back to the raw `FindingReport` path with a fallback trace.
  See [resolvers.md](resolvers.md).
- As input to the architecture summary and agent operating
  contract publications: both publications now surface a
  "Governed Issue Groups" section when an
  `IssueAdjudicationReport` is indexed. The architecture summary
  shows a full group table (status / severity / type / member
  count + ids / files); the agent contract shows a short
  Active-Governance-State subsection with active group counts,
  top 5 active groups, and a `rekon resolve issue --issue
  <group-id>` instruction. Both publications cite the
  adjudication report in `inputRefs` and flag the Coherency
  Summary as group-aware vs. raw. The agent contract's Do Not
  Do list also warns "Do not treat raw finding count as governed
  issue count when an IssueAdjudicationReport exists". See
  [architecture-summary-publication.md](architecture-summary-publication.md)
  and [agent-operating-contract.md](agent-operating-contract.md).

## CLI Surface

```sh
rekon issues adjudicate --root <repo> --json
rekon issues list [--status active|accepted|ignored|resolved|mixed] \
  --root <repo> --json
```

`issues adjudicate` always builds and writes a fresh report.
`issues list` returns the latest existing report or builds one if
none exists. The optional `--status` filter narrows the returned
groups; it does **not** re-derive the report.

## Failure Visibility

`rekon artifacts freshness --type IssueAdjudicationReport` marks
an older adjudication report stale when a newer
`FindingLifecycleReport` (or any transitively-cited input) lands.
The standard freshness flow then signals "rebuild".

The surfaces that consume the report also surface stale-source
warnings where reviewers act:

- The architecture summary publication emits an
  `## Input Freshness Warnings` section when the latest
  adjudication report or coherency delta is stale.
- The agent operating contract publication always shows a
  `### Governance Freshness` subsection with
  `Issue adjudication: fresh / stale / missing` and
  `Coherency delta: fresh / stale / missing`; on stale, it adds
  a blockquote callout that tells agents not to treat governed
  issue counts as current until `rekon refresh` runs.
- `resolve.issue` (group mode) emits an `issue.freshness` trace
  entry and a `packet.warnings[]` entry when the cited
  `FindingLifecycleReport` is not the latest.

See [freshness-and-invalidation.md](freshness-and-invalidation.md)
for the detection rules.

## What This Is Not

- **Not mutation.** Raw `FindingReport`, `FindingStatusLedger`,
  and `FindingLifecycleReport` are untouched.
- **Not a filter.** Singletons remain visible; ignored / resolved
  members remain visible inside their groups.
- **Not a fuzzy matcher.** Grouping is deterministic key equality.
- **Not a health score.** No aggregate score is computed.
- **Not a remediation planner.** Adjudicated groups are input
  candidates for future work orders.
- **Not a status writer.** Status decisions remain in
  `FindingStatusLedger`.
- **Not a `CoherencyDelta` replacement.** `CoherencyDelta` is the
  rolled-up governance summary; adjudication is the dedupe layer
  beneath it. In v2 the delta now consumes adjudicated groups
  when one exists (legacy lifecycle fallback remains), but the
  delta still computes severity / type / system rollups and the
  remediation queue — adjudication does not.
- **Not an LLM call.** All rules are deterministic.

## Relationship To Filtering

Adjudication is filter-aware **transitively**:
`buildFindingLifecycleReport` now consumes
`FindingFilterReport.keptFindings` when a current filter
report exists, so the lifecycle hands adjudication only kept
findings. Filtered findings stay auditable in
`FindingFilterReport.filteredFindings` and never become
`IssueAdjudicationGroup` members. Adjudication itself does not
read `FindingFilterReport` directly — the lifecycle is the
filter boundary. See the
[issue governance architecture decision](../strategy/issue-governance-architecture-decision.md).

## Cross-References

- [Issue adjudication report](../artifacts/issue-adjudication-report.md)
- [Finding lifecycle](finding-lifecycle.md)
- [Finding filters](finding-filters.md)
- [Finding filter report](../artifacts/finding-filter-report.md)
- [Finding filter health report](../artifacts/finding-filter-health-report.md)
- [Coherency delta](coherency-delta.md)
- [Issue governance architecture decision](../strategy/issue-governance-architecture-decision.md)
- [Classic guarantees audit](../strategy/classic-guarantees-audit.md)
- [Classic guarantee regression plan](../strategy/classic-guarantee-regression-plan.md)
- [Resolvers](resolvers.md)
