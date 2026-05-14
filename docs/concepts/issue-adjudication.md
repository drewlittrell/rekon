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
- Future `resolve.issue` v2 may search adjudicated groups first
  before falling back to `FindingReport` / lifecycle. Deferred.

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

## Cross-References

- [Issue adjudication report](../artifacts/issue-adjudication-report.md)
- [Finding lifecycle](finding-lifecycle.md)
- [Coherency delta](coherency-delta.md)
- [Classic guarantees audit](../strategy/classic-guarantees-audit.md)
- [Classic guarantee regression plan](../strategy/classic-guarantee-regression-plan.md)
- [Resolvers](resolvers.md)
