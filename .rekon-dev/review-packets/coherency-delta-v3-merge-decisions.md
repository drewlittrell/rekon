# Review Packet: CoherencyDelta v3 Respects Accepted Merge Decisions

Slice: P1.1 (Issue Adjudication), coherency-merge slice.

## CHANGES MADE

`packages/kernel-findings/src/index.ts`
- Extended `CoherencyDeltaItem` with three additive optional
  fields: `mergedIssueGroupIds`, `mergeDecisionIds`,
  `mergeCandidateIds`. Existing group-aware fields
  (`issueGroupId`, `canonicalFindingId`, `memberFindingIds`,
  `groupingReasons`) are unchanged.
- Extended `CoherencyDeltaInput` with optional
  `mergeCandidates?: IssueMergeCandidate[]` and
  `mergeDecisions?: IssueMergeDecision[]`. The v1 (lifecycle) and
  v2 (group-mode-without-decisions) entry points keep their
  current behavior.
- Added pure helper
  `rollupIssueGroupsByAcceptedMergeDecisions(input)` and exported
  type `IssueGroupRollup`. Implementation: deterministic
  union-find over `IssueAdjudicationGroup.id`. Only the latest
  decision per `candidateId` participates; rejected (or absent)
  decisions do not connect groups. Rollup id is the singleton
  `groupId` or `merged:<sorted-group-ids-joined-by-+>`. Rollups
  are sorted by id.
- `createCoherencyDelta`: when `mergeDecisions` is non-empty in
  group mode, builds items via
  `rollupIssueGroupsByAcceptedMergeDecisions` then
  `buildItemFromRollup`. When `mergeDecisions` is empty/missing,
  the function preserves the v2 one-item-per-group path. When
  `issueGroups` is missing, the v1 lifecycle path is unchanged.
- New private helper `buildItemFromRollup(rollup,
  systemsForIssueGroup?)`: singleton rollups delegate to
  `buildItemFromIssueGroup` so single-group output is byte-for-byte
  unchanged. Multi-group rollups produce a single merged item
  carrying the unioned files, systems, member finding ids,
  evidence (deduped by `type:id`), and a `groupingReasons` set
  that includes `"operator-accepted-merge"` plus the union of
  underlying groups' reasons. The canonical group inside a
  multi-group rollup is the highest-severity-active group with a
  deterministic tiebreaker by `id`. The severity is the worst
  severity in the bucket. The status / active mapping:
  - any active → `existing` / `active`
  - else any `resolved` → `resolved` / `inactive`
  - else any `accepted` → `accepted` / `inactive`
  - else `ignored` / `inactive`
- Remediation queue id mapping: merged rollups produce
  `remediation:merged:<sorted-group-ids-joined-by-+>` instead of
  the regular `remediation:group:<group-id>` form so the queue
  collapses to one step per accepted merged set.

`packages/runtime/src/index.ts`
- `buildCoherencyDelta` now reads the latest
  `IssueMergeDecisionLedger` (when one exists with a non-empty
  `decisions` array), threads its `decisions` into
  `createCoherencyDelta`, and cites the ledger in `inputRefs`.
  When no ledger exists or it carries no decisions, the function's
  v2 behavior is preserved verbatim — the delta does not cite a
  ledger and items are one-per-group.

No CLI surface change. `rekon coherency delta` continues to
output the v3-aware JSON shape with the new optional fields
present only on merged rollup items.

Docs touched:
- `docs/artifacts/coherency-delta.md` — added v3 mode section,
  updated header / input-refs note, extended the
  `CoherencyDeltaItem` type sample with the three new optional
  fields, added cross-references.
- `docs/concepts/coherency-delta.md` — rewrote the merge-candidate
  callout to describe the v3 advisory-to-projection model.
- `docs/artifacts/issue-merge-decision-ledger.md` — updated
  "Purpose", "Consumed By", and "What This Is Not" to reflect the
  CoherencyDelta v3 consumer.
- `docs/concepts/issue-merge-decisions.md` — replaced the
  "decisions do not merge groups" section with "decisions do not
  mutate source artifacts" describing the projection model.
- `docs/artifacts/issue-adjudication-report.md` — anti-gaming
  reminders + operator-decisions subsection refreshed.
- `docs/concepts/issue-adjudication.md` — anti-gaming + operator
  decisions paragraph refreshed.
- Strategy docs updated:
  `docs/strategy/classic-subsystem-purpose-map.md` (subsystem 6
  status + next slice),
  `docs/strategy/classic-behavior-roadmap.md` (new phase entry
  for v3),
  `docs/strategy/classic-guarantee-regression-plan.md` (P1.1
  regression entry for the new 12-test contract suite),
  `docs/strategy/roadmap.md` (new bullet under completed alpha
  spine).
- `CHANGELOG.md` — detailed entry at the top of `0.1.0-alpha.1`.

Tests:
- `tests/contract/coherency-delta-merge-decisions.test.mjs` —
  12 new contract tests:
  1. helper collapses A,B,C with one accepted A-B → 1 merged + 1
     singleton rollup
  2. latest rejected decision supersedes earlier accepted
  3. transitive accepted A-B and B-C produce one merged rollup
     containing A,B,C
  4. `createCoherencyDelta` produces the merged rollup item with
     correct ids, member finding union, worst severity, and
     canonical group selection
  5. merged active rollup yields exactly one merged remediation
     step keyed by `remediation:merged:<group-ids>`
  6. rejected decision keeps groups separate, no merged fields
  7. v2 group-mode behavior preserved when no decisions / empty
     decisions
  8. inactive-only merged rollup is not active and not in the
     remediation queue
  9. runtime `buildCoherencyDelta` cites
     `IssueMergeDecisionLedger` in `inputRefs` and produces a
     merged rollup item via the CLI on a cross-rule fixture
  10. CoherencyDelta freshness goes `stale` after a newer
      `IssueMergeDecisionLedger`
  11. `artifacts validate` stays clean with the v3-aware delta in
      the store
  12. `buildCoherencyDelta` without decisions preserves v2 group
      behavior end-to-end (no `IssueMergeDecisionLedger` ref,
      none of the new fields on items)
- `tests/contract/issue-merge-decision-ledger.test.mjs` — the
  existing "accepted decision does not merge groups
  (CoherencyDelta keeps both)" test was updated to assert the v3
  invariants instead: `IssueAdjudicationReport.groups` still has
  two groups (no upstream mutation), but `CoherencyDelta` now
  emits one merged item + one merged remediation step.

## PUBLIC API CHANGES

`@rekon/kernel-findings`:
- New exported pure helper:
  `rollupIssueGroupsByAcceptedMergeDecisions(input): IssueGroupRollup[]`.
- New exported type: `IssueGroupRollup`.
- `CoherencyDeltaItem` gains three optional fields:
  `mergedIssueGroupIds`, `mergeDecisionIds`,
  `mergeCandidateIds`. All additive; existing fields unchanged.
- `CoherencyDeltaInput` gains two optional fields:
  `mergeCandidates`, `mergeDecisions`. Additive; existing fields
  unchanged.

`@rekon/runtime`:
- `buildCoherencyDelta` signature is unchanged. Behavior in
  adjudicated mode now reads
  `IssueMergeDecisionLedger` automatically; behavior in legacy
  lifecycle mode is unchanged.

No SDK API change. No artifact registry change beyond the additive
optional `CoherencyDeltaItem` fields. No new capability role. No
new CLI subcommand. No schemaVersion bump on `CoherencyDelta`
because all changes are additive and validator was already
structural (only required fields were enforced).

## PURPOSE PRESERVATION CHECK

Original problem: governed issue groups + advisory merge candidates
are not enough; once an operator has accepted that two issue groups
are the same underlying issue, the roll-up / remediation surface
should stop double-counting them. But automatic merging is unsafe;
operator judgment must remain in the loop.

Classic shape: `services/IssueDetectionService.ts`,
`domain/issues/mergeIssues.ts`,
`packages/product-codebase-intel/src/replatform/replatform-delta.ts`,
`packages/product-codebase-intel/src/replatform/replatform-delta-projections.ts`.

Rekon equivalent:
- `IssueAdjudicationReport` produces deterministic groups and
  advisory `IssueMergeCandidate` records.
- `IssueMergeDecisionLedger` records operator `accepted` /
  `rejected` decisions per candidate.
- `CoherencyDelta` v3 honors **accepted** decisions, producing
  merged rollup items + remediation steps with raw group ids /
  member finding ids still traceable. Rejected decisions keep
  groups separate.

What would mean we failed:
- Accepted merge decisions ignored by CoherencyDelta — covered by
  tests 1, 4, 5, 9, the updated `issue-merge-decision-ledger`
  test.
- Rejected decisions still collapse groups — covered by tests 2,
  6.
- Raw group / member traceability lost — covered by tests 4, 9
  (assert `mergedIssueGroupIds` / `mergeCandidateIds` /
  `memberFindingIds` populated on the merged item).
- CoherencyDelta mutates adjudication or decision artifacts —
  covered by the updated `issue-merge-decision-ledger` test
  asserting `IssueAdjudicationReport.summary.totalGroups === 2`
  after an accepted decision.
- Operator decisions become automatic semantic merging — there is
  no LLM, no fuzzy / embedding / semantic matching anywhere in
  the slice. The rollup is pure union-find over operator inputs.

## CODEBASE-INTEL ALIGNMENT

Classic capability / failure mode: issue adjudication + coherency
rollup with human/operator merge judgment.

What Rekon keeps:
- governed issue roll-up reduces duplicate remediation work
- operator decisions are explicit, durable, artifact-backed
- accepted merges affect downstream summaries (in this batch:
  CoherencyDelta)
- rejected merges preserve separation
- raw findings and groups remain traceable
- output is artifact-backed with `inputRefs`

What Rekon simplifies:
- accepted decision only affects the `CoherencyDelta` projection
  (not `IssueAdjudicationReport.groups`)
- no automatic merge decision
- no semantic / fuzzy / LLM matching
- no health score, no trend / watch alerts
- no remediation auto-apply

What Rekon does not port yet:
- full semantic issue merge
- false-positive classifier
- LLM adjudication / review
- issue health / trend projections
- operator UI for merge decisions
- propagating accepted decisions into `resolve.issue` and the
  publications (next slice)

How this advances migration:
- Closes the operator-judgment-to-rollup loop while keeping the
  raw artifacts unmutated.
- Reduces double-counting in the remediation queue without unsafe
  automatic merging.
- Prepares future resolver / publication surfaces to consume the
  same merged-rollup signal.

## MERGE DECISION ROLLUP MODEL

Inputs:
- `groups: IssueAdjudicationGroup[]` — raw groups from the latest
  `IssueAdjudicationReport`.
- `mergeCandidates?: IssueMergeCandidate[]` — from the report's
  optional `mergeCandidates` array.
- `decisions?: IssueMergeDecision[]` — from the latest
  `IssueMergeDecisionLedger.decisions`.

Algorithm:
1. Build `latestByCandidate: Map<candidateId, IssueMergeDecision>`
   keeping the decision with the largest `decidedAt` per candidate
   id. This is the "latest wins" rule.
2. Initialize union-find with each group as its own root.
3. For each candidate id with `decision === "accepted"` in
   `latestByCandidate`, take the linked group ids from the
   candidate (or fall back to `decision.groupIds`), filter to the
   ones that actually exist in `groups`, and `union(first, other)`
   over all of them. Track the candidate id and decision id per
   group so the rollup can emit them.
4. Bucket groups by their current root, sort each bucket by id,
   and emit:
   - singleton rollup with `id = groupId`, or
   - merged rollup with
     `id = merged:<sorted-group-ids-joined-by-+>`.
5. Rollups are returned sorted by `id`.

Properties:
- Deterministic: smaller id wins as the new root; rollups are
  sorted by id; group ids inside a rollup are sorted; decision /
  candidate id sets are sorted.
- Latest-wins: rejected decisions correctly supersede earlier
  accepted decisions, and vice versa.
- Transitive: accepted A-B and accepted B-C produce one rollup
  containing A, B, C (covered by test 3).
- Conservative: only candidates whose latest decision is
  `accepted` connect groups; candidates with no decision do
  nothing.

## COHERENCY DELTA BEHAVIOR

Singleton rollup (group not linked by any accepted decision):
- Identical to v2 group-mode output. `buildItemFromIssueGroup` is
  called as before; none of the new optional fields are set.

Multi-group merged rollup (≥ 2 groups linked by accepted
decisions):
- `id`: `coherency:rollup:merged:<sorted-group-ids-joined-by-+>`
- `findingId` / `canonicalFindingId` / `issueGroupId`: the
  canonical group's values. Canonical group = highest-severity
  active group; deterministic tiebreaker by id.
- `severity`: worst severity across the bucket.
- `type`: canonical group's `type`.
- `title`: `Merged issue group: <canonical title>`.
- `description`: `Operator-accepted merge of <n> issue groups.`
- `files`: sorted union across the bucket.
- `systems`: sorted union of declared systems plus any
  callback-computed systems; `["unknown"]` fallback.
- `suggestedAction`: canonical's `suggestedAction` if present;
  otherwise the first non-empty one in id order.
- `status` / `active`:
  - any group active → `existing` / `active`
  - else any `resolved` → `resolved` / inactive
  - else any `accepted` → `accepted` / inactive
  - else `ignored` / inactive
- `evidence`: deduped (by `type:id`) union across the bucket.
- `memberFindingIds`: sorted union across the bucket.
- `groupingReasons`: sorted union containing
  `"operator-accepted-merge"` plus each group's grouping reasons.
- `mergedIssueGroupIds`: sorted group ids in the rollup.
- `mergeDecisionIds`: sorted ids of accepted decisions used to
  form the rollup.
- `mergeCandidateIds`: sorted ids of the merge candidates whose
  latest accepted decisions formed the rollup.

Remediation queue:
- Active rollup → exactly one step keyed by
  `remediation:merged:<sorted-group-ids-joined-by-+>`. Severity
  → priority mapping is unchanged.
- Inactive rollup → no step (existing rule for inactive items).

Summary / sort:
- Summary counts items, not raw groups — so the merged rollup
  reduces `summary.total` and any active-count by the number of
  groups it consolidates.
- Sort order is unchanged: active-first → severity → status →
  finding id.

## TESTS / VERIFICATION

Test counts:
- New: `tests/contract/coherency-delta-merge-decisions.test.mjs`
  with 12 tests.
- Updated: one existing test in
  `tests/contract/issue-merge-decision-ledger.test.mjs` flipped
  from v2 expectations ("accepted decision does not merge
  groups (CoherencyDelta keeps both)") to v3 expectations
  ("accepted decision does not mutate
  IssueAdjudicationReport groups (CoherencyDelta v3 merges them
  in the projection)").

Suite results: 448 passed / 1 skipped / 0 failed.

Required verification commands (all run, all green):
- `npm run typecheck`
- `npm run build`
- `npm run test`
- `git diff --check`
- `node scripts/audit-package-exports.mjs`
- `node scripts/publish-dry-run.mjs`
- `node scripts/audit-license.mjs`
- `node scripts/install-smoke.mjs`
- `node scripts/install-tarball-smoke.mjs`
- `node packages/cli/dist/index.js refresh --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js issues adjudicate --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js issues merge candidates --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js coherency delta --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js artifacts freshness --root examples/simple-js-ts --json`

## INTENTIONALLY UNTOUCHED

- `IssueAdjudicationReport.groups` shape and writes — not
  mutated, ever.
- `IssueAdjudicationReport.mergeCandidates` derivation,
  scoring, thresholds.
- `IssueMergeDecisionLedger` writes /
  `recordIssueMergeDecision` runtime helper.
- `applyIssueMergeDecisionsToCandidates` (existing read-side
  annotation for `rekon issues list` /
  `rekon issues adjudicate` / `rekon issues merge candidates`).
- `resolve.issue` group-mode resolution — still matches against
  raw `IssueAdjudicationGroup` records. Wiring accepted merged
  rollups in is the recommended next slice.
- `@rekon/capability-docs.architecture-summary` and
  `@rekon/capability-docs.agent-contract` publications — still
  render raw groups in the Governed Issue Groups section.
  Recommended next slice covers them.
- Remediation work order generation — still keys off
  `CoherencyDelta.remediationQueue` items as-is, which now
  collapses accepted-merged groups by id.
- All evaluator output, finding lifecycle, status ledger
  handling.
- All capability manifests, permissions, dist contents,
  schemaVersion strings.
- No version bump (`0.1.0-alpha.1` workspace + all
  `@rekon/*` packages remain).
- No npm publish.

## RISKS / FOLLOW-UP

- Risk: `applyIssueMergeDecisionsToCandidates` (advisory
  annotation on candidates) and
  `rollupIssueGroupsByAcceptedMergeDecisions` (projection
  rollup) overlap conceptually. Mitigation: they're explicitly
  separate helpers — the annotation is read-only metadata for
  `rekon issues list`; the rollup is what `CoherencyDelta`
  builds. Both consume the same ledger but never write.
- Risk: a decision with an unknown / stale `candidateId` (or a
  decision whose `groupIds` no longer all exist) is silently
  dropped from the rollup. Rationale: `IssueAdjudicationReport`
  is the source of truth for which groups currently exist; a
  decision can survive across regenerations even when its
  candidate goes away. Tests don't yet pin this explicitly; it
  is asserted indirectly through deterministic rollup output.
  Future hardening could surface a warning trace.
- Risk: severity rollup is "worst of bucket". For accepted
  rollups containing a critical group plus a low group, the
  merged item shows `critical`. This is what the work order
  asked for ("severity = highest severity among included
  groups"), but operators may want to see the original spread.
  The merged item still carries `mergedIssueGroupIds` so a
  consumer can recover per-group severity if it ever needs to.
- Risk: previously-written `CoherencyDelta` artifacts on disk
  do not reflect v3 behavior until the next `coherency delta`
  rebuild. Mitigation: freshness now marks stale on a newer
  `IssueMergeDecisionLedger`, and `rekon refresh` runs
  `coherency.delta` after `issues.adjudicate`.
- Follow-up: publication + resolver awareness of accepted
  merged rollups (next slice). `resolve.issue` should be able
  to report when a queried issue group is part of an accepted
  merged set; `architecture-summary` and `agent-contract` should
  surface merged rollups under Governed Issue Groups.
- Follow-up (deferred, captured in strategy docs): CoherencyDelta
  v4 / cross-pack adjudication / false-positive scoring / LLM
  review remain explicitly future work.

## NEXT STEP

Per the work order's closing section, the recommended next slice
is:

> Publication and resolver awareness of accepted merge decisions

Purpose:
- `architecture-summary` and `agent-contract` should render the
  operator-accepted merged rollups in Governed Issue Groups (and
  flag the rollup vs. raw-group distinction).
- `resolve.issue` should be able to tell when a queried issue
  group is part of an accepted merged set, and emit a
  corresponding trace plus packet warning.
- Still no mutation of `IssueAdjudicationReport.groups`.

This batch will not modify the v3 rollup behavior; it consumes
the merged rollup signal already present in `CoherencyDelta`.
