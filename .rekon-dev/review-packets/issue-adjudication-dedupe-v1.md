# Issue Adjudication / Dedupe v1

## Batch Summary

Adds the first Rekon-native adjudication layer above raw
findings. `IssueAdjudicationReport` is a deterministic projection
over `FindingLifecycleReport` that groups duplicate / overlapping
findings into canonical issue groups with explicit
`groupingReasons` and a per-status `statusBreakdown`. Raw
findings, status decisions, and the lifecycle report are never
mutated. No fuzzy / semantic / LLM matching. No automatic
ignore / accept. Closes the first slice of P1.1 in the Classic
Guarantees Audit.

## CHANGES MADE

- `packages/kernel-findings/src/index.ts`:
  - New types: `IssueAdjudicationStatus`,
    `IssueAdjudicationGroup`, `IssueAdjudicationSummary`,
    `IssueAdjudicationReport`, `IssueAdjudicationInput`.
  - New module-level constants: `SEVERITY_RANK` (used by canonical
    selection + group severity), `ISSUE_ADJUDICATION_STATUSES`
    (validator set).
  - New exported pure helpers: `deriveIssueAdjudication`,
    `createIssueAdjudicationReport`,
    `validateIssueAdjudicationReport`,
    `assertIssueAdjudicationReport`,
    `issueAdjudicationReportSchema`.
  - Internal helpers: `computeGroupingKey`,
    `pickCanonicalFinding`, `pickHighestSeverity`,
    `pickGroupStatus`, `unionSorted`, `mergeEvidence`,
    `summarizeAdjudication`, `validateAdjudicationGroup`.
- `packages/runtime/src/index.ts`:
  - Imported `createIssueAdjudicationReport` and the
    `IssueAdjudicationReport` type from `@rekon/kernel-findings`.
  - Added `BuildIssueAdjudicationOptions` type.
  - Added `buildIssueAdjudicationReport(store, options)` helper.
    It reads the latest `FindingLifecycleReport` (or builds one
    via `buildFindingLifecycleReport` when none exists), reads
    `OwnershipMap` / `ObservedRepo` for optional per-group
    `systems` assignment, and writes a fresh report with
    `header.inputRefs` that cite the lifecycle ref plus every ref
    the lifecycle itself already carried.
  - Added `IssueAdjudicationReport: "findings"` to
    `ARTIFACT_CATEGORY_BY_TYPE`.
- `packages/sdk/src/index.ts`:
  - Registered `IssueAdjudicationReport` in
    `BUILT_IN_ARTIFACT_TYPES` (schemaVersion `0.1.0`, stability
    `experimental`).
- `packages/cli/src/index.ts`:
  - Imported `buildIssueAdjudicationReport` from `@rekon/runtime`.
  - Added two new command branches:
    - `issues adjudicate` builds, writes, and returns the new
      report.
    - `issues list` returns the latest report's `summary` +
      `groups`, building one on demand if none exists. Supports
      optional `--status active|accepted|ignored|resolved|mixed`
      filter on the returned `groups` (no re-derivation).
  - Added `parseIssueStatusFilter` helper with explicit error
    when an unknown status is passed.
  - Added two new usage lines for `rekon`.
- `tests/contract/issue-adjudication.test.mjs` (15 tests).
- New docs: `docs/artifacts/issue-adjudication-report.md`,
  `docs/concepts/issue-adjudication.md`.
- Doc updates: `docs/artifacts/finding-lifecycle-report.md`
  (cross-links + downstream-projections section now lists
  adjudication alongside coherency),
  `docs/concepts/finding-lifecycle.md` (clarifies that
  adjudication is a separate projection — lifecycle still matches
  by id; cross-refs added),
  `docs/concepts/coherency-delta.md` ("Future input" callout
  describing v2 consumption of adjudicated groups; cross-refs
  added),
  `docs/strategy/classic-guarantee-regression-plan.md` (P1.1 now
  records the shipped v1 slice + the new test plan),
  `docs/strategy/classic-subsystem-purpose-map.md` (subsystem 6
  reads "P1 preserved (v1)"; next slice = CoherencyDelta v2),
  `docs/strategy/classic-behavior-roadmap.md` (new Phase B entry),
  `docs/strategy/roadmap.md` (new bullet under completed alpha
  spine),
  `README.md` (CLI command list),
  `CHANGELOG.md` (entry at the top of `0.1.0-alpha.1`).
- Review packet:
  `.rekon-dev/review-packets/issue-adjudication-dedupe-v1.md`
  (this file).

## PUBLIC API CHANGES

Additive only.

- New types exported from `@rekon/kernel-findings`:
  `IssueAdjudicationStatus`, `IssueAdjudicationGroup`,
  `IssueAdjudicationSummary`, `IssueAdjudicationReport`,
  `IssueAdjudicationInput`.
- New exported helpers from `@rekon/kernel-findings`:
  `deriveIssueAdjudication`, `createIssueAdjudicationReport`,
  `validateIssueAdjudicationReport`,
  `assertIssueAdjudicationReport`,
  `issueAdjudicationReportSchema`.
- New exported helper from `@rekon/runtime`:
  `buildIssueAdjudicationReport`. New `BuildIssueAdjudicationOptions`
  type.
- New built-in artifact type in `@rekon/sdk`:
  `IssueAdjudicationReport` (schemaVersion `0.1.0`, stability
  `experimental`).
- New CLI commands: `rekon issues adjudicate`, `rekon issues list`.
- No `ArtifactHeader` shape changes. No new capability roles, no
  new permissions, no new actuators. No changes to existing public
  types or helpers. No version bump. No npm publish.

## PURPOSE PRESERVATION CHECK

- **Original problem**: multiple evaluators / runs can produce
  duplicate or overlapping findings; without adjudication, findings
  become noisy lint, operators lose trust, false positives recur,
  and issue context gets fragmented.
- **Classic workflow guarantee**: `codebase-intel-classic`'s issue
  detection did more than emit issues — it adjudicated them
  through merge / dedupe / status preservation / filtering so
  downstream coherency, docs, memory, and remediation operated on
  governed issues rather than raw noise.
- **Classic shape that provided the guarantee**:
  `services/IssueDetectionService.ts` (~568 lines),
  `services/issues/**`, `domain/issues/mergeIssues.ts`,
  `domain/issues/evaluators/**`,
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`.
- **Rekon equivalent guarantee (v1 slice)**: raw `FindingReport`s
  stay untouched; `FindingLifecycleReport` preserves status; the
  new `IssueAdjudicationReport` groups related findings into
  canonical issue groups with clear dedupe keys, deterministic
  grouping reasons, and a per-status `statusBreakdown`. Future
  `CoherencyDelta` v2 will operate on adjudicated groups; future
  `resolve.issue` v2 may search adjudicated groups first. Both
  are deferred to keep this batch tight.
- **What would mean we failed**:
  - Duplicate findings remain indistinguishable in the governance
    layer. (Closed by the `groups duplicate findings` test plus
    the `no findings are dropped` test.)
  - Accepted / ignored / resolved status is lost during grouping.
    (Closed by the `statusBreakdown` and `mixed group with
    active + ignored` tests.)
  - Adjudication silently drops findings. (Closed by the
    `no findings are dropped` test, which sums `memberFindingIds`
    counts across all groups and asserts the total equals the
    input count, and by the singleton-no-grouping-key test.)
  - Adjudication mutates raw `FindingReport`,
    `FindingStatusLedger`, or `FindingLifecycleReport`. (Closed by
    a bytes-on-disk identity test that runs adjudication and
    re-reads the upstream artifacts.)
  - Operators cannot see why findings were grouped. (Closed by
    every test that asserts `groupingReasons` membership.)
- **Regression test for the original problem**:
  `tests/contract/issue-adjudication.test.mjs` (15 tests).
  Particularly load-bearing:
  - `deriveIssueAdjudication groups duplicate findings sharing
    type/rule/files/subjects` — proves the core dedupe behavior.
  - `accepted, ignored, and resolved statuses are preserved in
    statusBreakdown` — proves status survival across grouping.
  - `adjudication does not mutate FindingReport or
    FindingStatusLedger or FindingLifecycleReport` — bytes-on-disk
    invariant.
  - `artifacts freshness marks IssueAdjudicationReport stale
    after a newer FindingLifecycleReport` — proves the lineage
    loop closes.

## CODEBASE-INTEL ALIGNMENT

- **Classic capability or failure mode**: issue detection /
  adjudication / dedupe / status preservation.
- **Relevant classic files/systems**:
  `services/IssueDetectionService.ts`,
  `services/issues/**`,
  `domain/issues/mergeIssues.ts`,
  `domain/issues/evaluators/**`,
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`,
  `docs/strategy/classic-guarantees-audit.md`,
  `docs/strategy/classic-wins.md`,
  `docs/strategy/classic-alignment-map.md`.
- **What Rekon keeps**: findings are governance artifacts (not
  lint noise); duplicate / overlapping findings should be grouped;
  grouping must be explainable; status / lifecycle context must
  survive grouping; filtered / ignored / accepted findings remain
  auditable; adjudication output is an artifact with `inputRefs`.
- **What Rekon simplifies**: deterministic key-based grouping
  only; no embeddings; no LLM review; no semantic / fuzzy
  matching; no automatic false-positive filtering; no mutation of
  status ledgers; no health score.
- **What Rekon does not port yet**: full multi-phase
  `IssueDetectionService`; semantic merge; false-positive
  classifier; LLM adjudication / review; cross-run issue status
  merge sophistication; filtered issue audit beyond explicit
  groups; issue health projection; automatic `CoherencyDelta` v2
  consumption of adjudicated groups; `resolve.issue` v2
  consumption of adjudicated groups.
- **How this advances migration**: adds the first Rekon-native
  adjudication layer above raw findings / lifecycle. Subsystem 6
  in `docs/strategy/classic-subsystem-purpose-map.md` now reads
  "P1 preserved (v1)". The recommended next slice is
  `CoherencyDelta` v2 consuming `IssueAdjudicationReport`, then
  `resolve.issue` v2 consumption, then the deeper adjudication
  maturity batch (semantic dedupe, false-positive scoring).

## ADJUDICATION MODEL

Inputs: `EffectiveFinding[]` from `FindingLifecycleReport.findings`
plus optional `resolvedFindings`. Optional `systemsForFinding`
callback maps each finding to a list of owner systems for the
group-level `systems` field (used by the runtime helper when
`OwnershipMap` / `ObservedRepo` are present).

Each finding becomes a member of exactly one group. Groups are
keyed by `type | ruleId | <location-segment>` where the
location segment is `files=<sorted,csv>` if files is non-empty,
otherwise `subjects=<sorted,csv>` if subjects is non-empty,
otherwise `singleton=<findingId>`.

Per-group derived fields:

- `canonicalFindingId` — chosen by preferring active members,
  then highest severity (`SEVERITY_RANK`: critical 4, high 3,
  medium 2, low 1), then earliest id lexicographically.
- `severity` — highest severity across all members.
- `status` — `active` / `accepted` / `ignored` / `resolved` /
  `mixed` based on the set of members' `effectiveStatus`.
- `active: boolean` — true whenever any member is `new` or
  `existing`.
- `title` / `description` / `suggestedAction` — taken from the
  canonical member.
- `files` / `subjects` — sorted union across all members.
- `systems` — sorted union from `systemsForFinding` results, when
  provided.
- `evidence` — deduplicated union across all members.
- `groupingKey` — the computed key (preserved for traceability).
- `groupingReasons` — deterministic, human-readable explanation
  tokens: `"same-type"` always; `"same-rule"` when ruleId is set;
  `"same-files"` when files dimension partitioned the group;
  `"same-subjects"` when subjects dimension partitioned the group;
  `"singleton-no-grouping-key"` when the singleton fallback fired.
- `statusBreakdown` — `Record<effectiveStatus, count>`.

Groups are sorted in the report: active first (`true > false`),
then by severity descending, then by id lexicographically. The
top-level `summary` carries `totalGroups`, per-status counts,
`totalFindings`, `groupedFindings`, `bySeverity`, and `byType`.

## GROUPING RULES

Deterministic only. **No fuzzy / semantic / embedding / LLM
matching in v1.** Future semantic providers may extend grouping
under explicit capability permissions; deferred.

Order of fallback for the location segment of the key: `files` →
`subjects` → finding id (singleton). Files and subjects are
both `uniqueSorted` before being joined into the key so order
does not matter.

`ruleId` is included in the key when set. Findings with the same
`type` but different `ruleId` (or one set / one unset) are
considered different rules and live in different groups.

Active-vs-inactive matters for canonical selection but **not** for
grouping itself — a group can contain a mix of active and
resolved members. The status of the group reflects that mix; the
canonical finding is chosen with preference for active members.

## CLI COMMANDS ADDED

```sh
rekon issues adjudicate [--root <path>] [--json]

rekon issues list \
  [--status active|accepted|ignored|resolved|mixed] \
  [--root <path>] [--json]
```

`issues adjudicate` builds and writes a fresh report on every
invocation. The output is `{ artifact, summary, groups }`.

`issues list` returns the latest existing `IssueAdjudicationReport`
or builds one if none exists. Optional `--status` filters the
returned `groups` array (no re-derivation). Unknown status values
trigger a clear error from `parseIssueStatusFilter`.

## TESTS / VERIFICATION

- `npm run typecheck` ✓
- `npm run build` ✓
- `git diff --check` ✓
- `npm run test` — 361 passed, 1 skipped optional, 0 failed.
  Includes the 15 new contract tests in
  `tests/contract/issue-adjudication.test.mjs` and verifies that
  the existing 26 tests across
  `finding-lifecycle.test.mjs`, `coherency-delta.test.mjs`,
  and `artifact-freshness.test.mjs` still pass.
- `node scripts/audit-license.mjs` ✓ (19 packages)
- `node scripts/audit-package-exports.mjs` ✓ (19 packages)
- `node scripts/publish-dry-run.mjs` ✓ (19 packages)
- `node scripts/install-smoke.mjs` ✓
- `node scripts/install-tarball-smoke.mjs` ✓ (19 tarballs, 13
  artifacts emitted)
- Prescribed CLI smoke against `examples/simple-js-ts`:
  - `rekon refresh` → status `passed`
  - `rekon issues adjudicate` → wrote
    `IssueAdjudicationReport-issue-adjudication-<timestamp>` with
    `summary.totalGroups: 0` (the example fixture has zero
    findings)
  - `rekon issues list` → 0 groups (mirror of adjudicate)
  - `rekon artifacts validate` → `valid: true`
  - `rekon artifacts freshness` → 13 artifacts indexed (now
    includes the new `IssueAdjudicationReport`)
- The grouping logic, mutation-free invariants, freshness
  invalidation, and status-survival behavior are exercised by the
  seeded-findings contract tests.

## INTENTIONALLY UNTOUCHED

- `FindingReport`, `FindingStatusLedger`, `FindingLifecycleReport`,
  `EffectiveFinding`, and `Finding` shapes unchanged.
- `buildFindingLifecycleReport` and `buildCoherencyDelta`
  behavior unchanged.
- `CoherencyDelta` continues to consume `FindingLifecycleReport`
  directly; not changed in this batch.
- `resolve.issue` continues to operate on findings; not changed
  in this batch.
- No new capability roles, permissions, or actuators.
- No source writes. No watcher. No LLM.
- No version bump. No npm publish.

## RISKS / FOLLOW-UP

- **Risk**: an operator interprets group `status: active` as
  "there is one issue here" and forgets that the group may
  contain multiple actionable members. Mitigation: every group
  carries `memberFindingIds`, `statusBreakdown`, and the
  canonical finding's `title` / `description`; downstream UI /
  publications should always show member count. The CLI returns
  `memberFindingIds` directly in JSON output.
- **Risk**: two evaluators emit findings that *should* be
  considered the same issue but differ in `ruleId` or in
  `subjects[]` content, so the deterministic key splits them.
  Mitigation: v1 explicitly does not attempt cross-rule semantic
  merge. Operators can mark one finding `accepted` via
  `rekon findings status set` to silence it; v2 work will
  consider cross-rule heuristics under explicit permission.
- **Risk**: groups accumulate indefinitely as repeated `issues
  adjudicate` runs write new reports. Mitigation: each report is
  a fresh artifact; freshness invalidation surfaces older reports
  via `rekon artifacts freshness`. Compaction of old reports is
  deferred.
- **Risk**: the per-group `systems` field depends on
  `OwnershipMap` / `ObservedRepo` being current. Mitigation: the
  helper does not block when those are missing; `systems` is
  optional. Future v2 work may make ownership hydration happen at
  lifecycle time (so adjudication consumes already-hydrated
  ownership) — see
  `docs/strategy/classic-guarantee-regression-plan.md` P1.1
  missing-coverage list.
- **Follow-up**: `CoherencyDelta` v2 consuming
  `IssueAdjudicationReport` instead of raw lifecycle findings.
  This is the recommended next slice per the work order and per
  the Classic Subsystem Purpose Map.
- **Follow-up**: `resolve.issue` v2 searching adjudicated groups
  first, then falling back to `FindingReport` / lifecycle. Defer
  until the v2 coherency batch lands.
- **Follow-up**: optional semantic / fuzzy grouping under a new
  capability role with explicit `read:semantic` or
  `network:outbound` permissions. Out of scope for v1.

## NEXT STEP

Push `main` directly after checks pass. Commit on the worktree's
detached HEAD, fast-forward local `main` from the primary
worktree, push `origin/main`. Per the user's queued sequence, the
next batch is **CoherencyDelta v2 from IssueAdjudicationReport** —
the coherency rollup should summarize adjudicated issue groups
instead of raw findings, while keeping raw findings accessible
through `FindingLifecycleReport`. No health score yet unless
needed.
