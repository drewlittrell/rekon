# resolve.issue v2 from IssueAdjudicationReport

## Batch Summary

`resolve.issue` now prefers governed issue groups over raw
findings. When the latest `IssueAdjudicationReport` exists, the
resolver matches the query against `group.id`,
`canonicalFindingId`, member `findingId`, or unique substring
across the group's text, and returns a packet with
`matchSource: "IssueAdjudicationReport"`, `issueGroup` populated
(including `memberFindingIds` / `groupingReasons` /
`statusBreakdown`), and `verificationByFinding` aggregating
per-member evidence. The raw `FindingReport` fallback is fully
preserved: missing report or no-match queries fall through to the
existing v1 raw-mode path with an explicit fallback trace. No
artifact mutation; no auto-resolution. Closes the resolver-
consumption slice of P1.1 in the Classic Guarantees Audit.

## CHANGES MADE

- `packages/capability-resolver/src/index.ts`:
  - Imported `IssueAdjudicationGroup`, `IssueAdjudicationReport`,
    and `IssueAdjudicationStatus` from `@rekon/kernel-findings`.
  - `ResolutionTraceEntry.sourceType` union adds
    `"IssueAdjudicationReport"`.
  - New exported types: `IssueGroupSummary` (carries `id`,
    `canonicalFindingId`, `memberFindingIds`, `type`, `ruleId`,
    `severity`, `status`, `active`, `title`, `description`,
    `files`, `subjects`, optional `systems`, `suggestedAction`,
    `groupingKey`, `groupingReasons`, `statusBreakdown`) and
    `IssueVerificationByFinding` (carries `findingId`, `status`,
    optional `verificationResultRef` / `verificationPlanRef` /
    `workOrderRef`).
  - `IssuePacket` gained four optional fields: `issueGroup`,
    `matchSource: "IssueAdjudicationReport" | "FindingReport"`,
    `verificationByFinding`. Existing fields unchanged.
  - `issueResolver.resolve` body now starts with a
    `findIssueGroupMatches` lookup against the latest
    `IssueAdjudicationReport`. Branches:
    - unique group match → calls `buildGroupIssuePacket`
    - ambiguous group match (>1) → calls
      `buildAmbiguousGroupIssuePacket` (warns, no fallback)
    - missing report → trace `Fallback` `missing`, fall through
    - no-match group → trace `IssueAdjudicationReport` `fallback`,
      fall through to raw path
  - Raw fallback path is the previous v1 logic with one new line
    setting `matchSource: "FindingReport"` when a match is found.
    All other behavior (status annotations, verification lookup,
    next-resolver decision, related findings, trace, warnings,
    `nextSteps`) is byte-identical to v1.
  - New helpers: `findIssueGroupMatches`, `toIssueGroupSummary`,
    `pickWorstVerification`, `aggregateGroupVerification`,
    `buildGroupIssuePacket`, `buildAmbiguousGroupIssuePacket`,
    `appendInputRef`, `groupIssueNextSteps`, plus the
    `VERIFICATION_STATUS_RANK` constant.
  - Manifest `consumes` adds `FindingStatusLedger` (consumed
    transitively via `readLatestLedgerFromArtifacts` already; now
    declared) and `IssueAdjudicationReport`.
- `tests/contract/issue-resolver-adjudicated.test.mjs`: 17 new
  tests covering the synthetic-harness pure-resolver path
  (exact-id matching across all three layers, ambiguous fragment
  warning, missing report fallback, no-match-in-report fallback,
  ownership combination, multi-owner → resolve.seam, status
  warnings for accepted/ignored/resolved, group.systems vs
  OwnershipMap contradiction, `issue.match` trace entry shape,
  `verificationByFinding` aggregation) plus three CLI tests
  exercising the same flows end-to-end.
- Docs:
  - `docs/artifacts/resolver-packet.md` — Issue phase section now
    documents `issueGroup`, `matchSource`, `verificationByFinding`,
    the v2 matching order, and group-mode verification aggregation.
  - `docs/concepts/resolvers.md` — `resolve.issue` introduction
    now describes group-preferred matching with raw fallback; the
    verification paragraph now describes aggregation across
    members.
  - `docs/artifacts/issue-adjudication-report.md` and
    `docs/concepts/issue-adjudication.md` — flip the
    "resolve.issue v2 deferred" line to a shipped-now description.
  - `docs/concepts/verification-results.md` — new paragraph on
    v2 group-mode aggregation.
  - `docs/strategy/classic-subsystem-purpose-map.md` — subsystem
    6 reads "P1 preserved (v1 + coherency v2 + resolver v2)";
    subsystem 8 records the group-aware resolver.
  - `docs/strategy/classic-behavior-roadmap.md` — new Phase B
    entry "resolve.issue v2 from IssueAdjudicationReport".
  - `docs/strategy/classic-guarantee-regression-plan.md` — P1.1
    records the shipped resolver consumption slice and the new
    17-test contract suite.
  - `docs/strategy/classic-alignment-map.md` — "Resolver /
    preflight context" row updated to reflect v2 group mode.
  - `docs/strategy/roadmap.md` — new bullet under completed alpha
    spine.
  - `CHANGELOG.md` — entry at the top of `0.1.0-alpha.1`.
  - `README.md` — no edit (the existing `rekon resolve issue`
    surface didn't change; behavior shift is documented in the
    artifact + concept docs).
- `.rekon-dev/review-packets/issue-resolver-adjudicated-v2.md`
  (this file).

## PUBLIC API CHANGES

Additive only.

- `IssuePacket` gains four optional fields: `issueGroup`,
  `matchSource`, `verificationByFinding`.
- New exported types: `IssueGroupSummary`,
  `IssueVerificationByFinding`.
- `ResolutionTraceEntry.sourceType` adds
  `"IssueAdjudicationReport"`.
- `@rekon/capability-resolver` manifest `consumes` adds
  `FindingStatusLedger` and `IssueAdjudicationReport`.
- No CLI signature changes — `rekon resolve issue --issue
  <id-or-fragment>` and `rekon resolve run resolve.issue
  --input-json '{"issue":"..."}'` continue to work.
- No `ArtifactHeader` shape changes. No SDK API changes. No new
  capability roles, permissions, or actuators. No version bump.
  No npm publish.

## PURPOSE PRESERVATION CHECK

- **Original problem**: agents and users need issue context that
  reflects governed issues, not noisy raw findings. If
  `resolve.issue` works only on raw findings, duplicate /
  overlapping findings fragment ownership, next steps, proof
  state, and remediation context.
- **Classic workflow guarantee**: classic issue/context flows
  used adjudicated issue state and hydrated context so downstream
  work operated on governed issues, not raw detector noise. Issue
  context preserved source findings while presenting one
  actionable issue view.
- **Classic shape that provided the guarantee**:
  `services/IssueDetectionService.ts`,
  `domain/issues/mergeIssues.ts`, `lib/issue-context.ts`,
  `lib/issue-context/**`, `services/ContextHandler.ts`.
- **Rekon equivalent guarantee**: `IssueAdjudicationReport`
  groups related findings (shipped in v1). `resolve.issue` v2
  prefers adjudicated groups, returns group-level context,
  preserves member finding ids via `memberFindingIds`, and falls
  back to raw findings when no group exists. Verification
  evidence remains visible by member finding id via
  `verificationByFinding`. No artifact is mutated; passing
  aggregated verification does not auto-resolve any member.
- **What would mean we failed**:
  - `resolve.issue` chooses a duplicate raw finding even when an
    adjudicated group exists. (Closed by the "exact group id /
    canonical / member" tests plus the "rekon resolve issue
    against an adjudicated repo returns issueGroup" CLI test.)
  - Member finding traceability disappears. (Closed by every
    test that asserts `issueGroup.memberFindingIds`.)
  - Accepted / ignored / resolved / mixed group status is hidden.
    (Closed by three status-warning tests.)
  - Verification evidence for member findings is lost. (Closed
    by the `verificationByFinding` aggregation test.)
  - Raw fallback breaks when no adjudication report exists.
    (Closed by the "no adjudication report falls back to raw"
    test plus the existing 31 v1 tests in
    `route-seam-issue-resolvers.test.mjs` and
    `verification-aware-issue-remediation.test.mjs`.)
- **Regression test for the original problem**: the prescribed
  case — "given an `IssueAdjudicationReport` group with two
  duplicate findings, `rekon resolve issue --issue <group
  fragment>` returns one issue group, includes both
  `memberFindingIds`, resolves ownership from group files, and
  recommends the correct next resolver" — is pinned by
  `resolve.issue exact group id returns issueGroup with
  memberFindingIds`, `group.files ownership produces
  ownerSystems`, `multi-owner group sets nextRequiredResolver to
  resolve.seam`, and the CLI test
  `rekon resolve issue against an adjudicated repo returns
  issueGroup`.

## CODEBASE-INTEL ALIGNMENT

- **Classic capability or failure mode**: issue-context
  resolution over governed / adjudicated issues.
- **Relevant classic files/systems**: `lib/issue-context.ts`,
  `lib/issue-context/**`, `services/ContextHandler.ts`,
  `services/IssueDetectionService.ts`, `services/issues/**`,
  `domain/issues/mergeIssues.ts`,
  `docs/strategy/classic-guarantees-audit.md`,
  `docs/strategy/classic-wins.md`,
  `docs/strategy/classic-alignment-map.md`.
- **What Rekon keeps**: issue context operates on governed issue
  state when available; raw findings remain traceable; ownership
  hydration matters; status / lifecycle context matters;
  verification / proof state matters; ambiguous matches are not
  silently chosen; resolver output explains match strategy and
  fallback.
- **What Rekon simplifies**: deterministic id / fragment matching
  only; no semantic / fuzzy matching; no graph-heavy issue
  context; no LLM issue review; no automatic resolution; no
  issue health scoring.
- **What Rekon does not port yet**: full issue-context graph
  enrichment; semantic issue matching; issue-context prompt
  bundle; false-positive classifier; LLM review; health / trend
  integration; publication-surface consumption (architecture
  summary + agent contract should also consume adjudicated
  groups).
- **How this advances migration**: connects
  `IssueAdjudicationReport` to resolver behavior, completing the
  governance → coherency → resolver chain over governed issue
  groups. Subsystem 6 in
  `docs/strategy/classic-subsystem-purpose-map.md` now reads "P1
  preserved (v1 + coherency v2 + resolver v2)". Subsystem 8
  records the group-aware resolver. The recommended next slice is
  publication-surface consumption of adjudicated groups (Agent
  Contract / Architecture Summary).

## ADJUDICATED ISSUE MATCHING

When `findIssueGroupMatches` is called with a non-empty query:

1. List `IssueAdjudicationReport` artifacts. If none exist,
   return `null` (caller will fall through to raw mode with a
   `Fallback / missing` trace entry).
2. Read the latest report; collect `report.groups`.
3. Try exact `group.id` match → unique result.
4. Try exact `canonicalFindingId` match → unique result.
5. Try exact member `findingId` match → unique result.
6. Try unique substring across `group.id`, `canonicalFindingId`,
   every member id, `type`, `title`, `description`, `ruleId`.
   - Zero matches → return `{ match: null, matches: [],
     candidates }` (caller falls through to raw mode with a
     `IssueAdjudicationReport / fallback` trace entry).
   - Exactly one match → return as unique match.
   - Multiple matches → return `{ match: null, matches, candidates
     }` (caller emits ambiguous-warning packet; no raw fallback).

Caller branches:

- Unique group match → `buildGroupIssuePacket`: emits packet with
  `matchSource: "IssueAdjudicationReport"`, `issueGroup`
  populated, back-compat `issue` field populated with the
  canonical finding's summary, `verificationByFinding`,
  ownership-combined `ownerSystems`, group-status warnings,
  next-resolver decision, and trace.
- Ambiguous group match → `buildAmbiguousGroupIssuePacket`:
  emits packet with warning, no `issueGroup`, no `issue`,
  `relatedFindings` carrying each candidate's canonical finding,
  and a trace entry listing every matched group id. No raw
  fallback runs.
- No group match (or no report) → fall through to the existing
  raw-mode body (`findIssueMatches` → annotate with ledger →
  resolve ownership → `lookupVerificationEvidence` →
  next-resolver decision). The fallback trace entry already
  cites the adjudication report (or marks it missing), so the
  trail explains why raw mode ran.

## RAW FALLBACK BEHAVIOR

The raw path is byte-identical to v1 with one additive change:
`matchSource: "FindingReport"` is set when a raw match is found
(undefined otherwise). All other fields, trace entries, status
annotations, and verification lookup behavior are unchanged. The
31 existing tests in `route-seam-issue-resolvers.test.mjs` and
`verification-aware-issue-remediation.test.mjs` continue to pass
without modification, because their fixtures seed no
`IssueAdjudicationReport` and the resolver falls through to raw
mode exactly as before. (One additional `issue.match / Fallback /
missing` trace entry now precedes the raw-mode entries, but the
existing tests do not assert on the presence/absence of trace
entries; they only assert on specific entries.)

## VERIFICATION AGGREGATION

`aggregateGroupVerification` walks every `memberFindingId`:

1. Call `lookupVerificationEvidence(artifacts, findingId)` for
   each member; this is the same helper used in raw mode (no
   new lookup logic).
2. Collect the resulting `VerificationEvidenceSummary` objects.
3. Pick the worst status by `VERIFICATION_STATUS_RANK`:
   `failed (0) > partial (1) > not-run (2) > missing (3) > passed
   (4)`. Lower numeric rank wins.
4. Return both the worst summary (assigned to
   `IssuePacket.verification`) and a per-member breakdown
   (`IssuePacket.verificationByFinding`).

Group-mode warnings mirror the v1 raw-mode warnings but say
"member finding" to reflect aggregation: "Associated verification
failed for at least one member finding…", etc. The
`issue.verification` trace entry includes a
`details.perFinding: [{ findingId, status }]` array.

Passing aggregated verification does **not** auto-resolve any
member finding or the group itself. The `FindingStatusLedger`
remains the only place status decisions live; this resolver only
reads it.

## TESTS / VERIFICATION

- `npm run typecheck` ✓
- `npm run build` ✓
- `git diff --check` ✓
- `npm run test` — 389 passed, 1 skipped optional, 0 failed.
  Includes the 17 new
  `tests/contract/issue-resolver-adjudicated.test.mjs`. The
  existing 17 tests in `route-seam-issue-resolvers.test.mjs` and
  the 14 tests in `verification-aware-issue-remediation.test.mjs`
  continue to pass without modification.
- `node scripts/audit-license.mjs` ✓ (19 packages)
- `node scripts/audit-package-exports.mjs` ✓ (19 packages)
- `node scripts/publish-dry-run.mjs` ✓ (19 packages)
- `node scripts/install-smoke.mjs` ✓
- `node scripts/install-tarball-smoke.mjs` ✓ (19 tarballs, 13
  artifacts emitted)
- Prescribed CLI smoke against `examples/simple-js-ts`:
  - `rekon refresh` → status `passed`
  - `rekon resolve issue --issue no-such-issue` → packet with
    `matchSource: null` (no match), summary
    `"No finding matched query 'no-such-issue'."`, and **two**
    `issue.match` trace entries: one with
    `sourceType: "IssueAdjudicationReport"` / `status:
    "fallback"` ("No adjudicated issue group matched query
    'no-such-issue'; falling back to raw findings."), one with
    `sourceType: "Fallback"` / `status: "warning"` ("No finding
    matched query 'no-such-issue'.").
  - `rekon artifacts validate` → `valid: true`
  - `rekon artifacts freshness` → 14 artifacts indexed
- In-process group-mode smoke against a seeded fixture (two
  duplicate findings → one `IssueAdjudicationReport` group):
  - `rekon resolve issue --issue issue-f1` → `matchSource:
    "IssueAdjudicationReport"`, `issueGroup.id: "issue-f1"`,
    `memberFindingIds: ["f1","f2"]`, `nextRequiredResolver:
    "resolve.preflight"`, `verificationByFinding.length: 2`.
  - `rekon resolve issue --issue f1` → routes through canonical
    finding to the same group.
  - `rekon resolve issue --issue f2` → routes through member
    finding to the same group.

## INTENTIONALLY UNTOUCHED

- `FindingReport`, `FindingStatusLedger`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, `EffectiveFinding`, `Finding` shapes
  unchanged.
- `buildFindingLifecycleReport`,
  `buildIssueAdjudicationReport`, `buildCoherencyDelta` behavior
  unchanged.
- `resolve.route`, `resolve.seam`, `resolve.preflight` unchanged.
- `lookupVerificationEvidence` unchanged; group-mode aggregation
  uses it as-is.
- `findIssueMatches` (the raw matcher) unchanged.
- `annotateIssueWithLedger`, `readLatestLedgerFromArtifacts`,
  `pickVerificationSourceType`, `verificationTraceMessage`,
  `resolveOwnership`, `collectInputRefs`, `buildRecommendedContext`,
  `issueNextSteps` unchanged.
- No CLI signature changes.
- No new capability roles, permissions, or actuators.
- No source-write surface. No watcher. No LLM.
- No semantic / fuzzy / embedding matching.
- No version bump. No npm publish.

## RISKS / FOLLOW-UP

- **Risk**: a consumer that previously keyed on
  `IssuePacket.issue.id` to look up the raw finding now receives
  the **canonical** finding id (when group mode fires). The full
  member list is still available via `issueGroup.memberFindingIds`,
  and the back-compat `issue` field still points at a valid raw
  finding (the canonical one).
- **Risk**: a query that previously matched a single raw finding
  exactly may now match a containing group instead. The trace
  shows which path was taken; the canonical finding's id remains
  visible. Operators relying on raw-id-only behavior can delete
  the adjudication report (or pass a more specific id).
- **Risk**: ambiguous group fragments halt without raw fallback,
  so an operator who intended to match a raw finding gets a
  warning instead of a result. Mitigation: the warning lists
  every matched group id so refining the query is easy; the
  trace also includes `matchedCanonicalFindingIds` so the
  operator can identify which raw findings are reachable.
- **Risk**: `group.systems` declared in the adjudication report
  may differ from `OwnershipMap` resolution. The resolver emits
  an explicit "Issue group systems differ from ownership
  resolution; inspect IssueAdjudicationReport and OwnershipMap."
  warning when this happens. The combined `ownerSystems` is the
  union (so neither source is silently dropped); the warning
  tells the operator to investigate.
- **Risk**: aggregated verification surfaces the worst status,
  which can look alarming when one member finding has `failed`
  evidence and four members are `passed`. Mitigation:
  `verificationByFinding` carries the full per-member breakdown
  so reviewers can see which member contributed the worst
  signal; the trace `details.perFinding` mirrors this.
- **Follow-up**: publication-surface consumption of adjudicated
  groups — the architecture summary and agent contract should
  also reason about groups, not raw findings, when adjudication
  is present. This is the recommended next slice.
- **Follow-up**: semantic / fuzzy / embedding matching for
  cross-pack dedupe and false-positive scoring. Deferred per
  this batch's stop conditions.
- **Follow-up**: LLM review and auto-resolution. Out of scope.

## NEXT STEP

Push `main` directly after checks pass. Commit on the worktree's
detached HEAD, fast-forward local `main` from the primary
worktree, push `origin/main`. Per the user's queued sequence,
the next batch is **Agent Contract / Architecture Summary use
adjudicated issue groups** — the publication surface should
show governed issues and group counts where adjudication exists,
keeping raw-finding traceability through `memberFindingIds`.
