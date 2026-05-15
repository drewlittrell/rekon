# Issue Adjudication v2 — Deterministic Cross-Rule Merge Hints

## Batch Summary

`IssueAdjudicationReport` now exposes an optional
`mergeCandidates` array. After deterministic exact grouping
runs, the adjudicator inspects every pair of distinct groups
and emits **advisory** `IssueMergeCandidate` records for pairs
sharing at least two deterministic signals out of
`same-file` / `overlapping-files`, `same-subject` /
`overlapping-subjects`, `same-severity`,
`related-type-prefix`, `same-suggested-action`, and
`shared-system`. **Candidates are never merged groups.**
`CoherencyDelta`, `resolve.issue`, and the publications still
count and route the underlying groups separately. No mutation
of any artifact. No LLM. No embeddings. No fuzzy matching.
Closes the merge-hints slice of P1.1 in the Classic Guarantees
Audit.

## CHANGES MADE

- `packages/kernel-findings/src/index.ts`:
  - New exported types: `IssueMergeCandidateStrength`,
    `IssueMergeCandidateReason`, `IssueMergeCandidate`.
  - `IssueAdjudicationReport` gains optional
    `mergeCandidates?: IssueMergeCandidate[]`.
  - `IssueAdjudicationSummary` gains optional
    `mergeCandidates?: number`.
  - `deriveIssueAdjudication` now returns
    `{ groups, summary, mergeCandidates }` (the third field is
    additive; existing callers that destructured the first two
    fields keep working). The summary's `mergeCandidates` count
    is populated.
  - New exported `deriveMergeCandidates(groups)` helper for
    consumers that need the same logic outside the standard
    `createIssueAdjudicationReport` path.
  - New module-scope constants:
    `ISSUE_MERGE_CANDIDATE_STRENGTHS`,
    `ISSUE_MERGE_CANDIDATE_REASONS`, `STRENGTH_RANK`,
    `MERGE_CANDIDATE_MIN_CONFIDENCE` (`0.45`),
    `MERGE_CANDIDATE_STRONG_THRESHOLD` (`0.7`),
    `MERGE_CANDIDATE_MEDIUM_THRESHOLD` (`0.45`),
    `MERGE_CANDIDATE_MAX` (`50`).
  - New internal helpers: `evaluateMergeCandidate`,
    `typePrefix`, `suggestedActionCategory`,
    `strengthForConfidence`, `sameSet`, `anyOverlap`. Plus the
    `SUGGESTED_ACTION_KEYWORD_BUCKETS` ordered list for the
    deterministic action category map.
  - `createIssueAdjudicationReport` now writes
    `mergeCandidates` into the artifact when non-empty
    (otherwise omits the field).
  - `validateIssueAdjudicationReport` accepts the new optional
    array; a new `validateMergeCandidate` enforces required
    fields and the union types.
- `packages/cli/src/index.ts`:
  - `rekon issues adjudicate` JSON output now includes
    `mergeCandidates: report.mergeCandidates ?? []`.
  - `rekon issues list` JSON output now includes the same
    field, sourced from the latest report.
  - CLI signatures unchanged; the addition is purely additive
    to the JSON envelope.
- `tests/contract/issue-adjudication-merge-candidates.test.mjs`
  (12 new tests): pure-helper cross-rule candidate emission,
  deterministic reasons, confidence cap at 1.0, deterministic
  repeatability, unrelated-findings exclusion, exact-duplicate
  exclusion, both-inactive exclusion, mixed-activity strong-
  only emission, exported `deriveMergeCandidates` parity, CLI
  `issues adjudicate` JSON, CLI `issues list` JSON,
  `CoherencyDelta` non-counting of candidates, and `artifacts
  validate` cleanliness.
- Docs:
  - `docs/artifacts/issue-adjudication-report.md`: Shape
    section adds `IssueMergeCandidate` + the optional
    `mergeCandidates` / `summary.mergeCandidates` fields. New
    "Merge Candidates (v2)" section documenting detection
    signals (with weights), strength labels, activity filter,
    ordering, the suggested-action keyword buckets, and the
    anti-gaming reminders.
  - `docs/concepts/issue-adjudication.md`: new "Merge
    Candidates (v2)" concept section above Status Derivation.
  - `docs/concepts/coherency-delta.md`: new explicit "Merge
    candidates are advisory only" callout above the
    "Adjudicated input (v2)" callout.
  - `docs/strategy/classic-subsystem-purpose-map.md`:
    subsystem 6 now reads "P1 preserved (v1 + coherency v2 +
    resolver v2 + publication v2 + freshness v2 + merge-hints
    v2)". Next slice updated to "Operator-assisted issue
    merge decision ledger".
  - `docs/strategy/classic-behavior-roadmap.md`: new Phase B
    entry "Issue adjudication v2: deterministic cross-rule
    merge hints".
  - `docs/strategy/classic-guarantee-regression-plan.md`: P1.1
    records the shipped merge-hints slice and the new 12-test
    contract suite.
  - `docs/strategy/roadmap.md`: new bullet under completed
    alpha spine.
  - `CHANGELOG.md`: entry at the top of `0.1.0-alpha.1`.
  - `README.md`: no edit needed (existing CLI surface; the
    addition is in the JSON envelope only).
- `.rekon-dev/review-packets/issue-adjudication-merge-candidates-v2.md`
  (this file).

## PUBLIC API CHANGES

Additive only.

- `@rekon/kernel-findings` exports:
  - `IssueMergeCandidateStrength = "strong" | "medium" |
    "weak"`.
  - `IssueMergeCandidateReason` (8 deterministic reasons —
    `same-file`, `overlapping-files`, `same-subject`,
    `overlapping-subjects`, `same-severity`,
    `related-type-prefix`, `same-suggested-action`,
    `shared-system`).
  - `IssueMergeCandidate` (`id`, `groupIds`, `memberFindingIds`,
    `strength`, `reasons`, `confidence`, `status:
    "candidate"`, `note`).
  - `deriveMergeCandidates(groups)`.
- `IssueAdjudicationReport` gains optional `mergeCandidates`.
- `IssueAdjudicationSummary` gains optional `mergeCandidates`
  (count).
- `deriveIssueAdjudication` return type extended additively to
  include `mergeCandidates: IssueMergeCandidate[]`. Existing
  destructure patterns (`{ groups, summary }`) continue to
  compile.
- CLI envelopes: `rekon issues adjudicate` / `rekon issues
  list` JSON adds a `mergeCandidates` array.
- No `ArtifactHeader` shape changes. No `Publication` shape
  changes. No `CoherencyDelta` shape changes. No SDK API
  changes. No new capability roles, permissions, or actuators.
  No CLI signature changes. No version bump. No npm publish.

## PURPOSE PRESERVATION CHECK

- **Original problem**: some findings describe the same
  underlying problem even when they come from different rules.
  Exact grouping leaves them as separate issues; aggressive
  semantic merge hides distinct problems. Neither extreme is
  acceptable.
- **Classic workflow guarantee**: classic issue detection /
  adjudication preserved status and avoided noisy duplicate
  surfaces. It defended against both over-fragmentation and
  silent over-merge.
- **Classic shape that provided the guarantee**:
  `services/IssueDetectionService.ts`,
  `domain/issues/mergeIssues.ts`, `services/issues/**`,
  `domain/issues/evaluators/**`,
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`.
- **Rekon equivalent guarantee (v2 hints)**: deterministic
  exact grouping (shipped) + advisory cross-rule merge
  candidates (this batch). Candidates are visible
  (`mergeCandidates` on the artifact + in CLI JSON),
  explainable (`reasons[]` lists every signal that fired,
  `confidence` is the sum), and non-mutating (`CoherencyDelta`,
  `resolve.issue`, and publications still treat them as
  separate groups). Operators (or a future operator-assisted
  merge decision ledger) decide whether to act on a candidate.
- **What would mean we failed**:
  - Cross-rule related findings are silently merged. (Closed
    by the `unrelated findings do not produce a merge
    candidate` test, the `CoherencyDelta does not count merge
    candidates as merged groups` test, and the
    `exact duplicates still group normally and do not produce
    a candidate between duplicate members` test.)
  - Merge candidates are hidden from operators. (Closed by
    `rekon issues adjudicate JSON includes mergeCandidates`
    and `rekon issues list JSON exposes mergeCandidates`.)
  - Candidate reasons are vague or untestable. (Closed by the
    `merge candidate includes deterministic reasons` test
    asserting every triggered reason.)
  - Accepted / ignored / resolved status context is lost.
    (Closed by the `two inactive groups do not produce a
    merge candidate` test and the
    `one active + one inactive candidate only emits when
    strong` test, which also asserts the candidate note
    includes the inactive-context warning.)
  - `CoherencyDelta` starts counting candidates as merged
    groups without explicit future work. (Closed by the
    `CoherencyDelta does not count merge candidates as merged
    groups` test: two cross-rule findings → 2 groups → 2
    delta items → 2 remediation steps.)
- **Regression test for the original problem**: the prescribed
  case — "given two findings with different ruleId/type but
  the same file, overlapping subjects, same severity, and
  similar suggested action category, `IssueAdjudicationReport`
  keeps them as separate groups but emits a `mergeCandidate`
  linking the two groups with deterministic reasons" — is
  pinned by `related cross-rule findings sharing
  file/subject/severity emit one merge candidate` + `merge
  candidate includes deterministic reasons` + `CoherencyDelta
  does not count merge candidates as merged groups`.

## CODEBASE-INTEL ALIGNMENT

- **Classic capability or failure mode**: issue detection /
  adjudication / dedupe / merge sophistication.
- **Relevant classic files/systems**:
  `services/IssueDetectionService.ts`, `services/issues/**`,
  `domain/issues/mergeIssues.ts`,
  `domain/issues/evaluators/**`,
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta-projections.ts`.
- **What Rekon keeps**: findings are governance artifacts (not
  raw lint noise); related findings should be visible as
  related; merge / adjudication logic should be explainable;
  status / lifecycle context should survive; no finding should
  be dropped; advisory hints should be artifacts with
  `inputRefs`.
- **What Rekon simplifies**: deterministic hints only; no
  semantic / fuzzy matching; no embedding similarity; no LLM
  review; no automatic merge; no false-positive classifier;
  no health score.
- **What Rekon does not port yet**: full classic issue merge
  sophistication; semantic issue similarity; false-positive
  scoring; LLM adjudication / review; issue health / trend
  projections; automatic merge approval workflow; operator-
  assisted merge decision ledger (recommended next slice).
- **How this advances migration**: adds the next maturity
  layer above exact deterministic grouping. Subsystem 6 in
  `docs/strategy/classic-subsystem-purpose-map.md` now reads
  "P1 preserved (v1 + coherency v2 + resolver v2 +
  publication v2 + freshness v2 + merge-hints v2)". The
  operator-assisted merge decision ledger is the recommended
  next slice; it remains explicit (no auto-mutation).

## MERGE CANDIDATE MODEL

```
IssueMergeCandidate {
  id              : "merge-candidate:<sorted-group-id-1>:<sorted-group-id-2>"
  groupIds        : two group ids (sorted)
  memberFindingIds: union of memberFindingIds across both groups (sorted)
  strength        : "strong" (>=0.70) | "medium" (>=0.45) | "weak"
  reasons         : ordered list of signals that fired
  confidence      : capped at 1.0, rounded to 3 decimals
  status          : "candidate"  (literal — never anything else)
  note            : human-readable summary; includes inactive-context
                    warning when either group is non-active
}
```

`mergeCandidates` is sorted by `strength` (strong→medium→weak),
then `confidence` desc, then `id` asc. Capped at 50 entries per
report. When no candidates qualify, the field is omitted
entirely (along with `summary.mergeCandidates`).

## DETERMINISTIC SIGNALS

```
same-file              (+0.35)  identical non-empty file sets
overlapping-files      (+0.35)  any shared file between non-empty sets
same-subject           (+0.30)  identical non-empty subject sets
overlapping-subjects   (+0.30)  any shared subject between non-empty sets
same-severity          (+0.10)  exact severity match
related-type-prefix    (+0.15)  shared prefix before "." AND types differ
same-suggested-action  (+0.15)  same non-empty keyword bucket (deterministic)
shared-system          (+0.15)  any overlap in declared systems
```

Keyword buckets (case-insensitive substring match against
`suggestedAction + " " + title + " " + type`):

```
import              : "import"
generated-output    : "generated" / "dist" / "build"
verification        : "test" / "verify"
documentation       : "doc" / "documentation" / "readme" / "agents"
ownership-boundary  : "owner" / "system" / "boundary"
```

The category map is intentionally short and explicit. Pairs
that don't bucket simply skip the `same-suggested-action`
signal.

Activity filter:

```
both inactive                       → skip entirely
mixed active+inactive               → emit only when confidence >= 0.70
both active                         → emit at the standard >= 0.45 floor
```

These rules are documented in
`docs/artifacts/issue-adjudication-report.md` and
`docs/concepts/issue-adjudication.md`. They are intentionally
simple so a future operator-merge ledger can layer on top
without renegotiating the detection contract.

## TESTS / VERIFICATION

- `npm run typecheck` ✓
- `npm run build` ✓
- `git diff --check` ✓
- `npm run test` — 422 passed, 1 skipped optional, 0 failed.
  Includes the 12 new tests in
  `tests/contract/issue-adjudication-merge-candidates.test.mjs`.
  The 15 existing tests in
  `tests/contract/issue-adjudication.test.mjs`, the 17 tests
  in `tests/contract/issue-resolver-adjudicated.test.mjs`, the
  11 tests in
  `tests/contract/coherency-delta-adjudicated.test.mjs`, the
  11 tests in
  `tests/contract/publications-adjudicated-issues.test.mjs`,
  and the 10 tests in
  `tests/contract/adjudication-coherency-freshness-guardrails.test.mjs`
  all still pass without modification — confirming the
  additive change preserves every downstream surface's
  semantics.
- `node scripts/audit-license.mjs` ✓ (19 packages)
- `node scripts/audit-package-exports.mjs` ✓ (19 packages)
- `node scripts/publish-dry-run.mjs` ✓ (19 packages)
- `node scripts/install-smoke.mjs` ✓
- `node scripts/install-tarball-smoke.mjs` ✓ (19 tarballs, 13
  artifacts emitted)
- Prescribed CLI smoke against `examples/simple-js-ts` (clean
  fixture has no findings, so all counts are zero):
  - `rekon refresh` → status `passed`
  - `rekon issues adjudicate` → 0 groups, 0 merge candidates
  - `rekon issues list` → 0 merge candidates
  - `rekon artifacts validate` → `valid: true`
  - `rekon artifacts freshness` → 14 artifacts indexed
- Cross-rule end-to-end smoke (seeded `a1` /
  `b1` on `src/foo.ts` differing only by type / ruleId):
  - 2 groups, 1 merge candidate with `id:
    merge-candidate:issue-a1:issue-b1`, strength `strong`,
    confidence `1`, reasons `["same-file", "same-subject",
    "same-severity", "related-type-prefix",
    "same-suggested-action"]`.
  - `CoherencyDelta`: 2 delta items, 2 active, 2 remediation
    steps (one per group; the merge candidate does not affect
    counts).

## INTENTIONALLY UNTOUCHED

- `IssueAdjudicationGroup`, `IssueAdjudicationStatus`,
  `IssueAdjudicationInput` shapes unchanged.
- `Finding`, `FindingReport`, `FindingStatusLedger`,
  `FindingLifecycleReport`, `EffectiveFinding`,
  `CoherencyDelta`, `Publication` shapes unchanged.
- `buildFindingLifecycleReport`,
  `buildIssueAdjudicationReport`, `buildCoherencyDelta` runtime
  helpers unchanged (the new merge candidates flow through
  `createIssueAdjudicationReport` automatically).
- `resolve.issue`, `resolve.route`, `resolve.seam`,
  `resolve.preflight` unchanged.
- `@rekon/capability-docs.architecture-summary`,
  `@rekon/capability-docs.agent-contract`,
  `@rekon/capability-docs.proof-report`, and
  `@rekon/capability-docs.publisher` (agents) unchanged — they
  continue to read the latest `IssueAdjudicationReport` and
  render group counts. Surfacing merge candidates in
  publications is intentionally deferred (was an explicit
  non-goal of this batch).
- `rekon refresh` step order unchanged.
- All CLI signatures unchanged.
- No new capability roles, permissions, or actuators.
- No source-write surface. No watcher. No LLM. No embeddings.
  No fuzzy matching.
- No version bump. No npm publish.

## RISKS / FOLLOW-UP

- **Risk**: candidate confidence can saturate (capped at 1.0)
  when many signals fire, making "strong" common. Mitigation:
  the activity filter and the min-confidence floor still
  reject weak pairs; the report's `mergeCandidates` field is
  capped at 50 entries; consumers read the explicit `reasons[]`
  list to judge specificity. The cap is documented.
- **Risk**: the suggested-action keyword buckets are fixed and
  text-heuristic. A new rule pack that uses uncommon vocabulary
  would not contribute the `same-suggested-action` signal.
  Mitigation: the bucket map is small, deterministic, and
  documented; new buckets can be added in a future batch
  without changing the contract. Pairs that miss this signal
  still qualify when enough other signals fire.
- **Risk**: a pair of unrelated rules can share the same file
  by accident (e.g., `import_boundary.*` and an unrelated
  `architecture.*` rule on the same module). The `same-file` +
  `same-severity` signals alone score `0.45` and would emit a
  `medium` candidate. Mitigation: candidates are advisory, so
  operators review before acting; the candidate's `reasons[]`
  list makes the weak overlap explicit. Future ruleset
  curation can suppress noise via the operator-assisted merge
  decision ledger (next slice).
- **Risk**: `O(groups^2)` pair evaluation. With the
  `MERGE_CANDIDATE_MAX = 50` cap, the practical cost is
  bounded; for very large repositories this could matter.
  Mitigation: future work could pre-filter pairs by shared
  file / subject before scoring. Out of scope for v2.
- **Follow-up**: operator-assisted issue merge decision ledger
  (recommended next slice) — let operators explicitly accept
  or reject candidates, preserve decisions as artifacts. Still
  no automatic semantic merge.
- **Follow-up**: publications could optionally surface a
  "Merge Candidates" summary line (e.g., "3 cross-rule merge
  candidates waiting for review"). Deferred — out of scope per
  this batch's explicit non-goals.
- **Follow-up**: extend the keyword buckets when new rule
  packs land.

## NEXT STEP

Push `main` directly after checks pass. Commit on the
worktree's detached HEAD, fast-forward local `main` from the
primary worktree, push `origin/main`. Per the user's queued
sequence, the next batch is **Operator-assisted issue merge
decision ledger** — let operators accept or reject merge
candidates explicitly, preserve decisions as artifacts. Still
no automatic semantic merge.
