# Operator-Assisted Issue Merge Decision Ledger

## Batch Summary

`IssueMergeDecisionLedger` records explicit operator
`accepted` / `rejected` decisions on the advisory
`IssueMergeCandidate` records that v2 adjudication emits.
Decisions are durable artifacts with required notes and
optional reasons. **Decisions never merge groups.**
`CoherencyDelta`, `resolve.issue`, and the publications
continue to operate on actual `IssueAdjudicationGroup` records.
A future `CoherencyDelta` v3 may opt in to consuming accepted
decisions; that is deferred. Closes the merge-decisions slice
of P1.1 in the Classic Guarantees Audit.

## CHANGES MADE

- `packages/kernel-findings/src/index.ts`:
  - New exported types: `IssueMergeDecisionStatus` (`"accepted"
    | "rejected"`), `IssueMergeDecisionReason`
    (`"same-root-cause" | "separate-issues" |
    "false-positive-candidate" | "other"`), `IssueMergeDecision`,
    `IssueMergeDecisionLedger`.
  - `IssueMergeCandidate` gains six **optional** decision-
    annotation fields: `decision`, `decisionId`, `decisionNote`,
    `decisionReason`, `decisionDecidedAt`, `decisionDecidedBy`.
    Populated by `applyIssueMergeDecisionsToCandidates` on
    read; absent when no ledger exists. Candidate generation
    is unchanged.
  - New exported pure helpers:
    `createIssueMergeDecisionLedger`,
    `validateIssueMergeDecisionLedger`,
    `assertIssueMergeDecisionLedger`,
    `issueMergeDecisionLedgerSchema`,
    `findLatestIssueMergeDecision`,
    `applyIssueMergeDecisionsToCandidates`.
  - Internal helpers: `validateMergeDecision`,
    `normalizeMergeDecision`. The candidate validator
    (`validateMergeCandidate`) now accepts the optional
    `decision` annotation field.
- `packages/runtime/src/index.ts`:
  - New `RecordIssueMergeDecisionOptions` type and exported
    `recordIssueMergeDecision(store, options)` helper. The
    helper:
    1. Reads the latest `IssueAdjudicationReport`. If none
       exists, throws with a clear "run `rekon issues
       adjudicate` or `rekon refresh`" message.
    2. Resolves the candidate from the report's
       `mergeCandidates`. If the candidate id is unknown,
       throws with a listing of every available candidate id.
    3. Validates `note` (required, non-empty) and `decision`
       (`accepted` or `rejected`).
    4. Reads the latest `IssueMergeDecisionLedger` (if any)
       to preserve prior decisions.
    5. Builds a new `IssueMergeDecision` with `id =
       merge-decision-<timestamp>`, copies `groupIds` and
       `memberFindingIds` from the candidate, sets `source:
       "operator"`, and uses the current ISO timestamp for
       `decidedAt`.
    6. Calls `createIssueMergeDecisionLedger` with the
       combined `[...priorDecisions, newDecision]` array (which
       sorts the decisions by `candidateId` then `decidedAt`),
       cites the adjudication report and prior ledger in
       `header.inputRefs`, and writes the artifact via
       `store.write(ledger)`.
  - Imports `IssueMergeDecision`, `IssueMergeDecisionLedger`,
    `IssueMergeDecisionReason`, `IssueMergeDecisionStatus`, and
    `createIssueMergeDecisionLedger` from
    `@rekon/kernel-findings`.
  - `ARTIFACT_CATEGORY_BY_TYPE` adds
    `IssueMergeDecisionLedger: "findings"`.
  - `CANONICAL_INPUT_TYPES` adds `"IssueMergeDecisionLedger"`
    so the ledger is treated like `FindingStatusLedger` and
    `OperatorFeedbackEntry`: a ledger artifact that doesn't
    cite upstream artifacts does **not** raise
    `lineage.unknown` in `validateArtifactFreshness`. Ledgers
    written by `recordIssueMergeDecision` cite the adjudication
    report anyway, so transitive lineage still works.
- `packages/sdk/src/index.ts`:
  - `BUILT_IN_ARTIFACT_TYPES` adds
    `IssueMergeDecisionLedger` at schemaVersion `0.1.0`,
    stability `experimental`.
- `packages/cli/src/index.ts`:
  - Imports `IssueAdjudicationReport`,
    `IssueMergeDecisionLedger`, `IssueMergeDecisionReason`,
    and `applyIssueMergeDecisionsToCandidates` from
    `@rekon/kernel-findings`; imports
    `recordIssueMergeDecision` from `@rekon/runtime`.
  - Three new command branches:
    - `issues merge candidates`: reads the latest
      `IssueAdjudicationReport` (or throws if none), reads the
      latest ledger if any, returns `applyIssueMergeDecisionsToCandidates(report.mergeCandidates, ledger)`
      plus the report ref and ledger ref.
    - `issues merge decide <candidate-id>`: requires
      `--decision accepted|rejected` and a non-empty `--note`;
      optional `--reason` (validated) and `--decided-by`.
      Calls `recordIssueMergeDecision` and returns the new
      ledger ref + the latest decision.
    - `issues merge decisions`: returns the latest ledger's
      decisions in order (or `{ ledger: null, decisions: [] }`
      when no ledger exists).
  - Existing `issues adjudicate` and `issues list` dispatches
    now also call `applyIssueMergeDecisionsToCandidates` so
    their `mergeCandidates` arrays carry decision annotations
    when a ledger exists.
  - New helpers `parseIssueMergeDecisionReason` and
    `readLatestMergeDecisionLedger`.
  - The `ISSUE_MERGE_DECISION_REASONS` set is declared at the
    top of the file (right after `PROTECTED_AGENT_DOC_*`) so
    `parseIssueMergeDecisionReason` is safe to call during
    `main()`'s synchronous prefix — same TDZ-safety pattern
    used by the `agent-contract export` batch.
  - Three new usage lines for `rekon issues merge candidates`,
    `rekon issues merge decide`, and `rekon issues merge
    decisions`.
- `tests/contract/issue-merge-decision-ledger.test.mjs`: 14
  new tests covering pure-helper validation, latest-decision
  lookup, annotation purity (input not mutated), CLI `merge
  candidates` initial state, CLI `merge decide` happy path,
  unknown-candidate error with listing, missing-note error,
  CLI `merge decisions` empty / populated, annotated `issues
  list`, accepted-decision-does-not-merge-CoherencyDelta,
  rejected-decision-keeps-candidate-visible, freshness without
  `lineage.unknown`, and `artifacts validate` cleanliness.
- Docs:
  - new `docs/artifacts/issue-merge-decision-ledger.md`;
  - new `docs/concepts/issue-merge-decisions.md`;
  - `docs/artifacts/issue-adjudication-report.md` adds an
    "Operator decisions" subsection inside Merge Candidates
    plus cross-references;
  - `docs/concepts/issue-adjudication.md` extends the
    candidate section with an "Operator decisions on
    candidates" paragraph;
  - `docs/concepts/coherency-delta.md` updates the "Merge
    candidates are advisory only" callout to note that
    accepted decisions also don't affect counts;
  - `docs/strategy/classic-subsystem-purpose-map.md` subsystem
    6 now reads "P1 preserved (v1 + coherency v2 + resolver
    v2 + publication v2 + freshness v2 + merge-hints v2 +
    merge-decisions v2)"; next slice "CoherencyDelta v3
    respects accepted merge decisions";
  - `docs/strategy/classic-behavior-roadmap.md` adds the new
    Phase B entry;
  - `docs/strategy/classic-guarantee-regression-plan.md` P1.1
    records the shipped slice and the new 14-test contract
    suite;
  - `docs/strategy/roadmap.md` adds a new bullet under
    completed alpha spine;
  - `CHANGELOG.md` records this entry.
- `.rekon-dev/review-packets/issue-merge-decision-ledger.md`
  (this file).

## PUBLIC API CHANGES

Additive only.

- `@rekon/kernel-findings` new exports:
  - `IssueMergeDecisionStatus`,
    `IssueMergeDecisionReason`,
    `IssueMergeDecision`,
    `IssueMergeDecisionLedger`.
  - `createIssueMergeDecisionLedger`,
    `validateIssueMergeDecisionLedger`,
    `assertIssueMergeDecisionLedger`,
    `issueMergeDecisionLedgerSchema`,
    `findLatestIssueMergeDecision`,
    `applyIssueMergeDecisionsToCandidates`.
- `IssueMergeCandidate` gains six optional fields. The
  underlying scoring + emit rules are unchanged.
- `@rekon/runtime` exports `recordIssueMergeDecision` and the
  `RecordIssueMergeDecisionOptions` type.
- `@rekon/sdk` registers `IssueMergeDecisionLedger` as a
  built-in artifact type.
- `@rekon/runtime` extends `CANONICAL_INPUT_TYPES` to include
  `IssueMergeDecisionLedger` (alongside `OperatorFeedbackEntry`,
  `FindingStatusLedger`, `EvidenceGraph`, `Rulebook`).
- New CLI commands: `rekon issues merge candidates`,
  `rekon issues merge decide <id>`, `rekon issues merge
  decisions`.
- `rekon issues list` and `rekon issues adjudicate` JSON output
  carries annotated `mergeCandidates` when a ledger exists
  (additive).
- No `ArtifactHeader` shape changes. No `Publication` /
  `CoherencyDelta` / `IssueAdjudicationReport` shape changes
  (the new optional `IssueMergeCandidate` fields are populated
  on read, not stored on the report). No SDK API changes
  beyond the built-in artifact type. No new capability roles,
  permissions, or actuators. No version bump. No npm publish.

## PURPOSE PRESERVATION CHECK

- **Original problem**: some findings probably describe the
  same underlying issue, but automatic cross-rule merging is
  risky. Operators need a way to preserve their judgment about
  candidate relationships without mutating raw findings or
  relying on memory/chat context.
- **Classic workflow guarantee**: `codebase-intel-classic`
  issue adjudication reduced noise while preserving governance
  state and avoiding untraceable issue handling. Human /
  operator decisions about false positives, grouping, and
  status were part of keeping issue output useful.
- **Classic shape that provided the guarantee**:
  `services/IssueDetectionService.ts`,
  `domain/issues/mergeIssues.ts`, `services/issues/**`,
  `domain/issues/evaluators/**`,
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`.
- **Rekon equivalent guarantee**: `IssueAdjudicationReport`
  emits advisory merge candidates (v2). This batch adds
  `IssueMergeDecisionLedger`: an artifact-backed record of
  operator `accepted` / `rejected` decisions on those
  candidates with required notes. `rekon issues list` /
  `rekon issues merge candidates` annotate the candidates with
  the latest decision. **No automatic merge** occurs:
  `CoherencyDelta`, `resolve.issue`, and the publications all
  continue to operate on actual `IssueAdjudicationGroup`
  records. The decision artifact preserves the operator's
  reasoning for downstream consumers — first the CLI annotation
  in this batch, then optionally `CoherencyDelta` v3 (deferred).
- **What would mean we failed**:
  - Accepted merge decisions silently merge groups. (Closed by
    the `accepted decision does not merge groups (CoherencyDelta
    keeps both)` test, which asserts 2 cross-rule findings →
    2 groups → 2 delta items → 2 remediation steps after an
    accepted decision.)
  - Rejected candidates disappear without trace. (Closed by
    the `rejected decision keeps the candidate visible with
    rejected annotation` test, which asserts the candidate
    remains in `issues list` with `decision: "rejected"`.)
  - Operator decisions lack notes or input refs. (Closed by
    the `IssueMergeDecisionLedger rejects a decision without a
    note` test, the `rekon issues merge decide requires --note`
    test, and the runtime helper's required-note check.
    `header.inputRefs` cites the adjudication report and prior
    ledger when one exists.)
  - Future adjudication cannot tell which candidate was
    accepted/rejected. (Closed by
    `findLatestIssueMergeDecision` returning the most-recent
    by `decidedAt` and by the annotation surfacing on the
    candidate via `applyIssueMergeDecisionsToCandidates`.)
  - Raw finding/member traceability is lost. (Closed by the
    decision recording `groupIds` and `memberFindingIds` at
    decision time, and by the `accepted decision does not
    merge groups` test asserting the underlying groups remain.)
- **Regression test for the original problem**: the prescribed
  case — "given a merge candidate linking two groups, `rekon
  issues merge decide <candidate-id> --decision accepted
  --note "..."` writes an `IssueMergeDecisionLedger` artifact,
  `rekon issues list` shows the candidate with decision
  `accepted`, and the underlying groups remain separate" — is
  pinned by the three primary CLI tests
  (`rekon issues merge decide writes a ledger artifact and
  records the decision`, `rekon issues list includes annotated
  mergeCandidates after a decision`,
  `accepted decision does not merge groups (CoherencyDelta
  keeps both)`).

## CODEBASE-INTEL ALIGNMENT

- **Classic capability or failure mode**: issue adjudication
  with operator / human judgment around merging, duplicate
  handling, and false-positive discipline.
- **Relevant classic files/systems**:
  `services/IssueDetectionService.ts`,
  `services/issues/**`,
  `domain/issues/mergeIssues.ts`,
  `domain/issues/evaluators/**`,
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`.
- **What Rekon keeps**: related issues are surfaced for human
  judgment; operator decisions are durable and auditable;
  grouping / merge state does not silently mutate raw
  findings; merge reasoning remains explainable (required
  note + optional reason); decisions are separate artifacts
  with provenance.
- **What Rekon simplifies**: operator decisions only; no
  automatic merge application; no semantic similarity; no LLM
  review; no false-positive classifier; no health score.
- **What Rekon does not port yet**: automatic merge approval
  workflow; semantic / fuzzy issue merge; LLM
  adjudication / review; false-positive scoring; issue health
  / trend projections; applying accepted merge decisions to
  CoherencyDelta counts.
- **How this advances migration**: adds the human decision
  layer between advisory merge hints and future group
  consolidation. Subsystem 6 in
  `docs/strategy/classic-subsystem-purpose-map.md` now reads
  "P1 preserved (v1 + coherency v2 + resolver v2 + publication
  v2 + freshness v2 + merge-hints v2 + merge-decisions v2)".
  Next slice: CoherencyDelta v3 respects accepted merge
  decisions.

## MERGE DECISION MODEL

```
IssueMergeDecision {
  id              : "merge-decision-<timestamp>"
  candidateId     : matches IssueMergeCandidate.id
  decision        : "accepted" | "rejected"
  note            : required, non-empty (the operator's "why")
  reason          : optional —
                    "same-root-cause" |
                    "separate-issues" |
                    "false-positive-candidate" |
                    "other"
  groupIds        : copied from the candidate at decision time
  memberFindingIds: copied; may be empty
  decidedAt       : ISO-8601 timestamp (highest = latest)
  decidedBy       : optional operator name
  source          : "operator" (CLI) | "system" (reserved)
  evidence        : optional ArtifactRef[]
}

IssueMergeDecisionLedger {
  header   : ArtifactHeader
  decisions: IssueMergeDecision[]  // sorted by candidateId,
                                   // then decidedAt
}
```

Decision history is preserved across calls: each
`recordIssueMergeDecision` invocation appends to the latest
ledger's `decisions` array, and `findLatestIssueMergeDecision`
returns the highest `decidedAt` for a candidate.
`applyIssueMergeDecisionsToCandidates` annotates each
candidate with the latest decision (or leaves it bare when no
decision exists for that candidate).

## CLI COMMANDS ADDED

```sh
rekon issues merge candidates [--root <path>] [--json]
rekon issues merge decide <candidate-id> \
  --decision accepted|rejected --note <note> \
  [--reason same-root-cause|separate-issues|false-positive-candidate|other] \
  [--decided-by <name>] \
  [--root <path>] [--json]
rekon issues merge decisions [--root <path>] [--json]
```

- `issues merge candidates` returns annotated candidates +
  the report ref + the ledger ref (or `null`).
- `issues merge decide` returns the new ledger artifact ref +
  the latest decision.
- `issues merge decisions` returns the latest ledger ref +
  the decisions in order.
- `rekon issues list` and `rekon issues adjudicate` also
  include annotated `mergeCandidates` when a ledger exists
  (additive — the underlying candidate fields are unchanged).

CLI exit codes: missing positional, missing flag, unknown
reason, unknown candidate, empty note, or missing adjudication
report all exit non-zero with a clear stderr message listing
the corrective action.

## ADVISORY VS APPLIED MERGE BEHAVIOR

Decisions are **advisory**:

- They never mutate `IssueAdjudicationReport.groups`,
  `CoherencyDelta.items`, `CoherencyDelta.remediationQueue`,
  `FindingReport`, `FindingStatusLedger`, or
  `FindingLifecycleReport`.
- An `accepted` decision does NOT consolidate the underlying
  groups. The architecture summary's "Governed Issue Groups"
  table still shows both groups. The agent contract's "Top
  active groups" list still shows both. `resolve.issue` still
  matches against actual groups.
- A `rejected` decision does NOT remove the candidate from
  the report. It only changes the annotation so future
  reviewers can see the prior judgment.
- Overrides append: a later decision on the same candidate
  shows up as the new effective annotation, but the prior
  decision remains in ledger history.

The path to **applied** merges (where accepted decisions
actually change counts) is `CoherencyDelta` v3 (recommended
next slice). That future batch can opt in to consuming
accepted decisions to fold the underlying groups into a single
delta item / one remediation step, while keeping the raw
groups inspectable through `memberFindingIds`. This batch
explicitly does not change `CoherencyDelta` behavior.

## TESTS / VERIFICATION

- `npm run typecheck` ✓
- `npm run build` ✓
- `git diff --check` ✓
- `npm run test` — 436 passed, 1 skipped optional, 0 failed.
  Includes the 14 new tests in
  `tests/contract/issue-merge-decision-ledger.test.mjs`. All
  76 existing tests in the adjudication chain
  (`issue-adjudication.test.mjs` (15),
  `issue-resolver-adjudicated.test.mjs` (17),
  `coherency-delta-adjudicated.test.mjs` (11),
  `publications-adjudicated-issues.test.mjs` (11),
  `adjudication-coherency-freshness-guardrails.test.mjs` (10),
  `issue-adjudication-merge-candidates.test.mjs` (12)) still
  pass unchanged — confirming the additive change preserves
  every downstream surface's semantics.
- `node scripts/audit-license.mjs` ✓ (19 packages)
- `node scripts/audit-package-exports.mjs` ✓ (19 packages)
- `node scripts/publish-dry-run.mjs` ✓ (19 packages)
- `node scripts/install-smoke.mjs` ✓
- `node scripts/install-tarball-smoke.mjs` ✓ (19 tarballs, 13
  artifacts emitted)
- Prescribed CLI smoke against `examples/simple-js-ts` (clean
  fixture; no findings):
  - `rekon refresh` → status `passed`
  - `rekon issues adjudicate` → 0 groups, 0 candidates
  - `rekon issues merge candidates` → 0 candidates, ledger
    `null`
  - `rekon issues merge decisions` → 0 decisions, ledger
    `null`
  - `rekon artifacts validate` → `valid: true`
  - `rekon artifacts freshness` → 14 artifacts indexed
- End-to-end cross-rule smoke (seeded `a1` / `b1` on
  `src/foo.ts` differing only by type / ruleId):
  - `rekon issues merge candidates` shows the candidate with
    `decision: null` initially.
  - `rekon issues merge decide
    merge-candidate:issue-a1:issue-b1 --decision accepted
    --note "Same root cause: both rules surface the same
    boundary violation." --reason same-root-cause --decided-by
    drew` writes a ledger; the new decision carries
    `decision: "accepted"`, `reason: "same-root-cause"`,
    `decidedBy: "drew"`.
  - `rekon issues merge decisions` reports 1 decision.
  - `rekon issues list` returns the candidate annotated with
    `decision: "accepted"`, `decisionReason: "same-root-cause"`,
    `decisionDecidedBy: "drew"`, and the full
    `decisionNote`.
  - `rekon coherency delta` keeps 2 items + 2 active + 0
    merged (no merge applied).
  - `rekon issues merge decide … --decision rejected
    --reason separate-issues …` overrides the prior decision;
    `rekon issues list` shows `decision: "rejected"`,
    `decisionReason: "separate-issues"`.
  - `rekon issues merge decide no-such-candidate …` exits
    non-zero with `Merge candidate not found: no-such-candidate
    (available candidate ids: merge-candidate:issue-a1:issue-b1).`
  - `rekon artifacts validate` → `valid: true`
  - `rekon artifacts freshness --type IssueMergeDecisionLedger`
    reports no `lineage.unknown` issues on the latest ledger.

## INTENTIONALLY UNTOUCHED

- `IssueAdjudicationGroup`, `IssueAdjudicationSummary`,
  `IssueAdjudicationReport` shapes unchanged. Candidate
  scoring + emit rules unchanged.
- `Finding`, `FindingReport`, `FindingStatusLedger`,
  `FindingLifecycleReport`, `EffectiveFinding`,
  `CoherencyDelta`, `Publication`, `ArtifactHeader` shapes
  unchanged.
- `buildFindingLifecycleReport`,
  `buildIssueAdjudicationReport`, `buildCoherencyDelta`
  runtime helpers unchanged.
- `resolve.issue` / `resolve.route` / `resolve.seam` /
  `resolve.preflight` unchanged. The resolver does **not**
  read `IssueMergeDecisionLedger` in this batch.
- `@rekon/capability-docs.architecture-summary` /
  `agent-contract` / `proof-report` / `publisher` unchanged.
  Neither publication renders merge decisions in this batch.
- `rekon refresh` step order unchanged; no
  `issues.merge-decisions` step.
- Existing CLI signatures unchanged. New commands are
  additive.
- No new capability roles, permissions, or actuators.
- No source-write surface. No watcher. No daemon. No LLM. No
  embeddings. No fuzzy / semantic matching. No automatic
  merge.
- No version bump. No npm publish.

## RISKS / FOLLOW-UP

- **Risk**: an operator records an `accepted` decision
  expecting `CoherencyDelta` to consolidate counts. Mitigation:
  the docs are explicit ("decisions are advisory; they never
  merge groups in this batch"); the agent contract's existing
  "Do not treat raw finding count as governed issue count"
  rule still applies; the next batch (CoherencyDelta v3) is
  where applied merges would land if approved.
- **Risk**: ledger size grows over time as operators record
  many decisions. Mitigation: each ledger artifact is small,
  freshness already marks stale ledgers (newer ledger
  supersedes prior). The store keeps history for audit; a
  future compaction batch could prune old ledgers. Out of
  scope.
- **Risk**: an operator overrides a prior decision by mistake
  (e.g., wrong candidate id). Mitigation: the override appends
  to history rather than overwriting; the prior decision is
  still readable in the previous ledger artifact, and the
  full history is available via the `decisions` array.
  Operators can record another decision to restore the
  earlier judgment.
- **Risk**: future `CoherencyDelta` v3 must consume
  `accepted` decisions without disturbing the existing
  contract. Mitigation: `IssueMergeDecision` already carries
  `groupIds` and `memberFindingIds` snapshot from the
  candidate at decision time, plus `candidateId` for re-lookup,
  so a future consumer has everything it needs without
  changing the decision shape.
- **Risk**: TDZ on `ISSUE_MERGE_DECISION_REASONS` —
  encountered during initial smoke and fixed by moving the
  set to the top of `packages/cli/src/index.ts`. Same pattern
  used by the `agent-contract export` batch. Worth documenting
  as a recurring CLI-architecture rule.
- **Follow-up**: `CoherencyDelta` v3 respects accepted merge
  decisions (recommended next batch).
- **Follow-up**: publications could optionally surface merge
  decision counts (e.g., "3 accepted merge decisions waiting
  for CoherencyDelta v3"). Deferred.
- **Follow-up**: a future operator-decision compaction batch
  to prune old ledgers once `CoherencyDelta` v3 has consumed
  them.

## NEXT STEP

Push `main` directly after checks pass. Commit on the
worktree's detached HEAD, fast-forward local `main` from the
primary worktree, push `origin/main`. Per the user's queued
sequence, the next batch is **CoherencyDelta v3 respects
accepted merge decisions** — let accepted decisions influence
roll-up counts and remediation grouping while keeping rejected
decisions separate and preserving raw groups + member
findings.
